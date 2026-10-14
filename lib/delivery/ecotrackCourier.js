'use strict';

const https = require('https');
const url = require('url');

class EcotrackCourier {
    constructor() {
        this.id = 'redex';
        this.name = 'Redex / Ecotrack DZ';
        this.baseUrl = (process.env.ECOTRACK_BASE_URL || 'https://redex.ecotrack.dz').trim();
        this.token = (process.env.ECOTRACK_API_TOKEN || '').trim();
    }

    isConfigured() {
        return Boolean(this.token && this.token.trim() !== '');
    }

    async _request(endpoint, method = 'GET', data = null) {
        if (!this.isConfigured()) {
            throw new Error('Ecotrack/Redex API Token (ECOTRACK_API_TOKEN) is not configured');
        }

        const fullUrl = new URL(endpoint, this.baseUrl);
        const options = {
            hostname: fullUrl.hostname,
            port: fullUrl.port || 443,
            path: fullUrl.pathname + fullUrl.search,
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Spear-dz/1.0'
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
                            if (json.success === false) {
                                reject(new Error(json.message || json.error || 'Ecotrack a rejeté la requête'));
                            } else if (json.errors && typeof json.errors === 'object') {
                                const errStr = Object.entries(json.errors)
                                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                                    .join('; ');
                                reject(new Error(json.message ? `${json.message} (${errStr})` : errStr));
                            } else {
                                resolve(json);
                            }
                        } else {
                            const errDesc = json.message || (json.errors ? JSON.stringify(json.errors) : `Ecotrack error HTTP ${res.statusCode}`);
                            reject(new Error(errDesc));
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

    async getFees() {
        const endpoint = `/api/v1/get/fees?api_token=${encodeURIComponent(this.token)}`;
        return this._request(endpoint, 'GET');
    }

    async syncTariffs() {
        const fs = require('fs');
        const path = require('path');
        const data = await this.getFees();

        if (!data || !Array.isArray(data.livraison)) {
            throw new Error('Invalid Ecotrack fees response format');
        }

        const ratesPath = path.join(__dirname, '..', '..', 'config', 'shippingRates.json');
        let existingRates = {};
        try {
            existingRates = JSON.parse(fs.readFileSync(ratesPath, 'utf8'));
        } catch (e) {}

        const updatedRates = { ...existingRates };

        for (const item of data.livraison) {
            const code = parseInt(item.wilaya_id, 10);
            if (!code || isNaN(code)) continue;

            const homePrice = parseInt(item.tarif, 10) || 700;
            const deskPrice = parseInt(item.tarif_stopdesk, 10);
            const stopdeskAvailable = Boolean(deskPrice && deskPrice > 0);

            updatedRates[String(code)] = {
                home: homePrice,
                desk: stopdeskAvailable ? deskPrice : null,
                stopdeskAvailable,
                time: existingRates[String(code)]?.time || (code > 30 ? '48 - 72 H' : '24 - 48 H')
            };
        }

        try {
            fs.writeFileSync(ratesPath, JSON.stringify(updatedRates, null, 2), 'utf8');
        } catch (fsErr) {
            console.warn('[ecotrackCourier] Failed to write updated rates to disk:', fsErr.message);
        }

        return {
            success: true,
            count: data.livraison.length,
            updatedAt: new Date().toISOString(),
            rates: updatedRates
        };
    }

    async createShipment(order) {
        let wCode = parseInt(order.wilayaCode, 10);
        if (!wCode || isNaN(wCode)) {
            const m = String(order.wilaya || '').match(/^(\d{1,2})/);
            wCode = m ? parseInt(m[1], 10) : 16;
        }

const locationResolver = require('./locationResolver');

        const isDesk = order.deliveryType === 'desk' || order.deliveryType === 'stopdesk';

        // Proactive service availability check and authoritative commune name resolution
        const availability = locationResolver.verifyDeliveryAvailability(wCode, order.commune, isDesk ? 'stopdesk' : 'home', 'redex');
        if (isDesk && !availability.available) {
            throw new Error(`Stop desk non disponible pour la commune "${availability.commune || order.commune}" (Wilaya ${wCode}). La livraison à domicile est disponible.`);
        }

        const resolvedCommune = availability.commune || order.commune;

        const payload = {
            reference: order.orderId,
            nom_client: order.fullName,
            telephone: order.phone,
            adresse: order.address || order.notes || resolvedCommune,
            code_wilaya: wCode,
            commune: resolvedCommune,
            montant: order.totalPrice,
            remarque: order.notes || 'PACK HIGH-TECH 5 EN 1 SPEAR-DZ',
            produit: order.productName || 'PACK HIGH-TECH 5 EN 1',
            type: 1, // 1: Livraison
            stop_desk: isDesk ? 1 : 0 // 0: domicile, 1: stopdesk
        };

        const res = await this._request('/api/v1/create/order', 'POST', payload);
        const trackingCode = res.tracking || res.tracking_code || (res.data && (res.data.tracking || res.data.tracking_code));

        if (!trackingCode || typeof trackingCode !== 'string' || trackingCode.trim() === '') {
            return {
                success: false,
                courier: 'redex',
                orderId: order.orderId,
                error: res.message || res.error || 'La réponse Ecotrack ne contient aucun code de suivi valide',
                raw: res
            };
        }

        return {
            success: true,
            courier: 'redex',
            trackingCode: trackingCode.trim(),
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
