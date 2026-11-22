-- Sehemu 1/8 ya wakala-migration.sql — endesha kwa mpangilio
-- ============================================================
-- DukaLangu — HUDUMA YA UWAKALA (jedwali + kinga)
--
-- HATUA 1 YA 5. Hii HAIGUSI kitu kilichopo. Haibadilishi jedwali
-- lolote la duka, haifuti chochote, na app ya sasa haitaona
-- tofauti yoyote. Jedwali linakaa tupu hadi admin awashe huduma.
--
-- Salama kuendesha mara nyingi. Run kwenye Supabase SQL Editor.
--
-- ------------------------------------------------------------
-- MIANYA YA UPOTEVU WA PESA NA JINSI ZINAVYOZIBWA HAPA
--
-- 1. Wakala anaandika kidogo kuliko alivyotoa
--    -> Float halisi haikubaliani na hesabu. Upatanisho wa siku
--       unakamata tofauti (wakala_days.variance).
--
-- 2. Hakuandika muamala kabisa
--    -> Sawa na #1 — float inapungua bila rekodi.
--
-- 3. Anafuta muamala baada ya kuandika
--    -> HARUHUSIWI KUFUTA WALA KUBADILISHA. RLS inampa INSERT
--       pekee. Kurekebisha ni kuandika REJESHO (reverses), na
--       rejesho linaonekana kwa mmiliki.
--
-- 4. Anachukua taslimu kasheni
--    -> Upatanisho wa taslimu (counted_cash) unakamata.
--
-- 5. Anaandika muamala wa jana leo, au anabadilisha tarehe
--    -> Siku iliyofungwa HAIPOKEI muamala mpya (trigger).
--
-- 6. Muamala unaingia mara mbili (mtandao hafifu)
--    -> offline_id + unique index, kama mauzo.
--
-- 7. Anajiwekea kamisheni kubwa ili ionekane amepata zaidi
--    -> Kamisheni haiwezi kuzidi kiasi cha muamala (CHECK), na
--       haigusi taslimu wala float — kwa hiyo haibadilishi
--       upatanisho hata kidogo.
-- ============================================================


-- ============================================================
-- 1. BIASHARA: usajili wa uwakala, pekee na wa duka
--    wakala_enabled      — admin pekee anawasha
--    wakala_paid_until   — malipo yake yake, hayahusiani na duka
-- ============================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS wakala_enabled    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS wakala_paid_until TIMESTAMPTZ;


-- ============================================================
-- 2. LAINI ZA FLOAT (M-Pesa, Airtel Money, Mix by Yas, Halopesa...)
--    Kila laini ina float yake. Taslimu ni MOJA kwa shughuli zote.
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  short_code    TEXT,
  opening_float NUMERIC(14,2) NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wakala_lines_biz ON wakala_lines (business_id, active);


-- ============================================================
-- 3. MIAMALA
--
--    type: deposit | withdraw | float_buy | float_sell
--          cash_in | cash_out
--
--    reverses: kitambulisho cha muamala unaorekebishwa. Rejesho
--              ni kinyume kamili cha muamala wa awali.
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_tx (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  line_id      UUID REFERENCES wakala_lines(id) ON DELETE RESTRICT,
  tx_date      DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,
  type         TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  commission   NUMERIC(14,2) NOT NULL DEFAULT 0,
  customer     TEXT,
  phone        TEXT,
  ref          TEXT,
  note         TEXT,
  reverses     UUID REFERENCES wakala_tx(id) ON DELETE RESTRICT,
  offline_id   TEXT,
  recorded_by  UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wakala_tx_type_ok CHECK (
    type IN ('deposit','withdraw','float_buy','float_sell','cash_in','cash_out')
  ),
  -- Kiasi lazima kizidi sifuri. Muamala wa sifuri ni kelele tu.
  CONSTRAINT wakala_tx_amount_ok CHECK (amount > 0),
  -- Kamisheni haiwezi kuwa hasi wala kuzidi muamala wenyewe
  CONSTRAINT wakala_tx_comm_ok CHECK (commission >= 0 AND commission <= amount),
  -- Kuweka/kutoa/float lazima ziwe na laini; mtaji hauna
  CONSTRAINT wakala_tx_line_ok CHECK (
    (type IN ('cash_in','cash_out') AND line_id IS NULL)
    OR (type NOT IN ('cash_in','cash_out') AND line_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS wakala_tx_biz_date ON wakala_tx (business_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS wakala_tx_line     ON wakala_tx (line_id, tx_date);
CREATE INDEX IF NOT EXISTS wakala_tx_by       ON wakala_tx (recorded_by, tx_date);

-- Kinga #6: muamala mmoja hauwezi kuingia mara mbili
CREATE UNIQUE INDEX IF NOT EXISTS wakala_tx_offline_uniq
  ON wakala_tx (business_id, offline_id) WHERE offline_id IS NOT NULL;

-- Muamala mmoja unarekebishwa MARA MOJA pekee. Bila hii, mtu
-- angeweza kurejesha muamala ule ule mara kumi — kosa lile lile
-- lililotokea kwenye marejesho ya bidhaa.
CREATE UNIQUE INDEX IF NOT EXISTS wakala_tx_reverses_uniq
  ON wakala_tx (reverses) WHERE reverses IS NOT NULL;


-- ============================================================
-- 4. KUFUNGA SIKU (upatanisho)
--
--    lines: {"<line_id>": {"counted":..,"expected":..,"variance":..}}
--    Laini ni mbili hadi nne, kwa hiyo jsonb inatosha — hakuna
--    sababu ya jedwali la tano.
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_days (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day            DATE NOT NULL,
  lines          JSONB NOT NULL DEFAULT '{}'::jsonb,
  counted_cash   NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_cash  NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_cash  NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_float NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission     NUMERIC(14,2) NOT NULL DEFAULT 0,
  tx_count       INT NOT NULL DEFAULT 0,
  note           TEXT,
  closed_by      UUID,
  closed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Siku moja inafungwa MARA MOJA
CREATE UNIQUE INDEX IF NOT EXISTS wakala_days_uniq ON wakala_days (business_id, day);


-- ============================================================
-- 5. MIPANGILIO
--    cash_opening — taslimu ya kuanzia (mara ya kwanza pekee)
--    threshold    — tofauti ndogo inayokubalika bila onyo
--    alert_phone  — namba ya kupata SMS ya tofauti
-- ============================================================
CREATE TABLE IF NOT EXISTS wakala_settings (
  business_id   UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  cash_opening  NUMERIC(14,2) NOT NULL DEFAULT 0,
  threshold     NUMERIC(14,2) NOT NULL DEFAULT 1000,
  alert_phone   TEXT,
  alert_sms     BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
NOTIFY pgrst, 'reload schema';
SELECT 'Sehemu 1/8 SAWA — jedwali yametengenezwa.' AS status;
