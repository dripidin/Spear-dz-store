# Findings & Technical Discoveries: SPEAR-DZ Admin Dashboard

## 1. Problem Statement: Persistent Admin Login Popup
- **Symptom:** Entering the correct password (`L3abedstore2026`) causes the admin login modal to reappear repeatedly instead of unlocking the dashboard and staying open.
- **Root Cause Confirmed:**
  1. In `api/admin/auth.js`, successful login generated an ephemeral session token: `sessionToken = 'spdz_sess_' + crypto.randomBytes(32)...` and stored it in a local Node.js `Map` (`activeSessions`).
  2. On Vercel, every API route (`/api/orders`, `/api/admin/analytics`, etc.) executes in an independent, stateless serverless container with separate memory.
  3. The client saved `spdz_sess_...` and immediately called `fetchOrders()` -> `GET /api/orders` with `Authorization: Bearer spdz_sess_...`.
  4. In `api/orders.js`, `authenticateAdmin(req)` checked `isValidAdminSession(token)`. Because `activeSessions` was in a separate lambda's memory, it was empty, returning `false`.
  5. The token did not match `ADMIN_API_TOKEN` (`L3abedstore2026`) because it was a random session token.
  6. `/api/orders` responded with `401 Unauthorized`.
  7. In `admin-client.js`:
     ```javascript
     if (res.status === 401) {
         sessionStorage.removeItem('spdz_admin_token');
         adminToken = '';
         showAuthOverlay();
         throw new Error('Session expirée');
     }
     ```
  8. This immediately erased the token and re-opened the login modal (`showAuthOverlay()`), creating the perpetual login loop.

## 2. Stateless Auth Architecture (The YamahaSac Solution)
1. **Stateless Master Token Return:**
   - In `api/admin/auth.js` and `/api/auth.js`: When the password is verified against `process.env.ADMIN_API_TOKEN || process.env.ADMIN_PASSWORD || 'L3abedstore2026'`, the API returns:
     ```json
     {
       "success": true,
       "token": configuredToken,
       "sessionToken": configuredToken
     }
     ```
2. **Client-Side Persistence:**
   - The client stores this token in both `localStorage.setItem('spdz_admin_token', token)` and `sessionStorage.setItem('spdz_admin_token', token)`.
   - On page load, `initAuthCheck` checks for the token; if present, it immediately suppresses the login modal and loads dashboard data.
3. **Stateless Backend Verification:**
   - Every admin API endpoint (`/api/orders`, `/api/delivery`, `/api/admin/*`) checks the token with constant-time equality `timingSafeCompare(token, configuredToken)` in `lib/security.js`.
   - Because it compares against the environment variable (`ADMIN_API_TOKEN` / `ADMIN_PASSWORD`), verification succeeds instantly across ALL serverless instances and edge regions without needing shared memory or Redis.

## 3. yamahasac Admin Frontend Architecture
- Source Reference: `d:/Websites On Line/Spear-dz/reference-yamahasac/`
  - `admin.html`: Complete structure with top navbar, quick store navigation pills, courier status, Supabase sync pill, refresh button, language dropdown, user badge, blurry mobile fullscreen drawer, sidebar tabs, hero banner, KPI cards, charts (Trend + Wilayas), orders table with filters, and 6 modal dialogs.
  - `admin.css`: 2078 lines of clean, light-themed CSS (`#f8fafc` canvas, `#ffffff` cards, `#4f46e5` primary indigo) with full responsive breakpoints (1024px, 768px, 480px) and A6 thermal shipping label print styles.
  - `admin.js`: 1697 lines containing the complete bilingual dictionary (FR / AR), chart initialization (Chart.js), real-time order filtering, courier parcel creation (Redex / Ecotrack DZ, Yalidine), tracking timelines, and printable bordereaux.

## 4. Adaptation Strategy for SPEAR-DZ
- Preserve SPEAR-DZ offer: **PACK HIGH-TECH 5 EN 1** (21,900 DZD).
- Preserve Supabase PostgreSQL persistence (`frntoqozeevxhntenmgz`) and live Telegram alerts.
- Support both endpoint patterns: `/api/delivery?action=...` and `/api/orders` + `/api/admin/*`.
