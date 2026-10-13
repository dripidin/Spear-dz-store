'use strict';

const { createClient } = require('@supabase/supabase-js');

class SupabaseStorage {
    constructor() {
        this.supabaseUrl = (process.env.SUPABASE_URL || '').trim();
        this.serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
        this._client = null;
    }

    getClient() {
        if (this._client) return this._client;
        if (!this.supabaseUrl || !this.serviceRoleKey) {
            throw new Error('Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not configured');
        }
        this._client = createClient(this.supabaseUrl, this.serviceRoleKey, {
            auth: { persistSession: false }
        });
        return this._client;
    }

    async verifyHealth() {
        if (!this.supabaseUrl || !this.serviceRoleKey) {
            return { ok: false, provider: 'supabase', error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
        }
        try {
            const client = this.getClient();
            const { error } = await client.from('orders').select('order_id').limit(1);
            if (error) throw error;
            return { ok: true, provider: 'supabase', url: this.supabaseUrl };
        } catch (err) {
            return { ok: false, provider: 'supabase', error: err.message };
        }
    }

    async saveOrder(order, riskResult = {}) {
        const client = this.getClient();
        const row = {
            order_id: order.orderId,
            store_id: order.storeId || 'spear_dz',
            full_name: order.fullName,
            phone: order.phone,
            wilaya: order.wilaya,
            commune: order.commune || '',
            delivery_type: order.deliveryType || 'home',
            product_name: order.productName || 'PACK HIGH-TECH 5 EN 1',
            quantity: order.quantity || 1,
            unit_price: order.unitPrice,
            shipping_fee: String(order.shippingFee),
            total_price: order.totalPrice,
            price_num: order.unitPrice, // Backward-compatible column
            grand_total: String(order.totalPrice), // Backward-compatible column
            status: order.status || 'pending',
            courier: order.courier || 'manual',
            tracking_code: order.trackingCode || null,
            risk_score: riskResult.score || 0,
            risk_level: riskResult.level || 'LOW',
            risk_decision: riskResult.decision || 'ALLOW',
            risk_reasons: Array.isArray(riskResult.reasons) ? riskResult.reasons.join('|') : String(riskResult.reasons || ''),
            notes: order.notes || '',
            client_ip_hash: order.clientIpHash || '',
            created_at: order.createdAt || new Date().toISOString()
        };

        const { data, error } = await client.from('orders').insert([row]).select();
        if (error) {
            console.error('[SupabaseStorage] saveOrder failed:', error.message);
            throw new Error(`Failed to persist order to Supabase: ${error.message}`);
        }

        // Snapshot order item in order_items table
        try {
            await client.from('order_items').insert([{
                order_id: order.orderId,
                product_name: row.product_name,
                quantity: row.quantity,
                unit_price: row.unit_price,
                total_price: row.total_price
            }]);
        } catch (itemErr) {
            console.warn('[SupabaseStorage] Non-blocking item snapshot notice:', itemErr.message);
        }

        return {
            ...order,
            riskScore: row.risk_score,
            riskLevel: row.risk_level,
            riskDecision: row.risk_decision,
            riskReasons: riskResult.reasons || []
        };
    }

    async findOrderById(orderId) {
        const client = this.getClient();
        const { data, error } = await client.from('orders').select('*').eq('order_id', orderId).single();
        if (error || !data) return null;
        return this.mapOrder(data);
    }

    async getAllOrders(filter = {}) {
        const client = this.getClient();
        let query = client.from('orders').select('*').order('created_at', { ascending: false });

        if (filter.status && filter.status !== 'all') {
            query = query.eq('status', filter.status);
        }
        if (filter.wilaya) {
            query = query.eq('wilaya', filter.wilaya);
        }
        if (filter.limit) {
            query = query.limit(parseInt(filter.limit, 10));
        }

        const { data, error } = await query;
        if (error) throw error;
        let list = (data || []).map(r => this.mapOrder(r));

        if (filter.search) {
            const s = String(filter.search).toLowerCase();
            list = list.filter(o =>
                (o.orderId && o.orderId.toLowerCase().includes(s)) ||
                (o.phone && o.phone.includes(s)) ||
                (o.fullName && o.fullName.toLowerCase().includes(s)) ||
                (o.trackingCode && o.trackingCode.toLowerCase().includes(s))
            );
        }
        return list;
    }

    mapOrder(row) {
        return {
            orderId: row.order_id,
            storeId: row.store_id,
            fullName: row.full_name,
            phone: row.phone,
            wilaya: row.wilaya,
            commune: row.commune,
            deliveryType: row.delivery_type,
            productName: row.product_name,
            quantity: row.quantity,
            unitPrice: row.unit_price != null ? Number(row.unit_price) : (row.price_num != null ? Number(row.price_num) : 0),
            shippingFee: row.shipping_fee != null ? Number(row.shipping_fee) : 0,
            totalPrice: row.total_price != null ? Number(row.total_price) : (row.grand_total != null ? Number(row.grand_total) : 0),
            status: row.status,
            courier: row.courier || 'manual',
            trackingCode: row.tracking_code || row.redex_tracking_code || null,
            riskScore: row.risk_score,
            riskLevel: row.risk_level,
            riskDecision: row.risk_decision,
            riskReasons: row.risk_reasons ? row.risk_reasons.split('|') : [],
            createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
        };
    }

    async updateOrderStatus(orderId, status, extra = {}) {
        const client = this.getClient();
        const payload = { status, updated_at: new Date().toISOString() };
        if (extra.trackingCode) payload.tracking_code = extra.trackingCode;
        if (extra.courier) payload.courier = extra.courier;

        const { data, error } = await client.from('orders').update(payload).eq('order_id', orderId).select().single();
        if (error) throw error;
        return this.mapOrder(data);
    }

    async recordRiskEvent(event) {
        const client = this.getClient();
        const row = {
            event_id: event.eventId || 'EVT-' + Math.floor(100000 + Math.random() * 900000),
            event_type: event.eventType || 'ORDER_SUBMISSION',
            store_id: 'spear_dz',
            order_id: event.orderId || null,
            actor_phone: event.phone || null,
            ip_hash: event.ipHash || null,
            score: event.score || 0,
            reasons: Array.isArray(event.reasons) ? event.reasons.join('|') : String(event.reasons || ''),
            created_at: new Date().toISOString()
        };
        const { error } = await client.from('risk_events').insert([row]);
        if (error) console.warn('[Supabase] Failed to insert risk_event:', error.message);
        return row;
    }

    async getRiskEvents(orderId) {
        const client = this.getClient();
        const { data, error } = await client.from('risk_events').select('*').eq('order_id', orderId);
        if (error) return [];
        return data || [];
    }

    async isWatchlisted(identifier) {
        if (!identifier) return false;
        const client = this.getClient();
        const { data, error } = await client.from('watchlist').select('identifier').eq('identifier', identifier).eq('status', 'active');
        if (error || !data) return false;
        return data.length > 0;
    }

    async addToWatchlist(identifier, type = 'phone', reason = 'Manual') {
        const client = this.getClient();
        const row = {
            identifier: String(identifier).trim(),
            identifier_type: type,
            reason,
            status: 'active',
            created_at: new Date().toISOString()
        };
        await client.from('watchlist').insert([row]);
        return row;
    }

    async recordAuditLog(action, entityType, entityId, actor = 'admin', payload = {}, ipHash = '') {
        try {
            const client = this.getClient();
            await client.from('audit_logs').insert([{
                action,
                entity_type: entityType,
                entity_id: String(entityId),
                actor,
                payload,
                ip_hash: ipHash,
                created_at: new Date().toISOString()
            }]);
        } catch (e) {
            console.warn('[SupabaseStorage] Non-blocking audit log notice:', e.message);
        }
    }

    async getProduct(slug) {
        const client = this.getClient();
        // Omit confidential cost_price from consumer query
        const { data, error } = await client
            .from('products')
            .select('slug, name, description, base_price, compare_price, is_bundle, bundle_items, active')
            .eq('slug', slug)
            .single();
        if (error || !data) return null;
        return data;
    }
}

module.exports = SupabaseStorage;
