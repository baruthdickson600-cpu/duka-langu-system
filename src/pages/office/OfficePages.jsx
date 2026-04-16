import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Sel,Btn,Stat,Modal,Badge,Tabs,Empty,EMOJIS,Area} from '../../components/UI';
import {fmtMoney,fmtDate,isToday,isThisWeek,isThisMonth,exportToPDF,exportReceiptPDF,shareWhatsApp,todayStr} from '../../utils/helpers';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell} from 'recharts';
const CL=['#0B7A3B','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

// ===== OFFICE DASHBOARD with Daily Report + Alerts =====
export function OfficeDash({onReceipt}){
  const{user,biz,products,sales,expenses,daysLeft,online,currency,lowStockProducts,lowMarginProducts,autoReorderList,getDailyReport,settings}=useApp();
  const cur=currency||'TZS';const fm=n=>fmtMoney(n,cur);
  const tSales=sales.filter(s=>isToday(s.created_at));const wSales=sales.filter(s=>isThisWeek(s.created_at));const mSales=sales.filter(s=>isThisMonth(s.created_at));
  const tTotal=tSales.reduce((a,s)=>a+s.total,0);const wTotal=wSales.reduce((a,s)=>a+s.total,0);
  const mProfit=mSales.reduce((a,s)=>a+s.profit,0);const mExp=expenses.filter(e=>isThisMonth(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const isOff=user?.role==='office';
  const dayData=useMemo(()=>{const d=[];for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);const ds=dt.toISOString().split('T')[0];const ds2=sales.filter(s=>s.created_at?.startsWith(ds));d.push({day:dt.toLocaleDateString('en',{weekday:'short'}),total:ds2.reduce((a,s)=>a+s.total,0)})}return d},[sales]);
  const prodMap={};sales.forEach(s=>s.items?.forEach(i=>{prodMap[i.name]=(prodMap[i.name]||0)+i.qty}));
  const pieData=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,q])=>({name:n,value:q}));

  // Announcement
  const ann=settings.announcement;

  return <div>
    {ann&&<div style={{background:settings.announcement_type==='warning'?'#FFF7ED':settings.announcement_type==='danger'?'#FEF2F2':'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:'10px 16px',marginBottom:12,fontSize:13,fontWeight:600}}>📢 {ann}</div>}
    {!online&&<div style={{background:'#FEF3C7',borderRadius:10,padding:'8px 16px',marginBottom:12,fontSize:13,fontWeight:600,color:'#92400E'}}>⚡ Offline Mode — mauzo yatahifadhiwa na kusawazishwa baadaye</div>}
    {isOff&&biz&&!biz.token_active&&daysLeft()<=5&&<div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
      <span style={{fontSize:13,fontWeight:600,color:'#92400E'}}>⏳ Siku {daysLeft()} zimebaki</span>
      <Btn v="warning" style={{padding:'6px 14px',fontSize:12}} onClick={()=>alert('Lipa: SELCOM > 6113 4066\nJina: PESAFLY')}>Lipa Sasa</Btn>
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
  const subtotal=cart.reduce((s,c)=>s+c.qty*c.price,0);const total=Math.max(0,subtotal-discount);
  const addToCart=p=>{if(processing)return;const ex=cart.find(c=>c.productId===p.id);if(ex){if(ex.qty>=p.quantity)return alert('Stock haitoshi!');setCart(cart.map(c=>c.productId===p.id?{...c,qty:c.qty+1}:c))}else setCart([...cart,{productId:p.id,name:p.name,price:p.sell_price,buyPrice:p.buy_price,qty:1,image:p.image}])};
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
        <div style={{maxHeight:220,overflowY:'auto'}}>{cart.map((c,i)=><div key={i} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18}}>{c.image||'📦'}</span>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{c.name}</div><div style={{fontSize:11,color:'#64748B'}}>{fm(c.price)} x {c.qty}</div></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <button disabled={processing} onClick={()=>{if(c.qty<=1)setCart(cart.filter((_,j)=>j!==i));else setCart(cart.map((x,j)=>j===i?{...x,qty:x.qty-1}:x))}} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:'4px 8px',fontWeight:700,fontSize:16,cursor:'pointer'}}>−</button>
            <span style={{fontWeight:700,minWidth:24,textAlign:'center'}}>{c.qty}</span>
            <button disabled={processing} onClick={()=>{const pr=products.find(p=>p.id===c.productId);if(pr&&c.qty>=pr.quantity)return alert('Stock haitoshi!');setCart(cart.map((x,j)=>j===i?{...x,qty:x.qty+1}:x))}} style={{background:'#F0FDF4',border:'none',borderRadius:6,padding:'4px 8px',color:'#0B7A3B',fontWeight:700,fontSize:16,cursor:'pointer'}}>+</button>
            <button disabled={processing} onClick={()=>setCart(cart.filter((_,j)=>j!==i))} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:'4px 6px',color:'#EF4444',cursor:'pointer',marginLeft:4}}>{IC.del}</button>
          </div>
          <div style={{fontWeight:700,minWidth:65,textAlign:'right',fontSize:12}}>{fm(c.qty*c.price)}</div>
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
        <Sel label="Kipimo" value={f.unit} onChange={e=>setF({...f,unit:e.target.value})} options={[{value:'Kg',label:'Kg'},{value:'Litre',label:'Lita'},{value:'Piece',label:'Kipande'},{value:'Pack',label:'Pakiti'},{value:'Box',label:'Boksi'}]}/>
        <Sel label="Aina" value={f.category} onChange={e=>setF({...f,category:e.target.value})} options={[{value:'Vyakula',label:'Vyakula'},{value:'Vinywaji',label:'Vinywaji'},{value:'Vifaa',label:'Vifaa'},{value:'Dawa',label:'Dawa'},{value:'Nyingine',label:'Nyingine'}]}/>
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
  const{sales,returns,processReturn,currency}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[modal,setModal]=useState(false);const[saleId,setSaleId]=useState('');const[reason,setReason]=useState('');const[retItems,setRetItems]=useState([]);
  const sale=sales.find(s=>s.id===saleId);

  const handleSelectSale=(sid)=>{setSaleId(sid);const s=sales.find(x=>x.id===sid);if(s)setRetItems((s.items||[]).map(i=>({...i,returnQty:0})))};
  const doReturn=async()=>{
    if(!saleId||!reason)return alert('Chagua mauzo na weka sababu!');
    const items=retItems.filter(i=>i.returnQty>0).map(i=>({productId:i.productId,name:i.name,price:i.price,qty:i.returnQty}));
    if(!items.length)return alert('Chagua bidhaa za kurudisha!');
    await processReturn(saleId,items,reason);
    alert('Bidhaa zimerudishwa na stock imesasishwa!');setModal(false);setSaleId('');setReason('');setRetItems([]);
  };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Bidhaa Zilizorudishwa ({returns.length})</h3>
      <Btn onClick={()=>setModal(true)}>{IC.refresh} Rudisha Bidhaa</Btn>
    </div>
    <div className="card">
      {returns.length?returns.map(r=><div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
          <div><div style={{fontWeight:600,fontSize:13}}>{r.items?.map(i=>`${i.name} x${i.qty}`).join(', ')}</div><div style={{fontSize:11,color:'#64748B'}}>Sababu: {r.reason} • {fmtDate(r.created_at)}</div></div>
          <div style={{fontWeight:700,color:'#EF4444'}}>{fm(r.refund_amount)}</div>
        </div>
      </div>):<Empty icon="↩️" text="Hakuna bidhaa zilizorudishwa"/>}
    </div>

    <Modal open={modal} onClose={()=>setModal(false)} title="Rudisha Bidhaa" wide>
      <Sel label="Chagua Mauzo" value={saleId} onChange={e=>handleSelectSale(e.target.value)} options={[{value:'',label:'-- Chagua --'},...sales.slice(0,20).map(s=>({value:s.id,label:`#${s.id?.slice(0,8)} - ${fm(s.total)} - ${fmtDate(s.created_at)}`}))]}/>
      {sale&&<>
        <div style={{background:'#F8FAFC',borderRadius:10,padding:12,marginBottom:12}}>
          {retItems.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #E2E8F0'}}>
            <div><span style={{fontWeight:600,fontSize:13}}>{item.name}</span><span style={{color:'#64748B',fontSize:12,marginLeft:6}}>(alinunua {item.qty})</span></div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:12}}>Rudisha:</span>
              <input type="number" min="0" max={item.qty} value={item.returnQty} onChange={e=>setRetItems(retItems.map((x,j)=>j===i?{...x,returnQty:Math.min(+e.target.value,item.qty)}:x))} style={{width:60,padding:'4px 8px',borderRadius:6,border:'1px solid #E2E8F0',textAlign:'center'}}/>
            </div>
          </div>)}
        </div>
        <Input label="Sababu ya Kurudisha" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Mf: Bidhaa imeharibika"/>
        <Btn onClick={doReturn} v="danger" style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.refresh} Kamilisha Kurudisha</Btn>
      </>}
    </Modal>
  </div>;
}

// ===== REPORTS =====
export function ReportsPage({onReceipt}){
  const{sales,expenses,currency}=useApp();const fm=n=>fmtMoney(n,currency||'TZS');const[tab,setTab]=useState('day');
  const ff=tab==='day'?isToday:tab==='week'?isThisWeek:isThisMonth;
  const fSales=sales.filter(s=>ff(s.created_at));const fTotal=fSales.reduce((a,s)=>a+s.total,0);const fProfit=fSales.reduce((a,s)=>a+s.profit,0);
  const fExp=expenses.filter(e=>ff(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const staffMap={};fSales.forEach(s=>{const n=s.seller_name||'?';staffMap[n]=(staffMap[n]||0)+s.total});const staffData=Object.entries(staffMap).map(([n,t])=>({name:n,total:t}));
  const prodMap={};fSales.forEach(s=>s.items?.forEach(i=>{prodMap[i.name]=(prodMap[i.name]||0)+i.qty}));const topProds=Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const doExport=()=>{const rows=fSales.map(s=>[fmtDate(s.created_at),s.items?.map(i=>i.name).join(', ').slice(0,30),s.seller_name||'-',s.payment_method,s.total.toLocaleString()]);exportToPDF(`Ripoti (${tab})`,['Tarehe','Bidhaa','Muuzaji','Malipo','Jumla'],rows,`ripoti-${tab}.pdf`)};
  return <div>
    <Tabs tabs={[{id:'day',label:'Siku'},{id:'week',label:'Wiki'},{id:'month',label:'Mwezi'}]} active={tab} onChange={setTab}/>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.cart} label="Mauzo" value={fm(fTotal)} color="#0B7A3B" sub={`${fSales.length}`}/>
      <Stat icon={IC.chart} label="Faida" value={fm(fProfit)} color="#3B82F6"/>
      <Stat icon={IC.wallet} label="Matumizi" value={fm(fExp)} color="#EF4444"/>
      <Stat icon={IC.dollar} label="Halisi" value={fm(fProfit-fExp)} color={fProfit-fExp>=0?'#F59E0B':'#EF4444'}/>
    </div>
    <div style={{marginBottom:12}}><Btn v="outline" onClick={doExport}>{IC.dl} PDF</Btn></div>
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
  </div>;
}

// ===== EXPENSES =====
export function ExpensesPage(){
  const{expenses,addExpense,currency}=useApp();const fm=n=>fmtMoney(n,currency||'TZS');
  const total=expenses.reduce((a,e)=>a+(e.amount||0),0);const mExp=expenses.filter(e=>isThisMonth(e.created_at)).reduce((a,e)=>a+(e.amount||0),0);
  const[f,setF]=useState({category:'kodi',description:'',amount:'',is_recurring:false,recurring_interval:'monthly'});
  const CATS=[{value:'kodi',label:'Kodi'},{value:'umeme',label:'Umeme'},{value:'maji',label:'Maji'},{value:'mishahara',label:'Mishahara'},{value:'usafiri',label:'Usafiri'},{value:'kodi_nyumba',label:'Rent'},{value:'nyingine',label:'Nyingine'}];
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

// ===== CUSTOMERS & DEBT MANAGEMENT =====
export function CustomersPage(){
  const{customers,addCustomer,updateCustomer,deleteCustomer,creditHistory,receivePayment,sales,currency,totalDebt}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[search,setSearch]=useState('');
  const[modal,setModal]=useState(false);
  const[editModal,setEditModal]=useState({open:false,cust:null});
  const[payModal,setPayModal]=useState({open:false,cust:null});
  const[histModal,setHistModal]=useState({open:false,cust:null});
  const[f,setF]=useState({name:'',phone:'',email:'',address:''});
  const[payAmt,setPayAmt]=useState('');
  const[payNote,setPayNote]=useState('');
  const[filter,setFilter]=useState('all');

  const filtered=customers.filter(c=>{
    if(search&&!c.name?.toLowerCase().includes(search.toLowerCase())&&!c.phone?.includes(search))return false;
    if(filter==='debt')return(c.credit_balance||0)>0;
    if(filter==='clear')return(c.credit_balance||0)===0;
    return true;
  }).sort((a,b)=>(b.credit_balance||0)-(a.credit_balance||0));

  const debtCount=customers.filter(c=>(c.credit_balance||0)>0).length;

  // Customer purchase history
  const getCustSales=(custId)=>sales.filter(s=>s.customer_id===custId);
  const getCustCredits=(custId)=>creditHistory.filter(t=>t.customer_id===custId);

  return <div>
    {/* Stats */}
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.people} label="Wateja" value={customers.length} color="#0B7A3B"/>
      <Stat icon={IC.wallet} label="Deni Jumla" value={fm(totalDebt)} color="#EF4444" sub={`${debtCount} wanadaiwa`}/>
      <Stat icon={IC.dollar} label="Walionunua" value={fm(customers.reduce((a,c)=>a+(c.total_spent||0),0))} color="#3B82F6"/>
    </div>

    {/* Search & Filter */}
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <div style={{display:'flex',gap:8,flex:'1 1 300px',maxWidth:400}}>
        <div style={{position:'relative',flex:1}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8'}}>{IC.find}</span>
          <input placeholder="Tafuta kwa jina au simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 10px 10px 36px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box'}}/>
        </div>
        <Sel value={filter} onChange={e=>setFilter(e.target.value)} options={[{value:'all',label:'Wote'},{value:'debt',label:'Wanadaiwa'},{value:'clear',label:'Hawadaiwi'}]} style={{width:130}}/>
      </div>
      <Btn onClick={()=>setModal(true)}>{IC.plus} Ongeza Mteja</Btn>
    </div>

    {/* Debt Summary Alert */}
    {totalDebt>0&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
      <div>
        <div style={{fontWeight:700,fontSize:14,color:'#B91C1C'}}>💰 Deni la Wateja: {fm(totalDebt)}</div>
        <div style={{fontSize:12,color:'#DC2626'}}>Wateja {debtCount} wanadaiwa — fuatilia malipo!</div>
      </div>
    </div>}

    {/* Customer Cards */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
      {filtered.map(c=>{
        const hasDebt=(c.credit_balance||0)>0;
        const custSales=getCustSales(c.id);
        const lastSale=custSales[0];
        
        return <div key={c.id} style={{background:'#fff',borderRadius:14,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:hasDebt?'2px solid #FCA5A5':'1px solid #E2E8F0'}}>
          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:hasDebt?'#FEF2F2':'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:hasDebt?'#EF4444':'#0B7A3B'}}>{c.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{c.name}</div>
                <div style={{fontSize:12,color:'#64748B'}}>{c.phone||'Hakuna simu'}</div>
                {c.address&&<div style={{fontSize:11,color:'#94A3B8'}}>{c.address}</div>}
              </div>
            </div>
            <div style={{display:'flex',gap:3}}>
              <button onClick={()=>setEditModal({open:true,cust:{...c}})} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#475569'}}>{IC.gear}</button>
              <button onClick={()=>window.confirm(`Futa "${c.name}"?`)&&deleteCustomer(c.id)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:5,cursor:'pointer',color:'#EF4444'}}>{IC.del}</button>
            </div>
          </div>

          {/* Financial Info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div style={{background:hasDebt?'#FEF2F2':'#F0FDF4',borderRadius:10,padding:'8px 10px'}}>
              <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>DENI</div>
              <div style={{fontWeight:800,fontSize:18,color:hasDebt?'#EF4444':'#22C55E'}}>{fm(c.credit_balance||0)}</div>
              {hasDebt&&<div style={{fontSize:10,color:'#EF4444',fontWeight:600}}>Anadaiwa</div>}
              {!hasDebt&&<div style={{fontSize:10,color:'#22C55E',fontWeight:600}}>Hadaiwi</div>}
            </div>
            <div style={{background:'#F8FAFC',borderRadius:10,padding:'8px 10px'}}>
              <div style={{fontSize:10,color:'#94A3B8',fontWeight:600}}>AMENUNUA</div>
              <div style={{fontWeight:800,fontSize:18,color:'#1E293B'}}>{fm(c.total_spent||0)}</div>
              <div style={{fontSize:10,color:'#64748B'}}>{custSales.length} mauzo</div>
            </div>
          </div>

          {/* Last purchase */}
          {lastSale&&<div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px',marginBottom:10,fontSize:11,color:'#64748B'}}>
            Mauzo ya mwisho: {fmtDate(lastSale.created_at)} — {fm(lastSale.total)}
          </div>}

          {/* Action Buttons */}
          <div style={{display:'flex',gap:6}}>
            {hasDebt&&<button onClick={()=>{setPayModal({open:true,cust:c});setPayAmt('');setPayNote('')}} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'none',background:'#22C55E',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>💰 Pokea Malipo</button>}
            <button onClick={()=>setHistModal({open:true,cust:c})} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',color:'#475569',fontWeight:600,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>📋 Historia</button>
          </div>
        </div>;
      })}
    </div>
    {!filtered.length&&<Empty icon="👥" text={search?'Hakuna matokeo':'Ongeza wateja wako'}/>}

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

    {/* RECEIVE PAYMENT MODAL */}
    <Modal open={payModal.open} onClose={()=>setPayModal({open:false,cust:null})} title="Pokea Malipo ya Deni">
      {payModal.cust&&<>
        <div style={{background:'#FEF2F2',borderRadius:12,padding:14,marginBottom:16,textAlign:'center'}}>
          <div style={{fontSize:13,color:'#64748B'}}>Deni la {payModal.cust.name}</div>
          <div style={{fontSize:28,fontWeight:900,color:'#EF4444'}}>{fm(payModal.cust.credit_balance||0)}</div>
        </div>
        <Input label="Kiasi cha Malipo (TZS)" type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="Mf: 5000"/>
        {/* Quick amount buttons */}
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {[5000,10000,20000,50000].map(amt=>
            <button key={amt} onClick={()=>setPayAmt(String(amt))} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #E2E8F0',background:payAmt===String(amt)?'#F0FDF4':'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:payAmt===String(amt)?'#0B7A3B':'#64748B'}}>
              {(amt/1000)}K
            </button>
          )}
          <button onClick={()=>setPayAmt(String(payModal.cust.credit_balance||0))} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #22C55E',background:'#F0FDF4',fontSize:12,fontWeight:700,cursor:'pointer',color:'#0B7A3B'}}>
            Lipa Yote
          </button>
        </div>
        <Input label="Maelezo (si lazima)" value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Mf: Malipo ya M-Pesa"/>
        {payAmt&&<div style={{background:'#F0FDF4',borderRadius:10,padding:10,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Deni sasa:</span><span style={{fontWeight:700,color:'#EF4444'}}>{fm(payModal.cust.credit_balance||0)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Analipa:</span><span style={{fontWeight:700,color:'#22C55E'}}>-{fm(+payAmt)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:800,borderTop:'2px solid #BBF7D0',paddingTop:6,marginTop:6}}><span>Baki:</span><span style={{color:(payModal.cust.credit_balance||0)-(+payAmt)>0?'#EF4444':'#22C55E'}}>{fm(Math.max(0,(payModal.cust.credit_balance||0)-(+payAmt)))}</span></div>
        </div>}
        <Btn onClick={async()=>{
          const amt=+payAmt;if(!amt||amt<=0)return alert('Weka kiasi sahihi!');
          if(amt>(payModal.cust.credit_balance||0))return alert('Kiasi ni kikubwa kuliko deni!');
          await receivePayment(payModal.cust.id,amt,payNote);
          alert(`Malipo ya ${fm(amt)} yamepokewa! Deni jipya: ${fm(Math.max(0,(payModal.cust.credit_balance||0)-amt))}`);
          setPayModal({open:false,cust:null});setPayAmt('');setPayNote('');
        }} style={{width:'100%',justifyContent:'center',marginTop:8,background:'#22C55E'}}>💰 Pokea {payAmt?fm(+payAmt):''}</Btn>
      </>}
    </Modal>

    {/* CREDIT HISTORY MODAL */}
    <Modal open={histModal.open} onClose={()=>setHistModal({open:false,cust:null})} title={`Historia - ${histModal.cust?.name||''}`} wide>
      {histModal.cust&&<>
        {/* Summary */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
          <div style={{background:'#FEF2F2',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Deni Sasa</div>
            <div style={{fontWeight:800,fontSize:18,color:'#EF4444'}}>{fm(histModal.cust.credit_balance||0)}</div>
          </div>
          <div style={{background:'#F8FAFC',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Amenunua</div>
            <div style={{fontWeight:800,fontSize:18}}>{fm(histModal.cust.total_spent||0)}</div>
          </div>
          <div style={{background:'#F0FDF4',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Mauzo</div>
            <div style={{fontWeight:800,fontSize:18,color:'#0B7A3B'}}>{getCustSales(histModal.cust.id).length}</div>
          </div>
        </div>

        {/* Transaction History */}
        <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#1E293B'}}>Shughuli za Deni</h4>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {getCustCredits(histModal.cust.id).length?getCustCredits(histModal.cust.id).map(tx=>(
            <div key={tx.id} style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:tx.type==='credit'?'#FEF2F2':'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                  {tx.type==='credit'?'📤':'💰'}
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:tx.type==='credit'?'#EF4444':'#22C55E'}}>
                    {tx.type==='credit'?'Deni Jipya':'Malipo'}
                  </div>
                  <div style={{fontSize:11,color:'#94A3B8'}}>{tx.note}</div>
                  <div style={{fontSize:10,color:'#CBD5E1'}}>{fmtDate(tx.created_at)}</div>
                </div>
              </div>
              <div style={{fontWeight:800,fontSize:14,color:tx.type==='credit'?'#EF4444':'#22C55E'}}>
                {tx.type==='credit'?'+':'-'}{fm(tx.amount)}
              </div>
            </div>
          )):<div style={{textAlign:'center',padding:20,color:'#94A3B8',fontSize:13}}>Hakuna shughuli za deni</div>}
        </div>

        {/* Purchase History */}
        <h4 style={{fontSize:14,fontWeight:700,margin:'16px 0 10px',color:'#1E293B'}}>Mauzo ({getCustSales(histModal.cust.id).length})</h4>
        <div style={{maxHeight:200,overflowY:'auto'}}>
          {getCustSales(histModal.cust.id).map(s=>(
            <div key={s.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:600,fontSize:12}}>{s.items?.map(i=>i.name).join(', ').slice(0,40)}</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(s.created_at)} • <Badge color={s.payment_method==='credit'?'#EF4444':'#22C55E'}>{s.payment_method==='credit'?'Deni':s.payment_method}</Badge></div>
              </div>
              <div style={{fontWeight:700,fontSize:13}}>{fm(s.total)}</div>
            </div>
          ))}
          {!getCustSales(histModal.cust.id).length&&<div style={{textAlign:'center',padding:12,color:'#94A3B8',fontSize:12}}>Hakuna mauzo</div>}
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
export function NotifsPage(){const{notifications,markAllRead}=useApp();
  const sty=t=>({bg:t==='danger'?'#FEF2F2':t==='warning'?'#FFF7ED':'#F0FDF4',ac:t==='danger'?'#EF4444':t==='warning'?'#F59E0B':'#22C55E',em:t==='danger'?'🚨':t==='warning'?'⚠️':'✅'});
  return <div className="card">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Arifa ({notifications.length})</h3>{notifications.length>0&&<Btn v="ghost" onClick={markAllRead}>Soma Zote</Btn>}</div>
    {!notifications.length?<Empty icon="🔔" text="Hakuna arifa"/>:notifications.slice(0,50).map(n=>{const s=sty(n.type);return <div key={n.id} style={{padding:'10px 14px',marginBottom:6,borderRadius:8,background:n.is_read?'#fff':s.bg,borderLeft:`4px solid ${s.ac}`,display:'flex',gap:10}}>
      <span style={{fontSize:20}}>{s.em}</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{n.title}</div><div style={{fontSize:12,color:'#64748B',marginTop:2}}>{n.message}</div><div style={{fontSize:10,color:'#94A3B8',marginTop:4}}>{fmtDate(n.created_at)}</div></div>
    </div>})}
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
