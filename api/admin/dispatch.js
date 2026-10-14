'use strict';

const { getCourier, getAvailableCouriers, locationResolver } = require('../../lib/delivery');
const { getStorage } = require('../../lib/storage');
const {
    authenticateAdmin,
    applyCorsHeaders,
    sanitizeString,
    normalizeAlgerianPhone
} = require('../../lib/security');

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
            const rawOrderId = sanitizeString(body.orderId, 50);
            const isManual = Boolean(body.isManual || !rawOrderId);
            const courierId = sanitizeString(body.courierId || 'manual', 30).toLowerCase();
            const operatorNotes = sanitizeString(body.notes || '', 200);

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

            // ─────────────────────────────────────────────────────────────────
            // WORKFLOW B: Independent Manual Order Dispatch
            // ─────────────────────────────────────────────────────────────────
            if (isManual) {
                const manualFullName = sanitizeString(body.fullName || body.clientName, 100);
                const rawPhone = sanitizeString(body.phone || body.clientPhone, 30);
                const normalizedPhone = normalizeAlgerianPhone(rawPhone);

                if (!manualFullName || manualFullName.length < 2) {
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Nom complet du destinataire obligatoire (au moins 2 caractères)' }));
                    return;
                }

                if (!normalizedPhone) {
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Numéro de téléphone algérien invalide (doit commencer par 05, 06 ou 07)' }));
                    return;
                }

                const wilayaInput = body.wilayaCode || body.wilaya || 16;
                const wilayaObj = locationResolver.resolveWilaya(wilayaInput);
                const wCode = wilayaObj.code;

                const manualCommune = sanitizeString(body.commune || body.communeSelect || 'Centre Ville', 60);
                const manualAddress = sanitizeString(body.address || '', 200);
                const chosenDeliveryType = (body.deliveryType || 'home').toLowerCase();
                const normalizedDeliveryType = (chosenDeliveryType === 'desk' || chosenDeliveryType === 'stopdesk') ? 'desk' : 'home';

                // Verify delivery availability against carrier catalogue
                const availability = locationResolver.verifyDeliveryAvailability(wCode, manualCommune, normalizedDeliveryType, courierId);
                if (normalizedDeliveryType === 'desk' && !availability.available) {
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: availability.message || `Stop desk non disponible pour la commune "${manualCommune}". Veuillez sélectionner la livraison à domicile.`
                    }));
                    return;
                }

                const codAmount = Number(body.price || body.totalPrice);
                if (!codAmount || isNaN(codAmount) || codAmount <= 0) {
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Montant COD invalide pour la commande manuelle' }));
                    return;
                }

                // Internal manual order ID (preventing duplicate creations if retrying)
                const manualOrderId = sanitizeString(body.manualOrderId, 50) || ('SPDZ-MAN-' + Date.now().toString().slice(-6) + '-' + Math.floor(1000 + Math.random() * 9000));

                let existingOrder = await storage.findOrderById(manualOrderId);
                if (!existingOrder) {
                    const manualRecord = {
                        orderId: manualOrderId,
                        storeId: 'spear_dz',
                        fullName: manualFullName,
                        phone: normalizedPhone,
                        wilaya: `${wilayaObj.code} - ${wilayaObj.name} (${wilayaObj.nameAr})`,
                        wilayaCode: wilayaObj.code,
                        commune: availability.commune || manualCommune,
                        address: manualAddress || availability.commune || manualCommune,
                        deliveryType: normalizedDeliveryType,
                        productName: sanitizeString(body.productName, 100) || 'PACK HIGH-TECH 5 EN 1',
                        quantity: Math.max(1, parseInt(body.quantity, 10) || 1),
                        unitPrice: codAmount,
                        shippingFee: 0,
                        totalPrice: codAmount,
                        status: 'pending',
                        courier: courierId,
                        trackingCode: '',
                        notes: operatorNotes || 'Commande manuelle administrateur',
                        source: 'admin_manual',
                        createdAt: new Date().toISOString()
                    };
                    await storage.saveOrder(manualRecord);
                    existingOrder = manualRecord;
                }

                const shipmentPayload = {
                    orderId: manualOrderId,
                    fullName: manualFullName,
                    phone: normalizedPhone,
                    wilaya: `${wilayaObj.code} - ${wilayaObj.name}`,
                    wilayaCode: wCode,
                    commune: availability.commune || manualCommune,
                    address: manualAddress || availability.commune || manualCommune,
                    deliveryType: normalizedDeliveryType,
                    totalPrice: codAmount,
                    productName: existingOrder.productName || 'PACK HIGH-TECH 5 EN 1',
                    notes: operatorNotes || existingOrder.notes || ''
                };

                let shipmentRes;
                try {
                    shipmentRes = await courier.createShipment(shipmentPayload);
                } catch (courierErr) {
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        isManual: true,
                        orderId: manualOrderId,
                        error: `Erreur du transporteur: ${courierErr.message}`
                    }));
                    return;
                }

                if (!shipmentRes || !shipmentRes.success || !shipmentRes.trackingCode) {
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        isManual: true,
                        orderId: manualOrderId,
                        error: (shipmentRes && (shipmentRes.error || shipmentRes.message)) || 'Le transporteur a rejeté la création du colis'
                    }));
                    return;
                }

                const trackingCode = String(shipmentRes.trackingCode).trim();
                const updatedOrder = await storage.updateOrderStatus(manualOrderId, 'shipped', {
                    trackingCode,
                    courier: courierId,
                    notes: operatorNotes || existingOrder.notes
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    isManual: true,
                    orderId: manualOrderId,
                    trackingCode,
                    courier: courierId,
                    order: updatedOrder
                }));
                return;
            }

            // ─────────────────────────────────────────────────────────────────
            // WORKFLOW A: Existing Stored Order Dispatch
            // ─────────────────────────────────────────────────────────────────
            const orderId = rawOrderId;
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

            // Delivery method precedence:
            // Admin form selection (body.deliveryType) overrides stored order preference if explicitly provided!
            const chosenDeliveryType = (body.deliveryType || order.deliveryType || 'home').toLowerCase();
            const normalizedDeliveryType = (chosenDeliveryType === 'desk' || chosenDeliveryType === 'stopdesk') ? 'desk' : 'home';

            // Verify delivery availability against carrier catalogue
            const currentCommune = order.commune || 'Centre Ville';
            const availability = locationResolver.verifyDeliveryAvailability(wCode, currentCommune, normalizedDeliveryType, courierId);
            if (normalizedDeliveryType === 'desk' && !availability.available) {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: availability.message || `Stop desk non disponible pour la commune "${currentCommune}". Veuillez sélectionner la livraison à domicile.`
                }));
                return;
            }

            const resolvedCommuneName = availability.commune || currentCommune;

            // Construct payload using authoritative order data and verified commune
            const shipmentPayload = {
                orderId: order.orderId,
                fullName: order.fullName,
                phone: order.phone,
                wilaya: order.wilaya,
                wilayaCode: wCode,
                commune: resolvedCommuneName,
                address: order.address || resolvedCommuneName,
                deliveryType: normalizedDeliveryType,
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
                    deliveryType: normalizedDeliveryType,
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

            // 2. Audit Trail: Insert dispatch event if Supabase client available
            if (typeof storage.getClient === 'function') {
                try {
                    const client = storage.getClient();
                    await client.from('courier_tracking_events').insert({
                        order_id: orderId,
                        courier: courierId,
                        tracking_code: trackingCode,
                        event_type: 'dispatched',
                        description: `Colis expédié avec succès via ${courier.name} (${normalizedDeliveryType === 'desk' ? 'Stop Desk' : 'À Domicile'})`,
                        raw_payload: shipmentRes.raw || null
                    });
                } catch (eventErr) {
                    console.warn('[api/admin/dispatch] Tracking event audit log non-fatal error:', eventErr.message);
                }
            }

            const isManualCourier = courierId === 'manual';
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                orderId,
                trackingCode,
                courier: courierId,
                deliveryType: normalizedDeliveryType,
                isManual: isManualCourier ? true : undefined,
                message: isManualCourier ? `Expédition manuelle enregistrée avec succès (Réf: ${trackingCode})` : 'Colis expédié avec succès',
                order: updatedOrder
            }));
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));

    } catch (err) {
        console.error('[api/admin/dispatch] Fatal error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `INTERNAL_ERROR: ${err.message}` }));
    }
};
