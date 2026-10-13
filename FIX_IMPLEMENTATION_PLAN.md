# SPEAR-DZ — PRE-FIX REPOSITORY AND TOOLING AUDIT & IMPLEMENTATION PLAN

**Audit Date:** 2026-10-13  
**Auditor:** Senior Full-Stack Engineer & Release Auditor  
**Repository Root:** `D:\Websites On Line\Spear-dz`  
**Phase:** Read-Only Audit & Planning  

---

## 1. Executive Summary & Repository Status

A full static and runtime audit of the **SPEAR-DZ** e-commerce codebase was conducted across frontend components, serverless backend functions, courier logistics adapters, database layers, Vercel project linkage, and test suites.

### Key Metrics
- **Frontend Stack:** React 19.0.0, Vite 8.3.4, Tailwind CSS 4.3.3.
- **Backend Stack:** Node.js (>=18.0.0 local, Node 24.x Vercel runtime), Serverless Functions under `api/`.
- **Database:** Supabase PostgreSQL with multi-tenant row isolation (`store_id = 'spear_dz'`) and Row-Level Security (RLS).
- **Test Baseline:** 
  - **Offline (dev server stopped):** 77 Passed / 6 Failed (All 6 failures caused by `ECONNREFUSED` connecting to `http://localhost:3000`).
  - **Online (dev server active):** 83 Passed / 0 Failed (100% Pass Rate).
- **Vercel Linkage:** 2 projects identified under organization `dripfree`: `speardz` (active local link) and `spear-dz-store`.

---

## 2. Component & Architecture Breakdown

### 2.1 Frontend Entry Points & Routing
- **Storefront Client:**
  - Entry point: `index.html` -> `src/main.jsx` -> `src/App.jsx`.
  - Design architecture: Apple Cupertino Minimalist / Stitch Single-Column (`max-w-xl mx-auto`).
  - Hero player: `src/components/CupertinoVideoHero.jsx` (smooth loop transition with poster freeze).
  - Checkout form: `src/components/OrderForm.jsx` (Algerian 58 wilayas & 1,541 communes via DZShip dataset).
  - Floating action bar: `src/components/StickyMobileBar.jsx` (21,900 DZD fixed price anchor).
- **Admin Hub:**
  - Entry point: `admin.html` (served via rewrite `/admin`).
  - Client controller: `public/js/admin-client.js`.
  - Design system: `public/css/admin.css` (Apple white parchment `#f5f5f7` theme, bilingual FR/AR).

### 2.2 API Routing Architecture
Routing is governed by Vercel Serverless Functions under `api/` with rewrites declared in `vercel.json`:
- `POST /api/send-order`: Validates phone (`0[567]XXXXXXXX`), computes server-side price (21,900 DZD + live wilaya tariff), applies RiskShield anti-bot evaluation, dispatches Meta CAPI + Telegram alerts, and saves to Supabase.
- `GET/POST /api/delivery`: Public wilaya tariff calculations, Ecotrack rate syncing, and legacy compatibility endpoints.
- `GET/PATCH/DELETE /api/orders`: Administrative order listing, status transitions, and bulk/single order archival.
- `GET/POST /api/admin/dispatch`: Real carrier dispatch gateway with tracking code generation and status history logging.
- `GET /api/admin/analytics`, `POST /api/admin/auth`, `GET/POST /api/admin/tariffs`: Supplementary admin routes.

---

## 3. Confirmed Symptoms & Root Causes

### Symptom 1: Disconnected Carrier Dispatch Flow in Admin Modal
- **Confirmed Symptom:** When an administrator clicks "Expédier" in the Admin portal modal and submits the package form, the order receives a pseudo-random tracking code (`SPDZ-XXXXXX`) rather than a real carrier barcode tracking code from Redex/Ecotrack, even though real courier credentials exist.
- **Root Cause:**
  - In `public/js/admin-client.js` (line 1322), `handlePackageSubmit` makes a POST request to `/api/delivery?action=create`.
  - In `api/delivery.js` (lines 89–111), the `action === 'create'` handler generates a synthetic mock code (`SPDZ-` + 6 random digits) and writes directly to database storage without invoking the carrier HTTP client.
  - The actual, production-ready courier adapter is located in `api/admin/dispatch.js` (which invokes `getCourier(courierId).createShipment(order)`), but the frontend form is wired to the legacy fallback route.
- **Files Responsible:**
  - `public/js/admin-client.js`
  - `api/delivery.js`
  - `api/admin/dispatch.js`

### Symptom 2: Dispatch Modal Price Default Fallback
- **Confirmed Symptom:** In the parcel shipping modal (`packageModal`), the fallback price parsing defaults to legacy store pricing (4,950 DZD) if parsing fails, instead of the canonical 21,900 DZD bundle price.
- **Root Cause:**
  - In `public/js/admin-client.js` (line 1298):
    ```javascript
    const numPriceVal = parseInt(String(price).replace(/[^\d]/g, ''), 10) || 4950;
    ```
- **Files Responsible:**
  - `public/js/admin-client.js`

### Symptom 3: Duplicate Vercel Projects & Deployment Divergence
- **Confirmed Symptom:** Two distinct projects exist on Vercel under the `dripfree` team account:
  1. `speardz` (linked to `speardz-store.vercel.app`)
  2. `spear-dz-store` (linked to `spear-dz-store.vercel.app`)
- **Root Cause:**
  - The repository was deployed under two different project names during migration, resulting in dual production aliases that could receive conflicting Git build triggers or environment variable mismatches.
- **Files Responsible:**
  - `.vercel/project.json`
  - Vercel team dashboard configuration

### Symptom 4: Integration Test Failures in Offline State
- **Confirmed Symptom:** 6 out of 83 unit/integration tests fail when `dev-server.js` is not running locally.
- **Root Cause:**
  - `tests/appleMobileHero.test.js`, `tests/stitchCupertino.test.js`, and `tests/videoComponent.test.js` issue real HTTP fetch requests to `http://localhost:3000`.
  - When the background daemon is not booted prior to running `npm test`, Node.js throws `ECONNREFUSED`.
- **Files Responsible:**
  - `tests/appleMobileHero.test.js`
  - `tests/stitchCupertino.test.js`
  - `tests/videoComponent.test.js`

---

## 4. Courier Adapters & Integration Audit

### 4.1 Ecotrack / Redex DZ (`lib/delivery/ecotrackCourier.js`)
- **Adapter Type:** **Real HTTP Client** using native Node.js `https.request`.
- **Target Host:** `https://redex.ecotrack.dz`
- **Supported Methods:**
  - `getFees()`: Fetches official 58 wilayas rates via `/api/v1/get/fees`.
  - `syncTariffs()`: Updates `config/shippingRates.json` with live stopdesk and domicile tariffs.
  - `createShipment(order)`: Dispatches payload to `/api/v1/create/order` and returns carrier tracking code.
  - `getTracking(code)`: Queries `/api/v1/track/{code}`.
  - `getLabelUrl(code)`: Generates direct PDF thermal label link.
- **Configuration:** Fully operational when `ECOTRACK_API_TOKEN` is present.

### 4.2 Yalidine Express (`lib/delivery/yalidineCourier.js`)
- **Adapter Type:** **Real HTTP Client** targeting `https://api.yalidine.app/v1`.
- **Supported Methods:** `createShipment(order)` via `/v1/parcels`, `getTracking(code)`.
- **Configuration:** Requires `YALIDINE_API_ID` and `YALIDINE_API_TOKEN`.

### 4.3 Manual / Direct Delivery (`lib/delivery/manualCourier.js`)
- **Adapter Type:** **Manual Local Adapter**. Generates internal tracking numbers (`SPDZ-YYYYMMDD-XXXX`) and label structures for internal driver delivery.

---

## 5. Required Changes & Remediation Roadmap

### 5.1 Route & Dispatch Wiring (`public/js/admin-client.js`)
1. Update `handlePackageSubmit` in `public/js/admin-client.js`:
   - Point dispatch requests to `/api/admin/dispatch` instead of `/api/delivery?action=create`.
   - Pass administrative session/authorization headers (`storeAdmin.getAuthHeaders()`).
   - Use the canon bundle price (21,900 DZD + shipping) as default fallback rather than 4,950 DZD.
   - On dispatch success, update order row with real carrier tracking code and transition status badge to `Expédié`.

### 5.2 Serverless Dispatch Consolidation (`api/delivery.js`)
1. In `api/delivery.js`, deprecate the mock implementation in `action === 'create'`:
   - Redirect internally to `getCourier(body.courierId).createShipment(orderPayload)` to guarantee that orders dispatched through any endpoint trigger authentic carrier APIs.

### 5.3 Test Suite Resilience (`tests/`)
1. Update integration test files that require a live server:
   - Implement an automated ephemeral test server setup (`before()` / `after()`) that spawns `dev-server.js` if port 3000 is not already bound, ensuring `npm test` runs 100% green in CI/CD without manual daemon startup.

---

## 6. Acceptance Criteria & Test Plan

| ID | Test Scenario | Acceptance Criteria |
|:---|:---|:---|
| **AC-01** | Admin Parcel Dispatch | Clicking "Expédier" sends request to `/api/admin/dispatch`, calls Ecotrack API, returns authentic carrier tracking code, and updates Supabase status to `shipped`. |
| **AC-02** | Status History & Audit | Status transition is written to `order_status_history` and `courier_tracking_events` with timestamp and operator metadata. |
| **AC-03** | COD Calculation Accuracy | COD amount in dashboard and print labels displays `22,350 DZD` for 450 DZD desk shipping and `21,900 DZD` base. |
| **AC-04** | Dual Submission Guard | Double-tapping checkout button does not produce duplicate orders or 500 error codes. |
| **AC-05** | Test Suite Baseline | All 83 automated tests pass cleanly both in standalone runner and CI pipelines. |

---

## 7. External Credentials & Owner Actions Required

1. **Vercel Project Unification (Optional Recommended):**
   - Retain `speardz` as the canonical production project and verify whether `spear-dz-store` should be kept as a backup alias or deleted to avoid deployment ambiguity.
2. **Ecotrack Production Account Balance:**
   - Ensure the Redex account associated with the configured token has an active account status and shipping balance for live parcel creation.
3. **No Private Secrets Disclosed:**
   - All credentials remain securely stored in `.env.local` and Vercel project environment variables.
