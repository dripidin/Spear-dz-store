'use strict';

const { getStorage } = require('../lib/storage');
const {
    authenticateAdmin,
    applyCorsHeaders,
    sanitizeString,
    maskPhone
} = require('../lib/security');

// Allowed status transitions
const VALID_TRANSITIONS = {
    'pending': ['confirmed', 'review', 'cancelled'],
    'review': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'returned'],
    'delivered': [],
    'returned': [],
    'cancelled': []
};

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Strict Administrative Authorization
    if (!authenticateAdmin(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'UNAUTHORIZED: Valid ADMIN_API_TOKEN is required in Authorization header'
        }));
        return;
    }

    const storage = getStorage();
    const query = req.query || {};

    try {
        // ── GET: Query and filter orders ─────────────────────────────────────
        if (req.method === 'GET') {
            const { orderId, search, status, wilaya, limit, exportFormat } = query;

            if (orderId) {
                const order = await storage.findOrderById(orderId);
                if (!order) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Order not found' }));
                    return;
                }
                const riskEvents = await storage.getRiskEvents(orderId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: order, riskEvents }));
                return;
            }

            const orders = await storage.getAllOrders({
                search: sanitizeString(search, 100),
                status: sanitizeString(status, 20),
                wilaya: sanitizeString(wilaya, 50),
                limit: Math.min(500, parseInt(limit, 10) || 100)
            });

            // Optional CSV Export
            if (exportFormat === 'csv') {
                const headers = ['order_id', 'full_name', 'phone', 'wilaya', 'commune', 'delivery_type', 'total_price', 'status', 'tracking_code', 'created_at'];
                const rows = [headers.join(',')];
                for (const o of orders) {
                    rows.push([
                        `"${o.orderId}"`,
                        `"${(o.fullName || '').replace(/"/g, '""')}"`,
                        `"${o.phone}"`,
                        `"${(o.wilaya || '').replace(/"/g, '""')}"`,
                        `"${(o.commune || '').replace(/"/g, '""')}"`,
                        `"${o.deliveryType}"`,
                        o.totalPrice,
                        `"${o.status}"`,
                        `"${o.trackingCode || ''}"`,
                        `"${o.createdAt}"`
                    ].join(','));
                }
                res.writeHead(200, {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="orders_export.csv"'
                });
                res.end(rows.join('\n'));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                count: orders.length,
                data: orders
            }));
            return;
        }

        // ── PATCH / PUT: Update Order Status or Notes ────────────────────────
        if (req.method === 'PATCH' || req.method === 'PUT') {
            const body = req.body || {};
            const targetOrderId = sanitizeString(query.orderId || body.orderId, 50);

            if (!targetOrderId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Missing orderId' }));
                return;
            }

            const existing = await storage.findOrderById(targetOrderId);
            if (!existing) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Order not found' }));
                return;
            }

            const newStatus = sanitizeString(body.status, 20);
            if (newStatus && newStatus !== existing.status) {
                const allowed = VALID_TRANSITIONS[existing.status] || [];
                if (!allowed.includes(newStatus)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: `Invalid status transition from '${existing.status}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'None'}`
                    }));
                    return;
                }
            }

            const updated = await storage.updateOrderStatus(targetOrderId, newStatus || existing.status, {
                trackingCode: sanitizeString(body.trackingCode, 100),
                courier: sanitizeString(body.courier, 50),
                notes: sanitizeString(body.notes, 200)
            });

            console.log('[AdminAudit] Order %s status updated: %s -> %s', targetOrderId, existing.status, newStatus || existing.status);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: updated }));
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));

    } catch (err) {
        console.error('[api/orders] Processing error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
    }
};
