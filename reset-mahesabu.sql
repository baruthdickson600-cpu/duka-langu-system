-- ============================================================
-- DukaLangu — FUTA MAHESABU YOTE YA ZAMANI (anza mwanzo kabisa)
--
-- ⚠️ ONYO: Hii inafuta rekodi za fedha za zamani KABISA.
--    Haiwezi kurudishwa. Fanya backup kwanza (Supabase > Database > Backups).
--
-- HAIFUTI: biashara (businesses), watumiaji (users), bidhaa, mauzo ya wateja.
--          Inafuta tu rekodi za fedha za upande wa DukaLangu.
--
-- Endesha kwenye Supabase SQL Editor.
-- ============================================================

BEGIN;

-- 1) Tokens za zamani — ndizo zilizokuwa zinatengeneza "mapato" bandia
--    (mf. tokens 40 × 15,000 = 600,000 ambayo si pesa halisi).
TRUNCATE TABLE tokens;

-- 2) Maombi ya malipo ya zamani (mfumo wa kulipa kwa mkono)
TRUNCATE TABLE payment_requests;

-- 3) Malipo ya gateway (payment_transactions)
--    ⚠️ Futa hii TU kama unataka kuanza bila malipo yoyote ya zamani.
--    Kama kuna malipo halisi ya wateja uliyopokea tayari na unataka yabaki,
--    FUTA (comment) mstari huu kwa kuweka -- mbele yake.
TRUNCATE TABLE payment_transactions;

-- 4) Matoleo ya pesa (payouts) — historia ya kutoa pesa
TRUNCATE TABLE payouts;

-- 5) Matumizi, bajeti, mishahara, madeni
TRUNCATE TABLE system_expenses;
TRUNCATE TABLE budgets;
TRUNCATE TABLE payroll;
TRUNCATE TABLE debt_payments;
TRUNCATE TABLE marketing_debts;

-- 6) Kumbukumbu za ukaguzi na tahadhari
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE smart_alerts;

COMMIT;

NOTIFY pgrst, 'reload schema';
SELECT 'Mahesabu yote yamefutwa — mfumo umeanza mwanzo.' AS status;
