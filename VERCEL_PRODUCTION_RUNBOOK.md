# VERCEL PRODUCTION RUNBOOK — SPEAR-DZ
**Store**: Spear-dz — High-Tech Store (سبير ديزاد — متجر التكنولوجيا الفاخرة)  
**Production Platform**: Vercel Serverless (Node.js 24.x + Vite Frontend)  
**Database**: Supabase PostgreSQL (Isolated Production Instance)  
**Courier Integration**: EcoTrack DZ / Redex  
**Authoritative Canonical Project**: `spear.dz` (`prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9`)  
**Vercel Team**: `dripfree` (`team_QTvZdIUT8BJL4CV3eQYCoZwR`)  

---

## 1. Production Architecture Overview

Spear-dz operates on a unified serverless architecture designed for high-concurrency Algerian e-commerce:
- **Frontend SPA**: Vite-compiled Apple Cupertino White aesthetic (`dist/`), deployed with pre-compressed chunks and zero runtime dependencies.
- **API Gateways**: Node.js serverless functions located under `api/`:
  - `api/send-order.js`: Order checkout ingestion with honeypot bot trap, timing check, phone normalization, server-enforced pricing, and idempotency protection.
  - `api/orders.js`: Authenticated administrative CRUD, search, filter, and allowed status transitions.
  - `api/admin/dispatch.js`: Real courier dispatch gateway communicating with carrier HTTP APIs.
  - `api/admin/auth.js` & `api/auth.js`: Stateless session and master token authentication.
  - `api/delivery.js`: Public 58-wilaya delivery tariff lookup.
- **Persistence Layer**: Primary database of record is Supabase (`lib/storage/supabaseStorage.js`).
- **Security Policy**: Strict **Fail-Closed**. No administrative action or external dispatch is permitted without authentic, configured server credentials.

---

## 2. Release & Deployment Workflow

### Primary Deployment Method: Automated Git Release
The canonical project is connected to the GitHub repository `dripidin/Spear-dz-store`.
1. Run local test suite and production build:
   ```bash
   npm run build
   npm test
   ```
2. Commit and push changes to `main`:
   ```bash
   git add .
   git commit -m "feat/fix: descriptive release message"
   git push origin main
   ```
3. Vercel automatically deploys the commit to production in ~45 seconds.

### Secondary Deployment Method: Vercel CLI
If deploying directly from the command line:
```bash
# Verify local link is bound to speardz (prj_XlEo7880PI0zF5Shb0zjSQc3RtDR)
npx vercel whoami

# Deploy to production
npx vercel --prod
```

---

## 3. Environment Variable Catalog

Configured in **Vercel Dashboard -> Project `speardz` -> Settings -> Environment Variables**:

| Variable Name | Required? | Target Environments | Purpose |
| :--- | :---: | :--- | :--- |
| **`SUPABASE_URL`** | **YES** | Production, Preview | Supabase project REST URL (`https://[ref].supabase.co`) |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **YES** | Production, Preview | Supabase backend service role key (bypasses RLS for write access) |
| **`ADMIN_API_TOKEN`** | **YES** | Production, Preview | Master password/token protecting all admin routes |
| **`STORAGE_BACKEND`** | **YES** | Production, Preview | Must be set to `supabase` |
| **`ECOTRACK_API_TOKEN`** | **YES** | Production, Preview | Secret API Bearer token for carrier parcel dispatch |
| **`ECOTRACK_BASE_URL`** | Optional | Production, Preview | Defaults to `https://redex.ecotrack.dz` |
| **`DEFAULT_COURIER`** | Optional | Production, Preview | Set to `redex` or `ecotrack` (defaults to manual if omitted) |
| **`STORE_TIMEZONE`** | Optional | Production, Preview | Set to `Africa/Algiers` |
| **`DEFAULT_LOCALE`** | Optional | Production, Preview | Set to `ar` (Arabic) or `fr` (French) |
| **`TELEGRAM_BOT_TOKEN`** | Optional | Production, Preview | Telegram bot token for instant merchant order notifications |
| **`TELEGRAM_CHAT_ID`** | Optional | Production, Preview | Destination chat or channel ID for order alerts |
| **`META_PIXEL_ID`** | Optional | Production, Preview | Facebook Pixel ID for Meta Conversions CAPI |
| **`META_ACCESS_TOKEN`** | Optional | Production, Preview | Meta Graph API access token for server-side events |
| **`VERCEL_TOKEN`** | Optional / Rec. | Production, Preview | Vercel Access Token with read-only analytics scope (enables admin Web Analytics API) |
| **`VERCEL_PROJECT_ID`** | Optional / Rec. | Production, Preview | Canonical project ID (`prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9`) |
| **`VERCEL_TEAM_ID`** | Optional / Rec. | Production, Preview | Canonical team ID (`team_QTvZdIUT8BJL4CV3eQYCoZwR`) |

---

## 4. Operational Incident Runbook

### Incident 1: Admin Login Returns 500 `ADMIN_AUTH_MISCONFIGURED`
- **Cause**: `ADMIN_API_TOKEN` is missing or blank in the Vercel project environment variables.
- **Resolution**:
  1. Open Vercel Dashboard -> Project `speardz` -> Settings -> Environment Variables.
  2. Add `ADMIN_API_TOKEN` with a strong, random password or token.
  3. Redeploy the latest deployment (**Deployments** -> **Redeploy**).

### Incident 2: Courier Dispatch Returns 422 `MISSING_CREDENTIALS`
- **Cause**: `ECOTRACK_API_TOKEN` is missing or invalid in Vercel.
- **Resolution**:
  1. Obtain your active carrier token from your EcoTrack / Redex dashboard.
  2. Add `ECOTRACK_API_TOKEN` in Vercel project environment variables.
  3. Redeploy the application.
  4. Test dispatch with an approved test order.

### Incident 3: Checkout Fails with 500 Persistence Error
- **Cause**: Supabase project paused, service role key expired, or network unreachable.
- **Resolution**:
  1. Log into your Supabase dashboard and verify the project status is **Active**.
  2. Verify that tables `orders`, `risk_events`, and `courier_sync_logs` exist and have correct schema migrations.
  3. Test connection locally:
     ```bash
     node tests/supabaseArchitecture.test.js
     ```

### Incident 4: Domain Migration (`spear-dz-store.vercel.app` -> `speardz`)
- **Procedure**:
  1. Go to project `spear-dz-store` -> Settings -> Domains -> Remove `spear-dz-store.vercel.app`.
  2. Go to project `speardz` -> Settings -> Domains -> Add `spear-dz-store.vercel.app`.
  3. Verify SSL certificate status in Vercel (typically active in <60 seconds).
  4. Browse to `https://spear-dz-store.vercel.app` and confirm HTTP 200 response.

### Incident 5: Web Analytics Dashboard Returns 503 `ANALYTICS_NOT_CONFIGURED`
- **Cause**: `VERCEL_TOKEN` has not yet been configured in the Vercel project environment variables.
- **Resolution**:
  1. Open Vercel Account Settings -> Tokens (`https://vercel.com/account/tokens`).
  2. Create a token scoped to team `dripfree` with read-only analytics access.
  3. Add `VERCEL_TOKEN` into Vercel Project `spear.dz` environment variables.
  4. Ensure Web Analytics is enabled in the Vercel Dashboard for `spear.dz`.
  5. Redeploy or restart the deployment to pick up the new variable.

---

## 5. Security & Maintenance Checklist

- [x] All hardcoded password fallbacks removed from source code.
- [x] Admin routes fail closed on unconfigured servers.
- [x] Carrier gateway blocks synthetic tracking codes.
- [x] Frontend bundles contain 0 private keys or backend service role credentials.
- [x] Local workspace linked to canonical project (`spear.dz`).
- [ ] Store owner: Detach domain from secondary project and attach to canonical project.
- [ ] Store owner: Disconnect GitHub webhook on secondary project.
- [ ] Store owner: Add `VERCEL_TOKEN` to Vercel environment variables for live admin analytics reporting.

---

## 6. Phase 5 — Vercel Web Analytics Operational Status

| Component | Target / File | Status | Description |
| :--- | :--- | :---: | :--- |
| Storefront Tracking Package | `@vercel/analytics` (^2.0.1) | **PASS** | Installed and verified with React 19. |
| Storefront Analytics Component | `src/main.jsx` | **PASS** | Single `<Analytics />` component mounted in root. |
| Production Bundle Build | `dist/` via `vite build` | **PASS** | Clean build with zero errors. |
| Server-Side Client Module | `lib/vercelAnalytics.js` | **PASS** | Runtime config checks; safe error mapping without leaks. |
| Protected Admin Endpoint | `api/admin/website-analytics.js` | **PASS** | Protected by admin session; enforced `Cache-Control: private, no-store`. |
| Admin Dashboard Integration | `admin.html` & `public/js/admin-client.js` | **PASS** | Dynamic status badge, 7/30 days filters, graceful 503 fallback. |
| Automated Test Suite | `tests/websiteAnalytics.test.js` | **PASS** | 24 dedicated test cases passing in Node.js test runner. |
| Full Project Regression Suite | `tests/**/*.test.js` | **PASS** | 147 of 147 test cases passing. |
| Live Vercel API Credentials | `VERCEL_TOKEN` in production | **BLOCKED** | Pending store owner generation and injection into Vercel settings. |
| Production Live Deployment | `https://speardz.vercel.app/` | **BLOCKED** | Requires explicit owner deployment authorization. |
| Custom Events (`track()`) | Storefront Analytics | **NOT TESTED** | Deferred until Vercel Pro/Enterprise plan is confirmed. |

