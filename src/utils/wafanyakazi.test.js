import { describe, it, expect } from 'vitest';
import {
  JINSIA, jinsiaLab, safishaSimu, simuNiSahihi,
  NIDA_TARAKIMU, safishaNida, nidaOnyo, fmtNida,
  umri, dobOnyo, SEHEMU, zilizokosekana, ukamilifu, rangiYaUkamilifu,
  SAFU, andaaKuhifadhi, kosaLaKuhifadhi,
} from './wafanyakazi';

describe('simu', () => {
  it('maumbo yote yanakubalika', () => {
    ['0713000000', '255713000000', '+255713000000', '0713 000 000', '0713-000-000']
      .forEach(s => expect(simuNiSahihi(s), s).toBe(true));
  });
  it('mbovu zinakataliwa', () => {
    ['', '071300000', '07130000000', 'simu', '1234567890', null]
      .forEach(s => expect(simuNiSahihi(s), String(s)).toBe(false));
  });
  it('safishaSimu inaondoa nafasi na mistari', () => {
    expect(safishaSimu(' 0713-000 000 ')).toBe('0713000000');
    expect(safishaSimu(null)).toBe('');
  });
});

describe('NIDA', () => {
  const sahihi = '19900101123450000112';

  it('inasafishwa kutoka maumbo ya kawaida', () => {
    expect(safishaNida('19900101-12345-00001-12')).toBe(sahihi);
    expect(safishaNida('19900101 12345 00001 12')).toBe(sahihi);
    expect(safishaNida(null)).toBe('');
  });

  it('tarakimu 20 hazina onyo', () => {
    expect(nidaOnyo(sahihi)).toBe('');
    expect(nidaOnyo('19900101-12345-00001-12')).toBe('');
  });

  it('tupu haina onyo — NIDA si lazima', () => {
    expect(nidaOnyo('')).toBe('');
    expect(nidaOnyo(null)).toBe('');
  });

  it('urefu usio sahihi unaonya, hauzuii', () => {
    expect(nidaOnyo('1990010112345')).toContain('13');
    expect(nidaOnyo('1990010112345')).toContain('20');
    // Onyo si kosa la kuhifadhi
    expect(kosaLaKuhifadhi({ name: 'X', phone: '0713000000', nida: '1990010112345' })).toBe('');
  });

  it('herufi zinaonywa', () => {
    expect(nidaOnyo('1990ABCD12345')).toContain('tarakimu pekee');
  });

  it('fmtNida inaweka mistari pale urefu ni sahihi', () => {
    expect(fmtNida(sahihi)).toBe('19900101-12345-00001-12');
    expect(fmtNida('123')).toBe('123');
    expect(fmtNida('')).toBe('—');
  });

  it('NIDA_TARAKIMU ni 20', () => expect(NIDA_TARAKIMU).toBe(20));
});

describe('umri na tarehe ya kuzaliwa', () => {
  const sasa = Date.parse('2026-11-26T12:00:00Z');

  it('umri unahesabiwa kwa usahihi', () => {
    expect(umri('1990-01-01', sasa)).toBe(36);
    expect(umri('1990-12-31', sasa)).toBe(35);   // siku ya kuzaliwa haijafika
    expect(umri('2026-11-26', sasa)).toBe(0);
  });

  it('tarehe mbovu hairudishi NaN', () => {
    [null, '', 'si-tarehe'].forEach(x => expect(umri(x, sasa)).toBe(null));
  });

  it('tarehe ya mbeleni inaonywa', () => {
    expect(dobOnyo('2030-01-01', sasa)).toContain('mbeleni');
  });

  it('chini ya miaka 18 inaonywa', () => {
    expect(dobOnyo('2015-01-01', sasa)).toContain('18');
  });

  it('zaidi ya miaka 90 inaonywa', () => {
    expect(dobOnyo('1900-01-01', sasa)).toContain('Hakiki');
  });

  it('umri wa kawaida hauna onyo', () => {
    expect(dobOnyo('1990-01-01', sasa)).toBe('');
  });

  it('tupu haina onyo', () => expect(dobOnyo('', sasa)).toBe(''));
});

describe('ukamilifu wa wasifu', () => {
  const kamili = {
    name: 'Asha Mwinyi', phone: '0713000000', nida: '19900101123450000112',
    tarehe_kuzaliwa: '1990-01-01', jinsia: 'ke', anwani: 'Urambo',
    cheo_kazi: 'Afisa Masoko', tarehe_kuanza: '2025-01-01',
    ndugu_jina: 'Juma Said', ndugu_simu: '0714000000',
  };

  it('wasifu kamili ni 100%', () => expect(ukamilifu(kamili)).toBe(100));
  it('wasifu tupu ni 0%', () => {
    expect(ukamilifu({})).toBe(0);
    expect(ukamilifu(null)).toBe(0);
  });

  it('nafasi tupu hazihesabiwi kuwa zimejazwa', () => {
    expect(ukamilifu({ ...kamili, nida: '   ' })).toBeLessThan(100);
  });

  it('simu ina uzito mkubwa kuliko sehemu nyingine', () => {
    const bilaSimu = ukamilifu({ ...kamili, phone: '' });
    const bilaAnwani = ukamilifu({ ...kamili, anwani: '' });
    expect(bilaSimu).toBeLessThan(bilaAnwani);
  });

  it('zilizokosekana zinaorodheshwa kwa majina', () => {
    const z = zilizokosekana({ name: 'X', phone: '0713000000' });
    expect(z).toContain('NIDA');
    expect(z).toContain('Tarehe ya kuzaliwa');
    expect(z).not.toContain('Namba ya simu');
  });

  it('rangi inaonyesha hali', () => {
    expect(rangiYaUkamilifu(100)).toBe('#0A6E47');
    expect(rangiYaUkamilifu(70)).toBe('#F2B705');
    expect(rangiYaUkamilifu(20)).toBe('#C2412D');
  });

  it('kila sehemu ina jina na uzito', () => {
    SEHEMU.forEach(s => {
      expect(s.lab).toBeTruthy();
      expect(s.uzito).toBeGreaterThan(0);
      expect(SAFU).toContain(s.k);
    });
  });
});

describe('andaaKuhifadhi', () => {
  it('tupu inakuwa NULL, si herufi tupu', () => {
    const r = andaaKuhifadhi({ name: 'X', phone: '0713000000', nida: '', anwani: '   ' });
    expect(r.nida).toBe(null);
    expect(r.anwani).toBe(null);
  });

  it('simu na NIDA zinasafishwa', () => {
    const r = andaaKuhifadhi({ name: 'X', phone: '0713 000 000', nida: '19900101-12345-00001-12' });
    expect(r.phone).toBe('0713000000');
    expect(r.nida).toBe('19900101123450000112');
  });

  it('safu zisizotarajiwa hazipiti kwenda database', () => {
    const r = andaaKuhifadhi({ name: 'X', phone: '0713000000', role: 'admin', is_active: false, id: 'abc' });
    expect(r.role).toBeUndefined();
    expect(r.is_active).toBeUndefined();
    expect(r.id).toBeUndefined();
    expect(Object.keys(r).sort()).toEqual([...SAFU].sort());
  });

  it('nafasi mbele na nyuma zinaondolewa', () => {
    expect(andaaKuhifadhi({ name: '  Asha  ', phone: '0713000000' }).name).toBe('Asha');
  });
});

describe('kosaLaKuhifadhi — kinachozuia tu', () => {
  it('jina linahitajika', () => {
    expect(kosaLaKuhifadhi({ phone: '0713000000' })).toContain('Jina');
    expect(kosaLaKuhifadhi({ name: '   ', phone: '0713000000' })).toContain('Jina');
  });
  it('simu isiyo sahihi inazuia', () => {
    expect(kosaLaKuhifadhi({ name: 'X', phone: '071300' })).toContain('simu');
  });
  it('simu ya ndugu isiyo sahihi inazuia', () => {
    expect(kosaLaKuhifadhi({ name: 'X', phone: '0713000000', ndugu_simu: '123' })).toContain('ndugu');
  });
  it('simu ya ndugu tupu inaruhusiwa', () => {
    expect(kosaLaKuhifadhi({ name: 'X', phone: '0713000000', ndugu_simu: '' })).toBe('');
  });
  it('NIDA, tarehe na mengine hayazuii', () => {
    expect(kosaLaKuhifadhi({ name: 'X', phone: '0713000000' })).toBe('');
  });
});

describe('jinsia', () => {
  it('majina', () => {
    expect(jinsiaLab('ke')).toBe('Mwanamke');
    expect(jinsiaLab('me')).toBe('Mwanaume');
    expect(jinsiaLab('')).toBe('—');
  });
  it('inalingana na CHECK ya database', () => {
    expect(Object.keys(JINSIA).sort()).toEqual(['ke', 'me']);
  });
});
