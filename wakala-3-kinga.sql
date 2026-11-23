-- Sehemu 3/9 ya wakala-migration.sql — endesha kwa mpangilio

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
