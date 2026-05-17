import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Sel,Btn,Stat,Modal,Badge,Tabs,Empty,EMOJIS,Area} from '../../components/UI';
import {fmtMoney,fmtDate,isToday,isThisWeek,isThisMonth,exportToPDF,exportReceiptPDF,shareWhatsApp,todayStr} from '../../utils/helpers';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
const CL=['#0B7A3B','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

// ===== OFFICE DASHBOARD with Daily Report + Alerts =====
export function OfficeDash({onReceipt}){
  const{user,biz,products,sales,returns,expenses,daysLeft,online,currency,lowStockProducts,lowMarginProducts,autoReorderList,getDailyReport,settings,goalProgress,aiInsights}=useApp();
  const cur=currency||'TZS';const fm=n=>fmtMoney(n,cur);
  
  // Filter sales by period
  const tSales=sales.filter(s=>isToday(s.created_at));
  const wSales=sales.filter(s=>isThisWeek(s.created_at));
  const mSales=sales.filter(s=>isThisMonth(s.created_at));
  
  // Filter returns by SAME period (subtract from sales)
  const tReturns=(returns||[]).filter(r=>isToday(r.created_at));
  const wReturns=(returns||[]).filter(r=>isThisWeek(r.created_at));
  const mReturns=(returns||[]).filter(r=>isThisMonth(r.created_at));
  
  // Helper: calculate profit lost from returns
  const returnProfit=(rs)=>rs.reduce((sum,r)=>sum+((r.items||[]).reduce((s,i)=>{
    const prod=products.find(p=>p.id===i.productId);
    const buyPrice=prod?.buy_price||0;
    return s+i.qty*(i.price-buyPrice)*(i.fraction||1);
  },0)),0);
  
  // Subtract refunds from totals
  const tRefunds=tReturns.reduce((a,r)=>a+(r.refund_amount||0),0);
  const wRefunds=wReturns.reduce((a,r)=>a+(r.refund_amount||0),0);
  const mRefunds=mReturns.reduce((a,r)=>a+(r.refund_amount||0),0);
  
  // Net sales (after returns)
  const tTotal=Math.max(0,tSales.reduce((a,s)=>a+s.total,0)-tRefunds);
  const wTotal=Math.max(0,wSales.reduce((a,s)=>a+s.total,0)-wRefunds);
  const mProfit=Math.max(0,mSales.reduce((a,s)=>a+s.profit,0)-returnProfit(mReturns));
  const mExp=expenses.filter(e=>isThisMonth(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const isOff=user?.role==='office';
  const dayData=useMemo(()=>{const d=[];for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);const ds=dt.toISOString().split('T')[0];const ds2=sales.filter(s=>s.created_at?.startsWith(ds));const drs=(returns||[]).filter(r=>r.created_at?.startsWith(ds));const dayTotal=ds2.reduce((a,s)=>a+s.total,0)-drs.reduce((a,r)=>a+(r.refund_amount||0),0);d.push({day:dt.toLocaleDateString('en',{weekday:'short'}),total:Math.max(0,dayTotal)})}return d},[sales,returns]);
  const prodMap={};sales.forEach(s=>s.items?.forEach(i=>{prodMap[i.name]=(prodMap[i.name]||0)+i.qty}));
  const pieData=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,q])=>({name:n,value:q}));

  // Announcement
  const ann=settings.announcement;

  return <div>
    {ann&&<div style={{background:settings.announcement_type==='warning'?'#FFF7ED':settings.announcement_type==='danger'?'#FEF2F2':'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:'10px 16px',marginBottom:12,fontSize:13,fontWeight:600}}>📢 {ann}</div>}
    {!online&&<div style={{background:'#FEF3C7',borderRadius:10,padding:'8px 16px',marginBottom:12,fontSize:13,fontWeight:600,color:'#92400E'}}>⚡ Offline Mode — mauzo yatahifadhiwa na kusawazishwa baadaye</div>}
    {isOff&&biz&&!biz.token_active&&daysLeft()<=5&&<div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
      <span style={{fontSize:13,fontWeight:600,color:'#92400E'}}>⏳ Siku {daysLeft()} zimebaki</span>
      <Btn v="warning" style={{padding:'6px 14px',fontSize:12}} onClick={()=>alert('Lipa: HALOPESA - Lipa Namba\n25187616\nJina: DUKALANGU')}>Lipa Sasa</Btn>
    </div>}

    <div className="flex-wrap" style={{marginBottom:20}}>
      <Stat icon={IC.cart} label="Mauzo Leo" value={fm(tTotal)} color="#0B7A3B" sub={`${tSales.length} mauzo`}/>
      <Stat icon={IC.chart} label="Wiki" value={fm(wTotal)} color="#3B82F6"/>
      {isOff&&<Stat icon={IC.dollar} label="Faida Mwezi" value={fm(mProfit-mExp)} color={mProfit-mExp>=0?'#F59E0B':'#EF4444'}/>}
      <Stat icon={IC.warn} label="Stock Alert" value={lowStockProducts.length} color="#EF4444" sub={lowMarginProducts.length>0?`${lowMarginProducts.length} margin ndogo`:''}/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📈 Mauzo (Siku 7)</h3>
        <ResponsiveContainer width="100%" height={180}><BarChart data={dayData}><XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>fm(v)}/><Bar dataKey="total" fill="#0B7A3B" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>

      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🏆 Bidhaa Bora</h3>
        {pieData.length?<ResponsiveContainer width="100%" height={180}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value})=>`${name}: ${value}`} style={{fontSize:9}}>{pieData.map((_,i)=><Cell key={i} fill={CL[i%CL.length]}/>)}</Pie></PieChart></ResponsiveContainer>:<Empty icon="📊" text="Uza kuona data"/>}</div>

      {/* PROFIT MARGIN ALERT */}
      {lowMarginProducts.length>0&&<div className="card" style={{borderLeft:'4px solid #F59E0B'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#92400E'}}>⚠️ Faida Ndogo ({lowMarginProducts.length})</h3>
        <div style={{fontSize:11,color:'#64748B',marginBottom:8}}>Bidhaa hizi zina faida chini ya 15% — zinaweza kukuumiza!</div>
        {lowMarginProducts.slice(0,5).map(p=><div key={p.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><span style={{marginRight:6}}>{p.image}</span><span style={{fontWeight:600,fontSize:12}}>{p.name}</span></div>
          <Badge color="#F59E0B">{p.margin}%</Badge>
        </div>)}
      </div>}

      {/* AUTO REORDER LIST */}
      {autoReorderList.length>0&&<div className="card" style={{borderLeft:'4px solid #EF4444'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#B91C1C'}}>📦 Agiza Bidhaa ({autoReorderList.length})</h3>
        <div style={{fontSize:11,color:'#64748B',marginBottom:8}}>Bidhaa hizi zinaisha — hii ni orodha ya kuagiza:</div>
        {autoReorderList.slice(0,6).map(p=><div key={p.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><span style={{marginRight:6}}>{p.image}</span><span style={{fontWeight:600,fontSize:12}}>{p.name}</span><span style={{fontSize:11,color:'#EF4444',marginLeft:6}}>({p.quantity} sasa)</span></div>
          <Badge color="#3B82F6">Agiza: {p.suggestedQty}</Badge>
        </div>)}
      </div>}

      {/* DAILY REPORT */}
      {isOff&&<div className="card" style={{borderLeft:'4px solid #0B7A3B'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#0B7A3B'}}>📊 Ripoti ya Leo</h3>
        {(()=>{const r=getDailyReport();return<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#94A3B8'}}>Mauzo</div><div style={{fontWeight:800,fontSize:16,color:'#0B7A3B'}}>{fm(r.totalSales)}</div></div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#94A3B8'}}>Faida</div><div style={{fontWeight:800,fontSize:16,color:'#3B82F6'}}>{fm(r.totalProfit)}</div></div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#94A3B8'}}>Matumizi</div><div style={{fontWeight:800,fontSize:16,color:'#EF4444'}}>{fm(r.totalExpenses)}</div></div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}><div style={{fontSize:10,color:'#94A3B8'}}>Idadi</div><div style={{fontWeight:800,fontSize:16}}>{r.salesCount} mauzo</div></div>
          </div>
        </>})()}
      </div>}

      {/* PROFIT GOALS PROGRESS */}
      {isOff&&(goalProgress.daily.goal>0||goalProgress.weekly.goal>0||goalProgress.monthly.goal>0)&&<div className="card" style={{borderLeft:'4px solid #8B5CF6'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#8B5CF6'}}>🎯 Malengo ya Faida</h3>
        {[{label:'Leo',data:goalProgress.daily,color:'#0B7A3B'},{label:'Wiki',data:goalProgress.weekly,color:'#3B82F6'},{label:'Mwezi',data:goalProgress.monthly,color:'#8B5CF6'}].filter(g=>g.data.goal>0).map(g=>(
          <div key={g.label} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
              <span style={{fontWeight:600}}>{g.label}: {fm(g.data.current)} / {fm(g.data.goal)}</span>
              <span style={{fontWeight:700,color:g.data.pct>=100?'#22C55E':g.color}}>{g.data.pct}%</span>
            </div>
            <div style={{height:8,background:'#F1F5F9',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${g.data.pct}%`,background:g.data.pct>=100?'#22C55E':g.color,borderRadius:4,transition:'width 0.5s'}}/>
            </div>
            {g.data.pct>=100&&<div style={{fontSize:11,color:'#22C55E',fontWeight:600,marginTop:2}}>🎉 Umefika lengo!</div>}
          </div>
        ))}
      </div>}

      {/* AI SMART INSIGHTS */}
      {isOff&&aiInsights.length>0&&<div className="card" style={{borderLeft:'4px solid #3B82F6'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#3B82F6'}}>🤖 Uchambuzi wa AI</h3>
        {aiInsights.map((ins,i)=>(
          <div key={i} style={{padding:'8px 10px',marginBottom:6,borderRadius:8,background:ins.type==='success'?'#F0FDF4':ins.type==='warning'?'#FFF7ED':ins.type==='danger'?'#FEF2F2':'#EFF6FF',display:'flex',gap:8,alignItems:'flex-start'}}>
            <span style={{fontSize:18}}>{ins.icon}</span>
            <div><div style={{fontWeight:700,fontSize:12,color:ins.type==='success'?'#15803D':ins.type==='warning'?'#92400E':ins.type==='danger'?'#B91C1C':'#1E40AF'}}>{ins.title}</div>
            <div style={{fontSize:11,color:'#64748B',marginTop:2}}>{ins.desc}</div></div>
          </div>
        ))}
      </div>}

      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🕐 Mauzo ya Hivi Karibuni</h3>
        {tSales.slice(0,5).map(s=><div key={s.id} onClick={()=>onReceipt?.(s)} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',cursor:'pointer',display:'flex',justifyContent:'space-between'}}>
          <div><div style={{fontWeight:600,fontSize:12}}>{s.items?.map(i=>i.name).join(', ').slice(0,35)}</div><div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(s.created_at)} • {s.seller_name}</div></div>
          <div style={{fontWeight:700,color:'#0B7A3B',fontSize:13}}>{fm(s.total)}</div>
        </div>)}
        {!tSales.length&&<Empty icon="🛒" text="Hakuna mauzo ya leo"/>}
      </div>
    </div>
  </div>;
}

// ===== POS / SALES =====
export function SalesPage({onDone}){
  const{products,completeSale,creditSale,customers,addCustomer,user,currency,activeBranch}=useApp();
  const cur=currency||'TZS';const fm=n=>fmtMoney(n,cur);
  const[search,setSearch]=useState('');const[cart,setCart]=useState([]);const[discount,setDiscount]=useState(0);const[payMethod,setPayMethod]=useState('cash');const[cashAmt,setCashAmt]=useState('');const[mobileAmt,setMobileAmt]=useState('');const[custName,setCustName]=useState('');
  const[custId,setCustId]=useState('');const[newCustModal,setNewCustModal]=useState(false);const[newCustName,setNewCustName]=useState('');const[newCustPhone,setNewCustPhone]=useState('');
  const[processing,setProcessing]=useState(false);
  const subtotal=cart.reduce((s,c)=>s+c.qty*c.price*(c.fraction||1),0);const total=Math.max(0,subtotal-discount);
  const addToCart=p=>{if(processing)return;const ex=cart.find(c=>c.productId===p.id);if(ex){if(ex.qty>=p.quantity)return alert('Stock haitoshi!');setCart(cart.map(c=>c.productId===p.id?{...c,qty:c.qty+1}:c))}else setCart([...cart,{productId:p.id,name:p.name,price:p.sell_price,buyPrice:p.buy_price,qty:1,fraction:1,fractionLabel:'Nzima',image:p.image}])};
  
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
  const doSale=async()=>{
    if(!cart.length||processing)return;
    // Credit sale requires customer
    if(payMethod==='credit'&&!custId){return alert('Chagua mteja wa deni!')}
    setProcessing(true);
    try{
      let sale;
      if(payMethod==='credit'){
        sale=await creditSale(cart,custId,discount);
      }else{
        let pd=null;if(payMethod==='mix')pd={cash:+cashAmt||0,mobile:+mobileAmt||0};
        sale=await completeSale(cart,discount,payMethod,pd,custId||null,custName);
      }
      if(sale)onDone?.(sale);
      setCart([]);setDiscount(0);setCashAmt('');setMobileAmt('');setCustName('');setCustId('');
    }catch(e){console.error('Sale error:',e)}
    finally{setProcessing(false)}
  };
  const avail=products.filter(p=>p.quantity>0&&p.name?.toLowerCase().includes(search.toLowerCase())&&(!activeBranch||p.branch_id===activeBranch));
  const selCust=customers.find(c=>c.id===custId);

  return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 10px'}}>Chagua Bidhaa</h3>
      <input placeholder="🔍 Tafuta..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:14,marginBottom:10,outline:'none',boxSizing:'border-box',background:'#F8FAFC'}}/>
      <div style={{maxHeight:450,overflowY:'auto'}}>{avail.map(p=><div key={p.id} onClick={()=>addToCart(p)} style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',cursor:processing?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:10,borderRadius:8,opacity:processing?0.5:1}}>
        <span style={{fontSize:28}}>{p.image||'📦'}</span>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{p.name}</div><div style={{fontSize:12,color:'#64748B'}}>{fm(p.sell_price)} • Stock: {p.quantity}</div></div>
        <span style={{color:'#0B7A3B',fontSize:24,fontWeight:700}}>+</span>
      </div>)}{!avail.length&&<Empty icon="📦" text="Hakuna"/>}</div>
    </div>
    <div className="card">
      <h3 style={{fontSize:15,fontWeight:700,margin:'0 0 10px'}}>🛒 Kikapu ({cart.length})</h3>
      {!cart.length?<Empty icon="🛒" text="Bonyeza bidhaa"/>:<>
        <div style={{maxHeight:280,overflowY:'auto'}}>{cart.map((c,i)=><div key={i} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <span style={{fontSize:18}}>{c.image||'📦'}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:12}}>{c.name}</div>
              <div style={{fontSize:10,color:'#64748B'}}>Bei kamili: {fm(c.price)}</div>
            </div>
            <button disabled={processing} onClick={()=>setCart(cart.filter((_,j)=>j!==i))} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:'4px 6px',color:'#EF4444',cursor:'pointer'}}>{IC.del}</button>
          </div>
          
          {/* Fraction selector */}
          <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
            {FRACTIONS.map(f=><button key={f.v} disabled={processing} onClick={()=>updateFraction(i,f.v)} style={{padding:'5px 10px',borderRadius:8,border:c.fraction===f.v?'2px solid #0B7A3B':'1px solid #E2E8F0',background:c.fraction===f.v?'#F0FDF4':'#fff',fontWeight:c.fraction===f.v?700:500,fontSize:11,cursor:'pointer',color:c.fraction===f.v?'#0B7A3B':'#64748B',transition:'all 0.2s'}}>{f.short}</button>)}
          </div>
          
          {/* Quantity controls + Total */}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <button disabled={processing} onClick={()=>{if(c.qty<=1)setCart(cart.filter((_,j)=>j!==i));else setCart(cart.map((x,j)=>j===i?{...x,qty:x.qty-1}:x))}} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:'4px 10px',fontWeight:700,fontSize:14,cursor:'pointer'}}>−</button>
              <span style={{fontWeight:700,minWidth:24,textAlign:'center',fontSize:13}}>{c.qty}</span>
              <button disabled={processing} onClick={()=>{const pr=products.find(p=>p.id===c.productId);if(pr&&c.qty>=pr.quantity)return alert('Stock haitoshi!');setCart(cart.map((x,j)=>j===i?{...x,qty:x.qty+1}:x))}} style={{background:'#F0FDF4',border:'none',borderRadius:6,padding:'4px 10px',color:'#0B7A3B',fontWeight:700,fontSize:14,cursor:'pointer'}}>+</button>
            </div>
            <div style={{flex:1,fontSize:10,color:'#94A3B8',textAlign:'center'}}>
              {c.fraction!==1?<>
                <span>{(c.fraction).toFixed(2)} × {c.qty}</span>
                <br/>
                <span>= <b style={{color:'#0B7A3B'}}>{(c.fraction*c.qty).toFixed(2)}</b></span>
              </>:<span>Idadi: {c.qty}</span>}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800,fontSize:14,color:'#0B7A3B'}}>{fm(c.qty*c.price*(c.fraction||1))}</div>
              {c.fraction!==1&&<div style={{fontSize:9,color:'#94A3B8'}}>{fm(c.price*c.fraction)} × {c.qty}</div>}
            </div>
          </div>
        </div>)}</div>
        <div style={{marginTop:8}}><Input label="Punguzo (TZS)" type="number" value={discount||''} onChange={e=>setDiscount(+e.target.value||0)} style={{background:'#FFF7ED'}}/></div>
        
        {/* Payment Methods - 4 options now */}
        <div style={{marginBottom:8}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Malipo</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {[{v:'cash',l:'💵 Taslimu',c:'#22C55E'},{v:'mobile',l:'📱 M-Pesa',c:'#3B82F6'},{v:'mix',l:'🔀 Mix',c:'#F59E0B'},{v:'credit',l:'📋 Deni',c:'#EF4444'}].map(m=>
              <button key={m.v} onClick={()=>!processing&&setPayMethod(m.v)} style={{padding:'10px 4px',borderRadius:10,border:payMethod===m.v?`2px solid ${m.c}`:'1.5px solid #E2E8F0',background:payMethod===m.v?`${m.c}10`:'#fff',fontWeight:600,fontSize:12,color:payMethod===m.v?m.c:'#64748B',cursor:'pointer'}}>{m.l}</button>
            )}
          </div>
        </div>

        {payMethod==='mix'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Input label="Taslimu" type="number" value={cashAmt} onChange={e=>setCashAmt(e.target.value)}/><Input label="M-Pesa" type="number" value={mobileAmt} onChange={e=>setMobileAmt(e.target.value)}/></div>}
        
        {/* Credit/Deni - Customer Selection */}
        {payMethod==='credit'?<div style={{background:'#FEF2F2',borderRadius:10,padding:10,marginBottom:8,border:'1px solid #FECACA'}}>
          <label style={{display:'block',fontSize:12,fontWeight:700,color:'#B91C1C',marginBottom:6}}>📋 Mteja wa Deni (lazima)</label>
          <select value={custId} onChange={e=>setCustId(e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #FCA5A5',fontSize:13,outline:'none',background:'#fff',marginBottom:6,boxSizing:'border-box'}}>
            <option value="">-- Chagua Mteja --</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name} {(c.credit_balance||0)>0?`(Deni: ${fm(c.credit_balance)})`:''}</option>)}
          </select>
          {selCust&&<div style={{fontSize:12,color:'#B91C1C',marginBottom:4}}>Deni la sasa: <b>{fm(selCust.credit_balance||0)}</b> → Deni jipya: <b>{fm((selCust.credit_balance||0)+total)}</b></div>}
          <button onClick={()=>setNewCustModal(true)} style={{fontSize:11,color:'#3B82F6',background:'none',border:'none',cursor:'pointer',fontWeight:600,textDecoration:'underline'}}>+ Sajili Mteja Mpya</button>
        </div>
        :<Input label="Mteja (si lazima)" value={custName} onChange={e=>setCustName(e.target.value)} placeholder="Jina"/>}

        <div style={{background:'#F8FAFC',borderRadius:10,padding:10,marginTop:4}}>
          {discount>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#F59E0B'}}><span>Punguzo:</span><span>-{fm(discount)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:18,color:payMethod==='credit'?'#EF4444':'#0B7A3B',paddingTop:6,borderTop:discount?'2px solid #E2E8F0':'none'}}><span>{payMethod==='credit'?'DENI':'JUMLA'}</span><span>{fm(total)}</span></div>
        </div>
        <button onClick={doSale} disabled={processing} style={{width:'100%',padding:16,background:processing?'#86EFAC':payMethod==='credit'?'#EF4444':'#0B7A3B',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:16,marginTop:10,cursor:processing?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:processing?0.7:1,transition:'all 0.2s'}}>
          {processing?<><span style={{display:'inline-block',width:20,height:20,border:'3px solid rgba(255,255,255,0.3)',borderTop:'3px solid #fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></span> Inatuma...</>:payMethod==='credit'?<>{IC.ok} Uza kwa Deni</>:<>{IC.ok} Kamilisha Mauzo</>}
        </button>
        {processing&&<div style={{textAlign:'center',fontSize:12,color:'#64748B',marginTop:8}}>Subiri... mauzo yanashughulikiwa</div>}
      </>}
    </div>

    {/* Quick Add Customer Modal */}
    <Modal open={newCustModal} onClose={()=>setNewCustModal(false)} title="Sajili Mteja Mpya">
      <Input label="Jina *" value={newCustName} onChange={e=>setNewCustName(e.target.value)} placeholder="Jina kamili"/>
      <Input label="Simu" value={newCustPhone} onChange={e=>setNewCustPhone(e.target.value)} placeholder="07XXXXXXXX"/>
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
  const{products,addProduct,updateProduct,deleteProduct,bizId,activeBranch}=useApp();
  const myProds=products.filter(p=>p.business_id===bizId&&(!activeBranch||p.branch_id===activeBranch));
  const[search,setSearch]=useState('');const[modal,setModal]=useState({open:false,data:null});
  const filtered=myProds.filter(p=>p.name?.toLowerCase().includes(search.toLowerCase()));
  const ProdForm=({init={},onSave})=>{
    const[f,setF]=useState({name:init.name||'',unit:init.unit||'Piece',category:init.category||'Vyakula',image:init.image||'📦',buy_price:init.buy_price||'',sell_price:init.sell_price||'',quantity:init.quantity||'',min_stock:init.min_stock||5,expiry_date:init.expiry_date||''});
    const margin=f.buy_price&&f.sell_price?((f.sell_price-f.buy_price)/f.sell_price*100).toFixed(1):null;
    return <div>
      <div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Emoji</label><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{EMOJIS.map(e=><button key={e} onClick={()=>setF({...f,image:e})} style={{fontSize:20,padding:5,borderRadius:8,border:f.image===e?'2px solid #0B7A3B':'1px solid #E2E8F0',background:f.image===e?'#F0FDF4':'#fff',cursor:'pointer'}}>{e}</button>)}</div></div>
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
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Input label="Bei Kununua" type="number" value={f.buy_price} onChange={e=>setF({...f,buy_price:e.target.value})}/>
        <Input label="Bei Kuuza" type="number" value={f.sell_price} onChange={e=>setF({...f,sell_price:e.target.value})}/>
      </div>
      {/* PROFIT MARGIN ALERT */}
      {margin!==null&&<div style={{background:margin<15?'#FEF2F2':margin<25?'#FFF7ED':'#F0FDF4',borderRadius:8,padding:'6px 10px',marginBottom:10,fontSize:12,fontWeight:600,color:margin<15?'#B91C1C':margin<25?'#92400E':'#15803D'}}>
        Faida: {margin}% {margin<15?'⚠️ Ndogo sana!':margin<25?'⚡ Wastani':'✅ Nzuri'}
      </div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Input label="Kiasi" type="number" value={f.quantity} onChange={e=>setF({...f,quantity:e.target.value})}/>
        <Input label="Min Stock" type="number" value={f.min_stock} onChange={e=>setF({...f,min_stock:e.target.value})}/>
      </div>
      <Input label="Expiry Date" type="date" value={f.expiry_date} onChange={e=>setF({...f,expiry_date:e.target.value})}/>
      <Btn onClick={()=>{if(!f.name||!f.buy_price||!f.sell_price)return alert('Jaza!');onSave({...f,buy_price:+f.buy_price,sell_price:+f.sell_price,quantity:+f.quantity||0,min_stock:+f.min_stock||5,expiry_date:f.expiry_date||null})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
    </div>;
  };
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <div style={{position:'relative',flex:'1 1 200px',maxWidth:300}}><span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8'}}>{IC.find}</span><input placeholder="Tafuta..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 10px 10px 36px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box'}}/></div>
      <Btn onClick={()=>setModal({open:true,data:null})}>{IC.plus} Ongeza</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
      {filtered.map(p=>{const isExp=p.expiry_date&&new Date(p.expiry_date)<new Date();const margin=p.buy_price&&p.sell_price?((p.sell_price-p.buy_price)/p.sell_price*100):100;
        return <div key={p.id} style={{background:'#fff',borderRadius:14,padding:14,boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:isExp?'2px solid #EF4444':p.quantity<=p.min_stock?`2px solid ${p.quantity===0?'#EF4444':'#F59E0B'}`:'1px solid #E2E8F0'}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:32}}>{p.image||'📦'}</span><div style={{display:'flex',gap:4}}>
          <button onClick={()=>setModal({open:true,data:p})} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:5,color:'#475569',cursor:'pointer'}}>{IC.gear}</button>
          <button onClick={()=>window.confirm(`Futa "${p.name}"?`)&&deleteProduct(p.id)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:5,color:'#EF4444',cursor:'pointer'}}>{IC.del}</button>
        </div></div>
        <div style={{fontWeight:700,fontSize:14,marginTop:6}}>{p.name}</div>
        <div style={{fontSize:12,color:'#64748B',marginTop:2}}>{p.category} • {p.unit}</div>
        {isExp&&<Badge color="#EF4444">EXPIRED</Badge>}
        {margin<15&&!isExp&&<Badge color="#F59E0B">Faida {margin.toFixed(0)}%</Badge>}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
          <div><div style={{fontSize:10,color:'#94A3B8'}}>Bei Kuuza</div><div style={{fontWeight:700,color:'#0B7A3B',fontSize:14}}>TZS {p.sell_price?.toLocaleString()}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'#94A3B8'}}>Stock</div><div style={{fontWeight:700,fontSize:14,color:p.quantity===0?'#EF4444':p.quantity<=p.min_stock?'#F59E0B':'#1E293B'}}>{p.quantity}</div></div>
        </div>
      </div>})}
    </div>
    {!filtered.length&&<Empty text={search?'Hakuna':'Ongeza bidhaa'}/>}
    <Modal open={modal.open} onClose={()=>setModal({open:false})} title={modal.data?'Hariri':'Ongeza Bidhaa'}>
      <ProdForm init={modal.data||{}} onSave={pr=>{modal.data?updateProduct(modal.data.id,pr):addProduct(pr);setModal({open:false})}}/>
    </Modal>
  </div>;
}

// ===== RETURN/REFUND =====
export function ReturnsPage(){
  const{sales,returns,processReturn,customers,currency}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[modal,setModal]=useState(false);const[saleId,setSaleId]=useState('');const[reason,setReason]=useState('');const[retItems,setRetItems]=useState([]);
  const sale=sales.find(s=>s.id===saleId);
  const cust=sale?.customer_id?customers.find(c=>c.id===sale.customer_id):null;

  const handleSelectSale=(sid)=>{setSaleId(sid);const s=sales.find(x=>x.id===sid);if(s)setRetItems((s.items||[]).map(i=>({...i,returnQty:0})))};
  
  // Calculate total refund considering fractions
  const totalRefund=retItems.reduce((s,i)=>s+(i.returnQty||0)*i.price*(i.fraction||1),0);
  
  const doReturn=async()=>{
    if(!saleId||!reason)return alert('Chagua mauzo na weka sababu!');
    const items=retItems.filter(i=>i.returnQty>0).map(i=>({productId:i.productId,name:i.name,price:i.price,qty:i.returnQty,fraction:i.fraction||1,fractionLabel:i.fractionLabel}));
    if(!items.length)return alert('Chagua bidhaa za kurudisha!');
    await processReturn(saleId,items,reason);
    const isCredit=sale?.payment_method==='credit';
    alert(`✅ Bidhaa zimerudishwa!\n\n📦 Stock imeongezeka kwa idadi sahihi\n💰 Rejesho: TZS ${totalRefund.toLocaleString()}${isCredit?'\n💳 Deni la mteja limepunguzwa':''}`);
    setModal(false);setSaleId('');setReason('');setRetItems([]);
  };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <div>
        <h3 style={{fontSize:18,fontWeight:800,margin:0,color:'#0B7A3B'}}>↩️ Bidhaa Zilizorudishwa</h3>
        <p style={{fontSize:12,color:'#64748B',margin:'4px 0 0'}}>Stock inarudi automatic, deni linapunguzwa kama bidhaa ilikopwa</p>
      </div>
      <Btn onClick={()=>setModal(true)}>{IC.refresh} Rudisha Bidhaa</Btn>
    </div>
    
    {/* Stats */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14,textAlign:'center'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>JUMLA</div>
        <div style={{fontSize:22,fontWeight:900,color:'#0B7A3B'}}>{returns.length}</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>JUMLA YA REJESHO</div>
        <div style={{fontSize:18,fontWeight:900,color:'#EF4444'}}>{fm(returns.reduce((s,r)=>s+(r.refund_amount||0),0))}</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>YA MADENI</div>
        <div style={{fontSize:22,fontWeight:900,color:'#F59E0B'}}>{returns.filter(r=>r.was_credit).length}</div>
      </div>
    </div>
    
    <div className="card">
      {returns.length?returns.map(r=><div key={r.id} style={{padding:'12px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontWeight:700,fontSize:13,color:'#1E293B'}}>
              {r.items?.map(i=>{
                const f=i.fraction&&i.fraction!==1?` (${i.fractionLabel||i.fraction})`:'';
                return `${i.name}${f} x${i.qty}`;
              }).join(', ')}
            </div>
            <div style={{fontSize:11,color:'#64748B',marginTop:2}}>📝 {r.reason}</div>
            <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>📅 {fmtDate(r.created_at)} {r.was_credit&&<span style={{background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:6,marginLeft:6,fontWeight:700}}>💳 ILIKOPWA</span>}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'#94A3B8'}}>Rejesho:</div>
            <div style={{fontWeight:900,color:'#EF4444',fontSize:15}}>{fm(r.refund_amount)}</div>
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
        {sale.payment_method==='credit'&&cust&&<div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#92400E'}}>
          💳 <b>Mauzo ya Deni:</b> Mteja {cust.name} alichukua bidhaa kwa deni la TZS {(sale.total||0).toLocaleString()}.<br/>
          <b>Deni lake litapunguzwa automatic</b> kulingana na thamani ya bidhaa zinazorudishwa.
        </div>}
        
        <div style={{background:'#F8FAFC',borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0B7A3B',marginBottom:8}}>Chagua Bidhaa za Kurudisha:</div>
          {retItems.map((item,i)=>{
            const f=item.fraction&&item.fraction!==1?` (${item.fractionLabel||item.fraction})`:'';
            const itemTotal=(item.returnQty||0)*item.price*(item.fraction||1);
            return <div key={i} style={{padding:'10px',background:'#fff',borderRadius:8,marginBottom:6,border:item.returnQty>0?'1.5px solid #BBF7D0':'1px solid #E2E8F0'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontWeight:700,fontSize:13}}>{item.name}{f}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>Alinunua: <b>{item.qty}</b> • Bei: <b>{fm(item.price*(item.fraction||1))}</b></div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:'#475569',fontWeight:600}}>Rudisha:</span>
                  <button onClick={()=>setRetItems(retItems.map((x,j)=>j===i?{...x,returnQty:Math.max(0,(x.returnQty||0)-1)}:x))} style={{width:28,height:28,borderRadius:6,border:'none',background:'#F1F5F9',fontWeight:700,fontSize:14,cursor:'pointer'}}>−</button>
                  <input type="number" min="0" max={item.qty} value={item.returnQty||0} onChange={e=>setRetItems(retItems.map((x,j)=>j===i?{...x,returnQty:Math.min(+e.target.value||0,item.qty)}:x))} style={{width:50,padding:'4px 6px',borderRadius:6,border:'1px solid #E2E8F0',textAlign:'center',fontWeight:700}}/>
                  <button onClick={()=>setRetItems(retItems.map((x,j)=>j===i?{...x,returnQty:Math.min((x.returnQty||0)+1,item.qty)}:x))} style={{width:28,height:28,borderRadius:6,border:'none',background:'#F0FDF4',color:'#0B7A3B',fontWeight:700,fontSize:14,cursor:'pointer'}}>+</button>
                  {item.returnQty>0&&<div style={{fontWeight:800,color:'#EF4444',fontSize:13,minWidth:80,textAlign:'right'}}>−{fm(itemTotal)}</div>}
                </div>
              </div>
            </div>;
          })}
        </div>
        
        {totalRefund>0&&<div style={{background:'#FEF2F2',border:'1.5px solid #FCA5A5',borderRadius:10,padding:'12px 16px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:700,color:'#991B1B'}}>💰 JUMLA YA REJESHO:</div>
          <div style={{fontSize:20,fontWeight:900,color:'#EF4444'}}>{fm(totalRefund)}</div>
        </div>}
        
        <Input label="Sababu ya Kurudisha" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Mf: Bidhaa imeharibika, hakipendi, n.k."/>
        <Btn onClick={doReturn} v="danger" style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.refresh} Kamilisha Kurudisha</Btn>
      </>}
    </Modal>
  </div>;
}

// ===== REPORTS =====
export function ReportsPage({onReceipt}){
  const{sales,returns,products,expenses,currency}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[tab,setTab]=useState('day');
  
  // Custom date range
  const today=new Date().toISOString().slice(0,10);
  const monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const[customFrom,setCustomFrom]=useState(monthStart);
  const[customTo,setCustomTo]=useState(today);
  
  // Filter function based on selected tab
  const filterByDate=(dateStr)=>{
    if(!dateStr)return false;
    const d=new Date(dateStr);
    if(tab==='day')return isToday(dateStr);
    if(tab==='week')return isThisWeek(dateStr);
    if(tab==='month')return isThisMonth(dateStr);
    if(tab==='custom'){
      if(!customFrom||!customTo)return false;
      const from=new Date(customFrom+'T00:00:00');
      const to=new Date(customTo+'T23:59:59');
      return d>=from&&d<=to;
    }
    return false;
  };
  
  // ===== MONTHLY STATEMENTS — Past months breakdown =====
  const monthlyStats=React.useMemo(()=>{
    const map={};
    sales.forEach(s=>{
      const ym=s.created_at?.slice(0,7);
      if(!ym)return;
      if(!map[ym])map[ym]={total:0,profit:0,count:0,refunds:0,refundProfit:0};
      map[ym].total+=s.total||0;
      map[ym].profit+=s.profit||0;
      map[ym].count++;
    });
    (returns||[]).forEach(r=>{
      const ym=r.created_at?.slice(0,7);
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
  
  // Gross sales (before returns)
  const grossTotal=fSales.reduce((a,s)=>a+s.total,0);
  const grossProfit=fSales.reduce((a,s)=>a+s.profit,0);
  
  // Refund amount
  const refundTotal=fReturns.reduce((a,r)=>a+(r.refund_amount||0),0);
  
  // Profit lost from returns
  const refundProfit=fReturns.reduce((sum,r)=>sum+((r.items||[]).reduce((s,i)=>{
    const prod=products.find(p=>p.id===i.productId);
    const buyPrice=prod?.buy_price||0;
    return s+i.qty*(i.price-buyPrice)*(i.fraction||1);
  },0)),0);
  
  // Net (after returns)
  const fTotal=Math.max(0,grossTotal-refundTotal);
  const fProfit=Math.max(0,grossProfit-refundProfit);
  
  const fExp=expenses.filter(e=>filterByDate(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const staffMap={};fSales.forEach(s=>{const n=s.seller_name||'?';staffMap[n]=(staffMap[n]||0)+s.total});const staffData=Object.entries(staffMap).map(([n,t])=>({name:n,total:t}));
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
    setCustomFrom(from.toISOString().slice(0,10));
    setCustomTo(to.toISOString().slice(0,10));
  };
  
  // Period label
  const periodLabel=tab==='day'?'Leo':tab==='week'?'Wiki Hii':tab==='month'?'Mwezi Huu':tab==='custom'?`${customFrom} → ${customTo}`:tab==='history'?'Mahesabu ya Nyuma':'';
  
  // Export
  const doExport=()=>{
    const rows=fSales.map(s=>[fmtDate(s.created_at),s.items?.map(i=>i.name).join(', ').slice(0,30),s.seller_name||'-',s.payment_method,s.total.toLocaleString()]);
    exportToPDF(`Ripoti — ${periodLabel}`,['Tarehe','Bidhaa','Muuzaji','Malipo','Jumla'],rows,`ripoti-${tab}-${Date.now()}.pdf`);
  };
  
  // Export monthly statement
  const exportMonthlyStatement=(month)=>{
    const ms=sales.filter(s=>s.created_at?.startsWith(month.ym));
    const rows=ms.map(s=>[fmtDate(s.created_at),s.items?.map(i=>i.name).join(', ').slice(0,30),s.seller_name||'-',s.payment_method,s.total.toLocaleString()]);
    rows.push(['','','','JUMLA',month.total.toLocaleString()]);
    rows.push(['','','','REJESHO',`-${month.refunds.toLocaleString()}`]);
    rows.push(['','','','HALISI',month.netSales.toLocaleString()]);
    rows.push(['','','','FAIDA',month.netProfit.toLocaleString()]);
    exportToPDF(`Statement — ${month.label}`,['Tarehe','Bidhaa','Muuzaji','Malipo','Jumla'],rows,`statement-${month.ym}.pdf`);
  };

  return <div>
    {/* HEADER */}
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>📊 Ripoti za Mauzo</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Angalia mauzo ya leo, wiki, mwezi, au chagua tarehe maalum</p>
    </div>
    
    <Tabs tabs={[
      {id:'day',label:'📅 Leo'},
      {id:'week',label:'🗓️ Wiki'},
      {id:'month',label:'📆 Mwezi Huu'},
      {id:'custom',label:'🎯 Tarehe Maalum'},
      {id:'history',label:'📚 Mahesabu ya Nyuma'},
    ]} active={tab} onChange={setTab}/>
    
    {/* CUSTOM DATE RANGE PICKER */}
    {tab==='custom'&&<div style={{background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',border:'1px solid #BFDBFE',borderRadius:14,padding:18,marginBottom:16}}>
      <div style={{fontWeight:800,fontSize:14,color:'#1E40AF',marginBottom:12}}>🎯 Chagua Tarehe</div>
      
      {/* Quick range buttons */}
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
        {[
          {id:'thisMonth',l:'Mwezi Huu'},
          {id:'lastMonth',l:'Mwezi Uliopita'},
          {id:'last3Months',l:'Miezi 3 Iliyopita'},
          {id:'thisYear',l:'Mwaka Huu'},
          {id:'lastYear',l:'Mwaka Uliopita'},
        ].map(r=><button key={r.id} onClick={()=>setQuickRange(r.id)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #BFDBFE',background:'#fff',color:'#1E40AF',fontWeight:700,fontSize:11,cursor:'pointer'}}>{r.l}</button>)}
      </div>
      
      {/* Manual date pickers */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'#1E40AF',display:'block',marginBottom:4}}>Kuanzia Tarehe:</label>
          <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #BFDBFE',fontSize:13,boxSizing:'border-box'}}/>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:'#1E40AF',display:'block',marginBottom:4}}>Mpaka Tarehe:</label>
          <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #BFDBFE',fontSize:13,boxSizing:'border-box'}}/>
        </div>
      </div>
      <div style={{marginTop:10,fontSize:12,color:'#1E40AF'}}>
        📅 Statement: <b>{new Date(customFrom).toLocaleDateString('sw-TZ')}</b> mpaka <b>{new Date(customTo).toLocaleDateString('sw-TZ')}</b>
      </div>
    </div>}
    
    {/* MONTHLY HISTORY VIEW */}
    {tab==='history'&&<div>
      <div style={{background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)',border:'1px solid #DDD6FE',borderRadius:14,padding:14,marginBottom:14}}>
        <div style={{fontSize:13,color:'#5B21B6',display:'flex',gap:8,alignItems:'flex-start'}}>
          <span style={{fontSize:18}}>📚</span>
          <span><b>Mahesabu ya Nyuma</b> — Kila mwezi una mahesabu yake. Bofya mwezi wowote kuona maelezo kamili au kupakua PDF.</span>
        </div>
      </div>
      
      {monthlyStats.length?<div style={{display:'grid',gap:10}}>
        {monthlyStats.map((m,i)=>{
          const isCurrent=m.ym===new Date().toISOString().slice(0,7);
          return <div key={m.ym} className="card" style={{padding:18,border:isCurrent?'2px solid #0B7A3B':'1px solid #E2E8F0',background:isCurrent?'linear-gradient(135deg,#F0FDF4,#FFFFFF)':'#fff',transition:'all 0.3s'}} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:48,height:48,background:isCurrent?'linear-gradient(135deg,#0B7A3B,#065F2E)':'linear-gradient(135deg,#94A3B8,#64748B)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:20}}>📅</div>
                <div>
                  <div style={{fontWeight:900,fontSize:16,color:'#1E293B'}}>{m.label}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>{m.count} mauzo {isCurrent&&<span style={{background:'#DCFCE7',color:'#15803D',padding:'2px 8px',borderRadius:6,marginLeft:6,fontWeight:700,fontSize:9}}>SASA</span>}</div>
                </div>
              </div>
              <button onClick={()=>exportMonthlyStatement(m)} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid #0B7A3B',background:'#fff',color:'#0B7A3B',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                📄 Pakua PDF
              </button>
            </div>
            
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,paddingTop:12,borderTop:'1px solid #F1F5F9'}}>
              <div>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>MAUZO YOTE</div>
                <div style={{fontSize:16,fontWeight:900,color:'#0B7A3B'}}>{fm(m.total)}</div>
              </div>
              {m.refunds>0&&<div>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>YAMERUDISHWA</div>
                <div style={{fontSize:14,fontWeight:900,color:'#EF4444'}}>−{fm(m.refunds)}</div>
              </div>}
              <div>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>MAUZO HALISI</div>
                <div style={{fontSize:16,fontWeight:900,color:'#22C55E'}}>{fm(m.netSales)}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>FAIDA</div>
                <div style={{fontSize:16,fontWeight:900,color:'#3B82F6'}}>{fm(m.netProfit)}</div>
              </div>
            </div>
          </div>;
        })}
      </div>:<Empty icon="📚" text="Hakuna mauzo ya zamani bado"/>}
    </div>}
    
    {/* MAIN STATS — only show for day/week/month/custom */}
    {tab!=='history'&&<>
    <div style={{background:tab==='custom'?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#fff',borderRadius:16,padding:tab==='custom'?'16px 20px':0,marginBottom:tab==='custom'?14:0,color:tab==='custom'?'#fff':'inherit'}}>
      {tab==='custom'&&<div style={{fontSize:11,fontWeight:700,opacity:0.9,letterSpacing:1,marginBottom:8}}>📊 STATEMENT YA TAREHE MAALUM</div>}
      {tab==='custom'&&<div style={{fontSize:14,fontWeight:700,marginBottom:14}}>
        Kuanzia: <b>{new Date(customFrom).toLocaleDateString('sw-TZ')}</b> — Mpaka: <b>{new Date(customTo).toLocaleDateString('sw-TZ')}</b>
      </div>}
    </div>
    
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.cart} label="Mauzo (Halisi)" value={fm(fTotal)} color="#0B7A3B" sub={refundTotal>0?`Yamerudishwa: ${fm(refundTotal)}`:`${fSales.length} mauzo`}/>
      <Stat icon={IC.chart} label="Faida" value={fm(fProfit)} color="#3B82F6" sub={refundProfit>0?`Imepunguzwa: ${fm(refundProfit)}`:null}/>
      <Stat icon={IC.wallet} label="Matumizi" value={fm(fExp)} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Halisi" value={fm(fProfit-fExp)} color={fProfit-fExp>=0?'#F59E0B':'#EF4444'}/>
    </div>
    
    {/* Show breakdown if there are returns */}
    {refundTotal>0&&<div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'14px 18px',marginBottom:16}}>
      <div style={{fontWeight:800,fontSize:13,color:'#9A3412',marginBottom:8}}>📊 Mchanganuo wa Mauzo:</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,fontSize:12}}>
        <div>
          <div style={{color:'#7C2D12',fontWeight:600}}>Mauzo Yaliyofanyika</div>
          <div style={{fontWeight:900,color:'#0B7A3B',fontSize:15}}>{fm(grossTotal)}</div>
        </div>
        <div>
          <div style={{color:'#7C2D12',fontWeight:600}}>− Yamerudishwa</div>
          <div style={{fontWeight:900,color:'#EF4444',fontSize:15}}>−{fm(refundTotal)}</div>
        </div>
        <div>
          <div style={{color:'#7C2D12',fontWeight:600}}>= Mauzo Halisi</div>
          <div style={{fontWeight:900,color:'#9A3412',fontSize:15}}>{fm(fTotal)}</div>
        </div>
        <div>
          <div style={{color:'#7C2D12',fontWeight:600}}>Idadi Rudishwa</div>
          <div style={{fontWeight:900,color:'#9A3412',fontSize:15}}>{fReturns.length}</div>
        </div>
      </div>
    </div>}
    <div style={{marginBottom:12}}><Btn v="outline" onClick={doExport}>{IC.dl} PDF</Btn></div>
    
    {/* ===== BIDHAA ZILIZOUZWA — Complete List with Stock ===== */}
    {productsSold.length>0&&<div className="card" style={{marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h3 style={{fontSize:16,fontWeight:800,margin:0,color:'#0B7A3B'}}>📦 Bidhaa Zilizouzwa ({productsSold.length})</h3>
        <button onClick={exportProductsList} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid #0B7A3B',background:'#fff',color:'#0B7A3B',fontWeight:700,fontSize:12,cursor:'pointer'}}>📄 Pakua PDF</button>
      </div>
      
      {/* Quick stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,marginBottom:14,padding:12,background:'#F0FDF4',borderRadius:10,border:'1px solid #BBF7D0'}}>
        <div><div style={{fontSize:10,color:'#15803D',fontWeight:600}}>AINA ZA BIDHAA</div><div style={{fontSize:18,fontWeight:900,color:'#0B7A3B'}}>{productsSold.length}</div></div>
        <div><div style={{fontSize:10,color:'#15803D',fontWeight:600}}>JUMLA ZILIZOUZWA</div><div style={{fontSize:18,fontWeight:900,color:'#0B7A3B'}}>{productsSold.reduce((s,p)=>s+p.netSold,0).toFixed(1)}</div></div>
        <div><div style={{fontSize:10,color:'#15803D',fontWeight:600}}>STOCK NDOGO</div><div style={{fontSize:18,fontWeight:900,color:'#F59E0B'}}>{productsSold.filter(p=>p.stockRemaining<=p.minStock&&p.stockRemaining>0).length}</div></div>
        <div><div style={{fontSize:10,color:'#15803D',fontWeight:600}}>HAZIPO STOCK</div><div style={{fontSize:18,fontWeight:900,color:'#EF4444'}}>{productsSold.filter(p=>p.stockRemaining<=0).length}</div></div>
      </div>
      
      {/* Table header */}
      <div style={{display:'grid',gridTemplateColumns:'36px 1fr 90px 100px 100px',gap:6,padding:'8px',background:'#0B7A3B',color:'#fff',borderRadius:6,fontSize:10,fontWeight:800,textTransform:'uppercase',marginBottom:4}}>
        <div>#</div><div>Bidhaa</div>
        <div style={{textAlign:'right'}}>Zilizouzwa</div>
        <div style={{textAlign:'right'}}>Mapato</div>
        <div style={{textAlign:'right'}}>Stock Imebaki</div>
      </div>
      
      {/* Products list */}
      <div style={{maxHeight:500,overflowY:'auto'}}>
        {productsSold.map((p,i)=>{
          const stockColor=p.stockRemaining<=0?'#EF4444':p.stockRemaining<=p.minStock?'#F59E0B':'#22C55E';
          const stockIcon=p.stockRemaining<=0?'🚫':p.stockRemaining<=p.minStock?'⚠️':'✅';
          return <div key={p.id} style={{display:'grid',gridTemplateColumns:'36px 1fr 90px 100px 100px',gap:6,padding:'10px 6px',borderBottom:'1px solid #F1F5F9',alignItems:'center',background:i%2===0?'#fff':'#F8FAFC'}}>
            <div style={{width:24,height:24,borderRadius:5,background:i<3?'#FEF3C7':'#F1F5F9',color:i<3?'#92400E':'#64748B',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11}}>{i+1}</div>
            <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
              <span style={{fontSize:18}}>{p.image}</span>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:9,color:'#94A3B8'}}>{p.category} • {p.salesCount} mauzo{p.returned>0&&<span style={{color:'#EF4444'}}> • ↩️ {p.returned.toFixed(1)}</span>}</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:13,color:'#0B7A3B'}}>{p.netSold.toFixed(1)}</div>
              <div style={{fontSize:9,color:'#94A3B8'}}>{p.unit}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800,fontSize:12,color:'#22C55E'}}>{fm(p.revenue)}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:13,color:stockColor}}>{stockIcon} {p.stockRemaining.toFixed(1)}</div>
              <div style={{fontSize:9,color:'#94A3B8'}}>{p.unit}</div>
            </div>
          </div>;
        })}
      </div>
    </div>}
    
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🏆 Bidhaa Bora</h3>
        {topProds.map(([n,q],i)=><div key={n} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid #F1F5F9'}}>
          <span style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,background:i===0?'#F0FDF4':'#F1F5F9',color:i===0?'#0B7A3B':'#64748B'}}>{i+1}</span>
          <div style={{flex:1,fontWeight:600,fontSize:12}}>{n}</div><span style={{fontWeight:700,color:'#0B7A3B'}}>{q}</span>
        </div>)}{!topProds.length&&<Empty text="Hakuna"/>}</div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>👥 Kwa Mfanyakazi</h3>
        {staffData.length?<ResponsiveContainer width="100%" height={160}><BarChart data={staffData} layout="vertical"><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fontSize:11}} width={70}/><Tooltip formatter={v=>fm(v)}/><Bar dataKey="total" fill="#3B82F6" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>:<Empty text="Hakuna"/>}</div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>Mauzo ({fSales.length})</h3>
        <div style={{maxHeight:280,overflowY:'auto'}}>{fSales.map(s=><div key={s.id} onClick={()=>onReceipt?.(s)} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',cursor:'pointer',display:'flex',justifyContent:'space-between'}}>
          <div><div style={{fontSize:12,fontWeight:600}}>{s.items?.map(i=>i.name).join(', ').slice(0,30)}</div><div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(s.created_at)}</div></div>
          <div style={{fontWeight:700,color:'#0B7A3B',fontSize:12}}>{fm(s.total)}</div>
        </div>)}</div></div>
    </div>
    </>}
  </div>;
}

// ===== EXPENSES =====
export function ExpensesPage(){
  const{expenses,addExpense,currency}=useApp();const fm=n=>fmtMoney(n,currency||'TZS');
  const total=expenses.reduce((a,e)=>a+(e.amount||0),0);const mExp=expenses.filter(e=>isThisMonth(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const[f,setF]=useState({category:'kodi',description:'',amount:'',is_recurring:false,recurring_interval:'monthly'});
  const CATS=[{value:'kodi',label:'Kodi'},{value:'umeme',label:'Umeme'},{value:'maji',label:'Maji'},{value:'mishahara',label:'Mishahara'},{value:'usafiri',label:'Usafiri'},{value:'kodi_nyumba',label:'Rent / Pango'},{value:'taka',label:'Taka'},{value:'ulinzi',label:'Ulinzi'},{value:'chakula',label:'Chakula'},{value:'vifungashio',label:'Vifungashio'},{value:'mafuta',label:'Mafuta'},{value:'madawa',label:'Madawa'},{value:'posho',label:'Posho'},{value:'kodi_serikali',label:'Kodi ya Serikali'},{value:'bima',label:'Bima'},{value:'mawasiliano',label:'Mawasiliano'},{value:'matangazo',label:'Matangazo / Marketing'},{value:'matengenezo',label:'Matengenezo'},{value:'vifaa',label:'Vifaa vya Duka'},{value:'usafi',label:'Usafi'},{value:'internet',label:'Internet'},{value:'nyingine',label:'Nyingine'}];
  const catMap={};expenses.forEach(e=>{catMap[e.category]=(catMap[e.category]||0)+(e.amount||0)});const pieData=Object.entries(catMap).map(([n,v])=>({name:n,value:v}));
  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}><Stat icon={IC.wallet} label="Jumla" value={fm(total)} color="#EF4444"/><Stat icon={IC.wallet} label="Mwezi" value={fm(mExp)} color="#F59E0B"/></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>Ongeza</h3>
        <Sel label="Aina" value={f.category} onChange={e=>setF({...f,category:e.target.value})} options={CATS}/>
        <Input label="Maelezo" value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Umeme Aprili"/>
        <Input label="Kiasi" type="number" value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><input type="checkbox" checked={f.is_recurring} onChange={e=>setF({...f,is_recurring:e.target.checked})} id="rec"/><label htmlFor="rec" style={{fontSize:13}}>Inarudia</label></div>
        <Btn onClick={()=>{if(!+f.amount)return alert('Weka kiasi!');addExpense({category:f.category,description:f.description,amount:+f.amount,is_recurring:f.is_recurring,recurring_interval:f.is_recurring?f.recurring_interval:null});setF({...f,description:'',amount:''})}}>{IC.plus} Hifadhi</Btn></div>
      <div className="card"><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>Kwa Aina</h3>
        {pieData.length?<ResponsiveContainer width="100%" height={180}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name})=>name} style={{fontSize:10}}>{pieData.map((_,i)=><Cell key={i} fill={CL[i%CL.length]}/>)}</Pie></PieChart></ResponsiveContainer>:<Empty text="Hakuna"/>}</div>
      <div className="card" style={{gridColumn:'1/-1'}}><h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>Orodha</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{expenses.map(e=><div key={e.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between'}}>
          <div><div style={{fontWeight:600,fontSize:12,textTransform:'capitalize'}}>{e.category} {e.is_recurring?'🔄':''}</div><div style={{fontSize:11,color:'#64748B'}}>{e.description} • {fmtDate(e.created_at)}</div></div>
          <div style={{fontWeight:700,color:'#EF4444'}}>{fm(e.amount)}</div>
        </div>)}{!expenses.length&&<Empty text="Hakuna"/>}</div></div>
    </div>
  </div>;
}

// ===== EMPLOYEES =====
export function EmployeesPage(){
  const{employees,addEmployee,updateEmployee,deleteEmployee,loginLogs,getBranches,canUseBranches}=useApp();
  const myBranches=getBranches();
  const[modal,setModal]=useState(false);
  const[editBranchModal,setEditBranchModal]=useState({open:false,emp:null});
  const[f,setF]=useState({name:'',email:'',phone:'',password:'1234',branch_id:''});

  return <div>
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
            <div style={{width:40,height:40,borderRadius:'50%',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:700,color:'#0B7A3B'}}>{e.name?.[0]?.toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13}}>{e.name}</div>
              <div style={{fontSize:11,color:'#64748B'}}>{e.email}</div>
            </div>
            <button onClick={()=>window.confirm(`Futa "${e.name}"?`)&&deleteEmployee(e.id)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:5,color:'#EF4444',cursor:'pointer'}}>{IC.del}</button>
          </div>

          {/* Branch Assignment */}
          {canUseBranches&&<div style={{background:empBranch?'#F0FDF4':'#FFF7ED',borderRadius:8,padding:'6px 10px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'#475569'}}>Tawi:</div>
              <div style={{fontWeight:700,fontSize:13,color:empBranch?'#0B7A3B':'#92400E'}}>
                {empBranch?`🏪 ${empBranch.name}`:'⚠️ Hajapangiwa tawi'}
              </div>
            </div>
            <button onClick={()=>setEditBranchModal({open:true,emp:e})} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:600,cursor:'pointer',color:'#3B82F6'}}>Badilisha</button>
          </div>}

          {e.phone&&<div style={{fontSize:12,color:'#64748B',marginBottom:6}}>📱 {e.phone}</div>}

          {logs.length>0&&<div style={{background:'#F8FAFC',borderRadius:8,padding:6}}>
            <div style={{fontSize:10,fontWeight:600,color:'#475569',marginBottom:4}}>Login:</div>
            {logs.map((l,i)=><div key={i} style={{fontSize:10,color:'#64748B'}}>{fmtDate(l.created_at)} <Badge color={l.action==='login'?'#22C55E':'#94A3B8'}>{l.action}</Badge></div>)}
          </div>}
        </div>;
      })}
    </div>
    {!employees.length&&<Empty text="Ongeza mfanyakazi"/>}

    {/* ADD EMPLOYEE MODAL */}
    <Modal open={modal} onClose={()=>setModal(false)} title="Ongeza Mfanyakazi">
      <Input label="Jina *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Jina kamili"/>
      <Input label="Email *" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@mfano.com"/>
      <Input label="Simu" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="07XXXXXXXX"/>
      <Input label="Password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>

      {/* Branch selector */}
      {canUseBranches&&myBranches.length>0&&<>
        <Sel label="Tawi la Mfanyakazi" value={f.branch_id} onChange={e=>setF({...f,branch_id:e.target.value})} options={[
          {value:'',label:'-- Hakuna Tawi (anaona yote) --'},
          ...myBranches.map(b=>({value:b.id,label:b.name}))
        ]}/>
        <div style={{background:'#F0FDF4',borderRadius:8,padding:'6px 10px',marginBottom:10,fontSize:11,color:'#15803D',lineHeight:1.5}}>
          {f.branch_id?`Mfanyakazi huyu ataona data ya "${myBranches.find(b=>b.id===f.branch_id)?.name}" TU. Hawezi kubadilisha tawi lake.`
            :'Mfanyakazi huyu ataona data za matawi yote. Chagua tawi kama unataka kumzuia.'}
        </div>
      </>}

      <Btn onClick={async()=>{
        if(!f.name||!f.email)return alert('Jaza jina na email!');
        await addEmployee({...f,branch_id:f.branch_id||null});
        setModal(false);setF({name:'',email:'',phone:'',password:'1234',branch_id:''});
      }} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Sajili Mfanyakazi</Btn>
    </Modal>

    {/* CHANGE BRANCH MODAL */}
    <Modal open={editBranchModal.open} onClose={()=>setEditBranchModal({open:false,emp:null})} title={`Badilisha Tawi - ${editBranchModal.emp?.name||''}`}>
      {editBranchModal.emp&&<>
        <div style={{background:'#F8FAFC',borderRadius:10,padding:12,marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:13,color:'#64748B'}}>Tawi la sasa:</div>
          <div style={{fontSize:18,fontWeight:700,color:'#0B7A3B'}}>{myBranches.find(b=>b.id===editBranchModal.emp.branch_id)?.name||'Hajapangiwa'}</div>
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
  const{customers,addCustomer,updateCustomer,deleteCustomer,creditHistory,receivePayment,setCreditLimit,sales,currency,totalDebt,overdueCustomers,overdueTotal,debtAging}=useApp();
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

  return <div>
    {/* Tabs: Wateja | Deni Dashboard */}
    <div style={{display:'flex',background:'#F1F5F9',borderRadius:12,padding:3,marginBottom:16}}>
      <button onClick={()=>setTab('customers')} style={{flex:1,padding:'10px 0',borderRadius:10,border:'none',fontWeight:700,fontSize:14,background:tab==='customers'?'#fff':'transparent',color:tab==='customers'?'#0B7A3B':'#94A3B8',boxShadow:tab==='customers'?'0 2px 8px rgba(0,0,0,.08)':'none',cursor:'pointer'}}>👥 Wateja</button>
      <button onClick={()=>setTab('debt')} style={{flex:1,padding:'10px 0',borderRadius:10,border:'none',fontWeight:700,fontSize:14,background:tab==='debt'?'#fff':'transparent',color:tab==='debt'?'#EF4444':'#94A3B8',boxShadow:tab==='debt'?'0 2px 8px rgba(0,0,0,.08)':'none',cursor:'pointer'}}>💰 Deni ({debtCount})</button>
    </div>

    {/* ===== DEBT DASHBOARD TAB ===== */}
    {tab==='debt'&&<div>
      {/* Debt Stats */}
      <div className="flex-wrap" style={{marginBottom:16}}>
        <Stat icon={IC.wallet} label="Deni Jumla" value={fm(totalDebt)} color="#EF4444" sub={`${debtCount} wanadaiwa`}/>
        <Stat icon={IC.warn} label="Limechelewa" value={fm(overdueTotal)} color="#B91C1C" sub={`${overdueCustomers.length} wateja`}/>
        <Stat icon={IC.dollar} label="Walionunua" value={fm(customers.reduce((a,c)=>a+(c.total_spent||0),0))} color="#0B7A3B"/>
      </div>

      {/* Debt Aging Chart */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14,marginBottom:16}}>
        <div className="card">
          <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📊 Umri wa Deni (Debt Aging)</h3>
          {[{label:'Siku 0-30 (Sasa)',value:debtAging.current,color:'#22C55E',bg:'#F0FDF4'},
            {label:'Siku 31-60',value:debtAging.days30,color:'#F59E0B',bg:'#FFF7ED'},
            {label:'Siku 61-90',value:debtAging.days60,color:'#EF4444',bg:'#FEF2F2'},
            {label:'Zaidi ya 90',value:debtAging.over90,color:'#B91C1C',bg:'#FEF2F2'},
          ].map(a=>(
            <div key={a.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,marginBottom:6,background:a.bg}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:10,height:10,borderRadius:3,background:a.color}}/>
                <span style={{fontSize:13,fontWeight:600}}>{a.label}</span>
              </div>
              <span style={{fontWeight:800,color:a.color,fontSize:14}}>{fm(a.value)}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',padding:'10px',borderTop:'2px solid #E2E8F0',marginTop:8}}>
            <span style={{fontWeight:800,fontSize:14}}>JUMLA</span>
            <span style={{fontWeight:900,fontSize:16,color:'#EF4444'}}>{fm(totalDebt)}</span>
          </div>
        </div>

        {/* Overdue Alerts */}
        <div className="card" style={{borderLeft:'4px solid #EF4444'}}>
          <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px',color:'#B91C1C'}}>🚨 Deni Limechelewa ({overdueCustomers.length})</h3>
          {overdueCustomers.length>0?overdueCustomers.map(c=>{
            const daysOver=getDaysOverdue(c.id);
            return <div key={c.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                <div style={{fontSize:11,color:'#EF4444'}}>Siku {daysOver} zimepita tarehe ya kulipa!</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontWeight:800,color:'#B91C1C'}}>{fm(c.credit_balance)}</span>
                {c.phone&&<button onClick={()=>sendReminder(c)} style={{background:'#22C55E',border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>WhatsApp</button>}
              </div>
            </div>;
          }):<div style={{textAlign:'center',padding:20,color:'#22C55E',fontSize:13}}>✅ Hakuna deni limechelewa!</div>}
        </div>
      </div>

      {/* All Debtors */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📋 Wateja Wenye Deni ({debtCount})</h3>
        {customers.filter(c=>(c.credit_balance||0)>0).sort((a,b)=>(b.credit_balance||0)-(a.credit_balance||0)).map(c=>{
          const overdue=isOverdue(c.id);const age=getCustDebtAge(c.id);
          return <div key={c.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:overdue?'#FEF2F2':'#FFF7ED',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:overdue?'#EF4444':'#F59E0B'}}>{c.name?.[0]?.toUpperCase()}</div>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
              <div style={{fontSize:11,color:'#64748B'}}>{c.phone||'-'} • Siku {age}</div>
            </div>
            <div style={{textAlign:'right',minWidth:80}}>
              <div style={{fontWeight:800,fontSize:15,color:'#EF4444'}}>{fm(c.credit_balance)}</div>
              {c.credit_limit&&<div style={{fontSize:10,color:'#64748B'}}>Kikomo: {fm(c.credit_limit)}</div>}
            </div>
            <div style={{display:'flex',gap:4}}>
              {overdue&&<Badge color="#B91C1C">Chelewa!</Badge>}
              <button onClick={()=>{setPayModal({open:true,cust:c});setPayAmt('');setPayNote('')}} style={{background:'#22C55E',border:'none',borderRadius:6,padding:'5px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Pokea</button>
              {c.phone&&<button onClick={()=>sendReminder(c)} style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:6,padding:'5px 8px',fontSize:11,cursor:'pointer',color:'#15803D',fontWeight:600}}>Kumbusha</button>}
            </div>
          </div>;
        })}
        {debtCount===0&&<Empty icon="✅" text="Hakuna wateja wenye deni!"/>}
      </div>
    </div>}

    {/* ===== CUSTOMERS TAB ===== */}
    {tab==='customers'&&<div>
      {/* Stats */}
      <div className="flex-wrap" style={{marginBottom:16}}>
        <Stat icon={IC.people} label="Wateja" value={customers.length} color="#0B7A3B"/>
        <Stat icon={IC.wallet} label="Deni Jumla" value={fm(totalDebt)} color="#EF4444" sub={`${debtCount} wanadaiwa`}/>
        <Stat icon={IC.dollar} label="Walionunua" value={fm(customers.reduce((a,c)=>a+(c.total_spent||0),0))} color="#3B82F6"/>
        {overdueCustomers.length>0&&<Stat icon={IC.warn} label="Chelewa" value={overdueCustomers.length} color="#B91C1C"/>}
      </div>

      {/* Search & Filter */}
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:8,flex:'1 1 300px',maxWidth:450}}>
          <div style={{position:'relative',flex:1}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8'}}>{IC.find}</span>
            <input placeholder="Tafuta kwa jina au simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 10px 10px 36px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box'}}/>
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
          
          return <div key={c.id} style={{background:'#fff',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:overdue?'2px solid #EF4444':hasDebt?'2px solid #FCA5A5':'1px solid #E2E8F0'}}>
            {/* Overdue banner */}
            {overdue&&<div style={{background:'#FEF2F2',borderRadius:8,padding:'4px 10px',marginBottom:8,fontSize:11,fontWeight:700,color:'#B91C1C',display:'flex',justifyContent:'space-between'}}>
              <span>🚨 Deni limechelewa siku {getDaysOverdue(c.id)}!</span>
              {c.phone&&<span onClick={()=>sendReminder(c)} style={{cursor:'pointer',textDecoration:'underline'}}>Kumbusha</span>}
            </div>}

            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:overdue?'#FEF2F2':hasDebt?'#FFF7ED':'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:overdue?'#EF4444':hasDebt?'#F59E0B':'#0B7A3B'}}>{c.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{c.name}</div>
                  <div style={{fontSize:12,color:'#64748B'}}>{c.phone||'Hakuna simu'}</div>
                  {c.address&&<div style={{fontSize:11,color:'#94A3B8'}}>{c.address}</div>}
                </div>
              </div>
              <div style={{display:'flex',gap:3}}>
                <button onClick={()=>{setLimitModal({open:true,cust:c});setLimitAmt(c.credit_limit||'')}} title="Weka kikomo" style={{background:'#EFF6FF',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#3B82F6',fontSize:12}}>📏</button>
                <button onClick={()=>setEditModal({open:true,cust:{...c}})} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#475569'}}>{IC.gear}</button>
                <button onClick={()=>window.confirm(`Futa "${c.name}"?`)&&deleteCustomer(c.id)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#EF4444'}}>{IC.del}</button>
              </div>
            </div>

            {/* Financial Info */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div style={{background:overdue?'#FEF2F2':hasDebt?'#FFF7ED':'#F0FDF4',borderRadius:10,padding:'8px 10px'}}>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>DENI</div>
                <div style={{fontWeight:800,fontSize:18,color:overdue?'#B91C1C':hasDebt?'#EF4444':'#22C55E'}}>{fm(c.credit_balance||0)}</div>
                {hasDebt&&<div style={{fontSize:10,color:overdue?'#B91C1C':'#F59E0B',fontWeight:600}}>{overdue?'Chelewa!':age>0?`Siku ${age}`:'Leo'}</div>}
              </div>
              <div style={{background:'#F8FAFC',borderRadius:10,padding:'8px 10px'}}>
                <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>AMENUNUA</div>
                <div style={{fontWeight:800,fontSize:18,color:'#1E293B'}}>{fm(c.total_spent||0)}</div>
                <div style={{fontSize:10,color:'#64748B'}}>{custSales.length} mauzo</div>
              </div>
            </div>

            {/* Credit Limit Bar */}
            {c.credit_limit&&<div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#64748B',marginBottom:2}}>
                <span>Kikomo: {fm(c.credit_limit)}</span>
                <span style={{color:limitUsed>=90?'#EF4444':limitUsed>=70?'#F59E0B':'#22C55E'}}>{limitUsed}%</span>
              </div>
              <div style={{height:6,background:'#F1F5F9',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${limitUsed}%`,background:limitUsed>=90?'#EF4444':limitUsed>=70?'#F59E0B':'#22C55E',borderRadius:3}}/>
              </div>
            </div>}

            {/* Last purchase */}
            {lastSale&&<div style={{background:'#F8FAFC',borderRadius:8,padding:'4px 10px',marginBottom:8,fontSize:11,color:'#64748B'}}>
              Mauzo: {fmtDate(lastSale.created_at)} — {fm(lastSale.total)} {lastSale.payment_method==='credit'?'(Deni)':''}
            </div>}

            {/* Action Buttons */}
            <div style={{display:'flex',gap:5}}>
              {hasDebt&&<button onClick={()=>{setPayModal({open:true,cust:c});setPayAmt('');setPayNote('');setPayMethod('cash')}} style={{flex:1,padding:'8px 6px',borderRadius:8,border:'none',background:'#22C55E',color:'#fff',fontWeight:700,fontSize:11,cursor:'pointer'}}>💰 Pokea</button>}
              {hasDebt&&c.phone&&<button onClick={()=>sendReminder(c)} style={{padding:'8px 6px',borderRadius:8,border:'none',background:'#F0FDF4',color:'#15803D',fontWeight:700,fontSize:11,cursor:'pointer'}}>📱</button>}
              <button onClick={()=>setHistModal({open:true,cust:c})} style={{flex:1,padding:'8px 6px',borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',color:'#475569',fontWeight:600,fontSize:11,cursor:'pointer'}}>📋 Historia</button>
            </div>
          </div>;
        })}
      </div>
      {!filtered.length&&<Empty icon="👥" text={search?'Hakuna matokeo':'Ongeza wateja wako'}/>}
    </div>}

    {/* ADD CUSTOMER MODAL */}
    <Modal open={modal} onClose={()=>setModal(false)} title="Ongeza Mteja Mpya">
      <Input label="Jina Kamili *" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Mf: Mama Fatuma"/>
      <Input label="Simu" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="07XXXXXXXX"/>
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
        <div style={{background:'#F8FAFC',borderRadius:10,padding:10,marginBottom:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div><div style={{fontSize:10,color:'#94A3B8'}}>Deni Sasa</div><div style={{fontWeight:800,fontSize:16,color:'#EF4444'}}>{fm(limitModal.cust.credit_balance||0)}</div></div>
          <div><div style={{fontSize:10,color:'#94A3B8'}}>Kikomo Sasa</div><div style={{fontWeight:800,fontSize:16,color:'#3B82F6'}}>{limitModal.cust.credit_limit?fm(limitModal.cust.credit_limit):'Hakuna'}</div></div>
        </div>
        <Input label="Kikomo Kipya (TZS)" type="number" value={limitAmt} onChange={e=>setLimitAmt(e.target.value)} placeholder="Mf: 100000"/>
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {[50000,100000,200000,500000].map(a=><button key={a} onClick={()=>setLimitAmt(String(a))} style={{padding:'6px 12px',borderRadius:8,border:limitAmt===String(a)?'2px solid #3B82F6':'1px solid #E2E8F0',background:limitAmt===String(a)?'#EFF6FF':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:limitAmt===String(a)?'#3B82F6':'#64748B'}}>{fm(a)}</button>)}
          <button onClick={()=>setLimitAmt('0')} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #FCA5A5',background:'#FEF2F2',fontSize:12,fontWeight:600,cursor:'pointer',color:'#EF4444'}}>Ondoa</button>
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
        <div style={{background:'#FEF2F2',borderRadius:12,padding:14,marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:13,color:'#64748B'}}>Deni la {payModal.cust.name}</div>
          <div style={{fontSize:30,fontWeight:900,color:'#EF4444'}}>{fm(payModal.cust.credit_balance||0)}</div>
        </div>
        <Input label="Kiasi cha Malipo (TZS)" type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="Mf: 5000"/>
        <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          {[5000,10000,20000,50000].map(amt=>
            <button key={amt} onClick={()=>setPayAmt(String(amt))} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #E2E8F0',background:payAmt===String(amt)?'#F0FDF4':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:payAmt===String(amt)?'#0B7A3B':'#64748B'}}>{(amt/1000)}K</button>
          )}
          <button onClick={()=>setPayAmt(String(payModal.cust.credit_balance||0))} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #22C55E',background:'#F0FDF4',fontSize:12,fontWeight:700,cursor:'pointer',color:'#0B7A3B'}}>Lipa Yote</button>
        </div>
        <div style={{marginBottom:10}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Njia ya Malipo</label>
          <div style={{display:'flex',gap:6}}>
            {[{v:'cash',l:'Taslimu'},{v:'mobile',l:'M-Pesa'},{v:'bank',l:'Benki'}].map(m=>
              <button key={m.v} onClick={()=>setPayMethod(m.v)} style={{flex:1,padding:'8px 4px',borderRadius:8,border:payMethod===m.v?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:payMethod===m.v?'#F0FDF4':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:payMethod===m.v?'#0B7A3B':'#64748B'}}>{m.l}</button>
            )}
          </div>
        </div>
        <Input label="Maelezo (si lazima)" value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Mf: Malipo ya sehemu"/>
        {payAmt&&<div style={{background:'#F0FDF4',borderRadius:10,padding:10,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Deni sasa:</span><span style={{fontWeight:700,color:'#EF4444'}}>{fm(payModal.cust.credit_balance||0)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Analipa:</span><span style={{fontWeight:700,color:'#22C55E'}}>-{fm(+payAmt)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:800,borderTop:'2px solid #BBF7D0',paddingTop:6,marginTop:6}}><span>Baki:</span><span style={{color:(payModal.cust.credit_balance||0)-(+payAmt)>0?'#EF4444':'#22C55E'}}>{fm(Math.max(0,(payModal.cust.credit_balance||0)-(+payAmt)))}</span></div>
        </div>}
        <Btn onClick={async()=>{
          const amt=+payAmt;if(!amt||amt<=0)return alert('Weka kiasi sahihi!');
          if(amt>(payModal.cust.credit_balance||0))return alert('Kiasi ni kikubwa kuliko deni!');
          await receivePayment(payModal.cust.id,amt,payNote,payMethod);
          alert(`Malipo ya ${fm(amt)} yamepokewa! Deni jipya: ${fm(Math.max(0,(payModal.cust.credit_balance||0)-amt))}`);
          setPayModal({open:false,cust:null});setPayAmt('');setPayNote('');
        }} style={{width:'100%',justifyContent:'center',marginTop:8,background:'#22C55E'}}>💰 Pokea {payAmt?fm(+payAmt):''}</Btn>
      </>}
    </Modal>

    {/* CREDIT HISTORY MODAL */}
    <Modal open={histModal.open} onClose={()=>setHistModal({open:false,cust:null})} title={`Historia - ${histModal.cust?.name||''}`} wide>
      {histModal.cust&&<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
          <div style={{background:'#FEF2F2',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Deni</div>
            <div style={{fontWeight:800,fontSize:18,color:'#EF4444'}}>{fm(histModal.cust.credit_balance||0)}</div>
          </div>
          <div style={{background:'#F8FAFC',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Amenunua</div>
            <div style={{fontWeight:800,fontSize:18}}>{fm(histModal.cust.total_spent||0)}</div>
          </div>
          <div style={{background:'#F0FDF4',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Kikomo</div>
            <div style={{fontWeight:800,fontSize:18,color:'#3B82F6'}}>{histModal.cust.credit_limit?fm(histModal.cust.credit_limit):'—'}</div>
          </div>
        </div>

        <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>Shughuli za Deni</h4>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {getCustCredits(histModal.cust.id).length?getCustCredits(histModal.cust.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(tx=>{
            const isOverdueTx=tx.type==='credit'&&tx.status!=='paid'&&tx.due_date&&new Date(tx.due_date)<new Date();
            return <div key={tx.id} style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',background:isOverdueTx?'#FEF2F2':'transparent'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:tx.type==='credit'?'#FEF2F2':'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                  {tx.type==='credit'?'📤':'💰'}
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:tx.type==='credit'?'#EF4444':'#22C55E'}}>
                    {tx.type==='credit'?'Deni':'Malipo'} {tx.payment_method&&tx.type==='payment'?`(${tx.payment_method})`:''}
                  </div>
                  <div style={{fontSize:11,color:'#94A3B8'}}>{tx.note?.slice(0,50)}</div>
                  <div style={{fontSize:10,color:'#CBD5E1'}}>{fmtDate(tx.created_at)}</div>
                  {tx.due_date&&tx.type==='credit'&&<div style={{fontSize:10,color:isOverdueTx?'#B91C1C':'#64748B'}}>Lipa kabla: {new Date(tx.due_date).toLocaleDateString('sw-TZ')} {isOverdueTx?'⚠️ CHELEWA!':''}</div>}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,fontSize:14,color:tx.type==='credit'?'#EF4444':'#22C55E'}}>{tx.type==='credit'?'+':'-'}{fm(tx.amount)}</div>
                {tx.type==='credit'&&<Badge color={tx.status==='paid'?'#22C55E':tx.status==='partial'?'#F59E0B':'#EF4444'}>{tx.status==='paid'?'Imelipwa':tx.status==='partial'?'Sehemu':'Haijalipwa'}</Badge>}
              </div>
            </div>;
          }):<div style={{textAlign:'center',padding:20,color:'#94A3B8'}}>Hakuna shughuli</div>}
        </div>

        <h4 style={{fontSize:14,fontWeight:700,margin:'16px 0 10px'}}>Mauzo ({getCustSales(histModal.cust.id).length})</h4>
        <div style={{maxHeight:200,overflowY:'auto'}}>
          {getCustSales(histModal.cust.id).map(s=>(
            <div key={s.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.items?.map(i=>i.name).join(', ').slice(0,40)}</div><div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(s.created_at)}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:13}}>{fm(s.total)}</div><Badge color={s.payment_method==='credit'?'#EF4444':'#22C55E'}>{s.payment_method==='credit'?'Deni':s.payment_method}</Badge></div>
            </div>
          ))}
        </div>
      </>}
    </Modal>
  </div>;
}

// ===== SUPPORT TICKETS (for office) =====
export function SupportPage(){
  const{tickets,createTicket}=useApp();const myTickets=tickets;
  const[modal,setModal]=useState(false);const[f,setF]=useState({subject:'',message:'',priority:'normal'});
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Msaada ({myTickets.length})</h3><Btn onClick={()=>setModal(true)}>{IC.plus} Tuma Tatizo</Btn></div>
    <div className="card">
      {myTickets.length?myTickets.map(t=><div key={t.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
          <div style={{fontWeight:700,fontSize:13}}>{t.subject}</div>
          <Badge color={t.status==='open'?'#EF4444':t.status==='replied'?'#3B82F6':'#22C55E'}>{t.status==='open'?'Inasubiri':t.status==='replied'?'Imejibiwa':'Imefungwa'}</Badge>
        </div>
        <div style={{fontSize:12,color:'#475569',marginTop:4,background:'#F8FAFC',padding:6,borderRadius:6}}>{t.message}</div>
        {t.reply&&<div style={{fontSize:12,color:'#0B7A3B',marginTop:4,background:'#F0FDF4',padding:6,borderRadius:6}}>Jibu: {t.reply}</div>}
        <div style={{fontSize:10,color:'#94A3B8',marginTop:4}}>{fmtDate(t.created_at)}</div>
      </div>):<Empty icon="🎫" text="Hakuna matatizo — kila kitu kiko sawa!"/>}
    </div>
    <Modal open={modal} onClose={()=>setModal(false)} title="Tuma Tatizo">
      <Sel label="Kiwango" value={f.priority} onChange={e=>setF({...f,priority:e.target.value})} options={[{value:'normal',label:'Kawaida'},{value:'urgent',label:'Haraka Sana'}]}/>
      <Input label="Kichwa" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder="Mf: Mfumo hauonyeshi bidhaa"/>
      <Area label="Maelezo" value={f.message} onChange={e=>setF({...f,message:e.target.value})} placeholder="Eleza tatizo lako kwa undani..."/>
      <Btn onClick={async()=>{if(!f.subject||!f.message)return alert('Jaza!');await createTicket(f.subject,f.message,f.priority);alert('Tatizo limetumwa! Tutakujibu haraka.');setModal(false);setF({subject:'',message:'',priority:'normal'})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.send} Tuma</Btn>
    </Modal>
  </div>;
}

// ===== NOTIFICATIONS =====
export function NotifsPage(){
  const{notifications,markAllRead,markRead}=useApp();
  const[filter,setFilter]=useState('all');
  const sty=t=>({bg:t==='danger'?'#FEF2F2':t==='warning'?'#FFF7ED':t==='success'?'#F0FDF4':'#EFF6FF',ac:t==='danger'?'#EF4444':t==='warning'?'#F59E0B':t==='success'?'#22C55E':'#3B82F6',em:t==='danger'?'🚨':t==='warning'?'⚠️':t==='success'?'✅':'📋'});
  const unread=notifications.filter(n=>!n.is_read).length;
  const filtered=filter==='all'?notifications:filter==='unread'?notifications.filter(n=>!n.is_read):notifications.filter(n=>n.type===filter);

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>🔔 Arifa {unread>0&&<span style={{background:'#EF4444',color:'#fff',fontSize:11,padding:'2px 8px',borderRadius:10,marginLeft:6}}>{unread} mpya</span>}</h3>
      {unread>0&&<Btn v="ghost" onClick={markAllRead}>Soma Zote</Btn>}
    </div>

    {/* Filter tabs */}
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
      {[{v:'all',l:`Zote (${notifications.length})`},{v:'unread',l:`Mpya (${unread})`},{v:'danger',l:'🚨 Hatari'},{v:'warning',l:'⚠️ Onyo'},{v:'success',l:'✅ Mafanikio'},{v:'info',l:'📋 Taarifa'}].map(f=>
        <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:'6px 12px',borderRadius:8,border:filter===f.v?'2px solid #0B7A3B':'1px solid #E2E8F0',background:filter===f.v?'#F0FDF4':'#fff',fontSize:11,fontWeight:filter===f.v?700:500,cursor:'pointer',color:filter===f.v?'#0B7A3B':'#64748B'}}>{f.l}</button>
      )}
    </div>

    <div className="card">
      {!filtered.length?<Empty icon="🔔" text={filter==='all'?'Hakuna arifa':'Hakuna arifa za aina hii'}/>:filtered.slice(0,50).map(n=>{
        const s=sty(n.type);
        return <div key={n.id} onClick={()=>!n.is_read&&markRead(n.id)} style={{padding:'12px 14px',marginBottom:8,borderRadius:10,background:n.is_read?'#FAFAFA':s.bg,borderLeft:`4px solid ${s.ac}`,display:'flex',gap:10,cursor:n.is_read?'default':'pointer',transition:'all 0.2s',boxShadow:n.is_read?'none':'0 1px 4px rgba(0,0,0,0.04)'}}>
          <span style={{fontSize:22,marginTop:2}}>{s.em}</span>
          <div style={{flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontWeight:n.is_read?600:800,fontSize:14,color:n.is_read?'#64748B':'#1E293B'}}>{n.title}</div>
              {!n.is_read&&<span style={{width:8,height:8,borderRadius:'50%',background:s.ac,flexShrink:0}}/>}
            </div>
            <div style={{fontSize:13,color:'#475569',marginTop:4,lineHeight:1.5}}>{n.message}</div>
            <div style={{fontSize:11,color:'#94A3B8',marginTop:6}}>{fmtDate(n.created_at)}</div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ===== BRANCHES =====
export function BranchesPage(){
  const{getBranches,addBranch,updateBranch,deleteBranch,activeBranch,setActiveBranch,products,sales,expenses,currency,maxBranches,biz}=useApp();
  const myBranches=getBranches();const fm=n=>fmtMoney(n,currency||'TZS');const[modal,setModal]=useState(false);const[editModal,setEditModal]=useState({open:false,branch:null});const[f,setF]=useState({name:'',location:''});
  const branchStats=bid=>{const bp=products.filter(p=>p.branch_id===bid);const bs=sales.filter(s=>s.branch_id===bid);const totalSales=bs.reduce((a,s)=>a+s.total,0);return{products:bp.length,sales:bs.length,totalSales}};
  const canAddMore=myBranches.length<maxBranches;
  return <div>
    {/* Plan info */}
    <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
      <div style={{fontSize:13,color:'#15803D'}}>
        <b>Plan: {biz?.plan==='premium'?'Premium':biz?.plan==='enterprise'?'Enterprise':'Basic'}</b> — Matawi: {myBranches.length}/{maxBranches===999?'∞':maxBranches}
      </div>
      {!canAddMore&&<div style={{fontSize:12,color:'#B91C1C',fontWeight:600}}>Umefikia kikomo! Upgrade kwa matawi zaidi.</div>}
    </div>

    <div style={{background:'#fff',borderRadius:14,padding:'12px 16px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      <span style={{fontSize:13,fontWeight:700,marginRight:4}}>Tawi:</span>
      <button onClick={()=>setActiveBranch(null)} style={{padding:'6px 14px',borderRadius:8,border:!activeBranch?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:!activeBranch?'#F0FDF4':'#fff',fontWeight:!activeBranch?700:500,fontSize:12,color:!activeBranch?'#0B7A3B':'#64748B',cursor:'pointer'}}>Yote</button>
      {myBranches.map(b=><button key={b.id} onClick={()=>setActiveBranch(b.id)} style={{padding:'6px 14px',borderRadius:8,border:activeBranch===b.id?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:activeBranch===b.id?'#F0FDF4':'#fff',fontWeight:activeBranch===b.id?700:500,fontSize:12,color:activeBranch===b.id?'#0B7A3B':'#64748B',cursor:'pointer'}}>{b.name}</button>)}
      <Btn style={{padding:'6px 12px',fontSize:11,marginLeft:'auto'}} onClick={()=>{if(!canAddMore)return alert(`Umefikia kikomo cha matawi ${maxBranches} kwa plan yako! Upgrade kwa Premium/Enterprise kupata matawi zaidi.`);setModal(true)}}>{IC.plus} Tawi</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
      {myBranches.map(b=>{const st=branchStats(b.id);return <div key={b.id} className="card" style={{border:activeBranch===b.id?'2px solid #0B7A3B':'1px solid #E2E8F0'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:38,height:38,borderRadius:10,background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div><div><div style={{fontWeight:700,fontSize:14}}>{b.name}</div><div style={{fontSize:11,color:'#64748B'}}>{b.location||'-'}</div></div></div>
          <div style={{display:'flex',gap:4}}><button onClick={()=>setEditModal({open:true,branch:{...b}})} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:4,cursor:'pointer'}}>{IC.gear}</button><button onClick={()=>window.confirm('Futa?')&&deleteBranch(b.id)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:4,color:'#EF4444',cursor:'pointer'}}>{IC.del}</button></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
          <div style={{background:'#F8FAFC',borderRadius:6,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Bidhaa</div><div style={{fontWeight:800,fontSize:16}}>{st.products}</div></div>
          <div style={{background:'#F8FAFC',borderRadius:6,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Mauzo</div><div style={{fontWeight:800,fontSize:16}}>{st.sales}</div></div>
          <div style={{background:'#F0FDF4',borderRadius:6,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:9,color:'#94A3B8'}}>Mapato</div><div style={{fontWeight:800,fontSize:14,color:'#0B7A3B'}}>{fm(st.totalSales)}</div></div>
        </div>
        <button onClick={()=>setActiveBranch(activeBranch===b.id?null:b.id)} style={{width:'100%',marginTop:8,padding:'7px 0',borderRadius:8,border:'none',background:activeBranch===b.id?'#0B7A3B':'#F1F5F9',color:activeBranch===b.id?'#fff':'#475569',fontWeight:600,fontSize:12,cursor:'pointer'}}>{activeBranch===b.id?'Limechaguliwa ✓':'Chagua'}</button>
      </div>})}
    </div>
    {!myBranches.length&&<div className="card" style={{marginTop:12}}><Empty icon="🏪" text="Ongeza tawi la kwanza!"/></div>}
    <Modal open={modal} onClose={()=>setModal(false)} title="Tawi Jipya">
      <Input label="Jina" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Duka la Kariakoo"/><Input label="Eneo" value={f.location} onChange={e=>setF({...f,location:e.target.value})} placeholder="Kariakoo, DSM"/>
      <Btn onClick={async()=>{if(!f.name.trim())return alert('Weka jina!');await addBranch(f.name.trim(),f.location.trim());setModal(false);setF({name:'',location:''})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
    </Modal>
    <Modal open={editModal.open} onClose={()=>setEditModal({open:false,branch:null})} title="Hariri Tawi">
      {editModal.branch&&<><Input label="Jina" value={editModal.branch.name} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,name:e.target.value}})}/><Input label="Eneo" value={editModal.branch.location||''} onChange={e=>setEditModal({...editModal,branch:{...editModal.branch,location:e.target.value}})}/>
      <Btn onClick={async()=>{await updateBranch(editModal.branch.id,{name:editModal.branch.name,location:editModal.branch.location});setEditModal({open:false,branch:null})}} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn></>}
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
        {data.pct>=100&&<Badge color="#22C55E">Umefanikiwa!</Badge>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
        <span style={{fontSize:28,fontWeight:900,color:data.pct>=100?'#22C55E':color}}>{fm(data.current)}</span>
        <span style={{fontSize:14,color:'#64748B'}}>/ {fm(data.goal)}</span>
      </div>
      <div style={{height:14,background:'#F1F5F9',borderRadius:7,overflow:'hidden',marginBottom:6}}>
        <div style={{height:'100%',width:`${data.pct}%`,background:data.pct>=100?'linear-gradient(90deg,#22C55E,#16A34A)':data.pct>60?`linear-gradient(90deg,${color},${color}CC)`:'#F59E0B',borderRadius:7,transition:'width 0.8s ease',position:'relative'}}>
          {data.pct>15&&<span style={{position:'absolute',right:6,top:0,color:'#fff',fontSize:10,fontWeight:700,lineHeight:'14px'}}>{data.pct}%</span>}
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748B'}}>
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
    {goalProgress.daily.goal>0&&<ProgressBar label="Lengo la Leo" data={goalProgress.daily} color="#0B7A3B" emoji="☀️"/>}
    {goalProgress.weekly.goal>0&&<ProgressBar label="Lengo la Wiki" data={goalProgress.weekly} color="#3B82F6" emoji="📅"/>}
    {goalProgress.monthly.goal>0&&<ProgressBar label="Lengo la Mwezi" data={goalProgress.monthly} color="#8B5CF6" emoji="📊"/>}

    {!goalProgress.daily.goal&&!goalProgress.weekly.goal&&!goalProgress.monthly.goal&&
      <div className="card" style={{textAlign:'center',padding:30}}>
        <div style={{fontSize:40,marginBottom:8}}>🎯</div>
        <div style={{fontSize:16,fontWeight:700,color:'#1E293B',marginBottom:4}}>Weka Malengo Yako!</div>
        <div style={{fontSize:13,color:'#64748B'}}>Weka lengo la faida kwa siku, wiki, au mwezi — mfumo utakuonyesha maendeleo yako.</div>
      </div>
    }
  </div>;
}

// ===== INVOICE GENERATOR =====
export function InvoicePage(){
  const{biz,customers,products,currency,settings}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[items,setItems]=useState([{name:'',qty:1,price:0}]);
  const[custName,setCustName]=useState('');
  const[custPhone,setCustPhone]=useState('');
  const[custAddress,setCustAddress]=useState('');
  const[notes,setNotes]=useState('');
  const[dueDate,setDueDate]=useState('');
  const[taxRate,setTaxRate]=useState(0);
  const[invoices,setInvoices]=useState([]);

  const addItem=()=>setItems([...items,{name:'',qty:1,price:0}]);
  const removeItem=i=>setItems(items.filter((_,j)=>j!==i));
  const updateItem=(i,field,val)=>setItems(items.map((item,j)=>j===i?{...item,[field]:val}:item));

  const subtotal=items.reduce((s,i)=>s+i.qty*i.price,0);
  const tax=subtotal*taxRate/100;
  const grandTotal=subtotal+tax;
  const invNo=`INV-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const generateInvoice=()=>{
    if(!custName||items.every(i=>!i.name))return alert('Jaza taarifa za mteja na bidhaa!');
    const inv={id:invNo,date:new Date().toISOString(),dueDate,customer:{name:custName,phone:custPhone,address:custAddress},items:items.filter(i=>i.name),subtotal,tax,taxRate,grandTotal,notes,status:'unpaid',bizName:biz?.name};
    setInvoices(prev=>[inv,...prev]);
    // Generate printable
    const w=window.open('','_blank','width=800,height=900');
    w.document.write(`<html><head><title>Invoice ${invNo}</title><style>
      body{font-family:Arial;padding:30px;color:#1E293B;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #0B7A3B;padding-bottom:16px;margin-bottom:20px}
      .logo{font-size:24px;font-weight:900;color:#0B7A3B}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th{background:#0B7A3B;color:#fff;padding:10px;text-align:left;font-size:13px}
      td{padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px}
      .total-row{font-weight:700;font-size:16px;color:#0B7A3B}
      .footer{margin-top:30px;border-top:2px solid #E2E8F0;padding-top:12px;font-size:11px;color:#64748B;text-align:center}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="header"><div><div class="logo">${biz?.name||'Duka Langu'}</div><div style="font-size:12px;color:#64748B">${biz?.email||''} | ${biz?.phone||''}</div></div>
      <div style="text-align:right"><div style="font-size:18px;font-weight:700">ANKARA / INVOICE</div><div style="font-size:13px;color:#64748B">Na: ${invNo}</div><div style="font-size:13px;color:#64748B">Tarehe: ${new Date().toLocaleDateString('sw-TZ')}</div>${dueDate?`<div style="font-size:13px;color:#EF4444">Lipa kabla: ${new Date(dueDate).toLocaleDateString('sw-TZ')}</div>`:''}</div></div>
      <div style="background:#F8FAFC;padding:14px;border-radius:8px;margin-bottom:16px"><div style="font-weight:700;font-size:13px;color:#64748B;margin-bottom:4px">KWA:</div>
      <div style="font-weight:700;font-size:16px">${custName}</div>${custPhone?`<div style="font-size:13px">${custPhone}</div>`:''}${custAddress?`<div style="font-size:13px;color:#64748B">${custAddress}</div>`:''}</div>
      <table><thead><tr><th>#</th><th>Bidhaa</th><th>Idadi</th><th>Bei</th><th>Jumla</th></tr></thead><tbody>
      ${items.filter(i=>i.name).map((i,k)=>`<tr><td>${k+1}</td><td>${i.name}</td><td>${i.qty}</td><td>${(+i.price).toLocaleString()}</td><td>${(i.qty*i.price).toLocaleString()}</td></tr>`).join('')}
      </tbody></table>
      <div style="text-align:right;margin-top:8px"><div style="font-size:14px">Jumla Ndogo: TZS ${subtotal.toLocaleString()}</div>
      ${taxRate>0?`<div style="font-size:14px">Kodi (${taxRate}%): TZS ${tax.toLocaleString()}</div>`:''}
      <div class="total-row" style="font-size:20px;margin-top:6px;padding-top:6px;border-top:2px solid #0B7A3B">JUMLA: TZS ${grandTotal.toLocaleString()}</div></div>
      ${notes?`<div style="margin-top:20px;background:#FFF7ED;padding:12px;border-radius:8px;font-size:13px"><b>Maelezo:</b> ${notes}</div>`:''}
      <div style="margin-top:30px;padding:14px;background:#F0FDF4;border-radius:8px;font-size:13px"><b>Malipo:</b> ${settings.payment_provider||'HALOPESA'} - Lipa Namba: ${settings.payment_number||'25187616'} | Jina: ${settings.payment_name||'DUKALANGU'}</div>
      <div class="footer">${biz?.name||'Duka Langu'} — Together for the better<br/>pesafly1@gmail.com | +255 628 986 770 | Huduma: 0617 288 752</div>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(),500);
  };

  const shareWhatsApp=()=>{
    const msg=`*ANKARA / INVOICE*%0A━━━━━━━━━━%0ANa: ${invNo}%0ATarehe: ${new Date().toLocaleDateString('sw-TZ')}%0A${dueDate?`Lipa kabla: ${new Date(dueDate).toLocaleDateString('sw-TZ')}%0A`:''}%0AKwa: ${custName}%0A%0A*Bidhaa:*%0A${items.filter(i=>i.name).map(i=>`• ${i.name} x${i.qty} = TZS ${(i.qty*i.price).toLocaleString()}`).join('%0A')}%0A%0A${taxRate>0?`Kodi (${taxRate}%): TZS ${tax.toLocaleString()}%0A`:''}*JUMLA: TZS ${grandTotal.toLocaleString()}*%0A%0AMalipo: ${settings.payment_provider} > ${settings.payment_number}%0AJina: ${settings.payment_name}%0A%0A${biz?.name||'Duka Langu'}`;
    window.open(`https://wa.me/${custPhone?.replace(/\D/g,'')}?text=${msg}`,'_blank');
  };

  return <div style={{maxWidth:700}}>
    <div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 16px'}}>📄 Tengeneza Ankara</h3>

      {/* Customer Info */}
      <div style={{background:'#F8FAFC',borderRadius:12,padding:14,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:8}}>Taarifa za Mteja</div>
        <Input label="Jina la Mteja *" value={custName} onChange={e=>setCustName(e.target.value)} placeholder="Jina kamili"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <Input label="Simu" value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="07XX"/>
          <Input label="Tarehe ya Kulipa" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
        </div>
        <Input label="Anwani" value={custAddress} onChange={e=>setCustAddress(e.target.value)} placeholder="Mtaa, Kata, Jiji"/>
      </div>

      {/* Items */}
      <div style={{fontSize:13,fontWeight:700,color:'#475569',marginBottom:8}}>Bidhaa / Huduma</div>
      {items.map((item,i)=>(
        <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:6,marginBottom:6,alignItems:'end'}}>
          <Input label={i===0?"Bidhaa":""} value={item.name} onChange={e=>updateItem(i,'name',e.target.value)} placeholder="Jina"/>
          <Input label={i===0?"Idadi":""} type="number" value={item.qty} onChange={e=>updateItem(i,'qty',+e.target.value||1)}/>
          <Input label={i===0?"Bei":""} type="number" value={item.price} onChange={e=>updateItem(i,'price',+e.target.value||0)}/>
          <button onClick={()=>removeItem(i)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:'8px',color:'#EF4444',cursor:'pointer',marginBottom:12}}>{IC.del}</button>
        </div>
      ))}
      <Btn v="ghost" onClick={addItem} style={{marginBottom:12}}>{IC.plus} Ongeza Bidhaa</Btn>

      {/* Tax & Notes */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <Input label="Kodi / VAT (%)" type="number" value={taxRate} onChange={e=>setTaxRate(+e.target.value||0)} placeholder="0"/>
        <div style={{display:'flex',alignItems:'end',paddingBottom:12}}>
          <div style={{fontSize:12,color:'#64748B'}}>Ankara Na: <b>{invNo}</b></div>
        </div>
      </div>
      <Input label="Maelezo ya Ziada" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Mf: Malipo ndani ya siku 30"/>

      {/* Totals */}
      <div style={{background:'#F0FDF4',borderRadius:12,padding:14,marginTop:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}><span>Jumla Ndogo:</span><span style={{fontWeight:600}}>{fm(subtotal)}</span></div>
        {taxRate>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4,color:'#F59E0B'}}><span>Kodi ({taxRate}%):</span><span style={{fontWeight:600}}>{fm(tax)}</span></div>}
        <div style={{display:'flex',justifyContent:'space-between',fontSize:20,fontWeight:900,color:'#0B7A3B',paddingTop:6,borderTop:'2px solid #BBF7D0'}}><span>JUMLA KUU:</span><span>{fm(grandTotal)}</span></div>
      </div>

      {/* Actions */}
      <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
        <Btn onClick={generateInvoice} style={{flex:1}}>{IC.file} Chapisha / PDF</Btn>
        <Btn v="blue" onClick={shareWhatsApp} style={{flex:1}}>{IC.send} WhatsApp</Btn>
      </div>
    </div>

    {/* Invoice History */}
    {invoices.length>0&&<div className="card">
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>📋 Ankara Zilizotumwa ({invoices.length})</h3>
      {invoices.map(inv=>(
        <div key={inv.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:600,fontSize:13}}>{inv.customer.name}</div><div style={{fontSize:11,color:'#64748B'}}>{inv.id} • {fmtDate(inv.date)}</div></div>
          <div style={{fontWeight:700,color:'#0B7A3B'}}>{fm(inv.grandTotal)}</div>
        </div>
      ))}
    </div>}
  </div>;
}

// ===== REFERRAL & WHATSAPP SHARE CARD =====
export function ReferralPage(){
  const{biz,user}=useApp();
  const[copied,setCopied]=useState('');
  const refCode=biz?.id?'REF-'+biz.id.slice(0,8).toUpperCase():'';
  const refLink=`${window.location.origin}/?ref=${refCode}`;
  
  const shareMessage=`🎉 Hujaribu *Duka Langu*?

Mfumo bora wa POS Tanzania — unakusaidia kuendesha duka lako kwa akili!

✅ Mauzo ya kasi
✅ Stock automatic
✅ Ripoti za faida
✅ Msaada 24/7

Bei TZS 15,000 tu/mwezi.

Tumia link yangu kupata *Wiki 1 ya BURE*:
${refLink}

Wasiliana: 0617 288 752`;

  const copyText=(text,key)=>{
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(()=>setCopied(''),2000);
  };

  const shareWA=()=>{
    const url=`https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url,'_blank');
  };

  return <div>
    {/* PAGE HEADER */}
    <div style={{marginBottom:18}}>
      <h2 style={{fontSize:24,fontWeight:900,color:'#0B7A3B',margin:'0 0 6px'}}>🎁 Karibisha Rafiki</h2>
      <p style={{fontSize:13,color:'#64748B',margin:0}}>Mwambie rafiki yako kuhusu Duka Langu — wote mtafaidika!</p>
    </div>

    {/* MAIN CARD */}
    <div style={{background:'linear-gradient(135deg,#0B7A3B 0%,#065F2E 100%)',borderRadius:16,padding:24,marginBottom:18,color:'#fff',position:'relative',overflow:'hidden',boxShadow:'0 8px 30px rgba(11,122,59,0.3)'}}>
    <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
    <div style={{position:'absolute',bottom:-40,left:-40,width:140,height:140,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
    <div style={{position:'relative',zIndex:1}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{display:'inline-block',padding:'4px 12px',background:'rgba(255,255,255,0.2)',borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>🎁 PROGRAM YA REFERRAL</div>
          <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 8px'}}>Mwambie Rafiki — Pata Bonus!</h3>
          <p style={{fontSize:13,opacity:0.9,margin:'0 0 12px',lineHeight:1.6}}>
            Rafiki yako akijiunga kupitia link yako, <b>wote mtafaidika</b>:<br/>
            🎁 Wewe → <b>TZS 5,000</b> kupunguzwa kwenye ada<br/>
            🎁 Rafiki yako → <b>Wiki 1 ya BURE</b>
          </p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,minWidth:200}}>
          <button onClick={shareWA} style={{padding:'14px 20px',borderRadius:12,border:'none',background:'#25D366',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 15px rgba(37,211,102,0.4)'}}>
            💬 Share WhatsApp
          </button>
          <button onClick={()=>copyText(refLink,'link')} style={{padding:'10px 18px',borderRadius:12,border:'2px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',backdropFilter:'blur(10px)'}}>
            {copied==='link'?'✓ COPIED':'📋 Copy Link'}
          </button>
        </div>
      </div>
      
      {/* Referral code display */}
      <div style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(10px)',borderRadius:10,padding:'12px 16px',marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{fontSize:10,opacity:0.85,fontWeight:700,letterSpacing:1}}>CODE YAKO:</div>
          <div style={{fontFamily:'monospace',fontWeight:900,fontSize:18,letterSpacing:1}}>{refCode}</div>
        </div>
        <div onClick={()=>copyText(refCode,'code')} style={{cursor:'pointer',padding:'8px 14px',background:'rgba(255,255,255,0.2)',borderRadius:8,fontSize:11,fontWeight:700}}>
          {copied==='code'?'✓ COPIED':'📋 Copy Code'}
        </div>
      </div>
    </div>
    </div>

    {/* INSTRUCTIONS */}
    <div style={{background:'#fff',borderRadius:16,padding:20,marginBottom:14,border:'1px solid #E2E8F0'}}>
      <h3 style={{fontSize:16,fontWeight:800,color:'#0B7A3B',margin:'0 0 14px'}}>📖 Maelekezo — Jinsi Inavyofanya Kazi</h3>
      
      {[
        {n:1,t:'Bonyeza "Share WhatsApp"',d:'Button ya kijani hapo juu — itafungua WhatsApp na ujumbe wako tayari. Chagua mtu unayemtuma au kikundi.'},
        {n:2,t:'Au copy link/code yako',d:'Bonyeza "Copy Link" — link itacopy. Tuma popote: SMS, Facebook, Instagram, vikundi vya WhatsApp, n.k.'},
        {n:3,t:'Rafiki yako anajisajili',d:'Akifungua link yako, atajiunga na Duka Langu. Code yako inahesabiwa automatic — sio lazima aweke chochote.'},
        {n:4,t:'Mnapata bonus wote',d:'Rafiki akilipa kwa mara ya kwanza, atapokea Wiki 1 BURE, na wewe utapokea TZS 5,000 kupunguzwa kwenye ada yako ya mwezi unaofuata!'},
      ].map(s=><div key={s.n} style={{display:'flex',gap:14,marginBottom:14,paddingBottom:14,borderBottom:'1px solid #F1F5F9'}}>
        <div style={{minWidth:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,flexShrink:0,boxShadow:'0 4px 12px rgba(11,122,59,0.3)'}}>{s.n}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:14,color:'#1E293B',marginBottom:4}}>{s.t}</div>
          <div style={{fontSize:12,color:'#64748B',lineHeight:1.6}}>{s.d}</div>
        </div>
      </div>)}
    </div>

    {/* FAIDA */}
    <div style={{background:'linear-gradient(135deg,#FFF7ED,#FFEDD5)',borderRadius:14,padding:18,border:'1px solid #FED7AA'}}>
      <h4 style={{fontSize:14,fontWeight:800,color:'#9A3412',margin:'0 0 10px'}}>💡 Vidokezo vya Mafanikio</h4>
      <ul style={{fontSize:12,color:'#7C2D12',lineHeight:1.8,margin:0,paddingLeft:20}}>
        <li>Tuma kwa <b>marafiki wenye maduka au biashara</b> — wao ndio wanahitaji</li>
        <li>Toa hadithi yako: <b>"Mfumo umenisaidia hivyo na hivyo..."</b></li>
        <li>Share kwenye <b>vikundi vya WhatsApp vya wajasiriamali</b></li>
        <li>Hakuna kikomo — leta wateja wengi upunguze ada yako kabisa!</li>
      </ul>
    </div>
  </div>;
}

// ===== PRODUCT ANALYTICS PAGE — KITAALAMU =====
export function ProductAnalyticsPage(){
  const{products,sales,returns,currency}=useApp();
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
        if(!stats[item.productId])return;
        const qty=item.qty*(item.fraction||1);
        const revenue=item.qty*item.price*(item.fraction||1);
        const profit=item.qty*(item.price-item.buyPrice)*(item.fraction||1);
        stats[item.productId].totalSold+=qty;
        stats[item.productId].totalRevenue+=revenue;
        stats[item.productId].totalProfit+=profit;
        stats[item.productId].salesCount++;
        const d=new Date(s.created_at);
        if(!stats[item.productId].lastSaleDate||d>new Date(stats[item.productId].lastSaleDate))stats[item.productId].lastSaleDate=s.created_at;
        if(!stats[item.productId].firstSaleDate||d<new Date(stats[item.productId].firstSaleDate))stats[item.productId].firstSaleDate=s.created_at;
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
    if(p.totalSold===0)return{label:'🚫 Haitoki',color:'#EF4444',bg:'#FEE2E2'};
    if(p.totalSold<5)return{label:'🐌 Polepole',color:'#F59E0B',bg:'#FEF3C7'};
    if(p.totalSold<20)return{label:'➡️ Wastani',color:'#3B82F6',bg:'#DBEAFE'};
    if(p.totalSold<50)return{label:'🔥 Mzuri',color:'#10B981',bg:'#D1FAE5'};
    return{label:'⭐ Bora Sana',color:'#0B7A3B',bg:'#DCFCE7'};
  };
  
  return <div>
    {/* HEADER */}
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>📊 Uchambuzi wa Bidhaa</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Jua bidhaa zinazokuza biashara yako na zile zinazokushushia faida</p>
    </div>
    
    {/* PERIOD FILTER */}
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {[
        {v:'today',l:'Leo'},
        {v:'week',l:'Wiki'},
        {v:'month',l:'Mwezi'},
        {v:'year',l:'Mwaka'},
        {v:'all',l:'Zote'},
      ].map(p=><button key={p.v} onClick={()=>setPeriod(p.v)} style={{padding:'8px 16px',borderRadius:10,border:period===p.v?'2px solid #0B7A3B':'1px solid #E2E8F0',background:period===p.v?'#F0FDF4':'#fff',color:period===p.v?'#0B7A3B':'#64748B',fontWeight:period===p.v?700:500,fontSize:12,cursor:'pointer'}}>{p.l}</button>)}
    </div>
    
    {/* SUMMARY STATS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14,borderLeft:'4px solid #0B7A3B'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>JUMLA YA BIDHAA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#0B7A3B'}}>{totalProducts}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #22C55E'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>MAPATO</div>
        <div style={{fontSize:18,fontWeight:900,color:'#22C55E'}}>{fm(totalRevenue)}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #3B82F6'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>FAIDA</div>
        <div style={{fontSize:18,fontWeight:900,color:'#3B82F6'}}>{fm(totalProfit)}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #F59E0B'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>ZILIZOUZWA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#F59E0B'}}>{totalSold.toFixed(0)}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #EF4444'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>HAZITOKI</div>
        <div style={{fontSize:24,fontWeight:900,color:'#EF4444'}}>{worstSeller}</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #DC2626'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>STOCK NDOGO</div>
        <div style={{fontSize:24,fontWeight:900,color:'#DC2626'}}>{lowStock}</div>
      </div>
    </div>
    
    {/* INSIGHTS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12,marginBottom:14}}>
      {/* BEST SELLER */}
      {bestSeller&&bestSeller.totalSold>0&&<div className="card" style={{padding:16,background:'linear-gradient(135deg,#DCFCE7,#FFFFFF)',border:'1px solid #BBF7D0'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{fontSize:24}}>⭐</div>
          <div>
            <div style={{fontSize:11,color:'#15803D',fontWeight:700}}>BIDHAA INAYOUZWA ZAIDI</div>
            <div style={{fontSize:16,fontWeight:900,color:'#0B7A3B'}}>{bestSeller.name}</div>
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
        <div style={{fontSize:13,fontWeight:800,color:'#0B7A3B',marginBottom:10}}>🏆 Aina Bora za Bidhaa</div>
        {topCategories.length?topCategories.map(([cat,d],i)=><div key={cat} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:i<topCategories.length-1?'1px solid #F1F5F9':'none'}}>
          <div>
            <div style={{fontSize:12,fontWeight:700}}>{i+1}. {cat}</div>
            <div style={{fontSize:10,color:'#94A3B8'}}>{d.count} bidhaa • {d.sold.toFixed(0)} zilizouzwa</div>
          </div>
          <div style={{fontWeight:800,color:'#0B7A3B',fontSize:12}}>{fm(d.revenue)}</div>
        </div>):<div style={{fontSize:11,color:'#94A3B8'}}>Hakuna data bado</div>}
      </div>
    </div>
    
    {/* SEARCH + SORT */}
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
      <input type="text" placeholder="🔍 Tafuta bidhaa..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:180,padding:'10px 14px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13}}/>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,cursor:'pointer'}}>
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
          const stockColor=stockLevel==='OUT'?'#EF4444':stockLevel==='LOW'?'#F59E0B':'#22C55E';
          return <div key={p.id} style={{padding:'14px 16px',borderBottom:'1px solid #F1F5F9',transition:'background 0.2s'}} onMouseOver={e=>e.currentTarget.style.background='#F8FAFC'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:24}}>{p.image||'📦'}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:13}}>{p.name}</span>
                    <span style={{background:c.bg,color:c.color,padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>{c.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#64748B'}}>
                    {p.category} • {p.unit} • Bei: <b>{fm(p.sellPrice)}</b>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:18,flexWrap:'wrap',fontSize:11}}>
                <div style={{textAlign:'center',minWidth:60}}>
                  <div style={{color:'#94A3B8',fontWeight:600}}>STOCK</div>
                  <div style={{fontWeight:900,fontSize:15,color:stockColor}}>{p.currentStock.toFixed(1)}</div>
                </div>
                <div style={{textAlign:'center',minWidth:60}}>
                  <div style={{color:'#94A3B8',fontWeight:600}}>ZILIZOUZWA</div>
                  <div style={{fontWeight:900,fontSize:15,color:'#3B82F6'}}>{p.totalSold.toFixed(1)}</div>
                </div>
                <div style={{textAlign:'center',minWidth:80}}>
                  <div style={{color:'#94A3B8',fontWeight:600}}>MAPATO</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#22C55E'}}>{fm(p.totalRevenue)}</div>
                </div>
                <div style={{textAlign:'center',minWidth:80}}>
                  <div style={{color:'#94A3B8',fontWeight:600}}>FAIDA</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#0B7A3B'}}>{fm(p.totalProfit)}</div>
                </div>
                {p.totalReturns>0&&<div style={{textAlign:'center',minWidth:60}}>
                  <div style={{color:'#94A3B8',fontWeight:600}}>RUDISHWA</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#EF4444'}}>{p.totalReturns.toFixed(1)}</div>
                </div>}
              </div>
            </div>
            {/* Insight bar */}
            {p.totalSold===0?<div style={{marginTop:6,padding:'6px 10px',background:'#FEE2E2',borderRadius:6,fontSize:11,color:'#991B1B'}}>
              ⚠️ <b>Tip:</b> Bidhaa hii bado haijauzwa. Fikiria kupunguza bei au kuondoa kabisa.
            </div>:p.totalSold>0&&p.totalSold<5?<div style={{marginTop:6,padding:'6px 10px',background:'#FEF3C7',borderRadius:6,fontSize:11,color:'#92400E'}}>
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
  const[tab,setTab]=useState('day');
  
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
  
  const periodLabel=tab==='day'?'Leo':tab==='week'?'Wiki Hii':'Mwezi Huu';
  
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
  
  return <div>
    {/* HEADER */}
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>📦 Bidhaa Nilizouza</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Angalia bidhaa zako ulizouza na stock iliyobaki</p>
    </div>
    
    <Tabs tabs={[
      {id:'day',label:'📅 Leo'},
      {id:'week',label:'🗓️ Wiki'},
      {id:'month',label:'📆 Mwezi Huu'},
    ]} active={tab} onChange={setTab}/>
    
    {/* Summary stats — NO MONEY */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:14}}>
      <div className="card" style={{padding:14,borderLeft:'4px solid #0B7A3B',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>MAUZO</div>
        <div style={{fontSize:26,fontWeight:900,color:'#0B7A3B'}}>{fSales.length}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>nililofanya</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #3B82F6',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>BIDHAA</div>
        <div style={{fontSize:26,fontWeight:900,color:'#3B82F6'}}>{productsSold.length}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>aina tofauti</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #22C55E',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>JUMLA</div>
        <div style={{fontSize:26,fontWeight:900,color:'#22C55E'}}>{productsSold.reduce((s,p)=>s+p.netSold,0).toFixed(1)}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>zilizouzwa</div>
      </div>
      <div className="card" style={{padding:14,borderLeft:'4px solid #F59E0B',textAlign:'center'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600}}>STOCK NDOGO</div>
        <div style={{fontSize:26,fontWeight:900,color:'#F59E0B'}}>{productsSold.filter(p=>p.stockRemaining<=p.minStock&&p.stockRemaining>0).length}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>onya bosi</div>
      </div>
    </div>
    
    {/* Products list */}
    {productsSold.length>0?<div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h3 style={{fontSize:16,fontWeight:800,margin:0,color:'#0B7A3B'}}>📋 Orodha ya Bidhaa</h3>
        <button onClick={exportList} style={{padding:'8px 16px',borderRadius:10,border:'1.5px solid #0B7A3B',background:'#fff',color:'#0B7A3B',fontWeight:700,fontSize:12,cursor:'pointer'}}>📄 Pakua PDF</button>
      </div>
      
      {/* Table header */}
      <div style={{display:'grid',gridTemplateColumns:'36px 1fr 100px 100px',gap:6,padding:'8px',background:'#0B7A3B',color:'#fff',borderRadius:6,fontSize:10,fontWeight:800,textTransform:'uppercase',marginBottom:4}}>
        <div>#</div><div>Bidhaa</div>
        <div style={{textAlign:'right'}}>Zilizouzwa</div>
        <div style={{textAlign:'right'}}>Stock Imebaki</div>
      </div>
      
      <div style={{maxHeight:500,overflowY:'auto'}}>
        {productsSold.map((p,i)=>{
          const stockColor=p.stockRemaining<=0?'#EF4444':p.stockRemaining<=p.minStock?'#F59E0B':'#22C55E';
          const stockIcon=p.stockRemaining<=0?'🚫':p.stockRemaining<=p.minStock?'⚠️':'✅';
          return <div key={p.id} style={{display:'grid',gridTemplateColumns:'36px 1fr 100px 100px',gap:6,padding:'10px 6px',borderBottom:'1px solid #F1F5F9',alignItems:'center',background:i%2===0?'#fff':'#F8FAFC'}}>
            <div style={{width:24,height:24,borderRadius:5,background:i<3?'#FEF3C7':'#F1F5F9',color:i<3?'#92400E':'#64748B',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11}}>{i+1}</div>
            <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
              <span style={{fontSize:18}}>{p.image}</span>
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:10,color:'#94A3B8'}}>{p.category} • {p.salesCount} mauzo{p.returned>0&&<span style={{color:'#EF4444'}}> • ↩️ {p.returned.toFixed(1)}</span>}</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:14,color:'#0B7A3B'}}>{p.netSold.toFixed(1)}</div>
              <div style={{fontSize:9,color:'#94A3B8'}}>{p.unit}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:900,fontSize:14,color:stockColor}}>{stockIcon} {p.stockRemaining.toFixed(1)}</div>
              <div style={{fontSize:9,color:'#94A3B8'}}>{p.unit}</div>
            </div>
          </div>;
        })}
      </div>
    </div>:<Empty icon="📦" text={`Hujauza bidhaa ${periodLabel.toLowerCase()}`}/>}
  </div>;
}
