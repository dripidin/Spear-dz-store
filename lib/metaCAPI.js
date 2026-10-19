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
/**
 * Builds the canonical Meta CAPI payload dictionary for validation and dispatch.
 */
function buildMetaEventPayload(params) {
    params = params || {};
    const { fn, ln } = hashNames(params.fullName);
    const hashedPhone = hashPhone(params.phone);
    
    // Support email normalization & hashing (or pre-hashed em array/string)
    let hashedEmail = null;
    if (params.email) {
        hashedEmail = sha256(params.email);
    } else if (params.em) {
        if (Array.isArray(params.em)) {
            hashedEmail = params.em[0];
        } else if (typeof params.em === 'string') {
            hashedEmail = params.em.length === 64 && /^[0-9a-fA-F]+$/.test(params.em) ? params.em.toLowerCase() : sha256(params.em);
        }
    }

    const hashedWilaya = params.wilaya ? sha256(params.wilaya) : null;
    const hashedCommune = params.commune ? sha256(params.commune) : null;

    const userData = {
        client_ip_address: params.clientIp || undefined,
        client_user_agent: params.userAgent || undefined,
        country: [sha256('dz')]
    };

    if (hashedEmail) {
        userData.em = [hashedEmail];
    }
    if (hashedPhone) {
        userData.ph = [hashedPhone];
    } else if (Array.isArray(params.ph)) {
        userData.ph = params.ph;
    }
    if (fn) userData.fn = [fn];
    if (ln) userData.ln = [ln];
    if (hashedWilaya) userData.st = [hashedWilaya];
    if (hashedCommune) userData.ct = [hashedCommune];
    if (params.fbp) userData.fbp = params.fbp;
    if (params.fbc) userData.fbc = params.fbc;

    const eventTime = Number(params.eventTime || params.event_time) || Math.floor(Date.now() / 1000);
    const eventName = params.eventName || params.event_name || 'Purchase';

    const rawValue = params.value !== undefined ? params.value : 20400;
    const customValue = typeof rawValue === 'number' ? rawValue : (isNaN(Number(rawValue)) ? rawValue : String(rawValue));

    const payload = {
        event_name: eventName,
        event_time: eventTime,
        event_id: params.eventId || params.event_id,
        event_source_url: params.eventSourceUrl || params.event_source_url || process.env.STORE_URL || 'https://speardz.vercel.app',
        action_source: params.actionSource || params.action_source || 'website',
        user_data: userData,
        custom_data: {
            currency: params.currency || 'DZD',
            value: typeof rawValue === 'number' ? rawValue : customValue,
            content_type: 'product',
            content_name: params.productName || 'PACK HIGH-TECH 5 EN 1'
        }
    };

    if (params.attributionData || params.attribution_data) {
        payload.attribution_data = params.attributionData || params.attribution_data;
    }

    if (params.originalEventData || params.original_event_data) {
        payload.original_event_data = params.originalEventData || params.original_event_data;
    } else {
        payload.original_event_data = {
            event_name: eventName,
            event_time: eventTime
        };
    }

    return payload;
}

/**
 * Sends a server-side conversion event to Meta Conversions API (CAPI).
 * Supports facebook-nodejs-business-sdk if present, with resilient native Graph API fallback.
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
 * @returns {Promise<{success: boolean, skipped?: boolean, reason?: string, error?: string, provider?: string}>}
 */
async function sendMetaEvent(params) {
    let storeConfig = null;
    try {
        storeConfig = require('../config/store.config.json');
    } catch (_) {}
    const pixelId = (process.env.META_PIXEL_ID || storeConfig?.marketing?.meta_pixel_id || '1865890014396791').trim();
    const accessToken = (process.env.META_ACCESS_TOKEN || '').trim();

    if (!pixelId || !accessToken) {
        // Safe skip when not configured in environment
        return { success: false, skipped: true, reason: 'META_CREDENTIALS_NOT_CONFIGURED' };
    }

    if (!params.eventId) {
        return { success: false, error: 'MISSING_EVENT_ID' };
    }

    // Check if official facebook-nodejs-business-sdk is available
    let bizSdk = null;
    try {
        bizSdk = require('facebook-nodejs-business-sdk');
    } catch (_) {}

    if (bizSdk && typeof bizSdk.EventRequest === 'function') {
        try {
            const UserData = bizSdk.UserData;
            const CustomData = bizSdk.CustomData;
            const ServerEvent = bizSdk.ServerEvent;
            const EventRequest = bizSdk.EventRequest;

            const { fn, ln } = hashNames(params.fullName);
            const hashedPhone = hashPhone(params.phone);
            const hashedWilaya = params.wilaya ? sha256(params.wilaya) : null;
            const hashedCommune = params.commune ? sha256(params.commune) : null;

            const userData = (new UserData())
                .setClientIpAddress(params.clientIp || undefined)
                .setClientUserAgent(params.userAgent || undefined);

            if (hashedPhone) userData.setPhones([hashedPhone]);
            if (fn) userData.setFirstName(fn);
            if (ln) userData.setLastName(ln);
            if (hashedWilaya) userData.setState(hashedWilaya);
            if (hashedCommune) userData.setCity(hashedCommune);
            userData.setCountry([sha256('dz')]);
            if (params.fbp) userData.setFbp(params.fbp);
            if (params.fbc) userData.setFbc(params.fbc);

            const customData = (new CustomData())
                .setValue(Number(params.value) || 20400)
                .setCurrency(params.currency || 'DZD')
                .setContentName(params.productName || 'PACK HIGH-TECH 5 EN 1')
                .setContentType('product');

            const serverEvent = (new ServerEvent())
                .setEventName(params.eventName || 'Purchase')
                .setEventTime(Math.floor(Date.now() / 1000))
                .setUserData(userData)
                .setCustomData(customData)
                .setEventId(params.eventId)
                .setEventSourceUrl(params.eventSourceUrl || process.env.STORE_URL || 'https://speardz.vercel.app')
                .setActionSource('website');

            const eventsData = [serverEvent];
            const eventRequest = (new EventRequest(accessToken, pixelId))
                .setEvents(eventsData);

            if (process.env.META_TEST_EVENT_CODE) {
                eventRequest.setTestEventCode(process.env.META_TEST_EVENT_CODE);
            }

            const response = await eventRequest.execute();
            return { success: true, eventsReceived: response?.events_received || 1, provider: 'bizSdk' };
        } catch (sdkErr) {
            console.warn('[Meta CAPI SDK] Dispatch warning, falling back to direct Graph API:', sdkErr.message);
        }
    }

    // Direct Graph API v19.0 HTTPS (Zero extra latency & minimal serverless footprint)
    const eventPayload = buildMetaEventPayload(params);
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
                        resolve({ success: true, eventsReceived: parsed.events_received, provider: 'directGraphApi' });
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
    buildMetaEventPayload,
    sha256,
    hashPhone,
    hashNames
};
