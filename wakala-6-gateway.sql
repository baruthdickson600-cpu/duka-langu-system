-- ============================================================
-- DukaLangu — UWAKALA NA GATEWAY (Abliner, Beem, Snippe)
--
-- Sehemu 6/7. Endesha BAADA ya sehemu 1–5.
--
-- Kila gateway inafanya kazi tofauti kwenye uwakala:
--
--   ABLINER — kuthibitisha JINA kabla pesa haijaenda. Hii ndiyo
--             muhimu kuliko zote: pesa ikienda namba isiyo sahihi
--             hairudi. Jina na mtandao vinahifadhiwa na muamala.
--
--   BEEM    — kumwarifu MMILIKI mara moja pale pesa inapopotea:
--             tofauti kwenye upatanisho, float inayoisha, muamala
--             mkubwa. Kila arifa ni ya hiari kwa sababu inagharimu.
--
--   SNIPPE  — mmiliki kulipia uwakala (13,000) mwenyewe, bila
--             kusubiri admin. Reference inaanza na WK-.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

-- ===== 1. Uthibitisho wa jina kwenye muamala =====
-- Hazijaza kitu kwa rekodi za zamani — ni za hiari kabisa.
ALTER TABLE wakala_tx ADD COLUMN IF NOT EXISTS jina_halisi   TEXT;
ALTER TABLE wakala_tx ADD COLUMN IF NOT EXISTS mtandao       TEXT;
ALTER TABLE wakala_tx ADD COLUMN IF NOT EXISTS jina_thibitishwa BOOLEAN NOT NULL DEFAULT false;


-- ===== 2. Arifa kwa mmiliki (Beem) =====
-- Zote zimezimwa mwanzoni. SMS inagharimu, kwa hiyo mmiliki
-- anachagua mwenyewe anachotaka kuarifiwa.
ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS arifa_tofauti   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS arifa_float     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS arifa_mkubwa    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS arifa_hitimisho BOOLEAN NOT NULL DEFAULT false;
-- Float ikishuka chini ya hapa, mmiliki anaarifiwa
ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS float_chini     NUMERIC(14,2) NOT NULL DEFAULT 50000;
-- Muamala unaozidi hapa unaarifiwa
ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS kikomo_kikubwa  NUMERIC(14,2) NOT NULL DEFAULT 500000;

-- Kumbukumbu ya arifa — kuzuia SMS ileile kutumwa mara kwa mara.
-- Bila hii, float ikishuka chini mmiliki angepokea SMS kila
-- muamala, na bando lake lingeisha siku moja.
CREATE TABLE IF NOT EXISTS wakala_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  aina        TEXT NOT NULL,
  kitu        TEXT,
  day         DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,
  ujumbe      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Arifa moja ya aina moja kwa siku moja
CREATE UNIQUE INDEX IF NOT EXISTS wakala_alerts_uniq
  ON wakala_alerts (business_id, aina, COALESCE(kitu,''), day);


-- ===== 3. Malipo ya uwakala (Snippe, reference WK-) =====
-- Jedwali lake lake. HALIGUSI payment_transactions ya duka —
-- kuchanganya kungeweza kufungua duka kwa malipo ya uwakala.
CREATE TABLE IF NOT EXISTS wakala_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount       NUMERIC(14,2) NOT NULL,
  days         INT NOT NULL DEFAULT 30,
  phone        TEXT,
  provider     TEXT NOT NULL DEFAULT 'snippe',
  provider_ref TEXT UNIQUE,
  external_id  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wakala_pay_status_ok CHECK (status IN ('pending','paid','failed'))
);
CREATE INDEX IF NOT EXISTS wakala_pay_biz ON wakala_payments (business_id, created_at DESC);


-- ============================================================
-- Kuongeza siku baada ya malipo kuthibitishwa.
-- Inaitwa na webhook (service role), si na kivinjari.
--
-- Siku zinaongezwa KUTOKA tarehe iliyopo kama bado haijaisha,
-- vinginevyo kutoka leo — asipoteze siku alizolipia.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_activate(p_ref TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $act$
DECLARE v_pay wakala_payments; v_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_pay FROM wakala_payments WHERE provider_ref = p_ref;
  IF v_pay.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Malipo hayajapatikana');
  END IF;
  IF v_pay.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  SELECT GREATEST(COALESCE(wakala_paid_until, now()), now()) INTO v_until
    FROM businesses WHERE id = v_pay.business_id;

  UPDATE businesses
     SET wakala_enabled = true,
         wakala_paid_until = v_until + (v_pay.days || ' days')::interval
   WHERE id = v_pay.business_id;

  UPDATE wakala_payments
     SET status = 'paid', paid_at = now()
   WHERE id = v_pay.id;

  RETURN jsonb_build_object('ok', true, 'business_id', v_pay.business_id,
                            'paid_until', v_until + (v_pay.days || ' days')::interval);
END $act$;


-- ============================================================
-- KINGA
-- ============================================================
ALTER TABLE wakala_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wakala_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wakala_alerts_all ON wakala_alerts;
CREATE POLICY wakala_alerts_all ON wakala_alerts FOR ALL TO authenticated
  USING (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()))
  WITH CHECK (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()));

-- Malipo: mmiliki anaona na kuanzisha yake. Kuthibitisha ni kazi
-- ya webhook pekee (service role), si ya kivinjari.
DROP POLICY IF EXISTS wakala_pay_read ON wakala_payments;
CREATE POLICY wakala_pay_read ON wakala_payments FOR SELECT TO authenticated
  USING (dl_wakala_boss(business_id));

DROP POLICY IF EXISTS wakala_pay_new ON wakala_payments;
CREATE POLICY wakala_pay_new ON wakala_payments FOR INSERT TO authenticated
  WITH CHECK (dl_wakala_boss(business_id));

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_activate(TEXT) TO service_role';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 6/7 SAWA — gateway za uwakala zimeunganishwa.' AS status;
