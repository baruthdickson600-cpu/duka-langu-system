// ============================================================
// DUKALANGU — VIFURUSHI (PLANS)
//
// HILI NDILO CHANZO PEKEE CHA UKWELI kwa bei, vipengele, vikwazo
// na bando la SMS. Usiweke bei nyingine popote kwenye mfumo.
// (Hapo awali bei zilikuwa sehemu tatu tofauti zikipingana.)
// ============================================================

export const PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 15000,
    color: '#5C6A62',
    icon: '⚡',
    tagline: 'Kwa duka moja linaloanza',
    features: [
      'Mauzo ya POS',
      'Usimamizi wa stock',
      'Wateja na madeni',
      'Matumizi',
      'Wafanyakazi 3',
      'Tawi 1',
      'Ripoti za msingi',
      'SMS 50 kwa mwezi (ukumbusho wa deni)',
    ],
    limits: { employees: 3, branches: 1, products: 500, customers: 1000 },
    smsQuota: 50,
    smsFeatures: ['debt_reminder'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 25000,
    color: '#8B5CF6',
    icon: '⭐',
    tagline: 'Kwa biashara inayokua',
    features: [
      'Yote ya Basic',
      'Matawi hadi 5',
      'Wafanyakazi 15',
      'Ripoti za kina',
      'Uchambuzi wa AI',
      'Export PDF / Excel',
      'SMS 100 kwa mwezi (risiti, ofa, madeni)',
      'Msaada wa haraka',
    ],
    limits: { employees: 15, branches: 5, products: 5000, customers: 20000 },
    smsQuota: 100,
    smsFeatures: ['debt_reminder', 'receipt', 'payment_confirm', 'promo'],
  },
  biashara: {
    id: 'biashara',
    name: 'Biashara',
    price: 35000,
    color: '#F2B705',
    icon: '👑',
    tagline: 'Kwa biashara kubwa yenye matawi',
    features: [
      'Yote ya Premium',
      'Matawi bila kikomo',
      'Wafanyakazi bila kikomo',
      'Bidhaa bila kikomo',
      'SMS 150 kwa mwezi + kuratibu (scheduled)',
      'EFD / TRA',
      'Msaada wa pekee + mafunzo',
    ],
    limits: { employees: 9999, branches: 999, products: 999999, customers: 999999 },
    smsQuota: 150,
    smsFeatures: ['debt_reminder', 'receipt', 'payment_confirm', 'promo', 'scheduled', 'auto'],
  },
};

// Jina la zamani 'enterprise' sasa ni 'biashara' — tunalikubali bado
// ili wateja wa zamani wasivunjike.
export const PLAN_ALIASES = { enterprise: 'biashara', branch2: 'premium' };

export const resolvePlanId = (p) => {
  const key = String(p || 'basic').toLowerCase();
  return PLANS[key] ? key : (PLAN_ALIASES[key] || 'basic');
};
export const getPlan = (p) => PLANS[resolvePlanId(p)];

export const PLAN_LIST = [PLANS.basic, PLANS.premium, PLANS.biashara];
export const PLAN_PRICES = Object.fromEntries(Object.entries(PLANS).map(([k, v]) => [k, v.price]));

// ---- Bando la SMS la kununua ----
// Gharama kwetu ni TZS 23 kwa SMS (Beem). Bei hapa zinaacha faida.
export const SMS_BUNDLES = [
  { id: 'ndogo', name: 'Ndogo', sms: 200, price: 8000 },
  { id: 'kati', name: 'Kati', sms: 500, price: 17500 },
  { id: 'kubwa', name: 'Kubwa', sms: 1500, price: 45000 },
];
export const SMS_UNIT_COST = 23; // gharama yetu kwa SMS moja

// ---- Vipengele vinavyohitaji plan fulani ----
export const FEATURE_PLANS = {
  branches: ['premium', 'biashara'],
  ai_insights: ['premium', 'biashara'],
  deep_reports: ['premium', 'biashara'],
  export: ['premium', 'biashara'],
  sms_receipt: ['premium', 'biashara'],
  sms_promo: ['premium', 'biashara'],
  sms_scheduled: ['biashara'],
  efd_tra: ['biashara'],
  multi_admin: ['biashara'],
};

// Jina rafiki la kipengele (kwa ujumbe wa kuboresha)
export const FEATURE_LABELS = {
  branches: 'Matawi mengi',
  ai_insights: 'Uchambuzi wa AI',
  deep_reports: 'Ripoti za kina',
  export: 'Export PDF/Excel',
  sms_receipt: 'Risiti kwa SMS',
  sms_promo: 'Matangazo kwa SMS',
  sms_scheduled: 'Kuratibu SMS',
  efd_tra: 'EFD / TRA',
  multi_admin: 'Admin wengi',
};

// Plan ya chini kabisa inayotoa kipengele
export const minPlanFor = (feature) => {
  const allowed = FEATURE_PLANS[feature];
  if (!allowed || !allowed.length) return null;
  return PLANS[allowed[0]] || null;
};
