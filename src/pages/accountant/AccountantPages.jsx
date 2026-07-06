import React,{useState,useEffect,useMemo} from 'react';
import { API_BASE } from '../../config/api';
import {useApp} from '../../context/AppContext';
import {IC,Stat,Badge,Empty,Input,Sel,Btn,Modal} from '../../components/UI';

const fmtDate=d=>d?new Date(d).toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'}):'—';
const fm=n=>`TZS ${(+n||0).toLocaleString()}`;
const PRICE=15000;
const CATS=['Umeme','Maji','Internet','Kodi ya Pango','Usafiri','Vifaa vya Ofisi','Mishahara','Matengenezo','Marketing','Chakula','SMS/Beem','Server/Hosting','Domain','Nyingine'];
const curMonth=()=>new Date().toISOString().slice(0,7);

// ===== F8: FINANCIAL HEALTH SCORE =====
function HealthScore({revenue,expenses}){
  const ratio=revenue>0?(revenue-expenses)/revenue*100:0;
  const score=ratio>=50?'A+':ratio>=30?'A':ratio>=15?'B':ratio>=0?'C':'D';
  const color=ratio>=30?'#22C55E':ratio>=15?'#F59E0B':'#EF4444';
  const label=ratio>=30?'Stable & Healthy':ratio>=15?'Moderate':'Needs Attention';
  return <div style={{background:`linear-gradient(135deg,${color}15,${color}05)`,borderRadius:16,padding:20,border:`2px solid ${color}30`,textAlign:'center',marginBottom:16}}>
    <div style={{fontSize:11,fontWeight:600,color,textTransform:'uppercase',letterSpacing:1}}>Financial Health</div>
    <div style={{fontSize:48,fontWeight:900,color,margin:'4px 0'}}>{score}</div>
    <div style={{fontSize:14,fontWeight:600,color}}>{label}</div>
    <div style={{fontSize:12,color:'#64748B',marginTop:4}}>Margin: {Math.round(ratio)}% • {ratio>=0?'Faida':'Hasara'}</div>
  </div>;
}

// ===== 1. DASHBOARD =====
export function AccountantDashboard(){
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

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 4px',color:'#0B7A3B'}}>🧮 MUHASIBU — Dashboard</h3>
    <p style={{fontSize:12,color:'#64748B',margin:'0 0 16px'}}>{new Date().toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
    {/* F6: Smart Alerts */}
    {alerts.length>0&&<div style={{marginBottom:14}}>{alerts.map(a=><div key={a.id} style={{background:a.type==='danger'?'#FEF2F2':a.type==='warning'?'#FFF7ED':'#EFF6FF',borderLeft:`4px solid ${a.type==='danger'?'#EF4444':a.type==='warning'?'#F59E0B':'#3B82F6'}`,borderRadius:10,padding:'10px 14px',marginBottom:6,fontSize:12,color:'#1E293B',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span><b>{a.title}</b> — {a.message}</span><button onClick={async()=>{await supabase.from('smart_alerts').update({is_read:true}).eq('id',a.id);setAlerts(p=>p.filter(x=>x.id!==a.id))}} style={{background:'none',border:'none',color:'#94A3B8',cursor:'pointer',fontSize:10}}>✕</button></div>)}</div>}
    {/* P&L Hero */}
    <div style={{background:'linear-gradient(135deg,#065F2E,#0B7A3B)',borderRadius:20,padding:24,marginBottom:16,color:'#fff',boxShadow:'0 8px 30px rgba(11,122,59,0.3)'}}>
      <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:16,textAlign:'center'}}>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>MAPATO JUMLA</div><div style={{fontSize:26,fontWeight:900}}>{fm(totalRev)}</div></div>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>MWEZI HUU</div><div style={{fontSize:26,fontWeight:900}}>{fm(monthRev)}</div></div>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>MATUMIZI</div><div style={{fontSize:26,fontWeight:900,color:'#FCA5A5'}}>{fm(monthExp)}</div></div>
        <div><div style={{fontSize:11,opacity:.7,fontWeight:600}}>FAIDA</div><div style={{fontSize:26,fontWeight:900,color:monthRev-monthExp>=0?'#86EFAC':'#FCA5A5'}}>{fm(monthRev-monthExp)}</div></div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:16}}>
      {[{l:'Wateja',v:businesses.length,c:'#0B7A3B'},{l:'Active',v:ac.length,c:'#22C55E'},{l:'Trial',v:tr.length,c:'#F59E0B'},{l:'Suspended',v:su.length,c:'#EF4444'},{l:'Collection',v:colRate+'%',c:colRate>=80?'#22C55E':'#F59E0B'},{l:'Tokens',v:usedTk.length,c:'#8B5CF6'},{l:'Tarajiwa',v:fm(expected),c:'#3B82F6'},{l:'Pending',v:pd.length,c:'#F59E0B'}].map((s,i)=>
      <div key={i} className="card" style={{textAlign:'center',padding:12}}><div style={{fontSize:9,color:'#64748B',fontWeight:600,textTransform:'uppercase'}}>{s.l}</div><div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div></div>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
      <HealthScore revenue={monthRev} expenses={monthExp}/>
      {months.length>0&&<div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📊 Mapato/Mwezi</h3>{months.map(([m,a])=><div key={m} style={{padding:'3px 0',display:'flex',alignItems:'center',gap:6}}><span style={{width:50,fontSize:10,fontWeight:600,color:'#64748B'}}>{m}</span><div style={{flex:1,background:'#F1F5F9',borderRadius:6,height:18,overflow:'hidden'}}><div style={{width:(a/maxM*100)+'%',height:'100%',background:'linear-gradient(90deg,#0B7A3B,#22C55E)',borderRadius:6}}/></div><span style={{fontWeight:700,fontSize:10,color:'#0B7A3B',minWidth:80,textAlign:'right'}}>{fm(a)}</span></div>)}</div>}
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Chaneli</h3>{Object.entries(pm).filter(([,a])=>a>0).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'5px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}><span style={{fontWeight:600}}>{n}</span><span style={{fontWeight:800,color:'#0B7A3B'}}>{fm(a)}</span></div>)}{!Object.keys(pm).length&&<Empty icon="📋" text="Hakuna"/>}</div>
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

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:20,fontWeight:900,margin:0,color:'#0B7A3B'}}>📋 Bajeti ya Mwezi</h3>
      <div style={{display:'flex',gap:8}}><input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13}}/>
      <button onClick={()=>setShow(true)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Ongeza Bajeti</button></div>
    </div>
    {/* Overview */}
    <div style={{background:pct>=100?'linear-gradient(135deg,#FEF2F2,#FEE2E2)':pct>=80?'linear-gradient(135deg,#FFF7ED,#FFEDD5)':'linear-gradient(135deg,#F0FDF4,#DCFCE7)',borderRadius:16,padding:20,marginBottom:16,border:`2px solid ${pct>=100?'#FECACA':pct>=80?'#FED7AA':'#BBF7D0'}`}}>
      <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:12,textAlign:'center',marginBottom:12}}>
        <div><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>BAJETI</div><div style={{fontSize:24,fontWeight:900,color:'#0B7A3B'}}>{fm(totalBudget)}</div></div>
        <div><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>IMETUMIKA</div><div style={{fontSize:24,fontWeight:900,color:'#EF4444'}}>{fm(totalSpent)}</div></div>
        <div><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>IMEBAKI</div><div style={{fontSize:24,fontWeight:900,color:remaining>=0?'#22C55E':'#EF4444'}}>{fm(remaining)}</div></div>
        <div><div style={{fontSize:10,color:'#64748B',fontWeight:600}}>ASILIMIA</div><div style={{fontSize:24,fontWeight:900,color:pct>=100?'#EF4444':pct>=80?'#F59E0B':'#22C55E'}}>{pct}%</div></div>
      </div>
      <div style={{background:'#E2E8F0',borderRadius:8,height:12,overflow:'hidden'}}><div style={{width:Math.min(pct,100)+'%',height:'100%',background:pct>=100?'#EF4444':pct>=80?'#F59E0B':'#22C55E',borderRadius:8,transition:'width 0.8s'}}/></div>
    </div>
    {/* Per Category */}
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📊 Bajeti kwa Kategoria</h3>
      {catData.length?catData.map(c=><div key={c.cat} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
          <b>{c.cat}</b>
          <span style={{color:c.pct>=100?'#EF4444':c.pct>=80?'#F59E0B':'#22C55E',fontWeight:700}}>{fm(c.spent)} / {fm(c.budget)} ({c.pct}%)</span>
        </div>
        <div style={{background:'#F1F5F9',borderRadius:6,height:8,overflow:'hidden'}}><div style={{width:Math.min(c.pct,100)+'%',height:'100%',background:c.pct>=100?'#EF4444':c.pct>=80?'#F59E0B':'#22C55E',borderRadius:6}}/></div>
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

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:20,fontWeight:900,margin:0,color:'#0B7A3B'}}>👥 Payroll</h3>
      <div style={{display:'flex',gap:8}}><input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13}}/>
      <button onClick={()=>setShow(true)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Ongeza Mshahara</button></div>
    </div>
    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.dollar} label="Mishahara" value={fm(totalSalary)} color="#8B5CF6" sub={month}/>
      <Stat icon={IC.ok} label="Imelipwa" value={fm(totalPaid)} color="#22C55E"/>
      <Stat icon={IC.clock} label="Haijalipwa" value={fm(totalSalary-totalPaid)} color="#F59E0B"/>
      <Stat icon={IC.people} label="Wafanyakazi" value={monthPay.length} color="#3B82F6"/>
    </div>
    <div className="card">
      {monthPay.map(p=><div key={p.id} style={{padding:'12px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:14}}>{p.employee_name}</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>{p.role} • {p.department} • {p.payment_method}</div>
          <div style={{fontSize:10,color:'#64748B',marginTop:2}}>Mshahara: {fm(p.salary)} {+p.bonus>0?`+ Bonus: ${fm(p.bonus)}`:''} {+p.allowance>0?`+ Allow: ${fm(p.allowance)}`:''} {+p.deductions>0?`- Ded: ${fm(p.deductions)}`:''}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:900,fontSize:16,color:'#0B7A3B'}}>{fm(p.net_pay)}</div>
          {p.status==='paid'?<Badge color="#22C55E">✅ Paid</Badge>:<button onClick={()=>markPaid(p.id)} style={{padding:'4px 12px',borderRadius:6,border:'1px solid #22C55E',background:'#F0FDF4',color:'#22C55E',fontWeight:700,fontSize:11,cursor:'pointer'}}>Lipa</button>}
        </div>
      </div>)}
      {!monthPay.length&&<Empty icon="👥" text="Hakuna mishahara kwa mwezi huu"/>}
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
      <div style={{background:'#F0FDF4',borderRadius:10,padding:12,marginTop:8,textAlign:'center'}}><span style={{color:'#64748B',fontSize:12}}>Net Pay: </span><b style={{fontSize:20,color:'#0B7A3B'}}>{fm((+f.salary||0)+(+f.bonus||0)+(+f.allowance||0)-(+f.deductions||0))}</b></div>
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

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:20,fontWeight:900,margin:0,color:'#0B7A3B'}}>💳 Madeni ya Marketing</h3>
      <button onClick={()=>setShow(true)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#EF4444',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Rekodi Deni</button>
    </div>
    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.warn} label="Deni Jumla" value={fm(totalDebt)} color="#EF4444"/>
      <Stat icon={IC.ok} label="Kilicholipwa" value={fm(totalPaid)} color="#22C55E"/>
      <Stat icon={IC.clock} label="Madeni" value={debts.filter(d=>d.status!=='paid').length} color="#F59E0B"/>
    </div>
    <div className="card">
      {debts.map(d=><div key={d.id} style={{padding:'12px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>{d.marketer_name}</div>
            <div style={{fontSize:12,color:'#64748B'}}>{d.debt_name} • {d.reason||'—'}</div>
            <div style={{fontSize:11,color:'#94A3B8'}}>Due: {fmtDate(d.due_date)} • {d.marketer_email||''}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:900,fontSize:16,color:'#EF4444'}}>{fm(d.remaining||d.amount)}</div>
            <div style={{fontSize:10,color:'#22C55E'}}>Paid: {fm(d.paid_amount)}</div>
            <div style={{display:'flex',gap:4,marginTop:4}}>
              <Badge color={d.status==='paid'?'#22C55E':d.status==='partial'?'#F59E0B':'#EF4444'}>{d.status==='paid'?'Imelipwa':d.status==='partial'?'Sehemu':'Haijalipwa'}</Badge>
              {d.status!=='paid'&&<button onClick={()=>setPayModal(d.id)} style={{padding:'3px 10px',borderRadius:6,border:'1px solid #22C55E',background:'#F0FDF4',color:'#22C55E',fontWeight:700,fontSize:10,cursor:'pointer'}}>💰 Lipa</button>}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        {+d.amount>0&&<div style={{background:'#F1F5F9',borderRadius:4,height:6,marginTop:6,overflow:'hidden'}}><div style={{width:Math.round((+d.paid_amount||0)/(+d.amount)*100)+'%',height:'100%',background:'#22C55E',borderRadius:4}}/></div>}
      </div>)}
      {!debts.length&&<Empty icon="💳" text="Hakuna madeni"/>}
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
      <Btn onClick={handleAdd} style={{marginTop:8,width:'100%',background:'#EF4444'}}>💳 Hifadhi Deni</Btn>
    </Modal>}
    {/* Pay Debt Modal */}
    {payModal&&<Modal open onClose={()=>setPayModal(null)} title="💰 Lipa Deni">
      <div style={{background:'#FEF2F2',borderRadius:10,padding:12,marginBottom:12,textAlign:'center'}}><span style={{fontSize:12,color:'#B91C1C'}}>Deni Baki: </span><b style={{fontSize:20,color:'#EF4444'}}>{fm(debts.find(d=>d.id===payModal)?.remaining||0)}</b></div>
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
  const icons={budget_create:'📋',payroll_create:'👥',debt_create:'💳',debt_payment:'💰',expense_create:'💸',flag_payment:'⚠️'};
  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>📝 Audit Logs</h3>
    <div className="card"><div style={{maxHeight:500,overflowY:'auto'}}>
      {logs.map(l=><div key={l.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',gap:10,alignItems:'center'}}>
        <div style={{width:36,height:36,borderRadius:10,background:'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{icons[l.action]||'📝'}</div>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{l.action?.replace(/_/g,' ').toUpperCase()}</div><div style={{fontSize:11,color:'#64748B'}}>{l.details}</div></div>
        <div style={{fontSize:10,color:'#94A3B8',whiteSpace:'nowrap'}}>{fmtDate(l.created_at)}</div>
      </div>)}
      {!logs.length&&<Empty icon="📝" text="Hakuna shughuli"/>}
    </div></div>
  </div>;
}

// ===== EXISTING PAGES (keep) =====

// ===== MALIPO PAGE =====
export function AccPaymentsPage(){
  const{paymentRequests=[],tokens=[],supabase}=useApp();
  const[tab,setTab]=useState('all');const[period,setPeriod]=useState('all');const[flagging,setFlagging]=useState(null);const[flagReason,setFlagReason]=useState('');
  const today=new Date().toISOString().split('T')[0];const weekAgo=new Date(Date.now()-7*86400000).toISOString();const ms=today.slice(0,7);
  let filtered=tab==='approved'?paymentRequests.filter(p=>p.status==='approved'):tab==='pending'?paymentRequests.filter(p=>p.status==='pending'):tab==='rejected'?paymentRequests.filter(p=>p.status==='rejected'):tab==='flagged'?paymentRequests.filter(p=>p.flagged):paymentRequests;
  if(period==='today')filtered=filtered.filter(p=>p.created_at?.startsWith(today));
  if(period==='week')filtered=filtered.filter(p=>p.created_at>=weekAgo);
  if(period==='month')filtered=filtered.filter(p=>p.created_at?.startsWith(ms));
  const total=filtered.filter(p=>p.status==='approved').reduce((a,p)=>a+(+p.amount||0),0);
  const handleFlag=async(pid)=>{try{await supabase.from('payment_requests').update({flagged:true,flag_reason:flagReason}).eq('id',pid);await supabase.from('smart_alerts').insert({type:'danger',title:'⚠️ Malipo Yanashukiwa!',message:flagReason});await supabase.from('audit_logs').insert({user_role:'accountant',action:'flag_payment',details:flagReason});setFlagging(null);setFlagReason('');alert('Imetumwa kwa Admin!')}catch(e){alert(e.message)}};
  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>💰 Malipo</h3>
    <div className="flex-wrap" style={{marginBottom:12}}>
      <Stat icon={IC.ok} label="Kubaliwa" value={paymentRequests.filter(p=>p.status==='approved').length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Subiri" value={paymentRequests.filter(p=>p.status==='pending').length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Kataliwa" value={paymentRequests.filter(p=>p.status==='rejected').length} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Kiasi" value={fm(total)} color="#0B7A3B"/>
    </div>
    <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>{[{id:'all',l:`Yote (${paymentRequests.length})`},{id:'approved',l:'✅ Kubaliwa'},{id:'pending',l:'⏳ Subiri'},{id:'rejected',l:'❌ Kataliwa'},{id:'flagged',l:'⚠️ Shukiwa'}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'6px 12px',borderRadius:8,border:tab===t.id?'2px solid #0B7A3B':'1px solid #E2E8F0',background:tab===t.id?'#F0FDF4':'#fff',fontWeight:tab===t.id?700:500,fontSize:11,cursor:'pointer',color:tab===t.id?'#0B7A3B':'#64748B'}}>{t.l}</button>)}</div>
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>{[{id:'all',l:'Yote'},{id:'today',l:'Leo'},{id:'week',l:'Wiki'},{id:'month',l:'Mwezi'}].map(t=><button key={t.id} onClick={()=>setPeriod(t.id)} style={{padding:'4px 10px',borderRadius:6,border:period===t.id?'2px solid #3B82F6':'1px solid #E2E8F0',background:period===t.id?'#EFF6FF':'#fff',fontWeight:period===t.id?700:500,fontSize:10,cursor:'pointer',color:period===t.id?'#3B82F6':'#94A3B8'}}>{t.l}</button>)}</div>
    <div className="card"><div style={{maxHeight:500,overflowY:'auto'}}>{filtered.length?filtered.map(p=>{const tk=tokens.find(t=>t.code===p.token_code);return<div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
      <div style={{flex:1,minWidth:180}}><div style={{display:'flex',alignItems:'center',gap:6}}><b style={{fontSize:13}}>{p.business_name||'Biashara'}</b><Badge color={p.status==='approved'?'#22C55E':p.status==='pending'?'#F59E0B':'#EF4444'}>{p.status}</Badge>{p.flagged&&<Badge color="#EF4444">⚠️</Badge>}</div><div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{fmtDate(p.created_at)} • {p.payment_method||'HALOPESA'} • <span style={{fontFamily:'monospace'}}>{p.transaction_id||'—'}</span>{tk?.assigned_name?` • 📋 ${tk.assigned_name}`:''}</div></div>
      <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontWeight:800,fontSize:15,color:p.status==='approved'?'#0B7A3B':'#94A3B8'}}>{fm(p.amount)}</span>{!p.flagged&&<button onClick={()=>setFlagging(p.id)} style={{padding:'2px 6px',borderRadius:4,border:'1px solid #FCA5A5',background:'#fff',fontSize:9,cursor:'pointer',color:'#EF4444'}}>⚠️</button>}</div>
    </div>}):<Empty icon="💰" text="Hakuna malipo"/>}</div></div>
    {flagging&&<Modal open onClose={()=>setFlagging(null)} title="⚠️ Flag Malipo"><Input label="Sababu" placeholder="Mf: Transaction ID fake..." value={flagReason} onChange={e=>setFlagReason(e.target.value)}/><Btn onClick={()=>handleFlag(flagging)} style={{marginTop:8,background:'#EF4444',width:'100%'}}>⚠️ Tuma kwa Admin</Btn></Modal>}
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
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:20,fontWeight:900,margin:0,color:'#0B7A3B'}}>💸 Matumizi</h3>
      <button onClick={()=>setShow(true)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#EF4444',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Ongeza</button>
    </div>
    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.dollar} label="Mwezi Huu" value={fm(totalMonth)} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Jumla" value={fm(totalAll)} color="#F59E0B"/>
    </div>
    <div className="card" style={{marginBottom:14}}><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📊 Kwa Kategoria</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8}}>{Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=><div key={c} style={{background:'#F8FAFC',borderRadius:10,padding:8,border:'1px solid #E2E8F0'}}><div style={{fontSize:9,color:'#64748B',fontWeight:600}}>{c}</div><div style={{fontSize:14,fontWeight:800,color:'#EF4444'}}>{fm(a)}</div></div>)}</div>
    </div>
    <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Orodha ({expList.length})</h3><div style={{maxHeight:400,overflowY:'auto'}}>
      {expList.map(e=><div key={e.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><Badge color="#64748B">{e.category}</Badge> <span style={{fontSize:12,fontWeight:600}}>{e.description||'—'}</span><br/><span style={{fontSize:10,color:'#94A3B8'}}>{fmtDate(e.date||e.created_at)}</span></div><span style={{fontWeight:800,color:'#EF4444',fontSize:14}}>{fm(e.amount)}</span></div>)}
      {!expList.length&&<Empty icon="💸" text="Hakuna"/>}</div></div>
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
  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>📊 Chaneli</h3>
    <div style={{background:'linear-gradient(135deg,#065F2E,#0B7A3B)',borderRadius:20,padding:24,marginBottom:16,color:'#fff',textAlign:'center'}}><div style={{fontSize:12,opacity:.7}}>MAPATO JUMLA</div><div style={{fontSize:36,fontWeight:900}}>{fm(totalRev)}</div><div style={{fontSize:12,opacity:.7}}>Tokens {usedTk.length} • Malipo {ap.length}</div></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📋 Kwa Mshirika</h3>{Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=><div key={n} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}><span style={{fontWeight:600}}>{n}</span><span style={{fontWeight:800,color:'#0B7A3B'}}>{fm(a)} ({totalRev?Math.round(a/totalRev*100):0}%)</span></div>)}{!Object.keys(pm).length&&<Empty icon="📋" text="Hakuna"/>}</div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>📦 Kwa Plan</h3>{Object.entries(byPlan).map(([p,a])=><div key={p} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between'}}><Badge color={p==='premium'?'#8B5CF6':'#64748B'}>{p.toUpperCase()}</Badge><span style={{fontWeight:800,color:'#0B7A3B'}}>{fm(a)}</span></div>)}</div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px'}}>🔑 Tokens ({usedTk.length})</h3><div style={{maxHeight:250,overflowY:'auto'}}>{usedTk.map(t=>{const b=businesses.find(x=>x.id===t.used_by);return<div key={t.id} style={{padding:'5px 0',borderBottom:'1px solid #F1F5F9',fontSize:11}}><span style={{fontFamily:'monospace',fontWeight:700,color:'#92400E',background:'#FFF7ED',padding:'2px 6px',borderRadius:4}}>{t.code}</span> → {b?.name||'—'} • {t.assigned_name||'Admin'} • {fm(price)}</div>})}{!usedTk.length&&<Empty icon="🔑" text="Hakuna"/>}</div></div>
    </div>
  </div>;
}

// ===== WATEJA =====
export function AccCustomersPage(){
  const{businesses=[]}=useApp();
  const ac=businesses.filter(b=>b.token_active&&!b.is_suspended);const tr=businesses.filter(b=>!b.token_active&&!b.is_suspended);const su=businesses.filter(b=>b.is_suspended);
  const exp=businesses.filter(b=>{const e=b.token_active?b.token_expiry:b.trial_end;return e&&Math.ceil((new Date(e)-new Date())/86400000)<=7&&Math.ceil((new Date(e)-new Date())/86400000)>0});
  const List=({items,color,title})=><div className="card" style={{marginBottom:14}}><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 8px',color}}>{title} ({items.length})</h3><div style={{maxHeight:250,overflowY:'auto'}}>{items.map(b=>{const e=b.token_active?b.token_expiry:b.trial_end;const d=e?Math.ceil((new Date(e)-new Date())/86400000):0;return<div key={b.id} style={{padding:'5px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}><div><b>{b.name}</b><br/><span style={{color:'#94A3B8'}}>{b.email}</span></div><div style={{textAlign:'right'}}><Badge color={b.plan==='premium'?'#8B5CF6':'#64748B'}>{b.plan||'trial'}</Badge><br/><span style={{color:d<=5?'#EF4444':'#22C55E',fontWeight:700,fontSize:11}}>Siku {d}</span></div></div>})}{!items.length&&<Empty icon="📋" text="Hakuna"/>}</div></div>;
  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>🏪 Wateja ({businesses.length})</h3>
    <div className="flex-wrap" style={{marginBottom:14}}><Stat icon={IC.ok} label="Active" value={ac.length} color="#22C55E"/><Stat icon={IC.clock} label="Trial" value={tr.length} color="#F59E0B"/><Stat icon={IC.warn} label="Suspended" value={su.length} color="#EF4444"/><Stat icon={IC.warn} label="Muda" value={exp.length} color="#EF4444" sub="siku 7"/></div>
    {exp.length>0&&<List items={exp} color="#EF4444" title="⚠️ Muda Unaisha"/>}
    <List items={ac} color="#22C55E" title="✅ Active"/><List items={tr} color="#F59E0B" title="⏳ Trial"/><List items={su} color="#EF4444" title="🔒 Suspended"/>
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

  const pdf=(title,content)=>{const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;margin:30px;color:#1E293B}h1{color:#0B7A3B;border-bottom:3px solid #0B7A3B;padding-bottom:8px}h2{margin-top:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#0B7A3B;color:#fff;padding:8px;text-align:left;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #E2E8F0;font-size:12px}tr:nth-child(even){background:#F8FAFC}.big{font-size:24px;font-weight:900;color:#0B7A3B}@media print{body{margin:15px}}</style></head><body>${content}<div style="margin-top:30px;border-top:2px solid #0B7A3B;padding-top:10px;text-align:center;color:#64748B;font-size:10px">PesaFly / Duka Langu — ${new Date().toLocaleString('sw-TZ')}</div></body></html>`);w.document.close();setTimeout(()=>w.print(),500)};

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 14px',color:'#0B7A3B'}}>📋 Ripoti za Fedha</h3>
    <div style={{background:'linear-gradient(135deg,#065F2E,#0B7A3B)',borderRadius:20,padding:24,marginBottom:16,color:'#fff'}}>
      <div style={{textAlign:'center',marginBottom:6}}><div style={{fontSize:12,opacity:.7}}>P&L — {ms}</div></div>
      <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:10,textAlign:'center'}}>
        <div><div style={{fontSize:10,opacity:.6}}>MAPATO</div><div style={{fontSize:22,fontWeight:900}}>{fm(monthRev)}</div></div>
        <div style={{fontSize:20,alignSelf:'center',opacity:.5}}>−</div>
        <div><div style={{fontSize:10,opacity:.6}}>MATUMIZI</div><div style={{fontSize:22,fontWeight:900,color:'#FCA5A5'}}>{fm(monthExp)}</div></div>
        <div style={{fontSize:20,alignSelf:'center',opacity:.5}}>=</div>
        <div><div style={{fontSize:10,opacity:.6}}>FAIDA</div><div style={{fontSize:22,fontWeight:900,color:monthRev-monthExp>=0?'#86EFAC':'#FCA5A5'}}>{fm(monthRev-monthExp)}</div></div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
      {[
        {icon:'📊',title:'P&L Report',desc:'Mapato vs Matumizi',color:'#0B7A3B',fn:()=>{const byCat={};allExp.filter(e=>(e.date||e.created_at||'').slice(0,7)===ms).forEach(e=>{byCat[e.category||'Nyingine']=(byCat[e.category||'Nyingine']||0)+(+e.amount||0)});pdf('P&L',`<h1>PROFIT & LOSS — ${ms}</h1><h2>MAPATO</h2><table><tr><td><b>Ada ya Wateja</b></td><td style="text-align:right" class="big">${fm(monthRev)}</td></tr></table><h2>MATUMIZI</h2><table>${Object.entries(byCat).map(([c,a])=>`<tr><td>${c}</td><td style="text-align:right;color:#EF4444">${fm(a)}</td></tr>`).join('')}<tr style="background:#FEF2F2"><td><b>JUMLA</b></td><td style="text-align:right;font-weight:900;color:#EF4444">${fm(monthExp)}</td></tr></table><h2>FAIDA</h2><table><tr style="background:${monthRev-monthExp>=0?'#F0FDF4':'#FEF2F2'}"><td><b>NET PROFIT</b></td><td style="text-align:right;font-size:24px;font-weight:900;color:${monthRev-monthExp>=0?'#0B7A3B':'#EF4444'}">${fm(monthRev-monthExp)}</td></tr></table>`)}},
        {icon:'💰',title:'Mapato',desc:'Malipo & Tokens',color:'#3B82F6',fn:()=>{const pm={};usedTk.forEach(t=>{pm[t.assigned_name||'Admin']=(pm[t.assigned_name||'Admin']||0)+price});pdf('Revenue',`<h1>MAPATO</h1><p class="big">${fm(totalRev)}</p><h2>Kwa Mshirika</h2><table><tr><th>Mshirika</th><th>Mapato</th></tr>${Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,a])=>`<tr><td>${n}</td><td>${fm(a)}</td></tr>`).join('')}</table>`)}},
        {icon:'💸',title:'Matumizi',desc:'Gharama za mfumo',color:'#EF4444',fn:()=>{const byCat={};allExp.forEach(e=>{byCat[e.category||'Nyingine']=(byCat[e.category||'Nyingine']||0)+(+e.amount||0)});pdf('Expenses',`<h1>MATUMIZI</h1><p class="big">${fm(totalExp)}</p><h2>Kategoria</h2><table><tr><th>Kategoria</th><th>Kiasi</th></tr>${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=>`<tr><td>${c}</td><td>${fm(a)}</td></tr>`).join('')}</table>`)}},
        {icon:'📋',title:'Bajeti',desc:'Budget Report',color:'#8B5CF6',fn:()=>{pdf('Budget',`<h1>BAJETI — ${ms}</h1><p>Taarifa za bajeti zinapatikana kwenye mfumo</p>`)}},
        {icon:'💳',title:'Madeni',desc:'Marketing Debts',color:'#F59E0B',fn:()=>{pdf('Debts',`<h1>MADENI YA MARKETING</h1><p>Jumla: <span class="big">${fm(totalDebt)}</span></p><table><tr><th>Marketer</th><th>Deni</th><th>Amelipa</th><th>Baki</th><th>Hali</th></tr>${debts.map(d=>`<tr><td>${d.marketer_name}</td><td>${fm(d.amount)}</td><td>${fm(d.paid_amount)}</td><td style="color:#EF4444;font-weight:700">${fm(d.remaining)}</td><td>${d.status}</td></tr>`).join('')}</table>`)}},
      ].map((r,i)=><div key={i} className="card" style={{textAlign:'center',cursor:'pointer',border:`2px solid ${r.color}20`}} onClick={r.fn}>
        <div style={{fontSize:36,marginBottom:4}}>{r.icon}</div>
        <div style={{fontWeight:800,fontSize:14,color:r.color}}>{r.title}</div>
        <div style={{fontSize:11,color:'#64748B',marginBottom:8}}>{r.desc}</div>
        <button style={{padding:'6px 16px',borderRadius:8,border:'none',background:r.color,color:'#fff',fontWeight:700,fontSize:11,cursor:'pointer'}}>📥 PDF</button>
      </div>)}
    </div>
  </div>;
}
