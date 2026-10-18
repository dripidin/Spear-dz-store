'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ordersHandler = require('../api/orders');
const analyticsHandler = require('../api/admin/analytics');
const { MockStorage, setStorageInstance } = require('../lib/storage');
const { isSyntheticTestOrder } = require('../lib/storage/archiveStore');

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

describe('Order Data Cleanup, Grid View & Order Management Tests', () => {
    let mockStorage;
    const TEST_ADMIN_TOKEN = 'test-admin-secret-token-2026';

    beforeEach(() => {
        process.env.ADMIN_API_TOKEN = TEST_ADMIN_TOKEN;
        mockStorage = new MockStorage();
        setStorageInstance(mockStorage);
    });

    // ── 1. Deletion Security & Authorization ─────────────────────────────────
    describe('Order Deletion Authorization & Validation', () => {
        test('DELETE /api/orders rejects unauthenticated requests with 401', async () => {
            const { req, res, getStatus, getJson } = mockReqRes('DELETE', { orderId: 'SPDZ-123456-001' });
            await ordersHandler(req, res);

            assert.strictEqual(getStatus(), 401);
            const json = getJson();
            assert.strictEqual(json.success, false);
            assert.match(json.error, /UNAUTHORIZED/);
        });

        test('DELETE /api/orders rejects requests with invalid body (no orderId or orderIds)', async () => {
            const { req, res, getStatus, getJson } = mockReqRes(
                'DELETE',
                {},
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await ordersHandler(req, res);

            assert.strictEqual(getStatus(), 400);
            const json = getJson();
            assert.strictEqual(json.success, false);
            assert.match(json.error, /Missing orderId/);
        });
    });

    // ── 2. Single & Bulk Order Deletion ──────────────────────────────────────
    describe('Single-Order & Bulk-Order Removal Flow', () => {
        test('Single order deletion successfully removes order and returns deleted count', async () => {
            // First create a test order in storage
            const testOrder = {
                orderId: 'SPDZ-DEL-TEST-001',
                fullName: 'Mourad Test',
                phone: '0555123456',
                wilaya: 'Alger',
                commune: 'Bab El Oued',
                totalPrice: 20400,
                status: 'pending'
            };
            await mockStorage.saveOrder(testOrder);

            const { req, res, getStatus, getJson } = mockReqRes(
                'DELETE',
                { orderId: 'SPDZ-DEL-TEST-001', reason: 'manual_admin_delete' },
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await ordersHandler(req, res);

            assert.strictEqual(getStatus(), 200);
            const json = getJson();
            assert.strictEqual(json.success, true);
            assert.strictEqual(json.deletedCount, 1);
            assert.deepStrictEqual(json.deletedIds, ['SPDZ-DEL-TEST-001']);

            // Verify order is no longer returned in GET /api/orders
            const getCheck = mockReqRes(
                'GET',
                {},
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await ordersHandler(getCheck.req, getCheck.res);
            const ordersJson = getCheck.getJson();
            assert.strictEqual(ordersJson.success, true);
            const exists = ordersJson.data.some(o => o.orderId === 'SPDZ-DEL-TEST-001');
            assert.strictEqual(exists, false);
        });

        test('Bulk order deletion removes multiple orders and reports result', async () => {
            const orderIds = ['SPDZ-BULK-001', 'SPDZ-BULK-002', 'SPDZ-BULK-003'];
            for (const id of orderIds) {
                await mockStorage.saveOrder({
                    orderId: id,
                    fullName: `Customer ${id}`,
                    phone: '0666000111',
                    wilaya: 'Oran',
                    totalPrice: 15000,
                    status: 'pending'
                });
            }

            const { req, res, getStatus, getJson } = mockReqRes(
                'DELETE',
                { orderIds, reason: 'test_bulk_removal' },
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await ordersHandler(req, res);

            assert.strictEqual(getStatus(), 200);
            const json = getJson();
            assert.strictEqual(json.success, true);
            assert.strictEqual(json.deletedCount, 3);
            assert.deepStrictEqual(json.deletedIds, orderIds);

            // Re-query and verify none remain
            const listCheck = mockReqRes(
                'GET',
                {},
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await ordersHandler(listCheck.req, listCheck.res);
            const listJson = listCheck.getJson();
            const foundAny = listJson.data.some(o => orderIds.includes(o.orderId));
            assert.strictEqual(foundAny, false);
        });
    });

    // ── 3. KPI Recalculation & Denominator Integrity ─────────────────────────
    describe('KPI Calculations & Denominator Integrity', () => {
        test('Delivery success rate returns null (not 100%) when delivered + returned is 0', async () => {
            // Storage has only pending orders
            const { req, res, getStatus, getJson } = mockReqRes(
                'GET',
                {},
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await analyticsHandler(req, res);

            assert.strictEqual(getStatus(), 200);
            const json = getJson();
            assert.strictEqual(json.success, true);
            // Delivery rate must be null so UI can render '—', NEVER 100%
            assert.strictEqual(json.kpis.deliverySuccessRate, null);
        });

        test('Delivery rate calculates accurately when delivered orders exist', async () => {
            await mockStorage.saveOrder({
                orderId: 'SPDZ-DELIV-001',
                fullName: 'Delivered User',
                phone: '0555999888',
                wilaya: 'Constantine',
                totalPrice: 22000,
                status: 'delivered'
            });
            await mockStorage.saveOrder({
                orderId: 'SPDZ-RET-001',
                fullName: 'Returned User',
                phone: '0555999777',
                wilaya: 'Annaba',
                totalPrice: 22000,
                status: 'returned'
            });

            const { req, res, getStatus, getJson } = mockReqRes(
                'GET',
                {},
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );
            await analyticsHandler(req, res);

            assert.strictEqual(getStatus(), 200);
            const json = getJson();
            assert.strictEqual(json.success, true);
            // 1 delivered out of 2 closed = 50.0%
            assert.strictEqual(json.kpis.deliverySuccessRate, 50.0);
            assert.strictEqual(json.kpis.deliveredOrders, 1);
            assert.strictEqual(json.kpis.returnedOrders, 1);
        });
    });

    // ── 4. Synthetic Test Order Filtering ────────────────────────────────────
    describe('Synthetic Test Order Identification & Exclusion', () => {
        test('isSyntheticTestOrder correctly detects fixture and demo patterns', () => {
            assert.strictEqual(isSyntheticTestOrder({ fullName: 'Amine Benali (TEST)' }), true);
            assert.strictEqual(isSyntheticTestOrder({ phone: '0555000000' }), true);
            assert.strictEqual(isSyntheticTestOrder({ phone: '0661000001' }), true);
            assert.strictEqual(isSyntheticTestOrder({ fullName: 'Client Démo Alger' }), true);
            assert.strictEqual(isSyntheticTestOrder({ orderId: 'SPDZ-FIXTURE-001' }), true);

            // Real Algerian customer orders must NOT be classified as synthetic
            assert.strictEqual(isSyntheticTestOrder({ fullName: 'Ahmed Mansouri', phone: '0541289341' }), false);
            assert.strictEqual(isSyntheticTestOrder({ fullName: 'Karim Ziani', phone: '0770123984' }), false);
        });
    });

    // ── 5. DOM & CSS Architecture Verification ──────────────────────────────
    describe('UI Architecture, Mobile Orders & Order Management Integrity', () => {
        const adminHtmlPath = path.join(__dirname, '..', 'admin.html');
        const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin.css');
        const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-client.js');

        test('admin.html contains Search, Status Tabs, and Mobile Orders Container', () => {
            const html = fs.readFileSync(adminHtmlPath, 'utf8');

            assert.ok(html.includes('id="tableSearchInput"') || html.includes('id="globalSearchInput"'), 'Must contain search input');
            assert.ok(html.includes('class="status-filter-tabs"'), 'Must contain status filter tabs');
            assert.ok(html.includes('id="ordersTable"'), 'Must contain ordersTable');
            assert.ok(html.includes('id="mobileOrdersContainer"'), 'Must contain mobileOrdersContainer');
        });

        test('public/css/admin.css defines responsive mobile order cards and status tabs', () => {
            const css = fs.readFileSync(adminCssPath, 'utf8');

            assert.ok(css.includes('.status-filter-tabs'), 'CSS must define .status-filter-tabs');
            assert.ok(css.includes('.mobile-orders-container'), 'CSS must define .mobile-orders-container');
            assert.ok(css.includes('.mobile-order-card'), 'CSS must define .mobile-order-card');
        });

        test('public/js/admin-client.js renders touch-friendly mobile order cards with phone and actions', () => {
            const js = fs.readFileSync(adminJsPath, 'utf8');

            assert.ok(js.includes('mobile-order-card'), 'JS must render mobile-order-card');
            assert.ok(js.includes('tel:'), 'JS must format customer phone as tel: link');
            assert.ok(js.includes('deleteColis'), 'JS must implement deleteColis');
            assert.ok(js.includes('renderMobileOrders'), 'JS must implement renderMobileOrders');
        });
    });
});
