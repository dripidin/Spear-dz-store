# SPEAR-DZ — ORDER MANAGEMENT GRID VIEW & BULK REMOVAL REPORT

**Date:** October 13, 2026  
**Target Project:** `D:\Websites On Line\Spear-dz`  
**Components:** `admin.html`, `public/css/admin.css`, `public/js/admin-client.js`, `api/orders.js`

---

## 1. Objective & Design Philosophy

The desktop 9-column DataGrid table was poorly suited for mobile viewports, where columns became crushed or triggered wide horizontal scrolling. To solve this, a dual-mode order presentation architecture was implemented:
- **Table View:** The comprehensive tabular DataGrid, ideal for desktop workflows and dense order management.
- **Grid View:** An ergonomic, card-based order management system that is the **default mode on mobile** and available on desktop via a segmented view switcher.

---

## 2. Grid Order-Card Architecture

Each card in `#ordersGridView` (`.grid-order-card`) adheres to a strict, highly scannable hierarchy:

### A. Top Row (`.goc-top-row`)
- **Selection Checkbox:** `<input type="checkbox" class="goc-checkbox">` linked to multi-order selection.
- **Order Number:** `#SPDZ-XXXXXX-XXX` formatted in high-contrast monospaced font.
- **Status Badge:** Colored pill indicating order state (e.g., `⏳ قيد المراجعة`, `✓ مؤكدة`, `🚚 في التوصيل`).
- **Timestamp:** Formatted Arabic or French date/time (e.g., `13 أكتوبر، 08:26 ص`).

### B. Customer Identity Box (`.customer-identity-box`)
As explicitly requested, customer information is grouped into **one visually distinct, bordered, softly surfaced card** (`background: #f8f8fa; border: 1px solid #e5e5ea; border-radius: 10px;`):
- **Category Tag:** `<div class="cid-header"><i class="fa-solid fa-user-tag"></i> <span>بيانات وهوية العميل</span></div>`
- **Customer Name:** `<div class="cid-name">Imed Eddin</div>`
- **Direct-Call Phone Link:**
  ```html
  <a href="tel:0540095112" class="cid-phone-link font-mono" title="اتصال مباشر بالزبون">
      <i class="fa-solid fa-phone"></i>
      <span>0540095112</span>
  </a>
  ```
  *Clicking or tapping immediately initiates a cellular phone call on mobile devices via native `tel:` protocol.*

### C. Location Block (`.goc-location`)
- Visual map marker icon (`<i class="fa-solid fa-location-dot"></i>`).
- Bold Algerian Wilaya name with Commune and street address where provided, with reliable CSS word wrapping (`word-break: break-word`).

### D. Financial Summary (`.goc-financials`)
- **Total COD Amount:** Prominently styled in Algerian Dinar typography (e.g., `22 450 د.ج`).
- **Delivery Mode Pill:** Visually distinguishing `🏢 استلام مكتب (Stopdesk)` from `🏠 توصيل للمنزل (Domicile)`.

### E. Operational Action Row (`.goc-actions-row`)
- **Quick Status Selector:** Dropdown menu allowing permitted lifecycle transitions (`confirmed`, `preparing`, `shipped`, `delivered`, `returned`, `cancelled`).
- **Print Shipping Label:** Opens A6 thermal barcode label dialog (`.openLabelModal`).
- **Dispatch Courier:** Opens parcel submission to Yalidine / Redex (`.openCreateModal`).
- **Tracking Timeline:** Opens chronological route milestones modal (`.openTrackingModal`).
- **Single Order Deletion Button:** Danger-state trash button (`.confirmDeleteSingle`) opening confirmation modal.

---

## 3. View Switcher & Responsiveness

### Switcher Control (`#viewSwitcherGroup`)
Located directly in the filter controls bar:
```html
<div class="view-switcher-group" id="viewSwitcherGroup">
    <button class="view-switch-btn active" id="viewModeTableBtn" onclick="storeAdmin.setViewMode('table')">
        <i class="fa-solid fa-table-list"></i> <span>جدول</span>
    </button>
    <button class="view-switch-btn" id="viewModeGridBtn" onclick="storeAdmin.setViewMode('grid')">
        <i class="fa-solid fa-grip"></i> <span>شبكة</span>
    </button>
</div>
```
- User preference is saved in client `localStorage` (`spdz_view_mode`).
- On Desktop: Table View is default; Grid View can be selected dynamically.
- On Mobile (≤ 768px): CSS overrides force Grid View as the exclusive presentation mode (`.table-responsive-wrapper { display: none !important; } .orders-grid-view { display: grid !important; }`).

---

## 4. Single-Order & Bulk Order Deletion Workflow

### User Interface Controls
1. **Row & Card Checkboxes:** Every table row and grid card contains a checkbox.
2. **Page Select-All Checkbox:** `#selectAllCheckbox` in the table header allows selecting all orders on the active pagination page.
3. **Bulk Actions Toolbar (`#bulkActionsToolbar`):**
   - Automatically appears when 1 or more orders are selected.
   - Displays the selected count: `تم تحديد X طلب` / `X commande(s) sélectionnée(s)`.
   - "Deselect / Cancel" button (`#btnClearSelection`) to reset selections.
   - "Delete Selected" button (`#btnBulkDelete`) in danger red.
4. **Delete Confirmation Dialog (`#deleteConfirmModal`):**
   - Modal backdrop prevents accidental background clicks.
   - Displays the target order IDs inside a styled `#deleteTargetsPill`.
   - Explicit confirmation button (`#confirmDeleteActionBtn`) required to execute the operation.

### Backend Endpoint: `DELETE /api/orders`
- **Authentication:** Requires valid admin Bearer token in `Authorization` header (returns `401` if missing/invalid).
- **Payload Validation:** Accepts `{ orderId: "SPDZ-..." }` or `{ orderIds: ["SPDZ-1", "SPDZ-2"] }`.
- **Request Size Limiting:** Capped at 100 orders per bulk operation.
- **Idempotent Soft-Delete:** Moves records to `data/archived_orders.json` and filters them out of standard queries.
- **Audit Logging:** Every deletion logs actor, timestamp, reason, and target IDs to server logs.
- **UI Refresh:** On success, selection clears, notification alerts outcome, and orders/KPIs refresh immediately.

---

## 5. Viewport Verification Matrix

| Viewport | View Mode | Checkboxes Working? | Customer Box (Name + Phone)? | Bulk Toolbar Appears? | Deletion Modal Flow? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile 390×844 (AR)** | Grid (1 Col) | **YES** | **YES** (Direct `tel:` call) | **YES** (`تم تحديد 2 طلب`) | **PASS** (Targets verified) |
| **Mobile 360×800 (AR)** | Grid (1 Col) | **YES** | **YES** (Direct `tel:` call) | **YES** | **PASS** |
| **Desktop 1440×900 (AR)**| Table (10 Col) | **YES** | In separate columns | **YES** | **PASS** |
| **Desktop 1440×900 (AR)**| Grid (3 Col) | **YES** | **YES** (Direct `tel:` call) | **YES** | **PASS** |
| **Desktop 1440×900 (FR)**| Table (10 Col) | **YES** | In separate columns | **YES** | **PASS** |
