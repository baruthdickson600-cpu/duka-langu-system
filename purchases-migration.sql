-- ============================================================
-- DukaLangu — Manunuzi ya Stock (Purchases)
-- Kurekodi mmiliki ananunua bidhaa za kuuza (si expense).
-- Run kwenye Supabase SQL Editor. Salama (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID,
  product_id UUID,
  product_name TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  buy_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'shop',        -- shop = pesa ya duka | external = pesa ya nje
  supplier_name TEXT,
  note TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_business ON purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchases_all" ON purchases;
CREATE POLICY "purchases_all" ON purchases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
SELECT 'Purchases table ready!' AS status;
