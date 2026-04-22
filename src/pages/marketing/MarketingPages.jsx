import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Sel,Btn,Stat,Modal,Badge,Tabs,Empty,Area} from '../../components/UI';
import {fmtMoney,fmtDate,isToday,isThisWeek,isThisMonth,todayStr} from '../../utils/helpers';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
const CL=['#0B7A3B','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899'];
const fm=n=>fmtMoney(n);

// ===== MARKETING DASHBOARD =====
export function MarketingDash(){
  const{businesses,marketingStats,agentLeaderboard,churnRisk,promoCodes,paymentRequests,todayFollowups,unreadMsgs,campaigns}=useApp();
  const ms=marketingStats;
  const regData=useMemo(()=>{const d=[];for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);const ds=dt.toISOString().split('T')[0];d.push({day:dt.toLocaleDateString('sw',{weekday:'short'}),count:businesses.filter(b=>b.created_at?.startsWith(ds)).length})}return d},[businesses]);
  const pipeData=[{name:'Trial',value:ms.pipeline.leads,color:'#F59E0B'},{name:'Active',value:ms.pipeline.active,color:'#22C55E'},{name:'Churned',value:ms.pipeline.churned,color:'#EF4444'}].filter(d=>d.value>0);

  return <div>
    {/* Alerts */}
    {todayFollowups.length>0&&<div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:13,color:'#92400E',fontWeight:600}}>📞 Follow-up {todayFollowups.length} za leo!</span>
      <Badge color="#F59E0B">{todayFollowups.length}</Badge>
    </div>}
    {unreadMsgs>0&&<div style={{background:'#EFF6FF',border:'1px solid #93C5FD',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:13,color:'#1E40AF',fontWeight:600}}>💬 Ujumbe {unreadMsgs} mpya kutoka Admin!</div>}

    <div className="flex-wrap" style={{marginBottom:20}}>
      <Stat icon={IC.store} label="Wateja" value={ms.totalClients} color="#0B7A3B" sub={`${ms.newThisMonth} mwezi huu`}/>
      <Stat icon={IC.ok} label="Active" value={ms.activeClients} color="#22C55E" sub={`${ms.conversionRate}% conversion`}/>
      <Stat icon={IC.clock} label="Trial" value={ms.trialClients} color="#F59E0B"/>
      <Stat icon={IC.dollar} label="Mapato" value={fm(ms.revenueThisMonth)} color="#3B82F6"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📈 Usajili (Siku 7)</h3>
        <ResponsiveContainer width="100%" height={160}><BarChart data={regData}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#0B7A3B" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📊 Pipeline</h3>
        {pipeData.length>0?<><ResponsiveContainer width="100%" height={140}><PieChart><Pie data={pipeData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({name,value})=>`${name}: ${value}`} style={{fontSize:10}}>{pipeData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie></PieChart></ResponsiveContainer>
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:8}}>{pipeData.map(d=><div key={d.name} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}><div style={{width:10,height:10,borderRadius:3,background:d.color}}/>{d.name}: {d.value}</div>)}</div></>:<Empty icon="📊" text="Hakuna data"/>}</div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🏆 Mawakala Bora</h3>
        {agentLeaderboard.slice(0,5).map((a,i)=><div key={a.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:24,height:24,borderRadius:'50%',background:i===0?'#F0FDF4':'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:i===0?'#0B7A3B':'#64748B'}}>{i+1}</span>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{a.agent_name}</div><div style={{fontSize:11,color:'#64748B'}}>{a.clients} wateja • {fm(a.commission)}</div></div>
        </div>)}{!agentLeaderboard.length&&<Empty icon="👥" text="Sajili mawakala"/>}</div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px',color:'#EF4444'}}>⚠️ Wanaoondoka ({churnRisk.length})</h3>
        {churnRisk.slice(0,5).map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:600,fontSize:12}}>{b.name}</div><div style={{fontSize:11,color:'#94A3B8'}}>{b.email}</div></div>
          <div style={{display:'flex',alignItems:'center',gap:6}}><Badge color={b.risk==='high'?'#EF4444':'#F59E0B'}>{b.daysSince}d</Badge>
            {b.phone&&<a href={`https://wa.me/${b.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{fontSize:10,color:'#22C55E',fontWeight:700}}>WA</a>}
          </div></div>)}{!churnRisk.length&&<Empty icon="✅" text="Wote active!"/>}</div>
    </div>
  </div>;
}

// ===== AGENTS + COMMISSION CALCULATOR =====
export function MktAgentsPage(){
  const{promoCodes,createAgent,deletePromo,agentLeaderboard,businesses,paymentRequests,settings}=useApp();
  const[modal,setModal]=useState(false);
  const[f,setF]=useState({name:'',email:'',phone:'',password:'agent123',commission:'10'});
  const price=parseInt(settings.system_price||30000);

  // Revenue by agent
  const agentRevenue=useMemo(()=>{
    return agentLeaderboard.map(a=>{
      const months={};
      businesses.filter(b=>b.promo_code===a.code).forEach(b=>{
        const m=b.created_at?.slice(0,7);if(m)months[m]=(months[m]||0)+1;
      });
      const monthData=Object.entries(months).slice(-6).map(([m,c])=>({month:m.slice(5),clients:c,revenue:c*price}));
      return{...a,monthData,totalRevenue:a.activeClients*price};
    });
  },[agentLeaderboard,businesses,price]);

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Mawakala ({promoCodes.length})</h3>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Sajili Wakala</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
      {agentRevenue.map((a,i)=><div key={a.id} className="card">
        {/* Tier Badge at top */}
        <div style={{background:a.tier?.color+'15',borderRadius:10,padding:'8px 12px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center',border:`1.5px solid ${a.tier?.color||'#E2E8F0'}33`}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:22}}>{a.tier?.emoji||'⏳'}</span>
            <div><div style={{fontWeight:800,fontSize:14,color:a.tier?.color||'#94A3B8'}}>{a.tier?.name||'Bado'}</div>
            <div style={{fontSize:10,color:'#64748B'}}>Bonus: {fm(a.tier?.bonus||0)}</div></div>
          </div>
          {a.toNextTier>0&&a.nextTier&&<div style={{textAlign:'right'}}>
            <div style={{fontSize:10,color:'#64748B'}}>→ {a.nextTier.emoji} {a.nextTier.name}</div>
            <div style={{fontSize:12,fontWeight:700,color:a.nextTier.color}}>Wateja {a.toNextTier} zaidi</div>
          </div>}
          {a.toNextTier<=0&&a.tier?.name==='Shujaa'&&<div style={{fontSize:11,color:'#F59E0B',fontWeight:700}}>🏆 TOP LEVEL!</div>}
        </div>
        {/* Tier Progress Bar */}
        {a.nextTier&&<div style={{marginBottom:10}}>
          <div style={{height:6,background:'#F1F5F9',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${Math.min(100,Math.round(a.activeClients/(a.nextTier?.min||1)*100))}%`,background:a.tier?.color||'#94A3B8',borderRadius:3,transition:'width 0.5s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#94A3B8',marginTop:2}}><span>{a.activeClients} active</span><span>{a.nextTier?.min} kwa {a.nextTier?.name}</span></div>
        </div>}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <span style={{width:36,height:36,borderRadius:'50%',background:i===0?'#F0FDF4':i===1?'#EFF6FF':'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:i===0?'#0B7A3B':'#64748B'}}>#{i+1}</span>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{a.agent_name}</div><div style={{fontSize:12,color:'#64748B'}}>{a.agent_phone||'-'} • <span style={{fontFamily:'monospace',color:'#8B5CF6'}}>{a.code}</span></div></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
          <div style={{background:'#F0FDF4',borderRadius:8,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Wateja</div><div style={{fontWeight:800,fontSize:16,color:'#0B7A3B'}}>{a.clients}</div></div>
          <div style={{background:'#EFF6FF',borderRadius:8,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Active</div><div style={{fontWeight:800,fontSize:16,color:'#3B82F6'}}>{a.activeClients}</div></div>
          <div style={{background:'#F5F3FF',borderRadius:8,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Kamisheni</div><div style={{fontWeight:800,fontSize:14,color:'#8B5CF6'}}>{fm(a.commission)}</div></div>
        </div>
        <div style={{fontSize:12,color:'#64748B'}}>Commission: <b>{a.commission_rate||10}%</b> • Revenue: <b>{fm(a.totalRevenue)}</b></div>
        <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px',marginTop:8,fontSize:11}}>
          🔗 Link: <code style={{background:'#E2E8F0',padding:'2px 6px',borderRadius:4,fontSize:10}}>duka-langu-system.vercel.app?ref={a.code}</code>
          <button onClick={()=>{navigator.clipboard.writeText(`https://duka-langu-system.vercel.app?ref=${a.code}`);alert('Link imecopy!')}} style={{marginLeft:6,fontSize:10,background:'#0B7A3B',color:'#fff',border:'none',borderRadius:4,padding:'2px 8px',cursor:'pointer'}}>Copy</button>
        </div>
        <div style={{display:'flex',gap:6,marginTop:8}}>
          {a.agent_phone&&<a href={`https://wa.me/${a.agent_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{flex:1,padding:'6px 10px',borderRadius:8,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:600,fontSize:11,cursor:'pointer',textDecoration:'none',textAlign:'center'}}>💬 WhatsApp</a>}
          <button onClick={()=>window.confirm(`Futa wakala "${a.agent_name}"?`)&&deletePromo(a.id)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #FECACA',background:'#FEF2F2',color:'#EF4444',fontWeight:700,fontSize:11,cursor:'pointer'}}>🗑️ Futa</button>
        </div>
      </div>)}
    </div>
    {!agentRevenue.length&&<div className="card"><Empty icon="👥" text="Sajili wakala wa kwanza"/></div>}
    <Modal open={modal} onClose={()=>setModal(false)} title="Sajili Wakala Mpya">
      <div style={{background:'#EFF6FF',borderRadius:10,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#1E40AF'}}>
        Wakala atapata akaunti yake na kuweza kusajili wateja moja kwa moja.
      </div>
      <Input label="Jina Kamili *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Jina kamili la wakala"/>
      <Input label="Email *" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@mfano.com"/>
      <Input label="Namba ya WhatsApp *" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="07XXXXXXXX"/>
      <Input label="Password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
      <Input label="Commission %" type="number" value={f.commission} onChange={e=>setF({...f,commission:e.target.value})}/>
      <Btn onClick={async()=>{
        if(!f.name.trim()||!f.email.trim())return alert('Jaza jina na email!');
        const result=await createAgent(f.name.trim(),f.email.trim(),f.password,f.phone.trim(),+f.commission||10);
        if(result){
          alert(`Wakala amesajiliwa!\n\nJina: ${f.name}\nEmail: ${f.email}\nPassword: ${f.password}\nPromo Code: ${result.code}\n\nMtumie taarifa hizi aingie kwenye mfumo.`);
          setModal(false);setF({name:'',email:'',phone:'',password:'agent123',commission:'10'});
        }else{alert('Tatizo! Jaribu tena.')}
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Sajili Wakala</Btn>
    </Modal>
  </div>;
}

// ===== CUSTOMER PIPELINE =====
export function PipelinePage(){
  const{businesses,marketingStats}=useApp();const[filter,setFilter]=useState('all');
  const filtered=businesses.filter(b=>{if(filter==='trial')return!b.token_active&&!b.is_suspended;if(filter==='active')return b.token_active;if(filter==='suspended')return b.is_suspended;return true});
  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.store} label="Jumla" value={marketingStats.totalClients} color="#0B7A3B"/>
      <Stat icon={IC.clock} label="Trial" value={marketingStats.trialClients} color="#F59E0B"/>
      <Stat icon={IC.ok} label="Active" value={marketingStats.activeClients} color="#22C55E"/>
      <Stat icon={IC.warn} label="Wameondoka" value={marketingStats.suspendedClients} color="#EF4444"/>
    </div>
    <div style={{display:'flex',gap:6,marginBottom:14}}>{[{v:'all',l:'Wote'},{v:'trial',l:'Trial'},{v:'active',l:'Active'},{v:'suspended',l:'Wameondoka'}].map(f=><button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:'7px 16px',borderRadius:8,border:filter===f.v?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:filter===f.v?'#F0FDF4':'#fff',fontWeight:filter===f.v?700:500,fontSize:12,cursor:'pointer',color:filter===f.v?'#0B7A3B':'#64748B'}}>{f.l}</button>)}</div>
    <div className="card">{filtered.map(b=><div key={b.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <div style={{width:36,height:36,borderRadius:8,background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🏪</div>
      <div style={{flex:1,minWidth:150}}><div style={{fontWeight:700,fontSize:13}}>{b.name}</div><div style={{fontSize:11,color:'#64748B'}}>{b.email} • {fmtDate(b.created_at)}</div></div>
      <Badge color={b.token_active?'#22C55E':b.is_suspended?'#EF4444':'#F59E0B'}>{b.token_active?'Active':b.is_suspended?'Ameondoka':'Trial'}</Badge>
      <Badge color="#8B5CF6">{b.plan||'trial'}</Badge>
      {b.phone&&<a href={`https://wa.me/${b.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#22C55E',fontWeight:700,background:'#F0FDF4',padding:'4px 10px',borderRadius:6,textDecoration:'none'}}>WhatsApp</a>}
    </div>)}{!filtered.length&&<Empty icon="🏪" text="Hakuna"/>}</div>
  </div>;
}

// ===== CAMPAIGN MANAGER + TRACKING =====
export function CampaignPage(){
  const{campaigns,addCampaign,updateCampaign,deleteCampaign,businesses}=useApp();
  const[modal,setModal]=useState(false);
  const[f,setF]=useState({name:'',channel:'whatsapp',budget:'',start_date:'',end_date:'',target:'',promo_code:'',description:''});

  const getCampaignStats=(c)=>{
    const signups=businesses.filter(b=>b.promo_code===c.promo_code).length;
    const roi=c.budget>0?Math.round(signups*30000/c.budget*100):0;
    return{signups,roi};
  };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>📢 Kampeni ({campaigns.length})</h3>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Kampeni Mpya</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
      {campaigns.map(c=>{const st=getCampaignStats(c);return <div key={c.id} className="card" style={{borderLeft:`4px solid ${c.status==='active'?'#22C55E':'#94A3B8'}`}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <div style={{fontWeight:800,fontSize:15}}>{c.name}</div>
          <Badge color={c.status==='active'?'#22C55E':'#94A3B8'}>{c.status}</Badge>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
          <div style={{background:'#F0FDF4',borderRadius:8,padding:'6px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Signups</div><div style={{fontWeight:800,fontSize:18,color:'#0B7A3B'}}>{st.signups}</div></div>
          <div style={{background:'#EFF6FF',borderRadius:8,padding:'6px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Budget</div><div style={{fontWeight:700,fontSize:13,color:'#3B82F6'}}>{fm(c.budget||0)}</div></div>
          <div style={{background:'#F5F3FF',borderRadius:8,padding:'6px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>ROI</div><div style={{fontWeight:800,fontSize:16,color:st.roi>100?'#22C55E':'#F59E0B'}}>{st.roi}%</div></div>
        </div>
        <div style={{fontSize:12,color:'#64748B',marginBottom:6}}>📱 {c.channel} • 🎯 Lengo: {c.target||'-'} • Code: <b>{c.promo_code||'-'}</b></div>
        {c.description&&<div style={{fontSize:12,color:'#94A3B8',marginBottom:6}}>{c.description}</div>}
        <div style={{display:'flex',gap:4}}>
          <button onClick={()=>updateCampaign(c.id,{status:c.status==='active'?'paused':'active'})} style={{padding:'5px 10px',borderRadius:6,border:'none',background:c.status==='active'?'#FFF7ED':'#F0FDF4',color:c.status==='active'?'#92400E':'#15803D',fontSize:11,fontWeight:700,cursor:'pointer'}}>{c.status==='active'?'Simamisha':'Endelea'}</button>
          <button onClick={()=>window.confirm('Futa?')&&deleteCampaign(c.id)} style={{padding:'5px 10px',borderRadius:6,border:'none',background:'#FEF2F2',color:'#EF4444',fontSize:11,fontWeight:700,cursor:'pointer'}}>Futa</button>
        </div>
      </div>})}
    </div>
    {!campaigns.length&&<div className="card"><Empty icon="📢" text="Tengeneza kampeni ya kwanza"/></div>}
    <Modal open={modal} onClose={()=>setModal(false)} title="Kampeni Mpya">
      <Input label="Jina la Kampeni *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Mf: Offer ya Mei"/>
      <Sel label="Channel" value={f.channel} onChange={e=>setF({...f,channel:e.target.value})} options={[{value:'whatsapp',label:'WhatsApp'},{value:'facebook',label:'Facebook'},{value:'instagram',label:'Instagram'},{value:'tiktok',label:'TikTok'},{value:'sms',label:'SMS'},{value:'email',label:'Email'},{value:'agents',label:'Mawakala'},{value:'other',label:'Nyingine'}]}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Input label="Budget (TZS)" type="number" value={f.budget} onChange={e=>setF({...f,budget:e.target.value})}/><Input label="Lengo (wateja)" type="number" value={f.target} onChange={e=>setF({...f,target:e.target.value})}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Input label="Kuanza" type="date" value={f.start_date} onChange={e=>setF({...f,start_date:e.target.value})}/><Input label="Kuisha" type="date" value={f.end_date} onChange={e=>setF({...f,end_date:e.target.value})}/></div>
      <Input label="Promo Code (kufuatilia)" value={f.promo_code} onChange={e=>setF({...f,promo_code:e.target.value})} placeholder="Mf: MEI2026"/>
      <Area label="Maelezo" value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Maelezo ya kampeni..."/>
      <Btn onClick={async()=>{if(!f.name)return alert('Weka jina!');await addCampaign({...f,budget:+f.budget||0});setModal(false);setF({name:'',channel:'whatsapp',budget:'',start_date:'',end_date:'',target:'',promo_code:'',description:''})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Tengeneza Kampeni</Btn>
    </Modal>
  </div>;
}

// ===== FOLLOW-UP REMINDERS =====
export function FollowupPage(){
  const{followups,addFollowup,completeFollowup,todayFollowups,businesses}=useApp();
  const[modal,setModal]=useState(false);
  const[f,setF]=useState({customer_name:'',phone:'',due_date:'',note:'',priority:'normal'});
  const[tab,setTab]=useState('today');

  const filtered=tab==='today'?todayFollowups:tab==='pending'?followups.filter(f=>f.status==='pending'):tab==='done'?followups.filter(f=>f.status==='done'):followups;

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>📞 Follow-up ({todayFollowups.length} za leo)</h3>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Ongeza</Btn>
    </div>
    <Tabs tabs={[{id:'today',label:`Leo (${todayFollowups.length})`},{id:'pending',label:'Zote Pending'},{id:'done',label:'Zimekamilika'}]} active={tab} onChange={setTab}/>
    <div className="card">
      {filtered.length?filtered.map(f=><div key={f.id} style={{padding:'12px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:f.status==='done'?'#F0FDF4':f.priority==='urgent'?'#FEF2F2':'#FFF7ED',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{f.status==='done'?'✅':'📞'}</div>
        <div style={{flex:1,minWidth:150}}>
          <div style={{fontWeight:700,fontSize:14}}>{f.customer_name}</div>
          <div style={{fontSize:12,color:'#64748B'}}>{f.phone||'-'} • {f.due_date}</div>
          {f.note&&<div style={{fontSize:12,color:'#94A3B8'}}>{f.note}</div>}
        </div>
        {f.priority==='urgent'&&<Badge color="#EF4444">Haraka!</Badge>}
        {f.status==='pending'&&<div style={{display:'flex',gap:4}}>
          {f.phone&&<a href={`https://wa.me/${f.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{padding:'5px 10px',borderRadius:6,background:'#F0FDF4',color:'#15803D',fontSize:11,fontWeight:700,textDecoration:'none'}}>WhatsApp</a>}
          <button onClick={()=>{const note=prompt('Maelezo (si lazima):');completeFollowup(f.id,note||'')}} style={{padding:'5px 10px',borderRadius:6,border:'none',background:'#22C55E',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Imekamilika</button>
        </div>}
      </div>):<Empty icon={tab==='today'?'✅':'📞'} text={tab==='today'?'Hakuna follow-up za leo — umefanya vizuri!':'Hakuna'}/>}
    </div>
    <Modal open={modal} onClose={()=>setModal(false)} title="Ongeza Follow-up">
      <Input label="Jina la Mteja *" value={f.customer_name} onChange={e=>setF({...f,customer_name:e.target.value})} placeholder="Jina"/>
      <Input label="Simu" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="07XX"/>
      <Input label="Tarehe ya Kupiga *" type="date" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})}/>
      <Sel label="Kiwango" value={f.priority} onChange={e=>setF({...f,priority:e.target.value})} options={[{value:'normal',label:'Kawaida'},{value:'urgent',label:'Haraka Sana!'}]}/>
      <Area label="Maelezo" value={f.note} onChange={e=>setF({...f,note:e.target.value})} placeholder="Mf: Amejaribu trial, follow-up kuhusu Premium"/>
      <Btn onClick={async()=>{if(!f.customer_name||!f.due_date)return alert('Jaza jina na tarehe!');await addFollowup({...f});setModal(false);setF({customer_name:'',phone:'',due_date:'',note:'',priority:'normal'})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
    </Modal>
  </div>;
}

// ===== TESTIMONIALS MANAGER =====
export function TestimonialsPage(){
  const{testimonials,addTestimonial,deleteTestimonial}=useApp();
  const[modal,setModal]=useState(false);
  const[f,setF]=useState({customer_name:'',business_name:'',message:'',rating:5});

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>⭐ Testimonials ({testimonials.length})</h3>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Ongeza</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      {testimonials.map(t=><div key={t.id} className="card" style={{borderLeft:'4px solid #F59E0B'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <div style={{fontWeight:700,fontSize:14}}>{t.customer_name}</div>
          <button onClick={()=>window.confirm('Futa?')&&deleteTestimonial(t.id)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:'3px 6px',color:'#EF4444',cursor:'pointer',fontSize:10}}>✕</button>
        </div>
        <div style={{fontSize:12,color:'#64748B',marginBottom:6}}>{t.business_name||''}</div>
        <div style={{fontSize:14,lineHeight:1.6,color:'#1E293B',fontStyle:'italic',marginBottom:8}}>"{t.message}"</div>
        <div style={{color:'#F59E0B'}}>{'⭐'.repeat(t.rating||5)}</div>
        <div style={{fontSize:10,color:'#94A3B8',marginTop:6}}>{fmtDate(t.created_at)}</div>
      </div>)}
    </div>
    {!testimonials.length&&<div className="card"><Empty icon="⭐" text="Ongeza testimonial ya kwanza — wateja wataamini zaidi!"/></div>}
    <Modal open={modal} onClose={()=>setModal(false)} title="Ongeza Testimonial">
      <Input label="Jina la Mteja *" value={f.customer_name} onChange={e=>setF({...f,customer_name:e.target.value})} placeholder="Mama Fatuma"/>
      <Input label="Jina la Biashara" value={f.business_name} onChange={e=>setF({...f,business_name:e.target.value})} placeholder="Duka la Fatuma"/>
      <Area label="Ujumbe / Maoni *" value={f.message} onChange={e=>setF({...f,message:e.target.value})} placeholder="Mfumo huu umenisaidia sana..."/>
      <Sel label="Rating" value={f.rating} onChange={e=>setF({...f,rating:+e.target.value})} options={[{value:5,label:'⭐⭐⭐⭐⭐ (5)'},{value:4,label:'⭐⭐⭐⭐ (4)'},{value:3,label:'⭐⭐⭐ (3)'}]}/>
      <Btn onClick={async()=>{if(!f.customer_name||!f.message)return alert('Jaza!');await addTestimonial({...f});setModal(false);setF({customer_name:'',business_name:'',message:'',rating:5})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
    </Modal>
  </div>;
}

// ===== INTERNAL MESSAGING (Admin ↔ Marketing) =====
export function MessagingPage(){
  const{myMessages,sendMessage,markMsgRead,unreadMsgs,user}=useApp();
  const[msg,setMsg]=useState('');const[subj,setSubj]=useState('');
  const targetRole=user?.role==='admin'?'marketing':'admin';
  const targetLabel=user?.role==='admin'?'Mshirika wa Masoko':'Admin';

  return <div style={{maxWidth:600}}>
    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>💬 Ujumbe — {targetLabel} {unreadMsgs>0&&<Badge color="#EF4444">{unreadMsgs} mpya</Badge>}</h3>

    {/* Send */}
    <div className="card" style={{marginBottom:16}}>
      <Input label="Kichwa" value={subj} onChange={e=>setSubj(e.target.value)} placeholder="Mf: Ripoti ya masoko"/>
      <Area label="Ujumbe" value={msg} onChange={e=>setMsg(e.target.value)} placeholder={`Andika ujumbe kwa ${targetLabel}...`}/>
      <Btn onClick={()=>{if(!msg.trim())return alert('Andika ujumbe!');sendMessage(targetRole,msg.trim(),subj.trim());setMsg('');setSubj('');alert('Ujumbe umetumwa!')}} style={{width:'100%',justifyContent:'center'}}>{IC.send} Tuma kwa {targetLabel}</Btn>
    </div>

    {/* Messages */}
    <div className="card">
      <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>Mazungumzo</h4>
      {myMessages.length?myMessages.map(m=>{
        const isMe=m.from_role===user?.role;
        return <div key={m.id} onClick={()=>!isMe&&!m.is_read&&markMsgRead(m.id)} style={{padding:'12px',marginBottom:8,borderRadius:12,background:isMe?'#F0FDF4':'#EFF6FF',borderLeft:isMe?'4px solid #0B7A3B':'4px solid #3B82F6',cursor:!isMe&&!m.is_read?'pointer':'default'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <span style={{fontWeight:700,fontSize:12,color:isMe?'#0B7A3B':'#3B82F6'}}>{isMe?'Wewe':m.from_name} ({m.from_role})</span>
            <span style={{fontSize:10,color:'#94A3B8'}}>{fmtDate(m.created_at)} {!isMe&&!m.is_read&&<span style={{color:'#EF4444',fontWeight:700}}>● Mpya</span>}</span>
          </div>
          {m.subject&&<div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{m.subject}</div>}
          <div style={{fontSize:13,color:'#475569',lineHeight:1.5}}>{m.message}</div>
        </div>;
      }):<Empty icon="💬" text={`Hakuna ujumbe — anza mazungumzo na ${targetLabel}!`}/>}
    </div>
  </div>;
}

// ===== EMAIL CAMPAIGN =====
export function EmailCampaignPage(){
  const{businesses}=useApp();
  const[subject,setSubject]=useState('');const[body,setBody]=useState('');const[emoji,setEmoji]=useState('🎉');
  const[filter,setFilter]=useState('all');const[sending,setSending]=useState(false);const[sent,setSent]=useState(false);

  const targets=businesses.filter(b=>{if(filter==='active')return b.token_active;if(filter==='trial')return!b.token_active&&!b.is_suspended;if(filter==='expired')return b.is_suspended;return true}).filter(b=>b.email);

  const sendAll=async()=>{
    if(!subject||!body)return alert('Jaza kichwa na ujumbe!');
    setSending(true);
    for(const b of targets){
      try{await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:b.email,subject:`${emoji} ${subject}`,type:'promotional',data:{title:subject,message:body,emoji,cta:'Fungua Mfumo'}})})}catch(e){}
    }
    setSending(false);setSent(true);setTimeout(()=>setSent(false),5000);
  };

  return <div style={{maxWidth:600}}>
    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>📧 Email Campaign</h3>
    <div className="card">
      <div style={{background:'#EFF6FF',borderRadius:10,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#1E40AF'}}>
        Email itatumwa kwa wateja <b>{targets.length}</b> {filter!=='all'?`(${filter})`:''}.
      </div>
      <Sel label="Wapokeaji" value={filter} onChange={e=>setFilter(e.target.value)} options={[{value:'all',label:`Wote (${businesses.length})`},{value:'active',label:'Active tu'},{value:'trial',label:'Trial tu'},{value:'expired',label:'Expired/Suspended'}]}/>
      <div style={{marginBottom:10}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Emoji</label>
        <div style={{display:'flex',gap:6}}>{['🎉','🔥','⭐','💰','🎁','📢','🚀','💎'].map(e=><button key={e} onClick={()=>setEmoji(e)} style={{fontSize:20,padding:5,borderRadius:8,border:emoji===e?'2px solid #0B7A3B':'1px solid #E2E8F0',background:emoji===e?'#F0FDF4':'#fff',cursor:'pointer'}}>{e}</button>)}</div>
      </div>
      <Input label="Kichwa cha Email *" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Mf: Offer Maalum ya Mei!"/>
      <Area label="Ujumbe *" value={body} onChange={e=>setBody(e.target.value)} placeholder="Leo na kesho tu — punguzo la 30% kwa plan zote!"/>
      <Btn onClick={sendAll} disabled={sending} style={{width:'100%',justifyContent:'center',background:sending?'#86EFAC':'#0B7A3B'}}>
        {sending?'Inatuma...':sent?'✅ Imetumwa!':` Tuma kwa ${targets.length} Wateja`}
      </Btn>
    </div>
  </div>;
}

// ===== DEMO ACCOUNT =====
export function DemoPage(){
  return <div style={{maxWidth:600}}>
    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>🎮 Demo Account</h3>
    <div className="card" style={{textAlign:'center',padding:30}}>
      <div style={{fontSize:50,marginBottom:12}}>🎮</div>
      <h2 style={{fontSize:20,fontWeight:800,color:'#0B7A3B',margin:'0 0 8px'}}>Akaunti ya Demo</h2>
      <p style={{color:'#64748B',fontSize:14,lineHeight:1.6,marginBottom:20}}>Tumia akaunti hii kuonyesha wateja jinsi mfumo unavyofanya kazi. Data ni ya mfano — haigusi mfumo halisi.</p>
      <div style={{background:'#F8FAFC',borderRadius:12,padding:16,marginBottom:20,textAlign:'left'}}>
        <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #E2E8F0'}}><span style={{color:'#64748B'}}>Link:</span><code style={{fontWeight:700}}>duka-langu-system.vercel.app</code></div>
        <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #E2E8F0'}}><span style={{color:'#64748B'}}>Email:</span><code style={{fontWeight:700}}>demo@pesafly.com</code></div>
        <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}><span style={{color:'#64748B'}}>Password:</span><code style={{fontWeight:700}}>demo1234</code></div>
      </div>
      <div style={{background:'#FFF7ED',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#92400E',marginBottom:16}}>
        ⚠️ <b>Muhimu:</b> Tengeneza akaunti ya demo kwenye Supabase Auth na jina "Demo Shop" ili akaunti hii ifanye kazi.
      </div>
      <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:10}}>📋 Script ya Kuonyesha Mteja:</div>
      <div style={{textAlign:'left',background:'#F0FDF4',borderRadius:10,padding:14,fontSize:13,color:'#15803D',lineHeight:1.8}}>
        1. "Karibu! Ngoja nikuonyeshe mfumo wetu..."<br/>
        2. Fungua mfumo → Onyesha Dashboard<br/>
        3. Nenda Mauzo → Onyesha jinsi ya kuuza<br/>
        4. Onyesha Ripoti → "Unaona faida yako hapa"<br/>
        5. Onyesha Wateja → "Unafuatilia deni hapa"<br/>
        6. "Bei ni TZS 30,000 tu kwa mwezi — unapata hizi features zote!"
      </div>
    </div>
  </div>;
}

// ===== MARKETING REPORTS =====
export function MktReportsPage(){
  const{businesses,paymentRequests,agentLeaderboard,marketingStats,churnRisk}=useApp();
  const monthMap={};businesses.forEach(b=>{const m=b.created_at?.slice(0,7);if(m){monthMap[m]=(monthMap[m]||0)+1}});
  const monthData=Object.entries(monthMap).slice(-6).map(([m,c])=>({month:m.slice(5),signups:c}));
  const revMap={};paymentRequests.filter(p=>p.status==='approved').forEach(p=>{const m=p.created_at?.slice(0,7);if(m){revMap[m]=(revMap[m]||0)+(p.amount||0)}});
  const revData=Object.entries(revMap).slice(-6).map(([m,r])=>({month:m.slice(5),revenue:r}));

  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.chart} label="Conversion" value={`${marketingStats.conversionRate}%`} color="#0B7A3B"/>
      <Stat icon={IC.store} label="Mwezi Huu" value={marketingStats.newThisMonth} color="#3B82F6"/>
      <Stat icon={IC.dollar} label="Mapato" value={fm(marketingStats.revenueThisMonth)} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Churn Risk" value={churnRisk.length} color="#EF4444"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📈 Usajili/Mwezi</h3>
        {monthData.length>0?<ResponsiveContainer width="100%" height={180}><BarChart data={monthData}><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Bar dataKey="signups" fill="#0B7A3B" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<Empty icon="📊" text="Hakuna"/>}</div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>💰 Mapato/Mwezi</h3>
        {revData.length>0?<ResponsiveContainer width="100%" height={180}><BarChart data={revData}><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>fm(v)}/><Bar dataKey="revenue" fill="#3B82F6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<Empty icon="💰" text="Hakuna"/>}</div>
    </div>
  </div>;
}

// ===== BROADCAST =====
export function MktBroadcastPage(){
  const{broadcastNotif,businesses}=useApp();
  const[title,setTitle]=useState('');const[msg,setMsg]=useState('');const[type,setType]=useState('info');
  return <div className="card" style={{maxWidth:500}}>
    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>📢 Tuma kwa Wateja Wote ({businesses.length})</h3>
    <Sel label="Aina" value={type} onChange={e=>setType(e.target.value)} options={[{value:'info',label:'Taarifa'},{value:'warning',label:'Onyo'},{value:'success',label:'Offer'}]}/>
    <Input label="Kichwa" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Mf: Offer Maalum!"/>
    <Area label="Ujumbe" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Andika ujumbe..."/>
    <Btn onClick={()=>{if(!title||!msg)return alert('Jaza!');broadcastNotif(type,title,msg);alert('Imetumwa!');setTitle('');setMsg('')}} style={{width:'100%',justifyContent:'center'}}>{IC.send} Tuma ({businesses.length})</Btn>
  </div>;
}
