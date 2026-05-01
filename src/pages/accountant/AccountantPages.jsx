import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Stat,Badge,Empty,Input,Sel,Btn,Modal} from '../../components/UI';

const fmtDate=d=>d?new Date(d).toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'}):'—';
const fm=n=>`TZS ${(+n||0).toLocaleString()}`;

// ===== 1. DASHBOARD (Features 1-5) =====
export function AccountantDashboard(){
  const{paymentRequests,businesses,tokens,partners,systemExpenses=[]}=useApp();
  const ap=paymentRequests.filter(p=>p.status==='approved');
  const pd=paymentRequests.filter(p=>p.status==='pending');
  const rj=paymentRequests.filter(p=>p.status==='rejected');
  const totalRev=ap.reduce((a,p)=>a+(p.amount||0),0);
  const today=new Date().toISOString().split('T')[0];
  const weekAgo=new Date(Date.now()-7*86400000).toISOString();
  const ms=today.slice(0,7);
  const todayRev=ap.filter(p=>p.created_at?.startsWith(today)).reduce((a,p)=>a+(p.amount||0),0);
  const weekRev=ap.filter(p=>p.created_at>=weekAgo).reduce((a,p)=>a+(p.amount||0),0);
  const monthRev=ap.filter(p=>p.created_at?.startsWith(ms)).reduce((a,p)=>a+(p.amount||0),0);
  const ac=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const tr=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const su=businesses.filter(b=>b.is_suspended);
  const expected=ac.length*15000;
  const colRate=expected>0?Math.round(monthRev/expected*100):0;
  const totalExp=(systemExpenses||[]).filter(e=>e.date?.startsWith(ms)).reduce((a,e)=>a+(e.amount||0),0);

  // Monthly chart data
  const mm={};ap.forEach(p=>{const m=p.created_at?.slice(0,7);if(m)mm[m]=(mm[m]||0)+(p.amount||0)});
  const months=Object.entries(mm).sort().slice(-6);
  const maxM=Math.max(...months.map(d=>d[1]),1);

  // Partner revenue
  const pm={};ap.forEach(p=>{const tk=tokens.find(t=>t.code===p.token_code);const n=tk?.assigned_name||'Admin';pm[n]=(pm[n]||0)+(p.amount||0)});

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 4px'}}>🧮 Muhasibu — Dashboard</h3>
    <p style={{fontSize:12,color:'#64748B',margin:'0 0 14px'}}>Hali ya fedha — {new Date().toLocaleDateString('sw-TZ')}</p>
    {/* F1: Mapato Jumla */}
    <div className="flex-wrap" style={{marginBottom:10}}>
      <Stat icon={IC.dollar} label="Mapato Jumla" value={fm(totalRev)} color="#0B7A3B" sub="tangu kuanza"/>
      {/* F2: Mwezi/Wiki/Leo */}
      <Stat icon={IC.dollar} label="Mwezi Huu" value={fm(monthRev)} color="#3B82F6"/>
      <Stat icon={IC.dollar} label="Wiki Hii" value={fm(weekRev)} color="#8B5CF6"/>
      <Stat icon={IC.dollar} label="Leo" value={fm(todayRev)} color="#22C55E"/>
    </div>
    <div className="flex-wrap" style={{marginBottom:14}}>
      {/* F3: Collection Rate */}
      <Stat icon={IC.chart} label="Collection Rate" value={`${colRate}%`} color={colRate>=80?'#22C55E':colRate>=50?'#F59E0B':'#EF4444'} sub={`${fm(monthRev)} / ${fm(expected)}`}/>
      {/* F4: Wateja */}
      <Stat icon={IC.ok} label="Active" value={ac.length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Trial" value={tr.length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Suspended" value={su.length} color="#EF4444"/>
    </div>
    {/* P&L Summary */}
    <div className="card" style={{marginBottom:14,background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',border:'1px solid #BBF7D0'}}>
      <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div style={{textAlign:'center',flex:1}}><div style={{fontSize:11,color:'#15803D',fontWeight:600}}>MAPATO (Mwezi)</div><div style={{fontSize:22,fontWeight:900,color:'#0B7A3B'}}>{fm(monthRev)}</div></div>
        <div style={{textAlign:'center',flex:1}}><div style={{fontSize:11,color:'#B91C1C',fontWeight:600}}>MATUMIZI</div><div style={{fontSize:22,fontWeight:900,color:'#EF4444'}}>{fm(totalExp)}</div></div>
        <div style={{textAlign:'center',flex:1}}><div style={{fontSize:11,color:monthRev-totalExp>=0?'#15803D':'#B91C1C',fontWeight:600}}>FAIDA HALISI</div><div style={{fontSize:22,fontWeight:900,color:monthRev-totalExp>=0?'#0B7A3B':'#EF4444'}}>{fm(monthRev-totalExp)}</div></div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      {/* F5: Chart ya Mwezi */}
      {months.length>0&&<div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📊 Mapato kwa Mwezi</h3>
        {months.map(([m,a])=><div key={m} style={{padding:'4px 0',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:55,fontSize:11,fontWeight:600,color:'#64748B'}}>{m}</span>
          <div style={{flex:1,background:'#F1F5F9',borderRadius:6,height:20,overflow:'hidden'}}><div style={{width:(a/maxM*100)+'%',height:'100%',background:'linear-gradient(90deg,#0B7A3B,#22C55E)',borderRadius:6}}/></div>
          <span style={{fontWeight:700,fontSize:11,color:'#0B7A3B',minWidth:85,textAlign:'right'}}>{fm(a)}</span>
        </div>)}
      </div>}
      {/* Partner Revenue */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Mapato kwa Chaneli</h3>
        {Object.entries(pm).filter(([,a])=>a>0).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'5px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <span style={{fontWeight:600}}>{n}</span>
          <span style={{fontWeight:800,color:'#0B7A3B'}}>{fm(a)} <span style={{color:'#94A3B8',fontWeight:400}}>({totalRev?Math.round(a/totalRev*100):0}%)</span></span>
        </div>)}
        {!Object.keys(pm).length&&<Empty icon="📋" text="Hakuna"/>}
      </div>
      {/* Pending */}
      <div className="card" style={{border:pd.length?'2px solid #FED7AA':''}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px',color:'#F59E0B'}}>⏳ Yanasubiri ({pd.length})</h3>
        {pd.slice(0,8).map(p=><div key={p.id} style={{padding:'5px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <div><b>{p.business_name||'—'}</b><br/><span style={{color:'#94A3B8',fontSize:10,fontFamily:'monospace'}}>{p.transaction_id}</span></div>
          <span style={{fontWeight:700,color:'#F59E0B'}}>{fm(p.amount)}</span>
        </div>)}
        {!pd.length&&<Empty icon="✅" text="Hakuna"/>}
      </div>
    </div>
  </div>;
}

// ===== 2. MALIPO PAGE (Features 6-10) =====
export function AccPaymentsPage(){
  const{paymentRequests,tokens,supabase}=useApp();
  const[tab,setTab]=useState('all');const[period,setPeriod]=useState('all');const[flagging,setFlagging]=useState(null);const[flagReason,setFlagReason]=useState('');
  const today=new Date().toISOString().split('T')[0];
  const weekAgo=new Date(Date.now()-7*86400000).toISOString();
  const ms=today.slice(0,7);

  let filtered=tab==='approved'?paymentRequests.filter(p=>p.status==='approved'):tab==='pending'?paymentRequests.filter(p=>p.status==='pending'):tab==='rejected'?paymentRequests.filter(p=>p.status==='rejected'):tab==='flagged'?paymentRequests.filter(p=>p.flagged):paymentRequests;
  if(period==='today')filtered=filtered.filter(p=>p.created_at?.startsWith(today));
  if(period==='week')filtered=filtered.filter(p=>p.created_at>=weekAgo);
  if(period==='month')filtered=filtered.filter(p=>p.created_at?.startsWith(ms));

  const total=filtered.filter(p=>p.status==='approved').reduce((a,p)=>a+(p.amount||0),0);

  // F10: Group by payment method
  const byMethod={};filtered.filter(p=>p.status==='approved').forEach(p=>{const m=p.payment_method||'SELCOM';byMethod[m]=(byMethod[m]||0)+(p.amount||0)});

  // F25: Flag suspicious payment
  const handleFlag=async(pid)=>{
    await supabase.from('payment_requests').update({flagged:true,flag_reason:flagReason}).eq('id',pid);
    // Notify admin
    await supabase.from('notifications').insert({target_type:'admin',type:'danger',title:'⚠️ Malipo Yanashukiwa!',message:`Muhasibu ameweka alama: ${flagReason}`});
    setFlagging(null);setFlagReason('');
    alert('Imetumwa kwa Admin!');
  };

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 14px'}}>💰 Malipo</h3>
    {/* Stats */}
    <div className="flex-wrap" style={{marginBottom:12}}>
      <Stat icon={IC.ok} label="Yamekubaliwa" value={paymentRequests.filter(p=>p.status==='approved').length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Yanasubiri" value={paymentRequests.filter(p=>p.status==='pending').length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Yamekataliwa" value={paymentRequests.filter(p=>p.status==='rejected').length} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Jumla" value={fm(total)} color="#0B7A3B"/>
    </div>
    {/* F6-8: Tabs */}
    <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
      {[{id:'all',l:'Yote'},{id:'approved',l:'✅ Yamekubaliwa'},{id:'pending',l:'⏳ Yanasubiri'},{id:'rejected',l:'❌ Yamekataliwa'},{id:'flagged',l:'⚠️ Yanashukiwa'}].map(t=>
        <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'6px 14px',borderRadius:8,border:tab===t.id?'2px solid #0B7A3B':'1px solid #E2E8F0',background:tab===t.id?'#F0FDF4':'#fff',fontWeight:tab===t.id?700:500,fontSize:12,cursor:'pointer',color:tab===t.id?'#0B7A3B':'#64748B'}}>{t.l}</button>)}
    </div>
    {/* F9: Period filter */}
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
      {[{id:'all',l:'Yote'},{id:'today',l:'Leo'},{id:'week',l:'Wiki'},{id:'month',l:'Mwezi'}].map(t=>
        <button key={t.id} onClick={()=>setPeriod(t.id)} style={{padding:'5px 12px',borderRadius:6,border:period===t.id?'2px solid #3B82F6':'1px solid #E2E8F0',background:period===t.id?'#EFF6FF':'#fff',fontWeight:period===t.id?700:500,fontSize:11,cursor:'pointer',color:period===t.id?'#3B82F6':'#94A3B8'}}>{t.l}</button>)}
    </div>
    {/* F10: By Method */}
    {Object.keys(byMethod).length>0&&<div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:13,fontWeight:700,margin:'0 0 6px'}}>📊 Malipo kwa Njia</h3>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        {Object.entries(byMethod).map(([m,a])=><div key={m} style={{background:'#F8FAFC',borderRadius:8,padding:'8px 14px',border:'1px solid #E2E8F0'}}>
          <div style={{fontSize:10,color:'#64748B',fontWeight:600}}>{m}</div><div style={{fontSize:14,fontWeight:800,color:'#0B7A3B'}}>{fm(a)}</div>
        </div>)}
      </div>
    </div>}
    {/* Payment List */}
    <div className="card">
      <div style={{maxHeight:500,overflowY:'auto'}}>
        {filtered.map(p=>{const tk=tokens.find(t=>t.code===p.token_code);return<div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <b style={{fontSize:13}}>{p.business_name||'—'}</b>
              <Badge color={p.status==='approved'?'#22C55E':p.status==='pending'?'#F59E0B':'#EF4444'}>{p.status}</Badge>
              {p.flagged&&<Badge color="#EF4444">⚠️ FLAG</Badge>}
            </div>
            <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>
              {fmtDate(p.created_at)} • {p.payment_method||'SELCOM'} • <span style={{fontFamily:'monospace'}}>{p.transaction_id||'—'}</span>
              {tk?.assigned_name&&<span> • 📋 {tk.assigned_name}</span>}
              {p.token_code&&<span> • 🔑 {p.token_code}</span>}
            </div>
            {p.reject_reason&&<div style={{fontSize:11,color:'#B91C1C',marginTop:2}}>Sababu: {p.reject_reason}</div>}
            {p.flag_reason&&<div style={{fontSize:11,color:'#B91C1C',marginTop:2}}>⚠️ Flag: {p.flag_reason}</div>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontWeight:800,fontSize:15,color:p.status==='approved'?'#0B7A3B':p.status==='pending'?'#F59E0B':'#94A3B8'}}>{fm(p.amount)}</span>
            {/* F25: Flag button */}
            {!p.flagged&&p.status!=='rejected'&&<button onClick={()=>setFlagging(p.id)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #FCA5A5',background:'#fff',fontSize:10,cursor:'pointer',color:'#EF4444'}}>⚠️</button>}
          </div>
        </div>})}
        {!filtered.length&&<Empty icon="💰" text="Hakuna malipo"/>}
      </div>
    </div>
    {/* Flag Modal */}
    {flagging&&<Modal open={true} onClose={()=>setFlagging(null)} title="⚠️ Flag Malipo Yanayoshukiwa">
      <p style={{fontSize:13,color:'#64748B',marginBottom:12}}>Andika sababu ya kushuku malipo haya. Admin atapata taarifa.</p>
      <Input label="Sababu" placeholder="Mf: Transaction ID inaonekana fake..." value={flagReason} onChange={e=>setFlagReason(e.target.value)}/>
      <Btn onClick={()=>handleFlag(flagging)} style={{marginTop:8,background:'#EF4444'}}>⚠️ Tuma kwa Admin</Btn>
    </Modal>}
  </div>;
}

// ===== 3. MATUMIZI PAGE (Features 11-14) =====
export function AccExpensesPage(){
  const{systemExpenses=[],addSystemExpense,supabase}=useApp();
  const[show,setShow]=useState(false);
  const[f,setF]=useState({category:'SMS',amount:'',description:'',date:new Date().toISOString().split('T')[0]});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const ms=new Date().toISOString().split('T')[0].slice(0,7);
  const monthExp=(systemExpenses||[]).filter(e=>e.date?.startsWith(ms));
  const totalMonth=monthExp.reduce((a,e)=>a+(e.amount||0),0);
  // F12: By category
  const byCat={};(systemExpenses||[]).forEach(e=>{const c=e.category||'Nyingine';byCat[c]=(byCat[c]||0)+(e.amount||0)});
  const cats=['SMS/Beem','Server/Hosting','Marketing','Mishahara','Vifaa','Domain','Nyingine'];
  // F14: Budget
  const budgets={SMS:10000,'Server/Hosting':65000,Marketing:30000,Mishahara:0,Vifaa:0,Domain:5000,Nyingine:0};

  const handleAdd=async()=>{
    if(!f.amount||+f.amount<=0)return alert('Weka kiasi!');
    const exp={category:f.category,amount:+f.amount,description:f.description,date:f.date,created_by:'accountant'};
    const{error}=await supabase.from('system_expenses').insert(exp);
    if(error)alert('Error: '+error.message);
    else{setShow(false);setF({category:'SMS',amount:'',description:'',date:new Date().toISOString().split('T')[0]});window.location.reload()}
  };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:18,fontWeight:800,margin:0}}>💸 Matumizi ya Mfumo</h3>
      {/* F11: Add expense */}
      <button onClick={()=>setShow(true)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#EF4444',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Ongeza Matumizi</button>
    </div>
    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.wallet} label="Mwezi Huu" value={fm(totalMonth)} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Jumla" value={fm((systemExpenses||[]).reduce((a,e)=>a+(e.amount||0),0))} color="#F59E0B"/>
    </div>
    {/* F12: By Category */}
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📊 Matumizi kwa Kategoria</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
        {cats.map(c=>{const spent=byCat[c]||0;const budget=budgets[c]||0;const over=budget>0&&spent>budget;
          return<div key={c} style={{background:over?'#FEF2F2':'#F8FAFC',borderRadius:10,padding:10,border:`1px solid ${over?'#FECACA':'#E2E8F0'}`}}>
            <div style={{fontSize:10,color:'#64748B',fontWeight:600}}>{c}</div>
            <div style={{fontSize:16,fontWeight:800,color:over?'#EF4444':'#1E293B'}}>{fm(spent)}</div>
            {budget>0&&<div style={{fontSize:9,color:over?'#EF4444':'#22C55E'}}>Budget: {fm(budget)} {over?'⚠️ OVER':'✅'}</div>}
          </div>})}
      </div>
    </div>
    {/* Expense List */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Orodha ya Matumizi</h3>
      <div style={{maxHeight:400,overflowY:'auto'}}>
        {(systemExpenses||[]).map(e=><div key={e.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6}}><Badge color="#64748B">{e.category||'Nyingine'}</Badge><span style={{fontSize:12,fontWeight:600}}>{e.description||'—'}</span></div>
            <div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(e.date||e.created_at)}</div>
          </div>
          <span style={{fontWeight:800,color:'#EF4444',fontSize:14}}>{fm(e.amount)}</span>
        </div>)}
        {!(systemExpenses||[]).length&&<Empty icon="💸" text="Hakuna matumizi bado"/>}
      </div>
    </div>
    {/* Add Modal */}
    {show&&<Modal open={true} onClose={()=>setShow(false)} title="+ Ongeza Matumizi">
      <Sel label="Kategoria" value={f.category} onChange={e=>s('category',e.target.value)} options={cats.map(c=>({value:c,label:c}))}/>
      <Input label="Kiasi (TZS)" type="number" placeholder="50000" value={f.amount} onChange={e=>s('amount',e.target.value)}/>
      <Input label="Maelezo" placeholder="Mf: SMS za mwezi Aprili" value={f.description} onChange={e=>s('description',e.target.value)}/>
      <Input label="Tarehe" type="date" value={f.date} onChange={e=>s('date',e.target.value)}/>
      <Btn onClick={handleAdd} style={{marginTop:8,width:'100%'}}>💸 Hifadhi</Btn>
    </Modal>}
  </div>;
}

// ===== 4. REVENUE / CHANELI (Features 15-17) =====
export function AccRevenuePage(){
  const{paymentRequests,tokens,partners,businesses}=useApp();
  const ap=paymentRequests.filter(p=>p.status==='approved');
  const totalRev=ap.reduce((a,p)=>a+(p.amount||0),0);
  // F15: By partner
  const pm={};ap.forEach(p=>{const tk=tokens.find(t=>t.code===p.token_code);const n=tk?.assigned_name||'Admin';pm[n]=(pm[n]||0)+(p.amount||0)});
  // F16: By plan
  const byPlan={};ap.forEach(p=>{const pl=p.plan||'basic';byPlan[pl]=(byPlan[pl]||0)+(p.amount||0)});
  // F17: Token tracking
  const usedTokens=tokens.filter(t=>t.used);

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 14px'}}>📊 Mapato kwa Chaneli</h3>
    <div className="card" style={{marginBottom:14,background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',textAlign:'center',padding:24}}>
      <div style={{fontSize:12,color:'#15803D',fontWeight:600}}>MAPATO JUMLA</div>
      <div style={{fontSize:36,fontWeight:900,color:'#0B7A3B',margin:'4px 0'}}>{fm(totalRev)}</div>
      <div style={{fontSize:12,color:'#15803D'}}>Malipo {ap.length} yamethibitishwa</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      {/* F15: By Partner */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Mapato kwa Mshirika</h3>
        {Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:32,height:32,borderRadius:8,background:'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📋</div>
            <div><div style={{fontWeight:600,fontSize:13}}>{n}</div><div style={{fontSize:10,color:'#94A3B8'}}>{totalRev?Math.round(a/totalRev*100):0}% ya jumla</div></div>
          </div>
          <span style={{fontWeight:800,color:'#0B7A3B',fontSize:14}}>{fm(a)}</span>
        </div>)}
      </div>
      {/* F16: By Plan */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📦 Mapato kwa Plan</h3>
        {Object.entries(byPlan).sort((a,b)=>b[1]-a[1]).map(([pl,a])=><div key={pl} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <Badge color={pl==='premium'?'#8B5CF6':pl==='enterprise'?'#0B7A3B':'#64748B'}>{pl.toUpperCase()}</Badge>
          <span style={{fontWeight:800,color:'#0B7A3B'}}>{fm(a)}</span>
        </div>)}
      </div>
      {/* F17: Token Revenue */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>🔑 Tokens Zilizotumika ({usedTokens.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {usedTokens.map(t=>{const b=businesses.find(x=>x.id===t.used_by);return<div key={t.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',fontSize:12}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontFamily:'monospace',fontWeight:700,color:'#92400E',background:'#FFF7ED',padding:'2px 6px',borderRadius:4}}>{t.code}</span>
              <Badge color={t.plan==='premium'?'#8B5CF6':'#64748B'}>{t.plan||'basic'}</Badge>
            </div>
            <div style={{color:'#64748B',marginTop:2}}>→ {b?.name||t.used_by_name||'—'} • {t.assigned_name?'📋 '+t.assigned_name:'Admin'} • Siku {t.days}</div>
          </div>})}
          {!usedTokens.length&&<Empty icon="🔑" text="Hakuna"/>}
        </div>
      </div>
    </div>
  </div>;
}

// ===== 5. WATEJA (Features 18-20) =====
export function AccCustomersPage(){
  const{businesses}=useApp();
  const ac=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const tr=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const su=businesses.filter(b=>b.is_suspended);
  const expSoon=businesses.filter(b=>{const e=b.token_active?b.token_expiry:b.trial_end;return e&&Math.ceil((new Date(e)-new Date())/86400000)<=7&&Math.ceil((new Date(e)-new Date())/86400000)>0});

  const renderList=(list,color,label)=><div className="card" style={{marginBottom:14}}>
    <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px',color}}>{label} ({list.length})</h3>
    <div style={{maxHeight:300,overflowY:'auto'}}>
      {list.map(b=>{const e=b.token_active?b.token_expiry:b.trial_end;const d=e?Math.ceil((new Date(e)-new Date())/86400000):0;
        return<div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <div><b>{b.name}</b><br/><span style={{color:'#94A3B8'}}>{b.email} • {b.phone||'—'}</span></div>
          <div style={{textAlign:'right'}}><Badge color={b.plan==='premium'?'#8B5CF6':'#64748B'}>{b.plan||'trial'}</Badge><br/><span style={{color:d<=5?'#EF4444':d<=14?'#F59E0B':'#22C55E',fontWeight:700,fontSize:11}}>Siku {d}</span></div>
        </div>})}
      {!list.length&&<Empty icon="📋" text="Hakuna"/>}
    </div>
  </div>;

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 14px'}}>🏪 Wateja</h3>
    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.ok} label="Wanaolipa" value={ac.length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Trial" value={tr.length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Waliofungwa" value={su.length} color="#EF4444"/>
      <Stat icon={IC.warn} label="Muda Unaisha" value={expSoon.length} color="#EF4444" sub="ndani ya siku 7"/>
    </div>
    {/* F19: Expiring */}
    {expSoon.length>0&&renderList(expSoon,'#EF4444','⚠️ Muda Unaisha (Siku 7)')}
    {/* F18: Active */}
    {renderList(ac,'#22C55E','✅ Wanaolipa')}
    {renderList(tr,'#F59E0B','⏳ Trial')}
    {/* F20: Suspended */}
    {renderList(su,'#EF4444','🔒 Waliofungwa')}
  </div>;
}

// ===== 6. RIPOTI PAGE (Features 21-23) =====
export function AccReportsPage(){
  const{paymentRequests,tokens,businesses,systemExpenses=[]}=useApp();
  const ap=paymentRequests.filter(p=>p.status==='approved');
  const totalRev=ap.reduce((a,p)=>a+(p.amount||0),0);
  const ms=new Date().toISOString().split('T')[0].slice(0,7);
  const monthRev=ap.filter(p=>p.created_at?.startsWith(ms)).reduce((a,p)=>a+(p.amount||0),0);
  const monthExp=(systemExpenses||[]).filter(e=>e.date?.startsWith(ms)).reduce((a,e)=>a+(e.amount||0),0);

  const buildPDF=(title,content)=>{
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;margin:30px;color:#1E293B}h1{color:#0B7A3B;border-bottom:3px solid #0B7A3B;padding-bottom:8px}h2{margin-top:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#0B7A3B;color:#fff;padding:8px;text-align:left;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #E2E8F0;font-size:12px}tr:nth-child(even){background:#F8FAFC}.big{font-size:24px;font-weight:900;color:#0B7A3B}@media print{body{margin:15px}}</style></head><body>${content}<div style="margin-top:30px;border-top:2px solid #0B7A3B;padding-top:10px;text-align:center;color:#64748B;font-size:10px">PesaFly / Duka Langu — ${new Date().toLocaleString('sw-TZ')}</div></body></html>`);
    w.document.close();setTimeout(()=>w.print(),500);
  };

  // F21: P&L PDF
  const exportPL=()=>{
    const byCat={};(systemExpenses||[]).filter(e=>e.date?.startsWith(ms)).forEach(e=>{const c=e.category||'Nyingine';byCat[c]=(byCat[c]||0)+(e.amount||0)});
    buildPDF('P&L Report',`<h1>PROFIT & LOSS — ${ms}</h1><p>PesaFly / Duka Langu</p>
    <h2>MAPATO</h2><table><tr><td><b>Ada ya Wateja</b></td><td style="text-align:right" class="big">TZS ${monthRev.toLocaleString()}</td></tr></table>
    <h2>MATUMIZI</h2><table>${Object.entries(byCat).map(([c,a])=>`<tr><td>${c}</td><td style="text-align:right;color:#EF4444">TZS ${a.toLocaleString()}</td></tr>`).join('')}<tr style="background:#FEF2F2"><td><b>JUMLA MATUMIZI</b></td><td style="text-align:right;font-weight:900;color:#EF4444">TZS ${monthExp.toLocaleString()}</td></tr></table>
    <h2>FAIDA HALISI</h2><table><tr style="background:#F0FDF4"><td><b style="font-size:18px">NET PROFIT</b></td><td style="text-align:right;font-size:24px;font-weight:900;color:${monthRev-monthExp>=0?'#0B7A3B':'#EF4444'}">TZS ${(monthRev-monthExp).toLocaleString()}</td></tr></table>`);
  };

  // F22: Revenue PDF
  const exportRev=()=>{
    const pm={};ap.forEach(p=>{const tk=tokens.find(t=>t.code===p.token_code);const n=tk?.assigned_name||'Admin';pm[n]=(pm[n]||0)+(p.amount||0)});
    buildPDF('Revenue Report',`<h1>MAPATO — Yote</h1><p class="big">TZS ${totalRev.toLocaleString()}</p>
    <h2>Kwa Mshirika</h2><table><tr><th>Mshirika</th><th>Mapato</th><th>%</th></tr>${Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=>`<tr><td><b>${n}</b></td><td>TZS ${a.toLocaleString()}</td><td>${Math.round(a/totalRev*100)}%</td></tr>`).join('')}</table>
    <h2>Malipo Yote (${ap.length})</h2><table><tr><th>#</th><th>Biashara</th><th>Kiasi</th><th>Njia</th><th>Token</th><th>Tarehe</th></tr>${ap.map((p,i)=>`<tr><td>${i+1}</td><td>${p.business_name||'—'}</td><td>TZS ${(p.amount||0).toLocaleString()}</td><td>${p.payment_method||'SELCOM'}</td><td>${p.token_code||'—'}</td><td>${fmtDate(p.created_at)}</td></tr>`).join('')}</table>`);
  };

  // F23: Expenses PDF
  const exportExp=()=>{
    const byCat={};(systemExpenses||[]).forEach(e=>{const c=e.category||'Nyingine';byCat[c]=(byCat[c]||0)+(e.amount||0)});
    const total=(systemExpenses||[]).reduce((a,e)=>a+(e.amount||0),0);
    buildPDF('Expenses Report',`<h1>MATUMIZI YA MFUMO</h1><p class="big">TZS ${total.toLocaleString()}</p>
    <h2>Kwa Kategoria</h2><table><tr><th>Kategoria</th><th>Kiasi</th></tr>${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td>${c}</td><td>TZS ${a.toLocaleString()}</td></tr>`).join('')}</table>
    <h2>Orodha Yote (${(systemExpenses||[]).length})</h2><table><tr><th>#</th><th>Kategoria</th><th>Kiasi</th><th>Maelezo</th><th>Tarehe</th></tr>${(systemExpenses||[]).map((e,i)=>`<tr><td>${i+1}</td><td>${e.category||'—'}</td><td>TZS ${(e.amount||0).toLocaleString()}</td><td>${e.description||'—'}</td><td>${fmtDate(e.date||e.created_at)}</td></tr>`).join('')}</table>`);
  };

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 14px'}}>📋 Ripoti</h3>
    {/* P&L Summary */}
    <div className="card" style={{marginBottom:14,background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',border:'1px solid #BBF7D0',padding:20}}>
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#0B7A3B'}}>📊 P&L — {ms}</h3>
      <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:10}}>
        <div style={{textAlign:'center'}}><div style={{fontSize:11,color:'#15803D'}}>MAPATO</div><div style={{fontSize:24,fontWeight:900,color:'#0B7A3B'}}>{fm(monthRev)}</div></div>
        <div style={{fontSize:24,color:'#94A3B8',alignSelf:'center'}}>−</div>
        <div style={{textAlign:'center'}}><div style={{fontSize:11,color:'#B91C1C'}}>MATUMIZI</div><div style={{fontSize:24,fontWeight:900,color:'#EF4444'}}>{fm(monthExp)}</div></div>
        <div style={{fontSize:24,color:'#94A3B8',alignSelf:'center'}}>=</div>
        <div style={{textAlign:'center'}}><div style={{fontSize:11,color:monthRev-monthExp>=0?'#15803D':'#B91C1C'}}>FAIDA</div><div style={{fontSize:24,fontWeight:900,color:monthRev-monthExp>=0?'#0B7A3B':'#EF4444'}}>{fm(monthRev-monthExp)}</div></div>
      </div>
    </div>
    {/* Download buttons */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
      <div className="card" style={{textAlign:'center',cursor:'pointer',border:'2px solid #BBF7D0'}} onClick={exportPL}>
        <div style={{fontSize:32,marginBottom:6}}>📊</div>
        <div style={{fontWeight:700,fontSize:14,color:'#0B7A3B'}}>P&L Report</div>
        <div style={{fontSize:11,color:'#64748B'}}>Mapato vs Matumizi = Faida</div>
        <button style={{marginTop:8,padding:'6px 16px',borderRadius:8,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Pakua PDF</button>
      </div>
      <div className="card" style={{textAlign:'center',cursor:'pointer',border:'2px solid #BFDBFE'}} onClick={exportRev}>
        <div style={{fontSize:32,marginBottom:6}}>💰</div>
        <div style={{fontWeight:700,fontSize:14,color:'#3B82F6'}}>Mapato Report</div>
        <div style={{fontSize:11,color:'#64748B'}}>Malipo, washirika, tokens</div>
        <button style={{marginTop:8,padding:'6px 16px',borderRadius:8,border:'none',background:'#3B82F6',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Pakua PDF</button>
      </div>
      <div className="card" style={{textAlign:'center',cursor:'pointer',border:'2px solid #FECACA'}} onClick={exportExp}>
        <div style={{fontSize:32,marginBottom:6}}>💸</div>
        <div style={{fontWeight:700,fontSize:14,color:'#EF4444'}}>Matumizi Report</div>
        <div style={{fontSize:11,color:'#64748B'}}>Gharama za mfumo kwa kategoria</div>
        <button style={{marginTop:8,padding:'6px 16px',borderRadius:8,border:'none',background:'#EF4444',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Pakua PDF</button>
      </div>
    </div>
  </div>;
}
