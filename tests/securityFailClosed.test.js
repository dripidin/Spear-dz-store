'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { authenticateAdmin } = require('../lib/security');
const adminAuthHandler = require('../api/admin/auth');
const authHandler = require('../api/auth');
const deliveryHandler = require('../api/delivery');
const dispatchHandler = require('../api/admin/dispatch');
const { sendOrderNotification } = require('../lib/telegram');
const { getCourier, getAvailableCouriers } = require('../lib/delivery');
const EcotrackCourier = require('../lib/delivery/ecotrackCourier');
const MockStorage = require('../lib/storage/mockStorage');
const storageModule = require('../lib/storage');

function mockReqRes(method = 'GET', body = {}, query = {}, headers = {}) {
    let statusCode = 200;
    let headersSent = {};
    let responseBody = '';

    const req = {
        method,
        body,
        query,
        headers: {
            'content-type': 'application/json',
            ...headers
        }
    };

    const res = {
        setHeader: (name, val) => {
            headersSent[name.toLowerCase()] = val;
        },
        writeHead: (code, hdrs = {}) => {
            statusCode = code;
            headersSent = { ...headersSent, ...hdrs };
        },
        end: (chunk) => {
            if (chunk) responseBody += chunk;
        }
    };

    return {
        req,
        res,
        getStatus: () => statusCode,
        getJson: () => {
            try {
                return JSON.parse(responseBody);
            } catch (_) {
                return responseBody;
            }
        }
    };
}

describe('PHASE 4A: Security Fail-Closed Regression Suite', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    test('1. Missing ADMIN_API_TOKEN fails closed in lib/security (never accepts L3abedstore2026)', () => {
        delete process.env.ADMIN_API_TOKEN;
        delete process.env.ADMIN_PASSWORD;

        // Even with known former default fallback token, it MUST fail closed
        const reqWithFormerDefault = {
            headers: { 'authorization': 'Bearer L3abedstore2026' }
        };
        assert.strictEqual(authenticateAdmin(reqWithFormerDefault), false, 'Must fail closed when ADMIN_API_TOKEN is missing');

        // Random token must also fail
        const reqWithRandom = {
            headers: { 'authorization': 'Bearer random-test-token' }
        };
        assert.strictEqual(authenticateAdmin(reqWithRandom), false);
    });

    test('2. Missing ADMIN_API_TOKEN in api/admin/auth returns 500 configuration error', async () => {
        delete process.env.ADMIN_API_TOKEN;
        delete process.env.ADMIN_PASSWORD;

        const { req, res, getStatus, getJson } = mockReqRes('POST', { password: 'L3abedstore2026' });
        await adminAuthHandler(req, res);

        assert.strictEqual(getStatus(), 500);
        const json = getJson();
        assert.strictEqual(json.success, false);
        assert.match(json.error, /ADMIN_AUTH_MISCONFIGURED/);
    });

    test('3. Missing ADMIN_API_TOKEN in api/auth returns 500 configuration error', async () => {
        delete process.env.ADMIN_API_TOKEN;
        delete process.env.ADMIN_PASSWORD;

        const { req, res, getStatus, getJson } = mockReqRes('POST', { password: 'L3abedstore2026' });
        await authHandler(req, res);

        assert.strictEqual(getStatus(), 500);
        const json = getJson();
        assert.strictEqual(json.success, false);
        assert.match(json.error, /ADMIN_AUTH_MISCONFIGURED/);
    });

    test('4. Configured ADMIN_API_TOKEN rejects invalid credentials and accepts valid token', () => {
        process.env.ADMIN_API_TOKEN = 'spear-dz-super-secret-token-2026';

        // Rejection
        assert.strictEqual(authenticateAdmin({ headers: { 'authorization': 'Bearer wrong-pass' } }), false);
        assert.strictEqual(authenticateAdmin({ headers: { 'authorization': 'Bearer L3abedstore2026' } }), false);

        // Acceptance
        assert.strictEqual(authenticateAdmin({ headers: { 'authorization': 'Bearer spear-dz-super-secret-token-2026' } }), true);
    });

    test('5. Unauthenticated requests to legacy delivery endpoints are blocked (401)', async () => {
        process.env.ADMIN_API_TOKEN = 'spear-dz-super-secret-token-2026';

        // 5a. GET /api/delivery?action=get_all_orders without auth
        const { req: r1, res: res1, getStatus: s1, getJson: j1 } = mockReqRes('GET', {}, { action: 'get_all_orders' });
        await deliveryHandler(r1, res1);
        assert.strictEqual(s1(), 401);
        assert.strictEqual(j1().success, false);

        // 5b. POST /api/delivery?action=delete without auth
        const { req: r2, res: res2, getStatus: s2, getJson: j2 } = mockReqRes('POST', { orderId: 'SPDZ-123' }, { action: 'delete' });
        await deliveryHandler(r2, res2);
        assert.strictEqual(s2(), 401);
        assert.strictEqual(j2().success, false);

        // 5c. GET /api/delivery?action=test_courier without auth
        const { req: r3, res: res3, getStatus: s3, getJson: j3 } = mockReqRes('GET', {}, { action: 'test_courier' });
        await deliveryHandler(r3, res3);
        assert.strictEqual(s3(), 401);
        assert.strictEqual(j3().success, false);
    });

    test('6. Missing ECOTRACK_API_TOKEN fails closed (never produces real dispatch)', () => {
        delete process.env.ECOTRACK_API_TOKEN;

        const courier = new EcotrackCourier();
        assert.strictEqual(courier.isConfigured(), false, 'Ecotrack must be unconfigured when ECOTRACK_API_TOKEN is missing');
        assert.strictEqual(courier.token, '', 'Token must not contain hardcoded fallback');
    });

    test('7. Missing Telegram bot credentials safely skips notification without throwing', async () => {
        delete process.env.TELEGRAM_BOT_TOKEN;
        delete process.env.TELEGRAM_CHAT_ID;

        const result = await sendOrderNotification({ orderId: 'SPDZ-SAFE-001', totalPrice: 21900 });
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.skipped, true);
        assert.strictEqual(result.reason, 'Telegram bot credentials not configured');
    });

    test('8. Manual dispatch is explicitly distinct and marked isManual: true', async () => {
        process.env.ADMIN_API_TOKEN = 'valid-token';
        process.env.STORAGE_BACKEND = 'mock';
        process.env.NODE_ENV = 'test';
        const mockStorage = new MockStorage();
        if (typeof storageModule.setStorageInstance === 'function') {
            storageModule.setStorageInstance(mockStorage);
        } else {
            storageModule.activeStorageInstance = mockStorage;
        }

        await mockStorage.saveOrder({
            orderId: 'SPDZ-MANUAL-CHECK',
            fullName: 'Client Test',
            phone: '0555123456',
            wilaya: '16 - Alger',
            deliveryType: 'home',
            totalPrice: 22600,
            status: 'confirmed'
        });

        const { req, res, getStatus, getJson } = mockReqRes('POST', {
            orderId: 'SPDZ-MANUAL-CHECK',
            courierId: 'manual',
            notes: 'Livraison en main propre'
        }, {}, { 'authorization': 'Bearer valid-token' });

        await dispatchHandler(req, res);
        assert.strictEqual(getStatus(), 200);
        const json = getJson();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.isManual, true);
        assert.strictEqual(json.courier, 'manual');
        assert.match(json.trackingCode, /^MANUAL-/);
    });

    test('9. No production secrets or service role keys leaked in public client assets', () => {
        const publicJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-client.js'), 'utf8');
        assert.strictEqual(publicJs.includes('L3abedstore2026'), false, 'admin-client.js must not contain default password');
        assert.strictEqual(publicJs.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
        assert.strictEqual(publicJs.includes('ECOTRACK_API_TOKEN'), false);

        // Check index.html
        const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
        assert.strictEqual(indexHtml.includes('service_role'), false);
    });
});
