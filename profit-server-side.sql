-- ============================================================
-- DukaLangu — FAIDA IHESABIWE NDANI YA DATABASE
--
-- Kwa nini: muuzaji (employee) hapaswi kuona faida wala bei ya
-- kununua. Hapo awali faida ilihesabiwa kwenye kivinjari, kwa hiyo
-- bei ya kununua ilibidi ifike kwenye kivinjari chake.
--
-- Sasa: kivinjari cha muuzaji hakitumi faida (inakuwa NULL), na
-- database inaihesabu yenyewe kwa kutumia bei za kununua zilizomo
-- kwenye jedwali la bidhaa. Bei hiyo haitoki kwenye server kamwe.
--
-- Pia inahifadhi `cost` na `lineProfit` ndani ya KILA bidhaa ya mauzo,
-- ili mwenye duka aone faida ya kila bidhaa aliyoiuza.
--
-- Mwenye duka (office) anaendelea kuhesabu kwenye kivinjari kama
-- zamani — trigger haigusi mauzo yenye faida tayari.
--
-- Salama kuendesha mara nyingi. Run kwenye Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION dl_compute_sale_profit()
RETURNS TRIGGER AS $$
DECLARE
  it          JSONB;
  qty         NUMERIC;
  price       NUMERIC;
  frac        NUMERIC;
  unit_cost   NUMERIC;
  revenue     NUMERIC := 0;
  cost_total  NUMERIC := 0;
  new_items   JSONB := '[]'::jsonb;
BEGIN
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' THEN
    IF NEW.profit IS NULL THEN NEW.profit := 0; END IF;
    RETURN NEW;
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
    qty   := COALESCE(NULLIF(it->>'qty','')::NUMERIC, 0);
    price := COALESCE(NULLIF(it->>'price','')::NUMERIC, 0);
    frac  := COALESCE(NULLIF(it->>'fraction','')::NUMERIC, 1);

    -- Bei ya kununua inatoka kwenye jedwali la bidhaa (chanzo cha ukweli).
    -- Tunalinganisha kama maandishi ili id zisizo za uuid zisilete kosa.
    SELECT p.buy_price INTO unit_cost
      FROM products p
     WHERE p.id::text = COALESCE(it->>'productId', it->>'product_id', '')
     LIMIT 1;

    -- Bidhaa ikiwa imefutwa, tumia gharama iliyohifadhiwa kwenye item
    IF unit_cost IS NULL THEN
      unit_cost := COALESCE(
        NULLIF(it->>'buyPrice','')::NUMERIC,
        NULLIF(it->>'cost','')::NUMERIC,
        0
      );
    END IF;

    revenue    := revenue    + (qty * price * frac);
    cost_total := cost_total + (qty * unit_cost * frac);

    -- MUHIMU: hifadhi gharama ndani ya kila bidhaa, ili mwenye duka
    -- aweze kuona faida ya KILA BIDHAA baadaye. Bila hii, mauzo ya
    -- muuzaji yangekosa gharama (kivinjari chake hakina bei ya kununua).
    new_items := new_items || jsonb_build_array(
      it
      || jsonb_build_object('cost', unit_cost)
      || jsonb_build_object('lineProfit', qty * (price - unit_cost) * frac)
    );
  END LOOP;

  NEW.items := new_items;

  -- Faida ya mauzo yote: ikiwa tayari imetumwa (mwenye duka), usiguse.
  IF NEW.profit IS NULL THEN
    NEW.profit := revenue - cost_total - COALESCE(NEW.discount, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sales_profit ON sales;
CREATE TRIGGER trg_sales_profit
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION dl_compute_sale_profit();

-- ---------- ODA (ORDERS) ----------
-- Oda zinatumia muundo ule ule (items, discount, profit), na muuzaji
-- anaweza kuunda oda. Kwa hiyo trigger ile ile inatumika hapa pia.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='orders') THEN
    DROP TRIGGER IF EXISTS trg_orders_profit ON orders;
    CREATE TRIGGER trg_orders_profit
      BEFORE INSERT ON orders
      FOR EACH ROW
      EXECUTE FUNCTION dl_compute_sale_profit();
  END IF;
END $$;

-- ---------- JARIBIO LA HARAKA (hiari) ----------
-- Hii inaonyesha trigger inavyohesabu bila kuhifadhi chochote.
-- Ondoa alama za maoni (--) ukitaka kuijaribu:
--
-- BEGIN;
--   INSERT INTO sales (business_id, total, subtotal, discount, items, profit)
--   VALUES (
--     (SELECT id FROM businesses LIMIT 1),
--     10000, 10000, 0,
--     jsonb_build_array(jsonb_build_object(
--       'productId', (SELECT id::text FROM products LIMIT 1),
--       'qty', 2, 'price', 5000, 'fraction', 1)),
--     NULL
--   );
--   SELECT total, profit FROM sales ORDER BY created_at DESC LIMIT 1;
-- ROLLBACK;

NOTIFY pgrst, 'reload schema';
SELECT 'Faida sasa inahesabiwa ndani ya database.' AS status;
