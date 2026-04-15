import React,{useState} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Sel,Btn,Stat,Modal,Badge,Tabs,Empty,Area} from '../../components/UI';
import {fmtMoney,fmtDate,isToday,isThisWeek,isThisMonth,exportToPDF} from '../../utils/helpers';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
const CL=['#0B7A3B','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899'];

// ===== ADMIN DASHBOARD =====
export function AdminDashboard(){
  const{businesses,tokens,promoCodes,notifications,loginLogs,settings,churnRisk,expiringBiz,agentLeaderboard,sales}=useApp();
  const activeBiz=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const todayBiz=businesses.filter(b=>isToday(b.created_at));
  const weekBiz=businesses.filter(b=>isThisWeek(b.created_at));
  const usedTokens=tokens.filter(t=>t.used);
  const revenue=usedTokens.length*parseInt(settings.system_price||30000);
  const monthMap={};businesses.forEach(b=>{const m=b.created_at?.slice(0,7);if(m){monthMap[m]=(monthMap[m]||0)+1}});
  const chartData=Object.entries(monthMap).slice(-6).map(([m,c])=>({month:m.slice(5),count:c}));

  return <div>
    {/* Announcement Banner */}
    {settings.announcement&&<div style={{background:settings.announcement_type==='warning'?'#FFF7ED':settings.announcement_type==='danger'?'#FEF2F2':'#F0FDF4',border:`1px solid ${settings.announcement_type==='warning'?'#FED7AA':settings.announcement_type==='danger'?'#FECACA':'#BBF7D0'}`,borderRadius:12,padding:'10px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:settings.announcement_type==='warning'?'#92400E':settings.announcement_type==='danger'?'#B91C1C':'#15803D'}}>📢 {settings.announcement}</div>}

    <div className="flex-wrap" style={{marginBottom:20}}>
      <Stat icon={IC.store} label="Maduka" value={businesses.length} color="#0B7A3B" sub={`${activeBiz.length} active`}/>
      <Stat icon={IC.users} label="Leo/Wiki" value={`${todayBiz.length}/${weekBiz.length}`} color="#3B82F6" sub="Wapya"/>
      <Stat icon={IC.dollar} label="Mapato" value={fmtMoney(revenue)} color="#F59E0B" sub={`${usedTokens.length} tokens`}/>
      <Stat icon={IC.warn} label="Churn Risk" value={churnRisk.length} color="#EF4444" sub="Hawatumii"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>Usajili/Mwezi</h3>
        {chartData.length>0?<ResponsiveContainer width="100%" height={180}><BarChart data={chartData}><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey="count" fill="#0B7A3B" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<Empty icon="📊" text="Hakuna data"/>}</div>

      {/* Churn Risk */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px',color:'#EF4444'}}>⚠️ Churn Risk ({churnRisk.length})</h3>
        {churnRisk.slice(0,5).map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:600,fontSize:12}}>{b.name}</div><div style={{fontSize:11,color:'#94A3B8'}}>{b.email}</div></div>
          <Badge color={b.risk==='high'?'#EF4444':b.risk==='medium'?'#F59E0B':'#3B82F6'}>{b.daysSince} siku</Badge>
        </div>)}
        {!churnRisk.length&&<Empty icon="✅" text="Wateja wote wako active!"/>}</div>

      {/* Expiring Soon */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px',color:'#F59E0B'}}>⏳ Zinaisha Hivi Karibuni ({expiringBiz.length})</h3>
        {expiringBiz.slice(0,5).map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between'}}>
          <div style={{fontWeight:600,fontSize:12}}>{b.name}</div>
          <Badge color="#F59E0B">Siku {b.daysRemaining}</Badge>
        </div>)}
        {!expiringBiz.length&&<Empty icon="✅" text="Hakuna zinazoisha"/>}</div>

      {/* Agent Leaderboard */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🏆 Mawakala Bora</h3>
        {agentLeaderboard.slice(0,5).map((a,i)=><div key={a.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:22,height:22,borderRadius:'50%',background:i===0?'#F0FDF4':'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:i===0?'#0B7A3B':'#64748B'}}>{i+1}</span>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{a.agent_name}</div><div style={{fontSize:11,color:'#64748B'}}>{a.clients} wateja | {fmtMoney(a.commission)} kamisheni</div></div>
        </div>)}
        {!agentLeaderboard.length&&<Empty icon="👥" text="Hakuna mawakala"/>}</div>

      {/* Recent Logins */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🔐 Login</h3>
        {loginLogs.slice(0,8).map((l,i)=><div key={i} style={{padding:'4px 0',borderBottom:'1px solid #F1F5F9',fontSize:12}}>
          <span style={{fontWeight:600}}>{l.email?.slice(0,25)}</span> <Badge color={l.action==='login'?'#22C55E':'#94A3B8'}>{l.action}</Badge>
          <span style={{color:'#94A3B8',marginLeft:6,fontSize:10}}>{fmtDate(l.created_at)}</span>
        </div>)}</div>

      {/* Notifications */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📢 Arifa ({notifications.length})</h3>
        {notifications.slice(0,6).map(n=><div key={n.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',gap:8}}>
          <span style={{fontSize:16}}>{n.type==='danger'?'🚨':n.type==='warning'?'⚠️':'🏪'}</span>
          <div><div style={{fontWeight:600,fontSize:12}}>{n.title}</div><div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(n.created_at)}</div></div>
        </div>)}</div>
    </div>
  </div>;
}

// ===== STORES =====
export function StoresPage(){
  const{businesses,suspendBiz,deleteBiz,updateSetting,settings}=useApp();
  const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');
  const filtered=businesses.filter(b=>{if(search&&!b.name?.toLowerCase().includes(search.toLowerCase())&&!b.email?.toLowerCase().includes(search.toLowerCase()))return false;if(filter==='active')return b.token_active;if(filter==='suspended')return b.is_suspended;if(filter==='trial')return!b.token_active&&!b.is_suspended;return true});

  // Check per-business branch setting
  const isBranchOn=(bid)=>{
    const key=`branch_biz_${bid}`;
    return settings[key]==='true';
  };
  const toggleBranch=async(bid)=>{
    const key=`branch_biz_${bid}`;
    const current=settings[key]==='true';
    await updateSetting(key,current?'false':'true');
  };

  return <div className="card">
    <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Maduka ({filtered.length})</h3>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <div style={{position:'relative'}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8'}}>{IC.find}</span>
          <input placeholder="Tafuta..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:'8px 8px 8px 34px',borderRadius:8,border:'1px solid #E2E8F0',fontSize:13,outline:'none',width:180}}/></div>
        <Sel options={[{value:'all',label:'Zote'},{value:'active',label:'Active'},{value:'trial',label:'Trial'},{value:'suspended',label:'Suspended'}]} value={filter} onChange={e=>setFilter(e.target.value)}/>
      </div>
    </div>
    {filtered.map(b=><div key={b.id} style={{padding:12,borderBottom:'1px solid #F1F5F9',display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
      <div style={{width:40,height:40,borderRadius:10,background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🏪</div>
      <div style={{flex:1,minWidth:160}}>
        <div style={{fontWeight:700,fontSize:13}}>{b.name}</div>
        <div style={{fontSize:11,color:'#64748B'}}>{b.email} • {fmtDate(b.created_at)}</div>
        <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>Plan: <Badge color={b.plan==='premium'?'#8B5CF6':b.plan==='enterprise'?'#0B7A3B':'#64748B'}>{b.plan||'trial'}</Badge></div>
      </div>
      <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
        <Badge color={b.token_active?'#22C55E':b.is_suspended?'#EF4444':'#F59E0B'}>{b.token_active?'Active':b.is_suspended?'Suspended':'Trial'}</Badge>
        {/* Per-business branch toggle */}
        <button onClick={()=>toggleBranch(b.id)} title="Multi-Branch" style={{padding:'5px 8px',fontSize:10,borderRadius:6,border:'none',background:isBranchOn(b.id)||b.plan==='premium'||b.plan==='enterprise'?'#F0FDF4':'#F1F5F9',color:isBranchOn(b.id)||b.plan==='premium'||b.plan==='enterprise'?'#0B7A3B':'#94A3B8',fontWeight:700,cursor:'pointer'}}>
          🏪 {isBranchOn(b.id)||b.plan==='premium'||b.plan==='enterprise'?'Branch ON':'Branch OFF'}
        </button>
        <Btn v={b.is_suspended?'primary':'warning'} style={{padding:'5px 10px',fontSize:11}} onClick={()=>suspendBiz(b.id,!b.is_suspended)}>{b.is_suspended?'Fungua':'Funga'}</Btn>
        <Btn v="danger" style={{padding:'5px 10px',fontSize:11}} onClick={()=>window.confirm('Futa?')&&deleteBiz(b.id)}>Futa</Btn>
      </div>
    </div>)}
    {!filtered.length&&<Empty text="Hakuna"/>}
  </div>;
}

// ===== TOKENS =====
export function TokensPage(){
  const{tokens,genToken}=useApp();const[days,setDays]=useState('30');const[plan,setPlan]=useState('basic');
  return <div>
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>Tengeneza Token</h3>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{width:120}}><Input label="Siku" type="number" value={days} onChange={e=>setDays(e.target.value)}/></div>
        <div style={{width:140}}><Sel label="Plan" value={plan} onChange={e=>setPlan(e.target.value)} options={[{value:'basic',label:'Basic'},{value:'premium',label:'Premium'}]}/></div>
        <Btn onClick={async()=>{const c=await genToken(days,plan);alert('Token: '+c)}} style={{marginBottom:12}}>{IC.plus} Tengeneza</Btn>
      </div>
    </div>
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>Tokens ({tokens.length})</h3>
      {tokens.map(t=><div key={t.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:6,alignItems:'center'}}>
        <div><span style={{fontFamily:'monospace',fontWeight:700,fontSize:13,background:'#F1F5F9',padding:'2px 8px',borderRadius:6}}>{t.code}</span><span style={{fontSize:12,color:'#64748B',marginLeft:8}}>Siku: {t.days}</span></div>
        <Badge color={t.used?'#B91C1C':'#15803D'}>{t.used?'Imetumika':'Inapatikana'}</Badge>
      </div>)}
      {!tokens.length&&<Empty text="Hakuna"/>}
    </div>
  </div>;
}

// ===== PROMO + LEADERBOARD =====
export function PromoPage(){
  const{promoCodes,addPromo,agentLeaderboard}=useApp();
  const[agent,setAgent]=useState('');const[phone,setPhone]=useState('');const[comm,setComm]=useState('10');
  return <div>
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>Sajili Wakala</h3>
      <Input label="Jina" value={agent} onChange={e=>setAgent(e.target.value)} placeholder="Jina"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Input label="Simu" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XX"/>
        <Input label="Commission %" type="number" value={comm} onChange={e=>setComm(e.target.value)}/>
      </div>
      <Btn onClick={async()=>{if(!agent.trim())return alert('Weka jina!');const c=await addPromo(agent.trim(),phone.trim(),+comm);alert('Promo: '+c);setAgent('');setPhone('')}}>{IC.plus} Tengeneza</Btn>
    </div>
    {/* LEADERBOARD */}
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>🏆 Agent Leaderboard</h3>
      {agentLeaderboard.map((a,i)=><div key={a.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:10}}>
        <span style={{width:28,height:28,borderRadius:'50%',background:i===0?'#F0FDF4':i===1?'#EFF6FF':'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:i===0?'#0B7A3B':i===1?'#3B82F6':'#64748B'}}>{i+1}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13}}>{a.agent_name} <span style={{fontFamily:'monospace',fontSize:11,color:'#8B5CF6',background:'#F5F3FF',padding:'1px 6px',borderRadius:4,marginLeft:6}}>{a.code}</span></div>
          <div style={{fontSize:11,color:'#64748B'}}>Wateja: {a.clients} ({a.activeClients} active) • Kamisheni: {fmtMoney(a.commission)}</div>
        </div>
      </div>)}
      {!agentLeaderboard.length&&<Empty icon="👥" text="Hakuna mawakala"/>}
    </div>
  </div>;
}

// ===== SETTINGS (with branch toggle, announcement, white label) =====
export function SettingsPage(){
  const{settings,updateSetting}=useApp();
  return <div style={{maxWidth:580}}>
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>Mipangilio ya Mfumo</h3>
      <Input label="Bei ya Mfumo (TZS)" type="number" value={settings.system_price} onChange={e=>updateSetting('system_price',e.target.value)}/>
      <Input label="Siku za Bure (Trial)" type="number" value={settings.trial_days} onChange={e=>updateSetting('trial_days',e.target.value)}/>
      <Input label="Namba ya Malipo" value={settings.payment_number} onChange={e=>updateSetting('payment_number',e.target.value)}/>
      <Input label="Jina la Malipo" value={settings.payment_name} onChange={e=>updateSetting('payment_name',e.target.value)}/>
    </div>
    {/* BRANCH CONTROL */}
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>🏪 Branch System</h3>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
        <span style={{fontSize:13,fontWeight:600}}>Multi-Branch Enabled:</span>
        <button onClick={()=>updateSetting('branch_enabled',settings.branch_enabled==='true'?'false':'true')} style={{padding:'6px 16px',borderRadius:8,border:'none',fontWeight:700,fontSize:12,background:settings.branch_enabled==='true'?'#22C55E':'#94A3B8',color:'#fff',cursor:'pointer'}}>{settings.branch_enabled==='true'?'ON — Wote':'OFF — Imezimwa'}</button>
      </div>
      <div style={{fontSize:12,color:'#64748B',lineHeight:1.5}}>Ukizima, wateja wote hawataona sehemu ya matawi. Ukiwasha, wateja wote wanaweza kuongeza matawi.</div>
    </div>
    {/* ANNOUNCEMENT BANNER */}
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>📢 System Announcement</h3>
      <Sel label="Aina" value={settings.announcement_type||'info'} onChange={e=>updateSetting('announcement_type',e.target.value)} options={[{value:'info',label:'Taarifa (Kijani)'},{value:'warning',label:'Onyo (Njano)'},{value:'danger',label:'Muhimu (Nyekundu)'}]}/>
      <Input label="Ujumbe (weka tupu kuondoa)" value={settings.announcement||''} onChange={e=>updateSetting('announcement',e.target.value)} placeholder="Mf: Mfumo utafanyiwa matengenezo Jumamosi..."/>
      {settings.announcement&&<div style={{background:'#F0FDF4',borderRadius:8,padding:8,fontSize:12,color:'#15803D'}}>Preview: 📢 {settings.announcement}</div>}
    </div>
    {/* WHITE LABEL */}
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>🏷️ White Label</h3>
      <Input label="Jina la Brand (Default: Duka Langu)" value={settings.white_label_name||''} onChange={e=>updateSetting('white_label_name',e.target.value)} placeholder="Duka Langu"/>
      <Input label="Tagline" value={settings.white_label_tagline||''} onChange={e=>updateSetting('white_label_tagline',e.target.value)} placeholder="Together for the better"/>
      <div style={{fontSize:12,color:'#64748B'}}>Wateja wa Premium wanaweza kubadilisha jina na logo ya mfumo.</div>
    </div>
    {/* SMS */}
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>📱 SMS</h3>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
        <span style={{fontSize:13}}>SMS Enabled:</span>
        <button onClick={()=>updateSetting('sms_enabled',settings.sms_enabled==='true'?'false':'true')} style={{padding:'6px 16px',borderRadius:8,border:'none',fontWeight:700,fontSize:12,background:settings.sms_enabled==='true'?'#22C55E':'#94A3B8',color:'#fff',cursor:'pointer'}}>{settings.sms_enabled==='true'?'ON':'OFF'}</button>
      </div>
      <Input label="SMS API Key" value={settings.sms_api_key||''} onChange={e=>updateSetting('sms_api_key',e.target.value)}/>
    </div>
    {/* MAINTENANCE */}
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>🔒 System Control</h3>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:13}}>Maintenance Mode:</span>
        <button onClick={()=>updateSetting('maintenance_mode',settings.maintenance_mode==='true'?'false':'true')} style={{padding:'6px 16px',borderRadius:8,border:'none',fontWeight:700,fontSize:12,background:settings.maintenance_mode==='true'?'#EF4444':'#22C55E',color:'#fff',cursor:'pointer'}}>{settings.maintenance_mode==='true'?'ON':'OFF'}</button>
      </div>
    </div>
  </div>;
}

// ===== BROADCAST =====
export function BroadcastPage(){
  const{broadcastNotif}=useApp();const[title,setTitle]=useState('');const[msg,setMsg]=useState('');const[type,setType]=useState('info');
  return <div className="card" style={{maxWidth:500}}>
    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>📢 Tuma kwa Wote</h3>
    <Sel label="Aina" value={type} onChange={e=>setType(e.target.value)} options={[{value:'info',label:'Taarifa'},{value:'warning',label:'Onyo'},{value:'success',label:'Mafanikio'}]}/>
    <Input label="Kichwa" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Mf: System Update"/>
    <Area label="Ujumbe" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Ujumbe..."/>
    <Btn onClick={()=>{if(!title||!msg)return alert('Jaza!');broadcastNotif(type,title,msg);alert('Ujumbe umetumwa!');setTitle('');setMsg('')}}>{IC.send} Tuma</Btn>
  </div>;
}

// ===== SUPPORT TICKETS =====
export function TicketsPage(){
  const{tickets,replyTicket,closeTicket}=useApp();
  const[sel,setSel]=useState(null);const[reply,setReply]=useState('');
  const open=tickets.filter(t=>t.status==='open');const replied=tickets.filter(t=>t.status==='replied');const closed=tickets.filter(t=>t.status==='closed');
  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.bell} label="Open" value={open.length} color="#EF4444"/>
      <Stat icon={IC.ok} label="Replied" value={replied.length} color="#3B82F6"/>
      <Stat icon={IC.ok} label="Closed" value={closed.length} color="#22C55E"/>
    </div>
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>🎫 Support Tickets</h3>
      {tickets.map(t=><div key={t.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <div><div style={{fontWeight:700,fontSize:13}}>{t.subject}</div><div style={{fontSize:11,color:'#64748B'}}>{t.business_name||t.user_email} • {fmtDate(t.created_at)}</div></div>
          <div style={{display:'flex',gap:4}}>
            <Badge color={t.status==='open'?'#EF4444':t.status==='replied'?'#3B82F6':'#22C55E'}>{t.status}</Badge>
            <Badge color={t.priority==='urgent'?'#EF4444':'#64748B'}>{t.priority}</Badge>
          </div>
        </div>
        <div style={{fontSize:12,color:'#475569',marginTop:4,background:'#F8FAFC',padding:8,borderRadius:6}}>{t.message}</div>
        {t.reply&&<div style={{fontSize:12,color:'#0B7A3B',marginTop:4,background:'#F0FDF4',padding:8,borderRadius:6}}>Jibu: {t.reply}</div>}
        {t.status!=='closed'&&<div style={{display:'flex',gap:6,marginTop:6}}>
          <Btn v="ghost" style={{padding:'4px 10px',fontSize:11}} onClick={()=>setSel(t.id===sel?null:t.id)}>Jibu</Btn>
          <Btn v="ghost" style={{padding:'4px 10px',fontSize:11}} onClick={()=>closeTicket(t.id)}>Funga</Btn>
        </div>}
        {sel===t.id&&<div style={{marginTop:8}}>
          <Input placeholder="Andika jibu..." value={reply} onChange={e=>setReply(e.target.value)}/>
          <Btn style={{padding:'6px 14px',fontSize:12}} onClick={()=>{replyTicket(t.id,reply);setReply('');setSel(null)}}>Tuma Jibu</Btn>
        </div>}
      </div>)}
      {!tickets.length&&<Empty icon="🎫" text="Hakuna tickets"/>}
    </div>
  </div>;
}

// ===== SECURITY =====
export function SecurityPage(){
  const{loginLogs,systemLogs,exportAllData}=useApp();const[tab,setTab]=useState('login');
  return <div className="card">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <Tabs tabs={[{id:'login',label:'Login Logs'},{id:'system',label:'System Logs'}]} active={tab} onChange={setTab}/>
      <Btn v="outline" style={{padding:'6px 12px',fontSize:11}} onClick={exportAllData}>{IC.dl} Export Data</Btn>
    </div>
    {tab==='login'&&<div style={{maxHeight:500,overflowY:'auto'}}>
      {loginLogs.map((l,i)=><div key={i} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',fontSize:12,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
        <div><span style={{fontWeight:600}}>{l.email}</span> <Badge color={l.action==='login'?'#22C55E':'#94A3B8'}>{l.action}</Badge></div>
        <span style={{color:'#94A3B8',fontSize:11}}>{fmtDate(l.created_at)}</span>
      </div>)}{!loginLogs.length&&<Empty text="Hakuna"/>}
    </div>}
    {tab==='system'&&<div style={{maxHeight:500,overflowY:'auto'}}>
      {systemLogs.map((l,i)=><div key={i} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',fontSize:12}}>
        <span style={{fontWeight:600}}>{l.action}</span> <span style={{color:'#64748B'}}>{l.details?.text||''}</span>
        <div style={{fontSize:11,color:'#94A3B8'}}>{l.user_email} • {fmtDate(l.created_at)}</div>
      </div>)}{!systemLogs.length&&<Empty text="Hakuna"/>}
    </div>}
  </div>;
}
