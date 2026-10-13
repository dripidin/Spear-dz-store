'use strict';

const https = require('https');

class YalidineCourier {
    constructor() {
        this.id = 'yalidine';
        this.name = 'Yalidine Express';
        this.apiId = process.env.YALIDINE_API_ID || '';
        this.apiToken = process.env.YALIDINE_API_TOKEN || '';
        this.fromWilaya = parseInt(process.env.YALIDINE_FROM_WILAYA || '16', 10);
        this.baseUrl = 'https://api.yalidine.app';
    }

    isConfigured() {
        return Boolean(this.apiId && this.apiToken);
    }

    async _request(path, method = 'GET', data = null) {
        if (!this.isConfigured()) {
            throw new Error('Yalidine credentials (YALIDINE_API_ID, YALIDINE_API_TOKEN) are not configured');
        }

        const options = {
            hostname: 'api.yalidine.app',
            path: `/v1${path}`,
            method,
            headers: {
                'X-API-ID': this.apiId,
                'X-API-TOKEN': this.apiToken,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const json = body ? JSON.parse(body) : {};
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(json);
                        } else {
                            reject(new Error(json.message || `Yalidine error HTTP ${res.statusCode}`));
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse Yalidine response: ${body.slice(0, 100)}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Yalidine request timeout'));
            });

            if (data) req.write(JSON.stringify(data));
            req.end();
        });
    }

    async createShipment(order) {
        const payload = [
            {
                order_id: order.orderId,
                firstname: (order.fullName || '').split(' ')[0] || 'Client',
                familyname: (order.fullName || '').split(' ').slice(1).join(' ') || 'Spear-dz',
                contact_phone: order.phone,
                address: order.address || order.commune,
                to_commune_name: order.commune,
                to_wilaya_name: order.wilaya,
                product_list: order.productName || 'PACK HIGH-TECH 5 EN 1',
                price: order.totalPrice,
                freeshipping: false,
                is_stopdesk: order.deliveryType === 'desk' || order.deliveryType === 'stopdesk',
                has_exchange: false
            }
        ];

        const res = await this._request('/parcels', 'POST', payload);
        const parcel = res && res[order.orderId];
        const trackingCode = parcel && parcel.tracking;

        return {
            success: true,
            courier: 'yalidine',
            trackingCode: trackingCode || null,
            orderId: order.orderId,
            raw: res
        };
    }

    async getTracking(trackingCode) {
        const res = await this._request(`/parcels/${encodeURIComponent(trackingCode)}`, 'GET');
        return {
            success: true,
            courier: 'yalidine',
            trackingCode,
            data: res
        };
    }
}

module.exports = YalidineCourier;
