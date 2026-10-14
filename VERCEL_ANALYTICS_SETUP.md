# SPEAR-DZ — Vercel Web Analytics Setup & Operational Guide

**Repository Root**: `D:/Websites On Line/Spear-dz`  
**Canonical Project**: `spear.dz`  
**Project ID**: `prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9`  
**Team ID**: `team_QTvZdIUT8BJL4CV3eQYCoZwR` (`dripfree`)  
**Canonical Production URL**: `https://speardz.vercel.app/`  

---

## 1. Architecture Overview

Vercel Web Analytics in SPEAR-DZ is structured into two completely independent layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER-FACING STOREFRONT                   │
│                (React 19 / Vite / Tailwind CSS v4)              │
│                                                                 │
│   src/main.jsx ──> <Analytics /> component                      │
│   • Automatically collects privacy-friendly page views & visits │
│   • Runs on edge CDN; requires Web Analytics enabled on Vercel │
│   • Zero dependency on server API credentials                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   ADMINISTRATIVE DASHBOARD API                  │
│                     (Vercel Serverless Function)                │
│                                                                 │
│   admin.html ──> public/js/admin-client.js                      │
│                    │                                            │
│                    ▼ (Bearer Admin Auth)                        │
│   api/admin/website-analytics.js                                │
│                    │                                            │
│                    ▼ (lib/vercelAnalytics.js)                   │
│   https://api.vercel.com/v1/query/web-analytics/*               │
│   • Requires VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID    │
│   • Fails safely (HTTP 503 ANALYTICS_NOT_CONFIGURED) if missing │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Environment Configuration

The following variables must be configured in Vercel Project Settings (`https://vercel.com/dripfree/spear.dz/settings/environment-variables`):

| Variable | Required Scope | Example / Canonical Value | Purpose |
|---|---|---|---|
| `VERCEL_TOKEN` | Production, Preview | `vck_...` (secret) | Read-only access token for querying Web Analytics API |
| `VERCEL_PROJECT_ID` | Production, Preview | `prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9` | Identifies canonical project `spear.dz` |
| `VERCEL_TEAM_ID` | Production, Preview | `team_QTvZdIUT8BJL4CV3eQYCoZwR` | Identifies team `dripfree` |

> [!IMPORTANT]
> Keep `VERCEL_TOKEN` strictly server-side. It is never prefixed with `VITE_` and never included in client bundles.

---

## 3. How to Enable Web Analytics on Vercel Dashboard

1. Navigate to: `https://vercel.com/dripfree/spear.dz/analytics`
2. Click **Enable Web Analytics**.
3. Select the deployment branch (`main` / production).
4. Web Analytics is now active on the Vercel infrastructure.

---

## 4. How to Generate Read-Only Vercel Token

1. Go to **Account Settings** > **Tokens**: `https://vercel.com/account/tokens`
2. Click **Create Token**.
3. Name: `spear-dz-analytics-read`
4. Scope: Restrict to Team `dripfree` with **Analytics: Read** permission.
5. Expiration: Choose desired operational lifetime (e.g., 1 year).
6. Copy the token and add it to `spear.dz` project environment variables as `VERCEL_TOKEN`.

---

## 5. Status Table

| Item | Component | Status | Notes |
|---|---|---|---|
| NPM Dependency (`@vercel/analytics`) | Storefront Bundle | **PASS** | Installed v2.0.1, fully compatible with React 19 |
| `<Analytics />` Mount | `src/main.jsx` | **PASS** | Mounted once inside root StrictMode wrapper |
| Server-Side Client | `lib/vercelAnalytics.js` | **PASS** | Validates config at runtime; does not throw at module import |
| Protected API Endpoint | `api/admin/website-analytics.js` | **PASS** | Enforces admin auth, GET method, and `Cache-Control: private, no-store` |
| Admin Dashboard UI | `admin.html` & `public/js/admin-client.js` | **PASS** | 7/30 days period selector, dynamic status badge, 503 notice |
| Local Test Suite | `tests/websiteAnalytics.test.js` | **PASS** | 147 tests pass (unit, endpoint, auth, and build verification) |
| Production `VERCEL_TOKEN` | Vercel Environment | **BLOCKED** | Requires owner to create token and inject into Vercel settings |
| Production Live Verification | `https://speardz.vercel.app/` | **BLOCKED** | Pending owner authorization for production deployment |
| Custom Events (`track()`) | Storefront Analytics | **NOT TESTED** | Pro/Enterprise capability; deferred per project specification |
