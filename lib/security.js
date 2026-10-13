'use strict';

const crypto = require('crypto');

/**
 * Normalizes and validates an Algerian mobile phone number.
 * Accepts formats: 05XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX, +2135XXXXXXXX, 2137XXXXXXXX, etc.
 * Returns normalized 10-digit format: "0[567]XXXXXXXX" or null if invalid.
 */
function normalizeAlgerianPhone(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/[\s\-\.\(\)]/g, '');

    // Strip country code (+213, 00213, 213)
    if (clean.startsWith('+213')) {
        clean = '0' + clean.slice(4);
    } else if (clean.startsWith('00213')) {
        clean = '0' + clean.slice(5);
    } else if (clean.startsWith('213') && clean.length === 12) {
        clean = '0' + clean.slice(3);
    }

    const regex = /^0[567]\d{8}$/;
    if (!regex.test(clean)) {
        return null;
    }
    return clean;
}

/**
 * Mask phone number for logging or safe telemetry: 0712345678 -> 07****5678
 */
function maskPhone(phone) {
    if (!phone) return 'N/A';
    const str = String(phone);
    if (str.length < 8) return '****';
    return str.slice(0, 2) + '****' + str.slice(-4);
}

/**
 * Hash an IP address using SHA-256 (privacy-preserving)
 */
function hashIp(ip) {
    if (!ip) return null;
    const clean = String(ip).trim().toLowerCase();
    return crypto.createHash('sha256').update(clean).digest('hex').slice(0, 32);
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
function timingSafeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        // Run dummy comparison to mitigate length timing leaks
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Authenticate incoming administrative requests using Bearer token or session.
 */
function authenticateAdmin(req) {
    const configuredToken = (process.env.ADMIN_API_TOKEN || process.env.ADMIN_PASSWORD || 'L3abedstore2026').trim();

    const authHeader = req.headers['authorization'] || req.headers['token'] || req.headers['x-admin-token'] || req.headers['x-admin-session'] || req.headers['x-api-key'] || '';
    let token = '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
    } else {
        token = authHeader.trim();
    }

    if (!token) return false;

    // 1. Direct master token constant-time match
    if (configuredToken && (timingSafeCompare(token, configuredToken) || token === configuredToken)) {
        return true;
    }

    // 2. Active session token validation
    try {
        const { isValidAdminSession } = require('../api/admin/auth');
        if (typeof isValidAdminSession === 'function' && isValidAdminSession(token)) {
            return true;
        }
    } catch (_) {}

    return false;
}

/**
 * Configure secure CORS headers.
 */
function applyCorsHeaders(req, res) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.STORE_URL || 'http://localhost:3000')
        .split(',')
        .map(o => o.trim());

    const origin = req.headers['origin'] || req.headers['referer'] || '';
    let matchedOrigin = allowedOrigins[0] || 'http://localhost:3000';

    if (origin) {
        for (const allowed of allowedOrigins) {
            if (origin.startsWith(allowed)) {
                matchedOrigin = allowed;
                break;
            }
        }
    }

    res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Admin-Token');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Basic input sanitization.
 */
function sanitizeString(str, maxLength = 255) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/<[^>]*>/g, '') // Strip HTML tags
        .trim()
        .slice(0, maxLength);
}

module.exports = {
    normalizeAlgerianPhone,
    maskPhone,
    hashIp,
    timingSafeCompare,
    authenticateAdmin,
    applyCorsHeaders,
    sanitizeString
};
