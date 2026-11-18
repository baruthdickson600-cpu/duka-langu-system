-- ============================================================
-- DukaLangu — ANGALIA STOCK ILIYOKWAMA
--
-- Endesha HII KWANZA. Haibadilishi kitu — inaonyesha tu.
--
-- TATIZO: stock ya database haikuwa inapungua bidhaa zikiuzwa.
-- Kivinjari kilipunguza kwenye skrini, na kiliandika kumbukumbu
-- kwenye stock_history, lakini jedwali la bidhaa hakikuguswa.
--
-- Kwa hiyo stock_history ndiyo ukweli: safu yake ya mwisho
-- (quantity_after) inaonyesha stock ILIYOPASWA kuwa.
--
-- Run kwenye Supabase SQL Editor.
-- ============================================================

-- ---------- 1. Je function za stock zipo? ----------
-- Hazipo = app ilikuwa inashindwa kupunguza stock kwa muuzaji.
SELECT
  COALESCE(string_agg(p.proname, ', '), '(hakuna)') AS function_zilizopo,
  CASE WHEN count(*) FILTER (WHERE p.proname = 'dl_deduct_stock') = 0
       THEN '⚠️  dl_deduct_stock HAIPO — endesha rls-hatua-1-maandalizi.sql'
       ELSE '✅ zipo' END AS hali
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname LIKE 'dl_%stock%';

-- ---------- 2. Je RLS imewashwa? ----------
SELECT tablename, rowsecurity AS rls_imewashwa
  FROM pg_tables
 WHERE schemaname = 'public' AND tablename IN ('products','sales','orders')
 ORDER BY tablename;

-- ---------- 3. Bidhaa ngapi zina stock batili? ----------
WITH mwisho AS (
  SELECT DISTINCT ON (h.product_id)
         h.product_id, h.quantity_after, h.created_at
    FROM stock_history h
   ORDER BY h.product_id, h.created_at DESC, h.id DESC
)
SELECT
  count(*)                                              AS bidhaa_zenye_kumbukumbu,
  count(*) FILTER (WHERE p.quantity <> m.quantity_after) AS zenye_stock_batili,
  COALESCE(sum(p.quantity - m.quantity_after)
           FILTER (WHERE p.quantity <> m.quantity_after), 0) AS tofauti_jumla
  FROM mwisho m
  JOIN products p ON p.id = m.product_id;

-- ---------- 4. Zipi hasa, na kwa maduka yapi? ----------
WITH mwisho AS (
  SELECT DISTINCT ON (h.product_id)
         h.product_id, h.quantity_after, h.created_at
    FROM stock_history h
   ORDER BY h.product_id, h.created_at DESC, h.id DESC
)
SELECT
  b.name                        AS duka,
  p.name                        AS bidhaa,
  p.quantity                    AS stock_ya_sasa,
  m.quantity_after              AS stock_sahihi,
  p.quantity - m.quantity_after AS tofauti,
  m.created_at                  AS mabadiliko_ya_mwisho
  FROM mwisho m
  JOIN products p    ON p.id = m.product_id
  LEFT JOIN businesses b ON b.id = p.business_id
 WHERE p.quantity <> m.quantity_after
 ORDER BY abs(p.quantity - m.quantity_after) DESC
 LIMIT 100;

-- ---------- 5. Mauzo ya leo yasiyo na kumbukumbu ya stock ----------
-- Haya hayawezi kurekebishwa kiotomatiki (mauzo ya offline
-- hayaandiki stock_history). Hesabu ya mkono inahitajika.
SELECT
  COALESCE(b.name,'(duka halijulikani)') AS duka,
  count(*)                               AS mauzo_bila_kumbukumbu
  FROM sales s
  LEFT JOIN businesses b ON b.id = s.business_id
 WHERE s.created_at >= now() - interval '14 days'
   AND NOT EXISTS (
     SELECT 1 FROM stock_history h
      WHERE h.business_id = s.business_id
        AND h.change_type = 'sale'
        AND h.created_at BETWEEN s.created_at - interval '2 minutes'
                             AND s.created_at + interval '2 minutes')
 GROUP BY b.name
 ORDER BY 2 DESC
 LIMIT 50;
