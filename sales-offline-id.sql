-- ============================================================
-- DukaLangu — ZUIA MAUZO KUINGIA MARA MBILI
--
-- TATIZO: mauzo ya offline yanatumwa kwa fetch. Mtandao ukikatika
-- BAADA ya database kuyapokea lakini KABLA jibu kufika, kivinjari
-- kinaona "imeshindwa" na kinajaribu tena. Mauzo yale yale
-- yanaingia MARA MBILI — mapato yanazidi, stock inakosea.
--
-- Hii ni ya kawaida sana kwenye mtandao wa vijijini.
--
-- SULUHISHO: offline_id (kila mauzo lina lake) + unique index.
-- Jaribio la pili linakataliwa kwa 409, na app inajua maana yake
-- ni "yalishaingia" — si kosa.
--
-- Salama kuendesha mara nyingi. Run kwenye Supabase SQL Editor.
-- ============================================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS offline_id TEXT;

-- Safisha nakala zilizopo kabla ya kuweka unique index.
-- Inahifadhi ya KWANZA ya kila kundi, inafuta zilizorudia.
WITH nakala AS (
  SELECT id, row_number() OVER (
           PARTITION BY business_id, offline_id ORDER BY created_at, id
         ) AS n
    FROM sales
   WHERE offline_id IS NOT NULL
)
DELETE FROM sales s USING nakala d
 WHERE s.id = d.id AND d.n > 1;

CREATE UNIQUE INDEX IF NOT EXISTS sales_offline_id_uniq
  ON sales (business_id, offline_id)
  WHERE offline_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
SELECT 'Mauzo hayaweza kuingia mara mbili tena.' AS status;
