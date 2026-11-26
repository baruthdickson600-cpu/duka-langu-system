// Supabase ya bandia inayofanya kama PostgREST ya kweli:
//  - inakataa safu zisizopo kwenye schema (PGRST204)
//  - inakataa RPC zisizopo
//  - inaweza kuwasha RLS (muuzaji hasomi products/sales)
//  - ina unique index kwenye (business_id, offline_id)
//  - INAKATA safu 1000 kimyakimya, kama Supabase halisi

// Supabase inarudisha safu 1000 pekee kwa kila ombi, bila kosa.
export const MAX_ROWS = 1000;

const DB = { businesses:[], users:[], products:[], sales:[], orders:[], returns:[],
             stock_history:[], customers:[], expenses:[], credit_transactions:[],
             wakala_lines:[], wakala_tx:[], wakala_days:[], wakala_settings:[], wakala_expenses:[], wakala_alerts:[], wakala_payments:[], wakala_checks:[],
             settings:[], sms_log:[], sms_logs:[], sms_templates:[] };

const CFG = {
  schema: {
    businesses:['id','name','owner_id','plan','token_active','wakala_enabled','wakala_paid_until'],
    users:['id','business_id','role','name','email','branch_id','is_active','phone','promo_code',
           'nida','tarehe_kuzaliwa','jinsia','anwani','cheo_kazi','tarehe_kuanza',
           'ndugu_jina','ndugu_simu','maelezo'],
    products:['id','business_id','branch_id','name','buy_price','sell_price','quantity','unit','min_stock','category','updated_at'],
    sales:['id','business_id','branch_id','seller_id','seller_name','items','subtotal','discount','total','profit',
           'payment_method','payment_details','customer_id','customer_name','is_synced','created_at'],
    orders:['id','business_id','order_number','seller_id','items','subtotal','discount','total','paid_amount',
            'remaining_amount','status','profit','created_at','reserved_stock'],
    returns:['id','business_id','sale_id','items','reason','refund_amount','processed_by','status','customer_id','was_credit','created_at'],
    stock_history:['id','product_id','business_id','change_type','quantity_before','quantity_change','quantity_after','user_id','note','created_at'],
    customers:['id','business_id','name','phone','credit_balance','total_spent','credit_limit','last_credit_date'],
    expenses:['id','business_id','amount','created_at'],
    credit_transactions:['id','business_id','customer_id','type','amount','balance_after','note','recorded_by','created_at'],
    wakala_lines:['id','business_id','name','short_code','opening_float','active','sort_order','created_at'],
    wakala_tx:['id','business_id','line_id','tx_date','type','amount','commission','customer','phone','ref','note',
               'reverses','offline_id','recorded_by','created_at','jina_halisi','mtandao','jina_thibitishwa'],
    wakala_days:['id','business_id','day','lines','counted_cash','expected_cash','variance_cash','variance_float',
                 'commission','tx_count','note','closed_by','closed_at'],
    wakala_settings:['business_id','cash_opening','threshold','alert_phone','alert_sms','updated_at',
                     'arifa_tofauti','arifa_float','arifa_mkubwa','arifa_hitimisho','arifa_asubuhi','float_chini','kikomo_kikubwa'],
    wakala_expenses:['id','business_id','tarehe','aina','amount','chanzo','maelezo','tx_id',
                     'offline_id','recorded_by','created_at'],
    wakala_alerts:['id','business_id','aina','kitu','day','ujumbe','created_at'],
    settings:['key','value'],
    sms_log:['id','business_id','customer_id','phone','message','kind','status','created_at'],
    sms_logs:['id','business_id','phone','message','kind','status','created_at'],
    sms_templates:['id','name','body','created_at'],
    wakala_checks:['id','business_id','day','requested_by','requested_at','deadline','answered_by',
                   'answered_at','lines','counted_cash','expected_cash','variance_cash',
                   'variance_float','dakika','note','status'],
    wakala_payments:['id','business_id','amount','days','phone','provider','provider_ref',
                     'external_id','status','paid_at','created_at'],
    support_tickets:['id','business_id','user_id','user_email','business_name','subject','message',
                     'priority','status','reply','replied_at','replied_by','created_at','ticket_no',
                     'kitengo','phone','assigned_role','assigned_to','assigned_name',
                     'first_response_at','closed_at','updated_at'],
    ticket_messages:['id','ticket_id','sender_id','sender_role','sender_name','body','ni_ndani','created_at'],
    arifa_wapokeaji:['id','jina','simu','wajibu','user_id','promo_code','aina','active','created_at'],
    arifa_kazi_log:['id','aina','simu','kitu','day','ujumbe','created_at'],
  },
  rpcs: new Set(),        // tupu = SQL haijaendeshwa
  missing: new Set(),     // jedwali ambalo SQL yake haijaendeshwa
  rls: false,
  views: false,
  role: 'office',
  uid: null,
  log: [],
};

const uuid = () => 'id-' + Math.random().toString(36).slice(2, 11);
const err = (message, code) => ({ data:null, error:{ message, code }, status:400 });

function checkCols(table, row){
  const cols = CFG.schema[table] || [];
  for (const k of Object.keys(row))
    if (!cols.includes(k))
      return `Could not find the '${k}' column of '${table}' in the schema cache`;
  return null;
}

const VIEWS = { products_pub:'products', sales_pub:'sales', orders_pub:'orders' };

function q(table){
  const base = VIEWS[table];
  let rows = () => {
    if (base) {
      // View zipo tu kama SQL imeendeshwa
      if (!CFG.views) return null;
      const strip = base === 'products' ? ['buy_price'] : ['profit'];
      return (DB[base]||[]).map(r => {
        const o = { ...r };
        strip.forEach(k => delete o[k]);
        if (Array.isArray(o.items)) o.items = o.items.map(i => {
          const j = { ...i }; delete j.cost; delete j.lineProfit; delete j.buyPrice; return j;
        });
        return o;
      });
    }
    if (CFG.missing.has(table)) return null;
    return DB[table] || (DB[table] = []);
  };
  const filters = []; const _orders = []; let _order = null, _limit = null, _single = false, _count = null, _conflict = 'id', _range = null;
  let op = null, payload = null;

  const run = () => {
    CFG.log.push({ table, op: op || 'select' });
    if (rows() === null)
      return { data:null, error:{ message:`Could not find the table 'public.${table}' in the schema cache`, code:'PGRST205' }, status:404 };

    if (op === 'insert'){
      // RLS: products/orders zinahitaji role 'office' au 'admin' (WITH CHECK)
      if (CFG.rls && CFG.role === 'employee' && ['products'].includes(table))
        return { data:null, error:{ message:'new row violates row-level security policy for table "products"', code:'42501' }, status:403 };
      const list = Array.isArray(payload) ? payload : [payload];
      const out = [];
      for (const r of list){
        const bad = checkCols(table, r);
        if (bad) return err(bad, 'PGRST204');
        if (table === 'sales' && r.offline_id != null &&
            rows().some(x => x.business_id === r.business_id && x.offline_id === r.offline_id))
          return { data:null, error:{ message:'duplicate key value violates unique constraint "sales_offline_id_uniq"', code:'23505' }, status:409 };

        if (table === 'wakala_alerts'){
          const day = r.day || new Date().toISOString().slice(0,10);
          if (rows().some(x => x.business_id===r.business_id && x.aina===r.aina &&
                               String(x.kitu||'')===String(r.kitu||'') && String(x.day||day)===String(day)))
            return { data:null, error:{ message:'duplicate alert', code:'23505' }, status:409 };
          r.day = day;
        }
        // ===== KINGA ZA UWAKALA (kama triggers za Postgres) =====
        if (table === 'wakala_tx'){
          if (r.offline_id != null && rows().some(x => x.business_id===r.business_id && x.offline_id===r.offline_id))
            return { data:null, error:{ message:'duplicate key value violates unique constraint "wakala_tx_offline_uniq"', code:'23505' }, status:409 };
          if (r.reverses != null && rows().some(x => x.reverses === r.reverses))
            return { data:null, error:{ message:'duplicate key value violates unique constraint "wakala_tx_reverses_uniq"', code:'23505' }, status:409 };
          if (!(+r.amount > 0))
            return { data:null, error:{ message:'new row violates check constraint "wakala_tx_amount_ok"', code:'23514' }, status:400 };
          if (+(r.commission||0) > +r.amount)
            return { data:null, error:{ message:'new row violates check constraint "wakala_tx_comm_ok"', code:'23514' }, status:400 };
          if (DB.wakala_days.some(d => d.business_id===r.business_id && String(d.day)===String(r.tx_date)))
            return { data:null, error:{ message:`Siku ya ${r.tx_date} imefungwa tayari.`, code:'23514' }, status:400 };
        }
        const saved = { id: r.id || uuid(), created_at: r.created_at || new Date().toISOString(),
                        ...r,
                        ...(table==='wakala_tx' ? { recorded_by: CFG.uid } : {}) };
        rows().push(saved); out.push(saved);
      }
      if (_single) return { data: out[0] || null, error: null, status: 201 };
      return { data: out, error: null, status: 201 };
    }

    const pita = (r, f) => {
      if (f.like !== undefined)
        return new RegExp('^' + String(f.like).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/%/g,'.*') + '$')
          .test(String(r[f.col] ?? ''));
      if (f.gte !== undefined) return String(r[f.col] ?? '') >= String(f.gte);
      if (f.in  !== undefined) return f.in.map(String).includes(String(r[f.col]));
      return String(r[f.col]) === String(f.val);
    };
    let res = rows().filter(r => filters.every(f => pita(r, f)));

    // RLS: muuzaji hasomi products/sales moja kwa moja
    if (CFG.rls && CFG.role === 'employee' && ['products','sales','orders'].includes(table))
      res = [];

    if (op === 'update'){
      const bad = checkCols(table, payload);
      if (bad) return err(bad, 'PGRST204');
      if (CFG.rls && CFG.role === 'employee' && ['products','sales','orders','wakala_tx'].includes(table))
        return { data: [], error: null, status: 200, count: _count ? 0 : undefined };
      res.forEach(r => Object.assign(r, payload));
      return { data: res, error: null, status: 200, count: _count ? res.length : undefined };
    }
    if (op === 'upsert'){
      const bad = checkCols(table, payload);
      if (bad) return err(bad, 'PGRST204');
      const key = _conflict;
      const found = rows().find(r => String(r[key]) === String(payload[key]));
      if (found){ Object.assign(found, payload); return { data:_single?found:[found], error:null, status:200 }; }
      const saved = { id: payload.id || uuid(), ...payload };
      rows().push(saved);
      return { data:_single?saved:[saved], error:null, status:201 };
    }
    if (op === 'delete'){
      // RLS: muuzaji HAWEZI kufuta muamala wa uwakala
      if (CFG.rls && CFG.role === 'employee' && ['wakala_tx','wakala_days'].includes(table))
        return { data: [], error: null, status: 200 };
      DB[table] = rows().filter(r => !res.includes(r));
      return { data: res, error: null, status: 200 };
    }
    if (_orders.length) res = [...res].sort((a,b) => {
      for (const o of _orders) {
        const x = String(a[o.col]||''), y = String(b[o.col]||'');
        const c = o.asc ? x.localeCompare(y) : y.localeCompare(x);
        if (c) return c;
      }
      return 0;
    });
    if (_limit) res = res.slice(0, _limit);
    if (_single) return { data: res[0] || null, error: res.length ? null : { message:'no rows' }, status:200 };

    // ========================================================
    // KIKOMO CHA PostgREST — 1000 kimyakimya
    //
    // Supabase inarudisha safu 1000 PEKEE bila kosa lolote.
    // Ombi linafanikiwa; linadanganya tu. Bila kuiga hili hapa,
    // jaribio lolote la mfumo lingepita wakati mteja anaona
    // historia ikipotea siku baada ya siku.
    // ========================================================
    const juu = _range ? Math.min(_range.hadi - _range.kutoka + 1, MAX_ROWS) : MAX_ROWS;
    const anza = _range ? _range.kutoka : 0;
    res = res.slice(anza, anza + juu);
    return { data: res, error: null, status: 200 };
  };

  const b = {
    insert(v){ op='insert'; payload=v; return b },
    upsert(v,o){ op='upsert'; payload=v; _conflict=o&&o.onConflict?o.onConflict:'id'; return b },
    update(v,o){ op='update'; payload=v; _count=o&&o.count?o.count:null; return b },
    delete(){ op='delete'; return b },
    select(){ if(!op) op='select'; return b },
    eq(col,val){ filters.push({col,val}); return b },
    like(col,pat){ filters.push({col,like:pat}); return b },
    gte(col,val){ filters.push({col,gte:val}); return b },
    in(col,vals){ filters.push({col,in:vals}); return b },
    // PostgREST inakusanya mipangilio: .order(a).order(b) ni
    // "panga kwa a, kisha b". Kuiweka ya pili peke yake
    // kungeficha hitilafu za kurasa zinazorudia safu.
    order(col,o){ _orders.push({col,asc:o?.ascending!==false}); if(!_order)_order=_orders[0]; return b },
    limit(n){ _limit=n; return b },
    range(kutoka,hadi){ _range={kutoka,hadi}; return b },
    single(){ _single=true; return b },
    maybeSingle(){ _single=true; return b },
    then(res,rej){ return Promise.resolve(run()).then(res,rej) },
  };
  return b;
}

export const supabase = {
  from: q,
  rpc: async (name, args) => {
    CFG.log.push({ rpc:name, args });
    if (!CFG.rpcs.has(name))
      return { data:null, error:{ message:`Could not find the function public.${name}`, code:'PGRST202' } };
    if (name === 'dl_deduct_stock' || name === 'dl_restore_stock'){
      const p = DB.products.find(x => x.id === args.p_id);
      if (!p) return { data:null, error:null };
      const d = +args.p_qty || 0;
      p.quantity = name === 'dl_deduct_stock' ? Math.max(0, (+p.quantity||0) - d) : (+p.quantity||0) + d;
      return { data: p.quantity, error:null };
    }
    if (name === 'dl_wakala_check_open'){
      const biz=args.p_biz;
      if (DB.wakala_checks.some(c=>c.business_id===biz&&c.status==='pending'&&new Date(c.deadline)>new Date()))
        return { data:null, error:{ message:'Kuna ukaguzi unaosubiri majibu tayari.' } };
      const now=new Date();
      const row={ id:uuid(), business_id:biz,
        day:new Date(Date.now()+3*3600000).toISOString().slice(0,10),
        requested_by:CFG.uid, requested_at:now.toISOString(),
        deadline:new Date(now.getTime()+(args.p_dakika||15)*60000).toISOString(),
        lines:{}, status:'pending' };
      DB.wakala_checks.push(row);
      return { data:row, error:null };
    }
    if (name === 'dl_wakala_check_answer'){
      const c=DB.wakala_checks.find(x=>x.id===args.p_id);
      if (!c) return { data:null, error:{ message:'Ukaguzi haujapatikana.' } };
      if (c.status!=='pending') return { data:null, error:{ message:'Ukaguzi huu umekwisha jibiwa.' } };
      const SIGN={deposit:[1,-1],withdraw:[-1,1],float_buy:[-1,1],float_sell:[1,-1],cash_in:[1,0],cash_out:[-1,0]};
      const dayTx=DB.wakala_tx.filter(t=>t.business_id===c.business_id&&String(t.tx_date)===String(c.day));
      let vf=0; const lines={};
      DB.wakala_lines.filter(l=>l.business_id===c.business_id&&l.active!==false).forEach(l=>{
        const opening=+l.opening_float||0;
        const expected=dayTx.filter(t=>t.line_id===l.id)
          .reduce((a,t)=>a+(t.reverses?-1:1)*(SIGN[t.type]?SIGN[t.type][1]:0)*(+t.amount||0),opening);
        const counted=(args.p_counted&&args.p_counted[l.id]!=null)?+args.p_counted[l.id]:expected;
        vf+=counted-expected;
        lines[l.id]={expected,counted,variance:counted-expected};
      });
      const cfg=DB.wakala_settings.find(x=>x.business_id===c.business_id);
      const openCash=+(cfg?.cash_opening)||0;
      const expCash=dayTx.reduce((a,t)=>a+(t.reverses?-1:1)*(SIGN[t.type]?SIGN[t.type][0]:0)*(+t.amount||0),openCash);
      Object.assign(c,{ answered_by:CFG.uid, answered_at:new Date().toISOString(), lines,
        counted_cash:+args.p_counted_cash||0, expected_cash:expCash,
        variance_cash:(+args.p_counted_cash||0)-expCash, variance_float:vf,
        dakika:(Date.now()-new Date(c.requested_at).getTime())/60000,
        note:args.p_note||null,
        status:new Date()>new Date(c.deadline)?'expired':'done' });
      return { data:c, error:null };
    }
    if (name === 'dl_wakala_add_expense'){
      const biz=args.p_biz, day=args.p_tarehe, chanzo=args.p_chanzo||'taslimu';
      if (args.p_offline_id && DB.wakala_expenses.some(x=>x.business_id===biz&&x.offline_id===args.p_offline_id))
        return { data:null, error:{ message:'duplicate', code:'23505' } };
      if (!(+args.p_amount>0)) return { data:null, error:{ message:'Weka kiasi sahihi kinachozidi sifuri.' } };
      let tx=null;
      if (chanzo==='taslimu'){
        if (DB.wakala_days.some(d=>d.business_id===biz&&String(d.day)===String(day)))
          return { data:null, error:{ message:`Siku ya ${day} imefungwa tayari.` } };
        tx={ id:uuid(), business_id:biz, line_id:null, tx_date:day, type:'cash_out',
             amount:+args.p_amount, commission:0, note:args.p_maelezo||('Gharama: '+args.p_aina),
             recorded_by:CFG.uid, created_at:new Date().toISOString() };
        DB.wakala_tx.push(tx);
      }
      const row={ id:uuid(), business_id:biz, tarehe:day, aina:args.p_aina, amount:+args.p_amount,
                  chanzo, maelezo:args.p_maelezo||null, tx_id:tx?tx.id:null,
                  offline_id:args.p_offline_id||null, recorded_by:CFG.uid,
                  created_at:new Date().toISOString() };
      DB.wakala_expenses.push(row);
      return { data:row, error:null };
    }
    if (name === 'dl_wakala_del_expense'){
      const g=DB.wakala_expenses.find(x=>x.id===args.p_id);
      if (!g) return { data:false, error:null };
      if (DB.wakala_days.some(d=>d.business_id===g.business_id&&String(d.day)===String(g.tarehe)))
        return { data:null, error:{ message:`Siku ya ${g.tarehe} imefungwa. Fungua siku kwanza.` } };
      DB.wakala_expenses=DB.wakala_expenses.filter(x=>x.id!==args.p_id);
      if (g.tx_id) DB.wakala_tx=DB.wakala_tx.filter(t=>t.id!==g.tx_id);
      return { data:true, error:null };
    }
    if (name === 'dl_wakala_close_day'){
      const biz = args.p_biz, day = args.p_day;
      if (DB.wakala_days.some(d => d.business_id===biz && String(d.day)===String(day)))
        return { data:null, error:{ message:`Siku ya ${day} imefungwa tayari.`, code:'23505' } };
      const SIGN = { deposit:[1,-1], withdraw:[-1,1], float_buy:[-1,1], float_sell:[1,-1],
                     cash_in:[1,0], cash_out:[-1,0] };
      const dayTx = DB.wakala_tx.filter(t => t.business_id===biz && String(t.tx_date)===String(day));
      const prevDay = (f) => DB.wakala_days.filter(d => d.business_id===biz && String(d.day)<String(day))
        .sort((a,b)=>String(b.day).localeCompare(String(a.day))).map(f)[0];

      let vfloat = 0; const lines = {};
      DB.wakala_lines.filter(l => l.business_id===biz && l.active!==false).forEach(l => {
        const prev = DB.wakala_days.filter(d => d.business_id===biz && String(d.day)<String(day) && d.lines && d.lines[l.id])
          .sort((a,b)=>String(b.day).localeCompare(String(a.day)))[0];
        const opening = prev ? +prev.lines[l.id].counted : (+l.opening_float||0);
        const expected = dayTx.filter(t => t.line_id===l.id)
          .reduce((a,t)=> a + (t.reverses?-1:1)*(SIGN[t.type]?SIGN[t.type][1]:0)*(+t.amount||0), opening);
        const counted = (args.p_counted && args.p_counted[l.id] != null) ? +args.p_counted[l.id] : expected;
        vfloat += counted - expected;
        lines[l.id] = { opening, expected, counted, variance: counted - expected };
      });

      const cfg = DB.wakala_settings.find(x => x.business_id===biz);
      const openCash = prevDay(d=>+d.counted_cash) ?? (+(cfg?.cash_opening)||0);
      const expCash = dayTx.reduce((a,t)=> a + (t.reverses?-1:1)*(SIGN[t.type]?SIGN[t.type][0]:0)*(+t.amount||0), openCash);
      const comm = dayTx.reduce((a,t)=> a + (t.reverses?-1:1)*(['deposit','withdraw'].includes(t.type)?(+t.commission||0):0), 0);
      const row = { id: uuid(), business_id:biz, day, lines, counted_cash:+args.p_counted_cash||0,
                    expected_cash:expCash, variance_cash:(+args.p_counted_cash||0)-expCash,
                    variance_float:vfloat, commission:comm, tx_count:dayTx.length,
                    note:args.p_note||null, closed_by:CFG.uid, closed_at:new Date().toISOString() };
      DB.wakala_days.push(row);
      return { data: row, error:null };
    }
    if (name === 'dl_order_update'){
      const o = DB.orders.find(x => x.id === args.p_id);
      if (!o) return { data:false, error:null };
      Object.assign(o, args.p_patch);
      return { data:true, error:null };
    }
    return { data:null, error:null };
  },
  auth: {
    getSession: async () => {
      const u = DB.users.find(x => x.id === CFG.uid);
      return { data:{ session: CFG.uid ? { access_token:'tok-'+CFG.uid,
        user:{ id:CFG.uid, email:u?.email||'x@x.com', user_metadata:{} } } : null } };
    },
    getUser: async () => {
      const u = DB.users.find(x => x.id === CFG.uid);
      return { data:{ user: CFG.uid ? { id:CFG.uid, email:u?.email||'x@x.com' } : null } };
    },
    onAuthStateChange: () => ({ data:{ subscription:{ unsubscribe(){} } } }),
    signOut: async () => ({ error:null }),
    signInWithPassword: async () => ({ data:{}, error:null }),
  },
  channel: () => ({ on(){ return this }, subscribe(){ return this } }),
  removeChannel: () => {},
  storage: { from: () => ({ upload: async()=>({error:null}), getPublicUrl: ()=>({data:{publicUrl:''}}) }) },
};
export const supabaseSignup = supabase;
export const __db = DB;
export const __cfg = CFG;
