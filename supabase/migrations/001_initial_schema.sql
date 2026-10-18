-- =============================================================================
-- SPEAR-DZ ALGERIAN HIGH-TECH E-COMMERCE STORE
-- Supabase PostgreSQL Migration 001: Initial Architecture Schema
-- Version-controlled production schema with Row Level Security (RLS)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. CUSTOMERS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    total_orders INTEGER DEFAULT 1,
    completed INTEGER DEFAULT 0,
    cancelled INTEGER DEFAULT 0,
    rejected INTEGER DEFAULT 0,
    no_response INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 100,
    risk_level TEXT DEFAULT 'LOW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- ── 2. PRODUCTS & BUNDLES TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC NOT NULL,
    compare_price NUMERIC,
    cost_price NUMERIC, -- Confidential purchase cost (restricted to server/service-role)
    is_bundle BOOLEAN DEFAULT false,
    bundle_items JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- ── 3. INVENTORY TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    warehouse_location TEXT DEFAULT 'Algiers Central',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);

-- ── 4. ORDERS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    store_id TEXT NOT NULL DEFAULT 'spear_dz',
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    wilaya TEXT NOT NULL,
    commune TEXT,
    delivery_type TEXT DEFAULT 'home', -- 'home' or 'stopdesk'
    delivery_time TEXT DEFAULT 'normal',
    product_name TEXT NOT NULL DEFAULT 'PACK HIGH-TECH 5 EN 1',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC,
    price_num NUMERIC, -- Backward-compatible alias
    product_total TEXT,
    shipping_fee TEXT,
    total_price NUMERIC,
    grand_total TEXT, -- Backward-compatible alias
    status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, dispatched, delivered, cancelled, returned
    courier TEXT DEFAULT 'manual', -- manual, yalidine, redex, zrexpress
    tracking_code TEXT,
    redex_tracking_code TEXT, -- Backward-compatible alias
    in_redex BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'LOW',
    risk_decision TEXT DEFAULT 'ALLOW',
    risk_reasons TEXT,
    notes TEXT,
    remarks JSONB,
    client_ip TEXT,
    client_ip_hash TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_wilaya ON public.orders(wilaya);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ── 5. ORDER ITEMS (SNAPSHOT) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ── 6. RATE LIMITS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON public.rate_limits(ip, created_at DESC);

-- ── 7. RISK EVENTS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'ORDER_SUBMISSION',
    store_id TEXT DEFAULT 'spear_dz',
    order_id TEXT,
    actor_phone TEXT,
    device_id TEXT,
    ip_hash TEXT,
    score INTEGER DEFAULT 0,
    reasons TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_events_order_id ON public.risk_events(order_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_phone ON public.risk_events(actor_phone);

-- ── 8. WATCHLIST TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    identifier_type TEXT DEFAULT 'phone', -- 'phone', 'ip_hash', 'device_id'
    reason TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_watchlist_identifier ON public.watchlist(identifier);

-- ── 9. AUDIT LOGS TABLE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    actor TEXT NOT NULL DEFAULT 'admin',
    payload JSONB,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ── 10. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Products: Public can read active products (catalog display)
CREATE POLICY "Allow public read active products" ON public.products
    FOR SELECT USING (active = true);

-- Orders: Public / Anonymous can ONLY INSERT new orders (checkout)
CREATE POLICY "Allow anon order insertion" ON public.orders
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Rate limits: Anonymous rate limit insertion & check
CREATE POLICY "Allow anon rate limit insert" ON public.rate_limits
    FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon rate limit select" ON public.rate_limits
    FOR SELECT TO anon, authenticated USING (true);

-- Service Role Full Access (trusted server-side execution only)
CREATE POLICY "Service role full access on products" ON public.products
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on inventory" ON public.inventory
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on orders" ON public.orders
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on order_items" ON public.order_items
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on customers" ON public.customers
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on rate_limits" ON public.rate_limits
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on risk_events" ON public.risk_events
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on watchlist" ON public.watchlist
    TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs
    TO service_role USING (true) WITH CHECK (true);

-- ── 11. DEFAULT 5-IN-1 PACK SEED DATA ─────────────────────────────────────────
INSERT INTO public.products (slug, name, description, base_price, compare_price, cost_price, is_bundle, bundle_items, active)
VALUES (
  'pack-high-tech-5-en-1',
  'PACK HIGH-TECH 5 EN 1 SPEAR-DZ',
  'Pack exclusif réunissant Smartwatch Ultra 2 AMOLED, Écouteurs TWS ANC Pro, Batterie 20000mAh 65W, Station MagSafe 3-en-1, et Câble Kevlar 100W.',
  20400,
  29500,
  13500,
  true,
  '[
    {"name": "Smartwatch Ultra 2 AMOLED", "ref": "SMARTWATCH-ULTRA-2", "valeur_dzd": 9000},
    {"name": "Écouteurs TWS ANC Pro", "ref": "TWS-ANC-PRO", "valeur_dzd": 4200},
    {"name": "Batterie Externe 20000mAh 65W", "ref": "PB-20000-65W", "valeur_dzd": 5900},
    {"name": "Station de Charge MagSafe 3-en-1", "ref": "MAGSAFE-3IN1", "valeur_dzd": 4900},
    {"name": "Câble Tressé Kevlar 100W 4-en-1", "ref": "CABLE-KEVLAR-100W", "valeur_dzd": 2800}
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE 
SET base_price = EXCLUDED.base_price, 
    compare_price = EXCLUDED.compare_price,
    bundle_items = EXCLUDED.bundle_items;
