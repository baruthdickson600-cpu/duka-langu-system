-- ============================================================
-- DukaLangu — ONDOA PROMO CODE KWA MASUPEVAIZA
--
-- Endesha kwenye Supabase SQL Editor. Salama kuendesha mara nyingi.
--
-- Promo code ni ya WAKALA pekee: ndiyo inayounganisha mteja na
-- aliyemleta, na ndiyo msingi wa kamisheni yake.
--
-- Supevaiza hauzi — anasimamia. Akiwa na code, anaonekana kama
-- wakala kwenye kila hesabu: anapewa wateja "wake", anahesabiwa
-- kwenye madaraja, na arifa zake zinafungiwa kwenye code hiyo
-- badala ya mfumo mzima.
--
-- MUHIMU: wateja waliosajiliwa na code ya supevaiza HAWAGUSWI.
-- Code inabaki kwenye safu yao; kinachoondolewa ni uhusiano wake
-- naye. Kama unataka wateja hao wahamie kwa wakala mwingine,
-- fanya hivyo kwa mkono baada ya kuendesha hii.
-- ============================================================

-- ---------- 1. ONYESHA KABLA ----------
-- Angalia matokeo haya KWANZA kabla ya kuendelea.
SELECT
  u.name                       AS supevaiza,
  u.email,
  u.promo_code                 AS code_atakayoondolewa,
  COUNT(b.id)                  AS wateja_chini_ya_code,
  COUNT(b.id) FILTER (WHERE b.token_active) AS wanaolipa
FROM users u
LEFT JOIN businesses b ON b.promo_code = u.promo_code
WHERE lower(btrim(COALESCE(u.role,''))) = 'supervisor'
  AND COALESCE(u.promo_code,'') <> ''
GROUP BY u.id, u.name, u.email, u.promo_code
ORDER BY wateja_chini_ya_code DESC;

-- ---------- 2. HIFADHI KABLA YA KUONDOA ----------
-- Ili uweze kurudisha kama utabadilisha mawazo.
CREATE TABLE IF NOT EXISTS promo_code_zilizoondolewa (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  jina        TEXT,
  email       TEXT,
  promo_code  TEXT,
  cheo        TEXT,
  tarehe      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO promo_code_zilizoondolewa (user_id, jina, email, promo_code, cheo)
SELECT u.id, u.name, u.email, u.promo_code, u.role
FROM users u
WHERE lower(btrim(COALESCE(u.role,''))) = 'supervisor'
  AND COALESCE(u.promo_code,'') <> ''
  -- Usirudie kuhifadhi code ile ile ya mtu yule yule
  AND NOT EXISTS (
    SELECT 1 FROM promo_code_zilizoondolewa z
    WHERE z.user_id = u.id AND z.promo_code = u.promo_code
  );

-- ---------- 3. ONDOA ----------
UPDATE users
SET promo_code = NULL
WHERE lower(btrim(COALESCE(role,''))) = 'supervisor'
  AND COALESCE(promo_code,'') <> '';

-- ---------- 4. THIBITISHA ----------
SELECT
  COUNT(*) FILTER (WHERE lower(btrim(COALESCE(role,''))) = 'supervisor'
                     AND COALESCE(promo_code,'') <> '')  AS supevaiza_wenye_code,
  COUNT(*) FILTER (WHERE lower(btrim(COALESCE(role,''))) = 'agent'
                     AND COALESCE(promo_code,'') <> '')  AS wakala_wenye_code,
  COUNT(*) FILTER (WHERE lower(btrim(COALESCE(role,''))) = 'agent'
                     AND COALESCE(promo_code,'') =  '')  AS wakala_WASIO_na_code
FROM users;

-- Wakala asiye na code hapokei arifa yoyote ya mteja, kwa sababu
-- mfumo hauwezi kujua wateja wake ni wapi. Kama hesabu ya mwisho
-- si sifuri, mpe kila mmoja code yake.

NOTIFY pgrst, 'reload schema';

SELECT 'SAWA — promo code sasa ni ya wakala pekee.' AS status;

-- ============================================================
-- KURUDISHA (kama utahitaji):
--
--   UPDATE users u SET promo_code = z.promo_code
--   FROM promo_code_zilizoondolewa z
--   WHERE u.id = z.user_id;
-- ============================================================
