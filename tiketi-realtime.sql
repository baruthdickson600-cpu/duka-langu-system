-- ============================================================
-- DukaLangu — WASHA ARIFA YA PAPO HAPO KWA TIKETI
--
-- Endesha kwenye Supabase SQL Editor. Salama kuendesha mara nyingi.
--
-- Bila hii, kadi ya tiketi kwenye dashibodi bado inafanya kazi
-- (inasoma tiketi kila ukurasa unapofunguliwa), LAKINI arifa
-- inayojitokeza papo hapo mteja anapotuma tiketi haitatokea.
--
-- Supabase inatuma mabadiliko ya jedwali kwa kivinjari tu kama
-- jedwali limo kwenye "publication" ya realtime. Hili ni swichi
-- moja; haiathiri data wala kinga.
-- ============================================================

DO $r$
BEGIN
  -- Publication ya Supabase ipo kwa jina hili
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publication supabase_realtime haipo — ruka hatua hii.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    RAISE NOTICE 'support_tickets tayari ipo kwenye realtime.';
  ELSE
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets';
    RAISE NOTICE 'support_tickets imeongezwa kwenye realtime.';
  END IF;
END $r$;

-- Thibitisha
SELECT tablename AS jedwali_lenye_arifa_ya_papo_hapo
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;

SELECT 'SAWA — tiketi mpya itaonekana mara moja kwenye dashibodi.' AS status;
