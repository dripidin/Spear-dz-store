'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { hashPhone, hashNames, sha256, sendMetaEvent } = require('../lib/metaCAPI');

describe('Meta Conversions API (CAPI) Normalization Tests', () => {
    test('Correctly hashes and normalizes Algerian phone for Meta CAPI', () => {
        // Meta expects E.164 without leading + or symbols: '213555123456'
        const rawPhone = '0555123456';
        const expectedDigits = '213555123456';
        const expectedHash = crypto.createHash('sha256').update(expectedDigits).digest('hex');

        const computedHash = hashPhone(rawPhone);
        assert.strictEqual(computedHash, expectedHash);
    });

    test('Splits and hashes first and last names', () => {
        const { fn, ln } = hashNames('Yacine Brahimi');
        const expectedFn = sha256('yacine');
        const expectedLn = sha256('brahimi');

        assert.strictEqual(fn, expectedFn);
        assert.strictEqual(ln, expectedLn);
    });

    test('Skips gracefully when Meta access token is not configured', async () => {
        delete process.env.META_ACCESS_TOKEN;
        delete process.env.META_PIXEL_ID;

        const res = await sendMetaEvent({
            eventId: 'SPDZ-TEST-100',
            value: 22600,
            fullName: 'Test User'
        });

        assert.strictEqual(res.success, false);
        assert.strictEqual(res.skipped, true);
        assert.strictEqual(res.reason, 'META_CREDENTIALS_NOT_CONFIGURED');
    });

    test('Storefront index.html contains verified Meta Pixel and domain verification', () => {
        const fs = require('fs');
        const path = require('path');
        const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
        const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
        const storeConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'store.config.json'), 'utf8'));

        // Domain verification meta tags
        assert.ok(indexHtml.includes('name="facebook-domain-verification" content="lzuh8krch3d5nv6p3itr4aweqn4fcj"'), 'New domain verification meta tag missing');
        assert.ok(indexHtml.includes('name="facebook-domain-verification" content="s9bo2czrcqynrmjzo5uji6yzcjktit"'), 'Domain verification meta tag missing');

        // Meta Pixel script and initialization
        assert.ok(indexHtml.includes("fbq('init', '3409753005871295')"), 'Pixel init missing in index.html');
        assert.ok(indexHtml.includes("fbq('track', 'PageView')"), 'Pixel PageView tracking missing in index.html');
        assert.ok(indexHtml.includes('https://www.facebook.com/tr?id=3409753005871295'), 'Pixel noscript fallback missing in index.html');

        // Store config
        assert.strictEqual(storeConfig.marketing.meta_pixel_id, '3409753005871295');

        // Ensure admin.html is clean (no pixel)
        assert.ok(!adminHtml.includes('fbq('), 'admin.html must not contain Meta Pixel');
    });

    test('buildMetaEventPayload matches client event_id, eventName, and customData for deduplication', () => {
        const { buildMetaEventPayload } = require('../lib/metaCAPI');
        const testEventId = 'SPDZ-84263455-6634';
        const payload = buildMetaEventPayload({
            eventName: 'Purchase',
            eventId: testEventId,
            value: 22350,
            currency: 'DZD',
            productName: 'PACK HIGH-TECH 5 EN 1',
            fullName: 'Amine Benali',
            phone: '0550123456',
            wilaya: '16 - Alger',
            commune: 'Bab Ezzouar',
            clientIp: '197.200.10.5',
            userAgent: 'Mozilla/5.0 Test Browser'
        });

        // Exact matching for deduplication
        assert.strictEqual(payload.event_name, 'Purchase');
        assert.strictEqual(payload.event_id, testEventId);
        assert.strictEqual(payload.action_source, 'website');
        assert.strictEqual(payload.custom_data.value, 22350);
        assert.strictEqual(payload.custom_data.currency, 'DZD');
        assert.strictEqual(payload.custom_data.content_name, 'PACK HIGH-TECH 5 EN 1');

        // User data normalization & SHA-256 hashing
        assert.strictEqual(payload.user_data.client_ip_address, '197.200.10.5');
        assert.strictEqual(payload.user_data.client_user_agent, 'Mozilla/5.0 Test Browser');
        assert.deepStrictEqual(payload.user_data.country, [sha256('dz')]);
        assert.deepStrictEqual(payload.user_data.ph, [hashPhone('0550123456')]);
        assert.deepStrictEqual(payload.user_data.fn, [sha256('amine')]);
        assert.deepStrictEqual(payload.user_data.ln, [sha256('benali')]);
    });

    test('OrderForm pre-generates clientOrderId and passes matching eventID to fbq Purchase', () => {
        const fs = require('fs');
        const path = require('path');
        const orderFormCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'OrderForm.jsx'), 'utf8');

        assert.ok(orderFormCode.includes("const clientOrderId = 'SPDZ-'"), 'OrderForm must pre-generate clientOrderId');
        assert.ok(orderFormCode.includes("orderId: clientOrderId"), 'OrderForm must include clientOrderId in submission payload');
        assert.ok(orderFormCode.includes("const resolvedOrderId = data.orderId || clientOrderId;"), 'OrderForm must resolve order ID');
        assert.ok(orderFormCode.includes("window.fbq('track', 'Purchase'"), 'OrderForm must track Purchase event');
        assert.ok(orderFormCode.includes("eventID: data.orderId || clientOrderId") || orderFormCode.includes("eventID: resolvedOrderId"), 'OrderForm must provide matching eventID');
    });

    test('api/send-order.js validates and preserves client orderId for 1:1 CAPI deduplication', () => {
        const fs = require('fs');
        const path = require('path');
        const sendOrderCode = fs.readFileSync(path.join(__dirname, '..', 'api', 'send-order.js'), 'utf8');

        assert.ok(sendOrderCode.includes('isValidClientOrderId'), 'send-order.js must validate client orderId');
        assert.ok(sendOrderCode.includes('/^SPDZ-[\\w-]+$/'), 'send-order.js must enforce SPDZ- format');
        assert.ok(sendOrderCode.includes("sendMetaEvent({"), 'send-order.js must dispatch sendMetaEvent');
        assert.ok(sendOrderCode.includes("eventName: 'Purchase'"), 'send-order.js must use Purchase event name');
        assert.ok(sendOrderCode.includes("eventId: orderId"), 'send-order.js must use matching eventId');
    });
});

