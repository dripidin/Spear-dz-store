'use strict';

const ManualCourier = require('./manualCourier');
const EcotrackCourier = require('./ecotrackCourier');
const YalidineCourier = require('./yalidineCourier');

const manualCourier = new ManualCourier();
const ecotrackCourier = new EcotrackCourier();
const yalidineCourier = new YalidineCourier();

function getCourier(courierId) {
    const target = (courierId || process.env.DEFAULT_COURIER || 'manual').toLowerCase();
    if (target === 'redex' || target === 'ecotrack') {
        return ecotrackCourier;
    }
    if (target === 'yalidine') {
        return yalidineCourier;
    }
    return manualCourier;
}

function getAvailableCouriers() {
    return [
        { id: 'manual', name: 'Manual / Direct Delivery (افتراضي)', active: true, configured: true },
        { id: 'redex', name: 'Redex / Ecotrack DZ', active: true, configured: ecotrackCourier.isConfigured() },
        { id: 'yalidine', name: 'Yalidine Express', active: true, configured: yalidineCourier.isConfigured() }
    ];
}

module.exports = {
    getCourier,
    getAvailableCouriers,
    manualCourier,
    ecotrackCourier,
    yalidineCourier
};
