-- ============================================================
-- DukaLangu — UCHAMBUZI WA ASUBUHI + GHARAMA ZA WAKALA
--
-- Sehemu 8/9. Endesha BAADA ya sehemu 1–7.
--
-- 1. Arifa ya asubuhi: mmiliki anapata SMS kila siku saa 12
--    asubuhi yenye uchambuzi wa miamala ya jana. Tofauti na
--    arifa nyingine, hii inakuja HATA KAMA hakuna tatizo —
--    ndiyo maana inaitwa uchambuzi, si onyo. Na inamwambia
--    kama siku HAIKUFUNGWA, jambo ambalo arifa ya kufunga
--    siku haiwezi kumwambia (haikufungwa, haikutumwa).
--
-- 2. Gharama: wakala naye anaandika. Yeye ndiye yupo kibandani,
--    anaona kinachohitajika. Mmiliki anaona za ofisini na za
--    kibandani kwa kutenganishwa, na KUFUTA ni kwake peke yake.
--    (Kuandika kwa wakala tayari kunaruhusiwa na function
--    dl_wakala_add_expense tangu sehemu ya 5 — hapa tunaongeza
--    njia ya kuona nani ameandika nini.)
--
-- Salama kuendesha mara nyingi.
-- ============================================================

ALTER TABLE wakala_settings ADD COLUMN IF NOT EXISTS arifa_asubuhi BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- Uchambuzi wa siku moja — kila kitu kinachohitajika kwa SMS,
-- kwenye ombi MOJA. Cron inaita hii kwa kila duka.
-- ============================================================
CREATE OR REPLACE FUNCTION dl_wakala_uchambuzi(p_biz UUID, p_day DATE)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $uc$
  WITH t AS (
    SELECT * FROM wakala_tx WHERE business_id = p_biz AND tx_date = p_day
  ), g AS (
    SELECT * FROM wakala_expenses WHERE business_id = p_biz AND tarehe = p_day
  ), d AS (
    SELECT * FROM wakala_days WHERE business_id = p_biz AND day = p_day
  )
  SELECT jsonb_build_object(
    'day',        p_day,
    'idadi',      (SELECT count(*) FROM t WHERE reverses IS NULL),
    'marekebisho',(SELECT count(*) FROM t WHERE reverses IS NOT NULL),
    'kuweka',     (SELECT COALESCE(SUM(amount),0) FROM t WHERE type='deposit'  AND reverses IS NULL),
    'kutoa',      (SELECT COALESCE(SUM(amount),0) FROM t WHERE type='withdraw' AND reverses IS NULL),
    'kamisheni',  (SELECT COALESCE(SUM(CASE WHEN reverses IS NOT NULL THEN -1 ELSE 1 END
                     * CASE WHEN type IN ('deposit','withdraw') THEN commission ELSE 0 END),0) FROM t),
    'gharama',    (SELECT COALESCE(SUM(amount),0) FROM g),
    'thibitishwa',(SELECT count(*) FROM t WHERE jina_thibitishwa AND reverses IS NULL
                     AND type IN ('deposit','withdraw')),
    'zaMteja',    (SELECT count(*) FROM t WHERE reverses IS NULL AND type IN ('deposit','withdraw')),
    'imefungwa',  (SELECT count(*) > 0 FROM d),
    'tofautiTaslimu', (SELECT COALESCE(MAX(variance_cash),0) FROM d),
    'tofautiFloat',   (SELECT COALESCE(MAX(variance_float),0) FROM d),
    'float', (
      SELECT COALESCE(jsonb_object_agg(l.name, dl_wakala_opening_float(l.id, p_day)
        + COALESCE((SELECT SUM(CASE WHEN t2.reverses IS NOT NULL THEN -1 ELSE 1 END
            * dl_wakala_sign(t2.type,'float') * t2.amount)
           FROM wakala_tx t2
          WHERE t2.business_id = p_biz AND t2.tx_date = p_day AND t2.line_id = l.id), 0)), '{}'::jsonb)
        FROM wakala_lines l WHERE l.business_id = p_biz AND l.active
    )
  )
$uc$;

DO $g$ BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION dl_wakala_uchambuzi(UUID,DATE) TO authenticated, service_role';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 8/9 SAWA — uchambuzi wa asubuhi umewekwa.' AS status;
