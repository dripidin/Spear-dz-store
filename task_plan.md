# Task Plan: SPEAR-DZ Admin Dashboard Login Fix & YamahaSac Frontend Redesign

## Goal
Fix the persistent login popup issue on the SPEAR-DZ admin dashboard, adopt the proven, premium admin frontend architecture, styles, and components from `yamahasac` (`admin.html`, `admin.css`, `admin.js`), and deploy and verify the solution in production.

## Current Phase
Phase 3: Implementation of yamahasac Admin Frontend & Auth

## Phases

### Phase 1: Diagnosis & yamahasac Asset Analysis
- [x] Reproduce and identify the root cause of the persistent admin login popup in Spear-dz.
- [x] Analyze `d:\Websites On Line\yamahasac\admin.html`, `admin.css`, `admin.js` to extract its design system, auth flow, components, and layout.
- [x] Document findings in `findings.md`.
- **Status:** completed

### Phase 2: Design Synthesis & Auth Architecture
- [x] Synthesize semantic design system (following `/design-md` and `/frontend-design`) in `DESIGN.md`.
- [x] Design seamless stateless authentication state handling (master token return, persistent storage in localStorage/sessionStorage, constant-time compare in lambdas).
- [x] Update `task_plan.md` and `findings.md`.
- **Status:** completed

### Phase 3: Implementation of yamahasac Admin Frontend & Auth
- [ ] Implement stateless auth in `api/admin/auth.js` and create `/api/auth.js` endpoint.
- [ ] Ensure `lib/security.js` validates `ADMIN_API_TOKEN` / `ADMIN_PASSWORD` reliably across serverless lambdas.
- [ ] Adapt `api/delivery.js` to handle `action === 'get_all_orders' || 'login' || 'analytics' || 'create' || 'delete' || 'tariffs'` seamlessly alongside `/api/orders`.
- [ ] Adapt `admin.html` with yamahasac layout, top navbar, mobile fullscreen overlay, sidebar, KPI cards, charts, and 6 modals, branded as SPEAR-DZ.
- [ ] Integrate `yamahasac/admin.css` design system into `public/css/admin.css`.
- [ ] Adapt `admin.js` into `public/js/admin-client.js` with bilingual support, stateless token persistence, and modal interactions.
- [ ] Copy `algeria-communes.js` to `public/js/algeria-communes.js` and link in `admin.html`.
- **Status:** in_progress

### Phase 4: Local Testing & Validation
- [ ] Test admin authentication locally (`http://localhost:3000/admin` with password `L3abedstore2026`).
- [ ] Verify login modal unlocks cleanly without reappearing.
- [ ] Verify tab navigation, order filtering, and modal dialogs.
- [ ] Run automated tests (`node --test tests/**/*.test.js`).
- **Status:** pending

### Phase 5: Production Deployment & Verification
- [ ] Run Vite production build (`npx vite build`) to generate `dist/admin.html` and assets.
- [ ] Deploy to Vercel production (`npx vercel --prod --yes`).
- [ ] Verify live site on `https://speardz-store.vercel.app/admin`.
- [ ] Complete goal and emit `<!-- GOAL_COMPLETE -->`.
- **Status:** pending

## Decisions & Rationale
- *Stateless Master Token:* Returning `configuredToken` from `/api/admin/auth` and `/api/auth` ensures all serverless edge functions can authenticate requests without needing cross-container shared memory.
- *Dual Storage:* Client uses `localStorage` (`spdz_admin_token`) and `sessionStorage` (`orva_admin_token`, `orva_admin_logged`, `spdz_admin_token`) so that refreshes and new tabs stay authenticated.
- *Preserve Supabase & API Contracts:* The backend APIs (`/api/orders`, `/api/delivery`, `/api/send-order`) and Supabase PostgreSQL persistence remain 100% intact.

## Errors Encountered & Fixed
| Error | Attempt | Resolution |
|-------|---------|------------|
| Admin login popup keeps re-appearing | 1 | Traced to in-memory session token loss across serverless containers; fixed by returning configured master token statelessly. |
