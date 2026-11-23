-- ============================================================
-- DukaLangu — UDHIBITI WA ADMIN KWA ARIFA ZA UWAKALA
--
-- Sehemu 10/10. Endesha BAADA ya sehemu 1–9.
--
-- Admin anaweza kuzima aina yoyote ya arifa ya uwakala kwa mfumo
-- mzima. Kizuizi kipo kwenye api/send-sms.js, kwa sababu njia zote
-- mbili — app na cron — zinapitia hapo. Mmiliki ataendelea kuona
-- arifa imewashwa kwake, lakini SMS haitatoka.
--
-- Hapa tunaweka funguo zenyewe. Zote zinaanza 'true' ili tabia
-- isibadilike kwa mtu yeyote.
--
-- Salama kuendesha mara nyingi.
-- ============================================================

INSERT INTO settings(key, value) VALUES
  ('wakala_sms_enabled',          'true'),
  ('wakala_tofauti_enabled',      'true'),
  ('wakala_float_enabled',        'true'),
  ('wakala_mkubwa_enabled',       'true'),
  ('wakala_hitimisho_enabled',    'true'),
  ('wakala_asubuhi_enabled',      'true'),
  ('wakala_ukaguzi_enabled',      'true')
ON CONFLICT (key) DO NOTHING;

-- Admin anahitaji kusoma mipangilio ya arifa ya kila duka ili
-- aone nani amewasha nini. Hii ni kusoma TU — hawezi kubadilisha
-- mipangilio ya mmiliki.
DROP POLICY IF EXISTS wakala_settings_admin ON wakala_settings;
CREATE POLICY wakala_settings_admin ON wakala_settings FOR SELECT TO authenticated
  USING (dl_my_role() = 'admin');

NOTIFY pgrst, 'reload schema';

SELECT 'Sehemu 10/10 SAWA — admin anasimamia arifa za uwakala.' AS status;
