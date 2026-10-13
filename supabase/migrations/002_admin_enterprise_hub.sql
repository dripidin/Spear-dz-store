-- =============================================================================
-- SPEAR-DZ ALGERIAN HIGH-TECH E-COMMERCE STORE
-- Supabase PostgreSQL Migration 002: Enterprise Admin & Logistics Hub
-- Shipping Tariffs (58 Wilayas), Status History, Courier Tracking Events
-- =============================================================================

-- ── 1. SHIPPING TARIFFS TABLE (58 Wilayas Home vs Stopdesk) ────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wilaya_code INTEGER NOT NULL,
    wilaya_name TEXT NOT NULL,
    wilaya_name_ar TEXT,
    home_fee NUMERIC NOT NULL DEFAULT 600,
    desk_fee NUMERIC NOT NULL DEFAULT 400,
    delivery_time TEXT DEFAULT '24 - 48 H',
    courier TEXT DEFAULT 'general',
    active BOOLEAN DEFAULT true,
    updated_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_wilaya_courier UNIQUE (wilaya_code, courier)
);

CREATE INDEX IF NOT EXISTS idx_shipping_tariffs_wilaya ON public.shipping_tariffs(wilaya_code);
CREATE INDEX IF NOT EXISTS idx_shipping_tariffs_active ON public.shipping_tariffs(active);

-- ── 2. ORDER STATUS HISTORY TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'admin',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON public.order_status_history(created_at DESC);

-- ── 3. COURIER TRACKING EVENTS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courier_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    courier TEXT NOT NULL,
    tracking_code TEXT NOT NULL,
    status TEXT NOT NULL,
    status_description TEXT,
    location TEXT,
    event_timestamp TIMESTAMPTZ DEFAULT now(),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON public.courier_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking_code ON public.courier_tracking_events(tracking_code);

-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────
ALTER TABLE public.shipping_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_tracking_events ENABLE ROW LEVEL SECURITY;

-- Shipping tariffs: Public can read active tariffs for checkout calculation
CREATE POLICY "Allow public read active tariffs" ON public.shipping_tariffs
    FOR SELECT TO anon, authenticated USING (active = true);

-- Service Role Full Access (trusted server-side execution only)
CREATE POLICY "Service role full access on tariffs" ON public.shipping_tariffs
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on status history" ON public.order_status_history
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on tracking events" ON public.courier_tracking_events
    TO service_role USING (true) WITH CHECK (true);

-- ── 5. SEED INITIAL 58 WILAYAS BASE TARIFFS ──────────────────────────────────
INSERT INTO public.shipping_tariffs (wilaya_code, wilaya_name, wilaya_name_ar, home_fee, desk_fee, delivery_time, courier)
VALUES
    (1, 'Adrar', 'أدرار', 900, 600, '48 - 72 H', 'general'),
    (2, 'Chlef', 'الشلف', 650, 450, '24 - 48 H', 'general'),
    (3, 'Laghouat', 'الأغواط', 700, 500, '24 - 48 H', 'general'),
    (4, 'Oum El Bouaghi', 'أم البواقي', 650, 450, '24 - 48 H', 'general'),
    (5, 'Batna', 'باتنة', 650, 450, '24 - 48 H', 'general'),
    (6, 'Béjaïa', 'بجاية', 650, 450, '24 - 48 H', 'general'),
    (7, 'Biskra', 'بسكرة', 700, 500, '24 - 48 H', 'general'),
    (8, 'Béchar', 'بشار', 850, 600, '48 - 72 H', 'general'),
    (9, 'Blida', 'البليدة', 500, 350, '24 H', 'general'),
    (10, 'Bouira', 'البويرة', 550, 400, '24 - 48 H', 'general'),
    (11, 'Tamanrasset', 'تمنراست', 1200, 800, '48 - 96 H', 'general'),
    (12, 'Tébessa', 'تبسة', 700, 500, '24 - 48 H', 'general'),
    (13, 'Tlemcen', 'تلمسان', 700, 500, '24 - 48 H', 'general'),
    (14, 'Tiaret', 'تيارت', 650, 450, '24 - 48 H', 'general'),
    (15, 'Tizi Ouzou', 'تيزي وزو', 550, 400, '24 - 48 H', 'general'),
    (16, 'Alger', 'الجزائر العاصمة', 450, 300, '24 H', 'general'),
    (17, 'Djelfa', 'الجلفة', 700, 500, '24 - 48 H', 'general'),
    (18, 'Jijel', 'جيجل', 650, 450, '24 - 48 H', 'general'),
    (19, 'Sétif', 'سطيف', 600, 400, '24 - 48 H', 'general'),
    (20, 'Saïda', 'سعيدة', 700, 500, '24 - 48 H', 'general'),
    (21, 'Skikda', 'سكيكدة', 650, 450, '24 - 48 H', 'general'),
    (22, 'Sidi Bel Abbès', 'سيدي بلعباس', 650, 450, '24 - 48 H', 'general'),
    (23, 'Annaba', 'عنابة', 650, 450, '24 - 48 H', 'general'),
    (24, 'Guelma', 'قالمة', 650, 450, '24 - 48 H', 'general'),
    (25, 'Constantine', 'قسنطينة', 600, 400, '24 - 48 H', 'general'),
    (26, 'Médéa', 'المدية', 550, 400, '24 - 48 H', 'general'),
    (27, 'Mostaganem', 'مستغانم', 650, 450, '24 - 48 H', 'general'),
    (28, 'M''Sila', 'المسيلة', 650, 450, '24 - 48 H', 'general'),
    (29, 'Mascara', 'معسكر', 650, 450, '24 - 48 H', 'general'),
    (30, 'Ouargla', 'ورقلة', 750, 550, '48 - 72 H', 'general'),
    (31, 'Oran', 'وهران', 600, 400, '24 - 48 H', 'general'),
    (32, 'El Bayadh', 'البيض', 800, 600, '48 - 72 H', 'general'),
    (33, 'Illizi', 'إليزي', 1200, 800, '48 - 96 H', 'general'),
    (34, 'Bordj Bou Arréridj', 'برج بوعريريج', 600, 400, '24 - 48 H', 'general'),
    (35, 'Boumerdès', 'بومرداس', 500, 350, '24 H', 'general'),
    (36, 'El Tarf', 'الطارف', 700, 500, '24 - 48 H', 'general'),
    (37, 'Tindouf', 'تندوف', 1200, 800, '48 - 96 H', 'general'),
    (38, 'Tissemsilt', 'تيسمسيلت', 650, 450, '24 - 48 H', 'general'),
    (39, 'El Oued', 'الوادي', 750, 550, '48 - 72 H', 'general'),
    (40, 'Khenchela', 'خنشلة', 700, 500, '24 - 48 H', 'general'),
    (41, 'Souk Ahras', 'سوق أهراس', 700, 500, '24 - 48 H', 'general'),
    (42, 'Tipaza', 'تيبازة', 500, 350, '24 H', 'general'),
    (43, 'Mila', 'ميلة', 650, 450, '24 - 48 H', 'general'),
    (44, 'Aïn Defla', 'عين الدفلى', 600, 400, '24 - 48 H', 'general'),
    (45, 'Naâma', 'النعامة', 800, 600, '48 - 72 H', 'general'),
    (46, 'Aïn Témouchent', 'عين تموشنت', 650, 450, '24 - 48 H', 'general'),
    (47, 'Ghardaïa', 'غرداية', 750, 550, '48 - 72 H', 'general'),
    (48, 'Relizane', 'غليزان', 650, 450, '24 - 48 H', 'general'),
    (49, 'Timimoun', 'تيميمون', 950, 700, '48 - 96 H', 'general'),
    (50, 'Bordj Badji Mokhtar', 'برج باجي مختار', 1300, 900, '72 - 120 H', 'general'),
    (51, 'Ouled Djellal', 'أولاد جلال', 700, 500, '24 - 48 H', 'general'),
    (52, 'Béni Abbès', 'بني عباس', 900, 650, '48 - 96 H', 'general'),
    (53, 'In Salah', 'عين صالح', 1100, 750, '48 - 96 H', 'general'),
    (54, 'In Guezzam', 'عين قزام', 1300, 900, '72 - 120 H', 'general'),
    (55, 'Touggourt', 'تقرت', 750, 550, '48 - 72 H', 'general'),
    (56, 'Djanet', 'جانت', 1300, 900, '72 - 120 H', 'general'),
    (57, 'El M''Ghair', 'المغير', 750, 550, '48 - 72 H', 'general'),
    (58, 'El Meniaa', 'المنيعة', 850, 600, '48 - 96 H', 'general')
ON CONFLICT (wilaya_code, courier) DO NOTHING;
