'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sendOrderHandler = require('../api/send-order');
const { MockStorage, setStorageInstance } = require('../lib/storage');

function mockReqRes(method, body = {}, headers = {}) {
    let statusCode = 200;
    let resHeaders = {};
    let responseBody = '';

    const req = {
        method,
        body,
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

describe('Order Deduplication & Idempotency Protection Suite', () => {
    let mockStorage;

    beforeEach(() => {
        mockStorage = new MockStorage();
        setStorageInstance(mockStorage);
        if (typeof sendOrderHandler._clearDedupeCacheForTesting === 'function') {
            sendOrderHandler._clearDedupeCacheForTesting();
        }
    });

    test('First valid order creates a record and returns 200 with new orderId', async () => {
        const orderPayload = {
            fullName: 'خينش عطيه',
            phone: '0667092586',
            wilaya: '55 - Touggourt (تقرت)',
            wilayaCode: 55,
            commune: 'Touggourt',
            deliveryType: 'home',
            bundleId: 'pack_hightech_5in1'
        };

        const { req, res, getStatus, getJson } = mockReqRes('POST', orderPayload);
        await sendOrderHandler(req, res);

        assert.strictEqual(getStatus(), 200);
        const data = getJson();
        assert.strictEqual(data.success, true);
        assert.ok(data.orderId, 'Should generate orderId');
        assert.ok(data.orderId.startsWith('SPDZ-'), 'orderId must start with SPDZ-');
        assert.strictEqual(data.isDuplicate, undefined);

        // Verify exactly 1 order in storage
        const allOrders = await mockStorage.getAllOrders();
        assert.strictEqual(allOrders.length, 1);
        assert.strictEqual(allOrders[0].orderId, data.orderId);
    });

    test('Rapid duplicate submission with identical phone and bundle is deduplicated', async () => {
        const phone = '0667092586';
        const payload1 = {
            orderId: 'SPDZ-04490544-9811',
            fullName: 'خينش عطيه',
            phone,
            wilaya: '55 - Touggourt (تقرت)',
            wilayaCode: 55,
            commune: 'Touggourt',
            deliveryType: 'home',
            bundleId: 'pack_hightech_5in1'
        };

        // First submission
        const first = mockReqRes('POST', payload1);
        await sendOrderHandler(first.req, first.res);
        assert.strictEqual(first.getStatus(), 200);
        const firstData = first.getJson();
        assert.strictEqual(firstData.success, true);
        assert.strictEqual(firstData.orderId, 'SPDZ-04490544-9811');

        // Second submission 5 seconds later with DIFFERENT client orderId (simulating multiple button clicks)
        const payload2 = {
            orderId: 'SPDZ-04498124-9855',
            fullName: 'خينش عطيه',
            phone,
            wilaya: '55 - Touggourt (تقرت)',
            wilayaCode: 55,
            commune: 'Touggourt',
            deliveryType: 'home',
            bundleId: 'pack_hightech_5in1'
        };

        const second = mockReqRes('POST', payload2);
        await sendOrderHandler(second.req, second.res);
        assert.strictEqual(second.getStatus(), 200);
        const secondData = second.getJson();
        assert.strictEqual(secondData.success, true);
        assert.strictEqual(secondData.isDuplicate, true);
        assert.strictEqual(secondData.orderId, 'SPDZ-04490544-9811', 'Must return the original orderId instead of creating a second');

        // Third submission
        const payload3 = {
            orderId: 'SPDZ-04503206-7181',
            fullName: 'خينش عطيه',
            phone,
            wilaya: '55 - Touggourt (تقرت)',
            wilayaCode: 55,
            commune: 'Touggourt',
            deliveryType: 'home',
            bundleId: 'pack_hightech_5in1'
        };

        const third = mockReqRes('POST', payload3);
        await sendOrderHandler(third.req, third.res);
        assert.strictEqual(third.getStatus(), 200);
        const thirdData = third.getJson();
        assert.strictEqual(thirdData.success, true);
        assert.strictEqual(thirdData.isDuplicate, true);
        assert.strictEqual(thirdData.orderId, 'SPDZ-04490544-9811');

        // Storage MUST contain ONLY 1 order, not 3!
        const allOrders = await mockStorage.getAllOrders();
        assert.strictEqual(allOrders.length, 1, 'Only one order must exist in storage despite 3 submissions');
        assert.strictEqual(allOrders[0].orderId, 'SPDZ-04490544-9811');
    });

    test('Different phone numbers are processed as distinct orders', async () => {
        const p1 = {
            fullName: 'Customer One',
            phone: '0550112233',
            wilaya: '16 - Alger',
            wilayaCode: 16,
            commune: 'Bab Ezzouar',
            deliveryType: 'home'
        };
        const p2 = {
            fullName: 'Customer Two',
            phone: '0550998877',
            wilaya: '16 - Alger',
            wilayaCode: 16,
            commune: 'Kouba',
            deliveryType: 'home'
        };

        const first = mockReqRes('POST', p1);
        await sendOrderHandler(first.req, first.res);

        const second = mockReqRes('POST', p2);
        await sendOrderHandler(second.req, second.res);

        assert.strictEqual(first.getStatus(), 200);
        assert.strictEqual(second.getStatus(), 200);
        assert.notStrictEqual(first.getJson().orderId, second.getJson().orderId);

        const all = await mockStorage.getAllOrders();
        assert.strictEqual(all.length, 2);
    });

    test('Same customer ordering different bundle (Pack 1 vs Pack 2) is permitted', async () => {
        const phone = '0770554433';
        const pack1 = {
            fullName: 'Customer Diverse',
            phone,
            wilaya: '31 - Oran',
            wilayaCode: 31,
            commune: 'Oran',
            deliveryType: 'home',
            bundleId: 'pack_hightech_5in1'
        };
        const pack2 = {
            fullName: 'Customer Diverse',
            phone,
            wilaya: '31 - Oran',
            wilayaCode: 31,
            commune: 'Oran',
            deliveryType: 'home',
            bundleId: 'pack_sound_4in1'
        };

        const res1 = mockReqRes('POST', pack1);
        await sendOrderHandler(res1.req, res1.res);

        const res2 = mockReqRes('POST', pack2);
        await sendOrderHandler(res2.req, res2.res);

        assert.strictEqual(res1.getStatus(), 200);
        assert.strictEqual(res2.getStatus(), 200);
        assert.strictEqual(res1.getJson().isDuplicate, undefined);
        assert.strictEqual(res2.getJson().isDuplicate, undefined);

        const all = await mockStorage.getAllOrders();
        assert.strictEqual(all.length, 2);
    });

    test('Frontend OrderForm.jsx implements orderPlacedInfo state and prevents re-submission', () => {
        const orderFormCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'OrderForm.jsx'), 'utf8');

        assert.ok(orderFormCode.includes('orderPlacedInfo'), 'OrderForm must track orderPlacedInfo');
        assert.ok(orderFormCode.includes('setOrderPlacedInfo'), 'OrderForm must update setOrderPlacedInfo');
        assert.ok(orderFormCode.includes('handleResetNewOrder'), 'OrderForm must provide handleResetNewOrder');
        assert.ok(orderFormCode.includes('if (orderPlacedInfo)'), 'OrderForm must guard handleSubmit against duplicates');
    });

    test('Frontend StickyMobileBar.jsx accepts isCompleted prop and shows confirmed status', () => {
        const stickyBarCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'StickyMobileBar.jsx'), 'utf8');

        assert.ok(stickyBarCode.includes('isCompleted'), 'StickyMobileBar must accept isCompleted');
        assert.ok(stickyBarCode.includes('تم تأكيد طلبك بنجاح'), 'StickyMobileBar must show confirmed label in Arabic');
    });
});
