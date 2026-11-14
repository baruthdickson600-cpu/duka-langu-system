-- ============================================================
-- DukaLangu — Kutoa Pesa (Payouts / Withdrawals) kwa Snippe
-- Mhasibu anatoa mapato ya DukaLangu kwenda M-Pesa/Tigo/benki.
-- Run kwenye Supabase SQL Editor. Salama (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  method TEXT DEFAULT 'mobile',        -- mobile | bank
  channel TEXT,                        -- mpesa | tigopesa | airtelmoney | halopesa | bank
  recipient_name TEXT,
  recipient_number TEXT,               -- namba ya simu au akaunti
  bank_code TEXT,                      -- kwa benki
  reason TEXT,                         -- sababu ya kutoa
  provider TEXT DEFAULT 'snippe',
  provider_ref TEXT,                   -- reference kutoka Snippe
  external_id TEXT,
  status TEXT DEFAULT 'pending_approval', -- pending_approval | approved | pending | completed | failed | rejected | cancelled
  requested_by TEXT,                   -- jina la mhasibu aliyeanzisha
  requested_by_id UUID,
  -- Idhini: Admin NA Marketing wote lazima waidhinishe
  admin_approved BOOLEAN DEFAULT FALSE,
  admin_approved_by TEXT,
  admin_approved_at TIMESTAMPTZ,
  marketing_approved BOOLEAN DEFAULT FALSE,
  marketing_approved_by TEXT,
  marketing_approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Kwa jedwali lililopo tayari, ongeza nguzo mpya (salama)
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS admin_approved_by TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS marketing_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS marketing_approved_by TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS marketing_approved_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejected_by TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_ref ON payouts(provider_ref);
CREATE INDEX IF NOT EXISTS idx_payouts_created ON payouts(created_at);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payouts_all" ON payouts;
DROP POLICY IF EXISTS "payouts_public" ON payouts;
CREATE POLICY "payouts_public" ON payouts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
SELECT 'payouts table ready!' AS status;
