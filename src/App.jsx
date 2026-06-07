import React,{useState,useEffect} from 'react';
import {useApp} from './context/AppContext';
import {IC,Modal,NotifPopup,Btn,Badge,OnlineStatus,Sel} from './components/UI';
import {PWAInstallPrompt,OnlineStatusBar} from './components/PWA';
import {HelpChatWidget,AdminChatPanel} from './components/LiveChat';
import {exportReceiptPDF,shareWhatsApp,fmtDate,fmtMoney} from './utils/helpers';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import LockedPage from './pages/LockedPage';
import {AdminDashboard,StoresPage,TokensPage,PromoPage,SettingsPage,BroadcastPage,SecurityPage,BackupPage,TicketsPage,PaymentsPage,PartnersPage,ActivityFeedPage,SystemUsagePage,EmailTemplatesPage,AdminReportsPage,InfoRequestsPage,ReferralManagementPage} from './pages/admin/AdminPages';
import InfoUpdateRequest from './pages/InfoUpdateRequest';
import {SMSCenterPage} from './pages/admin/SMSCenter';
import {OfficeDash,SalesPage,ProductsPage,ReportsPage,ExpensesPage,EmployeesPage,CustomersPage,NotifsPage,BranchesPage,ReturnsPage,SupportPage,GoalsPage,InvoicePage,ReferralPage,ProductAnalyticsPage,EmployeeReportsPage} from './pages/office/OfficePages';
import {MarketingDash,MktAgentsPage,PipelinePage,MktReportsPage,MktBroadcastPage,CampaignPage,FollowupPage,TestimonialsPage,MessagingPage,EmailCampaignPage,DemoPage,MktTokensPage} from './pages/marketing/MarketingPages';
import {AgentDashboard,AgentRegisterPage,AgentCustomersPage,AgentTiersPage} from './pages/agent/AgentPages';
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
      {id:'partners',icon:IC.people,label:'Washirika'},
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
    {id:'agents',icon:IC.users,label:'Mawakala'},
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
  agent:[
    {id:'dashboard',icon:IC.home,label:'Dashboard'},
    {id:'register',icon:IC.plus,label:'Sajili Mteja'},
    {id:'mycustomers',icon:IC.store,label:'Wateja Wangu'},
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
  const{user,login,signup,forgotPassword,biz,isExpired,daysLeft,logout,notifications,popups,setPopups,online,lang,setLang,currency,setCurrency,settings,getBranches,activeBranch,setActiveBranch,canUseBranches,isEmployeeLocked,pendingPayments,unreadMsgs,otpPending,otpSending,sendOTP,verifyOTP,cancelOTP}=useApp();
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

  if(!user||otpPending)return <AuthPage onLogin={login} onSignup={signup} onForgotPassword={forgotPassword} otpPending={otpPending} otpSending={otpSending} onVerifyOTP={verifyOTP} onCancelOTP={cancelOTP} onResendOTP={sendOTP}/>;
  if(user.role!=='admin'&&user.role!=='marketing'&&user.role!=='agent'&&user.role!=='accountant'&&biz&&isExpired())return <LockedPage/>;

  const role=user.role;
  // Add branches menu ONLY if canUseBranches
  let menu=[...MENUS[role]||MENUS.employee];
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
        case'promo':return <PromoPage/>;case'broadcast':return <BroadcastPage/>;
        case'sms_center':return <SMSCenterPage/>;
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
        case'pipeline':return <PipelinePage/>;case'agents':return <MktAgentsPage/>;
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
    if(role==='agent'){
      switch(page){
        case'register':return <AgentRegisterPage/>;
        case'mycustomers':return <AgentCustomersPage/>;
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

      <div style={{padding:10,borderTop:'1px solid rgba(255,255,255,.15)'}}>
        <div style={{fontSize:12,opacity:.7}}>{user.name}</div>
        <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginBottom:6}}>{role}</div>
        {trial!==null&&trial<=10&&<div style={{background:'rgba(255,255,255,.15)',borderRadius:8,padding:'5px 10px',fontSize:11,marginBottom:6}}>⏳ Siku {trial}</div>}
        <div style={{display:'flex',gap:4,marginBottom:6}}>
          <button onClick={()=>setLang(lang==='sw'?'en':'sw')} style={{flex:1,padding:'3px 6px',borderRadius:6,border:'none',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:10,fontWeight:600,cursor:'pointer'}}>{lang==='sw'?'EN':'SW'}</button>
          <button onClick={()=>setCurrency(currency==='TZS'?'USD':'TZS')} style={{flex:1,padding:'3px 6px',borderRadius:6,border:'none',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:10,fontWeight:600,cursor:'pointer'}}>{currency==='TZS'?'USD':'TZS'}</button>
        </div>
        <button onClick={()=>{logout();setPage('dashboard');setSidebar(false)}} style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'7px 12px',background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,color:'#fff',fontSize:12}}>{IC.out} Toka</button>
      </div>
    </div>

    {/* Main */}
    <div className="main-content" style={{flex:1,marginLeft:240,minHeight:'100vh'}}>
      <div style={{background:'#fff',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 1px 3px rgba(0,0,0,.05)',position:'sticky',top:0,zIndex:4000}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="mobile-btn" onClick={()=>setSidebar(true)} style={{background:'none',border:'none',color:'#1E293B',padding:4}}>{IC.menu}</button>
          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:'#1E293B'}}>{menu.find(m=>m.id===page)?.label||'Dashboard'}</h2>
          {activeBranch&&role==='office'&&<Badge color="#0B7A3B">{myBranches.find(b=>b.id===activeBranch)?.name}</Badge>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {!online&&<Badge color="#F59E0B">Offline</Badge>}
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
