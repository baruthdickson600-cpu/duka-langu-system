-- ============================================================
-- DukaLangu — ANGALIA UWAKALA
--
-- Endesha hii BAADA ya wakala-migration.sql ili kuthibitisha
-- kila kitu kimekaa sawa. Haibadilishi chochote.
-- ============================================================

-- 1. Jedwali yote yapo?
SELECT 'JEDWALI' AS kipimo, t.jina,
       CASE WHEN c.n > 0 THEN 'SAWA' ELSE 'HALIPO' END AS hali
  FROM (VALUES ('wakala_lines'),('wakala_tx'),('wakala_days'),('wakala_settings')) t(jina)
  LEFT JOIN (SELECT table_name, 1 AS n FROM information_schema.tables
              WHERE table_schema='public') c ON c.table_name = t.jina;

-- 2. Safu za usajili kwenye businesses
SELECT 'SAFU' AS kipimo, s.jina,
       CASE WHEN c.n > 0 THEN 'SAWA' ELSE 'HAIPO' END AS hali
  FROM (VALUES ('wakala_enabled'),('wakala_paid_until')) s(jina)
  LEFT JOIN (SELECT column_name, 1 AS n FROM information_schema.columns
              WHERE table_schema='public' AND table_name='businesses') c
         ON c.column_name = s.jina;

-- 3. Function zote zipo?
SELECT 'FUNCTION' AS kipimo, f.jina,
       CASE WHEN p.n > 0 THEN 'SAWA' ELSE 'HAIPO' END AS hali
  FROM (VALUES ('dl_wakala_stamp'),('dl_wakala_guard'),('dl_wakala_sign'),
               ('dl_wakala_opening_float'),('dl_wakala_opening_cash'),
               ('dl_wakala_close_day')) f(jina)
  LEFT JOIN (SELECT proname, 1 AS n FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname='public') p ON p.proname = f.jina;

-- 4. Kinga (RLS) imewashwa?
SELECT 'RLS' AS kipimo, c.relname AS jina,
       CASE WHEN c.relrowsecurity THEN 'IMEWASHWA' ELSE 'HAIJAWASHWA — TATIZO' END AS hali
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname='public' AND c.relname LIKE 'wakala%';

-- 5. Index za kuzuia marudio
SELECT 'INDEX' AS kipimo, i.jina,
       CASE WHEN x.n > 0 THEN 'SAWA' ELSE 'HAIPO — TATIZO' END AS hali
  FROM (VALUES ('wakala_tx_offline_uniq'),('wakala_tx_reverses_uniq'),('wakala_days_uniq')) i(jina)
  LEFT JOIN (SELECT indexname, 1 AS n FROM pg_indexes WHERE schemaname='public') x
         ON x.indexname = i.jina;

-- 6. Biashara zilizo na huduma hii (mwanzo ni tupu — ni sawa)
SELECT 'BIASHARA' AS kipimo, name AS jina,
       CASE WHEN wakala_paid_until IS NULL THEN 'HAJALIPA'
            WHEN wakala_paid_until > now() THEN 'IMELIPWA hadi ' || wakala_paid_until::date
            ELSE 'IMEISHA ' || wakala_paid_until::date END AS hali
  FROM businesses WHERE wakala_enabled ORDER BY name;

-- 7. Miamala na siku zilizofungwa (mwanzo ni 0)
SELECT 'IDADI' AS kipimo, 'miamala' AS jina, count(*)::text AS hali FROM wakala_tx
UNION ALL
SELECT 'IDADI', 'siku zilizofungwa', count(*)::text FROM wakala_days
UNION ALL
SELECT 'IDADI', 'laini za float', count(*)::text FROM wakala_lines;

-- 8. Tofauti zilizokamatwa (hapa upotevu unaonekana)
SELECT 'TOFAUTI' AS kipimo, b.name AS jina,
       d.day::text || ': taslimu ' || d.variance_cash::text
         || ', float ' || d.variance_float::text AS hali
  FROM wakala_days d JOIN businesses b ON b.id = d.business_id
 WHERE d.variance_cash <> 0 OR d.variance_float <> 0
 ORDER BY d.day DESC LIMIT 20;
