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
});

