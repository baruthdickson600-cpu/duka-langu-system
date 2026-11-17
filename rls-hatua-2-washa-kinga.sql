-- ============================================================
-- DukaLangu — HATUA 2/2: WASHA KINGA (RLS)
--
-- ENDESHA HII BAADA YA:
--   1. rls-angalia-kwanza.sql  — hakuna "TATIZO"
--   2. rls-hatua-1-maandalizi.sql
--   3. App mpya imepelekwa NA imejaribiwa
--
-- Hapa ndipo database inaanza kukatalia. Baada ya hii, muuzaji
-- hawezi kupata bei ya kununua wala faida kwa njia yoyote —
-- si DevTools, si Postman, si ombi la moja kwa moja.
--
-- Kitu kikiharibika: endesha rls-zima.sql.
-- ============================================================

-- ---------- 3. RLS: products ----------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_owner ON products;
CREATE POLICY products_owner ON products
  FOR ALL TO authenticated
  USING (
    dl_my_role() = 'admin'
    OR (dl_my_role() = 'office' AND business_id = dl_my_business())
  )
  WITH CHECK (
    dl_my_role() = 'admin'
    OR (dl_my_role() = 'office' AND business_id = dl_my_business())
  );

-- ---------- 4. RLS: sales ----------
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Kuona: mwenye duka na admin pekee (muuzaji anatumia sales_pub)
DROP POLICY IF EXISTS sales_owner_read ON sales;
CREATE POLICY sales_owner_read ON sales
  FOR SELECT TO authenticated
  USING (
    dl_my_role() = 'admin'
    OR (dl_my_role() = 'office' AND business_id = dl_my_business())
  );

-- Kuandika: muuzaji NA mwenye duka wa biashara hiyo
DROP POLICY IF EXISTS sales_insert ON sales;
CREATE POLICY sales_insert ON sales
  FOR INSERT TO authenticated
  WITH CHECK (business_id = dl_my_business());

-- Kubadilisha / kufuta: mwenye duka na admin pekee
DROP POLICY IF EXISTS sales_owner_write ON sales;
CREATE POLICY sales_owner_write ON sales
  FOR UPDATE TO authenticated
  USING (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()))
  WITH CHECK (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()));

DROP POLICY IF EXISTS sales_owner_del ON sales;
CREATE POLICY sales_owner_del ON sales
  FOR DELETE TO authenticated
  USING (dl_my_role() = 'admin' OR (dl_my_role() = 'office' AND business_id = dl_my_business()));

-- ---------- 4b. RLS: orders (zina faida pia) ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='orders') THEN
    EXECUTE 'ALTER TABLE orders ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS orders_owner_read ON orders';
    EXECUTE 'CREATE POLICY orders_owner_read ON orders FOR SELECT TO authenticated
              USING (dl_my_role() = ''admin''
                     OR (dl_my_role() = ''office'' AND business_id = dl_my_business()))';

    EXECUTE 'DROP POLICY IF EXISTS orders_insert ON orders';
    EXECUTE 'CREATE POLICY orders_insert ON orders FOR INSERT TO authenticated
              WITH CHECK (business_id = dl_my_business())';

    -- Mwenye duka pekee anabadilisha moja kwa moja. Muuzaji anatumia
    -- dl_order_update() — kwa sababu Postgres inatumia policy ya SELECT
    -- kwenye WHERE ya UPDATE, kwa hiyo policy ya UPDATE pekee
    -- haikumtosha (alipata 'UPDATE 0').
    EXECUTE 'DROP POLICY IF EXISTS orders_update ON orders';
    EXECUTE 'CREATE POLICY orders_update ON orders FOR UPDATE TO authenticated
              USING (dl_my_role() = ''admin''
                     OR (dl_my_role() = ''office'' AND business_id = dl_my_business()))
              WITH CHECK (dl_my_role() = ''admin''
                     OR (dl_my_role() = ''office'' AND business_id = dl_my_business()))';

    EXECUTE 'DROP POLICY IF EXISTS orders_owner_del ON orders';
    EXECUTE 'CREATE POLICY orders_owner_del ON orders FOR DELETE TO authenticated
              USING (dl_my_role() = ''admin''
                     OR (dl_my_role() = ''office'' AND business_id = dl_my_business()))';
  END IF;
END $$;


NOTIFY pgrst, 'reload schema';
SELECT 'Kinga imewaka. Bei ya kununua sasa inalindwa na database yenyewe.' AS status;
