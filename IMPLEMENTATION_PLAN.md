# 📋 Master Implementation Plan: Algerian High-Tech E-Commerce Store
## Spear-dz (PACK HIGH-TECH 5 EN 1)

**Project Target:** `D:\Websites On Line\Spear-dz`  
**Store Name:** Spear-dz / High-Tech Store  
**Lead Offer:** `PACK HIGH-TECH 5 EN 1` (Display Price: `21,900 DZD`)  
**Production Database:** Supabase PostgreSQL (`STORAGE_BACKEND=supabase`) — Singular Source of Truth  
**Design Engine:** Stitch MCP (`Spear Cyber-Luxury` Design System, Project `8749809693055874863`)  
**Frontend Framework:** React 19 + Vite 8 + Tailwind CSS (Bilingual Arabic RTL / French LTR)  
**Video Experience:** `ProductDemoVideo` with native final-frame canvas freeze & HTTP 206 streaming  

---

## 1. System Architecture & Database Design

### Primary Database: Supabase PostgreSQL
- **Backend Configuration:** `STORAGE_BACKEND=supabase` strictly configured as the production persistence provider.
- **Fail-Loud Guarantee:** If Supabase credentials are missing or the database is unreachable, the system immediately returns an explicit operational error. It **never** falls back silently to Google Sheets or mock storage.
- **Server-Side Authorization:** The `SUPABASE_SERVICE_ROLE_KEY` is restricted strictly to serverless backend handlers (`/api/send-order`, `/api/orders`, `/api/risk`). It is never exposed in client bundles, HTML, or Vite variables.
- **Row Level Security (RLS):** Enabled across all 8 production tables (`orders`, `order_items`, `customers`, `products`, `inventory`, `risk_events`, `watchlist`, `audit_logs`). Anonymous clients are permitted strictly to insert new checkout orders, with reading and updating restricted to authenticated administrators.
- **Price Snapshotting:** Orders preserve historical snapshots (`unit_price`, `quantity`, `shipping_fee`, `total_price`) ensuring future product catalog adjustments never alter historical orders.

---

## 2. Stitch MCP Design Integration

Stitch MCP tools were executed via `call_mcp_tool` (`ServerName: "StitchMCP"`):

1. **Project Created:** `projects/8749809693055874863` (`Spear-dz High-Tech 5-in-1 Store`).
2. **Design System:** `Spear Cyber-Luxury` (`assets/71b4b75877c2445cb44cdbf1b3b32f6b`).
3. **Desktop Screen:** Generated via `generate_screen_from_text` using Gemini Flash-Lite. Screenshot: `projects/8749809693055874863/files/f83746fdcf1547b08b7ee38f99576a17`.
4. **Mobile Screen:** Generated via `generate_screen_from_text`. Screen ID: `96e3a40814a441ad91e14a6a3f32baec`. Screenshot: `projects/8749809693055874863/files/f5739589d9ef4f58b9dec87be74362bc`.
5. **Design Tokens Extracted:**
   - Canvas: Obsidian `#0a0a0c` / `#131315`
   - Electric Primary: Neon Cyan `#00f2fe`
   - Conversion Urgency: Amber Gold `#f59e0b`
   - Trust & Verification: Emerald `#10b981`
   - Typography: `Outfit` (Headings), `Plus Jakarta Sans` (Body), `JetBrains Mono` (Telemetry & Prices)
   - Glassmorphic panels with 1px laser borders and directional luminescence.

Full documentation in [STITCH_HANDOFF.md](file:///d:/Websites%20On%20Line/Spear-dz/STITCH_HANDOFF.md).

---

## 3. Frontend Architecture (React 19 + Vite + Tailwind CSS)

The storefront is fully migrated to a modern React component hierarchy:
- `src/App.jsx`: Root orchestrator with dynamic RTL (Arabic) / LTR (French) switching.
- `src/components/Header.jsx`: Sticky glassmorphic navigation with language toggle and direct order CTA.
- `src/components/Hero.jsx`: High-impact value proposition, 21,900 DZD offer badge (-26%), live stock counter, and embedded video demonstration.
- `src/components/ProductDemoVideo.jsx`: 16:9 demonstration video player that catches native `onEnded`, freezes the exact final frame to an aligned canvas, and maintains container geometry without disappearing or looping.
- `src/components/TrustBadges.jsx`: 58 Wilayas express delivery, Cash on Delivery verification, 12-month warranty, and 7/7 customer support.
- `src/components/BundleBreakdown.jsx`: Interactive grid detailing the 5 included devices with specs, values, and total savings calculation.
- `src/components/OrderForm.jsx`: High-converting COD checkout with 58 Wilayas dropdown, Algerian phone regex feedback, live price calculation, honeypot anti-bot shield, and direct submission to `/api/send-order`.
- `src/components/ConfirmationModal.jsx`: Order receipt modal with order ID, customer details, and delivery instructions.
- `src/components/StickyMobileBar.jsx`: Mobile persistent action bar with promotional price and instant COD purchase trigger.

---

## 4. Persistent Final Video Frame (`ProductDemoVideo`)

- **Asset Path:** Configurable at `/videos/pack-high-tech-demo.mp4` (streamed with HTTP 206 Partial Content byte ranges).
- **Poster Fallback:** `/images/pack-high-tech-poster.jpg`.
- **Freeze-on-Last-Frame Mechanism:**
  1. Catches native `ended` event on HTML5 video element.
  2. Pauses playback at final timecode (without resetting `currentTime` to 0).
  3. Renders final frame to `<canvas>` matching intrinsic video dimensions (`videoWidth`, `videoHeight`).
  4. Keeps container wrapper mounted, preserving 16:9 aspect ratio and position with zero layout shift.
  5. Displays prominent "Revoir la démonstration" button to allow user-initiated replay.

---

## 5. Security & Verification Status

- **Zero Hardcoded Secrets:** No API keys, database credentials, or admin tokens in client code or Git repository.
- **Live Supabase Persistence:** Verified end-to-end against live database `https://olmsjkhdfghyydogcvvy.supabase.co`. Orders `TEST-SPDZ-1791861532395`, `SPDZ-602278-186`, and `SPDZ-629041-543` successfully stored with items and retrieved.
- **Anti-Fraud Risk Engine:** Honeypot field detection, submission speed scoring, Algerian mobile normalizer, SHA-256 IP hashing, constant-time `ADMIN_API_TOKEN` comparison.
- **Automated Test Results:** **38 tests passing across 8 suites** (`npm test`).
