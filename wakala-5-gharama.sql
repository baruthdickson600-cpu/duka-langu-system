-- ============================================================
-- DukaLangu — GHARAMA ZA UWAKALA
--
-- Sehemu 5/8. Endesha BAADA ya sehemu 1–4.
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

SELECT 'Sehemu 5/8 SAWA — gharama za uwakala zimewekwa.' AS status;
