import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  RISITI, kifurushiJina, kifurushiMaelezo,
  eat, tareheFupi, tareheKati, tareheNdefu, tareheSaa, mwishoWaHuduma,
  fmtTsh, niNambaHalali, safishaNamba, risitiNjia, risitiUrl, risitiUrlFupi,
  niGsm7, urefuWaSms, sehemuZaSms, ujumbeWaRisiti, risitiKutoka, njiaJina,
} from './risiti';

describe('kifurushiJina', () => {
  it('duka linaonyesha jina la plan', () => {
    expect(kifurushiJina({ aina: RISITI.duka, plan: 'basic' })).toBe('Duka - Basic');
    expect(kifurushiJina({ aina: RISITI.duka, plan: 'premium' })).toBe('Duka - Premium');
    expect(kifurushiJina({ aina: RISITI.duka, plan: 'biashara' })).toBe('Duka - Biashara');
  });
  it('plan ya zamani (enterprise) bado inafanya kazi', () => {
    expect(kifurushiJina({ aina: RISITI.duka, plan: 'enterprise' })).toBe('Duka - Biashara');
  });
  it('plan isiyojulikana inarudi Basic', () => {
    expect(kifurushiJina({ aina: RISITI.duka, plan: 'kitu-kingine' })).toBe('Duka - Basic');
    expect(kifurushiJina({ aina: RISITI.duka })).toBe('Duka - Basic');
  });
  it('uwakala pekee na uwakala wa nyongeza ni tofauti', () => {
    expect(kifurushiJina({ aina: RISITI.uwakala, akaunti: 'uwakala' })).toBe('Uwakala pekee');
    expect(kifurushiJina({ aina: RISITI.uwakala, akaunti: 'zote' })).toBe('Uwakala (nyongeza ya duka)');
    expect(kifurushiJina({ aina: RISITI.uwakala, akaunti: 'duka' })).toBe('Uwakala (nyongeza ya duka)');
  });
  it('hakuna em dash — risiti hii inakwenda kwa SMS', () => {
    ['basic', 'premium', 'biashara'].forEach(p => {
      expect(niGsm7(kifurushiJina({ aina: RISITI.duka, plan: p }))).toBe(true);
    });
    expect(niGsm7(kifurushiJina({ aina: RISITI.uwakala, akaunti: 'uwakala' }))).toBe(true);
    expect(niGsm7(kifurushiJina({ aina: RISITI.uwakala, akaunti: 'zote' }))).toBe(true);
  });
  it('maelezo yanatofautiana kwa aina', () => {
    expect(kifurushiMaelezo({ aina: RISITI.uwakala, akaunti: 'uwakala' })).toBe('Usimamizi wa uwakala');
    expect(kifurushiMaelezo({ aina: RISITI.uwakala, akaunti: 'zote' })).toContain('duka');
    expect(kifurushiMaelezo({ aina: RISITI.duka, plan: 'basic' })).toBeTruthy();
  });
});

describe('tarehe za Afrika Mashariki', () => {
  it('saa 23:30 UTC ni siku inayofuata Tanzania', () => {
    // 23:30 UTC tarehe 24 = 02:30 EAT tarehe 25
    expect(tareheFupi('2026-11-24T23:30:00Z')).toBe('25/11/2026');
    expect(tareheKati('2026-11-24T23:30:00Z')).toBe('25 Nov 2026');
  });
  it('haitegemei timezone ya kifaa', () => {
    const d = '2026-12-24T21:00:00Z'; // 00:00 EAT tarehe 25
    expect(tareheNdefu(d)).toBe('25 Desemba 2026');
    expect(tareheSaa(d)).toBe('25 Desemba 2026, 00:00');
  });
  it('mwezi wa kwanza na wa mwisho', () => {
    expect(tareheNdefu('2026-01-05T09:00:00Z')).toBe('5 Januari 2026');
    expect(tareheNdefu('2026-12-31T09:00:00Z')).toBe('31 Desemba 2026');
  });
  it('tarehe mbovu hairudishi "Invalid Date"', () => {
    ['', null, undefined, 'si-tarehe'].forEach(x => {
      expect(tareheFupi(x)).toBe('—');
      expect(tareheKati(x)).toBe('—');
      expect(tareheSaa(x)).toBe('—');
      expect(eat(x)).toBe(null);
    });
  });
  it('saa zina sifuri mbele', () => {
    expect(tareheSaa('2026-11-24T06:05:00Z')).toBe('24 Novemba 2026, 09:05');
    expect(tareheFupi('2026-01-02T06:00:00Z')).toBe('02/01/2026');
  });
});

describe('mwishoWaHuduma', () => {
  it('inaongeza siku 30', () => {
    expect(tareheFupi(mwishoWaHuduma('2026-11-24T09:00:00Z', 30))).toBe('24/12/2026');
  });
  it('siku zisizowekwa ni 30', () => {
    expect(mwishoWaHuduma('2026-11-24T09:00:00Z')).toBe(mwishoWaHuduma('2026-11-24T09:00:00Z', 30));
  });
  it('tarehe mbovu haivunji hesabu', () => {
    expect(() => mwishoWaHuduma('si-tarehe', 30)).not.toThrow();
    expect(new Date(mwishoWaHuduma('si-tarehe', 30)).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('fmtTsh', () => {
  it('inaweka koma', () => {
    expect(fmtTsh(28000)).toBe('TZS 28,000');
    expect(fmtTsh(18300)).toBe('TZS 18,300');
    expect(fmtTsh(1500000)).toBe('TZS 1,500,000');
  });
  it('sifuri na takataka', () => {
    expect(fmtTsh(0)).toBe('TZS 0');
    expect(fmtTsh(null)).toBe('TZS 0');
    expect(fmtTsh('hapana')).toBe('TZS 0');
  });
  it('ni GSM-7 (inakwenda kwa SMS)', () => {
    expect(niGsm7(fmtTsh(28000))).toBe(true);
  });
});

describe('namba ya risiti', () => {
  it('inakubali umbo sahihi', () => {
    expect(niNambaHalali('DL-2026-000418')).toBe(true);
    expect(niNambaHalali('dl-2026-000418')).toBe(true); // inasafishwa
  });
  it('inakataa umbo lisilo sahihi', () => {
    ['', 'DL-2026-41', 'DL-26-000418', '2026-000418', 'DL-2026-0004188', 'DROP TABLE', null]
      .forEach(x => expect(niNambaHalali(x)).toBe(false));
  });
  it('safishaNamba inaondoa nafasi na kubadilisha herufi kubwa', () => {
    expect(safishaNamba('  dl-2026-000418 ')).toBe('DL-2026-000418');
    expect(safishaNamba('DL-2026- 000418')).toBe('DL-2026-000418');
    expect(safishaNamba(null)).toBe('');
  });
});

describe('kiungo cha risiti', () => {
  it('njia ni /r/NAMBA', () => {
    expect(risitiNjia('dl-2026-000418')).toBe('/r/DL-2026-000418');
  });
  it('url kamili na ya msingi', () => {
    expect(risitiUrl('DL-2026-000418')).toBe('https://dukalangu.com/r/DL-2026-000418');
    expect(risitiUrl('DL-2026-000418', 'https://dukalangu.com/')).toBe('https://dukalangu.com/r/DL-2026-000418');
    expect(risitiUrl('DL-2026-000418', 'http://localhost:5173')).toBe('http://localhost:5173/r/DL-2026-000418');
  });
  it('url fupi ya SMS haina https://', () => {
    expect(risitiUrlFupi('DL-2026-000418')).toBe('dukalangu.com/r/DL-2026-000418');
    expect(niGsm7(risitiUrlFupi('DL-2026-000418'))).toBe(true);
  });
});

describe('GSM-7', () => {
  it('herufi za kawaida zinapita', () => {
    expect(niGsm7('DUKALANGU Risiti DL-2026-000418 TZS 28,000')).toBe(true);
    expect(niGsm7('Inaisha 24/12/2026.')).toBe(true);
  });
  it('emoji na alama za Unicode zinakataliwa', () => {
    expect(niGsm7('Asante 🎉')).toBe(false);
    expect(niGsm7('Duka — Basic')).toBe(false);   // em dash
    expect(niGsm7('Risiti “yako”')).toBe(false);  // alama za nukuu za kupinda
    expect(niGsm7('TZS 28 000 •')).toBe(false);
  });
  it('urefu unahesabu herufi za nyongeza mara mbili', () => {
    expect(urefuWaSms('abc')).toBe(3);
    expect(urefuWaSms('a[b]')).toBe(6); // [ na ] ni za nyongeza
  });
  it('sehemu zinahesabiwa kwa usahihi', () => {
    expect(sehemuZaSms('a'.repeat(160))).toBe(1);
    expect(sehemuZaSms('a'.repeat(161))).toBe(2);
    expect(sehemuZaSms('🎉'.repeat(70))).toBe(1);
    expect(sehemuZaSms('🎉'.repeat(71))).toBe(2);
  });
});

describe('ujumbeWaRisiti', () => {
  const sampuli = {
    no: 'DL-2026-000418', kiasi: 28000, kifurushi: 'Duka - Biashara',
    siku: 30, inaisha: '2026-12-24T09:00:00Z',
  };

  it('una vitu muhimu', () => {
    const m = ujumbeWaRisiti(sampuli);
    expect(m).toContain('DUKALANGU');
    expect(m).toContain('DL-2026-000418');
    expect(m).toContain('TZS 28,000');
    expect(m).toContain('Duka - Biashara');
    expect(m).toContain('siku 30');
    expect(m).toContain('24/12/2026');
    expect(m).toContain('dukalangu.com/r/DL-2026-000418');
  });

  it('NI SMS MOJA — kila kifurushi, kila bei', () => {
    const vifurushi = [
      kifurushiJina({ aina: RISITI.duka, plan: 'basic' }),
      kifurushiJina({ aina: RISITI.duka, plan: 'premium' }),
      kifurushiJina({ aina: RISITI.duka, plan: 'biashara' }),
      kifurushiJina({ aina: RISITI.uwakala, akaunti: 'uwakala' }),
      kifurushiJina({ aina: RISITI.uwakala, akaunti: 'zote' }),
    ];
    for (const k of vifurushi) {
      for (const kiasi of [13000, 15000, 18300, 25000, 28000, 35000, 1500000]) {
        const m = ujumbeWaRisiti({ ...sampuli, kifurushi: k, kiasi });
        expect(niGsm7(m), `si GSM-7: ${m}`).toBe(true);
        expect(sehemuZaSms(m), `SMS zaidi ya moja (${urefuWaSms(m)}): ${m}`).toBe(1);
      }
    }
  });

  it('hakuna emoji wala Unicode popote', () => {
    const m = ujumbeWaRisiti(sampuli);
    expect(niGsm7(m)).toBe(true);
    expect(/[\u{1F300}-\u{1FAFF}←-⇿☀-➿]/u.test(m)).toBe(false);
  });

  it('vipande vinavyokosekana havitoi "undefined"', () => {
    const m = ujumbeWaRisiti({ kiasi: 15000 });
    expect(m).not.toContain('undefined');
    expect(m).not.toContain('null');
    expect(m).not.toContain('NaN');
    expect(m).toContain('TZS 15,000');
    expect(sehemuZaSms(m)).toBe(1);
  });

  it('bila namba, hakuna kiungo kilichovunjika', () => {
    const m = ujumbeWaRisiti({ kiasi: 15000, kifurushi: 'Duka - Basic', siku: 30 });
    expect(m).not.toContain('/r/');
    expect(m).not.toContain('Risiti ');
  });
});

describe('risitiKutoka', () => {
  const biz = { name: 'DUKA LA MAMA JOHN', phone: '0754812390', region: 'Tabora', district: 'Urambo', akaunti_aina: 'zote' };

  it('inasoma safu ya malipo ya duka', () => {
    const r = risitiKutoka({
      risiti_no: 'DL-2026-000418', amount: 15000, days: 30, plan: 'basic',
      paid_at: '2026-11-24T06:14:00Z', created_at: '2026-11-24T06:10:00Z',
      phone: '0754812390', business_name: 'DUKA LA MAMA JOHN',
      provider_ref: 'DL-ABC123', external_id: 'CJ26112409KX', status: 'paid',
    }, biz);
    expect(r.no).toBe('DL-2026-000418');
    expect(r.aina).toBe(RISITI.duka);
    expect(r.kiasi).toBe(15000);
    expect(r.kifurushi).toBe('Duka - Basic');
    expect(tareheFupi(r.inaisha)).toBe('24/12/2026');
    expect(r.mahali).toBe('Urambo, Tabora');
    expect(r.hali).toBe('paid');
  });

  it('reference ya WK- inajulikana kuwa ya uwakala', () => {
    const r = risitiKutoka({ risiti_no: 'DL-2026-000419', amount: 13000, days: 30, provider_ref: 'WK-XYZ', paid_at: '2026-11-24T06:14:00Z' }, biz);
    expect(r.aina).toBe(RISITI.uwakala);
    expect(r.kifurushi).toBe('Uwakala (nyongeza ya duka)');
  });

  it('akaunti ya uwakala pekee', () => {
    const r = risitiKutoka({ amount: 18300, days: 30, aina: RISITI.uwakala, paid_at: '2026-11-24T06:14:00Z' },
      { ...biz, akaunti_aina: 'uwakala' });
    expect(r.kifurushi).toBe('Uwakala pekee');
    expect(r.kiasi).toBe(18300);
  });

  it('safu tupu hairushi kosa', () => {
    expect(() => risitiKutoka()).not.toThrow();
    const r = risitiKutoka();
    expect(r.no).toBe('');
    expect(r.kiasi).toBe(0);
    expect(r.siku).toBe(30);
  });

  it('inaisha iliyotoka database inashinda hesabu', () => {
    const r = risitiKutoka({ amount: 15000, days: 30, inaisha: '2027-01-15T00:00:00Z', paid_at: '2026-11-24T06:14:00Z' }, biz);
    expect(tareheFupi(r.inaisha)).toBe('15/01/2027');
  });
});

// ============================================================
// Faili haya yanatumika na api/payments.js kwenye Node ya Vercel.
// Node HAITAFUTI faili bila kiendelezo — Vite ndiyo inayofanya hivyo.
// Kiendelezo kikikosekana, API NZIMA ya malipo inakufa.
// ============================================================
describe('import za Node (api/payments.js)', () => {
  const faili = ['src/utils/risiti.js', 'src/utils/wakala.js', 'src/config/plans.js'];
  faili.forEach(f => {
    it(`${f}: kila import ya ndani ina .js`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
      const mbaya = [...src.matchAll(/from\s+['"](\.[^'"]*)['"]/g)]
        .map(m => m[1]).filter(p => !p.endsWith('.js') && !p.endsWith('.json'));
      expect(mbaya, `import bila kiendelezo: ${mbaya.join(', ')}`).toEqual([]);
    });
  });

  it('api/payments.js inaita faili kwa kiendelezo', () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), 'api/payments.js'), 'utf8');
    const mbaya = [...src.matchAll(/from\s+['"](\.[^'"]*)['"]/g)]
      .map(m => m[1]).filter(p => !p.endsWith('.js'));
    expect(mbaya).toEqual([]);
  });
});

describe('njiaJina', () => {
  it('majina rafiki', () => {
    expect(njiaJina('mpesa')).toBe('M-Pesa (Vodacom)');
    expect(njiaJina('M-Pesa')).toBe('M-Pesa (Vodacom)');
    expect(njiaJina('airtel')).toBe('Airtel Money');
    expect(njiaJina('halopesa')).toBe('HaloPesa');
    expect(njiaJina('tigo')).toBe('Mixx by Yas (Tigo)');
  });
  it('isiyojulikana inarudi jumla', () => {
    expect(njiaJina('')).toBe('Simu (Mobile Money)');
    expect(njiaJina(null)).toBe('Simu (Mobile Money)');
    expect(njiaJina('kitu')).toBe('Simu (Mobile Money)');
  });
});
