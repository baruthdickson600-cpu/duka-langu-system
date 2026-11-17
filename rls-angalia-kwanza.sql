-- ============================================================
-- DukaLangu — ANGALIA KABLA YA KUWASHA RLS
--
-- Endesha HII KWANZA, kabla ya rls-kinga-ya-bei.sql.
-- Haibadilishi kitu — inaonyesha tu kama kila mtumiaji
-- atatambuliwa vizuri baada ya RLS kuwashwa.
--
-- Unachotaka kuona: safu ya "TATIZO" iwe TUPU.
-- ============================================================

-- 1. Watumiaji ambao HAWATATAMBULIKA (wangeona duka tupu)
SELECT
  u.id, u.email, u.name, u.role,
  u.business_id AS business_kwenye_users,
  (SELECT b.id FROM businesses b WHERE b.owner_id = u.id LIMIT 1) AS duka_analomiliki,
  CASE
    WHEN u.role = 'admin' THEN 'OK (admin)'
    WHEN u.business_id IS NOT NULL THEN 'OK'
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.owner_id = u.id) THEN 'OK (kwa owner_id)'
    ELSE '❌ TATIZO — hataona data yake'
  END AS hali
  FROM users u
 WHERE u.is_active IS DISTINCT FROM false
 ORDER BY (CASE WHEN u.role='admin' THEN 2 WHEN u.business_id IS NOT NULL THEN 2
                WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.owner_id=u.id) THEN 2
                ELSE 1 END), u.role;

-- 2. Hesabu ya haraka
SELECT
  count(*) FILTER (WHERE role='office')   AS wamiliki,
  count(*) FILTER (WHERE role='employee') AS wafanyakazi,
  count(*) FILTER (WHERE role='admin')    AS admin,
  count(*) FILTER (
    WHERE role <> 'admin' AND business_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM businesses b WHERE b.owner_id = users.id)
  ) AS watakaopata_tatizo
  FROM users;

-- 3. Wafanyakazi wasio na business_id (hawataweza kuuza)
SELECT id, email, name FROM users
 WHERE role='employee' AND business_id IS NULL;

-- 4. Je SUPABASE_SERVICE_ROLE_KEY inatumika kwenye API?
--    Hii SQL haiwezi kuiangalia. Angalia Vercel -> Settings ->
--    Environment Variables. Bila hiyo, cron ya ripoti ya email,
--    malipo, na SMS zitaacha kufanya kazi baada ya RLS.
SELECT 'Angalia SUPABASE_SERVICE_ROLE_KEY kwenye Vercel' AS kumbuka;
