import React,{useState,useMemo,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {fmtMoney,isToday,isThisWeek,isThisMonth} from '../../utils/helpers';

// ============================================================
// DASHBOARD WIDGETS — Enterprise Grade
// Widget 1: Subscription Status
// Widget 2: Smart Notification Center
// Widget 3: Business Health Card
// ============================================================

// ===== Reusable: Animated Progress Bar =====
function ProgressBar({percent,color,height=10}){
  const [w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(percent),100);return()=>clearTimeout(t)},[percent]);
  return(
    <div style={{height,background:'#F1F5F9',borderRadius:height/2,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${w}%`,background:color,borderRadius:height/2,transition:'width 1s cubic-bezier(.4,0,.2,1)'}}/>
    </div>
  );
}

// ===== Reusable: Animated Circle =====
function ProgressCircle({percent,color,size=90,label,value}){
  const [p,setP]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setP(percent),150);return()=>clearTimeout(t)},[percent]);
  const r=(size-12)/2, circ=2*Math.PI*r, offset=circ-(p/100)*circ;
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
      <div style={{position:'relative',width:size,height:size}}>
        <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={8}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{transition:'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
          <span style={{fontSize:size>70?18:14,fontWeight:900,color}}>{value}</span>
        </div>
      </div>
      {label&&<span style={{fontSize:11,color:'#64748B',fontWeight:600,textAlign:'center'}}>{label}</span>}
    </div>
  );
}

// ===== Skeleton loader =====
function Skeleton({height=100}){
  return <div style={{height,background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite',borderRadius:16}}/>;
}

// ============================================================
// WIDGET 1: SUBSCRIPTION STATUS
// ============================================================
export function SubscriptionWidget(){
  const{biz,daysLeft,currentPlan,settings}=useApp();
  const days=typeof daysLeft==='function'?daysLeft():daysLeft;
  const planName=biz?.plan?biz.plan.charAt(0).toUpperCase()+biz.plan.slice(1):'Basic';
  const expiry=biz?.token_active?biz?.token_expiry:biz?.trial_end;
  const expiryStr=expiry?new Date(expiry).toLocaleDateString('sw',{day:'numeric',month:'short',year:'numeric'}):'—';
  const isTrial=!biz?.token_active;

  // Color rules
  let color,bg,status,statusBg;
  if(days<=0){color='#7F1D1D';bg='#FEE2E2';status='Imeisha';statusBg='#7F1D1D';}
  else if(days<=6){color='#DC2626';bg='#FEF2F2';status='Inaisha Karibuni';statusBg='#DC2626';}
  else if(days<=14){color='#EA580C';bg='#FFF7ED';status='Angalizo';statusBg='#EA580C';}
  else{color='#0B7A3B';bg='#F0FDF4';status='Hai';statusBg='#22C55E';}

  const maxDays=isTrial?5:30;
  const percent=Math.min(100,(days/maxDays)*100);

  return(
    <div style={{background:'#fff',borderRadius:20,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid #F1F5F9',position:'relative',overflow:'hidden'}}>
      {/* Glassmorphism accent */}
      <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:`${color}12`,filter:'blur(20px)'}}/>
      <div style={{position:'relative'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <div style={{fontSize:12,color:'#94A3B8',fontWeight:600,marginBottom:2}}>USAJILI WAKO</div>
            <div style={{fontSize:20,fontWeight:900,color:'#1E293B'}}>{isTrial?'Majaribio':planName}</div>
          </div>
          <span style={{background:statusBg,color:'#fff',padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:800}}>{status}</span>
        </div>

        <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12}}>
          <span style={{fontSize:38,fontWeight:900,color}}>{days}</span>
          <span style={{fontSize:14,color:'#64748B',fontWeight:600}}>siku zimebaki</span>
        </div>

        <ProgressBar percent={percent} color={color} height={10}/>

        <div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:12,color:'#64748B'}}>
          <span>Inaisha:</span>
          <span style={{fontWeight:700,color:'#1E293B'}}>{expiryStr}</span>
        </div>

        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={()=>window.dispatchEvent(new CustomEvent('navigate-page',{detail:'tokens'}))} style={{flex:1,padding:'11px',background:`linear-gradient(135deg,${color},${color}dd)`,color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:13,cursor:'pointer'}}>
            🔄 Ongeza Muda
          </button>
          <button onClick={()=>window.dispatchEvent(new CustomEvent('navigate-page',{detail:'support'}))} style={{flex:1,padding:'11px',background:'#F1F5F9',color:'#475569',border:'none',borderRadius:12,fontWeight:700,fontSize:13,cursor:'pointer'}}>
            💬 Msaada
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WIDGET 2: SMART NOTIFICATION CENTER
// ============================================================
export function NotificationWidget(){
  const{products,customers=[],sales,daysLeft,lowStockProducts=[],overdueCustomers=[]}=useApp();
  const days=typeof daysLeft==='function'?daysLeft():daysLeft;
  const [read,setRead]=useState({});

  // Jenga notifications kutoka data halisi
  const notifs=useMemo(()=>{
    const list=[];
    if(days<=7&&days>0)list.push({id:'sub',icon:'🔔',text:`Usajili unaisha siku ${days}`,color:'#EA580C'});
    if(lowStockProducts.length>0)list.push({id:'stock',icon:'📦',text:`Bidhaa ${lowStockProducts.length} zimekaribia kuisha`,color:'#DC2626'});
    if(overdueCustomers.length>0)list.push({id:'debt',icon:'💰',text:`Wateja ${overdueCustomers.length} wana madeni yaliyochelewa`,color:'#DC2626'});
    // Wateja wapya wiki hii
    const newCust=customers.filter(c=>c.created_at&&isThisWeek(c.created_at)).length;
    if(newCust>0)list.push({id:'newcust',icon:'👥',text:`Wateja wapya ${newCust} wiki hii`,color:'#0B7A3B'});
    // Ukuaji wa mauzo
    const tSales=sales.filter(s=>isToday(s.created_at)).reduce((a,s)=>a+(s.total||0),0);
    const ySales=sales.filter(s=>{const d=new Date();d.setDate(d.getDate()-1);return s.created_at?.startsWith(d.toISOString().slice(0,10))}).reduce((a,s)=>a+(s.total||0),0);
    if(ySales>0&&tSales>ySales){const pct=Math.round(((tSales-ySales)/ySales)*100);list.push({id:'growth',icon:'📈',text:`Mauzo yameongezeka ${pct}% leo`,color:'#0B7A3B'});}
    return list;
  },[days,lowStockProducts,overdueCustomers,customers,sales]);

  const unread=notifs.filter(n=>!read[n.id]).length;
  const markRead=(id)=>setRead(p=>({...p,[id]:true}));
  const markAll=()=>{const all={};notifs.forEach(n=>all[n.id]=true);setRead(all);};

  return(
    <div style={{background:'#fff',borderRadius:20,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid #F1F5F9'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{position:'relative'}}>
            <span style={{fontSize:20}}>🔔</span>
            {unread>0&&<span style={{position:'absolute',top:-6,right:-8,background:'#EF4444',color:'#fff',fontSize:10,fontWeight:800,minWidth:16,height:16,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{unread}</span>}
          </div>
          <span style={{fontSize:16,fontWeight:900,color:'#1E293B'}}>Arifa</span>
        </div>
        {unread>0&&<button onClick={markAll} style={{background:'none',border:'none',color:'#0B7A3B',fontSize:12,fontWeight:700,cursor:'pointer'}}>Soma Zote</button>}
      </div>

      {!notifs.length?(
        <div style={{textAlign:'center',padding:'24px 0',color:'#94A3B8'}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          <div style={{fontSize:13}}>Hakuna arifa mpya</div>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto'}}>
          {notifs.map(n=>(
            <div key={n.id} onClick={()=>markRead(n.id)} style={{
              display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,cursor:'pointer',
              background:read[n.id]?'#FAFBFC':`${n.color}0A`,
              border:`1px solid ${read[n.id]?'#F1F5F9':n.color+'22'}`,
              opacity:read[n.id]?0.6:1,transition:'all 0.2s',
            }}>
              <span style={{fontSize:20}}>{n.icon}</span>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:'#334155'}}>{n.text}</span>
              {!read[n.id]&&<span style={{width:8,height:8,borderRadius:'50%',background:n.color}}/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// WIDGET 3: BUSINESS HEALTH CARD
// ============================================================
export function BusinessHealthWidget(){
  const{sales,expenses,products,customers=[],employees=[],totalDebt=0,lowStockProducts=[],currency}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');

  const stats=useMemo(()=>{
    const tSales=sales.filter(s=>isToday(s.created_at));
    const wSales=sales.filter(s=>isThisWeek(s.created_at));
    const mSales=sales.filter(s=>isThisMonth(s.created_at));
    const mExp=expenses.filter(e=>isThisMonth(e.created_at));
    const todayTotal=tSales.reduce((a,s)=>a+(s.total||0),0);
    const weekTotal=wSales.reduce((a,s)=>a+(s.total||0),0);
    const monthTotal=mSales.reduce((a,s)=>a+(s.total||0),0);
    const monthProfit=mSales.reduce((a,s)=>a+(s.profit||0),0);
    const monthExp=mExp.reduce((a,e)=>a+(e.amount||0),0);
    const newCust=customers.filter(c=>c.created_at&&isThisWeek(c.created_at)).length;
    const activeEmp=employees.filter(e=>e.is_active!==false).length;

    // Business Score (0-100) - uzani wa vipengele
    let score=50;
    if(monthTotal>0)score+=15;
    if(monthProfit>0)score+=15;
    if(monthProfit>monthExp)score+=10;
    if(lowStockProducts.length===0)score+=5;
    if(totalDebt<monthTotal*0.3)score+=5;
    if(tSales.length>0)score+=5;
    score=Math.min(100,Math.max(0,score));

    return{todayTotal,weekTotal,monthTotal,monthProfit,monthExp,newCust,activeEmp,score,productCount:products.length};
  },[sales,expenses,products,customers,employees,totalDebt,lowStockProducts]);

  // Score color
  let scoreColor;
  if(stats.score>=90)scoreColor='#0B7A3B';
  else if(stats.score>=70)scoreColor='#EA580C';
  else scoreColor='#DC2626';

  const items=[
    {label:'Mauzo Leo',value:fm(stats.todayTotal),icon:'💵',color:'#0B7A3B'},
    {label:'Mauzo Wiki',value:fm(stats.weekTotal),icon:'📊',color:'#3B82F6'},
    {label:'Mauzo Mwezi',value:fm(stats.monthTotal),icon:'📈',color:'#8B5CF6'},
    {label:'Faida Mwezi',value:fm(stats.monthProfit),icon:'💰',color:'#0B7A3B'},
    {label:'Matumizi',value:fm(stats.monthExp),icon:'🧾',color:'#EF4444'},
    {label:'Madeni',value:fm(totalDebt),icon:'📋',color:'#EA580C'},
    {label:'Stock Ndogo',value:lowStockProducts.length,icon:'⚠️',color:'#DC2626'},
    {label:'Wateja Wapya',value:stats.newCust,icon:'👥',color:'#14B8A6'},
    {label:'Wafanyakazi',value:stats.activeEmp,icon:'👤',color:'#6366F1'},
  ];

  return(
    <div style={{background:'#fff',borderRadius:20,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid #F1F5F9'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:'#1E293B'}}>Afya ya Biashara</div>
          <div style={{fontSize:12,color:'#94A3B8'}}>Muhtasari wa utendaji wako</div>
        </div>
        <ProgressCircle percent={stats.score} color={scoreColor} size={80} value={`${stats.score}%`} label="Alama"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
        {items.map((it,i)=>(
          <div key={i} style={{background:`${it.color}08`,border:`1px solid ${it.color}18`,borderRadius:14,padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <span style={{fontSize:14}}>{it.icon}</span>
              <span style={{fontSize:10,color:'#64748B',fontWeight:600}}>{it.label}</span>
            </div>
            <div style={{fontSize:16,fontWeight:900,color:it.color}}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Wrapper: widgets zote tatu pamoja =====
export function DashboardWidgets(){
  return(
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16,marginBottom:20}}>
        <SubscriptionWidget/>
        <NotificationWidget/>
      </div>
      <div style={{marginBottom:20}}>
        <BusinessHealthWidget/>
      </div>
    </>
  );
}
