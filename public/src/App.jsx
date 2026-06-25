import {saveStockSnapshot} from './utils/offlineDB';
import React,{useState,useEffect} from 'react';
import {useApp} from './context/AppContext';
import {IC,Modal,NotifPopup,Btn,Badge,OnlineStatus,Sel} from './components/UI';
import {PWAInstallPrompt,OnlineStatusBar} from './components/PWA';
import {HelpChatWidget,AdminChatPanel} from './components/LiveChat';
import {exportReceiptPDF,shareWhatsApp,fmtDate,fmtMoney} from './utils/helpers';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import LockedPage from './pages/LockedPage';
import {AdminDashboard,StoresPage,TokensPage,PromoPage,SettingsPage,BroadcastPage,SecurityPage,BackupPage,TicketsPage,PaymentsPage,PartnersPage,ActivityFeedPage,SystemUsagePage,EmailTemplatesPage,AdminReportsPage,InfoRequestsPage,ReferralManagementPage,SupervisorVisitsAdminPage,SupervisorTargetsPage} from './pages/admin/AdminPages';
import InfoUpdateRequest from './pages/InfoUpdateRequest';
import {SMSCenterPage} from './pages/admin/SMSCenter';
import {OfficeDash,SalesPage,ProductsPage,ReportsPage,ExpensesPage,EmployeesPage,CustomersPage,NotifsPage,BranchesPage,ReturnsPage,SupportPage,GoalsPage,InvoicePage,ReferralPage,ProductAnalyticsPage,EmployeeReportsPage} from './pages/office/OfficePages';
import {MarketingDash,MktAgentsPage,PipelinePage,MktReportsPage,MktBroadcastPage,CampaignPage,FollowupPage,TestimonialsPage,MessagingPage,EmailCampaignPage,DemoPage,MktTokensPage} from './pages/marketing/MarketingPages';
import {AgentDashboard,AgentRegisterPage,AgentCustomersPage,AgentTiersPage,SupervisorVisitsPage} from './pages/supervisor/AgentPages';
import {AccountantDashboard,AccBudgetPage,AccPayrollPage,AccDebtsPage,AccAuditPage,AccPaymentsPage,AccExpensesPage,AccRevenuePage,AccCustomersPage,AccReportsPage} from './pages/accountant/AccountantPages';

const MENUS={
  admin:[
    {id:'dashboard',icon:IC.home,label:'Dashboard'},
    {group:'biashara',label:'🏢 Biashara',icon:IC.store,items:[
      {id:'stores',icon:IC.store,label:'Maduka'},
      {id:'payments',icon:IC.dollar,label:'Malipo'},
      {id:'info_requests',icon:IC.file,label:'Ombi za Mabadiliko'},
    ]},
    {group:'masoko',label:'📣 Masoko',icon:IC.send,items:[
      {id:'promo',icon:IC.gift,label:'Mawakala'},
      {id:'agent_targets',icon:IC.chart,label:'🎯 Targets & Performance'},
      {id:'agent_visits',icon:IC.file,label:'🎫 Tiketi za Ufuatiliaji'},
      {id:'referrals',icon:IC.gift,label:'Ofa Maalum'},
    ]},
    {group:'mawasiliano',label:'💬 Mawasiliano',icon:IC.send,items:[
      {id:'live_chat',icon:IC.send,label:'💬 Live Chat (Wateja)'},
      {id:'sms_center',icon:IC.send,label:'SMS Center'},
      {id:'broadcast',icon:IC.send,label:'Broadcast'},
      {id:'messaging',icon:IC.send,label:'Ujumbe'},
      {id:'templates',icon:IC.file,label:'Email Templates'},
      {id:'tickets',icon:IC.bell,label:'Tickets'},
    ]},
    {group:'ripoti',label:'📊 Ripoti & Uchambuzi',icon:IC.chart,items:[
      {id:'reports',icon:IC.file,label:'Ripoti'},
      {id:'usage',icon:IC.chart,label:'Usage'},
      {id:'activity',icon:IC.clock,label:'Activity'},
    ]},
    {group:'mfumo',label:'⚙️ Mfumo',icon:IC.gear,items:[
      {id:'security',icon:IC.shield,label:'Security'},
      {id:'backup',icon:IC.dl,label:'💾 Backup'},
      {id:'settings',icon:IC.gear,label:'Mipangilio'},
    ]},
  ],
  accountant:[
    {id:'dashboard',icon:IC.home,label:'Dashboard'},
    {id:'payments',icon:IC.dollar,label:'Malipo'},
    {id:'tokens',icon:IC.key,label:'🔑 Tokens'},
    {id:'budget',icon:IC.chart,label:'Bajeti'},
    {id:'expenses',icon:IC.file,label:'Matumizi'},
    {id:'payroll',icon:IC.people,label:'Payroll'},
    {id:'debts',icon:IC.warn,label:'Madeni'},
    {id:'revenue',icon:IC.dollar,label:'Chaneli'},
    {id:'customers',icon:IC.store,label:'Wateja'},
    {id:'reports',icon:IC.file,label:'Ripoti'},
    {id:'audit',icon:IC.shield,label:'Audit'},
    {id:'notifications',icon:IC.bell,label:'Arifa'},
  ],
  marketing:[
    {id:'dashboard',icon:IC.home,label:'Dashboard'},
    {id:'pipeline',icon:IC.store,label:'Wateja'},
    {id:'supervisors',icon:IC.users,label:'Mawakala'},
    {id:'campaigns',icon:IC.gift,label:'Kampeni'},
    {id:'followups',icon:IC.clock,label:'Follow-up'},
    {id:'messaging',icon:IC.send,label:'Ujumbe'},
    {id:'testimonials',icon:IC.star||IC.ok,label:'Maoni'},
    {id:'emailcamp',icon:IC.file,label:'Email'},
    {id:'reports',icon:IC.chart,label:'Ripoti'},
    {id:'demo',icon:IC.key,label:'Demo'},
    {id:'broadcast',icon:IC.bell,label:'Broadcast'},
    {id:'notifications',icon:IC.bell,label:'Arifa'},
  ],
  office:[
    {id:'dashboard',icon:IC.home,label:'Dashboard'},
    {id:'products',icon:IC.box,label:'Bidhaa'},
    {id:'analytics',icon:IC.chart,label:'📊 Uchambuzi'},
    {id:'sales',icon:IC.cart,label:'Mauzo'},
    {id:'returns',icon:IC.refresh,label:'Rudisha'},
    {id:'reports',icon:IC.chart,label:'Ripoti'},
    {id:'goals',icon:IC.chart,label:'Malengo'},
    {id:'invoices',icon:IC.file,label:'Ankara'},
    {id:'expenses',icon:IC.wallet,label:'Matumizi'},
    {id:'employees',icon:IC.users,label:'Wafanyakazi'},
    {id:'customers',icon:IC.people,label:'Wateja'},
    {id:'referral',icon:IC.gift,label:'🎁 Karibisha Rafiki'},
    {id:'support',icon:IC.send,label:'Msaada'},
    {id:'notifications',icon:IC.bell,label:'Arifa'},
  ],
  employee:[
    {id:'dashboard',icon:IC.home,label:'Dashboard'},
    {id:'sales',icon:IC.cart,label:'Mauzo'},
    {id:'emp_reports',icon:IC.chart,label:'📦 Bidhaa Zilizouzwa'},
    {id:'expenses',icon:IC.wallet,label:'Matumizi'},
    {id:'customers',icon:IC.people,label:'Wateja'},
    {id:'support',icon:IC.send,label:'Msaada'},
    {id:'notifications',icon:IC.bell,label:'Arifa'},
  ],
  supervisor:[
    {id:'dashboard',icon:IC.home,label:'Dashboard'},
    {id:'register',icon:IC.plus,label:'Sajili Mteja'},
    {id:'mycustomers',icon:IC.store,label:'Wateja Wangu'},
    {id:'visits',icon:IC.file,label:'📋 Ufuatiliaji'},
    {id:'tiers',icon:IC.chart,label:'Madaraja'},
    {id:'notifications',icon:IC.bell,label:'Arifa'},
  ],
};

function ReceiptModal({sale,bizName,footer,onClose}){
  if(!sale)return null;
  return <Modal open={!!sale} onClose={onClose} title="Risiti">
    <div style={{fontFamily:'monospace',fontSize:13,lineHeight:1.8}}>
      <div style={{textAlign:'center',borderBottom:'2px dashed #ccc',paddingBottom:12,marginBottom:12}}>
        <div style={{fontSize:18,fontWeight:700}}>{bizName||'Duka Langu'}</div>
        <div style={{fontSize:11,color:'#888'}}>Risiti #{sale.id?.slice(0,8).toUpperCase()}</div>
      </div>
      <div style={{fontSize:11,color:'#666',marginBottom:8}}>Tarehe: {fmtDate(sale.created_at)} | {sale.seller_name||'-'}</div>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead><tr style={{borderBottom:'1px solid #ddd'}}><th style={{textAlign:'left',padding:'4px 0'}}>Bidhaa</th><th style={{textAlign:'center'}}>Qty</th><th style={{textAlign:'right'}}>Jumla</th></tr></thead>
        <tbody>{sale.items?.map((i,k)=><tr key={k} style={{borderBottom:'1px dotted #eee'}}><td style={{padding:'4px 0'}}>{i.name}</td><td style={{textAlign:'center'}}>{i.qty}</td><td style={{textAlign:'right'}}>{(i.qty*i.price).toLocaleString()}</td></tr>)}</tbody>
      </table>
      {sale.discount>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#F59E0B',marginTop:8}}><span>Punguzo:</span><span>-TZS {sale.discount?.toLocaleString()}</span></div>}
      <div style={{borderTop:'2px dashed #ccc',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:16}}><span>JUMLA:</span><span>TZS {sale.total?.toLocaleString()}</span></div>
      <div style={{marginTop:4,fontSize:12,color:'#64748B'}}>Malipo: <Badge color="#3B82F6">{sale.payment_method}</Badge></div>
      {sale.customer_name&&<div style={{fontSize:12,color:'#64748B'}}>Mteja: {sale.customer_name}</div>}
      <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'#999'}}>{footer||'Asante kwa kununua! Karibu tena'}</div>
    </div>
    <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
      <Btn v="outline" onClick={()=>exportReceiptPDF(sale,bizName,footer)}>{IC.file} PDF</Btn>
      <Btn v="blue" onClick={()=>shareWhatsApp(sale,bizName)}>{IC.send} WhatsApp</Btn>
      <Btn v="ghost" onClick={()=>window.print()}>{IC.file} Print</Btn>
    </div>
  </Modal>;
}

export default function App(){
  const{user,login,signup,forgotPassword,biz,isExpired,daysLeft,logout,notifications,popups,setPopups,online,lang,setLang,currency,setCurrency,settings,getBranches,activeBranch,setActiveBranch,canUseBranches,isEmployeeLocked,pendingPayments,unreadMsgs,otpPending,otpSending,sendOTP,verifyOTP,cancelOTP,promoPending,verifyPromoLogin,cancelPromoLogin,pendingSyncCount,triggerSync,products,supabase,updateUserProfile,currentPlan,isPremium,isEnterprise,canUseFeature,PLANS}=useApp();
  React.useEffect(()=>{
    if(products?.length)saveStockSnapshot(products).catch(()=>{});
  },[products]);
  // Sikiliza sync complete event kutoka service worker / AppContext
  React.useEffect(()=>{
    const handler=(e)=>{
      const d=e.detail||{};
      if(d.synced>0){
        const msg=d.synced===1?'Uuzaji 1 umetumwa Supabase ✅':`Mauzo ${d.synced} yametumwa Supabase ✅`;
        setPopups(prev=>[...prev,{id:Date.now(),type:'success',msg,duration:4000}]);
      }
    };
    const swMsg=(e)=>{
      if(e.data?.type==='SYNC_COMPLETE'&&e.data.synced>0){
        const msg=`Mauzo ${e.data.synced} yaliyohifadhiwa offline yametumwa ✅`;
        setPopups(prev=>[...prev,{id:Date.now(),type:'success',msg,duration:5000}]);
      }
    };
    window.addEventListener('offline-sync-complete',handler);
    navigator.serviceWorker?.addEventListener('message',swMsg);
    return()=>{
      window.removeEventListener('offline-sync-complete',handler);
      navigator.serviceWorker?.removeEventListener('message',swMsg);
    };
  },[]);
  const[profileOpen,setProfileOpen]=useState(false);
  const[page,setPage]=useState(()=>{
    // Support PWA shortcuts via ?page=sales etc.
    const url=new URL(window.location.href);
    const initPage=url.searchParams.get('page');
    return initPage||'dashboard';
  });
  const[sidebar,setSidebar]=useState(false);
  const[openGroups,setOpenGroups]=useState({});
  const[receipt,setReceipt]=useState(null);
  
  // ALWAYS show landing page when not logged in (unless ?login=1 or ?signup=1 in URL)
  const[showLanding,setShowLanding]=useState(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.get('login')==='1')return false;
    if(url.searchParams.get('signup')==='1')return false;
    if(url.searchParams.get('demo')==='1')return false;
    if(url.pathname==='/login')return false;
    return true; // Show landing every time someone wants to enter the system
  });

  // Reset page to dashboard when user/role changes
  useEffect(()=>{if(user?.role)setPage('dashboard')},[user?.role]);

  // If user is logged in, skip landing
  if(user&&showLanding)setShowLanding(false);

  if(showLanding&&!user){
    return <LandingPage 
      onLogin={()=>setShowLanding(false)}
      onSignup={()=>{setShowLanding(false);window.history.pushState({},'','/?signup=1')}}
      onDemo={()=>{setShowLanding(false);window.history.pushState({},'','/?demo=1')}}
    />;
  }

  if(!user||otpPending||promoPending)return <AuthPage onLogin={login} onSignup={signup} onForgotPassword={forgotPassword} otpPending={otpPending} otpSending={otpSending} onVerifyOTP={verifyOTP} onCancelOTP={cancelOTP} onResendOTP={sendOTP} promoPending={promoPending} onVerifyPromo={verifyPromoLogin} onCancelPromo={cancelPromoLogin}/>;
  if(user.role!=='admin'&&user.role!=='marketing'&&user.role!=='supervisor'&&user.role!=='agent'&&user.role!=='accountant'&&biz&&isExpired())return <LockedPage/>;

  const role=user.role;
  const roleLabel={'admin':'Admin','marketing':'Marketing','supervisor':'Supervisor','agent':'Supervisor','office':'Ofisi','accountant':'Akaunti'}[role]||role;
  const roleColor={'admin':'#F59E0B','marketing':'#8B5CF6','supervisor':'#10B981','agent':'#10B981','office':'#3B82F6','accountant':'#EC4899'}[role]||'#94A3B8';
  // Add branches menu ONLY if canUseBranches
  const effectiveRole=(role==='agent')?'supervisor':role;
  let menu=[...MENUS[effectiveRole]||MENUS.employee];
  if(role==='office'&&canUseBranches){
    const branchItem={id:'branches',icon:IC.store,label:'Matawi'};
    if(!menu.find(m=>m.id==='branches')){menu.splice(1,0,branchItem)}
  }

  const unread=notifications.filter(n=>!n.is_read).length;
  const trial=biz&&!biz.token_active?daysLeft():null;
  const myBranches=getBranches();

  const renderPage=()=>{
    if(role==='admin'){
      switch(page){
        case'stores':return <StoresPage/>;case'payments':return <PaymentsPage/>;
        case'promo':return <PromoPage/>;
        case'agent_visits':return <SupervisorVisitsAdminPage/>;
        case'agent_targets':return <SupervisorTargetsPage/>;
        case'broadcast':return <BroadcastPage/>;
        case'sms_center':return <PlanGate feature='sms_center'><SMSCenterPage/></PlanGate>;
        case'live_chat':return <AdminChatPanel/>;
        case'security':return <SecurityPage/>;
        case'backup':return <BackupPage/>;
        case'settings':return <SettingsPage/>;
        case'tickets':return <TicketsPage/>;case'partners':return <PartnersPage/>;
        case'info_requests':return <InfoRequestsPage/>;
        case'referrals':return <ReferralManagementPage/>;
        case'activity':return <ActivityFeedPage/>;case'usage':return <SystemUsagePage/>;
        case'templates':return <EmailTemplatesPage/>;case'messaging':return <MessagingPage/>;
        case'reports':return <AdminReportsPage/>;
        default:return <AdminDashboard/>;
      }
    }
    if(role==='marketing'){
      switch(page){
        case'pipeline':return <PipelinePage/>;case'supervisors':return <MktAgentsPage/>;
        case'campaigns':return <CampaignPage/>;case'followups':return <FollowupPage/>;
        case'messaging':return <MessagingPage/>;case'testimonials':return <TestimonialsPage/>;
        case'emailcamp':return <EmailCampaignPage/>;case'demo':return <DemoPage/>;
        case'reports':return <MktReportsPage/>;case'broadcast':return <MktBroadcastPage/>;
        case'notifications':return <NotifsPage/>;
        default:return <MarketingDash/>;
      }
    }
    if(role==='accountant'){
      switch(page){
        case'payments':return <AccPaymentsPage/>;
        case'tokens':return <TokensPage/>;
        case'budget':return <AccBudgetPage/>;
        case'expenses':return <AccExpensesPage/>;
        case'payroll':return <AccPayrollPage/>;
        case'debts':return <AccDebtsPage/>;
        case'revenue':return <AccRevenuePage/>;
        case'customers':return <AccCustomersPage/>;
        case'reports':return <AccReportsPage/>;
        case'audit':return <AccAuditPage/>;
        case'notifications':return <NotifsPage/>;
        default:return <AccountantDashboard/>;
      }
    }
    if((role==='supervisor'||role==='agent')){
      switch(page){
        case'register':return <AgentRegisterPage/>;
        case'mycustomers':return <AgentCustomersPage/>;
        case'visits':return <SupervisorVisitsPage/>;
        case'tiers':return <AgentTiersPage/>;
        case'notifications':return <NotifsPage/>;
        default:return <AgentDashboard/>;
      }
    }
    switch(page){
      case'branches':return canUseBranches&&role==='office'?<BranchesPage/>:null;
      case'products':return role==='office'?<ProductsPage/>:null;
      case'sales':return <SalesPage onDone={setReceipt}/>;
      case'returns':return role==='office'?<ReturnsPage/>:null;
      case'reports':return role==='office'?<ReportsPage onReceipt={setReceipt}/>:null;
      case'emp_reports':return role==='employee'?<EmployeeReportsPage/>:null;
      case'goals':return <GoalsPage/>;
      case'invoices':return <InvoicePage/>;
      case'expenses':return <ExpensesPage/>;
      case'employees':return role==='office'?<EmployeesPage/>:null;
      case'customers':return <CustomersPage/>;
      case'analytics':return <ProductAnalyticsPage/>;
      case'referral':return <ReferralPage/>;
      case'support':return <SupportPage/>;
      case'notifications':return <NotifsPage/>;
      default:return <OfficeDash onReceipt={setReceipt}/>;
    }
  };

  return <div style={{display:'flex',minHeight:'100vh',background:'#F1F5F9',fontFamily:"'Inter',system-ui,sans-serif"}}>
    <NotifPopup items={popups} onDismiss={id=>setPopups(p=>p.filter(n=>n.id!==id))} onClear={()=>setPopups([])}/>
    <ReceiptModal sale={receipt} bizName={biz?.name} footer={biz?.receipt_footer} onClose={()=>setReceipt(null)}/>
    <PWAInstallPrompt/>
    <OnlineStatusBar/>
    <HelpChatWidget/>
    {sidebar&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:5000}} onClick={()=>setSidebar(false)}/>}

    {/* Sidebar */}
    <div className={`sidebar ${sidebar?'open':''}`} style={{width:240,background:'linear-gradient(180deg,#0B7A3B 0%,#065F2E 100%)',color:'#fff',display:'flex',flexDirection:'column',position:'fixed',left:0,top:0,bottom:0,zIndex:5001,transition:'transform .3s'}}>
      <div style={{padding:'16px 14px',borderBottom:'1px solid rgba(255,255,255,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <img src="/logo-white.png" alt="Logo" style={{width:36,height:36,objectFit:'contain'}}/>
          <div><div style={{fontSize:15,fontWeight:800}}>Duka Langu</div><div style={{fontSize:9,opacity:.7}}>Together for the better</div></div>
        </div>
        <div style={{marginTop:6}}><OnlineStatus isOnline={online}/></div>
      </div>

      {/* Branch selector in sidebar */}
      {role==='office'&&canUseBranches&&myBranches.length>0&&<div style={{padding:'6px 10px',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <select value={activeBranch||''} onChange={e=>setActiveBranch(e.target.value||null)} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'none',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,outline:'none'}}>
          <option value="">Matawi Yote</option>
          {myBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>}
      {/* Employee: show locked branch name */}
      {role==='employee'&&isEmployeeLocked&&<div style={{padding:'6px 10px',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{background:'rgba(255,255,255,.15)',borderRadius:6,padding:'5px 8px',fontSize:11,color:'#BBF7D0',textAlign:'center'}}>
          🏪 {myBranches.find(b=>b.id===user.branch_id)?.name||'Tawi Lako'}
        </div>
      </div>}

      <div style={{padding:6,flex:1,overflowY:'auto'}}>
        {menu.map((m,idx)=>{
          // GROUP item with sub-items
          if(m.group){
            const isOpen=openGroups[m.group];
            // Auto-open if current page is in this group
            const containsCurrent=m.items?.some(it=>it.id===page);
            const groupOpen=isOpen||containsCurrent;
            // Count badges in this group
            const grpUnread=m.items?.some(it=>(it.id==='notifications'&&unread>0)||(it.id==='payments'&&pendingPayments?.length>0)||(it.id==='messaging'&&unreadMsgs>0));
            
            return <div key={m.group} style={{marginBottom:4}}>
              <button onClick={()=>setOpenGroups(p=>({...p,[m.group]:!groupOpen}))} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 12px',background:groupOpen?'rgba(255,255,255,.1)':'transparent',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,letterSpacing:0.3,cursor:'pointer',transition:'all 0.2s'}}>
                <span style={{flex:1,textAlign:'left'}}>{m.label}</span>
                {grpUnread&&!groupOpen&&<span style={{width:6,height:6,borderRadius:'50%',background:'#EF4444'}}/>}
                <span style={{fontSize:11,opacity:0.7,transition:'transform 0.25s',transform:groupOpen?'rotate(90deg)':'rotate(0deg)',display:'inline-block'}}>▶</span>
              </button>
              {groupOpen&&<div style={{marginLeft:8,paddingLeft:10,borderLeft:'1.5px solid rgba(255,255,255,.15)',marginTop:2,marginBottom:6}}>
                {m.items.map(item=><button key={item.id} onClick={()=>{setPage(item.id);setSidebar(false)}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 12px',background:page===item.id?'rgba(255,255,255,.22)':'transparent',border:'none',borderRadius:8,color:'#fff',fontSize:12.5,fontWeight:page===item.id?700:500,marginBottom:2,cursor:'pointer',transition:'background 0.15s',textAlign:'left'}}>
                  {item.icon}<span style={{flex:1,textAlign:'left'}}>{item.label}</span>
                  {item.id==='notifications'&&unread>0&&<span style={{background:'#EF4444',fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:700}}>{unread}</span>}
                  {item.id==='payments'&&pendingPayments?.length>0&&<span style={{background:'#EF4444',fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:700,animation:'pulse 2s infinite'}}>{pendingPayments.length}</span>}
                  {item.id==='messaging'&&unreadMsgs>0&&<span style={{background:'#3B82F6',fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:700}}>{unreadMsgs}</span>}
                </button>)}
              </div>}
            </div>;
          }
          
          // SINGLE item (no group)
          return <button key={m.id} onClick={()=>{setPage(m.id);setSidebar(false)}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 12px',background:page===m.id?'rgba(255,255,255,.2)':'transparent',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:page===m.id?700:500,marginBottom:2,cursor:'pointer',textAlign:'left'}}>
            {m.icon}<span style={{flex:1,textAlign:'left'}}>{m.label}</span>
            {m.id==='notifications'&&unread>0&&<span style={{background:'#EF4444',fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:700}}>{unread}</span>}
            {m.id==='payments'&&pendingPayments?.length>0&&<span style={{background:'#EF4444',fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:700,animation:'pulse 2s infinite'}}>{pendingPayments.length}</span>}
            {m.id==='messaging'&&unreadMsgs>0&&<span style={{background:'#3B82F6',fontSize:10,padding:'1px 6px',borderRadius:8,fontWeight:700}}>{unreadMsgs}</span>}
          </button>;
        })}
      </div>

      <div style={{padding:'10px 10px 14px',borderTop:'1px solid rgba(255,255,255,.15)'}}>
        {trial!==null&&trial<=10&&<div style={{background:'rgba(255,255,255,.15)',borderRadius:8,padding:'5px 10px',fontSize:11,marginBottom:8,textAlign:'center'}}>⏳ Siku {trial} zimebaki</div>}
        {/* Profile Card */}
        <button onClick={()=>setProfileOpen(true)} style={{width:'100%',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:'10px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,marginBottom:8,transition:'background 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'}>
          {user.avatar_url
            ?<img src={user.avatar_url} alt="" style={{width:38,height:38,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(255,255,255,.3)',flexShrink:0}}/>
            :<div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#10B981,#065F2E)',border:'2px solid rgba(255,255,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'#fff',flexShrink:0}}>{(user.name||'U')[0].toUpperCase()}</div>
          }
          <div style={{flex:1,textAlign:'left',overflow:'hidden'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.name}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
              <span style={{background:roleColor,color:'#fff',fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:6,textTransform:'uppercase',letterSpacing:.5}}>{roleLabel}</span>{role==='office'&&<span style={{background:currentPlan?.color||'#3B82F6',color:'#fff',fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:6,textTransform:'uppercase',letterSpacing:.5}}>{currentPlan?.name||'BASIC'}</span>}
            </div>
          </div>
          <span style={{color:'rgba(255,255,255,.5)',fontSize:12}}>✏️</span>
        </button>
        {/* Lang + Currency */}
        <div style={{display:'flex',gap:4,marginBottom:8}}>
          <button onClick={()=>setLang(lang==='sw'?'en':'sw')} style={{flex:1,padding:'4px 6px',borderRadius:6,border:'none',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:10,fontWeight:600,cursor:'pointer'}}>{lang==='sw'?'EN':'SW'}</button>
          <button onClick={()=>setCurrency(currency==='TZS'?'USD':'TZS')} style={{flex:1,padding:'4px 6px',borderRadius:6,border:'none',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:10,fontWeight:600,cursor:'pointer'}}>{currency==='TZS'?'USD':'TZS'}</button>
        </div>
        <button onClick={()=>{logout();setPage('dashboard');setSidebar(false)}} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'8px 12px',background:'rgba(239,68,68,.2)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,color:'#FCA5A5',fontSize:12,fontWeight:600,cursor:'pointer'}}>{IC.out} Toka</button>
      </div>
    </div>

    {/* ===== PROFILE SETTINGS MODAL ===== */}
    {profileOpen&&<ProfileModal user={user} supabase={supabase} updateUserProfile={updateUserProfile} onClose={()=>setProfileOpen(false)}/>}
    {/* Main */}
    <div className="main-content" style={{flex:1,marginLeft:240,minHeight:'100vh'}}>
      <div style={{background:'#fff',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 1px 3px rgba(0,0,0,.05)',position:'sticky',top:0,zIndex:4000}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="mobile-btn" onClick={()=>setSidebar(true)} style={{background:'none',border:'none',color:'#1E293B',padding:4}}>{IC.menu}</button>
          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:'#1E293B'}}>{menu.find(m=>m.id===page)?.label||'Dashboard'}</h2>
          {activeBranch&&role==='office'&&<Badge color="#0B7A3B">{myBranches.find(b=>b.id===activeBranch)?.name}</Badge>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {!online&&<Badge color="#F59E0B">📡 Offline</Badge>}
          {pendingSyncCount>0&&typeof triggerSync==='function'&&<button onClick={()=>triggerSync?.()} title="Bonyeza kusync mauzo" style={{background:'#FEF3C7',border:'1.5px solid #F59E0B',color:'#92400E',padding:'3px 8px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
            ⏳ {pendingSyncCount} pending
          </button>}
          {role!=='admin'&&<button onClick={()=>setPage('notifications')} style={{position:'relative',background:'none',border:'none',color:'#64748B',padding:4}}>
            {IC.bell}{unread>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#EF4444',color:'#fff',fontSize:10,fontWeight:700,borderRadius:10,minWidth:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{unread}</span>}
          </button>}
          <div style={{width:32,height:32,borderRadius:'50%',background:'#0B7A3B',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{user.name?.[0]?.toUpperCase()}</div>
        </div>
      </div>
      <div style={{padding:'16px 20px',maxWidth:1200,margin:'0 auto'}}>{renderPage()}</div>
    </div>
  </div>;
}

// ============================================================
// PROFILE MODAL — Kisasa kabisa
// ============================================================
function ProfileModal({user, updateUserProfile, onClose}){
  const [form, setForm] = React.useState({name: user?.name||'', phone: user?.phone||''});
  const [preview, setPreview] = React.useState(user?.avatar_url||null);
  const [avatarFile, setAvatarFile] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const fileRef = React.useRef();

  const roleLabel = {'admin':'Admin','marketing':'Marketing','supervisor':'Supervisor','agent':'Supervisor','office':'Ofisi','accountant':'Akaunti'}[user?.role]||user?.role;
  const initials = (user?.name||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if(!f) return;
    if(f.size > 3*1024*1024){setMsg('❌ Picha kubwa sana (max 3MB)');return;}
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async() => {
    if(!form.name.trim()){setMsg('❌ Jina linahitajika');return;}
    setSaving(true); setMsg('');
    const result = await updateUserProfile({name:form.name.trim(), phone:form.phone.trim(), avatarFile});
    setSaving(false);
    if(result.success){setMsg('✅ Imehifadhiwa!');setTimeout(()=>onClose(),1200);}
    else setMsg('❌ '+(result.error||'Tatizo. Jaribu tena'));
  };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:420,overflow:'hidden',boxShadow:'0 25px 60px rgba(0,0,0,.25)'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#0B7A3B,#065F2E)',padding:'24px 20px 60px',textAlign:'center',position:'relative'}}>
          <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,.15)',border:'none',color:'#fff',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          <h3 style={{color:'#fff',margin:'0 0 4px',fontSize:18,fontWeight:800}}>Wasifu Wangu</h3>
          <p style={{color:'rgba(255,255,255,.7)',margin:0,fontSize:12}}>Bonyeza picha kubadilisha</p>
        </div>
        {/* Avatar — overlaps header */}
        <div style={{display:'flex',justifyContent:'center',marginTop:-46,marginBottom:12,position:'relative',zIndex:1}}>
          <div style={{position:'relative',cursor:'pointer'}} onClick={()=>fileRef.current?.click()}>
            {preview
              ?<img src={preview} alt="" style={{width:90,height:90,borderRadius:'50%',objectFit:'cover',border:'4px solid #fff',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}/>
              :<div style={{width:90,height:90,borderRadius:'50%',background:'linear-gradient(135deg,#10B981,#065F2E)',border:'4px solid #fff',boxShadow:'0 4px 20px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800,color:'#fff'}}>{initials}</div>
            }
            <div style={{position:'absolute',bottom:2,right:2,background:'#0B7A3B',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',fontSize:12}}>📷</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{display:'none'}}/>
        </div>
        {/* Badge */}
        <div style={{textAlign:'center',marginBottom:20}}>
          <span style={{background:'#DCFCE7',color:'#15803D',fontSize:11,fontWeight:700,padding:'3px 12px',borderRadius:20,border:'1px solid #BBF7D0'}}>{roleLabel}</span>
          <div style={{fontSize:11,color:'#94A3B8',marginTop:6}}>{user?.email}</div>
        </div>
        {/* Form */}
        <div style={{padding:'0 20px 20px'}}>
          {msg&&<div style={{background:msg.startsWith('✅')?'#F0FDF4':'#FEF2F2',color:msg.startsWith('✅')?'#15803D':'#B91C1C',padding:'8px 12px',borderRadius:10,fontSize:13,marginBottom:12,textAlign:'center',fontWeight:600}}>{msg}</div>}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>👤 JINA KAMILI</label>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Jina lako kamili" style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E2E8F0',borderRadius:10,fontSize:14,boxSizing:'border-box',outline:'none'}} onFocus={e=>e.target.style.borderColor='#0B7A3B'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>📱 NAMBARI YA SIMU</label>
            <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="0712 345 678" type="tel" style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E2E8F0',borderRadius:10,fontSize:14,boxSizing:'border-box',outline:'none'}} onFocus={e=>e.target.style.borderColor='#0B7A3B'} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
          </div>
          <button onClick={save} disabled={saving} style={{width:'100%',padding:14,background:saving?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:15,cursor:saving?'not-allowed':'pointer',boxShadow:'0 4px 16px rgba(11,122,59,.3)'}}>
            {saving?'⏳ Inahifadhi...':'💾 Hifadhi Mabadiliko'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UPGRADE PROMPT — Inaonyeshwa wakati Basic user anataka Premium feature
// ============================================================
export function PlanGate({feature, children, fallback}){
  const{canUseFeature, currentPlan, PLANS}=useApp();
  if(canUseFeature(feature)) return children;
  if(fallback) return fallback;
  const needed = feature==='ai_insights'||feature==='sms_center'||feature==='unlimited_employees'||feature==='export' ? 'premium' : 'enterprise';
  const plan = PLANS[needed];
  return (
    <div style={{background:'linear-gradient(135deg,#F8FAFC,#EFF6FF)',border:'2px dashed #BFDBFE',borderRadius:16,padding:32,textAlign:'center',maxWidth:480,margin:'40px auto'}}>
      <div style={{fontSize:48,marginBottom:12}}>{plan?.icon||'🔒'}</div>
      <h3 style={{fontSize:20,fontWeight:900,color:'#1E293B',margin:'0 0 8px'}}>Inahitaji {plan?.name} au zaidi</h3>
      <p style={{fontSize:14,color:'#64748B',margin:'0 0 20px',lineHeight:1.6}}>
        Kipengele hiki kinahitaji kifurushi cha <strong>{plan?.name}</strong> (TSH {(plan?.price||0).toLocaleString()}/mwezi).<br/>
        Pia unapata: {plan?.features?.slice(1,4).join(', ')}.
      </p>
      <div style={{background:'#fff',borderRadius:12,padding:'12px 16px',marginBottom:20,border:'1px solid #E2E8F0',textAlign:'left'}}>
        <div style={{fontSize:11,fontWeight:700,color:'#64748B',marginBottom:8}}>KIFURUSHI CHAKO SASA: {currentPlan?.name?.toUpperCase()}</div>
        {plan?.features?.map((f,i)=><div key={i} style={{fontSize:12,color:'#374151',padding:'3px 0',display:'flex',alignItems:'center',gap:6}}><span style={{color:'#0B7A3B'}}>✓</span>{f}</div>)}
      </div>
      <button onClick={()=>alert('Wasiliana nasi kuboresha:\n📞 +255 628 986 770 (WhatsApp)\n📧 dukalangusalesmanagement@gmail.com')}
        style={{background:`linear-gradient(135deg,${plan?.color||'#8B5CF6'},${plan?.color||'#8B5CF6'}cc)`,color:'#fff',border:'none',borderRadius:12,padding:'12px 28px',fontWeight:800,fontSize:14,cursor:'pointer',boxShadow:`0 4px 20px ${plan?.color||'#8B5CF6'}44`}}>
        ⬆️ Boresha hadi {plan?.name} — TSH {(plan?.price||0).toLocaleString()}/mwezi
      </button>
    </div>
  );
}
