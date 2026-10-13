# SECURITY FAIL-CLOSED HOTFIX REPORT — SPEAR-DZ
**Project Workspace**: `D:\Websites On Line\Spear-dz`  
**Execution Date**: October 13, 2026  
**Auditor / Security Engineer**: Antigravity Full-Stack Security Auditor  
**Phase**: PHASE 4A — Critical Security Fail-Closed Remediation  

---

## 1. Executive Summary

During the Phase 4 audit, a critical security vulnerability was identified: when optional or secondary deployments lacked environment variables such as `ADMIN_API_TOKEN` or `ECOTRACK_API_TOKEN`, the application fell back to hardcoded default strings and credentials embedded in the code (e.g. `'L3abedstore2026'` and a static EcoTrack bearer token).

Under Phase 4A, **all hardcoded credential fallbacks have been eradicated from the codebase**. The application now strictly enforces **fail-closed security architecture**:
1. If `ADMIN_API_TOKEN` is missing from the server environment, all administrative routes fail closed immediately with an explicit 500 configuration error or 401 unauthorized. No default token is ever accepted.
2. If `ECOTRACK_API_TOKEN` is missing, carrier parcel creation is rejected with an explicit 422 `MISSING_CREDENTIALS` error. No synthetic tracking or unauthorized carrier dispatch can occur.
3. Legacy delivery endpoints (`/api/delivery?action=get_all_orders`, `delete`, and `test_courier`) that previously lacked authorization checks now strictly mandate `authenticateAdmin(req)`.
4. Hardcoded Telegram bot credentials have been removed. If `TELEGRAM_BOT_TOKEN` is absent, notifications are gracefully skipped without crashing or masking customer order creation.
5. All 123 tests across 30 test suites pass cleanly, proving fail-closed behaviors under all simulated outage scenarios.

---

## 2. Insecure Fallback Remediations & Code Changes

### A. Admin Authentication Architecture (`lib/security.js`)
- **Vulnerability**: `const configuredToken = (process.env.ADMIN_API_TOKEN || process.env.ADMIN_PASSWORD || 'L3abedstore2026').trim();` permitted access using a hardcoded default password whenever the environment variable was omitted.
- **Hotfix**:
  - Removed `'L3abedstore2026'`.
  - Added an explicit **Fail-Closed Guard**:
    ```javascript
    const configuredToken = (process.env.ADMIN_API_TOKEN || process.env.ADMIN_PASSWORD || '').trim();
    if (!configuredToken) {
        console.error('[Security Fail-Closed] ADMIN_API_TOKEN is not configured on this server. Access denied.');
        return false;
    }
    ```
  - Direct master token matching and session verification only execute if `configuredToken` exists.

### B. Admin Session & Auth Gateways (`api/admin/auth.js` & `api/auth.js`)
- **Vulnerability**: Both endpoints accepted the fallback password and returned authenticated tokens when `process.env.ADMIN_API_TOKEN` was absent.
- **Hotfix**:
  - Removed fallback tokens.
  - Returns HTTP 500 with explicit error `ADMIN_AUTH_MISCONFIGURED: ADMIN_API_TOKEN is not configured on this server`.
  - Blocks any login attempt on improperly configured environments.

### C. Legacy Delivery Action Security (`api/delivery.js`)
- **Vulnerability**:
  - Actions `get_all_orders`, `orders`, and `delete` did not verify admin authentication headers.
  - Action `login` / `auth` used the fallback token `'L3abedstore2026'`.
- **Hotfix**:
  - Added `if (!authenticateAdmin(req))` guards on `get_all_orders`, `orders`, `delete`, and `test_courier`. Unauthenticated requests return HTTP 401 Unauthorized.
  - Secured `login` action to fail closed with HTTP 500 if `ADMIN_API_TOKEN` is missing.

### D. EcoTrack Courier Gateway (`lib/delivery/ecotrackCourier.js`)
- **Vulnerability**: Constructor defaulted `this.token` to a static hardcoded token string, causing `isConfigured()` to return `true` even on unconfigured projects.
- **Hotfix**:
  - Removed hardcoded static token.
  - Constructor strictly binds `this.token = (process.env.ECOTRACK_API_TOKEN || '').trim()`.
  - When absent, `isConfigured()` returns `false`, preventing false-positive courier initialization and blocking any live parcel creation with an explicit configuration error.

### E. Telegram Notifications (`lib/telegram.js`)
- **Vulnerability**: Hardcoded `DEFAULT_BOT_TOKEN` and `DEFAULT_CHAT_ID` were embedded in the file.
- **Hotfix**:
  - Eradicated hardcoded tokens.
  - When `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is not set, returns `{ success: false, skipped: true, reason: 'Telegram bot credentials not configured' }`.
  - Does not throw or interfere with customer order persistence.

---

## 3. Environment Variables Audit: Required vs. Optional

| Environment Variable | Status | Consuming Module | Failure Mode / Behavior |
| :--- | :---: | :--- | :--- |
| **`SUPABASE_URL`** | **MANDATORY** | `lib/storage/supabaseStorage.js` | Throws critical operational error. Never falls back silently. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **MANDATORY** | `lib/storage/supabaseStorage.js` | Throws critical operational error. Required for order persistence. |
| **`ADMIN_API_TOKEN`** | **MANDATORY** | `lib/security.js`, `api/admin/*` | **Fails closed**: Rejects all admin requests with 500/401. |
| **`STORAGE_BACKEND`** | **MANDATORY** | `lib/storage/index.js` | Resolves to `'supabase'` in production. Rejects memory mocks in prod. |
| **`ECOTRACK_API_TOKEN`** | **MANDATORY** (for Carrier) | `lib/delivery/ecotrackCourier.js` | Dispatches fail with 422 `MISSING_CREDENTIALS`. |
| **`ECOTRACK_BASE_URL`** | Recommended | `lib/delivery/ecotrackCourier.js` | Defaults safely to official `https://redex.ecotrack.dz`. |
| **`DEFAULT_COURIER`** | Recommended | `lib/delivery/index.js` | Defaults to `'manual'` if unspecified. |
| **`STORE_TIMEZONE`** | Recommended | `lib/telegram.js` | Defaults to `'Africa/Algiers'`. |
| **`DEFAULT_LOCALE`** | Recommended | `src/App.jsx` | Defaults to `'ar'` (Arabic). |
| **`TELEGRAM_BOT_TOKEN`** | Optional | `lib/telegram.js` | Skips notification gracefully if missing. |
| **`TELEGRAM_CHAT_ID`** | Optional | `lib/telegram.js` | Skips notification gracefully if missing. |
| **`META_PIXEL_ID`** | Optional / Marketing | `lib/metaCAPI.js` | Skips Meta CAPI tracking gracefully if missing. |
| **`META_ACCESS_TOKEN`** | Optional / Marketing | `lib/metaCAPI.js` | Skips Meta CAPI tracking gracefully if missing. |
| **`YALIDINE_API_ID`** | Optional / Secondary | `lib/delivery/yalidineCourier.js` | Only checked if Yalidine is explicitly selected. |
| **`YALIDINE_API_TOKEN`** | Optional / Secondary | `lib/delivery/yalidineCourier.js` | Only checked if Yalidine is explicitly selected. |

---

## 4. Security Regression Test Suite Results

A dedicated automated test suite was constructed in [tests/securityFailClosed.test.js](file:///d:/Websites%20On%20Line/Spear-dz/tests/securityFailClosed.test.js) and executed as part of `npm test`:

```text
▶ PHASE 4A: Security Fail-Closed Regression Suite
  ✔ 1. Missing ADMIN_API_TOKEN fails closed in lib/security (never accepts L3abedstore2026) (10.56ms)
  ✔ 2. Missing ADMIN_API_TOKEN in api/admin/auth returns 500 configuration error (2.36ms)
  ✔ 3. Missing ADMIN_API_TOKEN in api/auth returns 500 configuration error (1.74ms)
  ✔ 4. Configured ADMIN_API_TOKEN rejects invalid credentials and accepts valid token (6.78ms)
  ✔ 5. Unauthenticated requests to legacy delivery endpoints are blocked (401) (3.54ms)
  ✔ 6. Missing ECOTRACK_API_TOKEN fails closed (never produces real dispatch) (1.02ms)
  ✔ 7. Missing Telegram bot credentials safely skips notification without throwing (1.02ms)
  ✔ 8. Manual dispatch is explicitly distinct and marked isManual: true (68.67ms)
  ✔ 9. No production secrets or service role keys leaked in public client assets (1.76ms)
✔ PHASE 4A: Security Fail-Closed Regression Suite (101.40ms)

Total Test Suite Summary:
ℹ tests 123
ℹ suites 30
ℹ pass 123
ℹ fail 0
```

---

## 5. Security Posture Assessment

- **Before Hotfix**: An unconfigured deployment (such as `spear-dz-store.vercel.app`) exposed an administrative back-door via the default password `'L3abedstore2026'`, could attempt courier dispatches using a shared hardcoded token, allowed unauthenticated order deletions via `/api/delivery?action=delete`, and sent telegram notifications using a hardcoded bot.
- **After Hotfix**: Any environment missing production variables strictly fails closed. Administrative access is completely denied, order data cannot be queried without valid authentication, carrier dispatches require real verified credentials, and client assets are verified clean of all secrets.
