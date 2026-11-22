-- ============================================================
-- DukaLangu — JE STOCK ILIPUNGUA MARA MBILI?
--
-- Haibadilishi kitu. Endesha hii KWANZA.
--
-- TATIZO: mauzo yaliyokataliwa jana YALIPUNGUZA stock wakati ule
-- (bidhaa zilitoka dukani kweli). Yalipohifadhiwa kwenye kifaa na
-- toleo la zamani, hayakuwekwa alama ya "stock imeshapungua".
-- Yaliporudishwa leo, mfumo ulipunguza TENA.
--
-- Matokeo: stock iko CHINI kuliko ilivyo rafuni.
--
-- JINSI YA KUYATAMBUA: mauzo yaliyorudishwa yana offline_id na
-- hayana is_synced (yaliingia kupitia foleni, si moja kwa moja).
-- ============================================================

-- ---------- 1. Mauzo yaliyorudishwa (siku 5) ----------
SELECT
  COALESCE(b.name,'(duka)') AS duka,
  (s.created_at AT TIME ZONE 'Africa/Nairobi')::date AS siku,
  count(*)     AS mauzo_yaliyorudishwa,
  sum(s.total) AS jumla
  FROM sales s
  LEFT JOIN businesses b ON b.id = s.business_id
 WHERE s.created_at >= now() - interval '5 days'
   AND s.offline_id IS NOT NULL
   AND s.is_synced IS NOT TRUE
 GROUP BY 1, 2
 ORDER BY 1, 2 DESC;

-- ---------- 2. Bidhaa gani, na kiasi gani cha ziada ----------
-- "stock_ya_ziada" = kiasi kilichopunguzwa MARA YA PILI.
-- Hiki ndicho kinachopaswa kurudishwa kama kweli kilipungua mara mbili.
SELECT
  COALESCE(b.name,'(duka)')              AS duka,
  p.name                                  AS bidhaa,
  p.quantity                              AS stock_ya_sasa,
  sum((i->>'qty')::numeric
      * COALESCE(NULLIF(i->>'fraction','')::numeric, 1)) AS stock_ya_ziada,
  p.quantity + sum((i->>'qty')::numeric
      * COALESCE(NULLIF(i->>'fraction','')::numeric, 1)) AS stock_sahihi
  FROM sales s
  CROSS JOIN LATERAL jsonb_array_elements(s.items) AS i
  JOIN products p ON p.id::text = COALESCE(i->>'productId', i->>'product_id')
  LEFT JOIN businesses b ON b.id = s.business_id
 WHERE s.created_at >= now() - interval '5 days'
   AND s.offline_id IS NOT NULL
   AND s.is_synced IS NOT TRUE
 GROUP BY b.name, p.id, p.name, p.quantity
 ORDER BY 1, 4 DESC;

-- ============================================================
-- THIBITISHA KWANZA kabla ya kurekebisha:
--   Chagua bidhaa MOJA kwenye orodha ya 2. Ihesabu rafuni.
--   Idadi halisi ikiwa sawa na "stock_sahihi", ndipo
--   endesha stock-mara-mbili-rekebisha.sql.
--   Ikiwa sawa na "stock_ya_sasa", HAKUNA tatizo — usirekebishe.
-- ============================================================
