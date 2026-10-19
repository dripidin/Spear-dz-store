'use strict';

const { getStorage } = require('../../lib/storage');
const { authenticateAdmin, applyCorsHeaders } = require('../../lib/security');

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
        const query = req.query || (req.url && req.url.includes('?') ? Object.fromEntries(new URL(req.url, 'http://localhost').searchParams) : {});

        // Support live Meta CAPI diagnostic testing from admin panel
        const pixelId = (process.env.META_PIXEL_ID || '').trim();
        const hasMetaToken = Boolean((process.env.META_ACCESS_TOKEN || '').trim());
        const isCapiConfigured = Boolean(pixelId && hasMetaToken);

        if (query.action === 'test_capi') {
            const { sendMetaEvent } = require('../../lib/metaCAPI');
            const testResult = await sendMetaEvent({
                eventName: 'Purchase',
                eventId: 'TEST-DIAG-' + Date.now(),
                value: 20400,
                currency: 'DZD',
                fullName: 'Diagnostic Admin Test',
                phone: '0555000000',
                wilaya: '16 - Alger'
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                testResult,
                configured: isCapiConfigured,
                pixelId: pixelId || null
            }));
            return;
        }

        const days = Math.min(90, parseInt(query.days, 10) || 7);

        // Fetch orders from Supabase (or active storage provider)
        const allOrders = await storage.getAllOrders({ limit: 5000 });

        // Filter by date range if provided
        let orders = allOrders;
        if (query.dateFrom || query.dateTo) {
            const from = query.dateFrom ? new Date(query.dateFrom).getTime() : 0;
            const to = query.dateTo ? new Date(query.dateTo).getTime() : Date.now();
            orders = allOrders.filter(o => {
                const t = new Date(o.createdAt).getTime();
                return t >= from && t <= to;
            });
        }

        // ── 1. Calculate Standardized Operational KPIs ────────────────────────
        const total = orders.length;

        // Order Buckets
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'review');
        const confirmedOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'preparing');
        const inTransitOrders = orders.filter(o => o.status === 'shipped');
        const deliveredOrders = orders.filter(o => o.status === 'delivered');
        const returnedOrders = orders.filter(o => o.status === 'returned');
        const cancelledOrders = orders.filter(o => o.status === 'cancelled');

        // Financial Aggregates in DZD
        const grossDeliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
        const pendingCodValue = [...pendingOrders, ...confirmedOrders, ...inTransitOrders]
            .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
        const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

        // Average Order Value (AOV)
        const avgOrderValue = deliveredOrders.length > 0
            ? Math.round(grossDeliveredRevenue / deliveredOrders.length)
            : (total > 0 ? Math.round(totalOrderValue / total) : 20400);

        // Precision Rates
        // Eligible orders exclude deliberate honeypot/spam bot blocks
        const nonSpamSubmitted = orders.filter(o => !(o.riskDecision === 'BLOCK' && o.status === 'cancelled')).length;
        const totalConfirmedOrProgressed = orders.filter(o =>
            ['confirmed', 'preparing', 'shipped', 'delivered', 'returned'].includes(o.status)
        ).length;

        const confirmationRate = nonSpamSubmitted > 0
            ? Number(((totalConfirmedOrProgressed / nonSpamSubmitted) * 100).toFixed(1))
            : 0;

        const closedDeliveries = deliveredOrders.length + returnedOrders.length;
        const deliverySuccessRate = closedDeliveries > 0
            ? Number(((deliveredOrders.length / closedDeliveries) * 100).toFixed(1))
            : null;

        const returnRate = total > 0
            ? Number(((returnedOrders.length / total) * 100).toFixed(1))
            : 0;

        // ── 2. 7-Day Rolling Volume Trends (for Chart.js Line Chart) ─────────
        const dayTrendMap = new Map();
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().slice(0, 10);
            dayTrendMap.set(dateKey, { date: dateKey, total: 0, confirmed: 0, delivered: 0 });
        }

        for (const o of orders) {
            const dateKey = String(o.createdAt || '').slice(0, 10);
            if (dayTrendMap.has(dateKey)) {
                const entry = dayTrendMap.get(dateKey);
                entry.total += 1;
                if (['confirmed', 'preparing', 'shipped', 'delivered'].includes(o.status)) {
                    entry.confirmed += 1;
                }
                if (o.status === 'delivered') {
                    entry.delivered += 1;
                }
            }
        }

        const trendData = Array.from(dayTrendMap.values());

        // ── 3. Top 10 Wilayas Distribution (for Chart.js Bar Chart) ───────────
        const wilayaCounts = {};
        for (const o of orders) {
            const w = o.wilaya || 'Non spécifié';
            wilayaCounts[w] = (wilayaCounts[w] || 0) + 1;
        }

        const topWilayas = Object.entries(wilayaCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([wilaya, count]) => ({
                wilaya,
                count,
                percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
            }));

        // ── 4. Status Distribution Breakdown ──────────────────────────────────
        const statusDistribution = {
            pending: pendingOrders.length,
            confirmed: confirmedOrders.length,
            shipped: inTransitOrders.length,
            delivered: deliveredOrders.length,
            returned: returnedOrders.length,
            cancelled: cancelledOrders.length
        };

        // ── 5. Response Payload ───────────────────────────────────────────────
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            kpis: {
                totalOrders: total,
                pendingOrders: pendingOrders.length,
                confirmedOrders: confirmedOrders.length,
                inTransitOrders: inTransitOrders.length,
                deliveredOrders: deliveredOrders.length,
                returnedOrders: returnedOrders.length,
                cancelledOrders: cancelledOrders.length,
                grossDeliveredRevenue,
                pendingCodValue,
                avgOrderValue,
                confirmationRate,
                deliverySuccessRate,
                returnRate
            },
            charts: {
                trend: {
                    labels: trendData.map(t => t.date.slice(5)), // MM-DD
                    orders: trendData.map(t => t.total),
                    confirmed: trendData.map(t => t.confirmed),
                    delivered: trendData.map(t => t.delivered)
                },
                wilayas: {
                    labels: topWilayas.map(w => w.wilaya),
                    counts: topWilayas.map(w => w.count)
                },
                statusDistribution
            },
            metaCapi: {
                configured: isCapiConfigured,
                pixelId: pixelId || '1865890014396791',
                apiVersion: 'v19.0',
                provider: 'directGraphApi',
                deduplication: '1:1 (eventID)',
                matchedParameters: ['phone', 'name', 'wilaya', 'commune', 'fbp', 'fbc'],
                totalOrdersTracked: total
            }
        }));

    } catch (err) {
        console.error('[api/admin/analytics] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
    }
};
