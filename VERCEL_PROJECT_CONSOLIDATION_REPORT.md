# VERCEL PROJECT CONSOLIDATION & PRODUCTION IDENTITY AUDIT
**Project Workspace**: `D:\Websites On Line\Spear-dz`  
**Report Date**: October 13, 2026  
**Auditor**: Antigravity Full-Stack Release Auditor  
**Audit Phase**: PHASE 4 — Strict Read-Only Audit  

---

## 1. Executive Summary

This audit examined the dual-project Vercel architecture where two remote projects (`speardz` and `spear-dz-store`) under the Vercel team `dripfree` (`team_QTvZdIUT8BJL4CV3eQYCoZwR`) are concurrently connected to the single GitHub repository `dripidin/Spear-dz-store` on branch `main`.

### Core Findings
1. **Local CLI Binding**: The local workspace in `D:\Websites On Line\Spear-dz` is bound directly to **`speardz`** (`prj_XlEo7880PI0zF5Shb0zjSQc3RtDR`) via `.vercel/project.json`.
2. **Configuration Divergence**: **`speardz`** contains the complete set of operational production environment variables (`ADMIN_API_TOKEN`, `ECOTRACK_API_TOKEN`, `ECOTRACK_BASE_URL`, `TELEGRAM_BOT_TOKEN`, isolated `SUPABASE_URL`, etc.). **`spear-dz-store`** is an unconfigured project containing only the initial auto-generated Postgres/Supabase integration keys, lacking critical courier, auth, and notification secrets.
3. **Dual Deployment Hazard**: Because both projects share the same GitHub repository and production branch (`main`), every Git commit triggers **two simultaneous production deployments**.
4. **Domain Mismatch**: The cleaner subdomain `spear-dz-store.vercel.app` is bound to the unconfigured secondary project (`spear-dz-store`), while the configured production project is serving `speardz-store.vercel.app`.
5. **Recommended Canonical Project**: **`speardz` (`prj_XlEo7880PI0zF5Shb0zjSQc3RtDR`)**.

---

## 2. Classification Matrix

| Category | Finding | Status |
| :--- | :--- | :--- |
| **Local Workspace Binding** | `.vercel/project.json` targets `speardz` (`prj_XlEo7880PI0zF5Shb0zjSQc3RtDR`) | **PASS** |
| **Remote Authentication** | Vercel CLI token authenticated as user `dripfree` on team `team_QTvZdIUT8BJL4CV3eQYCoZwR` | **PASS** |
| **Git Linkage** | Both projects correctly track GitHub repository `dripidin/Spear-dz-store` (`main`) | **PASS** |
| **Storefront Availability** | Both `speardz-store.vercel.app` and `spear-dz-store.vercel.app` serve the store (HTTP 200) | **PASS** |
| **Admin Route Availability** | Both domains correctly rewrite `/admin` to `admin.html` (HTTP 200) | **PASS** |
| **Public Delivery API** | Public tariffs API (`GET /api/delivery?action=tariffs`) returns 58 wilayas rates | **PASS** |
| **Admin API Security** | `GET /api/orders` enforces 401 Unauthorized when unauthenticated on both projects | **PASS** |
| **Static Assets** | Hero video poster (`images/last-frame-16-9.jpg`) and CSS (`css/admin.css`) load cleanly | **PASS** |
| **Project Consolidation** | Two projects tracking the same repo causing redundant concurrent deployments | **FAIL** |
| **Environment Parity** | `spear-dz-store` is missing 10 required operational production environment variables | **FAIL** |
| **Domain Assignment** | Target production domain `spear-dz-store.vercel.app` points to unconfigured project | **FAIL** |
| **Custom Domain Mapping** | Custom production domain (e.g. `spear-dz.com`) is not yet attached to either project | **BLOCKED** |
| **Vercel Web Analytics** | Web Analytics enabled in project settings, but package not merged into client bundle | **FAIL** |

---

## 3. Remote Projects Detailed Audit

### Project A: `speardz` (Recommended Canonical Project)
- **Project ID**: `prj_XlEo7880PI0zF5Shb0zjSQc3RtDR`
- **Project Name**: `speardz`
- **Team Ownership**: `team_QTvZdIUT8BJL4CV3eQYCoZwR` (`DRIPIDIN - FREE CLIENTS WORK`, slug: `dripfree`)
- **Connected Git Repository**: `github.com/dripidin/Spear-dz-store` (Repo ID: `1416574134`)
- **Production Branch**: `main`
- **Framework Preset**: `vite`
- **Node.js Runtime**: `24.x`
- **Root Directory**: `null` (Repository Root)
- **Build Command**: `null` (Executes default `npm run build` -> `vite build`)
- **Output Directory**: `null` (Default `dist`)
- **Install Command**: `null` (Default package manager)
- **Assigned Domain**: `speardz-store.vercel.app` (Verified: `true`, Apex: `vercel.app`)
- **Latest Production Deployment**:
  - Deployment ID: `dpl_CPGNGtUccMLuGnyBEipvKmHWspT4`
  - URL: `speardz-bxr7o6xhz-dripfree.vercel.app`
  - State: `READY`
  - Target: `production`
  - Created At: `1791912485936`
  - Commit SHA: `4c9792acf4d91c037ddafba2c98cbabb8d9827a6`
  - Commit Message: `fix(orders): resolve COD amount formatting and duplicate orderId constraint idempotency`
- **Analytics Configuration**:
  - Web Analytics ID: `PUTpKo5M68RUDGNypUcajZmWm` (Status: Enabled)
  - Speed Insights ID: `12I4XGgHDrjQRQHUchpmJWTLedA` (Status: Configured, `hasData: false`)
- **Local CLI Binding**: **MATCHES** (Local `.vercel/project.json` targets this exact project).

### Project B: `spear-dz-store` (Secondary / Divergent Project)
- **Project ID**: `prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9`
- **Project Name**: `spear-dz-store`
- **Team Ownership**: `team_QTvZdIUT8BJL4CV3eQYCoZwR` (`DRIPIDIN - FREE CLIENTS WORK`, slug: `dripfree`)
- **Connected Git Repository**: `github.com/dripidin/Spear-dz-store` (Repo ID: `1416574134`)
- **Production Branch**: `main`
- **Framework Preset**: `vite`
- **Node.js Runtime**: `24.x`
- **Root Directory**: `null` (Repository Root)
- **Build Command**: `null` (Default `vite build`)
- **Output Directory**: `null` (Default `dist`)
- **Install Command**: `null`
- **Assigned Domain**: `spear-dz-store.vercel.app` (Verified: `true`, Apex: `vercel.app`)
- **Latest Production Deployment**:
  - Deployment ID: `dpl_2JLVtrZwzDiwc1bA8P2tv1vnndfq`
  - URL: `spear-dz-store-f68wqmudb-dripfree.vercel.app`
  - State: `READY`
  - Target: `production`
  - Created At: `1791912485986`
  - Commit SHA: `4c9792acf4d91c037ddafba2c98cbabb8d9827a6`
  - Commit Message: `fix(orders): resolve COD amount formatting and duplicate orderId constraint idempotency`
- **Analytics Configuration**:
  - Web Analytics ID: `TOTvD0E6gvdGZrMoCX2dMhNrB` (Status: Enabled)
  - Speed Insights ID: `Z34CXyxdDd0zh4K4x0NZUy0T7St` (Status: Configured, `hasData: false`)
- **Local CLI Binding**: **DOES NOT MATCH** (Orphaned from local developer workflow).

---

## 4. Environment Variables Presence & Divergence Audit

*(Note: Per security guidelines, no secret values or credentials are displayed.)*

| Environment Variable Key | Codebase Usage | `speardz` (`prj_XlEo...`) | `spear-dz-store` (`prj_4B3V...`) | Status / Risk |
| :--- | :--- | :---: | :---: | :--- |
| `SUPABASE_URL` | Storage / DB Endpoint | **Configured** | **Configured** | **PASS** (Both configured) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Order Write Access | **Configured** | **Configured** | **PASS** (Both configured) |
| `SUPABASE_KEY` | Storage Adapter Fallback | **Configured** | **MISSING** | **DIVERGENCE** |
| `ADMIN_API_TOKEN` | Admin Route Protection | **Configured** | **MISSING** | **CRITICAL FAIL**: In `spear-dz-store`, auth falls back to default fallback token |
| `ECOTRACK_BASE_URL` | Courier Gateway API URL | **Configured** | **MISSING** | **DIVERGENCE**: Falls back to code default in secondary project |
| `ECOTRACK_API_TOKEN` | Courier Dispatch Gateway | **Configured** | **MISSING** | **CRITICAL FAIL**: Dispatches from `spear-dz-store` fall back to code default |
| `STORAGE_BACKEND` | Storage Provider Selector | **Configured** (`supabase`) | **MISSING** | **DIVERGENCE** |
| `DEFAULT_COURIER` | Default Courier Provider | **Configured** | **MISSING** | **DIVERGENCE**: Defaults to `'manual'` in secondary project |
| `STORE_TIMEZONE` | Algerian Timezone Formatting | **Configured** | **MISSING** | **DIVERGENCE** |
| `DEFAULT_LOCALE` | Storefront & Admin Locale | **Configured** | **MISSING** | **DIVERGENCE** |
| `NODE_ENV` | Production Execution Mode | **Configured** (`production`) | **MISSING** | **DIVERGENCE** |
| `TELEGRAM_BOT_TOKEN` | Admin Order Alerts | **Configured** | **MISSING** | **FAIL**: Telegram alerts disabled on `spear-dz-store` |
| `TELEGRAM_CHAT_ID` | Telegram Dispatch Channel | **Configured** | **MISSING** | **FAIL**: Telegram alerts disabled on `spear-dz-store` |
| `YALIDINE_API_ID` | Optional Courier Gateway | Not Configured | Not Configured | **NOT REQUIRED** (EcoTrack active) |
| `YALIDINE_API_TOKEN` | Optional Courier Gateway | Not Configured | Not Configured | **NOT REQUIRED** (EcoTrack active) |
| `META_PIXEL_ID` | Meta Conversions CAPI | Not Configured | Not Configured | **OPTIONAL** (Server logs warn safely) |
| `META_ACCESS_TOKEN` | Meta Conversions CAPI | Not Configured | Not Configured | **OPTIONAL** (Server logs warn safely) |

---

## 5. Non-Destructive Live Deployment Verification

Live requests executed against both production domains confirmed the following behaviors:

### Domain 1: `speardz-store.vercel.app` (Project: `speardz`)
- **Storefront (`GET /`)**: HTTP 200 OK (`text/html; charset=utf-8`). Full Apple Cupertino HTML loaded.
- **Admin Portal (`GET /admin`)**: HTTP 200 OK. Serves logistics admin dashboard.
- **Delivery Tariffs (`GET /api/delivery?action=tariffs`)**: HTTP 200 OK. Returns active Algerian tariffs for all 58 wilayas.
- **Order Security (`GET /api/orders`)**: HTTP 401 Unauthorized (`{"success":false,"error":"UNAUTHORIZED: Valid ADMIN_API_TOKEN is required in Authorization header"}`).
- **Static Assets (`GET /images/last-frame-16-9.jpg`, `GET /css/admin.css`)**: HTTP 200 OK. Correct MIME types and payload sizes verified.

### Domain 2: `spear-dz-store.vercel.app` (Project: `spear-dz-store`)
- **Storefront (`GET /`)**: HTTP 200 OK (`text/html; charset=utf-8`).
- **Admin Portal (`GET /admin`)**: HTTP 200 OK.
- **Delivery Tariffs (`GET /api/delivery?action=tariffs`)**: HTTP 200 OK.
- **Order Security (`GET /api/orders`)**: HTTP 401 Unauthorized.
- **Static Assets**: HTTP 200 OK.
- **Operational Vulnerability**: While both currently serve the same frontend assets, backend serverless actions executed on `spear-dz-store.vercel.app` run with missing environment variables, causing telegram alerts to fail and courier operations to run in fallback mode.

---

## 6. Analysis: Root Cause of Project Duplication

1. **Initial Creation (Timestamp 1791874515800)**:  
   `spear-dz-store` was created by importing GitHub repo `Spear-dz-store`. Vercel automatically bound subdomain `spear-dz-store.vercel.app`.
2. **Secondary Project Created (Timestamp 1791874600990 — 85 seconds later)**:  
   `speardz` was created from the same repository. Because `spear-dz-store.vercel.app` was already registered by Project 1, Vercel assigned `speardz-store.vercel.app`.
3. **Configuration Drift**:  
   Subsequent production environment configuration (EcoTrack credentials, Admin API tokens, Telegram credentials, isolated Supabase URLs) was performed exclusively on **`speardz`**.
4. **Local CLI Binding**:  
   The developer linked the local workspace to `speardz` (`prj_XlEo7880PI0zF5Shb0zjSQc3RtDR`).
5. **Continuous Deployment Duplication**:  
   Because GitHub webhook integration remained active on both projects, every Git push to `main` triggered concurrent dual builds, consuming redundant Vercel build minutes and creating confusion regarding the canonical production URL.

---

## 7. Web Analytics Audit

- **Vercel Project Settings**: Web Analytics is enabled on both projects:
  - `speardz`: Web Analytics ID `PUTpKo5M68RUDGNypUcajZmWm`
  - `spear-dz-store`: Web Analytics ID `TOTvD0E6gvdGZrMoCX2dMhNrB`
- **Application Codebase**:
  - In `spear-dz-store` deployment history, an automated branch `vercel/install-vercel-web-analytics-cfw3yp` was generated on Vercel's side but **was never merged into `main`**.
  - In the active codebase (`src/App.jsx` and `package.json`), `@vercel/analytics` is not currently installed or imported.
  - **Status**: The analytics tracking scripts are not injecting data into the Vercel Analytics dashboard. If client-side analytics is desired, `@vercel/analytics` should be added to `package.json` and mounted in `src/App.jsx`.

---

## 8. Final Canonical Production Recommendation

### Recommended Canonical Project
- **Project Name**: `speardz`
- **Project ID**: `prj_XlEo7880PI0zF5Shb0zjSQc3RtDR`
- **Team**: `dripfree` (`team_QTvZdIUT8BJL4CV3eQYCoZwR`)
- **Reasoning**:
  1. Contains the **complete, validated operational production environment**.
  2. Exactly matches the local workspace's `.vercel/project.json` binding.
  3. Houses the verified EcoTrack courier integration, Supabase isolation, and admin security tokens.
  4. Avoids any risky re-configuration of production secrets.

### Target Domain Strategy
- **Current Production Domain**: `speardz-store.vercel.app`
- **Preferred Subdomain**: `spear-dz-store.vercel.app` (currently held by the secondary project)
- **Custom Brand Domain**: `spear-dz.com` (or equivalent client domain)

---

## 9. Actionable Owner Migration Plan (Requires Owner Execution)

To complete the consolidation cleanly without store downtime:

### Step 1: Disconnect Domain from Secondary Project
In Vercel Dashboard:
1. Navigate to Project `spear-dz-store` (`prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9`) -> **Settings** -> **Domains**.
2. Remove domain `spear-dz-store.vercel.app` (or configure it to redirect).

### Step 2: Assign Domain to Canonical Project
In Vercel Dashboard:
1. Navigate to Project `speardz` (`prj_XlEo7880PI0zF5Shb0zjSQc3RtDR`) -> **Settings** -> **Domains**.
2. Add `spear-dz-store.vercel.app`.
3. (Optional) Add custom production domain `spear-dz.com`.

### Step 3: Deactivate Secondary Project Git Deployments
In Project `spear-dz-store`:
1. Go to **Settings** -> **Git**.
2. Disconnect GitHub repository `dripidin/Spear-dz-store` to prevent future redundant deployments.
3. Archive or delete project `spear-dz-store` once traffic has transitioned.

### Step 4: Verify Local CLI Binding
Confirm that `.vercel/project.json` retains:
```json
{
  "projectId": "prj_XlEo7880PI0zF5Shb0zjSQc3RtDR",
  "orgId": "team_QTvZdIUT8BJL4CV3eQYCoZwR",
  "projectName": "speardz"
}
```
No local binding changes are necessary.
