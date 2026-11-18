import React,{useState,useMemo} from 'react';
import DebtReminder from '../../components/DebtReminder';
import PhoneNameInput from '../../components/PhoneNameInput';
import {PageHead,GBtn,SumCard} from '../../components/Page';
import {buildCostMap,unitCost,itemProfit,itemRevenue,returnProfit as retProfit,netProfit as calcNetProfit,margin} from '../../utils/money';
import {getPlan} from '../../config/plans';
import {useApp} from '../../context/AppContext';
import {IC,Input,Sel,Btn,Stat,Modal,Badge,Tabs,Empty,EMOJIS,Area} from '../../components/UI';
import {fmtMoney,fmtDate,isToday,isThisWeek,isThisMonth,exportToPDF,exportToCSV,exportReceiptPDF,exportStatementPDF,shareWhatsApp,todayStr,payLabel,computePeriodFinance,localDateStr,inDateRange,dateRangeList} from '../../utils/helpers';
import {playSaleSuccess,playCreditSale,playError,unlockAudio} from '../../utils/sounds';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
const CL=['#0A6E47','#3B82F6','#F2B705','#C2412D','#8B5CF6','#EC4899','#14B8A6'];

// ===== OFFICE DASHBOARD with Daily Report + Alerts =====
// ===== SUBSCRIPTION MINI-BAR (kimstari kidogo) =====
function SubscriptionMiniBar(){
  const{biz,daysLeft,settings,initiatePayment,checkPaymentStatus}=useApp();
  const[modal,setModal]=React.useState(false);
  const[phone,setPhone]=React.useState('');
  const[submitting,setSubmitting]=React.useState(false);
  const[done,setDone]=React.useState(false);
  const[msg,setMsg]=React.useState('');
  const[errMsg,setErrMsg]=React.useState('');
  // Kuongeza siku kunabaki kwenye kifurushi cha duka — hakishushi kwenda Basic
  const myPlan=getPlan(biz?.plan);
  const price=myPlan.id==='basic'?parseInt(settings?.system_price||myPlan.price):myPlan.price;

  // Lipa kwa Snippe (auto) — weka namba -> push -> mfumo unajifungua
  const payNow=async()=>{
    const ph=phone.trim();
    if(!ph||ph.replace(/\D/g,'').length<9)return setErrMsg('Weka namba sahihi ya simu (mf. 0712345678)!');
    setSubmitting(true);setErrMsg('');setMsg('');
    try{
      const res=await initiatePayment({amount:price,days:30,plan:myPlan.id,phone:ph});
      if(!res?.success){setErrMsg(res?.error||'Imeshindwa kuanzisha malipo.');setSubmitting(false);return}
      const ref=res.reference||'';
      setMsg(res.message||'📲 Angalia simu yako — weka PIN kuthibitisha malipo. Mfumo utajifungua wenyewe.');
      // Polling kila sekunde 5 kwa dakika 3
      if(ref&&checkPaymentStatus){
        let tries=0;
        const timer=setInterval(async()=>{
          tries++;
          const st=await checkPaymentStatus(ref);
          if(st?.status==='paid'){clearInterval(timer);setDone(true);setMsg('');setTimeout(()=>window.location.reload(),1800);}
          else if(st?.status==='failed'){clearInterval(timer);setErrMsg('❌ Malipo hayakufaulu. Jaribu tena.');setMsg('');}
          else if(tries>=36){clearInterval(timer);setMsg('⏳ Bado tunasubiri uthibitisho. Ukishamaliza kulipa, mfumo utajifungua wenyewe.');}
        },5000);
      }
    }catch(e){setErrMsg('Tatizo: '+(e.message||'Jaribu tena'))}
    setSubmitting(false);
  };

  const closeAll=()=>{setModal(false);setDone(false);setMsg('');setErrMsg('');setPhone('');};
  const days=typeof daysLeft==='function'?daysLeft():daysLeft;
  const planName=biz?.plan?biz.plan.charAt(0).toUpperCase()+biz.plan.slice(1):'Basic';
  const expiry=biz?.token_active?biz?.token_expiry:biz?.trial_end;
  const expiryStr=expiry?new Date(expiry).toLocaleDateString('sw',{day:'numeric',month:'short',year:'numeric'}):'—';

  // Rangi kulingana na siku
  let color;
  if(days<=0)color='#7F1D1D';
  else if(days<=7)color='#DC2626';
  else if(days<=15)color='#EA580C';
  else color='#0A6E47';

  return <>
    <div style={{display:'flex',alignItems:'center',gap:12,background:`${color}0A`,border:`1px solid ${color}25`,borderRadius:12,padding:'10px 16px',marginBottom:16,flexWrap:'wrap'}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
      <span style={{fontSize:13,fontWeight:700,color:'#3A4A42'}}>{planName}</span>
      <span style={{fontSize:12,color:'#9AA5A0'}}>•</span>
      <span style={{fontSize:13,fontWeight:700,color}}>
        {days<=0?'Imeisha':`Siku ${days} zimebaki`}
      </span>
      <span style={{fontSize:12,color:'#9AA5A0'}}>•</span>
      <span style={{fontSize:12,color:'#5C6A62'}}>Inaisha: {expiryStr}</span>
      <button onClick={()=>setModal(true)} style={{marginLeft:'auto',padding:'6px 14px',background:`linear-gradient(135deg,${color},${color}dd)`,color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>
        🔄 Ongeza Siku
      </button>
    </div>

    {/* Modal ya Malipo — Snippe auto (weka namba -> push -> jifungua) */}
    <Modal open={modal} onClose={closeAll} title="🔄 Ongeza Muda wa Usajili">
      {done?(
        <div style={{background:'#E6F2EC',border:'1.5px solid #C2DED1',borderRadius:14,padding:24,textAlign:'center'}}>
          <div style={{fontSize:44,marginBottom:10}}>🎉</div>
          <div style={{fontSize:16,fontWeight:800,color:'#15803D',marginBottom:8}}>Malipo Yamethibitishwa!</div>
          <div style={{fontSize:13,color:'#475569',lineHeight:1.6}}>Mfumo unafunguka wenyewe...</div>
        </div>
      ):(
        <div>
          <div style={{background:'linear-gradient(135deg,#0A6E47,#06502F)',borderRadius:16,padding:'18px',marginBottom:14,color:'#fff',textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:700,opacity:0.85,letterSpacing:1}}>KIASI CHA KULIPA</div>
            <div style={{fontSize:32,fontWeight:900,letterSpacing:-1,margin:'4px 0'}}>TZS {price.toLocaleString()}</div>
            <div style={{fontSize:12,opacity:0.85}}>siku 30 za matumizi</div>
          </div>

          <div style={{fontSize:13,color:'#475569',lineHeight:1.6,marginBottom:14,textAlign:'center'}}>
            Weka namba yako ya simu, bonyeza "Lipa Sasa", kisha weka PIN kwenye simu. Mfumo utajifungua wenyewe.
          </div>

          {errMsg&&<div style={{background:'#FBECE9',color:'#B91C1C',padding:'11px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #C2412D'}}>⚠️ {errMsg}</div>}

          {msg?(
            <div style={{background:'#E6F2EC',border:'1.5px solid #C2DED1',borderRadius:12,padding:'16px',fontSize:13,color:'#166534',lineHeight:1.55,textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:8}}>⏳</div>
              <div style={{fontWeight:800,marginBottom:4}}>Inasubiri uthibitisho...</div>
              {msg}
            </div>
          ):(
            <>
              <Input label="📱 Namba yako ya simu" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XXXXXXXX"/>
              <button onClick={payNow} disabled={submitting} style={{width:'100%',padding:14,marginTop:8,background:submitting?'#86EFAC':'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:15,cursor:submitting?'wait':'pointer',boxShadow:'0 8px 20px rgba(10,110,71,0.3)'}}>
                {submitting?'Inatuma...':`⚡ Lipa Sasa — TZS ${price.toLocaleString()}`}
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  </>;
}

export function OfficeDash({onReceipt,onNav}){
  const{user,biz,products,sales,returns,expenses,purchases=[],daysLeft,online,currency,lowStockProducts,lowMarginProducts,autoReorderList,getDailyReport,settings,goalProgress,aiInsights,creditHistory=[],canUseFeature,currentPlan,orders=[],totalDebt=0,overdueTotal=0}=useApp();
  const cur=currency||'TZS';const fm=n=>fmtMoney(n,cur);
  
  // Filter sales by period
  const tSales=sales.filter(s=>isToday(s.created_at));
  const wSales=sales.filter(s=>isThisWeek(s.created_at));
  const mSales=sales.filter(s=>isThisMonth(s.created_at));
  
  // ===== CASH vs CREDIT separation =====
  // Cash sales = payment_method is NOT 'credit' (cash, mpesa, halopesa, etc.)
  // Credit sales = payment_method IS 'credit' (uziko ulioko bila pesa)
  const tCashSales=tSales.filter(s=>s.payment_method!=='credit');
  const wCashSales=wSales.filter(s=>s.payment_method!=='credit');
  const mCashSales=mSales.filter(s=>s.payment_method!=='credit');
  
  // Credit sales (separate tracking)
  const tCreditSales=tSales.filter(s=>s.payment_method==='credit');
  const wCreditSales=wSales.filter(s=>s.payment_method==='credit');
  const mCreditSales=mSales.filter(s=>s.payment_method==='credit');
  
  // Credit payments received TODAY/WEEK/MONTH (this is what shows as "income")
  const tCreditPayments=creditHistory.filter(t=>t.type==='payment'&&isToday(t.created_at));
  const wCreditPayments=creditHistory.filter(t=>t.type==='payment'&&isThisWeek(t.created_at));
  const mCreditPayments=creditHistory.filter(t=>t.type==='payment'&&isThisMonth(t.created_at));
  
  const tCreditIncome=tCreditPayments.reduce((s,p)=>s+(p.amount||0),0);
  const wCreditIncome=wCreditPayments.reduce((s,p)=>s+(p.amount||0),0);
  const mCreditIncome=mCreditPayments.reduce((s,p)=>s+(p.amount||0),0);
  
  // Filter returns by SAME period (subtract from sales)
  const tReturns=(returns||[]).filter(r=>isToday(r.created_at));
  const wReturns=(returns||[]).filter(r=>isThisWeek(r.created_at));
  const mReturns=(returns||[]).filter(r=>isThisMonth(r.created_at));
  
  // Helper: calculate profit lost from returns
  // Hesabu zote za pesa ziko src/utils/money.js (zina majaribio)
  const costMap=useMemo(()=>buildCostMap(products),[products]);
  const returnProfit=rs=>retProfit(rs,costMap);
  
  // Subtract CASH refunds only (credit returns don't reduce cash income)
  const tCashRefunds=tReturns.filter(r=>!r.was_credit).reduce((a,r)=>a+(r.refund_amount||0),0);
  const wCashRefunds=wReturns.filter(r=>!r.was_credit).reduce((a,r)=>a+(r.refund_amount||0),0);
  const mCashRefunds=mReturns.filter(r=>!r.was_credit).reduce((a,r)=>a+(r.refund_amount||0),0);
  
  // ===== Net cash income = Cash sales + Credit payments received - Cash refunds =====
  // Hii ndio HASA inaonekana kama "mauzo ya leo" (pesa zilizoingia)
  const tTotal=Math.max(0,tCashSales.reduce((a,s)=>a+s.total,0)+tCreditIncome-tCashRefunds);
  const wTotal=Math.max(0,wCashSales.reduce((a,s)=>a+s.total,0)+wCreditIncome-wCashRefunds);
  
  const mTotal=Math.max(0,mCashSales.reduce((a,s)=>a+(s.total||0),0)+mCreditIncome-mCashRefunds);

  // ===== Profit calculation (CASH BASIS) =====
  // Faida inahesabiwa pesa ikiingia pekee (si deni likitolewa).
  // Marejesho ya taslimu yanapunguza faida ya kipindi hicho.
  const netProfit=(cashSales,rs)=>calcNetProfit(cashSales,rs,costMap);
  const tProfit=netProfit(tCashSales,tReturns);
  const wProfit=netProfit(wCashSales,wReturns);
  const mProfit=netProfit(mCashSales,mReturns);
  const mExp=expenses.filter(e=>isThisMonth(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  // ===== Matumizi ya LEO ===== (tarehe za ndani)
  const _today=todayStr();
  const tExp=expenses.filter(e=>e.business_id===biz?.id&&localDateStr(e.created_at)===_today).reduce((a,e)=>a+(e.amount||0),0);
  // Manunuzi ya stock ya LEO yaliyotumia PESA YA DUKA (yanapunguza pesa mkononi, si faida)
  const tStockBuy=purchases.filter(p=>p.source==='shop'&&localDateStr(p.created_at)===_today).reduce((a,p)=>a+(p.total||0),0);
  // ===== PESA YA BENKI = Mauzo - Matumizi - Manunuzi ya stock (pesa ya duka) =====
  const tBankAmount=Math.max(0,tTotal-tExp-tStockBuy);
  const isOff=user?.role==='office';
  
  // Bar chart — only cash-based income per day
  const dayData=useMemo(()=>{
    const d=[];
    for(let i=6;i>=0;i--){
      const dt=new Date();dt.setDate(dt.getDate()-i);
      const ds=localDateStr(dt);
      const dCash=sales.filter(s=>localDateStr(s.created_at)===ds&&s.payment_method!=='credit');
      const dPayments=creditHistory.filter(t=>t.type==='payment'&&localDateStr(t.created_at)===ds);
      const drs=(returns||[]).filter(r=>localDateStr(r.created_at)===ds&&!r.was_credit);
      const dayTotal=dCash.reduce((a,s)=>a+s.total,0)+
                     dPayments.reduce((a,p)=>a+(p.amount||0),0)-
                     drs.reduce((a,r)=>a+(r.refund_amount||0),0);
      d.push({day:dt.toLocaleDateString('en',{weekday:'short'}),total:Math.max(0,dayTotal)});
    }
    return d;
  },[sales,returns,creditHistory]);
  
  const prodMap={};sales.forEach(s=>s.items?.forEach(i=>{prodMap[i.name]=(prodMap[i.name]||0)+i.qty}));
  const pieData=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,q])=>({name:n,value:q}));

  // Announcement
  const ann=settings.announcement;

  // Business type display config
  const BIZ_TYPE_CONFIG={
    retail:    {icon:'🏪',label:'Retail Shop',   color:'#3B82F6'},
    fashion:   {icon:'👗',label:'Fashion',        color:'#EC4899'},
    hardware:  {icon:'🔩',label:'Hardware',       color:'#F2B705'},
    agrovet:   {icon:'🌱',label:'Agrovet',        color:'#0A6E47'},
    restaurant:{icon:'🍽',label:'Restaurant',     color:'#C2412D'},
    pharmacy:  {icon:'💊',label:'Pharmacy',       color:'#8B5CF6'},
    electronics:{icon:'💻',label:'Electronics',   color:'#06B6D4'},
    stationery:{icon:'📚',label:'Stationery',     color:'#F97316'},
    beauty:    {icon:'💇',label:'Beauty Salon',   color:'#EC4899'},
    classic:   {icon:'⭐',label:'Classic Mode',   color:'#5C6A62'},
    other:     {icon:'📦',label:'Biashara',       color:'#5C6A62'},
  };
  const bizTypeKey=biz?.business_type||'classic';
  const bizTypeCfg=BIZ_TYPE_CONFIG[bizTypeKey]||BIZ_TYPE_CONFIG.other;

  // ===== KADI MPYA (KPIs za haraka) =====
  // Oda zinazoendelea (pending + partial)
  const activeOrders=(orders||[]).filter(o=>o.status==='pending'||o.status==='partial');
  const activeOrdersValue=activeOrders.reduce((a,o)=>a+(o.remaining_amount||o.total||0),0);
  // Thamani ya stock iliyopo (bei ya kununua × idadi)
  const stockValue=(products||[]).reduce((a,p)=>a+((p.buy_price||0)*(p.quantity||0)),0);
  // Deni la wateja (jumla nje)
  const outstandingDebt=totalDebt||0;

  return <div className="page-enter">
    {ann&&<div style={{background:settings.announcement_type==='warning'?'#FFF8E6':settings.announcement_type==='danger'?'#FBECE9':'#E6F2EC',border:'1px solid #C2DED1',borderRadius:12,padding:'10px 16px',marginBottom:12,fontSize:13,fontWeight:600}}>📢 {ann}</div>}
    {!online&&<div style={{background:'#FFF8E6',borderRadius:10,padding:'8px 16px',marginBottom:12,fontSize:13,fontWeight:600,color:'#92400E'}}>⚡ Offline Mode — mauzo yatahifadhiwa na kusawazishwa baadaye</div>}
    {isOff&&biz&&!biz.token_active&&daysLeft()<=5&&<div style={{background:'#FFF8E6',border:'1px solid #F2D98B',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
      <span style={{fontSize:13,fontWeight:600,color:'#92400E'}}>⏳ Siku {daysLeft()} zimebaki</span>
      <Btn v="warning" style={{padding:'6px 14px',fontSize:12}} onClick={()=>alert('Lipa: HALOPESA - Lipa Namba\n25187616\nJina: DUKALANGU')}>Lipa Sasa</Btn>
    </div>}

    {/* ===== SUBSCRIPTION MINI-BAR ===== */}
    {user?.role==='office'&&<SubscriptionMiniBar/>}

    {/* ===== HERO: PESA MKONONI (muonekano mpya) ===== */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'20px 22px',marginBottom:14,color:'#fff',position:'relative',overflow:'hidden',boxShadow:'0 14px 34px rgba(10,110,71,.28)'}}>
      <div style={{position:'absolute',right:-40,top:-40,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
      <div style={{position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
          <span style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:.5}}>💰 PESA MKONONI — LEO</span>
          <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,background:'rgba(242,183,5,.25)',color:'#F2B705',padding:'3px 10px',borderRadius:20}}>{bizTypeCfg.icon} {biz?.name||bizTypeCfg.label}</span>
        </div>
        <div style={{fontSize:34,fontWeight:900,letterSpacing:'-1px',margin:'2px 0 14px'}}>{fm(tBankAmount)}</div>
        {/* Mauzo na faida yake kwa kila kipindi */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {[
            {l:'LEO',   s:tTotal, p:tProfit, n:tCashSales.length},
            {l:'WIKI',  s:wTotal, p:wProfit, n:wCashSales.length},
            {l:'MWEZI', s:mTotal, p:mProfit, n:mCashSales.length},
          ].map(k=>{
            const mg=k.s>0?Math.round(k.p/k.s*100):0;
            return <div key={k.l} style={{background:'rgba(255,255,255,.14)',borderRadius:14,padding:'11px 10px',minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:7}}>
                <span style={{fontSize:10,fontWeight:800,letterSpacing:.6,opacity:.9}}>{k.l}</span>
                <span style={{fontSize:9,fontWeight:700,opacity:.7,marginLeft:'auto'}}>🧾{k.n}</span>
              </div>
              <div style={{fontSize:9.5,opacity:.78,fontWeight:700}}>MAUZO</div>
              <div style={{fontSize:15,fontWeight:900,letterSpacing:'-.3px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fm(k.s)}</div>
              <div style={{height:1,background:'rgba(255,255,255,.18)',margin:'7px 0 6px'}}/>
              <div style={{fontSize:9.5,opacity:.78,fontWeight:700}}>FAIDA</div>
              <div style={{fontSize:15,fontWeight:900,letterSpacing:'-.3px',color:'#F2B705',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fm(k.p)}</div>
              <div style={{fontSize:9,opacity:.65,fontWeight:700,marginTop:2}}>{mg}% margin</div>
            </div>;
          })}
        </div>
      </div>
    </div>

    {/* ===== VITENDO VYA HARAKA ===== */}
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
      {[{i:'🛒',t:'Uza',p:'sales'},{i:'📦',t:'Bidhaa',p:'products'},{i:'👥',t:'Wateja',p:'customers'},{i:'📊',t:'Ripoti',p:'reports'}].map(a=>(
        <button key={a.p} className="qbtn ripple" onClick={()=>onNav?.(a.p)} style={{background:'#fff',border:'1px solid #D6E2DB',borderRadius:16,padding:'14px 6px',textAlign:'center',cursor:'pointer'}}>
          <div style={{fontSize:22}}>{a.i}</div>
          <div style={{fontSize:11,fontWeight:700,color:'#5C6A62',marginTop:6}}>{a.t}</div>
        </button>
      ))}
    </div>

    {/* ===== KPI CARDS za kisasa ===== */}
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20}}>
      {[
        // Faida ya mwezi KASORO matumizi — hii ndiyo iliyobaki kweli
        {ic:'📈',k:'Faida Halisi (Mwezi)',v:fm(mProfit-mExp),c:'#0A6E47',bg:'#E6F2EC'},
        {ic:'💳',k:'Deni Nje',v:fm(outstandingDebt),c:'#C2412D',bg:'#FBECE9'},
        {ic:'📦',k:'Thamani ya Stock',v:fm(stockValue),c:'#F2B705',bg:'rgba(242,183,5,.12)'},
        {ic:'⚠️',k:'Stock Alert',v:lowStockProducts.length,c:'#C2412D',bg:'#FBECE9'},
        ...(activeOrders.length?[{ic:'📋',k:`Oda Zinaendelea (${activeOrders.length})`,v:fm(activeOrdersValue),c:'#3B82F6',bg:'#DBEAFE'}]:[]),
      ].map((s,i)=>(
        <div key={i} className="kpi card" style={{background:'#fff',border:'1px solid #D6E2DB',borderRadius:18,padding:15,boxShadow:'0 1px 3px rgba(16,26,21,.04)'}}>
          <div className="ic" style={{width:38,height:38,borderRadius:11,background:s.bg,display:'grid',placeItems:'center',fontSize:18,marginBottom:10}}>{s.ic}</div>
          <div style={{fontSize:12,color:'#5C6A62',fontWeight:600}}>{s.k}</div>
          <div style={{fontSize:19,fontWeight:900,letterSpacing:'-.5px',marginTop:2,color:s.c}}>{s.v}</div>
        </div>
      ))}
    </div>

    {/* Credit Sales Info Banner */}
    {isOff&&tCreditSales.length>0&&<div style={{
      background:'linear-gradient(135deg,#FFF8E6,#FDF0CC)',
      border:'1.5px solid #F2B705',
      borderRadius:12,
      padding:'12px 16px',
      marginBottom:16,
      display:'flex',
      alignItems:'center',
      gap:12,
      flexWrap:'wrap',
    }}>
      <div style={{fontSize:24}}>💳</div>
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontWeight:800,fontSize:13,color:'#92400E'}}>Mikopo Leo: TZS {tCreditSales.reduce((a,s)=>a+s.total,0).toLocaleString()}</div>
        <div style={{fontSize:11,color:'#78350F',marginTop:2}}>
          Bidhaa <b>{tCreditSales.length}</b> zimekopeshwa. <b>HAZIONEKANI</b> kwenye "Pesa Leo" mpaka wateja walipe deni.
        </div>
      </div>
    </div>}

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 12px',color:'#17231D'}}>📈 Mauzo (Siku 7)</h3>
        <ResponsiveContainer width="100%" height={180}><BarChart data={dayData}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>fm(v)}/><Bar dataKey="total" fill="#0A6E47" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>

      <div className="card"><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 12px',color:'#17231D'}}>🏆 Bidhaa Bora</h3>
        {pieData.length?<ResponsiveContainer width="100%" height={180}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value})=>`${name}: ${value}`} style={{fontSize:9}}>{pieData.map((_,i)=><Cell key={i} fill={CL[i%CL.length]}/>)}</Pie></PieChart></ResponsiveContainer>:<Empty icon="📊" text="Uza kuona data"/>}</div>

      {/* PROFIT MARGIN ALERT */}
      {lowMarginProducts.length>0&&<div className="card" style={{borderLeft:'4px solid #F2B705'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#92400E'}}>⚠️ Faida Ndogo ({lowMarginProducts.length})</h3>
        <div style={{fontSize:11,color:'#5C6A62',marginBottom:8}}>Bidhaa hizi zina faida chini ya 15% — zinaweza kukuumiza!</div>
        {lowMarginProducts.slice(0,5).map(p=><div key={p.id} style={{padding:'6px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><span style={{marginRight:6}}>{p.image}</span><span style={{fontWeight:600,fontSize:12}}>{p.name}</span></div>
          <Badge color="#F2B705">{p.margin}%</Badge>
        </div>)}
      </div>}

      {/* AUTO REORDER LIST */}
      {autoReorderList.length>0&&<div className="card" style={{borderLeft:'4px solid #C2412D'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#B91C1C'}}>📦 Agiza Bidhaa ({autoReorderList.length})</h3>
        <div style={{fontSize:11,color:'#5C6A62',marginBottom:8}}>Bidhaa hizi zinaisha — hii ni orodha ya kuagiza:</div>
        {autoReorderList.slice(0,6).map(p=><div key={p.id} style={{padding:'6px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><span style={{marginRight:6}}>{p.image}</span><span style={{fontWeight:600,fontSize:12}}>{p.name}</span><span style={{fontSize:11,color:'#C2412D',marginLeft:6}}>({p.quantity} sasa)</span></div>
          <Badge color="#3B82F6">Agiza: {p.suggestedQty}</Badge>
        </div>)}
      </div>}

      {/* DAILY REPORT */}
      {isOff&&<div className="card" style={{borderLeft:'4px solid #0A6E47'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#0A6E47'}}>📊 Ripoti ya Leo</h3>
        {(()=>{const r=getDailyReport();return<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#F6F8F7',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#9AA5A0'}}>Mauzo</div><div style={{fontWeight:800,fontSize:16,color:'#0A6E47'}}>{fm(r.totalSales)}</div></div>
            <div style={{background:'#F6F8F7',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#9AA5A0'}}>Faida</div><div style={{fontWeight:800,fontSize:16,color:'#3B82F6'}}>{fm(r.totalProfit)}</div></div>
            <div style={{background:'#F6F8F7',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#9AA5A0'}}>Matumizi</div><div style={{fontWeight:800,fontSize:16,color:'#C2412D'}}>{fm(r.totalExpenses)}</div></div>
            <div style={{background:'#F6F8F7',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#9AA5A0'}}>Idadi</div><div style={{fontWeight:800,fontSize:16}}>{r.salesCount} mauzo</div></div>
          </div>
        </>})()}
      </div>}

      {/* PROFIT GOALS PROGRESS */}
      {isOff&&(goalProgress.daily.goal>0||goalProgress.weekly.goal>0||goalProgress.monthly.goal>0)&&<div className="card" style={{borderLeft:'4px solid #8B5CF6'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#8B5CF6'}}>🎯 Malengo ya Faida</h3>
        {[{label:'Leo',data:goalProgress.daily,color:'#0A6E47'},{label:'Wiki',data:goalProgress.weekly,color:'#3B82F6'},{label:'Mwezi',data:goalProgress.monthly,color:'#8B5CF6'}].filter(g=>g.data.goal>0).map(g=>(
          <div key={g.label} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
              <span style={{fontWeight:600}}>{g.label}: {fm(g.data.current)} / {fm(g.data.goal)}</span>
              <span style={{fontWeight:700,color:g.data.pct>=100?'#0A6E47':g.color}}>{g.data.pct}%</span>
            </div>
            <div style={{height:8,background:'#F6F8F7',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${g.data.pct}%`,background:g.data.pct>=100?'#0A6E47':g.color,borderRadius:4,transition:'width 0.5s'}}/>
            </div>
            {g.data.pct>=100&&<div style={{fontSize:11,color:'#0A6E47',fontWeight:600,marginTop:2}}>🎉 Umefika lengo!</div>}
          </div>
        ))}
      </div>}

      {/* AI SMART INSIGHTS — Basic na zaidi */}
      {isOff&&aiInsights.length>0&&<div className="card" style={{borderLeft:'4px solid #3B82F6'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#3B82F6'}}>🤖 Uchambuzi wa AI</h3>
        {aiInsights.map((ins,i)=>(
          <div key={i} style={{padding:'8px 10px',marginBottom:6,borderRadius:8,background:ins.type==='success'?'#E6F2EC':ins.type==='warning'?'#FFF8E6':ins.type==='danger'?'#FBECE9':'#EFF6FF',display:'flex',gap:8,alignItems:'flex-start'}}>
            <span style={{fontSize:18}}>{ins.icon}</span>
            <div><div style={{fontWeight:700,fontSize:12,color:ins.type==='success'?'#15803D':ins.type==='warning'?'#92400E':ins.type==='danger'?'#B91C1C':'#1E40AF'}}>{ins.title}</div>
            <div style={{fontSize:11,color:'#5C6A62',marginTop:2}}>{ins.desc}</div></div>
          </div>
        ))}
      </div>}

      <div className="card"><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 12px',color:'#17231D'}}>🕐 Mauzo ya Hivi Karibuni</h3>
        {tSales.slice(0,5).map(s=>{
          const isCredit=s.payment_method==='credit';
          return <div key={s.id} onClick={()=>onReceipt?.(s)} style={{padding:'8px 0',borderBottom:'1px solid #F6F8F7',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                <span style={{fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.items?.map(i=>i.name).join(', ').slice(0,30)}</span>
                {isCredit&&<span style={{background:'#FFF8E6',color:'#92400E',padding:'1px 8px',borderRadius:6,fontSize:9,fontWeight:800}}>💳 DENI</span>}
                {!isCredit&&<span style={{background:'#D6EADF',color:'#15803D',padding:'1px 8px',borderRadius:6,fontSize:9,fontWeight:800}}>💵 CASH</span>}
              </div>
              <div style={{fontSize:11,color:'#9AA5A0'}}>{fmtDate(s.created_at)} • {s.seller_name}{isCredit&&s.customer_name?` • ${s.customer_name}`:''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700,color:isCredit?'#F2B705':'#0A6E47',fontSize:13}}>{fm(s.total)}</div>
            </div>
          </div>;
        })}
        {!tSales.length&&<Empty icon="🛒" text="Hakuna mauzo ya leo"/>}
      </div>
    </div>
  </div>;
}

// ===== POS / SALES =====
export function SalesPage({onDone}){
  const{products,completeSale,creditSale,customers,addCustomer,user,currency,activeBranch,hasWholesale,canUseBranches,createOrder,branches=[]}=useApp();
  // Mzuie mfanyakazi TU kama duka lina matawi kweli. Plan ya Premium
  // peke yake iliwasha matawi hata kwa duka lisilo na tawi lolote —
  // na wafanyakazi wa maduka hayo walishindwa kuuza kabisa.
  const bizHasBranches=(branches||[]).some(b=>b.business_id===user?.business_id);
  const empNoBranch=user?.role==='employee'&&canUseBranches&&bizHasBranches&&!user?.branch_id;
  const cur=currency||'TZS';const fm=n=>fmtMoney(n,cur);
  const[search,setSearch]=useState('');const[cart,setCart]=useState([]);const[discount,setDiscount]=useState(0);const[payMethod,setPayMethod]=useState('cash');const[cashAmt,setCashAmt]=useState('');const[mobileAmt,setMobileAmt]=useState('');const[custName,setCustName]=useState('');const[cashRecv,setCashRecv]=useState('');
  const[custId,setCustId]=useState('');const[newCustModal,setNewCustModal]=useState(false);const[newCustName,setNewCustName]=useState('');const[newCustPhone,setNewCustPhone]=useState('');
  const[processing,setProcessing]=useState(false);
  const subtotal=cart.reduce((s,c)=>s+c.qty*c.price*(c.fraction||1),0);const total=Math.max(0,subtotal-discount);
  const addToCart=(p,useWholesale=false)=>{
    if(processing)return;
    unlockAudio(); // Ruhusu sauti (browser autoplay policy)
    const price=useWholesale&&p.wholesale_price?p.wholesale_price:p.sell_price;
    const priceType=useWholesale&&p.wholesale_price?'jumla':'rejareja';
    const ex=cart.find(c=>c.productId===p.id&&c.priceType===priceType);
    if(ex){
      if(ex.qty>=p.quantity)return alert('Stock haitoshi!');
      setCart(cart.map(c=>c.productId===p.id&&c.priceType===priceType?{...c,qty:c.qty+1}:c));
    } else {
      setCart([...cart,{productId:p.id,name:p.name,price,buyPrice:p.buy_price,qty:1,fraction:1,fractionLabel:'Nzima',image:p.image,priceType,wholesaleMinQty:p.wholesale_min_qty||5}]);
    }
  };
  
  // Fraction options for selling
  const FRACTIONS=[
    {v:1,l:'1 (Nzima)',short:'1'},
    {v:0.75,l:'¾ (Robo Tatu)',short:'¾'},
    {v:0.5,l:'½ (Nusu)',short:'½'},
    {v:0.25,l:'¼ (Robo)',short:'¼'},
    {v:0.125,l:'⅛ (Robo ya Robo)',short:'⅛'},
  ];
  
  const updateFraction=(idx,fraction)=>{
    const f=FRACTIONS.find(x=>x.v===fraction);
    setCart(cart.map((x,j)=>j===idx?{...x,fraction,fractionLabel:f?.l||'Nzima'}:x));
  };
  const doOrder=async()=>{
    if(!cart.length)return alert('Weka bidhaa kwanza!');
    setProcessing(true);
    try{
      const items=cart.map(c=>({productId:c.productId,name:c.name,qty:c.qty,price:c.price,cost:c.cost||c.buyPrice||c.buy_price||0,fraction:c.fraction||1}));
      const res=await createOrder({items,discount,customerId:custId||null,customerName:custName||'Mteja',customerPhone:''});
      if(res.error){alert(res.error);setProcessing(false);return;}
      playSaleSuccess();
      alert(`📋 ODA IMEWEKWA!\n\nNamba: ${res.order?.order_number||'—'}\nJumla: TZS ${total.toLocaleString()}\nStock imehifadhiwa.\n\nMteja akilipa, nenda "📋 Oda" kupokea malipo. Mauzo yatarekodiwa baada ya malipo kukamilika.`);
      setCart([]);setDiscount(0);setCashAmt('');setMobileAmt('');setCustName('');setCustId('');
    }catch(e){alert('Tatizo la kuweka oda.');}
    finally{setProcessing(false);}
  };

  const doSale=async()=>{
    if(!cart.length||processing)return;
    // Credit sale requires customer
    if(payMethod==='credit'&&!custId){return alert('Chagua mteja wa deni!')}
    setProcessing(true);
    try{
      let sale;
      if(payMethod==='credit'){
        sale=await creditSale(cart,custId,discount);
        if(sale&&!sale.error){
          const total=cart.reduce((s,c)=>s+c.qty*c.price,0)-discount;
          const cust=customers.find(c=>c.id===custId);
          playCreditSale();
          alert(`💳 BIDHAA ZIMEKOPESHWA!\n\n👤 Mteja: ${cust?.name||'—'}\n💰 Kiasi: TZS ${total.toLocaleString()}\n📦 Stock: Imepunguzwa\n\n⚠️ MUHIMU:\nMauzo haya HAYATAONEKANA kwenye "Pesa Leo" ya Dashboard mpaka mteja alipe deni.\n\nMteja akilipa → pesa itaongezeka kwenye "Pesa Leo" ya siku ya kulipa.`);
        }else if(sale?.error){
          alert(sale.error);
          setProcessing(false);return;
        }
      }else{
        let pd=null;if(payMethod==='mix')pd={cash:+cashAmt||0,mobile:+mobileAmt||0};
        sale=await completeSale(cart,discount,payMethod,pd,custId||null,custName);
        // Ambatanisha pesa iliyopokelewa (taslimu) ili risiti ionyeshe chenji
        if(sale&&payMethod==='cash'&&+cashRecv>0){sale={...sale,cash_received:+cashRecv};}
      }
      if(sale){
        playSaleSuccess(); // 🔊 Sauti ya mafanikio
        onDone?.(sale);
      }
      setCart([]);setDiscount(0);setCashAmt('');setMobileAmt('');setCustName('');setCustId('');setCashRecv('');
    }catch(e){console.error('Sale error:',e);playError();}
    finally{setProcessing(false)}
  };
  const avail=products.filter(p=>p.quantity>0&&p.name?.toLowerCase().includes(search.toLowerCase())&&(!activeBranch||p.branch_id===activeBranch));
  const selCust=customers.find(c=>c.id===custId);

  if(empNoBranch)return <div style={{padding:40,textAlign:'center',background:'#FFF8E6',borderRadius:14,border:'1.5px solid #F2D98B',maxWidth:500,margin:'40px auto'}}>
    <div style={{fontSize:48,marginBottom:12}}>🏪</div>
    <div style={{fontSize:16,fontWeight:800,color:'#9A3412',marginBottom:8}}>Hujapangiwa Tawi</div>
    <div style={{fontSize:13,color:'#92400E',lineHeight:1.6}}>Mmiliki wa biashara lazima akupangie tawi kabla ya kuanza kuuza. Wasiliana naye akupangie tawi lako.</div>
  </div>;

  return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
    <div className="card">
      <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 12px',color:'#0A6E47'}}>🛍️ Chagua Bidhaa</h3>
      <input placeholder="🔍 Tafuta au scan barcode... (Enter kuongeza)" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!processing){const first=avail[0];if(first){addToCart(first,false);setSearch('');}}}} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #D6E2DB',fontSize:14,marginBottom:12,outline:'none',boxSizing:'border-box',background:'#F6F8F7'}}/>
      <div style={{maxHeight:460,overflowY:'auto',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(104px,1fr))',gap:10,paddingBottom:4}}>
        {avail.map(p=>(
          <div key={p.id} onClick={()=>!processing&&addToCart(p,false)} style={{
            border:'1px solid #D6E2DB',borderRadius:16,padding:'12px 8px',textAlign:'center',cursor:processing?'not-allowed':'pointer',
            background:'#fff',opacity:processing?0.5:1,position:'relative',transition:'all .15s',boxShadow:'0 1px 2px rgba(16,26,21,.04)',
          }}>
            <div style={{position:'absolute',top:6,right:6,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:p.quantity<=5?'#FBECE9':'#E6F2EC',color:p.quantity<=5?'#C2412D':'#0A6E47'}}>{p.quantity}</div>
            <div style={{fontSize:32,lineHeight:1,margin:'4px 0 8px'}}>{p.image||'📦'}</div>
            <div style={{fontWeight:700,fontSize:12,color:'#17231D',lineHeight:1.25,minHeight:30,display:'flex',alignItems:'center',justifyContent:'center'}}>{p.name}</div>
            <div style={{fontSize:13,fontWeight:800,color:'#0A6E47',marginTop:4}}>{fm(p.sell_price)}</div>
            {hasWholesale&&p.wholesale_price&&(
              <button onClick={e=>{e.stopPropagation();!processing&&addToCart(p,true)}} style={{marginTop:6,width:'100%',padding:'4px',background:'#FBECE9',color:'#C2412D',border:'none',borderRadius:7,fontSize:10,fontWeight:700,cursor:'pointer'}}>📦 Jumla {fm(p.wholesale_price)}</button>
            )}
          </div>
        ))}
        {!avail.length&&<div style={{gridColumn:'1/-1'}}><Empty icon="📦" text="Hakuna bidhaa"/></div>}
      </div>
    </div>
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 10px'}}>🛒 Kikapu ({cart.length})</h3>
      {!cart.length?<Empty icon="🛒" text="Bonyeza bidhaa"/>:<>
        <div style={{maxHeight:280,overflowY:'auto'}}>{cart.map((c,i)=><div key={i} style={{padding:'10px 0',borderBottom:'1px solid #F6F8F7'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <span style={{fontSize:18}}>{c.image||'📦'}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:12}}>{c.name}</div>
              <div style={{fontSize:10,color:'#5C6A62'}}>Bei kamili: {fm(c.price)}</div>
            </div>
            <button disabled={processing} onClick={()=>setCart(cart.filter((_,j)=>j!==i))} style={{background:'#FBECE9',border:'none',borderRadius:6,padding:'4px 6px',color:'#C2412D',cursor:'pointer'}}>{IC.del}</button>
          </div>
          
          {/* Fraction selector */}
          <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
            {FRACTIONS.map(f=><button key={f.v} disabled={processing} onClick={()=>updateFraction(i,f.v)} style={{padding:'5px 10px',borderRadius:8,border:c.fraction===f.v?'2px solid #0A6E47':'1px solid #D6E2DB',background:c.fraction===f.v?'#E6F2EC':'#fff',fontWeight:c.fraction===f.v?700:500,fontSize:11,cursor:'pointer',color:c.fraction===f.v?'#0A6E47':'#5C6A62',transition:'all 0.2s'}}>{f.short}</button>)}
          </div>
          
          {/* Quantity controls + Total */}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button disabled={processing} onClick={()=>{if(c.qty<=1)setCart(cart.filter((_,j)=>j!==i));else setCart(cart.map((x,j)=>j===i?{...x,qty:x.qty-1}:x))}} style={{background:'#F6F8F7',border:'none',borderRadius:6,padding:'4px 10px',fontWeight:700,fontSize:14,cursor:'pointer'}}>−</button>
              <input type="number" disabled={processing} value={c.qty} onChange={e=>{let v=parseInt(e.target.value)||0;const pr=products.find(p=>p.id===c.productId);if(pr&&v>pr.quantity){v=pr.quantity;alert('Stock haitoshi! Kiwango cha juu: '+pr.quantity);}if(v<0)v=0;setCart(cart.map((x,j)=>j===i?{...x,qty:v}:x))}} style={{fontWeight:700,width:44,textAlign:'center',fontSize:13,border:'1.5px solid #D6E2DB',borderRadius:6,padding:'3px 2px',outline:'none'}}/>
              <button disabled={processing} onClick={()=>{const pr=products.find(p=>p.id===c.productId);if(pr&&c.qty>=pr.quantity)return alert('Stock haitoshi!');setCart(cart.map((x,j)=>j===i?{...x,qty:x.qty+1}:x))}} style={{background:'#E6F2EC',border:'none',borderRadius:6,padding:'4px 10px',color:'#0A6E47',fontWeight:700,fontSize:14,cursor:'pointer'}}>+</button>
            </div>
            <div style={{flex:1,fontSize:10,color:'#9AA5A0',textAlign:'center'}}>
              {c.fraction!==1?<>
                <span>{(c.fraction).toFixed(2)} × {c.qty}</span>
                <br/>
                <span>= <b style={{color:'#0A6E47'}}>{(c.fraction*c.qty).toFixed(2)}</b></span>
              </>:<span>Idadi: {c.qty}</span>}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800,fontSize:14,color:'#0A6E47'}}>{fm(c.qty*c.price*(c.fraction||1))}</div>
              {c.fraction!==1&&<div style={{fontSize:9,color:'#9AA5A0'}}>{fm(c.price*c.fraction)} × {c.qty}</div>}
            </div>
          </div>
        </div>)}</div>
        <div style={{marginTop:8}}><Input label="Punguzo (TZS)" type="number" value={discount||''} onChange={e=>setDiscount(+e.target.value||0)} style={{background:'#FFF8E6'}}/></div>
        
        {/* Payment Methods - 4 options now */}
        <div style={{marginBottom:8}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Malipo</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            {[
              {v:'cash',l:'💵 Taslimu',c:'#0A6E47'},
              {v:'mpesa',l:'M-Pesa',c:'#E30613'},
              {v:'airtel',l:'Airtel',c:'#ED1C24'},
              {v:'tigo',l:'Tigo/Mixx',c:'#0033A0'},
              {v:'halopesa',l:'HaloPesa',c:'#F7941E'},
              {v:'nmb',l:'🏦 NMB',c:'#00539F'},
              {v:'crdb',l:'🏦 CRDB',c:'#006A4E'},
              {v:'mix',l:'🔀 Mix',c:'#F2B705'},
              {v:'credit',l:'📋 Deni',c:'#C2412D'},
            ].map(m=>
              <button key={m.v} onClick={()=>!processing&&setPayMethod(m.v)} style={{padding:'10px 4px',borderRadius:10,border:payMethod===m.v?`2px solid ${m.c}`:'1.5px solid #D6E2DB',background:payMethod===m.v?`${m.c}10`:'#fff',fontWeight:700,fontSize:11.5,color:payMethod===m.v?m.c:'#5C6A62',cursor:'pointer'}}>{m.l}</button>
            )}
          </div>
        </div>

        {payMethod==='mix'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Input label="Taslimu" type="number" value={cashAmt} onChange={e=>setCashAmt(e.target.value)}/><Input label="M-Pesa" type="number" value={mobileAmt} onChange={e=>setMobileAmt(e.target.value)}/></div>}

        {/* Pesa iliyopokelewa + Chenji (taslimu tu) */}
        {payMethod==='cash'&&<div style={{background:'#E6F2EC',borderRadius:10,padding:10,marginBottom:8,border:'1px solid #C2DED1'}}>
          <label style={{display:'block',fontSize:12,fontWeight:700,color:'#0A6E47',marginBottom:6}}>💵 Pesa Aliyotoa Mteja</label>
          <input type="number" value={cashRecv} onChange={e=>setCashRecv(e.target.value)} placeholder={`Mf: ${total}`} style={{width:'100%',padding:'11px 12px',borderRadius:10,border:'1.5px solid #86EFAC',fontSize:16,fontWeight:700,boxSizing:'border-box',outline:'none',marginBottom:6}}/>
          <div style={{display:'flex',gap:5,marginBottom:cashRecv?6:0,flexWrap:'wrap'}}>
            {[total,Math.ceil(total/1000)*1000,Math.ceil(total/5000)*5000,Math.ceil(total/10000)*10000].filter((v,i,a)=>v>0&&a.indexOf(v)===i).slice(0,4).map(v=>
              <button key={v} onClick={()=>setCashRecv(String(v))} style={{flex:1,padding:'6px 0',borderRadius:8,border:'1px solid #C2DED1',background:'#fff',color:'#0A6E47',fontWeight:700,fontSize:11.5,cursor:'pointer',whiteSpace:'nowrap'}}>{fm(v)}</button>
            )}
          </div>
          {cashRecv!==''&&+cashRecv>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:14,fontWeight:800,paddingTop:6,borderTop:'1px dashed #86EFAC',color:+cashRecv>=total?'#0A6E47':'#C2412D'}}>
            <span>{+cashRecv>=total?'💰 Chenji':'⚠️ Pungufu'}</span>
            <span>{fm(Math.abs(+cashRecv-total))}</span>
          </div>}
        </div>}
        
        {/* Credit/Deni - Customer Selection */}
        {payMethod==='credit'?<div style={{background:'#FBECE9',borderRadius:10,padding:10,marginBottom:8,border:'1px solid #F0D9D4'}}>
          <label style={{display:'block',fontSize:12,fontWeight:700,color:'#B91C1C',marginBottom:6}}>📋 Mteja wa Deni (lazima)</label>
          <select value={custId} onChange={e=>setCustId(e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #FCA5A5',fontSize:13,outline:'none',background:'#fff',marginBottom:6,boxSizing:'border-box'}}>
            <option value="">-- Chagua Mteja --</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name} {(c.credit_balance||0)>0?`(Deni: ${fm(c.credit_balance)})`:''}</option>)}
          </select>
          {selCust&&<div style={{fontSize:12,color:'#B91C1C',marginBottom:4}}>Deni la sasa: <b>{fm(selCust.credit_balance||0)}</b> → Deni jipya: <b>{fm((selCust.credit_balance||0)+total)}</b></div>}
          <button onClick={()=>setNewCustModal(true)} style={{fontSize:11,color:'#3B82F6',background:'none',border:'none',cursor:'pointer',fontWeight:600,textDecoration:'underline'}}>+ Sajili Mteja Mpya</button>
        </div>
        :<Input label="Mteja (si lazima)" value={custName} onChange={e=>setCustName(e.target.value)} placeholder="Jina"/>}

        <div style={{background:'#F6F8F7',borderRadius:10,padding:10,marginTop:4}}>
          {discount>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#F2B705'}}><span>Punguzo:</span><span>-{fm(discount)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18,color:payMethod==='credit'?'#C2412D':'#0A6E47',paddingTop:6,borderTop:discount?'2px solid #D6E2DB':'none'}}><span>{payMethod==='credit'?'DENI':'JUMLA'}</span><span>{fm(total)}</span></div>
        </div>
        <button onClick={doSale} disabled={processing} style={{width:'100%',padding:16,background:processing?'#86EFAC':payMethod==='credit'?'#C2412D':'#0A6E47',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:16,marginTop:10,cursor:processing?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:processing?0.7:1,transition:'all 0.2s'}}>
          {processing?<><span style={{display:'inline-block',width:20,height:20,border:'3px solid rgba(255,255,255,0.3)',borderTop:'3px solid #fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></span> Inatuma...</>:payMethod==='credit'?<>{IC.ok} Uza kwa Deni</>:<>{IC.ok} Kamilisha Mauzo</>}
        </button>
        {processing&&<div style={{textAlign:'center',fontSize:12,color:'#5C6A62',marginTop:8}}>Subiri... mauzo yanashughulikiwa</div>}
        {!processing&&payMethod!=='credit'&&cart.length>0&&<button onClick={doOrder} style={{width:'100%',padding:11,background:'#fff',color:'#F2B705',border:'1.5px solid #F2D98B',borderRadius:12,fontWeight:700,fontSize:13.5,marginTop:8,cursor:'pointer'}}>📋 Weka Oda (Pending) badala ya kuuza</button>}
      </>}
    </div>

    {/* Quick Add Customer Modal */}
    <Modal open={newCustModal} onClose={()=>setNewCustModal(false)} title="Sajili Mteja Mpya">
      <PhoneNameInput label="Simu" value={newCustPhone} onChange={e=>setNewCustPhone(e.target.value)} currentName={newCustName} onName={setNewCustName}/>
      <Input label="Jina *" value={newCustName} onChange={e=>setNewCustName(e.target.value)} placeholder="Jina kamili"/>
      <Btn onClick={async()=>{
        if(!newCustName.trim())return alert('Weka jina!');
        const c=await addCustomer({name:newCustName.trim(),phone:newCustPhone.trim()});
        if(c)setCustId(c.id);
        setNewCustModal(false);setNewCustName('');setNewCustPhone('');
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Sajili na Chagua</Btn>
    </Modal>

    <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
  </div>;
}

// ===== PRODUCTS =====
export function ProductsPage(){
  const{products,addProduct,updateProduct,deleteProduct,bizId,activeBranch,hasWholesale,canUseBranches,getBranches,copyProductsToBranch}=useApp();
  const[copyModal,setCopyModal]=useState(false);
  const[copyTo,setCopyTo]=useState('');
  const[copying,setCopying]=useState(false);
  const myBranches=canUseBranches?getBranches():[];
  const currentBranch=myBranches.find(b=>b.id===activeBranch);
  const myProds=products.filter(p=>p.business_id===bizId&&(!activeBranch||p.branch_id===activeBranch));
  const[search,setSearch]=useState('');const[modal,setModal]=useState({open:false,data:null});
  const[dupErr,setDupErr]=useState('');
  const filtered=myProds.filter(p=>p.name?.toLowerCase().includes(search.toLowerCase()));
  const ProdForm=({init={},onSave})=>{
    const[f,setF]=useState({name:init.name||'',unit:init.unit||'Piece',category:init.category||'Vyakula',image:init.image||'📦',buy_price:init.buy_price||'',sell_price:init.sell_price||'',wholesale_price:init.wholesale_price||'',wholesale_min_qty:init.wholesale_min_qty||'5',quantity:init.quantity||'',min_stock:init.min_stock||5,expiry_date:init.expiry_date||''});
    const margin=f.buy_price&&f.sell_price?((f.sell_price-f.buy_price)/f.sell_price*100).toFixed(1):null;
    const wMargin=f.buy_price&&f.wholesale_price?((f.wholesale_price-f.buy_price)/f.wholesale_price*100).toFixed(1):null;
    return <div className="page-enter">
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Emoji</label><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{EMOJIS.map(e=><button key={e} onClick={()=>setF({...f,image:e})} style={{fontSize:20,padding:5,borderRadius:8,border:f.image===e?'2px solid #0A6E47':'1px solid #D6E2DB',background:f.image===e?'#E6F2EC':'#fff',cursor:'pointer'}}>{e}</button>)}</div></div>
      <Input label="Jina" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Sukari"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Sel label="Kipimo" value={f.unit} onChange={e=>setF({...f,unit:e.target.value})} options={[
          {value:'Kipande',label:'Kipande (Pcs)'},
          {value:'Robo',label:'Robo (¼)'},
          {value:'Nusu',label:'Nusu (½)'},
          {value:'Robo3',label:'Robo Tatu (¾)'},
          {value:'Kg',label:'Kilogramu (Kg)'},
          {value:'NusuKg',label:'Nusu Kilo (½ Kg)'},
          {value:'RoboKg',label:'Robo Kilo (¼ Kg)'},
          {value:'Gram',label:'Gramu (g)'},
          {value:'Lita',label:'Lita (L)'},
          {value:'NusuLita',label:'Nusu Lita (½ L)'},
          {value:'RoboLita',label:'Robo Lita (¼ L)'},
          {value:'Mililita',label:'Mililita (ml)'},
          {value:'Mfuko',label:'Mfuko'},
          {value:'NusuMfuko',label:'Nusu Mfuko'},
          {value:'Pakiti',label:'Pakiti'},
          {value:'NusuPakiti',label:'Nusu Pakiti'},
          {value:'Boksi',label:'Boksi/Kartoni'},
          {value:'NusuBoksi',label:'Nusu Boksi'},
          {value:'Chupa',label:'Chupa'},
          {value:'NusuChupa',label:'Nusu Chupa'},
          {value:'Kopo',label:'Kopo/Tin'},
          {value:'Debe',label:'Debe'},
          {value:'NusuDebe',label:'Nusu Debe'},
          {value:'RoboDebe',label:'Robo Debe'},
          {value:'Gunia',label:'Gunia'},
          {value:'NusuGunia',label:'Nusu Gunia'},
          {value:'RoboGunia',label:'Robo Gunia'},
          {value:'Seti',label:'Seti'},
          {value:'Doseni',label:'Doseni (12)'},
          {value:'NusuDoseni',label:'Nusu Doseni (6)'},
          {value:'Mita',label:'Mita (m)'},
          {value:'NusuMita',label:'Nusu Mita (½ m)'},
          {value:'Sentimita',label:'Sentimita (cm)'},
          {value:'Inchi',label:'Inchi (in)'},
          {value:'Futi',label:'Futi (ft)'},
          {value:'Roli',label:'Roli/Roll'},
          {value:'Ndoo',label:'Ndoo/Bucket'},
          {value:'NusuNdoo',label:'Nusu Ndoo'},
          {value:'Tray',label:'Tray/Trei'},
          {value:'Kopo_Ndogo',label:'Kopo Ndogo'},
          {value:'Kopo_Kubwa',label:'Kopo Kubwa'},
          {value:'Sachet',label:'Sachet/Kijiko'},
          {value:'Begi',label:'Begi'},
          {value:'Karatasi',label:'Karatasi/Sheet'},
          {value:'Jozi',label:'Jozi/Pair'},
          {value:'Nyingine',label:'Nyingine'},
        ]}/>
        <Sel label="Aina" value={f.category} onChange={e=>setF({...f,category:e.target.value})} options={[
          {value:'Vyakula',label:'🍚 Vyakula/Chakula'},
          {value:'Vinywaji',label:'🥤 Vinywaji'},
          {value:'Matunda',label:'🍎 Matunda'},
          {value:'Mboga',label:'🥬 Mboga/Mbogamboga'},
          {value:'Nyama',label:'🥩 Nyama/Samaki/Kuku'},
          {value:'Maziwa',label:'🥛 Maziwa/Dairy'},
          {value:'Mkate',label:'🍞 Mkate/Bakery'},
          {value:'Viungo',label:'🌶 Viungo/Spices'},
          {value:'Mafuta',label:'🫒 Mafuta ya Kupikia'},
          {value:'Nafaka',label:'🌾 Nafaka/Cereals'},
          {value:'Snacks',label:'🍪 Snacks/Vitafunwa'},
          {value:'Sabuni',label:'🧼 Sabuni/Usafi'},
          {value:'Urembo',label:'💄 Urembo/Cosmetics'},
          {value:'Dawa',label:'💊 Dawa/Pharmacy'},
          {value:'Nguo',label:'👕 Nguo/Vitenge'},
          {value:'Viatu',label:'👟 Viatu/Shoes'},
          {value:'Elektroniki',label:'📱 Elektroniki'},
          {value:'Vifaa_Umeme',label:'💡 Vifaa vya Umeme'},
          {value:'Vifaa_Ujenzi',label:'🧱 Vifaa vya Ujenzi'},
          {value:'Vifaa_Shule',label:'📚 Vifaa vya Shule'},
          {value:'Vifaa_Ofisi',label:'🖊 Vifaa vya Ofisi'},
          {value:'Vifaa_Nyumba',label:'🏠 Vifaa vya Nyumbani'},
          {value:'Vifaa_Jikoni',label:'🍳 Vifaa vya Jikoni'},
          {value:'Gesi',label:'🔥 Gesi/Gas'},
          {value:'Maji',label:'💧 Maji/Water'},
          {value:'Sigara',label:'🚬 Sigara/Tobacco'},
          {value:'Pombe',label:'🍺 Pombe/Bia'},
          {value:'Plastiki',label:'🛍 Plastiki/Mifuko'},
          {value:'Mbolea',label:'🌱 Mbolea/Kilimo'},
          {value:'Mifugo',label:'🐄 Chakula cha Mifugo'},
          {value:'Spare_Parts',label:'🔧 Spare Parts'},
          {value:'Toys',label:'🧸 Vinyago/Toys'},
          {value:'Stationery',label:'✏️ Stationery'},
          {value:'Hardware',label:'🔨 Hardware'},
          {value:'Furniture',label:'🪑 Samani/Furniture'},
          {value:'Nyingine',label:'📦 Nyingine/Other'},
        ]}/>
      </div>
      {/* === BEI YA REJAREJA === */}
      <div style={{background:'#E6F2EC',borderRadius:10,padding:'10px 12px',marginBottom:10,border:'1.5px solid #C2DED1'}}>
        <div style={{fontSize:11,fontWeight:700,color:'#0A6E47',marginBottom:8}}>🛒 BEI YA REJAREJA (Kawaida)</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <Input label="Bei Kununua" type="number" value={f.buy_price} onChange={e=>setF({...f,buy_price:e.target.value})}/>
          <Input label="Bei Kuuza (Rejareja)" type="number" value={f.sell_price} onChange={e=>setF({...f,sell_price:e.target.value})}/>
        </div>
        {margin!==null&&<div style={{background:margin<15?'#FBECE9':margin<25?'#FFF8E6':'#E6F2EC',borderRadius:8,padding:'5px 10px',marginTop:6,fontSize:11,fontWeight:600,color:margin<15?'#B91C1C':margin<25?'#92400E':'#15803D'}}>
          Faida Rejareja: {margin}% {margin<15?'⚠️ Ndogo sana!':margin<25?'⚡ Wastani':'✅ Nzuri'}
        </div>}
      </div>
      {/* === BEI YA JUMLA — inaonyeshwa tu kama feature imewashwa === */}
      {hasWholesale&&<div style={{background:'#FFF8E6',borderRadius:10,padding:'10px 12px',marginBottom:10,border:'1.5px solid #F2D98B'}}>
        <div style={{fontSize:11,fontWeight:700,color:'#C2410C',marginBottom:8}}>📦 BEI YA JUMLA (Wholesale)</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <Input label="Bei Kuuza (Jumla)" type="number" value={f.wholesale_price} onChange={e=>setF({...f,wholesale_price:e.target.value})} placeholder="Bei nafuu zaidi"/>
          <Input label="Kiwango Kidogo (Qty)" type="number" value={f.wholesale_min_qty} onChange={e=>setF({...f,wholesale_min_qty:e.target.value})} placeholder="5"/>
        </div>
        {wMargin!==null&&<div style={{background:'#FFF8E6',borderRadius:8,padding:'5px 10px',marginTop:6,fontSize:11,fontWeight:600,color:'#92400E'}}>
          Faida Jumla: {wMargin}% • Bei ya jumla ikipungua chini ya {f.wholesale_min_qty||5} vipande → itumia bei ya rejareja
        </div>}
        {!f.wholesale_price&&<div style={{fontSize:10,color:'#9AA5A0',marginTop:4}}>💡 Acha tupu kama bidhaa hii haina bei ya jumla</div>}
      </div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Input label="Kiasi" type="number" value={f.quantity} onChange={e=>setF({...f,quantity:e.target.value})}/>
        <Input label="Min Stock" type="number" value={f.min_stock} onChange={e=>setF({...f,min_stock:e.target.value})}/>
      </div>
      <Input label="Expiry Date" type="date" value={f.expiry_date} onChange={e=>setF({...f,expiry_date:e.target.value})}/>
      <Btn onClick={()=>{if(!f.name||!f.buy_price||!f.sell_price)return alert('Jaza!');onSave({...f,buy_price:+f.buy_price,sell_price:+f.sell_price,wholesale_price:f.wholesale_price?+f.wholesale_price:null,wholesale_min_qty:f.wholesale_min_qty?+f.wholesale_min_qty:5,quantity:+f.quantity||0,min_stock:+f.min_stock||5,expiry_date:f.expiry_date||null})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
    </div>;
  };
  return <div className="page-enter">
    {/* Branch indicator + onyo */}
    {canUseBranches&&<div style={{marginBottom:12}}>
      {activeBranch?(
        <div style={{background:'#E6F2EC',border:'1.5px solid #C2DED1',borderRadius:10,padding:'8px 14px',display:'flex',alignItems:'center',gap:8,fontSize:13}}>
          <span style={{fontSize:16}}>🏪</span>
          <span style={{color:'#15803D',fontWeight:600}}>Unaongeza bidhaa kwa: {currentBranch?.name||'Tawi hili'}</span>
        </div>
      ):(
        <div style={{background:'#FFF8E6',border:'1.5px solid #F2D98B',borderRadius:10,padding:'8px 14px',display:'flex',alignItems:'center',gap:8,fontSize:13}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span style={{color:'#9A3412',fontWeight:600}}>Uko "Matawi Yote". Chagua tawi kwenye menu ya pembeni ili kuongeza bidhaa kwa tawi maalum.</span>
        </div>
      )}
    </div>}
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <div style={{position:'relative',flex:'1 1 200px',maxWidth:300}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9AA5A0'}}>{IC.find}</span><input placeholder="Tafuta..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 10px 10px 36px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box'}}/></div>
      <div style={{display:'flex',gap:8}}>
        {canUseBranches&&myBranches.length>=2&&<Btn v="ghost" onClick={()=>setCopyModal(true)} style={{background:'#EFF6FF',color:'#2563EB'}}>📋 Nakili kwa Tawi</Btn>}
        <Btn onClick={()=>setModal({open:true,data:null})}>{IC.plus} Ongeza</Btn>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
      {filtered.map(p=>{const isExp=p.expiry_date&&new Date(p.expiry_date)<new Date();const margin=p.buy_price&&p.sell_price?((p.sell_price-p.buy_price)/p.sell_price*100):100;
        return <div key={p.id} style={{background:'#fff',borderRadius:14,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:isExp?'2px solid #C2412D':p.quantity<=p.min_stock?`2px solid ${p.quantity===0?'#C2412D':'#F2B705'}`:'1px solid #D6E2DB'}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:32}}>{p.image||'📦'}</span><div style={{display:'flex',gap:4}}>
          <button onClick={()=>setModal({open:true,data:p})} style={{background:'#F6F8F7',border:'none',borderRadius:6,padding:5,color:'#475569',cursor:'pointer'}}>{IC.gear}</button>
          <button onClick={()=>window.confirm(`Futa "${p.name}"?`)&&deleteProduct(p.id)} style={{background:'#FBECE9',border:'none',borderRadius:6,padding:5,color:'#C2412D',cursor:'pointer'}}>{IC.del}</button>
        </div></div>
        <div style={{fontWeight:700,fontSize:14,marginTop:6}}>{p.name}</div>
        <div style={{fontSize:12,color:'#5C6A62',marginTop:2}}>{p.category} • {p.unit}</div>
        {canUseBranches&&p.branch_id&&(()=>{const br=myBranches.find(b=>b.id===p.branch_id);return br?<div style={{fontSize:10,color:'#0A6E47',marginTop:2,fontWeight:600}}>🏪 {br.name}</div>:null;})()}
        {canUseBranches&&!p.branch_id&&<div style={{fontSize:10,color:'#9AA5A0',marginTop:2}}>📦 Bidhaa ya jumla</div>}
        {isExp&&<Badge color="#C2412D">EXPIRED</Badge>}
        {margin<15&&!isExp&&<Badge color="#F2B705">Faida {margin.toFixed(0)}%</Badge>}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
          <div><div style={{fontSize:10,color:'#9AA5A0'}}>Bei Kuuza</div><div style={{fontWeight:700,color:'#0A6E47',fontSize:14}}>TZS {p.sell_price?.toLocaleString()}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'#9AA5A0'}}>Stock</div><div style={{fontWeight:700,fontSize:14,color:p.quantity===0?'#C2412D':p.quantity<=p.min_stock?'#F2B705':'#17231D'}}>{p.quantity}</div></div>
        </div>
      </div>})}
    </div>
    {!filtered.length&&<Empty text={search?'Hakuna':'Ongeza bidhaa'}/>}
    <Modal open={modal.open} onClose={()=>{setModal({open:false});setDupErr('')}} title={modal.data?'Hariri':'Ongeza Bidhaa'}>
      {dupErr&&<div style={{background:'#FFF8E6',border:'2px solid #F2B705',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:600,color:'#92400E'}}>⚠️ {dupErr}</div>}
      <ProdForm init={modal.data||{}} onSave={async pr=>{
        if(modal.data){updateProduct(modal.data.id,pr);setModal({open:false});setDupErr('');}
        else{
          const result=await addProduct(pr);
          if(result?.duplicate){setDupErr(result.error);}
          else{setModal({open:false});setDupErr('');}
        }
      }}/>
    </Modal>
    {/* Nakili Bidhaa kwa Tawi Lingine */}
    <Modal open={copyModal} onClose={()=>{setCopyModal(false);setCopyTo('')}} title="📋 Nakili Bidhaa kwa Tawi">
      <div style={{fontSize:13,color:'#5C6A62',marginBottom:14,lineHeight:1.5}}>
        Bidhaa za {activeBranch?(myBranches.find(b=>b.id===activeBranch)?.name||'tawi hili'):'jumla'} zitanakiliwa kwa tawi utakalochagua. Stock itaanza 0 — utajaza baadaye.
      </div>
      <Sel label="Nakili kwenda tawi:" value={copyTo} onChange={e=>setCopyTo(e.target.value)} options={[
        {value:'',label:'-- Chagua Tawi --'},
        ...myBranches.filter(b=>b.id!==activeBranch).map(b=>({value:b.id,label:b.name})),
      ]}/>
      <Btn disabled={!copyTo||copying} onClick={async()=>{
        setCopying(true);
        const r=await copyProductsToBranch(activeBranch||null,copyTo);
        setCopying(false);
        if(r.success){alert(`✅ Bidhaa ${r.copied} zimenakiliwa! Nenda tawi hilo ujaze stock.`);setCopyModal(false);setCopyTo('');}
        else{alert('⚠️ '+r.error);}
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{copying?'Inanakili...':'Nakili Sasa'}</Btn>
    </Modal>
  </div>;
}

// ===== RETURN/REFUND =====
export function ReturnsPage(){
  const{sales,returns,processReturn,customers,currency,returnableUnits}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[modal,setModal]=useState(false);const[saleId,setSaleId]=useState('');const[reason,setReason]=useState('');const[retItems,setRetItems]=useState([]);
  const sale=sales.find(s=>s.id===saleId);
  const cust=sale?.customer_id?customers.find(c=>c.id===sale.customer_id):null;

  // Bidhaa iliyouzwa mara moja iliweza kurudishwa mara 10, kwa sababu
  // marejesho ya awali hayakuhesabiwa. Sasa tunaonyesha ILIYOBAKI.
  const handleSelectSale=(sid)=>{
    setSaleId(sid);
    const s=sales.find(x=>x.id===sid);
    if(!s){setRetItems([]);return}
    const left=returnableUnits?.(s)||new Map();
    setRetItems((s.items||[]).map(i=>{
      const f=i.fraction||1;
      const kiasi=(left.get(String(i.productId))||0)/f;   // kwa idadi, si vipimo
      return {...i,returnQty:0,maxQty:Math.max(0,kiasi),alreadyBack:(+i.qty||0)-Math.max(0,kiasi)};
    }));
  };

  // Calculate total refund considering fractions
  const totalRefund=retItems.reduce((s,i)=>s+(i.returnQty||0)*i.price*(i.fraction||1),0);
  const zoteZimerudishwa=retItems.length>0&&retItems.every(i=>(i.maxQty||0)<=0);

  const doReturn=async()=>{
    if(!saleId||!reason)return alert('Chagua mauzo na weka sababu!');
    const items=retItems.filter(i=>i.returnQty>0).map(i=>({productId:i.productId,name:i.name,price:i.price,qty:i.returnQty,fraction:i.fraction||1,fractionLabel:i.fractionLabel,
      // Hifadhi gharama ili faida iliyopunguzwa iwe sahihi
      ...(i.cost!==undefined?{cost:i.cost}:i.buyPrice!==undefined?{buyPrice:i.buyPrice}:{})}));
    if(!items.length)return alert('Chagua bidhaa za kurudisha!');
    const r=await processReturn(saleId,items,reason);
    if(r?.error)return alert('⚠️ '+r.error);
    const isCredit=sale?.payment_method==='credit';
    const kiasi=r?.refund_amount!=null?+r.refund_amount:totalRefund;
    alert(`✅ Bidhaa zimerudishwa!\n\n📦 Stock imeongezeka kwa idadi sahihi\n💰 Rejesho: TZS ${kiasi.toLocaleString()}${isCredit?'\n💳 Deni la mteja limepunguzwa':''}`);
    setModal(false);setSaleId('');setReason('');setRetItems([]);
  };

  return <div className="page-enter">
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <div>
        <h3 style={{fontSize:18,fontWeight:800,margin:0,color:'#0A6E47'}}>↩️ Bidhaa Zilizorudishwa</h3>
        <p style={{fontSize:12,color:'#5C6A62',margin:'4px 0 0'}}>Stock inarudi automatic, deni linapunguzwa kama bidhaa ilikopwa</p>
      </div>
      <Btn onClick={()=>setModal(true)}>{IC.refresh} Rudisha Bidhaa</Btn>
    </div>
    
    {/* Stats */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14,textAlign:'center'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>JUMLA</div>
        <div style={{fontSize:22,fontWeight:900,color:'#0A6E47'}}>{returns.length}</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>JUMLA YA REJESHO</div>
        <div style={{fontSize:18,fontWeight:900,color:'#C2412D'}}>{fm(returns.reduce((s,r)=>s+(r.refund_amount||0),0))}</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>YA MADENI</div>
        <div style={{fontSize:22,fontWeight:900,color:'#F2B705'}}>{returns.filter(r=>r.was_credit).length}</div>
      </div>
    </div>
    
    <div className="card">
      {returns.length?returns.map(r=><div key={r.id} style={{padding:'12px 0',borderBottom:'1px solid #F6F8F7'}}>
        <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontWeight:700,fontSize:13,color:'#17231D'}}>
              {r.items?.map(i=>{
                const f=i.fraction&&i.fraction!==1?` (${i.fractionLabel||i.fraction})`:'';
                return `${i.name}${f} x${i.qty}`;
              }).join(', ')}
            </div>
            <div style={{fontSize:11,color:'#5C6A62',marginTop:2}}>📝 {r.reason}</div>
            <div style={{fontSize:10,color:'#9AA5A0',marginTop:2}}>📅 {fmtDate(r.created_at)} {r.was_credit&&<span style={{background:'#FFF8E6',color:'#92400E',padding:'2px 8px',borderRadius:6,marginLeft:6,fontWeight:700}}>💳 ILIKOPWA</span>}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'#9AA5A0'}}>Rejesho:</div>
            <div style={{fontWeight:900,color:'#C2412D',fontSize:15}}>{fm(r.refund_amount)}</div>
          </div>
        </div>
      </div>):<Empty icon="↩️" text="Hakuna bidhaa zilizorudishwa"/>}
    </div>

    <Modal open={modal} onClose={()=>setModal(false)} title="↩️ Rudisha Bidhaa" wide>
      <Sel label="Chagua Mauzo" value={saleId} onChange={e=>handleSelectSale(e.target.value)} options={[{value:'',label:'-- Chagua mauzo --'},...sales.slice(0,30).map(s=>{
        const c=s.customer_id?customers.find(x=>x.id===s.customer_id):null;
        const m=s.payment_method==='credit'?'💳 DENI':'💰 TASLIMU';
        return{value:s.id,label:`#${s.id?.slice(0,8)} • ${fm(s.total)} • ${m}${c?' • '+c.name:''} • ${fmtDate(s.created_at)}`};
      })]}/>
      
      {sale&&<>
        {sale.payment_method==='credit'&&cust&&<div style={{background:'#FFF8E6',border:'1px solid #FCD34D',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#92400E'}}>
          💳 <b>Mauzo ya Deni:</b> Mteja {cust.name} alichukua bidhaa kwa deni la TZS {(sale.total||0).toLocaleString()}.<br/>
          <b>Deni lake litapunguzwa automatic</b> kulingana na thamani ya bidhaa zinazorudishwa.
        </div>}
        
        {zoteZimerudishwa&&<div style={{background:'#FBECE9',border:'1px solid #C2412D',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#C2412D',fontWeight:700}}>
          ⚠️ Mauzo haya yamerudishwa <b>yote</b>. Hakuna bidhaa iliyobaki.
        </div>}

        <div style={{background:'#F6F8F7',borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0A6E47',marginBottom:8}}>Chagua Bidhaa za Kurudisha:</div>
          {retItems.map((item,i)=>{
            const f=item.fraction&&item.fraction!==1?` (${item.fractionLabel||item.fraction})`:'';
            const itemTotal=(item.returnQty||0)*item.price*(item.fraction||1);
            return <div key={i} style={{padding:'10px',background:'#fff',borderRadius:8,marginBottom:6,border:item.returnQty>0?'1.5px solid #C2DED1':'1px solid #D6E2DB'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontWeight:700,fontSize:13}}>{item.name}{f}</div>
                  <div style={{fontSize:11,color:'#5C6A62'}}>Alinunua: <b>{item.qty}</b> • Bei: <b>{fm(item.price*(item.fraction||1))}</b></div>
                  {(item.alreadyBack||0)>0&&<div style={{fontSize:10.5,color:'#C2412D',fontWeight:700,marginTop:2}}>
                    ↩️ Imerudishwa: {item.alreadyBack} • Zimebaki: {item.maxQty||0}
                  </div>}
                  {(item.maxQty||0)<=0&&<div style={{fontSize:10.5,color:'#9AA5A0',fontWeight:700,marginTop:2}}>
                    Imerudishwa yote — haiwezi kurudishwa tena
                  </div>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:'#475569',fontWeight:600}}>Rudisha:</span>
                  <button disabled={(item.maxQty||0)<=0} onClick={()=>setRetItems(retItems.map((x,j)=>j===i?{...x,returnQty:Math.max(0,(x.returnQty||0)-1)}:x))} style={{width:28,height:28,borderRadius:6,border:'none',background:'#F6F8F7',fontWeight:700,fontSize:14,cursor:'pointer',opacity:(item.maxQty||0)<=0?.4:1}}>−</button>
                  <input type="number" min="0" max={item.maxQty||0} disabled={(item.maxQty||0)<=0} value={item.returnQty||0} onChange={e=>setRetItems(retItems.map((x,j)=>j===i?{...x,returnQty:Math.min(Math.max(0,+e.target.value||0),x.maxQty||0)}:x))} style={{width:50,padding:'4px 6px',borderRadius:6,border:'1px solid #D6E2DB',textAlign:'center',fontWeight:700}}/>
                  <button disabled={(item.maxQty||0)<=0} onClick={()=>setRetItems(retItems.map((x,j)=>j===i?{...x,returnQty:Math.min((x.returnQty||0)+1,x.maxQty||0)}:x))} style={{width:28,height:28,borderRadius:6,border:'none',background:'#E6F2EC',color:'#0A6E47',fontWeight:700,fontSize:14,cursor:'pointer',opacity:(item.maxQty||0)<=0?.4:1}}>+</button>
                  {item.returnQty>0&&<div style={{fontWeight:800,color:'#C2412D',fontSize:13,minWidth:80,textAlign:'right'}}>−{fm(itemTotal)}</div>}
                </div>
              </div>
            </div>;
          })}
        </div>
        
        {totalRefund>0&&<div style={{background:'#FBECE9',border:'1.5px solid #FCA5A5',borderRadius:10,padding:'12px 16px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700,color:'#991B1B'}}>💰 JUMLA YA REJESHO:</div>
          <div style={{fontSize:20,fontWeight:900,color:'#C2412D'}}>{fm(totalRefund)}</div>
        </div>}
        
        <Input label="Sababu ya Kurudisha" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Mf: Bidhaa imeharibika, hakipendi, n.k."/>
        <Btn onClick={doReturn} v="danger" style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.refresh} Kamilisha Kurudisha</Btn>
      </>}
    </Modal>
  </div>;
}

// ===== REPORTS =====
// Kadi inayojifunua (collapsible) — kwa sehemu za ziada za report
function CollapseCard({title,count,children,open:openDefault=false}){
  const[open,setOpen]=useState(openDefault);
  return <div style={{background:'#fff',borderRadius:16,marginBottom:12,border:'1px solid #ECFDF5',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',overflow:'hidden'}}>
    <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:'none',border:'none',cursor:'pointer'}}>
      <span style={{fontSize:14,fontWeight:800,color:'#0A6E47'}}>{title}{count!=null&&<span style={{marginLeft:7,fontSize:11,color:'#9AA5A0',fontWeight:600}}>({count})</span>}</span>
      <span style={{fontSize:14,color:'#0A6E47',transform:open?'rotate(180deg)':'none',transition:'transform .2s'}}>▼</span>
    </button>
    {open&&<div style={{padding:'0 16px 16px'}}>{children}</div>}
  </div>;
}

export function ReportsPage({onReceipt}){
  const{biz,sales,returns,products,expenses,purchases=[],currency,creditHistory=[],allSales,allExpenses,branches,canUseBranches,getBranches,activeBranch}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[tab,setTab]=useState('day');
  const myBranches=canUseBranches?getBranches():[];
  
  // Custom date range
  const today=todayStr();
  const monthStart=localDateStr(new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const[customFrom,setCustomFrom]=useState(monthStart);
  const[customTo,setCustomTo]=useState(today);
  
  // Filter function based on selected tab (tarehe za NDANI — hazirukwi tarehe)
  const filterByDate=(dateStr)=>{
    if(!dateStr)return false;
    if(tab==='day')return isToday(dateStr);
    if(tab==='week')return isThisWeek(dateStr);
    if(tab==='month')return isThisMonth(dateStr);
    if(tab==='custom')return inDateRange(dateStr,customFrom,customTo);
    return false;
  };
  
  // ===== MONTHLY STATEMENTS — Past months breakdown =====
  const monthlyStats=React.useMemo(()=>{
    const map={};
    sales.forEach(s=>{
      const ym=localDateStr(s.created_at).slice(0,7);
      if(!ym)return;
      if(!map[ym])map[ym]={total:0,profit:0,count:0,refunds:0,refundProfit:0};
      map[ym].total+=s.total||0;
      map[ym].profit+=s.profit||0;
      map[ym].count++;
    });
    (returns||[]).forEach(r=>{
      const ym=localDateStr(r.created_at).slice(0,7);
      if(!ym)return;
      if(!map[ym])map[ym]={total:0,profit:0,count:0,refunds:0,refundProfit:0};
      map[ym].refunds+=r.refund_amount||0;
      // Subtract profit from returns
      (r.items||[]).forEach(item=>{
        const prod=products.find(p=>p.id===item.productId);
        const bp=prod?.buy_price||0;
        map[ym].refundProfit+=item.qty*(item.price-bp)*(item.fraction||1);
      });
    });
    // Convert to list, sorted DESC (latest first)
    return Object.entries(map).map(([ym,v])=>({
      ym,
      label:new Date(ym+'-01').toLocaleDateString('sw-TZ',{month:'long',year:'numeric'}),
      total:v.total,
      profit:v.profit,
      count:v.count,
      refunds:v.refunds,
      refundProfit:v.refundProfit,
      netSales:Math.max(0,v.total-v.refunds),
      netProfit:Math.max(0,v.profit-v.refundProfit),
    })).sort((a,b)=>b.ym.localeCompare(a.ym));
  },[sales,returns,products]);
  
  const fSales=sales.filter(s=>filterByDate(s.created_at));
  const fReturns=(returns||[]).filter(r=>filterByDate(r.created_at));
  
  // ===== CASH vs CREDIT separation =====
  const fCashSales=fSales.filter(s=>s.payment_method!=='credit');
  const fCreditSales=fSales.filter(s=>s.payment_method==='credit');
  
  // Credit payments received in this period
  const fCreditPayments=creditHistory.filter(t=>t.type==='payment'&&filterByDate(t.created_at));
  const fCreditPaymentTotal=fCreditPayments.reduce((s,p)=>s+(p.amount||0),0);
  
  // Gross sales (before returns) — for analytics only
  const grossTotal=fSales.reduce((a,s)=>a+s.total,0);
  const grossProfit=fSales.reduce((a,s)=>a+s.profit,0);
  
  // CASH-only totals (what shows on dashboard)
  const cashSalesTotal=fCashSales.reduce((a,s)=>a+s.total,0);
  const cashSalesProfit=fCashSales.reduce((a,s)=>a+s.profit,0);
  const creditSalesTotal=fCreditSales.reduce((a,s)=>a+s.total,0);
  
  // Refund amount (cash refunds only — credit refunds reduce credit_balance not cash)
  const refundTotal=fReturns.reduce((a,r)=>a+(r.refund_amount||0),0);
  const cashRefundTotal=fReturns.filter(r=>!r.was_credit).reduce((a,r)=>a+(r.refund_amount||0),0);
  
  // Profit lost from returns
  const refundProfit=fReturns.reduce((sum,r)=>sum+((r.items||[]).reduce((s,i)=>{
    const prod=products.find(p=>p.id===i.productId);
    const buyPrice=prod?.buy_price||0;
    return s+i.qty*(i.price-buyPrice)*(i.fraction||1);
  },0)),0);
  
  // ===== Net cash income (REAL income for the period) =====
  // = Cash sales + Credit payments received - Cash refunds
  const fTotal=Math.max(0,cashSalesTotal+fCreditPaymentTotal-cashRefundTotal);
  
  // Profit on cash basis (only count profit when cash received)
  const fProfit=Math.max(0,cashSalesProfit-refundProfit);
  
  const fExp=expenses.filter(e=>filterByDate(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  // Manunuzi ya stock (pesa ya duka) ya kipindi — yanapunguza pesa mkononi, si faida
  const fStockBuy=purchases.filter(p=>p.source==='shop'&&filterByDate(p.created_at)).reduce((a,p)=>a+(p.total||0),0);
  const fBankAmount=Math.max(0,fTotal-fExp-fStockBuy);
  // CHANZO KIMOJA: hesabu zinazolingana na Dashboard/email
  const fPurch=purchases.filter(p=>filterByDate(p.created_at));
  const fin=computePeriodFinance({sales:fSales,returns:fReturns,expenses:expenses.filter(e=>filterByDate(e.created_at)),purchases:fPurch,creditHistory:creditHistory.filter(t=>filterByDate(t.created_at))});
  const staffMap={};fSales.forEach(s=>{const n=s.seller_name||'?';staffMap[n]=(staffMap[n]||0)+s.total});const staffData=Object.entries(staffMap).map(([n,t])=>({name:n,total:t}));
  // ===== FAIDA KWA MFANYAKAZI (net + profit + count) =====
  const staffStats=React.useMemo(()=>{
    const m={};
    fSales.forEach(s=>{const n=s.seller_name||'Hajatajwa';if(!m[n])m[n]={name:n,sales:0,profit:0,count:0};m[n].sales+=s.total||0;m[n].profit+=s.profit||0;m[n].count++;});
    return Object.values(m).sort((a,b)=>b.profit-a.profit);
  },[fSales]);
  // ===== MAUZO KWA KATEGORIA =====
  const categoryData=React.useMemo(()=>{
    const m={};
    fSales.forEach(s=>(s.items||[]).forEach(it=>{
      const prod=products.find(p=>p.id===it.productId||p.name===it.name);
      const cat=prod?.category||'Nyingine';
      if(!m[cat])m[cat]={category:cat,revenue:0,profit:0,qty:0};
      const q=(it.qty||0)*(it.fraction||1);
      m[cat].revenue+=(it.qty||0)*(it.price||0)*(it.fraction||1);
      m[cat].profit+=(it.qty||0)*((it.price||0)-(it.buyPrice||it.buy_price||0))*(it.fraction||1);
      m[cat].qty+=q;
    }));
    const total=Object.values(m).reduce((a,c)=>a+c.revenue,0)||1;
    return Object.values(m).map(c=>({...c,pct:Math.round(c.revenue/total*100)})).sort((a,b)=>b.revenue-a.revenue);
  },[fSales,products]);
  const prodMap={};fSales.forEach(s=>s.items?.forEach(i=>{prodMap[i.name]=(prodMap[i.name]||0)+i.qty}));const topProds=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  
  // ===== ORODHA YA BIDHAA ZILIZOUZWA — Per period with stock remaining =====
  const productsSold=React.useMemo(()=>{
    const map={};
    fSales.forEach(s=>{
      (s.items||[]).forEach(item=>{
        const pid=item.productId;
        if(!map[pid]){
          const product=products.find(p=>p.id===pid);
          map[pid]={
            id:pid,
            name:item.name,
            category:product?.category||'Nyingine',
            image:product?.image||'📦',
            unit:product?.unit||'Kipande',
            sellPrice:item.price,
            qtySold:0,
            revenue:0,
            profit:0,
            returned:0,
            stockRemaining:product?.quantity||0,
            minStock:product?.min_stock||5,
            salesCount:0,
          };
        }
        const qty=item.qty*(item.fraction||1);
        map[pid].qtySold+=qty;
        map[pid].revenue+=item.qty*item.price*(item.fraction||1);
        map[pid].profit+=item.qty*(item.price-(item.buyPrice||0))*(item.fraction||1);
        map[pid].salesCount++;
      });
    });
    fReturns.forEach(r=>{
      (r.items||[]).forEach(item=>{
        if(map[item.productId])map[item.productId].returned+=item.qty*(item.fraction||1);
      });
    });
    return Object.values(map)
      .map(p=>({...p,netSold:Math.max(0,p.qtySold-p.returned)}))
      .sort((a,b)=>b.netSold-a.netSold);
  },[fSales,fReturns,products]);
  
  // Export products list to PDF
  const exportProductsList=()=>{
    const rows=productsSold.map((p,i)=>[
      i+1,p.name,p.category,
      p.netSold.toFixed(1)+' '+p.unit,
      fm(p.revenue),
      p.stockRemaining.toFixed(1)+' '+p.unit,
      p.stockRemaining<=0?'Hakuna':p.stockRemaining<=p.minStock?'Ndogo':'Sawa',
    ]);
    const totalQty=productsSold.reduce((s,p)=>s+p.netSold,0);
    const totalRev=productsSold.reduce((s,p)=>s+p.revenue,0);
    rows.push(['','JUMLA','',totalQty.toFixed(1),fm(totalRev),'','']);
    exportToPDF(
      `Orodha ya Bidhaa Zilizouzwa — ${periodLabel}`,
      ['#','Bidhaa','Aina','Zilizouzwa','Mapato','Stock Iliyobaki','Hali'],
      rows,
      `bidhaa-zilizouzwa-${tab}-${Date.now()}.pdf`
    );
  };
  
  // Quick range setters
  const setQuickRange=(type)=>{
    const now=new Date();
    let from,to;
    if(type==='thisMonth'){
      from=new Date(now.getFullYear(),now.getMonth(),1);
      to=now;
    }else if(type==='lastMonth'){
      from=new Date(now.getFullYear(),now.getMonth()-1,1);
      to=new Date(now.getFullYear(),now.getMonth(),0);
    }else if(type==='last3Months'){
      from=new Date(now.getFullYear(),now.getMonth()-3,1);
      to=now;
    }else if(type==='thisYear'){
      from=new Date(now.getFullYear(),0,1);
      to=now;
    }else if(type==='lastYear'){
      from=new Date(now.getFullYear()-1,0,1);
      to=new Date(now.getFullYear()-1,11,31);
    }
    setCustomFrom(localDateStr(from));
    setCustomTo(localDateStr(to));
  };
  
  // Period label
  const periodLabel=tab==='day'?'Leo':tab==='week'?'Wiki Hii':tab==='month'?'Mwezi Huu':tab==='custom'?`${customFrom} → ${customTo}`:tab==='history'?'Mahesabu ya Nyuma':'';
  
  // Export PDF
  const doExport=()=>{
    const rows=fSales.map(s=>[fmtDate(s.created_at),s.items?.map(i=>i.name).join(', ').slice(0,30),s.seller_name||'-',payLabel(s.payment_method),Math.round(s.total||0).toLocaleString()]);
    // Muhtasari wa fedha
    rows.push(['','','','','']);
    rows.push(['MUHTASARI','','','','']);
    rows.push(['Mauzo Ghafi','','','',Math.round(fin.grossSales).toLocaleString()]);
    rows.push(['Faida Ghafi','','','',Math.round(fin.grossProfit).toLocaleString()]);
    rows.push(['Matumizi','','','','-'+Math.round(fin.totalExpenses).toLocaleString()]);
    rows.push(['Manunuzi ya stock','','','','-'+Math.round(fin.stockBuyShop).toLocaleString()]);
    if(fin.cashRefunds>0)rows.push(['Marejesho','','','','-'+Math.round(fin.cashRefunds).toLocaleString()]);
    rows.push(['PESA MKONONI','','','',Math.round(fin.netCash).toLocaleString()]);
    rows.push(['FAIDA HALISI','','','',Math.round(fin.netProfit).toLocaleString()]);
    exportToPDF(`Ripoti ya Fedha — ${periodLabel}`,['Tarehe','Bidhaa','Muuzaji','Malipo','Jumla (TZS)'],rows,`ripoti-${tab}-${Date.now()}.pdf`);
  };

  // Export Excel (CSV) — mauzo ya kipindi + muhtasari wa fedha
  const doExportExcel=()=>{
    const rows=fSales.map(s=>[fmtDate(s.created_at),s.items?.map(i=>`${i.name} x${i.qty}`).join('; '),s.seller_name||'-',payLabel(s.payment_method),Math.round(s.total||0),Math.round(s.profit||0)]);
    rows.push(['','','','','','']);
    rows.push(['MUHTASARI WA FEDHA','','','','','']);
    rows.push(['Mauzo Ghafi','','','','',Math.round(fin.grossSales)]);
    rows.push(['Faida Ghafi','','','','',Math.round(fin.grossProfit)]);
    rows.push(['Matumizi','','','','',-Math.round(fin.totalExpenses)]);
    rows.push(['Manunuzi ya stock (pesa ya duka)','','','','',-Math.round(fin.stockBuyShop)]);
    rows.push(['Marejesho','','','','',-Math.round(fin.cashRefunds)]);
    rows.push(['PESA MKONONI','','','','',Math.round(fin.netCash)]);
    rows.push(['FAIDA HALISI','','','','',Math.round(fin.netProfit)]);
    exportToCSV(`Ripoti ya Mauzo - ${periodLabel}`,['Tarehe','Bidhaa','Muuzaji','Malipo','Jumla (TZS)','Faida (TZS)'],rows,`ripoti-${tab}-${Date.now()}.csv`);
  };

  // Export Excel (CSV) — bidhaa zilizouzwa
  const exportProductsExcel=()=>{
    const rows=productsSold.map((p,i)=>[i+1,p.name,p.category,p.netSold.toFixed(1),p.unit,Math.round(p.revenue),Math.round(p.profit),p.stockRemaining.toFixed(1),p.stockRemaining<=0?'Hakuna':p.stockRemaining<=p.minStock?'Ndogo':'Sawa']);
    const totalQty=productsSold.reduce((s,p)=>s+p.netSold,0);
    const totalRev=productsSold.reduce((s,p)=>s+p.revenue,0);
    const totalProf=productsSold.reduce((s,p)=>s+p.profit,0);
    rows.push(['','JUMLA','',totalQty.toFixed(1),'',Math.round(totalRev),Math.round(totalProf),'','']);
    exportToCSV(`Bidhaa Zilizouzwa - ${periodLabel}`,['#','Bidhaa','Aina','Zilizouzwa','Kipimo','Mapato (TZS)','Faida (TZS)','Stock Iliyobaki','Hali'],rows,`bidhaa-${tab}-${Date.now()}.csv`);
  };

  // ===== Mchanganuo wa njia za malipo (kipindi) =====
  const payBreakdown=React.useMemo(()=>{
    const map={};
    fSales.forEach(s=>{const m=s.payment_method||'cash';if(!map[m])map[m]={method:m,total:0,count:0};map[m].total+=s.total||0;map[m].count++;});
    return Object.values(map).sort((a,b)=>b.total-a.total);
  },[fSales]);

  // ===== Mwenendo wa mauzo kwa siku (kipindi) =====
  const trendData=React.useMemo(()=>{
    const map={};
    fSales.forEach(s=>{const d=localDateStr(s.created_at);if(!d)return;if(!map[d])map[d]=0;map[d]+=s.total||0;});
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,total])=>({day:d.slice(5),total}));
  },[fSales]);

  // ===== MAUZO KWA KILA TAREHE (kila siku ya kipindi inaonekana, hata zenye sifuri) =====
  const dailyBreakdown=React.useMemo(()=>{
    // Kusanya mauzo kwa kila tarehe (EAT)
    const map={};
    fSales.forEach(s=>{
      const d=localDateStr(s.created_at);if(!d)return;
      if(!map[d])map[d]={sales:0,profit:0,count:0};
      map[d].sales+=s.total||0;map[d].profit+=s.profit||0;map[d].count++;
    });
    // Tengeneza orodha ya tarehe zote za kipindi
    let dates=[];
    if(tab==='custom'&&customFrom&&customTo){
      dates=dateRangeList(customFrom,customTo);                 // tarehe 1..20 zote
    }else{
      dates=Object.keys(map).sort();                            // siku zenye mauzo tu (day/week/month)
    }
    // Kama custom ina siku nyingi mno, bado tunaonyesha zote; lakini kwa usalama tunaweka kikomo cha onyesho
    return dates.map(d=>({
      date:d,
      label:(()=>{const p=d.split('-');return p.length===3?`${p[2]}/${p[1]}`:d;})(),
      sales:map[d]?.sales||0,
      profit:map[d]?.profit||0,
      count:map[d]?.count||0,
    }));
  },[fSales,tab,customFrom,customTo]);
  
  // payMap kwa statement (njia za malipo)
  const payMapObj=React.useMemo(()=>{
    const m={};
    fSales.forEach(s=>{const k=s.payment_method||'cash';if(!m[k])m[k]={total:0,count:0};m[k].total+=s.total||0;m[k].count++;});
    return m;
  },[fSales]);

  // ===== STATEMENT KAMILI YA PDF (kipindi/tarehe maalum) =====
  const doExportStatement=()=>{
    exportStatementPDF({
      biz,
      periodLabel,
      from: tab==='custom'?customFrom:'',
      to: tab==='custom'?customTo:'',
      fin, sales:fSales, returns:fReturns, currency:currency||'TZS', payMap:payMapObj,
    });
  };

  // Export monthly statement — sasa inatumia statement kamili
  const exportMonthlyStatement=(month)=>{
    const ms=sales.filter(s=>localDateStr(s.created_at).startsWith(month.ym));
    const mReturns=(returns||[]).filter(r=>localDateStr(r.created_at).startsWith(month.ym));
    const mExp=expenses.filter(e=>localDateStr(e.created_at).startsWith(month.ym));
    const mPurch=purchases.filter(p=>localDateStr(p.created_at).startsWith(month.ym));
    const mCredit=creditHistory.filter(t=>localDateStr(t.created_at).startsWith(month.ym));
    const mfin=computePeriodFinance({sales:ms,returns:mReturns,expenses:mExp,purchases:mPurch,creditHistory:mCredit});
    const pm={};ms.forEach(s=>{const k=s.payment_method||'cash';if(!pm[k])pm[k]={total:0,count:0};pm[k].total+=s.total||0;pm[k].count++;});
    exportStatementPDF({
      biz, periodLabel:month.label,
      from:month.ym+'-01', to:month.ym+'-'+String(new Date(+month.ym.slice(0,4),+month.ym.slice(5,7),0).getDate()).padStart(2,'0'),
      fin:mfin, sales:ms, returns:mReturns, currency:currency||'TZS', payMap:pm,
    });
  };

  // ===== ULINGANISHO NA KIPINDI KILICHOPITA (kwa mishale ya KPI) =====
  const prevFin=React.useMemo(()=>{
    let pf=null,pt=null;
    const d=new Date();
    if(tab==='day'){const y=new Date(d.getTime()-86400000);pf=pt=localDateStr(y);}
    else if(tab==='week'){const s=new Date(d.getFullYear(),d.getMonth(),d.getDate()-d.getDay()-7);pf=localDateStr(s);pt=localDateStr(new Date(s.getTime()+6*86400000));}
    else if(tab==='month'){const s=new Date(d.getFullYear(),d.getMonth()-1,1);const e=new Date(d.getFullYear(),d.getMonth(),0);pf=localDateStr(s);pt=localDateStr(e);}
    else if(tab==='custom'&&customFrom&&customTo){
      const a=new Date(customFrom+'T00:00:00Z'),b=new Date(customTo+'T00:00:00Z');
      const span=Math.round((b-a)/86400000)+1;
      pt=localDateStr(new Date(a.getTime()-86400000));
      pf=localDateStr(new Date(a.getTime()-span*86400000));
    }
    if(!pf||!pt)return null;
    const inPrev=(x)=>{const ds=localDateStr(x);return ds>=pf&&ds<=pt;};
    return computePeriodFinance({
      sales:sales.filter(s=>inPrev(s.created_at)),
      returns:(returns||[]).filter(r=>inPrev(r.created_at)),
      expenses:expenses.filter(e=>inPrev(e.created_at)),
      purchases:purchases.filter(p=>inPrev(p.created_at)),
      creditHistory:creditHistory.filter(t=>inPrev(t.created_at)),
    });
  },[tab,customFrom,customTo,sales,returns,expenses,purchases,creditHistory]);

  const pctChange=(now,prev)=>{if(!prev||prev===0)return now>0?100:0;return Math.round(((now-prev)/prev)*100);};

  const KPI=({icon,label,value,prev,now,color,invert})=>{
    const ch=prev!=null?pctChange(now,prev):null;
    const up=ch!=null&&ch>=0;
    const good=invert?!up:up;
    return <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',border:'1px solid #ECFDF5',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,width:4,height:'100%',background:color}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <span style={{fontSize:22}}>{icon}</span>
        {ch!=null&&<span style={{fontSize:11,fontWeight:800,padding:'3px 8px',borderRadius:20,background:good?'#ECFDF5':'#FBECE9',color:good?'#0A6E47':'#DC2626'}}>{up?'▲':'▼'} {Math.abs(ch)}%</span>}
      </div>
      <div style={{fontSize:11,color:'#5C6A62',fontWeight:600,marginBottom:3}}>{label}</div>
      <div style={{fontSize:20,fontWeight:900,color}}>{value}</div>
    </div>;
  };

  return <div style={{paddingBottom:24}}>
    {/* ===== HEADER ===== */}
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>📊 Ripoti za Biashara</h2>
      <p style={{fontSize:12.5,color:'#5C6A62',margin:0}}>
        {canUseBranches&&activeBranch?`Tawi: ${myBranches.find(b=>b.id===activeBranch)?.name||''}`:canUseBranches?'Matawi Yote (Pamoja)':'Angalia mauzo yako kwa undani — kila tarehe inaonekana'}
      </p>
    </div>

    {/* ===== CHUJIO (TABS) ===== */}
    <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:6,marginBottom:14}}>
      {[
        {id:'day',label:'📅 Leo'},
        {id:'week',label:'🗓️ Wiki'},
        {id:'month',label:'📆 Mwezi'},
        {id:'custom',label:'🎯 Tarehe Maalum'},
        {id:'history',label:'📚 Nyuma'},
      ].map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{
          flex:'0 0 auto',padding:'9px 15px',borderRadius:11,border:'none',cursor:'pointer',
          fontWeight:800,fontSize:12.5,whiteSpace:'nowrap',transition:'all .2s',
          background:tab===t.id?'linear-gradient(135deg,#0A6E47,#06502F)':'#F6F8F7',
          color:tab===t.id?'#fff':'#5C6A62',
          boxShadow:tab===t.id?'0 4px 12px rgba(6,95,46,0.25)':'none',
        }}>{t.label}</button>
      ))}
    </div>

    {/* ===== CUSTOM DATE PICKER ===== */}
    {tab==='custom'&&<div style={{background:'linear-gradient(135deg,#E6F2EC,#D6EADF)',border:'1px solid #C2DED1',borderRadius:16,padding:16,marginBottom:16}}>
      <div style={{fontWeight:800,fontSize:13.5,color:'#0A6E47',marginBottom:10}}>🎯 Chagua Tarehe</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
        {[{id:'thisMonth',l:'Mwezi Huu'},{id:'lastMonth',l:'Mwezi Uliopita'},{id:'last3Months',l:'Miezi 3'},{id:'thisYear',l:'Mwaka Huu'},{id:'lastYear',l:'Mwaka Uliopita'}].map(r=>(
          <button key={r.id} onClick={()=>setQuickRange(r.id)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #86EFAC',background:'#fff',color:'#0A6E47',fontWeight:700,fontSize:11,cursor:'pointer'}}>{r.l}</button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'#0A6E47',display:'block',marginBottom:4}}>Kuanzia</label>
          <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #86EFAC',fontSize:13,boxSizing:'border-box'}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'#0A6E47',display:'block',marginBottom:4}}>Mpaka</label>
          <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #86EFAC',fontSize:13,boxSizing:'border-box'}}/>
        </div>
      </div>
    </div>}

    {/* ===== MAHESABU YA NYUMA (HISTORY) ===== */}
    {tab==='history'?<div>
      <div style={{background:'linear-gradient(135deg,#E6F2EC,#D6EADF)',border:'1px solid #C2DED1',borderRadius:14,padding:14,marginBottom:14}}>
        <div style={{fontSize:13,color:'#0A6E47',display:'flex',gap:8,alignItems:'flex-start'}}>
          <span style={{fontSize:18}}>📚</span>
          <span><b>Mahesabu ya Nyuma</b> — Kila mwezi una mahesabu yake. Bofya kupakua statement kamili ya PDF.</span>
        </div>
      </div>
      {monthlyStats.length?<div style={{display:'grid',gap:10}}>
        {monthlyStats.map((m,i)=>{
          const isCurrent=m.ym===todayStr().slice(0,7);
          return <div key={m.ym} style={{padding:16,borderRadius:16,border:isCurrent?'2px solid #0A6E47':'1px solid #D6E2DB',background:isCurrent?'linear-gradient(135deg,#E6F2EC,#fff)':'#fff'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:46,height:46,background:isCurrent?'linear-gradient(135deg,#0A6E47,#06502F)':'#9AA5A0',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20}}>📅</div>
                <div>
                  <div style={{fontWeight:900,fontSize:15,color:'#17231D'}}>{m.label}</div>
                  <div style={{fontSize:11,color:'#5C6A62'}}>{m.count} mauzo {isCurrent&&<span style={{background:'#D6EADF',color:'#0A6E47',padding:'2px 8px',borderRadius:6,marginLeft:6,fontWeight:700,fontSize:9}}>SASA</span>}</div>
                </div>
              </div>
              <button onClick={()=>exportMonthlyStatement(m)} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid #0A6E47',background:'#fff',color:'#0A6E47',fontWeight:700,fontSize:12,cursor:'pointer'}}>📄 Statement PDF</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10,paddingTop:12,borderTop:'1px solid #F6F8F7'}}>
              <div><div style={{fontSize:10,color:'#9AA5A0',fontWeight:600}}>MAUZO</div><div style={{fontSize:15,fontWeight:900,color:'#0A6E47'}}>{fm(m.netSales)}</div></div>
              <div><div style={{fontSize:10,color:'#9AA5A0',fontWeight:600}}>FAIDA</div><div style={{fontSize:15,fontWeight:900,color:'#3B82F6'}}>{fm(m.netProfit)}</div></div>
              <div><div style={{fontSize:10,color:'#9AA5A0',fontWeight:600}}>REJESHO</div><div style={{fontSize:15,fontWeight:900,color:'#C2412D'}}>{fm(m.refunds)}</div></div>
            </div>
          </div>;
        })}
      </div>:<Empty icon="📚" text="Hakuna mahesabu ya nyuma bado"/>}
    </div>:<>

    {/* ===== JIBU LA HARAKA (HERO CARD) ===== */}
    <div style={{background:'linear-gradient(135deg,#0A6E47,#06502F)',borderRadius:20,padding:'20px 22px',marginBottom:14,color:'#fff',boxShadow:'0 10px 30px rgba(6,95,46,0.3)'}}>
      <div style={{fontSize:11,fontWeight:700,opacity:0.8,letterSpacing:1,marginBottom:4}}>💰 PESA MKONONI — {periodLabel.toUpperCase()}</div>
      <div style={{fontSize:34,fontWeight:900,lineHeight:1.1,marginBottom:10}}>{fm(fin.netCash)}</div>
      <div style={{display:'flex',gap:20,flexWrap:'wrap',paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.15)'}}>
        <div>
          <div style={{fontSize:10.5,opacity:0.8,marginBottom:2}}>📈 Faida Halisi</div>
          <div style={{fontSize:17,fontWeight:800}}>{fm(fin.netProfit)}</div>
        </div>
        <div>
          <div style={{fontSize:10.5,opacity:0.8,marginBottom:2}}>🛒 Mauzo Ghafi</div>
          <div style={{fontSize:17,fontWeight:800}}>{fm(fin.grossSales)}</div>
        </div>
        <div>
          <div style={{fontSize:10.5,opacity:0.8,marginBottom:2}}>🧾 Idadi ya Mauzo</div>
          <div style={{fontSize:17,fontWeight:800}}>{fin.salesCount}</div>
        </div>
      </div>
    </div>

    {/* ===== KPI CARDS ===== */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:14}}>
      <KPI icon="🛒" label="Mauzo Ghafi" value={fm(fin.grossSales)} now={fin.grossSales} prev={prevFin?.grossSales} color="#0A6E47"/>
      <KPI icon="📈" label="Faida Halisi" value={fm(fin.netProfit)} now={fin.netProfit} prev={prevFin?.netProfit} color="#3B82F6"/>
      <KPI icon="📤" label="Matumizi" value={fm(fin.totalExpenses)} now={fin.totalExpenses} prev={prevFin?.totalExpenses} color="#C2412D" invert={true}/>
      <KPI icon="💳" label="Mauzo ya Deni" value={fm(fin.creditSalesTotal)} now={fin.creditSalesTotal} prev={prevFin?.creditSalesTotal} color="#F2B705"/>
    </div>

    {/* ===== STATEMENT PDF + EXCEL ===== */}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
      <button onClick={doExportStatement} style={{flex:1,minWidth:160,padding:13,background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:13.5,cursor:'pointer',boxShadow:'0 4px 14px rgba(6,95,46,0.25)'}}>📄 Pakua Statement (PDF)</button>
      <button onClick={doExportExcel} style={{flex:1,minWidth:130,padding:13,background:'#E6F2EC',color:'#0A6E47',border:'1.5px solid #86EFAC',borderRadius:12,fontWeight:700,fontSize:13.5,cursor:'pointer'}}>📊 Excel</button>
    </div>

    {fSales.length===0&&fReturns.length===0?<Empty icon="📊" text="Hakuna mauzo kwa kipindi hiki. Chagua tarehe nyingine au uza kwanza."/>:<>

    {/* ===== MAUZO KWA KILA TAREHE ===== */}
    {dailyBreakdown.length>0&&<div style={{background:'#fff',borderRadius:16,marginBottom:14,overflow:'hidden',border:'1px solid #ECFDF5',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <div style={{background:'linear-gradient(135deg,#0A6E47,#06502F)',padding:'13px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{fontSize:14,fontWeight:800,margin:0,color:'#fff'}}>📅 Mauzo kwa Kila Tarehe</h3>
        <span style={{fontSize:11,color:'#A7F3D0',fontWeight:600}}>{dailyBreakdown.length} siku</span>
      </div>
      <div style={{maxHeight:380,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead style={{position:'sticky',top:0,background:'#E6F2EC',zIndex:1}}>
            <tr style={{textAlign:'left',color:'#0A6E47'}}>
              <th style={{padding:'9px 14px',fontWeight:800}}>Tarehe</th>
              <th style={{padding:'9px 10px',fontWeight:800,textAlign:'center'}}>Idadi</th>
              <th style={{padding:'9px 10px',fontWeight:800,textAlign:'right'}}>Faida</th>
              <th style={{padding:'9px 14px',fontWeight:800,textAlign:'right'}}>Mauzo</th>
            </tr>
          </thead>
          <tbody>
            {dailyBreakdown.map((d,i)=>(
              <tr key={d.date} style={{borderTop:'1px solid #F6F8F7',background:d.count===0?'#FAFAFA':(i%2?'#fff':'#F8FEFB')}}>
                <td style={{padding:'9px 14px',fontWeight:600,color:d.count===0?'#9AA5A0':'#17231D'}}>{d.label}</td>
                <td style={{padding:'9px 10px',textAlign:'center',color:d.count===0?'#CBD5E1':'#5C6A62'}}>{d.count}</td>
                <td style={{padding:'9px 10px',textAlign:'right',color:d.profit>0?'#3B82F6':'#CBD5E1',fontWeight:600}}>{d.profit>0?fm(d.profit):'—'}</td>
                <td style={{padding:'9px 14px',textAlign:'right',fontWeight:800,color:d.sales>0?'#0A6E47':'#CBD5E1'}}>{d.sales>0?fm(d.sales):'—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop:'2px solid #0A6E47',background:'#ECFDF5'}}>
              <td style={{padding:'11px 14px',fontWeight:900,color:'#0A6E47'}}>JUMLA</td>
              <td style={{padding:'11px 10px',textAlign:'center',fontWeight:900,color:'#0A6E47'}}>{dailyBreakdown.reduce((a,d)=>a+d.count,0)}</td>
              <td style={{padding:'11px 10px',textAlign:'right',fontWeight:900,color:'#3B82F6'}}>{fm(dailyBreakdown.reduce((a,d)=>a+d.profit,0))}</td>
              <td style={{padding:'11px 14px',textAlign:'right',fontWeight:900,color:'#0A6E47'}}>{fm(dailyBreakdown.reduce((a,d)=>a+d.sales,0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>}

    {/* ===== CHATI YA MWENENDO ===== */}
    {trendData.length>1&&<div style={{background:'#fff',borderRadius:16,padding:16,marginBottom:14,border:'1px solid #ECFDF5',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#0A6E47'}}>📈 Mwenendo wa Mauzo</h3>
      <ResponsiveContainer width="100%" height={180}><BarChart data={trendData}><XAxis dataKey="day" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} width={46}/><Tooltip formatter={v=>fm(v)}/><Bar dataKey="total" fill="#0A6E47" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
    </div>}

    {/* ===== SEHEMU ZINAZOJIFUNUA (COLLAPSIBLE) ===== */}
    {productsSold.length>0&&<CollapseCard title="🏆 Bidhaa Zinazoingiza Faida Zaidi" count={productsSold.length}>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[...productsSold].sort((a,b)=>b.profit-a.profit).slice(0,8).map((p,i)=>(
          <div key={p.id||i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:i%2?'#fff':'#F8FEFB'}}>
            <div style={{width:26,height:26,borderRadius:8,background:i<3?'#0A6E47':'#CBD5E1',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,flexShrink:0}}>{i+1}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:'#17231D',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.image} {p.name}</div>
              <div style={{fontSize:11,color:'#5C6A62'}}>{p.netSold.toFixed(1)} {p.unit} • Mapato {fm(p.revenue)}</div>
            </div>
            <div style={{fontWeight:900,fontSize:13,color:'#3B82F6',flexShrink:0}}>{fm(p.profit)}</div>
          </div>
        ))}
      </div>
      <button onClick={exportProductsExcel} style={{marginTop:10,width:'100%',padding:10,borderRadius:10,border:'1.5px solid #86EFAC',background:'#E6F2EC',color:'#0A6E47',fontWeight:700,fontSize:12,cursor:'pointer'}}>📊 Pakua Orodha Kamili (Excel)</button>
    </CollapseCard>}

    {categoryData.length>0&&<CollapseCard title="🗂️ Mauzo kwa Kategoria" count={categoryData.length}>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {categoryData.map((c,i)=>(
          <div key={c.category}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12.5}}>
              <span style={{fontWeight:700,color:'#17231D'}}>{c.category}</span>
              <span style={{fontWeight:800,color:'#0A6E47'}}>{fm(c.revenue)} <span style={{color:'#9AA5A0',fontWeight:600}}>({c.pct}%)</span></span>
            </div>
            <div style={{height:7,background:'#F6F8F7',borderRadius:10,overflow:'hidden'}}><div style={{width:c.pct+'%',height:'100%',background:'linear-gradient(90deg,#0A6E47,#0E7F53)',borderRadius:10}}/></div>
          </div>
        ))}
      </div>
    </CollapseCard>}

    {staffStats.length>0&&<CollapseCard title="👥 Faida kwa Mfanyakazi" count={staffStats.length}>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {staffStats.map((s,i)=>(
          <div key={s.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:i%2?'#fff':'#F8FEFB'}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:'#0A6E47',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,flexShrink:0}}>{(s.name||'?')[0].toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:'#17231D'}}>{s.name}</div>
              <div style={{fontSize:11,color:'#5C6A62'}}>{s.count} mauzo • {fm(s.sales)}</div>
            </div>
            <div style={{fontWeight:900,fontSize:13,color:'#3B82F6',flexShrink:0}}>{fm(s.profit)}</div>
          </div>
        ))}
      </div>
    </CollapseCard>}

    {payBreakdown.length>0&&<CollapseCard title="💳 Njia za Malipo" count={payBreakdown.length}>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {payBreakdown.map((p,i)=>(
          <div key={p.method} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',borderRadius:10,background:i%2?'#fff':'#F8FEFB'}}>
            <span style={{fontWeight:700,fontSize:13,color:'#17231D'}}>{payLabel(p.method)} <span style={{color:'#9AA5A0',fontWeight:600,fontSize:11}}>({p.count})</span></span>
            <span style={{fontWeight:900,fontSize:13,color:'#0A6E47'}}>{fm(p.total)}</span>
          </div>
        ))}
      </div>
    </CollapseCard>}

    </>}
    </>}
  </div>;
}

// ===== EXPENSES =====
export function ExpensesPage(){
  const{expenses,addExpense,updateExpense,deleteExpense,currency}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const total=expenses.reduce((a,e)=>a+(e.amount||0),0);
  const mExp=expenses.filter(e=>isThisMonth(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const wExp=expenses.filter(e=>isThisWeek(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const tExp=expenses.filter(e=>isToday(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  
  const[f,setF]=useState({category:'kodi',description:'',amount:'',is_recurring:false,recurring_interval:'monthly'});
  const[search,setSearch]=useState('');
  const[filter,setFilter]=useState('all');
  const[period,setPeriod]=useState('all');
  const[editModal,setEditModal]=useState({open:false,exp:null});
  const[editF,setEditF]=useState({category:'',description:'',amount:'',is_recurring:false,recurring_interval:'monthly'});
  
  const CATS=[
    {value:'kodi',label:'Kodi'},{value:'umeme',label:'Umeme'},{value:'maji',label:'Maji'},
    {value:'mishahara',label:'Mishahara'},{value:'usafiri',label:'Usafiri'},
    {value:'kodi_nyumba',label:'Rent / Pango'},{value:'taka',label:'Taka'},
    {value:'ulinzi',label:'Ulinzi'},{value:'chakula',label:'Chakula'},
    {value:'vifungashio',label:'Vifungashio'},{value:'mafuta',label:'Mafuta'},
    {value:'madawa',label:'Madawa'},{value:'posho',label:'Posho'},
    {value:'kodi_serikali',label:'Kodi ya Serikali'},{value:'bima',label:'Bima'},
    {value:'mawasiliano',label:'Mawasiliano'},{value:'matangazo',label:'Matangazo / Marketing'},
    {value:'matengenezo',label:'Matengenezo'},{value:'vifaa',label:'Vifaa vya Duka'},
    {value:'usafi',label:'Usafi'},{value:'internet',label:'Internet'},
    {value:'nyingine',label:'Nyingine'},
  ];
  const CAT_ICONS={
    kodi:'🏛️',umeme:'⚡',maji:'💧',mishahara:'💼',usafiri:'🚐',kodi_nyumba:'🏠',
    taka:'🗑️',ulinzi:'🛡️',chakula:'🍱',vifungashio:'📦',mafuta:'⛽',madawa:'💊',
    posho:'🎁',kodi_serikali:'📋',bima:'🛟',mawasiliano:'📞',matangazo:'📢',
    matengenezo:'🔧',vifaa:'🪑',usafi:'🧹',internet:'🌐',nyingine:'📌',
  };
  const getCatLabel=(v)=>CATS.find(c=>c.value===v)?.label||v;

  const catMap={};
  expenses.forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+(e.amount||0)});
  const pieData=Object.entries(catMap).map(([n,v])=>({name:getCatLabel(n),value:v}));
  
  // Filtered list
  const filtered=expenses.filter(e=>{
    if(period==='today'&&!isToday(e.created_at))return false;
    if(period==='week'&&!isThisWeek(e.created_at))return false;
    if(period==='month'&&!isThisMonth(e.created_at))return false;
    if(filter!=='all'&&e.category!==filter)return false;
    if(search){
      const s=search.toLowerCase();
      return e.description?.toLowerCase().includes(s)||
             getCatLabel(e.category).toLowerCase().includes(s);
    }
    return true;
  }).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  
  const filteredTotal=filtered.reduce((a,e)=>a+(e.amount||0),0);
  
  const handleEdit=(exp)=>{
    setEditF({
      category:exp.category,
      description:exp.description||'',
      amount:String(exp.amount||''),
      is_recurring:exp.is_recurring||false,
      recurring_interval:exp.recurring_interval||'monthly',
    });
    setEditModal({open:true,exp});
  };
  
  const handleSaveEdit=async()=>{
    const amt=+editF.amount;
    if(!amt||amt<=0)return alert('Weka kiasi sahihi!');
    if(!editModal.exp)return;
    await updateExpense(editModal.exp.id,{
      category:editF.category,
      description:editF.description,
      amount:amt,
      is_recurring:editF.is_recurring,
      recurring_interval:editF.is_recurring?editF.recurring_interval:null,
    });
    alert(`✅ MATUMIZI YAMEBADILISHWA!\n\n${CAT_ICONS[editF.category]||'📌'} ${getCatLabel(editF.category)}\n📝 ${editF.description||'—'}\n💰 ${fm(amt)}`);
    setEditModal({open:false,exp:null});
  };
  
  const handleDelete=async(exp)=>{
    if(!window.confirm(`Una uhakika unataka kufuta matumizi haya?\n\n${getCatLabel(exp.category)}: ${fm(exp.amount)}\n${exp.description||'—'}\n\nKitendo hiki HAKIWEZI kurudishwa.`))return;
    await deleteExpense(exp.id);
    alert('🗑️ Matumizi yamefutwa!');
  };
  
  return <div className="page-enter">
    {/* HEADER */}
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>💰 Matumizi</h2>
      <p style={{fontSize:12,color:'#5C6A62',margin:0}}>Hifadhi, hariri, na fuatilia gharama zote za biashara</p>
    </div>
    
    {/* STATS */}
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.wallet} label="Jumla" value={fm(total)} color="#C2412D" sub={`${expenses.length} matumizi`}/>
      <Stat icon={IC.wallet} label="Mwezi Huu" value={fm(mExp)} color="#F2B705"/>
      <Stat icon={IC.wallet} label="Wiki Hii" value={fm(wExp)} color="#3B82F6"/>
      <Stat icon={IC.wallet} label="Leo" value={fm(tExp)} color="#0A6E47"/>
    </div>
    
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
      {/* ADD FORM */}
      <div className="card" style={{border:'2px solid #C2DED1'}}>
        <h3 style={{fontSize:15,fontWeight:800,color:'#0A6E47',margin:'0 0 14px'}}>➕ Ongeza Matumizi Mpya</h3>
        <Sel label="Aina" value={f.category} onChange={e=>setF({...f,category:e.target.value})} options={CATS}/>
        <Input label="Maelezo" value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Mfano: Umeme Aprili"/>
        <Input label="Kiasi (TZS)" type="number" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})} placeholder="Mfano: 50000"/>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'8px 12px',background:'#E6F2EC',borderRadius:8}}>
          <input type="checkbox" checked={f.is_recurring} onChange={e=>setF({...f,is_recurring:e.target.checked})} id="rec" style={{cursor:'pointer'}}/>
          <label htmlFor="rec" style={{fontSize:12,fontWeight:600,color:'#0A6E47',cursor:'pointer'}}>🔄 Inarudia kila mwezi</label>
        </div>
        <Btn onClick={()=>{
          if(!+f.amount||+f.amount<=0)return alert('Weka kiasi sahihi!');
          addExpense({category:f.category,description:f.description,amount:+f.amount,is_recurring:f.is_recurring,recurring_interval:f.is_recurring?f.recurring_interval:null});
          setF({...f,description:'',amount:''});
          alert(`✅ MATUMIZI YAMEHIFADHIWA!\n\n${CAT_ICONS[f.category]||'📌'} ${getCatLabel(f.category)}\n💰 ${fm(+f.amount)}`);
        }} style={{width:'100%',justifyContent:'center'}}>{IC.plus} Hifadhi Matumizi</Btn>
      </div>
      
      {/* PIE CHART */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px',color:'#0A6E47'}}>📊 Kwa Aina</h3>
        {pieData.length?<ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,value})=>`${name}: ${fm(value)}`} style={{fontSize:9}}>
              {pieData.map((_,i)=><Cell key={i} fill={CL[i%CL.length]}/>)}
            </Pie>
            <Tooltip formatter={v=>fm(v)}/>
          </PieChart>
        </ResponsiveContainer>:<Empty text="Hakuna matumizi" icon="💰"/>}
      </div>
    </div>
    
    {/* SEARCH + FILTERS */}
    <div className="card" style={{marginTop:16}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,marginBottom:12,alignItems:'center'}}>
        <input
          type="text"
          placeholder="🔍 Tafuta matumizi (aina au maelezo)..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{padding:'10px 14px',border:'1.5px solid #D6E2DB',borderRadius:10,fontSize:13,outline:'none',width:'100%',boxSizing:'border-box'}}
        />
        <div style={{fontSize:11,color:'#5C6A62',whiteSpace:'nowrap',padding:'0 8px'}}>
          <b style={{color:'#0A6E47',fontSize:15}}>{filtered.length}</b> matumizi • <b style={{color:'#C2412D',fontSize:15}}>{fm(filteredTotal)}</b>
        </div>
      </div>
      
      {/* Period filter */}
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {[{id:'all',label:'🗓️ Vyote'},{id:'today',label:'📅 Leo'},{id:'week',label:'🗓️ Wiki'},{id:'month',label:'📆 Mwezi'}].map(p=>
          <button key={p.id} onClick={()=>setPeriod(p.id)} style={{
            padding:'6px 12px',borderRadius:8,
            border:period===p.id?'2px solid #0A6E47':'1.5px solid #D6E2DB',
            background:period===p.id?'#0A6E47':'#fff',
            fontWeight:700,fontSize:11,cursor:'pointer',
            color:period===p.id?'#fff':'#475569',
          }}>{p.label}</button>
        )}
      </div>
      
      {/* Category filter */}
      <div style={{display:'flex',gap:5,flexWrap:'wrap',maxHeight:80,overflowY:'auto',padding:'5px 0'}}>
        <button onClick={()=>setFilter('all')} style={{
          padding:'5px 10px',borderRadius:8,
          border:filter==='all'?'2px solid #0A6E47':'1px solid #D6E2DB',
          background:filter==='all'?'#E6F2EC':'#fff',
          fontWeight:600,fontSize:10,cursor:'pointer',
          color:filter==='all'?'#0A6E47':'#5C6A62',
        }}>📚 Zote</button>
        {Object.keys(catMap).map(c=>
          <button key={c} onClick={()=>setFilter(c)} style={{
            padding:'5px 10px',borderRadius:8,
            border:filter===c?'2px solid #0A6E47':'1px solid #D6E2DB',
            background:filter===c?'#E6F2EC':'#fff',
            fontWeight:600,fontSize:10,cursor:'pointer',
            color:filter===c?'#0A6E47':'#5C6A62',
          }}>{CAT_ICONS[c]||'📌'} {getCatLabel(c)}</button>
        )}
      </div>
    </div>
    
    {/* EXPENSES LIST */}
    <div className="card" style={{marginTop:16}}>
      <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 14px',color:'#0A6E47'}}>📋 Orodha ya Matumizi</h3>
      
      {filtered.length>0?<div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:520,overflowY:'auto'}}>
        {filtered.map(e=><div key={e.id} style={{
          padding:'12px 14px',
          background:'#F6F8F7',
          borderRadius:10,
          borderLeft:'4px solid #C2412D',
          display:'grid',
          gridTemplateColumns:'auto 1fr auto auto',
          gap:12,
          alignItems:'center',
        }}>
          <div style={{
            width:42,height:42,borderRadius:10,
            background:'#F6DED8',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:22,
          }}>{CAT_ICONS[e.category]||'📌'}</div>
          
          <div style={{minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
              <span style={{fontWeight:800,fontSize:13,color:'#17231D',textTransform:'capitalize'}}>{getCatLabel(e.category)}</span>
              {e.is_recurring&&<span style={{background:'#DBEAFE',color:'#1D4ED8',padding:'1px 8px',borderRadius:6,fontSize:9,fontWeight:700}}>🔄 INARUDIA</span>}
            </div>
            {e.description&&<div style={{fontSize:12,color:'#475569',marginBottom:2}}>{e.description}</div>}
            <div style={{fontSize:10,color:'#9AA5A0'}}>📅 {fmtDate(e.created_at)} {e.updated_at&&'• ✏️ Imebadilishwa'}</div>
          </div>
          
          <div style={{fontWeight:900,color:'#C2412D',fontSize:16,textAlign:'right'}}>{fm(e.amount)}</div>
          
          <div style={{display:'flex',gap:5}}>
            <button onClick={()=>handleEdit(e)} title="Hariri" style={{
              padding:'8px 10px',borderRadius:8,
              border:'1.5px solid #3B82F6',background:'#fff',
              cursor:'pointer',color:'#3B82F6',fontWeight:700,fontSize:13,
            }}>✏️</button>
            <button onClick={()=>handleDelete(e)} title="Futa" style={{
              padding:'8px 10px',borderRadius:8,
              border:'1.5px solid #C2412D',background:'#fff',
              cursor:'pointer',color:'#C2412D',fontWeight:700,fontSize:13,
            }}>🗑️</button>
          </div>
        </div>)}
      </div>:<div style={{textAlign:'center',padding:40,color:'#9AA5A0'}}>
        <div style={{fontSize:50,marginBottom:10}}>💰</div>
        <div style={{fontWeight:700}}>{search||filter!=='all'||period!=='all'?'Hakuna matumizi yanayolingana':'Hakuna matumizi bado'}</div>
        <div style={{fontSize:12,marginTop:4}}>{search||filter!=='all'||period!=='all'?'Badili vichungi':'Ongeza matumizi mapya juu'}</div>
      </div>}
    </div>
    
    {/* EDIT MODAL */}
    <Modal open={editModal.open} onClose={()=>setEditModal({open:false,exp:null})} title="✏️ Hariri Matumizi">
      {editModal.exp&&<>
        <div style={{background:'#FFF8E6',border:'1.5px solid #FCD34D',borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:11,color:'#92400E'}}>
          <b>⚠️ ELEKEZO:</b> Unaboresha matumizi yaliyohifadhiwa tarehe <b>{fmtDate(editModal.exp.created_at)}</b>. Mabadiliko yataonyeshwa kila mahali.
        </div>
        <Sel label="Aina" value={editF.category} onChange={e=>setEditF({...editF,category:e.target.value})} options={CATS}/>
        <Input label="Maelezo" value={editF.description} onChange={e=>setEditF({...editF,description:e.target.value})}/>
        <Input label="Kiasi (TZS)" type="number" value={editF.amount} onChange={e=>setEditF({...editF,amount:e.target.value})}/>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,padding:'8px 12px',background:'#E6F2EC',borderRadius:8}}>
          <input type="checkbox" checked={editF.is_recurring} onChange={e=>setEditF({...editF,is_recurring:e.target.checked})} id="recE" style={{cursor:'pointer'}}/>
          <label htmlFor="recE" style={{fontSize:12,fontWeight:600,color:'#0A6E47',cursor:'pointer'}}>🔄 Inarudia kila mwezi</label>
        </div>
        
        {/* Show before/after if amount changed */}
        {+editF.amount!==editModal.exp.amount&&+editF.amount>0&&<div style={{background:'#E6F2EC',border:'1.5px solid #C2DED1',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12}}>
          <div style={{fontWeight:700,color:'#15803D',marginBottom:4}}>📊 Mabadiliko ya Kiasi:</div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{color:'#5C6A62'}}>Zamani:</span>
            <span style={{fontWeight:700,color:'#C2412D',textDecoration:'line-through'}}>{fm(editModal.exp.amount)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{color:'#5C6A62'}}>Sasa:</span>
            <span style={{fontWeight:700,color:'#0A6E47'}}>{fm(+editF.amount)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',borderTop:'2px dashed #C2DED1',paddingTop:5,marginTop:5}}>
            <span style={{color:'#5C6A62',fontWeight:600}}>Tofauti:</span>
            <span style={{fontWeight:800,color:+editF.amount>editModal.exp.amount?'#C2412D':'#0A6E47'}}>
              {+editF.amount>editModal.exp.amount?'+':'−'}{fm(Math.abs(+editF.amount-editModal.exp.amount))}
            </span>
          </div>
        </div>}
        
        <div style={{display:'flex',gap:8}}>
          <Btn v="outline" onClick={()=>setEditModal({open:false,exp:null})} style={{flex:1,justifyContent:'center'}}>Ghairi</Btn>
          <Btn onClick={handleSaveEdit} style={{flex:1,justifyContent:'center'}}>💾 Hifadhi Mabadiliko</Btn>
        </div>
      </>}
    </Modal>
  </div>;
}

// ===== EMPLOYEES =====
export function EmployeesPage(){
  const{employees,addEmployee,updateEmployee,deleteEmployee,loginLogs,getBranches,canUseBranches}=useApp();
  const myBranches=getBranches();
  const[modal,setModal]=useState(false);
  const[editBranchModal,setEditBranchModal]=useState({open:false,emp:null});
  const[f,setF]=useState({name:'',email:'',phone:'',password:'1234',branch_id:''});

  return <div className="page-enter">
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Wafanyakazi ({employees.length})</h3>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Ongeza</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
      {employees.map(e=>{
        const logs=loginLogs.filter(l=>l.user_id===e.id||l.email===e.email).slice(0,3);
        const empBranch=myBranches.find(b=>b.id===e.branch_id);
        return <div key={e.id} className="card">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:'#E6F2EC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:700,color:'#0A6E47'}}>{e.name?.[0]?.toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13}}>{e.name}</div>
              <div style={{fontSize:11,color:'#5C6A62'}}>{e.email}</div>
            </div>
            <button onClick={()=>window.confirm(`Futa "${e.name}"?`)&&deleteEmployee(e.id)} style={{background:'#FBECE9',border:'none',borderRadius:6,padding:5,color:'#C2412D',cursor:'pointer'}}>{IC.del}</button>
          </div>

          {/* Branch Assignment */}
          {canUseBranches&&<div style={{background:empBranch?'#E6F2EC':'#FFF8E6',borderRadius:8,padding:'6px 10px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'#475569'}}>Tawi:</div>
              <div style={{fontWeight:700,fontSize:13,color:empBranch?'#0A6E47':'#92400E'}}>
                {empBranch?`🏪 ${empBranch.name}`:'⚠️ Hajapangiwa tawi'}
              </div>
            </div>
            <button onClick={()=>setEditBranchModal({open:true,emp:e})} style={{background:'#F6F8F7',border:'none',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:600,cursor:'pointer',color:'#3B82F6'}}>Badilisha</button>
          </div>}

          {e.phone&&<div style={{fontSize:12,color:'#5C6A62',marginBottom:6}}>📱 {e.phone}</div>}

          {logs.length>0&&<div style={{background:'#F6F8F7',borderRadius:8,padding:6}}>
            <div style={{fontSize:10,fontWeight:600,color:'#475569',marginBottom:4}}>Login:</div>
            {logs.map((l,i)=><div key={i} style={{fontSize:10,color:'#5C6A62'}}>{fmtDate(l.created_at)} <Badge color={l.action==='login'?'#0A6E47':'#9AA5A0'}>{l.action}</Badge></div>)}
          </div>}
        </div>;
      })}
    </div>
    {!employees.length&&<Empty text="Ongeza mfanyakazi"/>}

    {/* ADD EMPLOYEE MODAL */}
    <Modal open={modal} onClose={()=>setModal(false)} title="Ongeza Mfanyakazi">
      <PhoneNameInput label="Simu" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} currentName={f.name} onName={n=>setF(p=>({...p,name:n}))}/>
      <Input label="Jina *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Jina kamili"/>
      <Input label="Email *" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@mfano.com"/>
      <Input label="Password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>

      {/* Branch selector */}
      {canUseBranches&&myBranches.length>0&&<>
        <Sel label="Tawi la Mfanyakazi" value={f.branch_id} onChange={e=>setF({...f,branch_id:e.target.value})} options={[
          {value:'',label:'-- Hakuna Tawi (anaona yote) --'},
          ...myBranches.map(b=>({value:b.id,label:b.name}))
        ]}/>
        <div style={{background:'#E6F2EC',borderRadius:8,padding:'6px 10px',marginBottom:10,fontSize:11,color:'#15803D',lineHeight:1.5}}>
          {f.branch_id?`Mfanyakazi huyu ataona data ya "${myBranches.find(b=>b.id===f.branch_id)?.name}" TU. Hawezi kubadilisha tawi lake.`
            :'Mfanyakazi huyu ataona data za matawi yote. Chagua tawi kama unataka kumzuia.'}
        </div>
      </>}

      <Btn onClick={async()=>{
        if(!f.name||!f.email)return alert('Jaza jina na email!');
        if(!f.password||f.password.length<4)return alert('Password lazima iwe herufi 4 au zaidi!');
        const res=await addEmployee({...f,branch_id:f.branch_id||null});
        if(res&&res.error)return alert('❌ '+res.error);
        alert(`✅ Mfanyakazi "${f.name}" ameundwa!\n\nAtaingia na:\n📧 Email: ${f.email}\n🔑 Password: ${f.password}\n\nMpe taarifa hizi aingie nazo.${res&&res.warn?'\n\n⚠️ '+res.warn:''}`);
        setModal(false);setF({name:'',email:'',phone:'',password:'1234',branch_id:''});
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Sajili Mfanyakazi</Btn>
    </Modal>

    {/* CHANGE BRANCH MODAL */}
    <Modal open={editBranchModal.open} onClose={()=>setEditBranchModal({open:false,emp:null})} title={`Badilisha Tawi - ${editBranchModal.emp?.name||''}`}>
      {editBranchModal.emp&&<>
        <div style={{background:'#F6F8F7',borderRadius:10,padding:12,marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:13,color:'#5C6A62'}}>Tawi la sasa:</div>
          <div style={{fontSize:18,fontWeight:700,color:'#0A6E47'}}>{myBranches.find(b=>b.id===editBranchModal.emp.branch_id)?.name||'Hajapangiwa'}</div>
        </div>
        <Sel label="Tawi Jipya" value={editBranchModal.emp.branch_id||''} onChange={e=>setEditBranchModal({...editBranchModal,emp:{...editBranchModal.emp,branch_id:e.target.value||null}})} options={[
          {value:'',label:'-- Ondoa tawi (anaona yote) --'},
          ...myBranches.map(b=>({value:b.id,label:b.name}))
        ]}/>
        <Btn onClick={async()=>{
          await updateEmployee(editBranchModal.emp.id,{branch_id:editBranchModal.emp.branch_id||null});
          setEditBranchModal({open:false,emp:null});
        }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
      </>}
    </Modal>
  </div>;
}

// ===== CUSTOMERS & ADVANCED DEBT MANAGEMENT =====
export function CustomersPage(){
  const{customers,addCustomer,updateCustomer,deleteCustomer,creditHistory,receivePayment,setCreditLimit,sales,currency,totalDebt,overdueCustomers,overdueTotal,debtAging,user}=useApp();
  // Muuzaji anaona deni la MTEJA mmoja mmoja (anahitaji kabla ya kukopesha),
  // lakini si jumla za duka wala kutuma SMS za ukumbusho (hizo ni za mwenye duka).
  const isSeller=user?.role==='employee';
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[search,setSearch]=useState('');
  const[modal,setModal]=useState(false);
  const[editModal,setEditModal]=useState({open:false,cust:null});
  const[payModal,setPayModal]=useState({open:false,cust:null});
  const[histModal,setHistModal]=useState({open:false,cust:null});
  const[limitModal,setLimitModal]=useState({open:false,cust:null});
  const[f,setF]=useState({name:'',phone:'',email:'',address:''});
  const[payAmt,setPayAmt]=useState('');
  const[payNote,setPayNote]=useState('');
  const[payMethod,setPayMethod]=useState('cash');
  const[filter,setFilter]=useState('all');
  const[limitAmt,setLimitAmt]=useState('');
  const[tab,setTab]=useState('customers');

  const debtCount=customers.filter(c=>(c.credit_balance||0)>0).length;
  const filtered=customers.filter(c=>{
    if(search&&!c.name?.toLowerCase().includes(search.toLowerCase())&&!c.phone?.includes(search))return false;
    if(filter==='debt')return(c.credit_balance||0)>0;
    if(filter==='clear')return(c.credit_balance||0)===0;
    if(filter==='overdue')return overdueCustomers.some(o=>o.id===c.id);
    return true;
  }).sort((a,b)=>(b.credit_balance||0)-(a.credit_balance||0));

  const getCustSales=(custId)=>sales.filter(s=>s.customer_id===custId);
  const getCustCredits=(custId)=>creditHistory.filter(t=>t.customer_id===custId);
  const isOverdue=(custId)=>overdueCustomers.some(o=>o.id===custId);
  const getDaysOverdue=(custId)=>{
    const txs=creditHistory.filter(t=>t.customer_id===custId&&t.type==='credit'&&t.status!=='paid'&&t.due_date);
    if(!txs.length)return 0;
    const oldest=txs.sort((a,b)=>new Date(a.due_date)-new Date(b.due_date))[0];
    return Math.max(0,Math.floor((Date.now()-new Date(oldest.due_date).getTime())/86400000));
  };
  const getCustDebtAge=(custId)=>{
    const txs=creditHistory.filter(t=>t.customer_id===custId&&t.type==='credit'&&t.status!=='paid');
    if(!txs.length)return 0;
    const oldest=txs.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))[0];
    return Math.floor((Date.now()-new Date(oldest.created_at).getTime())/86400000);
  };

  // WhatsApp reminder message
  const sendReminder=(cust)=>{
    const msg=`Habari ${cust.name},%0A%0ATunakukumbusha kuwa una deni la *TZS ${(cust.credit_balance||0).toLocaleString()}* kwenye duka letu.%0A%0ATafadhali lipa haraka iwezekanavyo.%0A%0AMalipo: HALOPESA - Lipa Namba 25187616%0AJina: DUKALANGU%0A%0AAsante! 🙏`;
    window.open(`https://wa.me/${cust.phone?.replace(/\D/g,'')}?text=${msg}`,'_blank');
  };

  return <div className="page-enter">
    {/* Ukumbusho wa deni kwa SMS */}
    {!isSeller&&debtCount>0&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
      <DebtReminder/>
    </div>}
    {/* Tabs: Wateja | Deni Dashboard — muuzaji anaona Wateja pekee */}
    {!isSeller&&<div style={{display:'flex',background:'#F6F8F7',borderRadius:12,padding:3,marginBottom:16}}>
      <button onClick={()=>setTab('customers')} style={{flex:1,padding:'10px 0',borderRadius:10,border:'none',fontWeight:700,fontSize:14,background:tab==='customers'?'#fff':'transparent',color:tab==='customers'?'#0A6E47':'#9AA5A0',boxShadow:tab==='customers'?'0 2px 8px rgba(0,0,0,.08)':'none',cursor:'pointer'}}>👥 Wateja</button>
      <button onClick={()=>setTab('debt')} style={{flex:1,padding:'10px 0',borderRadius:10,border:'none',fontWeight:700,fontSize:14,background:tab==='debt'?'#fff':'transparent',color:tab==='debt'?'#C2412D':'#9AA5A0',boxShadow:tab==='debt'?'0 2px 8px rgba(0,0,0,.08)':'none',cursor:'pointer'}}>💰 Deni ({debtCount})</button>
    </div>}

    {/* ===== DEBT DASHBOARD TAB ===== */}
    {tab==='debt'&&!isSeller&&<div>
      {/* Debt Stats */}
      <div className="flex-wrap" style={{marginBottom:16}}>
        <Stat icon={IC.wallet} label="Deni Jumla" value={fm(totalDebt)} color="#C2412D" sub={`${debtCount} wanadaiwa`}/>
        <Stat icon={IC.warn} label="Limechelewa" value={fm(overdueTotal)} color="#B91C1C" sub={`${overdueCustomers.length} wateja`}/>
        <Stat icon={IC.dollar} label="Walionunua" value={fm(customers.reduce((a,c)=>a+(c.total_spent||0),0))} color="#0A6E47"/>
      </div>

      {/* Debt Aging Chart */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14,marginBottom:16}}>
        <div className="card">
          <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 12px',color:'#17231D'}}>📊 Umri wa Deni (Debt Aging)</h3>
          {[{label:'Siku 0-30 (Sasa)',value:debtAging.current,color:'#0A6E47',bg:'#E6F2EC'},
            {label:'Siku 31-60',value:debtAging.days30,color:'#F2B705',bg:'#FFF8E6'},
            {label:'Siku 61-90',value:debtAging.days60,color:'#C2412D',bg:'#FBECE9'},
            {label:'Zaidi ya 90',value:debtAging.over90,color:'#B91C1C',bg:'#FBECE9'},
          ].map(a=>(
            <div key={a.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,marginBottom:6,background:a.bg}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:10,height:10,borderRadius:3,background:a.color}}/>
                <span style={{fontSize:13,fontWeight:600}}>{a.label}</span>
              </div>
              <span style={{fontWeight:800,color:a.color,fontSize:14}}>{fm(a.value)}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',padding:'10px',borderTop:'2px solid #D6E2DB',marginTop:8}}>
            <span style={{fontWeight:800,fontSize:14}}>JUMLA</span>
            <span style={{fontWeight:900,fontSize:16,color:'#C2412D'}}>{fm(totalDebt)}</span>
          </div>
        </div>

        {/* Overdue Alerts */}
        <div className="card" style={{borderLeft:'4px solid #C2412D'}}>
          <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px',color:'#B91C1C'}}>🚨 Deni Limechelewa ({overdueCustomers.length})</h3>
          {overdueCustomers.length>0?overdueCustomers.map(c=>{
            const daysOver=getDaysOverdue(c.id);
            return <div key={c.id} style={{padding:'8px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                <div style={{fontSize:11,color:'#C2412D'}}>Siku {daysOver} zimepita tarehe ya kulipa!</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontWeight:800,color:'#B91C1C'}}>{fm(c.credit_balance)}</span>
                {c.phone&&<button onClick={()=>sendReminder(c)} style={{background:'#0A6E47',border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>WhatsApp</button>}
              </div>
            </div>;
          }):<div style={{textAlign:'center',padding:20,color:'#0A6E47',fontSize:13}}>✅ Hakuna deni limechelewa!</div>}
        </div>
      </div>

      {/* All Debtors */}
      <div className="card">
        <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 12px',color:'#17231D'}}>📋 Wateja Wenye Deni ({debtCount})</h3>
        {customers.filter(c=>(c.credit_balance||0)>0).sort((a,b)=>(b.credit_balance||0)-(a.credit_balance||0)).map(c=>{
          const overdue=isOverdue(c.id);const age=getCustDebtAge(c.id);
          return <div key={c.id} style={{padding:'10px 0',borderBottom:'1px solid #F6F8F7',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:overdue?'#FBECE9':'#FFF8E6',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:overdue?'#C2412D':'#F2B705'}}>{c.name?.[0]?.toUpperCase()}</div>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
              <div style={{fontSize:11,color:'#5C6A62'}}>{c.phone||'-'} • Siku {age}</div>
            </div>
            <div style={{textAlign:'right',minWidth:80}}>
              <div style={{fontWeight:800,fontSize:15,color:'#C2412D'}}>{fm(c.credit_balance)}</div>
              {c.credit_limit&&<div style={{fontSize:10,color:'#5C6A62'}}>Kikomo: {fm(c.credit_limit)}</div>}
            </div>
            <div style={{display:'flex',gap:4}}>
              {overdue&&<Badge color="#B91C1C">Chelewa!</Badge>}
              <button onClick={()=>{setPayModal({open:true,cust:c});setPayAmt('');setPayNote('')}} style={{background:'#0A6E47',border:'none',borderRadius:6,padding:'5px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Pokea</button>
              {c.phone&&<button onClick={()=>sendReminder(c)} style={{background:'#E6F2EC',border:'1px solid #C2DED1',borderRadius:6,padding:'5px 8px',fontSize:11,cursor:'pointer',color:'#15803D',fontWeight:600}}>Kumbusha</button>}
            </div>
          </div>;
        })}
        {debtCount===0&&<Empty icon="✅" text="Hakuna wateja wenye deni!"/>}
      </div>
    </div>}

    {/* ===== CUSTOMERS TAB ===== */}
    {tab==='customers'&&<div>
      {/* Stats */}
      {/* Takwimu za duka — muuzaji anaona idadi ya wateja pekee */}
      <div className="flex-wrap" style={{marginBottom:16}}>
        <Stat icon={IC.people} label="Wateja" value={customers.length} color="#0A6E47"/>
        {!isSeller&&<Stat icon={IC.wallet} label="Deni Jumla" value={fm(totalDebt)} color="#C2412D" sub={`${debtCount} wanadaiwa`}/>}
        {!isSeller&&<Stat icon={IC.dollar} label="Walionunua" value={fm(customers.reduce((a,c)=>a+(c.total_spent||0),0))} color="#3B82F6"/>}
        {!isSeller&&overdueCustomers.length>0&&<Stat icon={IC.warn} label="Chelewa" value={overdueCustomers.length} color="#B91C1C"/>}
        {isSeller&&<Stat icon={IC.wallet} label="Wanaodaiwa" value={debtCount} color="#C2412D"/>}
      </div>

      {/* Search & Filter */}
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:8,flex:'1 1 300px',maxWidth:450}}>
          <div style={{position:'relative',flex:1}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9AA5A0'}}>{IC.find}</span>
            <input placeholder="Tafuta kwa jina au simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 10px 10px 36px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box'}}/>
          </div>
          <Sel value={filter} onChange={e=>setFilter(e.target.value)} options={[{value:'all',label:'Wote'},{value:'debt',label:'Wanadaiwa'},{value:'overdue',label:'Wamechelewa'},{value:'clear',label:'Hawadaiwi'}]} style={{width:140}}/>
        </div>
        <Btn onClick={()=>setModal(true)}>{IC.plus} Ongeza Mteja</Btn>
      </div>

      {/* Customer Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
        {filtered.map(c=>{
          const hasDebt=(c.credit_balance||0)>0;const overdue=isOverdue(c.id);const age=getCustDebtAge(c.id);
          const custSales=getCustSales(c.id);const lastSale=custSales[0];
          const limitUsed=c.credit_limit?Math.min(100,Math.round((c.credit_balance||0)/c.credit_limit*100)):0;
          
          return <div key={c.id} style={{background:'#fff',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:overdue?'2px solid #C2412D':hasDebt?'2px solid #FCA5A5':'1px solid #D6E2DB'}}>
            {/* Overdue banner */}
            {overdue&&<div style={{background:'#FBECE9',borderRadius:8,padding:'4px 10px',marginBottom:8,fontSize:11,fontWeight:700,color:'#B91C1C',display:'flex',justifyContent:'space-between'}}>
              <span>🚨 Deni limechelewa siku {getDaysOverdue(c.id)}!</span>
              {c.phone&&<span onClick={()=>sendReminder(c)} style={{cursor:'pointer',textDecoration:'underline'}}>Kumbusha</span>}
            </div>}

            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:overdue?'#FBECE9':hasDebt?'#FFF8E6':'#E6F2EC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:overdue?'#C2412D':hasDebt?'#F2B705':'#0A6E47'}}>{c.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{c.name}</div>
                  <div style={{fontSize:12,color:'#5C6A62'}}>{c.phone||'Hakuna simu'}</div>
                  {c.address&&<div style={{fontSize:11,color:'#9AA5A0'}}>{c.address}</div>}
                </div>
              </div>
              <div style={{display:'flex',gap:3}}>
                <button onClick={()=>{setLimitModal({open:true,cust:c});setLimitAmt(c.credit_limit||'')}} title="Weka kikomo" style={{background:'#EFF6FF',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#3B82F6',fontSize:12}}>📏</button>
                <button onClick={()=>setEditModal({open:true,cust:{...c}})} style={{background:'#F6F8F7',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#475569'}}>{IC.gear}</button>
                <button onClick={()=>window.confirm(`Futa "${c.name}"?`)&&deleteCustomer(c.id)} style={{background:'#FBECE9',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#C2412D'}}>{IC.del}</button>
              </div>
            </div>

            {/* Financial Info */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div style={{background:overdue?'#FBECE9':hasDebt?'#FFF8E6':'#E6F2EC',borderRadius:10,padding:'8px 10px'}}>
                <div style={{fontSize:10,color:'#9AA5A0',fontWeight:600}}>DENI</div>
                <div style={{fontWeight:800,fontSize:18,color:overdue?'#B91C1C':hasDebt?'#C2412D':'#0A6E47'}}>{fm(c.credit_balance||0)}</div>
                {hasDebt&&<div style={{fontSize:10,color:overdue?'#B91C1C':'#F2B705',fontWeight:600}}>{overdue?'Chelewa!':age>0?`Siku ${age}`:'Leo'}</div>}
              </div>
              <div style={{background:'#F6F8F7',borderRadius:10,padding:'8px 10px'}}>
                <div style={{fontSize:10,color:'#9AA5A0',fontWeight:600}}>AMENUNUA</div>
                <div style={{fontWeight:800,fontSize:18,color:'#17231D'}}>{fm(c.total_spent||0)}</div>
                <div style={{fontSize:10,color:'#5C6A62'}}>{custSales.length} mauzo</div>
              </div>
            </div>

            {/* Credit Limit Bar */}
            {c.credit_limit&&<div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#5C6A62',marginBottom:2}}>
                <span>Kikomo: {fm(c.credit_limit)}</span>
                <span style={{color:limitUsed>=90?'#C2412D':limitUsed>=70?'#F2B705':'#0A6E47'}}>{limitUsed}%</span>
              </div>
              <div style={{height:6,background:'#F6F8F7',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${limitUsed}%`,background:limitUsed>=90?'#C2412D':limitUsed>=70?'#F2B705':'#0A6E47',borderRadius:3}}/>
              </div>
            </div>}

            {/* Last purchase */}
            {lastSale&&<div style={{background:'#F6F8F7',borderRadius:8,padding:'4px 10px',marginBottom:8,fontSize:11,color:'#5C6A62'}}>
              Mauzo: {fmtDate(lastSale.created_at)} — {fm(lastSale.total)} {lastSale.payment_method==='credit'?'(Deni)':''}
            </div>}

            {/* Action Buttons */}
            <div style={{display:'flex',gap:5}}>
              {hasDebt&&<button onClick={()=>{setPayModal({open:true,cust:c});setPayAmt('');setPayNote('');setPayMethod('cash')}} style={{flex:1,padding:'8px 6px',borderRadius:8,border:'none',background:'#0A6E47',color:'#fff',fontWeight:700,fontSize:11,cursor:'pointer'}}>💰 Pokea</button>}
              {hasDebt&&c.phone&&<button onClick={()=>sendReminder(c)} style={{padding:'8px 6px',borderRadius:8,border:'none',background:'#E6F2EC',color:'#15803D',fontWeight:700,fontSize:11,cursor:'pointer'}}>📱</button>}
              <button onClick={()=>setHistModal({open:true,cust:c})} style={{flex:1,padding:'8px 6px',borderRadius:8,border:'1.5px solid #D6E2DB',background:'#fff',color:'#475569',fontWeight:600,fontSize:11,cursor:'pointer'}}>📋 Historia</button>
            </div>
          </div>;
        })}
      </div>
      {!filtered.length&&<Empty icon="👥" text={search?'Hakuna matokeo':'Ongeza wateja wako'}/>}
    </div>}

    {/* ADD CUSTOMER MODAL */}
    <Modal open={modal} onClose={()=>setModal(false)} title="Ongeza Mteja Mpya">
      <PhoneNameInput label="Simu" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} currentName={f.name} onName={n=>setF(p=>({...p,name:n}))}/>
      <Input label="Jina Kamili *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Mf: Mama Fatuma"/>
      <Input label="Email" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@mfano.com"/>
      <Input label="Anwani" value={f.address} onChange={e=>setF({...f,address:e.target.value})} placeholder="Mtaa, Kata"/>
      <Btn onClick={async()=>{
        if(!f.name.trim())return alert('Weka jina la mteja!');
        await addCustomer({name:f.name.trim(),phone:f.phone.trim(),email:f.email.trim(),address:f.address.trim()});
        setModal(false);setF({name:'',phone:'',email:'',address:''});
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi Mteja</Btn>
    </Modal>

    {/* EDIT CUSTOMER MODAL */}
    <Modal open={editModal.open} onClose={()=>setEditModal({open:false,cust:null})} title="Hariri Mteja">
      {editModal.cust&&<>
        <Input label="Jina" value={editModal.cust.name} onChange={e=>setEditModal({...editModal,cust:{...editModal.cust,name:e.target.value}})}/>
        <Input label="Simu" value={editModal.cust.phone||''} onChange={e=>setEditModal({...editModal,cust:{...editModal.cust,phone:e.target.value}})}/>
        <Input label="Email" value={editModal.cust.email||''} onChange={e=>setEditModal({...editModal,cust:{...editModal.cust,email:e.target.value}})}/>
        <Input label="Anwani" value={editModal.cust.address||''} onChange={e=>setEditModal({...editModal,cust:{...editModal.cust,address:e.target.value}})}/>
        <Btn onClick={async()=>{
          await updateCustomer(editModal.cust.id,{name:editModal.cust.name,phone:editModal.cust.phone,email:editModal.cust.email,address:editModal.cust.address});
          setEditModal({open:false,cust:null});
        }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
      </>}
    </Modal>

    {/* SET CREDIT LIMIT MODAL */}
    <Modal open={limitModal.open} onClose={()=>setLimitModal({open:false,cust:null})} title={`Kikomo cha Deni - ${limitModal.cust?.name||''}`}>
      {limitModal.cust&&<>
        <div style={{background:'#EFF6FF',borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:'#1E40AF'}}>
          Kikomo cha deni ni kiasi cha juu ambacho mteja anaweza kukopa. Akizidi kikomo, mfumo utamzuia.
        </div>
        <div style={{background:'#F6F8F7',borderRadius:10,padding:10,marginBottom:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div><div style={{fontSize:10,color:'#9AA5A0'}}>Deni Sasa</div><div style={{fontWeight:800,fontSize:16,color:'#C2412D'}}>{fm(limitModal.cust.credit_balance||0)}</div></div>
          <div><div style={{fontSize:10,color:'#9AA5A0'}}>Kikomo Sasa</div><div style={{fontWeight:800,fontSize:16,color:'#3B82F6'}}>{limitModal.cust.credit_limit?fm(limitModal.cust.credit_limit):'Hakuna'}</div></div>
        </div>
        <Input label="Kikomo Kipya (TZS)" type="number" value={limitAmt} onChange={e=>setLimitAmt(e.target.value)} placeholder="Mf: 100000"/>
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {[50000,100000,200000,500000].map(a=><button key={a} onClick={()=>setLimitAmt(String(a))} style={{padding:'6px 12px',borderRadius:8,border:limitAmt===String(a)?'2px solid #3B82F6':'1px solid #D6E2DB',background:limitAmt===String(a)?'#EFF6FF':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:limitAmt===String(a)?'#3B82F6':'#5C6A62'}}>{fm(a)}</button>)}
          <button onClick={()=>setLimitAmt('0')} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #FCA5A5',background:'#FBECE9',fontSize:12,fontWeight:600,cursor:'pointer',color:'#C2412D'}}>Ondoa</button>
        </div>
        <Btn onClick={async()=>{
          await setCreditLimit(limitModal.cust.id,+limitAmt||0);
          alert(+limitAmt?`Kikomo kimewekwa: ${fm(+limitAmt)}`:'Kikomo kimeondolewa');
          setLimitModal({open:false,cust:null});
        }} style={{width:'100%',justifyContent:'center',marginTop:8}}>📏 Weka Kikomo</Btn>
      </>}
    </Modal>

    {/* RECEIVE PAYMENT MODAL */}
    <Modal open={payModal.open} onClose={()=>setPayModal({open:false,cust:null})} title="Pokea Malipo ya Deni">
      {payModal.cust&&<>
        <div style={{background:'#FBECE9',borderRadius:12,padding:14,marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:13,color:'#5C6A62'}}>Deni la {payModal.cust.name}</div>
          <div style={{fontSize:30,fontWeight:900,color:'#C2412D'}}>{fm(payModal.cust.credit_balance||0)}</div>
        </div>
        <Input label="Kiasi cha Malipo (TZS)" type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="Mf: 5000"/>
        <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          {[5000,10000,20000,50000].map(amt=>
            <button key={amt} onClick={()=>setPayAmt(String(amt))} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #D6E2DB',background:payAmt===String(amt)?'#E6F2EC':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:payAmt===String(amt)?'#0A6E47':'#5C6A62'}}>{(amt/1000)}K</button>
          )}
          <button onClick={()=>setPayAmt(String(payModal.cust.credit_balance||0))} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #0A6E47',background:'#E6F2EC',fontSize:12,fontWeight:700,cursor:'pointer',color:'#0A6E47'}}>Lipa Yote</button>
        </div>
        <div style={{marginBottom:10}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Njia ya Malipo</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
            {[{v:'cash',l:'💵 Taslimu'},{v:'mpesa',l:'M-Pesa'},{v:'airtel',l:'Airtel'},{v:'tigo',l:'Tigo'},{v:'halopesa',l:'HaloPesa'},{v:'nmb',l:'🏦 NMB'},{v:'crdb',l:'🏦 CRDB'}].map(m=>
              <button key={m.v} onClick={()=>setPayMethod(m.v)} style={{padding:'8px 4px',borderRadius:8,border:payMethod===m.v?'2px solid #0A6E47':'1.5px solid #D6E2DB',background:payMethod===m.v?'#E6F2EC':'#fff',fontSize:11.5,fontWeight:700,cursor:'pointer',color:payMethod===m.v?'#0A6E47':'#5C6A62'}}>{m.l}</button>
            )}
          </div>
        </div>
        <Input label="Maelezo (si lazima)" value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Mf: Malipo ya sehemu"/>
        {payAmt&&<div style={{background:'#E6F2EC',borderRadius:10,padding:10,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Deni sasa:</span><span style={{fontWeight:700,color:'#C2412D'}}>{fm(payModal.cust.credit_balance||0)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Analipa:</span><span style={{fontWeight:700,color:'#0A6E47'}}>-{fm(+payAmt)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:800,borderTop:'2px solid #C2DED1',paddingTop:6,marginTop:6}}><span>Baki:</span><span style={{color:(payModal.cust.credit_balance||0)-(+payAmt)>0?'#C2412D':'#0A6E47'}}>{fm(Math.max(0,(payModal.cust.credit_balance||0)-(+payAmt)))}</span></div>
        </div>}
        <Btn onClick={async()=>{
          const amt=+payAmt;if(!amt||amt<=0)return alert('Weka kiasi sahihi!');
          if(amt>(payModal.cust.credit_balance||0))return alert('Kiasi ni kikubwa kuliko deni!');
          await receivePayment(payModal.cust.id,amt,payNote,payMethod);
          const newBal=Math.max(0,(payModal.cust.credit_balance||0)-amt);
          alert(`✅ MALIPO YAMEPOKEWA!\n\n💵 Kiasi: ${fm(amt)}\n👤 Mteja: ${payModal.cust.name}\n📊 Deni la zamani: ${fm(payModal.cust.credit_balance||0)}\n📊 Deni jipya: ${fm(newBal)}\n\n💡 Pesa hii sasa imeongezwa kwenye "Pesa Leo" ya Dashboard!`);
          setPayModal({open:false,cust:null});setPayAmt('');setPayNote('');
        }} style={{width:'100%',justifyContent:'center',marginTop:8,background:'#0A6E47'}}>💰 Pokea Malipo {payAmt?fm(+payAmt):''}</Btn>
      </>}
    </Modal>

    {/* CREDIT HISTORY MODAL */}
    <Modal open={histModal.open} onClose={()=>setHistModal({open:false,cust:null})} title={`Historia - ${histModal.cust?.name||''}`} wide>
      {histModal.cust&&<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
          <div style={{background:'#FBECE9',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#9AA5A0'}}>Deni</div>
            <div style={{fontWeight:800,fontSize:18,color:'#C2412D'}}>{fm(histModal.cust.credit_balance||0)}</div>
          </div>
          <div style={{background:'#F6F8F7',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#9AA5A0'}}>Amenunua</div>
            <div style={{fontWeight:800,fontSize:18}}>{fm(histModal.cust.total_spent||0)}</div>
          </div>
          <div style={{background:'#E6F2EC',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#9AA5A0'}}>Kikomo</div>
            <div style={{fontWeight:800,fontSize:18,color:'#3B82F6'}}>{histModal.cust.credit_limit?fm(histModal.cust.credit_limit):'—'}</div>
          </div>
        </div>

        <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>Shughuli za Deni</h4>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {getCustCredits(histModal.cust.id).length?getCustCredits(histModal.cust.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(tx=>{
            const isOverdueTx=tx.type==='credit'&&tx.status!=='paid'&&tx.due_date&&new Date(tx.due_date)<new Date();
            return <div key={tx.id} style={{padding:'10px 12px',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',background:isOverdueTx?'#FBECE9':'transparent'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:tx.type==='credit'?'#FBECE9':'#E6F2EC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                  {tx.type==='credit'?'📤':'💰'}
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:tx.type==='credit'?'#C2412D':'#0A6E47'}}>
                    {tx.type==='credit'?'Deni':'Malipo'} {tx.payment_method&&tx.type==='payment'?`(${tx.payment_method})`:''}
                  </div>
                  <div style={{fontSize:11,color:'#9AA5A0'}}>{tx.note?.slice(0,50)}</div>
                  <div style={{fontSize:10,color:'#CBD5E1'}}>{fmtDate(tx.created_at)}</div>
                  {tx.due_date&&tx.type==='credit'&&<div style={{fontSize:10,color:isOverdueTx?'#B91C1C':'#5C6A62'}}>Lipa kabla: {new Date(tx.due_date).toLocaleDateString('sw-TZ')} {isOverdueTx?'⚠️ CHELEWA!':''}</div>}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,fontSize:14,color:tx.type==='credit'?'#C2412D':'#0A6E47'}}>{tx.type==='credit'?'+':'-'}{fm(tx.amount)}</div>
                {tx.type==='credit'&&<Badge color={tx.status==='paid'?'#0A6E47':tx.status==='partial'?'#F2B705':'#C2412D'}>{tx.status==='paid'?'Imelipwa':tx.status==='partial'?'Sehemu':'Haijalipwa'}</Badge>}
              </div>
            </div>;
          }):<div style={{textAlign:'center',padding:20,color:'#9AA5A0'}}>Hakuna shughuli</div>}
        </div>

        <h4 style={{fontSize:14,fontWeight:700,margin:'16px 0 10px'}}>Mauzo ({getCustSales(histModal.cust.id).length})</h4>
        <div style={{maxHeight:200,overflowY:'auto'}}>
          {getCustSales(histModal.cust.id).map(s=>(
            <div key={s.id} style={{padding:'6px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.items?.map(i=>i.name).join(', ').slice(0,40)}</div><div style={{fontSize:11,color:'#9AA5A0'}}>{fmtDate(s.created_at)}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:13}}>{fm(s.total)}</div><Badge color={s.payment_method==='credit'?'#C2412D':'#0A6E47'}>{payLabel(s.payment_method)}</Badge></div>
            </div>
          ))}
        </div>
      </>}
    </Modal>
  </div>;
}

// ===== NOTIFICATIONS =====
export function NotifsPage(){
  const{notifications,markAllRead,markRead}=useApp();
  const[filter,setFilter]=useState('all');
  const sty=t=>({bg:t==='danger'?'#FBECE9':t==='warning'?'#FFF8E6':t==='success'?'#E6F2EC':'#EFF6FF',ac:t==='danger'?'#C2412D':t==='warning'?'#F2B705':t==='success'?'#0A6E47':'#3B82F6',em:t==='danger'?'🚨':t==='warning'?'⚠️':t==='success'?'✅':'📋'});
  const unread=notifications.filter(n=>!n.is_read).length;
  const filtered=filter==='all'?notifications:filter==='unread'?notifications.filter(n=>!n.is_read):notifications.filter(n=>n.type===filter);

  return <div className="page-enter">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>🔔 Arifa {unread>0&&<span style={{background:'#C2412D',color:'#fff',fontSize:11,padding:'2px 8px',borderRadius:10,marginLeft:6}}>{unread} mpya</span>}</h3>
      {unread>0&&<Btn v="ghost" onClick={markAllRead}>Soma Zote</Btn>}
    </div>

    {/* Filter tabs */}
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
      {[{v:'all',l:`Zote (${notifications.length})`},{v:'unread',l:`Mpya (${unread})`},{v:'danger',l:'🚨 Hatari'},{v:'warning',l:'⚠️ Onyo'},{v:'success',l:'✅ Mafanikio'},{v:'info',l:'📋 Taarifa'}].map(f=>
        <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:'6px 12px',borderRadius:8,border:filter===f.v?'2px solid #0A6E47':'1px solid #D6E2DB',background:filter===f.v?'#E6F2EC':'#fff',fontSize:11,fontWeight:filter===f.v?700:500,cursor:'pointer',color:filter===f.v?'#0A6E47':'#5C6A62'}}>{f.l}</button>
      )}
    </div>

    <div className="card">
      {!filtered.length?<Empty icon="🔔" text={filter==='all'?'Hakuna arifa':'Hakuna arifa za aina hii'}/>:filtered.slice(0,50).map(n=>{
        const s=sty(n.type);
        return <div key={n.id} onClick={()=>!n.is_read&&markRead(n.id)} style={{padding:'12px 14px',marginBottom:8,borderRadius:10,background:n.is_read?'#FAFAFA':s.bg,borderLeft:`4px solid ${s.ac}`,display:'flex',gap:10,cursor:n.is_read?'default':'pointer',transition:'all 0.2s',boxShadow:n.is_read?'none':'0 1px 4px rgba(0,0,0,0.04)'}}>
          <span style={{fontSize:22,marginTop:2}}>{s.em}</span>
          <div style={{flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontWeight:n.is_read?600:800,fontSize:14,color:n.is_read?'#5C6A62':'#17231D'}}>{n.title}</div>
              {!n.is_read&&<span style={{width:8,height:8,borderRadius:'50%',background:s.ac,flexShrink:0}}/>}
            </div>
            <div style={{fontSize:13,color:'#475569',marginTop:4,lineHeight:1.5}}>{n.message}</div>
            <div style={{fontSize:11,color:'#9AA5A0',marginTop:6}}>{fmtDate(n.created_at)}</div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ===== BRANCHES =====
export function BranchesPage(){
  const{getBranches,addBranch,updateBranch,deleteBranch,activeBranch,setActiveBranch,products,sales,expenses,currency,maxBranches,biz}=useApp();
  const myBranches=getBranches();const fm=n=>fmtMoney(n,currency||'TZS');const[modal,setModal]=useState(false);const[editModal,setEditModal]=useState({open:false,branch:null});const[f,setF]=useState({name:'',region:'',district:'',address:'',phone:'',is_active:true});
  const branchStats=bid=>{const bp=products.filter(p=>p.branch_id===bid);const bs=sales.filter(s=>s.branch_id===bid);const totalSales=bs.reduce((a,s)=>a+s.total,0);const profit=bs.reduce((a,s)=>a+(s.profit||0),0);const stockValue=bp.reduce((a,p)=>a+((p.buy_price||0)*(p.quantity||0)),0);return{products:bp.length,sales:bs.length,totalSales,profit,stockValue}};
  const canAddMore=myBranches.length<maxBranches;
  // Muhtasari wa matawi yote
  const summary=React.useMemo(()=>{
    let totalRev=0,activeCount=0,best=null,bestRev=-1;
    myBranches.forEach(b=>{const st=branchStats(b.id);totalRev+=st.totalSales;if(b.is_active!==false)activeCount++;if(st.totalSales>bestRev){bestRev=st.totalSales;best=b;}});
    return{totalRev,activeCount,best,bestRev:Math.max(0,bestRev)};
  },[myBranches,sales,products]);
  return <div className="page-enter">
    {/* HEADER */}
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>🏪 Usimamizi wa Matawi</h2>
      <p style={{fontSize:12,color:'#5C6A62',margin:0}}>Ongeza, hariri, na linganisha utendaji wa kila tawi.</p>
    </div>

    {/* SUMMARY BAR */}
    {myBranches.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'#9AA5A0',fontWeight:700,marginBottom:5}}>🏪 Jumla ya Matawi</div><div style={{fontSize:19,fontWeight:900,color:'#0A6E47'}}>{myBranches.length}<span style={{fontSize:12,color:'#0A6E47',fontWeight:600}}> ({summary.activeCount} hai)</span></div></div>
      <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'#9AA5A0',fontWeight:700,marginBottom:5}}>💰 Mapato Yote</div><div style={{fontSize:19,fontWeight:900,color:'#3B82F6'}}>{fm(summary.totalRev)}</div></div>
      <div className="card" style={{padding:14}}><div style={{fontSize:11,color:'#9AA5A0',fontWeight:700,marginBottom:5}}>🏆 Tawi Bora</div><div style={{fontSize:15,fontWeight:900,color:'#F2B705'}}>{summary.best?.name||'-'}</div><div style={{fontSize:10,color:'#9AA5A0'}}>{fm(summary.bestRev)}</div></div>
    </div>}

    {/* Ongeza tawi — kitufe kikubwa (matawi bila kikomo kwa sasa) */}
    <button onClick={()=>setModal(true)} style={{width:'100%',padding:'15px',marginBottom:14,borderRadius:14,border:'2px dashed #86EFAC',background:'#E6F2EC',color:'#0A6E47',fontWeight:800,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
      {IC.plus} Ongeza Tawi Jipya
    </button>
    <div style={{fontSize:11.5,color:'#15803D',background:'#ECFDF5',border:'1px solid #C2DED1',borderRadius:8,padding:'7px 12px',marginBottom:14,textAlign:'center'}}>✨ Kwa sasa unaweza kufungua matawi <b>bila kikomo</b> — bure!</div>

    {/* Switcher ya tawi linalotumika */}
    {myBranches.length>0&&<div style={{background:'#fff',borderRadius:14,padding:'12px 16px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      <span style={{fontSize:13,fontWeight:700,marginRight:4}}>Unaona:</span>
      <button onClick={()=>setActiveBranch(null)} style={{padding:'6px 14px',borderRadius:8,border:!activeBranch?'2px solid #0A6E47':'1.5px solid #D6E2DB',background:!activeBranch?'#E6F2EC':'#fff',fontWeight:!activeBranch?700:500,fontSize:12,color:!activeBranch?'#0A6E47':'#5C6A62',cursor:'pointer'}}>📊 Yote</button>
      {myBranches.map(b=><button key={b.id} onClick={()=>setActiveBranch(b.id)} style={{padding:'6px 14px',borderRadius:8,border:activeBranch===b.id?'2px solid #0A6E47':'1.5px solid #D6E2DB',background:activeBranch===b.id?'#E6F2EC':'#fff',fontWeight:activeBranch===b.id?700:500,fontSize:12,color:activeBranch===b.id?'#0A6E47':'#5C6A62',cursor:'pointer'}}>🏪 {b.name}</button>)}
    </div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      {myBranches.map(b=>{const st=branchStats(b.id);return <div key={b.id} className="card" style={{border:activeBranch===b.id?'2px solid #0A6E47':'1px solid #D6E2DB'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:38,height:38,borderRadius:10,background:b.is_active!==false?'#E6F2EC':'#F6F8F7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{b.is_active!==false?'🏪':'⏸'}</div><div><div style={{fontWeight:700,fontSize:14}}>{b.name}</div><div style={{fontSize:11,color:'#5C6A62'}}>{b.location||'-'}</div>{b.phone&&<div style={{fontSize:10,color:'#9AA5A0'}}>📞 {b.phone}</div>}</div></div>
          <div style={{display:'flex',gap:4}}><button onClick={()=>setEditModal({open:true,branch:{...b}})} style={{background:'#F6F8F7',border:'none',borderRadius:6,padding:4,cursor:'pointer'}}>{IC.gear}</button><button onClick={()=>window.confirm('Futa?')&&deleteBranch(b.id)} style={{background:'#FBECE9',border:'none',borderRadius:6,padding:4,color:'#C2412D',cursor:'pointer'}}>{IC.del}</button></div>
        </div>
        {b.branch_code&&<div style={{fontSize:10,color:'#9AA5A0',marginBottom:8}}>Nambari: <b style={{color:'#5C6A62'}}>{b.branch_code}</b> • {b.is_active!==false?<span style={{color:'#0A6E47'}}>● Inafanya kazi</span>:<span style={{color:'#9AA5A0'}}>⏸ Imesimamishwa</span>}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          <div style={{background:'#F6F8F7',borderRadius:6,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#9AA5A0'}}>Bidhaa</div><div style={{fontWeight:800,fontSize:16}}>{st.products}</div></div>
          <div style={{background:'#F6F8F7',borderRadius:6,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#9AA5A0'}}>Mauzo</div><div style={{fontWeight:800,fontSize:16}}>{st.sales}</div></div>
          <div style={{background:'#E6F2EC',borderRadius:6,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#9AA5A0'}}>Mapato</div><div style={{fontWeight:800,fontSize:13,color:'#0A6E47'}}>{fm(st.totalSales)}</div></div>
          <div style={{background:'#EFF6FF',borderRadius:6,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#9AA5A0'}}>Faida</div><div style={{fontWeight:800,fontSize:13,color:'#3B82F6'}}>{fm(st.profit)}</div></div>
        </div>
        <div style={{fontSize:10,color:'#9AA5A0',marginTop:6,textAlign:'center'}}>📦 Thamani ya stock: <b style={{color:'#5C6A62'}}>{fm(st.stockValue)}</b></div>
        <button onClick={()=>setActiveBranch(activeBranch===b.id?null:b.id)} style={{width:'100%',marginTop:8,padding:'7px 0',borderRadius:8,border:'none',background:activeBranch===b.id?'#0A6E47':'#F6F8F7',color:activeBranch===b.id?'#fff':'#475569',fontWeight:600,fontSize:12,cursor:'pointer'}}>{activeBranch===b.id?'Limechaguliwa ✓':'Chagua'}</button>
      </div>})}
    </div>
    {!myBranches.length&&<div className="card" style={{marginTop:12}}><Empty icon="🏪" text="Ongeza tawi la kwanza!"/></div>}
    <Modal open={modal} onClose={()=>setModal(false)} title="🏪 Tawi Jipya">
      <Input label="Jina la Tawi *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Mfano: Tawi la Kariakoo"/>
      <Input label="Mkoa" value={f.region||''} onChange={e=>setF({...f,region:e.target.value})} placeholder="Mfano: Dar es Salaam"/>
      <Input label="Wilaya" value={f.district||''} onChange={e=>setF({...f,district:e.target.value})} placeholder="Mfano: Ilala"/>
      <Input label="Anwani" value={f.address||''} onChange={e=>setF({...f,address:e.target.value})} placeholder="Mfano: Kariakoo, Barabara ya Msimbazi"/>
      <Input label="Simu" value={f.phone||''} onChange={e=>setF({...f,phone:e.target.value})} placeholder="07XXXXXXXX"/>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:600,color:'#5C6A62',display:'block',marginBottom:4}}>Hali</label>
        <select value={f.is_active!==false?'active':'inactive'} onChange={e=>setF({...f,is_active:e.target.value==='active'})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,outline:'none'}}>
          <option value="active">✅ Inafanya Kazi</option>
          <option value="inactive">⏸ Imesimamishwa</option>
        </select>
      </div>
      <Btn onClick={async()=>{
        if(!f.name.trim())return alert('Weka jina la tawi!');
        const location=[f.region,f.district].filter(Boolean).join(', ');
        await addBranch(f.name.trim(),location,{address:f.address,phone:f.phone,is_active:f.is_active!==false});
        setModal(false);
        setF({name:'',region:'',district:'',address:'',phone:'',is_active:true});
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi Tawi</Btn>
    </Modal>
    <Modal open={editModal.open} onClose={()=>setEditModal({open:false,branch:null})} title="✏️ Hariri Tawi">
      {editModal.branch&&<>
        <Input label="Jina la Tawi *" value={editModal.branch.name} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,name:e.target.value}})}/>
        <Input label="Mkoa" value={editModal.branch.region||''} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,region:e.target.value}})}/>
        <Input label="Wilaya" value={editModal.branch.district||''} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,district:e.target.value}})}/>
        <Input label="Anwani" value={editModal.branch.address||''} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,address:e.target.value}})}/>
        <Input label="Simu" value={editModal.branch.phone||''} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,phone:e.target.value}})}/>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:'#5C6A62',display:'block',marginBottom:4}}>Hali</label>
          <select value={editModal.branch.is_active!==false?'active':'inactive'} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,is_active:e.target.value==='active'}})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,outline:'none'}}>
            <option value="active">✅ Inafanya Kazi</option>
            <option value="inactive">⏸ Imesimamishwa</option>
          </select>
        </div>
        <Btn onClick={async()=>{
          const location=[editModal.branch.region,editModal.branch.district].filter(Boolean).join(', ');
          await updateBranch(editModal.branch.id,{
            name:editModal.branch.name,
            location,
            address:editModal.branch.address,
            phone:editModal.branch.phone,
            is_active:editModal.branch.is_active!==false,
          });
          setEditModal({open:false,branch:null});
        }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi Mabadiliko</Btn>
      </>}
    </Modal>
  </div>;
}

// ===== PROFIT GOALS PAGE =====
export function GoalsPage(){
  const{currency,saveGoal,getGoal,goalProgress,sales}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[dGoal,setDGoal]=useState(getGoal('daily')||'');
  const[wGoal,setWGoal]=useState(getGoal('weekly')||'');
  const[mGoal,setMGoal]=useState(getGoal('monthly')||'');

  const ProgressBar=({label,data,color,emoji})=>(
    <div className="card" style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:0,color}}>{emoji} {label}</h3>
        {data.pct>=100&&<Badge color="#0A6E47">Umefanikiwa!</Badge>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
        <span style={{fontSize:28,fontWeight:900,color:data.pct>=100?'#0A6E47':color}}>{fm(data.current)}</span>
        <span style={{fontSize:14,color:'#5C6A62'}}>/ {fm(data.goal)}</span>
      </div>
      <div style={{height:14,background:'#F6F8F7',borderRadius:7,overflow:'hidden',marginBottom:6}}>
        <div style={{height:'100%',width:`${data.pct}%`,background:data.pct>=100?'linear-gradient(90deg,#19C277,#06502F)':data.pct>60?`linear-gradient(90deg,${color},${color}CC)`:'#F2B705',borderRadius:7,transition:'width 0.8s ease',position:'relative'}}>
          {data.pct>15&&<span style={{position:'absolute',right:6,top:0,color:'#fff',fontSize:10,fontWeight:700,lineHeight:'14px'}}>{data.pct}%</span>}
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#5C6A62'}}>
        <span>{data.pct>=100?'🎉 Lengo limefikiwa!':data.pct>50?'Karibu...':'Jitahidi zaidi!'}</span>
        <span>{data.goal>data.current?`Imebaki: ${fm(data.goal-data.current)}`:'Umezidi lengo!'}</span>
      </div>
    </div>
  );

  return <div style={{maxWidth:600}}>
    {/* Set Goals */}
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 16px'}}>🎯 Weka Malengo ya Faida</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end',marginBottom:10}}>
        <Input label="Lengo la Siku (TZS)" type="number" value={dGoal} onChange={e=>setDGoal(e.target.value)} placeholder="Mf: 50000"/>
        <Btn onClick={()=>{saveGoal('daily',+dGoal);alert('Limehifadhiwa!')}} style={{marginBottom:12}}>Hifadhi</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end',marginBottom:10}}>
        <Input label="Lengo la Wiki (TZS)" type="number" value={wGoal} onChange={e=>setWGoal(e.target.value)} placeholder="Mf: 300000"/>
        <Btn onClick={()=>{saveGoal('weekly',+wGoal);alert('Limehifadhiwa!')}} style={{marginBottom:12}}>Hifadhi</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end'}}>
        <Input label="Lengo la Mwezi (TZS)" type="number" value={mGoal} onChange={e=>setMGoal(e.target.value)} placeholder="Mf: 1000000"/>
        <Btn onClick={()=>{saveGoal('monthly',+mGoal);alert('Limehifadhiwa!')}} style={{marginBottom:12}}>Hifadhi</Btn>
      </div>
    </div>

    {/* Progress */}
    {goalProgress.daily.goal>0&&<ProgressBar label="Lengo la Leo" data={goalProgress.daily} color="#0A6E47" emoji="☀️"/>}
    {goalProgress.weekly.goal>0&&<ProgressBar label="Lengo la Wiki" data={goalProgress.weekly} color="#3B82F6" emoji="📅"/>}
    {goalProgress.monthly.goal>0&&<ProgressBar label="Lengo la Mwezi" data={goalProgress.monthly} color="#8B5CF6" emoji="📊"/>}

    {!goalProgress.daily.goal&&!goalProgress.weekly.goal&&!goalProgress.monthly.goal&&
      <div className="card" style={{textAlign:'center',padding:30}}>
        <div style={{fontSize:40,marginBottom:8}}>🎯</div>
        <div style={{fontSize:16,fontWeight:700,color:'#17231D',marginBottom:4}}>Weka Malengo Yako!</div>
        <div style={{fontSize:13,color:'#5C6A62'}}>Weka lengo la faida kwa siku, wiki, au mwezi — mfumo utakuonyesha maendeleo yako.</div>
      </div>
    }
  </div>;
}

// ===== PRODUCT ANALYTICS PAGE — KITAALAMU =====

// ===== FAIDA YA KILA BIDHAA ILIYOUZWA =====
// Gharama ya bidhaa moja kwenye mauzo. Vyanzo kwa mpangilio:
//   cost       — iliyohifadhiwa na database (mauzo ya muuzaji)
//   buyPrice   — iliyohifadhiwa na kivinjari (mauzo ya mwenye duka)

export function ProductAnalyticsPage(){
  const{products,sales,returns,currency}=useApp();
  const costMap=useMemo(()=>buildCostMap(products),[products]);
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[period,setPeriod]=useState('all');
  const[search,setSearch]=useState('');
  const[sortBy,setSortBy]=useState('revenue');
  
  // Filter sales by period
  const now=new Date();
  const filteredSales=sales.filter(s=>{
    if(period==='all')return true;
    const d=new Date(s.created_at);
    if(period==='today')return d.toDateString()===now.toDateString();
    if(period==='week')return (now-d)<=7*86400000;
    if(period==='month')return (now-d)<=30*86400000;
    if(period==='year')return (now-d)<=365*86400000;
    return true;
  });
  
  // Calculate per-product analytics
  const analytics=useMemo(()=>{
    const stats={};
    
    products.forEach(p=>{
      stats[p.id]={
        id:p.id,
        name:p.name,
        category:p.category||'Nyingine',
        image:p.image,
        buyPrice:p.buy_price||0,
        sellPrice:p.sell_price||0,
        currentStock:p.quantity||0,
        minStock:p.min_stock||5,
        unit:p.unit||'Kipande',
        totalSold:0,
        totalRevenue:0,
        totalProfit:0,
        totalReturns:0,
        salesCount:0,
        lastSaleDate:null,
        firstSaleDate:null,
      };
    });
    
    // Aggregate sales
    filteredSales.forEach(s=>{
      (s.items||[]).forEach(item=>{
        const pid=item.productId||item.product_id;
        // Bidhaa iliyofutwa kwenye katalogi bado ina mauzo — tusiiruke,
        // vinginevyo faida yake ingetoweka kwenye ripoti.
        if(!stats[pid]){
          stats[pid]={
            id:pid,name:(item.name||'Bidhaa iliyofutwa')+' (haipo tena)',
            category:'Zilizofutwa',image:null,
            buyPrice:unitCost(item,costMap),sellPrice:+item.price||0,
            currentStock:0,minStock:0,unit:'Kipande',
            totalSold:0,totalRevenue:0,totalProfit:0,totalReturns:0,
            salesCount:0,lastSaleDate:null,firstSaleDate:null,deleted:true,
          };
        }
        const frac=item.fraction||1;
        const qty=item.qty*frac;
        const revenue=item.qty*item.price*frac;
        const profit=itemProfit(item,costMap);
        stats[pid].totalSold+=qty;
        stats[pid].totalRevenue+=revenue;
        stats[pid].totalProfit+=profit;
        stats[pid].salesCount++;
        const d=new Date(s.created_at);
        if(!stats[pid].lastSaleDate||d>new Date(stats[pid].lastSaleDate))stats[pid].lastSaleDate=s.created_at;
        if(!stats[pid].firstSaleDate||d<new Date(stats[pid].firstSaleDate))stats[pid].firstSaleDate=s.created_at;
      });
    });
    
    // Subtract returns
    returns.forEach(r=>{
      (r.items||[]).forEach(item=>{
        if(!stats[item.productId])return;
        const qty=item.qty*(item.fraction||1);
        stats[item.productId].totalReturns+=qty;
      });
    });
    
    return Object.values(stats);
  },[products,filteredSales,returns]);
  
  // Sort and filter
  const sorted=[...analytics]
    .filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||p.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sortBy==='revenue')return b.totalRevenue-a.totalRevenue;
      if(sortBy==='sold')return b.totalSold-a.totalSold;
      if(sortBy==='profit')return b.totalProfit-a.totalProfit;
      if(sortBy==='slowest')return a.totalSold-b.totalSold;
      if(sortBy==='stock')return b.currentStock-a.currentStock;
      if(sortBy==='name')return a.name.localeCompare(b.name);
      return 0;
    });
  
  // Summary stats
  const totalProducts=analytics.length;
  const totalRevenue=analytics.reduce((s,p)=>s+p.totalRevenue,0);
  const totalProfit=analytics.reduce((s,p)=>s+p.totalProfit,0);
  const totalSold=analytics.reduce((s,p)=>s+p.totalSold,0);
  const bestSeller=[...analytics].sort((a,b)=>b.totalSold-a.totalSold)[0];
  const worstSeller=[...analytics].filter(p=>p.totalSold===0).length;
  const lowStock=analytics.filter(p=>p.currentStock<=p.minStock).length;
  const outOfStock=analytics.filter(p=>p.currentStock<=0).length;
  
  // Category breakdown
  const byCategory={};
  analytics.forEach(p=>{
    if(!byCategory[p.category])byCategory[p.category]={count:0,revenue:0,sold:0};
    byCategory[p.category].count++;
    byCategory[p.category].revenue+=p.totalRevenue;
    byCategory[p.category].sold+=p.totalSold;
  });
  const topCategories=Object.entries(byCategory).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,5);
  
  // Performance classification
  const classify=(p)=>{
    if(p.totalSold===0)return{label:'🚫 Haitoki',color:'#C2412D',bg:'#F6DED8'};
    if(p.totalSold<5)return{label:'🐌 Polepole',color:'#F2B705',bg:'#FFF8E6'};
    if(p.totalSold<20)return{label:'➡️ Wastani',color:'#3B82F6',bg:'#DBEAFE'};
    if(p.totalSold<50)return{label:'🔥 Mzuri',color:'#10B981',bg:'#D1FAE5'};
    return{label:'⭐ Bora Sana',color:'#0A6E47',bg:'#D6EADF'};
  };
  
  return <div className="page-enter">
    {/* HEADER */}
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>📊 Uchambuzi wa Bidhaa</h2>
      <p style={{fontSize:12,color:'#5C6A62',margin:0}}>Jua bidhaa zinazokuza biashara yako na zile zinazokushushia faida</p>
    </div>
    
    {/* PERIOD FILTER */}
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {[
        {v:'today',l:'Leo'},
        {v:'week',l:'Wiki'},
        {v:'month',l:'Mwezi'},
        {v:'year',l:'Mwaka'},
        {v:'all',l:'Zote'},
      ].map(p=><button key={p.v} onClick={()=>setPeriod(p.v)} style={{padding:'8px 16px',borderRadius:10,border:period===p.v?'2px solid #0A6E47':'1px solid #D6E2DB',background:period===p.v?'#E6F2EC':'#fff',color:period===p.v?'#0A6E47':'#5C6A62',fontWeight:period===p.v?700:500,fontSize:12,cursor:'pointer'}}>{p.l}</button>)}
    </div>
    
    {/* SUMMARY STATS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14,borderLeft:'4px solid #0A6E47'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>JUMLA YA BIDHAA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#0A6E47'}}>{totalProducts}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #0A6E47'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>MAPATO</div>
        <div style={{fontSize:18,fontWeight:900,color:'#0A6E47'}}>{fm(totalRevenue)}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #3B82F6'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>FAIDA</div>
        <div style={{fontSize:18,fontWeight:900,color:'#3B82F6'}}>{fm(totalProfit)}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #F2B705'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>ZILIZOUZWA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#F2B705'}}>{totalSold.toFixed(0)}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #C2412D'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>HAZITOKI</div>
        <div style={{fontSize:24,fontWeight:900,color:'#C2412D'}}>{worstSeller}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #DC2626'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>STOCK NDOGO</div>
        <div style={{fontSize:24,fontWeight:900,color:'#DC2626'}}>{lowStock}</div>
      </div>
    </div>
    
    {/* INSIGHTS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12,marginBottom:14}}>
      {/* BEST SELLER */}
      {bestSeller&&bestSeller.totalSold>0&&<div className="card" style={{padding:16,background:'linear-gradient(135deg,#D6EADF,#FFFFFF)',border:'1px solid #C2DED1'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{fontSize:24}}>⭐</div>
          <div>
            <div style={{fontSize:11,color:'#15803D',fontWeight:700}}>BIDHAA INAYOUZWA ZAIDI</div>
            <div style={{fontSize:16,fontWeight:900,color:'#0A6E47'}}>{bestSeller.name}</div>
          </div>
        </div>
        <div style={{fontSize:12,color:'#15803D'}}>
          📦 Zilizouzwa: <b>{bestSeller.totalSold.toFixed(1)}</b><br/>
          💰 Mapato: <b>{fm(bestSeller.totalRevenue)}</b><br/>
          📈 Faida: <b>{fm(bestSeller.totalProfit)}</b>
        </div>
      </div>}
      
      {/* TOP CATEGORIES */}
      <div className="card" style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#0A6E47',marginBottom:10}}>🏆 Aina Bora za Bidhaa</div>
        {topCategories.length?topCategories.map(([cat,d],i)=><div key={cat} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:i<topCategories.length-1?'1px solid #F6F8F7':'none'}}>
          <div>
            <div style={{fontSize:12,fontWeight:700}}>{i+1}. {cat}</div>
            <div style={{fontSize:10,color:'#9AA5A0'}}>{d.count} bidhaa • {d.sold.toFixed(0)} zilizouzwa</div>
          </div>
          <div style={{fontWeight:800,color:'#0A6E47',fontSize:12}}>{fm(d.revenue)}</div>
        </div>):<div style={{fontSize:11,color:'#9AA5A0'}}>Hakuna data bado</div>}
      </div>
    </div>
    
    {/* SEARCH + SORT */}
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
      <input type="text" placeholder="🔍 Tafuta bidhaa..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:180,padding:'10px 14px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13}}/>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,cursor:'pointer'}}>
        <option value="revenue">💰 Mapato Makubwa</option>
        <option value="sold">📦 Idadi Zilizouzwa</option>
        <option value="profit">📈 Faida Kubwa</option>
        <option value="slowest">🐌 Hazitoki</option>
        <option value="stock">📊 Stock</option>
        <option value="name">🔤 Jina</option>
      </select>
    </div>
    
    {/* PRODUCTS TABLE */}
    <div className="card" style={{padding:0,overflow:'hidden'}}>
      <div style={{maxHeight:600,overflowY:'auto'}}>
        {sorted.length?sorted.map(p=>{
          const c=classify(p);
          const stockLevel=p.currentStock<=0?'OUT':p.currentStock<=p.minStock?'LOW':'OK';
          const stockColor=stockLevel==='OUT'?'#C2412D':stockLevel==='LOW'?'#F2B705':'#0A6E47';
          return <div key={p.id} style={{padding:'14px 16px',borderBottom:'1px solid #F6F8F7',transition:'background 0.2s'}} onMouseOver={e=>e.currentTarget.style.background='#F6F8F7'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:24}}>{p.image||'📦'}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:13}}>{p.name}</span>
                    <span style={{background:c.bg,color:c.color,padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>{c.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#5C6A62'}}>
                    {p.category} • {p.unit} • Bei: <b>{fm(p.sellPrice)}</b>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:18,flexWrap:'wrap',fontSize:11}}>
                <div style={{textAlign:'center',minWidth:60}}>
                  <div style={{color:'#9AA5A0',fontWeight:600}}>STOCK</div>
                  <div style={{fontWeight:900,fontSize:15,color:stockColor}}>{p.currentStock.toFixed(1)}</div>
                </div>
                <div style={{textAlign:'center',minWidth:60}}>
                  <div style={{color:'#9AA5A0',fontWeight:600}}>ZILIZOUZWA</div>
                  <div style={{fontWeight:900,fontSize:15,color:'#3B82F6'}}>{p.totalSold.toFixed(1)}</div>
                </div>
                <div style={{textAlign:'center',minWidth:80}}>
                  <div style={{color:'#9AA5A0',fontWeight:600}}>MAPATO</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#0A6E47'}}>{fm(p.totalRevenue)}</div>
                </div>
                <div style={{textAlign:'center',minWidth:80}}>
                  <div style={{color:'#9AA5A0',fontWeight:600}}>FAIDA</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#0A6E47'}}>{fm(p.totalProfit)}</div>
                </div>
                {p.totalReturns>0&&<div style={{textAlign:'center',minWidth:60}}>
                  <div style={{color:'#9AA5A0',fontWeight:600}}>RUDISHWA</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#C2412D'}}>{p.totalReturns.toFixed(1)}</div>
                </div>}
              </div>
            </div>
            {/* Insight bar */}
            {p.totalSold===0?<div style={{marginTop:6,padding:'6px 10px',background:'#F6DED8',borderRadius:6,fontSize:11,color:'#991B1B'}}>
              ⚠️ <b>Tip:</b> Bidhaa hii bado haijauzwa. Fikiria kupunguza bei au kuondoa kabisa.
            </div>:p.totalSold>0&&p.totalSold<5?<div style={{marginTop:6,padding:'6px 10px',background:'#FFF8E6',borderRadius:6,fontSize:11,color:'#92400E'}}>
              💡 <b>Tip:</b> Bidhaa hii inauza polepole. Fikiria kupunguza bei au matangazo.
            </div>:null}
          </div>;
        }):<Empty icon="📊" text="Hakuna bidhaa kuanalyze"/>}
      </div>
    </div>
  </div>;
}

// ===== EMPLOYEE REPORTS — Products Sold Only (NO Revenue/Profit) =====
export function EmployeeReportsPage(){
  const{sales,returns,products,user}=useApp();
  // Mfanyakazi anaona SIKU YA LEO pekee — si wiki wala mwezi
  const tab='day';
  
  const filterByDate=(dateStr)=>{
    if(!dateStr)return false;
    if(tab==='day')return isToday(dateStr);
    if(tab==='week')return isThisWeek(dateStr);
    if(tab==='month')return isThisMonth(dateStr);
    return false;
  };
  
  // Filter by employee (only their own sales)
  const myFilter=(s)=>{
    if(!filterByDate(s.created_at))return false;
    // Match by seller_id or seller_name
    return s.seller_id===user?.id||s.seller_name===user?.name;
  };
  
  const fSales=sales.filter(myFilter);
  const fReturns=(returns||[]).filter(r=>{
    if(!filterByDate(r.created_at))return false;
    const sale=sales.find(s=>s.id===r.sale_id);
    return sale?.seller_id===user?.id||sale?.seller_name===user?.name;
  });
  
  // Products sold list (NO revenue/profit shown to employee)
  const productsSold=React.useMemo(()=>{
    const map={};
    fSales.forEach(s=>{
      (s.items||[]).forEach(item=>{
        const pid=item.productId;
        if(!map[pid]){
          const product=products.find(p=>p.id===pid);
          map[pid]={
            id:pid,
            name:item.name,
            category:product?.category||'Nyingine',
            image:product?.image||'📦',
            unit:product?.unit||'Kipande',
            qtySold:0,
            returned:0,
            stockRemaining:product?.quantity||0,
            minStock:product?.min_stock||5,
            salesCount:0,
          };
        }
        const qty=item.qty*(item.fraction||1);
        map[pid].qtySold+=qty;
        map[pid].salesCount++;
      });
    });
    fReturns.forEach(r=>{
      (r.items||[]).forEach(item=>{
        if(map[item.productId])map[item.productId].returned+=item.qty*(item.fraction||1);
      });
    });
    return Object.values(map)
      .map(p=>({...p,netSold:Math.max(0,p.qtySold-p.returned)}))
      .sort((a,b)=>b.netSold-a.netSold);
  },[fSales,fReturns,products]);
  
  const periodLabel='Leo';
  
  const exportList=()=>{
    const rows=productsSold.map((p,i)=>[
      i+1,p.name,p.category,
      p.netSold.toFixed(1)+' '+p.unit,
      p.stockRemaining.toFixed(1)+' '+p.unit,
      p.stockRemaining<=0?'Hakuna':p.stockRemaining<=p.minStock?'Ndogo':'Sawa',
    ]);
    const totalQty=productsSold.reduce((s,p)=>s+p.netSold,0);
    rows.push(['','JUMLA','',totalQty.toFixed(1),'','']);
    exportToPDF(
      `Bidhaa Zilizouzwa — ${periodLabel} — ${user?.name||''}`,
      ['#','Bidhaa','Aina','Zilizouzwa','Stock Imebaki','Hali'],
      rows,
      `bidhaa-zangu-${tab}-${Date.now()}.pdf`
    );
  };
  
  return <div className="page-enter">
    {/* HEADER */}
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>📦 Bidhaa Nilizouza</h2>
      <p style={{fontSize:12,color:'#5C6A62',margin:0}}>Angalia bidhaa zako ulizouza na stock iliyobaki</p>
    </div>
    
    
    {/* Summary stats — NO MONEY */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14,borderLeft:'4px solid #0A6E47',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>MAUZO</div>
        <div style={{fontSize:26,fontWeight:900,color:'#0A6E47'}}>{fSales.length}</div>
        <div style={{fontSize:10,color:'#9AA5A0'}}>nililofanya</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #3B82F6',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>BIDHAA</div>
        <div style={{fontSize:26,fontWeight:900,color:'#3B82F6'}}>{productsSold.length}</div>
        <div style={{fontSize:10,color:'#9AA5A0'}}>aina tofauti</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #0A6E47',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>JUMLA</div>
        <div style={{fontSize:26,fontWeight:900,color:'#0A6E47'}}>{productsSold.reduce((s,p)=>s+p.netSold,0).toFixed(1)}</div>
        <div style={{fontSize:10,color:'#9AA5A0'}}>zilizouzwa</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #F2B705',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#5C6A62',fontWeight:600}}>STOCK NDOGO</div>
        <div style={{fontSize:26,fontWeight:900,color:'#F2B705'}}>{productsSold.filter(p=>p.stockRemaining<=p.minStock&&p.stockRemaining>0).length}</div>
        <div style={{fontSize:10,color:'#9AA5A0'}}>onya bosi</div>
      </div>
    </div>
    
    {/* Products list */}
    {productsSold.length>0?<div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h3 style={{fontSize:16,fontWeight:800,margin:0,color:'#0A6E47'}}>📋 Orodha ya Bidhaa</h3>
        <button onClick={exportList} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid #0A6E47',background:'#fff',color:'#0A6E47',fontWeight:700,fontSize:12,cursor:'pointer'}}>📄 Pakua PDF</button>
      </div>
      
      {/* Table header */}
      <div style={{display:'grid',gridTemplateColumns:'36px 1fr 100px 100px',gap:6,padding:'8px',background:'#0A6E47',color:'#fff',borderRadius:6,fontSize:10,fontWeight:800,textTransform:'uppercase',marginBottom:4}}>
        <div>#</div><div>Bidhaa</div>
        <div style={{textAlign:'right'}}>Zilizouzwa</div>
        <div style={{textAlign:'right'}}>Stock Imebaki</div>
      </div>
      
      <div style={{maxHeight:500,overflowY:'auto'}}>
        {productsSold.map((p,i)=>{
          const stockColor=p.stockRemaining<=0?'#C2412D':p.stockRemaining<=p.minStock?'#F2B705':'#0A6E47';
          const stockIcon=p.stockRemaining<=0?'🚫':p.stockRemaining<=p.minStock?'⚠️':'✅';
          return <div key={p.id} style={{display:'grid',gridTemplateColumns:'36px 1fr 100px 100px',gap:6,padding:'10px 6px',borderBottom:'1px solid #F6F8F7',alignItems:'center',background:i%2===0?'#fff':'#F6F8F7'}}>
            <div style={{width:24,height:24,borderRadius:5,background:i<3?'#FFF8E6':'#F6F8F7',color:i<3?'#92400E':'#5C6A62',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11}}>{i+1}</div>
            <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
              <span style={{fontSize:18}}>{p.image}</span>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:10,color:'#9AA5A0'}}>{p.category} • {p.salesCount} mauzo{p.returned>0&&<span style={{color:'#C2412D'}}> • ↩️ {p.returned.toFixed(1)}</span>}</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:14,color:'#0A6E47'}}>{p.netSold.toFixed(1)}</div>
              <div style={{fontSize:9,color:'#9AA5A0'}}>{p.unit}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:14,color:stockColor}}>{stockIcon} {p.stockRemaining.toFixed(1)}</div>
              <div style={{fontSize:9,color:'#9AA5A0'}}>{p.unit}</div>
            </div>
          </div>;
        })}
      </div>
    </div>:<Empty icon="📦" text={`Hujauza bidhaa ${periodLabel.toLowerCase()}`}/>}
  </div>;
}

// ============================================================
// DASHBOARD YA MFANYAKAZI
//
// Mfanyakazi HAONI: faida, thamani ya stock, madeni, mauzo ya wiki
// au mwezi, bei ya kununua, wala takwimu za biashara nzima.
// Anaona kazi YAKE ya LEO pekee.
// ============================================================
export function EmployeeDash({onReceipt,onNav}){
  const{sales=[],user,biz,products=[],lowStockProducts=[],currency}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');

  const isMine=s=>s.seller_id===user?.id||s.seller_name===user?.name;
  const mine  =useMemo(()=>sales.filter(s=>isToday(s.created_at)&&isMine(s)),[sales,user]);
  const myWeek=useMemo(()=>sales.filter(s=>isThisWeek(s.created_at)&&isMine(s)),[sales,user]);

  // Jana — kwa kulinganisha mwenendo wake mwenyewe
  const yStr=localDateStr(new Date(Date.now()-864e5));
  const myYest=useMemo(()=>sales.filter(s=>localDateStr(s.created_at)===yStr&&isMine(s)),[sales,user,yStr]);

  const sum  =list=>list.reduce((a,s)=>a+(+s.total||0),0);
  const nItems=list=>list.reduce((a,s)=>a+((s.items||[]).reduce((x,i)=>x+(+i.qty||0),0)),0);

  const total=sum(mine), count=mine.length, items=nItems(mine);
  const wTotal=sum(myWeek);
  const yTotal=sum(myYest);
  const diff=yTotal>0?Math.round((total-yTotal)/yTotal*100):(total>0?100:0);

  // Zamu: mauzo ya kwanza hadi sasa
  const times=mine.map(s=>new Date(s.created_at).getTime()).sort((a,b)=>a-b);
  const firstAt=times[0]||null;
  // Saa za kifaa zinaweza kupishana na za mauzo. Kama muda ni sifuri au
  // hasi, tusionyeshe namba ya uongo.
  const elapsed=firstAt?Date.now()-firstAt:0;
  const hoursOpen=elapsed>18e5?Math.round(elapsed/36e5*10)/10:0;
  const perHour=hoursOpen>0?Math.round(total/hoursOpen):0;

  // Mauzo kwa saa (7:00 - 20:00)
  const H0=7,H1=20;
  const byHour=useMemo(()=>{
    const a=Array.from({length:H1-H0+1},()=>0);
    mine.forEach(s=>{const h=new Date(s.created_at).getHours();
      if(h>=H0&&h<=H1)a[h-H0]+=(+s.total||0)});
    return a;
  },[mine]);
  const hMax=Math.max(1,...byHour);

  // Njia za malipo
  const byPay={};
  mine.forEach(s=>{const k=payLabel(s.payment_method)||'Taslimu';byPay[k]=(byPay[k]||0)+(+s.total||0)});
  const payRows=Object.entries(byPay).sort((a,b)=>b[1]-a[1]);

  // Bidhaa alizouza leo
  const sold={};
  mine.forEach(s=>(s.items||[]).forEach(i=>{
    const k=i.name||'—';
    if(!sold[k])sold[k]={qty:0,amount:0};
    sold[k].qty+=(+i.qty||0);
    sold[k].amount+=(+i.qty||0)*(+i.price||0)*(i.fraction||1);
  }));
  // Panga kwa PESA, si idadi — bidhaa moja ya bei kubwa inaweza kuleta
  // pesa nyingi kuliko nyingi za bei ndogo.
  const topSold=Object.entries(sold).sort((a,b)=>b[1].amount-a[1].amount).slice(0,6);
  const soldMax=Math.max(1,...topSold.map(([,d])=>d.amount));

  // Bidhaa zinazoisha — IDADI pekee, hakuna bei ya kununua
  const lowStock=useMemo(()=>(lowStockProducts||[])
    .slice().sort((a,b)=>(+a.quantity||0)-(+b.quantity||0)).slice(0,5),[lowStockProducts]);

  const hour=new Date().getHours();
  const greet=hour<12?'Habari za asubuhi':hour<16?'Habari za mchana':hour<19?'Habari za jioni':'Habari za usiku';
  const QA=[{p:'sales',i:'🛒',l:'Uza'},{p:'orders',i:'📋',l:'Oda'},{p:'emp_reports',i:'📦',l:'Nilizouza'},{p:'customers',i:'👥',l:'Wateja'}];

  const Card=({children,style})=><div className="card" style={{marginBottom:14,...style}}>{children}</div>;
  const Head=({icon,title,right})=><div style={{display:'flex',alignItems:'center',gap:7,margin:'0 0 11px'}}>
    <h3 style={{fontSize:14.5,fontWeight:800,margin:0,color:'#17231D'}}>{icon} {title}</h3>
    {right!=null&&<span style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:'#5C6A62'}}>{right}</span>}
  </div>;

  return <div className="page-enter">
    <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:16}}>
      <div style={{width:42,height:42,borderRadius:14,background:'#E6F2EC',display:'grid',placeItems:'center',
        fontSize:18,fontWeight:900,color:'#0A6E47',flexShrink:0}}>
        {(user?.name||'M').trim().charAt(0).toUpperCase()}
      </div>
      <div style={{minWidth:0}}>
        <h3 style={{fontSize:19,fontWeight:900,margin:'0 0 2px',color:'#0A6E47'}}>{user?.name||'Mfanyakazi'}</h3>
        <p style={{fontSize:11.5,color:'#5C6A62',margin:0}}>
          {greet} • {new Date().toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long'})}
          {biz?.name?` • ${biz.name}`:''}
        </p>
      </div>
    </div>

    {/* ===== HERO: mauzo yangu ===== */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'20px 22px',marginBottom:14,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:-30,top:-30,width:150,height:150,borderRadius:'50%',background:'rgba(242,183,5,.12)'}}/>
      <div style={{position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>🛒 MAUZO YANGU LEO</span>
          {yTotal>0&&<span style={{marginLeft:'auto',fontSize:10.5,fontWeight:800,padding:'3px 9px',borderRadius:20,
            background:diff>=0?'rgba(242,183,5,.25)':'rgba(255,255,255,.18)',color:diff>=0?'#F2B705':'#fff'}}>
            {diff>=0?'▲':'▼'} {Math.abs(diff)}% kuliko jana
          </span>}
        </div>
        <div style={{fontSize:36,fontWeight:900,letterSpacing:'-1.5px',lineHeight:1.1,margin:'3px 0 8px'}}>{fm(total)}</div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.16)',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
          🧾 Risiti {count} • Bidhaa {items}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:18,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.18)'}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>WIKI HII</div>
            <div style={{fontSize:14.5,fontWeight:900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fm(wTotal)}</div>
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>KWA SAA</div>
            <div style={{fontSize:14.5,fontWeight:900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{perHour?fm(perHour):'—'}</div>
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>ZAMU</div>
            <div style={{fontSize:14.5,fontWeight:900,whiteSpace:'nowrap'}}>
              {firstAt?new Date(firstAt).toLocaleTimeString('sw-TZ',{hour:'2-digit',minute:'2-digit'}):'—'}
            </div>
            {hoursOpen>0&&<div style={{fontSize:9,opacity:.7,fontWeight:700}}>saa {hoursOpen}</div>}
            <div style={{display:'none'}}>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ===== VITENDO VYA HARAKA ===== */}
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
      {QA.map(a=><button key={a.p} className="qbtn ripple" onClick={()=>onNav?.(a.p)} style={{background:'#fff',border:'1px solid #D6E2DB',borderRadius:16,padding:'13px 4px',textAlign:'center',cursor:'pointer'}}>
        <div style={{fontSize:21}}>{a.i}</div>
        <div style={{fontSize:10.5,fontWeight:700,color:'#17231D',marginTop:3}}>{a.l}</div>
      </button>)}
    </div>

    {/* ===== MAUZO KWA SAA ===== */}
    {count>0&&<Card>
      <Head icon="⏱" title="Mauzo Kwa Saa" right={`${H0}:00 – ${H1}:00`}/>
      <div style={{display:'flex',alignItems:'flex-end',gap:3,height:78}}>
        {byHour.map((v,i)=>{
          const h=H0+i, now=h===hour;
          return <div key={h} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:0}}>
            <div title={`${h}:00 — ${fm(v)}`} style={{width:'100%',height:Math.max(3,Math.round(v/hMax*58)),
              borderRadius:'5px 5px 2px 2px',
              background:v>0?(now?'#F2B705':'#0A6E47'):'#D6E2DB',
              transition:'height .4s ease'}}/>
            <span style={{fontSize:8,fontWeight:700,color:now?'#0A6E47':'#9AA5A0'}}>{h}</span>
          </div>;
        })}
      </div>
    </Card>}

    {/* ===== NJIA ZA MALIPO ===== */}
    {payRows.length>0&&<Card>
      <Head icon="💳" title="Jinsi Pesa Ilivyoingia" right={fm(total)}/>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {payRows.map(([k,v])=>{
          const pct=total>0?Math.round(v/total*100):0;
          return <div key={k}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:4}}>
              <span style={{color:'#17231D',fontWeight:700}}>{k}</span>
              <span style={{color:'#5C6A62',fontWeight:700}}>{pct}% • <b style={{color:'#0A6E47'}}>{fm(v)}</b></span>
            </div>
            <div style={{height:7,borderRadius:20,background:'#F6F8F7',overflow:'hidden'}}>
              <div style={{width:pct+'%',height:'100%',borderRadius:20,background:'linear-gradient(90deg,#0A6E47,#F2B705)',transition:'width .5s ease'}}/>
            </div>
          </div>;
        })}
      </div>
    </Card>}

    {/* ===== NILIZOUZA LEO ===== */}
    <Card>
      <Head icon="📦" title="Nilizouza Leo" right={topSold.length?`${topSold.length} aina`:null}/>
      {topSold.length?<div style={{display:'flex',flexDirection:'column',gap:9}}>
        {topSold.map(([name,d],idx)=>(
          <div key={name}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12.5,marginBottom:4,gap:8}}>
              <span style={{color:'#17231D',fontWeight:700,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {idx===0&&'🏆 '}{name}
              </span>
              <span style={{color:'#5C6A62',fontWeight:700,whiteSpace:'nowrap'}}>{d.qty} • <b style={{color:'#0A6E47'}}>{fm(d.amount)}</b></span>
            </div>
            <div style={{height:6,borderRadius:20,background:'#F6F8F7',overflow:'hidden'}}>
              <div style={{width:Math.round(d.amount/soldMax*100)+'%',height:'100%',borderRadius:20,
                background:idx===0?'#F2B705':'#0A6E47',transition:'width .5s ease'}}/>
            </div>
          </div>
        ))}
      </div>:<Empty icon="📦" text="Hujauza bidhaa leo"/>}
    </Card>

    {/* ===== BIDHAA ZINAZOISHA (idadi pekee) ===== */}
    {lowStock.length>0&&<Card style={{borderLeft:'4px solid #F2B705'}}>
      <Head icon="⚠️" title="Zinazoisha Stock" right={`${lowStockProducts.length} bidhaa`}/>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {lowStock.map(p=>{
          const q=+p.quantity||0, out=q<=0;
          return <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,
            padding:'9px 11px',borderRadius:10,background:out?'#FBECE9':'#FFF8E6'}}>
            <span style={{fontSize:12.5,fontWeight:700,color:'#17231D',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
            <span style={{fontSize:11.5,fontWeight:800,color:out?'#C2412D':'#17231D',whiteSpace:'nowrap'}}>
              {out?'Imeisha':`${q} ${p.unit||''}`}
            </span>
          </div>;
        })}
      </div>
      <p style={{fontSize:10.5,color:'#5C6A62',margin:'10px 0 0'}}>Mwambie mwenye duka ili aongeze stock.</p>
    </Card>}

    {/* ===== RISITI ZA LEO ===== */}
    <Card style={{marginBottom:0}}>
      <Head icon="🧾" title="Risiti za Leo" right={count?`${count} • gusa kuchapisha`:null}/>
      {count?<div style={{maxHeight:380,overflowY:'auto',display:'flex',flexDirection:'column',gap:7}}>
        {mine.map(s=>(
          <div key={s.id} onClick={()=>onReceipt?.(s)} className="ripple" style={{padding:'10px 12px',borderRadius:10,background:'#F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,cursor:'pointer'}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:'#17231D',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.customer_name||'Mteja wa kawaida'}</div>
              <div style={{fontSize:10.5,color:'#5C6A62',marginTop:1}}>
                {new Date(s.created_at).toLocaleTimeString('sw-TZ',{hour:'2-digit',minute:'2-digit'})} • {(s.items||[]).length} bidhaa • {payLabel(s.payment_method)}
              </div>
            </div>
            <b style={{fontSize:13,color:'#0A6E47',whiteSpace:'nowrap'}}>{fm(s.total)}</b>
          </div>
        ))}
      </div>:<Empty icon="🧾" text="Hakuna mauzo leo bado"/>}
    </Card>
  </div>;
}

// ============================================================
// FAIDA KWA KILA BIDHAA ILIYOUZWA — kwa mwenye duka pekee
//
// Inaonyesha kila bidhaa iliyouzwa: idadi, mauzo, gharama, faida
// na asilimia ya faida. Inachukua gharama kutoka kwenye mauzo
// yenyewe, kwa hiyo inafanya kazi hata kwa mauzo ya wafanyakazi
// na kwa bidhaa zilizofutwa kwenye katalogi.
// ============================================================
export function ProductProfitPage(){
  const{sales=[],returns=[],products=[],currency}=useApp();
  const costMap=useMemo(()=>buildCostMap(products),[products]);
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[tab,setTab]=useState('month');
  const[from,setFrom]=useState(localDateStr(new Date(new Date().getFullYear(),new Date().getMonth(),1)));
  const[to,setTo]=useState(todayStr());
  const[q,setQ]=useState('');
  const[sortBy,setSortBy]=useState('profit');

  const inRange=d=>{
    if(!d)return false;
    if(tab==='day')return isToday(d);
    if(tab==='week')return isThisWeek(d);
    if(tab==='month')return isThisMonth(d);
    return inDateRange(d,from,to);
  };

  const rows=useMemo(()=>{
    const m={};
    const add=(item,sign)=>{
      const pid=item.productId||item.product_id||item.name;
      if(!m[pid])m[pid]={id:pid,name:item.name||'—',qty:0,revenue:0,cost:0,profit:0,count:0};
      const frac=item.fraction||1;
      const qty=(+item.qty||0)*frac;
      const rev=itemRevenue(item);
      const prof=itemProfit(item,costMap);
      m[pid].qty+=sign*qty;
      m[pid].revenue+=sign*rev;
      m[pid].cost+=sign*(rev-prof);
      m[pid].profit+=sign*prof;
      if(sign>0)m[pid].count++;
    };
    sales.filter(s=>inRange(s.created_at)).forEach(s=>(s.items||[]).forEach(i=>add(i,1)));
    // Marejesho yanapunguza mauzo na faida
    returns.filter(r=>inRange(r.created_at)).forEach(r=>(r.items||[]).forEach(i=>add(i,-1)));
    return Object.values(m)
      .filter(r=>r.qty!==0||r.revenue!==0)
      .filter(r=>!q||r.name.toLowerCase().includes(q.toLowerCase()))
      .map(r=>({...r,margin:r.revenue>0?Math.round(r.profit/r.revenue*100):0}))
      .sort((a,b)=>sortBy==='profit'?b.profit-a.profit
        :sortBy==='revenue'?b.revenue-a.revenue
        :sortBy==='qty'?b.qty-a.qty
        :a.margin-b.margin);
  },[sales,returns,tab,from,to,q,sortBy,costMap]);

  const totRev=rows.reduce((a,r)=>a+r.revenue,0);
  const totProfit=rows.reduce((a,r)=>a+r.profit,0);
  const totCost=rows.reduce((a,r)=>a+r.cost,0);
  const totMargin=totRev>0?Math.round(totProfit/totRev*100):0;
  const best=rows.filter(r=>r.profit>0)[0];
  const worst=[...rows].sort((a,b)=>a.profit-b.profit)[0];

  const exportPDF=()=>{
    const rowsHtml=rows.map(r=>`<tr><td>${r.name}</td><td>${r.qty}</td><td>${fm(r.revenue)}</td><td>${fm(r.cost)}</td><td>${fm(r.profit)}</td><td>${r.margin}%</td></tr>`).join('');
    exportToPDF('Faida kwa Bidhaa',`
      <h1>FAIDA KWA KILA BIDHAA</h1>
      <p>${tab==='custom'?`${from} hadi ${to}`:tab==='day'?'Leo':tab==='week'?'Wiki Hii':'Mwezi Huu'}</p>
      <p class="big">Faida: ${fm(totProfit)} (${totMargin}%)</p>
      <table><tr><th>Bidhaa</th><th>Idadi</th><th>Mauzo</th><th>Gharama</th><th>Faida</th><th>%</th></tr>${rowsHtml}</table>
    `);
  };

  const TABS=[{id:'day',l:'Leo'},{id:'week',l:'Wiki'},{id:'month',l:'Mwezi'},{id:'custom',l:'Tarehe'}];

  return <div className="page-enter">
    <PageHead icon="💹" title="Faida kwa Bidhaa" sub="Kila bidhaa iliyouzwa na faida yake">
      <GBtn onClick={exportPDF}>📥 PDF</GBtn>
    </PageHead>

    {/* Muda */}
    <div style={{display:'flex',gap:6,marginBottom:12}}>
      {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'9px 0',borderRadius:10,border:'none',fontWeight:700,fontSize:12.5,cursor:'pointer',background:tab===t.id?'#0A6E47':'#F6F8F7',color:tab===t.id?'#fff':'#5C6A62'}}>{t.l}</button>)}
    </div>
    {tab==='custom'&&<div style={{display:'flex',gap:8,marginBottom:12}}>
      <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{flex:1,padding:'9px 10px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,background:'#fff',color:'#17231D'}}/>
      <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{flex:1,padding:'9px 10px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,background:'#fff',color:'#17231D'}}/>
    </div>}

    {/* Muhtasari */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'22px',marginBottom:14,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)'}}>
      <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>FAIDA YA BIDHAA ZILIZOUZWA</div>
      <div style={{fontSize:34,fontWeight:900,letterSpacing:'-1px',margin:'2px 0 6px'}}>{fm(totProfit)}</div>
      <div style={{display:'inline-flex',gap:6,background:'rgba(255,255,255,.16)',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
        📊 Margin {totMargin}% • Bidhaa {rows.length}
      </div>
      <div style={{display:'flex',gap:10,marginTop:18,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.18)'}}>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>MAUZO</div><div style={{fontSize:15.5,fontWeight:800,whiteSpace:'nowrap'}}>{(totRev||0).toLocaleString()}</div></div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>GHARAMA</div><div style={{fontSize:15.5,fontWeight:800,whiteSpace:'nowrap',color:'#FCA5A5'}}>{(totCost||0).toLocaleString()}</div></div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>FAIDA</div><div style={{fontSize:15.5,fontWeight:800,whiteSpace:'nowrap',color:totProfit>=0?'#86EFAC':'#FCA5A5'}}>{(totProfit||0).toLocaleString()}</div></div>
      </div>
    </div>

    {/* Bora na mbaya */}
    {rows.length>1&&<div className="stagger" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
      {best&&<div className="card" style={{padding:'13px 12px'}}>
        <div style={{fontSize:9.5,color:'#5C6A62',fontWeight:700}}>🏆 INAYOLIPA ZAIDI</div>
        <div style={{fontSize:13,fontWeight:800,color:'#17231D',marginTop:3}}>{best.name}</div>
        <div style={{fontSize:14,fontWeight:900,color:'#0A6E47'}}>{fm(best.profit)}</div>
      </div>}
      {worst&&worst.id!==best?.id&&<div className="card" style={{padding:'13px 12px'}}>
        <div style={{fontSize:9.5,color:'#5C6A62',fontWeight:700}}>{worst.profit<0?'⚠️ HASARA':'📉 INAYOLIPA KIDOGO'}</div>
        <div style={{fontSize:13,fontWeight:800,color:'#17231D',marginTop:3}}>{worst.name}</div>
        <div style={{fontSize:14,fontWeight:900,color:worst.profit<0?'#C2412D':'#F2B705'}}>{fm(worst.profit)}</div>
      </div>}
    </div>}

    {/* Tafuta na panga */}
    <div style={{display:'flex',gap:8,marginBottom:12}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tafuta bidhaa..." style={{flex:2,padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,background:'#fff',color:'#17231D'}}/>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{flex:1,padding:'10px 8px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:12.5,background:'#fff',color:'#17231D'}}>
        <option value="profit">Faida</option>
        <option value="revenue">Mauzo</option>
        <option value="qty">Idadi</option>
        <option value="margin">Margin ndogo</option>
      </select>
    </div>

    {/* Orodha */}
    <div className="card">
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📦 Bidhaa ({rows.length})</h3>
      {rows.length?<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {rows.map(r=>{
          const mc=r.margin<0?'#C2412D':r.margin<15?'#F2B705':'#0A6E47';
          return <div key={r.id} style={{padding:'11px 12px',borderRadius:12,background:'#F6F8F7'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:7}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:'#17231D'}}>{r.name}</div>
                <div style={{fontSize:10.5,color:'#5C6A62',marginTop:1}}>Idadi {r.qty} • Mauzo {r.count}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:15,fontWeight:900,color:r.profit>=0?'#0A6E47':'#C2412D',whiteSpace:'nowrap'}}>{fm(r.profit)}</div>
                <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:mc+'20',color:mc}}>{r.margin}%</span>
              </div>
            </div>
            <div style={{display:'flex',gap:12,fontSize:11,color:'#5C6A62'}}>
              <span>Mauzo: <b style={{color:'#17231D'}}>{fm(r.revenue)}</b></span>
              <span>Gharama: <b style={{color:'#C2412D'}}>{fm(r.cost)}</b></span>
            </div>
            <div style={{background:'#D6E2DB',borderRadius:4,height:5,marginTop:7,overflow:'hidden'}}>
              <div style={{width:Math.min(Math.max(r.margin,0),100)+'%',height:'100%',background:mc,borderRadius:4}}/>
            </div>
          </div>;
        })}
      </div>:<Empty icon="💹" text="Hakuna bidhaa iliyouzwa kipindi hiki"/>}
    </div>
  </div>;
}
