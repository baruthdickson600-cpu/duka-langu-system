-- ============================================================
-- DukaLangu — MFUMO WA TIKETI NA MGAWANYO WA ARIFA
--
-- Endesha kwenye Supabase SQL Editor. Salama kuendesha mara nyingi.
--
-- Inatoa:
--   1. Namba ya tiketi inayotengenezwa na DATABASE (TK-2026-000123)
--   2. Mazungumzo ya tiketi — mteja na mfumo wanaongea, hayafutwi
--   3. Jedwali la wapokeaji wa arifa — nani anapata SMS gani
--   4. Kinga: mteja anaona tiketi zake tu; wafanyakazi wanaona zote
--
-- HAIFUTI wala HAIBADILISHI kitu kilichopo. Safu mpya zote ni
-- za hiari, kwa hiyo tiketi za zamani zinaendelea kufanya kazi.
-- ============================================================


-- ============================================================
-- 1. NAMBA YA TIKETI
-- Kama risiti: database ndiyo inayotoa namba, si kivinjari.
-- Wateja wawili wakituma sekunde moja, hawapati namba moja.
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS dl_tiketi_seq START 1;

CREATE OR REPLACE FUNCTION dl_tiketi_no() RETURNS TEXT
LANGUAGE sql VOLATILE AS $tn$
  SELECT 'TK-'
      || to_char((now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date, 'YYYY')
      || '-' || lpad(nextval('dl_tiketi_seq')::text, 6, '0')
$tn$;


-- ============================================================
-- 2. SAFU MPYA KWENYE support_tickets
-- ============================================================
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_no        TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS kitengo          TEXT NOT NULL DEFAULT 'nyingine';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS phone            TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_role    TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_to      UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_name    TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS closed_at        TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sms_mteja_at     TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sms_kazi_at      TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS tiketi_no_uniq
  ON support_tickets (ticket_no) WHERE ticket_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS tiketi_hali ON support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS tiketi_biz  ON support_tickets (business_id, created_at DESC);

-- Kitengo: kinaamua nani anashughulikia
DO $k$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tiketi_kitengo_ok') THEN
    ALTER TABLE support_tickets ADD CONSTRAINT tiketi_kitengo_ok
      CHECK (kitengo IN ('kiufundi','malipo','mafunzo','ombi','nyingine'));
  END IF;
END $k$;


-- ============================================================
-- 3. NAMBA INAWEKWA PALE TIKETI INAPOFUNGULIWA
-- ============================================================
CREATE OR REPLACE FUNCTION dl_tiketi_weka() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $tw$
BEGIN
  IF NEW.ticket_no IS NULL OR NEW.ticket_no = '' THEN
    NEW.ticket_no := dl_tiketi_no();
  END IF;
  NEW.updated_at := now();
  -- Tarehe ya kufungwa inawekwa yenyewe, isiachwe mikononi mwa kivinjari
  IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  IF NEW.status <> 'closed' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END $tw$;

DROP TRIGGER IF EXISTS tiketi_no_trg ON support_tickets;
CREATE TRIGGER tiketi_no_trg BEFORE INSERT OR UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION dl_tiketi_weka();

-- Tiketi za zamani zinapata namba sasa, zikipangwa kwa tarehe
DO $old$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM support_tickets WHERE ticket_no IS NULL ORDER BY created_at LOOP
    UPDATE support_tickets SET ticket_no = dl_tiketi_no() WHERE id = r.id;
  END LOOP;
END $old$;


-- ============================================================
-- 4. MAZUNGUMZO YA TIKETI
--
-- Jedwali la jibu moja (`reply`) halitoshi: tatizo moja linaweza
-- kuhitaji maswali na majibu kadhaa. Hapa kila ujumbe unabaki,
-- kwa hiyo mtu yeyote anayechukua tiketi anaona historia nzima.
--
-- `ni_ndani` = maelezo ya ndani (mteja HAONI). Hapa ndipo
-- masoko wanaandika "nimempigia, hapokei" bila kumwaibisha mteja.
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID,
  sender_role TEXT NOT NULL DEFAULT 'office',
  sender_name TEXT,
  body        TEXT NOT NULL,
  ni_ndani    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tiketi_ujumbe ON ticket_messages (ticket_id, created_at);

-- Tiketi inasogea juu pale ujumbe mpya unapoingia
CREATE OR REPLACE FUNCTION dl_tiketi_gusa() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $tg$
BEGIN
  UPDATE support_tickets SET updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END $tg$;

DROP TRIGGER IF EXISTS tiketi_ujumbe_trg ON ticket_messages;
CREATE TRIGGER tiketi_ujumbe_trg AFTER INSERT ON ticket_messages
  FOR EACH ROW EXECUTE FUNCTION dl_tiketi_gusa();


-- ============================================================
-- 5. WAPOKEAJI WA ARIFA
--
-- Badala ya kuandika namba za simu ndani ya code, zinakaa hapa.
-- Mfanyakazi akiondoka, unamzima hapa — hakuna kupeleka toleo jipya.
--
-- wajibu: 'admin'   — wewe: afya na usalama wa mfumo
--         'masoko'  — afisa masoko: wasiolipa, tiketi
--         'wakala'  — wakala: wateja WAKE pekee (kwa promo_code)
--
-- aina: arifa anazozipokea. Mifano:
--   'afya'        — hali ya mfumo kila siku (admin)
--   'wasiolipa'   — wateja wanaotakiwa kufuatiliwa
--   'tiketi'      — tiketi mpya ya mteja
--   'tiketi_dharura' — tiketi ya dharura pekee
-- ============================================================
CREATE TABLE IF NOT EXISTS arifa_wapokeaji (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jina       TEXT NOT NULL,
  simu       TEXT NOT NULL,
  wajibu     TEXT NOT NULL DEFAULT 'masoko',
  user_id    UUID,
  promo_code TEXT,
  aina       JSONB NOT NULL DEFAULT '[]'::jsonb,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT arifa_wajibu_ok CHECK (wajibu IN ('admin','masoko','wakala','ufundi'))
);
CREATE UNIQUE INDEX IF NOT EXISTS arifa_simu_uniq ON arifa_wapokeaji (simu, wajibu);

-- Kumbukumbu ya arifa zilizotumwa — kuzuia SMS ileile mara mbili
-- kwa siku moja pale cron inapoendeshwa zaidi ya mara moja.
CREATE TABLE IF NOT EXISTS arifa_kazi_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aina       TEXT NOT NULL,
  simu       TEXT NOT NULL,
  kitu       TEXT,
  day        DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,
  ujumbe     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS arifa_kazi_uniq
  ON arifa_kazi_log (aina, simu, COALESCE(kitu,''), day);


-- ============================================================
-- 6. KINGA
-- ============================================================
ALTER TABLE ticket_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arifa_wapokeaji  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arifa_kazi_log   ENABLE ROW LEVEL SECURITY;

-- Msaidizi: wafanyakazi wa DukaLangu (si wateja)
CREATE OR REPLACE FUNCTION dl_ni_kazi() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $nk$
  SELECT EXISTS (
    SELECT 1 FROM users
     WHERE id = auth.uid()
       -- lower/btrim: 'Admin' na 'admin ' ni mtu yuleyule.
       -- Bila hivi, msimamizi anazuiwa na kinga yake mwenyewe.
       AND lower(btrim(COALESCE(role,''))) IN ('admin','marketing','supervisor','agent','accountant')
  )
$nk$;

CREATE OR REPLACE FUNCTION dl_ni_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $na$
  SELECT EXISTS (SELECT 1 FROM users
                  WHERE id = auth.uid() AND lower(btrim(COALESCE(role,''))) = 'admin')
$na$;

-- Biashara ya mtumiaji. Ni SECURITY DEFINER kwa makusudi: policy
-- ikisoma `users` moja kwa moja, inapita kwenye RLS ya `users`
-- yenyewe — ambayo inaweza kuzuia au kuzunguka bila kuonekana.
CREATE OR REPLACE FUNCTION dl_tiketi_biz() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $tb$
  SELECT business_id FROM users WHERE id = auth.uid()
$tb$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_ni_kazi(), dl_ni_admin(), dl_tiketi_biz() TO authenticated, service_role';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

-- Mazungumzo: mteja anaona ya tiketi ZAKE pekee, na maelezo ya
-- ndani hayamfikii kamwe. Mfanyakazi anaona yote.
DROP POLICY IF EXISTS tiketi_ujumbe_soma ON ticket_messages;
CREATE POLICY tiketi_ujumbe_soma ON ticket_messages FOR SELECT TO authenticated
  USING (
    dl_ni_kazi()
    OR (NOT ni_ndani AND EXISTS (
          SELECT 1 FROM support_tickets t
           WHERE t.id = ticket_messages.ticket_id
             AND t.business_id = dl_tiketi_biz()))
  );

DROP POLICY IF EXISTS tiketi_ujumbe_andika ON ticket_messages;
CREATE POLICY tiketi_ujumbe_andika ON ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    dl_ni_kazi()
    OR (NOT ni_ndani AND EXISTS (
          SELECT 1 FROM support_tickets t
           WHERE t.id = ticket_messages.ticket_id
             AND t.business_id = dl_tiketi_biz()))
  );

-- Wapokeaji wa arifa: wafanyakazi wanasoma, admin pekee anabadilisha.
DROP POLICY IF EXISTS arifa_soma ON arifa_wapokeaji;
CREATE POLICY arifa_soma ON arifa_wapokeaji FOR SELECT TO authenticated
  USING (dl_ni_kazi());

DROP POLICY IF EXISTS arifa_badili ON arifa_wapokeaji;
CREATE POLICY arifa_badili ON arifa_wapokeaji FOR ALL TO authenticated
  USING (dl_ni_admin()) WITH CHECK (dl_ni_admin());

DROP POLICY IF EXISTS arifa_log_soma ON arifa_kazi_log;
CREATE POLICY arifa_log_soma ON arifa_kazi_log FOR SELECT TO authenticated
  USING (dl_ni_kazi());


-- ============================================================
-- 7. MIPANGILIO — zinaanza zimewashwa, ni za bure hadi SMS itumwe
-- ============================================================
INSERT INTO settings (key, value)
SELECT k, v FROM (VALUES
  ('arifa_kazi_enabled',    'true'),   -- swichi kuu ya arifa zote za wafanyakazi
  ('arifa_afya_enabled',    'true'),   -- afya ya mfumo kwa admin
  ('arifa_wasiolipa_enabled','true'),  -- wasiolipa kwa masoko na wakala
  ('arifa_tiketi_enabled',  'true'),   -- tiketi mpya kwa masoko na wakala
  ('tiketi_sms_mteja',      'true')    -- SMS ya namba ya tiketi kwa mteja
) AS s(k, v)
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE settings.key = s.k);

NOTIFY pgrst, 'reload schema';

SELECT 'TIKETI SAWA — namba, mazungumzo, wapokeaji wa arifa na kinga vimewekwa.' AS status;
