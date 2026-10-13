'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
    normalizeAlgerianPhone,
    maskPhone,
    hashIp,
    timingSafeCompare,
    authenticateAdmin,
    sanitizeString
} = require('../lib/security');

describe('Security & Input Sanitization Tests', () => {
    test('Normalizes valid Algerian mobile numbers', () => {
        assert.strictEqual(normalizeAlgerianPhone('0555123456'), '0555123456');
        assert.strictEqual(normalizeAlgerianPhone('0661234567'), '0661234567');
        assert.strictEqual(normalizeAlgerianPhone('0770987654'), '0770987654');
        assert.strictEqual(normalizeAlgerianPhone('+213555123456'), '0555123456');
        assert.strictEqual(normalizeAlgerianPhone('00213661234567'), '0661234567');
        assert.strictEqual(normalizeAlgerianPhone('213770987654'), '0770987654');
        assert.strictEqual(normalizeAlgerianPhone('05 55 12 34 56'), '0555123456');
    });

    test('Rejects invalid phone numbers and landlines', () => {
        assert.strictEqual(normalizeAlgerianPhone('021234567'), null); // Landline
        assert.strictEqual(normalizeAlgerianPhone('041234567'), null); // Landline
        assert.strictEqual(normalizeAlgerianPhone('12345678'), null);   // Too short
        assert.strictEqual(normalizeAlgerianPhone('0888123456'), null); // Non-existent prefix
        assert.strictEqual(normalizeAlgerianPhone('abcdefghij'), null); // Non-digit
        assert.strictEqual(normalizeAlgerianPhone(''), null);
    });

    test('Masks phone numbers properly for safe logging', () => {
        assert.strictEqual(maskPhone('0555123456'), '05****3456');
        assert.strictEqual(maskPhone('0770987654'), '07****7654');
        assert.strictEqual(maskPhone('123'), '****');
    });

    test('Hashes IP addresses with sha256', () => {
        const hash = hashIp('197.112.50.12');
        assert.ok(hash);
        assert.strictEqual(typeof hash, 'string');
        assert.strictEqual(hash.length, 32);
    });

    test('Constant-time comparison works correctly', () => {
        assert.strictEqual(timingSafeCompare('secret-token-123', 'secret-token-123'), true);
        assert.strictEqual(timingSafeCompare('secret-token-123', 'wrong-token'), false);
        assert.strictEqual(timingSafeCompare('secret-token-123', 'secret-token-124'), false);
        assert.strictEqual(timingSafeCompare(null, 'secret'), false);
    });

    test('Admin authentication rejects missing or invalid tokens', () => {
        process.env.ADMIN_API_TOKEN = 'test-secret-token-xyz-1234567890';

        // Valid token
        const reqValid = { headers: { authorization: 'Bearer test-secret-token-xyz-1234567890' } };
        assert.strictEqual(authenticateAdmin(reqValid), true);

        // Invalid token
        const reqInvalid = { headers: { authorization: 'Bearer wrong-token' } };
        assert.strictEqual(authenticateAdmin(reqInvalid), false);

        // Missing header
        const reqMissing = { headers: {} };
        assert.strictEqual(authenticateAdmin(reqMissing), false);
    });

    test('Sanitizes HTML and controls length', () => {
        const dirty = '<script>alert("xss")</script> Mohamed <b>Ali</b>';
        const clean = sanitizeString(dirty, 50);
        assert.strictEqual(clean, 'alert("xss") Mohamed Ali');
    });
});
