'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const authHandler = require('../api/admin/auth');
const analyticsHandler = require('../api/admin/analytics');
const tariffsHandler = require('../api/admin/tariffs');
const dispatchHandler = require('../api/admin/dispatch');
const { MockStorage, setStorageInstance } = require('../lib/storage');

// Helper to simulate request / response
function mockReqRes(method, body = {}, query = {}, headers = {}) {
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
            try { return JSON.parse(responseBody); } catch (e) { return null; }
        }
    };
}

describe('Enterprise Admin Hub & Security Tests', () => {
    let mockStorage;
    const TEST_ADMIN_TOKEN = 'test-enterprise-master-token-xyz-12345';

    beforeEach(() => {
        process.env.ADMIN_API_TOKEN = TEST_ADMIN_TOKEN;
        mockStorage = new MockStorage();
        setStorageInstance(mockStorage);
    });

    // ── 1. Authentication & Session Security ─────────────────────────────────
    describe('Admin Authentication & Session Token Handling', () => {
        test('GET /api/admin/auth rejects unauthenticated requests with 401', async () => {
            const { req, res, getStatus, getJson } = mockReqRes('GET');
            await authHandler(req, res);
            assert.strictEqual(getStatus(), 401);
            assert.strictEqual(getJson().authenticated, false);
        });

        test('POST /api/admin/auth rejects wrong credentials with 401', async () => {
            const { req, res, getStatus, getJson } = mockReqRes('POST', { token: 'invalid-password' });
            await authHandler(req, res);
            assert.strictEqual(getStatus(), 401);
            assert.strictEqual(getJson().success, false);
        });

        test('POST /api/admin/auth issues secure session token on correct credentials', async () => {
            const { req, res, getStatus, getJson } = mockReqRes('POST', { token: TEST_ADMIN_TOKEN });
            await authHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            const data = getJson();
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.authenticated, true);
            assert.ok(data.sessionToken.startsWith('spdz_sess_'));
            assert.ok(data.expiresAt);

            // Verify issued session token passes GET /api/admin/auth
            const check = mockReqRes('GET', {}, {}, { authorization: `Bearer ${data.sessionToken}` });
            await authHandler(check.req, check.res);
            assert.strictEqual(check.getStatus(), 200);
            assert.strictEqual(check.getJson().authenticated, true);

            // Revoke session
            const revoke = mockReqRes('DELETE', {}, {}, { authorization: `Bearer ${data.sessionToken}` });
            await authHandler(revoke.req, revoke.res);
            assert.strictEqual(revoke.getStatus(), 200);

            // After revocation, session must fail
            const checkRevoked = mockReqRes('GET', {}, {}, { authorization: `Bearer ${data.sessionToken}` });
            await authHandler(checkRevoked.req, checkRevoked.res);
            assert.strictEqual(checkRevoked.getStatus(), 401);
        });
    });

    // ── 2. Operational KPIs & Server-side Analytics ─────────────────────────
    describe('Operational KPIs & Analytics Aggregations', () => {
        test('GET /api/admin/analytics rejects unauthorized requests with 401', async () => {
            const { req, res, getStatus } = mockReqRes('GET');
            await analyticsHandler(req, res);
            assert.strictEqual(getStatus(), 401);
        });

        test('Calculates all 10 precision KPIs and trend datasets correctly', async () => {
            // Seed mock storage with distinct operational order states using saveOrder
            await mockStorage.saveOrder({
                orderId: 'SPDZ-TEST-001',
                orderNumber: 'SPDZ-TEST-001',
                fullName: 'Karim Brahimi',
                customerName: 'Karim Brahimi',
                phone: '0555123456',
                customerPhone: '0555123456',
                wilaya: '16 - Alger',
                wilayaName: 'Alger',
                wilayaCode: 16,
                totalPrice: 21900,
                status: 'delivered',
                createdAt: new Date().toISOString()
            });

            await mockStorage.saveOrder({
                orderId: 'SPDZ-TEST-002',
                orderNumber: 'SPDZ-TEST-002',
                fullName: 'Yacine Amari',
                customerName: 'Yacine Amari',
                phone: '0666123456',
                customerPhone: '0666123456',
                wilaya: '31 - Oran',
                wilayaName: 'Oran',
                wilayaCode: 31,
                totalPrice: 22400,
                status: 'shipped',
                createdAt: new Date().toISOString()
            });

            await mockStorage.saveOrder({
                orderId: 'SPDZ-TEST-003',
                orderNumber: 'SPDZ-TEST-003',
                fullName: 'Amina Belkacem',
                customerName: 'Amina Belkacem',
                phone: '0777123456',
                customerPhone: '0777123456',
                wilaya: '25 - Constantine',
                wilayaName: 'Constantine',
                wilayaCode: 25,
                totalPrice: 22500,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            await mockStorage.saveOrder({
                orderId: 'SPDZ-TEST-004',
                orderNumber: 'SPDZ-TEST-004',
                fullName: 'Mehdi Taleb',
                customerName: 'Mehdi Taleb',
                phone: '0550112233',
                customerPhone: '0550112233',
                wilaya: '19 - Setif',
                wilayaName: 'Setif',
                wilayaCode: 19,
                totalPrice: 21900,
                status: 'returned',
                createdAt: new Date().toISOString()
            });

            const { req, res, getStatus, getJson } = mockReqRes(
                'GET',
                {},
                {},
                { authorization: `Bearer ${TEST_ADMIN_TOKEN}` }
            );

            await analyticsHandler(req, res);
            assert.strictEqual(getStatus(), 200);

            const json = getJson();
            assert.strictEqual(json.success, true);
            assert.ok(json.kpis, 'KPIs object must exist');

            const { kpis, charts } = json;

            // Check metric counts
            assert.strictEqual(kpis.totalOrders, 4);
            assert.strictEqual(kpis.pendingOrders, 1);
            assert.strictEqual(kpis.inTransitOrders, 1);
            assert.strictEqual(kpis.deliveredOrders, 1);
            assert.strictEqual(kpis.returnedOrders, 1);

            // Financial KPIs
            assert.strictEqual(kpis.grossDeliveredRevenue, 21900);
            assert.strictEqual(kpis.pendingCodValue, 22400 + 22500); // Shipped + Pending
            assert.strictEqual(kpis.avgOrderValue, 21900);

            // Rates calculation
            // Confirmed/progressed: delivered (1) + shipped (1) + returned (1) = 3 out of 4 non-spam = 75.0%
            assert.strictEqual(kpis.confirmationRate, 75.0);

            // Delivery success rate: delivered (1) / (delivered 1 + returned 1) = 50.0%
            assert.strictEqual(kpis.deliverySuccessRate, 50.0);

            // Charts integrity
            assert.ok(Array.isArray(charts.trend.labels));
            assert.ok(charts.trend.labels.length >= 7);
            assert.ok(Array.isArray(charts.wilayas.labels));
            assert.ok(charts.wilayas.labels.length > 0);
        });
    });

    // ── 3. Dynamic Shipping Tariffs Management ──────────────────────────────
    describe('Dynamic Shipping Tariffs (58 Wilayas)', () => {
        test('GET /api/admin/tariffs returns complete 58 Wilayas tariffs', async () => {
            const { req, res, getStatus, getJson } = mockReqRes('GET');
            await tariffsHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            const data = getJson();
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.count, 58);
            assert.strictEqual(data.data[0].wilayaCode, 1); // Adrar
            assert.ok(data.data[15].wilayaName.includes('Alger') || data.data[15].wilayaCode === 16);
        });

        test('PUT /api/admin/tariffs rejects unauthenticated requests with 401', async () => {
            const { req, res, getStatus } = mockReqRes('PUT', {
                wilayaCode: 16,
                homeFee: 500,
                deskFee: 350
            });
            await tariffsHandler(req, res);
            assert.strictEqual(getStatus(), 401);
        });

        test('PUT /api/admin/tariffs validates non-negative rates and updates tariff', async () => {
            // Negative fee must be rejected
            const negativeTest = mockReqRes(
                'PUT',
                { wilayaCode: 16, homeFee: -100, deskFee: 300 },
                {},
                { authorization: `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await tariffsHandler(negativeTest.req, negativeTest.res);
            assert.strictEqual(negativeTest.getStatus(), 400);

            // Valid update
            const validUpdate = mockReqRes(
                'PUT',
                { wilayaCode: 16, homeFee: 550, deskFee: 350, deliveryTime: '24 H' },
                {},
                { authorization: `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await tariffsHandler(validUpdate.req, validUpdate.res);
            assert.strictEqual(validUpdate.getStatus(), 200);
            const body = validUpdate.getJson();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data.homeFee, 550);
            assert.strictEqual(body.data.deskFee, 350);
        });
    });

    // ── 4. Multi-Carrier Dispatch & Logistics ───────────────────────────────
    describe('Courier Dispatch Engine & Tracking Timeline', () => {
        test('POST /api/admin/dispatch rejects unauthorized calls with 401', async () => {
            const { req, res, getStatus } = mockReqRes('POST', { orderId: 'SPDZ-123', courierId: 'manual' });
            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 401);
        });

        test('Dispatches order to manual courier and generates tracking code', async () => {
            const created = await mockStorage.saveOrder({
                orderId: 'SPDZ-DISP-001',
                orderNumber: 'SPDZ-DISP-001',
                fullName: 'Samir Larbi',
                customerName: 'Samir Larbi',
                phone: '0555889900',
                customerPhone: '0555889900',
                wilaya: '09 - Blida',
                wilayaName: 'Blida',
                wilayaCode: 9,
                totalPrice: 21900,
                status: 'confirmed',
                deliveryType: 'home'
            });

            const { req, res, getStatus, getJson } = mockReqRes(
                'POST',
                {
                    orderId: created.id || created.orderId,
                    courierId: 'manual',
                    notes: 'Emballage renforcé'
                },
                {},
                { authorization: `Bearer ${TEST_ADMIN_TOKEN}` }
            );

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            const data = getJson();
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.courier, 'manual');
            assert.ok(data.trackingCode.startsWith('SPDZ-'));

            // Check order was updated to shipped in storage
            const updated = await mockStorage.findOrderById(created.orderId);
            assert.strictEqual(updated.status, 'shipped');
            assert.strictEqual(updated.courier, 'manual');
            assert.strictEqual(updated.trackingCode, data.trackingCode);

            // Prevent duplicate dispatch
            const dupTest = mockReqRes(
                'POST',
                { orderId: created.orderId, courierId: 'manual' },
                {},
                { authorization: `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await dispatchHandler(dupTest.req, dupTest.res);
            assert.strictEqual(dupTest.getStatus(), 400);
            assert.ok(dupTest.getJson().error.includes('déjà expédiée'));
        });

        test('GET /api/admin/dispatch retrieves tracking status and courier list', async () => {
            const created = await mockStorage.saveOrder({
                orderId: 'SPDZ-TRACK-001',
                orderNumber: 'SPDZ-TRACK-001',
                fullName: 'Farid Mansour',
                customerName: 'Farid Mansour',
                phone: '0666778899',
                customerPhone: '0666778899',
                wilaya: '16 - Alger',
                wilayaName: 'Alger',
                wilayaCode: 16,
                totalPrice: 21900,
                status: 'shipped',
                courier: 'manual',
                trackingCode: 'MAN-SPDZ-TRACK-001'
            });

            const { req, res, getStatus, getJson } = mockReqRes(
                'GET',
                {},
                { orderId: created.orderId },
                { authorization: `Bearer ${TEST_ADMIN_TOKEN}` }
            );

            await dispatchHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            const data = getJson();
            assert.strictEqual(data.success, true);
            assert.ok(data.couriers);
            assert.ok(data.couriers.some(c => c.id === 'yalidine'));
            assert.ok(data.couriers.some(c => c.id === 'redex'));
            assert.ok(data.couriers.some(c => c.id === 'manual'));
        });
    });

    // ── 5. A6 Thermal Shipping Label & Print Isolation ───────────────────────
    describe('A6 Thermal Shipping Label & Barcode Standards', () => {
        test('public/css/admin.css contains A6 100x150mm page dimensions and print isolation', () => {
            const cssPath = path.join(__dirname, '..', 'public', 'css', 'admin.css');
            assert.ok(fs.existsSync(cssPath), 'admin.css must exist');
            const css = fs.readFileSync(cssPath, 'utf8');

            // Must contain @page size: 100mm 150mm
            assert.ok(css.includes('@page') && css.includes('100mm'), 'Must declare thermal label dimensions');
            assert.ok(css.includes('@media print'), 'Must declare print isolation rules');
            assert.ok(css.includes('#printableLabel'), 'Must style printable label');
            // Must hide app navigation chrome during print
            assert.ok(css.includes('display: none !important') || css.includes('visibility: hidden !important'), 'Must hide app chrome');
        });

        test('admin.html has dedicated printable label template with Code128 barcode target', () => {
            const htmlPath = path.join(__dirname, '..', 'admin.html');
            assert.ok(fs.existsSync(htmlPath), 'admin.html must exist');
            const html = fs.readFileSync(htmlPath, 'utf8');

            assert.ok(html.includes('id="printableLabel"'), 'Must have printableLabel element');
            assert.ok(html.includes('id="labelBarcodeSvg"'), 'Must have labelBarcodeSvg element');
            assert.ok(html.includes('id="labelTrackingCodeText"'), 'Must have tracking code label text');
            assert.ok(html.includes('id="labelCodAmount"'), 'Must display COD collection amount');
        });
    });

    // ── 6. Bilingual Localization Integrity ─────────────────────────────────
    describe('Bilingual AR RTL and FR LTR Dictionary Integrity', () => {
        test('admin-client.js contains both Arabic and French translation mappings', () => {
            const jsPath = path.join(__dirname, '..', 'public', 'js', 'admin-client.js');
            assert.ok(fs.existsSync(jsPath), 'admin-client.js must exist');
            const clientJs = fs.readFileSync(jsPath, 'utf8');

            // Check dictionary definitions
            assert.ok(clientJs.includes("ar: {"), 'Must define Arabic dictionary');
            assert.ok(clientJs.includes("fr: {"), 'Must define French dictionary');
            assert.ok(clientJs.includes("brandSub:"), 'Must translate brandSub');
            assert.ok(clientJs.includes("kpiRevenue:"), 'Must translate kpiRevenue');
            assert.ok(clientJs.includes("kpiPendingCod:"), 'Must translate kpiPendingCod');
            assert.ok(clientJs.includes("kpiConfirmed:"), 'Must translate kpiConfirmed');
            assert.ok(clientJs.includes("kpiDelivered:"), 'Must translate kpiDelivered');
        });
    });
});
