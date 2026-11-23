-- ============================================================
-- DukaLangu — UKAGUZI WA GHAFLA
--
-- Sehemu 7/9. Endesha BAADA ya sehemu 1–6.
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

SELECT 'Sehemu 7/9 SAWA — ukaguzi wa ghafla umewekwa.' AS status;
