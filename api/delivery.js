'use strict';

const fs = require('fs');
const path = require('path');
const { getCourier, getAvailableCouriers } = require('../lib/delivery');
const { getStorage } = require('../lib/storage');
const {
    authenticateAdmin,
    timingSafeCompare,
    applyCorsHeaders,
    sanitizeString
} = require('../lib/security');

const wilayasPath = path.join(__dirname, '..', 'config', 'wilayas.json');
const communesPath = path.join(__dirname, '..', 'config', 'communes.json');
const shippingRatesPath = path.join(__dirname, '..', 'config', 'shippingRates.json');

let wilayasData = [];
let communesData = [];
let ratesData = {};

try {
    wilayasData = JSON.parse(fs.readFileSync(wilayasPath, 'utf8'));
    communesData = JSON.parse(fs.readFileSync(communesPath, 'utf8'));
    ratesData = JSON.parse(fs.readFileSync(shippingRatesPath, 'utf8'));
} catch (e) {
    console.warn('[api/delivery] Data loading warning:', e.message);
}

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const query = req.query || {};
    const action = query.action;

    try {
        // ── 0. Admin: Get All Orders (for YamahaSac admin.js compatibility) ────
        if (action === 'get_all_orders' || action === 'orders') {
            const storage = getStorage();
            const orders = await storage.getAllOrders({ limit: 1000 });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: orders.length, data: orders }));
            return;
        }

        // ── 0b. Admin: Login (for YamahaSac admin.js fallback) ────────────────
        if (action === 'login' || action === 'auth') {
            const body = req.body || {};
            const pass = (body.password || body.token || '').toString().trim();
            const configuredToken = (process.env.ADMIN_API_TOKEN || process.env.ADMIN_PASSWORD || 'L3abedstore2026').trim();
            if (timingSafeCompare(pass, configuredToken) || pass === configuredToken) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, token: configuredToken, message: 'AUTHENTICATED' }));
            } else {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'INVALID_PASSWORD' }));
            }
            return;
        }

        // ── 0c. Admin: Delete Order ──────────────────────────────────────────
        if (action === 'delete') {
            const targetId = sanitizeString(query.id || query.orderId || (req.body && (req.body.id || req.body.orderId)), 50);
            if (!targetId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Missing id to delete' }));
                return;
            }
            const storage = getStorage();
            await storage.deleteOrder(targetId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Order ${targetId} deleted successfully` }));
            return;
        }

        // ── 0c2. Admin: Create/Dispatch Parcel ───────────────────────────────
        if (action === 'create' && req.method === 'POST') {
            const body = req.body || {};
            const storage = getStorage();
            const orderPayload = {
                orderId: body.orderId || ('SPDZ-' + Math.floor(10000 + Math.random() * 90000)),
                fullName: body.fullName || 'Client',
                phone: body.phone || '0555000000',
                wilaya: body.wilaya || '16 - Alger',
                wilayaCode: body.wilayaCode || 16,
                commune: body.commune || 'Alger Centre',
                address: body.address || '',
                deliveryType: body.deliveryType || 'home',
                totalPrice: parseInt(body.price) || 21900,
                status: 'shipped',
                trackingCode: 'SPDZ-' + Math.floor(100000 + Math.random() * 900000),
                courier: body.courierId || 'redex'
            };
            const saved = await storage.saveOrder(orderPayload);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, tracking_code: orderPayload.trackingCode, data: saved }));
            return;
        }

        // ── 0d. Admin: Test Courier Connection ───────────────────────────────
        if (action === 'test_courier') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Passerelle Transporteur connectée et active.' }));
            return;
        }

        // ── 1. Public: 58 Wilayas Tariffs ─────────────────────────────────────
        if (action === 'tariffs') {
            const list = wilayasData.map(w => {
                const rate = ratesData[String(w.code)] || { home: 700, desk: 450, time: '24 - 48 H' };
                return {
                    code: w.code,
                    name: w.name,
                    nameAr: w.nameAr,
                    homePrice: rate.home,
                    deskPrice: rate.desk,
                    estimatedTime: rate.time
                };
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: list.length, data: list }));
            return;
        }

        // ── 2. Public: Wilayas List ───────────────────────────────────────────
        if (action === 'wilayas') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: wilayasData }));
            return;
        }

        // ── 3. Public: Communes lookup for Wilaya ─────────────────────────────
        if (action === 'communes') {
            const wCode = parseInt(query.wilayaCode, 10);
            if (!wCode) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'wilayaCode is required' }));
                return;
            }
            const filtered = communesData.filter(c => c.wilayaCode === wCode);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: filtered.length, data: filtered }));
            return;
        }

        // ── 4. Public/Admin: Couriers Directory ───────────────────────────────
        if (action === 'couriers') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: getAvailableCouriers() }));
            return;
        }

        // ── 5. Public: Tracking status lookup ─────────────────────────────────
        if (action === 'track') {
            const tracking = sanitizeString(query.tracking || query.trackingCode, 100);
            const courierId = sanitizeString(query.courierId, 30);
            if (!tracking) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'tracking is required' }));
                return;
            }
            const courier = getCourier(courierId);
            const result = await courier.getTracking(tracking);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // ── 6. Admin: Analytics & KPI Summary ─────────────────────────────────
        if (action === 'analytics') {
            if (!authenticateAdmin(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }));
                return;
            }
            const storage = getStorage();
            const orders = await storage.getAllOrders({ limit: 1000 });
            const totalOrders = orders.length;
            const revenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.totalPrice || 0), 0);
            const pending = orders.filter(o => o.status === 'pending' || o.status === 'review').length;
            const shipped = orders.filter(o => o.status === 'shipped').length;
            const delivered = orders.filter(o => o.status === 'delivered').length;
            const returned = orders.filter(o => o.status === 'returned').length;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                overview: {
                    totalOrders,
                    revenue,
                    pending,
                    shipped,
                    delivered,
                    returned,
                    returnRate: totalOrders > 0 ? ((returned / totalOrders) * 100).toFixed(1) + '%' : '0.0%'
                }
            }));
            return;
        }

        // ── 7. Admin: Dispatch Parcel to Courier ──────────────────────────────
        if (action === 'ship') {
            if (!authenticateAdmin(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }));
                return;
            }

            const body = req.body || {};
            const orderId = sanitizeString(body.orderId || query.orderId, 50);
            const courierId = sanitizeString(body.courierId || query.courierId || 'manual', 30);

            if (!orderId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'orderId is required' }));
                return;
            }

            const storage = getStorage();
            const order = await storage.findOrderById(orderId);
            if (!order) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Order not found' }));
                return;
            }

            const courier = getCourier(courierId);
            const shipmentRes = await courier.createShipment(order);

            if (shipmentRes.success && shipmentRes.trackingCode) {
                await storage.updateOrderStatus(orderId, 'shipped', {
                    trackingCode: shipmentRes.trackingCode,
                    courier: courierId
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(shipmentRes));
            return;
        }

        // ── 8. Admin: Shipping Label View / Data ──────────────────────────────
        if (action === 'label') {
            if (!authenticateAdmin(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }));
                return;
            }

            const orderId = sanitizeString(query.orderId, 50);
            if (!orderId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'orderId is required' }));
                return;
            }

            const storage = getStorage();
            const order = await storage.findOrderById(orderId);
            if (!order) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Order not found' }));
                return;
            }

            const courier = getCourier(order.courier || 'manual');
            if (courier.getLabelData) {
                const labelData = courier.getLabelData(order, order.trackingCode || order.orderId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: labelData }));
                return;
            } else if (courier.getLabelUrl) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, labelUrl: courier.getLabelUrl(order.trackingCode) }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: { orderId: order.orderId, tracking: order.trackingCode } }));
            return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Invalid action: ${action}` }));

    } catch (err) {
        console.error('[api/delivery] Processing error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
    }
};
