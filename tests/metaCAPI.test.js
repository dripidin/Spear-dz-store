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
});
