'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { evaluateOrderRisk } = require('../lib/risk/riskEngine');
const { MockStorage, setStorageInstance } = require('../lib/storage');

describe('Risk Engine & Anti-Fraud Shield Tests', () => {
    beforeEach(() => {
        setStorageInstance(new MockStorage());
    });

    test('Clean valid order submission gets LOW risk and ALLOW decision', async () => {
        const result = await evaluateOrderRisk({
            phone: '0555123456',
            ipHash: 'hash-clean-123',
            honeypot: '',
            formDurationMs: 6500
        });

        assert.strictEqual(result.decision, 'ALLOW');
        assert.strictEqual(result.level, 'LOW');
        assert.strictEqual(result.score, 0);
        assert.strictEqual(result.reasons.length, 0);
    });

    test('Honeypot field trigger immediately blocks the submission', async () => {
        const result = await evaluateOrderRisk({
            phone: '0555123456',
            ipHash: 'hash-bot-456',
            honeypot: 'http://spam-bot.ru',
            formDurationMs: 5000
        });

        assert.strictEqual(result.decision, 'BLOCK');
        assert.strictEqual(result.level, 'CRITICAL');
        assert.ok(result.score >= 80);
        assert.ok(result.reasons.some(r => r.includes('Honeypot')));
    });

    test('Rapid robotic submission (<3.0s) elevates risk score to REVIEW', async () => {
        const result = await evaluateOrderRisk({
            phone: '0555123456',
            ipHash: 'hash-fast-789',
            honeypot: '',
            formDurationMs: 1200 // 1.2 seconds
        });

        assert.strictEqual(result.decision, 'REVIEW');
        assert.ok(result.score >= 40);
        assert.ok(result.reasons.some(r => r.includes('Instant submission')));
    });

    test('Invalid phone number increases risk score', async () => {
        const result = await evaluateOrderRisk({
            phone: '021999999', // Landline / non-mobile
            ipHash: 'hash-abc',
            honeypot: '',
            formDurationMs: 8000
        });

        assert.ok(result.score >= 50);
        assert.ok(result.reasons.some(r => r.includes('Invalid Algerian mobile')));
    });
});
