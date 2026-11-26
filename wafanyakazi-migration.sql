-- ============================================================
-- DukaLangu — TAARIFA ZA WAFANYAKAZI
--
-- Endesha kwenye Supabase SQL Editor. Salama kuendesha mara nyingi.
--
-- Safu hizi ni za WAFANYAKAZI WA DUKALANGU (admin, masoko,
-- wakala, mhasibu) — si za wateja. Zote ni za hiari, kwa hiyo
-- hakuna akaunti inayoathirika.
--
-- TAHADHARI YA DATA: NIDA, tarehe ya kuzaliwa na anwani ni
-- taarifa binafsi zinazolindwa na Sheria ya Ulinzi wa Taarifa
-- Binafsi ya 2022. Zinaonekana kwa msimamizi pekee, si kwa
-- wateja wala kwa wafanyakazi wenzake.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS nida            TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tarehe_kuzaliwa DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS jinsia          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS anwani          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cheo_kazi       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tarehe_kuanza   DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ndugu_jina      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ndugu_simu      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS maelezo         TEXT;

-- Jinsia: herufi moja, isiyo na mshangao
DO $j$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_jinsia_ok') THEN
    ALTER TABLE users ADD CONSTRAINT users_jinsia_ok
      CHECK (jinsia IS NULL OR jinsia IN ('ke','me'));
  END IF;
END $j$;

-- NIDA moja haiwezi kuwa ya watu wawili. Safu tupu haziguswi.
CREATE UNIQUE INDEX IF NOT EXISTS users_nida_uniq
  ON users (nida) WHERE nida IS NOT NULL AND nida <> '';

-- Hakuna CHECK ya umbo la NIDA kwa makusudi: umbo rasmi
-- halikuthibitika kwenye chanzo cha kuaminika, na uthibitisho
-- usio sahihi ungezuia mfanyakazi halisi kuhifadhiwa.
-- Kivinjari kinaonya pale namba haina tarakimu 20, lakini
-- hakizuii kuhifadhi.

-- ============================================================
-- RUHUSA YA MSIMAMIZI KUHARIRI WAFANYAKAZI
--
-- Inawekwa TU kama kinga (RLS) imewashwa kwenye jedwali la users.
-- Kama haijawashwa, hakuna kinachofanyika — mipangilio yako
-- iliyopo haiguswi.
--
-- Cheo kinasomwa kwa lower(btrim(...)) kwa sababu safu halisi
-- zinazo nafasi na herufi kubwa (' Admin ') — ulinganisho wa
-- herufi moja kwa moja ulikwisha kuzuia msimamizi halisi.
-- ============================================================
DO $r$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users' AND relrowsecurity) THEN

    -- Msaidizi: ni msimamizi? SECURITY DEFINER ili isizuiliwe na
    -- RLS ya users yenyewe, na ili tusipate recursion.
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION dl_ni_msimamizi()
      RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public AS $b$
        SELECT EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
            AND lower(btrim(COALESCE(u.role,''))) = 'admin'
            AND COALESCE(u.is_active, true)
        )
      $b$
    $f$;
    EXECUTE 'GRANT EXECUTE ON FUNCTION dl_ni_msimamizi() TO authenticated, service_role';

    DROP POLICY IF EXISTS dl_users_admin_rw ON users;
    CREATE POLICY dl_users_admin_rw ON users FOR ALL TO authenticated
      USING (dl_ni_msimamizi()) WITH CHECK (dl_ni_msimamizi());

    RAISE NOTICE 'Kinga ya users ipo — ruhusa ya msimamizi imewekwa.';
  ELSE
    RAISE NOTICE 'Kinga (RLS) ya users haijawashwa — hakuna policy iliyowekwa.';
  END IF;
END $r$;

NOTIFY pgrst, 'reload schema';

SELECT 'WAFANYAKAZI SAWA — safu za taarifa binafsi zimewekwa.' AS status;
