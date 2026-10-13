'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const sendOrderHandler = require('../api/send-order');
const ordersHandler = require('../api/orders');
const deliveryHandler = require('../api/delivery');
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

describe('End-to-End API Order Flow & Security Tests', () => {
    let mockStorage;

    beforeEach(() => {
        mockStorage = new MockStorage();
        setStorageInstance(mockStorage);
        process.env.ADMIN_API_TOKEN = 'secret-test-admin-token-12345';
    });

    test('POST /api/send-order: Valid order succeeds and enforces server-side price', async () => {
        const { req, res, getStatus, getJson } = mockReqRes('POST', {
            fullName: 'Riad Mahrez',
            phone: '0555987654',
            wilaya: '16 - Alger',
            wilayaCode: 16,
            commune: 'Hydra',
            deliveryType: 'home',
            // Attacker attempts to forge price
            price: 500,
            grandTotal: 1000
        });

        await sendOrderHandler(req, res);

        assert.strictEqual(getStatus(), 200);
        const json = getJson();
        assert.ok(json);
        assert.strictEqual(json.success, true);
        assert.ok(json.orderId);
        // Dynamic check based on official Alger rates (Ecotrack live rates)
        const expectedShippingFee = require('../config/shippingRates.json')['16']?.home || 700;
        const expectedTotal = 21900 + expectedShippingFee;
        assert.strictEqual(json.subtotal, 21900);
        assert.strictEqual(json.shippingFee, expectedShippingFee);
        assert.strictEqual(json.totalPrice, expectedTotal);

        // Verify persistence in storage
        const saved = await mockStorage.findOrderById(json.orderId);
        assert.ok(saved);
        assert.strictEqual(saved.totalPrice, expectedTotal);
    });

    test('POST /api/send-order: Rejects invalid phone number with 400', async () => {
        const { req, res, getStatus, getJson } = mockReqRes('POST', {
            fullName: 'Riad Mahrez',
            phone: '021999999', // Invalid landline
            wilaya: '16 - Alger'
        });

        await sendOrderHandler(req, res);

        assert.strictEqual(getStatus(), 400);
        const json = getJson();
        assert.strictEqual(json.success, false);
        assert.ok(json.error.includes('رقم الهاتف'));
    });

    test('POST /api/send-order: Honeypot submission is blocked with 403', async () => {
        const { req, res, getStatus, getJson } = mockReqRes('POST', {
            fullName: 'Spam Bot',
            phone: '0555000000',
            wilaya: '16 - Alger',
            website_url_hp: 'http://spam.site'
        });

        await sendOrderHandler(req, res);

        assert.strictEqual(getStatus(), 403);
        const json = getJson();
        assert.strictEqual(json.success, false);
    });

    test('GET /api/orders: Rejects unauthenticated requests with 401', async () => {
        const { req, res, getStatus, getJson } = mockReqRes('GET', {}, {}, {});

        await ordersHandler(req, res);

        assert.strictEqual(getStatus(), 401);
        const json = getJson();
        assert.strictEqual(json.success, false);
        assert.ok(json.error.includes('UNAUTHORIZED'));
    });

    test('GET /api/orders: Authenticated admin can retrieve orders', async () => {
        await mockStorage.saveOrder({ orderId: 'O-100', fullName: 'Test', phone: '0555111111', status: 'pending' });

        const { req, res, getStatus, getJson } = mockReqRes('GET', {}, {}, {
            'authorization': 'Bearer secret-test-admin-token-12345'
        });

        await ordersHandler(req, res);

        assert.strictEqual(getStatus(), 200);
        const json = getJson();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.count, 1);
        assert.strictEqual(json.data[0].orderId, 'O-100');
    });

    test('PATCH /api/orders: Rejects invalid status transitions with 400', async () => {
        await mockStorage.saveOrder({ orderId: 'O-200', status: 'delivered' });

        const { req, res, getStatus, getJson } = mockReqRes('PATCH', {
            orderId: 'O-200',
            status: 'pending' // Invalid: cannot go from delivered back to pending
        }, {}, {
            'authorization': 'Bearer secret-test-admin-token-12345'
        });

        await ordersHandler(req, res);

        assert.strictEqual(getStatus(), 400);
        const json = getJson();
        assert.strictEqual(json.success, false);
        assert.ok(json.error.includes('Invalid status transition'));
    });

    test('GET /api/delivery: Public tariff lookup returns 58 wilayas', async () => {
        const { req, res, getStatus, getJson } = mockReqRes('GET', {}, { action: 'tariffs' });

        await deliveryHandler(req, res);

        assert.strictEqual(getStatus(), 200);
        const json = getJson();
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.count, 58);
    });

    test('GET /api/delivery?action=get_all_orders & /api/orders: Returns test orders without silent suppression', async () => {
        // Merchant submits an order while testing their store using name "test orders01"
        await mockStorage.saveOrder({
            orderId: 'SPDZ-TEST-ORDERS-01',
            fullName: 'test orders01',
            phone: '0793731312',
            wilaya: '16 - Alger',
            deliveryType: 'desk',
            totalPrice: 22350,
            status: 'pending'
        });

        // 1. Check /api/delivery?action=get_all_orders
        const { req: delReq, res: delRes, getStatus: getDelStatus, getJson: getDelJson } = mockReqRes(
            'GET',
            {},
            { action: 'get_all_orders' },
            { 'authorization': 'Bearer secret-test-admin-token-12345' }
        );
        await deliveryHandler(delReq, delRes);
        assert.strictEqual(getDelStatus(), 200);
        const delJson = getDelJson();
        assert.strictEqual(delJson.success, true);
        assert.strictEqual(delJson.count, 1);
        assert.strictEqual(delJson.data[0].orderId, 'SPDZ-TEST-ORDERS-01');

        // 2. Check /api/orders
        const { req: ordReq, res: ordRes, getStatus: getOrdStatus, getJson: getOrdJson } = mockReqRes(
            'GET',
            {},
            {},
            { 'authorization': 'Bearer secret-test-admin-token-12345' }
        );
        await ordersHandler(ordReq, ordRes);
        assert.strictEqual(getOrdStatus(), 200);
        const ordJson = getOrdJson();
        assert.strictEqual(ordJson.success, true);
        assert.strictEqual(ordJson.count, 1);
        assert.strictEqual(ordJson.data[0].fullName, 'test orders01');
    });

    test('Order presentation fields: verifies grandTotal, priceNum, totalPrice, unitPrice are properly mapped and not undefined', async () => {
        await mockStorage.saveOrder({
            orderId: 'SPDZ-242674-133',
            fullName: 'IDIN DRIP',
            phone: '0793731310',
            wilaya: '18 - Jijel (جيجل)',
            commune: 'Oudjana',
            deliveryType: 'desk',
            unitPrice: 21900,
            shippingFee: 450,
            totalPrice: 22350,
            status: 'pending'
        });

        const orders = await mockStorage.getAllOrders();
        const o = orders.find(item => item.orderId === 'SPDZ-242674-133');
        assert.ok(o);
        assert.strictEqual(o.unitPrice, 21900);
        assert.strictEqual(o.shippingFee, 450);
        assert.strictEqual(o.totalPrice, 22350);
        assert.strictEqual(o.priceNum, 21900);
        assert.ok(o.grandTotal.includes('22,350 DZD'));
        assert.ok(!o.grandTotal.includes('undefined'));
    });

    test('Duplicate order submission is idempotent and does not crash', async () => {
        const orderData = {
            orderId: 'SPDZ-DUPLICATE-TEST',
            fullName: 'IDIN DRIP',
            phone: '0793731310',
            wilaya: '18 - Jijel (جيجل)',
            commune: 'Oudjana',
            deliveryType: 'desk',
            unitPrice: 21900,
            shippingFee: 450,
            totalPrice: 22350,
            status: 'pending'
        };

        const firstSave = await mockStorage.saveOrder(orderData);
        assert.ok(firstSave);

        // Submit duplicate
        const secondSave = await mockStorage.saveOrder(orderData);
        assert.ok(secondSave);
        assert.strictEqual(secondSave.orderId, 'SPDZ-DUPLICATE-TEST');
    });
});

