-- ============================================================
-- DukaLangu — RUDISHA STOCK ILIYOPUNGUZWA MARA MBILI
--
-- USIENDESHE kabla ya stock-mara-mbili-angalia.sql, na kabla
-- hujahesabu bidhaa MOJA rafuni kuthibitisha.
--
-- Inarudisha kiasi kilichopunguzwa mara ya pili, na inahifadhi
-- kumbukumbu kwenye stock_history (change_type='fix_double').
-- ============================================================

BEGIN;

CREATE TEMP TABLE dl_ziada AS
SELECT
  p.id AS product_id, p.business_id, p.name, p.quantity AS kabla,
  sum((i->>'qty')::numeric
      * COALESCE(NULLIF(i->>'fraction','')::numeric, 1)) AS ziada
  FROM sales s
  CROSS JOIN LATERAL jsonb_array_elements(s.items) AS i
  JOIN products p ON p.id::text = COALESCE(i->>'productId', i->>'product_id')
 WHERE s.created_at >= now() - interval '5 days'
   AND s.offline_id IS NOT NULL
   AND s.is_synced IS NOT TRUE
 GROUP BY p.id, p.business_id, p.name, p.quantity;

SELECT count(*) AS bidhaa_zitakazorekebishwa, sum(ziada) AS jumla_ya_ziada FROM dl_ziada;

INSERT INTO stock_history
  (product_id, business_id, change_type, quantity_before, quantity_change, quantity_after, note)
SELECT product_id, business_id, 'fix_double', kabla, ziada, kabla + ziada,
       'Marekebisho: stock ilipunguzwa mara mbili kwa mauzo yaliyorudishwa'
  FROM dl_ziada;

UPDATE products p
   SET quantity = p.quantity + z.ziada, updated_at = now()
  FROM dl_ziada z
 WHERE p.id = z.product_id;

-- Weka alama mauzo haya yasirekebishwe mara ya pili
UPDATE sales SET is_synced = TRUE
 WHERE created_at >= now() - interval '5 days'
   AND offline_id IS NOT NULL
   AND is_synced IS NOT TRUE;

COMMIT;

NOTIFY pgrst, 'reload schema';
SELECT 'Stock imerudishwa. Kumbukumbu ziko stock_history (fix_double).' AS status;
