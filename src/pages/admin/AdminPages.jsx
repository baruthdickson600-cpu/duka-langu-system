import React,{useState,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Sel,Btn,Stat,Modal,Badge,Tabs,Empty,Area} from '../../components/UI';
import {fmtMoney,fmtDate,isToday,isThisWeek,isThisMonth,exportToPDF} from '../../utils/helpers';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
const CL=['#0B7A3B','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899'];

// ===== ADMIN DASHBOARD =====
export function AdminDashboard(){
  const{businesses,tokens,promoCodes,notifications,loginLogs,settings,churnRisk,expiringBiz,agentLeaderboard,sales,paymentRequests}=useApp();
  
  // Comprehensive stats
  const activeBiz=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const trialBiz=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const suspendedBiz=businesses.filter(b=>b.is_suspended);
  const todayBiz=businesses.filter(b=>isToday(b.created_at));
  const weekBiz=businesses.filter(b=>isThisWeek(b.created_at));
  const monthBiz=businesses.filter(b=>isThisMonth(b.created_at));
  
  // Revenue calculation (multiple sources)
  const usedTokens=tokens.filter(t=>t.used);
  const approvedPayments=(paymentRequests||[]).filter(p=>p.status==='approved');
  const tokenRevenue=usedTokens.length*parseInt(settings.system_price||15000);
  const paymentRevenue=approvedPayments.reduce((s,p)=>s+(p.amount||0),0);
  const totalRevenue=Math.max(tokenRevenue,paymentRevenue,activeBiz.length*parseInt(settings.system_price||15000));
  
  // Monthly revenue
  const thisMonth=new Date().toISOString().slice(0,7);
  const monthRevenue=approvedPayments.filter(p=>p.approved_at?.slice(0,7)===thisMonth).reduce((s,p)=>s+(p.amount||0),0);
  
  // Pending items
  const pendingPayments=(paymentRequests||[]).filter(p=>p.status==='pending').length;
  
  // Charts data
  const monthMap={};businesses.forEach(b=>{const m=b.created_at?.slice(0,7);if(m){monthMap[m]=(monthMap[m]||0)+1}});
  const chartData=Object.entries(monthMap).slice(-6).map(([m,c])=>({month:m.slice(5),count:c}));
  
  // Pie chart - business status
  const statusData=[
    {name:'Active',value:activeBiz.length,color:'#22C55E'},
    {name:'Trial',value:trialBiz.length,color:'#F59E0B'},
    {name:'Suspended',value:suspendedBiz.length,color:'#EF4444'},
  ].filter(s=>s.value>0);
  
  // Conversion rate
  const totalEverSignedUp=businesses.length;
  const convRate=totalEverSignedUp>0?Math.round(activeBiz.length/totalEverSignedUp*100):0;

  return <div>
    {/* Announcement Banner */}
    {settings.announcement&&<div style={{background:settings.announcement_type==='warning'?'#FFF7ED':settings.announcement_type==='danger'?'#FEF2F2':'#F0FDF4',border:`1px solid ${settings.announcement_type==='warning'?'#FED7AA':settings.announcement_type==='danger'?'#FECACA':'#BBF7D0'}`,borderRadius:12,padding:'10px 16px',marginBottom:16,fontSize:13,fontWeight:600,color:settings.announcement_type==='warning'?'#92400E':settings.announcement_type==='danger'?'#B91C1C':'#15803D'}}>📢 {settings.announcement}</div>}

    {/* HERO REVENUE CARD */}
    <div style={{background:'linear-gradient(135deg,#0B7A3B 0%,#065F2E 100%)',borderRadius:20,padding:24,marginBottom:18,color:'#fff',position:'relative',overflow:'hidden',boxShadow:'0 12px 40px rgba(11,122,59,0.25)'}}>
      <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
      <div style={{position:'absolute',bottom:-50,left:-50,width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
      <div style={{position:'relative',zIndex:1,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,opacity:0.85,letterSpacing:1.5,marginBottom:6}}>💰 MAPATO JUMLA</div>
          <div style={{fontSize:42,fontWeight:900,letterSpacing:-1,marginBottom:4}}>{fmtMoney(totalRevenue)}</div>
          <div style={{fontSize:12,opacity:0.9}}>Mwezi huu: <b>{fmtMoney(monthRevenue)}</b> • Tokens: <b>{usedTokens.length}</b></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
          <div style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(10px)',padding:'12px 16px',borderRadius:12,minWidth:100}}>
            <div style={{fontSize:11,opacity:0.85}}>📈 Conversion</div>
            <div style={{fontSize:24,fontWeight:900}}>{convRate}%</div>
            <div style={{fontSize:10,opacity:0.7}}>trial → paid</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(10px)',padding:'12px 16px',borderRadius:12,minWidth:100}}>
            <div style={{fontSize:11,opacity:0.85}}>⏳ Pending</div>
            <div style={{fontSize:24,fontWeight:900}}>{pendingPayments}</div>
            <div style={{fontSize:10,opacity:0.7}}>malipo</div>
          </div>
        </div>
      </div>
    </div>

    {/* PRIMARY STATS — 4 BIG CARDS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:16}}>
      <div className="card" style={{padding:18,borderTop:'4px solid #0B7A3B',transition:'transform 0.2s'}} onMouseOver={e=>e.currentTarget.style.transform='translateY(-3px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div style={{fontSize:32}}>🏪</div>
          <Badge color="#0B7A3B">+{todayBiz.length} leo</Badge>
        </div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>MADUKA JUMLA</div>
        <div style={{fontSize:32,fontWeight:900,color:'#0B7A3B',lineHeight:1}}>{businesses.length}</div>
        <div style={{fontSize:11,color:'#94A3B8',marginTop:4}}>+{weekBiz.length} wiki • +{monthBiz.length} mwezi</div>
      </div>
      
      <div className="card" style={{padding:18,borderTop:'4px solid #22C55E',transition:'transform 0.2s'}} onMouseOver={e=>e.currentTarget.style.transform='translateY(-3px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div style={{fontSize:32}}>✅</div>
          <Badge color="#22C55E">{convRate}%</Badge>
        </div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>ACTIVE</div>
        <div style={{fontSize:32,fontWeight:900,color:'#22C55E',lineHeight:1}}>{activeBiz.length}</div>
        <div style={{fontSize:11,color:'#94A3B8',marginTop:4}}>wanaolipa</div>
      </div>
      
      <div className="card" style={{padding:18,borderTop:'4px solid #F59E0B',transition:'transform 0.2s'}} onMouseOver={e=>e.currentTarget.style.transform='translateY(-3px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div style={{fontSize:32}}>⏳</div>
        </div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>TRIAL</div>
        <div style={{fontSize:32,fontWeight:900,color:'#F59E0B',lineHeight:1}}>{trialBiz.length}</div>
        <div style={{fontSize:11,color:'#94A3B8',marginTop:4}}>wanaojaribu</div>
      </div>
      
      <div className="card" style={{padding:18,borderTop:'4px solid #EF4444',transition:'transform 0.2s'}} onMouseOver={e=>e.currentTarget.style.transform='translateY(-3px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div style={{fontSize:32}}>⚠️</div>
        </div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>CHURN RISK</div>
        <div style={{fontSize:32,fontWeight:900,color:'#EF4444',lineHeight:1}}>{churnRisk.length}</div>
        <div style={{fontSize:11,color:'#94A3B8',marginTop:4}}>hawatumii</div>
      </div>
    </div>

    {/* SECONDARY STATS — 4 SMALL */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:16}}>
      <div className="card" style={{padding:14,borderLeft:'4px solid #8B5CF6'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>SUSPENDED</div>
        <div style={{fontSize:22,fontWeight:900,color:'#8B5CF6'}}>{suspendedBiz.length}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #3B82F6'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>EXPIRING (5 SIKU)</div>
        <div style={{fontSize:22,fontWeight:900,color:'#3B82F6'}}>{expiringBiz.length}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #EC4899'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>MASUPERVAIZA</div>
        <div style={{fontSize:22,fontWeight:900,color:'#EC4899'}}>{agentLeaderboard.length}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #06B6D4'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>NOTIFICATIONS</div>
        <div style={{fontSize:22,fontWeight:900,color:'#06B6D4'}}>{notifications.length}</div>
      </div>
    </div>

    {/* MAIN GRID — CHARTS & LISTS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
      {/* Monthly registration chart */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 14px',color:'#0B7A3B',display:'flex',alignItems:'center',gap:6}}>📊 Usajili wa Mwezi</h3>
        {chartData.length>0?<ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" tick={{fontSize:11}}/>
            <YAxis tick={{fontSize:11}}/>
            <Tooltip contentStyle={{borderRadius:10,border:'1px solid #E2E8F0',fontSize:12}}/>
            <Bar dataKey="count" fill="#0B7A3B" radius={[8,8,0,0]}/>
          </BarChart>
        </ResponsiveContainer>:<Empty icon="📊" text="Hakuna data ya kutosha"/>}
      </div>

      {/* Business Status Pie */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 14px',color:'#0B7A3B'}}>🥧 Hali za Maduka</h3>
        {statusData.length>0?<ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value})=>`${name}: ${value}`}>
              {statusData.map((s,i)=><Cell key={i} fill={s.color}/>)}
            </Pie>
            <Tooltip/>
          </PieChart>
        </ResponsiveContainer>:<Empty icon="📊" text="Hakuna data"/>}
      </div>

      {/* Pending Payments — IMPORTANT */}
      {pendingPayments>0&&<div className="card" style={{border:'2px solid #F59E0B',background:'linear-gradient(135deg,#FFF7ED,#FFFFFF)'}}>
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#92400E',display:'flex',alignItems:'center',gap:6}}>
          💰 Malipo Yanayosubiri ({pendingPayments})
        </h3>
        {(paymentRequests||[]).filter(p=>p.status==='pending').slice(0,5).map(p=><div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid #FED7AA',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>{p.business_name||'Mteja'}</div>
            <div style={{fontSize:11,color:'#92400E'}}>{fmtDate(p.created_at)}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:900,color:'#F59E0B'}}>{fmtMoney(p.amount||15000)}</div>
            <div style={{fontSize:10,color:'#92400E'}}>{p.payment_method||'HALOPESA'}</div>
          </div>
        </div>)}
        <div style={{marginTop:10,fontSize:11,color:'#92400E',fontStyle:'italic'}}>👈 Nenda kwenye "Malipo" kuthibitisha</div>
      </div>}

      {/* Churn Risk */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#EF4444',display:'flex',alignItems:'center',gap:6}}>⚠️ Churn Risk ({churnRisk.length})</h3>
        {churnRisk.slice(0,5).map(b=><div key={b.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>{b.name}</div>
            <div style={{fontSize:11,color:'#94A3B8'}}>{b.email}</div>
          </div>
          <Badge color={b.risk==='high'?'#EF4444':b.risk==='medium'?'#F59E0B':'#3B82F6'}>{b.daysSince} siku</Badge>
        </div>)}
        {!churnRisk.length&&<Empty icon="✅" text="Wateja wote wako active!"/>}
      </div>

      {/* Expiring Soon */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#F59E0B'}}>⏳ Zinaisha Hivi Karibuni ({expiringBiz.length})</h3>
        {expiringBiz.slice(0,5).map(b=><div key={b.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>{b.name}</div>
            <div style={{fontSize:11,color:'#94A3B8'}}>{b.phone||b.email}</div>
          </div>
          <Badge color={b.daysRemaining<=2?'#EF4444':'#F59E0B'}>Siku {b.daysRemaining}</Badge>
        </div>)}
        {!expiringBiz.length&&<Empty icon="✅" text="Hakuna zinazoisha"/>}
      </div>

      {/* Supervisor Leaderboard with Tiers */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#0B7A3B'}}>🏆 Mawakala — Madaraja</h3>
        {agentLeaderboard.slice(0,6).map((a,i)=><div key={a.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:22}}>{a.tier?.emoji||'⏳'}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.agent_name}</div>
            <div style={{fontSize:11,color:'#64748B'}}>{a.activeClients} active / {a.clients} jumla</div>
          </div>
          <div style={{textAlign:'right'}}>
            <Badge color={a.tier?.color||'#94A3B8'}>{a.tier?.name||'Bado'}</Badge>
            <div style={{fontSize:10,color:'#64748B',marginTop:2}}>{fmtMoney(a.tier?.bonus||0)}</div>
          </div>
        </div>)}
        {!agentLeaderboard.length&&<Empty icon="👥" text="Hakuna masupervaiza"/>}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#3B82F6'}}>🔐 Login za Hivi Karibuni</h3>
        {loginLogs.slice(0,8).map((l,i)=><div key={i} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',fontSize:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
            <span style={{fontWeight:600}}>{l.email?.slice(0,25)}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <Badge color={l.action==='login'?'#22C55E':'#94A3B8'}>{l.action}</Badge>
            <span style={{color:'#94A3B8',fontSize:10}}>{fmtDate(l.created_at)}</span>
          </div>
        </div>)}
        {!loginLogs.length&&<Empty icon="🔐" text="Hakuna login bado"/>}
      </div>

      {/* Notifications */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#8B5CF6'}}>📢 Arifa za Mfumo ({notifications.length})</h3>
        {notifications.slice(0,6).map(n=><div key={n.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',gap:8}}>
          <span style={{fontSize:18}}>{n.type==='danger'?'🚨':n.type==='warning'?'⚠️':n.type==='success'?'✅':'🏪'}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.title}</div>
            <div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(n.created_at)}</div>
          </div>
        </div>)}
        {!notifications.length&&<Empty icon="📢" text="Hakuna arifa"/>}
      </div>
    </div>
  </div>;
}

// ===== STORES (with Customer Detail Card) =====
export function StoresPage(){
  const{businesses,suspendBiz,deleteBiz,updateBiz,updateSetting,settings,quickExtend,quickUpgrade,quickTransfer,deleteAllCustomerData,promoCodes,loginLogs,sales,products,employees,branches,supabase}=useApp();
  const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');
  const[detail,setDetail]=useState(null);
  const[extendDays,setExtendDays]=useState('30');
  const[upgradePlan,setUpgradePlan]=useState('');
  const[transferCode,setTransferCode]=useState('');
  const[actionModal,setActionModal]=useState({type:null,biz:null});
  const[editForm,setEditForm]=useState({name:'',email:'',phone:'',owner_name:''});
  const[editBusy,setEditBusy]=useState(false);
  const[editMsg,setEditMsg]=useState(null);

  const filtered=businesses.filter(b=>{if(search&&!b.name?.toLowerCase().includes(search.toLowerCase())&&!b.email?.toLowerCase().includes(search.toLowerCase()))return false;if(filter==='active')return b.token_active;if(filter==='suspended')return b.is_suspended;if(filter==='trial')return!b.token_active&&!b.is_suspended;return true});

  const isBranchOn=(bid)=>settings[`branch_biz_${bid}`]==='true';
  const toggleBranch=async(bid)=>{
    const k=`branch_biz_${bid}`;
    const newVal=settings[k]==='true'?'false':'true';
    await updateSetting(k,newVal);
    // Hifadhi pia kwenye businesses table ili office users waone mara moja
    await supabase.from('businesses').update({branch_enabled:newVal==='true'}).eq('id',bid);
  };
  const isWholesaleOn=(bid)=>settings[`wholesale_biz_${bid}`]==='true';
  const toggleWholesale=async(bid)=>{
    const k=`wholesale_biz_${bid}`;
    const newVal=settings[k]==='true'?'false':'true';
    await updateSetting(k,newVal);
    // Hifadhi pia kwenye businesses table ili office users waone
    await supabase.from('businesses').update({wholesale_enabled:newVal==='true'}).eq('id',bid);
  };
  const getDaysLeft=(b)=>{const end=b.token_active?b.token_expiry:b.trial_end;if(!end)return 0;return Math.max(0,Math.ceil((new Date(end)-new Date())/86400000))};
  const getBizStats=(bid)=>{
    const p=products.filter(x=>x.business_id===bid).length;
    const s=sales.filter(x=>x.business_id===bid);
    const rev=s.reduce((a,x)=>a+x.total,0);
    const emp=employees.filter(x=>x.business_id===bid).length;
    const br=branches.filter(x=>x.business_id===bid).length;
    const lastLogin=loginLogs.filter(l=>l.email===businesses.find(x=>x.id===bid)?.email).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
    return{products:p,sales:s.length,revenue:rev,employees:emp,branches:br,lastLogin:lastLogin?.created_at};
  };

  return <div>
    {/* Search & Filter */}
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Maduka ({filtered.length})</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <div style={{position:'relative'}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8'}}>{IC.find}</span>
            <input placeholder="Tafuta..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:'8px 8px 8px 34px',borderRadius:8,border:'1px solid #E2E8F0',fontSize:13,outline:'none',width:180}}/></div>
          <Sel options={[{value:'all',label:'Zote'},{value:'active',label:'Active'},{value:'trial',label:'Trial'},{value:'suspended',label:'Suspended'}]} value={filter} onChange={e=>setFilter(e.target.value)}/>
        </div>
      </div>
    </div>

    {/* Customer Cards */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
      {filtered.map(b=>{const dl=getDaysLeft(b);const st=getBizStats(b.id);
        return <div key={b.id} className="card" style={{border:b.is_suspended?'2px solid #FECACA':b.token_active?'1px solid #BBF7D0':'1px solid #FED7AA',cursor:'pointer'}} onClick={()=>setDetail(b)}>
          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:44,height:44,borderRadius:12,background:b.token_active?'#F0FDF4':b.is_suspended?'#FEF2F2':'#FFF7ED',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🏪</div>
              <div>
                <div style={{fontWeight:800,fontSize:15}}>{b.name}</div>
                <div style={{fontSize:12,color:'#64748B'}}>{b.email}</div>
                {b.phone&&<div style={{fontSize:11,color:'#94A3B8'}}>{b.phone}</div>}
              </div>
            </div>
            <Badge color={b.token_active?'#22C55E':b.is_suspended?'#EF4444':'#F59E0B'}>{b.token_active?'Active':b.is_suspended?'Suspended':'Trial'}</Badge>
          </div>

          {/* Stats Grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 8px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#94A3B8'}}>Plan</div>
              <div style={{fontWeight:700,fontSize:13,color:'#8B5CF6'}}>{(b.plan||'trial').toUpperCase()}</div>
            </div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 8px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#94A3B8'}}>Siku</div>
              <div style={{fontWeight:700,fontSize:13,color:dl<=3?'#EF4444':dl<=7?'#F59E0B':'#22C55E'}}>{dl}</div>
            </div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 8px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#94A3B8'}}>Mauzo</div>
              <div style={{fontWeight:700,fontSize:13}}>{st.sales}</div>
            </div>
          </div>

          {/* Quick Info */}
          <div style={{fontSize:11,color:'#64748B',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
            <span>📅 {fmtDate(b.created_at)}</span>
            <span>📦 {st.products} bidhaa</span>
            <span>👥 {st.employees} staff</span>
          </div>

          {/* Quick Actions */}
          <div style={{display:'flex',gap:4,marginTop:10,flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
            <button onClick={(e)=>{e.stopPropagation();setActionModal({type:'extend',biz:b})}} style={{padding:'5px 8px',fontSize:10,borderRadius:6,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:700,cursor:'pointer'}}>+Siku</button>
            <button onClick={(e)=>{e.stopPropagation();setEditForm({name:b.name||'',email:b.email||'',phone:b.phone||'',owner_name:b.owner_name||''});setActionModal({type:'edit',biz:b})}} style={{padding:'5px 8px',fontSize:10,borderRadius:6,border:'1px solid #FED7AA',background:'#FFF7ED',color:'#B45309',fontWeight:700,cursor:'pointer'}}>✏️Edit</button>
            <button onClick={()=>{setUpgradePlan(b.plan||'basic');setActionModal({type:'upgrade',biz:b})}} style={{padding:'5px 8px',fontSize:10,borderRadius:6,border:'1px solid #C4B5FD',background:'#F5F3FF',color:'#7C3AED',fontWeight:700,cursor:'pointer'}}>⬆Plan</button>
            <button onClick={(e)=>{e.stopPropagation();toggleBranch(b.id)}} style={{padding:'5px 10px',fontSize:10,borderRadius:6,border:isBranchOn(b.id)?'1.5px solid #0B7A3B':'1.5px solid #E2E8F0',background:isBranchOn(b.id)?'#F0FDF4':'#fff',color:isBranchOn(b.id)?'#0B7A3B':'#94A3B8',fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
              {isBranchOn(b.id)?<>🏪 Matawi: <span style={{color:'#16A34A'}}>ON</span></>:<>🏪 Matawi: <span>OFF</span></>}
            </button>
            <button onClick={(e)=>{e.stopPropagation();toggleWholesale(b.id)}} style={{padding:'5px 10px',fontSize:10,borderRadius:6,border:isWholesaleOn(b.id)?'1.5px solid #C2410C':'1.5px solid #E2E8F0',background:isWholesaleOn(b.id)?'#FFF7ED':'#fff',color:isWholesaleOn(b.id)?'#C2410C':'#94A3B8',fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
              {isWholesaleOn(b.id)?<>🏷️ Jumla: <span style={{color:'#16A34A'}}>ON</span></>:<>🏷️ Jumla: <span>OFF</span></>}
            </button>
            <Btn v={b.is_suspended?'primary':'warning'} style={{padding:'5px 8px',fontSize:10}} onClick={()=>suspendBiz(b.id,!b.is_suspended)}>{b.is_suspended?'Fungua':'Funga'}</Btn>
          </div>
        </div>;
      })}
    </div>
    {!filtered.length&&<Empty icon="🏪" text="Hakuna"/>}

    {/* ===== CUSTOMER DETAIL MODAL ===== */}
    <Modal open={!!detail} onClose={()=>setDetail(null)} title={`📋 ${detail?.name||''}`} wide>
      {detail&&(()=>{const dl=getDaysLeft(detail);const st=getBizStats(detail.id);const supervisor=promoCodes.find(p=>p.code===detail.promo_code);
        return <>
          {/* Status Banner */}
          <div style={{background:detail.token_active?'#F0FDF4':detail.is_suspended?'#FEF2F2':'#FFF7ED',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <Badge color={detail.token_active?'#22C55E':detail.is_suspended?'#EF4444':'#F59E0B'}>{detail.token_active?'ACTIVE':detail.is_suspended?'SUSPENDED':'TRIAL'}</Badge>
              <span style={{marginLeft:8,fontWeight:700,color:dl<=3?'#EF4444':'#1E293B'}}>Siku {dl} zimebaki</span>
            </div>
            <span style={{fontWeight:800,color:'#8B5CF6',fontSize:16}}>{(detail.plan||'trial').toUpperCase()}</span>
          </div>

          {/* Contact Info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            <div style={{background:'#F8FAFC',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#94A3B8',fontWeight:600,marginBottom:6}}>TAARIFA</div>
              <div style={{fontSize:13,marginBottom:4}}>📧 {detail.email}</div>
              {detail.phone&&<div style={{fontSize:13,marginBottom:4}}>📱 {detail.phone}</div>}
              <div style={{fontSize:13,marginBottom:4}}>📅 Alisajili: {fmtDate(detail.created_at)}</div>
              {supervisor&&<div style={{fontSize:13}}>👤 Supervisor: {supervisor.agent_name} ({supervisor.code})</div>}
            </div>
            <div style={{background:'#F8FAFC',borderRadius:10,padding:12}}>
              <div style={{fontSize:11,color:'#94A3B8',fontWeight:600,marginBottom:6}}>TAKWIMU</div>
              <div style={{fontSize:13,marginBottom:4}}>📦 Bidhaa: <b>{st.products}</b></div>
              <div style={{fontSize:13,marginBottom:4}}>🛒 Mauzo: <b>{st.sales}</b></div>
              <div style={{fontSize:13,marginBottom:4}}>💰 Mapato: <b>TZS {st.revenue.toLocaleString()}</b></div>
              <div style={{fontSize:13,marginBottom:4}}>👥 Staff: <b>{st.employees}</b> | 🏪 Matawi: <b>{st.branches}</b></div>
              {st.lastLogin&&<div style={{fontSize:13}}>🔑 Login: {fmtDate(st.lastLogin)}</div>}
            </div>
          </div>

          {/* === FEATURES MAALUM === */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:8}}>⚙️ Features Maalum</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {/* Wholesale Toggle */}
              <div style={{background:isWholesaleOn(detail.id)?'#FFF7ED':'#F8FAFC',border:isWholesaleOn(detail.id)?'1.5px solid #C2410C':'1.5px solid #E2E8F0',borderRadius:12,padding:'12px 16px',flex:1,minWidth:160}}>
                <div style={{fontSize:11,fontWeight:700,color:'#64748B',marginBottom:4}}>🏷️ BEI YA JUMLA</div>
                <div style={{fontSize:12,color:'#64748B',marginBottom:10}}>Mteja aweze kuuza kwa bei ya jumla na rejareja</div>
                <button onClick={()=>toggleWholesale(detail.id)} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'none',background:isWholesaleOn(detail.id)?'#C2410C':'#0B7A3B',color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer'}}>
                  {isWholesaleOn(detail.id)?'✅ IMEWASHWA — Zima':'❌ IMEZIMWA — Washa'}
                </button>
              </div>
              {/* Branch Toggle */}
              <div style={{background:isBranchOn(detail.id)?'#F0FDF4':'#F8FAFC',border:isBranchOn(detail.id)?'1.5px solid #0B7A3B':'1.5px solid #E2E8F0',borderRadius:12,padding:'12px 16px',flex:1,minWidth:160}}>
                <div style={{fontSize:11,fontWeight:700,color:'#64748B',marginBottom:4}}>🏪 MATAWI</div>
                <div style={{fontSize:12,color:'#64748B',marginBottom:10}}>Mteja aweze kusimamia matawi mengi</div>
                <button onClick={()=>toggleBranch(detail.id)} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'none',background:isBranchOn(detail.id)?'#0B7A3B':'#64748B',color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer'}}>
                  {isBranchOn(detail.id)?'✅ IMEWASHWA — Zima':'❌ IMEZIMWA — Washa'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:8}}>Vitendo vya Haraka</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8,marginBottom:16}}>
            <button onClick={()=>{setDetail(null);setActionModal({type:'extend',biz:detail})}} style={{padding:'12px',borderRadius:10,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>⏳ Ongeza Siku</button>
            <button onClick={()=>{setEditForm({name:detail.name||'',email:detail.email||'',phone:detail.phone||'',owner_name:detail.owner_name||''});setDetail(null);setActionModal({type:'edit',biz:detail})}} style={{padding:'12px',borderRadius:10,border:'1px solid #FED7AA',background:'#FFF7ED',color:'#B45309',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>✏️ Hariri Taarifa</button>
            <button onClick={()=>{setUpgradePlan(detail.plan||'basic');setDetail(null);setActionModal({type:'upgrade',biz:detail})}} style={{padding:'12px',borderRadius:10,border:'1px solid #C4B5FD',background:'#F5F3FF',color:'#7C3AED',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>⬆️ Upgrade Plan</button>
            <button onClick={()=>{setDetail(null);setActionModal({type:'transfer',biz:detail})}} style={{padding:'12px',borderRadius:10,border:'1px solid #93C5FD',background:'#EFF6FF',color:'#2563EB',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>🔄 Hamisha Supervisor</button>
            <button onClick={()=>suspendBiz(detail.id,!detail.is_suspended)} style={{padding:'12px',borderRadius:10,border:'1px solid #FED7AA',background:'#FFF7ED',color:'#92400E',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>{detail.is_suspended?'✅ Fungua':'⛔ Suspend'}</button>
            {detail.phone&&<a href={`https://wa.me/${detail.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{padding:'12px',borderRadius:10,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center',textDecoration:'none'}}>💬 WhatsApp</a>}
            <button onClick={()=>{if(window.confirm(`⚠️ HATARI! Futa data ZOTE za "${detail.name}"? Hii haiwezi kurudishwa!`)){deleteAllCustomerData(detail.id);setDetail(null)}}} style={{padding:'12px',borderRadius:10,border:'1px solid #FECACA',background:'#FEF2F2',color:'#B91C1C',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>🗑️ Futa Data (GDPR)</button>
          </div>
        </>;
      })()}
    </Modal>

    {/* ===== EXTEND MODAL ===== */}
    <Modal open={actionModal.type==='extend'} onClose={()=>setActionModal({type:null,biz:null})} title={`⏳ Ongeza Siku — ${actionModal.biz?.name||''}`}>
      <div style={{background:'#F0FDF4',borderRadius:10,padding:12,marginBottom:14,textAlign:'center'}}>
        <div style={{fontSize:12,color:'#15803D'}}>Siku zilizobaki sasa</div>
        <div style={{fontSize:28,fontWeight:900,color:'#0B7A3B'}}>{actionModal.biz?getDaysLeft(actionModal.biz):0}</div>
      </div>
      <Input label="Ongeza siku ngapi?" type="number" value={extendDays} onChange={e=>setExtendDays(e.target.value)}/>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {[7,14,30,60,90].map(d=><button key={d} onClick={()=>setExtendDays(String(d))} style={{padding:'6px 14px',borderRadius:8,border:extendDays===String(d)?'2px solid #0B7A3B':'1px solid #E2E8F0',background:extendDays===String(d)?'#F0FDF4':'#fff',fontWeight:600,fontSize:12,cursor:'pointer',color:extendDays===String(d)?'#0B7A3B':'#64748B'}}>{d} siku</button>)}
      </div>
      <Btn onClick={async()=>{await quickExtend(actionModal.biz.id,+extendDays);alert(`Siku ${extendDays} zimeongezwa kwa ${actionModal.biz.name}!`);setActionModal({type:null,biz:null})}} style={{width:'100%',justifyContent:'center'}}>✅ Ongeza Siku {extendDays}</Btn>
    </Modal>

    {/* ===== UPGRADE MODAL ===== */}
    <Modal open={actionModal.type==='upgrade'} onClose={()=>setActionModal({type:null,biz:null})} title={`⬆️ Upgrade — ${actionModal.biz?.name||''}`}>
      <div style={{background:'#F5F3FF',borderRadius:10,padding:12,marginBottom:14,textAlign:'center'}}>
        <div style={{fontSize:12,color:'#7C3AED'}}>Plan ya sasa</div>
        <div style={{fontSize:22,fontWeight:900,color:'#8B5CF6'}}>{(actionModal.biz?.plan||'trial').toUpperCase()}</div>
      </div>
      <Sel label="Plan Mpya" value={upgradePlan} onChange={e=>setUpgradePlan(e.target.value)} options={[{value:'trial',label:'Trial'},{value:'basic',label:'Basic'},{value:'premium',label:'Premium'},{value:'enterprise',label:'Enterprise'}]}/>
      <Btn onClick={async()=>{await quickUpgrade(actionModal.biz.id,upgradePlan);alert(`${actionModal.biz.name} → ${upgradePlan.toUpperCase()}!`);setActionModal({type:null,biz:null})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>⬆️ Badilisha Plan</Btn>
    </Modal>

    {/* ===== TRANSFER MODAL ===== */}
    <Modal open={actionModal.type==='transfer'} onClose={()=>setActionModal({type:null,biz:null})} title={`🔄 Hamisha — ${actionModal.biz?.name||''}`}>
      <div style={{fontSize:13,color:'#64748B',marginBottom:12}}>Supervisor wa sasa: <b>{actionModal.biz?.promo_code||'Hakuna'}</b></div>
      <Sel label="Supervisor Mpya" value={transferCode} onChange={e=>setTransferCode(e.target.value)} options={[{value:'',label:'— Ondoa Supervisor —'},...promoCodes.map(p=>({value:p.code,label:`${p.agent_name} (${p.code})`}))]}/>
      <Btn onClick={async()=>{await quickTransfer(actionModal.biz.id,transferCode);alert('Imehamishwa!');setActionModal({type:null,biz:null})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>🔄 Hamisha</Btn>
    </Modal>

    {/* ===== EDIT CUSTOMER MODAL ===== */}
    <Modal open={actionModal.type==='edit'} onClose={()=>{setActionModal({type:null,biz:null});setEditMsg(null)}} title={`✏️ Hariri Taarifa — ${actionModal.biz?.name||''}`} wide>
      <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#1E40AF'}}>
        💡 Tumia kipengele hiki kubadilisha taarifa za mteja akipoteza simu, kubadilisha email, au kurekebisha jina la biashara.
      </div>
      
      {editMsg&&<div style={{background:editMsg.ok?'#F0FDF4':'#FEF2F2',color:editMsg.ok?'#15803D':'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:`4px solid ${editMsg.ok?'#22C55E':'#EF4444'}`}}>{editMsg.msg}</div>}
      
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <Input label="Jina la Biashara" placeholder="Mf: Duka la Rehema" value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/>
        <Input label="Jina la Mmiliki" placeholder="Mf: Asha Hassan" value={editForm.owner_name} onChange={e=>setEditForm(p=>({...p,owner_name:e.target.value}))}/>
        <Input label="Email" type="email" placeholder="email@mfano.com" value={editForm.email} onChange={e=>setEditForm(p=>({...p,email:e.target.value}))}/>
        <Input label="📱 Namba ya Simu" placeholder="07XXXXXXXX" value={editForm.phone} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))}/>
      </div>
      
      <div style={{background:'#FFF7ED',borderRadius:10,padding:'10px 14px',marginTop:8,fontSize:11,color:'#92400E',borderLeft:'4px solid #F59E0B'}}>
        ⚠️ <b>Onyo:</b> Mteja atapata email kwenye anuani mpya kuthibitisha mabadiliko haya. Hakikisha taarifa ni sahihi kabla ya kuhifadhi.
      </div>
      
      <button onClick={async()=>{
        if(!editForm.name&&!editForm.email&&!editForm.phone&&!editForm.owner_name){
          setEditMsg({ok:false,msg:'Jaza angalau sehemu moja!'});return;
        }
        setEditBusy(true);setEditMsg(null);
        const updates={};
        if(editForm.name)updates.name=editForm.name.trim();
        if(editForm.email)updates.email=editForm.email.trim().toLowerCase();
        if(editForm.phone)updates.phone=editForm.phone.trim();
        if(editForm.owner_name)updates.owner_name=editForm.owner_name.trim();
        const result=await updateBiz(actionModal.biz.id,updates);
        if(result.success){
          setEditMsg({ok:true,msg:'✅ Taarifa zimebadilishwa! Mteja amepata email ya kuthibitisha.'});
          setTimeout(()=>{setActionModal({type:null,biz:null});setEditMsg(null);setEditForm({name:'',email:'',phone:'',owner_name:''})},2000);
        }else{
          setEditMsg({ok:false,msg:'❌ Tatizo: '+result.error});
        }
        setEditBusy(false);
      }} disabled={editBusy} style={{width:'100%',marginTop:14,padding:14,background:editBusy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:editBusy?'wait':'pointer',boxShadow:'0 4px 15px rgba(11,122,59,0.3)'}}>
        {editBusy?'⏳ Inahifadhi...':'✅ Hifadhi Mabadiliko'}
      </button>
    </Modal>
  </div>;
}

// ===== TOKENS =====
export function TokensPage(){
  const{tokens,genToken,partners,businesses,paymentRequests,user}=useApp();
  const[days,setDays]=useState('30');const[plan,setPlan]=useState('basic');
  const[assignTo,setAssignTo]=useState('');const[assignName,setAssignName]=useState('');
  const[qty,setQty]=useState('1');const[tab,setTab]=useState('all');const[generating,setGenerating]=useState(false);
  const[search,setSearch]=useState('');
  const[period,setPeriod]=useState('all');

  // SECURITY: Only accountant can access this page
  if(user?.role!=='accountant'){
    return <div style={{padding:40,textAlign:'center',background:'#FEF3C7',borderRadius:16,border:'2px solid #F59E0B'}}>
      <div style={{fontSize:60,marginBottom:14}}>🔒</div>
      <h2 style={{fontSize:22,fontWeight:900,color:'#92400E',margin:'0 0 10px'}}>UKURASA WA MUHASIBU TU</h2>
      <p style={{fontSize:14,color:'#78350F',lineHeight:1.6,maxWidth:500,margin:'0 auto'}}>
        Ukurasa huu wa Tokens unasimamiwa na <b>Muhasibu pekee</b> kwa udhibiti wa fedha za biashara.
        <br/><br/>
        Kama unahitaji kutoa token kwa mteja, wasiliana na Muhasibu.
      </p>
    </div>;
  }

  // Plan pricing (matches biashara plans)
  const PLAN_PRICES={basic:15000,premium:30000,enterprise:60000};
  const PLAN_COLORS={basic:'#64748B',premium:'#8B5CF6',enterprise:'#0B7A3B'};
  const PLAN_ICONS={basic:'⚡',premium:'⭐',enterprise:'👑'};

  // Period filter
  const isInPeriod=(dateStr)=>{
    if(!dateStr||period==='all')return true;
    const d=new Date(dateStr);const now=new Date();
    if(period==='today')return d.toDateString()===now.toDateString();
    if(period==='week'){const w=new Date(now);w.setDate(now.getDate()-7);return d>=w}
    if(period==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    if(period==='year')return d.getFullYear()===now.getFullYear();
    return true;
  };

  const periodTokens=tokens.filter(t=>isInPeriod(t.created_at));
  const usedTokens=periodTokens.filter(t=>t.used);
  const freeTokens=periodTokens.filter(t=>!t.used);

  // Revenue calculations
  const approvedPay=paymentRequests.filter(p=>p.status==='approved'&&isInPeriod(p.created_at));
  const totalRevenue=approvedPay.reduce((a,p)=>a+(p.amount||0),0);
  
  // Estimated revenue from tokens (used tokens × plan price)
  const estimatedRevenue=usedTokens.reduce((sum,t)=>sum+(PLAN_PRICES[t.plan]||PLAN_PRICES.basic),0);
  
  // Revenue per plan
  const revenueByPlan={basic:0,premium:0,enterprise:0};
  const tokensByPlan={basic:0,premium:0,enterprise:0};
  usedTokens.forEach(t=>{
    const p=t.plan||'basic';
    revenueByPlan[p]=(revenueByPlan[p]||0)+(PLAN_PRICES[p]||0);
    tokensByPlan[p]=(tokensByPlan[p]||0)+1;
  });

  // Search filter
  const matchesSearch=(t)=>{
    if(!search)return true;
    const s=search.toLowerCase();
    const biz=businesses.find(b=>b.id===t.used_by);
    return t.code?.toLowerCase().includes(s)||
           t.assigned_name?.toLowerCase().includes(s)||
           biz?.name?.toLowerCase().includes(s);
  };

  const filtered=(tab==='used'?usedTokens:tab==='free'?freeTokens:periodTokens).filter(matchesSearch);

  const handleGenerate=async()=>{
    if(!days||days<1)return alert('Weka siku!');
    setGenerating(true);
    const count=Math.min(parseInt(qty)||1,50);
    const codes=[];
    for(let i=0;i<count;i++){
      const c=await genToken(days,plan,assignTo,assignName||partners.find(p=>p.id===assignTo)?.name||'Muhasibu');
      codes.push(c);
    }
    setGenerating(false);
    if(count===1)alert('✅ Token Imetolewa:\n\n'+codes[0]+'\n\nIpatie mteja apate kufungua mfumo.');
    else alert(`✅ Tokens ${count} zimetolewa!\n\n${codes.join('\n')}\n\nZipatie wateja husika.`);
  };

  const getBizInfo=(t)=>{
    const b=businesses.find(b=>b.id===t.used_by);
    return b?{name:b.name||'—',phone:b.phone||'—',email:b.email||'—'}:null;
  };

  const fmtTime=(d)=>{
    if(!d)return '—';
    const date=new Date(d);
    return date.toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'})+' '+
           date.toLocaleTimeString('sw-TZ',{hour:'2-digit',minute:'2-digit'});
  };

  return <div>
    {/* HEADER */}
    <div style={{marginBottom:18}}>
      <h2 style={{fontSize:24,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>🔑 Tokens & Mahesabu</h2>
      <p style={{fontSize:13,color:'#64748B',margin:0}}>Simamia tokens za wateja na uone mapato ya biashara</p>
    </div>

    {/* PERIOD FILTER */}
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {[
        {id:'all',label:'🗓️ Vyote'},
        {id:'today',label:'📅 Leo'},
        {id:'week',label:'🗓️ Wiki Hii'},
        {id:'month',label:'📆 Mwezi Huu'},
        {id:'year',label:'🎯 Mwaka Huu'},
      ].map(p=><button key={p.id} onClick={()=>setPeriod(p.id)} style={{padding:'8px 14px',borderRadius:10,border:period===p.id?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:period===p.id?'#0B7A3B':'#fff',fontWeight:700,fontSize:12,cursor:'pointer',color:period===p.id?'#fff':'#475569'}}>{p.label}</button>)}
    </div>

    {/* HERO REVENUE CARD */}
    <div style={{
      background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
      borderRadius:16,
      padding:'24px 28px',
      marginBottom:16,
      color:'#fff',
      boxShadow:'0 8px 30px rgba(11,122,59,0.25)',
      display:'grid',
      gridTemplateColumns:'1fr auto',
      alignItems:'center',
      gap:20,
    }}>
      <div>
        <div style={{fontSize:12,opacity:0.85,fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>JUMLA YA MAPATO</div>
        <div style={{fontSize:36,fontWeight:900,marginBottom:6,letterSpacing:-1}}>TZS {totalRevenue.toLocaleString()}</div>
        <div style={{fontSize:12,opacity:0.85}}>
          Malipo {approvedPay.length} yaliyothibitishwa
          {period!=='all'&&` • ${period==='today'?'Leo':period==='week'?'Wiki Hii':period==='month'?'Mwezi Huu':'Mwaka Huu'}`}
        </div>
      </div>
      <div style={{textAlign:'right'}}>
        <div style={{fontSize:11,opacity:0.85,fontWeight:600,letterSpacing:1,marginBottom:4}}>TOKENS</div>
        <div style={{fontSize:28,fontWeight:900}}>{periodTokens.length}</div>
        <div style={{fontSize:11,opacity:0.85}}>{usedTokens.length} zimetumika</div>
      </div>
    </div>

    {/* QUICK STATS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:16}}>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #22C55E',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:11,color:'#15803D',fontWeight:700,letterSpacing:0.5}}>ZINAPATIKANA</div>
        <div style={{fontSize:28,fontWeight:900,color:'#22C55E',marginTop:4}}>{freeTokens.length}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>tayari kutolewa</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #F59E0B',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:11,color:'#B45309',fontWeight:700,letterSpacing:0.5}}>ZIMETUMIKA</div>
        <div style={{fontSize:28,fontWeight:900,color:'#F59E0B',marginTop:4}}>{usedTokens.length}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>na wateja</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #3B82F6',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:11,color:'#1D4ED8',fontWeight:700,letterSpacing:0.5}}>MAPATO YA TOKENS</div>
        <div style={{fontSize:20,fontWeight:900,color:'#3B82F6',marginTop:4}}>TZS {estimatedRevenue.toLocaleString()}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>kulingana na plans</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #8B5CF6',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:11,color:'#6D28D9',fontWeight:700,letterSpacing:0.5}}>WATEJA WAPYA</div>
        <div style={{fontSize:28,fontWeight:900,color:'#8B5CF6',marginTop:4}}>{new Set(usedTokens.map(t=>t.used_by)).size}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>biashara zilizofunguliwa</div>
      </div>
    </div>

    {/* REVENUE BY PLAN — Breakdown */}
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:800,color:'#0B7A3B',margin:'0 0 14px'}}>📊 Mahesabu kwa Kila Plan</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
        {['basic','premium','enterprise'].map(p=>{
          const planRevenue=revenueByPlan[p];
          const planCount=tokensByPlan[p];
          const pct=estimatedRevenue>0?(planRevenue/estimatedRevenue*100):0;
          return <div key={p} style={{
            border:`2px solid ${PLAN_COLORS[p]}30`,
            borderRadius:12,
            padding:'14px 16px',
            background:`linear-gradient(135deg,${PLAN_COLORS[p]}08,${PLAN_COLORS[p]}03)`,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:22}}>{PLAN_ICONS[p]}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14,color:PLAN_COLORS[p],textTransform:'capitalize'}}>{p}</div>
                <div style={{fontSize:10,color:'#94A3B8'}}>TZS {PLAN_PRICES[p].toLocaleString()}/mwezi</div>
              </div>
            </div>
            <div style={{fontSize:24,fontWeight:900,color:PLAN_COLORS[p]}}>TZS {planRevenue.toLocaleString()}</div>
            <div style={{fontSize:11,color:'#64748B',marginTop:4}}>
              <b>{planCount}</b> token{planCount!==1?'s':''} zimetumika ({pct.toFixed(0)}%)
            </div>
            {/* Progress bar */}
            <div style={{height:5,background:'#F1F5F9',borderRadius:5,marginTop:8,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:PLAN_COLORS[p],borderRadius:5,transition:'width 0.5s'}}/>
            </div>
          </div>;
        })}
      </div>
    </div>

    {/* GENERATE TOKEN — Accountant Only */}
    <div className="card" style={{marginBottom:16,border:'2px solid #BBF7D0',background:'linear-gradient(135deg,#F0FDF4,#fff)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{width:42,height:42,borderRadius:10,background:'#0B7A3B',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🔑</div>
        <div>
          <h3 style={{fontSize:16,fontWeight:800,margin:0,color:'#0B7A3B'}}>Tengeneza Token Mpya</h3>
          <div style={{fontSize:11,color:'#64748B'}}>Token itamruhusu mteja kufungua mfumo</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:14}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Muda (Siku)</label>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {[7,14,30,60,90].map(d=><button key={d} onClick={()=>setDays(String(d))} style={{padding:'7px 12px',borderRadius:8,border:days===String(d)?'2px solid #0B7A3B':'1px solid #E2E8F0',background:days===String(d)?'#0B7A3B':'#fff',fontWeight:700,fontSize:12,cursor:'pointer',color:days===String(d)?'#fff':'#64748B'}}>{d}</button>)}
          </div>
        </div>
        <div><Sel label="Plan" value={plan} onChange={e=>setPlan(e.target.value)} options={[
          {value:'basic',label:`⚡ Basic — TZS ${PLAN_PRICES.basic.toLocaleString()}`},
          {value:'premium',label:`⭐ Premium — TZS ${PLAN_PRICES.premium.toLocaleString()}`},
          {value:'enterprise',label:`👑 Enterprise — TZS ${PLAN_PRICES.enterprise.toLocaleString()}`},
        ]}/></div>
        <div><Input label="Idadi" type="number" value={qty} onChange={e=>setQty(e.target.value)}/></div>
        <div><Sel label="Weka kwa Mshirika (Optional)" value={assignTo} onChange={e=>{setAssignTo(e.target.value);const p=partners.find(x=>x.id===e.target.value);if(p)setAssignName(p.name)}} options={[{value:'',label:'— Muhasibu (Mimi) —'},...partners.map(p=>({value:p.id,label:p.name||p.email}))]}/></div>
      </div>
      <button onClick={handleGenerate} disabled={generating} style={{width:'100%',padding:14,background:generating?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:15,cursor:generating?'wait':'pointer',boxShadow:'0 4px 15px rgba(11,122,59,0.3)'}}>
        {generating?'⏳ Inatengeneza...':`🔑 Tengeneza Token ${qty>1?qty+' ':''}— Siku ${days} (${plan})`}
      </button>
    </div>

    {/* SEARCH + TABS */}
    <div style={{background:'#fff',borderRadius:12,padding:'12px 14px',marginBottom:14,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
      <input
        type="text"
        placeholder="🔍 Tafuta kwa token, biashara, au mshirika..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        style={{
          width:'100%',
          padding:'10px 14px',
          border:'1.5px solid #E2E8F0',
          borderRadius:10,
          fontSize:13,
          outline:'none',
          boxSizing:'border-box',
          marginBottom:10,
        }}
      />
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {[
          {id:'all',label:`📚 Zote (${periodTokens.length})`,color:'#0B7A3B'},
          {id:'free',label:`✅ Zinapatikana (${freeTokens.length})`,color:'#22C55E'},
          {id:'used',label:`🎯 Zimetumika (${usedTokens.length})`,color:'#F59E0B'},
        ].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 14px',borderRadius:10,border:tab===t.id?`2px solid ${t.color}`:'1.5px solid #E2E8F0',background:tab===t.id?t.color+'12':'#fff',fontWeight:tab===t.id?700:500,fontSize:12,cursor:'pointer',color:tab===t.id?t.color:'#64748B'}}>{t.label}</button>)}
      </div>
    </div>

    {/* TOKENS LIST */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#0B7A3B'}}>📋 Orodha ya Tokens ({filtered.length})</h3>
      
      {filtered.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(t=>{
          const biz=getBizInfo(t);
          return <div key={t.id} style={{
            padding:'14px 16px',
            background:t.used?'#FFFBEB':'#F0FDF4',
            borderRadius:12,
            border:`1px solid ${t.used?'#FDE68A':'#BBF7D0'}`,
            display:'grid',
            gridTemplateColumns:'auto 1fr auto',
            gap:14,
            alignItems:'center',
          }}>
            <div style={{
              width:46,
              height:46,
              borderRadius:12,
              background:t.used?'#F59E0B':'#22C55E',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              color:'#fff',
              fontSize:22,
              fontWeight:900,
              boxShadow:`0 4px 12px ${t.used?'#F59E0B':'#22C55E'}40`,
            }}>{t.used?'✓':'🔑'}</div>
            
            <div style={{minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                <span style={{fontFamily:'monospace',fontWeight:900,fontSize:15,background:'#fff',padding:'4px 10px',borderRadius:6,color:t.used?'#92400E':'#0B7A3B',border:`1px solid ${t.used?'#FCD34D':'#86EFAC'}`}}>{t.code}</span>
                <span style={{padding:'2px 10px',borderRadius:6,background:PLAN_COLORS[t.plan||'basic'],color:'#fff',fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:0.5}}>{PLAN_ICONS[t.plan||'basic']} {t.plan||'basic'}</span>
                <span style={{padding:'2px 10px',borderRadius:6,background:'#fff',color:'#64748B',fontWeight:700,fontSize:10,border:'1px solid #E2E8F0'}}>📅 Siku {t.days}</span>
                <span style={{padding:'2px 10px',borderRadius:6,background:'#fff',color:'#0B7A3B',fontWeight:800,fontSize:10,border:'1px solid #BBF7D0'}}>💰 TZS {(PLAN_PRICES[t.plan]||PLAN_PRICES.basic).toLocaleString()}</span>
              </div>
              <div style={{fontSize:11,color:'#64748B',display:'flex',gap:8,flexWrap:'wrap'}}>
                <span>🕒 Imetolewa: {fmtTime(t.created_at)}</span>
                {t.assigned_name&&<span style={{color:'#8B5CF6',fontWeight:600}}>• 👤 Mshirika: {t.assigned_name}</span>}
              </div>
              {t.used&&biz&&<div style={{marginTop:8,padding:'8px 12px',background:'#fff',borderRadius:8,border:'1px solid #FDE68A'}}>
                <div style={{fontSize:11,color:'#92400E',fontWeight:700,marginBottom:2}}>🏪 ALIYETUMIA TOKEN HII:</div>
                <div style={{fontWeight:700,fontSize:13,color:'#1E293B'}}>{biz.name}</div>
                <div style={{fontSize:11,color:'#64748B'}}>📞 {biz.phone} • 📧 {biz.email}</div>
                {t.used_at&&<div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>Alitumia: {fmtTime(t.used_at)}</div>}
              </div>}
            </div>
            
            {!t.used&&<button onClick={()=>{navigator.clipboard.writeText(t.code);alert('Token imecopy:\n\n'+t.code)}} style={{padding:'8px 14px',borderRadius:8,border:'2px solid #0B7A3B',background:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',color:'#0B7A3B'}}>📋 Copy</button>}
          </div>;
        })}
      </div>:<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>
        <div style={{fontSize:50,marginBottom:10}}>🔑</div>
        <div style={{fontWeight:700,color:'#64748B'}}>Hakuna tokens</div>
        <div style={{fontSize:12,marginTop:4}}>Tengeneza token mpya juu</div>
      </div>}
    </div>

    {/* REVENUE BREAKDOWN (Approved Payments) */}
    {approvedPay.length>0&&<div className="card" style={{marginTop:16}}>
      <h3 style={{fontSize:15,fontWeight:800,margin:'0 0 12px',color:'#0B7A3B'}}>💰 Mapato Halisi — Malipo Yaliyothibitishwa</h3>
      <div style={{maxHeight:400,overflowY:'auto'}}>
        {approvedPay.map(p=><div key={p.id} style={{padding:'12px 14px',background:'#F8FAFC',borderRadius:10,marginBottom:6,display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'center'}}>
          <div>
            <div style={{fontWeight:800,fontSize:13,color:'#1E293B'}}>{p.business_name}</div>
            <div style={{fontSize:11,color:'#64748B',marginTop:2}}>
              📅 {fmtTime(p.created_at)} • {p.payment_method||'HALOPESA'} • <span style={{fontFamily:'monospace',background:'#fff',padding:'1px 6px',borderRadius:4}}>{p.transaction_id}</span>
            </div>
            {p.token_code&&<div style={{fontSize:11,color:'#8B5CF6',marginTop:3,fontWeight:600}}>🔑 Token: {p.token_code} • Siku: {p.days_given}</div>}
          </div>
          <div style={{fontWeight:900,fontSize:16,color:'#0B7A3B'}}>TZS {(p.amount||0).toLocaleString()}</div>
        </div>)}
      </div>
      <div style={{background:'linear-gradient(135deg,#0B7A3B,#065F2E)',borderRadius:12,padding:'14px 18px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center',color:'#fff'}}>
        <span style={{fontWeight:800,fontSize:14}}>JUMLA YA MAPATO HALISI</span>
        <span style={{fontWeight:900,fontSize:24}}>TZS {totalRevenue.toLocaleString()}</span>
      </div>
    </div>}
  </div>;
}

// ===== PROMO + LEADERBOARD =====
// ===== MASUPERVAIZA (Admin View — Supevaiza anasajiliwa na Marketing Partner) =====
export function PromoPage(){
  const{promoCodes,deletePromo,agentLeaderboard,businesses,AGENT_TIERS}=useApp();
  const[detail,setDetail]=useState(null);

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:16,fontWeight:700,margin:0}}>👥 Mawakala ({promoCodes.length})</h3>
      <div style={{background:'#EFF6FF',borderRadius:8,padding:'6px 14px',fontSize:12,color:'#1E40AF',fontWeight:600}}>Supevaiza anasajiliwa na Mshirika wa Masoko</div>
    </div>

    {/* Tiers Reference */}
    <div className="card" style={{marginBottom:16}}>
      <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📊 Madaraja ya Malipo</h4>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {(AGENT_TIERS||[]).filter(t=>t.min>0).reverse().map(t=>(
          <div key={t.name} style={{background:t.color+'15',border:`1.5px solid ${t.color}33`,borderRadius:10,padding:'6px 12px',textAlign:'center',minWidth:90}}>
            <div style={{fontSize:16}}>{t.emoji}</div>
            <div style={{fontWeight:700,fontSize:12,color:t.color}}>{t.name}</div>
            <div style={{fontSize:10,color:'#64748B'}}>{t.min}+ wateja</div>
            <div style={{fontSize:11,fontWeight:700,color:t.color}}>TZS {(t.bonus||0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Supervisor Cards */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:14}}>
      {agentLeaderboard.map((a,i)=>{
        const agentBiz=businesses.filter(b=>b.promo_code===a.code);
        const activeBiz=agentBiz.filter(b=>b.token_active);
        const trialBiz=agentBiz.filter(b=>!b.token_active&&!b.is_suspended);
        return <div key={a.id} className="card" style={{border:`1.5px solid ${a.tier?.color||'#E2E8F0'}33`}}>
          {/* Tier Badge */}
          <div style={{background:a.tier?.color+'15',borderRadius:10,padding:'8px 12px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:22}}>{a.tier?.emoji||'⏳'}</span>
              <div>
                <div style={{fontWeight:800,fontSize:14,color:a.tier?.color||'#94A3B8'}}>{a.tier?.name||'Bado'}</div>
                <div style={{fontSize:10,color:'#64748B'}}>Bonus: TZS {(a.tier?.bonus||0).toLocaleString()}</div>
              </div>
            </div>
            {a.toNextTier>0&&a.nextTier&&<div style={{textAlign:'right'}}>
              <div style={{fontSize:10,color:'#64748B'}}>Daraja linalofuata: {a.nextTier.emoji}</div>
              <div style={{fontSize:12,fontWeight:700,color:a.nextTier.color}}>Wateja {a.toNextTier} zaidi</div>
            </div>}
          </div>

          {/* Supervisor Info */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:a.tier?.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:a.tier?.color||'#64748B'}}>{a.agent_name?.[0]?.toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:16}}>{a.agent_name}</div>
              <div style={{fontSize:12,color:'#64748B'}}>{a.agent_phone||'Hakuna simu'}</div>
              <div style={{fontSize:11,fontFamily:'monospace',color:'#8B5CF6',background:'#F5F3FF',padding:'1px 8px',borderRadius:4,display:'inline-block',marginTop:2}}>{a.code}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#94A3B8'}}>Jumla</div>
              <div style={{fontWeight:800,fontSize:16,color:'#1E293B'}}>{a.clients}</div>
            </div>
            <div style={{background:'#F0FDF4',borderRadius:8,padding:'6px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#94A3B8'}}>Active</div>
              <div style={{fontWeight:800,fontSize:16,color:'#22C55E'}}>{a.activeClients}</div>
            </div>
            <div style={{background:'#FFF7ED',borderRadius:8,padding:'6px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#94A3B8'}}>Trial</div>
              <div style={{fontWeight:800,fontSize:16,color:'#F59E0B'}}>{trialBiz.length}</div>
            </div>
            <div style={{background:'#F5F3FF',borderRadius:8,padding:'6px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#94A3B8'}}>Kamisheni</div>
              <div style={{fontWeight:800,fontSize:13,color:'#8B5CF6'}}>{fmtMoney(a.commission)}</div>
            </div>
          </div>

          {/* Progress Bar to next tier */}
          {a.nextTier&&<div style={{marginBottom:10}}>
            <div style={{height:6,background:'#F1F5F9',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(100,Math.round(a.activeClients/(a.nextTier.min||1)*100))}%`,background:a.tier?.color||'#94A3B8',borderRadius:3}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#94A3B8',marginTop:2}}>
              <span>{a.activeClients} sasa</span><span>{a.nextTier.min} kwa {a.nextTier.name}</span>
            </div>
          </div>}

          {/* Commission Rate */}
          <div style={{fontSize:12,color:'#64748B',marginBottom:8}}>Commission Rate: <b>{a.commission_rate||10}%</b> • Revenue: <b>{fmtMoney(a.revenue)}</b></div>

          {/* Actions */}
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setDetail(a)} style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',color:'#475569',fontWeight:600,fontSize:12,cursor:'pointer'}}>📋 Wateja Wake</button>
            {a.agent_phone&&<a href={`https://wa.me/${a.agent_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{padding:'7px 10px',borderRadius:8,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:600,fontSize:12,cursor:'pointer',textDecoration:'none'}}>WhatsApp</a>}
            <button onClick={()=>window.confirm(`Futa supevaiza "${a.agent_name}" na promo code ${a.code}?`)&&deletePromo(a.id)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #FECACA',background:'#FEF2F2',color:'#EF4444',fontWeight:700,fontSize:12,cursor:'pointer'}}>🗑️</button>
          </div>
        </div>;
      })}
    </div>
    {!agentLeaderboard.length&&<div className="card"><Empty icon="👥" text="Hakuna masupervaiza — Mshirika wa Masoko atasajili masupervaiza"/></div>}

    {/* Supervisor Detail Modal — shows customers */}
    <Modal open={!!detail} onClose={()=>setDetail(null)} title={`👤 ${detail?.agent_name||''} — Wateja`} wide>
      {detail&&(()=>{
        const agentBiz=businesses.filter(b=>b.promo_code===detail.code);
        return <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
            <div style={{background:'#F0FDF4',borderRadius:10,padding:'8px',textAlign:'center'}}>
              <div style={{fontSize:10,color:'#94A3B8'}}>Jumla</div>
              <div style={{fontWeight:800,fontSize:20,color:'#0B7A3B'}}>{agentBiz.length}</div>
            </div>
            <div style={{background:'#F5F3FF',borderRadius:10,padding:'8px',textAlign:'center'}}>
              <div style={{fontSize:10,color:'#94A3B8'}}>Active</div>
              <div style={{fontWeight:800,fontSize:20,color:'#8B5CF6'}}>{agentBiz.filter(b=>b.token_active).length}</div>
            </div>
            <div style={{background:'#FFF7ED',borderRadius:10,padding:'8px',textAlign:'center'}}>
              <div style={{fontSize:10,color:'#94A3B8'}}>Trial</div>
              <div style={{fontWeight:800,fontSize:20,color:'#F59E0B'}}>{agentBiz.filter(b=>!b.token_active&&!b.is_suspended).length}</div>
            </div>
          </div>
          <div style={{maxHeight:350,overflowY:'auto'}}>
            {agentBiz.length?agentBiz.map(b=>(
              <div key={b.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{b.name}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>{b.email} • {fmtDate(b.created_at)}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <Badge color={b.plan==='premium'?'#8B5CF6':'#64748B'}>{b.plan||'trial'}</Badge>
                  <Badge color={b.token_active?'#22C55E':b.is_suspended?'#EF4444':'#F59E0B'}>{b.token_active?'Active':b.is_suspended?'Suspended':'Trial'}</Badge>
                </div>
              </div>
            )):<Empty icon="🏪" text="Hakuna wateja bado"/>}
          </div>
        </>;
      })()}
    </Modal>
  </div>;
}

// ===== SETTINGS (with branch toggle, announcement, white label) =====
// ===== ACCOUNTANT MANAGEMENT =====
function AccountantSection(){
  const{supabase}=useApp();
  const[accName,setAccName]=useState('');const[accEmail,setAccEmail]=useState('');
  const[accPass,setAccPass]=useState('');const[accPhone,setAccPhone]=useState('');
  const[creating,setCreating]=useState(false);const[result,setResult]=useState(null);
  const[accountants,setAccountants]=useState([]);const[loaded,setLoaded]=useState(false);

  // Load accountants
  useEffect(()=>{
    if(loaded)return;
    supabase?.from('users').select('*').eq('role','accountant').order('created_at',{ascending:false})
      .then(({data})=>{setAccountants(data||[]);setLoaded(true)});
  },[loaded]);

  const createAccountant=async()=>{
    if(!accName||!accEmail||!accPass)return setResult({ok:false,msg:'Jaza taarifa zote!'});
    if(accPass.length<6)return setResult({ok:false,msg:'Password lazima herufi 6+'});
    setCreating(true);setResult(null);
    try{
      const{data:authData,error:authErr}=await supabase.auth.signUp({email:accEmail,password:accPass,options:{data:{name:accName}}});
      if(authErr)throw authErr;
      const uid=authData?.user?.id;
      const newAcc={id:uid,email:accEmail,name:accName,role:'accountant',phone:accPhone,is_active:true};
      if(uid)await supabase.from('users').insert(newAcc);
      setAccountants(p=>[{...newAcc,created_at:new Date().toISOString()},...p]);
      setResult({ok:true,msg:`✅ "${accName}" ametengenezwa! Anaweza kuingia kwa ${accEmail}`});
      setAccName('');setAccEmail('');setAccPass('');setAccPhone('');
    }catch(e){setResult({ok:false,msg:e.message||'Tatizo!'})}
    setCreating(false);
  };

  const toggleAccountant=async(id,active)=>{
    await supabase.from('users').update({is_active:!active}).eq('id',id);
    setAccountants(p=>p.map(a=>a.id===id?{...a,is_active:!active}:a));
  };

  const deleteAccountant=async(id,email)=>{
    if(!confirm(`Futa muhasibu ${email}? Hii haiwezi kurudishwa!`))return;
    await supabase.from('users').delete().eq('id',id);
    setAccountants(p=>p.filter(a=>a.id!==id));
  };

  const fmtDate=d=>d?new Date(d).toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'}):'—';

  return <div className="card" style={{marginBottom:16,border:'2px solid #8B5CF6'}}>
    <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 14px',color:'#8B5CF6'}}>🧮 Wahasibu (Accountants)</h3>
    
    {/* Existing Accountants */}
    {accountants.length>0&&<div style={{marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:8}}>Wahasibu Waliopo ({accountants.length})</div>
      {accountants.map(a=><div key={a.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:14}}>{a.name}</div>
          <div style={{fontSize:12,color:'#64748B'}}>{a.email} • {a.phone||'—'}</div>
          <div style={{fontSize:10,color:'#94A3B8'}}>Ametengenezwa: {fmtDate(a.created_at)} • Login: {fmtDate(a.last_login)}</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>toggleAccountant(a.id,a.is_active)} style={{padding:'5px 12px',borderRadius:8,border:'none',fontWeight:700,fontSize:11,cursor:'pointer',background:a.is_active?'#22C55E':'#EF4444',color:'#fff'}}>{a.is_active?'✅ Active':'🔒 Disabled'}</button>
          <button onClick={()=>deleteAccountant(a.id,a.email)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #FECACA',background:'#FEF2F2',color:'#EF4444',fontWeight:700,fontSize:11,cursor:'pointer'}}>🗑️</button>
        </div>
      </div>)}
    </div>}
    
    {/* Create New */}
    <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:8}}>+ Ongeza Muhasibu Mpya</div>
    {result&&<div style={{background:result.ok?'#F0FDF4':'#FEF2F2',color:result.ok?'#15803D':'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:`4px solid ${result.ok?'#22C55E':'#EF4444'}`}}>{result.msg}</div>}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      <Input label="Jina" placeholder="Jina la Muhasibu" value={accName} onChange={e=>setAccName(e.target.value)}/>
      <Input label="Email" type="email" placeholder="muhasibu@email.com" value={accEmail} onChange={e=>setAccEmail(e.target.value)}/>
      <Input label="Password" type="password" placeholder="Password (6+)" value={accPass} onChange={e=>setAccPass(e.target.value)}/>
      <Input label="Simu" placeholder="07XXXXXXXX" value={accPhone} onChange={e=>setAccPhone(e.target.value)}/>
    </div>
    <button onClick={createAccountant} disabled={creating} style={{width:'100%',marginTop:10,padding:14,background:creating?'#C4B5FD':'linear-gradient(135deg,#7C3AED,#6D28D9)',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>
      {creating?'⏳ Inatengeneza...':'🧮 Tengeneza Akaunti ya Muhasibu'}
    </button>
  </div>;
}

// ===== DATA CLEANUP =====
function DataCleanupSection(){
  const{supabase}=useApp();
  const[deleting,setDeleting]=useState('');const[result,setResult]=useState(null);

  const cleanTable=async(table,label)=>{
    if(!confirm(`⚠️ HATARI! Futa data ZOTE za "${label}"?\n\nHii haiwezi kurudishwa! Endelea?`))return;
    if(!confirm(`UHAKIKI WA MWISHO: Futa ${label}? Andika DELETE kwenye prompt ujayo.`))return;
    setDeleting(table);setResult(null);
    try{
      const{error}=await supabase.from(table).delete().neq('id','00000000-0000-0000-0000-000000000000');
      if(error)throw error;
      setResult({ok:true,msg:`✅ ${label} zimefutwa!`});
    }catch(e){setResult({ok:false,msg:`❌ Error: ${e.message}`})}
    setDeleting('');
  };

  const tables=[
    {key:'payment_requests',label:'Malipo (Payment Requests)',icon:'💰',color:'#F59E0B',desc:'Malipo yote — approved, pending, rejected'},
    {key:'system_expenses',label:'Matumizi ya Mfumo',icon:'💸',color:'#EF4444',desc:'Matumizi yote yaliyorekodiwa na muhasibu'},
    {key:'budgets',label:'Bajeti',icon:'📋',color:'#8B5CF6',desc:'Bajeti zote za kila mwezi'},
    {key:'payroll',label:'Payroll / Mishahara',icon:'👥',color:'#3B82F6',desc:'Rekodi za mishahara zote'},
    {key:'marketing_debts',label:'Madeni ya Marketing',icon:'💳',color:'#EF4444',desc:'Madeni yote ya washirika'},
    {key:'debt_payments',label:'Malipo ya Madeni',icon:'💰',color:'#22C55E',desc:'Rekodi za malipo ya madeni'},
    {key:'audit_logs',label:'Audit Logs',icon:'📝',color:'#64748B',desc:'Historia ya shughuli za muhasibu'},
    {key:'smart_alerts',label:'Smart Alerts',icon:'⚠️',color:'#F59E0B',desc:'Arifa za mfumo'},
    {key:'notifications',label:'Notifications',icon:'🔔',color:'#3B82F6',desc:'Arifa zote za mfumo'},
    {key:'login_logs',label:'Login Logs',icon:'🔑',color:'#64748B',desc:'Historia ya kuingia mfumo'},
    {key:'otp_codes',label:'OTP Codes',icon:'🔐',color:'#64748B',desc:'OTP codes zilizomalizika'},
    {key:'support_tickets',label:'Support Tickets',icon:'🎫',color:'#F59E0B',desc:'Tickets za msaada'},
  ];

  const cleanAll=async()=>{
    if(!confirm('⚠️ HATARI KUBWA! Futa data ZOTE za majaribio?\n\nHii itafuta: Malipo, Matumizi, Bajeti, Payroll, Madeni, Logs, Alerts, Notifications, OTP\n\nHaiwezi kurudishwa!'))return;
    setDeleting('all');setResult(null);
    let cleaned=0;
    for(const t of tables){
      try{await supabase.from(t.key).delete().neq('id','00000000-0000-0000-0000-000000000000');cleaned++}catch(e){}
    }
    setResult({ok:true,msg:`✅ Tables ${cleaned} zimefutwa! Mfumo safi.`});
    setDeleting('');
  };

  return <div className="card" style={{marginBottom:16,border:'2px solid #EF4444'}}>
    <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 6px',color:'#EF4444'}}>🗑️ Futa Data za Majaribio</h3>
    <p style={{fontSize:12,color:'#64748B',marginBottom:14}}>Futa data za test/majaribio kabla ya kuanza kutumia mfumo kwa uzalishaji. ⚠️ Data zilizofutwa HAZIWEZI kurudishwa!</p>
    
    {result&&<div style={{background:result.ok?'#F0FDF4':'#FEF2F2',color:result.ok?'#15803D':'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:`4px solid ${result.ok?'#22C55E':'#EF4444'}`}}>{result.msg}</div>}
    
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8,marginBottom:14}}>
      {tables.map(t=><div key={t.key} style={{background:'#FAFBFC',borderRadius:10,padding:'10px 12px',border:'1px solid #E2E8F0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:12,fontWeight:700}}>{t.icon} {t.label}</div>
          <div style={{fontSize:10,color:'#94A3B8'}}>{t.desc}</div>
        </div>
        <button onClick={()=>cleanTable(t.key,t.label)} disabled={!!deleting} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #FECACA',background:'#FEF2F2',color:'#EF4444',fontWeight:700,fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}>
          {deleting===t.key?'⏳...':'🗑️ Futa'}
        </button>
      </div>)}
    </div>
    
    {/* Nuclear button */}
    <button onClick={cleanAll} disabled={!!deleting} style={{width:'100%',padding:14,background:deleting==='all'?'#FCA5A5':'linear-gradient(135deg,#EF4444,#B91C1C)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer',boxShadow:'0 4px 15px rgba(239,68,68,0.3)'}}>
      {deleting==='all'?'⏳ Inafuta...':'💣 FUTA DATA ZOTE ZA MAJARIBIO'}
    </button>
  </div>;
}

// ===== ADMIN SYSTEM STATUS =====
function SystemStatusSection(){
  const{businesses=[],tokens=[],paymentRequests=[],partners=[],systemExpenses=[],supabase}=useApp();
  const[dbStats,setDbStats]=useState({});
  
  useEffect(()=>{
    const loadStats=async()=>{
      const counts={};
      const tables=['users','businesses','tokens','payment_requests','notifications','system_expenses','budgets','payroll','marketing_debts','login_logs','otp_codes'];
      for(const t of tables){
        try{const{count}=await supabase.from(t).select('*',{count:'exact',head:true});counts[t]=count||0}catch(e){counts[t]='—'}
      }
      setDbStats(counts);
    };
    loadStats();
  },[]);

  return <div className="card" style={{marginBottom:16,border:'2px solid #0B7A3B'}}>
    <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 12px',color:'#0B7A3B'}}>📊 System Status</h3>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8}}>
      {Object.entries(dbStats).map(([t,c])=><div key={t} style={{background:'#F8FAFC',borderRadius:8,padding:'8px 10px',border:'1px solid #E2E8F0',textAlign:'center'}}>
        <div style={{fontSize:9,color:'#64748B',fontWeight:600,textTransform:'uppercase'}}>{t.replace(/_/g,' ')}</div>
        <div style={{fontSize:18,fontWeight:900,color:'#0B7A3B'}}>{c}</div>
      </div>)}
    </div>
  </div>;
}

// ===== EMAIL TEST SECTION =====
function EmailTestSection(){
  const[testResult,setTestResult]=useState(null);
  const[testing,setTesting]=useState(false);
  const[testEmail,setTestEmail]=useState('pesafly1@gmail.com');

  const runTest=async()=>{
    setTesting(true);setTestResult(null);
    try{
      const r=await fetch(`/api/test-email?to=${encodeURIComponent(testEmail)}`);
      const d=await r.json();
      setTestResult(d);
    }catch(e){setTestResult({success:false,error:e.message})}
    setTesting(false);
  };

  return <div className="card">
    <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>📧 Email System</h3>
    <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#1E40AF',lineHeight:1.6}}>
      <b>Hali ya Email:</b> Mfumo unatumia <b>Gmail SMTP</b> kutuma email kwa wateja WOTE moja kwa moja kutoka <b>pesafly1@gmail.com</b>.<br/><br/>
      <b>Kama email haifanyi kazi:</b> Hakikisha <code>GMAIL_APP_PASSWORD</code> imewekwa kwenye Vercel Environment Variables. <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{color:'#0B7A3B',fontWeight:700}}>Tengeneza App Password hapa</a>.
    </div>
    <div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:12}}>
      <div style={{flex:1}}><Input label="Test Email" value={testEmail} onChange={e=>setTestEmail(e.target.value)}/></div>
      <button onClick={runTest} disabled={testing} style={{padding:'10px 20px',background:testing?'#86EFAC':'#0B7A3B',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',marginBottom:12,whiteSpace:'nowrap'}}>
        {testing?'⏳ Inatuma...':'📧 Test Email'}
      </button>
    </div>
    {testResult&&<div style={{background:testResult.success?'#F0FDF4':'#FEF2F2',border:`1px solid ${testResult.success?'#BBF7D0':'#FECACA'}`,borderRadius:10,padding:12,fontSize:12,marginBottom:8}}>
      {testResult.success?<>
        <div style={{color:'#15803D',fontWeight:700,fontSize:14,marginBottom:4}}>✅ Email Imetumwa!</div>
        <div style={{color:'#15803D'}}>ID: {testResult.id}</div>
        <div style={{color:'#64748B',marginTop:4}}>Angalia inbox ya <b>{testEmail}</b> (na spam folder).</div>
        {testResult.note&&<div style={{color:'#92400E',marginTop:6,background:'#FFF7ED',borderRadius:6,padding:8}}>{testResult.note}</div>}
      </>:<>
        <div style={{color:'#B91C1C',fontWeight:700,fontSize:14,marginBottom:4}}>❌ Imeshindwa!</div>
        <div style={{color:'#B91C1C'}}>{testResult.error}</div>
        {testResult.hint&&<div style={{color:'#92400E',marginTop:6,background:'#FFF7ED',borderRadius:6,padding:8}}><b>Suluhisho:</b> {testResult.hint}</div>}
        {testResult.fix&&<div style={{color:'#1E40AF',marginTop:6,background:'#EFF6FF',borderRadius:6,padding:8}}>{testResult.fix}</div>}
      </>}
    </div>}
    <div style={{fontSize:11,color:'#94A3B8',lineHeight:1.6}}>
      <b>Email zinazotumwa:</b> Welcome (mteja mpya), Daily/Weekly/Monthly Reports, Low Stock, Overdue Debt, Payment Received, Subscription Expiry, Admin Payment Alert, Promotional
    </div>
  </div>;
}

export function SettingsPage(){
  const{settings,updateSetting}=useApp();
  return <div style={{maxWidth:700}}>
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
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 12px'}}>🔒 System Control</h3>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:13}}>Maintenance Mode:</span>
        <button onClick={()=>updateSetting('maintenance_mode',settings.maintenance_mode==='true'?'false':'true')} style={{padding:'6px 16px',borderRadius:8,border:'none',fontWeight:700,fontSize:12,background:settings.maintenance_mode==='true'?'#EF4444':'#22C55E',color:'#fff',cursor:'pointer'}}>{settings.maintenance_mode==='true'?'ON':'OFF'}</button>
      </div>
    </div>
    {/* EMAIL TEST */}
    <EmailTestSection/>
    {/* SYSTEM STATUS */}
    <SystemStatusSection/>
    {/* ACCOUNTANT MANAGEMENT */}
    <AccountantSection/>
    {/* DATA CLEANUP */}
    <DataCleanupSection/>
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

// =====================================================
// BACKUP MANAGEMENT PAGE
// Admin anaweza ku-trigger backup manually + kuona historia
// =====================================================
export function BackupPage(){
  const{supabase,user}=useApp();
  const[backups,setBackups]=React.useState([]);
  const[loading,setLoading]=React.useState(false);
  const[triggering,setTriggering]=React.useState(false);
  
  // Load backup history
  React.useEffect(()=>{
    if(user?.role!=='admin')return;
    (async()=>{
      setLoading(true);
      try{
        const{data}=await supabase.from('backup_logs')
          .select('*')
          .order('created_at',{ascending:false})
          .limit(30);
        setBackups(data||[]);
      }catch(e){console.warn('Load backups:',e)}
      setLoading(false);
    })();
  },[user?.role]);
  
  // Security: Admin only
  if(user?.role!=='admin')return <div style={{padding:40,textAlign:'center',background:'#FEF3C7',borderRadius:16,border:'2px solid #F59E0B'}}>
    <div style={{fontSize:60,marginBottom:14}}>🔒</div>
    <h2 style={{fontSize:22,fontWeight:900,color:'#92400E',margin:'0 0 10px'}}>UKURASA WA ADMIN TU</h2>
    <p style={{fontSize:14,color:'#78350F'}}>Ukurasa wa backup unasimamiwa na Admin pekee.</p>
  </div>;
  
  const triggerBackup=async()=>{
    if(!window.confirm('Anza backup sasa?\n\nBackup itachukua dakika 1-2.\nEmail ya backup itatumwa kwa: dukalangusolution@gmail.com'))return;
    setTriggering(true);
    try{
      const res=await fetch('/api/cron/daily-backup',{method:'GET'});
      const data=await res.json();
      if(data.success){
        alert(`✅ BACKUP IMEKAMILIKA!\n\n📊 Rows: ${data.total_rows.toLocaleString()}\n📁 Tables: ${data.total_tables}\n💾 Size: ${data.size_mb} MB\n⏱️ Muda: ${data.duration_seconds}s\n\n📧 Email imetumwa kwa: ${data.email_sent_to}`);
        const{data:newBackups}=await supabase.from('backup_logs').select('*').order('created_at',{ascending:false}).limit(30);
        setBackups(newBackups||[]);
      }else{
        alert('❌ Tatizo: '+(data.error||'Backup imeshindwa'));
      }
    }catch(e){
      alert('❌ Tatizo la mtandao: '+e.message);
    }
    setTriggering(false);
  };
  
  const fmtSize=(bytes)=>{
    if(!bytes)return '0 KB';
    if(bytes<1024)return bytes+' bytes';
    if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';
    return (bytes/1024/1024).toFixed(2)+' MB';
  };
  
  const fmtDuration=(ms)=>{
    if(!ms)return '—';
    if(ms<1000)return ms+'ms';
    return (ms/1000).toFixed(1)+'s';
  };
  
  const lastBackup=backups[0];
  const totalSize=backups.reduce((s,b)=>s+(b.size_bytes||0),0);
  const successCount=backups.filter(b=>b.status==='completed').length;
  const lastBackupDate=lastBackup?new Date(lastBackup.created_at):null;
  const hoursAgo=lastBackupDate?Math.floor((Date.now()-lastBackupDate.getTime())/(1000*60*60)):null;
  const isHealthy=hoursAgo!==null&&hoursAgo<26;
  
  return <div>
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>💾 Backup ya Database</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Hifadhi na simamia backups za mfumo</p>
    </div>
    
    <div style={{
      background: isHealthy?'linear-gradient(135deg,#0B7A3B,#065F2E)':'linear-gradient(135deg,#DC2626,#991B1B)',
      borderRadius:16,padding:'24px 28px',marginBottom:16,color:'#fff',
      boxShadow:'0 8px 30px rgba(0,0,0,0.15)',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
        <div style={{fontSize:42}}>{isHealthy?'✅':'⚠️'}</div>
        <div>
          <div style={{fontSize:18,fontWeight:900}}>
            {isHealthy?'Mfumo Salama':lastBackup?'Backup Imechelewa':'Hakuna Backup Bado'}
          </div>
          <div style={{fontSize:12,opacity:0.9}}>
            {lastBackup?`Backup ya mwisho: ${hoursAgo} saa zilizopita`:'Anza backup ya kwanza chini'}
          </div>
        </div>
      </div>
      
      {lastBackup&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10,marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.2)'}}>
        <div>
          <div style={{fontSize:10,opacity:0.85,letterSpacing:1}}>ROWS</div>
          <div style={{fontSize:18,fontWeight:900}}>{(lastBackup.total_rows||0).toLocaleString()}</div>
        </div>
        <div>
          <div style={{fontSize:10,opacity:0.85,letterSpacing:1}}>TABLES</div>
          <div style={{fontSize:18,fontWeight:900}}>{lastBackup.total_tables||0}</div>
        </div>
        <div>
          <div style={{fontSize:10,opacity:0.85,letterSpacing:1}}>SIZE</div>
          <div style={{fontSize:18,fontWeight:900}}>{fmtSize(lastBackup.size_bytes)}</div>
        </div>
        <div>
          <div style={{fontSize:10,opacity:0.85,letterSpacing:1}}>MUDA</div>
          <div style={{fontSize:18,fontWeight:900}}>{fmtDuration(lastBackup.duration_ms)}</div>
        </div>
      </div>}
    </div>
    
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:16}}>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #0B7A3B'}}>
        <div style={{fontSize:11,color:'#15803D',fontWeight:700,letterSpacing:0.5}}>BACKUPS ZOTE</div>
        <div style={{fontSize:28,fontWeight:900,color:'#0B7A3B',marginTop:4}}>{backups.length}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>siku 30 zilizopita</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #22C55E'}}>
        <div style={{fontSize:11,color:'#15803D',fontWeight:700,letterSpacing:0.5}}>ZILIZOFANIKIWA</div>
        <div style={{fontSize:28,fontWeight:900,color:'#22C55E',marginTop:4}}>{successCount}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>{backups.length>0?Math.round(successCount/backups.length*100):0}%</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #3B82F6'}}>
        <div style={{fontSize:11,color:'#1D4ED8',fontWeight:700,letterSpacing:0.5}}>JUMLA YA DATA</div>
        <div style={{fontSize:18,fontWeight:900,color:'#3B82F6',marginTop:4}}>{fmtSize(totalSize)}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>hifadhiwa</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:16,borderLeft:'4px solid #8B5CF6'}}>
        <div style={{fontSize:11,color:'#6D28D9',fontWeight:700,letterSpacing:0.5}}>RATIBA</div>
        <div style={{fontSize:14,fontWeight:900,color:'#8B5CF6',marginTop:4}}>Saa 2:00</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>kila usiku</div>
      </div>
    </div>
    
    <div className="card" style={{marginBottom:16,border:'2px solid #BBF7D0',background:'linear-gradient(135deg,#F0FDF4,#fff)'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <div style={{width:54,height:54,borderRadius:14,background:'#0B7A3B',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>⚡</div>
        <div style={{flex:1,minWidth:200}}>
          <h3 style={{fontSize:16,fontWeight:800,margin:0,color:'#0B7A3B'}}>Backup ya Haraka</h3>
          <p style={{fontSize:12,color:'#64748B',margin:'4px 0 0'}}>Anza backup mara moja — itahifadhiwa kwenye email yako</p>
        </div>
        <button onClick={triggerBackup} disabled={triggering} style={{
          padding:'14px 28px',
          background:triggering?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',
          color:'#fff',border:'none',borderRadius:12,
          fontWeight:800,fontSize:14,cursor:triggering?'wait':'pointer',
          boxShadow:'0 4px 15px rgba(11,122,59,0.3)',
        }}>{triggering?'⏳ Inafanya backup...':'💾 Anza Backup'}</button>
      </div>
    </div>
    
    <div style={{background:'#EFF6FF',border:'1.5px solid #93C5FD',borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',gap:12}}>
      <div style={{fontSize:24}}>💡</div>
      <div style={{flex:1,fontSize:12,color:'#1E40AF',lineHeight:1.6}}>
        <b>Jinsi backup inavyofanya kazi:</b><br/>
        • Backup automatic inakuja kila usiku <b>saa 2:00 alfajiri</b><br/>
        • Email yenye backup inatumwa kwa: <b>dukalangusolution@gmail.com</b><br/>
        • Backup ina <b>data zote</b> za mfumo: maduka, mauzo, bidhaa, wateja, n.k.<br/>
        • Hifadhi kwenye Google Drive au Dropbox kwa usalama zaidi<br/>
        • Backup ikipotea, unaweza kuomba msaada wa restore kupitia Live Chat
      </div>
    </div>
    
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:800,color:'#0B7A3B',margin:'0 0 14px'}}>📋 Historia ya Backups (Siku 30)</h3>
      
      {loading?<div style={{textAlign:'center',padding:30,color:'#94A3B8'}}>
        <div style={{fontSize:30,marginBottom:8}}>⏳</div>
        <div style={{fontSize:13}}>Inaleta backups...</div>
      </div>:backups.length>0?<div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:520,overflowY:'auto'}}>
        {backups.map(b=><div key={b.id} style={{
          padding:'14px 16px',background:'#F8FAFC',borderRadius:10,
          borderLeft:`4px solid ${b.status==='completed'?'#22C55E':b.status==='partial'?'#F59E0B':'#EF4444'}`,
          display:'grid',gridTemplateColumns:'auto 1fr auto',gap:12,alignItems:'center',
        }}>
          <div style={{
            width:46,height:46,borderRadius:12,
            background:b.status==='completed'?'#DCFCE7':b.status==='partial'?'#FEF3C7':'#FEE2E2',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
          }}>{b.status==='completed'?'✅':b.status==='partial'?'⚠️':'❌'}</div>
          
          <div style={{minWidth:0}}>
            <div style={{fontWeight:800,fontSize:13,color:'#1E293B',marginBottom:3}}>
              {new Date(b.created_at).toLocaleString('sw-TZ',{dateStyle:'full',timeStyle:'short'})}
            </div>
            <div style={{fontSize:11,color:'#64748B',display:'flex',gap:10,flexWrap:'wrap'}}>
              <span>📊 {(b.total_rows||0).toLocaleString()} rows</span>
              <span>📁 {b.total_tables||0} tables</span>
              <span>💾 {fmtSize(b.size_bytes)}</span>
              <span>⏱️ {fmtDuration(b.duration_ms)}</span>
              {b.errors&&b.errors.length>0&&<span style={{color:'#EF4444'}}>⚠️ {b.errors.length} errors</span>}
            </div>
          </div>
          
          <div style={{
            padding:'4px 12px',borderRadius:8,
            background:b.status==='completed'?'#22C55E':b.status==='partial'?'#F59E0B':'#EF4444',
            color:'#fff',fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:0.5,
          }}>{b.status||'unknown'}</div>
        </div>)}
      </div>:<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>
        <div style={{fontSize:50,marginBottom:10}}>💾</div>
        <div style={{fontWeight:700,color:'#64748B'}}>Hakuna backup bado</div>
        <div style={{fontSize:12,marginTop:4}}>Bonyeza "Anza Backup" juu kuanza ya kwanza</div>
      </div>}
    </div>
  </div>;
}

// ===== PAYMENTS (Approve/Reject) =====
export function PaymentsPage(){
  const{paymentRequests,approvePayment,rejectPayment,pendingPayments,settings,loadData,user}=useApp();
  const[tab,setTab]=useState('pending');
  const[days,setDays]=useState('30');
  const[rejectId,setRejectId]=useState(null);
  const[rejectReason,setRejectReason]=useState('');
  const[processing,setProcessing]=useState(null);
  const[refreshing,setRefreshing]=useState(false);

  const filtered=tab==='pending'?paymentRequests.filter(p=>p.status==='pending')
    :tab==='approved'?paymentRequests.filter(p=>p.status==='approved')
    :tab==='rejected'?paymentRequests.filter(p=>p.status==='rejected')
    :paymentRequests;

  const handleApprove=async(id)=>{
    if(processing)return;
    // SECURITY: Only accountant can approve payments and generate tokens
    if(user?.role!=='accountant'){
      alert('🔒 USALAMA WA FEDHA\n\nHuwezi kuthibitisha malipo wala kutoa tokens.\n\nMalipo yote yanasimamiwa na Muhasibu pekee kwa udhibiti wa fedha za biashara.\n\nMtaarifu Muhasibu athibitishe malipo haya.');
      return;
    }
    setProcessing(id);
    try{
      const result=await approvePayment(id,+days||30);
      if(result){
        alert(`✅ Imethibitishwa!\n\nToken: ${result.code}\nSiku: ${result.days}\n\nMteja atapata notification na mfumo utafunguka!`);
      }else{
        alert('❌ Tatizo! Jaribu tena.');
      }
    }catch(e){
      console.error('Approve error:',e);
      alert('Tatizo la mfumo. Jaribu tena.');
    }
    setProcessing(null);
  };

  const handleReject=(id)=>{setRejectId(id);setRejectReason('')};

  const confirmReject=async()=>{
    if(!rejectId)return;
    setProcessing(rejectId);
    try{
      await rejectPayment(rejectId,rejectReason||'Transaction ID si sahihi');
      alert('Malipo yamekataliwa. Mteja atapata taarifa.');
    }catch(e){console.error('Reject error:',e)}
    setProcessing(null);setRejectId(null);setRejectReason('');
  };

  const handleRefresh=async()=>{
    setRefreshing(true);
    await loadData(user?.id,'admin',null);
    setRefreshing(false);
  };

  const totalRevenue=paymentRequests.filter(p=>p.status==='approved').reduce((a,p)=>a+(p.amount||0),0);

  return <div>
    {/* Security Notice for Admin */}
    {user?.role==='admin'&&<div style={{
      background:'linear-gradient(135deg,#FEF3C7,#FDE68A)',
      border:'2px solid #F59E0B',
      borderRadius:12,
      padding:'14px 18px',
      marginBottom:16,
      display:'flex',
      alignItems:'center',
      gap:14,
    }}>
      <div style={{fontSize:32}}>🔒</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:800,fontSize:14,color:'#92400E',marginBottom:4}}>USALAMA WA FEDHA — Tu Muhasibu Anaweza Kuthibitisha</div>
        <div style={{fontSize:12,color:'#78350F',lineHeight:1.5}}>
          Malipo yote yanasimamiwa na <b>Muhasibu</b> pekee. Wewe Admin unaweza kuona malipo lakini huwezi kuthibitisha au kutoa tokens. Hii ni kwa udhibiti wa fedha za biashara.
        </div>
      </div>
    </div>}
    
    {/* Stats */}
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.bell} label="Inasubiri" value={pendingPayments.length} color="#F59E0B"/>
      <Stat icon={IC.ok} label="Zimethibitishwa" value={paymentRequests.filter(p=>p.status==='approved').length} color="#22C55E"/>
      <Stat icon={IC.warn} label="Zimekataliwa" value={paymentRequests.filter(p=>p.status==='rejected').length} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Mapato" value={`TZS ${totalRevenue.toLocaleString()}`} color="#0B7A3B"/>
    </div>

    {/* Days + Refresh */}
    <div className="card" style={{marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <span style={{fontSize:13,fontWeight:600}}>Siku za Token:</span>
      <div style={{width:80}}><Input type="number" value={days} onChange={e=>setDays(e.target.value)}/></div>
      <div style={{display:'flex',gap:4}}>
        {[7,14,30,60,90].map(d=><button key={d} onClick={()=>setDays(String(d))} style={{padding:'5px 10px',borderRadius:6,border:days===String(d)?'2px solid #0B7A3B':'1px solid #E2E8F0',background:days===String(d)?'#F0FDF4':'#fff',fontSize:11,fontWeight:600,cursor:'pointer',color:days===String(d)?'#0B7A3B':'#64748B'}}>{d}</button>)}
      </div>
      <button onClick={handleRefresh} disabled={refreshing} style={{marginLeft:'auto',padding:'6px 14px',borderRadius:8,border:'1px solid #E2E8F0',background:refreshing?'#F0FDF4':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:'#0B7A3B',display:'flex',alignItems:'center',gap:4}}>
        {refreshing?'⏳ Inapakia...':'🔄 Refresh'}
      </button>
    </div>

    {/* Tabs */}
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
      {[
        {id:'pending',label:`⏳ Inasubiri (${pendingPayments.length})`,color:'#F59E0B'},
        {id:'approved',label:`✅ Zimethibitishwa (${paymentRequests.filter(p=>p.status==='approved').length})`,color:'#22C55E'},
        {id:'rejected',label:`❌ Zimekataliwa (${paymentRequests.filter(p=>p.status==='rejected').length})`,color:'#EF4444'},
        {id:'all',label:`📋 Zote (${paymentRequests.length})`,color:'#64748B'},
      ].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 16px',borderRadius:10,border:tab===t.id?`2px solid ${t.color}`:'1.5px solid #E2E8F0',background:tab===t.id?t.color+'15':'#fff',fontWeight:tab===t.id?700:500,fontSize:12,cursor:'pointer',color:tab===t.id?t.color:'#64748B'}}>{t.label}</button>)}
    </div>

    {/* Pending Alert */}
    {pendingPayments.length>0&&tab!=='pending'&&<div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={()=>setTab('pending')}>
      <span style={{fontSize:13,color:'#92400E',fontWeight:700}}>💰 Malipo {pendingPayments.length} yanasubiri kuthibitishwa!</span>
      <span style={{fontSize:12,color:'#F59E0B',fontWeight:600}}>Bonyeza kuona →</span>
    </div>}

    {/* Payment Cards */}
    <div className="card">
      {filtered.length?filtered.map(p=><div key={p.id} style={{padding:'16px 0',borderBottom:'1px solid #F1F5F9'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8,marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:42,height:42,borderRadius:10,background:p.status==='pending'?'#FFF7ED':p.status==='approved'?'#F0FDF4':'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
              {p.status==='pending'?'⏳':p.status==='approved'?'✅':'❌'}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{p.business_name||'—'}</div>
              <div style={{fontSize:12,color:'#64748B'}}>{p.user_email}</div>
              <div style={{fontSize:11,color:'#94A3B8'}}>{new Date(p.created_at).toLocaleString('sw-TZ')}</div>
            </div>
          </div>
          <Badge color={p.status==='pending'?'#F59E0B':p.status==='approved'?'#22C55E':'#EF4444'}>
            {p.status==='pending'?'INASUBIRI':p.status==='approved'?'IMETHIBITISHWA':'IMEKATALIWA'}
          </Badge>
        </div>

        {/* Payment Details */}
        <div style={{background:'#F8FAFC',borderRadius:12,padding:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div>
            <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>TRANSACTION ID</div>
            <div style={{fontWeight:700,fontFamily:'monospace',fontSize:14,color:'#1E293B',marginTop:2}}>{p.transaction_id}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>KIASI</div>
            <div style={{fontWeight:800,fontSize:18,color:'#0B7A3B',marginTop:2}}>TZS {(p.amount||0).toLocaleString()}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>NJIA</div>
            <div style={{fontWeight:600,fontSize:13,marginTop:2}}>{p.payment_method||'HALOPESA'}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>SIMU</div>
            <div style={{fontWeight:600,fontSize:13,marginTop:2}}>{p.phone||'—'}</div>
          </div>
        </div>

        {/* Approved info */}
        {p.status==='approved'&&p.token_code&&<div style={{background:'#F0FDF4',borderRadius:10,padding:'8px 12px',marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid #BBF7D0'}}>
          <div style={{fontSize:12,color:'#15803D'}}>🔑 Token: <b style={{fontFamily:'monospace'}}>{p.token_code}</b></div>
          <div style={{fontSize:12,color:'#15803D'}}>📅 Siku: <b>{p.days_given}</b></div>
        </div>}

        {/* Rejected info */}
        {p.status==='rejected'&&<div style={{background:'#FEF2F2',borderRadius:10,padding:'8px 12px',marginTop:8,fontSize:12,color:'#B91C1C',border:'1px solid #FECACA'}}>
          ❌ Sababu: {p.reject_reason||'Transaction ID si sahihi'}
        </div>}

        {/* Action Buttons — PENDING ONLY */}
        {p.status==='pending'&&<div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={()=>handleApprove(p.id)} disabled={!!processing} style={{flex:1,padding:'12px 0',background:processing===p.id?'#86EFAC':'#22C55E',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:15,cursor:processing?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all 0.2s'}}>
            {processing===p.id?'⏳ Inathibitisha...':'✅ Thibitisha (Siku '+days+')'}
          </button>
          <button onClick={()=>handleReject(p.id)} disabled={!!processing} style={{padding:'12px 20px',background:'#FEF2F2',color:'#EF4444',border:'1.5px solid #FECACA',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>❌</button>
        </div>}
      </div>):<div style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:40,marginBottom:12}}>{tab==='pending'?'✅':'📋'}</div>
        <div style={{fontSize:16,fontWeight:700,color:'#1E293B',marginBottom:6}}>{tab==='pending'?'Hakuna Malipo Yanasubiri':'Hakuna Malipo'}</div>
        <div style={{fontSize:13,color:'#64748B'}}>{tab==='pending'?'Mteja akilipa na kutuma ombi, litaonekana hapa.':'Badilisha tab kuona malipo mengine.'}</div>
        <button onClick={handleRefresh} style={{marginTop:16,padding:'8px 20px',borderRadius:10,border:'1px solid #E2E8F0',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#0B7A3B'}}>🔄 Refresh</button>
      </div>}
    </div>

    {/* Reject Modal */}
    {rejectId&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:16}} onClick={()=>setRejectId(null)}>
      <div style={{background:'#fff',borderRadius:16,padding:24,maxWidth:400,width:'100%'}} onClick={e=>e.stopPropagation()}>
        <h3 style={{margin:'0 0 12px',fontSize:16,fontWeight:700}}>❌ Sababu ya Kukataa</h3>
        <Input label="Sababu" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Mf: Transaction ID si sahihi"/>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={confirmReject} disabled={!!processing} style={{flex:1,padding:12,background:'#EF4444',color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Kataa</button>
          <button onClick={()=>setRejectId(null)} style={{flex:1,padding:12,background:'#F1F5F9',color:'#475569',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ghairi</button>
        </div>
      </div>
    </div>}
  </div>;
}

// ===== MARKETING PARTNERS MANAGEMENT =====
export function PartnersPage(){
  const{partners,createPartner,updatePartner,deletePartner}=useApp();
  const[modal,setModal]=useState(false);
  const[f,setF]=useState({name:'',email:'',phone:'',password:'partner123',commission:10});

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Washirika wa Masoko ({partners.length})</h3>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Ongeza Mshirika</Btn>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
      {partners.map(p=><div key={p.id} className="card">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#8B5CF6,#6D28D9)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:18,fontWeight:700}}>{p.name?.[0]?.toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15}}>{p.name}</div>
            <div style={{fontSize:12,color:'#64748B'}}>{p.email}</div>
            {p.phone&&<div style={{fontSize:11,color:'#94A3B8'}}>{p.phone}</div>}
          </div>
          <Badge color={p.status==='active'?'#22C55E':'#EF4444'}>{p.status==='active'?'Active':'Disabled'}</Badge>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#94A3B8'}}>Commission</div><div style={{fontWeight:700,fontSize:16,color:'#8B5CF6'}}>{p.commission_rate||10}%</div></div>
          <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#94A3B8'}}>Tangu</div><div style={{fontWeight:600,fontSize:12}}>{fmtDate(p.created_at)}</div></div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <Btn v={p.status==='active'?'warning':'primary'} style={{flex:1,justifyContent:'center',padding:'6px 10px',fontSize:11}} onClick={()=>updatePartner(p.id,{status:p.status==='active'?'disabled':'active'})}>{p.status==='active'?'Zima':'Washa'}</Btn>
          <Btn v="danger" style={{padding:'6px 10px',fontSize:11}} onClick={()=>window.confirm(`Futa "${p.name}"?`)&&deletePartner(p.id)}>Futa</Btn>
        </div>
      </div>)}
    </div>
    {!partners.length&&<div className="card" style={{marginTop:12}}><Empty icon="🤝" text="Ongeza mshirika wa kwanza wa masoko"/></div>}

    <div style={{background:'#EFF6FF',borderRadius:12,padding:'12px 16px',marginTop:16,fontSize:12,color:'#1E40AF',lineHeight:1.6}}>
      <b>Jinsi inavyofanya kazi:</b> Mshirika anaingia kwa email na password yake. Anaona Dashboard ya Masoko yenye wateja, masupervaiza, pipeline, kamisheni, na ripoti. HAONI data za mauzo ya wateja — usalama umehakikishwa.
    </div>

    <Modal open={modal} onClose={()=>setModal(false)} title="Ongeza Mshirika wa Masoko">
      <Input label="Jina Kamili *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Jina kamili"/>
      <Input label="Email *" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@mfano.com"/>
      <Input label="Simu" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="07XXXXXXXX"/>
      <Input label="Password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
      <Input label="Commission %" type="number" value={f.commission} onChange={e=>setF({...f,commission:+e.target.value})}/>
      <Btn onClick={async()=>{
        if(!f.name||!f.email)return alert('Jaza jina na email!');
        const result=await createPartner(f.name,f.email,f.password,f.phone,f.commission);
        if(result){alert('Mshirika amesajiliwa! Anaweza kuingia kwa email: '+f.email);setModal(false);setF({name:'',email:'',phone:'',password:'partner123',commission:10})}
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Sajili Mshirika</Btn>
    </Modal>
  </div>;
}

// ===== ACTIVITY FEED (Live) =====
export function ActivityFeedPage(){
  const{activityFeed}=useApp();
  const[filter,setFilter]=useState('all');
  const filtered=filter==='all'?activityFeed:activityFeed.filter(a=>a.type===filter);

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:16,fontWeight:700,margin:0}}>⚡ Activity Feed (Live)</h3>
      <div style={{fontSize:12,color:'#64748B'}}>Masaa 24 yaliyopita</div>
    </div>
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
      {[{v:'all',l:'Zote',c:activityFeed.length},{v:'login',l:'🔑 Login'},{v:'sale',l:'🛒 Mauzo'},{v:'signup',l:'🆕 Wapya'},{v:'payment',l:'💰 Malipo'}].map(f=>
        <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:'6px 12px',borderRadius:8,border:filter===f.v?'2px solid #0B7A3B':'1px solid #E2E8F0',background:filter===f.v?'#F0FDF4':'#fff',fontSize:11,fontWeight:filter===f.v?700:500,cursor:'pointer',color:filter===f.v?'#0B7A3B':'#64748B'}}>{f.l}</button>
      )}
    </div>
    <div className="card">
      {filtered.length?filtered.map((a,i)=>(
        <div key={i} style={{padding:'10px 12px',borderLeft:`3px solid ${a.color}`,marginBottom:8,borderRadius:'0 8px 8px 0',background:'#FAFAFA',display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:20}}>{a.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:13}}>{a.title}</div>
            {a.biz&&<div style={{fontSize:11,color:'#94A3B8'}}>{a.biz}</div>}
          </div>
          <div style={{fontSize:11,color:'#94A3B8',whiteSpace:'nowrap'}}>{fmtDate(a.time)}</div>
        </div>
      )):<Empty icon="⚡" text="Hakuna shughuli za hivi karibuni"/>}
    </div>
  </div>;
}

// ===== SYSTEM USAGE REPORT =====
export function SystemUsagePage(){
  const{systemUsage}=useApp();const su=systemUsage;
  return <div>
    <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 16px'}}>📊 System Usage Report</h3>
    <div className="flex-wrap" style={{marginBottom:20}}>
      <Stat icon={IC.people} label="Active Leo" value={su.activeToday} color="#0B7A3B" sub="wanatumia leo"/>
      <Stat icon={IC.people} label="Active Wiki" value={su.activeWeek} color="#3B82F6" sub="wiki hii"/>
      <Stat icon={IC.cart} label="Mauzo Leo" value={su.salesToday} color="#22C55E"/>
      <Stat icon={IC.store} label="Maduka" value={su.totalBiz} color="#8B5CF6"/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      {/* Feature Usage */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🔧 Features Zinazotumika (Wiki Hii)</h3>
        {Object.entries(su.features||{}).sort((a,b)=>b[1]-a[1]).map(([name,count])=>{
          const max=Math.max(...Object.values(su.features||{}),1);
          const pct=Math.round(count/max*100);
          const labels={mauzo:'🛒 Mauzo',bidhaa:'📦 Bidhaa',matumizi:'💰 Matumizi',wateja:'👥 Wateja',deni:'📋 Deni',matawi:'🏪 Matawi'};
          return <div key={name} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
              <span style={{fontWeight:600}}>{labels[name]||name}</span>
              <span style={{fontWeight:700,color:'#0B7A3B'}}>{count}</span>
            </div>
            <div style={{height:8,background:'#F1F5F9',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:'#0B7A3B',borderRadius:4}}/>
            </div>
          </div>;
        })}
      </div>

      {/* Key Metrics */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📋 Takwimu Muhimu</h3>
        {[
          {label:'Wanatumia Leo',value:su.activeToday,icon:'👤'},
          {label:'Wanatumia Wiki',value:su.activeWeek,icon:'👥'},
          {label:'Mauzo Leo',value:su.salesToday,icon:'🛒'},
          {label:'Mauzo Wiki',value:su.salesWeek,icon:'📈'},
          {label:'Bidhaa Jumla',value:su.prodTotal,icon:'📦'},
          {label:'Wateja Jumla',value:su.custTotal,icon:'🤝'},
          {label:'Maduka',value:su.totalBiz,icon:'🏪'},
          {label:'Feature Bora',value:su.topFeature?`${su.topFeature.name} (${su.topFeature.count})`:'-',icon:'⭐'},
        ].map(m=><div key={m.label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F1F5F9'}}>
          <span style={{fontSize:13}}>{m.icon} {m.label}</span>
          <span style={{fontWeight:700,fontSize:14}}>{m.value}</span>
        </div>)}
      </div>
    </div>
  </div>;
}

// ===== EMAIL TEMPLATES EDITOR =====
export function EmailTemplatesPage(){
  const{updateSetting,settings}=useApp();
  const templates=[
    {key:'email_welcome_subject',label:'Welcome Email — Kichwa',default:'🎉 Karibu kwenye Duka Langu!'},
    {key:'email_welcome_body',label:'Welcome Email — Ujumbe',default:'Asante kwa kujisajili! Tumia mfumo wote kwa siku 5 bure.'},
    {key:'email_expiry_subject',label:'Muda Unaisha — Kichwa',default:'⏳ Muda Unakaribia Kuisha!'},
    {key:'email_expiry_body',label:'Muda Unaisha — Ujumbe',default:'Muda wako wa mfumo utaisha hivi karibuni. Lipa sasa kuendelea.'},
    {key:'email_payment_subject',label:'Malipo Mapya — Kichwa',default:'💰 MALIPO MAPYA!'},
    {key:'email_lowstock_subject',label:'Stock Inaisha — Kichwa',default:'📦 Bidhaa Zinaisha!'},
    {key:'email_lowstock_body',label:'Stock Inaisha — Ujumbe',default:'Bidhaa zifuatazo ziko chini ya kiwango. Agiza haraka!'},
    {key:'email_promo_subject',label:'Promotion — Kichwa',default:'🎉 Offer Maalum!'},
    {key:'email_promo_body',label:'Promotion — Ujumbe',default:''},
    {key:'email_footer',label:'Footer ya Email Zote',default:'PesaFly / Duka Langu — Together for the better'},
  ];
  const[saved,setSaved]=useState(false);

  return <div style={{maxWidth:600}}>
    <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 6px'}}>✉️ Email Templates</h3>
    <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Hariri ujumbe wa email bila kuandika code. Mabadiliko yataonekana kwenye email zote zinazotumwa.</p>

    {templates.map(t=>(
      <div key={t.key} style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:12,fontWeight:700,color:'#475569',marginBottom:4}}>{t.label}</label>
        {t.key.includes('body')||t.key.includes('footer')?
          <textarea value={settings[t.key]||t.default} onChange={e=>{updateSetting(t.key,e.target.value);setSaved(false)}} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',resize:'vertical',minHeight:60,fontFamily:'inherit',boxSizing:'border-box'}}/>:
          <input value={settings[t.key]||t.default} onChange={e=>{updateSetting(t.key,e.target.value);setSaved(false)}} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        }
      </div>
    ))}

    <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#1E40AF'}}>
      💡 <b>Jinsi inavyofanya kazi:</b> Email templates zinabadilishwa moja kwa moja. Ukibadilisha kichwa au ujumbe hapa, email zitakuja na ujumbe mpya.
    </div>

    <Btn onClick={()=>{setSaved(true);alert('Templates zimehifadhiwa!')}} style={{width:'100%',justifyContent:'center'}}>💾 Hifadhi Templates</Btn>
  </div>;
}

// ===== ADMIN FULL REPORTS =====
export function AdminReportsPage(){
  const{businesses,paymentRequests,promoCodes,agentLeaderboard,loginLogs,sales}=useApp();
  const active=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const trial=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const expired=businesses.filter(b=>b.is_suspended||(!b.token_active&&b.trial_end&&new Date(b.trial_end)<new Date()));
  const approved=paymentRequests.filter(p=>p.status==='approved');
  const totalRev=approved.reduce((a,p)=>a+(p.amount||0),0);
  const monthMap={};businesses.forEach(b=>{const m=b.created_at?.slice(0,7);if(m)monthMap[m]=(monthMap[m]||0)+1});
  const monthData=Object.entries(monthMap).slice(-6).map(([m,c])=>({month:m,count:c}));

  const exportPDF=()=>{
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Duka Langu Report</title><style>
      body{font-family:Arial,sans-serif;margin:30px;color:#1E293B}
      h1{color:#0B7A3B;border-bottom:3px solid #0B7A3B;padding-bottom:8px}
      h2{color:#1E293B;margin-top:24px}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th{background:#0B7A3B;color:#fff;padding:10px;text-align:left;font-size:13px}
      td{padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:12px}
      tr:nth-child(even){background:#F8FAFC}
      .stat{display:inline-block;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:12px 20px;margin:6px;text-align:center;min-width:100px}
      .stat .num{font-size:24px;font-weight:900;color:#0B7A3B}
      .stat .lbl{font-size:11px;color:#64748B}
      .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
      .active{background:#F0FDF4;color:#15803D}
      .trial{background:#FFF7ED;color:#92400E}
      .expired{background:#FEF2F2;color:#B91C1C}
      @media print{body{margin:15px}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:14;margin-bottom:20px">
      <div><h1 style="margin:0;font-size:24px">DUKA LANGU — RIPOTI KAMILI</h1>
      <div style="color:#64748B;font-size:12px">Tarehe: ${new Date().toLocaleDateString('sw-TZ')} | PesaFly / Duka Langu</div></div>
    </div>
    <div style="margin:16px 0">
      <div class="stat"><div class="num">${businesses.length}</div><div class="lbl">Maduka Jumla</div></div>
      <div class="stat"><div class="num">${active.length}</div><div class="lbl">Active</div></div>
      <div class="stat"><div class="num">${trial.length}</div><div class="lbl">Trial</div></div>
      <div class="stat"><div class="num">${expired.length}</div><div class="lbl">Expired</div></div>
      <div class="stat"><div class="num">TZS ${totalRev.toLocaleString()}</div><div class="lbl">Mapato Jumla</div></div>
      <div class="stat"><div class="num">${promoCodes.length}</div><div class="lbl">Mawakala</div></div>
    </div>
    <h2>Wateja Wote (${businesses.length})</h2>
    <table><tr><th>#</th><th>Jina</th><th>Email</th><th>Simu</th><th>Plan</th><th>Hali</th><th>Tarehe</th></tr>
    ${businesses.map((b,i)=>`<tr><td>${i+1}</td><td><b>${b.name||''}</b></td><td>${b.email||''}</td><td>${b.phone||''}</td><td>${(b.plan||'trial').toUpperCase()}</td><td><span class="badge ${b.token_active?'active':b.is_suspended?'expired':'trial'}">${b.token_active?'Active':b.is_suspended?'Expired':'Trial'}</span></td><td>${new Date(b.created_at).toLocaleDateString('sw-TZ')}</td></tr>`).join('')}
    </table>
    <h2>Malipo Yaliyothibitishwa (${approved.length})</h2>
    <table><tr><th>#</th><th>Biashara</th><th>Kiasi</th><th>Transaction</th><th>Njia</th><th>Tarehe</th></tr>
    ${approved.map((p,i)=>`<tr><td>${i+1}</td><td>${p.business_name||''}</td><td>TZS ${(p.amount||0).toLocaleString()}</td><td>${p.transaction_id||''}</td><td>${p.payment_method||''}</td><td>${new Date(p.created_at).toLocaleDateString('sw-TZ')}</td></tr>`).join('')}
    </table>
    <h2>Mawakala (${agentLeaderboard.length})</h2>
    <table><tr><th>#</th><th>Jina</th><th>Simu</th><th>Code</th><th>Wateja</th><th>Active</th><th>Daraja</th><th>Kamisheni</th></tr>
    ${agentLeaderboard.map((a,i)=>`<tr><td>${i+1}</td><td>${a.agent_name||''}</td><td>${a.agent_phone||''}</td><td>${a.code||''}</td><td>${a.clients}</td><td>${a.activeClients}</td><td>${a.tier?.emoji||''} ${a.tier?.name||''}</td><td>TZS ${(a.commission||0).toLocaleString()}</td></tr>`).join('')}
    </table>
    <h2>Usajili kwa Mwezi</h2>
    <table><tr><th>Mwezi</th><th>Wateja Wapya</th></tr>
    ${monthData.map(d=>`<tr><td>${d.month}</td><td>${d.count}</td></tr>`).join('')}
    </table>
    <div style="margin-top:30px;border-top:2px solid #0B7A3B;padding-top:12px;text-align:center;color:#64748B;font-size:11px">
      PesaFly / Duka Langu — pesafly1@gmail.com | +255 628 986 770<br/>
      Ripoti imetolewa: ${new Date().toLocaleString('sw-TZ')}
    </div>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),500);
  };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:16,fontWeight:700,margin:0}}>📋 Ripoti Kamili ya Mfumo</h3>
      <button onClick={exportPDF} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>📥 Pakua PDF</button>
    </div>
    <div className="flex-wrap" style={{marginBottom:20}}>
      <Stat icon={IC.store} label="Maduka" value={businesses.length} color="#0B7A3B" sub={`${active.length} active`}/>
      <Stat icon={IC.clock} label="Trial" value={trial.length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Expired" value={expired.length} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Mapato" value={`TZS ${totalRev.toLocaleString()}`} color="#3B82F6"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
      {/* Active Customers */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#22C55E'}}>✅ Active ({active.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{active.map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <div><b>{b.name}</b><br/><span style={{color:'#94A3B8'}}>{b.email}</span></div>
          <div style={{textAlign:'right'}}><Badge color="#8B5CF6">{b.plan||'basic'}</Badge><br/><span style={{fontSize:10,color:'#94A3B8'}}>{b.phone||''}</span></div>
        </div>)}{!active.length&&<Empty icon="✅" text="Hakuna"/>}</div>
      </div>
      {/* Trial */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#F59E0B'}}>⏳ Trial ({trial.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{trial.map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <div><b>{b.name}</b><br/><span style={{color:'#94A3B8'}}>{b.email}</span></div>
          <Badge color="#F59E0B">Trial</Badge>
        </div>)}{!trial.length&&<Empty icon="⏳" text="Hakuna"/>}</div>
      </div>
      {/* Expired */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#EF4444'}}>❌ Expired / Suspended ({expired.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{expired.map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <div><b>{b.name}</b><br/><span style={{color:'#94A3B8'}}>{b.email}</span></div>
          <Badge color="#EF4444">Expired</Badge>
        </div>)}{!expired.length&&<Empty icon="❌" text="Hakuna"/>}</div>
      </div>
      {/* Revenue */}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>💰 Malipo ({approved.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{approved.slice(0,20).map(p=><div key={p.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
          <div><b>{p.business_name}</b><br/><span style={{color:'#94A3B8',fontFamily:'monospace'}}>{p.transaction_id}</span></div>
          <div style={{textAlign:'right',fontWeight:700,color:'#0B7A3B'}}>TZS {(p.amount||0).toLocaleString()}</div>
        </div>)}</div>
      </div>
    </div>
  </div>;
}

// ===== INFO UPDATE REQUESTS PAGE =====
export function InfoRequestsPage(){
  const{updateBiz,supabase}=useApp();
  const[requests,setRequests]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[tab,setTab]=useState('pending');
  const[processing,setProcessing]=useState(null);

  useEffect(()=>{
    if(loaded)return;
    supabase?.from('info_update_requests').select('*').order('created_at',{ascending:false})
      .then(({data})=>{setRequests(data||[]);setLoaded(true)});
  },[loaded]);

  const filtered=requests.filter(r=>r.status===tab);

  const approveRequest=async(req)=>{
    if(!confirm(`Thibitisha mabadiliko ya ${req.business_name}?\n\nMabadiliko yatafanyika sasa.`))return;
    setProcessing(req.id);
    const updates={};
    if(req.new_email)updates.email=req.new_email;
    if(req.new_phone)updates.phone=req.new_phone;
    if(req.new_name)updates.name=req.new_name;
    if(req.new_owner_name)updates.owner_name=req.new_owner_name;
    
    const result=await updateBiz(req.business_id,updates);
    if(result.success){
      try{await supabase.from('info_update_requests').update({status:'approved',processed_at:new Date().toISOString()}).eq('id',req.id)}catch(e){}
      setRequests(p=>p.map(r=>r.id===req.id?{...r,status:'approved'}:r));
      alert('✅ Mabadiliko yamefanyika!');
    }else{
      alert('❌ Tatizo: '+result.error);
    }
    setProcessing(null);
  };

  const rejectRequest=async(req)=>{
    const reason=prompt('Sababu ya kukataa ombi:');
    if(!reason)return;
    setProcessing(req.id);
    try{await supabase.from('info_update_requests').update({status:'rejected',reject_reason:reason,processed_at:new Date().toISOString()}).eq('id',req.id)}catch(e){}
    setRequests(p=>p.map(r=>r.id===req.id?{...r,status:'rejected',reject_reason:reason}:r));
    alert('Ombi limekataliwa');
    setProcessing(null);
  };

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 4px',color:'#0B7A3B'}}>📝 Ombi za Kubadilisha Taarifa</h3>
    <p style={{fontSize:12,color:'#64748B',margin:'0 0 16px'}}>Wateja waliopoteza simu/email wanaomba kubadilisha taarifa</p>

    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.clock} label="Yanasubiri" value={requests.filter(r=>r.status==='pending').length} color="#F59E0B"/>
      <Stat icon={IC.ok} label="Yamekubaliwa" value={requests.filter(r=>r.status==='approved').length} color="#22C55E"/>
      <Stat icon={IC.warn} label="Yamekataliwa" value={requests.filter(r=>r.status==='rejected').length} color="#EF4444"/>
    </div>

    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {[{id:'pending',l:'⏳ Subiri',c:'#F59E0B'},{id:'approved',l:'✅ Kubaliwa',c:'#22C55E'},{id:'rejected',l:'❌ Kataliwa',c:'#EF4444'}].map(t=>
        <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 16px',borderRadius:10,border:tab===t.id?`2px solid ${t.c}`:'1px solid #E2E8F0',background:tab===t.id?t.c+'15':'#fff',fontWeight:tab===t.id?700:500,fontSize:12,cursor:'pointer',color:tab===t.id?t.c:'#64748B'}}>{t.l}</button>)}
    </div>

    <div className="card">
      {filtered.map(r=><div key={r.id} style={{padding:'14px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div style={{flex:1,minWidth:250}}>
            <div style={{fontWeight:800,fontSize:15,marginBottom:6}}>🏪 {r.business_name}</div>
            
            {/* Old vs New comparison */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div style={{background:'#FEF2F2',borderRadius:8,padding:'8px 10px',fontSize:11}}>
                <div style={{color:'#B91C1C',fontWeight:700,marginBottom:2}}>YA SASA:</div>
                <div>📧 {r.old_email||'—'}</div>
                <div>📱 {r.old_phone||'—'}</div>
              </div>
              <div style={{background:'#F0FDF4',borderRadius:8,padding:'8px 10px',fontSize:11}}>
                <div style={{color:'#15803D',fontWeight:700,marginBottom:2}}>MPYA:</div>
                {r.new_email&&<div>📧 {r.new_email}</div>}
                {r.new_phone&&<div>📱 {r.new_phone}</div>}
                {r.new_name&&<div>🏪 {r.new_name}</div>}
                {r.new_owner_name&&<div>👤 {r.new_owner_name}</div>}
              </div>
            </div>

            <div style={{background:'#FFF7ED',borderRadius:8,padding:'8px 10px',fontSize:11,marginBottom:6}}>
              <b>Sababu:</b> {r.reason}
            </div>
            
            <div style={{fontSize:10,color:'#94A3B8'}}>
              {r.id_number&&<>🆔 {r.id_number} • </>}
              {r.whatsapp&&<>💬 {r.whatsapp} • </>}
              📅 {new Date(r.created_at).toLocaleString('sw-TZ')}
            </div>
            
            {r.reject_reason&&<div style={{fontSize:11,color:'#B91C1C',marginTop:4}}>❌ <b>Kukataa:</b> {r.reject_reason}</div>}
          </div>
          
          {r.status==='pending'&&<div style={{display:'flex',flexDirection:'column',gap:6}}>
            <button onClick={()=>approveRequest(r)} disabled={processing===r.id} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#22C55E',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>{processing===r.id?'⏳':'✅ Thibitisha'}</button>
            <button onClick={()=>rejectRequest(r)} disabled={processing===r.id} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #FECACA',background:'#FEF2F2',color:'#EF4444',fontWeight:700,fontSize:12,cursor:'pointer'}}>❌ Kataa</button>
          </div>}
        </div>
      </div>)}
      {!filtered.length&&<Empty icon="📝" text="Hakuna ombi"/>}
    </div>
  </div>;
}

// ===== REFERRAL MANAGEMENT PAGE (Admin) =====

// ===== REFERRAL MANAGEMENT — Tier-Based Token System (Admin Manual) =====
export function ReferralManagementPage(){
  const{businesses,supabase,user,sendMail,sendSMS}=useApp();
  const[referrals,setReferrals]=useState([]);
  const[loading,setLoading]=useState(false);
  const[search,setSearch]=useState('');
  const[filter,setFilter]=useState('all');
  const[showConfig,setShowConfig]=useState(false);
  const[showTokenModal,setShowTokenModal]=useState(null);
  const[showDetail,setShowDetail]=useState(null);
  
  // Default tier configuration
  const[tiers,setTiers]=useState([
    {id:1,minRefs:1,tokenValue:5000,label:'Bronze',color:'#CD7F32',icon:'🥉',desc:'Mteja 1 ameleta'},
    {id:2,minRefs:2,tokenValue:10000,label:'Silver',color:'#94A3B8',icon:'🥈',desc:'Wateja 2 wameleta'},
    {id:3,minRefs:3,tokenValue:15000,label:'Gold (BURE)',color:'#FFD700',icon:'🥇',desc:'Wateja 3 wameleta — Mwezi BURE!'},
  ]);

  useEffect(()=>{
    loadConfig();
    loadReferrals();
  },[]);

  const loadConfig=async()=>{
    try{
      const{data}=await supabase.from('settings').select('value').eq('key','referral_tiers').maybeSingle();
      if(data?.value){
        const t=JSON.parse(data.value);
        if(Array.isArray(t)&&t.length)setTiers(t);
      }
    }catch(e){}
  };

  const loadReferrals=async()=>{
    setLoading(true);
    try{
      const{data}=await supabase.from('referrals').select('*').order('created_at',{ascending:false});
      setReferrals(data||[]);
    }catch(e){console.error(e)}
    setLoading(false);
  };

  const saveConfig=async()=>{
    try{
      await supabase.from('settings').upsert({key:'referral_tiers',value:JSON.stringify(tiers)});
      alert('✅ Mipangilio ya tiers imehifadhiwa!');
      setShowConfig(false);
    }catch(e){alert('Tatizo: '+e.message)}
  };

  // Get business info
  const getBiz=id=>businesses.find(b=>b.id===id);

  // Group referrals by referrer
  const referrerStats=React.useMemo(()=>{
    const map={};
    referrals.forEach(r=>{
      const rid=r.referrer_business_id;
      if(!map[rid]){
        const biz=getBiz(rid);
        if(!biz)return;
        map[rid]={
          businessId:rid,
          businessName:biz.name,
          phone:biz.phone,
          email:biz.email,
          allRefs:[],
          confirmedCount:0,
          pendingCount:0,
          tokenGenerated:false,
        };
      }
      map[rid]?.allRefs.push(r);
      if(r.status==='confirmed'||r.status==='token_issued')map[rid].confirmedCount++;
      if(r.status==='pending')map[rid].pendingCount++;
      if(r.status==='token_issued')map[rid].tokenGenerated=true;
    });
    return Object.values(map).sort((a,b)=>b.confirmedCount-a.confirmedCount);
  },[referrals,businesses]);

  // Calculate which tier a referrer qualifies for
  const getCurrentTier=(count)=>{
    // Find highest tier where minRefs <= count
    return [...tiers].reverse().find(t=>count>=t.minRefs);
  };

  // Mark referral as "Confirmed" by admin (rafiki amelipa na unathibitisha)
  const confirmReferral=async(ref)=>{
    if(!confirm(`Thibitisha kuwa ${getBiz(ref.referred_business_id)?.name} amelipa kwa ushawishi wa ${getBiz(ref.referrer_business_id)?.name}?`))return;
    try{
      await supabase.from('referrals').update({
        status:'confirmed',
        confirmed_by:user?.id,
        confirmed_at:new Date().toISOString(),
      }).eq('id',ref.id);
      alert('✅ Imethibitishwa!');
      loadReferrals();
    }catch(e){alert('Tatizo: '+e.message)}
  };

  // Reject
  const rejectReferral=async(ref)=>{
    const reason=prompt('Sababu ya kukataa:');
    if(!reason)return;
    try{
      await supabase.from('referrals').update({status:'rejected',reject_reason:reason,confirmed_by:user?.id}).eq('id',ref.id);
      alert('Imekataliwa.');
      loadReferrals();
    }catch(e){alert('Tatizo: '+e.message)}
  };

  // Generate token for a referrer based on their tier
  const generateToken=async(stat)=>{
    const tier=getCurrentTier(stat.confirmedCount);
    if(!tier)return alert('Mteja huyu hajafikia kiwango chochote bado.');
    
    if(!confirm(`Toa TOKEN ya TZS ${tier.tokenValue.toLocaleString()} (${tier.icon} ${tier.label}) kwa ${stat.businessName}?\n\nMteja ana ushawishi wa wateja ${stat.confirmedCount}.`))return;
    
    // Generate unique token code
    const tokenCode='REF-'+Math.random().toString(36).substring(2,8).toUpperCase()+'-'+Date.now().toString(36).toUpperCase();
    
    try{
      // Save token
      const{data:tokenData,error:tokenErr}=await supabase.from('referral_tokens').insert({
        token_code:tokenCode,
        business_id:stat.businessId,
        value:tier.tokenValue,
        tier:tier.label,
        ref_count:stat.confirmedCount,
        status:'active',
        issued_by:user?.id,
        used:false,
      }).select().maybeSingle();
      
      if(tokenErr)throw tokenErr;
      
      // Mark all confirmed referrals as "token_issued"
      const confirmedIds=stat.allRefs.filter(r=>r.status==='confirmed').map(r=>r.id);
      if(confirmedIds.length){
        await supabase.from('referrals').update({
          status:'token_issued',
          token_code:tokenCode,
        }).in('id',confirmedIds);
      }
      
      // Notify customer via SMS
      if(stat.phone){
        const msg=tier.tokenValue>=15000?
          `DUKA LANGU\n🎉 HONGERA ${stat.businessName}!\n\nUmepata TOKEN YA MWEZI BURE kwa kuleta wateja ${stat.confirmedCount}!\n\nToken: ${tokenCode}\nThamani: TZS ${tier.tokenValue.toLocaleString()}\nKiwango: ${tier.icon} ${tier.label}\n\nTumia kufungua mfumo BILA MALIPO mwezi unaofuata!\nAsante!`:
          `DUKA LANGU\n🎉 HONGERA ${stat.businessName}!\n\nUmepata TOKEN ya TZS ${tier.tokenValue.toLocaleString()} kwa kuleta wateja ${stat.confirmedCount}!\n\nToken: ${tokenCode}\nKiwango: ${tier.icon} ${tier.label}\n\nTumia kupunguza ada yako mwezi unaofuata.\nAsante!`;
        sendSMS(stat.phone,msg);
      }
      
      // Notify customer via Email
      if(stat.email){
        sendMail(stat.email,`🎉 TOKEN YAKO TAYARI — ${tier.label}`,'generic',{
          customerName:stat.businessName,
          title:`🎉 Hongera! Umepata Token ${tier.icon}`,
          message:`Kwa kuleta wateja ${stat.confirmedCount} kwenye Duka Langu, umepata TOKEN ya kiwango cha ${tier.label}.\n\nToken Code: ${tokenCode}\nThamani: TZS ${tier.tokenValue.toLocaleString()}\n\n${tier.tokenValue>=15000?'Token hii itakufungulia mfumo BURE mwezi unaofuata!':'Tumia token hii kupunguza ada ya mwezi unaofuata.'}`,
        });
      }
      
      alert(`✅ Token imetolewa!\n\nCode: ${tokenCode}\nThamani: TZS ${tier.tokenValue.toLocaleString()}`);
      setShowTokenModal(null);
      loadReferrals();
    }catch(e){
      alert('Tatizo: '+e.message);
    }
  };

  // Filter
  const filteredStats=referrerStats.filter(s=>{
    if(filter==='ready'&&s.confirmedCount===0)return false;
    if(filter==='pending'&&s.pendingCount===0)return false;
    if(filter==='gold'&&s.confirmedCount<3)return false;
    if(search&&!s.businessName?.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  // Overall stats
  const totalConfirmed=referrals.filter(r=>r.status==='confirmed'||r.status==='token_issued').length;
  const totalPending=referrals.filter(r=>r.status==='pending').length;
  const totalTokensIssued=referrals.filter(r=>r.status==='token_issued').length;

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <div>
        <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>🎁 Ofa ya Karibisha Rafiki</h2>
        <p style={{fontSize:12,color:'#64748B',margin:0}}>Wewe ndio unaamua na kutoa tokens — sio automatic</p>
      </div>
      <button onClick={()=>setShowConfig(true)} style={{padding:'10px 18px',borderRadius:12,border:'2px solid #8B5CF6',background:'#F5F3FF',color:'#7C3AED',fontWeight:700,fontSize:13,cursor:'pointer'}}>
        ⚙️ Mipangilio
      </button>
    </div>

    {/* TIERS DISPLAY */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12,marginBottom:18}}>
      {tiers.map(t=><div key={t.id} className="card" style={{padding:16,textAlign:'center',borderTop:`4px solid ${t.color}`,background:`linear-gradient(135deg,#fff,${t.color}10)`}}>
        <div style={{fontSize:36,marginBottom:6}}>{t.icon}</div>
        <div style={{fontSize:11,fontWeight:800,color:t.color,letterSpacing:1,marginBottom:4}}>{t.label.toUpperCase()}</div>
        <div style={{fontSize:24,fontWeight:900,color:'#1E293B',marginBottom:4}}>TZS {t.tokenValue.toLocaleString()}</div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>{t.desc}</div>
      </div>)}
    </div>

    {/* STATS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #F59E0B'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>WANAOSUBIRI</div>
        <div style={{fontSize:24,fontWeight:900,color:'#F59E0B'}}>{totalPending}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>kuthibitishwa</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #22C55E'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>ZILIZOTHIBITISHWA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#22C55E'}}>{totalConfirmed}</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #0B7A3B'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>TOKENS ZIMETOLEWA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#0B7A3B'}}>{totalTokensIssued}</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #8B5CF6'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>WACHANGIAJI</div>
        <div style={{fontSize:24,fontWeight:900,color:'#8B5CF6'}}>{referrerStats.length}</div>
      </div>
    </div>

    {/* SEARCH */}
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
      <input type="text" placeholder="🔍 Tafuta mteja..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:200,padding:'10px 14px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13}}/>
      <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,cursor:'pointer'}}>
        <option value="all">Wote</option>
        <option value="pending">⏳ Wenye Pending</option>
        <option value="ready">✅ Wamefikia Kiwango</option>
        <option value="gold">🥇 Gold (3+ wateja)</option>
      </select>
      <button onClick={loadReferrals} disabled={loading} style={{padding:'10px 16px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontWeight:600}}>{loading?'⏳':'🔄'}</button>
    </div>

    {/* REFERRERS LIST */}
    <div className="card" style={{padding:0,overflow:'hidden'}}>
      <div style={{maxHeight:600,overflowY:'auto'}}>
        {filteredStats.length?filteredStats.map(stat=>{
          const tier=getCurrentTier(stat.confirmedCount);
          return <div key={stat.businessId} style={{padding:'16px',borderBottom:'1px solid #F1F5F9'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                  <span style={{fontWeight:800,fontSize:14,color:'#1E293B'}}>{stat.businessName}</span>
                  {tier&&<span style={{background:tier.color+'20',color:tier.color,padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:800}}>{tier.icon} {tier.label.toUpperCase()}</span>}
                  {stat.pendingCount>0&&<span style={{background:'#FEF3C7',color:'#92400E',padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700}}>⏳ {stat.pendingCount} pending</span>}
                </div>
                <div style={{fontSize:11,color:'#64748B'}}>
                  📞 {stat.phone||'—'} • 📧 {stat.email||'—'}
                </div>
                <div style={{display:'flex',gap:14,marginTop:8,fontSize:12}}>
                  <span><b style={{color:'#22C55E'}}>{stat.confirmedCount}</b> wamethibitishwa</span>
                  <span>⏳ <b style={{color:'#F59E0B'}}>{stat.pendingCount}</b> wanasubiri</span>
                  <span>📊 Jumla: <b>{stat.allRefs.length}</b></span>
                </div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <button onClick={()=>setShowDetail(stat)} style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>👁️ Tazama</button>
                {tier&&!stat.tokenGenerated&&<button onClick={()=>generateToken(stat)} style={{padding:'8px 14px',borderRadius:8,border:'none',background:`linear-gradient(135deg,${tier.color},${tier.color}CC)`,color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer',boxShadow:`0 4px 12px ${tier.color}40`}}>🎁 Toa Token</button>}
                {stat.tokenGenerated&&<span style={{padding:'8px 14px',borderRadius:8,background:'#F0FDF4',color:'#15803D',fontWeight:700,fontSize:12}}>✅ Token Imetolewa</span>}
              </div>
            </div>
          </div>;
        }):<Empty icon="🎁" text="Hakuna referrals bado"/>}
      </div>
    </div>

    {/* DETAIL MODAL */}
    {showDetail&&<Modal open onClose={()=>setShowDetail(null)} title={`📋 ${showDetail.businessName} — Referrals`} wide>
      <div style={{background:'#EFF6FF',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:12,color:'#1E40AF'}}>
        💡 Hakikisha mteja huyu kweli alimkaribisha kwa kuwasiliana naye kabla ya kuthibitisha.
      </div>
      <div style={{maxHeight:400,overflowY:'auto'}}>
        {showDetail.allRefs.map(ref=>{
          const referred=getBiz(ref.referred_business_id);
          const sColor=ref.status==='confirmed'?'#22C55E':ref.status==='token_issued'?'#0B7A3B':ref.status==='rejected'?'#EF4444':'#F59E0B';
          const sLabel=ref.status==='confirmed'?'✅ Imethibitishwa':ref.status==='token_issued'?'🎁 Token Imetolewa':ref.status==='rejected'?'❌ Imekataliwa':'⏳ Inasubiri';
          return <div key={ref.id} style={{padding:12,background:'#F8FAFC',borderRadius:10,marginBottom:8,border:`1px solid ${sColor}30`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{referred?.name||'Haijulikani'}</div>
                <div style={{fontSize:11,color:'#64748B'}}>
                  📞 {referred?.phone||'—'} • 📧 {referred?.email||'—'}
                </div>
                <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>📅 {fmtDate(ref.created_at)}</div>
                {referred&&<div style={{fontSize:11,marginTop:4}}>
                  Hali: {referred.token_active?<span style={{color:'#22C55E',fontWeight:700}}>✅ Active</span>:<span style={{color:'#F59E0B',fontWeight:700}}>⏳ Trial</span>}
                </div>}
                {ref.reject_reason&&<div style={{fontSize:11,color:'#EF4444',marginTop:4}}>💬 {ref.reject_reason}</div>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                <span style={{background:sColor+'20',color:sColor,padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700}}>{sLabel}</span>
                {ref.status==='pending'&&<div style={{display:'flex',gap:4}}>
                  <button onClick={()=>confirmReferral(ref)} disabled={!referred?.token_active} title={!referred?.token_active?'Rafiki bado hajalipa':'Thibitisha'} style={{padding:'4px 10px',borderRadius:6,border:'none',background:referred?.token_active?'#22C55E':'#CBD5E1',color:'#fff',fontWeight:700,fontSize:11,cursor:referred?.token_active?'pointer':'not-allowed'}}>✓</button>
                  <button onClick={()=>rejectReferral(ref)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #EF4444',background:'#fff',color:'#EF4444',fontWeight:700,fontSize:11,cursor:'pointer'}}>✗</button>
                </div>}
              </div>
            </div>
          </div>;
        })}
      </div>
    </Modal>}

    {/* CONFIG MODAL */}
    {showConfig&&<Modal open onClose={()=>setShowConfig(false)} title="⚙️ Mipangilio ya Tiers" wide>
      <div style={{background:'#F5F3FF',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:12,color:'#5B21B6'}}>
        💡 Badilisha thamani za tokens kulingana na idadi ya wateja walioletwa. Mfumo utatumia hizi automatic.
      </div>
      
      {tiers.map((t,i)=><div key={t.id} style={{padding:14,background:'#F8FAFC',borderRadius:12,marginBottom:10,border:`2px solid ${t.color}40`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <span style={{fontSize:24}}>{t.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,color:t.color,fontSize:14}}>{t.label}</div>
            <div style={{fontSize:11,color:'#64748B'}}>{t.desc}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569'}}>Wateja Wanaohitajika</label>
            <input type="number" value={t.minRefs} onChange={e=>{const nt=[...tiers];nt[i].minRefs=+e.target.value||0;setTiers(nt)}} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #E2E8F0',fontSize:13,boxSizing:'border-box'}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569'}}>Thamani ya Token (TZS)</label>
            <input type="number" value={t.tokenValue} onChange={e=>{const nt=[...tiers];nt[i].tokenValue=+e.target.value||0;setTiers(nt)}} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #E2E8F0',fontSize:13,boxSizing:'border-box'}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569'}}>Jina la Kiwango</label>
            <input value={t.label} onChange={e=>{const nt=[...tiers];nt[i].label=e.target.value;setTiers(nt)}} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #E2E8F0',fontSize:13,boxSizing:'border-box'}}/>
          </div>
        </div>
      </div>)}
      
      <button onClick={saveConfig} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#7C3AED,#5B21B6)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer',marginTop:10}}>💾 Hifadhi Mipangilio</button>
    </Modal>}
  </div>;
}

// =====================================================
// AGENT VISITS / FOLLOW-UP TICKETS PAGE
// Admin anaona ziara za masupervaiza kwa wateja - tiketi za utekelezaji
// =====================================================
export function SupervisorVisitsAdminPage(){
  const{supabase,user,partners}=useApp();
  const[visits,setVisits]=React.useState([]);
  const[loading,setLoading]=React.useState(true);
  const[viewing,setViewing]=React.useState(null);
  const[adminNotes,setAdminNotes]=React.useState('');
  const[updating,setUpdating]=React.useState(false);
  const[filter,setFilter]=React.useState('new'); // new, in_progress, resolved, all
  const[search,setSearch]=React.useState('');
  
  if(user?.role!=='admin')return <div style={{padding:40,textAlign:'center',background:'#FEF3C7',borderRadius:16,border:'2px solid #F59E0B'}}>
    <div style={{fontSize:60,marginBottom:14}}>🔒</div>
    <h2 style={{fontSize:22,fontWeight:900,color:'#92400E',margin:'0 0 10px'}}>UKURASA WA ADMIN TU</h2>
  </div>;
  
  React.useEffect(()=>{
    loadVisits();
  },[]);
  
  const loadVisits=async()=>{
    setLoading(true);
    try{
      const{data}=await supabase.from('customer_visits')
        .select('*')
        .order('created_at',{ascending:false})
        .limit(200);
      setVisits(data||[]);
    }catch(e){console.warn('Load visits:',e)}
    setLoading(false);
  };
  
  // Stats
  const stats={
    total:visits.length,
    new:visits.filter(v=>v.status==='new').length,
    in_progress:visits.filter(v=>v.status==='in_progress').length,
    resolved:visits.filter(v=>v.status==='resolved').length,
    closed:visits.filter(v=>v.status==='closed').length,
    issues:visits.filter(v=>v.has_issues&&v.status!=='resolved'&&v.status!=='closed').length,
    critical:visits.filter(v=>v.urgency==='critical'&&v.status!=='resolved'&&v.status!=='closed').length,
  };
  
  // Filter
  const filtered=visits.filter(v=>{
    if(filter!=='all'&&v.status!==filter)return false;
    if(search){
      const s=search.toLowerCase();
      return v.customer_name?.toLowerCase().includes(s)||
             v.agent_name?.toLowerCase().includes(s)||
             v.customer_business?.toLowerCase().includes(s)||
             v.customer_phone?.includes(s);
    }
    return true;
  });
  
  const updateStatus=async(id,newStatus,extraData={})=>{
    setUpdating(true);
    try{
      const updates={status:newStatus,...extraData};
      if(newStatus==='resolved'||newStatus==='closed'){
        updates.resolved_at=new Date().toISOString();
        updates.resolved_by=user.id;
      }
      if(adminNotes.trim())updates.admin_notes=adminNotes;
      
      await supabase.from('customer_visits').update(updates).eq('id',id);
      
      // Notify supervisor
      const visit=visits.find(v=>v.id===id);
      if(visit){
        try{
          await supabase.from('notifications').insert({
            target_type:'user',
            target_id:visit.agent_id,
            type:'info',
            title:`📋 Tiketi Imeshughulikiwa - ${visit.customer_name}`,
            message:`Admin ametoa majibu kwenye ziara yako kwa ${visit.customer_name}. Hali mpya: ${newStatus==='in_progress'?'Inashughulikiwa':newStatus==='resolved'?'Imetatuliwa':'Imefungwa'}`,
          });
        }catch(e){}
      }
      
      await loadVisits();
      setViewing(null);
      setAdminNotes('');
      alert(`✅ Tiketi imebadilishwa kuwa: ${newStatus==='in_progress'?'Inashughulikiwa':newStatus==='resolved'?'Imetatuliwa':'Imefungwa'}`);
    }catch(e){alert('Tatizo: '+e.message)}
    setUpdating(false);
  };
  
  const getStatusColor=(s)=>({new:'#F59E0B',in_progress:'#3B82F6',resolved:'#22C55E',closed:'#94A3B8'}[s]||'#64748B');
  const getStatusLabel=(s)=>({new:'🆕 Mpya',in_progress:'🔄 Inashughulikiwa',resolved:'✅ Imetatuliwa',closed:'🔒 Imefungwa'}[s]||s);
  const getUrgencyColor=(u)=>({low:'#94A3B8',normal:'#3B82F6',high:'#F59E0B',critical:'#DC2626'}[u]||'#64748B');
  const getSatLabel=(s)=>({very_happy:'😊',happy:'🙂',neutral:'😐',unhappy:'😕',very_unhappy:'😡'}[s]||'');
  
  return <div>
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>🎫 Tiketi za Ufuatiliaji</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Taarifa za ziara za masupervaiza kwa wateja - simamia na fanya utekelezaji</p>
    </div>
    
    {/* Critical Alert */}
    {stats.critical>0&&<div style={{background:'linear-gradient(135deg,#DC2626,#991B1B)',color:'#fff',borderRadius:14,padding:'16px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
      <div style={{fontSize:32}}>🚨</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:900,fontSize:15}}>DHARURA! Tiketi {stats.critical} zinahitaji utekelezaji wa haraka</div>
        <div style={{fontSize:12,opacity:0.9,marginTop:3}}>Bonyeza filter "Mpya" kuona na kushughulikia</div>
      </div>
    </div>}
    
    {/* Stats */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:16}}>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #0B7A3B'}}>
        <div style={{fontSize:10,color:'#15803D',fontWeight:700}}>JUMLA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#0B7A3B',marginTop:4}}>{stats.total}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #F59E0B'}}>
        <div style={{fontSize:10,color:'#B45309',fontWeight:700}}>MPYA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#F59E0B',marginTop:4}}>{stats.new}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #3B82F6'}}>
        <div style={{fontSize:10,color:'#1D4ED8',fontWeight:700}}>INASHUGULIKIWA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#3B82F6',marginTop:4}}>{stats.in_progress}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #22C55E'}}>
        <div style={{fontSize:10,color:'#15803D',fontWeight:700}}>ZIMETATULIWA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#22C55E',marginTop:4}}>{stats.resolved}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #DC2626'}}>
        <div style={{fontSize:10,color:'#991B1B',fontWeight:700}}>CHANGAMOTO HAI</div>
        <div style={{fontSize:24,fontWeight:900,color:'#DC2626',marginTop:4}}>{stats.issues}</div>
      </div>
    </div>
    
    {/* Search */}
    <div className="card" style={{marginBottom:14}}>
      <input type="text" placeholder="🔍 Tafuta mteja, supevaiza, biashara, simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 14px',border:'1.5px solid #E2E8F0',borderRadius:10,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
      
      <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
        {[
          {id:'new',label:`🆕 Mpya (${stats.new})`,color:'#F59E0B'},
          {id:'in_progress',label:`🔄 Inashughulikiwa (${stats.in_progress})`,color:'#3B82F6'},
          {id:'resolved',label:`✅ Zimetatuliwa (${stats.resolved})`,color:'#22C55E'},
          {id:'closed',label:`🔒 Zimefungwa (${stats.closed})`,color:'#94A3B8'},
          {id:'all',label:`📚 Zote (${stats.total})`,color:'#0B7A3B'},
        ].map(t=><button key={t.id} onClick={()=>setFilter(t.id)} style={{padding:'7px 12px',borderRadius:8,border:filter===t.id?`2px solid ${t.color}`:'1.5px solid #E2E8F0',background:filter===t.id?t.color+'15':'#fff',color:filter===t.id?t.color:'#475569',fontWeight:700,fontSize:11,cursor:'pointer'}}>{t.label}</button>)}
      </div>
    </div>
    
    {/* List */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:800,color:'#0B7A3B',margin:'0 0 14px'}}>📋 Tiketi ({filtered.length})</h3>
      
      {loading?<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>
        <div style={{fontSize:30,marginBottom:8}}>⏳</div>
      </div>:filtered.length>0?<div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(v=><div key={v.id} onClick={()=>{setViewing(v);setAdminNotes(v.admin_notes||'')}} style={{
          padding:'14px 16px',background:'#fff',
          border:'1.5px solid #E2E8F0',
          borderLeft:`4px solid ${getStatusColor(v.status)}`,
          borderRadius:10,cursor:'pointer',transition:'all 0.2s',
        }} onMouseOver={e=>e.currentTarget.style.background='#F8FAFC'}
            onMouseOut={e=>e.currentTarget.style.background='#fff'}>
          
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:10,marginBottom:8,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                <span style={{fontWeight:800,fontSize:14,color:'#1E293B'}}>👤 {v.customer_name}</span>
                {v.customer_satisfaction&&<span style={{fontSize:16}}>{getSatLabel(v.customer_satisfaction)}</span>}
              </div>
              <div style={{fontSize:11,color:'#64748B'}}>
                🤝 <b>Supevaiza:</b> {v.agent_name}
                {v.customer_business&&<> • 🏪 {v.customer_business}</>}
              </div>
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              <span style={{padding:'3px 10px',borderRadius:6,background:`${getStatusColor(v.status)}15`,color:getStatusColor(v.status),fontSize:10,fontWeight:800}}>{getStatusLabel(v.status)}</span>
              {v.has_issues&&<span style={{padding:'3px 10px',borderRadius:6,background:`${getUrgencyColor(v.urgency)}15`,color:getUrgencyColor(v.urgency),fontSize:10,fontWeight:800}}>⚠️ {v.urgency==='critical'?'DHARURA':v.urgency==='high'?'KUBWA':v.urgency==='normal'?'WASTANI':'NDOGO'}</span>}
            </div>
          </div>
          
          <div style={{fontSize:11,color:'#64748B',marginBottom:6,display:'flex',gap:10,flexWrap:'wrap'}}>
            <span>📅 {new Date(v.created_at).toLocaleString('sw-TZ',{dateStyle:'short',timeStyle:'short'})}</span>
            {v.customer_phone&&<span>📞 {v.customer_phone}</span>}
            {v.customer_location&&<span>📍 {v.customer_location}</span>}
          </div>
          
          {v.has_issues&&v.issues_description&&<div style={{fontSize:12,color:'#991B1B',padding:'8px 10px',background:'#FEF2F2',borderRadius:6,marginBottom:4}}>
            <b>⚠️ Changamoto:</b> {v.issues_description.slice(0,150)}{v.issues_description.length>150?'...':''}
          </div>}
        </div>)}
      </div>:<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>
        <div style={{fontSize:50,marginBottom:10}}>📋</div>
        <div style={{fontWeight:700,color:'#64748B'}}>Hakuna tiketi {filter!=='all'?`(${filter})`:''}</div>
      </div>}
    </div>
    
    {/* View/Update Modal */}
    {viewing&&<Modal open={true} onClose={()=>{setViewing(null);setAdminNotes('')}} title={`🎫 Tiketi - ${viewing.customer_name}`}>
      <div style={{maxHeight:'70vh',overflowY:'auto',paddingRight:8}}>
        
        {/* Status badges */}
        <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
          <span style={{padding:'4px 12px',borderRadius:8,background:`${getStatusColor(viewing.status)}15`,color:getStatusColor(viewing.status),fontSize:11,fontWeight:800}}>{getStatusLabel(viewing.status)}</span>
          {viewing.has_issues&&<span style={{padding:'4px 12px',borderRadius:8,background:`${getUrgencyColor(viewing.urgency)}15`,color:getUrgencyColor(viewing.urgency),fontSize:11,fontWeight:800}}>⚠️ {viewing.urgency}</span>}
        </div>
        
        {/* Supervisor info */}
        <div style={{background:'#EFF6FF',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #BFDBFE'}}>
          <div style={{fontSize:11,color:'#1E40AF',fontWeight:700,marginBottom:5}}>🤝 WAKALA</div>
          <div style={{fontWeight:800,fontSize:14,color:'#1E3A8A'}}>{viewing.agent_name}</div>
          {viewing.agent_phone&&<div style={{fontSize:12,color:'#1E40AF'}}>📞 {viewing.agent_phone}</div>}
        </div>
        
        {/* Customer info */}
        <div style={{background:'#F8FAFC',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#64748B',fontWeight:700,marginBottom:5}}>👤 MTEJA</div>
          <div style={{fontWeight:800,fontSize:14,color:'#1E293B'}}>{viewing.customer_name}</div>
          {viewing.customer_business&&<div style={{fontSize:12,color:'#475569'}}>🏪 {viewing.customer_business}</div>}
          {viewing.customer_phone&&<div style={{fontSize:12,color:'#475569'}}>📞 {viewing.customer_phone}</div>}
          {viewing.customer_location&&<div style={{fontSize:12,color:'#475569'}}>📍 {viewing.customer_location}</div>}
        </div>
        
        {/* Visit details */}
        <div style={{background:'#F8FAFC',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#64748B',fontWeight:700,marginBottom:5}}>📅 TAARIFA YA ZIARA</div>
          <div style={{fontSize:12,color:'#475569'}}><b>Tarehe:</b> {new Date(viewing.visit_date||viewing.created_at).toLocaleDateString('sw-TZ')}</div>
          <div style={{fontSize:12,color:'#475569'}}><b>Aina:</b> {viewing.visit_type}</div>
          {viewing.visit_purpose&&<div style={{fontSize:12,color:'#475569',marginTop:6}}><b>Lengo:</b><br/>{viewing.visit_purpose}</div>}
        </div>
        
        {/* Customer status */}
        <div style={{background:'#F0FDF4',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #BBF7D0'}}>
          <div style={{fontSize:11,color:'#15803D',fontWeight:700,marginBottom:5}}>📊 HALI YA MTEJA</div>
          <div style={{fontSize:12,color:'#166534'}}><b>Kuridhika:</b> {getSatLabel(viewing.customer_satisfaction)} {viewing.customer_satisfaction}</div>
          <div style={{fontSize:12,color:'#166534'}}><b>Matumizi:</b> {viewing.is_using_system==='yes'?'✅ Kila Siku':viewing.is_using_system==='sometimes'?'⚠️ Mara Chache':'❌ Hatumii'}</div>
        </div>
        
        {/* Issues */}
        {viewing.has_issues&&<div style={{background:'#FEF2F2',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #FCA5A5'}}>
          <div style={{fontSize:11,color:'#991B1B',fontWeight:700,marginBottom:5}}>⚠️ CHANGAMOTO</div>
          {viewing.issue_category&&<div style={{fontSize:12,color:'#7F1D1D',marginBottom:4}}><b>Aina:</b> {viewing.issue_category}</div>}
          <div style={{fontSize:12,color:'#7F1D1D'}}>{viewing.issues_description}</div>
        </div>}
        
        {viewing.customer_needs&&<div style={{background:'#F8FAFC',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#64748B',fontWeight:700,marginBottom:5}}>💡 MAHITAJI</div>
          <div style={{fontSize:12,color:'#475569'}}>{viewing.customer_needs}</div>
        </div>}
        
        {viewing.feedback&&<div style={{background:'#F8FAFC',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#64748B',fontWeight:700,marginBottom:5}}>💬 MAONI YA MTEJA</div>
          <div style={{fontSize:12,color:'#475569'}}>{viewing.feedback}</div>
        </div>}
        
        {viewing.recommendations&&<div style={{background:'#EFF6FF',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #BFDBFE'}}>
          <div style={{fontSize:11,color:'#1E40AF',fontWeight:700,marginBottom:5}}>📝 MAPENDEKEZO YA WAKALA</div>
          <div style={{fontSize:12,color:'#1E3A8A'}}>{viewing.recommendations}</div>
        </div>}
        
        {/* Admin notes */}
        <div style={{marginBottom:14,marginTop:14}}>
          <label style={{fontSize:12,fontWeight:800,color:'#0B7A3B',display:'block',marginBottom:5}}>📌 Maelezo Yako (Admin)</label>
          <textarea value={adminNotes} onChange={e=>setAdminNotes(e.target.value)} rows="3" placeholder="Andika maelezo ya utekelezaji uliofanya..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'2px solid #BBF7D0',fontSize:13,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical',background:'#F0FDF4'}}/>
        </div>
        
        {/* Action buttons */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {viewing.status!=='in_progress'&&<button onClick={()=>updateStatus(viewing.id,'in_progress')} disabled={updating} style={{padding:12,background:'linear-gradient(135deg,#3B82F6,#1E40AF)',color:'#fff',border:'none',borderRadius:10,fontWeight:800,fontSize:12,cursor:'pointer',boxShadow:'0 4px 12px rgba(59,130,246,0.25)'}}>🔄 Anza Kushughulikia</button>}
          {viewing.status!=='resolved'&&<button onClick={()=>updateStatus(viewing.id,'resolved')} disabled={updating} style={{padding:12,background:'linear-gradient(135deg,#22C55E,#15803D)',color:'#fff',border:'none',borderRadius:10,fontWeight:800,fontSize:12,cursor:'pointer',boxShadow:'0 4px 12px rgba(34,197,94,0.25)'}}>✅ Imetatuliwa</button>}
          {viewing.status==='resolved'&&<button onClick={()=>updateStatus(viewing.id,'closed')} disabled={updating} style={{padding:12,background:'#94A3B8',color:'#fff',border:'none',borderRadius:10,fontWeight:800,fontSize:12,cursor:'pointer',gridColumn:'1/-1'}}>🔒 Funga Tiketi</button>}
        </div>
      </div>
    </Modal>}
  </div>;
}

// =====================================================
// AGENT TARGETS & PERFORMANCE PAGE
// Admin anaweka targets na anaona performance ya masupervaiza
// =====================================================
export function SupervisorTargetsPage(){
  const{supabase,user,businesses}=useApp();
  const[supervisors,setAgents]=React.useState([]);
  const[targets,setTargets]=React.useState([]);
  const[visits,setVisits]=React.useState([]);
  const[loading,setLoading]=React.useState(true);
  const[period,setPeriod]=React.useState(()=>{
    const d=new Date();
    return {year:d.getFullYear(),month:d.getMonth()+1};
  });
  const[editTarget,setEditTarget]=React.useState(null);
  const[viewAgent,setViewAgent]=React.useState(null);
  const[saving,setSaving]=React.useState(false);
  
  // Security: Admin only
  if(user?.role!=='admin')return <div style={{padding:40,textAlign:'center',background:'#FEF3C7',borderRadius:16,border:'2px solid #F59E0B'}}>
    <div style={{fontSize:60,marginBottom:14}}>🔒</div>
    <h2 style={{fontSize:22,fontWeight:900,color:'#92400E',margin:'0 0 10px'}}>UKURASA WA ADMIN TU</h2>
  </div>;
  
  // Load data — supervisors from users table + promo_codes
  React.useEffect(()=>{loadData()},[period.year,period.month]);
  
  const loadData=async()=>{
    setLoading(true);
    try{
      // 1. Pata masupervaiza WOTE kutoka users table (role='supervisor')
      const{data:agentUsers}=await supabase.from('users')
        .select('*')
        .eq('role','supervisor')
        .order('name',{ascending:true});
      
      // 2. Pata promo codes zote za masupervaiza
      const{data:promoCodes}=await supabase.from('promo_codes').select('*');
      const promoMap={};
      (promoCodes||[]).forEach(p=>{promoMap[p.agent_email]=p});
      
      // 3. Unganisha supevaiza na promo yake
      const agentsList=(agentUsers||[]).map(a=>({
        ...a,
        promo_code:promoMap[a.email]?.code||null,
        promo_id:promoMap[a.email]?.id||null,
        commission_rate:promoMap[a.email]?.commission_rate||10,
      }));
      setAgents(agentsList);
      
      // 4. Targets ya mwezi huu
      const{data:tData}=await supabase.from('agent_targets')
        .select('*')
        .eq('year',period.year)
        .eq('month',period.month);
      setTargets(tData||[]);
      
      // 5. Visits za mwezi huu
      const monthStart=new Date(period.year,period.month-1,1).toISOString();
      const monthEnd=new Date(period.year,period.month,0,23,59,59).toISOString();
      const{data:vData}=await supabase.from('customer_visits')
        .select('*')
        .gte('visit_date',monthStart.slice(0,10))
        .lte('visit_date',monthEnd.slice(0,10));
      setVisits(vData||[]);
    }catch(e){console.warn('Load:',e)}
    setLoading(false);
  };
  
  // Helper: Get performance for an supervisor
  const getAgentPerformance=(agentId)=>{
    // Wateja wapya waliosajiliwa na supevaiza mwezi huu
    const monthStart=new Date(period.year,period.month-1,1);
    const monthEnd=new Date(period.year,period.month,0,23,59,59);
    const agentObj=supervisors.find(a=>a.id===agentId);
    const promoCode=agentObj?.promo_code;
    
    const newCustomers=businesses.filter(b=>{
      if(b.promo_code!==promoCode)return false;
      const cd=new Date(b.created_at);
      return cd>=monthStart&&cd<=monthEnd;
    });
    
    // Ziara za supevaiza huyu mwezi huu
    const supervisorVisits=visits.filter(v=>v.agent_id===agentId);
    
    // Unique customers visited (kila mteja = point moja)
    const uniqueVisited=new Set(supervisorVisits.map(v=>v.customer_name?.toLowerCase().trim())).size;
    
    // Target ya supevaiza huyu
    const target=targets.find(t=>t.agent_id===agentId);
    
    return {
      newCustomers:newCustomers.length,
      newCustomersList:newCustomers,
      totalVisits:supervisorVisits.length,
      uniqueVisited,
      visitsList:supervisorVisits,
      target:target||null,
      targetNewCustomers:target?.target_new_customers||10,
      targetVisits:target?.target_visits||30,
      bonusPerCustomer:target?.bonus_per_customer||5000,
      bonusPerVisit:target?.bonus_per_visit||1000,
      // Achievement %
      customerPct:target?Math.round((newCustomers.length/target.target_new_customers)*100):0,
      visitPct:target?Math.round((uniqueVisited/target.target_visits)*100):0,
      // Bonus earned
      bonusEarned:(newCustomers.length*(target?.bonus_per_customer||5000))+(uniqueVisited*(target?.bonus_per_visit||1000)),
      // Issues found
      issuesFound:supervisorVisits.filter(v=>v.has_issues).length,
    };
  };
  
  // Performance for all supervisors
  const allPerformance=supervisors.map(a=>({supervisor:a,...getAgentPerformance(a.id)}));
  const sortedByPerformance=[...allPerformance].sort((a,b)=>(b.newCustomers+b.uniqueVisited)-(a.newCustomers+a.uniqueVisited));
  
  // Total stats
  const totalStats={
    totalAgents:supervisors.length,
    totalNewCustomers:allPerformance.reduce((s,a)=>s+a.newCustomers,0),
    totalVisits:allPerformance.reduce((s,a)=>s+a.totalVisits,0),
    totalUniqueVisited:allPerformance.reduce((s,a)=>s+a.uniqueVisited,0),
    totalBonus:allPerformance.reduce((s,a)=>s+a.bonusEarned,0),
    agentsWithTargets:targets.length,
    issuesFound:allPerformance.reduce((s,a)=>s+a.issuesFound,0),
  };
  
  const months=['Januari','Februari','Machi','Aprili','Mei','Juni','Julai','Agosti','Septemba','Oktoba','Novemba','Desemba'];
  const monthLabel=months[period.month-1];
  
  // Save target
  const saveTarget=async()=>{
    if(!editTarget)return;
    setSaving(true);
    try{
      const payload={
        agent_id:editTarget.supervisor.id,
        agent_name:editTarget.supervisor.name||editTarget.supervisor.email,
        year:period.year,
        month:period.month,
        target_new_customers:+editTarget.target_new_customers||10,
        target_visits:+editTarget.target_visits||30,
        bonus_per_customer:+editTarget.bonus_per_customer||5000,
        bonus_per_visit:+editTarget.bonus_per_visit||1000,
        notes:editTarget.notes||'',
        created_by:user.id,
        updated_at:new Date().toISOString(),
      };
      
      // Upsert (insert au update)
      const{error}=await supabase.from('agent_targets').upsert(payload,{
        onConflict:'agent_id,year,month',
      });
      
      if(error)throw error;
      
      // Notify supervisor
      try{
        await supabase.from('notifications').insert({
          target_type:'user',
          target_id:editTarget.supervisor.id,
          type:'info',
          title:`🎯 Target Yako ya ${monthLabel} ${period.year}`,
          message:`Admin amekupatia target: Wateja Wapya ${payload.target_new_customers}, Ziara ${payload.target_visits}. Bonasi: TZS ${payload.bonus_per_customer.toLocaleString()}/mteja + TZS ${payload.bonus_per_visit.toLocaleString()}/ziara.`,
        });
      }catch(e){}
      
      alert(`✅ Target imehifadhiwa kwa ${editTarget.supervisor.name||editTarget.supervisor.email}!\n\n📅 Mwezi: ${monthLabel} ${period.year}\n👥 Wateja Wapya: ${payload.target_new_customers}\n📋 Ziara: ${payload.target_visits}\n💰 Bonasi: TZS ${(payload.target_new_customers*payload.bonus_per_customer+payload.target_visits*payload.bonus_per_visit).toLocaleString()} (max)`);
      
      setEditTarget(null);
      await loadData();
    }catch(e){
      alert('Tatizo: '+e.message);
    }
    setSaving(false);
  };
  
  const exportReport=()=>{
    const csvRows=[
      ['Mwezi','Supevaiza','Wateja Wapya','Target','%','Ziara (Unique)','Ziara Target','%','Changamoto','Bonasi (TZS)'],
      ...sortedByPerformance.map(p=>[
        `${monthLabel} ${period.year}`,
        p.supervisor.name||p.supervisor.email,
        p.newCustomers,
        p.targetNewCustomers,
        p.customerPct+'%',
        p.uniqueVisited,
        p.targetVisits,
        p.visitPct+'%',
        p.issuesFound,
        p.bonusEarned.toLocaleString(),
      ])
    ];
    const csv=csvRows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`masupervaiza-${period.year}-${period.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return <div>
    {/* Header */}
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>🎯 Targets & Performance ya Mawakala</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Panga targets, fuatilia performance, na simamia bonasi za masupervaiza</p>
    </div>
    
    {/* Period Selector */}
    <div className="card" style={{marginBottom:16,background:'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <div style={{fontSize:32}}>📅</div>
        <div style={{flex:1,minWidth:180}}>
          <div style={{fontSize:11,opacity:0.85,fontWeight:700,letterSpacing:1}}>MWEZI WA KUSAJILI</div>
          <div style={{fontSize:24,fontWeight:900}}>{monthLabel} {period.year}</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <select value={period.month} onChange={e=>setPeriod({...period,month:+e.target.value})} style={{padding:'10px 14px',borderRadius:10,border:'none',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {months.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={period.year} onChange={e=>setPeriod({...period,year:+e.target.value})} style={{padding:'10px 14px',borderRadius:10,border:'none',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </div>
    
    {/* Overall Stats */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:16}}>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #0B7A3B'}}>
        <div style={{fontSize:10,color:'#15803D',fontWeight:700}}>MASUPERVAIZA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#0B7A3B',marginTop:4}}>{totalStats.totalAgents}</div>
        <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>{totalStats.agentsWithTargets} wana target</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #3B82F6'}}>
        <div style={{fontSize:10,color:'#1D4ED8',fontWeight:700}}>WATEJA WAPYA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#3B82F6',marginTop:4}}>{totalStats.totalNewCustomers}</div>
        <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>wameongezwa</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #8B5CF6'}}>
        <div style={{fontSize:10,color:'#6D28D9',fontWeight:700}}>ZIARA (UNIQUE)</div>
        <div style={{fontSize:24,fontWeight:900,color:'#8B5CF6',marginTop:4}}>{totalStats.totalUniqueVisited}</div>
        <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>{totalStats.totalVisits} jumla</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #F59E0B'}}>
        <div style={{fontSize:10,color:'#B45309',fontWeight:700}}>BONASI YAILIYOPATIKANA</div>
        <div style={{fontSize:16,fontWeight:900,color:'#F59E0B',marginTop:4}}>TZS {totalStats.totalBonus.toLocaleString()}</div>
        <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>kwa masupervaiza wote</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #DC2626'}}>
        <div style={{fontSize:10,color:'#991B1B',fontWeight:700}}>CHANGAMOTO</div>
        <div style={{fontSize:24,fontWeight:900,color:'#DC2626',marginTop:4}}>{totalStats.issuesFound}</div>
        <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>za mteja</div>
      </div>
    </div>
    
    {/* Actions */}
    <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
      <button onClick={exportReport} style={{padding:'10px 16px',background:'#fff',color:'#0B7A3B',border:'2px solid #BBF7D0',borderRadius:10,fontWeight:700,fontSize:12,cursor:'pointer'}}>
        📥 Pakua CSV Report
      </button>
    </div>
    
    {/* Supervisors Performance Cards */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:800,color:'#0B7A3B',margin:'0 0 14px'}}>🏆 Performance ya Mawakala — {monthLabel} {period.year}</h3>
      
      {loading?<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>
        <div style={{fontSize:30,marginBottom:8}}>⏳</div>
        <div>Inaleta data...</div>
      </div>:sortedByPerformance.length===0?<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>
        <div style={{fontSize:50,marginBottom:10}}>👥</div>
        <div style={{fontWeight:700}}>Hakuna masupervaiza</div>
      </div>:<div style={{display:'flex',flexDirection:'column',gap:12}}>
        {sortedByPerformance.map((p,idx)=>{
          const overallPct=p.target?Math.round(((p.newCustomers/p.targetNewCustomers)+(p.uniqueVisited/p.targetVisits))/2*100):0;
          const isTop3=idx<3&&p.newCustomers+p.uniqueVisited>0;
          const medal=idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':'';
          
          return <div key={p.supervisor.id} style={{
            padding:'16px 18px',
            background:'#fff',
            border:`2px solid ${isTop3?'#FCD34D':'#E2E8F0'}`,
            borderRadius:12,
            position:'relative',
          }}>
            {isTop3&&<div style={{position:'absolute',top:-10,right:14,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:800}}>{medal} TOP {idx+1}</div>}
            
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:10,marginBottom:14,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{
                  width:48,height:48,borderRadius:12,
                  background:`hsl(${idx*60},70%,45%)`,
                  color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:20,fontWeight:900,
                }}>{(p.supervisor.name||p.supervisor.email||'?')[0].toUpperCase()}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:'#1E293B'}}>{p.supervisor.name||p.supervisor.email}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>📞 {p.supervisor.phone||'—'} • Code: {p.supervisor.promo_code||'—'}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setEditTarget({supervisor:p.supervisor,target_new_customers:p.targetNewCustomers,target_visits:p.targetVisits,bonus_per_customer:p.bonusPerCustomer,bonus_per_visit:p.bonusPerVisit,notes:p.target?.notes||''})} style={{padding:'8px 14px',background:'#0B7A3B',color:'#fff',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer'}}>{p.target?'✏️ Hariri Target':'🎯 Weka Target'}</button>
                <button onClick={()=>setViewAgent(p)} style={{padding:'8px 14px',background:'#fff',color:'#0B7A3B',border:'2px solid #BBF7D0',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer'}}>📊 Detail</button>
              </div>
            </div>
            
            {/* Performance Grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:12}}>
              {/* New Customers */}
              <div style={{background:'#EFF6FF',padding:'10px 12px',borderRadius:10}}>
                <div style={{fontSize:10,color:'#1D4ED8',fontWeight:700}}>👥 WATEJA WAPYA</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:4}}>
                  <span style={{fontSize:22,fontWeight:900,color:'#3B82F6'}}>{p.newCustomers}</span>
                  {p.target&&<span style={{fontSize:12,color:'#64748B'}}>/ {p.targetNewCustomers}</span>}
                </div>
                {p.target&&<div style={{height:5,background:'#DBEAFE',borderRadius:5,marginTop:6,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(100,p.customerPct)}%`,background:p.customerPct>=100?'#22C55E':'#3B82F6',transition:'width 0.5s'}}/>
                </div>}
                {p.target&&<div style={{fontSize:10,color:p.customerPct>=100?'#15803D':'#1D4ED8',marginTop:3,fontWeight:700}}>{p.customerPct}% {p.customerPct>=100?'✅':''}</div>}
              </div>
              
              {/* Visits */}
              <div style={{background:'#F5F3FF',padding:'10px 12px',borderRadius:10}}>
                <div style={{fontSize:10,color:'#6D28D9',fontWeight:700}}>📋 ZIARA (UNIQUE)</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:4}}>
                  <span style={{fontSize:22,fontWeight:900,color:'#8B5CF6'}}>{p.uniqueVisited}</span>
                  {p.target&&<span style={{fontSize:12,color:'#64748B'}}>/ {p.targetVisits}</span>}
                </div>
                {p.target&&<div style={{height:5,background:'#EDE9FE',borderRadius:5,marginTop:6,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(100,p.visitPct)}%`,background:p.visitPct>=100?'#22C55E':'#8B5CF6',transition:'width 0.5s'}}/>
                </div>}
                {p.target&&<div style={{fontSize:10,color:p.visitPct>=100?'#15803D':'#6D28D9',marginTop:3,fontWeight:700}}>{p.visitPct}% {p.visitPct>=100?'✅':''}</div>}
                <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>({p.totalVisits} jumla)</div>
              </div>
              
              {/* Bonus Earned */}
              <div style={{background:'#FEF3C7',padding:'10px 12px',borderRadius:10}}>
                <div style={{fontSize:10,color:'#B45309',fontWeight:700}}>💰 BONASI</div>
                <div style={{fontSize:14,fontWeight:900,color:'#F59E0B',marginTop:4}}>TZS {p.bonusEarned.toLocaleString()}</div>
                <div style={{fontSize:10,color:'#92400E',marginTop:2}}>iliyopatikana</div>
              </div>
              
              {/* Issues */}
              {p.issuesFound>0&&<div style={{background:'#FEF2F2',padding:'10px 12px',borderRadius:10}}>
                <div style={{fontSize:10,color:'#991B1B',fontWeight:700}}>⚠️ CHANGAMOTO</div>
                <div style={{fontSize:22,fontWeight:900,color:'#DC2626',marginTop:4}}>{p.issuesFound}</div>
                <div style={{fontSize:10,color:'#7F1D1D',marginTop:2}}>za mteja</div>
              </div>}
            </div>
            
            {/* Overall progress bar (if target set) */}
            {p.target&&<div style={{padding:'8px 12px',background:overallPct>=100?'#F0FDF4':overallPct>=70?'#FEF3C7':'#FEF2F2',borderRadius:8,fontSize:11,color:overallPct>=100?'#15803D':overallPct>=70?'#92400E':'#991B1B',fontWeight:700}}>
              {overallPct>=100?'✅ Lengo Limefika!':overallPct>=70?'⏳ Karibu na Lengo':'⚠️ Bado Mbali na Lengo'} — Overall: {overallPct}%
            </div>}
            
            {!p.target&&<div style={{padding:'8px 12px',background:'#FEF3C7',borderRadius:8,fontSize:11,color:'#92400E',fontWeight:700}}>
              ⚠️ Hakuna target — bonyeza "Weka Target" kuanza kufuatilia
            </div>}
          </div>;
        })}
      </div>}
    </div>
    
    {/* EDIT TARGET MODAL */}
    {editTarget&&<Modal open={true} onClose={()=>setEditTarget(null)} title={`🎯 Target — ${editTarget.supervisor.name||editTarget.supervisor.email}`}>
      <div style={{maxHeight:'70vh',overflowY:'auto'}}>
        <div style={{background:'#F0FDF4',padding:'12px 14px',borderRadius:10,marginBottom:14,border:'1.5px solid #BBF7D0'}}>
          <div style={{fontSize:11,color:'#15803D',fontWeight:700,marginBottom:4}}>📅 MWEZI</div>
          <div style={{fontWeight:800,color:'#0B7A3B'}}>{monthLabel} {period.year}</div>
        </div>
        
        <h4 style={{fontSize:13,fontWeight:800,color:'#0B7A3B',margin:'14px 0 8px'}}>🎯 Targets</h4>
        
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>👥 Wateja Wapya</label>
            <input type="number" value={editTarget.target_new_customers} onChange={e=>setEditTarget({...editTarget,target_new_customers:e.target.value})} placeholder="10" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #BBF7D0',fontSize:14,boxSizing:'border-box'}}/>
            <div style={{fontSize:10,color:'#94A3B8',marginTop:3}}>Idadi ya wateja wapya wa kusajili</div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>📋 Ziara (Unique)</label>
            <input type="number" value={editTarget.target_visits} onChange={e=>setEditTarget({...editTarget,target_visits:e.target.value})} placeholder="30" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #BBF7D0',fontSize:14,boxSizing:'border-box'}}/>
            <div style={{fontSize:10,color:'#94A3B8',marginTop:3}}>Wateja tofauti wa kutembelea (kila 1 = point 1)</div>
          </div>
        </div>
        
        <h4 style={{fontSize:13,fontWeight:800,color:'#0B7A3B',margin:'14px 0 8px'}}>💰 Bonasi</h4>
        
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Kwa Mteja Mpya (TZS)</label>
            <input type="number" value={editTarget.bonus_per_customer} onChange={e=>setEditTarget({...editTarget,bonus_per_customer:e.target.value})} placeholder="5000" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #FDE68A',fontSize:14,boxSizing:'border-box'}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Kwa Ziara (TZS)</label>
            <input type="number" value={editTarget.bonus_per_visit} onChange={e=>setEditTarget({...editTarget,bonus_per_visit:e.target.value})} placeholder="1000" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #FDE68A',fontSize:14,boxSizing:'border-box'}}/>
          </div>
        </div>
        
        {/* Preview */}
        <div style={{background:'#FEF3C7',padding:'12px 14px',borderRadius:10,marginBottom:14,border:'1.5px solid #FCD34D'}}>
          <div style={{fontSize:11,color:'#92400E',fontWeight:800,marginBottom:6}}>💰 Bonasi ya Kupata (Akifikia Target)</div>
          <div style={{fontSize:11,color:'#78350F',marginBottom:3}}>
            • Wateja Wapya: {editTarget.target_new_customers} × TZS {(+editTarget.bonus_per_customer).toLocaleString()} = <b>TZS {(+editTarget.target_new_customers*+editTarget.bonus_per_customer).toLocaleString()}</b>
          </div>
          <div style={{fontSize:11,color:'#78350F',marginBottom:6}}>
            • Ziara: {editTarget.target_visits} × TZS {(+editTarget.bonus_per_visit).toLocaleString()} = <b>TZS {(+editTarget.target_visits*+editTarget.bonus_per_visit).toLocaleString()}</b>
          </div>
          <div style={{borderTop:'2px dashed #FCD34D',paddingTop:6,fontSize:14,color:'#92400E',fontWeight:900}}>
            JUMLA: TZS {(+editTarget.target_new_customers*+editTarget.bonus_per_customer+(+editTarget.target_visits)*+editTarget.bonus_per_visit).toLocaleString()}
          </div>
        </div>
        
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>📝 Maelezo (Optional)</label>
          <textarea value={editTarget.notes} onChange={e=>setEditTarget({...editTarget,notes:e.target.value})} rows="2" placeholder="Mfano: Tuna target kubwa mwezi huu kwa sababu..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
        </div>
        
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setEditTarget(null)} style={{flex:1,padding:12,background:'#fff',color:'#64748B',border:'2px solid #E2E8F0',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>Ghairi</button>
          <button onClick={saveTarget} disabled={saving} style={{flex:2,padding:12,background:saving?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:10,fontWeight:800,fontSize:13,cursor:saving?'wait':'pointer',boxShadow:'0 4px 15px rgba(11,122,59,0.3)'}}>{saving?'⏳ Inahifadhi...':'💾 Hifadhi Target'}</button>
        </div>
      </div>
    </Modal>}
    
    {/* VIEW AGENT DETAIL MODAL */}
    {viewAgent&&<Modal open={true} onClose={()=>setViewAgent(null)} title={`📊 Detail — ${viewAgent.supervisor.name||viewAgent.supervisor.email}`}>
      <div style={{maxHeight:'72vh',overflowY:'auto'}}>
        
        {/* Hero stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <div style={{background:'linear-gradient(135deg,#3B82F6,#1E40AF)',color:'#fff',padding:'14px 16px',borderRadius:12}}>
            <div style={{fontSize:11,opacity:0.85,fontWeight:700}}>WATEJA WAPYA</div>
            <div style={{fontSize:32,fontWeight:900}}>{viewAgent.newCustomers}</div>
            {viewAgent.target&&<div style={{fontSize:11,opacity:0.85,marginTop:2}}>Target: {viewAgent.targetNewCustomers} ({viewAgent.customerPct}%)</div>}
          </div>
          <div style={{background:'linear-gradient(135deg,#8B5CF6,#6D28D9)',color:'#fff',padding:'14px 16px',borderRadius:12}}>
            <div style={{fontSize:11,opacity:0.85,fontWeight:700}}>ZIARA (UNIQUE)</div>
            <div style={{fontSize:32,fontWeight:900}}>{viewAgent.uniqueVisited}</div>
            {viewAgent.target&&<div style={{fontSize:11,opacity:0.85,marginTop:2}}>Target: {viewAgent.targetVisits} ({viewAgent.visitPct}%)</div>}
          </div>
        </div>
        
        {/* Bonus */}
        <div style={{background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',padding:'14px 16px',borderRadius:12,marginBottom:14}}>
          <div style={{fontSize:11,opacity:0.85,fontWeight:700}}>💰 BONASI YA KULIPWA</div>
          <div style={{fontSize:24,fontWeight:900}}>TZS {viewAgent.bonusEarned.toLocaleString()}</div>
          <div style={{fontSize:11,opacity:0.85,marginTop:4}}>
            {viewAgent.newCustomers} wateja × TZS {viewAgent.bonusPerCustomer.toLocaleString()} + {viewAgent.uniqueVisited} ziara × TZS {viewAgent.bonusPerVisit.toLocaleString()}
          </div>
        </div>
        
        {/* New customers list */}
        {viewAgent.newCustomersList.length>0&&<div style={{marginBottom:14}}>
          <h4 style={{fontSize:13,fontWeight:800,color:'#0B7A3B',margin:'0 0 8px'}}>👥 Wateja Wapya ({viewAgent.newCustomers})</h4>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:200,overflowY:'auto'}}>
            {viewAgent.newCustomersList.map(b=><div key={b.id} style={{padding:'8px 12px',background:'#F0FDF4',borderRadius:8,fontSize:12,borderLeft:'3px solid #22C55E'}}>
              <div style={{fontWeight:700,color:'#15803D'}}>{b.name}</div>
              <div style={{fontSize:11,color:'#166534'}}>📞 {b.phone||'—'} • {new Date(b.created_at).toLocaleDateString('sw-TZ')}</div>
            </div>)}
          </div>
        </div>}
        
        {/* Visits list */}
        {viewAgent.visitsList.length>0&&<div style={{marginBottom:14}}>
          <h4 style={{fontSize:13,fontWeight:800,color:'#0B7A3B',margin:'0 0 8px'}}>📋 Ziara ({viewAgent.totalVisits})</h4>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:300,overflowY:'auto'}}>
            {viewAgent.visitsList.map(v=><div key={v.id} style={{padding:'8px 12px',background:v.has_issues?'#FEF2F2':'#F5F3FF',borderRadius:8,fontSize:12,borderLeft:`3px solid ${v.has_issues?'#DC2626':'#8B5CF6'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                <span style={{fontWeight:700,color:v.has_issues?'#991B1B':'#6D28D9'}}>👤 {v.customer_name}</span>
                {v.has_issues&&<span style={{fontSize:9,padding:'1px 6px',background:'#DC2626',color:'#fff',borderRadius:4,fontWeight:800}}>⚠️ Tatizo</span>}
              </div>
              <div style={{fontSize:11,color:v.has_issues?'#7F1D1D':'#6D28D9'}}>📅 {new Date(v.visit_date||v.created_at).toLocaleDateString('sw-TZ')} • {v.visit_type}</div>
            </div>)}
          </div>
        </div>}
        
        {viewAgent.newCustomers===0&&viewAgent.totalVisits===0&&<div style={{textAlign:'center',padding:30,color:'#94A3B8'}}>
          <div style={{fontSize:40,marginBottom:8}}>📊</div>
          <div style={{fontWeight:700}}>Hakuna shughuli mwezi huu</div>
        </div>}
      </div>
    </Modal>}
  </div>;
}
