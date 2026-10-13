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
            const courierId = sanitizeString(body.courierId || 'manual', 30).toLowerCase();
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

            // Verify courier configuration / credentials
            const courier = getCourier(courierId);
            if (courierId !== 'manual') {
                if (typeof courier.isConfigured === 'function' && !courier.isConfigured()) {
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: `MISSING_CREDENTIALS: Le transporteur ${courier.name} n'est pas configuré. Veuillez vérifier les clés API d'intégration.`
                    }));
                    return;
                }
            }

            // Authoritative recipient data validation
            if (!order.fullName || !order.phone || !order.wilaya) {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `Données destinataire incomplètes (nom, téléphone ou wilaya manquant) pour la commande ${orderId}`
                }));
                return;
            }

            // Authoritative COD calculation from persisted order
            let codAmount = Number(order.totalPrice);
            if (!codAmount || isNaN(codAmount) || codAmount <= 0) {
                const uPrice = Number(order.unitPrice);
                const sFee = Number(order.shippingFee);
                if (uPrice && !isNaN(uPrice) && uPrice > 0 && !isNaN(sFee) && sFee >= 0) {
                    codAmount = uPrice + sFee;
                }
            }

            if (!codAmount || isNaN(codAmount) || codAmount <= 0) {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `Montant COD invalide ou manquant (${order.totalPrice}) pour la commande ${orderId}. Vérification financière requise.`
                }));
                return;
            }

            let wCode = parseInt(order.wilayaCode, 10);
            if (!wCode || isNaN(wCode)) {
                const m = String(order.wilaya || '').match(/^(\d{1,2})/);
                wCode = m ? parseInt(m[1], 10) : 16;
            }

            // Construct payload using strictly authoritative order data
            const shipmentPayload = {
                orderId: order.orderId,
                fullName: order.fullName,
                phone: order.phone,
                wilaya: order.wilaya,
                wilayaCode: wCode,
                commune: order.commune || 'Centre Ville',
                address: order.address || order.commune || '',
                deliveryType: order.deliveryType || body.deliveryType || 'home',
                totalPrice: codAmount,
                productName: order.productName || 'PACK HIGH-TECH 5 EN 1',
                notes: operatorNotes || order.notes || ''
            };

            let shipmentRes;
            try {
                shipmentRes = await courier.createShipment(shipmentPayload);
            } catch (courierErr) {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `Erreur du transporteur: ${courierErr.message}`
                }));
                return;
            }

            if (!shipmentRes || !shipmentRes.success || !shipmentRes.trackingCode) {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: (shipmentRes && (shipmentRes.error || shipmentRes.message)) || 'Le transporteur a rejeté la création du colis'
                }));
                return;
            }

            const trackingCode = String(shipmentRes.trackingCode).trim();

            // 1. Update order status to shipped in Supabase with reconciliation-required guarantee
            let updatedOrder;
            try {
                updatedOrder = await storage.updateOrderStatus(orderId, 'shipped', {
                    trackingCode,
                    courier: courierId,
                    notes: operatorNotes || order.notes
                });
            } catch (dbUpdateErr) {
                console.error('[api/admin/dispatch] Carrier accepted shipment but Supabase update failed:', dbUpdateErr.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    reconciliationRequired: true,
                    error: `CARRIER_ACCEPTED_BUT_LOCAL_PERSISTENCE_FAILED: Le transporteur a accepté le colis (Code: ${trackingCode}), mais la mise à jour locale a échoué: ${dbUpdateErr.message}. Réconciliation requise.`,
                    orderId,
                    courier: courierId,
                    trackingCode
                }));
                return;
            }

            // 2. Record status history in Supabase
            if (typeof storage.getClient === 'function') {
                try {
                    const client = storage.getClient();
                    await client.from('order_status_history').insert([{
                        order_id: orderId,
                        from_status: order.status,
                        to_status: 'shipped',
                        changed_by: 'admin',
                        notes: courierId === 'manual'
                            ? `Expédition manuelle enregistrée [Réf: ${trackingCode}]`
                            : `Expédié via ${courier.name} [Tracking: ${trackingCode}]`
                    }]);

                    // 3. Record courier tracking event
                    await client.from('courier_tracking_events').insert([{
                        order_id: orderId,
                        courier: courierId,
                        tracking_code: trackingCode,
                        status: 'dispatched',
                        status_description: courierId === 'manual'
                            ? 'Expédition manuelle assignée'
                            : 'Colis créé et accepté par le transporteur',
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
                    amount: codAmount
                });
            } catch (_) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                isManual: Boolean(shipmentRes.isManual || courierId === 'manual'),
                message: shipmentRes.isManual || courierId === 'manual'
                    ? 'Expédition manuelle enregistrée avec succès'
                    : `Colis créé avec succès auprès de ${courier.name}`,
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
