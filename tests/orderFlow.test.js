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
});
