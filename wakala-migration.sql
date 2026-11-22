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
-- 6. KINGA ZA DATABASE (triggers)
-- ============================================================

-- 6a. recorded_by na created_at vinapigwa chapa na DATABASE, si
--     na kivinjari. Wakala hawezi kuandika muamala kwa jina la
--     mwingine, na hawezi kudanganya saa.
CREATE OR REPLACE FUNCTION dl_wakala_stamp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.recorded_by := auth.uid();
  NEW.created_at  := now();
  IF NEW.tx_date IS NULL THEN
    NEW.tx_date := (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS wakala_tx_stamp ON wakala_tx;
CREATE TRIGGER wakala_tx_stamp BEFORE INSERT ON wakala_tx
  FOR EACH ROW EXECUTE FUNCTION dl_wakala_stamp();


-- 6b. Kinga #5: siku iliyofungwa haipokei muamala mpya.
--     Pia: rejesho lazima liwe la biashara hiyo hiyo.
CREATE OR REPLACE FUNCTION dl_wakala_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;

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
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_what = 'cash' THEN
           CASE p_type WHEN 'deposit' THEN 1 WHEN 'withdraw' THEN -1
                       WHEN 'float_buy' THEN -1 WHEN 'float_sell' THEN 1
                       WHEN 'cash_in' THEN 1 WHEN 'cash_out' THEN -1 ELSE 0 END
         ELSE
           CASE p_type WHEN 'deposit' THEN -1 WHEN 'withdraw' THEN 1
                       WHEN 'float_buy' THEN 1 WHEN 'float_sell' THEN -1
                       ELSE 0 END
         END;
$$;

-- Float ya kuanzia siku: iliyohesabiwa HALISI siku ya mwisho
-- kufungwa (si inayotarajiwa — ukweli ni unaoendelea mbele),
-- au opening_float ya laini kama hakuna siku iliyofungwa.
CREATE OR REPLACE FUNCTION dl_wakala_opening_float(p_line UUID, p_day DATE)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
END $$;

CREATE OR REPLACE FUNCTION dl_wakala_opening_cash(p_biz UUID, p_day DATE)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_val NUMERIC;
BEGIN
  SELECT counted_cash INTO v_val FROM wakala_days
   WHERE business_id = p_biz AND day < p_day ORDER BY day DESC LIMIT 1;
  IF v_val IS NOT NULL THEN RETURN v_val; END IF;
  SELECT cash_opening INTO v_val FROM wakala_settings WHERE business_id = p_biz;
  RETURN COALESCE(v_val, 0);
END $$;


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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;


-- ============================================================
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
