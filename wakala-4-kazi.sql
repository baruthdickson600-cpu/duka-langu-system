-- ============================================================
-- DukaLangu — KAZI YA MFANYAKAZI (duka / uwakala / zote)
--
-- Sehemu 4/8. Endesha BAADA ya sehemu 1, 2 na 3.
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

SELECT 'Sehemu 4/8 SAWA — kazi ya mfanyakazi imewekwa. Wote waliopo ni wa duka.' AS status;


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
