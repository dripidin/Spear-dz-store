'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVE_FILE_PATH = path.join(__dirname, '..', '..', 'data', 'archived_orders.json');

function ensureDataDirectory() {
    const dir = path.dirname(ARCHIVE_FILE_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function readArchiveRecords() {
    ensureDataDirectory();
    if (!fs.existsSync(ARCHIVE_FILE_PATH)) {
        return [];
    }
    try {
        const raw = fs.readFileSync(ARCHIVE_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn('[ArchiveStore] Warning reading archive file:', err.message);
        return [];
    }
}

function writeArchiveRecords(records) {
    ensureDataDirectory();
    const tempPath = ARCHIVE_FILE_PATH + '.tmp.' + Date.now();
    fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf8');
    fs.renameSync(tempPath, ARCHIVE_FILE_PATH);
}

function getArchivedOrderIds() {
    const records = readArchiveRecords();
    return new Set(records.map(r => r.orderId));
}

function getArchivedOrders() {
    return readArchiveRecords();
}

function isArchived(orderId) {
    if (!orderId) return false;
    const ids = getArchivedOrderIds();
    return ids.has(orderId);
}

function archiveOrders(ordersList, actor = 'admin', reason = 'Manual deletion') {
    if (!Array.isArray(ordersList) || ordersList.length === 0) {
        return [];
    }
    const current = readArchiveRecords();
    const existingIds = new Set(current.map(r => r.orderId));
    const now = new Date().toISOString();

    const added = [];
    for (const order of ordersList) {
        const orderId = typeof order === 'string' ? order : order.orderId;
        if (!orderId) continue;

        let record = current.find(r => r.orderId === orderId);
        if (record) {
            record.archivedAt = now;
            record.archivedBy = actor;
            record.reason = reason;
            if (typeof order === 'object') {
                record.orderSnapshot = order;
            }
            added.push(record);
        } else {
            record = {
                orderId,
                archivedAt: now,
                archivedBy: actor,
                reason,
                orderSnapshot: typeof order === 'object' ? order : { orderId }
            };
            current.push(record);
            existingIds.add(orderId);
            added.push(record);
        }
    }

    if (added.length > 0) {
        writeArchiveRecords(current);
    }
    return added;
}

function unarchiveOrder(orderId) {
    if (!orderId) return false;
    const current = readArchiveRecords();
    const filtered = current.filter(r => r.orderId !== orderId);
    if (filtered.length !== current.length) {
        writeArchiveRecords(filtered);
        return true;
    }
    return false;
}

/**
 * Identifies synthetic or developer test records safely.
 * Matches explicit test fixture prefixes and confirmed test names.
 * Never flags genuine customer orders.
 */
function isSyntheticTestOrder(order) {
    if (!order) return false;
    const id = String(order.orderId || '').toUpperCase();
    const name = String(order.fullName || '').toLowerCase();
    const phone = String(order.phone || '').trim();
    
    // Explicit fixture prefixes
    if (id.startsWith('TEST-') || id.includes('TEST-VERIF') || id.includes('TEST-SPDZ') || id.includes('FIXTURE')) {
        return true;
    }
    // Test customer name markers in Latin or Arabic
    if (/test|tester|تست|démo|demo/i.test(name)) {
        return true;
    }
    // Confirmed synthetic test phones
    if (phone === '0555000000' || phone === '0661000001' || phone === '0770000000') {
        return true;
    }
    return false;
}

module.exports = {
    getArchivedOrderIds,
    getArchivedOrders,
    isArchived,
    archiveOrders,
    unarchiveOrder,
    isSyntheticTestOrder,
    ARCHIVE_FILE_PATH
};
