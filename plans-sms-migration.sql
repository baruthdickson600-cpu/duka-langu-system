-- ============================================================
-- DukaLangu — VIFURUSHI NA BANDO LA SMS
--
-- 1) Inalinda wateja waliopo: wote wanaopatikana SASA wanawekwa
--    is_legacy = TRUE, kwa hiyo hawapotezi vipengele walivyozoea.
-- 2) Inaongeza bando la SMS kwa kila duka.
--
-- ⚠️ ENDESHA SEHEMU YA 1 MARA MOJA TU, kabla hujawasha vikwazo.
--    Ukiiendesha tena baadaye, wateja wapya nao watakuwa legacy.
--
-- Run kwenye Supabase SQL Editor.
-- ============================================================

-- ---------- 1) ULINZI WA WATEJA WALIOPO ----------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;

-- Wateja wote waliopo sasa = legacy (hawazuiliwi)
UPDATE businesses SET is_legacy = TRUE WHERE is_legacy IS NOT TRUE;

-- ---------- 2) BANDO LA SMS ----------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_quota_month TEXT;   -- 'YYYY-MM' bando la mwezi lilipowekwa

-- Kumbukumbu ya kila SMS iliyotumwa kwa mteja wa duka
CREATE TABLE IF NOT EXISTS sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  customer_id UUID,
  phone TEXT NOT NULL,
  message TEXT,
  kind TEXT,                       -- debt_reminder | receipt | payment_confirm | promo
  status TEXT DEFAULT 'sent',      -- sent | failed
  error TEXT,
  cost INTEGER DEFAULT 1,          -- SMS ngapi zimepungua kwenye bando
  sent_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_smslog_biz ON sms_log(business_id);
CREATE INDEX IF NOT EXISTS idx_smslog_created ON sms_log(created_at);

-- Manunuzi ya bando la SMS
CREATE TABLE IF NOT EXISTS sms_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  bundle_id TEXT,                  -- ndogo | kati | kubwa
  sms_count INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  provider TEXT DEFAULT 'snippe',
  provider_ref TEXT,
  status TEXT DEFAULT 'pending',   -- pending | paid | failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_smsbuy_biz ON sms_purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_smsbuy_ref ON sms_purchases(provider_ref);

ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smslog_public" ON sms_log;
CREATE POLICY "smslog_public" ON sms_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE sms_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "smsbuy_public" ON sms_purchases;
CREATE POLICY "smsbuy_public" ON sms_purchases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
SELECT
  (SELECT COUNT(*) FROM businesses WHERE is_legacy) AS wateja_walioLindwa,
  'Vifurushi na bando la SMS tayari' AS status;
