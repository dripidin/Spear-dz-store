'use strict';

const crypto = require('crypto');
const https = require('https');

const GRAPH_API_VERSION = 'v19.0';

function sha256(val) {
    if (!val) return null;
    const clean = String(val).trim().toLowerCase();
    if (!clean) return null;
    return crypto.createHash('sha256').update(clean).digest('hex');
}

function hashPhone(phone) {
    if (!phone) return null;
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
        digits = '213' + digits.substring(1);
    } else if (!digits.startsWith('213') && digits.length === 9) {
        digits = '213' + digits;
    }
    return sha256(digits);
}

function hashNames(fullName) {
    if (!fullName) return { fn: null, ln: null };
    const parts = String(fullName).trim().split(/\s+/);
    const fn = parts[0] ? sha256(parts[0]) : null;
    const ln = parts.length > 1 ? sha256(parts.slice(1).join(' ')) : null;
    return { fn, ln };
}

/**
 * Sends a server-side conversion event to Meta Conversions API (CAPI).
 *
 * @param {Object} params
 * @param {string} params.eventName        - 'Purchase', 'InitiateCheckout', 'ViewContent', etc.
 * @param {string} params.eventId          - Matching eventID for client/server deduplication
 * @param {number} params.value            - Total value in DZD
 * @param {string} [params.currency='DZD']
 * @param {string} [params.fullName]
 * @param {string} [params.phone]
 * @param {string} [params.wilaya]
 * @param {string} [params.commune]
 * @param {string} [params.clientIp]
 * @param {string} [params.userAgent]
 * @param {string} [params.eventSourceUrl]
 * @param {string} [params.fbp]
 * @param {string} [params.fbc]
 * @param {string} [params.productName]
 * @returns {Promise<{success: boolean, skipped?: boolean, reason?: string, error?: string}>}
 */
async function sendMetaEvent(params) {
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
        // Safe skip when not configured in environment
        return { success: false, skipped: true, reason: 'META_CREDENTIALS_NOT_CONFIGURED' };
    }

    if (!params.eventId) {
        return { success: false, error: 'MISSING_EVENT_ID' };
    }

    const { fn, ln } = hashNames(params.fullName);
    const hashedPhone = hashPhone(params.phone);
    const hashedWilaya = params.wilaya ? sha256(params.wilaya) : null;
    const hashedCommune = params.commune ? sha256(params.commune) : null;

    const userData = {
        client_ip_address: params.clientIp || undefined,
        client_user_agent: params.userAgent || undefined,
        country: [sha256('dz')]
    };

    if (hashedPhone) userData.ph = [hashedPhone];
    if (fn) userData.fn = [fn];
    if (ln) userData.ln = [ln];
    if (hashedWilaya) userData.st = [hashedWilaya];
    if (hashedCommune) userData.ct = [hashedCommune];
    if (params.fbp) userData.fbp = params.fbp;
    if (params.fbc) userData.fbc = params.fbc;

    const eventPayload = {
        event_name: params.eventName || 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: params.eventSourceUrl || process.env.STORE_URL || 'https://spear-dz.com',
        action_source: 'website',
        user_data: userData,
        custom_data: {
            currency: params.currency || 'DZD',
            value: Number(params.value) || 21900,
            content_type: 'product',
            content_name: params.productName || 'PACK HIGH-TECH 5 EN 1'
        }
    };

    const requestBody = {
        data: [eventPayload]
    };

    if (process.env.META_TEST_EVENT_CODE) {
        requestBody.test_event_code = process.env.META_TEST_EVENT_CODE;
    }

    const postData = JSON.stringify(requestBody);

    return new Promise((resolve) => {
        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(resBody);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true, eventsReceived: parsed.events_received });
                    } else {
                        // Log sanitized error without disclosing access token
                        console.warn('[Meta CAPI] Event dispatch warning (HTTP %d): %s', res.statusCode, parsed.error && parsed.error.message);
                        resolve({ success: false, error: parsed.error && parsed.error.message });
                    }
                } catch (parseErr) {
                    resolve({ success: false, error: 'Malformed response from Meta Graph API' });
                }
            });
        });

        req.on('error', (err) => {
            console.warn('[Meta CAPI] Network error:', err.message);
            resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            console.warn('[Meta CAPI] Request timeout');
            resolve({ success: false, error: 'TIMEOUT' });
        });

        req.write(postData);
        req.end();
    });
}

module.exports = {
    sendMetaEvent,
    sha256,
    hashPhone,
    hashNames
};
