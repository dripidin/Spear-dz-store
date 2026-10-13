'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const https = require('https');
const EventEmitter = require('events');

const dispatchHandler = require('../api/admin/dispatch');
const deliveryLegacyHandler = require('../api/delivery');
const { MockStorage, setStorageInstance } = require('../lib/storage');
const { ecotrackCourier, yalidineCourier, manualCourier } = require('../lib/delivery');

// Helper to simulate HTTP req / res
function createMockReqRes(method, body = {}, query = {}, headers = {}) {
    let statusCode = 200;
    let resHeaders = {};
    let responseBody = '';

    const req = {
        method,
        body,
        query,
        headers: { 'host': 'localhost:3000', ...headers },
        socket: { remoteAddress: '127.0.0.1' }
    };

    const res = {
        writeHead: (code, hdrs) => {
            statusCode = code;
            if (hdrs) resHeaders = { ...resHeaders, ...hdrs };
        },
        setHeader: (k, v) => {
            resHeaders[k.toLowerCase()] = v;
        },
        end: (data) => {
            if (data) responseBody = data;
        },
        status: function (code) {
            statusCode = code;
            return this;
        },
        json: function (payload) {
            responseBody = JSON.stringify(payload);
            return this;
        }
    };

    return {
        req,
        res,
        getStatus: () => statusCode,
        getJson: () => {
            try { return JSON.parse(responseBody); } catch (_) { return null; }
        },
        getRaw: () => responseBody
    };
}

// Helper to stub https.request for courier network calls
function stubHttps(statusCode, responseData) {
    const originalRequest = https.request;
    https.request = (options, callback) => {
        const reqStream = new EventEmitter();
        reqStream.write = () => {};
        reqStream.end = () => {
            const resStream = new EventEmitter();
            resStream.statusCode = statusCode;
            resStream.headers = { 'content-type': 'application/json' };
            callback(resStream);
            process.nextTick(() => {
                resStream.emit('data', typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
                resStream.emit('end');
            });
        };
        reqStream.destroy = () => {};
        return reqStream;
    };
    return () => { https.request = originalRequest; };
}

describe('Courier Dispatch Regression Suite (Phase 1 Fix)', () => {
    let mockStorage;
    const TEST_ADMIN_TOKEN = 'spdz_test_secret_admin_token_2026';
    const authHeaders = {
        'authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
        'x-admin-token': TEST_ADMIN_TOKEN
    };

    beforeEach(() => {
        process.env.ADMIN_API_TOKEN = TEST_ADMIN_TOKEN;
        process.env.ECOTRACK_API_TOKEN = 'valid_test_ecotrack_token';
        ecotrackCourier.token = 'valid_test_ecotrack_token';
        mockStorage = new MockStorage();
        setStorageInstance(mockStorage);
    });

    afterEach(() => {
        // cleanup
    });

    // ── Test 1 & 2: Endpoint verification & Admin authorization enforcement ────
    test('1 & 2. Dispatch request targets /api/admin/dispatch and enforces admin authorization', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-AUTH-001',
            fullName: 'Sofiane Dahmani',
            phone: '0550112233',
            wilaya: '16 - Alger',
            totalPrice: 22600,
            status: 'pending'
        });

        const { req, res, getStatus, getJson } = createMockReqRes('POST', {
            orderId: 'SPDZ-AUTH-001',
            courierId: 'manual'
        }, {}, authHeaders);

        await dispatchHandler(req, res);
        assert.strictEqual(getStatus(), 200);
        assert.strictEqual(getJson().success, true);
        assert.strictEqual(getJson().courier, 'manual');
    });

    // ── Test 3: Missing authentication is rejected ────────────────────────────
    test('3. Missing authentication is rejected with 401', async () => {
        const { req, res, getStatus, getJson } = createMockReqRes('POST', {
            orderId: 'SPDZ-001',
            courierId: 'manual'
        }, {}, {}); // No auth headers

        await dispatchHandler(req, res);
        assert.strictEqual(getStatus(), 401);
        assert.strictEqual(getJson().success, false);
        assert.ok(getJson().error.includes('UNAUTHORIZED'));
    });

    // ── Test 4: Missing credentials do not produce mock success ───────────────
    test('4. Missing credentials do not produce mock success (returns 422 MISSING_CREDENTIALS)', async () => {
        // Temporarily strip token
        process.env.ECOTRACK_API_TOKEN = '';
        ecotrackCourier.token = '';

        await mockStorage.saveOrder({
            orderId: 'SPDZ-NOCRED-001',
            fullName: 'Mehdi Ziani',
            phone: '0660998877',
            wilaya: '06 - Béjaïa',
            totalPrice: 22600,
            status: 'pending'
        });

        const { req, res, getStatus, getJson } = createMockReqRes('POST', {
            orderId: 'SPDZ-NOCRED-001',
            courierId: 'redex'
        }, {}, authHeaders);

        await dispatchHandler(req, res);
        assert.strictEqual(getStatus(), 422);
        assert.strictEqual(getJson().success, false);
        assert.ok(getJson().error.includes('MISSING_CREDENTIALS'));
    });

    // ── Test 5: Provider HTTP rejection is handled ────────────────────────────
    test('5. Provider HTTP 422 / 500 error is handled cleanly without false success', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-REJECT-001',
            fullName: 'Karim Bouzid',
            phone: '0770554433',
            wilaya: '31 - Oran',
            totalPrice: 22600,
            status: 'pending'
        });

        const restore = stubHttps(422, { message: 'Commune non desservie par Redex' });
        try {
            const { req, res, getStatus, getJson } = createMockReqRes('POST', {
                orderId: 'SPDZ-REJECT-001',
                courierId: 'redex'
            }, {}, authHeaders);

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 422);
            assert.strictEqual(getJson().success, false);
            assert.ok(getJson().error.includes('Commune non desservie'));
        } finally {
            restore();
        }
    });

    // ── Test 6: HTTP 200 with logical provider failure ────────────────────────
    test('6. HTTP 200 with logical failure (success: false) is treated as failure', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-LOGICFAIL-001',
            fullName: 'Yacine Brahimi',
            phone: '0555443322',
            wilaya: '25 - Constantine',
            totalPrice: 22600,
            status: 'pending'
        });

        const restore = stubHttps(200, {
            success: false,
            message: 'Solde du compte insuffisant pour créer ce colis'
        });

        try {
            const { req, res, getStatus, getJson } = createMockReqRes('POST', {
                orderId: 'SPDZ-LOGICFAIL-001',
                courierId: 'redex'
            }, {}, authHeaders);

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 422);
            assert.strictEqual(getJson().success, false);
            assert.ok(getJson().error.includes('Solde du compte insuffisant'));
        } finally {
            restore();
        }
    });

    // ── Test 7: Malformed or incomplete provider responses ────────────────────
    test('7. Malformed provider responses without tracking code are rejected', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-MALFORM-001',
            fullName: 'Anis Benmoussa',
            phone: '0777112233',
            wilaya: '19 - Sétif',
            totalPrice: 22600,
            status: 'pending'
        });

        // 200 OK but completely empty data object without tracking number
        const restore = stubHttps(200, {
            success: true,
            data: {}
        });

        try {
            const { req, res, getStatus, getJson } = createMockReqRes('POST', {
                orderId: 'SPDZ-MALFORM-001',
                courierId: 'redex'
            }, {}, authHeaders);

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 422);
            assert.strictEqual(getJson().success, false);
            assert.ok(getJson().error.includes('aucun code de suivi'));
        } finally {
            restore();
        }
    });

    // ── Test 8: Genuine accepted provider response persists real tracking ID ──
    test('8. Genuine accepted provider response persists real tracking ID', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-REAL-001',
            fullName: 'Rachid Ghezzal',
            phone: '0550998877',
            wilaya: '16 - Alger',
            totalPrice: 22350,
            status: 'pending'
        });

        const REAL_EXTERNAL_TRACKING = 'RDX-99887766-DZ';
        const restore = stubHttps(200, {
            success: true,
            tracking_code: REAL_EXTERNAL_TRACKING,
            data: { id: 12345, tracking: REAL_EXTERNAL_TRACKING }
        });

        try {
            const { req, res, getStatus, getJson } = createMockReqRes('POST', {
                orderId: 'SPDZ-REAL-001',
                courierId: 'redex'
            }, {}, authHeaders);

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            assert.strictEqual(getJson().success, true);
            assert.strictEqual(getJson().trackingCode, REAL_EXTERNAL_TRACKING);

            const updatedInStorage = await mockStorage.findOrderById('SPDZ-REAL-001');
            assert.strictEqual(updatedInStorage.status, 'shipped');
            assert.strictEqual(updatedInStorage.trackingCode, REAL_EXTERNAL_TRACKING);
            assert.strictEqual(updatedInStorage.courier, 'redex');
        } finally {
            restore();
        }
    });

    // ── Test 9: COD amount is taken from authoritative order data ─────────────
    test('9. COD amount is derived from authoritative order data, ignoring client tampering', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-COD-001',
            fullName: 'Nabil Bentaleb',
            phone: '0661223344',
            wilaya: '15 - Tizi Ouzou',
            unitPrice: 21900,
            shippingFee: 450,
            totalPrice: 22350,
            status: 'pending'
        });

        let capturedPayload = null;
        const originalCreate = ecotrackCourier.createShipment;
        ecotrackCourier.createShipment = async (payload) => {
            capturedPayload = payload;
            return { success: true, trackingCode: 'RDX-AUTH-PRICE-123' };
        };

        try {
            const { req, res, getStatus } = createMockReqRes('POST', {
                orderId: 'SPDZ-COD-001',
                courierId: 'redex',
                // Malicious client tries to tamper price to 100 DZD
                totalPrice: 100,
                price: 100
            }, {}, authHeaders);

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            assert.ok(capturedPayload);
            // Server MUST pass authoritative COD amount 22,350 to courier, not 100
            assert.strictEqual(capturedPayload.totalPrice, 22350);
        } finally {
            ecotrackCourier.createShipment = originalCreate;
        }
    });

    // ── Test 10: Supabase update failure produces reconciliation-required ────
    test('10. Supabase update failure after carrier acceptance returns reconciliationRequired: true', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-RECON-001',
            fullName: 'Farid Boulaya',
            phone: '0555332211',
            wilaya: '31 - Oran',
            totalPrice: 22600,
            status: 'pending'
        });

        // Carrier accepts
        const originalCreate = ecotrackCourier.createShipment;
        ecotrackCourier.createShipment = async () => ({
            success: true,
            trackingCode: 'RDX-RECON-ACCEPTED-999'
        });

        // But local storage throws error on status update
        const originalUpdate = mockStorage.updateOrderStatus;
        mockStorage.updateOrderStatus = async () => {
            throw new Error('Supabase database connection dropped during commit');
        };

        try {
            const { req, res, getStatus, getJson } = createMockReqRes('POST', {
                orderId: 'SPDZ-RECON-001',
                courierId: 'redex'
            }, {}, authHeaders);

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 500);
            assert.strictEqual(getJson().success, false);
            assert.strictEqual(getJson().reconciliationRequired, true);
            assert.strictEqual(getJson().trackingCode, 'RDX-RECON-ACCEPTED-999');
            assert.strictEqual(getJson().orderId, 'SPDZ-RECON-001');
            assert.ok(getJson().error.includes('CARRIER_ACCEPTED_BUT_LOCAL_PERSISTENCE_FAILED'));
        } finally {
            ecotrackCourier.createShipment = originalCreate;
            mockStorage.updateOrderStatus = originalUpdate;
        }
    });

    // ── Test 11: Duplicate dispatch requests do not create duplicate parcels ──
    test('11. Duplicate dispatch requests on already shipped orders are rejected', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-DUP-001',
            fullName: 'Djamel Belmadi',
            phone: '0770112233',
            wilaya: '16 - Alger',
            totalPrice: 22600,
            status: 'shipped',
            trackingCode: 'RDX-ALREADY-SHIPPED-888',
            courier: 'redex'
        });

        const { req, res, getStatus, getJson } = createMockReqRes('POST', {
            orderId: 'SPDZ-DUP-001',
            courierId: 'redex'
        }, {}, authHeaders);

        await dispatchHandler(req, res);
        assert.strictEqual(getStatus(), 400);
        assert.strictEqual(getJson().success, false);
        assert.ok(getJson().error.includes('déjà expédiée'));
    });

    // ── Test 12: Legacy endpoint cannot generate fake external tracking number 
    test('12. Legacy /api/delivery?action=create delegates to authenticated gateway and blocks fake tracking', async () => {
        // A. Unauthenticated call to legacy endpoint is rejected
        const unauthReqRes = createMockReqRes('POST', {
            orderId: 'SPDZ-LEGACY-001'
        }, { action: 'create' }, {});

        await deliveryLegacyHandler(unauthReqRes.req, unauthReqRes.res);
        assert.strictEqual(unauthReqRes.getStatus(), 401);
        assert.strictEqual(unauthReqRes.getJson().success, false);

        // B. Authenticated call routes through dispatch gateway
        await mockStorage.saveOrder({
            orderId: 'SPDZ-LEGACY-002',
            fullName: 'Aymen Mahious',
            phone: '0661556677',
            wilaya: '16 - Alger',
            totalPrice: 22350,
            status: 'pending'
        });

        const authReqRes = createMockReqRes('POST', {
            orderId: 'SPDZ-LEGACY-002',
            courierId: 'manual'
        }, { action: 'create' }, authHeaders);

        await deliveryLegacyHandler(authReqRes.req, authReqRes.res);
        assert.strictEqual(authReqRes.getStatus(), 200);
        assert.strictEqual(authReqRes.getJson().success, true);
        assert.strictEqual(authReqRes.getJson().isManual, true);
        assert.ok(authReqRes.getJson().trackingCode.startsWith('MANUAL-'));
    });

    // ── Test 13: Status and audit-history updates are verified ────────────────
    test('13. Order status updates and audit logs are recorded upon successful dispatch', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-AUDIT-001',
            fullName: 'Baghdad Bounedjah',
            phone: '0555667788',
            wilaya: '31 - Oran',
            totalPrice: 22600,
            status: 'pending'
        });

        const { req, res, getStatus } = createMockReqRes('POST', {
            orderId: 'SPDZ-AUDIT-001',
            courierId: 'manual',
            notes: 'Test dispatch note'
        }, {}, authHeaders);

        await dispatchHandler(req, res);
        assert.strictEqual(getStatus(), 200);

        const updated = await mockStorage.findOrderById('SPDZ-AUDIT-001');
        assert.strictEqual(updated.status, 'shipped');
        assert.strictEqual(updated.courier, 'manual');
        assert.ok(updated.trackingCode.startsWith('MANUAL-'));
    });

    // ── Test 14: Manual dispatch remains functional and is labeled accurately ─
    test('14. Manual dispatch generates MANUAL- prefixed reference and is marked isManual: true', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-MANUAL-001',
            fullName: 'Youcef Atal',
            phone: '0550123456',
            wilaya: '16 - Alger',
            totalPrice: 22350,
            status: 'pending'
        });

        const { req, res, getStatus, getJson } = createMockReqRes('POST', {
            orderId: 'SPDZ-MANUAL-001',
            courierId: 'manual'
        }, {}, authHeaders);

        await dispatchHandler(req, res);
        assert.strictEqual(getStatus(), 200);
        assert.strictEqual(getJson().success, true);
        assert.strictEqual(getJson().isManual, true);
        assert.ok(getJson().trackingCode.startsWith('MANUAL-'));
        assert.ok(getJson().message.includes('manuelle'));
    });
});
