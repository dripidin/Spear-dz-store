'use strict';

const config = require('./riskConfig');
const { getStorage } = require('../storage');
const { normalizeAlgerianPhone } = require('../security');

/**
 * Evaluates risk context for an order submission.
 *
 * @param {Object} ctx
 * @param {string} ctx.phone
 * @param {string} ctx.ipHash
 * @param {string} [ctx.deviceId]
 * @param {string} [ctx.honeypot]
 * @param {number} [ctx.formDurationMs]
 * @returns {Promise<{score: number, level: string, decision: string, reasons: string[]}>}
 */
async function evaluateOrderRisk(ctx) {
    let score = 0;
    const reasons = [];

    // 1. Honeypot check
    if (ctx.honeypot && String(ctx.honeypot).trim() !== '') {
        score += config.WEIGHTS.HONEYPOT;
        reasons.push('Honeypot trap triggered (automated bot detection)');
    }

    // 2. Submission duration check
    if (typeof ctx.formDurationMs === 'number' && ctx.formDurationMs > 0) {
        const secs = ctx.formDurationMs / 1000;
        if (secs < config.MIN_FORM_SECONDS) {
            score += config.WEIGHTS.RAPID_SUBMISSION;
            reasons.push(`Instant submission detected (${secs.toFixed(1)}s < ${config.MIN_FORM_SECONDS}s)`);
        }
    }

    // 3. Phone number validation
    const normalizedPhone = normalizeAlgerianPhone(ctx.phone);
    if (!normalizedPhone) {
        score += config.WEIGHTS.INVALID_PHONE;
        reasons.push('Invalid Algerian mobile phone number format');
    }

    // 4. Watchlist check
    try {
        const storage = getStorage();
        if (ctx.phone && await storage.isWatchlisted(ctx.phone)) {
            score += config.WEIGHTS.WATCHLIST;
            reasons.push('Customer phone number found in risk watchlist');
        }
        if (ctx.ipHash && await storage.isWatchlisted(ctx.ipHash)) {
            score += config.WEIGHTS.WATCHLIST;
            reasons.push('Client IP identifier found in risk watchlist');
        }

        // 5. Rate limiting check (past 24 hours)
        if (ctx.ipHash || normalizedPhone) {
            const cutoff = new Date(Date.now() - config.RATE_LIMIT_WINDOW_HOURS * 3600 * 1000).toISOString();
            const recentOrders = await storage.getAllOrders({ limit: 100 });
            const matches = recentOrders.filter(o => {
                if (o.createdAt && o.createdAt < cutoff) return false;
                if (o.status === 'cancelled' || o.status === 'rejected') return false;
                const matchIp = ctx.ipHash && o.clientIpHash === ctx.ipHash;
                const matchPhone = normalizedPhone && o.phone === normalizedPhone;
                return matchIp || matchPhone;
            });

            if (matches.length >= config.RATE_LIMIT_MAX_ORDERS) {
                score += config.WEIGHTS.RATE_LIMIT;
                reasons.push(`Rate limit exceeded (${matches.length} orders within 24h window)`);
            }
        }
    } catch (storageErr) {
        // Storage lookup shouldn't block order if storage fails in offline mode
        console.warn('[RiskEngine] Historical lookup warning:', storageErr.message);
    }

    // Cap score at 100
    score = Math.min(100, Math.max(0, score));

    // Determine level and decision
    let level = 'LOW';
    let decision = 'ALLOW';

    if (score >= config.THRESHOLDS.BLOCK) {
        level = 'CRITICAL';
        decision = 'BLOCK';
    } else if (score >= config.THRESHOLDS.HIGH) {
        level = 'HIGH';
        decision = 'REVIEW';
    } else if (score >= config.THRESHOLDS.MEDIUM) {
        level = 'MEDIUM';
        decision = 'REVIEW';
    }

    return {
        score,
        level,
        decision,
        reasons
    };
}

module.exports = {
    evaluateOrderRisk
};
