'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { MockStorage, setStorageInstance, getStorage } = require('../lib/storage');

describe('Storage Provider Abstraction Tests', () => {
    let mock;

    beforeEach(() => {
        mock = new MockStorage();
        setStorageInstance(mock);
    });

    test('Saves and retrieves an order accurately', async () => {
        const orderData = {
            orderId: 'SPDZ-TEST-001',
            fullName: 'Karim Hadji',
            phone: '0555123456',
            wilaya: '16 - Alger',
            commune: 'Bab El Oued',
            deliveryType: 'home',
            productName: 'PACK HIGH-TECH 5 EN 1',
            totalPrice: 22600,
            status: 'pending'
        };

        const saved = await mock.saveOrder(orderData, { score: 10, level: 'LOW', decision: 'ALLOW' });
        assert.ok(saved);
        assert.strictEqual(saved.orderId, 'SPDZ-TEST-001');
        assert.strictEqual(saved.riskScore, 10);

        const fetched = await mock.findOrderById('SPDZ-TEST-001');
        assert.ok(fetched);
        assert.strictEqual(fetched.fullName, 'Karim Hadji');
        assert.strictEqual(fetched.totalPrice, 22600);
    });

    test('Updates order status and adds tracking code', async () => {
        await mock.saveOrder({ orderId: 'SPDZ-TEST-002', status: 'pending' });

        const updated = await mock.updateOrderStatus('SPDZ-TEST-002', 'shipped', { trackingCode: 'SPDZ-TRACK-99' });
        assert.ok(updated);
        assert.strictEqual(updated.status, 'shipped');
        assert.strictEqual(updated.trackingCode, 'SPDZ-TRACK-99');
    });

    test('Filters orders by status and search keyword', async () => {
        await mock.saveOrder({ orderId: 'O-1', fullName: 'Amine', phone: '0555111111', status: 'pending' });
        await mock.saveOrder({ orderId: 'O-2', fullName: 'Brahim', phone: '0770222222', status: 'delivered' });
        await mock.saveOrder({ orderId: 'O-3', fullName: 'Chafik', phone: '0661333333', status: 'pending' });

        const pendingOnly = await mock.getAllOrders({ status: 'pending' });
        assert.strictEqual(pendingOnly.length, 2);

        const searchResult = await mock.getAllOrders({ search: 'Brahim' });
        assert.strictEqual(searchResult.length, 1);
        assert.strictEqual(searchResult[0].orderId, 'O-2');
    });

    test('Records risk events and manages risk watchlist', async () => {
        await mock.recordRiskEvent({ orderId: 'O-1', phone: '0555111111', score: 85, reasons: ['Bot detected'] });
        const events = await mock.getRiskEvents('O-1');
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].score, 85);

        assert.strictEqual(await mock.isWatchlisted('0555111111'), false);
        await mock.addToWatchlist('0555111111', 'phone', 'Repeated fake orders');
        assert.strictEqual(await mock.isWatchlisted('0555111111'), true);
    });
});
