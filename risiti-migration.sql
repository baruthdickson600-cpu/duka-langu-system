-- ============================================================
-- DukaLangu — RISITI YA MALIPO YA MFUMO
--
-- Endesha kwenye Supabase SQL Editor. Salama kuendesha mara nyingi.
-- Inahitaji: payments-migration.sql na wakala-6-gateway.sql
-- (kama hujaendesha ya uwakala, sehemu zake zitarukwa zenyewe.)
--
-- Inatoa:
--   1. Namba ya risiti inayotengenezwa na DATABASE, si kivinjari.
--      Wateja wawili wakilipa sekunde moja, hawapati namba moja.
--   2. Safu za risiti kwenye jedwali zote mbili za malipo.
--   3. dl_risiti(namba) — kuthibitisha risiti hadharani, bila
--      kufungua jedwali zima kwa kila mtu.
-- ============================================================

-- ============================================================
-- 1. NAMBA: DL-<mwaka>-<nambari sita>
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS dl_risiti_seq START 1;

CREATE OR REPLACE FUNCTION dl_risiti_no() RETURNS TEXT
LANGUAGE sql VOLATILE AS $rn$
  SELECT 'DL-'
      || to_char((now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date, 'YYYY')
      || '-' || lpad(nextval('dl_risiti_seq')::text, 6, '0')
$rn$;


-- ============================================================
-- 2. SAFU ZA RISITI
-- Zote ni za hiari (NULL) — malipo ya zamani hayabadiliki,
-- na yanapata namba pale yatakapoguswa tena.
-- ============================================================
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS risiti_no     TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS risiti_sms_at TIMESTAMPTZ;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS inaisha       TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS paytx_risiti_no_uniq
  ON payment_transactions (risiti_no) WHERE risiti_no IS NOT NULL;

DO $wk$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'wakala_payments') THEN
    ALTER TABLE wakala_payments ADD COLUMN IF NOT EXISTS risiti_no     TEXT;
    ALTER TABLE wakala_payments ADD COLUMN IF NOT EXISTS risiti_sms_at TIMESTAMPTZ;
    ALTER TABLE wakala_payments ADD COLUMN IF NOT EXISTS inaisha       TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS wakala_pay_risiti_no_uniq
      ON wakala_payments (risiti_no) WHERE risiti_no IS NOT NULL;
  END IF;
END $wk$;


-- ============================================================
-- 3. NAMBA INAWEKWA PALE MALIPO YANAPOTHIBITISHWA
--
-- Hapa, si kwenye API, kwa sababu njia za kuthibitisha ni nne:
-- webhook, polling ya status, jaribio, na dl_wakala_activate.
-- Zote zinapitia UPDATE moja — hivyo trigger inatosha mara moja.
-- Malipo yasiyofaulu hayapati namba kamwe.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_risiti_weka() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $rw$
BEGIN
  IF NEW.status = 'paid' AND (NEW.risiti_no IS NULL OR NEW.risiti_no = '') THEN
    NEW.risiti_no := dl_risiti_no();
    IF NEW.paid_at IS NULL THEN NEW.paid_at := now(); END IF;
  END IF;
  RETURN NEW;
END $rw$;

DROP TRIGGER IF EXISTS paytx_risiti ON payment_transactions;
CREATE TRIGGER paytx_risiti BEFORE INSERT OR UPDATE OF status ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION dl_risiti_weka();

DO $wk2$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'wakala_payments') THEN
    DROP TRIGGER IF EXISTS wakala_pay_risiti ON wakala_payments;
    CREATE TRIGGER wakala_pay_risiti BEFORE INSERT OR UPDATE OF status ON wakala_payments
      FOR EACH ROW EXECUTE FUNCTION dl_risiti_weka();
  END IF;
END $wk2$;

-- Malipo yaliyokwisha lipwa kabla ya safu hii kuwepo yanapata namba sasa,
-- yakipangwa kwa tarehe ili namba zifuatane na historia halisi.
DO $old$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM payment_transactions
            WHERE status = 'paid' AND risiti_no IS NULL
            ORDER BY COALESCE(paid_at, created_at) LOOP
    UPDATE payment_transactions SET risiti_no = dl_risiti_no() WHERE id = r.id;
  END LOOP;
END $old$;


-- ============================================================
-- 4. UWAKALA: hifadhi tarehe ya mwisho kwenye malipo yenyewe
--
-- dl_wakala_activate tayari inahesabu tarehe ya mwisho. Tunaiandika
-- pia kwenye safu ya malipo ili risiti isiseme uongo baadaye
-- pale mteja atakapoongeza siku nyingine.
-- ============================================================
DO $act$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'dl_wakala_activate') THEN
    EXECUTE $fn$
    CREATE OR REPLACE FUNCTION dl_wakala_activate(p_ref TEXT)
    RETURNS JSONB
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $act2$
    DECLARE v_pay wakala_payments; v_until TIMESTAMPTZ; v_mwisho TIMESTAMPTZ;
    BEGIN
      SELECT * INTO v_pay FROM wakala_payments WHERE provider_ref = p_ref;
      IF v_pay.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Malipo hayajapatikana');
      END IF;
      IF v_pay.status = 'paid' THEN
        RETURN jsonb_build_object('ok', true, 'already', true,
                                  'risiti_no', v_pay.risiti_no, 'inaisha', v_pay.inaisha);
      END IF;

      SELECT GREATEST(COALESCE(wakala_paid_until, now()), now()) INTO v_until
        FROM businesses WHERE id = v_pay.business_id;
      v_mwisho := v_until + (v_pay.days || ' days')::interval;

      UPDATE businesses
         SET wakala_enabled = true, wakala_paid_until = v_mwisho
       WHERE id = v_pay.business_id;

      UPDATE wakala_payments
         SET status = 'paid', paid_at = now(), inaisha = v_mwisho
       WHERE id = v_pay.id
       RETURNING * INTO v_pay;

      RETURN jsonb_build_object('ok', true, 'business_id', v_pay.business_id,
                                'paid_until', v_mwisho, 'inaisha', v_mwisho,
                                'risiti_no', v_pay.risiti_no, 'amount', v_pay.amount,
                                'days', v_pay.days, 'phone', v_pay.phone);
    END $act2$;
    $fn$;
    BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_activate(TEXT) TO service_role';
    EXCEPTION WHEN undefined_object THEN NULL; END;
  END IF;
END $act$;


-- ============================================================
-- 5. KUTHIBITISHA RISITI HADHARANI
--
-- Mtu yeyote mwenye namba ya risiti anaweza kuithibitisha — hiyo
-- ndiyo maana ya risiti. Lakini hapati jedwali: anapata safu MOJA,
-- bila barua pepe, bila business_id, na namba ya simu imefichwa
-- katikati. Kukisia namba ni kazi bure: zipo milioni.
--
-- Biashara inasomwa kwa to_jsonb(): safu isiyokuwepo kwenye
-- jedwali lako (district, region...) inarudi NULL badala ya kosa.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_risiti(p_no TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $rd$
DECLARE
  v_no   TEXT;
  v_t    payment_transactions;
  v_b    JSONB;
  v      JSONB;
  v_ina  BOOLEAN;
  v_w    JSONB;
BEGIN
  v_no := upper(regexp_replace(COALESCE(p_no, ''), '\s', '', 'g'));
  IF v_no !~ '^DL-\d{4}-\d{6}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Namba ya risiti si sahihi.');
  END IF;

  -- ---- Malipo ya duka ----
  SELECT * INTO v_t FROM payment_transactions WHERE risiti_no = v_no;
  IF v_t.id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO v_b FROM businesses b WHERE b.id = v_t.business_id;
    v_b := COALESCE(v_b, '{}'::jsonb);
    RETURN jsonb_build_object(
      'ok', true, 'aina', 'duka',
      'risiti_no', v_t.risiti_no, 'amount', v_t.amount, 'days', v_t.days,
      'plan', v_t.plan, 'status', v_t.status,
      'paid_at', v_t.paid_at, 'created_at', v_t.created_at, 'inaisha', v_t.inaisha,
      'business_name', COALESCE(v_t.business_name, v_b->>'name'),
      'region', v_b->>'region', 'district', v_b->>'district',
      'akaunti_aina', COALESCE(v_b->>'akaunti_aina', 'duka'),
      'channel', v_t.channel, 'provider', v_t.provider,
      'external_id', v_t.external_id, 'provider_ref', v_t.provider_ref,
      'phone', regexp_replace(COALESCE(v_t.phone, ''), '^(\d{4})\d+(\d{2})$', '\1****\2')
    );
  END IF;

  -- ---- Malipo ya uwakala (kama jedwali lipo) ----
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'wakala_payments') INTO v_ina;
  IF v_ina THEN
    EXECUTE $q$
      SELECT jsonb_build_object(
        'ok', true, 'aina', 'uwakala',
        'risiti_no', w.risiti_no, 'amount', w.amount, 'days', w.days,
        'status', w.status,
        'paid_at', w.paid_at, 'created_at', w.created_at, 'inaisha', w.inaisha,
        'provider', w.provider, 'external_id', w.external_id, 'provider_ref', w.provider_ref,
        'phone', regexp_replace(COALESCE(w.phone, ''), '^(\d{4})\d+(\d{2})$', '\1****\2'),
        'biz', (SELECT to_jsonb(b) FROM businesses b WHERE b.id = w.business_id)
      )
      FROM wakala_payments w WHERE w.risiti_no = $1
    $q$ INTO v_w USING v_no;

    IF v_w IS NOT NULL THEN
      v_b := COALESCE(v_w->'biz', '{}'::jsonb);
      RETURN (v_w - 'biz') || jsonb_build_object(
        'business_name', v_b->>'name',
        'region', v_b->>'region', 'district', v_b->>'district',
        'akaunti_aina', COALESCE(v_b->>'akaunti_aina', 'duka')
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Risiti haijapatikana.');
END $rd$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_risiti(TEXT) TO anon, authenticated, service_role';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';

SELECT 'RISITI SAWA — namba, safu, na ukurasa wa kuthibitisha vimewekwa.' AS status;
