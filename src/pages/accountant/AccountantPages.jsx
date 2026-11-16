import React,{useState,useEffect,useMemo} from 'react';
import { API_BASE } from '../../config/api';
import {useApp} from '../../context/AppContext';
import {IC,Stat,Badge,Empty,Input,Sel,Btn,Modal} from '../../components/UI';

const fmtDate=d=>d?new Date(d).toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'}):'—';
const fm=n=>`TZS ${(+n||0).toLocaleString()}`;
// Namba fupi kwa nafasi ndogo (hero sub-stats): 2,495,000 badala ya TZS 2,495,000
const fmN=n=>(+n||0).toLocaleString();
const PRICE=15000;
const CATS=['Umeme','Maji','Internet','Kodi ya Pango','Usafiri','Vifaa vya Ofisi','Mishahara','Matengenezo','Marketing','Chakula','SMS/Beem','Server/Hosting','Domain','Nyingine'];
const curMonth=()=>new Date().toISOString().slice(0,7);

// ===== VIPENGELE VYA PAMOJA (muonekano mmoja kurasa zote) =====
function PageHead({icon,title,sub,children}){
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:10,flexWrap:'wrap',marginBottom:16}}>
    <div>
      <h2 style={{fontSize:20,fontWeight:900,margin:'0 0 3px',color:'#0A6E47'}}>{icon} {title}</h2>
      {sub&&<p style={{fontSize:12.5,color:'#5C6A62',margin:0}}>{sub}</p>}
    </div>
    {children&&<div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>{children}</div>}
  </div>;
}
const GBtn=({children,...p})=><button className="ripple" {...p} style={{padding:'9px 18px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 6px 16px rgba(10,110,71,.25)',...(p.style||{})}}>{children}</button>;
const MonthIn=p=><input type="month" {...p} style={{padding:'9px 12px',borderRadius:12,border:'1.5px solid #D6E2DB',fontSize:13,background:'#fff',color:'#17231D'}}/>;
// Kadi ya muhtasari (KPI) ya kisasa
function SumCard({label,value,color='#0A6E47',hint}){
  const s=String(value??'');
  const fs=s.length>13?12.5:s.length>10?14.5:s.length>7?17:21; // namba ndefu zisikatike mstari
  return <div className="card" style={{padding:'14px 10px',textAlign:'center'}}>
    <div style={{fontSize:9.5,color:'#5C6A62',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>{label}</div>
    <div style={{fontSize:fs,fontWeight:900,color,marginTop:3,letterSpacing:'-.5px',whiteSpace:'nowrap'}}>{value}</div>
    {hint&&<div style={{fontSize:10,color:'#9AA5A0',marginTop:2}}>{hint}</div>}
  </div>;
}

// ===== F8: FINANCIAL HEALTH SCORE =====
function HealthScore({revenue,expenses}){
  const ratio=revenue>0?(revenue-expenses)/revenue*100:0;
  const score=ratio>=50?'A+':ratio>=30?'A':ratio>=15?'B':ratio>=0?'C':'D';
  const color=ratio>=30?'#0A6E47':ratio>=15?'#F2B705':'#C2412D';
  const label=ratio>=30?'Stable & Healthy':ratio>=15?'Moderate':'Needs Attention';
  return <div style={{background:`linear-gradient(135deg,${color}15,${color}05)`,borderRadius:16,padding:20,border:`2px solid ${color}30`,textAlign:'center',marginBottom:16}}>
    <div style={{fontSize:11,fontWeight:600,color,textTransform:'uppercase',letterSpacing:1}}>Financial Health</div>
    <div style={{fontSize:48,fontWeight:900,color,margin:'4px 0'}}>{score}</div>
    <div style={{fontSize:14,fontWeight:600,color}}>{label}</div>
    <div style={{fontSize:12,color:'#5C6A62',marginTop:4}}>Margin: {Math.round(ratio)}% • {ratio>=0?'Faida':'Hasara'}</div>
  </div>;
}

// ===== 1. DASHBOARD =====
export function AccountantDashboard({onNav}){
  const{paymentRequests=[],businesses=[],tokens=[],partners=[],systemExpenses=[],settings,supabase}=useApp();
  const price=parseInt(settings?.system_price||PRICE);
  const ap=paymentRequests.filter(p=>p.status==='approved');
  const pd=paymentRequests.filter(p=>p.status==='pending');
  const usedTk=tokens.filter(t=>t.used);
  const ac=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const tr=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const su=businesses.filter(b=>b.is_suspended);
  const totalRev=ap.reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.length*price);
  const ms=curMonth();
  const monthRev=ap.filter(p=>p.created_at?.startsWith(ms)).reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.filter(t=>(t.used_at||t.created_at||'').startsWith(ms)).length*price);
  const expected=ac.length*price;
  const colRate=expected>0?Math.round(monthRev/expected*100):0;
  const allExp=(systemExpenses||[]);
  const monthExp=allExp.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms).reduce((a,e)=>a+(+e.amount||0),0);
  const mm={};if(ap.length)ap.forEach(p=>{const m=p.created_at?.slice(0,7);if(m)mm[m]=(mm[m]||0)+(+p.amount||0)});else usedTk.forEach(t=>{const m=(t.used_at||t.created_at||'').slice(0,7);if(m)mm[m]=(mm[m]||0)+price});
  const months=Object.entries(mm).sort().slice(-6);const maxM=Math.max(...months.map(d=>d[1]),1);
  const pm={};usedTk.forEach(t=>{pm[t.assigned_name||'Admin']=(pm[t.assigned_name||'Admin']||0)+price});
  const[alerts,setAlerts]=useState([]);
  useEffect(()=>{supabase?.from('smart_alerts').select('*').eq('is_read',false).order('created_at',{ascending:false}).limit(5).then(({data})=>setAlerts(data||[])).catch(()=>{})},[]);

  const hour=new Date().getHours();
  const greet=hour<12?'Habari za asubuhi':hour<16?'Habari za mchana':hour<19?'Habari za jioni':'Habari za usiku';
  const profit=monthRev-monthExp;
  const QA=[{p:'payout',i:'💸',l:'Kutoa Pesa'},{p:'expenses',i:'🧾',l:'Matumizi'},{p:'budget',i:'📋',l:'Bajeti'},{p:'reports',i:'📊',l:'Ripoti'}];

  return <div className="page-enter">
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 4px',color:'#0A6E47'}}>🧮 MUHASIBU — Dashboard</h3>
    <p style={{fontSize:12,color:'#5C6A62',margin:'0 0 16px'}}>{greet} • {new Date().toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
    {/* F6: Smart Alerts */}
    {alerts.length>0&&<div style={{marginBottom:14}}>{alerts.map(a=><div key={a.id} style={{background:a.type==='danger'?'#FBECE9':a.type==='warning'?'#FFF8E6':'#EFF6FF',borderLeft:`4px solid ${a.type==='danger'?'#C2412D':a.type==='warning'?'#F2B705':'#3B82F6'}`,borderRadius:10,padding:'10px 14px',marginBottom:6,fontSize:12,color:'#17231D',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span><b>{a.title}</b> — {a.message}</span><button onClick={async()=>{await supabase.from('smart_alerts').update({is_read:true}).eq('id',a.id);setAlerts(p=>p.filter(x=>x.id!==a.id))}} style={{background:'none',border:'none',color:'#9AA5A0',cursor:'pointer',fontSize:10}}>✕</button></div>)}</div>}
    {/* P&L Hero — mapato ya mwezi mbele, mengine chini */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'24px 22px',marginBottom:14,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:-30,top:-30,width:150,height:150,borderRadius:'50%',background:'rgba(242,183,5,.12)'}}/>
      <div style={{position:'relative'}}>
        <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>MAPATO YA MWEZI HUU</div>
        <div style={{fontSize:38,fontWeight:900,letterSpacing:'-1.5px',lineHeight:1.1,margin:'2px 0 6px'}}>{fm(monthRev)}</div>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.16)',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
          {profit>=0?'📈':'📉'} Faida: {fm(profit)}
        </div>
        <div style={{display:'flex',gap:10,marginTop:18,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.18)'}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>JUMLA</div><div style={{fontSize:15.5,fontWeight:800,whiteSpace:'nowrap'}}>{fmN(totalRev)}</div></div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>MATUMIZI</div><div style={{fontSize:15.5,fontWeight:800,color:'#FCA5A5',whiteSpace:'nowrap'}}>{fmN(monthExp)}</div></div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>COLLECTION</div><div style={{fontSize:15.5,fontWeight:800,color:colRate>=80?'#86EFAC':'#FDE68A'}}>{colRate}%</div></div>
        </div>
      </div>
    </div>
    {/* Vitendo vya haraka */}
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
      {QA.map(a=><button key={a.p} className="qbtn ripple" onClick={()=>onNav?.(a.p)} style={{background:'#fff',border:'1px solid #D6E2DB',borderRadius:16,padding:'13px 4px',textAlign:'center',cursor:'pointer'}}>
        <div style={{fontSize:21}}>{a.i}</div>
        <div style={{fontSize:10.5,fontWeight:700,color:'#17231D',marginTop:3}}>{a.l}</div>
      </button>)}
    </div>
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(102px,1fr))',gap:10,marginBottom:16}}>
      {[{l:'Wateja',v:businesses.length,c:'#0A6E47'},{l:'Active',v:ac.length,c:'#0A6E47'},{l:'Trial',v:tr.length,c:'#F2B705'},{l:'Suspended',v:su.length,c:'#C2412D'},{l:'Collection',v:colRate+'%',c:colRate>=80?'#0A6E47':'#F2B705'},{l:'Tokens',v:usedTk.length,c:'#8B5CF6'},{l:'Tarajiwa',v:fmN(expected),c:'#3B82F6'},{l:'Pending',v:pd.length,c:'#F2B705'}].map((s,i)=>
      <SumCard key={i} label={s.l} value={s.v} color={s.c}/>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
      <HealthScore revenue={monthRev} expenses={monthExp}/>
      {months.length>0&&<div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📊 Mapato/Mwezi</h3>{months.map(([m,a])=><div key={m} style={{padding:'3px 0',display:'flex',alignItems:'center',gap:6}}><span style={{width:50,fontSize:10,fontWeight:600,color:'#5C6A62'}}>{m}</span><div style={{flex:1,background:'#F6F8F7',borderRadius:6,height:18,overflow:'hidden'}}><div style={{width:(a/maxM*100)+'%',height:'100%',background:'linear-gradient(90deg,#06502F,#19C277)',borderRadius:6}}/></div><span style={{fontWeight:700,fontSize:10,color:'#0A6E47',minWidth:80,textAlign:'right'}}>{fm(a)}</span></div>)}</div>}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Chaneli</h3>{Object.entries(pm).filter(([,a])=>a>0).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'5px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',fontSize:12}}><span style={{fontWeight:600}}>{n}</span><span style={{fontWeight:800,color:'#0A6E47'}}>{fm(a)}</span></div>)}{!Object.keys(pm).length&&<Empty icon="📋" text="Hakuna"/>}</div>
    </div>
  </div>;
}

// ===== F1-F3: BUDGET PAGE =====
export function AccBudgetPage(){
  const{supabase}=useApp();
  const[budgets,setBudgets]=useState([]);const[expenses,setExpenses]=useState([]);
  const[show,setShow]=useState(false);const[month,setMonth]=useState(curMonth());
  const[f,setF]=useState({category:CATS[0],amount:'',description:''});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  useEffect(()=>{
    supabase?.from('budgets').select('*').order('created_at',{ascending:false}).then(({data})=>setBudgets(data||[]));
    supabase?.from('system_expenses').select('*').order('created_at',{ascending:false}).then(({data})=>setExpenses(data||[]));
  },[]);

  const monthBudgets=budgets.filter(b=>b.month===month);
  const totalBudget=monthBudgets.reduce((a,b)=>a+(+b.planned_amount||0),0);
  const monthExp=expenses.filter(e=>(e.date||e.created_at||'').slice(0,7)===month);
  const totalSpent=monthExp.reduce((a,e)=>a+(+e.amount||0),0);
  const remaining=totalBudget-totalSpent;
  const pct=totalBudget>0?Math.round(totalSpent/totalBudget*100):0;

  // Per-category tracking
  const catData=CATS.map(c=>{
    const budget=monthBudgets.filter(b=>b.category===c).reduce((a,b)=>a+(+b.planned_amount||0),0);
    const spent=monthExp.filter(e=>e.category===c).reduce((a,e)=>a+(+e.amount||0),0);
    return{cat:c,budget,spent,remaining:budget-spent,pct:budget>0?Math.round(spent/budget*100):0};
  }).filter(c=>c.budget>0||c.spent>0);

  const handleAdd=async()=>{
    if(!f.amount||+f.amount<=0)return alert('Weka kiasi!');
    const{data,error}=await supabase.from('budgets').insert({month,category:f.category,planned_amount:+f.amount,description:f.description,created_by:'accountant'}).select().single();
    if(error){alert(error.message);return}
    setBudgets(p=>[data,...p]);setShow(false);setF({category:CATS[0],amount:'',description:''});
    // F3: Budget alert if over 80%
    const newTotal=totalBudget+(+f.amount);
    if(newTotal>0&&totalSpent/newTotal>=0.8){
      await supabase.from('smart_alerts').insert({type:'warning',title:'⚠️ Bajeti Inakaribia!',message:`Bajeti ya ${month} imefikia ${Math.round(totalSpent/newTotal*100)}%`,target:'accountant'});
    }
    // F7: Audit log
    await supabase.from('audit_logs').insert({user_email:'accountant',user_role:'accountant',action:'budget_create',details:`${f.category}: ${fm(+f.amount)} - ${month}`}).catch(()=>{});
  };

  const bColor=pct>=100?'#C2412D':pct>=80?'#F2B705':'#0A6E47';
  const bLabel=pct>=100?'Bajeti imezidi':pct>=80?'Inakaribia kikomo':'Iko salama';

  return <div className="page-enter">
    <PageHead icon="📋" title="Bajeti ya Mwezi" sub="Panga na fuatilia matumizi kwa kategoria">
      <MonthIn value={month} onChange={e=>setMonth(e.target.value)}/>
      <GBtn onClick={()=>setShow(true)}>+ Ongeza Bajeti</GBtn>
    </PageHead>
    {/* Muhtasari */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'22px',marginBottom:14,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>BAJETI YA {month}</div>
          <div style={{fontSize:34,fontWeight:900,letterSpacing:'-1px',margin:'2px 0'}}>{fm(totalBudget)}</div>
        </div>
        <span style={{background:'rgba(255,255,255,.18)',padding:'6px 13px',borderRadius:20,fontSize:12,fontWeight:800,whiteSpace:'nowrap'}}>{pct}% • {bLabel}</span>
      </div>
      <div style={{background:'rgba(255,255,255,.2)',borderRadius:8,height:10,overflow:'hidden',margin:'14px 0 12px'}}>
        <div style={{width:Math.min(pct,100)+'%',height:'100%',background:pct>=100?'#FCA5A5':pct>=80?'#FDE68A':'#86EFAC',borderRadius:8,transition:'width .8s'}}/>
      </div>
      <div style={{display:'flex',gap:10}}>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>IMETUMIKA</div><div style={{fontSize:16,fontWeight:800,color:'#FCA5A5',whiteSpace:'nowrap'}}>{fmN(totalSpent)}</div></div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>IMEBAKI</div><div style={{fontSize:16,fontWeight:800,color:remaining>=0?'#86EFAC':'#FCA5A5',whiteSpace:'nowrap'}}>{fmN(remaining)}</div></div>
      </div>
    </div>
    {/* Kwa Kategoria */}
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📊 Bajeti kwa Kategoria</h3>
      {catData.length?catData.map(c=><div key={c.cat} style={{padding:'8px 0',borderBottom:'1px solid #F6F8F7'}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
          <b>{c.cat}</b>
          <span style={{color:c.pct>=100?'#C2412D':c.pct>=80?'#F2B705':'#0A6E47',fontWeight:700}}>{fm(c.spent)} / {fm(c.budget)} ({c.pct}%)</span>
        </div>
        <div style={{background:'#F6F8F7',borderRadius:6,height:8,overflow:'hidden'}}><div style={{width:Math.min(c.pct,100)+'%',height:'100%',background:c.pct>=100?'#C2412D':c.pct>=80?'#F2B705':'#0A6E47',borderRadius:6}}/></div>
      </div>):<Empty icon="📋" text="Ongeza bajeti kuanza"/>}
    </div>
    {show&&<Modal open onClose={()=>setShow(false)} title="+ Ongeza Bajeti">
      <Sel label="Kategoria" value={f.category} onChange={e=>s('category',e.target.value)} options={CATS.map(c=>({value:c,label:c}))}/>
      <Input label="Kiasi (TZS)" type="number" placeholder="500000" value={f.amount} onChange={e=>s('amount',e.target.value)}/>
      <Input label="Maelezo" placeholder="Mf: Bajeti ya umeme Mei" value={f.description} onChange={e=>s('description',e.target.value)}/>
      <Btn onClick={handleAdd} style={{marginTop:8,width:'100%'}}>💾 Hifadhi Bajeti</Btn>
    </Modal>}
  </div>;
}

// ===== F4: PAYROLL PAGE =====
export function AccPayrollPage(){
  const{supabase}=useApp();
  const[payroll,setPayroll]=useState([]);const[show,setShow]=useState(false);const[month,setMonth]=useState(curMonth());
  const[f,setF]=useState({name:'',role:'Developer',department:'Tech',salary:'',bonus:'0',allowance:'0',deductions:'0',method:'Bank Transfer',notes:''});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const depts=['Tech','Marketing','Support','Finance','Admin','Operations'];
  const roles=['Developer','Designer','Marketer','Support Supervisor','Manager','Accountant','Admin','Other'];

  useEffect(()=>{supabase?.from('payroll').select('*').order('created_at',{ascending:false}).then(({data})=>setPayroll(data||[]))},[]);
  const monthPay=payroll.filter(p=>p.month===month);
  const totalSalary=monthPay.reduce((a,p)=>a+(+p.net_pay||0),0);
  const totalPaid=monthPay.filter(p=>p.status==='paid').reduce((a,p)=>a+(+p.net_pay||0),0);

  const handleAdd=async()=>{
    if(!f.name||!f.salary)return alert('Jaza jina na mshahara!');
    const net=(+f.salary)+(+f.bonus||0)+(+f.allowance||0)-(+f.deductions||0);
    const{data,error}=await supabase.from('payroll').insert({employee_name:f.name,role:f.role,department:f.department,salary:+f.salary,bonus:+f.bonus||0,allowance:+f.allowance||0,deductions:+f.deductions||0,net_pay:net,month,payment_method:f.method,notes:f.notes,status:'pending'}).select().single();
    if(error){alert(error.message);return}
    setPayroll(p=>[data,...p]);setShow(false);setF({name:'',role:'Developer',department:'Tech',salary:'',bonus:'0',allowance:'0',deductions:'0',method:'Bank Transfer',notes:''});
    await supabase.from('audit_logs').insert({user_role:'accountant',action:'payroll_create',details:`${f.name}: ${fm(net)} - ${month}`}).catch(()=>{});
  };

  const markPaid=async(id)=>{
    await supabase.from('payroll').update({status:'paid',paid_at:new Date().toISOString()}).eq('id',id);
    setPayroll(p=>p.map(x=>x.id===id?{...x,status:'paid',paid_at:new Date().toISOString()}:x));
  };

  const payPct=totalSalary>0?Math.round(totalPaid/totalSalary*100):0;

  return <div className="page-enter">
    <PageHead icon="👥" title="Payroll" sub="Mishahara ya wafanyakazi kwa mwezi">
      <MonthIn value={month} onChange={e=>setMonth(e.target.value)}/>
      <GBtn onClick={()=>setShow(true)}>+ Ongeza Mshahara</GBtn>
    </PageHead>
    {/* Muhtasari */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'22px',marginBottom:14,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)'}}>
      <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>MISHAHARA YA {month}</div>
      <div style={{fontSize:34,fontWeight:900,letterSpacing:'-1px',margin:'2px 0'}}>{fm(totalSalary)}</div>
      <div style={{background:'rgba(255,255,255,.2)',borderRadius:8,height:10,overflow:'hidden',margin:'12px 0 12px'}}>
        <div style={{width:payPct+'%',height:'100%',background:'#86EFAC',borderRadius:8,transition:'width .8s'}}/>
      </div>
      <div style={{display:'flex',gap:10}}>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>IMELIPWA</div><div style={{fontSize:15.5,fontWeight:800,color:'#86EFAC',whiteSpace:'nowrap'}}>{fmN(totalPaid)}</div></div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>HAIJALIPWA</div><div style={{fontSize:15.5,fontWeight:800,color:'#FDE68A',whiteSpace:'nowrap'}}>{fmN(totalSalary-totalPaid)}</div></div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>WAFANYAKAZI</div><div style={{fontSize:15.5,fontWeight:800}}>{monthPay.length}</div></div>
      </div>
    </div>
    <div className="card">
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📋 Orodha ya Mishahara</h3>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {monthPay.map(p=><div key={p.id} style={{padding:'12px',borderRadius:12,background:'#F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:800,fontSize:13.5,color:'#17231D'}}>{p.employee_name}</div>
          <div style={{fontSize:11,color:'#5C6A62',marginTop:2}}>{p.role} • {p.department} • {p.payment_method}</div>
          <div style={{fontSize:10,color:'#9AA5A0',marginTop:2}}>Mshahara: {fm(p.salary)} {+p.bonus>0?`+ Bonus: ${fm(p.bonus)}`:''} {+p.allowance>0?`+ Allow: ${fm(p.allowance)}`:''} {+p.deductions>0?`- Ded: ${fm(p.deductions)}`:''}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:900,fontSize:17,color:'#0A6E47',letterSpacing:'-.5px'}}>{fm(p.net_pay)}</div>
          {p.status==='paid'
            ?<span style={{fontSize:9.5,fontWeight:800,padding:'4px 10px',borderRadius:20,background:'#E6F2EC',color:'#0A6E47'}}>✅ IMELIPWA</span>
            :<button onClick={()=>markPaid(p.id)} className="ripple" style={{padding:'6px 14px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',fontWeight:800,fontSize:11.5,cursor:'pointer',marginTop:3}}>Lipa</button>}
        </div>
      </div>)}
      {!monthPay.length&&<Empty icon="👥" text="Hakuna mishahara kwa mwezi huu"/>}
      </div>
    </div>
    {show&&<Modal open onClose={()=>setShow(false)} title="+ Ongeza Mshahara" wide>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Input label="Jina la Mfanyakazi" placeholder="Jina kamili" value={f.name} onChange={e=>s('name',e.target.value)}/>
        <Sel label="Cheo" value={f.role} onChange={e=>s('role',e.target.value)} options={roles.map(r=>({value:r,label:r}))}/>
        <Sel label="Idara" value={f.department} onChange={e=>s('department',e.target.value)} options={depts.map(d=>({value:d,label:d}))}/>
        <Input label="Mshahara (TZS)" type="number" placeholder="1000000" value={f.salary} onChange={e=>s('salary',e.target.value)}/>
        <Input label="Bonus" type="number" placeholder="0" value={f.bonus} onChange={e=>s('bonus',e.target.value)}/>
        <Input label="Allowance" type="number" placeholder="0" value={f.allowance} onChange={e=>s('allowance',e.target.value)}/>
        <Input label="Deductions" type="number" placeholder="0" value={f.deductions} onChange={e=>s('deductions',e.target.value)}/>
        <Sel label="Njia ya Malipo" value={f.method} onChange={e=>s('method',e.target.value)} options={['Bank Transfer','Mobile Money','Cash','Cheque'].map(m=>({value:m,label:m}))}/>
      </div>
      <div style={{background:'#E6F2EC',borderRadius:10,padding:12,marginTop:8,textAlign:'center'}}><span style={{color:'#5C6A62',fontSize:12}}>Net Pay: </span><b style={{fontSize:20,color:'#0A6E47'}}>{fm((+f.salary||0)+(+f.bonus||0)+(+f.allowance||0)-(+f.deductions||0))}</b></div>
      <Btn onClick={handleAdd} style={{marginTop:10,width:'100%'}}>💾 Hifadhi</Btn>
    </Modal>}
  </div>;
}

// ===== F9-F12: MARKETING DEBTS =====
export function AccDebtsPage(){
  const{supabase,partners=[]}=useApp();
  const[debts,setDebts]=useState([]);const[payments,setPayments]=useState([]);
  const[show,setShow]=useState(false);const[payModal,setPayModal]=useState(null);
  const[f,setF]=useState({marketer_name:'',marketer_email:'',debt_name:'',amount:'',reason:'',due_date:''});
  const[payF,setPayF]=useState({amount:'',method:'Cash',reference:'',notes:''});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  useEffect(()=>{
    supabase?.from('marketing_debts').select('*').order('created_at',{ascending:false}).then(({data})=>setDebts(data||[]));
    supabase?.from('debt_payments').select('*').order('paid_at',{ascending:false}).then(({data})=>setPayments(data||[]));
  },[]);

  const totalDebt=debts.reduce((a,d)=>a+(+d.remaining||+d.amount||0),0);
  const totalPaid=debts.reduce((a,d)=>a+(+d.paid_amount||0),0);

  const handleAdd=async()=>{
    if(!f.marketer_name||!f.amount||!f.debt_name)return alert('Jaza taarifa zote!');
    const{data,error}=await supabase.from('marketing_debts').insert({...f,amount:+f.amount,remaining:+f.amount,paid_amount:0,status:'unpaid'}).select().single();
    if(error){alert(error.message);return}
    setDebts(p=>[data,...p]);setShow(false);setF({marketer_name:'',marketer_email:'',debt_name:'',amount:'',reason:'',due_date:''});
    await supabase.from('audit_logs').insert({user_role:'accountant',action:'debt_create',details:`${f.marketer_name}: ${fm(+f.amount)} - ${f.debt_name}`}).catch(()=>{});
  };

  // F10-F11: Auto balance reduction + payment recording
  const handlePay=async()=>{
    if(!payF.amount||+payF.amount<=0)return alert('Weka kiasi!');
    const debt=debts.find(d=>d.id===payModal);if(!debt)return;
    const amt=Math.min(+payF.amount,+debt.remaining||+debt.amount);
    const newPaid=(+debt.paid_amount||0)+amt;
    const newRemaining=(+debt.amount)-newPaid;
    // Record payment
    await supabase.from('debt_payments').insert({debt_id:debt.id,amount:amt,payment_method:payF.method,reference:payF.reference,notes:payF.notes});
    // Update debt
    await supabase.from('marketing_debts').update({paid_amount:newPaid,remaining:newRemaining,status:newRemaining<=0?'paid':'partial'}).eq('id',debt.id);
    setDebts(p=>p.map(d=>d.id===debt.id?{...d,paid_amount:newPaid,remaining:newRemaining,status:newRemaining<=0?'paid':'partial'}:d));
    // F12: Email notification
    if(debt.marketer_email){
      fetch(API_BASE+'/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:debt.marketer_email,subject:`💰 Malipo Yamepokelewa — ${fm(amt)}`,type:'promotional',data:{title:'💰 Malipo Yamepokelewa',emoji:'💰',message:`Umelipa ${fm(amt)}.\nBalance iliyobaki: ${fm(newRemaining)}.\nDeni: ${debt.debt_name}`,cta:'Angalia Akaunti →'}})}).catch(()=>{});
    }
    await supabase.from('audit_logs').insert({user_role:'accountant',action:'debt_payment',details:`${debt.marketer_name}: Paid ${fm(amt)}, Balance: ${fm(newRemaining)}`}).catch(()=>{});
    setPayModal(null);setPayF({amount:'',method:'Cash',reference:'',notes:''});
  };

  return <div className="page-enter">
    <PageHead icon="💳" title="Madeni ya Marketing" sub="Fuatilia madeni na malipo ya mawakala">
      <GBtn onClick={()=>setShow(true)} style={{background:'linear-gradient(135deg,#C2412D,#9B3322)',boxShadow:'0 6px 16px rgba(194,65,45,.25)'}}>+ Rekodi Deni</GBtn>
    </PageHead>
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(102px,1fr))',gap:10,marginBottom:14}}>
      <SumCard label="Deni Jumla" value={fm(totalDebt)} color="#C2412D"/>
      <SumCard label="Kilicholipwa" value={fm(totalPaid)} color="#0A6E47"/>
      <SumCard label="Madeni Hai" value={debts.filter(d=>d.status!=='paid').length} color="#F2B705"/>
    </div>
    <div className="card">
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📋 Orodha ya Madeni</h3>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {debts.map(d=>{
        const dPct=+d.amount>0?Math.round((+d.paid_amount||0)/(+d.amount)*100):0;
        const dc=d.status==='paid'?'#0A6E47':d.status==='partial'?'#F2B705':'#C2412D';
        return <div key={d.id} style={{padding:'12px',borderRadius:12,background:'#F6F8F7'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:13.5,color:'#17231D'}}>{d.marketer_name}</div>
              <div style={{fontSize:11.5,color:'#5C6A62',marginTop:2}}>{d.debt_name} • {d.reason||'—'}</div>
              <div style={{fontSize:10.5,color:'#9AA5A0',marginTop:2}}>Mwisho: {fmtDate(d.due_date)} {d.marketer_email?'• '+d.marketer_email:''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:17,color:'#C2412D',letterSpacing:'-.5px'}}>{fm(d.remaining||d.amount)}</div>
              <div style={{fontSize:10,color:'#0A6E47',fontWeight:600}}>Imelipwa: {fm(d.paid_amount)}</div>
              <div style={{display:'flex',gap:5,marginTop:5,justifyContent:'flex-end'}}>
                <span style={{fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:20,background:dc+'20',color:dc}}>{d.status==='paid'?'IMELIPWA':d.status==='partial'?'SEHEMU':'HAIJALIPWA'}</span>
                {d.status!=='paid'&&<button onClick={()=>setPayModal(d.id)} className="ripple" style={{padding:'3px 11px',borderRadius:20,border:'none',background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',fontWeight:800,fontSize:9.5,cursor:'pointer'}}>💰 LIPA</button>}
              </div>
            </div>
          </div>
          {+d.amount>0&&<div style={{background:'#D6E2DB',borderRadius:4,height:6,marginTop:9,overflow:'hidden'}}><div style={{width:dPct+'%',height:'100%',background:'linear-gradient(90deg,#06502F,#19C277)',borderRadius:4,transition:'width .8s'}}/></div>}
        </div>;
      })}
      {!debts.length&&<Empty icon="💳" text="Hakuna madeni"/>}
      </div>
    </div>
    {/* Add Debt Modal */}
    {show&&<Modal open onClose={()=>setShow(false)} title="+ Rekodi Deni Jipya">
      <Sel label="Jina la Marketer" value={f.marketer_name} onChange={e=>{s('marketer_name',e.target.value);const p=partners.find(x=>x.name===e.target.value);if(p)s('marketer_email',p.email)}} options={[{value:'',label:'— Chagua —'},...partners.map(p=>({value:p.name||p.email,label:p.name||p.email})),{value:'__custom',label:'— Andika Jipya —'}]}/>
      {f.marketer_name==='__custom'&&<Input label="Jina" value="" onChange={e=>s('marketer_name',e.target.value)}/>}
      <Input label="Email ya Marketer" placeholder="email@mfano.com" value={f.marketer_email} onChange={e=>s('marketer_email',e.target.value)}/>
      <Input label="Jina la Deni" placeholder="Mf: Commission ya Aprili" value={f.debt_name} onChange={e=>s('debt_name',e.target.value)}/>
      <Input label="Kiasi (TZS)" type="number" placeholder="200000" value={f.amount} onChange={e=>s('amount',e.target.value)}/>
      <Input label="Sababu" placeholder="Mf: Commission ya wateja 5" value={f.reason} onChange={e=>s('reason',e.target.value)}/>
      <Input label="Due Date" type="date" value={f.due_date} onChange={e=>s('due_date',e.target.value)}/>
      <Btn onClick={handleAdd} style={{marginTop:8,width:'100%',background:'#C2412D'}}>💳 Hifadhi Deni</Btn>
    </Modal>}
    {/* Pay Debt Modal */}
    {payModal&&<Modal open onClose={()=>setPayModal(null)} title="💰 Lipa Deni">
      <div style={{background:'#FBECE9',borderRadius:10,padding:12,marginBottom:12,textAlign:'center'}}><span style={{fontSize:12,color:'#B91C1C'}}>Deni Baki: </span><b style={{fontSize:20,color:'#C2412D'}}>{fm(debts.find(d=>d.id===payModal)?.remaining||0)}</b></div>
      <Input label="Kiasi cha Kulipa (TZS)" type="number" placeholder="50000" value={payF.amount} onChange={e=>setPayF(p=>({...p,amount:e.target.value}))}/>
      <Sel label="Njia" value={payF.method} onChange={e=>setPayF(p=>({...p,method:e.target.value}))} options={['Cash','Bank Transfer','Mobile Money','Cheque'].map(m=>({value:m,label:m}))}/>
      <Input label="Reference/Receipt" placeholder="Namba ya risiti" value={payF.reference} onChange={e=>setPayF(p=>({...p,reference:e.target.value}))}/>
      <Btn onClick={handlePay} style={{marginTop:8,width:'100%'}}>✅ Lipa Sasa</Btn>
    </Modal>}
  </div>;
}

// ===== F7: AUDIT LOGS =====
export function AccAuditPage(){
  const{supabase}=useApp();const[logs,setLogs]=useState([]);
  useEffect(()=>{supabase?.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(100).then(({data})=>setLogs(data||[]))},[]);
  const icons={budget_create:'📋',payroll_create:'👥',debt_create:'💳',debt_payment:'💰',expense_create:'🧾',flag_payment:'⚠️'};
  return <div className="page-enter">
    <PageHead icon="📝" title="Audit Logs" sub={`Shughuli ${logs.length} za hivi karibuni`}/>
    <div className="card"><div style={{maxHeight:520,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
      {logs.map(l=><div key={l.id} style={{padding:'10px 12px',borderRadius:10,background:'#F6F8F7',display:'flex',gap:10,alignItems:'center'}}>
        <div style={{width:38,height:38,borderRadius:12,background:'#E6F2EC',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>{icons[l.action]||'📝'}</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:12.5,color:'#17231D'}}>{l.action?.replace(/_/g,' ').toUpperCase()}</div><div style={{fontSize:11,color:'#5C6A62',marginTop:2}}>{l.details}</div></div>
        <div style={{fontSize:10,color:'#9AA5A0',whiteSpace:'nowrap'}}>{fmtDate(l.created_at)}</div>
      </div>)}
      {!logs.length&&<Empty icon="📝" text="Hakuna shughuli"/>}
    </div></div>
  </div>;
}

// ===== EXISTING PAGES (keep) =====

// ===== MALIPO PAGE =====
export function AccPaymentsPage(){
  const{paymentRequests=[],tokens=[],supabase,approvePayment,rejectPayment}=useApp();
  const[tab,setTab]=useState('all');const[period,setPeriod]=useState('all');const[flagging,setFlagging]=useState(null);const[flagReason,setFlagReason]=useState('');
  const[approving,setApproving]=useState(null);const[approveDays,setApproveDays]=useState(30);
  const[rejecting,setRejecting]=useState(null);const[rejectReason,setRejectReason]=useState('');
  const[busy,setBusy]=useState(false);
  const doApprove=async()=>{setBusy(true);const r=await approvePayment(approving,approveDays);setBusy(false);if(r){alert(`✅ Malipo yamethibitishwa! Mfumo umefunguliwa siku ${approveDays}.`);setApproving(null);}else{alert('Tatizo limetokea');}};
  const doReject=async()=>{setBusy(true);await rejectPayment(rejecting,rejectReason);setBusy(false);alert('Ombi limekataliwa.');setRejecting(null);setRejectReason('');};
  const today=new Date().toISOString().split('T')[0];const weekAgo=new Date(Date.now()-7*86400000).toISOString();const ms=today.slice(0,7);
  let filtered=tab==='approved'?paymentRequests.filter(p=>p.status==='approved'):tab==='pending'?paymentRequests.filter(p=>p.status==='pending'):tab==='rejected'?paymentRequests.filter(p=>p.status==='rejected'):tab==='flagged'?paymentRequests.filter(p=>p.flagged):paymentRequests;
  if(period==='today')filtered=filtered.filter(p=>p.created_at?.startsWith(today));
  if(period==='week')filtered=filtered.filter(p=>p.created_at>=weekAgo);
  if(period==='month')filtered=filtered.filter(p=>p.created_at?.startsWith(ms));
  const total=filtered.filter(p=>p.status==='approved').reduce((a,p)=>a+(+p.amount||0),0);
  const handleFlag=async(pid)=>{try{await supabase.from('payment_requests').update({flagged:true,flag_reason:flagReason}).eq('id',pid);await supabase.from('smart_alerts').insert({type:'danger',title:'⚠️ Malipo Yanashukiwa!',message:flagReason});await supabase.from('audit_logs').insert({user_role:'accountant',action:'flag_payment',details:flagReason});setFlagging(null);setFlagReason('');alert('Imetumwa kwa Admin!')}catch(e){alert(e.message)}};
  return <div className="page-enter">
    <PageHead icon="💰" title="Malipo" sub="Malipo ya wateja wa DukaLangu"/>
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(102px,1fr))',gap:10,marginBottom:12}}>
      <SumCard label="Kubaliwa" value={paymentRequests.filter(p=>p.status==='approved').length} color="#0A6E47"/>
      <SumCard label="Yanasubiri" value={paymentRequests.filter(p=>p.status==='pending').length} color="#F2B705"/>
      <SumCard label="Kataliwa" value={paymentRequests.filter(p=>p.status==='rejected').length} color="#C2412D"/>
      <SumCard label="Kiasi" value={fm(total)} color="#0A6E47"/>
    </div>
    <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>{[{id:'all',l:`Yote (${paymentRequests.length})`},{id:'approved',l:'✅ Kubaliwa'},{id:'pending',l:'⏳ Subiri'},{id:'rejected',l:'❌ Kataliwa'},{id:'flagged',l:'⚠️ Shukiwa'}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'6px 12px',borderRadius:8,border:tab===t.id?'2px solid #0A6E47':'1px solid #D6E2DB',background:tab===t.id?'#E6F2EC':'#fff',fontWeight:tab===t.id?700:500,fontSize:11,cursor:'pointer',color:tab===t.id?'#0A6E47':'#5C6A62'}}>{t.l}</button>)}</div>
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>{[{id:'all',l:'Yote'},{id:'today',l:'Leo'},{id:'week',l:'Wiki'},{id:'month',l:'Mwezi'}].map(t=><button key={t.id} onClick={()=>setPeriod(t.id)} style={{padding:'4px 10px',borderRadius:6,border:period===t.id?'2px solid #3B82F6':'1px solid #D6E2DB',background:period===t.id?'#EFF6FF':'#fff',fontWeight:period===t.id?700:500,fontSize:10,cursor:'pointer',color:period===t.id?'#3B82F6':'#9AA5A0'}}>{t.l}</button>)}</div>
    <div className="card"><div style={{maxHeight:500,overflowY:'auto'}}>{filtered.length?filtered.map(p=>{const tk=tokens.find(t=>t.code===p.token_code);return<div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
      <div style={{flex:1,minWidth:180}}><div style={{display:'flex',alignItems:'center',gap:6}}><b style={{fontSize:13}}>{p.business_name||'Biashara'}</b><Badge color={p.status==='approved'?'#0A6E47':p.status==='pending'?'#F2B705':'#C2412D'}>{p.status}</Badge>{p.flagged&&<Badge color="#C2412D">⚠️</Badge>}</div><div style={{fontSize:11,color:'#9AA5A0',marginTop:2}}>{fmtDate(p.created_at)} • {p.payment_method||'HALOPESA'} • <span style={{fontFamily:'monospace'}}>{p.transaction_id||'—'}</span>{tk?.assigned_name?` • 📋 ${tk.assigned_name}`:''}</div></div>
      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}><span style={{fontWeight:800,fontSize:15,color:p.status==='approved'?'#0A6E47':'#9AA5A0'}}>{fm(p.amount)}</span>
      {p.status==='pending'&&<><button onClick={()=>{setApproving(p.id);setApproveDays(30);}} style={{padding:'5px 12px',borderRadius:6,border:'none',background:'#0A6E47',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Thibitisha</button><button onClick={()=>{setRejecting(p.id);setRejectReason('');}} style={{padding:'5px 12px',borderRadius:6,border:'1px solid #C2412D',background:'#fff',color:'#C2412D',fontSize:11,fontWeight:700,cursor:'pointer'}}>❌ Kataa</button></>}
      {!p.flagged&&p.status!=='pending'&&<button onClick={()=>setFlagging(p.id)} style={{padding:'2px 6px',borderRadius:4,border:'1px solid #FCA5A5',background:'#fff',fontSize:9,cursor:'pointer',color:'#C2412D'}}>⚠️</button>}</div>
    </div>}):<Empty icon="💰" text="Hakuna malipo"/>}</div></div>

    {/* Approve modal */}
    {approving&&<Modal open onClose={()=>setApproving(null)} title="✅ Thibitisha Malipo">
      <div style={{fontSize:13,color:'#5C6A62',marginBottom:12}}>Chagua idadi ya siku za kumfungulia mteja mfumo:</div>
      <Sel label="Siku" value={approveDays} onChange={e=>setApproveDays(+e.target.value)} options={[{value:30,label:'Siku 30 (Mwezi 1)'},{value:60,label:'Siku 60 (Miezi 2)'},{value:90,label:'Siku 90 (Miezi 3)'},{value:180,label:'Siku 180 (Miezi 6)'},{value:365,label:'Siku 365 (Mwaka 1)'}]}/>
      <Btn onClick={doApprove} disabled={busy} style={{marginTop:8,width:'100%',justifyContent:'center'}}>{busy?'Inathibitisha...':'✅ Thibitisha & Fungua Mfumo'}</Btn>
    </Modal>}

    {/* Reject modal */}
    {rejecting&&<Modal open onClose={()=>setRejecting(null)} title="❌ Kataa Ombi">
      <Input label="Sababu ya kukataa" placeholder="Mf: Kiasi hakilingani..." value={rejectReason} onChange={e=>setRejectReason(e.target.value)}/>
      <Btn onClick={doReject} disabled={busy} style={{marginTop:8,width:'100%',justifyContent:'center',background:'#C2412D'}}>{busy?'Inakataa...':'❌ Kataa Ombi'}</Btn>
    </Modal>}
    {flagging&&<Modal open onClose={()=>setFlagging(null)} title="⚠️ Flag Malipo"><Input label="Sababu" placeholder="Mf: Transaction ID fake..." value={flagReason} onChange={e=>setFlagReason(e.target.value)}/><Btn onClick={()=>handleFlag(flagging)} style={{marginTop:8,background:'#C2412D',width:'100%'}}>⚠️ Tuma kwa Admin</Btn></Modal>}
  </div>;
}

// ===== MATUMIZI PAGE =====
export function AccExpensesPage(){
  const{systemExpenses=[],supabase}=useApp();
  const[show,setShow]=useState(false);const[expList,setExpList]=useState([]);
  const[f,setF]=useState({category:CATS[0],amount:'',description:'',date:new Date().toISOString().split('T')[0]});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  useEffect(()=>{setExpList(systemExpenses||[])},[systemExpenses]);
  const ms=curMonth();const monthExp=expList.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms);
  const totalMonth=monthExp.reduce((a,e)=>a+(+e.amount||0),0);const totalAll=expList.reduce((a,e)=>a+(+e.amount||0),0);
  const byCat={};expList.forEach(e=>{byCat[e.category||'Nyingine']=(byCat[e.category||'Nyingine']||0)+(+e.amount||0)});
  const handleAdd=async()=>{
    if(!f.amount||+f.amount<=0)return alert('Weka kiasi!');
    try{const{data,error}=await supabase.from('system_expenses').insert({category:f.category,amount:+f.amount,description:f.description,date:f.date,created_by:'accountant'}).select().single();
    if(error){alert(error.message);return}setExpList(p=>[data,...p]);setShow(false);setF({category:CATS[0],amount:'',description:'',date:new Date().toISOString().split('T')[0]});
    await supabase.from('audit_logs').insert({user_role:'accountant',action:'expense_create',details:`${f.category}: ${fm(+f.amount)}`}).catch(()=>{})}catch(e){alert(e.message)}};
  const maxCat=Math.max(...Object.values(byCat),1);

  return <div className="page-enter">
    <PageHead icon="🧾" title="Matumizi" sub="Rekodi na fuatilia matumizi ya kampuni">
      <GBtn onClick={()=>setShow(true)} style={{background:'linear-gradient(135deg,#C2412D,#9B3322)',boxShadow:'0 6px 16px rgba(194,65,45,.25)'}}>+ Ongeza</GBtn>
    </PageHead>
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(102px,1fr))',gap:10,marginBottom:14}}>
      <SumCard label="Mwezi Huu" value={fm(totalMonth)} color="#C2412D" hint={`${monthExp.length} rekodi`}/>
      <SumCard label="Jumla" value={fm(totalAll)} color="#F2B705" hint={`${expList.length} rekodi`}/>
      <SumCard label="Kategoria" value={Object.keys(byCat).length} color="#0A6E47"/>
    </div>
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📊 Kwa Kategoria</h3>
      {Object.keys(byCat).length?Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>
        <div key={c} style={{padding:'7px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
            <b style={{color:'#17231D'}}>{c}</b><span style={{fontWeight:800,color:'#C2412D'}}>{fm(a)}</span>
          </div>
          <div style={{background:'#F6F8F7',borderRadius:6,height:7,overflow:'hidden'}}>
            <div style={{width:(a/maxCat*100)+'%',height:'100%',background:'linear-gradient(90deg,#C2412D,#E8705C)',borderRadius:6}}/>
          </div>
        </div>):<Empty icon="📊" text="Hakuna matumizi bado"/>}
    </div>
    <div className="card"><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📋 Orodha ({expList.length})</h3><div style={{maxHeight:420,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
      {expList.map(e=><div key={e.id} style={{padding:'10px 12px',borderRadius:10,background:'#F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12.5,fontWeight:700,color:'#17231D'}}>{e.description||e.category}</div>
          <div style={{fontSize:10.5,color:'#5C6A62',marginTop:2}}>{e.category} • {fmtDate(e.date||e.created_at)}</div>
        </div>
        <span style={{fontWeight:900,color:'#C2412D',fontSize:14,whiteSpace:'nowrap'}}>{fm(e.amount)}</span>
      </div>)}
      {!expList.length&&<Empty icon="🧾" text="Hakuna matumizi"/>}</div></div>
    {show&&<Modal open onClose={()=>setShow(false)} title="+ Matumizi"><Sel label="Kategoria" value={f.category} onChange={e=>s('category',e.target.value)} options={CATS.map(c=>({value:c,label:c}))}/><Input label="Kiasi (TZS)" type="number" value={f.amount} onChange={e=>s('amount',e.target.value)}/><Input label="Maelezo" value={f.description} onChange={e=>s('description',e.target.value)}/><Input label="Tarehe" type="date" value={f.date} onChange={e=>s('date',e.target.value)}/><Btn onClick={handleAdd} style={{marginTop:8,width:'100%'}}>💸 Hifadhi</Btn></Modal>}
  </div>;
}

// ===== CHANELI =====
export function AccRevenuePage(){
  const{paymentRequests=[],tokens=[],businesses=[],settings}=useApp();
  const price=parseInt(settings?.system_price||PRICE);const ap=paymentRequests.filter(p=>p.status==='approved');const usedTk=tokens.filter(t=>t.used);
  const totalRev=ap.reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.length*price);
  const pm={};usedTk.forEach(t=>{pm[t.assigned_name||'Admin']=(pm[t.assigned_name||'Admin']||0)+price});
  const byPlan={};usedTk.forEach(t=>{byPlan[t.plan||'basic']=(byPlan[t.plan||'basic']||0)+price});
  return <div className="page-enter">
    <PageHead icon="📊" title="Chaneli" sub="Mapato kwa mshirika na kwa plan"/>
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'24px 22px',marginBottom:16,color:'#fff',textAlign:'center',boxShadow:'0 14px 34px rgba(10,110,71,.28)'}}>
      <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>MAPATO JUMLA</div>
      <div style={{fontSize:36,fontWeight:900,letterSpacing:'-1.5px',margin:'2px 0'}}>{fm(totalRev)}</div>
      <div style={{fontSize:12,opacity:.8}}>Tokens {usedTk.length} • Malipo {ap.length}</div>
    </div>
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
      <div className="card"><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📋 Kwa Mshirika</h3>{Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'6px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',fontSize:12}}><span style={{fontWeight:600}}>{n}</span><span style={{fontWeight:800,color:'#0A6E47'}}>{fm(a)} ({totalRev?Math.round(a/totalRev*100):0}%)</span></div>)}{!Object.keys(pm).length&&<Empty icon="📋" text="Hakuna"/>}</div>
      <div className="card"><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📦 Kwa Plan</h3>{Object.entries(byPlan).map(([p,a])=><div key={p} style={{padding:'6px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between'}}><Badge color={p==='premium'?'#8B5CF6':'#5C6A62'}>{p.toUpperCase()}</Badge><span style={{fontWeight:800,color:'#0A6E47'}}>{fm(a)}</span></div>)}</div>
      <div className="card"><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>🔑 Tokens ({usedTk.length})</h3><div style={{maxHeight:250,overflowY:'auto'}}>{usedTk.map(t=>{const b=businesses.find(x=>x.id===t.used_by);return<div key={t.id} style={{padding:'5px 0',borderBottom:'1px solid #F6F8F7',fontSize:11}}><span style={{fontFamily:'monospace',fontWeight:700,color:'#92400E',background:'#FFF8E6',padding:'2px 6px',borderRadius:4}}>{t.code}</span> → {b?.name||'—'} • {t.assigned_name||'Admin'} • {fm(price)}</div>})}{!usedTk.length&&<Empty icon="🔑" text="Hakuna"/>}</div></div>
    </div>
  </div>;
}

// ===== WATEJA =====
export function AccCustomersPage(){
  const{businesses=[]}=useApp();
  const ac=businesses.filter(b=>b.token_active&&!b.is_suspended);const tr=businesses.filter(b=>!b.token_active&&!b.is_suspended);const su=businesses.filter(b=>b.is_suspended);
  const exp=businesses.filter(b=>{const e=b.token_active?b.token_expiry:b.trial_end;return e&&Math.ceil((new Date(e)-new Date())/86400000)<=7&&Math.ceil((new Date(e)-new Date())/86400000)>0});
  const List=({items,color,title})=><div className="card" style={{marginBottom:14}}><h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color}}>{title} ({items.length})</h3><div style={{maxHeight:280,overflowY:'auto',display:'flex',flexDirection:'column',gap:7}}>{items.map(b=>{const e=b.token_active?b.token_expiry:b.trial_end;const d=e?Math.ceil((new Date(e)-new Date())/86400000):0;return<div key={b.id} style={{padding:'9px 11px',borderRadius:10,background:'#F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,fontSize:12}}><div style={{minWidth:0}}><div style={{fontWeight:800,color:'#17231D'}}>{b.name}</div><div style={{color:'#9AA5A0',fontSize:10.5,marginTop:1}}>{b.email}</div></div><div style={{textAlign:'right',whiteSpace:'nowrap'}}><span style={{fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:20,background:b.plan==='premium'?'#8B5CF620':'#F6F8F7',color:b.plan==='premium'?'#8B5CF6':'#5C6A62',border:'1px solid #D6E2DB'}}>{(b.plan||'trial').toUpperCase()}</span><div style={{color:d<=5?'#C2412D':'#0A6E47',fontWeight:800,fontSize:11,marginTop:3}}>Siku {d}</div></div></div>})}{!items.length&&<Empty icon="📋" text="Hakuna"/>}</div></div>;
  return <div className="page-enter">
    <PageHead icon="🏪" title={`Wateja (${businesses.length})`} sub="Biashara zilizojisajili DukaLangu"/>
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(102px,1fr))',gap:10,marginBottom:14}}>
      <SumCard label="Active" value={ac.length} color="#0A6E47"/>
      <SumCard label="Trial" value={tr.length} color="#F2B705"/>
      <SumCard label="Suspended" value={su.length} color="#C2412D"/>
      <SumCard label="Muda Unaisha" value={exp.length} color="#C2412D" hint="siku 7"/>
    </div>
    {exp.length>0&&<List items={exp} color="#C2412D" title="⚠️ Muda Unaisha"/>}
    <List items={ac} color="#0A6E47" title="✅ Active"/><List items={tr} color="#F2B705" title="⏳ Trial"/><List items={su} color="#C2412D" title="🔒 Suspended"/>
  </div>;
}

// ===== F5: RIPOTI =====
export function AccReportsPage(){
  const{paymentRequests=[],tokens=[],businesses=[],systemExpenses=[],settings,supabase}=useApp();
  const price=parseInt(settings?.system_price||PRICE);const ap=paymentRequests.filter(p=>p.status==='approved');const usedTk=tokens.filter(t=>t.used);
  const totalRev=ap.reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.length*price);const ms=curMonth();
  const monthRev=ap.filter(p=>p.created_at?.startsWith(ms)).reduce((a,p)=>a+(+p.amount||0),0)||(usedTk.filter(t=>(t.used_at||t.created_at||'').startsWith(ms)).length*price);
  const allExp=systemExpenses||[];const monthExp=allExp.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms).reduce((a,e)=>a+(+e.amount||0),0);const totalExp=allExp.reduce((a,e)=>a+(+e.amount||0),0);
  const[debts,setDebts]=useState([]);
  useEffect(()=>{supabase?.from('marketing_debts').select('*').then(({data})=>setDebts(data||[]))},[]);
  const totalDebt=debts.reduce((a,d)=>a+(+d.remaining||0),0);

  const pdf=(title,content)=>{const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;margin:30px;color:#17231D}h1{color:#0A6E47;border-bottom:3px solid #0A6E47;padding-bottom:8px}h2{margin-top:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#0A6E47;color:#fff;padding:8px;text-align:left;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #D6E2DB;font-size:12px}tr:nth-child(even){background:#F6F8F7}.big{font-size:24px;font-weight:900;color:#0A6E47}@media print{body{margin:15px}}</style></head><body>${content}<div style="margin-top:30px;border-top:2px solid #0A6E47;padding-top:10px;text-align:center;color:#5C6A62;font-size:10px">Duka Langu — ${new Date().toLocaleString('sw-TZ')}</div></body></html>`);w.document.close();setTimeout(()=>w.print(),500)};

  return <div className="page-enter">
    <PageHead icon="📋" title="Ripoti za Fedha" sub="Bonyeza kadi yoyote kupakua PDF"/>
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'22px',marginBottom:16,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)'}}>
      <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1,marginBottom:12}}>PROFIT &amp; LOSS — {ms}</div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,marginBottom:7}}>
        <span style={{opacity:.85,fontWeight:600}}>Mapato</span><b style={{fontSize:16,whiteSpace:'nowrap'}}>{fm(monthRev)}</b>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,.2)'}}>
        <span style={{opacity:.85,fontWeight:600}}>Matumizi</span><b style={{fontSize:16,color:'#FCA5A5',whiteSpace:'nowrap'}}>− {fm(monthExp)}</b>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:11}}>
        <span style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:.5}}>FAIDA</span>
        <b style={{fontSize:25,fontWeight:900,letterSpacing:'-1px',color:monthRev-monthExp>=0?'#86EFAC':'#FCA5A5',whiteSpace:'nowrap'}}>{fm(monthRev-monthExp)}</b>
      </div>
    </div>
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12}}>
      {[
        {icon:'📊',title:'P&L Report',desc:'Mapato vs Matumizi',color:'#0A6E47',fn:()=>{const byCat={};allExp.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms).forEach(e=>{byCat[e.category||'Nyingine']=(byCat[e.category||'Nyingine']||0)+(+e.amount||0)});pdf('P&L',`<h1>PROFIT & LOSS — ${ms}</h1><h2>MAPATO</h2><table><tr><td><b>Ada ya Wateja</b></td><td style="text-align:right" class="big">${fm(monthRev)}</td></tr></table><h2>MATUMIZI</h2><table>${Object.entries(byCat).map(([c,a])=>`<tr><td>${c}</td><td style="text-align:right;color:#C2412D">${fm(a)}</td></tr>`).join('')}<tr style="background:#FBECE9"><td><b>JUMLA</b></td><td style="text-align:right;font-weight:900;color:#C2412D">${fm(monthExp)}</td></tr></table><h2>FAIDA</h2><table><tr style="background:${monthRev-monthExp>=0?'#E6F2EC':'#FBECE9'}"><td><b>NET PROFIT</b></td><td style="text-align:right;font-size:24px;font-weight:900;color:${monthRev-monthExp>=0?'#0A6E47':'#C2412D'}">${fm(monthRev-monthExp)}</td></tr></table>`)}},
        {icon:'💰',title:'Mapato',desc:'Malipo & Tokens',color:'#3B82F6',fn:()=>{const pm={};usedTk.forEach(t=>{pm[t.assigned_name||'Admin']=(pm[t.assigned_name||'Admin']||0)+price});pdf('Revenue',`<h1>MAPATO</h1><p class="big">${fm(totalRev)}</p><h2>Kwa Mshirika</h2><table><tr><th>Mshirika</th><th>Mapato</th></tr>${Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=>`<tr><td>${n}</td><td>${fm(a)}</td></tr>`).join('')}</table>`)}},
        {icon:'💸',title:'Matumizi',desc:'Gharama za mfumo',color:'#C2412D',fn:()=>{const byCat={};allExp.forEach(e=>{byCat[e.category||'Nyingine']=(byCat[e.category||'Nyingine']||0)+(+e.amount||0)});pdf('Expenses',`<h1>MATUMIZI</h1><p class="big">${fm(totalExp)}</p><h2>Kategoria</h2><table><tr><th>Kategoria</th><th>Kiasi</th></tr>${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td>${c}</td><td>${fm(a)}</td></tr>`).join('')}</table>`)}},
        {icon:'📋',title:'Bajeti',desc:'Budget Report',color:'#8B5CF6',fn:()=>{pdf('Budget',`<h1>BAJETI — ${ms}</h1><p>Taarifa za bajeti zinapatikana kwenye mfumo</p>`)}},
        {icon:'💳',title:'Madeni',desc:'Marketing Debts',color:'#F2B705',fn:()=>{pdf('Debts',`<h1>MADENI YA MARKETING</h1><p>Jumla: <span class="big">${fm(totalDebt)}</span></p><table><tr><th>Marketer</th><th>Deni</th><th>Amelipa</th><th>Baki</th><th>Hali</th></tr>${debts.map(d=>`<tr><td>${d.marketer_name}</td><td>${fm(d.amount)}</td><td>${fm(d.paid_amount)}</td><td style="color:#C2412D;font-weight:700">${fm(d.remaining)}</td><td>${d.status}</td></tr>`).join('')}</table>`)}},
      ].map((r,i)=><div key={i} className="card ripple" style={{textAlign:'center',cursor:'pointer',border:`1.5px solid ${r.color}30`,padding:'18px 12px'}} onClick={r.fn}>
        <div style={{fontSize:34,marginBottom:5}}>{r.icon}</div>
        <div style={{fontWeight:800,fontSize:14,color:r.color}}>{r.title}</div>
        <div style={{fontSize:11,color:'#5C6A62',margin:'2px 0 10px'}}>{r.desc}</div>
        <span style={{display:'inline-block',padding:'6px 16px',borderRadius:20,background:r.color,color:'#fff',fontWeight:800,fontSize:11}}>📥 PDF</span>
      </div>)}
    </div>
  </div>;
}

// ===== KUTOA PESA (PAYOUT) — Snippe =====
export function AccPayoutPage(){
  const{user}=useApp();
  const[balance,setBalance]=useState(null);
  const[loadingBal,setLoadingBal]=useState(true);
  const[method,setMethod]=useState('mobile');
  const[channel,setChannel]=useState('mpesa');
  const[amount,setAmount]=useState('');
  const[recipient,setRecipient]=useState('');
  const[recipientName,setRecipientName]=useState('');
  const[bankCode,setBankCode]=useState('');
  const[reason,setReason]=useState('');
  const[fee,setFee]=useState(0);
  const[sending,setSending]=useState(false);
  const[msg,setMsg]=useState('');
  const[err,setErr]=useState('');
  const[history,setHistory]=useState([]);
  const[confirm,setConfirm]=useState(false);

  const loadBalance=async()=>{
    setLoadingBal(true);
    try{const r=await fetch(API_BASE+'/api/payments?action=payout_balance');const d=await r.json();setBalance(d.success?d.balance:null);}catch{setBalance(null)}
    setLoadingBal(false);
  };
  const loadHistory=async()=>{
    try{
      const r=await fetch(API_BASE+'/api/payments?action=payout_list');
      const d=await r.json();
      setHistory(d.success?(d.payouts||[]):[]);
    }catch{setHistory([])}
  };
  useEffect(()=>{loadBalance();loadHistory();},[]);

  // Kokotoa ada amount ikibadilika
  useEffect(()=>{
    const amt=parseFloat(amount)||0;
    if(amt<=0){setFee(0);return;}
    const t=setTimeout(async()=>{
      try{const r=await fetch(API_BASE+'/api/payments?action=payout_fee&amount='+Math.round(amt));const d=await r.json();setFee(d.fee||0);}catch{setFee(0)}
    },500);
    return()=>clearTimeout(t);
  },[amount]);

  const CHANNELS=[{v:'mpesa',l:'M-Pesa (Vodacom)'},{v:'tigopesa',l:'Mixx by Yas (Tigo)'},{v:'airtelmoney',l:'Airtel Money'},{v:'halopesa',l:'HaloPesa'}];
  const chName=c=>CHANNELS.find(x=>x.v===c)?.l||c;

  const doSend=async()=>{
    const amt=parseFloat(amount)||0;
    if(amt<=0)return setErr('Weka kiasi sahihi.');
    if(!recipient.trim())return setErr('Weka namba ya kupokea.');
    if(!reason.trim())return setErr('Andika sababu ya matumizi.');
    setConfirm(false);setSending(true);setErr('');setMsg('');
    try{
      const r=await fetch(API_BASE+'/api/payments?action=payout_request',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          amount:amt,method,channel:method==='mobile'?channel:null,
          recipient_number:recipient.trim(),recipient_name:recipientName.trim(),
          bank_code:method==='bank'?bankCode.trim():null,reason:reason.trim(),
          requested_by:user?.name||user?.email,requested_by_id:user?.id,
        }),
      });
      const d=await r.json();
      if(!d.success){setErr(d.error||'Imeshindwa kutuma ombi.');setSending(false);return;}
      setMsg('✅ '+(d.message||'Ombi limetumwa kwa idhini.'));
      setAmount('');setRecipient('');setRecipientName('');setReason('');
      loadBalance();loadHistory();
    }catch(e){setErr('Tatizo: '+(e.message||''))}
    setSending(false);
  };

  const total=(parseFloat(amount)||0)+fee;
  const stColor=s=>s==='completed'?'#0A6E47':s==='failed'||s==='rejected'?'#C2412D':s==='approved'?'#0A6E47':'#F2B705';
  const stLabel=s=>({completed:'IMEKAMILIKA',failed:'IMESHINDWA',rejected:'IMEKATALIWA',approved:'IMEIDHINISHWA',pending:'INATUMWA',pending_approval:'INASUBIRI IDHINI'}[s]||'INASUBIRI');

  return <div style={{paddingBottom:20}}>
    <h2 style={{fontSize:20,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>💸 Kutoa Pesa</h2>
    <p style={{fontSize:12.5,color:'#5C6A62',margin:'0 0 12px'}}>Toa mapato ya DukaLangu kwenda M-Pesa, Tigo, Airtel au benki</p>
    <div style={{background:'#FFF8E6',border:'1px solid #F2D98B',borderRadius:12,padding:'11px 14px',marginBottom:16,fontSize:12.5,color:'#7A5C00',display:'flex',gap:8}}>
      <span>🔒</span><span><b>Ulinzi wa fedha:</b> Unaanzisha ombi na sababu. Pesa haitatoka mpaka <b>Admin</b> NA <b>Marketing</b> waidhinishe. Idhini ikikamilika pesa inatumwa otomatiki.</span>
    </div>

    {/* Salio */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:20,padding:'22px',marginBottom:16,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)'}}>
      <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>💰 SALIO LILILOPO</div>
      <div style={{fontSize:34,fontWeight:900,letterSpacing:'-1px',margin:'4px 0'}}>
        {loadingBal?'...':balance!=null?fm(balance):'—'}
      </div>
      <button onClick={loadBalance} style={{background:'rgba(255,255,255,0.16)',border:'none',color:'#fff',padding:'6px 14px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer'}}>🔄 Pakua upya</button>
    </div>

    {/* Fomu ya kutoa */}
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:15,fontWeight:800,color:'#0A6E47',margin:'0 0 14px'}}>Anzisha Ombi la Kutoa Pesa</h3>
      {err&&<div style={{background:'#FBECE9',color:'#C2412D',padding:'11px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #C2412D'}}>⚠️ {err}</div>}
      {msg&&<div style={{background:'#E6F2EC',color:'#0A6E47',padding:'11px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #0A6E47'}}>{msg}</div>}

      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button onClick={()=>setMethod('mobile')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:method==='mobile'?'#0A6E47':'#F6F8F7',color:method==='mobile'?'#fff':'#5C6A62'}}>📱 Simu</button>
        <button onClick={()=>setMethod('bank')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:method==='bank'?'#0A6E47':'#F6F8F7',color:method==='bank'?'#fff':'#5C6A62'}}>🏦 Benki</button>
      </div>

      {method==='mobile'&&<Sel label="Mtandao" value={channel} onChange={e=>setChannel(e.target.value)} options={CHANNELS.map(c=>({value:c.v,label:c.l}))}/>}
      {method==='bank'&&<Input label="Bank Code" value={bankCode} onChange={e=>setBankCode(e.target.value)} placeholder="Mf: CRDBTZTZ"/>}
      <Input label={method==='bank'?'Namba ya Akaunti':'Namba ya Simu'} value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder={method==='bank'?'0150XXXXXXXXX':'07XXXXXXXX'}/>
      <Input label="Jina la Mpokeaji" value={recipientName} onChange={e=>setRecipientName(e.target.value)} placeholder="Jina kamili"/>
      <Input label="Kiasi (TZS)" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="50000"/>
      <Input label="Sababu ya matumizi *" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Mf: Mshahara, kodi, manunuzi..."/>

      {/* Muhtasari */}
      {parseFloat(amount)>0&&<div style={{background:'#F6F8F7',borderRadius:12,padding:'12px 14px',margin:'4px 0 14px',fontSize:13}}>
        <div style={{display:'flex',justifyContent:'space-between',color:'#5C6A62',marginBottom:4}}><span>Kiasi</span><span>{fm(parseFloat(amount)||0)}</span></div>
        <div style={{display:'flex',justifyContent:'space-between',color:'#5C6A62',marginBottom:4}}><span>Ada</span><span>{fm(fee)}</span></div>
        <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,color:'#0A6E47',paddingTop:6,borderTop:'1px solid #D6E2DB'}}><span>JUMLA</span><span>{fm(total)}</span></div>
      </div>}

      <button onClick={()=>{const amt=parseFloat(amount)||0;if(amt<=0)return setErr('Weka kiasi sahihi.');if(!recipient.trim())return setErr('Weka namba ya kupokea.');if(!reason.trim())return setErr('Andika sababu ya matumizi.');setErr('');setConfirm(true);}} disabled={sending} style={{width:'100%',padding:14,background:sending?'#86EFAC':'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:15,cursor:sending?'wait':'pointer',boxShadow:'0 8px 20px rgba(10,110,71,.3)'}}>
        {sending?'Inatuma...':'📤 Tuma Ombi kwa Idhini'}
      </button>
    </div>

    {/* Historia */}
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:800,color:'#0A6E47',margin:'0 0 12px'}}>📜 Historia ya Maombi</h3>
      {history.length?<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {history.map(p=>(
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'#F6F8F7'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:'#17231D'}}>{fm(p.amount)} <span style={{fontSize:11,color:'#5C6A62',fontWeight:500}}>→ {p.recipient_name||p.recipient_number}</span></div>
              <div style={{fontSize:11,color:'#5C6A62'}}>{fmtDate(p.created_at)} • {p.method==='bank'?'Benki':chName(p.channel)} {p.reason?'• '+p.reason:''}</div>
              {p.status==='pending_approval'&&<div style={{fontSize:10.5,marginTop:3,display:'flex',gap:8}}>
                <span style={{color:p.admin_approved?'#0A6E47':'#9AA5A0'}}>{p.admin_approved?'✓':'○'} Admin</span>
                <span style={{color:p.marketing_approved?'#0A6E47':'#9AA5A0'}}>{p.marketing_approved?'✓':'○'} Marketing</span>
              </div>}
              {p.status==='rejected'&&p.rejected_reason&&<div style={{fontSize:10.5,marginTop:3,color:'#C2412D'}}>❌ {p.rejected_reason}</div>}
            </div>
            <span style={{fontSize:9.5,fontWeight:800,padding:'4px 10px',borderRadius:20,background:stColor(p.status)+'20',color:stColor(p.status),whiteSpace:'nowrap'}}>{stLabel(p.status)}</span>
          </div>
        ))}
      </div>:<Empty icon="💸" text="Hakuna maombi bado"/>}
    </div>

    {/* Modal ya uthibitisho */}
    <Modal open={confirm} onClose={()=>setConfirm(false)} title="📤 Thibitisha Ombi">
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:10}}>📤</div>
        <div style={{fontSize:14,color:'#5C6A62',marginBottom:12,lineHeight:1.6}}>
          Ombi la <b style={{color:'#0A6E47',fontSize:18}}>{fm(parseFloat(amount)||0)}</b><br/>
          kwenda <b>{recipientName||recipient}</b> ({method==='bank'?'Benki':chName(channel)})<br/>
          Sababu: <b>{reason}</b><br/>
          Ada: {fm(fee)} • Jumla: <b>{fm(total)}</b>
        </div>
        <div style={{background:'#FFF8E6',borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#7A5C00'}}>
          🔒 Litatumwa kwa Admin na Marketing. Pesa haitatoka mpaka wote waidhinishe.
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setConfirm(false)} style={{flex:1,padding:13,background:'#F6F8F7',color:'#5C6A62',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Ghairi</button>
          <button onClick={doSend} style={{flex:2,padding:13,background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>✅ Tuma Ombi</button>
        </div>
      </div>
    </Modal>
  </div>;
}
