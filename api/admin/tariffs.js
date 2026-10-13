'use strict';

const fs = require('fs');
const path = require('path');
const { getStorage } = require('../../lib/storage');
const { authenticateAdmin, applyCorsHeaders } = require('../../lib/security');

const wilayasPath = path.join(__dirname, '..', '..', 'config', 'wilayas.json');
const shippingRatesPath = path.join(__dirname, '..', '..', 'config', 'shippingRates.json');

let fallbackWilayas = [];
let fallbackRates = {};
try {
    fallbackWilayas = JSON.parse(fs.readFileSync(wilayasPath, 'utf8'));
    fallbackRates = JSON.parse(fs.readFileSync(shippingRatesPath, 'utf8'));
} catch (e) {
    console.warn('[api/admin/tariffs] Fallback data warning:', e.message);
}

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Read allows public or admin (checkout reads tariffs); Write requires admin
    if (req.method !== 'GET' && !authenticateAdmin(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'UNAUTHORIZED: Admin session required' }));
        return;
    }

    const storage = getStorage();

    try {
        // ── GET: Fetch 58 Wilayas Dynamic Tariffs ──────────────────────────────
        if (req.method === 'GET') {
            let tariffs = [];

            // Try reading from Supabase if storage is Supabase
            if (typeof storage.getClient === 'function') {
                try {
                    const client = storage.getClient();
                    const { data, error } = await client
                        .from('shipping_tariffs')
                        .select('*')
                        .order('wilaya_code', { ascending: true });

                    if (!error && data && data.length > 0) {
                        tariffs = data.map(r => ({
                            id: r.id,
                            wilayaCode: r.wilaya_code,
                            wilayaName: r.wilaya_name,
                            wilayaNameAr: r.wilaya_name_ar || '',
                            homeFee: Number(r.home_fee),
                            deskFee: Number(r.desk_fee),
                            deliveryTime: r.delivery_time,
                            active: r.active !== false,
                            courier: r.courier || 'general',
                            updatedBy: r.updated_by || 'admin',
                            updatedAt: r.updated_at
                        }));
                    }
                } catch (dbErr) {
                    console.warn('[api/admin/tariffs] Supabase read fallback:', dbErr.message);
                }
            }

            // Fallback from config if database table is empty
            if (tariffs.length === 0) {
                tariffs = fallbackWilayas.map(w => {
                    const r = fallbackRates[String(w.code)] || { home: 650, desk: 450, time: '24 - 48 H' };
                    return {
                        wilayaCode: w.code,
                        wilayaName: w.name,
                        wilayaNameAr: w.nameAr || '',
                        homeFee: r.home,
                        deskFee: r.desk,
                        deliveryTime: r.time,
                        active: true,
                        courier: 'general',
                        updatedBy: 'system',
                        updatedAt: new Date().toISOString()
                    };
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: tariffs.length, data: tariffs }));
            return;
        }

        // ── PUT: Update Specific Wilaya Shipping Rates ────────────────────────
        if (req.method === 'PUT' || req.method === 'POST') {
            const body = req.body || {};
            const wilayaCode = parseInt(body.wilayaCode, 10);
            const homeFee = Number(body.homeFee);
            const deskFee = Number(body.deskFee);
            const deliveryTime = (body.deliveryTime || '24 - 48 H').trim();
            const active = body.active !== false;
            const courier = (body.courier || 'general').trim();

            if (!wilayaCode || wilayaCode < 1 || wilayaCode > 58) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Code de wilaya invalide (1 à 58)' }));
                return;
            }

            if (isNaN(homeFee) || homeFee < 0 || isNaN(deskFee) || deskFee < 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Les tarifs doivent être des montants positifs valides' }));
                return;
            }

            let updatedRecord = null;

            if (typeof storage.getClient === 'function') {
                try {
                    const client = storage.getClient();
                    const { data, error } = await client
                        .from('shipping_tariffs')
                        .upsert([{
                            wilaya_code: wilayaCode,
                            wilaya_name: body.wilayaName || (fallbackWilayas.find(w => w.code === wilayaCode) || {}).name || `Wilaya ${wilayaCode}`,
                            wilaya_name_ar: body.wilayaNameAr || (fallbackWilayas.find(w => w.code === wilayaCode) || {}).nameAr || '',
                            home_fee: homeFee,
                            desk_fee: deskFee,
                            delivery_time: deliveryTime,
                            active,
                            courier,
                            updated_by: 'admin',
                            updated_at: new Date().toISOString()
                        }], { onConflict: 'wilaya_code,courier' })
                        .select()
                        .single();

                    if (!error && data) {
                        updatedRecord = data;
                    }
                } catch (dbErr) {
                    console.warn('[api/admin/tariffs] Supabase upsert notice:', dbErr.message);
                }
            }

            // Record admin audit log
            try {
                await storage.recordAuditLog('UPDATE_TARIFF', 'tariff', `W${wilayaCode}`, 'admin', {
                    wilayaCode,
                    homeFee,
                    deskFee,
                    courier
                });
            } catch (_) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: `Tarifs pour la wilaya ${wilayaCode} mis à jour avec succès`,
                data: updatedRecord || { wilayaCode, homeFee, deskFee, deliveryTime, active, courier }
            }));
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));

    } catch (err) {
        console.error('[api/admin/tariffs] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
    }
};
