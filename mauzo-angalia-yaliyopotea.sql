-- ============================================================
-- DukaLangu — ANGALIA MAUZO YALIYOKOSEKANA
--
-- Haibadilishi kitu. Inakuonyesha siku zipi zina mauzo kwenye
-- mfumo, ili ujue hasa yapi hayapo.
--
-- KUMBUKA: mauzo yaliyokataliwa YAPO kwenye kivinjari cha kifaa
-- kilichouza (IndexedDB), si kwenye database. Hayatatokea hapa
-- mpaka yarudishwe kwa kitufe cha "⚠️ hayajaingia" kwenye kifaa
-- hicho hicho.
--
-- Run kwenye Supabase SQL Editor.
-- ============================================================

-- ---------- 1. Mauzo kwa siku, kila duka (siku 14) ----------
SELECT
  COALESCE(b.name,'(duka halijulikani)')        AS duka,
  (s.created_at AT TIME ZONE 'Africa/Nairobi')::date AS siku,
  count(*)                                       AS mauzo,
  sum(s.total)                                   AS jumla
  FROM sales s
  LEFT JOIN businesses b ON b.id = s.business_id
 WHERE s.created_at >= now() - interval '14 days'
 GROUP BY 1, 2
 ORDER BY 1, 2 DESC;

-- ---------- 2. Siku zilizo na mauzo SIFURI (mapengo) ----------
-- Duka lenye mauzo siku zote kisha likakosa siku moja = dalili
-- ya mauzo yaliyokataliwa siku hiyo.
WITH siku AS (
  SELECT generate_series(
    (now() - interval '13 days')::date, now()::date, interval '1 day')::date AS d
),
maduka AS (
  SELECT DISTINCT business_id FROM sales WHERE created_at >= now() - interval '30 days'
)
SELECT COALESCE(b.name,'(duka)') AS duka, siku.d AS siku_isiyo_na_mauzo
  FROM maduka m
 CROSS JOIN siku
  LEFT JOIN businesses b ON b.id = m.business_id
 WHERE NOT EXISTS (
   SELECT 1 FROM sales s
    WHERE s.business_id = m.business_id
      AND (s.created_at AT TIME ZONE 'Africa/Nairobi')::date = siku.d)
 ORDER BY 1, 2 DESC;

-- ---------- 3. Stock ilipungua lakini mauzo hayapo? ----------
-- Mauzo yaliyokataliwa YALIPUNGUZA stock (bidhaa zilitoka kweli)
-- lakini hayakurekodi stock_history. Hapa tunalinganisha.
SELECT
  COALESCE(b.name,'(duka)') AS duka,
  (h.created_at AT TIME ZONE 'Africa/Nairobi')::date AS siku,
  count(*) FILTER (WHERE h.change_type = 'sale') AS kumbukumbu_za_mauzo,
  (SELECT count(*) FROM sales s
    WHERE s.business_id = h.business_id
      AND (s.created_at AT TIME ZONE 'Africa/Nairobi')::date
        = (h.created_at AT TIME ZONE 'Africa/Nairobi')::date) AS mauzo_yaliyopo
  FROM stock_history h
  LEFT JOIN businesses b ON b.id = h.business_id
 WHERE h.created_at >= now() - interval '14 days'
 GROUP BY h.business_id, b.name, 2
 ORDER BY 1, 2 DESC;
