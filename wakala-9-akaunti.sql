-- ============================================================
-- DukaLangu — AKAUNTI YA UWAKALA PEKEE
--
-- Sehemu 9/9. Endesha BAADA ya sehemu 1–8.
--
-- Wapo watu wanaotaka kusimamia uwakala pekee, hawana duka.
-- Hawapaswi kuona bidhaa, mauzo wala stock — hata siku ya kwanza.
--
-- `akaunti_aina` ni tofauti na `business_type`:
--   business_type = aina ya DUKA (retail, pharmacy, hardware...)
--   akaunti_aina  = HUDUMA aliyonunua (duka, uwakala, zote)
--
-- Chaguo-msingi ni 'duka', kwa hiyo maduka YOTE yaliyopo
-- hayabadiliki hata kidogo.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS akaunti_aina TEXT NOT NULL DEFAULT 'duka';

DO $a$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_akaunti_aina_ok') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_akaunti_aina_ok
      CHECK (akaunti_aina IN ('duka','uwakala','zote'));
  END IF;
END $a$;

-- Akaunti ya uwakala pekee LAZIMA iwe na huduma imewashwa — vinginevyo
-- mteja aliyejisajili mwenyewe angeingia na kukuta hana chochote.
CREATE OR REPLACE FUNCTION dl_wakala_akaunti_mpya() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $nw$
BEGIN
  IF NEW.akaunti_aina IN ('uwakala','zote') THEN
    NEW.wakala_enabled := true;
  END IF;
  RETURN NEW;
END $nw$;

DROP TRIGGER IF EXISTS businesses_wakala_aina ON businesses;
CREATE TRIGGER businesses_wakala_aina BEFORE INSERT OR UPDATE OF akaunti_aina ON businesses
  FOR EACH ROW EXECUTE FUNCTION dl_wakala_akaunti_mpya();

-- Maduka yaliyokwisha washiwa uwakala kabla ya safu hii kuwepo
UPDATE businesses SET akaunti_aina = 'zote'
 WHERE wakala_enabled AND akaunti_aina = 'duka';

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 9/9 SAWA — akaunti ya uwakala pekee imewezeshwa.' AS status;
