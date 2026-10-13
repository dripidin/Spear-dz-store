'use strict';

const https = require('https');
const url = require('url');

class EcotrackCourier {
    constructor() {
        this.id = 'redex';
        this.name = 'Redex / Ecotrack DZ';
        this.baseUrl = process.env.ECOTRACK_BASE_URL || 'https://redex.ecotrack.dz';
        this.token = process.env.ECOTRACK_API_TOKEN || '';
    }

    isConfigured() {
        return Boolean(this.token && this.token.trim() !== '');
    }

    async _request(endpoint, method = 'GET', data = null) {
        if (!this.isConfigured()) {
            throw new Error('Ecotrack/Redex API Token (ECOTRACK_API_TOKEN) is not configured');
        }

        const targetUrl = url.parse(`${this.baseUrl}${endpoint}`);
        const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || 443,
            path: targetUrl.path,
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
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
                            reject(new Error(json.message || `Ecotrack error HTTP ${res.statusCode}`));
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse Ecotrack response: ${body.slice(0, 100)}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Ecotrack request timeout'));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    async createShipment(order) {
        const payload = {
            reference: order.orderId,
            nom_client: order.fullName,
            telephone: order.phone,
            adresse: order.address || order.commune,
            code_wilaya: parseInt(order.wilayaCode || 16, 10),
            commune: order.commune,
            montant: order.totalPrice,
            remarque: order.notes || 'PACK HIGH-TECH 5 EN 1',
            type: order.deliveryType === 'desk' || order.deliveryType === 'stopdesk' ? 2 : 1 // 1: domicile, 2: stopdesk
        };

        const res = await this._request('/api/v1/create/order', 'POST', payload);
        const trackingCode = res.tracking_code || res.tracking || (res.data && res.data.tracking);

        return {
            success: true,
            courier: 'redex',
            trackingCode,
            orderId: order.orderId,
            raw: res
        };
    }

    async getTracking(trackingCode) {
        const res = await this._request(`/api/v1/track/${encodeURIComponent(trackingCode)}`, 'GET');
        return {
            success: true,
            courier: 'redex',
            trackingCode,
            data: res
        };
    }

    getLabelUrl(trackingCode) {
        return `${this.baseUrl}/api/v1/label/${encodeURIComponent(trackingCode)}?token=${encodeURIComponent(this.token)}`;
    }
}

module.exports = EcotrackCourier;
