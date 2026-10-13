# SPEAR-DZ — ENTERPRISE ADMIN HUB SETUP & OPERATIONAL GUIDE

> **Target Workspace:** `D:\Websites On Line\Spear-dz`  
> **Production Database:** Supabase PostgreSQL (`STORAGE_BACKEND=supabase`)  
> **Interface Design:** Spear Cyber-Luxury (Arabic RTL default, French LTR toggle)  
> **Print Standard:** A6 Thermal (100 × 150 mm) & A4 multi-label with Code128 Barcodes  
> **Verification Status:** Fully Tested & Verified (68/68 passing tests)

---

## 1. System Overview & Architecture

The SPEAR-DZ Enterprise Admin Hub is an operational e-commerce and logistics management platform engineered specifically for Algerian Cash-on-Delivery (COD) operations across all 58 Wilayas.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SPEAR-DZ STOREFRONT & APIS                      │
│   (React 19 / Vite Storefront + Server-Side Price & Risk Validation)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Orders & Risk Events
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE POSTGRESQL DB                          │
│   • orders                    • shipping_tariffs (58 Wilayas)          │
│   • risk_events / watchlist   • order_status_history                   │
│   • courier_tracking_events   • admin_audit_logs                       │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                                    │ Authenticated Admin Session
                                    │ (spdz_sess_... token / 12h TTL)
┌───────────────────────────────────┴────────────────────────────────────┐
│                    SPEAR-DZ ENTERPRISE ADMIN HUB                       │
│  ├── 10 Precision Operational KPIs (Delivered COD, Pending COD, Rates) │
│  ├── Interactive Trend & Wilayas Analytics (Chart.js 4.4)              │
│  ├── Orders DataGrid (Server Search, 58 Wilayas Filter, Pagination)   │
│  ├── Multi-Carrier Gateway (Yalidine, Redex/Ecotrack, Manual Dispatch) │
│  ├── A6 Thermal Bordereaux Generator (Code128 Barcode, Isolated Print) │
│  ├── Visual Tracking Timeline (Normalized Carrier Checkpoints)        │
│  ├── Trust & Fraud Shield Inspector (0-100 Score, Overrides, Ban List) │
│  └── Dynamic 58-Wilayas Tariff Matrix (Supabase Read/Write Overrides)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Admin Credentials

All administrative endpoints and UI actions require authentication. Weak client-side storage or plain query string tokens have been completely replaced with a session token mechanism.

### Credentials Configuration
In your environment configuration (`.env.local` or hosting provider environment variables):
```env
# Master administrative secret key (minimum 32 random characters recommended)
ADMIN_API_TOKEN="your-secure-production-admin-token-here"
```

### Authentication Flow
1. Navigate to `/admin` in your web browser.
2. The **Authentication Overlay Modal** appears automatically if no valid session is present.
3. Enter your configured `ADMIN_API_TOKEN`.
4. The server validates the token using timing-safe constant-time comparison via `POST /api/admin/auth`.
5. Upon successful validation, the server issues a session token (`spdz_sess_...`) with a 12-hour expiration and logs an `ADMIN_LOGIN` audit event.
6. The session is cached in `sessionStorage` and sent as `Authorization: Bearer <sessionToken>` on all API requests.
7. Clicking the **Logout** button (`fa-power-off`) immediately sends `DELETE /api/admin/auth`, revoking the session token on the server and returning to the login lock screen.

---

## 3. Operational Features & Walkthrough

### 3.1. Dashboard Overview & Precision KPIs
The analytics engine (`/api/admin/analytics`) aggregates live metrics directly from Supabase:

| Metric | Formula / Calculation | Description |
| :--- | :--- | :--- |
| **إجمالي الطلبيات (Total Orders)** | `COUNT(*)` | All registered orders |
| **قيد المراجعة (Pending)** | `status IN ('pending', 'review')` | Awaiting operator phone confirmation |
| **طلبيات مؤكدة (Confirmed)** | `status IN ('confirmed', 'preparing')` | Confirmed by customer, packaging in progress |
| **في التوصيل (In Transit)** | `status = 'shipped'` | Dispatched with carrier (Yalidine/Redex/Manual) |
| **تم التسليم بنجاح (Delivered)** | `status = 'delivered'` | Customer received parcel and paid cash |
| **مرتجعات وإلغاء (Returned/Cancel)** | `status IN ('returned', 'cancelled')` | Returned parcels or cancelled orders |
| **مداخيل تم تحصيلها (Delivered COD)**| `SUM(total_price) WHERE status='delivered'` | Net cash collected in Algerian Dinars (DZD) |
| **مبالغ قيد التوزيع (Pending COD)** | `SUM(total_price) WHERE status IN ('pending','confirmed','shipped')`| Expected COD cash currently in circulation |
| **معدل التأكيد (Confirmation Rate)**| `(confirmed + preparing + shipped + delivered + returned) / (total - botSpam) * 100` | Percentage of legitimate orders confirmed |
| **نسبة نجاح التسليم (Delivery Rate)**| `delivered / (delivered + returned) * 100` | Courier delivery efficiency percentage |

### 3.2. Visual Analytics (Chart.js 4.4)
- **7-Day Rolling Trend**: Line chart tracking daily submitted orders, confirmations, and deliveries.
- **Top 10 Wilayas**: Bar chart ranking provinces with highest order volume to optimize logistics routes and courier partnerships.

### 3.3. Order Management Workspace (DataGrid)
- **Status Filter Tabs**: Quick pills for All, Pending, Confirmed, Shipped, Delivered, Returned, and Flagged Risk.
- **Global & Local Search**: Instant search by order number (e.g. `SPDZ-123456`), customer phone, customer name, or commune.
- **58 Wilayas Selector**: Isolate orders by specific Algerian Wilaya (1 to 58).
- **Pagination**: 15 orders per page with responsive page navigation buttons.
- **Action Buttons per Row**:
  - `👁️ View`: Order details inspection.
  - `🚚 Dispatch`: Open parcel creation modal with selected carrier.
  - `🏷️ Label`: Generate official A6 thermal bordereau.
  - `🛡️ Risk`: Inspect anti-fraud score and triggers.

### 3.4. Multi-Carrier Logistics Gateway
- Integrated couriers:
  - **Yalidine Express**: Full API driver with automatic tracking code generation.
  - **Redex / Ecotrack DZ**: Ecotrack family driver for fast Algiers/suburb deliveries.
  - **Manual / Direct Delivery**: For private drivers or direct handover.
- **Duplicate Prevention**: If an order has already been marked as `shipped`, repeat dispatch attempts are blocked with HTTP 400.
- **Event Auditing**: Every dispatch attempt is recorded in `courier_tracking_events` and `order_status_history` in Supabase.

### 3.5. Official A6 Thermal Shipping Label (Bordereau)
- Dimensions: Standard thermal label **100 mm × 150 mm** (A6) or A4 sheet.
- Features:
  - Store identity: `SPEAR.DZ • STORE OFFICIEL ALGÉRIE`
  - Selected carrier badge and Stopdesk / Home Delivery indicator.
  - **Code128 Barcode**: High-contrast SVG barcode scannable with handheld laser scanners.
  - Recipient block: Full Name, Primary Phone, Full Address, Wilaya code + name.
  - **Prominent COD Cash Box**: Large bold font (`MONTANT À ENCAISSER / الدفع عند الاستلام: 21,900 DZD`).
  - Print Isolation: Clicking **Print** activates `@media print` with `@page { size: 100mm 150mm; margin: 0; }` hiding the entire dashboard, navigation, and modal chrome.

### 3.6. Visual Tracking Timeline
- Shows normalized delivery checkpoints:
  1. *Créé / En attente* (Pending)
  2. *Confirmé par client* (Confirmed)
  3. *Préparé en entrepôt* (Preparing)
  4. *Expédié au transporteur* (Shipped / In Transit)
  5. *En cours de livraison* (Out for Delivery)
  6. *Livré avec succès* (Delivered)
- Retrieves carrier live tracking status from Yalidine/Redex or internal tracking logs.

### 3.7. Trust & Fraud Shield Inspector
- 0 to 100 risk score calculation based on:
  - Honeypot bot trap detection (+90 score).
  - Rapid submission velocity (<3.0s form fill time, +40 score).
  - Algerian phone prefix validation (+30 for suspicious/malformed prefix).
  - Customer order frequency from same IP hash or phone.
- **Manual Overrides**:
  - `تصنيف كـ عميل موثوق (Mark Trusted)`: Sets decision to `ALLOW`.
  - `حظر الرقم (Add to Blacklist)`: Adds customer phone/IP to `risk_watchlist` with `BLOCK` decision.

### 3.8. Dynamic 58-Wilayas Shipping Tariffs
- Rates stored in Supabase `public.shipping_tariffs`.
- Supports independent **Home Delivery (Domicile)** and **Stopdesk (Bureau)** fees for all 58 provinces.
- Admin can search, adjust prices, edit estimated delivery windows (e.g. `24 - 48 H`), and toggle active status.
- Checkout automatically reads these tariffs ensuring 100% price parity between storefront and admin.

---

## 4. Environment Variables Reference

Ensure the following variables are defined in `.env.local` or production settings:

```env
# Production Database (Mandatory)
STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Admin Security
ADMIN_API_TOKEN=your-random-32-char-admin-token

# Courier Integrations (Optional for real API mode)
DEFAULT_COURIER=manual
YALIDINE_API_ID=
YALIDINE_API_TOKEN=
ECOTRACK_API_TOKEN=

# Meta Conversions API (Optional)
META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=
```

---

## 5. Running the Application

### Development Mode
```bash
node dev-server.js
```
The server will start on `http://localhost:3000`.  
- Storefront: `http://localhost:3000/`
- Enterprise Admin: `http://localhost:3000/admin`

### Running Automated Verification
```bash
npm test
```
Executes all 68 tests across 17 test suites verifying security, analytics, tariffs, couriers, and database persistence.
