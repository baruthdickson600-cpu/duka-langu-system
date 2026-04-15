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
  const[settings,setSettings]=useState({system_price:'30000',trial_days:'5',payment_number:'6113 4066',payment_name:'PESAFLY',payment_provider:'SELCOM',sms_enabled:'false',maintenance_mode:'false',branch_enabled:'true',announcement:'',announcement_type:'info'});
  const[popups,setPopups]=useState([]);
  const[systemLogs,setSysLogs]=useState([]);
  const[tickets,setTickets]=useState([]);
  const[returns,setReturns]=useState([]);

  const biz=user?.role==='office'?businesses.find(b=>b.owner_id===user.id):user?.role==='employee'?businesses.find(b=>b.id===user.business_id):null;
  const bizId=biz?.id;

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
      }
      if(role==='admin'){
        const sl=await safeSelect('system_logs',{order:{col:'created_at'},limit:200});setSysLogs(sl);
        const tk=await safeSelect('support_tickets',{order:{col:'created_at'},limit:200});setTickets(tk);
      }
    }catch(e){console.error('Load:',e)}
  },[]);

  // ===== AUTH =====
  const login=useCallback(async(email,password)=>{
    setLoading(true);
    if(email===ADMIN_EMAIL&&password===ADMIN_PASS){
      const u={id:'00000000-0000-0000-0000-000000000001',email,name:'PesaFly Admin',role:'admin'};
      setUser(u);
      safeInsert('login_logs',{user_id:u.id,email,action:'login',device_info:navigator.userAgent}).catch(()=>{});
      await loadData(u.id,'admin',null);setLoading(false);return null;
    }
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error){setLoading(false);return error.message}
      const{data:uData}=await supabase.from('users').select('*').eq('email',email).single();
      if(uData){
        if(!uData.is_active){setLoading(false);return'Akaunti yako imesimamishwa.'}
        const ub=uData.business_id?(await supabase.from('businesses').select('*').eq('id',uData.business_id).single()):null;
        if(ub?.data?.is_suspended){setLoading(false);return'Biashara yako imesimamishwa. Wasiliana na admin.'}
        setUser(uData);await safeUpdate('users',{last_login:nowISO()},'id',uData.id);
        safeInsert('login_logs',{user_id:uData.id,email,action:'login',device_info:navigator.userAgent}).catch(()=>{});
        await loadData(uData.id,uData.role,uData.business_id);
        // Employee: auto-set branch
        if(uData.role==='employee'&&uData.branch_id){setActiveBranch(uData.branch_id)}
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
    const subtotal=cart.reduce((s,c)=>s+c.qty*c.price,0);const total=Math.max(0,subtotal-discount);
    const profit=cart.reduce((s,c)=>s+c.qty*(c.price-c.buyPrice),0)-discount;
    const sd={business_id:bizId,branch_id:activeBranch||null,seller_id:user?.id,seller_name:user?.name,items:cart,subtotal,discount,total,profit,payment_method:payMethod,payment_details:payDetails,customer_id:custId,customer_name:custName,is_synced:online};
    const saved=await safeInsert('sales',sd);const final=saved||{...sd,id:genId(),created_at:nowISO()};
    setSales(prev=>[final,...prev]);
    for(const item of cart){
      const prod=products.find(p=>p.id===item.productId);
      if(prod){const nq=Math.max(0,prod.quantity-item.qty);await safeUpdate('products',{quantity:nq},'id',item.productId);
        await safeInsert('stock_history',{product_id:item.productId,business_id:bizId,change_type:'sale',quantity_before:prod.quantity,quantity_change:-item.qty,quantity_after:nq,user_id:user?.id});
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

  // ===== CREDIT / DEBT MANAGEMENT =====
  const[creditHistory,setCreditHist]=useState([]);
  
  // Uza kwa deni (credit sale)
  const creditSale=useCallback(async(cart,custId,discount=0)=>{
    if(!bizId||!cart.length||!custId)return null;
    const subtotal=cart.reduce((s,c)=>s+c.qty*c.price,0);const total=Math.max(0,subtotal-discount);
    const profit=cart.reduce((s,c)=>s+c.qty*(c.price-c.buyPrice),0)-discount;
    // Create sale with credit payment method
    const sd={business_id:bizId,branch_id:activeBranch||null,seller_id:user?.id,seller_name:user?.name,items:cart,subtotal,discount,total,profit,payment_method:'credit',customer_id:custId,is_synced:online};
    const saved=await safeInsert('sales',sd);const final=saved||{...sd,id:genId(),created_at:nowISO()};
    setSales(prev=>[final,...prev]);
    // Update stock
    for(const item of cart){
      const prod=products.find(p=>p.id===item.productId);
      if(prod){const nq=Math.max(0,prod.quantity-item.qty);await safeUpdate('products',{quantity:nq},'id',item.productId);setProds(prev=>prev.map(p=>p.id===item.productId?{...p,quantity:nq}:p))}
    }
    // Add credit to customer
    const cust=customers.find(c=>c.id===custId);
    const newBal=(cust?.credit_balance||0)+total;
    const newSpent=(cust?.total_spent||0)+total;
    await safeUpdate('customers',{credit_balance:newBal,total_spent:newSpent},'id',custId);
    setCust(prev=>prev.map(c=>c.id===custId?{...c,credit_balance:newBal,total_spent:newSpent}:c));
    // Record credit transaction
    const tx={customer_id:custId,business_id:bizId,sale_id:final.id,amount:total,type:'credit',note:`Mauzo ya deni - ${cart.map(i=>i.name).join(', ')}`};
    const txSaved=await safeInsert('credit_transactions',tx);
    setCreditHist(prev=>[txSaved||{...tx,id:genId(),created_at:nowISO()},...prev]);
    return final;
  },[bizId,activeBranch,user,online,products,customers]);

  // Pokea malipo ya deni
  const receivePayment=useCallback(async(custId,amount,note='')=>{
    if(!bizId||!custId||!amount)return null;
    const cust=customers.find(c=>c.id===custId);if(!cust)return null;
    const newBal=Math.max(0,(cust.credit_balance||0)-amount);
    await safeUpdate('customers',{credit_balance:newBal},'id',custId);
    setCust(prev=>prev.map(c=>c.id===custId?{...c,credit_balance:newBal}:c));
    const tx={customer_id:custId,business_id:bizId,amount,type:'payment',note:note||`Malipo ya deni - TZS ${amount.toLocaleString()}`};
    const txSaved=await safeInsert('credit_transactions',tx);
    setCreditHist(prev=>[txSaved||{...tx,id:genId(),created_at:nowISO()},...prev]);
    return{newBalance:newBal};
  },[bizId,customers]);

  // Total debt across all customers
  const totalDebt=useMemo(()=>customers.reduce((a,c)=>a+(c.credit_balance||0),0),[customers]);

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
  const genToken=useCallback(async(days,plan='basic')=>{const code='TK-'+Math.random().toString(36).substr(2,8).toUpperCase();const d=await safeInsert('tokens',{code,days:parseInt(days),plan,created_by:user?.id});setTokens(prev=>[d||{id:genId(),code,days:parseInt(days),plan,used:false,created_at:nowISO()},...prev]);return code},[user]);
  const activateToken=useCallback(async(code)=>{const tk=tokens.find(t=>t.code===code&&!t.used);if(!tk)return'Token si sahihi au imetumika!';if(!bizId)return'Biashara haijapatikana!';const exp=new Date(Date.now()+tk.days*86400000).toISOString();await safeUpdate('tokens',{used:true,used_by:bizId,used_at:nowISO()},'id',tk.id);await safeUpdate('businesses',{token_active:true,token_expiry:exp,plan:tk.plan||'basic',is_suspended:false},'id',bizId);setTokens(prev=>prev.map(t=>t.id===tk.id?{...t,used:true}:t));setBiz(prev=>prev.map(b=>b.id===bizId?{...b,token_active:true,token_expiry:exp,is_suspended:false}:b));return null},[tokens,bizId]);

  // ===== PROMO =====
  const addPromo=useCallback(async(agent,phone,commission=10)=>{const code='PROMO-'+Math.random().toString(36).substr(2,6).toUpperCase();const d=await safeInsert('promo_codes',{code,agent_name:agent,agent_phone:phone,commission_rate:commission});setPromos(prev=>[...prev,d||{id:genId(),code,agent_name:agent,agent_phone:phone,commission_rate:commission,used_count:0,total_earned:0}]);return code},[]);

  // ===== NOTIFICATIONS =====
  const addNotif=useCallback(async(tt,tid,type,title,msg)=>{const d=await safeInsert('notifications',{target_type:tt,target_id:tid,type,title,message:msg});const n=d||{id:genId(),target_type:tt,target_id:tid,type,title,message:msg,created_at:nowISO(),is_read:false};setNotifs(prev=>[n,...prev]);return n},[]);
  const broadcastNotif=useCallback(async(type,title,msg)=>{await safeInsert('notifications',{target_type:'broadcast',type,title,message:msg});setNotifs(prev=>[{id:genId(),target_type:'broadcast',type,title,message:msg,created_at:nowISO(),is_read:false},...prev])},[]);
  const markRead=useCallback(async(nid)=>{await safeUpdate('notifications',{is_read:true},'id',nid);setNotifs(prev=>prev.map(n=>n.id===nid?{...n,is_read:true}:n))},[]);
  const markAllRead=useCallback(async()=>{for(const n of notifications.filter(n=>!n.is_read)){await safeUpdate('notifications',{is_read:true},'id',n.id)}setNotifs(prev=>prev.map(n=>({...n,is_read:true})))},[notifications]);

  // ===== SETTINGS =====
  const updateSetting=useCallback(async(key,val)=>{await safeUpsert('system_settings',{key,value:val,updated_at:nowISO()},'key');setSettings(prev=>({...prev,[key]:val}))},[]);

  // ===== ADMIN ACTIONS =====
  const suspendBiz=useCallback(async(bid,suspend)=>{await safeUpdate('businesses',{is_suspended:suspend},'id',bid);setBiz(prev=>prev.map(b=>b.id===bid?{...b,is_suspended:suspend}:b));await safeInsert('system_logs',{user_id:user?.id,user_email:user?.email,action:suspend?'suspend':'activate',details:{text:'Biz '+bid}})},[user]);
  const deleteBiz=useCallback(async(bid)=>{await safeDelete('businesses','id',bid);setBiz(prev=>prev.filter(b=>b.id!==bid))},[]);

  // ===== EXPORT ALL DATA =====
  const exportAllData=useCallback(()=>{
    const data={businesses,products,sales,expenses,customers,employees,tokens,promoCodes,branches,tickets,returns,exportDate:nowISO()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`duka-langu-export-${todayStr()}.json`;a.click();URL.revokeObjectURL(url);
  },[businesses,products,sales,expenses,customers,employees,tokens,promoCodes,branches,tickets,returns]);

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
  const agentLeaderboard=useMemo(()=>{
    return promoCodes.map(p=>{
      const clients=businesses.filter(b=>b.promo_code===p.code);
      const activeClients=clients.filter(b=>b.token_active);
      const revenue=activeClients.length*parseInt(settings.system_price||30000);
      const commission=revenue*(p.commission_rate||10)/100;
      return{...p,clients:clients.length,activeClients:activeClients.length,revenue,commission};
    }).sort((a,b)=>b.clients-a.clients);
  },[promoCodes,businesses,settings.system_price]);

  useEffect(()=>{if(!popups.length)return;const t=setTimeout(()=>setPopups(p=>p.slice(0,-1)),6000);return()=>clearTimeout(t)},[popups]);

  const myNotifs=user?.role==='admin'?notifications.filter(n=>n.target_type==='admin'||n.target_type==='broadcast'):notifications.filter(n=>(n.target_type==='business'&&n.target_id===bizId)||n.target_type==='broadcast');

  return <Ctx.Provider value={{
    user,loading,online,lang,setLang,currency,setCurrency,biz,bizId,businesses,
    branches,activeBranch,setActiveBranch,branchProducts,branchSales,branchExpenses,
    products,sales,expenses,customers,employees,tokens,promoCodes,notifications:myNotifs,
    stockHistory,loginLogs,settings,popups,setPopups,systemLogs,tickets,returns,creditHistory,totalDebt,
    // Auth
    login,signup,logout,forgotPassword,
    // CRUD
    addProduct,updateProduct,deleteProduct,completeSale,processReturn,creditSale,receivePayment,
    addExpense,addCustomer,updateCustomer,deleteCustomer,addEmployee,updateEmployee,deleteEmployee,
    addBranch,updateBranch,deleteBranch,getBranches,
    // Tickets
    createTicket,replyTicket,closeTicket,
    // Tokens & Promo
    genToken,activateToken,addPromo,
    // Notifications
    addNotif,broadcastNotif,markRead,markAllRead,
    // Settings & Admin
    updateSetting,suspendBiz,deleteBiz,exportAllData,
    // Computed
    isExpired,daysLeft,loadData,lowStockProducts,autoReorderList,lowMarginProducts,
    getDailyReport,churnRisk,expiringBiz,agentLeaderboard,canUseBranches,isEmployeeLocked,maxBranches,
  }}>{children}</Ctx.Provider>;
}

export const useApp=()=>{const c=useContext(Ctx);if(!c)throw new Error('useApp outside provider');return c};
