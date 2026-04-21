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

// ===== STORES (with Customer Detail Card) =====
export function StoresPage(){
  const{businesses,suspendBiz,deleteBiz,updateSetting,settings,quickExtend,quickUpgrade,quickTransfer,deleteAllCustomerData,promoCodes,loginLogs,sales,products,employees,branches}=useApp();
  const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');
  const[detail,setDetail]=useState(null); // Customer detail modal
  const[extendDays,setExtendDays]=useState('30');
  const[upgradePlan,setUpgradePlan]=useState('');
  const[transferCode,setTransferCode]=useState('');
  const[actionModal,setActionModal]=useState({type:null,biz:null});

  const filtered=businesses.filter(b=>{if(search&&!b.name?.toLowerCase().includes(search.toLowerCase())&&!b.email?.toLowerCase().includes(search.toLowerCase()))return false;if(filter==='active')return b.token_active;if(filter==='suspended')return b.is_suspended;if(filter==='trial')return!b.token_active&&!b.is_suspended;return true});

  const isBranchOn=(bid)=>settings[`branch_biz_${bid}`]==='true';
  const toggleBranch=async(bid)=>{const k=`branch_biz_${bid}`;await updateSetting(k,settings[k]==='true'?'false':'true')};
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
            <button onClick={()=>setActionModal({type:'extend',biz:b})} style={{padding:'5px 8px',fontSize:10,borderRadius:6,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:700,cursor:'pointer'}}>+Siku</button>
            <button onClick={()=>{setUpgradePlan(b.plan||'basic');setActionModal({type:'upgrade',biz:b})}} style={{padding:'5px 8px',fontSize:10,borderRadius:6,border:'1px solid #C4B5FD',background:'#F5F3FF',color:'#7C3AED',fontWeight:700,cursor:'pointer'}}>⬆Plan</button>
            <button onClick={()=>toggleBranch(b.id)} style={{padding:'5px 8px',fontSize:10,borderRadius:6,border:'none',background:isBranchOn(b.id)?'#F0FDF4':'#F1F5F9',color:isBranchOn(b.id)?'#0B7A3B':'#94A3B8',fontWeight:700,cursor:'pointer'}}>🏪{isBranchOn(b.id)?'ON':'OFF'}</button>
            <Btn v={b.is_suspended?'primary':'warning'} style={{padding:'5px 8px',fontSize:10}} onClick={()=>suspendBiz(b.id,!b.is_suspended)}>{b.is_suspended?'Fungua':'Funga'}</Btn>
          </div>
        </div>;
      })}
    </div>
    {!filtered.length&&<Empty icon="🏪" text="Hakuna"/>}

    {/* ===== CUSTOMER DETAIL MODAL ===== */}
    <Modal open={!!detail} onClose={()=>setDetail(null)} title={`📋 ${detail?.name||''}`} wide>
      {detail&&(()=>{const dl=getDaysLeft(detail);const st=getBizStats(detail.id);const agent=promoCodes.find(p=>p.code===detail.promo_code);
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
              {agent&&<div style={{fontSize:13}}>👤 Agent: {agent.agent_name} ({agent.code})</div>}
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

          {/* Quick Actions */}
          <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:8}}>Vitendo vya Haraka</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8,marginBottom:16}}>
            <button onClick={()=>{setDetail(null);setActionModal({type:'extend',biz:detail})}} style={{padding:'12px',borderRadius:10,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>⏳ Ongeza Siku</button>
            <button onClick={()=>{setUpgradePlan(detail.plan||'basic');setDetail(null);setActionModal({type:'upgrade',biz:detail})}} style={{padding:'12px',borderRadius:10,border:'1px solid #C4B5FD',background:'#F5F3FF',color:'#7C3AED',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>⬆️ Upgrade Plan</button>
            <button onClick={()=>{setDetail(null);setActionModal({type:'transfer',biz:detail})}} style={{padding:'12px',borderRadius:10,border:'1px solid #93C5FD',background:'#EFF6FF',color:'#2563EB',fontWeight:700,fontSize:13,cursor:'pointer',textAlign:'center'}}>🔄 Hamisha Agent</button>
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
      <div style={{fontSize:13,color:'#64748B',marginBottom:12}}>Agent wa sasa: <b>{actionModal.biz?.promo_code||'Hakuna'}</b></div>
      <Sel label="Agent Mpya" value={transferCode} onChange={e=>setTransferCode(e.target.value)} options={[{value:'',label:'— Ondoa Agent —'},...promoCodes.map(p=>({value:p.code,label:`${p.agent_name} (${p.code})`}))]}/>
      <Btn onClick={async()=>{await quickTransfer(actionModal.biz.id,transferCode);alert('Imehamishwa!');setActionModal({type:null,biz:null})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>🔄 Hamisha</Btn>
    </Modal>
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

// ===== PAYMENTS (Approve/Reject) =====
export function PaymentsPage(){
  const{paymentRequests,approvePayment,rejectPayment,pendingPayments,settings}=useApp();
  const[tab,setTab]=useState('pending');
  const[days,setDays]=useState('30');
  const[rejectId,setRejectId]=useState(null);
  const[rejectReason,setRejectReason]=useState('');
  const[processing,setProcessing]=useState(null);
  const price=parseInt(settings.system_price||30000);

  const filtered=tab==='pending'?paymentRequests.filter(p=>p.status==='pending')
    :tab==='approved'?paymentRequests.filter(p=>p.status==='approved')
    :tab==='rejected'?paymentRequests.filter(p=>p.status==='rejected')
    :paymentRequests;

  const handleApprove=async(id)=>{
    setProcessing(id);
    const result=await approvePayment(id,+days||30);
    setProcessing(null);
    if(result)alert(`Imethibitishwa! Token: ${result.code} (Siku ${result.days})`);
  };

  const handleReject=(id)=>{
    setRejectId(id);setRejectReason('');
  };

  const confirmReject=async()=>{
    if(!rejectId)return;
    setProcessing(rejectId);
    await rejectPayment(rejectId,rejectReason||'Transaction ID si sahihi');
    setProcessing(null);
    setRejectId(null);setRejectReason('');
  };

  return <div>
    {/* Stats */}
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.bell} label="Inasubiri" value={pendingPayments.length} color="#F59E0B"/>
      <Stat icon={IC.ok} label="Zimethibitishwa" value={paymentRequests.filter(p=>p.status==='approved').length} color="#22C55E"/>
      <Stat icon={IC.warn} label="Zimekataliwa" value={paymentRequests.filter(p=>p.status==='rejected').length} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Mapato" value={`TZS ${paymentRequests.filter(p=>p.status==='approved').reduce((a,p)=>a+(p.amount||0),0).toLocaleString()}`} color="#0B7A3B"/>
    </div>

    {/* Days input for approval */}
    <div className="card" style={{marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <span style={{fontSize:13,fontWeight:600}}>Siku za Token:</span>
      <div style={{width:100}}><Input type="number" value={days} onChange={e=>setDays(e.target.value)}/></div>
      <div style={{display:'flex',gap:4}}>
        {[7,14,30,60,90].map(d=><button key={d} onClick={()=>setDays(String(d))} style={{padding:'5px 10px',borderRadius:6,border:days===String(d)?'2px solid #0B7A3B':'1px solid #E2E8F0',background:days===String(d)?'#F0FDF4':'#fff',fontSize:11,fontWeight:600,cursor:'pointer',color:days===String(d)?'#0B7A3B':'#64748B'}}>{d}</button>)}
      </div>
    </div>

    {/* Tabs */}
    <Tabs tabs={[
      {id:'pending',label:`Inasubiri (${pendingPayments.length})`},
      {id:'approved',label:'Zimethibitishwa'},
      {id:'rejected',label:'Zimekataliwa'},
      {id:'all',label:'Zote'},
    ]} active={tab} onChange={setTab}/>

    {/* Payment Cards */}
    <div className="card">
      {filtered.length?filtered.map(p=><div key={p.id} style={{padding:'14px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>{p.business_name||'—'}</div>
            <div style={{fontSize:12,color:'#64748B'}}>{p.user_email}</div>
            <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{new Date(p.created_at).toLocaleString('sw-TZ')}</div>
          </div>
          <Badge color={p.status==='pending'?'#F59E0B':p.status==='approved'?'#22C55E':'#EF4444'}>
            {p.status==='pending'?'Inasubiri':p.status==='approved'?'Imethibitishwa':'Imekataliwa'}
          </Badge>
        </div>

        {/* Payment Details */}
        <div style={{background:'#F8FAFC',borderRadius:10,padding:10,marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          <div style={{fontSize:12}}><span style={{color:'#94A3B8'}}>Transaction:</span><br/><span style={{fontWeight:700,fontFamily:'monospace',fontSize:13}}>{p.transaction_id}</span></div>
          <div style={{fontSize:12}}><span style={{color:'#94A3B8'}}>Kiasi:</span><br/><span style={{fontWeight:700,fontSize:15,color:'#0B7A3B'}}>TZS {(p.amount||0).toLocaleString()}</span></div>
          <div style={{fontSize:12}}><span style={{color:'#94A3B8'}}>Njia:</span><br/><span style={{fontWeight:600}}>{p.payment_method}</span></div>
          <div style={{fontSize:12}}><span style={{color:'#94A3B8'}}>Simu:</span><br/><span style={{fontWeight:600}}>{p.phone||'—'}</span></div>
        </div>

        {/* Approved info */}
        {p.status==='approved'&&p.token_code&&<div style={{background:'#F0FDF4',borderRadius:8,padding:8,marginTop:6,fontSize:12,color:'#15803D'}}>
          Token: <b>{p.token_code}</b> | Siku: {p.days_given}
        </div>}
        {p.status==='rejected'&&<div style={{background:'#FEF2F2',borderRadius:8,padding:8,marginTop:6,fontSize:12,color:'#B91C1C'}}>
          Sababu: {p.reject_reason||'—'}
        </div>}

        {/* Action Buttons */}
        {p.status==='pending'&&<div style={{display:'flex',gap:8,marginTop:10}}>
          <button onClick={()=>handleApprove(p.id)} disabled={processing===p.id} style={{flex:1,padding:'10px 0',background:processing===p.id?'#86EFAC':'#22C55E',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:processing===p.id?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            {processing===p.id?<><span className="spinner"></span> Inathibitisha...</>:'✅ Thibitisha'}
          </button>
          <button onClick={()=>handleReject(p.id)} style={{flex:1,padding:'10px 0',background:'#FEF2F2',color:'#EF4444',border:'1px solid #FECACA',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer'}}>❌ Kataa</button>
        </div>}
      </div>):<Empty icon={tab==='pending'?'✅':'📋'} text={tab==='pending'?'Hakuna malipo yanasubiri':'Hakuna'}/>}
    </div>

    {/* Reject Modal */}
    {rejectId&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:16}}>
      <div style={{background:'#fff',borderRadius:16,padding:24,maxWidth:400,width:'100%'}}>
        <h3 style={{margin:'0 0 12px',fontSize:16,fontWeight:700}}>Sababu ya Kukataa</h3>
        <Input label="Sababu" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Mf: Transaction ID si sahihi"/>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={confirmReject} style={{flex:1,padding:12,background:'#EF4444',color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Kataa</button>
          <button onClick={()=>setRejectId(null)} style={{flex:1,padding:12,background:'#F1F5F9',color:'#475569',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ghairi</button>
        </div>
      </div>
    </div>}

    <style>{`.spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top:2px solid #fff;border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
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
      <b>Jinsi inavyofanya kazi:</b> Mshirika anaingia kwa email na password yake. Anaona Dashboard ya Masoko yenye wateja, mawakala, pipeline, kamisheni, na ripoti. HAONI data za mauzo ya wateja — usalama umehakikishwa.
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
