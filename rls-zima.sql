-- ============================================================
-- DukaLangu — ZIMA KINGA (rudi nyuma)
--
-- Endesha hii kama kitu kimeharibika baada ya hatua ya 2.
-- Inazima RLS pekee — view na function zinabaki, kwa hiyo app
-- mpya inaendelea kufanya kazi. Hakuna data inayofutwa.
-- ============================================================

ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales    DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='orders') THEN
    EXECUTE 'ALTER TABLE orders DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
SELECT 'Kinga imezimwa. App inaendelea kufanya kazi.' AS status;
