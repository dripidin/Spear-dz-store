# Design System: SPEAR-DZ Enterprise Admin & Logistics Hub
**Project ID:** spear-dz-admin-v2
**Reference Anchor:** `yamahasac` Enterprise Light Logistics Controller

---

## 1. Visual Theme & Atmosphere
The SPEAR-DZ Admin Hub adopts a high-craft, precision **SaaS Utilitarian & Modern Clean** aesthetic (inspired by modern European and Japanese logistics command centers). It features:
* **Atmosphere:** Clean, airy, highly structured, crisp contrast, whisper-soft diffused shadows, and rapid optical clarity for high-volume Algerian COD fulfillment.
* **Mood:** Trustworthy, efficient, executive, zero decorative clutter.
* **Tone:** Industrial Utilitarian with refined executive polish.
* **DFII Score:** **13 / 15** (Impact: 4, Fit: 5, Feasibility: 4, Performance: 4, Consistency Risk: 1).

---

## 2. Color Palette & Roles
All colors are strictly managed through semantic CSS custom properties:

* **Canvas Background (`--bg-app: #f8fafc`):** Very soft slate-tinted white canvas creating crisp contrast against pure white cards.
* **Surface Background (`--bg-card: #ffffff`):** Pure white for cards, tables, modals, and navigation bars.
* **Hover Surface (`--bg-card-hover: #f1f5f9`):** Subtle slate tint for table row and button hover states.
* **Primary Indigo (`--primary: #4f46e5`):** Deep executive indigo used for primary actions, active navigation tabs, brand accents, and key interactive controls.
* **Primary Deep Indigo (`--primary-hover: #4338ca`):** Darker indigo for button active/hover feedback.
* **Primary Tint (`--primary-light: #eef2ff`):** Soft indigo tint for active pill badges, selection highlights, and subtle focus rings.
* **Cyan Delivery (`--cyan: #0891b2` / `--cyan-light: #ecfeff`):** Used for carrier tracking, shipped shipments, and edge telemetry.
* **Emerald Success (`--emerald: #059669` / `--emerald-light: #ecfdf5`):** Used for delivered status, positive revenue KPIs, database live sync indicators, and Excel exports.
* **Amber Pending (`--amber: #d97706` / `--amber-light: #fffbeb`):** Used for pending / to-ship orders, warning indicators, and wilayas tariffs.
* **Rose Hazard (`--rose: #e11d48` / `--rose-light: #fff1f2`):** Used for returned parcels, fraud/risk shields, critical alerts, and destructive actions.
* **Purple Settings (`--purple: #7c3aed` / `--purple-light: #f5f3ff`):** Used for courier platform configurations and gateway parameters.
* **High-Contrast Text Hierarchy:**
  * Primary Text (`--text-primary: #0f172a`): High-legibility deep slate.
  * Secondary Text (`--text-secondary: #334155`): Neutral charcoal for secondary titles.
  * Muted Text (`--text-muted: #64748b`): Slate gray for labels, timestamps, and placeholders.
  * Dim Text (`--text-dim: #94a3b8`): Subtle icons and inactive elements.
* **Hairline Borders (`--border-color: #e2e8f0`, `--border-hover: #cbd5e1`):** 1px crisp borders delineating cards, inputs, and table headers.

---

## 3. Typography Rules
* **Western/Global Typography:** `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Clean geometric sans with open apertures for maximum legibility at small sizes.
* **Arabic Typography (RTL):** `'Cairo', 'Segoe UI', Tahoma, sans-serif`. High-impact, modern Arabic typeface with distinct letterforms, optimal weights (600, 700, 800) for fast reading under high operational pressure.
* **Monospace Data Elements:** `'JetBrains Mono', monospace`. Used for order tracking IDs (`ECEOSK...`), phone numbers, SKU references, and currency figures.

---

## 4. Component Stylings
* **Authentication Gate (`.admin-auth-overlay`):** Fullscreen glassmorphic overlay (`rgba(15, 23, 42, 0.6)` with 8px backdrop blur) centered on a floating card (`border-radius: 20px`, `--shadow-lg`, clean shield icon badge).
* **Top Navbar (`.app-navbar`):** Sticky 64px header, white surface with `--shadow-sm`, hosting brand badge, quick store navigation pills (`store-nav-pill`), carrier status pill, Supabase sync pill, refresh button, language dropdown, user badge (`OA`), and power-off logout button.
* **Mobile Fullscreen Overlay (`.mobile-nav-fullscreen`):** Smooth full-viewport drawer with blurred background, clear navigation items, language toggles, and live connection indicators.
* **KPI Bento Cards (`.app-kpi-card`):** Soft rounded cards (`border-radius: 16px`), distinct colored icon boxes (Blue, Emerald, Amber, Cyan, Rose), large metric figures, and micro-trend pills.
* **Interactive Orders Table (`.app-table`):** Clean column alignment, sticky header, clickable rows, status pills (`badge-pending`, `badge-shipped`, `badge-delivered`, `badge-returned`), action buttons with quick actions (Dispatch, Track, Print Label, Edit, Delete).
* **Touch-Friendly Mobile Cards (`.mobile-order-card`):** For viewports under 768px, elegant card layouts displaying reference, customer, destination, amount, carrier status, and full action bar.
* **Bordereau / A6 Thermal Label Modal (`.official-shipping-label`):** High-fidelity Algerian standard thermal shipping label with Code128 barcode, sender branding, customer details, COD amount, and print stylesheet.

---

## 5. Layout Principles
* **Desktop Grid:** Sticky top navbar + fixed sidebar (260px) + flexible fluid main container (`max-width: 1540px`).
* **Mobile Layout:** Collapsible sidebar into fullscreen blurry drawer, stacked single-column KPI cards or horizontal carousel, and mobile order cards replacing table horizontal overflow.
* **Bi-Directional Support:** Native CSS `[dir="rtl"]` with symmetric logical properties, maintaining perfect icon alignment and typographic rhythm in both Arabic and French.

---

## 6. Differentiation Callout
> **"This avoids generic AI dashboard tropes by implementing exact Algerian COD operational realities:**
> 1. Native bilingual AR (RTL) / FR (LTR) instant toggle with font family switches.
> 2. Direct integration with Algerian couriers (Redex Ecotrack DZ, Yalidine, ZR Express) and official thermal A6 shipping label generation.
> 3. Real 58 Wilayas tariffs calculation engine for both Home and Stop Desk delivery.
> 4. Stateless token authentication that survives serverless cold starts across Vercel edge lambdas with zero login loop."
