import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Sel,Btn,Stat,Modal,Badge,Tabs,Empty,Area} from '../../components/UI';
import {fmtMoney,fmtDate,isToday,isThisWeek,isThisMonth} from '../../utils/helpers';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
const CL=['#0B7A3B','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899'];

// ===== MARKETING DASHBOARD =====
export function MarketingDash(){
  const{businesses,marketingStats,agentLeaderboard,churnRisk,promoCodes,paymentRequests,settings}=useApp();
  const fm=n=>fmtMoney(n);
  const ms=marketingStats;

  // Registration chart (last 7 days)
  const regData=useMemo(()=>{
    const d=[];for(let i=6;i>=0;i--){
      const dt=new Date();dt.setDate(dt.getDate()-i);const ds=dt.toISOString().split('T')[0];
      d.push({day:dt.toLocaleDateString('sw',{weekday:'short'}),count:businesses.filter(b=>b.created_at?.startsWith(ds)).length});
    }return d;
  },[businesses]);

  // Pipeline pie
  const pipeData=[
    {name:'Trial',value:ms.pipeline.leads,color:'#F59E0B'},
    {name:'Active',value:ms.pipeline.active,color:'#22C55E'},
    {name:'Churned',value:ms.pipeline.churned,color:'#EF4444'},
  ].filter(d=>d.value>0);

  return <div>
    {/* Stats */}
    <div className="flex-wrap" style={{marginBottom:20}}>
      <Stat icon={IC.store} label="Wateja Jumla" value={ms.totalClients} color="#0B7A3B" sub={`${ms.newThisMonth} mwezi huu`}/>
      <Stat icon={IC.ok} label="Active" value={ms.activeClients} color="#22C55E" sub={`${ms.conversionRate}% conversion`}/>
      <Stat icon={IC.clock} label="Trial" value={ms.trialClients} color="#F59E0B" sub="Wanaojaribu"/>
      <Stat icon={IC.dollar} label="Mapato Mwezi" value={fm(ms.revenueThisMonth)} color="#3B82F6"/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
      {/* Registration Trend */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📈 Usajili (Siku 7)</h3>
        <ResponsiveContainer width="100%" height={160}><BarChart data={regData}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#0B7A3B" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
      </div>

      {/* Pipeline */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📊 Customer Pipeline</h3>
        {pipeData.length>0?<>
          <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={pipeData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({name,value})=>`${name}: ${value}`} style={{fontSize:10}}>
            {pipeData.map((d,i)=><Cell key={i} fill={d.color}/>)}
          </Pie></PieChart></ResponsiveContainer>
          <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:8}}>
            {pipeData.map(d=><div key={d.name} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
              <div style={{width:10,height:10,borderRadius:3,background:d.color}}/>{d.name}: {d.value}
            </div>)}
          </div>
        </>:<Empty icon="📊" text="Hakuna data"/>}
      </div>

      {/* Agent Leaderboard */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🏆 Mawakala Bora</h3>
        {agentLeaderboard.slice(0,6).map((a,i)=><div key={a.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:24,height:24,borderRadius:'50%',background:i===0?'#F0FDF4':i===1?'#EFF6FF':'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:i===0?'#0B7A3B':'#64748B'}}>{i+1}</span>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{a.agent_name}</div><div style={{fontSize:11,color:'#64748B'}}>{a.clients} wateja • {fm(a.commission)} kamisheni</div></div>
          <Badge color={a.activeClients>0?'#22C55E':'#94A3B8'}>{a.activeClients} active</Badge>
        </div>)}
        {!agentLeaderboard.length&&<Empty icon="👥" text="Sajili mawakala"/>}
      </div>

      {/* Churn Risk */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px',color:'#EF4444'}}>⚠️ Wanaoondoka ({churnRisk.length})</h3>
        {churnRisk.slice(0,5).map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:600,fontSize:12}}>{b.name}</div><div style={{fontSize:11,color:'#94A3B8'}}>{b.email}</div></div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <Badge color={b.risk==='high'?'#EF4444':b.risk==='medium'?'#F59E0B':'#3B82F6'}>{b.daysSince} siku</Badge>
            <a href={`https://wa.me/${b.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#22C55E',fontWeight:600,textDecoration:'none'}}>WhatsApp</a>
          </div>
        </div>)}
        {!churnRisk.length&&<Empty icon="✅" text="Wateja wote wako active!"/>}
      </div>

      {/* Conversion Funnel */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🔄 Conversion Funnel</h3>
        {[
          {label:'Wamesajiliwa',value:ms.totalClients,color:'#3B82F6',pct:100},
          {label:'Wanajaribu (Trial)',value:ms.trialClients,color:'#F59E0B',pct:ms.totalClients?Math.round(ms.trialClients/ms.totalClients*100):0},
          {label:'Wanalipa (Active)',value:ms.activeClients,color:'#22C55E',pct:ms.totalClients?Math.round(ms.activeClients/ms.totalClients*100):0},
        ].map(f=>(
          <div key={f.label} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span style={{fontWeight:600}}>{f.label}</span><span style={{fontWeight:700}}>{f.value} ({f.pct}%)</span></div>
            <div style={{height:8,background:'#F1F5F9',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${f.pct}%`,background:f.color,borderRadius:4,transition:'width 0.5s'}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Payments */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>💰 Malipo ya Hivi Karibuni</h3>
        {paymentRequests.filter(p=>p.status==='approved').slice(0,5).map(p=><div key={p.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between'}}>
          <div><div style={{fontWeight:600,fontSize:12}}>{p.business_name}</div><div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(p.created_at)}</div></div>
          <span style={{fontWeight:700,color:'#0B7A3B'}}>{fm(p.amount)}</span>
        </div>)}
        {!paymentRequests.filter(p=>p.status==='approved').length&&<Empty icon="💰" text="Hakuna malipo bado"/>}
      </div>
    </div>
  </div>;
}

// ===== AGENTS MANAGEMENT =====
export function MktAgentsPage(){
  const{promoCodes,addPromo,agentLeaderboard}=useApp();
  const fm=n=>fmtMoney(n);
  const[modal,setModal]=useState(false);
  const[agent,setAgent]=useState('');const[phone,setPhone]=useState('');const[comm,setComm]=useState('10');

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Mawakala ({promoCodes.length})</h3>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Sajili Wakala</Btn>
    </div>

    {/* Leaderboard */}
    <div className="card">
      {agentLeaderboard.map((a,i)=><div key={a.id} style={{padding:'12px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:10}}>
        <span style={{width:30,height:30,borderRadius:'50%',background:i===0?'#F0FDF4':i===1?'#EFF6FF':i===2?'#FFF7ED':'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:i===0?'#0B7A3B':i===1?'#3B82F6':i===2?'#F59E0B':'#64748B'}}>{i+1}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>{a.agent_name}</div>
          <div style={{fontSize:12,color:'#64748B'}}>{a.agent_phone||'-'} • <span style={{fontFamily:'monospace',color:'#8B5CF6'}}>{a.code}</span></div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:700,fontSize:14,color:'#0B7A3B'}}>{a.clients} wateja</div>
          <div style={{fontSize:11,color:'#64748B'}}>{a.activeClients} active • {fm(a.commission)} kamisheni</div>
        </div>
      </div>)}
      {!agentLeaderboard.length&&<Empty icon="👥" text="Sajili wakala wa kwanza"/>}
    </div>

    <Modal open={modal} onClose={()=>setModal(false)} title="Sajili Wakala Mpya">
      <Input label="Jina la Wakala *" value={agent} onChange={e=>setAgent(e.target.value)} placeholder="Jina kamili"/>
      <Input label="Simu" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XXXXXXXX"/>
      <Input label="Commission %" type="number" value={comm} onChange={e=>setComm(e.target.value)}/>
      <Btn onClick={async()=>{
        if(!agent.trim())return alert('Weka jina!');
        const c=await addPromo(agent.trim(),phone.trim(),+comm);
        alert('Promo Code: '+c);setModal(false);setAgent('');setPhone('');
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Sajili</Btn>
    </Modal>
  </div>;
}

// ===== CUSTOMER PIPELINE =====
export function PipelinePage(){
  const{businesses,marketingStats}=useApp();
  const[filter,setFilter]=useState('all');

  const filtered=businesses.filter(b=>{
    if(filter==='trial')return!b.token_active&&!b.is_suspended;
    if(filter==='active')return b.token_active&&!b.is_suspended;
    if(filter==='suspended')return b.is_suspended;
    return true;
  });

  const statusColor=b=>b.token_active?'#22C55E':b.is_suspended?'#EF4444':'#F59E0B';
  const statusLabel=b=>b.token_active?'Active':b.is_suspended?'Ameondoka':'Trial';

  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.store} label="Jumla" value={marketingStats.totalClients} color="#0B7A3B"/>
      <Stat icon={IC.clock} label="Trial" value={marketingStats.trialClients} color="#F59E0B"/>
      <Stat icon={IC.ok} label="Active" value={marketingStats.activeClients} color="#22C55E"/>
      <Stat icon={IC.warn} label="Wameondoka" value={marketingStats.suspendedClients} color="#EF4444"/>
    </div>

    <div style={{display:'flex',gap:6,marginBottom:16}}>
      {[{v:'all',l:'Wote'},{v:'trial',l:'Trial'},{v:'active',l:'Active'},{v:'suspended',l:'Wameondoka'}].map(f=>
        <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:'7px 16px',borderRadius:8,border:filter===f.v?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:filter===f.v?'#F0FDF4':'#fff',fontWeight:filter===f.v?700:500,fontSize:12,cursor:'pointer',color:filter===f.v?'#0B7A3B':'#64748B'}}>{f.l} ({f.v==='all'?businesses.length:f.v==='trial'?marketingStats.trialClients:f.v==='active'?marketingStats.activeClients:marketingStats.suspendedClients})</button>
      )}
    </div>

    <div className="card">
      {filtered.map(b=><div key={b.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div style={{width:36,height:36,borderRadius:8,background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🏪</div>
        <div style={{flex:1,minWidth:150}}>
          <div style={{fontWeight:700,fontSize:13}}>{b.name}</div>
          <div style={{fontSize:11,color:'#64748B'}}>{b.email} • {fmtDate(b.created_at)}</div>
        </div>
        <Badge color={statusColor(b)}>{statusLabel(b)}</Badge>
        <Badge color="#8B5CF6">{b.plan||'trial'}</Badge>
        {b.phone&&<a href={`https://wa.me/${b.phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#22C55E',fontWeight:700,textDecoration:'none',background:'#F0FDF4',padding:'4px 10px',borderRadius:6}}>WhatsApp</a>}
      </div>)}
      {!filtered.length&&<Empty icon="🏪" text="Hakuna"/>}
    </div>
  </div>;
}

// ===== COMMISSION TRACKER =====
export function CommissionPage(){
  const{agentLeaderboard,paymentRequests,settings}=useApp();
  const fm=n=>fmtMoney(n);
  const price=parseInt(settings.system_price||30000);
  const totalCommission=agentLeaderboard.reduce((a,ag)=>a+ag.commission,0);
  const totalRevenue=paymentRequests.filter(p=>p.status==='approved').reduce((a,p)=>a+(p.amount||0),0);

  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.dollar} label="Kamisheni Jumla" value={fm(totalCommission)} color="#0B7A3B"/>
      <Stat icon={IC.dollar} label="Mapato Jumla" value={fm(totalRevenue)} color="#3B82F6"/>
      <Stat icon={IC.users} label="Mawakala" value={agentLeaderboard.length} color="#8B5CF6"/>
    </div>

    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>💰 Kamisheni kwa Wakala</h3>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
        <thead><tr style={{borderBottom:'2px solid #E2E8F0'}}><th style={{textAlign:'left',padding:'8px 6px',color:'#64748B',fontWeight:600}}>#</th><th style={{textAlign:'left',padding:'8px 6px',color:'#64748B',fontWeight:600}}>Wakala</th><th style={{textAlign:'center',padding:'8px 6px',color:'#64748B',fontWeight:600}}>Wateja</th><th style={{textAlign:'center',padding:'8px 6px',color:'#64748B',fontWeight:600}}>Rate</th><th style={{textAlign:'right',padding:'8px 6px',color:'#64748B',fontWeight:600}}>Kamisheni</th></tr></thead>
        <tbody>
          {agentLeaderboard.map((a,i)=><tr key={a.id} style={{borderBottom:'1px solid #F1F5F9'}}>
            <td style={{padding:'8px 6px',fontWeight:700,color:'#94A3B8'}}>{i+1}</td>
            <td style={{padding:'8px 6px'}}><div style={{fontWeight:600}}>{a.agent_name}</div><div style={{fontSize:11,color:'#94A3B8'}}>{a.code}</div></td>
            <td style={{padding:'8px 6px',textAlign:'center'}}><span style={{fontWeight:700}}>{a.clients}</span><span style={{fontSize:11,color:'#94A3B8'}}> ({a.activeClients} active)</span></td>
            <td style={{padding:'8px 6px',textAlign:'center'}}><Badge color="#8B5CF6">{a.commission_rate||10}%</Badge></td>
            <td style={{padding:'8px 6px',textAlign:'right',fontWeight:700,color:'#0B7A3B'}}>{fm(a.commission)}</td>
          </tr>)}
        </tbody>
        {agentLeaderboard.length>0&&<tfoot><tr style={{borderTop:'2px solid #0B7A3B'}}>
          <td colSpan={4} style={{padding:'8px 6px',fontWeight:800,fontSize:14}}>JUMLA</td>
          <td style={{padding:'8px 6px',textAlign:'right',fontWeight:800,fontSize:14,color:'#0B7A3B'}}>{fm(totalCommission)}</td>
        </tr></tfoot>}
      </table>
      {!agentLeaderboard.length&&<Empty icon="💰" text="Sajili mawakala kuona kamisheni"/>}
    </div>
  </div>;
}

// ===== MARKETING REPORTS =====
export function MktReportsPage(){
  const{businesses,paymentRequests,agentLeaderboard,marketingStats,churnRisk}=useApp();
  const fm=n=>fmtMoney(n);

  // Monthly breakdown
  const monthMap={};
  businesses.forEach(b=>{const m=b.created_at?.slice(0,7);if(m){monthMap[m]=(monthMap[m]||0)+1}});
  const monthData=Object.entries(monthMap).slice(-6).map(([m,c])=>({month:m.slice(5),signups:c}));

  // Revenue by month
  const revMap={};
  paymentRequests.filter(p=>p.status==='approved').forEach(p=>{const m=p.created_at?.slice(0,7);if(m){revMap[m]=(revMap[m]||0)+(p.amount||0)}});
  const revData=Object.entries(revMap).slice(-6).map(([m,r])=>({month:m.slice(5),revenue:r}));

  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.chart} label="Conversion" value={`${marketingStats.conversionRate}%`} color="#0B7A3B" sub="Trial → Active"/>
      <Stat icon={IC.store} label="Mwezi Huu" value={marketingStats.newThisMonth} color="#3B82F6" sub="Wapya"/>
      <Stat icon={IC.dollar} label="Mapato Mwezi" value={fm(marketingStats.revenueThisMonth)} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Churn Risk" value={churnRisk.length} color="#EF4444"/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📈 Usajili kwa Mwezi</h3>
        {monthData.length>0?<ResponsiveContainer width="100%" height={180}><BarChart data={monthData}><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Bar dataKey="signups" fill="#0B7A3B" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<Empty icon="📊" text="Hakuna data"/>}
      </div>

      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>💰 Mapato kwa Mwezi</h3>
        {revData.length>0?<ResponsiveContainer width="100%" height={180}><BarChart data={revData}><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>fm(v)}/><Bar dataKey="revenue" fill="#3B82F6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<Empty icon="💰" text="Hakuna data"/>}
      </div>

      {/* Key Metrics */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📋 Takwimu Muhimu</h3>
        {[
          {label:'Wateja Jumla',value:marketingStats.totalClients,icon:'🏪'},
          {label:'Wanaolipa',value:marketingStats.activeClients,icon:'✅'},
          {label:'Wanaojaribu',value:marketingStats.trialClients,icon:'⏳'},
          {label:'Wameondoka',value:marketingStats.suspendedClients,icon:'❌'},
          {label:'Conversion Rate',value:`${marketingStats.conversionRate}%`,icon:'🔄'},
          {label:'Mawakala',value:agentLeaderboard.length,icon:'👥'},
          {label:'Hatari ya Kuondoka',value:churnRisk.length,icon:'⚠️'},
        ].map(m=><div key={m.label} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F1F5F9'}}>
          <span style={{fontSize:12}}>{m.icon} {m.label}</span>
          <span style={{fontWeight:700,fontSize:13}}>{m.value}</span>
        </div>)}
      </div>
    </div>
  </div>;
}

// ===== BROADCAST TO CUSTOMERS =====
export function MktBroadcastPage(){
  const{broadcastNotif,businesses}=useApp();
  const[title,setTitle]=useState('');const[msg,setMsg]=useState('');const[type,setType]=useState('info');

  return <div className="card" style={{maxWidth:500}}>
    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 16px'}}>📢 Tuma Ujumbe kwa Wateja Wote</h3>
    <div style={{background:'#F0FDF4',borderRadius:10,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#15803D'}}>
      Ujumbe utawafikia wateja <b>{businesses.length}</b> wote wanapoingia kwenye mfumo.
    </div>
    <Sel label="Aina" value={type} onChange={e=>setType(e.target.value)} options={[{value:'info',label:'Taarifa'},{value:'warning',label:'Onyo'},{value:'success',label:'Offer/Promotion'}]}/>
    <Input label="Kichwa" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Mf: Offer Maalum!"/>
    <Area label="Ujumbe" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Andika ujumbe wako hapa..."/>
    <Btn onClick={()=>{if(!title||!msg)return alert('Jaza kichwa na ujumbe!');broadcastNotif(type,title,msg);alert('Ujumbe umetumwa kwa wateja wote!');setTitle('');setMsg('')}} style={{width:'100%',justifyContent:'center'}}>{IC.send} Tuma kwa Wote ({businesses.length})</Btn>
  </div>;
}
