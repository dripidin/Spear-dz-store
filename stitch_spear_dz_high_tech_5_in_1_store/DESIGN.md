---
name: Cupertino Pure
colors:
  surface: '#faf8fe'
  surface-dim: '#dad9df'
  surface-bright: '#faf8fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf3'
  surface-container-high: '#e9e7ed'
  surface-container-highest: '#e3e2e7'
  on-surface: '#1a1b1f'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5f5e60'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfe1'
  on-secondary-container: '#636264'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001b3f'
  on-tertiary-container: '#2b82f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e4e2e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#abc7ff'
  on-tertiary-fixed: '#001b3f'
  on-tertiary-fixed-variant: '#00458f'
  background: '#faf8fe'
  on-background: '#1a1b1f'
  surface-variant: '#e3e2e7'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  title-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  title-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-sm:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.25rem
  margin: 1.25rem
  margin-sm: 1rem
  margin-lg: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system embodies high-end consumer technology aesthetics: uncompromising clarity, human-centric reduction, and kinetic precision. It prioritizes content immersion by stripping away superfluous visual noise, allowing typographic cadence and deliberate negative space to establish structural hierarchy.

### Target Audience & Emotional Intent
- **Audience:** Discerning modern mobile users, digital product craftspeople, and professionals who demand friction-free, intuitive mobile interactions.
- **Emotional Resonance:** Quiet confidence, absolute responsiveness, frictionless elegance, and physical tactility translated into a pristine digital medium.

### Visual Architecture
Rooted in advanced California minimalism, the interface relies on:
- **Pure Canvas:** Clean `#ffffff` canvases layered with subtle `#f5f5f7` recessed fills.
- **Micro-Scale Visual Cues:** Tactile, continuous-curve squircle geometry, refined hairline dividers, and fluid micro-transitions.
- **Monochrome Dominance:** Expressive use of pure pitch-black and deep-graphite type anchors against subtle zinc supporting elements.

## Colors

The palette operates under a high-fidelity monochrome discipline punctuated by an authentic Cupertino system blue for targeted interactive guidance.

### Palette Hierarchy
- **Canvas (`#ffffff`):** The primary backdrop. Absolute white provides maximum dynamic range for imagery and typography.
- **Primary Ink (`#000000` & `#1d1d1f`):** Used strictly for high-priority headings, primary action surfaces, and active states. `#1d1d1f` functions as primary body text to reduce optical glare.
- **Secondary Neutral (`#86868b`):** Mid-tone zinc applied to secondary metadata, placeholder prompts, inactive states, and tertiary icon treatments.
- **Interactive Accent (`#0071e3`):** Reserved for hyperlinks, select controls, toggle activations, and key contextual actions.
- **Surface Tiers (`#f5f5f7` & `#e8e8ed`):** Distinct low-contrast fills for search inputs, grouped list modules, inactive pill containers, and subtle micro-separators.

## Typography

Typographic scale and letter-spacing directly mirror native iOS SF Pro rhythm using **Inter** for seamless cross-platform execution. 

### Rhythmic Guidance
- **Negative Tracking:** Headings use tight, negative tracking (`-0.03em` to `-0.015em`) to retain punchy visual density at large sizes.
- **Optical Balance:** Body text at `17px` (`1.0625rem`) adheres to mobile readability standards, paired with a proportional `22px` line height for dense vertical reading.
- **Labels & Captions:** Uppercase is avoided unless explicitly needed for section header labels, which use `12px` or `11px` medium-weight typography with slightly relaxed tracking.

## Layout & Spacing

A native mobile-first layout driven by iOS safe-area conventions, responsive padding, and fluid edge bounds.

### Grid & Composition
- **Mobile Foundation:** Single-column layout with fixed outer canvas gutters ranging from `16px` (`margin-sm`) to `20px` (`margin`).
- **Internal Rhythm:** An 8-point base spatial system governs layout margins, supplemented by a 4-point micro-scale for inline indicators, badge offsets, and compact form items.
- **Grouped Groupings (Insetting):** Grouped lists and card rows take advantage of `margin: 1.25rem` inset positioning, establishing floating structural units on top of the base view without full-bleed rigidity.

## Elevation & Depth

Visual depth avoids heavy drop shadows, relying instead on frosted materials, subtle hairline boundaries, and tonal layering.

### Depth Paradigms
- **Frosted Glassmorphism (Vibrancy):** Sticky top navigation bars and floating toolbars use background blur (`backdrop-filter: blur(20px) saturate(180%)`) over an 80% translucent `#ffffffcc` layer.
- **Tonal Insets:** Modals, secondary cards, and input fields utilize flat `#f5f5f7` fills with zero elevation, shifting contrast through color rather than simulated depth.
- **Hairline Outlines:** Grouped list separators and non-elevated component cards use microscopic `0.5px` borders in `rgba(0, 0, 0, 0.08)` to reflect high-DPI retina line dynamics.
- **Elevated Modals & Floating Elements:** Floating sheets and context menus feature ultra-diffused, ambient drop shadows:
  `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)`.

## Shapes

The interface embraces Apple’s signature squircle profile, applying continuous corner smoothing across surfaces.

### Shape Geometry
- **Level 2 (Rounded):** Standard elements (buttons, text inputs, card containers) feature `0.5rem` (`8px`) to `1rem` (`16px`) radii.
- **Continuous Curvature:** All border radiuses emulate CSS continuous curves (`corner-smoothing: 60%` / squircle curvature) wherever supported.
- **Pill Surfacing:** Standalone chips, segmented control indicators, and tag badges utilize full `9999px` capsule radii for frictionless touch targets.

## Components

### Buttons
- **Primary:** High-contrast pitch-black (`#000000`) background with pure white (`#ffffff`) text. Subtle scale-down effect (`scale(0.97)`) on press. Fully rounded capsule (`9999px`) or `12px` rounded rectangle with `48px` minimum touch target height.
- **Secondary:** Tonal neutral container (`#f5f5f7`) with `#000000` text. Zero border.
- **Tertiary / Plain:** Transparent container with `#0071e3` label text and zero horizontal padding for inline actions.

### Form Inputs & Text Fields
- **Container:** Height `44px` or `48px`. Background `#f5f5f7`, corner radius `10px` to `12px`.
- **Text & Placeholders:** Input text in `#1d1d1f`, placeholder in `#86868b`.
- **Focus State:** Background transitions to `#ffffff`, backed by a sharp `1.5px` outer boundary of `#0071e3` or a subtle dark stroke. Includes clear-button trailing glyph (`xmark.circle.fill`).

### Segmented Controls & Chips
- **Segmented Control Track:** Recessed capsule or `8px` container in `#f5f5f7` with `2px` internal padding.
- **Active Segment:** Elevated white (`#ffffff`) squircle surface supported by a micro-shadow (`0 1px 3px rgba(0,0,0,0.08)`).
- **Filter Chips:** Capsule-shaped (`rounded-full`), padded `space-xs` vertically by `space-md` horizontally, alternating between `#f5f5f7` (unselected) and `#000000` with white text (selected).

### Lists & Inset Groups
- **Grouped List Architecture:** Cards inset from screen edges by `16px` to `20px`, enclosed in `#ffffff` over an alternate canvas or grouped as `#f5f5f7` modules.
- **List Rows:** `44px` minimum vertical height. Separated by `0.5px` solid `rgba(0, 0, 0, 0.08)` dividers, inset to align with the row title's leading edge.
- **Accessories:** Chevrons (`chevron.right`) in `#86868b`, right-aligned switches, or contextual detail labels.

### Checkboxes & Switches
- **Switches:** Signature iOS toggle style. Track in `#e8e8ed` (off) and `#34c759` or `#0071e3` (on). Circular white thumb with gentle physical elevation.
- **Checkboxes:** Replaced primarily with checkmark accessory list rows (`checkmark` in `#0071e3`) or `20px` round check containers.

### Cards & Sheets
- **Inset Surface Cards:** Built on a `#ffffff` foundation with faint ambient boundary definition or soft `#f5f5f7` flat backgrounds. Corners set to `16px` (`rounded-lg`).
- **Bottom Sheets:** Floating or screen-bottom docked sheets with `16px` to `24px` top corners, featuring an integrated `#86868b` grabber handle centered at `36px × 5px`.