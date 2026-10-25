-- ============================================================
-- DukaLangu — Mfumo wa Malipo (Auto-activation)
-- Jedwali la miamala ya malipo (provider-agnostic).
-- Mfumo unajifungua wenyewe pindi webhook inapothibitisha malipo.
-- Run kwenye Supabase SQL Editor. Salama (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  business_name TEXT,
  user_email TEXT,
  phone TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  plan TEXT DEFAULT 'basic',
  days INTEGER DEFAULT 30,
  channel TEXT,                      -- mpesa | airtel | tigo | halopesa ...
  provider TEXT,                     -- zenopay | clickpesa | selcom ... (gateway)
  provider_ref TEXT,                 -- reference ya gateway (order id)
  external_id TEXT,                  -- transaction id kutoka gateway
  status TEXT DEFAULT 'pending',     -- pending | paid | failed | cancelled
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_paytx_business ON payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_paytx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_paytx_ref ON payment_transactions(provider_ref);
CREATE INDEX IF NOT EXISTS idx_paytx_created ON payment_transactions(created_at);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "paytx_all" ON payment_transactions;
CREATE POLICY "paytx_all" ON payment_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
SELECT 'payment_transactions table ready!' AS status;
