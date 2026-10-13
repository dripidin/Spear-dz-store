'use strict';

const { getCourier, getAvailableCouriers } = require('../../lib/delivery');
const { getStorage } = require('../../lib/storage');
const { authenticateAdmin, applyCorsHeaders, sanitizeString } = require('../../lib/security');

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (!authenticateAdmin(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'UNAUTHORIZED: Admin session required' }));
        return;
    }

    const storage = getStorage();

    try {
        // ── GET: Courier status and parcel tracking history ───────────────────
        if (req.method === 'GET') {
            const query = req.query || {};
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

            const courier = getCourier(order.courier || 'manual');
            let trackingResult = null;
            if (order.trackingCode) {
                try {
                    trackingResult = await courier.getTracking(order.trackingCode);
                } catch (trackErr) {
                    trackingResult = {
                        success: false,
                        error: trackErr.message,
                        courier: order.courier,
                        trackingCode: order.trackingCode
                    };
                }
            }

            // Fetch stored tracking events from Supabase if available
            let events = [];
            if (typeof storage.getClient === 'function') {
                try {
                    const client = storage.getClient();
                    const { data } = await client
                        .from('courier_tracking_events')
                        .select('*')
                        .eq('order_id', orderId)
                        .order('created_at', { ascending: false });
                    events = data || [];
                } catch (_) {}
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                order,
                tracking: trackingResult,
                events,
                couriers: getAvailableCouriers()
            }));
            return;
        }

        // ── POST: Create and dispatch parcel to carrier ───────────────────────
        if (req.method === 'POST') {
            const body = req.body || {};
            const orderId = sanitizeString(body.orderId, 50);
            const courierId = sanitizeString(body.courierId || 'manual', 30);
            const operatorNotes = sanitizeString(body.notes || '', 200);

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

            // Prevent duplicate active dispatches if already shipped with valid tracking
            if (order.status === 'shipped' && order.trackingCode && !body.forceReassign) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `La commande est déjà expédiée avec le code ${order.trackingCode} (${order.courier}). Cochez 'forceReassign' pour remplacer.`
                }));
                return;
            }

            const courier = getCourier(courierId);
            const shipmentRes = await courier.createShipment({
                ...order,
                fullName: body.fullName || order.fullName,
                phone: body.phone || order.phone,
                wilaya: body.wilaya || order.wilaya,
                commune: body.commune || order.commune,
                address: body.address || order.address,
                deliveryType: body.deliveryType || order.deliveryType,
                totalPrice: body.totalPrice != null ? Number(body.totalPrice) : order.totalPrice
            });

            if (!shipmentRes.success || !shipmentRes.trackingCode) {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: shipmentRes.error || shipmentRes.message || 'Le transporteur a rejeté la création du colis'
                }));
                return;
            }

            const trackingCode = shipmentRes.trackingCode;

            // 1. Update order status to shipped in Supabase
            const updatedOrder = await storage.updateOrderStatus(orderId, 'shipped', {
                trackingCode,
                courier: courierId,
                notes: operatorNotes || order.notes
            });

            // 2. Record status history in Supabase
            if (typeof storage.getClient === 'function') {
                try {
                    const client = storage.getClient();
                    await client.from('order_status_history').insert([{
                        order_id: orderId,
                        from_status: order.status,
                        to_status: 'shipped',
                        changed_by: 'admin',
                        notes: `Expédié via ${courier.name} [Tracking: ${trackingCode}]`
                    }]);

                    // 3. Record courier tracking event
                    await client.from('courier_tracking_events').insert([{
                        order_id: orderId,
                        courier: courierId,
                        tracking_code: trackingCode,
                        status: 'dispatched',
                        status_description: 'Colis créé et prêt pour expédition',
                        location: order.wilaya || 'Alger',
                        raw_payload: shipmentRes
                    }]);
                } catch (dbErr) {
                    console.warn('[api/admin/dispatch] Supabase tracking event notice:', dbErr.message);
                }
            }

            // 4. Record audit log
            try {
                await storage.recordAuditLog('DISPATCH_PARCEL', 'order', orderId, 'admin', {
                    courier: courierId,
                    trackingCode,
                    amount: updatedOrder.totalPrice
                });
            } catch (_) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: `Colis créé avec succès auprès de ${courier.name}`,
                orderId,
                courier: courierId,
                trackingCode,
                order: updatedOrder
            }));
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));

    } catch (err) {
        console.error('[api/admin/dispatch] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
    }
};
