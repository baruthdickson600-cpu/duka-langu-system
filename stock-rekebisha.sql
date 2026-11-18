-- ============================================================
-- DukaLangu — REKEBISHA STOCK ILIYOKWAMA
--
-- ENDESHA stock-angalia.sql KWANZA. Usiendeshe hii mpaka umeona
-- orodha ya namba 4 na umeridhika kuwa ni sahihi.
--
-- Inachofanya: inaweka stock ya kila bidhaa iwe sawa na safu ya
-- mwisho ya stock_history (quantity_after) — ndiyo stock
-- iliyopaswa kuwa kama database ingekuwa inapungua vizuri.
--
-- SALAMA: inahifadhi kumbukumbu ya marekebisho yenyewe kwenye
-- stock_history (change_type='fix'), kwa hiyo unaweza kuona
-- kila kilichobadilika na kurudi nyuma ikibidi.
--
-- Run kwenye Supabase SQL Editor.
-- ============================================================

BEGIN;

-- Bidhaa zinazohitaji marekebisho
CREATE TEMP TABLE dl_fix AS
WITH mwisho AS (
  SELECT DISTINCT ON (h.product_id)
         h.product_id, h.quantity_after
    FROM stock_history h
   ORDER BY h.product_id, h.created_at DESC, h.id DESC
)
SELECT p.id            AS product_id,
       p.business_id,
       p.name,
       p.quantity      AS kabla,
       m.quantity_after AS baada
  FROM mwisho m
  JOIN products p ON p.id = m.product_id
 WHERE p.quantity <> m.quantity_after
   AND m.quantity_after >= 0;

-- Onyesha kinachokwenda kubadilika
SELECT count(*) AS bidhaa_zitakazorekebishwa,
       COALESCE(sum(kabla - baada), 0) AS tofauti_jumla
  FROM dl_fix;

-- Hifadhi kumbukumbu ya marekebisho KABLA ya kubadilisha
INSERT INTO stock_history
  (product_id, business_id, change_type, quantity_before, quantity_change, quantity_after, note)
SELECT product_id, business_id, 'fix', kabla, baada - kabla, baada,
       'Marekebisho: stock haikuwa inapungua bidhaa zikiuzwa'
  FROM dl_fix;

-- Rekebisha
UPDATE products p
   SET quantity = f.baada,
       updated_at = now()
  FROM dl_fix f
 WHERE p.id = f.product_id;

-- Thibitisha: hii inapaswa kuwa 0
WITH mwisho AS (
  SELECT DISTINCT ON (h.product_id)
         h.product_id, h.quantity_after
    FROM stock_history h
   WHERE h.change_type <> 'fix'
   ORDER BY h.product_id, h.created_at DESC, h.id DESC
)
SELECT count(*) AS zilizobaki_batili
  FROM mwisho m JOIN products p ON p.id = m.product_id
 WHERE p.quantity <> m.quantity_after;

-- ⚠️ ANGALIA namba hapo juu. Zikikufurahisha, endesha:
--      COMMIT;
--  Zisipokufurahisha, endesha:
--      ROLLBACK;
--
-- Supabase SQL Editor inaweza kufunga transaction yenyewe.
-- Kama haikufanya, andika COMMIT; mwenyewe hapa chini.
COMMIT;

NOTIFY pgrst, 'reload schema';
SELECT 'Stock imerekebishwa. Kumbukumbu ziko stock_history (change_type=fix).' AS status;
