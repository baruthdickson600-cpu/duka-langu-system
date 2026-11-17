-- ============================================================
-- DukaLangu — HATUA 1/2: MAANDALIZI (SALAMA KABISA)
--
-- TATIZO: Mfanyakazi ana akaunti halisi ya Supabase, na anon key ipo
-- ndani ya JavaScript ya kivinjari. Kuficha bei kwenye React ni kuficha
-- SKRINI pekee. Akifungua DevTools au Postman, ombi moja:
--     GET /rest/v1/products?select=name,buy_price
-- lilikuwa linampa bei zote za kununua.
--
-- SULUHISHO: database yenyewe imkatalie.
--   products  -> RLS: mwenye duka (office) na admin PEKEE wanaona
--   sales     -> RLS: mwenye duka na admin PEKEE wanaona
--   muuzaji anatumia VIEW mbili zisizo na faida:
--       products_pub  — kila kitu ISIPOKUWA buy_price
--       sales_pub     — kila kitu ISIPOKUWA profit, items zimesafishwa
--   stock inapungua kwa FUNCTION (dl_deduct_stock) — si UPDATE ya moja
--   kwa moja, ili muuzaji asipate row yenye bei kwa njia ya RETURNING.
--
-- View zinajengwa KWA KUSOMA SCHEMA yenyewe, kwa hiyo safu mpya
-- utakazoongeza baadaye zinajiingiza zenyewe (isipokuwa za bei).
--
-- HATUA HII HAIBADILISHI RUHUSA YOYOTE. Inaunda tu view na function.
-- App ya zamani inaendelea kufanya kazi kama kawaida.
--
-- MPANGILIO WA KUPELEKA (usibadilishe):
--   1. Endesha rls-angalia-kwanza.sql  — hakikisha hakuna "TATIZO"
--   2. Endesha FAILI HII               — haibadilishi kitu
--   3. Peleka app mpya (git push)      — inaanza kutumia view
--   4. Jaribu: ingia kama mmiliki NA kama mfanyakazi
--   5. Endesha rls-hatua-2-washa-kinga.sql — hapo kinga inawaka
--
-- Kitu kikiharibika: rls-zima.sql inarudisha kila kitu.
-- Salama kuendesha mara nyingi. Run kwenye Supabase SQL Editor.
-- ============================================================

-- ---------- 1. MSAIDIZI: nani anaomba? ----------
-- SECURITY DEFINER ili isizuiliwe na RLS ya jedwali la users,
-- na ili tusipate recursion.
-- MUHIMU: wamiliki wengine wameunganishwa kwa businesses.owner_id, na
-- users.business_id yao ni NULL (ona AppContext: owner_id kwanza, ndipo
-- business_id). Bila kurudi kwa owner_id, mmiliki huyo angeona DUKA TUPU.
CREATE OR REPLACE FUNCTION dl_my_business()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT u.business_id FROM users u
      WHERE u.id = auth.uid() AND u.business_id IS NOT NULL LIMIT 1),
    (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid() LIMIT 1)
  )
$$;

-- Mmiliki asiye na safu kwenye users bado anatambuliwa kwa duka analomiliki
CREATE OR REPLACE FUNCTION dl_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT u.role FROM users u WHERE u.id = auth.uid() LIMIT 1),
    (SELECT 'office' FROM businesses b WHERE b.owner_id = auth.uid() LIMIT 1)
  )
$$;

-- Mwenye duka au admin?
CREATE OR REPLACE FUNCTION dl_sees_profit()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(dl_my_role() IN ('office','admin'), false)
$$;

GRANT EXECUTE ON FUNCTION dl_my_business(), dl_my_role(), dl_sees_profit()
  TO anon, authenticated;

-- ---------- 2. MSAIDIZI: ondoa gharama ndani ya items ----------
CREATE OR REPLACE FUNCTION dl_strip_item_costs(p_items JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN p_items
    ELSE COALESCE((
      SELECT jsonb_agg(i - 'cost' - 'lineProfit' - 'buyPrice' - 'buy_price'
                       ORDER BY ord)
        FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(i, ord)
    ), '[]'::jsonb)
  END
$$;
GRANT EXECUTE ON FUNCTION dl_strip_item_costs(JSONB) TO anon, authenticated;

-- ---------- 5. VIEW ya bidhaa kwa muuzaji (bila buy_price) ----------
-- Inajengwa kwa kusoma schema, kwa hiyo safu mpya zinajiingiza zenyewe.
DO $$
DECLARE cols TEXT;
BEGIN
  SELECT string_agg('p.'||quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'products'
     AND column_name NOT IN ('buy_price','cost','cost_price');
  IF cols IS NULL THEN RAISE EXCEPTION 'Jedwali products halipo'; END IF;
  EXECUTE format(
    'CREATE OR REPLACE VIEW products_pub AS SELECT %s FROM products p
       WHERE p.business_id = dl_my_business()', cols);
END $$;

-- ---------- 6. VIEW ya mauzo kwa muuzaji (bila faida) ----------
DO $$
DECLARE cols TEXT;
BEGIN
  SELECT string_agg(
      CASE WHEN column_name = 'items'
           THEN 'dl_strip_item_costs(s.items) AS items'
           ELSE 's.'||quote_ident(column_name) END,
      ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'sales'
     AND column_name NOT IN ('profit','cost','total_cost');
  IF cols IS NULL THEN RAISE EXCEPTION 'Jedwali sales halipo'; END IF;
  EXECUTE format(
    'CREATE OR REPLACE VIEW sales_pub AS SELECT %s FROM sales s
       WHERE s.business_id = dl_my_business()', cols);
END $$;

-- View hizi ni za postgres, kwa hiyo zinapita RLS ya jedwali — ndiyo
-- lengo: muuzaji anapata safu zisizo na bei, na hakuna njia nyingine.
-- ---------- 6b. VIEW ya oda kwa muuzaji (bila faida) ----------
DO $$
DECLARE cols TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='orders') THEN
    SELECT string_agg(
        CASE WHEN column_name = 'items'
             THEN 'dl_strip_item_costs(o.items) AS items'
             ELSE 'o.'||quote_ident(column_name) END,
        ', ' ORDER BY ordinal_position)
      INTO cols
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'orders'
       AND column_name NOT IN ('profit','cost','total_cost');
    EXECUTE format(
      'CREATE OR REPLACE VIEW orders_pub AS SELECT %s FROM orders o
         WHERE o.business_id = dl_my_business()', cols);
    EXECUTE 'GRANT SELECT ON orders_pub TO anon, authenticated';
  END IF;
END $$;

GRANT SELECT ON products_pub, sales_pub TO anon, authenticated;

-- ---------- 7. STOCK: muuzaji apunguze bila kupata row ----------
-- RETURNING ya UPDATE ingempa row nzima (pamoja na buy_price).
-- Kwa hiyo anapunguza kwa function inayorudisha IDADI pekee.
CREATE OR REPLACE FUNCTION dl_deduct_stock(p_id UUID, p_qty NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE nq NUMERIC;
BEGIN
  UPDATE products
     SET quantity = GREATEST(0, COALESCE(quantity, 0) - COALESCE(p_qty, 0))
   WHERE id = p_id AND business_id = dl_my_business()
  RETURNING quantity INTO nq;
  RETURN nq;
END $$;

CREATE OR REPLACE FUNCTION dl_restore_stock(p_id UUID, p_qty NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE nq NUMERIC;
BEGIN
  UPDATE products
     SET quantity = COALESCE(quantity, 0) + COALESCE(p_qty, 0)
   WHERE id = p_id AND business_id = dl_my_business()
  RETURNING quantity INTO nq;
  RETURN nq;
END $$;

GRANT EXECUTE ON FUNCTION dl_deduct_stock(UUID, NUMERIC),
                          dl_restore_stock(UUID, NUMERIC) TO authenticated;

-- ---------- 8. ODA: muuzaji abadilishe bila kuona faida ----------
-- Safu zinazoruhusiwa pekee. Haitarudisha faida kamwe.
CREATE OR REPLACE FUNCTION dl_order_update(p_id UUID, p_patch JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  allowed TEXT[] := ARRAY['paid_amount','remaining_amount','status','completed_at',
                          'cancelled_at','reserved_stock','notes','payment_method'];
  cols TEXT;
  n    INT;
BEGIN
  IF p_id IS NULL OR p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RETURN false;
  END IF;

  -- Safu zinazoruhusiwa PEKEE, na zinazopo kweli kwenye jedwali
  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO cols, n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'orders'
     AND c.column_name = ANY(allowed)
     AND p_patch ? c.column_name;

  IF COALESCE(n, 0) = 0 THEN RETURN false; END IF;

  -- jsonb_populate_record inageuza JSON kwa aina sahihi za safu
  EXECUTE format(
    'UPDATE orders SET (%1$s) = (SELECT %1$s FROM jsonb_populate_record(NULL::orders, $2))
      WHERE id = $1 AND business_id = dl_my_business()', cols)
    USING p_id, p_patch;

  -- FOUND haiwekwi na EXECUTE, kwa hiyo tunasoma ROW_COUNT
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;   -- false kama hakuna oda ya biashara yake iliyobadilika
END $$;

GRANT EXECUTE ON FUNCTION dl_order_update(UUID, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
SELECT 'Hatua 1 imekamilika. Peleka app, jaribu, kisha endesha hatua 2.' AS status;
