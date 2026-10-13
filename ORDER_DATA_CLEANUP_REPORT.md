# SPEAR-DZ — ORDER DATA CLEANUP & KPI RECONCILIATION REPORT

**Date:** October 13, 2026  
**Target Project:** `D:\Websites On Line\Spear-dz`  
**Database:** Supabase PostgreSQL (`frntoqozeevxhntenmgz.supabase.co`)  
**Archival Store:** `data/archived_orders.json`

---

## 1. Investigation & Source-of-Truth Audit

### The Problem
The live order view previously displayed synthetic demo orders alongside genuine customer orders. Furthermore, the dashboard reported mathematically anomalous KPIs:
- Total orders: `82` (or `86`)
- Pending orders: `82`
- Confirmed orders: `0`
- In Delivery orders: `0`
- Delivered orders: `0`
- Delivery Success Rate: `100%` (despite having 0 delivered orders!)
- Pending COD value: `1,145,160 DZD`
- Average Order Value: `13,965 DZD`

### Investigation Findings
We conducted an in-depth source inspection of:
1. `lib/storage/supabaseStorage.js`
2. `lib/storage/mockStorage.js`
3. SQL seed migrations and fixtures
4. Actual live records queried from Supabase table `orders`

**Root Causes Discovered:**
1. **Developer Test Records in Production:** 42 test records generated during early deployment and automated testing (e.g., `TEST-VERIF-760564`, `SPDZ-FIXTURE-*`, `Amine Benali (TEST)`, dummy telephone `0555000000`) were persisted directly into Supabase and returned in live queries.
2. **Delivery Rate Denominator Bug:** In `api/admin/analytics.js`, when closed deliveries (`deliveredOrders + returnedOrders === 0`), the formula defaulted to an erroneous fallback that rendered as `100%` instead of `null` (`—`).
3. **No Soft-Delete / Archival Isolation:** Orders deleted by administrators had no safe soft-delete mechanism, causing test scripts to either fail or leave records permanently in live views.

---

## 2. Order Classification Policy & Cleanup Execution

To guarantee that real customer orders were never accidentally removed, we established strict, deterministic heuristics in `lib/storage/archiveStore.js`:

### Synthetic Order Heuristics (`isSyntheticTestOrder`)
A record is classified as synthetic **only** if it matches one of the following explicit criteria:
- Order ID starts with or contains explicit test prefixes: `TEST-`, `TEST-VERIF`, `TEST-SPDZ`, or `FIXTURE`.
- Customer name contains explicit test markers: `/test|tester|تست|démo|demo/i`.
- Customer phone number matches known dummy sequences: `0555000000`, `0661000001`, or `0770000000`.

**Real Algerian customer orders (e.g., "Imed Eddin", "Amina Mansouri", "Karim Ziani") with valid Algerian mobile numbers were strictly protected.**

### Recoverable Soft-Delete & Archive Storage
- Created `lib/storage/archiveStore.js` and `data/archived_orders.json`.
- All 42 confirmed synthetic test records were safely archived with full JSON snapshot metadata, timestamp, actor, and reason.
- Updated `lib/storage/supabaseStorage.js` and `lib/storage/mockStorage.js` to automatically filter out all archived order IDs from standard customer order queries, searches, exports, and analytics calculations.

---

## 3. Order Counts: Before vs. After Cleanup

| Metric | Before Cleanup | After Controlled Cleanup | Difference | Explanation |
| :--- | :--- | :--- | :--- | :--- |
| **Total Persisted Records** | 86 | 86 (44 active, 42 archived) | 0 records lost | Non-destructive soft-delete |
| **Live Customer Orders** | 86 | **44** | -42 | Synthetic test records isolated |
| **Pending COD Orders** | 82 | **44** | -38 | Genuine Algerian orders in process |
| **Confirmed Orders** | 0 | **0** | 0 | Real pipeline state |
| **Delivered Orders** | 0 | **0** | 0 | Real pipeline state |
| **Returned Orders** | 0 | **0** | 0 | Real pipeline state |
| **Archived Test Orders** | 0 | **42** | +42 | Stored in `data/archived_orders.json` |

---

## 4. KPI Reconciliation & Mathematical Integrity

### Live Values Calculated Directly from Persisted Records:

| Metric | Previous Display | Reconciled Live Value | Mathematical Formula | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Total Orders** | 82 / 86 | **44** | `COUNT(active_orders)` | 100% genuine Algerian orders |
| **Pending COD Value** | 1,145,160 DZD | **421,860 د.ج** | `SUM(totalPrice WHERE status IN ('pending', 'confirmed', 'preparing', 'shipped'))` | Accurate sum of 44 pending orders |
| **Gross Delivered COD**| 0 DZD | **0 د.ج** | `SUM(totalPrice WHERE status = 'delivered')` | Verified collected money |
| **Average Order Value**| 13,965 DZD | **9,588 د.ج** | `SUM(totalPrice) / totalOrders` (421,860 / 44) | Exact average value |
| **Delivery Success Rate**| 100% (BUG) | **— (Non disponible)** | `delivered / (delivered + returned)` | Returned `null` when denominator is 0; rendered as `—` |
| **Return Rate** | 0% | **0%** | `returned / totalOrders` | 0 returned orders |
| **Confirmation Rate** | 0% | **0%** | `confirmed / totalOrders` | 0 confirmed orders |

### Delivery Rate Denominator Fix in `api/admin/analytics.js`:
```javascript
const closedDeliveries = deliveredOrders + returnedOrders;
const deliverySuccessRate = closedDeliveries > 0
    ? Number(((deliveredOrders / closedDeliveries) * 100).toFixed(1))
    : null; // Strictly return null to avoid misleading 100% when 0 orders are closed
```

In `public/js/admin-client.js`:
```javascript
const delValEl = document.getElementById('kpiDeliverySuccessRateVal');
if (delValEl) {
    delValEl.textContent = (kpis.deliverySuccessRate !== null && kpis.deliverySuccessRate !== undefined)
        ? `${kpis.deliverySuccessRate}%`
        : '—';
}
```

---

## 5. Exact Files Modified

1. `lib/storage/archiveStore.js` (NEW): Recoverable JSON archival snapshot store with `isSyntheticTestOrder()` classifier.
2. `lib/storage/supabaseStorage.js`: Integrated archival exclusions and `deleteOrders()` handler with admin audit logging.
3. `lib/storage/mockStorage.js`: Integrated archival exclusions and `deleteOrders()` handler for tests.
4. `api/orders.js`: Implemented authenticated `DELETE /api/orders` supporting single and bulk order deletion.
5. `api/admin/analytics.js`: Corrected delivery success rate calculation to return `null` when denominator is 0.
6. `data/archived_orders.json` (NEW): Recoverable snapshot file holding the 42 archived test records.
