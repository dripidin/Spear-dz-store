'use strict';

const fs = require('fs');
const path = require('path');

const ratesPath = path.join(__dirname, '..', '..', 'config', 'shippingRates.json');
let rates = {};
try {
    rates = JSON.parse(fs.readFileSync(ratesPath, 'utf8'));
} catch (e) {
    rates = {};
}

class ManualCourier {
    constructor() {
        this.id = 'manual';
        this.name = 'Manual / Direct Delivery (التوصيل المباشر أو اليدوي)';
    }

    getTariff(wilayaCode, deliveryType = 'home') {
        const codeStr = String(wilayaCode);
        const wRate = rates[codeStr] || { home: 700, desk: 450, time: '24 - 48 H' };
        const fee = (deliveryType === 'desk' || deliveryType === 'stopdesk') ? wRate.desk : wRate.home;
        return {
            courier: 'manual',
            wilayaCode: parseInt(wilayaCode, 10),
            deliveryType,
            fee,
            estimatedTime: wRate.time
        };
    }

    async createShipment(order) {
        // Generate a deterministic operational tracking code for internal manual delivery
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const trackingCode = `MANUAL-${dateStr}-${randomNum}`;

        return {
            success: true,
            courier: 'manual',
            trackingCode,
            isManual: true,
            orderId: order.orderId,
            message: 'Manual shipment order assigned and ready for internal dispatch'
        };
    }

    async getTracking(trackingCode) {
        return {
            success: true,
            courier: 'manual',
            trackingCode,
            status: 'in_transit',
            history: [
                { status: 'created', timestamp: new Date().toISOString(), note: 'Colis créé et assigné pour expédition' }
            ]
        };
    }

    getLabelData(order, trackingCode) {
        return {
            trackingCode,
            courier: 'SPEAR-DZ EXPRESS',
            recipient: {
                name: order.fullName,
                phone: order.phone,
                wilaya: order.wilaya,
                commune: order.commune,
                address: order.address || order.commune
            },
            bundle: order.productName || 'PACK HIGH-TECH 5 EN 1',
            codAmount: order.totalPrice,
            deliveryType: order.deliveryType || 'home'
        };
    }
}

module.exports = ManualCourier;
