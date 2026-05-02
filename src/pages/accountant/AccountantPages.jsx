import React,{useState,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Stat,Badge,Empty,Input,Sel,Btn,Modal} from '../../components/UI';

const fmtDate=d=>d?new Date(d).toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'}):'—';
const fm=n=>`TZS ${(+n||0).toLocaleString()}`;
const PRICE=15000;

// ===== DASHBOARD =====
export function AccountantDashboard(){
  const{paymentRequests=[],businesses=[],tokens=[],partners=[],systemExpenses=[],settings}=useApp();
  const price=parseInt(settings?.system_price||PRICE);
  
  // Revenue from 3 sources
  const approvedPay=paymentRequests.filter(p=>p.status==='approved');
  const revFromPayments=approvedPay.reduce((a,p)=>a+(+p.amount||0),0);
  const usedTokens=tokens.filter(t=>t.used);
  const revFromTokens=usedTokens.length*price;
  const activeBiz=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const trialBiz=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const suspBiz=businesses.filter(b=>b.is_suspended);
  
  // Best revenue estimate
  const totalRevenue=revFromPayments>0?revFromPayments:revFromTokens>0?revFromTokens:activeBiz.length*price;
  
  // Time-based
  const today=new Date().toISOString().split('T')[0];
  const weekAgo=new Date(Date.now()-7*86400000).toISOString();
  const ms=today.slice(0,7);
  const monthPay=approvedPay.filter(p=>p.created_at?.startsWith(ms));
  const monthTokens=usedTokens.filter(t=>t.used_at?.startsWith(ms)||t.created_at?.startsWith(ms));
  const monthRev=monthPay.reduce((a,p)=>a+(+p.amount||0),0)||(monthTokens.length*price);
  const expected=activeBiz.length*price;
  const colRate=expected>0?Math.round(monthRev/expected*100):0;
  
  // Expenses
  const allExp=(systemExpenses||[]);
  const monthExp=allExp.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms).reduce((a,e)=>a+(+e.amount||0),0);
  const totalExp=allExp.reduce((a,e)=>a+(+e.amount||0),0);
  
  // Monthly chart
  const mm={};
  if(approvedPay.length>0){approvedPay.forEach(p=>{const m=p.created_at?.slice(0,7);if(m)mm[m]=(mm[m]||0)+(+p.amount||0)})}
  else{usedTokens.forEach(t=>{const m=(t.used_at||t.created_at||'').slice(0,7);if(m)mm[m]=(mm[m]||0)+price})}
  const months=Object.entries(mm).sort().slice(-6);
  const maxM=Math.max(...months.map(d=>d[1]),1);
  
  // Partner revenue
  const pm={};
  usedTokens.forEach(t=>{const n=t.assigned_name||'Admin';pm[n]=(pm[n]||0)+price});
  if(approvedPay.length>0){Object.keys(pm).forEach(k=>pm[k]=0);approvedPay.forEach(p=>{const tk=tokens.find(t=>t.code===p.token_code);pm[tk?.assigned_name||'Admin']=(pm[tk?.assigned_name||'Admin']||0)+(+p.amount||0)})}

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 4px',color:'#0B7A3B'}}>🧮 MUHASIBU — Dashboard</h3>
    <p style={{fontSize:12,color:'#64748B',margin:'0 0 16px'}}>Hali ya fedha — {new Date().toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
    
    {/* P&L Hero Card */}
    <div style={{background:'linear-gradient(135deg,#065F2E,#0B7A3B)',borderRadius:20,padding:24,marginBottom:16,color:'#fff',boxShadow:'0 8px 30px rgba(11,122,59,0.3)'}}>
      <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:16,textAlign:'center'}}>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>MAPATO JUMLA</div><div style={{fontSize:28,fontWeight:900}}>{fm(totalRevenue)}</div><div style={{fontSize:10,opacity:.6}}>tangu kuanza</div></div>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>MWEZI HUU</div><div style={{fontSize:28,fontWeight:900}}>{fm(monthRev)}</div></div>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>MATUMIZI</div><div style={{fontSize:28,fontWeight:900,color:'#FCA5A5'}}>{fm(monthExp)}</div></div>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>FAIDA HALISI</div><div style={{fontSize:28,fontWeight:900,color:monthRev-monthExp>=0?'#86EFAC':'#FCA5A5'}}>{fm(monthRev-monthExp)}</div></div>
      </div>
    </div>
    
    {/* Stats Grid */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:16}}>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>WATEJA</div><div style={{fontSize:24,fontWeight:900,color:'#0B7A3B'}}>{businesses.length}</div><div style={{fontSize:10,color:'#94A3B8'}}>jumla</div></div>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>ACTIVE</div><div style={{fontSize:24,fontWeight:900,color:'#22C55E'}}>{activeBiz.length}</div><div style={{fontSize:10,color:'#94A3B8'}}>wanaolipa</div></div>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>TRIAL</div><div style={{fontSize:24,fontWeight:900,color:'#F59E0B'}}>{trialBiz.length}</div><div style={{fontSize:10,color:'#94A3B8'}}>wanajaribu</div></div>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>SUSPENDED</div><div style={{fontSize:24,fontWeight:900,color:'#EF4444'}}>{suspBiz.length}</div><div style={{fontSize:10,color:'#94A3B8'}}>wamefungwa</div></div>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>COLLECTION</div><div style={{fontSize:24,fontWeight:900,color:colRate>=80?'#22C55E':colRate>=50?'#F59E0B':'#EF4444'}}>{colRate}%</div><div style={{fontSize:10,color:'#94A3B8'}}>rate</div></div>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>TOKENS</div><div style={{fontSize:24,fontWeight:900,color:'#8B5CF6'}}>{usedTokens.length}</div><div style={{fontSize:10,color:'#94A3B8'}}>zimetumika</div></div>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>BEI/MWEZI</div><div style={{fontSize:24,fontWeight:900,color:'#3B82F6'}}>{fm(price)}</div><div style={{fontSize:10,color:'#94A3B8'}}>kwa mteja</div></div>
      <div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>TARAJIWA</div><div style={{fontSize:24,fontWeight:900,color:'#0B7A3B'}}>{fm(expected)}</div><div style={{fontSize:10,color:'#94A3B8'}}>kwa mwezi</div></div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      {/* Monthly Chart */}
      {months.length>0&&<div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📊 Mapato kwa Mwezi</h3>
        {months.map(([m,a])=><div key={m} style={{padding:'4px 0',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:55,fontSize:11,fontWeight:600,color:'#64748B'}}>{m}</span>
          <div style={{flex:1,background:'#F1F5F9',borderRadius:6,height:22,overflow:'hidden'}}><div style={{width:(a/maxM*100)+'%',height:'100%',background:'linear-gradient(90deg,#0B7A3B,#22C55E)',borderRadius:6}}/></div>
          <span style={{fontWeight:700,fontSize:11,color:'#0B7A3B',minWidth:85,textAlign:'right'}}>{fm(a)}</span>
        </div>)}
      </div>}
      
      {/* Partner Revenue */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📋 Mapato kwa Chaneli</h3>
        {Object.entries(pm).filter(([,a])=>a>0).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <span style={{fontWeight:600}}>{n}</span>
          <span style={{fontWeight:800,color:'#0B7A3B'}}>{fm(a)} <span style={{color:'#94A3B8',fontWeight:400}}>({totalRevenue>0?Math.round(a/totalRevenue*100):0}%)</span></span>
        </div>)}
        {!Object.entries(pm).filter(([,a])=>a>0).length&&<div style={{textAlign:'center',padding:20,color:'#94A3B8',fontSize:13}}>Hakuna data ya mapato bado</div>}
      </div>
      
      {/* Data Source Info */}
      <div className="card" style={{background:'#EFF6FF',border:'1px solid #BFDBFE'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px',color:'#1E40AF'}}>📋 Chanzo cha Data</h3>
        <div style={{fontSize:12,color:'#1E40AF',lineHeight:1.8}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Maduka kwenye mfumo:</span><b>{businesses.length}</b></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Tokens zilizotumika:</span><b>{usedTokens.length}</b></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Malipo yaliyothibitishwa:</span><b>{approvedPay.length}</b></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Mapato (malipo):</span><b>{fm(revFromPayments)}</b></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Mapato (tokens × {fm(price)}):</span><b>{fm(revFromTokens)}</b></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Matumizi ya mfumo:</span><b>{fm(totalExp)}</b></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Washirika:</span><b>{partners.length}</b></div>
        </div>
      </div>
    </div>
  </div>;
}

// ===== MALIPO PAGE =====
export function AccPaymentsPage(){
  const{paymentRequests=[],tokens=[],supabase}=useApp();
  const[tab,setTab]=useState('all');const[period,setPeriod]=useState('all');const[flagging,setFlagging]=useState(null);const[flagReason,setFlagReason]=useState('');
  const today=new Date().toISOString().split('T')[0];const weekAgo=new Date(Date.now()-7*86400000).toISOString();const ms=today.slice(0,7);

  let filtered=tab==='approved'?paymentRequests.filter(p=>p.status==='approved'):tab==='pending'?paymentRequests.filter(p=>p.status==='pending'):tab==='rejected'?paymentRequests.filter(p=>p.status==='rejected'):tab==='flagged'?paymentRequests.filter(p=>p.flagged):paymentRequests;
  if(period==='today')filtered=filtered.filter(p=>p.created_at?.startsWith(today));
  if(period==='week')filtered=filtered.filter(p=>p.created_at>=weekAgo);
  if(period==='month')filtered=filtered.filter(p=>p.created_at?.startsWith(ms));
  const total=filtered.filter(p=>p.status==='approved').reduce((a,p)=>a+(+p.amount||0),0);
  const byMethod={};filtered.filter(p=>p.status==='approved').forEach(p=>{const m=p.payment_method||'SELCOM';byMethod[m]=(byMethod[m]||0)+(+p.amount||0)});

  const handleFlag=async(pid)=>{
    try{await supabase.from('payment_requests').update({flagged:true,flag_reason:flagReason}).eq('id',pid);
    await supabase.from('notifications').insert({target_type:'admin',type:'danger',title:'⚠️ Malipo Yanashukiwa!',message:`Muhasibu ameweka alama: ${flagReason}`});
    setFlagging(null);setFlagReason('');alert('Imetumwa kwa Admin!')}catch(e){alert('Error: '+e.message)}
  };

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>💰 Malipo</h3>
    <div className="flex-wrap" style={{marginBottom:12}}>
      <Stat icon={IC.ok} label="Yamekubaliwa" value={paymentRequests.filter(p=>p.status==='approved').length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Yanasubiri" value={paymentRequests.filter(p=>p.status==='pending').length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Yamekataliwa" value={paymentRequests.filter(p=>p.status==='rejected').length} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Kiasi" value={fm(total)} color="#0B7A3B"/>
    </div>
    <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
      {[{id:'all',l:`Yote (${paymentRequests.length})`},{id:'approved',l:'✅ Kubaliwa'},{id:'pending',l:'⏳ Subiri'},{id:'rejected',l:'❌ Kataliwa'},{id:'flagged',l:'⚠️ Shukiwa'}].map(t=>
        <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'6px 12px',borderRadius:8,border:tab===t.id?'2px solid #0B7A3B':'1px solid #E2E8F0',background:tab===t.id?'#F0FDF4':'#fff',fontWeight:tab===t.id?700:500,fontSize:11,cursor:'pointer',color:tab===t.id?'#0B7A3B':'#64748B'}}>{t.l}</button>)}
    </div>
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
      {[{id:'all',l:'Yote'},{id:'today',l:'Leo'},{id:'week',l:'Wiki'},{id:'month',l:'Mwezi'}].map(t=>
        <button key={t.id} onClick={()=>setPeriod(t.id)} style={{padding:'4px 10px',borderRadius:6,border:period===t.id?'2px solid #3B82F6':'1px solid #E2E8F0',background:period===t.id?'#EFF6FF':'#fff',fontWeight:period===t.id?700:500,fontSize:10,cursor:'pointer',color:period===t.id?'#3B82F6':'#94A3B8'}}>{t.l}</button>)}
    </div>
    {Object.keys(byMethod).length>0&&<div className="card" style={{marginBottom:12}}>
      <h3 style={{fontSize:13,fontWeight:700,margin:'0 0 6px'}}>📊 Kwa Njia</h3>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{Object.entries(byMethod).map(([m,a])=><div key={m} style={{background:'#F8FAFC',borderRadius:8,padding:'6px 12px',border:'1px solid #E2E8F0'}}><div style={{fontSize:9,color:'#64748B',fontWeight:600}}>{m}</div><div style={{fontSize:14,fontWeight:800,color:'#0B7A3B'}}>{fm(a)}</div></div>)}</div>
    </div>}
    <div className="card">
      <div style={{maxHeight:500,overflowY:'auto'}}>
        {filtered.length?filtered.map(p=>{const tk=tokens.find(t=>t.code===p.token_code);return<div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <b style={{fontSize:13}}>{p.business_name||'Biashara'}</b>
              <Badge color={p.status==='approved'?'#22C55E':p.status==='pending'?'#F59E0B':'#EF4444'}>{p.status}</Badge>
              {p.flagged&&<Badge color="#EF4444">⚠️</Badge>}
            </div>
            <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{fmtDate(p.created_at)} • {p.payment_method||'SELCOM'} • <span style={{fontFamily:'monospace'}}>{p.transaction_id||'—'}</span>{tk?.assigned_name?` • 📋 ${tk.assigned_name}`:''}{p.token_code?` • 🔑 ${p.token_code}`:''}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontWeight:800,fontSize:15,color:p.status==='approved'?'#0B7A3B':'#94A3B8'}}>{fm(p.amount)}</span>
            {!p.flagged&&<button onClick={()=>setFlagging(p.id)} style={{padding:'2px 6px',borderRadius:4,border:'1px solid #FCA5A5',background:'#fff',fontSize:9,cursor:'pointer',color:'#EF4444'}}>⚠️</button>}
          </div>
        </div>}):<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>
          <div style={{fontSize:40,marginBottom:8}}>💰</div>
          <div style={{fontSize:14,fontWeight:600}}>Hakuna malipo kwenye database</div>
          <div style={{fontSize:12,marginTop:4}}>Malipo yataonekana hapa mteja akilipa na admin akithibitisha</div>
        </div>}
      </div>
    </div>
    {flagging&&<Modal open={true} onClose={()=>setFlagging(null)} title="⚠️ Flag Malipo"><p style={{fontSize:13,color:'#64748B',marginBottom:12}}>Andika sababu. Admin atapata taarifa.</p><Input label="Sababu" placeholder="Mf: Transaction ID fake..." value={flagReason} onChange={e=>setFlagReason(e.target.value)}/><Btn onClick={()=>handleFlag(flagging)} style={{marginTop:8,background:'#EF4444'}}>⚠️ Tuma kwa Admin</Btn></Modal>}
  </div>;
}

// ===== MATUMIZI PAGE =====
export function AccExpensesPage(){
  const{systemExpenses=[],supabase}=useApp();
  const[show,setShow]=useState(false);
  const[expList,setExpList]=useState([]);
  const[f,setF]=useState({category:'SMS/Beem',amount:'',description:'',date:new Date().toISOString().split('T')[0]});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  useEffect(()=>{setExpList(systemExpenses||[])},[systemExpenses]);
  
  const ms=new Date().toISOString().split('T')[0].slice(0,7);
  const monthExp=expList.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms);
  const totalMonth=monthExp.reduce((a,e)=>a+(+e.amount||0),0);
  const totalAll=expList.reduce((a,e)=>a+(+e.amount||0),0);
  const byCat={};expList.forEach(e=>{const c=e.category||'Nyingine';byCat[c]=(byCat[c]||0)+(+e.amount||0)});
  const cats=['SMS/Beem','Server/Hosting','Marketing','Mishahara','Vifaa','Domain','Nyingine'];
  const budgets={'SMS/Beem':10000,'Server/Hosting':65000,'Marketing':30000,'Mishahara':0,'Vifaa':0,'Domain':5000,'Nyingine':0};

  const handleAdd=async()=>{
    if(!f.amount||+f.amount<=0)return alert('Weka kiasi!');
    try{
      const{data,error}=await supabase.from('system_expenses').insert({category:f.category,amount:+f.amount,description:f.description,date:f.date,created_by:'accountant'}).select().single();
      if(error){alert('Error: '+error.message);return}
      setExpList(prev=>[data,...prev]);setShow(false);setF({category:'SMS/Beem',amount:'',description:'',date:new Date().toISOString().split('T')[0]});
    }catch(e){alert('Tatizo: '+e.message)}
  };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:20,fontWeight:900,margin:0,color:'#0B7A3B'}}>💸 Matumizi ya Mfumo</h3>
      <button onClick={()=>setShow(true)} style={{padding:'10px 20px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#EF4444,#B91C1C)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'0 4px 15px rgba(239,68,68,0.3)'}}>+ Ongeza Matumizi</button>
    </div>
    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.dollar} label="Mwezi Huu" value={fm(totalMonth)} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Jumla Yote" value={fm(totalAll)} color="#F59E0B"/>
      <Stat icon={IC.chart} label="Kategoria" value={Object.keys(byCat).length} color="#3B82F6"/>
    </div>
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📊 Kwa Kategoria</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
        {cats.map(c=>{const spent=byCat[c]||0;const budget=budgets[c]||0;const over=budget>0&&spent>budget;
          return<div key={c} style={{background:over?'#FEF2F2':'#F8FAFC',borderRadius:10,padding:10,border:`1px solid ${over?'#FECACA':'#E2E8F0'}`}}>
            <div style={{fontSize:10,color:'#64748B',fontWeight:600}}>{c}</div>
            <div style={{fontSize:16,fontWeight:800,color:over?'#EF4444':'#1E293B'}}>{fm(spent)}</div>
            {budget>0&&<div style={{fontSize:9,color:over?'#EF4444':'#22C55E'}}>Budget: {fm(budget)} {over?'⚠️':'✅'}</div>}
          </div>})}
      </div>
    </div>
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Orodha ya Matumizi ({expList.length})</h3>
      <div style={{maxHeight:400,overflowY:'auto'}}>
        {expList.map(e=><div key={e.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><Badge color="#64748B">{e.category||'Nyingine'}</Badge> <span style={{fontSize:12,fontWeight:600}}>{e.description||'—'}</span><br/><span style={{fontSize:10,color:'#94A3B8'}}>{fmtDate(e.date||e.created_at)}</span></div>
          <span style={{fontWeight:800,color:'#EF4444',fontSize:14}}>{fm(e.amount)}</span>
        </div>)}
        {!expList.length&&<Empty icon="💸" text="Hakuna matumizi — bonyeza '+ Ongeza' kuanza"/>}
      </div>
    </div>
    {show&&<Modal open={true} onClose={()=>setShow(false)} title="+ Ongeza Matumizi">
      <Sel label="Kategoria" value={f.category} onChange={e=>s('category',e.target.value)} options={cats.map(c=>({value:c,label:c}))}/>
      <Input label="Kiasi (TZS)" type="number" placeholder="50000" value={f.amount} onChange={e=>s('amount',e.target.value)}/>
      <Input label="Maelezo" placeholder="Mf: SMS za Aprili" value={f.description} onChange={e=>s('description',e.target.value)}/>
      <Input label="Tarehe" type="date" value={f.date} onChange={e=>s('date',e.target.value)}/>
      <Btn onClick={handleAdd} style={{marginTop:10,width:'100%'}}>💸 Hifadhi</Btn>
    </Modal>}
  </div>;
}

// ===== CHANELI PAGE =====
export function AccRevenuePage(){
  const{paymentRequests=[],tokens=[],partners=[],businesses=[],settings}=useApp();
  const price=parseInt(settings?.system_price||PRICE);
  const ap=paymentRequests.filter(p=>p.status==='approved');
  const usedTk=tokens.filter(t=>t.used);
  const totalRev=ap.reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.length*price);
  const pm={};usedTk.forEach(t=>{const n=t.assigned_name||'Admin';pm[n]=(pm[n]||0)+price});
  const byPlan={};usedTk.forEach(t=>{const p=t.plan||'basic';byPlan[p]=(byPlan[p]||0)+price});

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>📊 Mapato kwa Chaneli</h3>
    <div style={{background:'linear-gradient(135deg,#065F2E,#0B7A3B)',borderRadius:20,padding:24,marginBottom:16,color:'#fff',textAlign:'center'}}>
      <div style={{fontSize:12,opacity:.7}}>MAPATO JUMLA</div>
      <div style={{fontSize:36,fontWeight:900}}>{fm(totalRev)}</div>
      <div style={{fontSize:12,opacity:.7}}>Tokens {usedTk.length} zimetumika • Malipo {ap.length} yamethibitishwa</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📋 Kwa Mshirika</h3>
        {Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:32,height:32,borderRadius:8,background:'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📋</div><div><div style={{fontWeight:600,fontSize:13}}>{n}</div><div style={{fontSize:10,color:'#94A3B8'}}>{totalRev?Math.round(a/totalRev*100):0}%</div></div></div>
          <span style={{fontWeight:800,color:'#0B7A3B',fontSize:14}}>{fm(a)}</span>
        </div>)}
        {!Object.keys(pm).length&&<Empty icon="📋" text="Hakuna"/>}
      </div>
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📦 Kwa Plan</h3>
        {Object.entries(byPlan).sort((a,b)=>b[1]-a[1]).map(([p,a])=><div key={p} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between'}}>
          <Badge color={p==='premium'?'#8B5CF6':p==='enterprise'?'#0B7A3B':'#64748B'}>{p.toUpperCase()}</Badge>
          <span style={{fontWeight:800,color:'#0B7A3B'}}>{fm(a)}</span>
        </div>)}
      </div>
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>🔑 Tokens ({usedTk.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {usedTk.map(t=>{const b=businesses.find(x=>x.id===t.used_by);return<div key={t.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',fontSize:12}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontFamily:'monospace',fontWeight:700,color:'#92400E',background:'#FFF7ED',padding:'2px 6px',borderRadius:4}}>{t.code}</span><Badge color={t.plan==='premium'?'#8B5CF6':'#64748B'}>{t.plan||'basic'}</Badge></div>
            <div style={{color:'#64748B',marginTop:2}}>→ {b?.name||t.used_by_name||'—'} • {t.assigned_name?'📋 '+t.assigned_name:'Admin'} • Siku {t.days} • {fm(price)}</div>
          </div>})}
          {!usedTk.length&&<Empty icon="🔑" text="Hakuna tokens zilizotumika"/>}
        </div>
      </div>
    </div>
  </div>;
}

// ===== WATEJA PAGE =====
export function AccCustomersPage(){
  const{businesses=[]}=useApp();
  const ac=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const tr=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const su=businesses.filter(b=>b.is_suspended);
  const exp=businesses.filter(b=>{const e=b.token_active?b.token_expiry:b.trial_end;return e&&Math.ceil((new Date(e)-new Date())/86400000)<=7&&Math.ceil((new Date(e)-new Date())/86400000)>0});

  const List=({items,color,title})=><div className="card" style={{marginBottom:14}}>
    <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px',color}}>{title} ({items.length})</h3>
    <div style={{maxHeight:280,overflowY:'auto'}}>
      {items.map(b=>{const e=b.token_active?b.token_expiry:b.trial_end;const d=e?Math.ceil((new Date(e)-new Date())/86400000):0;
        return<div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <div><b>{b.name}</b><br/><span style={{color:'#94A3B8'}}>{b.email} • {b.phone||'—'}</span></div>
          <div style={{textAlign:'right'}}><Badge color={b.plan==='premium'?'#8B5CF6':'#64748B'}>{b.plan||'trial'}</Badge><br/><span style={{color:d<=5?'#EF4444':d<=14?'#F59E0B':'#22C55E',fontWeight:700,fontSize:11}}>Siku {d}</span></div>
        </div>})}
      {!items.length&&<Empty icon="📋" text="Hakuna"/>}
    </div>
  </div>;

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>🏪 Wateja ({businesses.length})</h3>
    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.ok} label="Wanaolipa" value={ac.length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Trial" value={tr.length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Waliofungwa" value={su.length} color="#EF4444"/>
      <Stat icon={IC.warn} label="Muda Unaisha" value={exp.length} color="#EF4444" sub="ndani ya siku 7"/>
    </div>
    {exp.length>0&&<List items={exp} color="#EF4444" title="⚠️ Muda Unaisha (Siku 7)"/>}
    <List items={ac} color="#22C55E" title="✅ Wanaolipa"/>
    <List items={tr} color="#F59E0B" title="⏳ Trial"/>
    <List items={su} color="#EF4444" title="🔒 Waliofungwa"/>
  </div>;
}

// ===== RIPOTI PAGE =====
export function AccReportsPage(){
  const{paymentRequests=[],tokens=[],businesses=[],systemExpenses=[],settings}=useApp();
  const price=parseInt(settings?.system_price||PRICE);
  const ap=paymentRequests.filter(p=>p.status==='approved');
  const usedTk=tokens.filter(t=>t.used);
  const totalRev=ap.reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.length*price);
  const ms=new Date().toISOString().split('T')[0].slice(0,7);
  const monthRev=ap.filter(p=>p.created_at?.startsWith(ms)).reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.filter(t=>(t.used_at||t.created_at||'').slice(0,7)===ms).length*price);
  const allExp=systemExpenses||[];
  const monthExp=allExp.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms).reduce((a,e)=>a+(+e.amount||0),0);
  const totalExp=allExp.reduce((a,e)=>a+(+e.amount||0),0);

  const pdf=(title,content)=>{const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;margin:30px;color:#1E293B}h1{color:#0B7A3B;border-bottom:3px solid #0B7A3B;padding-bottom:8px}h2{margin-top:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#0B7A3B;color:#fff;padding:8px;text-align:left;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #E2E8F0;font-size:12px}tr:nth-child(even){background:#F8FAFC}.big{font-size:24px;font-weight:900;color:#0B7A3B}@media print{body{margin:15px}}</style></head><body>${content}<div style="margin-top:30px;border-top:2px solid #0B7A3B;padding-top:10px;text-align:center;color:#64748B;font-size:10px">PesaFly / Duka Langu — ${new Date().toLocaleString('sw-TZ')}</div></body></html>`);w.document.close();setTimeout(()=>w.print(),500)};

  const plPDF=()=>{
    const byCat={};allExp.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms).forEach(e=>{byCat[e.category||'Nyingine']=(byCat[e.category||'Nyingine']||0)+(+e.amount||0)});
    pdf('P&L Report',`<h1>PROFIT & LOSS — ${ms}</h1><p>PesaFly / Duka Langu</p><h2>MAPATO</h2><table><tr><td><b>Ada ya Wateja (${ap.length} malipo / ${usedTk.length} tokens)</b></td><td style="text-align:right"><span class="big">TZS ${monthRev.toLocaleString()}</span></td></tr></table><h2>MATUMIZI</h2><table>${Object.entries(byCat).map(([c,a])=>`<tr><td>${c}</td><td style="text-align:right;color:#EF4444">TZS ${a.toLocaleString()}</td></tr>`).join('')}<tr style="background:#FEF2F2"><td><b>JUMLA MATUMIZI</b></td><td style="text-align:right;font-weight:900;color:#EF4444">TZS ${monthExp.toLocaleString()}</td></tr></table><h2>FAIDA HALISI</h2><table><tr style="background:${monthRev-monthExp>=0?'#F0FDF4':'#FEF2F2'}"><td><b style="font-size:18px">NET PROFIT</b></td><td style="text-align:right;font-size:24px;font-weight:900;color:${monthRev-monthExp>=0?'#0B7A3B':'#EF4444'}">TZS ${(monthRev-monthExp).toLocaleString()}</td></tr></table>`);
  };

  const revPDF=()=>{
    const pm={};usedTk.forEach(t=>{pm[t.assigned_name||'Admin']=(pm[t.assigned_name||'Admin']||0)+price});
    pdf('Revenue Report',`<h1>MAPATO — Ripoti Kamili</h1><p class="big">TZS ${totalRev.toLocaleString()}</p><p>Tokens: ${usedTk.length} | Malipo: ${ap.length} | Wateja: ${businesses.length}</p><h2>Kwa Mshirika</h2><table><tr><th>Mshirika</th><th>Mapato</th><th>%</th></tr>${Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=>`<tr><td><b>${n}</b></td><td>TZS ${a.toLocaleString()}</td><td>${totalRev?Math.round(a/totalRev*100):0}%</td></tr>`).join('')}</table><h2>Tokens Zilizotumika (${usedTk.length})</h2><table><tr><th>#</th><th>Code</th><th>Mteja</th><th>Mshirika</th><th>Siku</th><th>Kiasi</th></tr>${usedTk.map((t,i)=>{const b=businesses.find(x=>x.id===t.used_by);return`<tr><td>${i+1}</td><td style="font-family:monospace">${t.code}</td><td>${b?.name||t.used_by_name||'—'}</td><td>${t.assigned_name||'Admin'}</td><td>${t.days}</td><td>TZS ${price.toLocaleString()}</td></tr>`}).join('')}</table>`);
  };

  const expPDF=()=>{
    const byCat={};allExp.forEach(e=>{byCat[e.category||'Nyingine']=(byCat[e.category||'Nyingine']||0)+(+e.amount||0)});
    pdf('Expenses Report',`<h1>MATUMIZI YA MFUMO</h1><p class="big">TZS ${totalExp.toLocaleString()}</p><h2>Kwa Kategoria</h2><table><tr><th>Kategoria</th><th>Kiasi</th></tr>${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td>${c}</td><td>TZS ${a.toLocaleString()}</td></tr>`).join('')}</table><h2>Orodha (${allExp.length})</h2><table><tr><th>#</th><th>Kategoria</th><th>Kiasi</th><th>Maelezo</th><th>Tarehe</th></tr>${allExp.map((e,i)=>`<tr><td>${i+1}</td><td>${e.category||'—'}</td><td>TZS ${(+e.amount||0).toLocaleString()}</td><td>${e.description||'—'}</td><td>${fmtDate(e.date||e.created_at)}</td></tr>`).join('')}</table>`);
  };

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>📋 Ripoti za Fedha</h3>
    <div style={{background:'linear-gradient(135deg,#065F2E,#0B7A3B)',borderRadius:20,padding:24,marginBottom:16,color:'#fff'}}>
      <div style={{textAlign:'center',marginBottom:10}}><div style={{fontSize:12,opacity:.7}}>P&L — {ms}</div></div>
      <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:12,textAlign:'center'}}>
        <div><div style={{fontSize:10,opacity:.6}}>MAPATO</div><div style={{fontSize:24,fontWeight:900}}>{fm(monthRev)}</div></div>
        <div style={{fontSize:24,alignSelf:'center',opacity:.5}}>−</div>
        <div><div style={{fontSize:10,opacity:.6}}>MATUMIZI</div><div style={{fontSize:24,fontWeight:900,color:'#FCA5A5'}}>{fm(monthExp)}</div></div>
        <div style={{fontSize:24,alignSelf:'center',opacity:.5}}>=</div>
        <div><div style={{fontSize:10,opacity:.6}}>FAIDA</div><div style={{fontSize:24,fontWeight:900,color:monthRev-monthExp>=0?'#86EFAC':'#FCA5A5'}}>{fm(monthRev-monthExp)}</div></div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
      <div className="card" style={{textAlign:'center',cursor:'pointer',border:'2px solid #BBF7D0',transition:'transform 0.2s'}} onClick={plPDF} onMouseOver={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
        <div style={{fontSize:40,marginBottom:6}}>📊</div>
        <div style={{fontWeight:800,fontSize:15,color:'#0B7A3B'}}>P&L Report</div>
        <div style={{fontSize:11,color:'#64748B',marginBottom:8}}>Mapato vs Matumizi = Faida</div>
        <button style={{padding:'8px 20px',borderRadius:10,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Pakua PDF</button>
      </div>
      <div className="card" style={{textAlign:'center',cursor:'pointer',border:'2px solid #BFDBFE',transition:'transform 0.2s'}} onClick={revPDF} onMouseOver={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
        <div style={{fontSize:40,marginBottom:6}}>💰</div>
        <div style={{fontWeight:800,fontSize:15,color:'#3B82F6'}}>Mapato Report</div>
        <div style={{fontSize:11,color:'#64748B',marginBottom:8}}>Malipo, washirika, tokens</div>
        <button style={{padding:'8px 20px',borderRadius:10,border:'none',background:'#3B82F6',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Pakua PDF</button>
      </div>
      <div className="card" style={{textAlign:'center',cursor:'pointer',border:'2px solid #FECACA',transition:'transform 0.2s'}} onClick={expPDF} onMouseOver={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
        <div style={{fontSize:40,marginBottom:6}}>💸</div>
        <div style={{fontWeight:800,fontSize:15,color:'#EF4444'}}>Matumizi Report</div>
        <div style={{fontSize:11,color:'#64748B',marginBottom:8}}>Gharama za mfumo</div>
        <button style={{padding:'8px 20px',borderRadius:10,border:'none',background:'#EF4444',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Pakua PDF</button>
      </div>
    </div>
  </div>;
}
