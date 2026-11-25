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
  verified_name TEXT,          -- jina lililothibitishwa (si alilotandika mhasibu)
  verify_note TEXT,            -- sababu kama uthibitisho haukufanikiwa
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
-- Jina la mpokeaji lililothibitishwa na huduma ya kuangalia jina (Abliner)
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS verified_name TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS verify_note TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejected_by TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_ref ON payouts(provider_ref);
CREATE INDEX IF NOT EXISTS idx_payouts_created ON payouts(created_at);

-- ============================================================
-- KINGA
--
-- Jedwali hili linadhibiti pesa zinazotoka kwenye akaunti.
-- Kivinjari HAKIGUSI jedwali hili hata kidogo — kila kitu
-- kinapita kwenye /api/payments, ambayo inatumia service_role.
-- Kwa hiyo tunafunga kabisa: hakuna anon, hakuna authenticated.
--
-- (Toleo la zamani lilikuwa na `TO anon ... USING (true)` —
--  yaani mtu yeyote mtandaoni angeweza kusoma na kuandika
--  maombi ya kutoa pesa.)
-- ============================================================
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payouts_all" ON payouts;
DROP POLICY IF EXISTS "payouts_public" ON payouts;
DROP POLICY IF EXISTS "payouts_service" ON payouts;

DO $r$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON payouts FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON payouts FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON payouts TO service_role';
  END IF;
END $r$;

NOTIFY pgrst, 'reload schema';
SELECT 'payouts table ready!' AS status;
