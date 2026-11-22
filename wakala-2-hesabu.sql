-- Sehemu 2/5 ya wakala-migration.sql — endesha kwa mpangilio
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
SELECT 'Sehemu 2/5 SAWA — kinga na hesabu zipo.' AS status;
