// ============================================================
// Majaribio ya uwakala
//
// Kila jaribio hapa linawakilisha hali halisi ya wakala. Mengi
// yanalinda njia za upotevu wa pesa zilizoainishwa kwenye muundo.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  TX, txLabel, needsLine, isKnownType, txDeltas, validateTx,
  floatAfter, cashAfter, commissionTotal,
  reconcileLine, reconcileCash, varianceState, dayTotals, wakalaAccess,
  shellMode, AINA, ainaYa, KAZI, kaziOf, doesWakala, doesDuka,
  GHARAMA, CHANZO, gharamaLabel, isGharama, validateGharama,
  gharamaTotals, faidaHalisi,
  mtandaoWa, mtandaoJina, mtandaoUnalingana, safishaNamba, nambaKamili,
  uthibitisho, uthibitishoHali, gharamaChanzo, gharamaKwaChanzo, KIBANDANI, OFISINI,
  BEI, PUNGUZO, beiYaUwakala, fmtBei,
} from './wakala.js';

const L1 = 'line-mpesa', L2 = 'line-airtel';
const LINES = [{ id: L1 }, { id: L2 }];
const tx = (type, amount, o = {}) => ({ type, amount, line_id: L1, ...o });

describe('aina za miamala', () => {
  it('kuweka: taslimu inaingia, float inatoka', () => {
    expect(txDeltas(tx('deposit', 50000))).toMatchObject({ cash: 50000, float: -50000 });
  });
  it('kutoa: taslimu inatoka, float inaingia', () => {
    expect(txDeltas(tx('withdraw', 50000))).toMatchObject({ cash: -50000, float: 50000 });
  });
  it('kununua float: taslimu inatoka, float inaingia', () => {
    expect(txDeltas(tx('float_buy', 200000))).toMatchObject({ cash: -200000, float: 200000 });
  });
  it('kuuza float: kinyume chake', () => {
    expect(txDeltas(tx('float_sell', 200000))).toMatchObject({ cash: 200000, float: -200000 });
  });
  it('mtaji na kutoa pesa havigusi float', () => {
    expect(txDeltas({ type: 'cash_in', amount: 100000 })).toMatchObject({ cash: 100000, float: 0 });
    expect(txDeltas({ type: 'cash_out', amount: 100000 })).toMatchObject({ cash: -100000, float: 0 });
  });
  it('aina isiyojulikana haibadilishi chochote', () => {
    expect(txDeltas({ type: 'hewa', amount: 999 })).toEqual({ cash: 0, float: 0, commission: 0 });
    expect(txDeltas(null)).toEqual({ cash: 0, float: 0, commission: 0 });
  });
  it('majina na mahitaji ya laini', () => {
    expect(txLabel('deposit')).toBe('Kuweka');
    expect(txLabel('kitu')).toBe('kitu');
    expect(needsLine('deposit')).toBe(true);
    expect(needsLine('cash_in')).toBe(false);
    expect(isKnownType('withdraw')).toBe(true);
    expect(isKnownType('toString')).toBe(false);
  });
});

describe('kamisheni', () => {
  it('HAIGUSI taslimu wala float — mitandao inalipa baadaye', () => {
    const d = txDeltas(tx('withdraw', 50000, { commission: 800 }));
    expect(d.cash).toBe(-50000);
    expect(d.float).toBe(50000);
    expect(d.commission).toBe(800);
  });
  it('kununua float hakuzalishi kamisheni hata ikiandikwa', () => {
    expect(txDeltas(tx('float_buy', 200000, { commission: 5000 })).commission).toBe(0);
  });
  it('jumla ya kamisheni', () => {
    expect(commissionTotal([
      tx('deposit', 10000, { commission: 300 }),
      tx('withdraw', 50000, { commission: 800 }),
      tx('float_buy', 200000, { commission: 999 }),
    ])).toBe(1100);
  });
});

describe('marejesho', () => {
  it('yanageuza muamala kabisa', () => {
    const asili = tx('withdraw', 50000, { commission: 800 });
    const rejesho = { ...asili, reverses: 'tx-1' };
    const a = txDeltas(asili), r = txDeltas(rejesho);
    expect(r.cash).toBe(-a.cash);
    expect(r.float).toBe(-a.float);
    expect(r.commission).toBe(-a.commission);
  });
  it('muamala pamoja na rejesho lake = sifuri', () => {
    const t = tx('deposit', 30000, { commission: 500 });
    const list = [t, { ...t, reverses: 'x' }];
    expect(cashAfter(0, list)).toBe(0);
    expect(floatAfter(0, list, L1)).toBe(0);
    expect(commissionTotal(list)).toBe(0);
  });
});

describe('uhakiki', () => {
  it('muamala sahihi unapita', () => {
    expect(validateTx(tx('deposit', 10000, { commission: 300 }), { lines: LINES }).ok).toBe(true);
  });
  it('kiasi sifuri au hasi kinakataliwa', () => {
    expect(validateTx(tx('deposit', 0), { lines: LINES }).ok).toBe(false);
    expect(validateTx(tx('deposit', -500), { lines: LINES }).ok).toBe(false);
  });
  it('laini inahitajika kwa kuweka na kutoa', () => {
    const r = validateTx({ type: 'deposit', amount: 1000 }, { lines: LINES });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('laini');
  });
  it('laini isiyopo inakataliwa', () => {
    expect(validateTx(tx('deposit', 1000, { line_id: 'hewa' }), { lines: LINES }).ok).toBe(false);
  });
  it('mtaji hauhitaji laini', () => {
    expect(validateTx({ type: 'cash_in', amount: 50000 }, { lines: LINES }).ok).toBe(true);
  });
  it('kamisheni kubwa kuliko muamala ni kosa la kuandika', () => {
    const r = validateTx(tx('withdraw', 5000, { commission: 9000 }), { lines: LINES });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('Kamisheni');
  });
  it('aina isiyojulikana inakataliwa', () => {
    expect(validateTx({ type: 'hewa', amount: 100 }).ok).toBe(false);
  });
});

describe('salio', () => {
  const txs = [
    tx('deposit', 50000), tx('withdraw', 30000),
    tx('deposit', 20000, { line_id: L2 }),
    { type: 'cash_in', amount: 100000 },
  ];
  it('float inahesabiwa KWA KILA LAINI peke yake', () => {
    expect(floatAfter(500000, txs, L1)).toBe(500000 - 50000 + 30000);
    expect(floatAfter(200000, txs, L2)).toBe(200000 - 20000);
  });
  it('taslimu ni moja kwa shughuli zote', () => {
    expect(cashAfter(100000, txs)).toBe(100000 + 50000 - 30000 + 20000 + 100000);
  });
  it('orodha tupu inarudisha ya asubuhi', () => {
    expect(floatAfter(500000, [], L1)).toBe(500000);
    expect(cashAfter(80000, null)).toBe(80000);
  });
  it('data batili haitoi NaN', () => {
    expect(cashAfter(1000, [null, { type: 'deposit', amount: 'abc' }])).toBe(1000);
  });
});

describe('upatanisho — hapa ndipo upotevu unapokamatwa', () => {
  it('kila kitu sawa', () => {
    const txs = [tx('deposit', 50000), tx('withdraw', 30000)];
    const r = reconcileLine({ openingFloat: 500000, txs, lineId: L1, countedFloat: 480000 });
    expect(r.expected).toBe(480000);
    expect(r.variance).toBe(0);
  });

  // Njia 1: ameandika kidogo kuliko alivyotoa
  it('ameandika 30,000 wakati ametoa 50,000 -> ZIADA ya float', () => {
    const txs = [tx('withdraw', 30000)];
    const r = reconcileLine({ openingFloat: 500000, txs, lineId: L1, countedFloat: 550000 });
    expect(r.variance).toBe(20000);
    expect(varianceState(r.variance, 1000)).toBe('ziada');
  });

  // Njia 2: hakuandika kabisa
  it('hakuandika muamala -> UPUNGUFU wa float', () => {
    const r = reconcileLine({ openingFloat: 500000, txs: [], lineId: L1, countedFloat: 460000 });
    expect(r.variance).toBe(-40000);
    expect(varianceState(r.variance, 1000)).toBe('upungufu');
  });

  // Njia 4: amechukua taslimu kasheni
  it('amechukua taslimu -> UPUNGUFU wa taslimu', () => {
    const txs = [tx('deposit', 50000)];
    const r = reconcileCash({ openingCash: 100000, txs, countedCash: 130000 });
    expect(r.expected).toBe(150000);
    expect(r.variance).toBe(-20000);
  });

  it('tofauti ndogo ndani ya kiwango cha mmiliki', () => {
    expect(varianceState(-500, 1000)).toBe('ndogo');
    expect(varianceState(0, 1000)).toBe('sawa');
    expect(varianceState(-5000, 1000)).toBe('upungufu');
    expect(varianceState(5000, 0)).toBe('ziada');
  });
});

describe('muhtasari wa siku', () => {
  const txs = [
    tx('deposit', 50000, { commission: 500 }),
    tx('deposit', 20000, { commission: 300 }),
    tx('withdraw', 80000, { commission: 1200 }),
    tx('float_buy', 500000),
    { type: 'cash_in', amount: 200000 },
    { ...tx('deposit', 10000, { commission: 200 }), reverses: 'x' },
  ];
  it('inahesabu kila aina peke yake', () => {
    const t = dayTotals(txs);
    expect(t.kuweka).toBe(70000);
    expect(t.idadiKuweka).toBe(2);
    expect(t.kutoa).toBe(80000);
    expect(t.floatNunuliwa).toBe(500000);
    expect(t.mtaji).toBe(200000);
    expect(t.marejesho).toBe(1);
  });
  it('marejesho yanapunguza kamisheni', () => {
    expect(dayTotals(txs).kamisheni).toBe(500 + 300 + 1200 - 200);
  });
  it('siku tupu', () => {
    const t = dayTotals([]);
    expect(t.idadi).toBe(0); expect(t.kuweka).toBe(0); expect(t.kamisheni).toBe(0);
  });
});

describe('usajili wa uwakala', () => {
  const siku = n => new Date(Date.now() + n * 86400000).toISOString();

  it('admin hajawasha -> hakuna chochote', () => {
    const a = wakalaAccess({ enabled: false, paidUntil: siku(30) });
    expect(a.visible).toBe(false);
    expect(a.canRecord).toBe(false);
  });
  it('amewasha lakini hajalipa kamwe', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: null });
    expect(a.visible).toBe(true);
    expect(a.canRecord).toBe(false);
    expect(a.neverPaid).toBe(true);
  });
  it('amelipa -> anaandika kawaida', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: siku(20) });
    expect(a.canRecord).toBe(true);
    expect(a.warn).toBe(false);
    expect(a.daysLeft).toBeGreaterThan(15);
  });
  it('siku 5 zimebaki -> onyo', () => {
    expect(wakalaAccess({ enabled: true, paidUntil: siku(4) }).warn).toBe(true);
  });

  // Hii ndiyo muhimu: pesa isibaki bila kuhesabiwa
  it('imeisha -> HAWEZI kuandika, LAKINI anaweza kufunga siku', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: siku(-2) });
    expect(a.expired).toBe(true);
    expect(a.canRecord).toBe(false);
    expect(a.canClose).toBe(true);
    expect(a.visible).toBe(true);
  });
  it('baada ya siku 7 za neema -> kila kitu kimefungwa', () => {
    const a = wakalaAccess({ enabled: true, paidUntil: siku(-9) });
    expect(a.canClose).toBe(false);
    expect(a.visible).toBe(false);
  });
  it('tarehe batili inahesabiwa kama hajalipa', () => {
    expect(wakalaAccess({ enabled: true, paidUntil: 'si-tarehe' }).canRecord).toBe(false);
  });
});

// ============================================================
// shellMode — hii inalinda mfumo wa zamani.
// Usajili wa duka na wa uwakala ni VIWILI tofauti.
// ============================================================
describe('shellMode', () => {
  const hai  = { canRecord: true,  canClose: true  };
  const kufa = { canRecord: false, canClose: false };

  describe('uwakala haujawashwa -> tabia ya ZAMANI kabisa', () => {
    it('duka limelipwa -> duka', () => {
      expect(shellMode({ role: 'office', shopExpired: false })).toBe('duka');
      expect(shellMode({ role: 'office', shopExpired: false, wakala: kufa })).toBe('duka');
    });
    it('duka limeisha -> locked, kama zamani', () => {
      expect(shellMode({ role: 'office', shopExpired: true })).toBe('locked');
      expect(shellMode({ role: 'employee', shopExpired: true, wakala: kufa })).toBe('locked');
    });
  });

  describe('hali nne za malipo', () => {
    it('duka LIMELIPWA + uwakala UMELIPWA -> vyote', () => {
      expect(shellMode({ role: 'office', shopExpired: false, wakala: hai })).toBe('both');
    });
    it('duka LIMELIPWA + uwakala HAUJALIPWA -> duka pekee', () => {
      expect(shellMode({ role: 'office', shopExpired: false, wakala: kufa })).toBe('duka');
    });
    it('duka LIMEISHA + uwakala UMELIPWA -> uwakala pekee, SI locked', () => {
      expect(shellMode({ role: 'office', shopExpired: true, wakala: hai })).toBe('wakala');
    });
    it('duka LIMEISHA + uwakala HAUJALIPWA -> locked', () => {
      expect(shellMode({ role: 'office', shopExpired: true, wakala: kufa })).toBe('locked');
    });
  });

  // Mfanyakazi asiyepewa kazi ya uwakala HAONI uwakala, hata ukiwa
  // umelipwa. Kuunganisha ni hiari ya mmiliki — ona 'kazi ya mfanyakazi'.
  it('muuzaji asiyepewa kazi ya uwakala anabaki dukani', () => {
    expect(shellMode({ role: 'employee', shopExpired: false, wakala: hai })).toBe('duka');
    expect(shellMode({ role: 'employee', shopExpired: true, wakala: hai })).toBe('locked');
  });
  it('akipewa kazi ya uwakala ndipo anaiona', () => {
    expect(shellMode({ role: 'employee', kazi: 'zote', shopExpired: false, wakala: hai })).toBe('both');
    expect(shellMode({ role: 'employee', kazi: 'zote', shopExpired: true, wakala: hai })).toBe('wakala');
  });

  it('admin na wengine hawahusiki na usajili', () => {
    ['admin', 'marketing', 'supervisor', 'agent', 'accountant'].forEach(r => {
      expect(shellMode({ role: r, shopExpired: true })).toBe('duka');
    });
  });

  it('siku za neema: anaweza kufunga tu, bado anaingia', () => {
    const neema = { canRecord: false, canClose: true };
    expect(shellMode({ role: 'office', shopExpired: true, wakala: neema })).toBe('wakala');
  });
});

// ============================================================
// KAZI YA MFANYAKAZI — kuunganisha duka na uwakala ni HIARI
// ============================================================
describe('kazi ya mfanyakazi', () => {
  const hai  = { canRecord: true,  canClose: true  };
  const kufa = { canRecord: false, canClose: false };

  it('asiye na kazi ni wa duka — wafanyakazi waliopo hawabadiliki', () => {
    expect(kaziOf({})).toBe('duka');
    expect(kaziOf({ kazi: null })).toBe('duka');
    expect(kaziOf({ kazi: 'hewa' })).toBe('duka');
    expect(kaziOf({ kazi: 'wakala' })).toBe('wakala');
  });

  it('visaidizi', () => {
    expect(doesWakala({ kazi: 'duka' })).toBe(false);
    expect(doesWakala({ kazi: 'wakala' })).toBe(true);
    expect(doesWakala({ kazi: 'zote' })).toBe(true);
    expect(doesDuka({ kazi: 'wakala' })).toBe(false);
    expect(doesDuka({ kazi: 'zote' })).toBe(true);
    expect(Object.keys(KAZI)).toEqual(['duka', 'wakala', 'zote']);
  });

  describe('DUKA PEKEE', () => {
    it('haoni uwakala hata ukiwa umelipwa', () => {
      expect(shellMode({ role: 'employee', kazi: 'duka', shopExpired: false, wakala: hai })).toBe('duka');
    });
    it('usajili wa duka ukiisha -> locked, kama zamani', () => {
      expect(shellMode({ role: 'employee', kazi: 'duka', shopExpired: true, wakala: hai })).toBe('locked');
    });
  });

  describe('UWAKALA PEKEE', () => {
    it('haoni bidhaa wala mauzo hata duka likiwa limelipwa', () => {
      expect(shellMode({ role: 'employee', kazi: 'wakala', shopExpired: false, wakala: hai })).toBe('wakala');
    });
    it('uwakala haujalipwa -> locked, HAFUNGULIWI duka', () => {
      expect(shellMode({ role: 'employee', kazi: 'wakala', shopExpired: false, wakala: kufa })).toBe('locked');
    });
    it('uwakala haujawashwa kabisa -> locked, si duka', () => {
      expect(shellMode({ role: 'employee', kazi: 'wakala', shopExpired: false })).toBe('locked');
    });
  });

  describe('ZOTE', () => {
    it('vyote vimelipwa', () => {
      expect(shellMode({ role: 'employee', kazi: 'zote', shopExpired: false, wakala: hai })).toBe('both');
    });
    it('duka limeisha, uwakala umelipwa', () => {
      expect(shellMode({ role: 'employee', kazi: 'zote', shopExpired: true, wakala: hai })).toBe('wakala');
    });
    it('uwakala haujalipwa -> duka pekee', () => {
      expect(shellMode({ role: 'employee', kazi: 'zote', shopExpired: false, wakala: kufa })).toBe('duka');
    });
  });

  it('MMILIKI hahusiki na kazi — anaona kila alicholipia', () => {
    expect(shellMode({ role: 'office', kazi: 'duka', shopExpired: false, wakala: hai })).toBe('both');
    expect(shellMode({ role: 'office', kazi: 'wakala', shopExpired: true, wakala: hai })).toBe('wakala');
  });

  it('bila uwakala kabisa, kila kazi inatoa jibu la zamani', () => {
    ['duka', 'zote', undefined].forEach(k => {
      expect(shellMode({ role: 'employee', kazi: k, shopExpired: false })).toBe('duka');
      expect(shellMode({ role: 'employee', kazi: k, shopExpired: true })).toBe('locked');
    });
  });
});

// ============================================================
// GHARAMA ZA UWAKALA — kamisheni si faida
// ============================================================
describe('gharama za uwakala', () => {
  const g = (aina, amount, chanzo) => ({ aina, amount, chanzo });

  it('aina zote muhimu zipo', () => {
    ['kodi','umeme','maji','mtandao','mshahara','usafiri','ada_float','vifaa',
     'ulinzi','leseni','matengenezo','nyingine'].forEach(k => {
      expect(isGharama(k)).toBe(true);
      expect(GHARAMA[k].label.length).toBeGreaterThan(2);
    });
    expect(isGharama('hewa')).toBe(false);
    expect(gharamaLabel('kodi')).toBe('Kodi ya ofisi');
    expect(gharamaLabel('hewa')).toBe('hewa');
    expect(Object.keys(CHANZO)).toEqual(['taslimu','nje']);
  });

  describe('uhakiki', () => {
    it('gharama sahihi inapita', () => {
      expect(validateGharama(g('kodi', 50000, 'taslimu')).ok).toBe(true);
    });
    it('aina isiyojulikana inakataliwa', () => {
      expect(validateGharama(g('hewa', 5000)).ok).toBe(false);
    });
    it('kiasi sifuri au hasi kinakataliwa', () => {
      expect(validateGharama(g('kodi', 0)).ok).toBe(false);
      expect(validateGharama(g('kodi', -100)).ok).toBe(false);
    });
    it('chanzo batili kinakataliwa', () => {
      expect(validateGharama(g('kodi', 5000, 'mbinguni')).ok).toBe(false);
    });
  });

  describe('jumla', () => {
    const list = [
      g('kodi', 50000, 'taslimu'),
      g('umeme', 12000, 'taslimu'),
      g('mshahara', 120000, 'nje'),
      g('usafiri', 3000),            // chanzo hakijawekwa = taslimu
    ];
    it('inatenganisha iliyotoka kasheni na ya nje', () => {
      const t = gharamaTotals(list);
      expect(t.jumla).toBe(185000);
      expect(t.taslimu).toBe(65000);   // 50,000 + 12,000 + 3,000
      expect(t.nje).toBe(120000);
      expect(t.idadi).toBe(4);
    });
    it('inaonyesha aina inayoongoza', () => {
      const t = gharamaTotals(list);
      expect(t.kubwaAina).toBe('mshahara');
      expect(t.kubwaKiasi).toBe(120000);
    });
    it('aina isiyojulikana inahesabiwa kama nyingine', () => {
      expect(gharamaTotals([g('hewa', 7000)]).kwaAina.nyingine).toBe(7000);
    });
    it('orodha tupu', () => {
      const t = gharamaTotals([]);
      expect(t.jumla).toBe(0); expect(t.kubwaAina).toBe(null);
    });
    it('data batili haitoi NaN', () => {
      expect(gharamaTotals([null, { aina: 'kodi', amount: 'abc' }]).jumla).toBe(0);
    });
  });

  describe('faida halisi', () => {
    it('kamisheni kasoro gharama', () => {
      const f = faidaHalisi({ kamisheni: 150000, gharama: 110000 });
      expect(f.faida).toBe(40000);
      expect(f.asilimia).toBe(27);
      expect(f.hasara).toBe(false);
    });
    it('gharama zikizidi kamisheni ni HASARA', () => {
      const f = faidaHalisi({ kamisheni: 80000, gharama: 120000 });
      expect(f.faida).toBe(-40000);
      expect(f.hasara).toBe(true);
    });
    it('hakuna kamisheni — asilimia isiwe NaN wala Infinity', () => {
      const f = faidaHalisi({ kamisheni: 0, gharama: 50000 });
      expect(f.asilimia).toBe(0);
      expect(f.faida).toBe(-50000);
    });
    it('bila gharama, faida ni kamisheni yote', () => {
      expect(faidaHalisi({ kamisheni: 90000 }).faida).toBe(90000);
    });
  });
});

// ============================================================
// MITANDAO — kuzuia float kwenda mtandao usio sahihi
// ============================================================
describe('mitandao', () => {
  it('inatambua mitandao kwa majina yote yanayotumika', () => {
    ['Vodacom','M-Pesa','mpesa','VODAFONE'].forEach(x => expect(mtandaoWa(x)).toBe('vodacom'));
    ['Airtel','Airtel Money'].forEach(x => expect(mtandaoWa(x)).toBe('airtel'));
    ['Tigo','TigoPesa','Mixx by Yas','YAS'].forEach(x => expect(mtandaoWa(x)).toBe('tigo'));
    ['Halotel','Halopesa','HALO PESA'].forEach(x => expect(mtandaoWa(x)).toBe('halotel'));
    expect(mtandaoWa('TTCL')).toBe('ttcl');
    expect(mtandaoWa('Azam Pesa')).toBe('azam');
    expect(mtandaoWa('AzamPesa')).toBe('azam');
    // Hapa ndipo kosa lilikuwa: "Azam Pesa" ilisomeka kama M-Pesa
    expect(mtandaoWa('Azam Pesa')).not.toBe('vodacom');
    expect(mtandaoWa('Halopesa')).not.toBe('vodacom');
    expect(mtandaoWa('T-Pesa')).toBe('ttcl');
  });
  it('isiyojulikana inarudisha null', () => {
    expect(mtandaoWa('Benki ya CRDB')).toBe(null);
    expect(mtandaoWa('')).toBe(null);
    expect(mtandaoWa(null)).toBe(null);
  });
  it('majina ya kuonyesha', () => {
    expect(mtandaoJina('vodacom')).toBe('Vodacom (M-Pesa)');
    expect(mtandaoJina(null)).toBe('—');
  });

  describe('kuoanisha namba na laini', () => {
    it('vinalingana', () => {
      expect(mtandaoUnalingana('Vodacom', 'M-Pesa')).toMatchObject({ known: true, sawa: true });
      expect(mtandaoUnalingana('Airtel', 'Airtel Money')).toMatchObject({ known: true, sawa: true });
    });
    it('VIMEKOSANA — hapa ndipo pesa inapopotea', () => {
      const r = mtandaoUnalingana('Airtel', 'M-Pesa');
      expect(r.known).toBe(true);
      expect(r.sawa).toBe(false);
      expect(r.namba).toBe('airtel');
      expect(r.laini).toBe('vodacom');
    });
    it('kisichojulikana hakikatazwi — hatuonyi bila uhakika', () => {
      expect(mtandaoUnalingana('Benki', 'M-Pesa')).toMatchObject({ known: false, sawa: true });
      expect(mtandaoUnalingana(null, null)).toMatchObject({ known: false, sawa: true });
    });
  });
});

describe('namba za simu', () => {
  it('inasafisha maumbo yote ya Tanzania', () => {
    expect(safishaNamba('0712345678')).toBe('255712345678');
    expect(safishaNamba('712345678')).toBe('255712345678');
    expect(safishaNamba('255712345678')).toBe('255712345678');
    expect(safishaNamba('+255 712 345 678')).toBe('255712345678');
    expect(safishaNamba('0712-345-678')).toBe('255712345678');
  });
  it('tupu na takataka', () => {
    expect(safishaNamba('')).toBe('');
    expect(safishaNamba(null)).toBe('');
    expect(nambaKamili('0712')).toBe(false);
    expect(nambaKamili('0712345678')).toBe(true);
  });
});

// ============================================================
// KIWANGO CHA UTHIBITISHO kama kipimo cha hatari
// ============================================================
describe('kiwango cha uthibitisho', () => {
  const t = (type, o = {}) => ({ type, amount: 1000, ...o });
  const many = (n, o) => Array.from({ length: n }, () => t('deposit', o));

  it('inahesabu asilimia ya miamala iliyothibitishwa', () => {
    const r = uthibitisho([
      t('deposit', { phone: '0712345678', jina_thibitishwa: true }),
      t('withdraw', { phone: '0712345679', jina_thibitishwa: true }),
      t('deposit', { phone: '0712345670' }),
      t('deposit'),
    ]);
    expect(r.idadi).toBe(4);
    expect(r.thibitishwa).toBe(2);
    expect(r.yenyeNamba).toBe(3);
    expect(r.bilaNamba).toBe(1);
    expect(r.asilimia).toBe(50);
  });

  it('float na mtaji havihesabiwi — havina mteja', () => {
    const r = uthibitisho([
      t('float_buy'), t('cash_in'), t('cash_out'), t('float_sell'),
      t('deposit', { jina_thibitishwa: true }),
    ]);
    expect(r.idadi).toBe(1);
    expect(r.asilimia).toBe(100);
  });

  it('marejesho hayahesabiwi mara mbili', () => {
    const r = uthibitisho([
      t('deposit', { jina_thibitishwa: true }),
      t('deposit', { jina_thibitishwa: true, reverses: 'x' }),
    ]);
    expect(r.idadi).toBe(1);
  });

  it('orodha tupu haitoi NaN wala asilimia ya uongo', () => {
    const r = uthibitisho([]);
    expect(r.idadi).toBe(0);
    expect(r.asilimia).toBe(null);
  });

  describe('ishara ya hatari', () => {
    it('sampuli ndogo HAITOI onyo — si haki kumshtaki kwa miamala mitano', () => {
      const r = uthibitishoHali(uthibitisho(many(5, { jina_thibitishwa: false })));
      expect(r.hali).toBe('haitoshi');
      expect(r.onyo).toBe(false);
    });
    it('kiwango cha chini kinatoa onyo', () => {
      const sasa = uthibitisho([...many(4, { jina_thibitishwa: true }), ...many(16, {})]);
      expect(sasa.asilimia).toBe(20);
      expect(uthibitishoHali(sasa).onyo).toBe(true);
      expect(uthibitishoHali(sasa).hali).toBe('chini');
    });
    it('KUSHUKA ghafla ni ishara hata kiwango kikiwa bado juu', () => {
      const kabla = uthibitisho(many(20, { jina_thibitishwa: true }));        // 100%
      const sasa  = uthibitisho([...many(14, { jina_thibitishwa: true }), ...many(6, {})]); // 70%
      const r = uthibitishoHali(sasa, kabla);
      expect(r.hali).toBe('kushuka');
      expect(r.tofauti).toBe(30);
    });
    it('kushuka kidogo si ishara', () => {
      const kabla = uthibitisho(many(20, { jina_thibitishwa: true }));
      const sasa  = uthibitisho([...many(18, { jina_thibitishwa: true }), ...many(2, {})]);
      expect(uthibitishoHali(sasa, kabla).onyo).toBe(false);
    });
    it('kipindi cha nyuma chenye sampuli ndogo hakitumiki kulinganisha', () => {
      const kabla = uthibitisho(many(3, { jina_thibitishwa: true }));
      const sasa  = uthibitisho([...many(14, { jina_thibitishwa: true }), ...many(6, {})]);
      expect(uthibitishoHali(sasa, kabla).hali).toBe('sawa');
    });
  });
});

describe('gharama: nani ameiandika', () => {
  const OWNER = 'u-owner', WAKALA = 'u-wakala';
  const list = [
    { aina: 'kodi', amount: 80000, recorded_by: OWNER },
    { aina: 'leseni', amount: 50000, recorded_by: OWNER },
    { aina: 'umeme', amount: 12000, recorded_by: WAKALA },
    { aina: 'usafiri', amount: 8000, recorded_by: WAKALA },
    { aina: 'vifaa', amount: 6000, recorded_by: WAKALA },
  ];
  it('inatenganisha za ofisini na za kibandani', () => {
    const r = gharamaKwaChanzo(list, OWNER);
    expect(r.ofisini).toEqual({ idadi: 2, jumla: 130000 });
    expect(r.kibandani).toEqual({ idadi: 3, jumla: 26000 });
    expect(r.jumla).toBe(156000);
  });
  it('iliyoandikwa na mmiliki ni ya ofisini', () => {
    expect(gharamaChanzo({ recorded_by: OWNER }, OWNER)).toBe(OFISINI);
    expect(gharamaChanzo({ recorded_by: WAKALA }, OWNER)).toBe(KIBANDANI);
  });
  it('isiyojulikana aliyeiandika ni ya kibandani, si ya mmiliki', () => {
    expect(gharamaChanzo({}, OWNER)).toBe(KIBANDANI);
    expect(gharamaChanzo({ recorded_by: null }, null)).toBe(KIBANDANI);
  });
  it('orodha tupu', () => {
    expect(gharamaKwaChanzo([], OWNER).jumla).toBe(0);
  });
});

// ============================================================
// AKAUNTI YA UWAKALA PEKEE — hana duka la kuonyesha
// ============================================================
describe('aina ya akaunti', () => {
  const hai = { canRecord: true, canClose: true };
  const kufa = { canRecord: false, canClose: false };

  it('aina isiyojulikana ni duka — maduka yaliyopo hayabadiliki', () => {
    expect(ainaYa({})).toBe('duka');
    expect(ainaYa({ akaunti_aina: 'hewa' })).toBe('duka');
    expect(ainaYa({ akaunti_aina: 'uwakala' })).toBe('uwakala');
    expect(ainaYa(null)).toBe('duka');
  });

  describe('UWAKALA PEKEE', () => {
    it('haoni duka hata usajili wa duka ukiwa hai', () => {
      expect(shellMode({ role: 'office', aina: AINA.uwakala, shopExpired: false, wakala: hai })).toBe('wakala');
    });
    it('HAJALIPA -> bado wakala (anaona ukurasa wa malipo), SI locked', () => {
      expect(shellMode({ role: 'office', aina: AINA.uwakala, shopExpired: true, wakala: kufa })).toBe('wakala');
      expect(shellMode({ role: 'office', aina: AINA.uwakala, shopExpired: true })).toBe('wakala');
    });
    it('mfanyakazi wake pia anaona uwakala pekee', () => {
      expect(shellMode({ role: 'employee', kazi: 'duka', aina: AINA.uwakala, shopExpired: false, wakala: hai })).toBe('wakala');
      expect(shellMode({ role: 'employee', kazi: 'wakala', aina: AINA.uwakala, shopExpired: true, wakala: kufa })).toBe('wakala');
    });
    it('admin hahusiki', () => {
      expect(shellMode({ role: 'admin', aina: AINA.uwakala })).toBe('duka');
    });
  });

  describe('AINA YA ZOTE inafuata sheria za zamani', () => {
    it('vyote vimelipwa', () => {
      expect(shellMode({ role: 'office', aina: AINA.zote, shopExpired: false, wakala: hai })).toBe('both');
    });
    it('duka limeisha', () => {
      expect(shellMode({ role: 'office', aina: AINA.zote, shopExpired: true, wakala: hai })).toBe('wakala');
    });
    it('vyote vimeisha -> locked', () => {
      expect(shellMode({ role: 'office', aina: AINA.zote, shopExpired: true, wakala: kufa })).toBe('locked');
    });
  });

  it('aina ya duka haijabadilika kabisa', () => {
    expect(shellMode({ role: 'office', aina: AINA.duka, shopExpired: false })).toBe('duka');
    expect(shellMode({ role: 'office', aina: AINA.duka, shopExpired: true })).toBe('locked');
    expect(shellMode({ role: 'office', shopExpired: true })).toBe('locked');
  });
});

describe('bei', () => {
  it('kifurushi cha pamoja kina punguzo la kweli', () => {
    expect(BEI.duka + BEI.uwakala).toBe(33300);
    expect(BEI.zote).toBe(28000);
    expect(PUNGUZO).toBe(5300);
  });
  it('duka + nyongeza ni sawa na kifurushi cha pamoja', () => {
    expect(BEI.duka + BEI.nyongeza).toBe(BEI.zote);
  });
  it('uwakala pekee ni ghali kuliko wa nyongeza', () => {
    expect(BEI.uwakala).toBeGreaterThan(BEI.nyongeza);
  });
  it('bei inategemea aina ya akaunti', () => {
    expect(beiYaUwakala('uwakala')).toBe(18300);
    expect(beiYaUwakala('zote')).toBe(13000);
    expect(beiYaUwakala('duka')).toBe(13000);
    expect(beiYaUwakala(undefined)).toBe(13000);
    expect(beiYaUwakala('hewa')).toBe(13000);
  });
  it('umbizo', () => {
    expect(fmtBei(18300)).toBe('TZS 18,300');
    expect(fmtBei(null)).toBe('TZS 0');
  });
});
