'use strict';

// In-Memory Storage Adapter for deterministic automated testing and local zero-dependency dev

const {
    isArchived,
    isSyntheticTestOrder,
    archiveOrders,
    unarchiveOrder,
    getArchivedOrders
} = require('./archiveStore');

class MockStorage {
    constructor() {
        this.orders = new Map();
        this.customers = new Map();
        this.riskEvents = [];
        this.watchlist = new Map();
    }

    async verifyHealth() {
        return {
            ok: true,
            provider: 'memory_mock',
            tables: ['Orders', 'Customers', 'RiskEvents', 'Watchlist']
        };
    }

    async saveOrder(order, riskResult = {}) {
        if (!order || !order.orderId) {
            throw new Error('Order must contain orderId');
        }
        const unitPrice = order.unitPrice || 20400;
        const totalPrice = order.totalPrice || unitPrice + (order.shippingFee || 0);
        const record = {
            ...order,
            unitPrice,
            totalPrice,
            priceNum: order.priceNum || unitPrice,
            grandTotal: order.grandTotal || `${Number(totalPrice).toLocaleString()} DZD`,
            riskScore: riskResult.score || 0,
            riskLevel: riskResult.level || 'LOW',
            riskDecision: riskResult.decision || 'ALLOW',
            riskReasons: Array.isArray(riskResult.reasons) ? riskResult.reasons : [],
            status: order.status || 'pending',
            createdAt: order.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.orders.set(order.orderId, record);

        // Update customer record
        if (order.phone) {
            const existing = this.customers.get(order.phone) || {
                phone: order.phone,
                name: order.fullName,
                totalOrders: 0,
                createdAt: new Date().toISOString()
            };
            existing.totalOrders += 1;
            existing.updatedAt = new Date().toISOString();
            this.customers.set(order.phone, existing);
        }

        return record;
    }

    async findOrderById(orderId) {
        const found = this.orders.get(orderId) || null;
        if (!found) return null;
        return {
            ...found,
            isArchived: isArchived(orderId),
            isSynthetic: isSyntheticTestOrder(found)
        };
    }

    async getAllOrders(filter = {}) {
        let list = Array.from(this.orders.values());

        // Archive and synthetic exclusions
        if (filter.status === 'archived') {
            list = list.filter(o => isArchived(o.orderId));
        } else {
            if (!filter.includeArchived) {
                list = list.filter(o => !isArchived(o.orderId));
            }
            if (filter.excludeSynthetic) {
                list = list.filter(o => !isSyntheticTestOrder(o));
            }
        }

        if (filter.search) {
            const s = String(filter.search).toLowerCase();
            list = list.filter(o =>
                (o.orderId && o.orderId.toLowerCase().includes(s)) ||
                (o.phone && o.phone.includes(s)) ||
                (o.fullName && o.fullName.toLowerCase().includes(s)) ||
                (o.wilaya && o.wilaya.toLowerCase().includes(s))
            );
        }
        if (filter.status && filter.status !== 'all' && filter.status !== 'archived') {
            list = list.filter(o => o.status === filter.status);
        }
        if (filter.wilaya) {
            list = list.filter(o => o.wilaya === filter.wilaya);
        }
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (filter.limit) {
            list = list.slice(0, parseInt(filter.limit, 10));
        }
        return list;
    }

    async deleteOrders(orderIds, actor = 'admin', reason = 'Manual deletion') {
        const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
        const validIds = ids.map(id => String(id || '').trim()).filter(Boolean);
        if (validIds.length === 0) {
            return { success: true, count: 0, deletedIds: [] };
        }

        const targets = validIds.map(id => this.orders.get(id)).filter(Boolean);
        const archived = archiveOrders(targets, actor, reason);

        return {
            success: true,
            count: archived.length,
            deletedIds: archived.map(a => a.orderId)
        };
    }

    async getArchivedOrders() {
        return getArchivedOrders();
    }

    async updateOrderStatus(orderId, status, extra = {}) {
        const existing = this.orders.get(orderId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...extra,
            status: status || existing.status,
            updatedAt: new Date().toISOString()
        };
        this.orders.set(orderId, updated);
        return updated;
    }

    async recordRiskEvent(event) {
        const item = {
            eventId: event.eventId || 'EVT-' + Math.floor(100000 + Math.random() * 900000),
            ...event,
            createdAt: event.createdAt || new Date().toISOString()
        };
        this.riskEvents.push(item);
        return item;
    }

    async getRiskEvents(orderId) {
        if (!orderId) return this.riskEvents;
        return this.riskEvents.filter(e => e.orderId === orderId);
    }

    async isWatchlisted(identifier) {
        if (!identifier) return false;
        return this.watchlist.has(String(identifier).toLowerCase());
    }

    async addToWatchlist(identifier, type = 'phone', reason = 'Manual') {
        const key = String(identifier).toLowerCase();
        const entry = {
            identifier: key,
            type,
            reason,
            createdAt: new Date().toISOString()
        };
        this.watchlist.set(key, entry);
        return entry;
    }

    // Reset helper for tests
    clear() {
        this.orders.clear();
        this.customers.clear();
        this.riskEvents = [];
        this.watchlist.clear();
    }
}

module.exports = MockStorage;
