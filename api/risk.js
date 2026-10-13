'use strict';

const { getStorage } = require('../lib/storage');
const {
    authenticateAdmin,
    applyCorsHeaders,
    sanitizeString
} = require('../lib/security');

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const query = req.query || {};
    const storage = getStorage();

    try {
        // ── Public Health Check ───────────────────────────────────────────────
        if (req.method === 'GET' && query.action === 'health') {
            const health = await storage.verifyHealth();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(health));
            return;
        }

        // All other risk endpoints require administrative authorization
        if (!authenticateAdmin(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'UNAUTHORIZED: Valid ADMIN_API_TOKEN is required' }));
            return;
        }

        // ── GET: Risk evaluation details for an order ─────────────────────────
        if (req.method === 'GET') {
            const orderId = sanitizeString(query.orderId, 50);
            if (!orderId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'orderId is required' }));
                return;
            }
            const order = await storage.findOrderById(orderId);
            if (!order) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Order not found' }));
                return;
            }
            const events = await storage.getRiskEvents(orderId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                orderId: order.orderId,
                riskScore: order.riskScore,
                riskLevel: order.riskLevel,
                riskDecision: order.riskDecision,
                riskReasons: order.riskReasons,
                events
            }));
            return;
        }

        // ── POST: Risk Override or Add to Watchlist ───────────────────────────
        if (req.method === 'POST') {
            const body = req.body || {};
            const action = sanitizeString(body.action, 30);

            if (action === 'watchlist') {
                const identifier = sanitizeString(body.identifier, 100);
                const type = sanitizeString(body.type || 'phone', 20);
                const reason = sanitizeString(body.reason || 'Manual entry', 200);

                if (!identifier) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'identifier is required' }));
                    return;
                }

                const entry = await storage.addToWatchlist(identifier, type, reason);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Added to watchlist', entry }));
                return;
            }

            const orderId = sanitizeString(body.orderId, 50);
            if (!orderId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'orderId is required' }));
                return;
            }

            let newStatus = 'pending';
            if (action === 'trust' || action === 'confirm') {
                newStatus = 'confirmed';
            } else if (action === 'block' || action === 'reject') {
                newStatus = 'cancelled';
            }

            const updated = await storage.updateOrderStatus(orderId, newStatus, {
                riskDecision: action === 'trust' ? 'ALLOW' : 'BLOCK',
                notes: `Risk decision overridden to ${action.toUpperCase()}`
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, action, updated }));
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));

    } catch (err) {
        console.error('[api/risk] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
    }
};
