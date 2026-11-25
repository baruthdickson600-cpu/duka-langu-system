import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  HALI, HALI_ZOTE, haliLab, haliRangi, haliMteja, niWazi,
  KITENGO, VITENGO_ZOTE, kitengoLab, kitengoKwa,
  KIPAUMBELE, kipaumbeleLab, kipaumbeleSaa, niDharura,
  niTiketiHalali, safishaTiketi,
  tanguLini, imechelewa,
  smsTiketiMpya, smsTiketiHali, smsTiketiKazi, smsAfya, smsWasiolipa,
  AINA_ZOTE, ainaLab, ARIFA_ZA_CHEO, CHEO_ZA_KAZI, cheoCha, cheoLab,
  arifaZake, anapokea, wapokeajiWa, wapokeajiWaTiketi, watejaWake,
  siraZaMteja, anahitajiKufuatiliwa, orodhaYaWasiolipa,
  niGsm7, sehemuZaSms, urefuWaSms,
} from './tiketi';

// Kila SMS ya mfumo lazima iwe GSM-7 na isizidi SMS moja.
const niSmsMoja = (m, jina) => {
  expect(niGsm7(m), `${jina}: si GSM-7 -> ${m}`).toBe(true);
  expect(sehemuZaSms(m), `${jina}: SMS ${sehemuZaSms(m)} (herufi ${urefuWaSms(m)}) -> ${m}`).toBe(1);
  expect(m).not.toContain('undefined');
  expect(m).not.toContain('null');
  expect(m).not.toContain('NaN');
};

describe('hali ya tiketi', () => {
  it('majina na rangi', () => {
    expect(haliLab('open')).toBe('Wazi');
    expect(haliLab('closed')).toBe('Imefungwa');
    expect(haliRangi('closed')).toBe('#0A6E47');
  });
  it('hali isiyojulikana inarudi "Wazi" bila kuvunjika', () => {
    expect(haliLab('kitu')).toBe('Wazi');
    expect(haliLab(undefined)).toBe('Wazi');
    expect(haliRangi('kitu')).toBe('#9AA5A0');
  });
  it('mteja anaona lugha nyepesi, si ya ndani', () => {
    expect(haliMteja('working')).toBe('Inafanyiwa kazi');
    expect(haliMteja('closed')).toBe('Imekamilika');
  });
  it('niWazi ni kila kitu isipokuwa imefungwa', () => {
    HALI_ZOTE.forEach(h => expect(niWazi(h)).toBe(h !== 'closed'));
  });
  it('hali zote zina rangi na jina la mteja', () => {
    HALI_ZOTE.forEach(h => {
      expect(HALI[h].lab).toBeTruthy();
      expect(HALI[h].rangi).toMatch(/^#[0-9A-F]{6}$/i);
      expect(HALI[h].mteja).toBeTruthy();
    });
  });
});

describe('vitengo', () => {
  it('kila kitengo kina mtu anayeshughulikia', () => {
    VITENGO_ZOTE.forEach(k => {
      expect(KITENGO[k].lab).toBeTruthy();
      expect(['masoko', 'ufundi']).toContain(KITENGO[k].kwa);
    });
  });
  it('kiufundi kinakwenda kwa fundi, kingine kwa masoko', () => {
    expect(kitengoKwa('kiufundi')).toBe('ufundi');
    expect(kitengoKwa('malipo')).toBe('masoko');
    expect(kitengoKwa('kisichojulikana')).toBe('masoko');
  });
  it('vitengo vinalingana na CHECK ya database', () => {
    expect(VITENGO_ZOTE.sort()).toEqual(['kiufundi', 'mafunzo', 'malipo', 'nyingine', 'ombi']);
  });
  it('majina ni GSM-7 — yanakwenda kwenye SMS', () => {
    VITENGO_ZOTE.forEach(k => expect(niGsm7(kitengoLab(k)), kitengoLab(k)).toBe(true));
  });
});

describe('kipaumbele', () => {
  it('dharura ina muda mfupi zaidi', () => {
    expect(kipaumbeleSaa('urgent')).toBeLessThan(kipaumbeleSaa('normal'));
    expect(kipaumbeleSaa('normal')).toBeLessThan(kipaumbeleSaa('low'));
  });
  it('isiyojulikana ni kawaida', () => {
    expect(kipaumbeleLab('kitu')).toBe('Kawaida');
    expect(kipaumbeleSaa(undefined)).toBe(24);
  });
  it('niDharura', () => {
    expect(niDharura('urgent')).toBe(true);
    expect(niDharura('normal')).toBe(false);
    expect(niDharura(null)).toBe(false);
  });
});

describe('namba ya tiketi', () => {
  it('umbo sahihi', () => {
    expect(niTiketiHalali('TK-2026-000123')).toBe(true);
    expect(niTiketiHalali('tk-2026-000123')).toBe(true);
    expect(niTiketiHalali(' TK-2026-000123 ')).toBe(true);
  });
  it('umbo mbovu', () => {
    ['', 'TK-2026-123', 'DL-2026-000123', 'TK-26-000123', null, 'DROP TABLE']
      .forEach(x => expect(niTiketiHalali(x), String(x)).toBe(false));
  });
  it('safishaTiketi', () => {
    expect(safishaTiketi('  tk-2026-000123 ')).toBe('TK-2026-000123');
    expect(safishaTiketi(null)).toBe('');
  });
});

describe('tanguLini', () => {
  const sasa = Date.parse('2026-11-25T12:00:00Z');
  const kabla = ms => new Date(sasa - ms).toISOString();
  it('inasoma kwa Kiswahili', () => {
    expect(tanguLini(kabla(30 * 1000), sasa)).toBe('sasa hivi');
    expect(tanguLini(kabla(5 * 60000), sasa)).toBe('dakika 5');
    expect(tanguLini(kabla(3 * 3600000), sasa)).toBe('saa 3');
    expect(tanguLini(kabla(2 * 86400000), sasa)).toBe('siku 2');
    expect(tanguLini(kabla(14 * 86400000), sasa)).toBe('wiki 2');
    expect(tanguLini(kabla(90 * 86400000), sasa)).toBe('miezi 3');
  });
  it('tarehe mbovu hairudishi NaN', () => {
    ['', null, undefined, 'si-tarehe'].forEach(x => expect(tanguLini(x, sasa)).toBe('—'));
  });
  it('tarehe ya baadaye haiwi hasi', () => {
    expect(tanguLini(new Date(sasa + 86400000).toISOString(), sasa)).toBe('sasa hivi');
  });
});

describe('imechelewa', () => {
  const sasa = Date.parse('2026-11-25T12:00:00Z');
  const t = (h, p, extra = {}) => ({ created_at: new Date(sasa - h * 3600000).toISOString(), priority: p, status: 'open', ...extra });
  it('dharura inachelewa baada ya saa 4', () => {
    expect(imechelewa(t(3, 'urgent'), sasa)).toBe(false);
    expect(imechelewa(t(5, 'urgent'), sasa)).toBe(true);
  });
  it('kawaida inachelewa baada ya saa 24', () => {
    expect(imechelewa(t(20, 'normal'), sasa)).toBe(false);
    expect(imechelewa(t(30, 'normal'), sasa)).toBe(true);
  });
  it('iliyojibiwa haichelewi', () => {
    expect(imechelewa(t(100, 'urgent', { first_response_at: new Date(sasa).toISOString() }), sasa)).toBe(false);
  });
  it('iliyofungwa haichelewi', () => {
    expect(imechelewa(t(100, 'urgent', { status: 'closed' }), sasa)).toBe(false);
  });
  it('tupu haivunji', () => {
    expect(imechelewa(null, sasa)).toBe(false);
    expect(imechelewa({ created_at: 'si-tarehe', priority: 'urgent', status: 'open' }, sasa)).toBe(false);
  });
});

describe('SMS — zote ni SMS MOJA ya GSM-7', () => {
  it('tiketi mpya kwa mteja, kila kitengo', () => {
    VITENGO_ZOTE.forEach(k => {
      const m = smsTiketiMpya({ no: 'TK-2026-000123', kitengo: k });
      niSmsMoja(m, 'tiketi mpya ' + k);
      expect(m).toContain('TK-2026-000123');
    });
  });

  it('hali kwa mteja, kila hali', () => {
    HALI_ZOTE.forEach(h => {
      const m = smsTiketiHali({ no: 'TK-2026-000123', status: h, jina: 'Afisa Masoko' });
      niSmsMoja(m, 'hali ' + h);
      expect(m).toContain('TK-2026-000123');
    });
  });

  it('tiketi kwa mfanyakazi — jina refu halivunji SMS moja', () => {
    const m = smsTiketiKazi({
      no: 'TK-2026-000123', biashara: 'DUKA LA MAMA JOHN LA VYAKULA NA VINYWAJI URAMBO TABORA',
      kitengo: 'kiufundi', priority: 'urgent', simu: '0754812390',
    });
    niSmsMoja(m, 'tiketi kazi');
    expect(m).toContain('DHARURA');
    expect(m).toContain('TK-2026-000123');
  });

  it('tiketi kwa mfanyakazi, kila mchanganyiko', () => {
    VITENGO_ZOTE.forEach(k => ['low', 'normal', 'urgent'].forEach(p => {
      niSmsMoja(smsTiketiKazi({ no: 'TK-2026-000123', biashara: 'DUKA LA MAMA JOHN', kitengo: k, priority: p, simu: '0754812390' }), `${k}/${p}`);
    }));
  });

  it('afya: hakuna tatizo', () => {
    const m = smsAfya({ makaziHai: 128, salioSms: 4500 });
    niSmsMoja(m, 'afya safi');
    expect(m).toContain('Hakuna tatizo');
  });

  it('afya: matatizo mengi bado ni SMS moja', () => {
    const m = smsAfya({
      tiketiWazi: 14, tiketiDharura: 3, tiketiZimechelewa: 7,
      malipoYamekwama: 5, smsZimeshindwa: 22, wasiolipa: 41,
      makaziHai: 128, salioSms: 4500,
    });
    niSmsMoja(m, 'afya mibaya');
    expect(m).toContain('DHARURA: 3');
  });

  it('afya: namba kubwa mno bado ni SMS moja', () => {
    niSmsMoja(smsAfya({
      tiketiWazi: 9999, tiketiDharura: 9999, tiketiZimechelewa: 9999,
      malipoYamekwama: 9999, smsZimeshindwa: 9999, wasiolipa: 9999,
      makaziHai: 99999, salioSms: 9999999,
    }), 'afya kubwa');
  });

  it('afya: data tupu haitoi undefined', () => {
    const m = smsAfya();
    niSmsMoja(m, 'afya tupu');
    expect(m).toContain('Hakuna tatizo');
  });

  it('wasiolipa: majina matatu pekee', () => {
    const m = smsWasiolipa({
      idadi: 9, jumla: 135000,
      orodha: [
        { jina: 'DUKA LA MAMA JOHN LA VYAKULA', siku: -3 },
        { jina: 'DUKA LA JUMA', siku: 0 },
        { jina: 'AGROVET URAMBO', siku: 2 },
        { jina: 'HAIPASWI KUONEKANA', siku: 3 },
      ],
    });
    niSmsMoja(m, 'wasiolipa');
    expect(m).toContain('na wengine 6');
    expect(m).not.toContain('HAIPASWI');
  });

  it('wasiolipa: mmoja tu', () => {
    const m = smsWasiolipa({ idadi: 1, orodha: [{ jina: 'DUKA LA JUMA', siku: -1 }] });
    niSmsMoja(m, 'wasiolipa mmoja');
    expect(m).not.toContain('na wengine');
  });

  // Dhamana ya SMS moja haitegemei urefu wa jina la duka.
  it('wasiolipa: jina la urefu wowote bado ni SMS moja', () => {
    for (let urefu = 1; urefu <= 80; urefu += 7) {
      const jina = 'D'.repeat(urefu);
      [1, 3, 9, 250].forEach(idadi => {
        const m = smsWasiolipa({
          idadi, jumla: 99999999,
          orodha: Array.from({ length: Math.min(idadi, 4) }, () => ({ jina, siku: -99 })),
        });
        niSmsMoja(m, `jina urefu ${urefu}, idadi ${idadi}`);
        expect(m).toContain('WAFUATILIE');
      });
    }
  });

  it('tiketi kwa mfanyakazi: jina la urefu wowote bado ni SMS moja', () => {
    for (let urefu = 1; urefu <= 90; urefu += 11) {
      niSmsMoja(smsTiketiKazi({
        no: 'TK-2026-000123', biashara: 'D'.repeat(urefu),
        kitengo: 'kiufundi', priority: 'urgent', simu: '0754812390',
      }), `biashara urefu ${urefu}`);
    }
  });

  it('hali kwa mteja: jina la mfanyakazi refu bado ni SMS moja', () => {
    for (let urefu = 1; urefu <= 60; urefu += 9) {
      niSmsMoja(smsTiketiHali({ no: 'TK-2026-000123', status: 'assigned', jina: 'M'.repeat(urefu) }), `jina ${urefu}`);
    }
  });

  it('wasiolipa: hakuna mtu -> hakuna SMS', () => {
    expect(smsWasiolipa({ idadi: 0, orodha: [] })).toBe(null);
    expect(smsWasiolipa({})).toBe(null);
  });
});

describe('mgawanyo wa arifa — kwa cheo, si kwa orodha', () => {
  const admin  = { id:'1', name:'Baruth', role:'admin',      phone:'0617288752' };
  const masoko = { id:'2', name:'Asha',   role:'marketing',  phone:'0713000000' };
  const wakala1= { id:'3', name:'Juma',   role:'agent',      phone:'0714000000', promo_code:'WK01' };
  const wakala2= { id:'4', name:'Neema',  role:'supervisor', phone:'0715000000', promo_code:'WK02' };
  const mhasibu= { id:'5', name:'Damas',  role:'accountant', phone:'0786000000' };
  const wote = [admin, masoko, wakala1, wakala2, mhasibu];

  it('cheo kinaamua arifa — hakuna orodha ya kuandika', () => {
    expect(arifaZake(admin)).toContain('afya');
    expect(arifaZake(masoko)).toContain('wasiolipa');
    expect(arifaZake(masoko)).not.toContain('afya');
    expect(arifaZake(mhasibu)).toEqual([]);
  });

  it('cheo cha herufi kubwa au chenye nafasi bado kinatambulika', () => {
    expect(anapokea({ ...admin, role:' Admin ' }, 'afya')).toBe(true);
    expect(anapokea({ ...masoko, role:'MARKETING' }, 'tiketi')).toBe(true);
    expect(cheoCha({ role:'  Agent ' })).toBe('agent');
  });

  it('asiye na namba ya simu hapokei chochote', () => {
    expect(anapokea({ ...admin, phone:'' }, 'afya')).toBe(false);
    expect(anapokea({ ...admin, phone:null }, 'afya')).toBe(false);
  });

  it('aliyezimwa hapokei', () => {
    expect(anapokea({ ...admin, is_active:false }, 'afya')).toBe(false);
  });

  it('mteja wa kawaida hapokei arifa za mfumo', () => {
    expect(anapokea({ role:'office', phone:'0755000000' }, 'tiketi')).toBe(false);
    expect(anapokea({ role:'employee', phone:'0755000000' }, 'tiketi')).toBe(false);
  });

  it('wapokeajiWa inachuja kwa aina', () => {
    expect(wapokeajiWa(wote, 'afya').map(u => u.name)).toEqual(['Baruth']);
    expect(wapokeajiWa(wote, 'wasiolipa').map(u => u.name)).toEqual(['Asha', 'Juma', 'Neema']);
    expect(wapokeajiWa([], 'afya')).toEqual([]);
  });

  it('wakala anapata tiketi za wateja WAKE pekee', () => {
    const got = wapokeajiWaTiketi(wote, { priority:'normal', promo_code:'WK01' }).map(u => u.name);
    expect(got).toContain('Asha');
    expect(got).toContain('Juma');
    expect(got).not.toContain('Neema');
  });

  it('admin anapata kila tiketi, hata ya duka lisilo na wakala', () => {
    expect(wapokeajiWaTiketi(wote, { priority:'normal' }).map(u => u.name)).toContain('Baruth');
  });

  it('tiketi bila promo_code haimfikii wakala yeyote', () => {
    const got = wapokeajiWaTiketi([wakala1, wakala2], { priority:'normal' });
    expect(got).toEqual([]);
  });

  it('tiketi ya dharura inamfikia admin', () => {
    expect(wapokeajiWaTiketi(wote, { priority:'urgent', promo_code:'WK01' }).map(u => u.name)).toContain('Baruth');
  });

  it('mhasibu hapokei tiketi', () => {
    expect(wapokeajiWaTiketi(wote, { priority:'urgent', promo_code:'WK01' }).map(u => u.name)).not.toContain('Damas');
  });

  it('watejaWake: masoko na admin wanaona wote, wakala wake', () => {
    const biz = [{ id:1, promo_code:'WK01' }, { id:2, promo_code:'WK02' }, { id:3 }];
    expect(watejaWake(masoko, biz)).toHaveLength(3);
    expect(watejaWake(admin, biz)).toHaveLength(3);
    expect(watejaWake(wakala1, biz).map(b => b.id)).toEqual([1]);
    expect(watejaWake(wakala2, biz).map(b => b.id)).toEqual([2]);
  });

  it('wakala asiye na promo code haoni mteja yeyote', () => {
    expect(watejaWake({ ...wakala1, promo_code:null }, [{ id:1, promo_code:'WK01' }])).toEqual([]);
  });

  it('vyeo vyote vina jina na orodha ya arifa', () => {
    CHEO_ZA_KAZI.forEach(c => {
      expect(cheoLab(c)).toBeTruthy();
      expect(Array.isArray(ARIFA_ZA_CHEO[c])).toBe(true);
      ARIFA_ZA_CHEO[c].forEach(a => expect(AINA_ZOTE).toContain(a));
    });
  });

  it('aina zote zina majina', () => {
    AINA_ZOTE.forEach(a => expect(ainaLab(a)).toBeTruthy());
  });
});

describe('wateja wasiolipa', () => {
  const sasa = Date.parse('2026-11-25T12:00:00Z');
  const siku = d => new Date(sasa + d * 86400000).toISOString();

  it('siku zilizobaki zinahesabiwa kutoka token_expiry au trial_end', () => {
    expect(siraZaMteja({ token_active: true, token_expiry: siku(5) }, sasa)).toBe(5);
    expect(siraZaMteja({ token_active: false, trial_end: siku(2) }, sasa)).toBe(2);
    expect(siraZaMteja({}, sasa)).toBe(null);
    expect(siraZaMteja({ token_expiry: 'si-tarehe' }, sasa)).toBe(null);
  });

  it('wa kufuatilia: waliokwisha na wanaoisha ndani ya siku 3', () => {
    expect(anahitajiKufuatiliwa({ token_active: true, token_expiry: siku(-2) }, sasa)).toBe(true);
    expect(anahitajiKufuatiliwa({ token_active: true, token_expiry: siku(1) }, sasa)).toBe(true);
    expect(anahitajiKufuatiliwa({ token_active: true, token_expiry: siku(10) }, sasa)).toBe(false);
  });

  it('aliyesimamishwa haorodheshwi', () => {
    expect(anahitajiKufuatiliwa({ token_expiry: siku(-5), is_suspended: true }, sasa)).toBe(false);
  });

  it('orodha imepangwa — aliyekwisha zamani kwanza', () => {
    const biz = [
      { id: 1, name: 'A', token_active: true, token_expiry: siku(2) },
      { id: 2, name: 'B', token_active: true, token_expiry: siku(-10) },
      { id: 3, name: 'C', token_active: true, token_expiry: siku(30) },
      { id: 4, name: 'D', token_active: true, token_expiry: siku(0) },
    ];
    const o = orodhaYaWasiolipa(biz, sasa);
    expect(o.map(x => x.jina)).toEqual(['B', 'D', 'A']);
    expect(o[0].siku).toBe(-10);
  });

  it('orodha tupu haivunji', () => {
    expect(orodhaYaWasiolipa([], sasa)).toEqual([]);
    expect(orodhaYaWasiolipa(undefined, sasa)).toEqual([]);
  });

  it('biashara bila jina inapata mbadala', () => {
    const o = orodhaYaWasiolipa([{ id: 1, token_expiry: siku(-1) }], sasa);
    expect(o[0].jina).toBe('Bila jina');
  });
});

// Faili hili linatumika na api/cron/subscription-reminders.js kwenye
// Node ya Vercel, ambayo haitafuti faili bila kiendelezo.
describe('import za Node', () => {
  ['src/utils/tiketi.js', 'api/cron/subscription-reminders.js'].forEach(f => {
    it(`${f}: kila import ya ndani ina .js`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
      const mbaya = [...src.matchAll(/from\s+['"](\.[^'"]*)['"]/g)]
        .map(m => m[1]).filter(p => !p.endsWith('.js') && !p.endsWith('.json'));
      expect(mbaya, `bila kiendelezo: ${mbaya.join(', ')}`).toEqual([]);
    });
  });

  // Cron inatumia hizi; zikiondolewa, arifa zinakufa kimya kimya.
  it('cron inaita vitendakazi vinavyopatikana', async () => {
    const m = await import('./tiketi.js');
    ['smsAfya', 'smsWasiolipa', 'orodhaYaWasiolipa', 'anapokea', 'imechelewa']
      .forEach(k => expect(typeof m[k], k).toBe('function'));
  });
});
