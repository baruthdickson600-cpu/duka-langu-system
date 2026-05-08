import React,{createContext,useContext,useState,useCallback,useEffect,useMemo} from 'react';
import {supabase} from '../config/supabase';

const Ctx=createContext(null);
const genId=()=>crypto.randomUUID?.()||Math.random().toString(36).substr(2,12)+Math.random().toString(36).substr(2,12);
const nowISO=()=>new Date().toISOString();
const todayStr=()=>new Date().toISOString().split('T')[0];
const ADMIN_EMAIL='baruthdickson600@gmail.com';
const ADMIN_PASS='baruth@500';

async function safeInsert(t,d){try{const r=await supabase.from(t).insert(d).select();if(r.error){console.warn('Insert:',t,r.error.message);return null}return r?.data?.[0]||null}catch(e){console.warn('DB:',e);return null}}
async function safeUpdate(t,d,c,v){try{const r=await supabase.from(t).update(d).eq(c,v);if(r.error)console.warn('Update:',t,r.error.message)}catch(e){console.warn('DB:',e)}}
async function safeDelete(t,c,v){try{const r=await supabase.from(t).delete().eq(c,v);if(r.error)console.warn('Delete:',t,r.error.message)}catch(e){console.warn('DB:',e)}}
async function safeUpsert(t,d,c){try{const r=await supabase.from(t).upsert(d,{onConflict:c});if(r.error)console.warn('Upsert:',t,r.error.message)}catch(e){console.warn('DB:',e)}}
async function safeSelect(t,q={}){try{let s=supabase.from(t).select('*');if(q.eq)for(const[k,v]of Object.entries(q.eq))s=s.eq(k,v);if(q.order)s=s.order(q.order.col,{ascending:q.order.asc??false});if(q.limit)s=s.limit(q.limit);const r=await s;if(r.error){console.warn('Select:',t,r.error.message);return[]}return r.data||[]}catch(e){console.warn('DB:',t,e);return[]}}


// Email helper (calls API directly - no imports needed)
const sendMail=(to,subject,type,data)=>{
  console.log('[EMAIL] Sending:',type,'to:',to);
  fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,subject,type,data})})
  .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok){console.error('[EMAIL FAIL]',to,d.error||r.status)}else{console.log('[EMAIL OK]',to,d.id)}})
  .catch(e=>console.error('[EMAIL NET ERROR]',to,e.message));
};
const sendSMS=(to,message)=>{
  if(!to)return;
  console.log('[SMS] Sending to:',to);
  fetch('/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,message})})
  .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok){console.error('[SMS FAIL]',to,d.error||d.beem_response)}else{console.log('[SMS OK]',to)}})
  .catch(e=>console.error('[SMS NET ERROR]',to,e.message));
};

export function AppProvider({children}){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(false);
  const[online,setOnline]=useState(navigator.onLine);
  const[lang,setLang]=useState('sw');
  const[currency,setCurrency]=useState('TZS');
  const[businesses,setBiz]=useState([]);
  const[branches,setBranches]=useState([]);
  const[activeBranch,setActiveBranch]=useState(null);
  const[products,setProds]=useState([]);
  const[sales,setSales]=useState([]);
  const[expenses,setExp]=useState([]);
  const[customers,setCust]=useState([]);
  const[employees,setEmps]=useState([]);
  const[tokens,setTokens]=useState([]);
  const[promoCodes,setPromos]=useState([]);
  const[notifications,setNotifs]=useState([]);
  const[stockHistory,setSH]=useState([]);
  const[loginLogs,setLogs]=useState([]);
  const[settings,setSettings]=useState({system_price:'15000',trial_days:'5',payment_number:'25187616',payment_name:'DUKALANGU',payment_provider:'HALOPESA',sms_enabled:'false',maintenance_mode:'false',branch_enabled:'true',announcement:'',announcement_type:'info'});
  const[popups,setPopups]=useState([]);
  const[systemLogs,setSysLogs]=useState([]);
  const[tickets,setTickets]=useState([]);
  const[returns,setReturns]=useState([]);
  const[paymentRequests,setPayReqs]=useState([]);
  const[partners,setPartners]=useState([]);
  const[campaigns,setCampaigns]=useState([]);
  const[internalMsgs,setMsgs]=useState([]);
  const[followups,setFollowups]=useState([]);
  const[testimonials,setTestimonials]=useState([]);
  const[systemExpenses,setSystemExpenses]=useState([]);

  const biz=user?.role==='office'?businesses.find(b=>b.owner_id===user.id)||businesses.find(b=>b.id===user.business_id):user?.role==='employee'?businesses.find(b=>b.id===user.business_id):null;
  const bizId=biz?.id||user?.business_id;

  useEffect(()=>{const on=()=>setOnline(true);const off=()=>setOnline(false);window.addEventListener('online',on);window.addEventListener('offline',off);return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[]);

  // ===== LOAD DATA =====
  const loadData=useCallback(async(uid,role,bid)=>{
    try{
      const sData=await safeSelect('system_settings');
      if(sData.length){const s={};sData.forEach(r=>{s[r.key]=r.value});setSettings(prev=>({...prev,...s}))}
      const bData=await safeSelect('businesses',{order:{col:'created_at'}});if(bData.length)setBiz(bData);
      const tData=await safeSelect('tokens',{order:{col:'created_at'}});if(tData.length)setTokens(tData);
      const pData=await safeSelect('promo_codes');if(pData.length)setPromos(pData);
      const nData=await safeSelect('notifications',{order:{col:'created_at'},limit:100});if(nData.length)setNotifs(nData);
      const ll=await safeSelect('login_logs',{order:{col:'created_at'},limit:200});if(ll.length)setLogs(ll);
      if(role!=='admin'&&bid){
        const[pr,sl,ex,cu,em,sh,br,tk,rt,cr]=await Promise.all([
          safeSelect('products',{eq:{business_id:bid}}),safeSelect('sales',{eq:{business_id:bid},order:{col:'created_at'}}),
          safeSelect('expenses',{eq:{business_id:bid},order:{col:'created_at'}}),safeSelect('customers',{eq:{business_id:bid}}),
          safeSelect('users',{eq:{business_id:bid,role:'employee'}}),safeSelect('stock_history',{eq:{business_id:bid},order:{col:'created_at'},limit:200}),
          safeSelect('branches',{eq:{business_id:bid}}),safeSelect('support_tickets',{eq:{business_id:bid},order:{col:'created_at'}}),
          safeSelect('returns',{eq:{business_id:bid},order:{col:'created_at'}}),
          safeSelect('credit_transactions',{eq:{business_id:bid},order:{col:'created_at'}}),
        ]);
        setProds(pr);setSales(sl);setExp(ex);setCust(cu);setEmps(em);setSH(sh);setBranches(br);setTickets(tk);setReturns(rt);setCreditHist(cr);
        // Load payment requests for this business
        const pyReqs=await safeSelect('payment_requests',{eq:{business_id:bid},order:{col:'created_at'}});
        setPayReqs(pyReqs);
      }
      if(role==='admin'){
        const sl=await safeSelect('system_logs',{order:{col:'created_at'},limit:200});setSysLogs(sl);
        const tk=await safeSelect('support_tickets',{order:{col:'created_at'},limit:200});setTickets(tk);
        const pyAll=await safeSelect('payment_requests',{order:{col:'created_at'}});setPayReqs(pyAll);
        const pt=await safeSelect('marketing_partners');setPartners(pt);
        const cp=await safeSelect('campaigns',{order:{col:'created_at'}});setCampaigns(cp);
        const ms=await safeSelect('internal_messages',{order:{col:'created_at'}});setMsgs(ms);
        const fl=await safeSelect('followups',{order:{col:'created_at'}});setFollowups(fl);
        const ts=await safeSelect('testimonials',{order:{col:'created_at'}});setTestimonials(ts);
        const se=await safeSelect('system_expenses',{order:{col:'created_at'}});setSystemExpenses(se);
      }
      if(role==='marketing'){
        const pyAll=await safeSelect('payment_requests',{order:{col:'created_at'}});setPayReqs(pyAll);
        const cp=await safeSelect('campaigns',{order:{col:'created_at'}});setCampaigns(cp);
        const ms=await safeSelect('internal_messages',{order:{col:'created_at'}});setMsgs(ms);
        const fl=await safeSelect('followups',{order:{col:'created_at'}});setFollowups(fl);
        const ts=await safeSelect('testimonials',{order:{col:'created_at'}});setTestimonials(ts);
      }
      if(role==='agent'){
        // Agent: load businesses (for seeing their registered customers)
        // promo_code info loaded after login
        const pt=await safeSelect('marketing_partners');setPartners(pt);
      }
      if(role==='accountant'){
        // Accountant loads SAME data as admin (read-only)
        console.log('[ACCOUNTANT] Loading all financial data...');
        // Try loading payment_requests
        let pyAll=await safeSelect('payment_requests',{order:{col:'created_at'}});
        if(!pyAll.length){
          // Fallback: direct query without ordering
          const{data:pyDirect}=await supabase.from('payment_requests').select('*');
          pyAll=pyDirect||[];
          console.log('[ACCOUNTANT] Fallback payment_requests:',pyAll.length);
        }
        setPayReqs(pyAll);
        console.log('[ACCOUNTANT] payment_requests:',pyAll.length);
        
        const pt=await safeSelect('marketing_partners');setPartners(pt);
        
        // Try system_expenses (table might not exist yet)
        let se=[];
        try{const{data:seData}=await supabase.from('system_expenses').select('*');se=seData||[]}catch(e){console.log('[ACCOUNTANT] system_expenses table not found - OK')}
        setSystemExpenses(se);
        
        console.log('[ACCOUNTANT] Loaded: Biz=',bData.length,' Tokens=',tData.length,' Payments=',pyAll.length,' Expenses=',se.length,' Partners=',pt.length);
      }
    }catch(e){console.error('Load:',e)}
  },[]);

  // ===== OTP STATE =====
  const[otpPending,setOtpPending]=useState(null); // {user, role, bizId, phone}
  const[otpSending,setOtpSending]=useState(false);
  const OTP_ROLES=['admin','marketing','agent','office','accountant']; // roles that need OTP

  // Send OTP via SMS (preferred) or Email (fallback)
  const sendOTP=useCallback(async(email,isAdmin=false,phone='')=>{
    setOtpSending(true);
    try{
      const r=await fetch('/api/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',email,isAdmin,phone})});
      const d=await r.json();
      setOtpSending(false);
      return d;
    }catch(e){setOtpSending(false);return{success:false,error:e.message}}
  },[]);

  // Verify OTP and complete login
  const verifyOTP=useCallback(async(code)=>{
    if(!otpPending)return{success:false,error:'Hakuna OTP inayosubiri'};
    try{
      const r=await fetch('/api/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',code,email:otpPending.email})});
      const d=await r.json();
      if(!d.success)return d;
      // OTP verified — complete login
      const u=otpPending.userData;
      setUser(u);
      await safeUpdate('users',{last_login:nowISO()},'id',u.id);
      safeInsert('login_logs',{user_id:u.id,email:u.email,action:'login_otp',device_info:navigator.userAgent}).catch(()=>{});
      await loadData(u.id,u.role,u.business_id);
      if(u.role==='employee'&&u.branch_id){setActiveBranch(u.branch_id)}
      if(u.role==='agent'){
        const{data:promoData}=await supabase.from('promo_codes').select('*').eq('agent_email',u.email).single();
        if(promoData){setUser(prev=>({...prev,promo_code:promoData.code,promo_id:promoData.id,commission_rate:promoData.commission_rate||10}))}
      }
      setOtpPending(null);
      return{success:true};
    }catch(e){return{success:false,error:e.message}}
  },[otpPending,loadData]);

  const cancelOTP=useCallback(()=>{setOtpPending(null)},[]);

  // ===== AUTH =====
  const login=useCallback(async(email,password)=>{
    setLoading(true);
    // ADMIN hardcoded login
    if(email===ADMIN_EMAIL&&password===ADMIN_PASS){
      const u={id:'00000000-0000-0000-0000-000000000001',email,name:'PesaFly Admin',role:'admin'};
      setOtpPending({userData:u,email,role:'admin',isAdmin:true});
      const otpResult=await sendOTP(email,true); // isAdmin=true → SMS
      setLoading(false);
      if(!otpResult.success)return'OTP haikutumwa: '+(otpResult.error||'Jaribu tena');
      return'OTP_REQUIRED';
    }
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error){setLoading(false);return error.message}
      const{data:uData}=await supabase.from('users').select('*').eq('email',email).single();
      if(uData){
        if(!uData.is_active){setLoading(false);return'Akaunti yako imesimamishwa.'}
        const ub=uData.business_id?(await supabase.from('businesses').select('*').eq('id',uData.business_id).single()):null;
        if(ub?.data?.is_suspended){setLoading(false);return'Biashara yako imesimamishwa. Wasiliana na admin.'}

        // Check if role needs OTP
        if(OTP_ROLES.includes(uData.role)){
          setOtpPending({userData:uData,email,role:uData.role,phone:uData.phone});
          const otpResult=await sendOTP(email,false,uData.phone||'');
          setLoading(false);
          if(!otpResult.success)return'OTP haikutumwa: '+(otpResult.error||'Jaribu tena');
          return'OTP_REQUIRED';
        }

        // No OTP needed (employee or no phone) — login directly
        setUser(uData);await safeUpdate('users',{last_login:nowISO()},'id',uData.id);
        safeInsert('login_logs',{user_id:uData.id,email,action:'login',device_info:navigator.userAgent}).catch(()=>{});
        await loadData(uData.id,uData.role,uData.business_id);
        if(uData.role==='employee'&&uData.branch_id){setActiveBranch(uData.branch_id)}
        if(uData.role==='agent'){
          const{data:promoData}=await supabase.from('promo_codes').select('*').eq('agent_email',email).single();
          if(promoData){setUser(prev=>({...prev,promo_code:promoData.code,promo_id:promoData.id,commission_rate:promoData.commission_rate||10}))}
        }
      }else{setUser({id:data.user.id,email,name:email.split('@')[0],role:'office'})}
      setLoading(false);return null;
    }catch(e){setLoading(false);return'Hakuna mtandao.'}
  },[loadData]);

  const signup=useCallback(async(name,email,password,businessName,phone,promoCode)=>{
    setLoading(true);
    try{
      const{data:authData,error:authErr}=await supabase.auth.signUp({email,password});
      if(authErr){setLoading(false);return authErr.message}
      const uid=authData.user?.id||genId();
      const trialEnd=new Date(Date.now()+parseInt(settings.trial_days||5)*86400000).toISOString();
      await safeInsert('users',{id:uid,email,name,phone,role:'office'});
      const newBiz=await safeInsert('businesses',{name:businessName,email,phone,owner_id:uid,trial_end:trialEnd,promo_code:promoCode||null});
      if(newBiz){
        await safeUpdate('users',{business_id:newBiz.id},'id',uid);
        await safeInsert('notifications',{target_type:'admin',type:'info',title:`🏪 Duka Jipya: ${businessName}`,message:`${name} (${email}) amesajili.`});
        setBiz(prev=>[newBiz,...prev]);setUser({id:uid,email,name,phone,role:'office',business_id:newBiz.id});
        await loadData(uid,'office',newBiz.id);
        // Welcome email to new user
        sendMail(email,'🎉 Karibu kwenye Duka Langu!','welcome',{name,businessName});
        // Notify admin via email
        sendMail(ADMIN_EMAIL,'🆕 Mteja Mpya: '+businessName,'new_customer',{name:businessName,email,phone});
        // Notify ALL marketing partners
        supabase.from('marketing_partners').select('email').then(({data:pts})=>{
          (pts||[]).forEach(p=>{if(p.email)sendMail(p.email,'🆕 Mteja Mpya: '+businessName,'new_customer',{name:businessName,email,phone})});
        }).catch(()=>{});
      }
      setLoading(false);return null;
    }catch(e){setLoading(false);return e.message||'Tatizo.'}
  },[settings.trial_days,loadData]);

  // FORGOT PASSWORD
  const forgotPassword=useCallback(async(email)=>{
    try{const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
      if(error)return error.message;return null;
    }catch(e){return'Hakuna mtandao.'}
  },[]);

  const logout=useCallback(async()=>{
    if(user)await safeInsert('login_logs',{user_id:user.id,email:user.email,action:'logout'});
    try{await supabase.auth.signOut()}catch(e){}
    setUser(null);setProds([]);setSales([]);setExp([]);setCust([]);setEmps([]);setPopups([]);setTickets([]);setReturns([]);setBranches([]);setActiveBranch(null);
  },[user]);

  // ===== PRODUCTS =====
  const addProduct=useCallback(async(p)=>{if(!bizId)return;const d=await safeInsert('products',{...p,business_id:bizId,branch_id:activeBranch||null});setProds(prev=>[...prev,d||{...p,id:genId(),business_id:bizId,branch_id:activeBranch,created_at:nowISO()}])},[bizId,activeBranch]);
  const updateProduct=useCallback(async(pid,u)=>{await safeUpdate('products',{...u,updated_at:nowISO()},'id',pid);setProds(prev=>prev.map(p=>p.id===pid?{...p,...u}:p))},[]);
  const deleteProduct=useCallback(async(pid)=>{await safeDelete('products','id',pid);setProds(prev=>prev.filter(p=>p.id!==pid))},[]);

  // ===== SALES =====
  const completeSale=useCallback(async(cart,discount=0,payMethod='cash',payDetails=null,custId=null,custName='')=>{
    if(!bizId||!cart.length)return null;
    // Calculate subtotal with fractions (e.g., ½ kg of TZS 10,000 sugar = TZS 5,000)
    const subtotal=cart.reduce((s,c)=>s+c.qty*c.price*(c.fraction||1),0);
    const total=Math.max(0,subtotal-discount);
    // Profit also accounts for fractions
    const profit=cart.reduce((s,c)=>s+c.qty*(c.price-c.buyPrice)*(c.fraction||1),0)-discount;
    const sd={business_id:bizId,branch_id:activeBranch||null,seller_id:user?.id,seller_name:user?.name,items:cart,subtotal,discount,total,profit,payment_method:payMethod,payment_details:payDetails,customer_id:custId,customer_name:custName,is_synced:online};
    const saved=await safeInsert('sales',sd);const final=saved||{...sd,id:genId(),created_at:nowISO()};
    setSales(prev=>[final,...prev]);
    for(const item of cart){
      const prod=products.find(p=>p.id===item.productId);
      if(prod){
        // Stock deduction: fraction*qty (e.g., ½ × 1 = 0.5 kg out of stock)
        const stockOut=item.qty*(item.fraction||1);
        const nq=Math.max(0,prod.quantity-stockOut);
        await safeUpdate('products',{quantity:nq},'id',item.productId);
        await safeInsert('stock_history',{product_id:item.productId,business_id:bizId,change_type:'sale',quantity_before:prod.quantity,quantity_change:-stockOut,quantity_after:nq,user_id:user?.id});
        setProds(prev=>prev.map(p=>p.id===item.productId?{...p,quantity:nq}:p));
      }
    }
    return final;
  },[bizId,activeBranch,user,online,products]);

  // ===== RETURN/REFUND =====
  const processReturn=useCallback(async(saleId,items,reason)=>{
    if(!bizId)return null;
    const sale=sales.find(s=>s.id===saleId);if(!sale)return null;
    const refundTotal=items.reduce((s,i)=>s+i.qty*i.price,0);
    const ret={business_id:bizId,sale_id:saleId,items,reason,refund_amount:refundTotal,processed_by:user?.id,status:'completed'};
    const saved=await safeInsert('returns',ret);
    const final=saved||{...ret,id:genId(),created_at:nowISO()};
    setReturns(prev=>[final,...prev]);
    // Restore stock
    for(const item of items){
      const prod=products.find(p=>p.id===item.productId);
      if(prod){const nq=prod.quantity+item.qty;await safeUpdate('products',{quantity:nq},'id',item.productId);
        await safeInsert('stock_history',{product_id:item.productId,business_id:bizId,change_type:'return',quantity_before:prod.quantity,quantity_change:item.qty,quantity_after:nq,user_id:user?.id,note:`Return from sale #${saleId?.slice(0,8)}`});
        setProds(prev=>prev.map(p=>p.id===item.productId?{...p,quantity:nq}:p));
      }
    }
    return final;
  },[bizId,user,products,sales]);

  // ===== EXPENSES =====
  const addExpense=useCallback(async(exp)=>{if(!bizId)return;const d=await safeInsert('expenses',{...exp,business_id:bizId,branch_id:activeBranch||null,recorded_by:user?.id});setExp(prev=>[d||{...exp,id:genId(),business_id:bizId,created_at:nowISO()},...prev])},[bizId,activeBranch,user]);

  // ===== CUSTOMERS =====
  const addCustomer=useCallback(async(c)=>{if(!bizId)return null;const d=await safeInsert('customers',{...c,business_id:bizId,credit_balance:0,total_spent:0});const f=d||{...c,id:genId(),business_id:bizId,credit_balance:0,total_spent:0,created_at:nowISO()};setCust(prev=>[...prev,f]);return f},[bizId]);
  const updateCustomer=useCallback(async(cid,u)=>{await safeUpdate('customers',u,'id',cid);setCust(prev=>prev.map(c=>c.id===cid?{...c,...u}:c))},[]);
  const deleteCustomer=useCallback(async(cid)=>{await safeDelete('customers','id',cid);setCust(prev=>prev.filter(c=>c.id!==cid))},[]);

  // ===== CREDIT / DEBT MANAGEMENT (ADVANCED) =====
  const[creditHistory,setCreditHist]=useState([]);
  
  // Uza kwa deni (credit sale) - with due date
  const creditSale=useCallback(async(cart,custId,discount=0,dueDate=null)=>{
    if(!bizId||!cart.length||!custId)return null;
    const subtotal=cart.reduce((s,c)=>s+c.qty*c.price,0);const total=Math.max(0,subtotal-discount);
    const profit=cart.reduce((s,c)=>s+c.qty*(c.price-c.buyPrice),0)-discount;
    const cust=customers.find(c=>c.id===custId);
    // Check credit limit
    if(cust?.credit_limit&&(cust.credit_balance||0)+total>cust.credit_limit){
      return{error:`Deni litazidi kikomo cha TZS ${(cust.credit_limit||0).toLocaleString()}! Sasa: TZS ${(cust.credit_balance||0).toLocaleString()}, Mpya: TZS ${total.toLocaleString()}`};
    }
    const sd={business_id:bizId,branch_id:activeBranch||null,seller_id:user?.id,seller_name:user?.name,items:cart,subtotal,discount,total,profit,payment_method:'credit',customer_id:custId,customer_name:cust?.name,is_synced:online};
    const saved=await safeInsert('sales',sd);const final=saved||{...sd,id:genId(),created_at:nowISO()};
    setSales(prev=>[final,...prev]);
    for(const item of cart){
      const prod=products.find(p=>p.id===item.productId);
      if(prod){const nq=Math.max(0,prod.quantity-item.qty);await safeUpdate('products',{quantity:nq},'id',item.productId);setProds(prev=>prev.map(p=>p.id===item.productId?{...p,quantity:nq}:p))}
    }
    const newBal=(cust?.credit_balance||0)+total;
    const newSpent=(cust?.total_spent||0)+total;
    await safeUpdate('customers',{credit_balance:newBal,total_spent:newSpent,last_credit_date:nowISO()},'id',custId);
    setCust(prev=>prev.map(c=>c.id===custId?{...c,credit_balance:newBal,total_spent:newSpent,last_credit_date:nowISO()}:c));
    // Record credit transaction with due date
    const defaultDue=new Date(Date.now()+30*86400000).toISOString().split('T')[0]; // 30 days default
    const tx={customer_id:custId,business_id:bizId,sale_id:final.id,amount:total,type:'credit',due_date:dueDate||defaultDue,note:`Deni - ${cart.map(i=>i.name).join(', ')}`,status:'unpaid'};
    const txSaved=await safeInsert('credit_transactions',tx);
    setCreditHist(prev=>[txSaved||{...tx,id:genId(),created_at:nowISO()},...prev]);
    return final;
  },[bizId,activeBranch,user,online,products,customers]);

  // Pokea malipo ya deni - with payment method tracking
  const receivePayment=useCallback(async(custId,amount,note='',payMethod='cash')=>{
    if(!bizId||!custId||!amount)return null;
    const cust=customers.find(c=>c.id===custId);if(!cust)return null;
    const newBal=Math.max(0,(cust.credit_balance||0)-amount);
    await safeUpdate('customers',{credit_balance:newBal,last_payment_date:nowISO()},'id',custId);
    setCust(prev=>prev.map(c=>c.id===custId?{...c,credit_balance:newBal,last_payment_date:nowISO()}:c));
    const tx={customer_id:custId,business_id:bizId,amount,type:'payment',payment_method:payMethod,note:note||`Malipo - ${payMethod} - TZS ${amount.toLocaleString()}`,status:'completed'};
    const txSaved=await safeInsert('credit_transactions',tx);
    setCreditHist(prev=>[txSaved||{...tx,id:genId(),created_at:nowISO()},...prev]);
    // Mark oldest unpaid credits as paid
    const unpaid=creditHistory.filter(t=>t.customer_id===custId&&t.type==='credit'&&t.status==='unpaid').sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    let remaining=amount;
    for(const u of unpaid){
      if(remaining<=0)break;
      if(remaining>=u.amount){
        await safeUpdate('credit_transactions',{status:'paid',paid_at:nowISO()},'id',u.id);
        setCreditHist(prev=>prev.map(t=>t.id===u.id?{...t,status:'paid',paid_at:nowISO()}:t));
        remaining-=u.amount;
      }else{
        // Partial payment - update remaining
        await safeUpdate('credit_transactions',{status:'partial',paid_amount:u.amount-remaining},'id',u.id);
        setCreditHist(prev=>prev.map(t=>t.id===u.id?{...t,status:'partial'}:t));
        remaining=0;
      }
    }
    return{newBalance:newBal};
  },[bizId,customers,creditHistory]);

  // Auto-notify on payment received
  const receivePaymentWithAlert=useCallback(async(custId,amount,note='',payMethod='cash')=>{
    const result=await receivePayment(custId,amount,note,payMethod);
    if(result){
      const cust=customers.find(c=>c.id===custId);
      setPopups(prev=>[{id:genId(),type:'success',title:'💰 Malipo Yamepokewa!',message:`${cust?.name} amelipa TZS ${amount.toLocaleString()}. Deni baki: TZS ${result.newBalance.toLocaleString()}`},...prev]);
      // Email to owner
      if(biz?.email){
        sendMail(biz.email,'💰 Malipo Yamepokewa','payment_received',{customerName:cust?.name,amount,remaining:result.newBalance,method:payMethod,note});
      }
    }
    return result;
  },[receivePayment,customers,biz]);

  // Set credit limit for customer
  const setCreditLimit=useCallback(async(custId,limit)=>{
    await safeUpdate('customers',{credit_limit:+limit},'id',custId);
    setCust(prev=>prev.map(c=>c.id===custId?{...c,credit_limit:+limit}:c));
  },[]);

  // Total debt + overdue calculations
  const totalDebt=useMemo(()=>customers.reduce((a,c)=>a+(c.credit_balance||0),0),[customers]);
  const overdueDebts=useMemo(()=>{
    const today=new Date();
    return creditHistory.filter(t=>{
      if(t.type!=='credit'||t.status==='paid')return false;
      if(!t.due_date)return false;
      return new Date(t.due_date)<today;
    });
  },[creditHistory]);
  const overdueCustomers=useMemo(()=>{
    const custIds=new Set(overdueDebts.map(d=>d.customer_id));
    return customers.filter(c=>custIds.has(c.id));
  },[overdueDebts,customers]);
  const overdueTotal=useMemo(()=>overdueDebts.reduce((a,d)=>a+(d.amount||0),0),[overdueDebts]);

  // Debt aging analysis
  const debtAging=useMemo(()=>{
    const today=Date.now();
    const aging={current:0,days30:0,days60:0,days90:0,over90:0};
    creditHistory.filter(t=>t.type==='credit'&&t.status!=='paid').forEach(t=>{
      const days=Math.floor((today-new Date(t.created_at).getTime())/86400000);
      if(days<=30)aging.current+=t.amount||0;
      else if(days<=60)aging.days30+=t.amount||0;
      else if(days<=90)aging.days60+=t.amount||0;
      else aging.over90+=t.amount||0;
    });
    return aging;
  },[creditHistory]);

  // ===== EMPLOYEES =====
  const addEmployee=useCallback(async(emp)=>{
    if(!bizId)return;
    try{
      const{data:auth}=await supabase.auth.signUp({email:emp.email,password:emp.password||'1234'});
      const uid=auth?.user?.id||genId();
      const d=await safeInsert('users',{id:uid,email:emp.email,name:emp.name,phone:emp.phone,role:'employee',business_id:bizId,branch_id:emp.branch_id||null});
      setEmps(prev=>[...prev,d||{id:uid,email:emp.email,name:emp.name,phone:emp.phone,role:'employee',business_id:bizId,branch_id:emp.branch_id||null,created_at:nowISO()}]);
    }catch(e){
      setEmps(prev=>[...prev,{...emp,id:genId(),role:'employee',business_id:bizId,branch_id:emp.branch_id||null,created_at:nowISO()}]);
    }
  },[bizId]);
  const updateEmployee=useCallback(async(eid,updates)=>{
    await safeUpdate('users',updates,'id',eid);
    setEmps(prev=>prev.map(e=>e.id===eid?{...e,...updates}:e));
  },[]);
  const deleteEmployee=useCallback(async(eid)=>{await safeUpdate('users',{is_active:false},'id',eid);setEmps(prev=>prev.filter(e=>e.id!==eid))},[]);

  // ===== BRANCHES =====
  const addBranch=useCallback(async(name,location)=>{if(!bizId)return null;const d=await safeInsert('branches',{business_id:bizId,name,location});const f=d||{id:genId(),business_id:bizId,name,location,is_active:true,created_at:nowISO()};setBranches(prev=>[...prev,f]);return f},[bizId]);
  const updateBranch=useCallback(async(bid,u)=>{await safeUpdate('branches',u,'id',bid);setBranches(prev=>prev.map(b=>b.id===bid?{...b,...u}:b))},[]);
  const deleteBranch=useCallback(async(bid)=>{await safeDelete('branches','id',bid);setBranches(prev=>prev.filter(b=>b.id!==bid));if(activeBranch===bid)setActiveBranch(null)},[activeBranch]);
  const getBranches=useCallback(()=>bizId?branches.filter(b=>b.business_id===bizId):[],[bizId,branches]);
  const branchProducts=useMemo(()=>activeBranch?products.filter(p=>p.branch_id===activeBranch):products,[products,activeBranch]);
  const branchSales=useMemo(()=>activeBranch?sales.filter(s=>s.branch_id===activeBranch):sales,[sales,activeBranch]);
  const branchExpenses=useMemo(()=>activeBranch?expenses.filter(e=>e.branch_id===activeBranch):expenses,[expenses,activeBranch]);

  // BRANCH LOCK: Determines if current business can use multi-branch
  const canUseBranches=useMemo(()=>{
    if(user?.role==='admin')return true;
    if(!bizId)return false;
    // Global switch off = no one can use
    if(settings.branch_enabled==='false')return false;
    // Per-business override from businesses table
    if(biz?.branch_enabled===true||biz?.branch_enabled==='true')return true;
    // Per-business override from settings (admin toggle)
    const bizSetting=settings[`branch_biz_${bizId}`];
    if(bizSetting==='true')return true;
    // Plan-based: premium and enterprise = yes, basic and trial = no
    if(biz?.plan==='premium'||biz?.plan==='enterprise')return true;
    return false;
  },[user,settings,biz,bizId]);

  // Is employee locked to a branch?
  const isEmployeeLocked=useMemo(()=>user?.role==='employee'&&user?.branch_id,[user]);
  // Max branches for this plan
  const maxBranches=useMemo(()=>{
    if(biz?.plan==='enterprise')return 999;
    if(biz?.plan==='premium')return 10;
    return 1;
  },[biz]);

  // ===== SUPPORT TICKETS =====
  const createTicket=useCallback(async(subject,message,priority='normal')=>{
    const tk={business_id:bizId,user_id:user?.id,user_email:user?.email,business_name:biz?.name,subject,message,priority,status:'open'};
    const d=await safeInsert('support_tickets',tk);const f=d||{...tk,id:genId(),created_at:nowISO()};
    setTickets(prev=>[f,...prev]);
    await safeInsert('notifications',{target_type:'admin',type:'warning',title:`🎫 Ticket: ${subject}`,message:`${biz?.name||user?.email}: ${message.slice(0,100)}`});
    return f;
  },[bizId,user,biz]);
  const replyTicket=useCallback(async(tid,reply,status)=>{
    await safeUpdate('support_tickets',{reply,status:status||'replied',replied_at:nowISO(),replied_by:user?.id},'id',tid);
    setTickets(prev=>prev.map(t=>t.id===tid?{...t,reply,status:status||'replied',replied_at:nowISO()}:t));
  },[user]);
  const closeTicket=useCallback(async(tid)=>{await safeUpdate('support_tickets',{status:'closed'},'id',tid);setTickets(prev=>prev.map(t=>t.id===tid?{...t,status:'closed'}:t))},[]);

  // ===== TOKENS =====
  const genToken=useCallback(async(days,plan='basic',assignTo='',assignName='')=>{
    const code='TK-'+Math.random().toString(36).substr(2,8).toUpperCase();
    const d=await safeInsert('tokens',{code,days:parseInt(days),plan,created_by:user?.id,assigned_to:assignTo||null,assigned_name:assignName||null,used:false});
    const final=d||{id:genId(),code,days:parseInt(days),plan,created_by:user?.id,assigned_to:assignTo||null,assigned_name:assignName||null,used:false,created_at:nowISO()};
    setTokens(prev=>[final,...prev]);return code;
  },[user]);
  const activateToken=useCallback(async(code)=>{const tk=tokens.find(t=>t.code===code&&!t.used);if(!tk)return'Token si sahihi au imetumika!';if(!bizId)return'Biashara haijapatikana!';const exp=new Date(Date.now()+tk.days*86400000).toISOString();await safeUpdate('tokens',{used:true,used_by:bizId,used_at:nowISO()},'id',tk.id);await safeUpdate('businesses',{token_active:true,token_expiry:exp,plan:tk.plan||'basic',is_suspended:false},'id',bizId);setTokens(prev=>prev.map(t=>t.id===tk.id?{...t,used:true}:t));setBiz(prev=>prev.map(b=>b.id===bizId?{...b,token_active:true,token_expiry:exp,is_suspended:false}:b));return null},[tokens,bizId]);

  // ===== PROMO =====
  const addPromo=useCallback(async(agent,phone,commission=10,email='')=>{const code='PROMO-'+Math.random().toString(36).substr(2,6).toUpperCase();const d=await safeInsert('promo_codes',{code,agent_name:agent,agent_phone:phone,agent_email:email,commission_rate:commission});setPromos(prev=>[...prev,d||{id:genId(),code,agent_name:agent,agent_phone:phone,agent_email:email,commission_rate:commission,used_count:0,total_earned:0}]);return code},[]);
  const deletePromo=useCallback(async(pid)=>{await safeDelete('promo_codes','id',pid);setPromos(prev=>prev.filter(p=>p.id!==pid))},[]);

  // ===== CREATE AGENT ACCOUNT (Marketing → Agent) =====
  const createAgent=useCallback(async(name,email,password,phone,commission=10)=>{
    try{
      // 1. Create auth account
      const{data:auth}=await supabase.auth.signUp({email,password:password||'agent123'});
      const uid=auth?.user?.id||genId();
      // 2. Create user with role='agent'
      await safeInsert('users',{id:uid,email,name,phone,role:'agent',is_active:true});
      // 3. Create promo code linked to agent email
      const code='PROMO-'+Math.random().toString(36).substr(2,6).toUpperCase();
      const promo=await safeInsert('promo_codes',{code,agent_name:name,agent_phone:phone,agent_email:email,commission_rate:commission});
      setPromos(prev=>[...prev,promo||{id:genId(),code,agent_name:name,agent_phone:phone,agent_email:email,commission_rate:commission,used_count:0}]);
      return{uid,code,email};
    }catch(e){console.warn('CreateAgent:',e);return null}
  },[]);

  // ===== REGISTER CUSTOMER BY AGENT =====
  const registerCustomerByAgent=useCallback(async(bizName,custEmail,custPhone,custName)=>{
    if(!user?.promo_code)return{error:'Promo code haijapatikana'};
    try{
      const password='duka'+Math.random().toString(36).substr(2,6);
      const{data:auth}=await supabase.auth.signUp({email:custEmail,password});
      const uid=auth?.user?.id||genId();
      const trialEnd=new Date(Date.now()+parseInt(settings.trial_days||5)*86400000).toISOString();
      await safeInsert('users',{id:uid,email:custEmail,name:custName||bizName,phone:custPhone,role:'office'});
      const newBiz=await safeInsert('businesses',{name:bizName,email:custEmail,phone:custPhone,owner_id:uid,trial_end:trialEnd,promo_code:user.promo_code});
      if(newBiz){
        await safeUpdate('users',{business_id:newBiz.id},'id',uid);
        setBiz(prev=>[newBiz,...prev]);
        // Notify admin
        await safeInsert('notifications',{target_type:'admin',type:'info',title:`🏪 Mteja Mpya (Wakala): ${bizName}`,message:`${custName||bizName} amesajiliwa na wakala ${user.name}. Code: ${user.promo_code}`});
        // Welcome email
        sendMail(custEmail,'🎉 Karibu kwenye Duka Langu!','welcome',{name:custName||bizName,businessName:bizName});
        // Admin + Partners notification
        sendMail(ADMIN_EMAIL,`🆕 Mteja Mpya (Wakala): ${bizName}`,'new_customer',{name:bizName,email:custEmail,phone:custPhone||'-'});
        supabase.from('marketing_partners').select('email').then(({data:pts})=>{
          (pts||[]).forEach(p=>{if(p.email)sendMail(p.email,`🆕 Mteja Mpya (Wakala): ${bizName}`,'new_customer',{name:bizName,email:custEmail,phone:custPhone||'-'})});
        }).catch(()=>{});
      }
      return{success:true,email:custEmail,password,bizName};
    }catch(e){console.warn('RegisterByAgent:',e);return{error:e.message||'Tatizo'}}
  },[user,settings.trial_days]);

  // ===== PAYMENT REQUESTS (Lipa na Kuthibitisha) =====
  // Office: submit payment with transaction ID
  const submitPayment=useCallback(async(transactionId,amount,payMethod='HALOPESA',phone='')=>{
    const myBizId=bizId||user?.business_id;
    const myBizName=biz?.name||user?.name||'Biashara';
    const myEmail=user?.email||'';
    
    if(!myBizId){
      console.error('[PAYMENT] No bizId! user:',user?.id,'biz:',biz);
      return{error:'Biashara haijapatikana. Jaribu tena.'};
    }
    
    console.log('[PAYMENT] Submitting:',{bizId:myBizId,txId:transactionId,amount,method:payMethod});
    
    // Basic columns (always exist)
    const prBasic={business_id:myBizId,transaction_id:transactionId.trim(),amount:+amount,status:'pending'};
    // Extra columns (may not exist yet)
    const prFull={...prBasic,business_name:myBizName,user_email:myEmail,payment_method:payMethod,phone,plan:biz?.plan||'basic'};
    
    // Try full insert first, fallback to basic
    let saved=null;
    let{data:d1,error:e1}=await supabase.from('payment_requests').insert(prFull).select().single();
    if(e1){
      console.warn('[PAYMENT] Full insert failed:',e1.message,'→ trying basic...');
      let{data:d2,error:e2}=await supabase.from('payment_requests').insert(prBasic).select().single();
      if(e2){
        console.error('[PAYMENT] Basic insert also failed:',e2.message);
        return{error:'Tatizo la database: '+e2.message};
      }
      saved=d2;
    }else{
      saved=d1;
    }
    
    if(saved)setPayReqs(prev=>[saved,...prev]);
    const final=saved||{...prFull,id:genId(),created_at:nowISO()};
    
    // Notify admin — in-app notification
    safeInsert('notifications',{target_type:'admin',type:'warning',title:`💰 MALIPO MAPYA! — ${myBizName}`,message:`${myBizName} amelipa TZS ${(+amount).toLocaleString()} kupitia ${payMethod}. Transaction: ${transactionId}. THIBITISHA SASA!`}).catch(()=>{});
    // Notify admin — email
    sendMail(ADMIN_EMAIL,`💰 MALIPO MAPYA — ${myBizName}`,'admin_payment',{businessName:myBizName,email:myEmail,transactionId,amount:+amount,method:payMethod,phone});
    // Notify admin — SMS via Beem (kwa Admin namba 0628986770)
    sendSMS('255628986770',`DUKA LANGU\n💰 MALIPO MAPYA!\n\nMteja: ${myBizName}\nKiasi: TZS ${(+amount).toLocaleString()}\nNjia: ${payMethod}\nTX: ${transactionId}\nSimu: ${phone||'—'}\n\nFungua mfumo kuthibitisha.`);
    // Notify partners
    supabase.from('marketing_partners').select('email').then(({data:pts})=>{
      (pts||[]).forEach(p=>{if(p.email)sendMail(p.email,`💰 Malipo Mapya: ${myBizName}`,'admin_payment',{businessName:myBizName,email:myEmail,transactionId,amount:+amount,method:payMethod,phone})});
    }).catch(()=>{});
    
    console.log('[PAYMENT] Success! ID:',final.id);
    return final;
  },[bizId,biz,user]);

  // Admin: approve payment → auto-generate token → activate
  const approvePayment=useCallback(async(paymentId,days=30)=>{
    const pr=paymentRequests.find(p=>p.id===paymentId);
    if(!pr)return null;
    // 1. Generate token
    const code='TK-'+Math.random().toString(36).substr(2,8).toUpperCase();
    const tokenData=await safeInsert('tokens',{code,days:parseInt(days),plan:pr.plan||'basic',created_by:user?.id,used:true,used_by:pr.business_id,used_by_name:pr.business_name,used_at:nowISO()});
    setTokens(prev=>[tokenData||{id:genId(),code,days,plan:pr.plan||'basic',used:true,used_by:pr.business_id,used_by_name:pr.business_name,created_at:nowISO()},...prev]);
    // 2. Activate business
    const exp=new Date(Date.now()+parseInt(days)*86400000).toISOString();
    await safeUpdate('businesses',{token_active:true,token_expiry:exp,plan:pr.plan||'basic',is_suspended:false},'id',pr.business_id);
    setBiz(prev=>prev.map(b=>b.id===pr.business_id?{...b,token_active:true,token_expiry:exp,is_suspended:false}:b));
    // 3. Update payment request status
    await safeUpdate('payment_requests',{status:'approved',approved_by:user?.id,approved_at:nowISO(),token_code:code,days_given:days},'id',paymentId);
    setPayReqs(prev=>prev.map(p=>p.id===paymentId?{...p,status:'approved',token_code:code,days_given:days}:p));
    // 4. Notify business — in-app
    await safeInsert('notifications',{target_type:'business',target_id:pr.business_id,type:'success',title:'🎉 Malipo Yamethibitishwa!',message:`Malipo yako ya TZS ${(pr.amount||0).toLocaleString()} yamethibitishwa! Mfumo umefunguliwa kwa siku ${days}. Token: ${code}`});
    // 5. Email customer
    if(pr.user_email){
      sendMail(pr.user_email,'🎉 Malipo Yamethibitishwa — Duka Langu','payment_received',{customerName:pr.business_name,amount:pr.amount,remaining:0,method:pr.payment_method||'HALOPESA'});
    }
    // 6. SMS token to customer phone
    if(pr.phone){
      sendSMS(pr.phone,`DUKA LANGU\n✅ MALIPO YAMEPOKELEWA!\n\nMteja: ${pr.business_name}\nKiasi: TZS ${(pr.amount||0).toLocaleString()}\nMfumo umefunguliwa siku ${days}\n\nToken: ${code}\n\nFungua: duka-langu-system.vercel.app\n\nAsante kwa kuamini Duka Langu!`);
    }
    // 7. SMS admin confirmation
    sendSMS('255628986770',`DUKA LANGU\n✅ Umethibitisha malipo\n\nMteja: ${pr.business_name}\nKiasi: TZS ${(pr.amount||0).toLocaleString()}\nSiku: ${days}\nToken: ${code}`);
    console.log('[APPROVE] Payment approved:',pr.business_name,'Token:',code,'Days:',days,'SMS→',pr.phone||'no phone');
    return{code,days};
  },[paymentRequests,user]);

  // Admin: reject payment
  const rejectPayment=useCallback(async(paymentId,reason='')=>{
    const pr=paymentRequests.find(p=>p.id===paymentId);
    if(!pr)return;
    await safeUpdate('payment_requests',{status:'rejected',reject_reason:reason||'Transaction ID si sahihi',approved_by:user?.id,approved_at:nowISO()},'id',paymentId);
    setPayReqs(prev=>prev.map(p=>p.id===paymentId?{...p,status:'rejected',reject_reason:reason||'Transaction ID si sahihi'}:p));
    // Notify business — in-app
    await safeInsert('notifications',{target_type:'business',target_id:pr.business_id,type:'danger',title:'❌ Malipo Yamekataliwa',message:`Malipo yako ya TZS ${(pr.amount||0).toLocaleString()} yamekataliwa. Sababu: ${reason||'Transaction ID si sahihi'}. Jaribu tena.`});
    // Email customer
    if(pr.user_email){
      sendMail(pr.user_email,'❌ Malipo Yamekataliwa — Duka Langu','promotional',{title:'❌ Malipo Yamekataliwa',emoji:'❌',message:`Malipo yako ya TZS ${(pr.amount||0).toLocaleString()} yamekataliwa.\n\nSababu: ${reason||'Transaction ID si sahihi'}\n\nTafadhali jaribu tena na Transaction ID sahihi.`,cta:'Jaribu Tena →'});
    }
    // SMS customer
    if(pr.phone){
      sendSMS(pr.phone,`DUKA LANGU\n❌ Malipo Yamekataliwa\n\nKiasi: TZS ${(pr.amount||0).toLocaleString()}\nSababu: ${reason||'Transaction ID si sahihi'}\n\nTafadhali jaribu tena na Transaction ID sahihi:\nduka-langu-system.vercel.app\n\nMsaada: 0617288752`);
    }
    console.log('[REJECT] Payment rejected:',pr.business_name,'Reason:',reason);
  },[paymentRequests,user]);

  // Check my latest payment status (for office/locked page)
  const myLatestPayment=useMemo(()=>{
    if(!bizId)return null;
    return paymentRequests.filter(p=>p.business_id===bizId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]||null;
  },[paymentRequests,bizId]);

  // Pending payments count (for admin badge)
  const pendingPayments=useMemo(()=>paymentRequests.filter(p=>p.status==='pending'),[paymentRequests]);

  // Real-time subscription for payment status updates
  useEffect(()=>{
    if(!bizId||user?.role==='admin')return;
    const channel=supabase.channel('payment-updates')
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'payment_requests',filter:`business_id=eq.${bizId}`},(payload)=>{
        const updated=payload.new;
        setPayReqs(prev=>prev.map(p=>p.id===updated.id?{...p,...updated}:p));
        if(updated.status==='approved'){
          // Auto-refresh business data
          setPopups(prev=>[{id:genId(),type:'success',title:'🎉 Malipo Yamethibitishwa!',message:'Mfumo unafunguka...'},...prev]);
          // Reload business data after 1.5 seconds
          setTimeout(()=>{loadData(user.id,user.role,bizId)},1500);
        }
      }).subscribe();
    return()=>{supabase.removeChannel(channel)};
  },[bizId,user,loadData]);

  // Admin: real-time new payment requests
  useEffect(()=>{
    if(user?.role!=='admin')return;
    // Listen for new payment requests
    const ch1=supabase.channel('admin-payments')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'payment_requests'},(payload)=>{
        setPayReqs(prev=>[payload.new,...prev]);
        setPopups(prev=>[{id:genId(),type:'warning',title:'💰 Malipo Mapya!',message:`${payload.new.business_name} amelipa TZS ${(payload.new.amount||0).toLocaleString()}! Thibitisha SASA.`},...prev]);
      }).subscribe();
    // Listen for new notifications
    const ch2=supabase.channel('admin-notifs')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'target_type=eq.admin'},(payload)=>{
        setNotifs(prev=>[payload.new,...prev]);
      }).subscribe();
    return()=>{supabase.removeChannel(ch1);supabase.removeChannel(ch2)};
  },[user]);

  // ===== SMART ALERT ENGINE =====
  // Runs once on load — generates auto-notifications for important events
  useEffect(()=>{
    if(!user||!bizId||user.role==='admin'||user.role==='marketing'||user.role==='agent')return;
    // WAIT for data to load — don't run with empty data
    if(products.length===0&&sales.length===0&&customers.length===0)return;
    const today=todayStr();
    const alertKey=`alerts_${bizId}_${today}`;
    // Prevent duplicate alerts per day
    if(sessionStorage.getItem(alertKey))return;
    sessionStorage.setItem(alertKey,'1');

    const alerts=[];

    // 1. LOW STOCK ALERT
    const lowItems=products.filter(p=>p.business_id===bizId&&p.quantity>0&&p.quantity<=(p.min_stock||5));    if(lowItems.length>0){
      alerts.push({target_type:'business',target_id:bizId,type:'warning',
        title:`📦 Bidhaa ${lowItems.length} Zinaisha!`,
        message:`Agiza haraka: ${lowItems.slice(0,5).map(p=>`${p.name} (${p.quantity} zimebaki)`).join(', ')}${lowItems.length>5?` na ${lowItems.length-5} nyingine`:''}.`
      });
    }

    // 2. OVERDUE DEBT ALERT
    if(overdueCustomers.length>0){
      alerts.push({target_type:'business',target_id:bizId,type:'danger',
        title:`🚨 Deni Limechelewa — Wateja ${overdueCustomers.length}!`,
        message:`Deni la jumla TZS ${overdueTotal.toLocaleString()} limechelewa! ${overdueCustomers.slice(0,3).map(c=>`${c.name}: TZS ${(c.credit_balance||0).toLocaleString()}`).join(', ')}.`
      });
    }

    // 3. SUBSCRIPTION EXPIRY ALERT
    if(biz){
      const end=biz.token_active?biz.token_expiry:biz.trial_end;
      if(end){
        const dLeft=Math.ceil((new Date(end)-new Date())/86400000);
        if(dLeft>0&&dLeft<=5){
          alerts.push({target_type:'business',target_id:bizId,type:'warning',
            title:`⏳ Muda Unakaribia Kuisha — Siku ${dLeft}!`,
            message:`Muda wako wa mfumo utaisha ${dLeft===1?'KESHO':`baada ya siku ${dLeft}`}. Lipa sasa ili kuendelea: HALOPESA Lipa Namba 25187616 — DUKALANGU.`
          });
        }
      }
    }

    // 4. EXPIRY DATE ALERT (products expiring soon)
    const expiring=products.filter(p=>{
      if(!p.expiry_date||p.business_id!==bizId)return false;
      const dLeft=Math.ceil((new Date(p.expiry_date)-new Date())/86400000);
      return dLeft>0&&dLeft<=14;
    });
    if(expiring.length>0){
      alerts.push({target_type:'business',target_id:bizId,type:'warning',
        title:`📅 Bidhaa ${expiring.length} Zinakaribia Kuisha Muda!`,
        message:`Angalia: ${expiring.slice(0,3).map(p=>{const d=Math.ceil((new Date(p.expiry_date)-new Date())/86400000);return`${p.name} (siku ${d})`}).join(', ')}.`
      });
    }

    // 5. DAILY PERFORMANCE SUMMARY (if sales exist today)
    const todaySales=sales.filter(s=>s.created_at?.startsWith(today));
    const todayTotal=todaySales.reduce((a,s)=>a+s.total,0);
    const todayProfit=todaySales.reduce((a,s)=>a+s.profit,0);
    const todayExp=expenses.filter(e=>e.created_at?.startsWith(today)).reduce((a,e)=>a+(e.amount||0),0);
    // Only show if it's after 6 PM
    const hour=new Date().getHours();
    if(hour>=18&&todaySales.length>0){
      const topProd={};todaySales.forEach(s=>s.items?.forEach(i=>{topProd[i.name]=(topProd[i.name]||0)+i.qty}));
      const best=Object.entries(topProd).sort((a,b)=>b[1]-a[1])[0];
      alerts.push({target_type:'business',target_id:bizId,type:'info',
        title:`📊 Ripoti ya Leo — ${new Date().toLocaleDateString('sw-TZ')}`,
        message:`Mauzo: TZS ${todayTotal.toLocaleString()} | Faida: TZS ${todayProfit.toLocaleString()} | Matumizi: TZS ${todayExp.toLocaleString()} | Mauzo: ${todaySales.length}${best?` | Bidhaa bora: ${best[0]} (x${best[1]})`:''}`
      });
    }

    // Save alerts + Send emails
    alerts.forEach(a=>safeInsert('notifications',a).catch(()=>{}));
    const ownerEmail=biz?.email;
    if(ownerEmail&&alerts.length>0){
      if(lowItems.length>0){
        sendMail(ownerEmail,'📦 Bidhaa '+lowItems.length+' Zinaisha!','low_stock',{count:lowItems.length,items:lowItems.slice(0,10).map(p=>({name:p.name,image:p.image,quantity:p.quantity,min_stock:p.min_stock||5}))});
      }
      if(overdueCustomers.length>0){
        sendMail(ownerEmail,'🚨 Deni Limechelewa!','overdue_debt',{count:overdueCustomers.length,total:overdueTotal,customers:overdueCustomers.slice(0,10).map(c=>({name:c.name,phone:c.phone,balance:c.credit_balance,daysOverdue:Math.floor((Date.now()-new Date(c.last_credit_date||c.created_at).getTime())/86400000)}))});
      }
      if(biz){
        const end=biz.token_active?biz.token_expiry:biz.trial_end;
        if(end){const dLeft=Math.ceil((new Date(end)-new Date())/86400000);
          if(dLeft>0&&dLeft<=5){sendMail(ownerEmail,'⏳ Muda Unakaribia Kuisha!','subscription_expiry',{daysLeft:dLeft,price:parseInt(settings.system_price||15000)});}
        }
      }
    }

    // ===== FULL SHOP REPORT — Saa 10 Usiku (22:00) =====
    const fullReportKey=`full_report_${todayStr()}_${bizId}`;
    // Only send if: it's after 10PM, data has loaded, and not sent today
    const hasShopData=products.filter(p=>p.business_id===bizId).length>0||sales.filter(s=>s.business_id===bizId).length>0;
    if(hour>=22&&ownerEmail&&hasShopData&&!sessionStorage.getItem(fullReportKey)){
      sessionStorage.setItem(fullReportKey,'1');

      // TODAY stats
      const todaySales=sales.filter(s=>s.business_id===bizId&&s.created_at?.startsWith(today));
      const todayTotal=todaySales.reduce((a,s)=>a+(s.total||0),0);
      const todayProfit=todaySales.reduce((a,s)=>a+(s.profit||0),0);
      const todayExpTotal=expenses.filter(e=>e.business_id===bizId&&e.created_at?.startsWith(today)).reduce((a,e)=>a+(e.amount||0),0);

      // WEEK stats
      const weekAgo=new Date(Date.now()-7*86400000).toISOString();
      const weekSales=sales.filter(s=>s.business_id===bizId&&s.created_at>=weekAgo);
      const weekTotal=weekSales.reduce((a,s)=>a+(s.total||0),0);
      const weekProfit=weekSales.reduce((a,s)=>a+(s.profit||0),0);
      const weekExpTotal=expenses.filter(e=>e.business_id===bizId&&e.created_at>=weekAgo).reduce((a,e)=>a+(e.amount||0),0);

      // MONTH stats
      const monthStart=today.slice(0,7);
      const monthSales=sales.filter(s=>s.business_id===bizId&&s.created_at?.startsWith(monthStart));
      const monthTotal=monthSales.reduce((a,s)=>a+(s.total||0),0);
      const monthProfit=monthSales.reduce((a,s)=>a+(s.profit||0),0);
      const monthExpTotal=expenses.filter(e=>e.business_id===bizId&&e.created_at?.startsWith(monthStart)).reduce((a,e)=>a+(e.amount||0),0);

      // Top selling products (month)
      const prodMap={};monthSales.forEach(s=>s.items?.forEach(i=>{prodMap[i.name]=(prodMap[i.name]||0)+i.qty}));
      const topProducts=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,qty])=>({name,qty}));

      // Low stock
      const lowStockList=products.filter(p=>p.business_id===bizId&&p.quantity>0&&p.quantity<=(p.min_stock||5)).slice(0,10).map(p=>({name:p.name,quantity:p.quantity,min_stock:p.min_stock||5}));

      // Debts
      const debtCustomers=customers.filter(c=>c.business_id===bizId&&(c.credit_balance||0)>0).map(c=>({name:c.name,phone:c.phone||'-',balance:c.credit_balance,daysOverdue:c.last_credit_date?Math.floor((Date.now()-new Date(c.last_credit_date).getTime())/86400000):0})).sort((a,b)=>b.balance-a.balance);
      const totalDebt=debtCustomers.reduce((a,c)=>a+(c.balance||0),0);

      // Days remaining
      const subEnd=biz?.token_active?biz?.token_expiry:biz?.trial_end;
      const daysLeft=subEnd?Math.max(0,Math.ceil((new Date(subEnd)-new Date())/86400000)):0;

      sendMail(ownerEmail,`📊 RIPOTI KAMILI — ${biz?.name||'Duka'} — ${new Date().toLocaleDateString('sw-TZ')}`,'full_shop_report',{
        shopName:biz?.name||'Duka',
        date:today,
        // Daily
        daySales:todayTotal,dayProfit:todayProfit,dayExpenses:todayExpTotal,dayCount:todaySales.length,dayNet:todayProfit-todayExpTotal,
        // Weekly
        weekSales:weekTotal,weekProfit:weekProfit,weekExpenses:weekExpTotal,weekCount:weekSales.length,weekNet:weekProfit-weekExpTotal,
        // Monthly
        monthSales:monthTotal,monthProfit:monthProfit,monthExpenses:monthExpTotal,monthCount:monthSales.length,monthNet:monthProfit-monthExpTotal,
        // Products
        topProducts,lowStock:lowStockList,lowStockCount:lowStockList.length,
        // Debts
        debts:debtCustomers.slice(0,15),totalDebt,debtCount:debtCustomers.length,
        // Subscription
        daysLeft,plan:(biz?.plan||'trial').toUpperCase(),
      });
    }
  },[user,bizId,products,overdueCustomers,biz,sales,expenses,customers,settings,overdueTotal]);

  // ===== ADMIN + PARTNER DAILY REPORT (8:00 AM) =====
  useEffect(()=>{
    if(user?.role!=='admin'&&user?.role!=='marketing')return;
    // WAIT for data to load — don't send report with zero data
    if(businesses.length===0)return;
    const today=todayStr();
    const alertKey=`admin_alerts_${today}_${user?.role}`;
    if(sessionStorage.getItem(alertKey))return;
    sessionStorage.setItem(alertKey,'1');
    const alerts=[];
    const hour=new Date().getHours();

    // Customer stats
    const activeBiz=businesses.filter(b=>b.token_active&&!b.is_suspended);
    const trialBiz=businesses.filter(b=>!b.token_active&&!b.is_suspended);
    const suspendedBiz=businesses.filter(b=>b.is_suspended);
    const newToday=businesses.filter(b=>b.created_at?.startsWith(today));

    // New customer alert (in-app)
    if(newToday.length>0){
      alerts.push({target_type:'admin',type:'success',
        title:`🆕 Wateja Wapya ${newToday.length} Leo!`,
        message:newToday.map(b=>`${b.name} (${b.email})`).join(', ')
      });
    }

    // Expiring businesses
    const expSoon=businesses.filter(b=>{
      const end=b.token_active?b.token_expiry:b.trial_end;
      if(!end)return false;const d=Math.ceil((new Date(end)-new Date())/86400000);return d>0&&d<=5;
    });
    if(expSoon.length>0){
      alerts.push({target_type:'admin',type:'warning',
        title:`⏳ Wateja ${expSoon.length} Muda Unaisha!`,
        message:expSoon.map(b=>{const d=Math.ceil((new Date(b.token_expiry||b.trial_end)-new Date())/86400000);return`${b.name} (siku ${d})`}).join(', ')
      });
    }

    // Pending payments
    const pending=paymentRequests.filter(p=>p.status==='pending');
    if(pending.length>0){
      alerts.push({target_type:'admin',type:'warning',
        title:`💰 Malipo ${pending.length} Yanasubiri!`,
        message:pending.map(p=>`${p.business_name}: TZS ${(p.amount||0).toLocaleString()}`).join(', ')
      });
    }

    alerts.forEach(a=>safeInsert('notifications',a).catch(()=>{}));

    // ===== DAILY EMAIL REPORT =====
    const dailyKey=`daily_email_${today}_${user?.role}`;
    if(!sessionStorage.getItem(dailyKey)){
      sessionStorage.setItem(dailyKey,'1');

      // Revenue from approved payments
      const approvedPay=paymentRequests.filter(p=>p.status==='approved');
      const totalRevenue=approvedPay.reduce((a,p)=>a+(p.amount||0),0);
      const monthPay=approvedPay.filter(p=>p.created_at?.startsWith(today.slice(0,7)));
      const monthRevenue=monthPay.reduce((a,p)=>a+(p.amount||0),0);

      // Conversion rate
      const convRate=businesses.length>0?Math.round(activeBiz.length/businesses.length*100):0;

      // Expiring list details
      const expList=expSoon.map(b=>{const d=Math.ceil((new Date(b.token_expiry||b.trial_end)-new Date())/86400000);return{name:b.name,email:b.email,phone:b.phone||'-',daysLeft:d}});

      // Suspended list
      const suspList=suspendedBiz.slice(0,10).map(b=>({name:b.name,email:b.email,phone:b.phone||'-'}));

      // Active list
      const activeList=activeBiz.slice(0,15).map(b=>{const d=b.token_expiry?Math.ceil((new Date(b.token_expiry)-new Date())/86400000):0;return{name:b.name,email:b.email,phone:b.phone||'-',plan:(b.plan||'basic').toUpperCase(),daysLeft:d}});

      // Trial list
      const trialList=trialBiz.slice(0,10).map(b=>{const d=b.trial_end?Math.ceil((new Date(b.trial_end)-new Date())/86400000):0;return{name:b.name,email:b.email,phone:b.phone||'-',daysLeft:d}});

      const reportData={
        totalBiz:businesses.length,
        activeBiz:activeBiz.length,
        trialBiz:trialBiz.length,
        suspendedBiz:suspendedBiz.length,
        newToday:newToday.length,
        expiringSoon:expSoon.length,
        pendingPayments:pending.length,
        totalRevenue,monthRevenue,convRate,
        newCustomers:newToday.map(b=>({name:b.name,email:b.email,phone:b.phone||'-'})),
        expiringList:expList,
        suspendedList:suspList,
        activeList,trialList,
        agentCount:promoCodes.length,
        partnerCount:partners.length,
      };

      // Send to ADMIN
      if(user?.role==='admin'){
        sendMail(ADMIN_EMAIL,`📊 Ripoti ya Asubuhi — ${today}`,'admin_daily_report',reportData);
      }

      // Send to ALL MARKETING PARTNERS
      if(user?.role==='admin'){
        partners.forEach(p=>{
          if(p.email)sendMail(p.email,`📊 Ripoti ya Asubuhi — ${today}`,'admin_daily_report',reportData);
        });
      }

      // New customer notification
      if(newToday.length>0){
        newToday.forEach(b=>{
          sendMail(ADMIN_EMAIL,`🆕 Mteja Mpya: ${b.name}`,'new_customer',{name:b.name,email:b.email,phone:b.phone||'-'});
          partners.forEach(p=>{if(p.email)sendMail(p.email,`🆕 Mteja Mpya: ${b.name}`,'new_customer',{name:b.name,email:b.email,phone:b.phone||'-'})});
        });
      }

      if(expSoon.length>0){
        sendMail(ADMIN_EMAIL,'⏳ Wateja Muda Unaisha!','subscription_expiry',{daysLeft:'multiple',price:0});
      }
    }
  },[user,businesses,paymentRequests,partners,promoCodes]);

  // ===== MARKETING PARTNERS =====
  const createPartner=useCallback(async(name,email,password,phone,commission=10)=>{
    try{
      const{data:auth}=await supabase.auth.signUp({email,password:password||'partner123'});
      const uid=auth?.user?.id||genId();
      const d=await safeInsert('users',{id:uid,email,name,phone,role:'marketing'});
      const partner=await safeInsert('marketing_partners',{user_id:uid,name,email,phone,commission_rate:commission,status:'active'});
      const final=partner||{id:genId(),user_id:uid,name,email,phone,commission_rate:commission,status:'active',created_at:nowISO()};
      setPartners(prev=>[...prev,final]);
      return final;
    }catch(e){console.warn('Partner:',e);return null}
  },[]);
  const updatePartner=useCallback(async(pid,updates)=>{
    await safeUpdate('marketing_partners',updates,'id',pid);
    setPartners(prev=>prev.map(p=>p.id===pid?{...p,...updates}:p));
  },[]);
  const deletePartner=useCallback(async(pid)=>{
    await safeDelete('marketing_partners','id',pid);
    setPartners(prev=>prev.filter(p=>p.id!==pid));
  },[]);

  // ===== CAMPAIGNS =====
  const addCampaign=useCallback(async(c)=>{
    const d=await safeInsert('campaigns',{...c,created_by:user?.id,status:'active'});
    const f=d||{...c,id:genId(),created_by:user?.id,status:'active',signups:0,created_at:nowISO()};
    setCampaigns(prev=>[f,...prev]);return f;
  },[user]);
  const updateCampaign=useCallback(async(cid,u)=>{await safeUpdate('campaigns',u,'id',cid);setCampaigns(prev=>prev.map(c=>c.id===cid?{...c,...u}:c))},[]);
  const deleteCampaign=useCallback(async(cid)=>{await safeDelete('campaigns','id',cid);setCampaigns(prev=>prev.filter(c=>c.id!==cid))},[]);

  // ===== INTERNAL MESSAGING (Admin ↔ Marketing) =====
  const sendMessage=useCallback(async(to,message,subject='')=>{
    const d=await safeInsert('internal_messages',{from_id:user?.id,from_name:user?.name||user?.email,from_role:user?.role,to_role:to,subject,message,is_read:false});
    const f=d||{id:genId(),from_id:user?.id,from_name:user?.name||user?.email,from_role:user?.role,to_role:to,subject,message,is_read:false,created_at:nowISO()};
    setMsgs(prev=>[f,...prev]);return f;
  },[user]);
  const markMsgRead=useCallback(async(mid)=>{await safeUpdate('internal_messages',{is_read:true},'id',mid);setMsgs(prev=>prev.map(m=>m.id===mid?{...m,is_read:true}:m))},[]);
  const myMessages=useMemo(()=>internalMsgs.filter(m=>m.to_role===user?.role||m.from_role===user?.role).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[internalMsgs,user]);
  const unreadMsgs=useMemo(()=>internalMsgs.filter(m=>m.to_role===user?.role&&!m.is_read).length,[internalMsgs,user]);

  // ===== FOLLOW-UP REMINDERS =====
  const addFollowup=useCallback(async(f)=>{
    const d=await safeInsert('followups',{...f,created_by:user?.id,status:'pending'});
    const final=d||{...f,id:genId(),created_by:user?.id,status:'pending',created_at:nowISO()};
    setFollowups(prev=>[final,...prev]);return final;
  },[user]);
  const completeFollowup=useCallback(async(fid,note='')=>{
    await safeUpdate('followups',{status:'done',completed_at:nowISO(),completion_note:note},'id',fid);
    setFollowups(prev=>prev.map(f=>f.id===fid?{...f,status:'done',completed_at:nowISO()}:f));
  },[]);
  const todayFollowups=useMemo(()=>{
    const today=todayStr();
    return followups.filter(f=>f.status==='pending'&&f.due_date<=today);
  },[followups]);

  // ===== TESTIMONIALS =====
  const addTestimonial=useCallback(async(t)=>{
    const d=await safeInsert('testimonials',{...t,created_by:user?.id,status:'active'});
    const f=d||{...t,id:genId(),created_by:user?.id,status:'active',created_at:nowISO()};
    setTestimonials(prev=>[f,...prev]);return f;
  },[user]);
  const deleteTestimonial=useCallback(async(tid)=>{await safeDelete('testimonials','id',tid);setTestimonials(prev=>prev.filter(t=>t.id!==tid))},[]);

  // Marketing computed values
  const marketingStats=useMemo(()=>{
    const totalClients=businesses.length;
    const activeClients=businesses.filter(b=>b.token_active&&!b.is_suspended).length;
    const trialClients=businesses.filter(b=>!b.token_active&&!b.is_suspended).length;
    const suspendedClients=businesses.filter(b=>b.is_suspended).length;
    const thisMonth=todayStr().slice(0,7);
    const newThisMonth=businesses.filter(b=>b.created_at?.startsWith(thisMonth)).length;
    const paidThisMonth=paymentRequests.filter(p=>p.status==='approved'&&p.created_at?.startsWith(thisMonth));
    const revenueThisMonth=paidThisMonth.reduce((a,p)=>a+(p.amount||0),0);
    const conversionRate=totalClients>0?Math.round(activeClients/totalClients*100):0;
    // Pipeline
    const pipeline={leads:trialClients,active:activeClients,churned:suspendedClients,total:totalClients};
    return{totalClients,activeClients,trialClients,suspendedClients,newThisMonth,revenueThisMonth,conversionRate,pipeline};
  },[businesses,paymentRequests]);

  // ===== NOTIFICATIONS =====
  const addNotif=useCallback(async(tt,tid,type,title,msg)=>{const d=await safeInsert('notifications',{target_type:tt,target_id:tid,type,title,message:msg});const n=d||{id:genId(),target_type:tt,target_id:tid,type,title,message:msg,created_at:nowISO(),is_read:false};setNotifs(prev=>[n,...prev]);return n},[]);
  const broadcastNotif=useCallback(async(type,title,msg)=>{await safeInsert('notifications',{target_type:'broadcast',type,title,message:msg});setNotifs(prev=>[{id:genId(),target_type:'broadcast',type,title,message:msg,created_at:nowISO(),is_read:false},...prev])},[]);
  const markRead=useCallback(async(nid)=>{await safeUpdate('notifications',{is_read:true},'id',nid);setNotifs(prev=>prev.map(n=>n.id===nid?{...n,is_read:true}:n))},[]);
  const markAllRead=useCallback(async()=>{for(const n of notifications.filter(n=>!n.is_read)){await safeUpdate('notifications',{is_read:true},'id',n.id)}setNotifs(prev=>prev.map(n=>({...n,is_read:true})))},[notifications]);

  // ===== SETTINGS =====
  const updateSetting=useCallback(async(key,val)=>{await safeUpsert('system_settings',{key,value:val,updated_at:nowISO()},'key');setSettings(prev=>({...prev,[key]:val}))},[]);

  // ===== ADMIN ACTIONS =====
  const suspendBiz=useCallback(async(bid,suspend)=>{await safeUpdate('businesses',{is_suspended:suspend},'id',bid);setBiz(prev=>prev.map(b=>b.id===bid?{...b,is_suspended:suspend}:b));await safeInsert('system_logs',{user_id:user?.id,user_email:user?.email,action:suspend?'suspend':'activate',details:{text:'Biz '+bid}})},[user]);
  
  // ===== UPDATE BUSINESS INFO (Admin can edit customer details) =====
  const updateBiz=useCallback(async(bid,updates)=>{
    try{
      // Try full update first
      let{error:bizErr}=await supabase.from('businesses').update(updates).eq('id',bid);
      
      // If owner_name column missing, retry without it
      if(bizErr&&bizErr.message?.includes('owner_name')){
        console.warn('[updateBiz] owner_name column missing, retrying without it');
        const {owner_name,...safeUpdates}=updates;
        const result=await supabase.from('businesses').update(safeUpdates).eq('id',bid);
        bizErr=result.error;
      }
      
      // If any other column missing, try basic fields only
      if(bizErr&&bizErr.message?.includes('column')){
        console.warn('[updateBiz] Column missing, trying basic fields:',bizErr.message);
        const basicUpdates={};
        if(updates.name)basicUpdates.name=updates.name;
        if(updates.email)basicUpdates.email=updates.email;
        if(updates.phone)basicUpdates.phone=updates.phone;
        const result=await supabase.from('businesses').update(basicUpdates).eq('id',bid);
        bizErr=result.error;
      }
      
      if(bizErr)throw bizErr;
      
      // Update local state
      setBiz(prev=>prev.map(b=>b.id===bid?{...b,...updates}:b));
      
      // If email/phone/name changed, also update users table for owner
      if(updates.email||updates.phone||updates.name){
        const biz=businesses.find(b=>b.id===bid);
        if(biz?.owner_id){
          const userUpdates={};
          if(updates.email)userUpdates.email=updates.email;
          if(updates.phone)userUpdates.phone=updates.phone;
          if(updates.name)userUpdates.name=updates.name;
          try{await supabase.from('users').update(userUpdates).eq('id',biz.owner_id)}catch(e){console.warn('User update skipped:',e.message)}
        }
      }
      
      // Audit log
      try{await safeInsert('system_logs',{user_id:user?.id,user_email:user?.email,action:'update_biz',details:{biz_id:bid,changes:JSON.stringify(updates)}})}catch(e){}
      
      // Email customer
      const biz=businesses.find(b=>b.id===bid);
      if(biz?.email&&(updates.phone||updates.email)){
        sendMail(updates.email||biz.email,'✅ Taarifa Zako Zimebadilishwa — Duka Langu','promotional',{title:'✅ Taarifa Zimebadilishwa',emoji:'✅',message:`Habari ${updates.name||biz.name},\n\nTaarifa za akaunti yako zimebadilishwa na Admin.\n\n${updates.email?`📧 Email mpya: ${updates.email}\n`:''}${updates.phone?`📱 Simu mpya: ${updates.phone}\n`:''}${updates.name?`🏪 Jina: ${updates.name}\n`:''}\nKama hukuomba mabadiliko haya, wasiliana nasi mara moja.`,cta:'Login →'});
      }
      return{success:true};
    }catch(e){
      console.error('[updateBiz] Error:',e);
      return{success:false,error:e.message};
    }
  },[user,businesses]);
  const deleteBiz=useCallback(async(bid)=>{await safeDelete('businesses','id',bid);setBiz(prev=>prev.filter(b=>b.id!==bid))},[]);

  // ===== EXPORT ALL DATA =====
  const exportAllData=useCallback(()=>{
    const data={businesses,products,sales,expenses,customers,employees,tokens,promoCodes,branches,tickets,returns,exportDate:nowISO()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`duka-langu-export-${todayStr()}.json`;a.click();URL.revokeObjectURL(url);
  },[businesses,products,sales,expenses,customers,employees,tokens,promoCodes,branches,tickets,returns]);

  // ===== QUICK EXTEND (ongeza siku bila token) =====
  const quickExtend=useCallback(async(bid,days)=>{
    const b=businesses.find(x=>x.id===bid);if(!b)return;
    const currentEnd=b.token_active&&b.token_expiry?new Date(b.token_expiry):b.trial_end?new Date(b.trial_end):new Date();
    const base=currentEnd>new Date()?currentEnd:new Date();
    const newEnd=new Date(base.getTime()+parseInt(days)*86400000).toISOString();
    await safeUpdate('businesses',{token_active:true,token_expiry:newEnd,is_suspended:false},'id',bid);
    setBiz(prev=>prev.map(x=>x.id===bid?{...x,token_active:true,token_expiry:newEnd,is_suspended:false}:x));
    await safeInsert('system_logs',{user_id:user?.id,user_email:user?.email,action:'quick_extend',details:{text:`${b.name}: +${days} siku`}});
    await safeInsert('notifications',{target_type:'business',target_id:bid,type:'success',title:`🎉 Siku ${days} Zimeongezwa!`,message:`Admin amekuongezea siku ${days}. Mfumo wako utaendelea hadi ${new Date(newEnd).toLocaleDateString('sw-TZ')}.`});
  },[businesses,user]);

  // ===== QUICK UPGRADE (badilisha plan) =====
  const quickUpgrade=useCallback(async(bid,newPlan)=>{
    const b=businesses.find(x=>x.id===bid);if(!b)return;
    await safeUpdate('businesses',{plan:newPlan},'id',bid);
    setBiz(prev=>prev.map(x=>x.id===bid?{...x,plan:newPlan}:x));
    await safeInsert('system_logs',{user_id:user?.id,user_email:user?.email,action:'quick_upgrade',details:{text:`${b.name}: ${b.plan} → ${newPlan}`}});
    await safeInsert('notifications',{target_type:'business',target_id:bid,type:'success',title:`⬆️ Plan Imebadilishwa!`,message:`Plan yako imebadilishwa kuwa ${newPlan.toUpperCase()}. Furahia features mpya!`});
  },[businesses,user]);

  // ===== QUICK TRANSFER (hamisha kwa agent mwingine) =====
  const quickTransfer=useCallback(async(bid,newPromoCode)=>{
    const b=businesses.find(x=>x.id===bid);if(!b)return;
    await safeUpdate('businesses',{promo_code:newPromoCode||null},'id',bid);
    setBiz(prev=>prev.map(x=>x.id===bid?{...x,promo_code:newPromoCode||null}:x));
    await safeInsert('system_logs',{user_id:user?.id,user_email:user?.email,action:'transfer',details:{text:`${b.name}: agent → ${newPromoCode||'none'}`}});
  },[businesses,user]);

  // ===== DELETE ALL CUSTOMER DATA (GDPR) =====
  const deleteAllCustomerData=useCallback(async(bid)=>{
    const b=businesses.find(x=>x.id===bid);if(!b)return;
    // Delete all related data
    await safeDelete('sales','business_id',bid);
    await safeDelete('products','business_id',bid);
    await safeDelete('expenses','business_id',bid);
    await safeDelete('customers','business_id',bid);
    await safeDelete('credit_transactions','business_id',bid);
    await safeDelete('branches','business_id',bid);
    await safeDelete('support_tickets','business_id',bid);
    await safeDelete('returns','business_id',bid);
    await safeDelete('payment_requests','business_id',bid);
    await safeDelete('notifications','target_id',bid);
    // Delete users of this business
    const bizUsers=employees.filter(e=>e.business_id===bid);
    for(const u of bizUsers){await safeDelete('users','id',u.id)}
    // Delete the business itself
    await safeDelete('businesses','id',bid);
    setBiz(prev=>prev.filter(x=>x.id!==bid));
    await safeInsert('system_logs',{user_id:user?.id,user_email:user?.email,action:'gdpr_delete',details:{text:`GDPR: ${b.name} — data zote zimefutwa`}});
  },[businesses,employees,user]);

  // ===== ACTIVITY FEED (real-time) =====
  const activityFeed=useMemo(()=>{
    const feed=[];
    // Recent logins (last 24h)
    const day=Date.now()-86400000;
    loginLogs.filter(l=>new Date(l.created_at)>new Date(day)).forEach(l=>{
      feed.push({type:'login',icon:'🔑',title:`${l.email} ameingia`,time:l.created_at,color:'#3B82F6'});
    });
    // Recent sales (last 24h)
    sales.filter(s=>new Date(s.created_at)>new Date(day)).forEach(s=>{
      feed.push({type:'sale',icon:'🛒',title:`Mauzo: TZS ${(s.total||0).toLocaleString()} — ${s.seller_name||''}`,time:s.created_at,color:'#22C55E',biz:businesses.find(b=>b.id===s.business_id)?.name});
    });
    // Recent signups (last 7 days)
    businesses.filter(b=>new Date(b.created_at)>new Date(Date.now()-7*86400000)).forEach(b=>{
      feed.push({type:'signup',icon:'🆕',title:`Duka jipya: ${b.name}`,time:b.created_at,color:'#8B5CF6'});
    });
    // Recent payments
    paymentRequests.filter(p=>new Date(p.created_at)>new Date(day)).forEach(p=>{
      feed.push({type:'payment',icon:p.status==='approved'?'✅':p.status==='pending'?'⏳':'❌',title:`Malipo: ${p.business_name} — TZS ${(p.amount||0).toLocaleString()}`,time:p.created_at,color:p.status==='approved'?'#22C55E':p.status==='pending'?'#F59E0B':'#EF4444'});
    });
    // Sort by time (newest first)
    return feed.sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,50);
  },[loginLogs,sales,businesses,paymentRequests]);

  // ===== SYSTEM USAGE STATS =====
  const systemUsage=useMemo(()=>{
    const today=todayStr();const day=Date.now()-86400000;const week=Date.now()-7*86400000;
    const activeToday=new Set(loginLogs.filter(l=>l.created_at?.startsWith(today)).map(l=>l.email)).size;
    const activeWeek=new Set(loginLogs.filter(l=>new Date(l.created_at)>new Date(week)).map(l=>l.email)).size;
    const salesToday=sales.filter(s=>s.created_at?.startsWith(today)).length;
    const salesWeek=sales.filter(s=>new Date(s.created_at)>new Date(week)).length;
    const prodTotal=products.length;
    const custTotal=customers.length;
    // Feature usage (rough estimate)
    const features={
      mauzo:salesToday,
      bidhaa:products.filter(p=>new Date(p.created_at)>new Date(week)).length,
      matumizi:expenses.filter(e=>new Date(e.created_at)>new Date(week)).length,
      wateja:customers.filter(c=>new Date(c.created_at)>new Date(week)).length,
      deni:sales.filter(s=>s.payment_method==='credit'&&new Date(s.created_at)>new Date(week)).length,
      matawi:branches.length,
    };
    const topFeature=Object.entries(features).sort((a,b)=>b[1]-a[1])[0];
    return{activeToday,activeWeek,salesToday,salesWeek,prodTotal,custTotal,features,topFeature:topFeature?{name:topFeature[0],count:topFeature[1]}:null,totalBiz:businesses.length};
  },[loginLogs,sales,products,customers,expenses,branches,businesses]);

  // ===== 2FA STATE =====
  const[twoFACode,setTwoFACode]=useState(null);
  const[twoFAVerified,setTwoFAVerified]=useState(false);
  const generate2FA=useCallback(()=>{
    const code=Math.floor(100000+Math.random()*900000).toString();
    setTwoFACode(code);
    // Send code via email
    sendMail(ADMIN_EMAIL,'🔐 Duka Langu — Code ya Kuingia','welcome',{name:'Admin',businessName:`Code yako ni: ${code}. Itaisha baada ya dakika 5.`});
    return code;
  },[]);
  const verify2FA=useCallback((input)=>{
    if(input===twoFACode){setTwoFAVerified(true);return true}
    return false;
  },[twoFACode]);

  // ===== TRIAL/SUBSCRIPTION =====
  const isExpired=useCallback(()=>{if(!biz)return false;if(biz.is_suspended)return true;if(biz.token_active){if(biz.token_expiry&&new Date(biz.token_expiry)>new Date())return false;if(!biz.token_expiry)return false;return true}if(biz.trial_end)return new Date()>new Date(biz.trial_end);return false},[biz]);
  const daysLeft=useCallback(()=>{if(!biz)return 0;const end=biz.token_active?biz.token_expiry:biz.trial_end;if(!end)return 999;return Math.max(0,Math.ceil((new Date(end)-new Date())/86400000))},[biz]);

  // ===== STOCK ALERTS + AUTO-REORDER LIST + PROFIT MARGIN ALERTS =====
  const lowStockProducts=useMemo(()=>products.filter(p=>p.quantity<=p.min_stock&&p.business_id===bizId),[products,bizId]);
  const autoReorderList=useMemo(()=>lowStockProducts.map(p=>({...p,suggestedQty:Math.max(p.min_stock*3,10)-p.quantity})),[lowStockProducts]);
  const lowMarginProducts=useMemo(()=>products.filter(p=>{if(!p.buy_price||!p.sell_price)return false;const margin=((p.sell_price-p.buy_price)/p.sell_price)*100;return margin<15&&p.business_id===bizId}).map(p=>({...p,margin:((p.sell_price-p.buy_price)/p.sell_price*100).toFixed(1)})),[products,bizId]);

  // Stock notification effect
  useEffect(()=>{
    if(!bizId||!products.length)return;
    lowStockProducts.forEach(async(p)=>{
      if(notifications.find(n=>n.title?.includes(p.name)&&n.target_id===bizId))return;
      const isDanger=p.quantity===0;
      const n={id:genId(),target_type:'business',target_id:bizId,type:isDanger?'danger':'warning',title:isDanger?`${p.image} ${p.name} IMEISHA!`:`${p.image} ${p.name} Inakaribia Kuisha!`,message:isDanger?`${p.name} imeisha kabisa.`:`${p.name} imebaki ${p.quantity}. (Min: ${p.min_stock})`,created_at:nowISO(),is_read:false};
      setNotifs(prev=>[n,...prev]);setPopups(prev=>[n,...prev]);
      await safeInsert('notifications',{target_type:n.target_type,target_id:n.target_id,type:n.type,title:n.title,message:n.message});
    });
  },[products,bizId]);// eslint-disable-line

  // ===== DAILY AUTO REPORT (generates summary) =====
  const getDailyReport=useCallback(()=>{
    const today=todayStr();
    const tSales=sales.filter(s=>s.created_at?.startsWith(today));
    const tExp=expenses.filter(e=>e.created_at?.startsWith(today));
    return{date:today,totalSales:tSales.reduce((a,s)=>a+s.total,0),totalProfit:tSales.reduce((a,s)=>a+s.profit,0),totalExpenses:tExp.reduce((a,e)=>a+(e.amount||0),0),salesCount:tSales.length,topItems:tSales.flatMap(s=>s.items||[]).reduce((a,i)=>{a[i.name]=(a[i.name]||0)+i.qty;return a},{}),lowStock:lowStockProducts.length};
  },[sales,expenses,lowStockProducts]);

  // Weekly Report
  const getWeeklyReport=useCallback(()=>{
    const now=new Date();const weekStart=new Date(now);weekStart.setDate(now.getDate()-now.getDay());
    const prevWeekStart=new Date(weekStart);prevWeekStart.setDate(prevWeekStart.getDate()-7);
    const wSales=sales.filter(s=>new Date(s.created_at)>=weekStart);
    const pwSales=sales.filter(s=>{const d=new Date(s.created_at);return d>=prevWeekStart&&d<weekStart});
    const wExp=expenses.filter(e=>new Date(e.created_at)>=weekStart);
    const wTotal=wSales.reduce((a,s)=>a+s.total,0);const pwTotal=pwSales.reduce((a,s)=>a+s.total,0);
    const wProfit=wSales.reduce((a,s)=>a+s.profit,0);const pwProfit=pwSales.reduce((a,s)=>a+s.profit,0);
    const wExpTotal=wExp.reduce((a,e)=>a+(e.amount||0),0);
    const salesChange=pwTotal>0?Math.round((wTotal-pwTotal)/pwTotal*100):0;
    const profitChange=pwProfit>0?Math.round((wProfit-pwProfit)/pwProfit*100):0;
    // Top items this week
    const itemMap={};wSales.forEach(s=>s.items?.forEach(i=>{itemMap[i.name]=(itemMap[i.name]||0)+i.qty}));
    const topItems=Object.entries(itemMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
    // By day
    const dayData=[];for(let i=0;i<7;i++){const d=new Date(weekStart);d.setDate(d.getDate()+i);const ds=d.toISOString().split('T')[0];
      dayData.push({day:d.toLocaleDateString('sw',{weekday:'short'}),sales:sales.filter(s=>s.created_at?.startsWith(ds)).reduce((a,s)=>a+s.total,0)});
    }
    return{totalSales:wTotal,prevTotalSales:pwTotal,salesChange,totalProfit:wProfit,prevProfit:pwProfit,profitChange,
      totalExpenses:wExpTotal,netProfit:wProfit-wExpTotal,salesCount:wSales.length,topItems,dayData,newCustomers:customers.filter(c=>new Date(c.created_at)>=weekStart).length};
  },[sales,expenses,customers]);

  // Monthly Report
  const getMonthlyReport=useCallback(()=>{
    const now=new Date();const thisMonth=now.toISOString().slice(0,7);
    const prevDate=new Date(now.getFullYear(),now.getMonth()-1,1);const prevMonth=prevDate.toISOString().slice(0,7);
    const mSales=sales.filter(s=>s.created_at?.startsWith(thisMonth));
    const pmSales=sales.filter(s=>s.created_at?.startsWith(prevMonth));
    const mExp=expenses.filter(e=>e.created_at?.startsWith(thisMonth));
    const pmExp=expenses.filter(e=>e.created_at?.startsWith(prevMonth));
    const mTotal=mSales.reduce((a,s)=>a+s.total,0);const pmTotal=pmSales.reduce((a,s)=>a+s.total,0);
    const mProfit=mSales.reduce((a,s)=>a+s.profit,0);const pmProfit=pmSales.reduce((a,s)=>a+s.profit,0);
    const mExpTotal=mExp.reduce((a,e)=>a+(e.amount||0),0);const pmExpTotal=pmExp.reduce((a,e)=>a+(e.amount||0),0);
    const salesChange=pmTotal>0?Math.round((mTotal-pmTotal)/pmTotal*100):0;
    const profitChange=pmProfit>0?Math.round((mProfit-pmProfit)/pmProfit*100):0;
    const expenseChange=pmExpTotal>0?Math.round((mExpTotal-pmExpTotal)/pmExpTotal*100):0;
    return{totalSales:mTotal,prevSales:pmTotal,salesChange,totalProfit:mProfit,prevProfit:pmProfit,profitChange,
      totalExpenses:mExpTotal,prevExpenses:pmExpTotal,expenseChange,netProfit:mProfit-mExpTotal,prevNetProfit:pmProfit-pmExpTotal,
      salesCount:mSales.length,prevSalesCount:pmSales.length,newCustomers:customers.filter(c=>c.created_at?.startsWith(thisMonth)).length,
      totalDebt:customers.reduce((a,c)=>a+(c.credit_balance||0),0),inventoryValue:products.reduce((a,p)=>a+p.quantity*(p.buy_price||0),0)};
  },[sales,expenses,customers,products]);

  // ===== CHURN DETECTION (for admin) =====
  const churnRisk=useMemo(()=>{
    const now=Date.now();
    return businesses.filter(b=>{
      const lastSale=sales.filter(s=>s.business_id===b.id).sort((a,c)=>new Date(c.created_at)-new Date(a.created_at))[0];
      if(!lastSale)return true;
      const daysSince=Math.floor((now-new Date(lastSale.created_at).getTime())/86400000);
      return daysSince>7;
    }).map(b=>{
      const lastSale=sales.filter(s=>s.business_id===b.id).sort((a,c)=>new Date(c.created_at)-new Date(a.created_at))[0];
      const daysSince=lastSale?Math.floor((Date.now()-new Date(lastSale.created_at).getTime())/86400000):999;
      return{...b,daysSince,risk:daysSince>30?'high':daysSince>14?'medium':'low'};
    });
  },[businesses,sales]);

  // ===== AUTO INVOICE (businesses expiring in 7 days) =====
  const expiringBiz=useMemo(()=>{
    return businesses.filter(b=>{
      const end=b.token_active?b.token_expiry:b.trial_end;
      if(!end)return false;
      const daysLeft=Math.ceil((new Date(end)-new Date())/86400000);
      return daysLeft>0&&daysLeft<=7;
    }).map(b=>{
      const end=b.token_active?b.token_expiry:b.trial_end;
      return{...b,daysRemaining:Math.ceil((new Date(end)-new Date())/86400000)};
    });
  },[businesses]);

  // ===== AGENT LEADERBOARD =====
  // Agent tier definitions
  const AGENT_TIERS=[
    {min:51,name:'Shujaa',emoji:'👑',color:'#F59E0B',bonus:650000},
    {min:36,name:'Bingwa',emoji:'💎',color:'#8B5CF6',bonus:400000},
    {min:21,name:'Hodari',emoji:'🥇',color:'#0B7A3B',bonus:250000},
    {min:11,name:'Wastani',emoji:'🥈',color:'#3B82F6',bonus:130000},
    {min:5,name:'Mwanzo',emoji:'🥉',color:'#64748B',bonus:50000},
    {min:0,name:'Bado',emoji:'⏳',color:'#94A3B8',bonus:0},
  ];
  const getAgentTier=(activeCount)=>AGENT_TIERS.find(t=>activeCount>=t.min)||AGENT_TIERS[AGENT_TIERS.length-1];

  const agentLeaderboard=useMemo(()=>{
    return promoCodes.map(p=>{
      const clients=businesses.filter(b=>b.promo_code===p.code);
      const activeClients=clients.filter(b=>b.token_active);
      const revenue=activeClients.length*parseInt(settings.system_price||15000);
      const commission=revenue*(p.commission_rate||10)/100;
      const tier=getAgentTier(activeClients.length);
      const nextTier=AGENT_TIERS[AGENT_TIERS.indexOf(tier)-1];
      const toNextTier=nextTier?nextTier.min-activeClients.length:0;
      return{...p,clients:clients.length,activeClients:activeClients.length,revenue,commission,tier,nextTier,toNextTier};
    }).sort((a,b)=>b.activeClients-a.activeClients);
  },[promoCodes,businesses,settings.system_price]);

  useEffect(()=>{if(!popups.length)return;const t=setTimeout(()=>setPopups(p=>p.slice(0,-1)),6000);return()=>clearTimeout(t)},[popups]);

  // ===== PROFIT GOALS =====
  const saveGoal=useCallback(async(type,amount)=>{
    const key=`goal_${type}_${bizId}`;
    await safeUpsert('system_settings',{key,value:String(amount),updated_at:nowISO()},'key');
    setSettings(prev=>({...prev,[key]:String(amount)}));
  },[bizId]);
  const getGoal=useCallback((type)=>{
    const key=`goal_${type}_${bizId}`;
    return parseInt(settings[key])||0;
  },[settings,bizId]);
  const goalProgress=useMemo(()=>{
    const today=todayStr();
    const dayProfit=sales.filter(s=>s.created_at?.startsWith(today)).reduce((a,s)=>a+s.profit,0);
    const weekStart=new Date();weekStart.setDate(weekStart.getDate()-weekStart.getDay());
    const weekProfit=sales.filter(s=>new Date(s.created_at)>=weekStart).reduce((a,s)=>a+s.profit,0);
    const monthProfit=sales.filter(s=>s.created_at?.startsWith(today.slice(0,7))).reduce((a,s)=>a+s.profit,0);
    return{
      daily:{current:dayProfit,goal:getGoal('daily'),pct:getGoal('daily')?Math.min(100,Math.round(dayProfit/getGoal('daily')*100)):0},
      weekly:{current:weekProfit,goal:getGoal('weekly'),pct:getGoal('weekly')?Math.min(100,Math.round(weekProfit/getGoal('weekly')*100)):0},
      monthly:{current:monthProfit,goal:getGoal('monthly'),pct:getGoal('monthly')?Math.min(100,Math.round(monthProfit/getGoal('monthly')*100)):0},
    };
  },[sales,getGoal]);

  // ===== AI SMART INSIGHTS =====
  const aiInsights=useMemo(()=>{
    if(!sales.length)return[];
    const insights=[];
    const today=todayStr();
    const todaySales=sales.filter(s=>s.created_at?.startsWith(today));
    const yesterdayDate=new Date();yesterdayDate.setDate(yesterdayDate.getDate()-1);
    const yesterday=yesterdayDate.toISOString().split('T')[0];
    const yesterdaySales=sales.filter(s=>s.created_at?.startsWith(yesterday));
    const tTotal=todaySales.reduce((a,s)=>a+s.total,0);
    const yTotal=yesterdaySales.reduce((a,s)=>a+s.total,0);

    // Trend: today vs yesterday
    if(yTotal>0){
      const change=((tTotal-yTotal)/yTotal*100).toFixed(0);
      if(+change>10)insights.push({type:'success',icon:'📈',title:'Mauzo yanakua!',desc:`Leo +${change}% kuliko jana. Endelea hivyo!`});
      else if(+change<-10)insights.push({type:'warning',icon:'📉',title:'Mauzo yameshuka',desc:`Leo ${change}% kuliko jana. Angalia sababu.`});
    }

    // Best selling day of the week
    const dayMap={0:'Jumapili',1:'Jumatatu',2:'Jumanne',3:'Jumatano',4:'Alhamisi',5:'Ijumaa',6:'Jumamosi'};
    const daySales={};
    sales.forEach(s=>{const d=new Date(s.created_at).getDay();daySales[d]=(daySales[d]||0)+s.total});
    const bestDay=Object.entries(daySales).sort((a,b)=>b[1]-a[1])[0];
    if(bestDay)insights.push({type:'info',icon:'🏆',title:`Siku bora: ${dayMap[bestDay[0]]}`,desc:`Mauzo mengi zaidi yanafanyika ${dayMap[bestDay[0]]}. Hakikisha una stock ya kutosha!`});

    // Top product suggestion
    const prodMap={};
    sales.slice(0,50).forEach(s=>s.items?.forEach(i=>{prodMap[i.name]=(prodMap[i.name]||0)+i.qty}));
    const topProd=Object.entries(prodMap).sort((a,b)=>b[1]-a[1])[0];
    if(topProd)insights.push({type:'success',icon:'⭐',title:`${topProd[0]} inauza zaidi`,desc:`Bidhaa hii ndiyo inayouza zaidi (x${topProd[1]}). Agiza zaidi na usiishe!`});

    // Slow moving products
    const recentProds=new Set();
    sales.slice(0,100).forEach(s=>s.items?.forEach(i=>recentProds.add(i.name)));
    const slowProds=products.filter(p=>!recentProds.has(p.name)&&p.quantity>0&&p.business_id===bizId);
    if(slowProds.length>0)insights.push({type:'warning',icon:'🐢',title:`Bidhaa ${slowProds.length} zinasimama`,desc:`${slowProds.slice(0,3).map(p=>p.name).join(', ')} hazijauza hivi karibuni. Fikiria kupunguza bei.`});

    // Profit margin analysis
    if(lowMarginProducts.length>0)insights.push({type:'danger',icon:'⚠️',title:`Bidhaa ${lowMarginProducts.length} zina faida ndogo`,desc:`${lowMarginProducts.slice(0,2).map(p=>`${p.name} (${p.margin}%)`).join(', ')}. Ongeza bei au tafuta supplier mpya.`});

    // Stock alert
    if(lowStockProducts.length>0)insights.push({type:'danger',icon:'📦',title:`Bidhaa ${lowStockProducts.length} zinaisha`,desc:`Agiza haraka: ${lowStockProducts.slice(0,3).map(p=>p.name).join(', ')}.`});

    // Average sale value
    if(sales.length>=10){
      const avg=sales.slice(0,30).reduce((a,s)=>a+s.total,0)/Math.min(30,sales.length);
      insights.push({type:'info',icon:'💰',title:`Wastani wa mauzo: TZS ${Math.round(avg).toLocaleString()}`,desc:`Kila mteja ananunua wastani wa TZS ${Math.round(avg).toLocaleString()}. Jaribu upselling!`});
    }

    return insights.slice(0,6);
  },[sales,products,bizId,lowMarginProducts,lowStockProducts]);

  const myNotifs=user?.role==='admin'||user?.role==='marketing'?notifications.filter(n=>n.target_type==='admin'||n.target_type==='broadcast'||n.target_type==='marketing'):notifications.filter(n=>(n.target_type==='business'&&n.target_id===bizId)||n.target_type==='broadcast');

  return <Ctx.Provider value={{
    user,loading,online,lang,setLang,currency,setCurrency,biz,bizId,businesses,
    branches,activeBranch,setActiveBranch,branchProducts,branchSales,branchExpenses,
    products,sales,expenses,customers,employees,tokens,promoCodes,notifications:myNotifs,
    stockHistory,loginLogs,settings,popups,setPopups,systemLogs,tickets,returns,creditHistory,totalDebt,
    paymentRequests,pendingPayments,myLatestPayment,overdueCustomers,overdueTotal,debtAging,
    // Auth
    login,signup,logout,forgotPassword,
    // CRUD
    addProduct,updateProduct,deleteProduct,completeSale,processReturn,creditSale,receivePayment:receivePaymentWithAlert,setCreditLimit,
    addExpense,addCustomer,updateCustomer,deleteCustomer,addEmployee,updateEmployee,deleteEmployee,
    addBranch,updateBranch,deleteBranch,getBranches,
    // Tickets
    createTicket,replyTicket,closeTicket,
    // Tokens & Promo & Payments
    genToken,activateToken,addPromo,deletePromo,createAgent,registerCustomerByAgent,submitPayment,approvePayment,rejectPayment,supabase,systemExpenses,
    // Notifications
    addNotif,broadcastNotif,markRead,markAllRead,
    // Settings & Admin
    updateSetting,suspendBiz,deleteBiz,updateBiz,exportAllData,
    quickExtend,quickUpgrade,quickTransfer,deleteAllCustomerData,activityFeed,systemUsage,
    generate2FA,verify2FA,twoFAVerified,setTwoFAVerified,
    createPartner,updatePartner,deletePartner,partners,marketingStats,
    campaigns,addCampaign,updateCampaign,deleteCampaign,
    sendMessage,markMsgRead,myMessages,unreadMsgs,
    followups,addFollowup,completeFollowup,todayFollowups,
    testimonials,addTestimonial,deleteTestimonial,
    // Computed
    isExpired,daysLeft,loadData,lowStockProducts,autoReorderList,lowMarginProducts,
    otpPending,otpSending,sendOTP,verifyOTP,cancelOTP,
    getDailyReport,getWeeklyReport,getMonthlyReport,churnRisk,expiringBiz,agentLeaderboard,canUseBranches,isEmployeeLocked,maxBranches,AGENT_TIERS,
    saveGoal,getGoal,goalProgress,aiInsights,
  }}>{children}</Ctx.Provider>;
}

export const useApp=()=>{const c=useContext(Ctx);if(!c)throw new Error('useApp outside provider');return c};
