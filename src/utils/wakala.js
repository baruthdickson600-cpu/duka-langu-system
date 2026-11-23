// ============================================================
// DukaLangu — UWAKALA (kutuma na kutoa pesa)
//
// Wakala ana vitu viwili vinavyobadilika KINYUME:
//   TASLIMU — pesa moja kasheni, kwa shughuli zote za uwakala
//   FLOAT   — pesa ya kielektroniki, KILA LAINI ina yake
//
// Mteja akiweka pesa: taslimu inaingia, float inatoka.
// Akitoa: taslimu inatoka, float inaingia.
//
// KAMISHENI haigusi taslimu wala float papo hapo. Mitandao
// inailipa baadaye (wiki au mwezi), kwa hiyo inahesabiwa kama
// MAPATO YALIYOPATIKANA, si pesa iliyoingia. Ukiichanganya na
// taslimu, upatanisho wote unakuwa wa uongo.
//
// MSINGI WA KINGA: wakala anaweza kuandika chochote hapa, lakini
// hawezi kubadilisha salio la M-Pesa. Kwa hiyo kila hesabu
// inalenga kitu kimoja — kulinganisha inayotarajiwa na HALISI.
// ============================================================

const num = v => {
  const n = +v;
  return Number.isFinite(n) ? n : 0;
};

// Aina za miamala. `line` = inahitaji laini ya float.
export const TX = {
  deposit:    { label: 'Kuweka',          line: true,  cash: +1, float: -1, earns: true },
  withdraw:   { label: 'Kutoa',           line: true,  cash: -1, float: +1, earns: true },
  float_buy:  { label: 'Kununua float',   line: true,  cash: -1, float: +1, earns: false },
  float_sell: { label: 'Kuuza float',     line: true,  cash: +1, float: -1, earns: false },
  cash_in:    { label: 'Kuingiza mtaji',  line: false, cash: +1, float:  0, earns: false },
  cash_out:   { label: 'Kutoa pesa',      line: false, cash: -1, float:  0, earns: false },
};

export const txLabel = type => TX[type]?.label || type || '—';
export const needsLine = type => !!TX[type]?.line;
export const isKnownType = type => Object.prototype.hasOwnProperty.call(TX, type);

// Mabadiliko ya muamala mmoja.
// Marejesho (`reverses`) ni kinyume cha muamala wa awali.
export const txDeltas = tx => {
  const def = TX[tx?.type];
  if (!def) return { cash: 0, float: 0, commission: 0 };
  const sign  = tx?.reverses ? -1 : 1;
  const amt   = num(tx?.amount);
  const comm  = def.earns ? num(tx?.commission) : 0;
  return {
    cash:       sign * def.cash  * amt,
    float:      sign * def.float * amt,
    commission: sign * comm,
  };
};

// ===== UHAKIKI =====
// Muamala usiokubalika hauingii. Kila kosa linaelezwa kwa Kiswahili.
export const validateTx = (tx, { lines = [] } = {}) => {
  const e = [];
  if (!isKnownType(tx?.type)) e.push('Aina ya muamala haijulikani.');
  const amt = num(tx?.amount);
  if (amt <= 0) e.push('Weka kiasi sahihi kinachozidi sifuri.');
  if (num(tx?.commission) < 0) e.push('Kamisheni haiwezi kuwa chini ya sifuri.');
  if (needsLine(tx?.type)) {
    if (!tx?.line_id) e.push('Chagua laini.');
    else if (lines.length && !lines.some(l => String(l.id) === String(tx.line_id)))
      e.push('Laini hiyo haipo.');
  }
  // Kamisheni kubwa kuliko muamala wenyewe ni dalili ya kosa la kuandika
  if (TX[tx?.type]?.earns && num(tx?.commission) > amt)
    e.push('Kamisheni haiwezi kuzidi kiasi cha muamala.');
  return { ok: e.length === 0, errors: e };
};

// ===== SALIO =====
export const floatAfter = (opening, txs, lineId) =>
  (txs || []).filter(t => t && String(t.line_id ?? '') === String(lineId ?? ''))
    .reduce((a, t) => a + txDeltas(t).float, num(opening));

export const cashAfter = (opening, txs) =>
  (txs || []).filter(Boolean).reduce((a, t) => a + txDeltas(t).cash, num(opening));

export const commissionTotal = txs =>
  (txs || []).filter(Boolean).reduce((a, t) => a + txDeltas(t).commission, 0);

// ===== UPATANISHO =====
// `counted` ni kile wakala alichohesabu mwenyewe — *150*00# kwa float,
// mkono kwa taslimu. Hiki ndicho kinachokamata upotevu.
//
// MUHIMU: mfumo haumwonyeshi `expected` kabla hajaandika `counted`.
// Akiona jibu kwanza ataliandika, na upatanisho unakuwa mapambo.
export const reconcileLine = ({ openingFloat, txs, lineId, countedFloat }) => {
  const expected = floatAfter(openingFloat, txs, lineId);
  const counted  = num(countedFloat);
  return { expected, counted, variance: counted - expected };
};

export const reconcileCash = ({ openingCash, txs, countedCash }) => {
  const expected = cashAfter(openingCash, txs);
  const counted  = num(countedCash);
  return { expected, counted, variance: counted - expected };
};

// Hali ya tofauti, kwa kiwango alichoweka mmiliki
export const varianceState = (variance, threshold = 0) => {
  const v = num(variance), t = Math.abs(num(threshold));
  if (v === 0) return 'sawa';
  if (Math.abs(v) <= t) return 'ndogo';
  return v < 0 ? 'upungufu' : 'ziada';
};

// ===== MUHTASARI WA SIKU =====
export const dayTotals = txs => {
  const list = (txs || []).filter(Boolean);
  const by = type => list.filter(t => t.type === type && !t.reverses);
  const sum = l => l.reduce((a, t) => a + num(t.amount), 0);
  return {
    idadi:        list.length,
    kuweka:       sum(by('deposit')),
    idadiKuweka:  by('deposit').length,
    kutoa:        sum(by('withdraw')),
    idadiKutoa:   by('withdraw').length,
    floatNunuliwa: sum(by('float_buy')),
    floatUzwa:     sum(by('float_sell')),
    mtaji:        sum(by('cash_in')),
    pesaIliyotoka: sum(by('cash_out')),
    kamisheni:    commissionTotal(list),
    marejesho:    list.filter(t => t.reverses).length,
  };
};

// ===== USAJILI =====
// Vipengele vinajificha asipolipa, LAKINI anaruhusiwa kufunga siku
// kwa siku 7 — pesa isibaki bila kuhesabiwa. Hapo ndipo upotevu
// unapoanzia.
export const GRACE_DAYS = 7;
export const WARN_DAYS  = 5;

// ===== KAZI YA MFANYAKAZI =====
// Maduka mengi hupenda akaunti ZIWE TOFAUTI: mmoja anauza dukani,
// mwingine anafanya uwakala. Kuunganisha ni HIARI, si lazima.
//
//   duka   — anaona duka pekee (hii ndiyo ya kawaida)
//   wakala — anaona uwakala pekee, haoni bidhaa wala mauzo
//   zote   — anaona vyote
//
// Mfanyakazi asiye na kazi iliyowekwa ni 'duka' — kwa hiyo wafanyakazi
// wote waliopo sasa hawabadiliki hata kidogo.
export const KAZI = {
  duka:   { label: 'Duka pekee',    sub: 'Anauza bidhaa. Haoni uwakala.' },
  wakala: { label: 'Uwakala pekee', sub: 'Anatuma na kutoa pesa. Haoni bidhaa wala mauzo.' },
  zote:   { label: 'Duka na uwakala', sub: 'Anaona vyote kwenye akaunti moja.' },
};
export const kaziOf = u => (KAZI[u?.kazi] ? u.kazi : 'duka');
export const doesWakala = u => kaziOf(u) !== 'duka';
export const doesDuka   = u => kaziOf(u) !== 'wakala';

// Usajili wa duka ni tofauti na wa uwakala. Mtu anaweza kulipa
// uwakala pekee (18,300) bila kulipa duka (15,000), au kinyume.
//
// ⚠️ MUHIMU: kama uwakala HAUJAWASHWA, hii lazima itoe jibu LILE LILE
// la mfumo wa zamani — 'duka' au 'locked'. Kitu kimoja tu kinaamua.
// Aina ya akaunti: huduma aliyonunua, si aina ya duka.
//   duka    — mfumo wa zamani kabisa
//   uwakala — hana duka. Hapaswi kuona bidhaa wala mauzo, hata
//             siku ya kwanza, wala asipolipa.
//   zote    — duka na uwakala
export const AINA = { duka: 'duka', uwakala: 'uwakala', zote: 'zote' };
export const ainaYa = b => (AINA[b?.akaunti_aina] ? b.akaunti_aina : 'duka');

export const shellMode = ({ role, kazi, shopExpired, wakala, aina } = {}) => {
  // Admin, masoko, masupervaiza, mhasibu — hawahusiki na usajili
  if (role && role !== 'office' && role !== 'employee') return 'duka';

  const wkOn = !!(wakala && (wakala.canRecord || wakala.canClose));

  // Akaunti ya uwakala pekee: hakuna duka la kuonyesha, kwa hiyo
  // hakuna 'locked' wala 'both'. Asipolipa, anaona ukurasa wa
  // malipo ndani ya uwakala — si skrini ya duka lililofungwa.
  if (aina === AINA.uwakala) return 'wakala';

  // Mfanyakazi: kazi aliyopewa inatangulia
  if (role === 'employee') {
    const k = kaziOf({ kazi });
    // Uwakala pekee: HAPEWI duka hata uwakala ukiwa umezimwa.
    // Kumfungulia duka kungemwonyesha bidhaa na mauzo asiyoruhusiwa.
    if (k === 'wakala') return wkOn ? 'wakala' : 'locked';
    // Duka pekee: uwakala haumhusu kabisa
    if (k === 'duka')   return shopExpired ? 'locked' : 'duka';
  }

  if (!shopExpired) return wkOn ? 'both' : 'duka';
  return wkOn ? 'wakala' : 'locked';
};

export const wakalaAccess = ({ enabled, paidUntil, now = new Date() } = {}) => {
  if (!enabled) return { visible: false, canRecord: false, canClose: false, daysLeft: 0, expired: false };
  const until = paidUntil ? new Date(paidUntil) : null;
  if (!until || Number.isNaN(until.getTime()))
    return { visible: true, canRecord: false, canClose: false, daysLeft: 0, expired: true, neverPaid: true };

  const ms = until.getTime() - new Date(now).getTime();
  const daysLeft = Math.ceil(ms / 86400000);
  const expired = ms <= 0;
  const graceLeft = Math.ceil((ms + GRACE_DAYS * 86400000) / 86400000);

  return {
    visible: !expired || graceLeft > 0,
    canRecord: !expired,
    canClose: !expired || graceLeft > 0,   // kufunga siku kunaruhusiwa ndani ya siku 7
    daysLeft: Math.max(0, daysLeft),
    expired,
    graceLeft: expired ? Math.max(0, graceLeft) : GRACE_DAYS,
    warn: !expired && daysLeft <= WARN_DAYS,
  };
};

// ============================================================
// GHARAMA ZA UWAKALA
//
// Kamisheni si faida. Mwenye uwakala analipa kodi, umeme, bando,
// usafiri wa kufuata float, mshahara. Bila kuandika gharama hizi,
// mmiliki anaona "kamisheni 150,000 mwezi huu" na kudhani amepata
// 150,000 — wakati huenda amepata 40,000.
//
// ⚠️ SHERIA MUHIMU: gharama ikilipwa kwa TASLIMU ya uwakala, lazima
//    ipunguze kasheni pia. Ukiirekodi upande mmoja tu, upatanisho wa
//    siku utaonyesha UPUNGUFU — mfumo utamshtaki wakala kwa wizi
//    ambao haukutokea. Kwa hiyo database inaandika gharama NA
//    muamala wa `cash_out` kwa pamoja.
// ============================================================
export const GHARAMA = {
  kodi:        { label: 'Kodi ya ofisi',   icon: '🏠' },
  umeme:       { label: 'Umeme (LUKU)',    icon: '💡' },
  maji:        { label: 'Maji',            icon: '🚰' },
  mtandao:     { label: 'Bando / intaneti',icon: '📶' },
  mshahara:    { label: 'Mshahara',        icon: '👤' },
  usafiri:     { label: 'Usafiri',         icon: '🏍️' },
  ada_float:   { label: 'Ada ya float',    icon: '🔋' },
  vifaa:       { label: 'Vifaa na karatasi',icon: '📒' },
  ulinzi:      { label: 'Ulinzi',          icon: '🛡️' },
  leseni:      { label: 'Leseni na kodi',  icon: '🧾' },
  matengenezo: { label: 'Matengenezo',     icon: '🔧' },
  nyingine:    { label: 'Nyingine',        icon: '📌' },
};
export const gharamaLabel = k => GHARAMA[k]?.label || k || 'Nyingine';
export const gharamaIcon  = k => GHARAMA[k]?.icon || '📌';
export const isGharama    = k => Object.prototype.hasOwnProperty.call(GHARAMA, k);

// Chanzo cha malipo:
//   taslimu — imetoka kwenye kasheni ya uwakala (inapunguza kasheni)
//   nje     — imetoka mfukoni mwa mmiliki, benki au simu yake
export const CHANZO = {
  taslimu: { label: 'Kasheni ya uwakala', sub: 'Inapunguza pesa iliyopo kasheni' },
  nje:     { label: 'Nje ya kasheni',     sub: 'Mfukoni, benki au simu — kasheni haibadiliki' },
};
export const chanzoLabel = c => CHANZO[c]?.label || 'Kasheni ya uwakala';
const fromDrawer = g => (g?.chanzo || 'taslimu') === 'taslimu';

export const validateGharama = (g = {}) => {
  const e = [];
  if (!isGharama(g.aina)) e.push('Chagua aina ya gharama.');
  if (num(g.amount) <= 0) e.push('Weka kiasi sahihi kinachozidi sifuri.');
  if (g.chanzo && !CHANZO[g.chanzo]) e.push('Chanzo cha malipo si sahihi.');
  return { ok: e.length === 0, errors: e };
};

export const gharamaTotals = (list) => {
  const l = (list || []).filter(Boolean);
  const kwaAina = {};
  l.forEach(g => {
    const k = isGharama(g.aina) ? g.aina : 'nyingine';
    kwaAina[k] = (kwaAina[k] || 0) + num(g.amount);
  });
  const jumla   = l.reduce((a, g) => a + num(g.amount), 0);
  const taslimu = l.filter(fromDrawer).reduce((a, g) => a + num(g.amount), 0);
  // Aina inayoongoza — ndiyo mmiliki anapaswa kuiangalia kwanza
  const kubwa = Object.entries(kwaAina).sort((a, b) => b[1] - a[1])[0] || null;
  return {
    jumla, taslimu, nje: jumla - taslimu,
    idadi: l.length, kwaAina,
    kubwaAina: kubwa ? kubwa[0] : null,
    kubwaKiasi: kubwa ? kubwa[1] : 0,
  };
};

// Faida halisi ya uwakala: kamisheni iliyopatikana kasoro gharama.
// Hii ndiyo namba pekee inayomwambia mmiliki kama biashara inalipa.
export const faidaHalisi = ({ kamisheni, gharama }) => {
  const k = num(kamisheni), g = num(gharama);
  const faida = k - g;
  return {
    kamisheni: k, gharama: g, faida,
    asilimia: k > 0 ? Math.round((faida / k) * 100) : 0,
    hasara: faida < 0,
  };
};

// ============================================================
// MITANDAO — kuoanisha jina la laini na mtandao halisi
//
// Abliner inarudisha mtandao wa namba (Vodacom, Airtel, Halotel...).
// Laini ya float ina jina la biashara (M-Pesa, Mixx by Yas...).
// Vikikosana, ni kosa kubwa: wakala anatoa float ya M-Pesa kwa
// namba ya Airtel, muamala unakwama au unaenda mahali pengine.
// ============================================================
const MITANDAO = {
  // ⚠️ Lazima tutumie mipaka ya maneno (\\b). Bila yo, "Azam Pesa"
  //    inasomeka kama "M-Pesa" kwa sababu ina herufi zilezile ndani.
  azam:    /\b(azam\s?pesa|azam)\b/,
  halotel: /\b(halo\s?pesa|halotel|halo)\b/,
  ttcl:    /\b(t\s?pesa|ttcl)\b/,
  tigo:    /\b(tigo\s?pesa|tigo|mixx?(\s?by\s?yas)?|yas)\b/,
  airtel:  /\b(airtel(\s?money)?)\b/,
  vodacom: /\b(vodacom|vodafone|m\s?pesa)\b/,
};
const JINA_MTANDAO = {
  vodacom: 'Vodacom (M-Pesa)', airtel: 'Airtel Money', tigo: 'Mixx by Yas',
  halotel: 'Halopesa', ttcl: 'TTCL T-Pesa', azam: 'Azam Pesa',
};
// Jina lolote -> mtandao mmoja unaojulikana
export const mtandaoWa = (jina) => {
  // '-' na '.' zinakuwa nafasi ili "m-pesa" na "m pesa" ziwe sawa
  const t = String(jina || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!t) return null;
  for (const [k, re] of Object.entries(MITANDAO)) if (re.test(t)) return k;
  return null;
};

export const mtandaoJina = k => JINA_MTANDAO[k] || k || '—';

// Je mtandao wa namba unalingana na laini iliyochaguliwa?
// Kisichojulikana hakikatazwi — tunaonya tu tunapokuwa na uhakika.
export const mtandaoUnalingana = (mtandaoWaNamba, jinaLaLaini) => {
  const a = mtandaoWa(mtandaoWaNamba), b = mtandaoWa(jinaLaLaini);
  if (!a || !b) return { known: false, sawa: true };
  return { known: true, sawa: a === b, namba: a, laini: b };
};

// Namba ya Tanzania -> 2557XXXXXXXX
export const safishaNamba = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('255')) return d.slice(0, 12);
  if (d.startsWith('0'))   return '255' + d.slice(1, 10);
  if (d.length === 9)      return '255' + d;
  return d;
};
export const nambaKamili = p => safishaNamba(p).length === 12;

// ============================================================
// KIWANGO CHA UTHIBITISHO
//
// Abliner haitozi chochote, kwa hiyo hakuna sababu ya kuruka
// uthibitisho. Hilo linageuza kiwango cha uthibitisho kuwa KIPIMO
// CHA HATARI: wakala akiacha ghafla kuandika namba, ni dalili ya
// mapema — inaonekana kabla tofauti haijatokea.
//
// Miamala ya float na mtaji haihusiki; haina mteja.
// ============================================================
export const uthibitisho = (txs) => {
  const list = (txs || []).filter(t => t && !t.reverses && TX[t.type]?.earns);
  const yenyeNamba = list.filter(t => String(t.phone || '').trim());
  const zilizothibitishwa = list.filter(t => t.jina_thibitishwa);
  const idadi = list.length;
  return {
    idadi,
    thibitishwa: zilizothibitishwa.length,
    yenyeNamba: yenyeNamba.length,
    bilaNamba: idadi - yenyeNamba.length,
    asilimia: idadi ? Math.round((zilizothibitishwa.length / idadi) * 100) : null,
  };
};

// Kushuka kwa kiwango ni ishara, si hukumu. Tunalinganisha kipindi
// cha sasa na kilichopita, na tunanyamaza kama sampuli ni ndogo.
export const UTHIBITISHO_CHINI = 60;   // asilimia
export const UTHIBITISHO_KUSHUKA = 25; // pointi
export const uthibitishoHali = (sasa, kabla) => {
  if (!sasa || sasa.idadi < 10) return { hali: 'haitoshi', onyo: false };
  if (sasa.asilimia < UTHIBITISHO_CHINI) return { hali: 'chini', onyo: true };
  if (kabla && kabla.idadi >= 10 && kabla.asilimia - sasa.asilimia >= UTHIBITISHO_KUSHUKA)
    return { hali: 'kushuka', onyo: true, tofauti: kabla.asilimia - sasa.asilimia };
  return { hali: 'sawa', onyo: false };
};

// ============================================================
// GHARAMA: NANI AMEIANDIKA
//
// Wakala yupo kibandani — ndiye anayeona kinachohitajika: LUKU
// imeisha, daftari limekwisha, bodaboda ya kwenda kuchukua float.
// Mmiliki yupo ofisini — analipa kodi, mshahara, leseni.
//
// Wote wawili wanaandika, lakini mmiliki anahitaji kuona kwa
// kutenganishwa: gharama za kibandani ndizo zinazoongezeka kimya
// kimya, na ndizo zinazohitaji maswali.
// ============================================================
export const KIBANDANI = 'kibandani', OFISINI = 'ofisini';

export const gharamaChanzo = (g, ownerId) =>
  String(g?.recorded_by ?? '') === String(ownerId ?? '\u0000') ? OFISINI : KIBANDANI;

export const gharamaKwaChanzo = (list, ownerId) => {
  const l = (list || []).filter(Boolean);
  const ofisi = l.filter(g => gharamaChanzo(g, ownerId) === OFISINI);
  const kibanda = l.filter(g => gharamaChanzo(g, ownerId) === KIBANDANI);
  const jumla = x => x.reduce((a, g) => a + num(g.amount), 0);
  return {
    ofisini:  { idadi: ofisi.length,   jumla: jumla(ofisi) },
    kibandani:{ idadi: kibanda.length, jumla: jumla(kibanda) },
    jumla: jumla(l),
  };
};

// ============================================================
// BEI — chanzo kimoja cha ukweli
//
// Bei ilikuwa imeandikwa mahali saba tofauti. Ikibadilika, moja
// ingesahaulika, na mteja angeona bei moja kwenye usajili na
// nyingine wakati wa kulipa.
//
// Uwakala peke yake ni ghali kuliko wa nyongeza kwa sababu hauna
// usajili wa duka unaosaidia gharama. Kifurushi cha pamoja kina
// punguzo la kweli: 15,000 + 18,300 = 33,300, lakini vyote ni
// 28,000 — mteja anaokoa 5,300.
// ============================================================
export const BEI = {
  duka:     15000,   // duka pekee
  uwakala:  18300,   // uwakala pekee, hana duka
  nyongeza: 13000,   // uwakala kwa aliye na duka (15,000 + 13,000 = 28,000)
  zote:     28000,   // kifurushi cha pamoja
};
export const PUNGUZO = BEI.duka + BEI.uwakala - BEI.zote;   // 5,300

// Bei ya uwakala kwa akaunti husika. Hii ndiyo inayotumika
// server-side; kiasi kinachotoka kwa kivinjari hakiaminiwi.
export const beiYaUwakala = aina =>
  ainaYa({ akaunti_aina: aina }) === AINA.uwakala ? BEI.uwakala : BEI.nyongeza;

export const fmtBei = n => 'TZS ' + (Number(n) || 0).toLocaleString('en-US');
