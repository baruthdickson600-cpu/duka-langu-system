-- ============================================================
-- DukaLangu — HUDUMA YA UWAKALA (faili moja kamili)
--
-- Vipande kumi vilivyounganishwa. Kama kihariri chako kinakata
-- maandishi marefu, tumia vipande kimoja kimoja badala yake:
-- wakala-1-jedwali.sql ... wakala-10-admin.sql
--
-- Salama kuendesha mara nyingi. HAIGUSI jedwali la duka.
-- ============================================================



-- ####################  SEHEMU 1 / 10  ####################

-- ============================================================
-- DukaLangu — HUDUMA YA UWAKALA (jedwali + kinga)
--
-- HATUA 1 YA 5. Hii HAIGUSI kitu kilichopo. Haibadilishi jedwali
-- lolote la duka, haifuti chochote, na app ya sasa haitaona
-- tofauti yoyote. Jedwali linakaa tupu hadi admin awashe huduma.
--
-- Salama kuendesha mara nyingi. Run kwenye Supabase SQL Editor.
--
-- ------------------------------------------------------------
-- MIANYA YA UPOTEVU WA PESA NA JINSI ZINAVYOZIBWA HAPA
--
-- 1. Wakala anaandika kidogo kuliko alivyotoa
--    -> Float halisi haikubaliani na hesabu. Upatanisho wa siku
--       unakamata tofauti (wakala_days.variance).
--
-- 2. Hakuandika muamala kabisa
--    -> Sawa na #1 — float inapungua bila rekodi.
--
-- 3. Anafuta muamala baada ya kuandika
--    -> HARUHUSIWI KUFUTA WALA KUBADILISHA. RLS inampa INSERT
--       pekee. Kurekebisha ni kuandika REJESHO (reverses), na
--       rejesho linaonekana kwa mmiliki.
--
-- 4. Anachukua taslimu kasheni
--    -> Upatanisho wa taslimu (counted_cash) unakamata.
--
-- 5. Anaandika muamala wa jana leo, au anabadilisha tarehe
--    -> Siku iliyofungwa HAIPOKEI muamala mpya (trigger).
--
-- 6. Muamala unaingia mara mbili (mtandao hafifu)
--    -> offline_id + unique index, kama mauzo.
--
-- 7. Anajiwekea kamisheni kubwa ili ionekane amepata zaidi
--    -> Kamisheni haiwezi kuzidi kiasi cha muamala (CHECK), na
--       haigusi taslimu wala float — kwa hiyo haibadilishi
--       upatanisho hata kidogo.
-- ============================================================


-- ============================================================
-- 1. BIASHARA: usajili wa uwakala, pekee na wa duka
--    wakala_enabled      — admin pekee anawasha
--    wakala_paid_until   — malipo yake yake, hayahusiani na duka
-- ============================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS wakala_enabled    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS wakala_paid_until TIMESTAMPTZ;


-- ============================================================
-- 2. LAINI ZA FLOAT (M-Pesa, Airtel Money, Mix by Yas, Halopesa...)
--    Kila laini ina float yake. Taslimu ni MOJA kwa shughuli zote.
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  short_code    TEXT,
  opening_float NUMERIC(14,2) NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wakala_lines_biz ON wakala_lines (business_id, active);


-- ============================================================
-- 3. MIAMALA
--
--    type: deposit | withdraw | float_buy | float_sell
--          cash_in | cash_out
--
--    reverses: kitambulisho cha muamala unaorekebishwa. Rejesho
--              ni kinyume kamili cha muamala wa awali.
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_tx (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  line_id      UUID REFERENCES wakala_lines(id) ON DELETE RESTRICT,
  tx_date      DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,
  type         TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  commission   NUMERIC(14,2) NOT NULL DEFAULT 0,
  customer     TEXT,
  phone        TEXT,
  ref          TEXT,
  note         TEXT,
  reverses     UUID REFERENCES wakala_tx(id) ON DELETE RESTRICT,
  offline_id   TEXT,
  recorded_by  UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wakala_tx_type_ok CHECK (
    type IN ('deposit','withdraw','float_buy','float_sell','cash_in','cash_out')
  ),
  -- Kiasi lazima kizidi sifuri. Muamala wa sifuri ni kelele tu.
  CONSTRAINT wakala_tx_amount_ok CHECK (amount > 0),
  -- Kamisheni haiwezi kuwa hasi wala kuzidi muamala wenyewe
  CONSTRAINT wakala_tx_comm_ok CHECK (commission >= 0 AND commission <= amount),
  -- Kuweka/kutoa/float lazima ziwe na laini; mtaji hauna
  CONSTRAINT wakala_tx_line_ok CHECK (
    (type IN ('cash_in','cash_out') AND line_id IS NULL)
    OR (type NOT IN ('cash_in','cash_out') AND line_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS wakala_tx_biz_date ON wakala_tx (business_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS wakala_tx_line     ON wakala_tx (line_id, tx_date);
CREATE INDEX IF NOT EXISTS wakala_tx_by       ON wakala_tx (recorded_by, tx_date);

-- Kinga #6: muamala mmoja hauwezi kuingia mara mbili
CREATE UNIQUE INDEX IF NOT EXISTS wakala_tx_offline_uniq
  ON wakala_tx (business_id, offline_id) WHERE offline_id IS NOT NULL;

-- Muamala mmoja unarekebishwa MARA MOJA pekee. Bila hii, mtu
-- angeweza kurejesha muamala ule ule mara kumi — kosa lile lile
-- lililotokea kwenye marejesho ya bidhaa.
CREATE UNIQUE INDEX IF NOT EXISTS wakala_tx_reverses_uniq
  ON wakala_tx (reverses) WHERE reverses IS NOT NULL;


-- ============================================================
-- 4. KUFUNGA SIKU (upatanisho)
--
--    lines: {"<line_id>": {"counted":..,"expected":..,"variance":..}}
--    Laini ni mbili hadi nne, kwa hiyo jsonb inatosha — hakuna
--    sababu ya jedwali la tano.
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_days (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day            DATE NOT NULL,
  lines          JSONB NOT NULL DEFAULT '{}'::jsonb,
  counted_cash   NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_cash  NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_cash  NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_float NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission     NUMERIC(14,2) NOT NULL DEFAULT 0,
  tx_count       INT NOT NULL DEFAULT 0,
  note           TEXT,
  closed_by      UUID,
  closed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Siku moja inafungwa MARA MOJA
CREATE UNIQUE INDEX IF NOT EXISTS wakala_days_uniq ON wakala_days (business_id, day);


-- ============================================================
-- 5. MIPANGILIO
--    cash_opening — taslimu ya kuanzia (mara ya kwanza pekee)
--    threshold    — tofauti ndogo inayokubalika bila onyo
--    alert_phone  — namba ya kupata SMS ya tofauti
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_settings (
  business_id   UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  cash_opening  NUMERIC(14,2) NOT NULL DEFAULT 0,
  threshold     NUMERIC(14,2) NOT NULL DEFAULT 1000,
  alert_phone   TEXT,
  alert_sms     BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
NOTIFY pgrst, 'reload schema';
SELECT 'Sehemu 1/10 SAWA — jedwali yametengenezwa.' AS status;


-- ####################  SEHEMU 2 / 10  ####################

-- 6. KINGA ZA DATABASE (triggers)
-- ============================================================

-- 6a. recorded_by na created_at vinapigwa chapa na DATABASE, si
--     na kivinjari. Wakala hawezi kuandika muamala kwa jina la
--     mwingine, na hawezi kudanganya saa.
CREATE OR REPLACE FUNCTION dl_wakala_stamp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $stamp$
BEGIN
  NEW.recorded_by := auth.uid();
  NEW.created_at  := now();
  IF NEW.tx_date IS NULL THEN
    NEW.tx_date := (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date;
  END IF;
  RETURN NEW;
END $stamp$;

DROP TRIGGER IF EXISTS wakala_tx_stamp ON wakala_tx;
CREATE TRIGGER wakala_tx_stamp BEFORE INSERT ON wakala_tx
  FOR EACH ROW EXECUTE FUNCTION dl_wakala_stamp();


-- 6b. Kinga #5: siku iliyofungwa haipokei muamala mpya.
--     Pia: rejesho lazima liwe la biashara hiyo hiyo.
CREATE OR REPLACE FUNCTION dl_wakala_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $guard$
DECLARE v_biz UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM wakala_days
              WHERE business_id = NEW.business_id AND day = NEW.tx_date) THEN
    RAISE EXCEPTION 'Siku ya % imefungwa tayari. Muamala mpya hauwezi kuingia.', NEW.tx_date
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.reverses IS NOT NULL THEN
    SELECT business_id INTO v_biz FROM wakala_tx WHERE id = NEW.reverses;
    IF v_biz IS NULL OR v_biz <> NEW.business_id THEN
      RAISE EXCEPTION 'Muamala unaorekebishwa haupo kwenye biashara hii.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.line_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM wakala_lines
                      WHERE id = NEW.line_id AND business_id = NEW.business_id) THEN
    RAISE EXCEPTION 'Laini hiyo haipo kwenye biashara hii.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $guard$;

DROP TRIGGER IF EXISTS wakala_tx_guard ON wakala_tx;
CREATE TRIGGER wakala_tx_guard BEFORE INSERT ON wakala_tx
  FOR EACH ROW EXECUTE FUNCTION dl_wakala_guard();


-- ============================================================
-- 7. HESABU ZA SERVER
--    Zile zile za src/utils/wakala.js, lakini upande wa database —
--    kwa sababu upatanisho hauwezi kutegemea kivinjari.
-- ============================================================

-- Alama za taslimu na float kwa kila aina
CREATE OR REPLACE FUNCTION dl_wakala_sign(p_type TEXT, p_what TEXT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $sign$
  SELECT CASE WHEN p_what = 'cash' THEN
           CASE p_type WHEN 'deposit' THEN 1 WHEN 'withdraw' THEN -1
                       WHEN 'float_buy' THEN -1 WHEN 'float_sell' THEN 1
                       WHEN 'cash_in' THEN 1 WHEN 'cash_out' THEN -1 ELSE 0 END
         ELSE
           CASE p_type WHEN 'deposit' THEN -1 WHEN 'withdraw' THEN 1
                       WHEN 'float_buy' THEN 1 WHEN 'float_sell' THEN -1
                       ELSE 0 END
         END;
$sign$;

-- Float ya kuanzia siku: iliyohesabiwa HALISI siku ya mwisho
-- kufungwa (si inayotarajiwa — ukweli ni unaoendelea mbele),
-- au opening_float ya laini kama hakuna siku iliyofungwa.
CREATE OR REPLACE FUNCTION dl_wakala_opening_float(p_line UUID, p_day DATE)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $opfloat$
DECLARE v_biz UUID; v_val NUMERIC;
BEGIN
  SELECT business_id INTO v_biz FROM wakala_lines WHERE id = p_line;
  IF v_biz IS NULL THEN RETURN 0; END IF;

  SELECT (lines -> p_line::text ->> 'counted')::numeric INTO v_val
    FROM wakala_days
   WHERE business_id = v_biz AND day < p_day AND lines ? p_line::text
   ORDER BY day DESC LIMIT 1;

  IF v_val IS NOT NULL THEN RETURN v_val; END IF;
  SELECT opening_float INTO v_val FROM wakala_lines WHERE id = p_line;
  RETURN COALESCE(v_val, 0);
END $opfloat$;

CREATE OR REPLACE FUNCTION dl_wakala_opening_cash(p_biz UUID, p_day DATE)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $opcash$
DECLARE v_val NUMERIC;
BEGIN
  SELECT counted_cash INTO v_val FROM wakala_days
   WHERE business_id = p_biz AND day < p_day ORDER BY day DESC LIMIT 1;
  IF v_val IS NOT NULL THEN RETURN v_val; END IF;
  SELECT cash_opening INTO v_val FROM wakala_settings WHERE business_id = p_biz;
  RETURN COALESCE(v_val, 0);
END $opcash$;


-- ============================================================
-- 8. KUFUNGA SIKU — hapa upotevu unakamatwa
--
--    MUHIMU: `expected` inahesabiwa HAPA, baada ya `counted`
--    kufika. Wakala haoni jibu kabla ya kuhesabu. Akiona,
--    atalinakili, na upatanisho unakuwa mapambo tu.
--
--    p_counted: {"<line_id>": 480000, "<line_id>": 212500}
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_close_day(
  p_biz UUID, p_day DATE, p_counted JSONB, p_counted_cash NUMERIC, p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $close$
DECLARE
  v_lines JSONB := '{}'::jsonb;
  v_line  RECORD;
  v_open NUMERIC; v_exp NUMERIC; v_cnt NUMERIC;
  v_vfloat NUMERIC := 0;
  v_exp_cash NUMERIC; v_comm NUMERIC; v_n INT;
  v_row wakala_days;
BEGIN
  IF p_biz IS NULL OR p_day IS NULL THEN
    RAISE EXCEPTION 'Biashara na tarehe zinahitajika.';
  END IF;

  -- Mtu wa biashara hiyo pekee
  IF dl_my_role() <> 'admin' AND dl_my_business() <> p_biz THEN
    RAISE EXCEPTION 'Hauna ruhusa kwenye biashara hii.';
  END IF;

  IF EXISTS (SELECT 1 FROM wakala_days WHERE business_id = p_biz AND day = p_day) THEN
    RAISE EXCEPTION 'Siku ya % imefungwa tayari.', p_day
      USING ERRCODE = 'unique_violation';
  END IF;

  FOR v_line IN SELECT id FROM wakala_lines WHERE business_id = p_biz AND active LOOP
    v_open := dl_wakala_opening_float(v_line.id, p_day);
    SELECT v_open + COALESCE(SUM(
             CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
             * dl_wakala_sign(type, 'float') * amount), 0)
      INTO v_exp
      FROM wakala_tx
     WHERE business_id = p_biz AND tx_date = p_day AND line_id = v_line.id;

    v_cnt := COALESCE((p_counted ->> v_line.id::text)::numeric, v_exp);
    v_vfloat := v_vfloat + (v_cnt - v_exp);
    v_lines := v_lines || jsonb_build_object(v_line.id::text, jsonb_build_object(
      'opening', v_open, 'expected', v_exp, 'counted', v_cnt, 'variance', v_cnt - v_exp));
  END LOOP;

  SELECT dl_wakala_opening_cash(p_biz, p_day) + COALESCE(SUM(
           CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
           * dl_wakala_sign(type, 'cash') * amount), 0),
         COALESCE(SUM(CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
                      * CASE WHEN type IN ('deposit','withdraw') THEN commission ELSE 0 END), 0),
         COUNT(*)
    INTO v_exp_cash, v_comm, v_n
    FROM wakala_tx
   WHERE business_id = p_biz AND tx_date = p_day;

  INSERT INTO wakala_days (business_id, day, lines, counted_cash, expected_cash,
                           variance_cash, variance_float, commission, tx_count, note, closed_by)
  VALUES (p_biz, p_day, v_lines, COALESCE(p_counted_cash, 0), v_exp_cash,
          COALESCE(p_counted_cash, 0) - v_exp_cash, v_vfloat, v_comm, v_n, p_note, auth.uid())
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $close$;


-- ============================================================
SELECT 'Sehemu 2/10 SAWA — kinga na hesabu zipo.' AS status;


-- ####################  SEHEMU 3 / 10  ####################

-- ============================================================
-- 0. WASAIDIZI WA KINGA — hutengenezwa TU kama hawapo
--
-- Kinga zote hapa chini zinamtambua mtumiaji kwa dl_my_role() na
-- dl_my_business(). Kama tayari unazo (rls-hatua-1-maandalizi.sql),
-- hii HAIZIGUSI hata kidogo — zinabaki kama zilivyo.
-- Kama hazipo, uwakala unazitengeneza zake ili ujitegemee.
-- ============================================================
DO $boot$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                  WHERE n.nspname='public' AND p.proname='dl_my_business') THEN
    EXECUTE $f$
      CREATE FUNCTION dl_my_business()
      RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public AS $b$
        SELECT COALESCE(
          (SELECT u.business_id FROM users u
            WHERE u.id = auth.uid() AND u.business_id IS NOT NULL LIMIT 1),
          (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid() LIMIT 1)
        )
      $b$ $f$;
    RAISE NOTICE 'dl_my_business() imetengenezwa';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                  WHERE n.nspname='public' AND p.proname='dl_my_role') THEN
    EXECUTE $f$
      CREATE FUNCTION dl_my_role()
      RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public AS $r$
        SELECT COALESCE(
          (SELECT u.role FROM users u WHERE u.id = auth.uid() LIMIT 1),
          (SELECT 'office' FROM businesses b WHERE b.owner_id = auth.uid() LIMIT 1)
        )
      $r$ $f$;
    RAISE NOTICE 'dl_my_role() imetengenezwa';
  END IF;
END $boot$;

-- Ruhusa — zikikosekana (database ya majaribio) isisimamishe script
DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_my_business(), dl_my_role() TO authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_my_business(), dl_my_role() TO anon';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;
-- 9. KINGA (RLS)
--
--    Wakala: anaona na ANDIKA pekee. HAWEZI kufuta wala
--            kubadilisha — hapo ndipo mwanya mkubwa ulipo.
--    Mmiliki: kila kitu cha biashara yake.
--    Admin: kila kitu.
-- ============================================================
ALTER TABLE wakala_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wakala_tx       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wakala_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wakala_settings ENABLE ROW LEVEL SECURITY;

-- ---- laini: wote wanaona, mmiliki pekee anaweka ----
DROP POLICY IF EXISTS wakala_lines_read ON wakala_lines;
CREATE POLICY wakala_lines_read ON wakala_lines FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin' OR business_id = dl_my_business());

DROP POLICY IF EXISTS wakala_lines_write ON wakala_lines;
CREATE POLICY wakala_lines_write ON wakala_lines FOR ALL TO authenticated
  USING (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()))
  WITH CHECK (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()));

-- ---- miamala ----
DROP POLICY IF EXISTS wakala_tx_read ON wakala_tx;
CREATE POLICY wakala_tx_read ON wakala_tx FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin' OR business_id = dl_my_business());

DROP POLICY IF EXISTS wakala_tx_insert ON wakala_tx;
CREATE POLICY wakala_tx_insert ON wakala_tx FOR INSERT TO authenticated
  WITH CHECK (business_id = dl_my_business());

-- Kinga #3: mmiliki na admin PEKEE wanabadilisha au kufuta.
-- Wakala anarekebisha kwa REJESHO, si kwa kufuta.
DROP POLICY IF EXISTS wakala_tx_update ON wakala_tx;
CREATE POLICY wakala_tx_update ON wakala_tx FOR UPDATE TO authenticated
  USING (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()))
  WITH CHECK (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()));

DROP POLICY IF EXISTS wakala_tx_delete ON wakala_tx;
CREATE POLICY wakala_tx_delete ON wakala_tx FOR DELETE TO authenticated
  USING (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()));

-- ---- siku zilizofungwa: kuona wote, kuandika kwa function pekee ----
DROP POLICY IF EXISTS wakala_days_read ON wakala_days;
CREATE POLICY wakala_days_read ON wakala_days FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin' OR business_id = dl_my_business());

-- Kufungua siku iliyofungwa (mmiliki akikubali kosa lilifanyika)
DROP POLICY IF EXISTS wakala_days_owner ON wakala_days;
CREATE POLICY wakala_days_owner ON wakala_days FOR DELETE TO authenticated
  USING (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()));

-- ---- mipangilio: mmiliki pekee ----
DROP POLICY IF EXISTS wakala_settings_read ON wakala_settings;
CREATE POLICY wakala_settings_read ON wakala_settings FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin' OR business_id = dl_my_business());

DROP POLICY IF EXISTS wakala_settings_write ON wakala_settings;
CREATE POLICY wakala_settings_write ON wakala_settings FOR ALL TO authenticated
  USING (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()))
  WITH CHECK (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()));

GRANT EXECUTE ON FUNCTION dl_wakala_close_day(UUID, DATE, JSONB, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION dl_wakala_opening_float(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION dl_wakala_opening_cash(UUID, DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'Jedwali la uwakala limetengenezwa. Huduma imezimwa hadi admin aiwashe.' AS status;


-- ####################  SEHEMU 4 / 10  ####################

-- ============================================================
-- DukaLangu — KAZI YA MFANYAKAZI (duka / uwakala / zote)
--
--
-- Maduka mengi hupenda akaunti ziwe TOFAUTI: mmoja anauza dukani,
-- mwingine anafanya uwakala. Kuunganisha ni HIARI.
--
-- ⚠️ Kuficha menyu HAKUTOSHI. Mfanyakazi wa duka pekee akitumia
--    DevTools anaweza kuomba miamala ya uwakala moja kwa moja.
--    Kwa hiyo kizuizi kiko hapa, kwenye database.
--
-- Wafanyakazi wote waliopo sasa wanakuwa 'duka' — hakuna
-- anayebadilika, na hakuna anayepoteza kitu.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS kazi TEXT NOT NULL DEFAULT 'duka';

DO $k$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_kazi_ok') THEN
    ALTER TABLE users ADD CONSTRAINT users_kazi_ok
      CHECK (kazi IN ('duka','wakala','zote'));
  END IF;
END $k$;

-- Rekodi za zamani zenye NULL (kama safu ilikuwepo tayari)
UPDATE users SET kazi = 'duka' WHERE kazi IS NULL;


-- ============================================================
-- Kazi ya mtumiaji aliyeingia.
-- Mmiliki na admin hawana kizuizi — wanaona kila walicholipia.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_my_kazi()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $kz$
  SELECT COALESCE(
    (SELECT CASE WHEN u.role IN ('office','admin') THEN 'zote'
                 ELSE COALESCE(u.kazi,'duka') END
       FROM users u WHERE u.id = auth.uid() LIMIT 1),
    -- Mmiliki asiye na safu kwenye users
    (SELECT 'zote' FROM businesses b WHERE b.owner_id = auth.uid() LIMIT 1),
    'duka'
  )
$kz$;

-- Je mtumiaji huyu anaruhusiwa kugusa uwakala?
CREATE OR REPLACE FUNCTION dl_does_wakala()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $dw$
  SELECT dl_my_kazi() IN ('wakala','zote')
$dw$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_my_kazi(), dl_does_wakala() TO authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_my_kazi(), dl_does_wakala() TO anon';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;


-- ============================================================
-- KINGA: mfanyakazi wa duka pekee HAGUSI uwakala
--
-- Mmiliki (office) na admin wanapita kama kawaida — dl_my_kazi()
-- inawarudishia 'zote'.
-- ============================================================
DROP POLICY IF EXISTS wakala_tx_read ON wakala_tx;
CREATE POLICY wakala_tx_read ON wakala_tx FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin'
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_tx_insert ON wakala_tx;
CREATE POLICY wakala_tx_insert ON wakala_tx FOR INSERT TO authenticated
  WITH CHECK (business_id = dl_my_business() AND dl_does_wakala());

DROP POLICY IF EXISTS wakala_lines_read ON wakala_lines;
CREATE POLICY wakala_lines_read ON wakala_lines FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin'
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_days_read ON wakala_days;
CREATE POLICY wakala_days_read ON wakala_days FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin'
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_settings_read ON wakala_settings;
CREATE POLICY wakala_settings_read ON wakala_settings FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin'
         OR (business_id = dl_my_business() AND dl_does_wakala()));


-- ============================================================
-- Kufunga siku pia ni kazi ya uwakala
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_close_day(
  p_biz UUID, p_day DATE, p_counted JSONB, p_counted_cash NUMERIC, p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $close$
DECLARE
  v_lines JSONB := '{}'::jsonb;
  v_line  RECORD;
  v_open NUMERIC; v_exp NUMERIC; v_cnt NUMERIC;
  v_vfloat NUMERIC := 0;
  v_exp_cash NUMERIC; v_comm NUMERIC; v_n INT;
  v_row wakala_days;
BEGIN
  IF p_biz IS NULL OR p_day IS NULL THEN
    RAISE EXCEPTION 'Biashara na tarehe zinahitajika.';
  END IF;

  IF NOT dl_wakala_may_close(p_biz) THEN
    RAISE EXCEPTION 'Hauna ruhusa ya kufunga siku ya uwakala kwenye duka hili.';
  END IF;

  IF EXISTS (SELECT 1 FROM wakala_days WHERE business_id = p_biz AND day = p_day) THEN
    RAISE EXCEPTION 'Siku ya % imefungwa tayari.', p_day
      USING ERRCODE = 'unique_violation';
  END IF;

  FOR v_line IN SELECT id FROM wakala_lines WHERE business_id = p_biz AND active LOOP
    v_open := dl_wakala_opening_float(v_line.id, p_day);
    SELECT v_open + COALESCE(SUM(
             CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
             * dl_wakala_sign(type, 'float') * amount), 0)
      INTO v_exp
      FROM wakala_tx
     WHERE business_id = p_biz AND tx_date = p_day AND line_id = v_line.id;

    v_cnt := COALESCE((p_counted ->> v_line.id::text)::numeric, v_exp);
    v_vfloat := v_vfloat + (v_cnt - v_exp);
    v_lines := v_lines || jsonb_build_object(v_line.id::text, jsonb_build_object(
      'opening', v_open, 'expected', v_exp, 'counted', v_cnt, 'variance', v_cnt - v_exp));
  END LOOP;

  SELECT dl_wakala_opening_cash(p_biz, p_day) + COALESCE(SUM(
           CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
           * dl_wakala_sign(type, 'cash') * amount), 0),
         COALESCE(SUM(CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
                      * CASE WHEN type IN ('deposit','withdraw') THEN commission ELSE 0 END), 0),
         COUNT(*)
    INTO v_exp_cash, v_comm, v_n
    FROM wakala_tx
   WHERE business_id = p_biz AND tx_date = p_day;

  INSERT INTO wakala_days (business_id, day, lines, counted_cash, expected_cash,
                           variance_cash, variance_float, commission, tx_count, note, closed_by)
  VALUES (p_biz, p_day, v_lines, COALESCE(p_counted_cash, 0), v_exp_cash,
          COALESCE(p_counted_cash, 0) - v_exp_cash, v_vfloat, v_comm, v_n, p_note, auth.uid())
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $close$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_close_day(UUID, DATE, JSONB, NUMERIC, TEXT) TO authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 4/10 SAWA — kazi ya mfanyakazi imewekwa. Wote waliopo ni wa duka.' AS status;


-- ============================================================
-- MMILIKI HALISI DAIMA ANARUHUSIWA
--
-- Kinga za awali zilimtambua mtu kwa safu yake kwenye `users`.
-- Maduka mengi yaliyosajiliwa na mawakala hayana safu hiyo
-- iliyokamilika, kwa hiyo mmiliki alikataliwa kwenye duka LAKE
-- MWENYEWE: "new row violates row-level security policy".
--
-- Sasa anayemiliki duka (businesses.owner_id) anapita bila shaka.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_owns(p_biz UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $ow$
  SELECT EXISTS (SELECT 1 FROM businesses b
                  WHERE b.id = p_biz AND b.owner_id = auth.uid())
$ow$;

-- Msimamizi wa uwakala: admin, au mmiliki wa duka hilo
CREATE OR REPLACE FUNCTION dl_wakala_boss(p_biz UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $bs$
  SELECT dl_my_role() = 'admin'
      OR dl_owns(p_biz)
      OR (dl_my_role() = 'office' AND p_biz = dl_my_business())
$bs$;

-- Nani ameingia? Hutumika kuonyesha sababu halisi ukikataliwa.
CREATE OR REPLACE FUNCTION dl_whoami()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $wi$
  SELECT jsonb_build_object(
    'uid',        auth.uid(),
    'safu_users', EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()),
    'role',       dl_my_role(),
    'kazi',       dl_my_kazi(),
    'business',   dl_my_business(),
    'anamiliki',  (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid() LIMIT 1)
  )
$wi$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_owns(UUID), dl_wakala_boss(UUID), dl_whoami() TO authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

-- ---------- Kinga zilizolegezwa kwa mmiliki ----------
DROP POLICY IF EXISTS wakala_lines_write ON wakala_lines;
CREATE POLICY wakala_lines_write ON wakala_lines FOR ALL TO authenticated
  USING (dl_wakala_boss(business_id)) WITH CHECK (dl_wakala_boss(business_id));

DROP POLICY IF EXISTS wakala_lines_read ON wakala_lines;
CREATE POLICY wakala_lines_read ON wakala_lines FOR SELECT TO authenticated
  USING (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_settings_write ON wakala_settings;
CREATE POLICY wakala_settings_write ON wakala_settings FOR ALL TO authenticated
  USING (dl_wakala_boss(business_id)) WITH CHECK (dl_wakala_boss(business_id));

DROP POLICY IF EXISTS wakala_settings_read ON wakala_settings;
CREATE POLICY wakala_settings_read ON wakala_settings FOR SELECT TO authenticated
  USING (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_tx_read ON wakala_tx;
CREATE POLICY wakala_tx_read ON wakala_tx FOR SELECT TO authenticated
  USING (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_tx_insert ON wakala_tx;
CREATE POLICY wakala_tx_insert ON wakala_tx FOR INSERT TO authenticated
  WITH CHECK (dl_wakala_boss(business_id)
              OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_tx_update ON wakala_tx;
CREATE POLICY wakala_tx_update ON wakala_tx FOR UPDATE TO authenticated
  USING (dl_wakala_boss(business_id)) WITH CHECK (dl_wakala_boss(business_id));

DROP POLICY IF EXISTS wakala_tx_delete ON wakala_tx;
CREATE POLICY wakala_tx_delete ON wakala_tx FOR DELETE TO authenticated
  USING (dl_wakala_boss(business_id));

DROP POLICY IF EXISTS wakala_days_read ON wakala_days;
CREATE POLICY wakala_days_read ON wakala_days FOR SELECT TO authenticated
  USING (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_days_owner ON wakala_days;
CREATE POLICY wakala_days_owner ON wakala_days FOR DELETE TO authenticated
  USING (dl_wakala_boss(business_id));

-- Kufunga siku: mmiliki au mwenye kazi ya uwakala
CREATE OR REPLACE FUNCTION dl_wakala_may_close(p_biz UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $mc$
  SELECT dl_wakala_boss(p_biz)
      OR (p_biz = dl_my_business() AND dl_does_wakala())
$mc$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_may_close(UUID) TO authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';
SELECT 'Kinga zimelegezwa: mmiliki halisi wa duka daima anaruhusiwa.' AS status;


-- ####################  SEHEMU 5 / 10  ####################

-- ============================================================
-- DukaLangu — GHARAMA ZA UWAKALA
--
--
-- Kamisheni si faida. Mwenye uwakala analipa kodi, umeme, bando,
-- usafiri wa kufuata float, mshahara. Bila kuandika gharama hizi
-- mmiliki anaona "kamisheni 150,000" na kudhani amepata 150,000.
--
-- ⚠️ JAMBO LA MSINGI: gharama ikilipwa kwa TASLIMU ya uwakala,
--    LAZIMA ipunguze kasheni pia. Ukiirekodi upande mmoja tu,
--    mwisho wa siku kasheni itakuwa pungufu na mfumo utaonyesha
--    UPUNGUFU — yaani utamshtaki wakala kwa wizi ambao haukutokea.
--
--    Kwa hiyo gharama na muamala wa `cash_out` vinaandikwa KWA
--    PAMOJA, ndani ya muamala mmoja wa database. Ikishindikana
--    kimoja, hakuna kinachoandikwa.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

CREATE TABLE IF NOT EXISTS wakala_expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tarehe       DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,
  aina         TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  chanzo       TEXT NOT NULL DEFAULT 'taslimu',
  maelezo      TEXT,
  -- Muamala wa kasheni unaoambatana nayo (kama imelipwa kwa taslimu)
  tx_id        UUID REFERENCES wakala_tx(id) ON DELETE SET NULL,
  offline_id   TEXT,
  recorded_by  UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wakala_exp_aina_ok CHECK (aina IN (
    'kodi','umeme','maji','mtandao','mshahara','usafiri',
    'ada_float','vifaa','ulinzi','leseni','matengenezo','nyingine')),
  CONSTRAINT wakala_exp_amount_ok CHECK (amount > 0),
  CONSTRAINT wakala_exp_chanzo_ok CHECK (chanzo IN ('taslimu','nje'))
);

CREATE INDEX IF NOT EXISTS wakala_exp_biz  ON wakala_expenses (business_id, tarehe DESC);
CREATE INDEX IF NOT EXISTS wakala_exp_aina ON wakala_expenses (business_id, aina);

-- Gharama moja haiingii mara mbili (mtandao hafifu)
CREATE UNIQUE INDEX IF NOT EXISTS wakala_exp_offline_uniq
  ON wakala_expenses (business_id, offline_id) WHERE offline_id IS NOT NULL;


-- ============================================================
-- KUANDIKA GHARAMA
--
-- Chanzo 'taslimu' -> inaandika pia muamala wa cash_out, kwa hiyo
--                     kasheni inapungua na upatanisho unabaki sahihi.
-- Chanzo 'nje'     -> kasheni haibadiliki hata kidogo.
--
-- Vyote viwili ndani ya muamala MMOJA. Hakuna nusu-nusu.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_add_expense(
  p_biz UUID, p_tarehe DATE, p_aina TEXT, p_amount NUMERIC,
  p_chanzo TEXT DEFAULT 'taslimu', p_maelezo TEXT DEFAULT NULL,
  p_offline_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $exp$
DECLARE
  v_tx  UUID;
  v_row wakala_expenses;
  v_day DATE := COALESCE(p_tarehe, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date);
BEGIN
  IF NOT dl_wakala_may_close(p_biz) THEN
    RAISE EXCEPTION 'Hauna ruhusa ya kuandika gharama za uwakala kwenye duka hili.';
  END IF;

  IF COALESCE(p_amount,0) <= 0 THEN
    RAISE EXCEPTION 'Weka kiasi sahihi kinachozidi sifuri.';
  END IF;

  -- Gharama iliyolipwa kwa taslimu LAZIMA ipunguze kasheni.
  -- Trigger ya wakala_tx itakataa kama siku imefungwa — ni sawa:
  -- siku iliyofungwa haipaswi kubadilika.
  IF COALESCE(p_chanzo,'taslimu') = 'taslimu' THEN
    INSERT INTO wakala_tx(business_id, tx_date, type, amount, note, offline_id)
    VALUES (p_biz, v_day, 'cash_out', p_amount,
            COALESCE(p_maelezo, 'Gharama: ' || p_aina),
            CASE WHEN p_offline_id IS NULL THEN NULL ELSE 'exp-' || p_offline_id END)
    RETURNING id INTO v_tx;
  END IF;

  INSERT INTO wakala_expenses(business_id, tarehe, aina, amount, chanzo,
                              maelezo, tx_id, offline_id, recorded_by)
  VALUES (p_biz, v_day, p_aina, p_amount, COALESCE(p_chanzo,'taslimu'),
          p_maelezo, v_tx, p_offline_id, auth.uid())
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $exp$;


-- ============================================================
-- KUFUTA GHARAMA
-- Muamala wa kasheni unaoambatana nayo unafutwa pia — vinginevyo
-- kasheni ingebaki pungufu milele.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_del_expense(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $del$
DECLARE v_row wakala_expenses;
BEGIN
  SELECT * INTO v_row FROM wakala_expenses WHERE id = p_id;
  IF v_row.id IS NULL THEN RETURN false; END IF;

  -- Mmiliki pekee anafuta. Wakala akikosea, anaandika nyingine.
  IF NOT dl_wakala_boss(v_row.business_id) THEN
    RAISE EXCEPTION 'Mmiliki pekee ndiye anaweza kufuta gharama.';
  END IF;

  IF EXISTS (SELECT 1 FROM wakala_days
              WHERE business_id = v_row.business_id AND day = v_row.tarehe) THEN
    RAISE EXCEPTION 'Siku ya % imefungwa. Fungua siku kwanza.', v_row.tarehe;
  END IF;

  DELETE FROM wakala_expenses WHERE id = p_id;
  IF v_row.tx_id IS NOT NULL THEN
    DELETE FROM wakala_tx WHERE id = v_row.tx_id;
  END IF;
  RETURN true;
END $del$;


-- ============================================================
-- MUHTASARI KWA MMILIKI
-- Kamisheni, gharama na FAIDA HALISI kwa kipindi.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_muhtasari(p_biz UUID, p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $mh$
  SELECT jsonb_build_object(
    'kamisheni', COALESCE((
      SELECT SUM(CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
                 * CASE WHEN type IN ('deposit','withdraw') THEN commission ELSE 0 END)
        FROM wakala_tx
       WHERE business_id = p_biz AND tx_date BETWEEN p_from AND p_to), 0),
    'gharama', COALESCE((
      SELECT SUM(amount) FROM wakala_expenses
       WHERE business_id = p_biz AND tarehe BETWEEN p_from AND p_to), 0),
    'gharamaTaslimu', COALESCE((
      SELECT SUM(amount) FROM wakala_expenses
       WHERE business_id = p_biz AND tarehe BETWEEN p_from AND p_to
         AND chanzo = 'taslimu'), 0),
    'kwaAina', COALESCE((
      SELECT jsonb_object_agg(aina, jumla) FROM (
        SELECT aina, SUM(amount) AS jumla FROM wakala_expenses
         WHERE business_id = p_biz AND tarehe BETWEEN p_from AND p_to
         GROUP BY aina) q), '{}'::jsonb)
  )
$mh$;


-- ============================================================
-- KINGA
-- Kuona: mmiliki, au mwenye kazi ya uwakala.
-- Kuandika/kufuta: kupitia function pekee (zina ukaguzi wake).
-- ============================================================
ALTER TABLE wakala_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wakala_exp_read ON wakala_expenses;
CREATE POLICY wakala_exp_read ON wakala_expenses FOR SELECT TO authenticated
  USING (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_exp_write ON wakala_expenses;
CREATE POLICY wakala_exp_write ON wakala_expenses FOR ALL TO authenticated
  USING (dl_wakala_boss(business_id)) WITH CHECK (dl_wakala_boss(business_id));

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_add_expense(UUID,DATE,TEXT,NUMERIC,TEXT,TEXT,TEXT),
                 dl_wakala_del_expense(UUID), dl_wakala_muhtasari(UUID,DATE,DATE) TO authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 5/10 SAWA — gharama za uwakala zimewekwa.' AS status;


-- ####################  SEHEMU 6 / 10  ####################

-- ============================================================
-- DukaLangu — UWAKALA NA GATEWAY (Abliner, Beem, Snippe)
--
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

SELECT 'Sehemu 6/10 SAWA — gateway za uwakala zimeunganishwa.' AS status;


-- ####################  SEHEMU 7 / 10  ####################

-- ============================================================
-- DukaLangu — UKAGUZI WA GHAFLA
--
--
-- MicroSave imeorodhesha njia moja ya wizi ambayo upatanisho wa
-- kawaida HAUWEZI kuikamata: wafanyakazi wa maduka tofauti
-- wanakopeshana pesa wakati mmiliki anapokagua, ili tofauti
-- isionekane. Kinga pekee inayopendekezwa ni UKAGUZI USIOTANGAZWA.
--
-- Hivyo ndivyo hii inavyofanya kazi:
--   1. Mmiliki anabonyeza kitufe akiwa popote alipo
--   2. Wakala anapata ujumbe: hesabu float na taslimu SASA HIVI
--   3. Ana dakika chache; mfumo unarekodi muda aliotumia
--   4. Tofauti inahesabiwa HAPA, baada ya kuandika alichohesabu
--
-- Hauhusiani na kufunga siku. Siku inabaki wazi, miamala
-- inaendelea. Ni picha ya papo hapo pekee.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

CREATE TABLE IF NOT EXISTS wakala_checks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day           DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,
  requested_by  UUID,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 minutes',
  -- Majibu
  answered_by   UUID,
  answered_at   TIMESTAMPTZ,
  lines         JSONB NOT NULL DEFAULT '{}'::jsonb,
  counted_cash   NUMERIC(14,2),
  expected_cash  NUMERIC(14,2),
  variance_cash  NUMERIC(14,2),
  variance_float NUMERIC(14,2),
  dakika        NUMERIC(6,2),
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT wakala_check_status_ok CHECK (status IN ('pending','done','expired'))
);

CREATE INDEX IF NOT EXISTS wakala_checks_biz ON wakala_checks (business_id, requested_at DESC);

-- Ukaguzi MMOJA unaosubiri kwa wakati mmoja. Bila hii, mmiliki
-- angeweza kubonyeza mara kumi na wakala asijue anajibu lipi.
CREATE UNIQUE INDEX IF NOT EXISTS wakala_checks_moja
  ON wakala_checks (business_id) WHERE status = 'pending';


-- ============================================================
-- Kuomba ukaguzi (mmiliki pekee)
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_check_open(p_biz UUID, p_dakika INT DEFAULT 15)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $ck$
DECLARE v_row wakala_checks;
BEGIN
  IF NOT dl_wakala_boss(p_biz) THEN
    RAISE EXCEPTION 'Mmiliki pekee ndiye anaweza kuomba ukaguzi.';
  END IF;

  -- Ukaguzi uliopita muda wake unafungwa kwanza
  UPDATE wakala_checks SET status = 'expired'
   WHERE business_id = p_biz AND status = 'pending' AND deadline < now();

  INSERT INTO wakala_checks (business_id, requested_by, deadline)
  VALUES (p_biz, auth.uid(), now() + (GREATEST(COALESCE(p_dakika,15), 5) || ' minutes')::interval)
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Kuna ukaguzi unaosubiri majibu tayari.';
END $ck$;


-- ============================================================
-- Kujibu ukaguzi
--
-- Hesabu inafanyika HAPA, baada ya `counted` kufika — kanuni ile
-- ile ya kufunga siku. Wakala haoni inayotarajiwa kabla.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_check_answer(
  p_id UUID, p_counted JSONB, p_counted_cash NUMERIC, p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $ca$
DECLARE
  v_chk wakala_checks;
  v_line RECORD;
  v_open NUMERIC; v_exp NUMERIC; v_cnt NUMERIC;
  v_vfloat NUMERIC := 0;
  v_lines JSONB := '{}'::jsonb;
  v_exp_cash NUMERIC;
BEGIN
  SELECT * INTO v_chk FROM wakala_checks WHERE id = p_id;
  IF v_chk.id IS NULL THEN RAISE EXCEPTION 'Ukaguzi haujapatikana.'; END IF;
  IF v_chk.status <> 'pending' THEN RAISE EXCEPTION 'Ukaguzi huu umekwisha jibiwa.'; END IF;

  IF NOT dl_wakala_may_close(v_chk.business_id) THEN
    RAISE EXCEPTION 'Hauna ruhusa kwenye uwakala wa duka hili.';
  END IF;

  -- Float inayotarajiwa SASA HIVI, kwa miamala ya siku hadi dakika hii
  FOR v_line IN SELECT id FROM wakala_lines
                 WHERE business_id = v_chk.business_id AND active LOOP
    v_open := dl_wakala_opening_float(v_line.id, v_chk.day);
    SELECT v_open + COALESCE(SUM(
             CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
             * dl_wakala_sign(type, 'float') * amount), 0)
      INTO v_exp
      FROM wakala_tx
     WHERE business_id = v_chk.business_id AND tx_date = v_chk.day
       AND line_id = v_line.id AND created_at <= now();

    v_cnt := COALESCE((p_counted ->> v_line.id::text)::numeric, v_exp);
    v_vfloat := v_vfloat + (v_cnt - v_exp);
    v_lines := v_lines || jsonb_build_object(v_line.id::text, jsonb_build_object(
      'expected', v_exp, 'counted', v_cnt, 'variance', v_cnt - v_exp));
  END LOOP;

  SELECT dl_wakala_opening_cash(v_chk.business_id, v_chk.day) + COALESCE(SUM(
           CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
           * dl_wakala_sign(type, 'cash') * amount), 0)
    INTO v_exp_cash
    FROM wakala_tx
   WHERE business_id = v_chk.business_id AND tx_date = v_chk.day AND created_at <= now();

  UPDATE wakala_checks SET
    answered_by = auth.uid(), answered_at = now(),
    lines = v_lines,
    counted_cash = COALESCE(p_counted_cash, 0),
    expected_cash = v_exp_cash,
    variance_cash = COALESCE(p_counted_cash, 0) - v_exp_cash,
    variance_float = v_vfloat,
    dakika = ROUND(EXTRACT(epoch FROM (now() - requested_at)) / 60.0, 2),
    note = p_note,
    -- Aliyechelewa anarekodiwa kuwa amechelewa, lakini jibu lake linahifadhiwa
    status = CASE WHEN now() > deadline THEN 'expired' ELSE 'done' END
  WHERE id = p_id
  RETURNING * INTO v_chk;

  RETURN to_jsonb(v_chk);
END $ca$;


-- ============================================================
-- KINGA
-- Kuona na kujibu: mmiliki na mwenye kazi ya uwakala.
-- Kuomba na kufuta: mmiliki pekee (ndani ya function).
-- ============================================================
ALTER TABLE wakala_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wakala_checks_read ON wakala_checks;
CREATE POLICY wakala_checks_read ON wakala_checks FOR SELECT TO authenticated
  USING (dl_wakala_boss(business_id)
         OR (business_id = dl_my_business() AND dl_does_wakala()));

DROP POLICY IF EXISTS wakala_checks_boss ON wakala_checks;
CREATE POLICY wakala_checks_boss ON wakala_checks FOR DELETE TO authenticated
  USING (dl_wakala_boss(business_id));

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_check_open(UUID,INT),
                 dl_wakala_check_answer(UUID,JSONB,NUMERIC,TEXT) TO authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 7/10 SAWA — ukaguzi wa ghafla umewekwa.' AS status;


-- ####################  SEHEMU 8 / 10  ####################

-- ============================================================
-- DukaLangu — UCHAMBUZI WA ASUBUHI + GHARAMA ZA WAKALA
--
--
-- 1. Arifa ya asubuhi: mmiliki anapata SMS kila siku saa 12
--    asubuhi yenye uchambuzi wa miamala ya jana. Tofauti na
--    arifa nyingine, hii inakuja HATA KAMA hakuna tatizo —
--    ndiyo maana inaitwa uchambuzi, si onyo. Na inamwambia
--    kama siku HAIKUFUNGWA, jambo ambalo arifa ya kufunga
--    siku haiwezi kumwambia (haikufungwa, haikutumwa).
--
-- 2. Gharama: wakala naye anaandika. Yeye ndiye yupo kibandani,
--    anaona kinachohitajika. Mmiliki anaona za ofisini na za
--    kibandani kwa kutenganishwa, na KUFUTA ni kwake peke yake.
--    (Kuandika kwa wakala tayari kunaruhusiwa na function
--    dl_wakala_add_expense tangu sehemu ya 5 — hapa tunaongeza
--    njia ya kuona nani ameandika nini.)
--
-- Salama kuendesha mara nyingi.
-- ============================================================

ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS arifa_asubuhi BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- Uchambuzi wa siku moja — kila kitu kinachohitajika kwa SMS,
-- kwenye ombi MOJA. Cron inaita hii kwa kila duka.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_uchambuzi(p_biz UUID, p_day DATE)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $uc$
  WITH t AS (
    SELECT * FROM wakala_tx WHERE business_id = p_biz AND tx_date = p_day
  ), g AS (
    SELECT * FROM wakala_expenses WHERE business_id = p_biz AND tarehe = p_day
  ), d AS (
    SELECT * FROM wakala_days WHERE business_id = p_biz AND day = p_day
  )
  SELECT jsonb_build_object(
    'day',        p_day,
    'idadi',      (SELECT count(*) FROM t WHERE reverses IS NULL),
    'marekebisho',(SELECT count(*) FROM t WHERE reverses IS NOT NULL),
    'kuweka',     (SELECT COALESCE(SUM(amount),0) FROM t WHERE type='deposit'  AND reverses IS NULL),
    'kutoa',      (SELECT COALESCE(SUM(amount),0) FROM t WHERE type='withdraw' AND reverses IS NULL),
    'kamisheni',  (SELECT COALESCE(SUM(CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
                     * CASE WHEN type IN ('deposit','withdraw') THEN commission ELSE 0 END),0) FROM t),
    'gharama',    (SELECT COALESCE(SUM(amount),0) FROM g),
    'thibitishwa',(SELECT count(*) FROM t WHERE jina_thibitishwa AND reverses IS NULL
                     AND type IN ('deposit','withdraw')),
    'zaMteja',    (SELECT count(*) FROM t WHERE reverses IS NULL AND type IN ('deposit','withdraw')),
    'imefungwa',  (SELECT count(*) > 0 FROM d),
    'tofautiTaslimu', (SELECT COALESCE(MAX(variance_cash),0) FROM d),
    'tofautiFloat',   (SELECT COALESCE(MAX(variance_float),0) FROM d),
    'float', (
      SELECT COALESCE(jsonb_object_agg(l.name, dl_wakala_opening_float(l.id, p_day)
        + COALESCE((SELECT SUM(CASE WHEN t2.reverses IS NOT NULL THEN -1 ELSE 1 END
            * dl_wakala_sign(t2.type,'float') * t2.amount)
           FROM wakala_tx t2
          WHERE t2.business_id = p_biz AND t2.tx_date = p_day AND t2.line_id = l.id), 0)), '{}'::jsonb)
        FROM wakala_lines l WHERE l.business_id = p_biz AND l.active
    )
  )
$uc$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_uchambuzi(UUID,DATE) TO authenticated, service_role';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 8/10 SAWA — uchambuzi wa asubuhi umewekwa.' AS status;


-- ####################  SEHEMU 9 / 10  ####################

-- ============================================================
-- DukaLangu — AKAUNTI YA UWAKALA PEKEE
--
--
-- Wapo watu wanaotaka kusimamia uwakala pekee, hawana duka.
-- Hawapaswi kuona bidhaa, mauzo wala stock — hata siku ya kwanza.
--
-- `akaunti_aina` ni tofauti na `business_type`:
--   business_type = aina ya DUKA (retail, pharmacy, hardware...)
--   akaunti_aina  = HUDUMA aliyonunua (duka, uwakala, zote)
--
-- Chaguo-msingi ni 'duka', kwa hiyo maduka YOTE yaliyopo
-- hayabadiliki hata kidogo.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS akaunti_aina TEXT NOT NULL DEFAULT 'duka';

DO $a$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_akaunti_aina_ok') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_akaunti_aina_ok
      CHECK (akaunti_aina IN ('duka','uwakala','zote'));
  END IF;
END $a$;

-- Akaunti ya uwakala pekee LAZIMA iwe na huduma imewashwa — vinginevyo
-- mteja aliyejisajili mwenyewe angeingia na kukuta hana chochote.
CREATE OR REPLACE FUNCTION dl_wakala_akaunti_mpya() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $nw$
BEGIN
  IF NEW.akaunti_aina IN ('uwakala','zote') THEN
    NEW.wakala_enabled := true;
  END IF;
  RETURN NEW;
END $nw$;

DROP TRIGGER IF EXISTS businesses_wakala_aina ON businesses;
CREATE TRIGGER businesses_wakala_aina BEFORE INSERT OR UPDATE OF akaunti_aina ON businesses
  FOR EACH ROW EXECUTE FUNCTION dl_wakala_akaunti_mpya();

-- Maduka yaliyokwisha washiwa uwakala kabla ya safu hii kuwepo
UPDATE businesses SET akaunti_aina = 'zote'
 WHERE wakala_enabled AND akaunti_aina = 'duka';

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 9/10 SAWA — akaunti ya uwakala pekee imewezeshwa.' AS status;


-- ####################  SEHEMU 10 / 10  ####################

-- ============================================================
-- DukaLangu — UDHIBITI WA ADMIN KWA ARIFA ZA UWAKALA
--
--
-- Admin anaweza kuzima aina yoyote ya arifa ya uwakala kwa mfumo
-- mzima. Kizuizi kipo kwenye api/send-sms.js, kwa sababu njia zote
-- mbili — app na cron — zinapitia hapo. Mmiliki ataendelea kuona
-- arifa imewashwa kwake, lakini SMS haitatoka.
--
-- Hapa tunaweka funguo zenyewe. Zote zinaanza 'true' ili tabia
-- isibadilike kwa mtu yeyote.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

INSERT INTO settings(key, value) VALUES
  ('wakala_sms_enabled',          'true'),
  ('wakala_tofauti_enabled',      'true'),
  ('wakala_float_enabled',        'true'),
  ('wakala_mkubwa_enabled',       'true'),
  ('wakala_hitimisho_enabled',    'true'),
  ('wakala_asubuhi_enabled',      'true'),
  ('wakala_ukaguzi_enabled',      'true')
ON CONFLICT (key) DO NOTHING;

-- Admin anahitaji kusoma mipangilio ya arifa ya kila duka ili
-- aone nani amewasha nini. Hii ni kusoma TU — hawezi kubadilisha
-- mipangilio ya mmiliki.
DROP POLICY IF EXISTS wakala_settings_admin ON wakala_settings;
CREATE POLICY wakala_settings_admin ON wakala_settings FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin');

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 10/10 SAWA — admin anasimamia arifa za uwakala.' AS status;
