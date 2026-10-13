# STITCH DESIGN SYSTEM HANDOFF — SPEAR-DZ
## Cyber-Luxury High-Tech E-Commerce Store (Algeria)

This document records the official Stitch MCP design system assets, screen generation metadata, and design tokens created and utilized for the Spear-dz e-commerce storefront.

---

## 1. Project & Screen References

| Resource | Identifier / Reference | Status |
| :--- | :--- | :--- |
| **Stitch Project Name** | `projects/8749809693055874863` | Verified & Active |
| **Project Title** | `Spear-dz High-Tech 5-in-1 Store` | Created via Stitch MCP |
| **Design System** | `Spear Cyber-Luxury` (`assets/71b4b75877c2445cb44cdbf1b3b32f6b`) | Generated & Applied |
| **Desktop Generation Session** | `1743071721974029168` | Complete |
| **Desktop Screenshot** | `projects/8749809693055874863/files/f83746fdcf1547b08b7ee38f99576a17` | Verified |
| **Mobile Screen ID** | `96e3a40814a441ad91e14a6a3f32baec` | Complete |
| **Mobile Screenshot** | `projects/8749809693055874863/files/f5739589d9ef4f58b9dec87be74362bc` | Verified |

---

## 2. Design Tokens (Spear Cyber-Luxury)

### Color Palette

```css
:root {
  /* Surface Canvas & Layering */
  --color-canvas-base: #0a0a0c;
  --color-surface-obsidian: #131315;
  --color-surface-glass-low: #1c1b1d;
  --color-surface-glass-card: #181820;
  --color-surface-elevated: #201f21;
  --color-surface-highest: #2a2a2c;

  /* Tactical Electric Accents */
  --color-primary-cyan: #00f2fe;
  --color-primary-cyan-gradient: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  --color-primary-cyan-glow: rgba(0, 242, 254, 0.35);

  /* Conversion Urgency Accents */
  --color-secondary-amber: #f59e0b;
  --color-secondary-gold-gradient: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  --color-secondary-amber-glow: rgba(245, 158, 11, 0.25);

  /* Trust & Verification Badges */
  --color-tertiary-emerald: #10b981;
  --color-emerald-bg: rgba(16, 185, 129, 0.12);

  /* Typography Contrasts */
  --color-text-high: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  /* Laser Borders */
  --color-border-laser: rgba(0, 242, 254, 0.22);
  --color-border-subtle: rgba(255, 255, 255, 0.08);
}
```

### Typography Hierarchy

- **Display & Product Titles:** `Outfit`, sans-serif (Weights: 700, 800)
- **Body & Prose:** `Plus Jakarta Sans`, sans-serif (Weights: 400, 500, 600)
- **Telemetry & Price Tags:** `JetBrains Mono`, monospace (Weights: 500, 600)

### Radii & Geometry

- **Inputs & Micro-Badges:** `4px` (`rounded-sm`)
- **Cards & Modals:** `8px` (`rounded-lg`)
- **Action Pills & Tag Capsules:** `9999px` (`rounded-full`)

---

## 3. UI Component Specifications Derived from Stitch

### 1. Sticky Header
- Dark glassmorphism header (`backdrop-blur-md`, `bg-[#0a0a0c]/85`).
- Official brand typography with glowing cyan dot.
- Fast delivery badge (`Livraison 58 Wilayas`).
- Language toggle (`العربية` / `Français`).
- Direct action link to order form (`Commander`).

### 2. Hero Section & Bundle Value
- High-contrast value proposition: **"LE PACK HIGH-TECH 5 EN 1 ULTIME"**.
- Price badge: **21,900 DZD** (Crossed out: 29,500 DZD — Saving 7,600 DZD).
- Urgency countdown indicator with limited stock alert ("Plus que 14 packs disponibles").
- Quick CTA with glowing cyan button.

### 3. Product Demonstration Video (`ProductDemoVideo`)
- Dedicated 16:9 responsive container with neon-accented rim.
- Local video path: `/videos/pack-high-tech-demo.mp4`.
- Poster fallback: `/images/pack-high-tech-poster.jpg`.
- **Mandatory Final-Frame Freeze:** When playback finishes, native `ended` pauses and renders the exact final frame onto an aligned canvas without blanking, shrinking, layout shift, or restarting.
- Replay control button to restart on user demand.

### 4. Five-Product Interactive Breakdown
Showcases the 5 individual components included in the 21,900 DZD bundle:
1. **Smartwatch Ultra 2 AMOLED** (49mm Titanium finish, AMOLED screen, Bluetooth call).
2. **Écouteurs TWS ANC Pro** (Active Noise Cancelling, 32h battery, deep bass).
3. **Power Bank 20000mAh 65W** (Ultra-fast charging for laptop & phone, LED display).
4. **Station de Charge MagSafe 3-en-1** (Simultaneous wireless charge for phone, watch, earbuds).
5. **Câble Tressé Kevlar 100W 4-en-1** (Ultra-durable Kevlar, USB-C/Lightning/Micro-USB).

### 5. Cash on Delivery (COD) Express Order Form
- Full Name input with auto-capitalization.
- Algerian Mobile Phone input with instant regex feedback (`^0[567]\d{8}$`).
- Wilaya dropdown covering all 58 Wilayas of Algeria.
- Dynamic Commune input.
- Delivery preference selector: **À Domicile** (Home) vs **Bureau Yalidine Stop-Desk**.
- Live server-aligned price calculation: `21,900 DZD + Wilaya Shipping Fee = Grand Total`.
- Trust Badges:
  - 💵 Paiement à la livraison après vérification
  - 🚚 Livraison rapide 58 Wilayas (24h–48h)
  - 🛡️ Garantie 12 mois avec échange direct
