-- ============================================================
-- DukaLangu — NJIA YA MALIPO KWENYE MATUMIZI
--
-- Kwa nini: hesabu ya "pesa mkononi" inahitaji kujua matumizi
-- yalilipwa vipi. Ukilipa kwa M-Pesa, pesa ya mkononi haipungui.
-- Bila safu hii, kila matumizi yanahesabiwa kama taslimu.
--
-- SI LAZIMA — mfumo unafanya kazi bila hii (matumizi yote
-- yanahesabiwa kama taslimu, kama ilivyokuwa). Endesha ili
-- hesabu iwe sahihi zaidi.
--
-- Salama kuendesha mara nyingi. Run kwenye Supabase SQL Editor.
-- ============================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Rekodi za zamani ni taslimu
UPDATE expenses SET payment_method = 'cash' WHERE payment_method IS NULL;

NOTIFY pgrst, 'reload schema';
SELECT 'Matumizi sasa yanaweza kuhifadhi njia ya malipo.' AS status;
