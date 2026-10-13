# Spear-dz — Supabase Production Database Architecture & Setup

## 1. Architectural Overview

Supabase PostgreSQL is the **primary production database and singular source of truth** for Spear-dz (`STORAGE_BACKEND=supabase`).

### Key Mandates
1. **No Silent Fallback:** If `STORAGE_BACKEND=supabase` is active but credentials are missing or the database is unreachable, the system fails with an explicit operational error. It **never** falls back silently to Google Sheets or mock storage.
2. **Server-Side Security:** Sensitive database operations are executed strictly inside serverless API handlers (`/api/send-order`, `/api/orders`, `/api/risk`). The `SUPABASE_SERVICE_ROLE_KEY` is **never** exposed in browser code, HTML, public configs, Vite variables (`VITE_*`), or client bundles.
3. **Data Integrity & Snapshots:** Every order persists full product snapshot telemetry (`unit_price`, `quantity`, `shipping_fee`, `total_price`), customer delivery details (Wilaya 1–58, Commune, Address), courier tracking, and anti-fraud risk scores (0–100).
4. **Historical Pricing Preservation:** Price changes to catalog products in `products` do not alter historical orders recorded in `orders` and `order_items`.
5. **Cost Confidentiality:** The confidential bundle purchase cost (`cost_price`: 13,500 DZD) is never returned in public storefront endpoints.

---

## 2. Server Environment Configuration

Configure the following variables in your production server environment (e.g. Vercel Project Settings) or `.env.local`:

```bash
# Production Storage Provider
STORAGE_BACKEND=supabase

# Supabase Project Connection
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Administrative Security
ADMIN_API_TOKEN=your-32-character-secret-token
```

---

## 3. Database Schema & Tables

All tables are defined in version-controlled SQL files:
- [001_initial_schema.sql](file:///d:/Websites%20On%20Line/Spear-dz/supabase/migrations/001_initial_schema.sql)
- [002_admin_enterprise_hub.sql](file:///d:/Websites%20On%20Line/Spear-dz/supabase/migrations/002_admin_enterprise_hub.sql)
- [schema.sql](file:///d:/Websites%20On%20Line/Spear-dz/supabase/schema.sql)

| Table | Purpose | Security & RLS |
| :--- | :--- | :--- |
| `public.orders` | Incoming customer orders & lifecycle states | RLS Enabled. Anon INSERT allowed (checkout). Read/Update restricted to service-role / authenticated admin. |
| `public.order_items` | Historical line-item and bundle snapshots | RLS Enabled. Service-role access only. |
| `public.shipping_tariffs` | 58 Wilayas Home and Stopdesk delivery tariffs | RLS Enabled. Public SELECT for active tariffs. Service-role / authenticated admin for updates. |
| `public.order_status_history` | Audit log of order status transitions | RLS Enabled. Service-role access only. |
| `public.courier_tracking_events` | Courier dispatch events & carrier webhooks | RLS Enabled. Service-role access only. |
| `public.customers` | Buyer profile, trust score & order history | RLS Enabled. Service-role access only. |
| `public.products` | Dynamic catalog & bundle configuration | RLS Enabled. Public SELECT for active products. Service-role for management. |
| `public.inventory` | Stock availability & warehouse allocation | RLS Enabled. Service-role access only. |
| `public.risk_events` | Anti-fraud detection telemetry & scoring | RLS Enabled. Service-role access only. |
| `public.watchlist` | Flagged phone numbers & risky actors | RLS Enabled. Service-role access only. |
| `public.audit_logs` | Administrative and sensitive event trail | RLS Enabled. Service-role access only. |

---

## 4. Applying Migrations

### Option A: Via Supabase CLI
```bash
npx supabase db push
```

### Option B: Via Supabase SQL Editor
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Run `supabase/migrations/001_initial_schema.sql` (Core orders, items, risk).
4. Run `supabase/migrations/002_admin_enterprise_hub.sql` (Enterprise tariffs, status history, courier tracking events).

---

## 5. Verification & Testing

To verify Supabase persistence end-to-end:
```bash
# Run unit & integration test suites
npm test
```
To test live database connection:
```bash
node -e "const { getStorage } = require('./lib/storage'); getStorage().verifyHealth().then(console.log);"
```
