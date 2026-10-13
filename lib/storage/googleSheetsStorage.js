'use strict';

// Lazy-loaded to eliminate heavy startup import overhead
let _googleapis = null;
function getGoogleApis() {
    if (!_googleapis) {
        _googleapis = require('googleapis');
    }
    return _googleapis;
}

class GoogleSheetsStorage {
    constructor() {
        this.sheetId = process.env.GOOGLE_SHEET_ID || '';
        this.clientEmail = process.env.GOOGLE_CLIENT_EMAIL || '';
        this.privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

        this.tabOrders = process.env.GOOGLE_SHEET_TAB_ORDERS || 'Orders';
        this.tabCustomers = process.env.GOOGLE_SHEET_TAB_CUSTOMERS || 'Customers';
        this.tabRisk = process.env.GOOGLE_SHEET_TAB_RISK || 'RiskEvents';
        this.tabWatchlist = process.env.GOOGLE_SHEET_TAB_WATCHLIST || 'Watchlist';

        this._auth = null;
        this._sheets = null;
    }

    getAuthClient() {
        if (this._auth) return this._auth;
        if (!this.clientEmail || !this.privateKey) {
            throw new Error('Google Service Account credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) are not configured');
        }
        const { google } = getGoogleApis();
        this._auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: this.clientEmail,
                private_key: this.privateKey
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        return this._auth;
    }

    getSheetsApi() {
        if (this._sheets) return this._sheets;
        const auth = this.getAuthClient();
        const { google } = getGoogleApis();
        this._sheets = google.sheets({ version: 'v4', auth });
        return this._sheets;
    }

    async verifyHealth() {
        if (!this.sheetId) {
            return { ok: false, provider: 'google_sheets', error: 'GOOGLE_SHEET_ID is missing' };
        }
        try {
            const api = this.getSheetsApi();
            const res = await api.spreadsheets.get({ spreadsheetId: this.sheetId });
            const sheetNames = (res.data.sheets || []).map(s => s.properties.title);
            return {
                ok: true,
                provider: 'google_sheets',
                title: res.data.properties.title,
                sheets: sheetNames
            };
        } catch (err) {
            return {
                ok: false,
                provider: 'google_sheets',
                error: err.message
            };
        }
    }

    async getRows(tabName) {
        const api = this.getSheetsApi();
        const res = await api.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range: `${tabName}!A1:Z5000`
        });
        const rows = res.data.values || [];
        if (rows.length === 0) return [];

        const headers = rows[0];
        return rows.slice(1).map((row, idx) => {
            const obj = { _rowIndex: idx + 2 };
            headers.forEach((header, colIdx) => {
                obj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
            });
            return obj;
        });
    }

    async appendRow(tabName, rowObject) {
        const api = this.getSheetsApi();
        const res = await api.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range: `${tabName}!A1:Z1`
        });
        let headers = (res.data.values && res.data.values[0]) || [];

        // If sheet is empty, write headers first
        if (headers.length === 0) {
            headers = Object.keys(rowObject);
            await api.spreadsheets.values.append({
                spreadsheetId: this.sheetId,
                range: `${tabName}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [headers] }
            });
        }

        const values = headers.map(h => {
            const val = rowObject[h];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
        });

        await api.spreadsheets.values.append({
            spreadsheetId: this.sheetId,
            range: `${tabName}!A:A`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] }
        });
        return true;
    }

    async saveOrder(order, riskResult = {}) {
        const row = {
            order_id: order.orderId,
            store_id: order.storeId || 'spear_dz',
            full_name: order.fullName,
            phone: order.phone,
            wilaya: order.wilaya,
            commune: order.commune,
            delivery_type: order.deliveryType,
            product_name: order.productName,
            quantity: order.quantity || 1,
            unit_price: order.unitPrice,
            shipping_fee: order.shippingFee,
            total_price: order.totalPrice,
            status: order.status || 'pending',
            courier: order.courier || 'manual',
            tracking_code: order.trackingCode || '',
            risk_score: riskResult.score || 0,
            risk_level: riskResult.level || 'LOW',
            risk_decision: riskResult.decision || 'ALLOW',
            risk_reasons: Array.isArray(riskResult.reasons) ? riskResult.reasons.join('|') : '',
            notes: order.notes || '',
            client_ip_hash: order.clientIpHash || '',
            created_at: order.createdAt || new Date().toISOString()
        };

        await this.appendRow(this.tabOrders, row);
        return {
            ...order,
            riskScore: row.risk_score,
            riskLevel: row.risk_level,
            riskDecision: row.risk_decision,
            riskReasons: riskResult.reasons || []
        };
    }

    async findOrderById(orderId) {
        const rows = await this.getRows(this.tabOrders);
        const match = rows.find(r => r.order_id === orderId);
        if (!match) return null;
        return this.mapOrderFromRow(match);
    }

    async getAllOrders(filter = {}) {
        const rows = await this.getRows(this.tabOrders);
        let list = rows.map(r => this.mapOrderFromRow(r)).filter(Boolean);

        if (filter.search) {
            const s = String(filter.search).toLowerCase();
            list = list.filter(o =>
                (o.orderId && o.orderId.toLowerCase().includes(s)) ||
                (o.phone && o.phone.includes(s)) ||
                (o.fullName && o.fullName.toLowerCase().includes(s)) ||
                (o.trackingCode && o.trackingCode.toLowerCase().includes(s))
            );
        }
        if (filter.status && filter.status !== 'all') {
            list = list.filter(o => o.status === filter.status);
        }
        if (filter.wilaya) {
            list = list.filter(o => o.wilaya === filter.wilaya);
        }
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (filter.limit) {
            list = list.slice(0, parseInt(filter.limit, 10));
        }
        return list;
    }

    mapOrderFromRow(row) {
        if (!row) return null;
        return {
            orderId: row.order_id,
            storeId: row.store_id,
            fullName: row.full_name,
            phone: row.phone,
            wilaya: row.wilaya,
            commune: row.commune,
            deliveryType: row.delivery_type,
            productName: row.product_name,
            quantity: parseInt(row.quantity, 10) || 1,
            unitPrice: parseInt(row.unit_price, 10) || 0,
            shippingFee: parseInt(row.shipping_fee, 10) || 0,
            totalPrice: parseInt(row.total_price, 10) || 0,
            status: row.status || 'pending',
            courier: row.courier || 'manual',
            trackingCode: row.tracking_code || '',
            riskScore: parseInt(row.risk_score, 10) || 0,
            riskLevel: row.risk_level || 'LOW',
            riskDecision: row.risk_decision || 'ALLOW',
            riskReasons: row.risk_reasons ? row.risk_reasons.split('|') : [],
            createdAt: row.created_at,
            _rowIndex: row._rowIndex
        };
    }

    async updateOrderStatus(orderId, status, extra = {}) {
        const rows = await this.getRows(this.tabOrders);
        const match = rows.find(r => r.order_id === orderId);
        if (!match) return null;

        const api = this.getSheetsApi();
        // Read header row to determine column indices
        const res = await api.spreadsheets.values.get({
            spreadsheetId: this.sheetId,
            range: `${this.tabOrders}!A1:Z1`
        });
        const headers = (res.data.values && res.data.values[0]) || [];
        const statusColIdx = headers.indexOf('status');

        if (statusColIdx !== -1) {
            const colLetter = String.fromCharCode(65 + statusColIdx);
            await api.spreadsheets.values.update({
                spreadsheetId: this.sheetId,
                range: `${this.tabOrders}!${colLetter}${match._rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[status]] }
            });
        }

        // If extra fields provided (e.g. tracking_code)
        if (extra.trackingCode) {
            const trackIdx = headers.indexOf('tracking_code');
            if (trackIdx !== -1) {
                const colLetter = String.fromCharCode(65 + trackIdx);
                await api.spreadsheets.values.update({
                    spreadsheetId: this.sheetId,
                    range: `${this.tabOrders}!${colLetter}${match._rowIndex}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [[extra.trackingCode]] }
                });
            }
        }

        return { ...this.mapOrderFromRow(match), status, ...extra };
    }

    async recordRiskEvent(event) {
        const row = {
            event_id: event.eventId || 'EVT-' + Math.floor(100000 + Math.random() * 900000),
            event_type: event.eventType || 'ORDER_SUBMISSION',
            order_id: event.orderId || '',
            actor_phone: event.phone || '',
            ip_hash: event.ipHash || '',
            score: event.score || 0,
            reasons: Array.isArray(event.reasons) ? event.reasons.join('|') : String(event.reasons || ''),
            created_at: new Date().toISOString()
        };
        await this.appendRow(this.tabRisk, row);
        return row;
    }

    async getRiskEvents(orderId) {
        const rows = await this.getRows(this.tabRisk);
        if (!orderId) return rows;
        return rows.filter(r => r.order_id === orderId);
    }

    async isWatchlisted(identifier) {
        if (!identifier) return false;
        const clean = String(identifier).trim().toLowerCase();
        const rows = await this.getRows(this.tabWatchlist);
        return rows.some(r => String(r.identifier || '').trim().toLowerCase() === clean);
    }

    async addToWatchlist(identifier, type = 'phone', reason = 'Manual') {
        const row = {
            identifier: String(identifier).trim(),
            identifier_type: type,
            reason,
            status: 'active',
            created_at: new Date().toISOString()
        };
        await this.appendRow(this.tabWatchlist, row);
        return row;
    }
}

module.exports = GoogleSheetsStorage;
