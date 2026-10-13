# 🚀 Production Deployment & Operations Guide: Spear-dz

**Store Name:** Spear-dz / High-Tech Store  
**Primary Offer:** `PACK HIGH-TECH 5 EN 1` (21,900 DZD)  
**Target Environment:** Node.js 18+ (tested on Node v24.20.0), Vercel Serverless Architecture  

---

## 1. Quick Local Development Startup

### Prerequisites
- Node.js >= 18.0.0 (`node -v`)
- npm >= 9.0.0 (On Windows PowerShell, use `npm.cmd` if script execution policies apply)

### Installation & Launch
```bash
# 1. Navigate to store directory
cd "d:\Websites On Line\Spear-dz"

# 2. Install dependencies (including react, @supabase/supabase-js, googleapis, dotenv)
npm.cmd install

# 3. Create local environment file
copy .env.example .env.local

# 4. Run automated test suite (28 tests across 6 test suites)
npm.cmd test

# 5. Start development server
node dev-server.js
```
The store is live at:
- **Public Storefront:** `http://localhost:3000/`
- **Admin Dashboard:** `http://localhost:3000/admin`
- **Health Endpoint:** `http://localhost:3000/api/risk?action=health`

---

## 2. Data Storage Configuration

The system uses a pluggable storage provider abstraction controlled by the `STORAGE_BACKEND` environment variable.

### Option A: Google Sheets (Default Production Target for Low-Cost Store)
1. In Google Cloud Console, enable **Google Sheets API v4**.
2. Create a **Service Account** and generate a JSON key.
3. Create a Google Spreadsheet and create the following 4 tabs:
   - `Orders`
   - `Customers`
   - `RiskEvents`
   - `Watchlist`
4. Share the spreadsheet with the Service Account email address giving **Editor** permission.
5. In your `.env.local` or hosting provider settings, configure:
   ```env
   STORAGE_BACKEND=google_sheets
   GOOGLE_PROJECT_ID=your-gcp-project-id
   GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=your-spreadsheet-id
   GOOGLE_SHEET_TAB_ORDERS=Orders
   GOOGLE_SHEET_TAB_CUSTOMERS=Customers
   GOOGLE_SHEET_TAB_RISK=RiskEvents
   GOOGLE_SHEET_TAB_WATCHLIST=Watchlist
   ```

### Option B: Supabase PostgreSQL (Optional SQL Backend)
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Configure:
   ```env
   STORAGE_BACKEND=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Option C: Memory Mock (Local Testing & Sandbox)
```env
STORAGE_BACKEND=memory_mock
```
Ideal for offline development and test automation without requiring any external cloud credentials.

---

## 3. Administrative Dashboard Access

1. Choose a strong random token (32+ characters) for `ADMIN_API_TOKEN` in `.env.local`:
   ```env
   ADMIN_API_TOKEN=your-random-strong-admin-token-here
   ```
2. Navigate to `http://localhost:3000/admin`.
3. When prompted, enter your `ADMIN_API_TOKEN`. It is securely saved in `sessionStorage` and sent as a Bearer token in the `Authorization` header.
4. If unauthorized, all administrative endpoints (`/api/orders`, `/api/delivery?action=ship`, etc.) immediately reject requests with HTTP 401.

---

## 4. Courier Integration Setup

The delivery engine supports multiple Algerian couriers via `lib/delivery/`:

1. **Manual / Direct Delivery (`manual`):**
   - Active by default.
   - Requires zero external API credentials.
   - Automatically generates tracking code `SPDZ-YYYYMMDD-XXXX` and printable parcel labels.

2. **Redex / Ecotrack DZ (`redex`):**
   ```env
   DEFAULT_COURIER=redex
   ECOTRACK_API_TOKEN=your-ecotrack-token
   ECOTRACK_BASE_URL=https://redex.ecotrack.dz
   ```

3. **Yalidine Express (`yalidine`):**
   ```env
   DEFAULT_COURIER=yalidine
   YALIDINE_API_ID=your-yalidine-api-id
   YALIDINE_API_TOKEN=your-yalidine-api-token
   YALIDINE_FROM_WILAYA=16
   ```

---

## 5. Meta Pixel & Server-Side Conversions API (CAPI)

1. Set your Meta Pixel ID and Conversions API Token in environment variables:
   ```env
   META_PIXEL_ID=your-meta-pixel-id
   META_ACCESS_TOKEN=your-meta-capi-access-token
   # Optional: Test event code for testing in Meta Events Manager
   META_TEST_EVENT_CODE=TEST12345
   ```
2. **Deduplication:** When an order is placed:
   - The browser Pixel fires `Purchase` with `{ eventID: orderId }`.
   - The server CAPI fires `Purchase` with the identical `event_id: orderId` and SHA-256 hashed customer phone (`213...`), full name, and wilaya.
   - Meta automatically deduplicates the two events into one verified conversion.

---

## 6. Vercel Production Deployment

1. Install Vercel CLI (or deploy via GitHub repo connection):
   ```bash
   npm.cmd install -g vercel
   vercel
   ```
2. Add your environment variables in Vercel Project Dashboard > Settings > Environment Variables:
   - `ADMIN_API_TOKEN`
   - `STORAGE_BACKEND`
   - `GOOGLE_SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (or Supabase keys)
   - `META_PIXEL_ID`, `META_ACCESS_TOKEN`
   - `ALLOWED_ORIGINS` (e.g. `https://spear-dz.com`)
3. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 7. Security & Key Rotation Procedures

1. **Never commit `.env.local` or Service Account JSON files.** Strict `.gitignore` rules prevent this.
2. If any credential is suspected of exposure:
   - **Google Cloud:** Revoke the service account key in IAM & Admin > Service Accounts > Keys, generate a replacement, and update `GOOGLE_PRIVATE_KEY`.
   - **Meta:** Regenerate access token in Meta Events Manager > Settings > Conversions API.
   - **Couriers:** Reset API token in the carrier portal.
   - **Admin:** Update `ADMIN_API_TOKEN` immediately.

---

## 8. Verification & Acceptance Smoke Tests

Run smoke tests after deployment:
1. Load storefront (`/`) and check that:
   - Header, 5 products, and bundle price (21,900 DZD) render correctly.
   - Selecting Wilaya (e.g. 16 - Alger) populates communes and updates delivery fee.
2. Submit a test order:
   - Verify that order status returns 200 with generated Order ID.
   - Verify that client price manipulation is ignored (server calculates price).
3. Access `/admin`:
   - Enter `ADMIN_API_TOKEN`.
   - Verify that the test order appears in the list.
   - Click "إرسال للشحن 🚚" to dispatch and check tracking reference generation.
   - Click "طباعة البوليصة 🖨️" to verify printable label data.
