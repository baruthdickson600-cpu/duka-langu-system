// Supabase ya bandia inayofanya kama PostgREST ya kweli:
//  - inakataa safu zisizopo kwenye schema (PGRST204)
//  - inakataa RPC zisizopo
//  - inaweza kuwasha RLS (muuzaji hasomi products/sales)
//  - ina unique index kwenye (business_id, offline_id)
const DB = { businesses:[], users:[], products:[], sales:[], orders:[], returns:[],
             stock_history:[], customers:[], expenses:[], credit_transactions:[] };

const CFG = {
  schema: {
    businesses:['id','name','owner_id','plan','token_active'],
    users:['id','business_id','role','name','email','branch_id','is_active'],
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
  },
  rpcs: new Set(),        // tupu = SQL haijaendeshwa
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
    return DB[table] || (DB[table] = []);
  };
  const filters = []; let _order = null, _limit = null, _single = false, _count = null;
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
        const saved = { id: r.id || uuid(), created_at: r.created_at || new Date().toISOString(), ...r };
        rows().push(saved); out.push(saved);
      }
      return { data: out, error: null, status: 201 };
    }

    let res = rows().filter(r => filters.every(f => String(r[f.col]) === String(f.val)));

    // RLS: muuzaji hasomi products/sales moja kwa moja
    if (CFG.rls && CFG.role === 'employee' && ['products','sales','orders'].includes(table))
      res = [];

    if (op === 'update'){
      const bad = checkCols(table, payload);
      if (bad) return err(bad, 'PGRST204');
      if (CFG.rls && CFG.role === 'employee' && ['products','sales','orders'].includes(table))
        return { data: [], error: null, status: 200, count: _count ? 0 : undefined };
      res.forEach(r => Object.assign(r, payload));
      return { data: res, error: null, status: 200, count: _count ? res.length : undefined };
    }
    if (op === 'delete'){
      DB[table] = rows().filter(r => !res.includes(r));
      return { data: res, error: null, status: 200 };
    }
    if (_order) res = [...res].sort((a,b) =>
      _order.asc ? String(a[_order.col]||'').localeCompare(String(b[_order.col]||''))
                 : String(b[_order.col]||'').localeCompare(String(a[_order.col]||'')));
    if (_limit) res = res.slice(0, _limit);
    if (_single) return { data: res[0] || null, error: res.length ? null : { message:'no rows' }, status:200 };
    return { data: res, error: null, status: 200 };
  };

  const b = {
    insert(v){ op='insert'; payload=v; return b },
    update(v,o){ op='update'; payload=v; _count=o&&o.count?o.count:null; return b },
    delete(){ op='delete'; return b },
    select(){ if(!op) op='select'; return b },
    eq(col,val){ filters.push({col,val}); return b },
    order(col,o){ _order={col,asc:o?.ascending!==false}; return b },
    limit(n){ _limit=n; return b },
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
