'use strict';

const https = require('https');
const { getStorage } = require('../lib/storage');
const { evaluateOrderRisk } = require('../lib/risk/riskEngine');
const { sendMetaEvent } = require('../lib/metaCAPI');
const {
    normalizeAlgerianPhone,
    hashIp,
    applyCorsHeaders,
    sanitizeString,
    maskPhone
} = require('../lib/security');
const { validateStoreConfig } = require('../lib/configValidator');
const { sendOrderNotification } = require('../lib/telegram');
const shippingRates = require('../config/shippingRates.json');

let storeConfig = null;
try {
    storeConfig = validateStoreConfig();
} catch (e) {
    console.error('[send-order] Store configuration error:', e.message);
}

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    try {
        const body = req.body || {};
        const clientIp = (
            req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            (req.socket && req.socket.remoteAddress) ||
            '127.0.0.1'
        ).split(',')[0].trim();

        const clientIpHash = hashIp(clientIp);

        const fullName = sanitizeString(body.fullName, 100);
        const rawPhone = sanitizeString(body.phone, 30);
        const wilaya = sanitizeString(body.wilaya, 50);
        const commune = sanitizeString(body.commune, 60);
        const address = sanitizeString(body.address, 150);
        const deliveryType = body.deliveryType === 'desk' || body.deliveryType === 'stopdesk' ? 'desk' : 'home';
        const quantity = Math.max(1, Math.min(10, parseInt(body.quantity, 10) || 1));
        const notes = sanitizeString(body.notes, 200);
        const honeypot = sanitizeString(body.website_url_hp || body.honeypot, 50);
        const formDurationMs = parseInt(body.formDurationMs, 10) || null;
        const deviceId = sanitizeString(body.deviceId, 64);
        const fbp = sanitizeString(body.fbp, 100);
        const fbc = sanitizeString(body.fbc, 100);

        // Required field validation
        if (!fullName || fullName.length < 2) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'يرجى إدخال الاسم الكامل بشكل صحيح' }));
            return;
        }

        const normalizedPhone = normalizeAlgerianPhone(rawPhone);
        if (!normalizedPhone) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'رقم الهاتف غير صحيح. يرجى إدخال رقم هاتف جزائري يبدأ بـ 05 أو 06 أو 07'
            }));
            return;
        }

        if (!wilaya) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'يرجى اختيار الولاية' }));
            return;
        }

        // Extract wilaya code
        let wilayaCode = parseInt(body.wilayaCode, 10);
        if (!wilayaCode || isNaN(wilayaCode)) {
            const match = wilaya.match(/^(\d{1,2})/);
            wilayaCode = match ? parseInt(match[1], 10) : 16;
        }

        // Server-side Price Calculation (Never Trust Client Prices)
        const unitPrice = (storeConfig && storeConfig.bundle && storeConfig.bundle.price) || 21900;
        const subtotal = unitPrice * quantity;

        const wRate = shippingRates[String(wilayaCode)] || { home: 700, desk: 450 };
        const shippingFee = deliveryType === 'desk' ? wRate.desk : wRate.home;
        const totalPrice = subtotal + shippingFee;

        // Unique Order ID
        const orderId = body.orderId || ('SPDZ-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900));

        // Evaluate Risk
        const riskResult = await evaluateOrderRisk({
            phone: normalizedPhone,
            ipHash: clientIpHash,
            deviceId,
            honeypot,
            formDurationMs
        });

        // If risk decision is BLOCK, do not accept the order
        if (riskResult.decision === 'BLOCK') {
            console.warn('[RiskShield] Blocked automated order submission from IP hash %s (%s)', clientIpHash, riskResult.reasons.join(', '));
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'تعذر إتمام الطلب في الوقت الحالي. يرجى المحاولة لاحقاً أو التواصل مع خدمة العملاء.'
            }));
            return;
        }

        const orderRecord = {
            orderId,
            storeId: 'spear_dz',
            fullName,
            phone: normalizedPhone,
            wilaya,
            wilayaCode,
            commune: commune || wilaya,
            address: address || commune,
            deliveryType,
            productName: (storeConfig && storeConfig.bundle && storeConfig.bundle.title_ar) || 'PACK HIGH-TECH 5 EN 1',
            quantity,
            unitPrice,
            shippingFee,
            totalPrice,
            status: riskResult.decision === 'REVIEW' ? 'review' : 'pending',
            courier: 'manual',
            trackingCode: '',
            notes,
            clientIpHash,
            deviceId,
            createdAt: new Date().toISOString()
        };

        // Persist to selected Storage backend
        const storage = getStorage();
        const saved = await storage.saveOrder(orderRecord, riskResult);

        // Record risk event if non-zero
        if (riskResult.score > 0) {
            await storage.recordRiskEvent({
                orderId,
                phone: normalizedPhone,
                ipHash: clientIpHash,
                score: riskResult.score,
                reasons: riskResult.reasons
            });
        }

        // Fire Meta CAPI Purchase / Lead event in background
        sendMetaEvent({
            eventName: 'Purchase',
            eventId: orderId,
            value: totalPrice,
            currency: 'DZD',
            fullName,
            phone: normalizedPhone,
            wilaya,
            commune,
            clientIp,
            userAgent: req.headers['user-agent'] || '',
            eventSourceUrl: req.headers['referer'] || '',
            fbp,
            fbc,
            productName: orderRecord.productName
        }).catch(err => {
            console.warn('[Meta CAPI] Dispatch warning:', err.message);
        });

        // Fire Telegram Notification before serverless container freezes
        try {
            await Promise.race([
                sendOrderNotification(saved, riskResult),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Telegram dispatch timeout')), 4000))
            ]);
        } catch (tgErr) {
            console.warn('[Telegram] Notification warning:', tgErr.message);
        }

        console.log('[OrderCreated] Successfully persisted order %s (Phone: %s, Total: %d DZD)', orderId, maskPhone(normalizedPhone), totalPrice);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            orderId,
            totalPrice,
            subtotal,
            shippingFee,
            status: saved.status,
            message: 'تم تسجيل طلبك بنجاح! سنتصل بك هاتفياً لتأكيد الشحن.'
        }));

    } catch (err) {
        console.error('[send-order] Fatal processing error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.'
        }));
    }
};
