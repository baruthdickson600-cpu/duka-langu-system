import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {fmtMoney,payLabel} from '../../utils/helpers';

// ============================================================
// OrdersPage — Pending Orders + Partial Payments (V1.2)
// Orders hazihesabiki kama mauzo hadi zikamilike.
// ============================================================

const STATUS={
  pending:{l:'Inasubiri',c:'#F59E0B',bg:'#FFF7ED'},
  partial:{l:'Sehemu',c:'#3B82F6',bg:'#EFF6FF'},
  completed:{l:'Imekamilika',c:'#16A34A',bg:'#F0FDF4'},
  cancelled:{l:'Imeghairiwa',c:'#94A3B8',bg:'#F1F5F9'},
};

const PAY_OPTS=[
  {v:'cash',l:'💵 Taslimu'},{v:'mpesa',l:'M-Pesa'},{v:'airtel',l:'Airtel'},
  {v:'tigo',l:'Tigo'},{v:'halopesa',l:'HaloPesa'},{v:'nmb',l:'🏦 NMB'},{v:'crdb',l:'🏦 CRDB'},
];

export default function OrdersPage(){
  const{orders,addOrderPayment,cancelOrder,getOrderPayments,currency}=useApp();
  const[tab,setTab]=useState('active');
  const[search,setSearch]=useState('');
  const[payModal,setPayModal]=useState(null);
  const[payAmt,setPayAmt]=useState('');
  const[payMethod,setPayMethod]=useState('cash');
  const[busy,setBusy]=useState(false);
  const[histModal,setHistModal]=useState(null);
  const[history,setHistory]=useState([]);
  const fm=n=>fmtMoney(n,currency||'TZS');

  const filtered=useMemo(()=>{
    let list=orders||[];
    if(tab==='active')list=list.filter(o=>o.status==='pending'||o.status==='partial');
    else if(tab==='completed')list=list.filter(o=>o.status==='completed');
    else if(tab==='cancelled')list=list.filter(o=>o.status==='cancelled');
    if(search){const s=search.toLowerCase();list=list.filter(o=>(o.customer_name||'').toLowerCase().includes(s)||(o.order_number||'').toLowerCase().includes(s)||(o.customer_phone||'').includes(search));}
    return list;
  },[orders,tab,search]);

  const stats=useMemo(()=>{
    const active=(orders||[]).filter(o=>o.status==='pending'||o.status==='partial');
    return{
      count:active.length,
      value:active.reduce((a,o)=>a+(o.total||0),0),
      remaining:active.reduce((a,o)=>a+(o.remaining_amount||0),0),
      collected:active.reduce((a,o)=>a+(o.paid_amount||0),0),
    };
  },[orders]);

  const openHistory=async(order)=>{
    setHistModal(order);
    const h=await getOrderPayments(order.id);
    setHistory(h);
  };

  const doPay=async()=>{
    if(!payAmt||+payAmt<=0)return;
    setBusy(true);
    const res=await addOrderPayment(payModal.id,+payAmt,payMethod);
    setBusy(false);
    if(res.error)return alert(res.error);
    if(res.status==='completed')alert('✅ Order imekamilika! Sasa imehesabiwa kama mauzo.');
    else alert(`✅ Malipo yamepokelewa. Imebaki: ${fm(res.remaining)}`);
    setPayModal(null);setPayAmt('');setPayMethod('cash');
  };

  const doCancel=async(order)=>{
    if(!window.confirm(`Ghairi order ${order.order_number}? Stock itarudishwa.`))return;
    const res=await cancelOrder(order.id);
    if(res.error)alert(res.error);
  };

  const TABS=[['active',`Zinazoendelea (${stats.count})`],['completed','Zilizokamilika'],['cancelled','Zilizoghairiwa']];

  return <div>
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:21,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>📋 Oda (Pending Orders)</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Oda za wateja kabla ya malipo kamili. Hazihesabiki kama mauzo hadi zikamilike.</p>
    </div>

    {/* Stats */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
      {[
        {l:'Oda Zinazoendelea',v:stats.count,c:'#F59E0B',icon:'📋'},
        {l:'Thamani Jumla',v:fm(stats.value),c:'#3B82F6',icon:'💰'},
        {l:'Imelipwa',v:fm(stats.collected),c:'#16A34A',icon:'✅'},
        {l:'Imebaki',v:fm(stats.remaining),c:'#EF4444',icon:'⏳'},
      ].map((s,i)=>(
        <div key={i} className="card" style={{padding:14}}>
          <div style={{fontSize:11,color:'#94A3B8',fontWeight:700,marginBottom:5}}>{s.icon} {s.l}</div>
          <div style={{fontSize:19,fontWeight:900,color:s.c}}>{s.v}</div>
        </div>
      ))}
    </div>

    {/* Tabs */}
    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
      {TABS.map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:'8px 14px',borderRadius:10,border:'none',fontWeight:700,fontSize:12.5,cursor:'pointer',background:tab===id?'#0B7A3B':'#F1F5F9',color:tab===id?'#fff':'#64748B'}}>{l}</button>
      ))}
    </div>

    <input placeholder="🔍 Tafuta oda, mteja, au simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:14,boxSizing:'border-box',outline:'none'}}/>

    {/* Orders list */}
    {!filtered.length?<div className="card" style={{textAlign:'center',padding:36,color:'#94A3B8'}}>
      <div style={{fontSize:40,marginBottom:8}}>📋</div>Hakuna oda hapa
    </div>:
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {filtered.map(o=>{
        const st=STATUS[o.status]||STATUS.pending;
        return <div key={o.id} className="card" style={{padding:'13px 15px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:150}}>
              <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:3}}>
                <b style={{fontSize:14,color:'#101828'}}>{o.customer_name||'Mteja'}</b>
                <span style={{fontSize:9.5,padding:'2px 8px',borderRadius:6,background:st.bg,color:st.c,fontWeight:800}}>{st.l}</span>
              </div>
              <div style={{fontSize:11.5,color:'#98A2B3'}}>{o.order_number} • {(o.items||[]).length} bidhaa {o.customer_phone?`• ${o.customer_phone}`:''}</div>
              <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{new Date(o.created_at).toLocaleString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#0B7A3B'}}>{fm(o.total)}</div>
              {o.status==='partial'&&<div style={{fontSize:11,color:'#EF4444',fontWeight:600}}>Imebaki: {fm(o.remaining_amount)}</div>}
              {o.status==='partial'&&<div style={{fontSize:10.5,color:'#16A34A'}}>Imelipwa: {fm(o.paid_amount)}</div>}
            </div>
          </div>

          {/* Progress bar (partial) */}
          {o.status==='partial'&&<div style={{height:6,background:'#F1F5F9',borderRadius:3,overflow:'hidden',margin:'8px 0'}}>
            <div style={{height:'100%',width:`${Math.min(100,(o.paid_amount/o.total)*100)}%`,background:'linear-gradient(90deg,#3B82F6,#16A34A)',borderRadius:3}}/>
          </div>}

          {/* Actions */}
          {(o.status==='pending'||o.status==='partial')&&<div style={{display:'flex',gap:6,marginTop:9,flexWrap:'wrap'}}>
            <button onClick={()=>{setPayModal(o);setPayAmt(String(o.remaining_amount||o.total));}} style={{flex:1,padding:'8px 0',borderRadius:8,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>💰 Lipa</button>
            <button onClick={()=>openHistory(o)} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontWeight:600,fontSize:12,cursor:'pointer'}}>Historia</button>
            <button onClick={()=>doCancel(o)} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #FECACA',background:'#FEF2F2',color:'#DC2626',fontWeight:600,fontSize:12,cursor:'pointer'}}>Ghairi</button>
          </div>}
          {o.status==='completed'&&<div style={{marginTop:8}}><button onClick={()=>openHistory(o)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontWeight:600,fontSize:11.5,cursor:'pointer'}}>Ona Historia ya Malipo</button></div>}
        </div>;
      })}
    </div>}

    {/* Pay modal */}
    {payModal&&<div onClick={()=>setPayModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:18,padding:22,maxWidth:400,width:'100%'}}>
        <h3 style={{fontSize:17,fontWeight:800,margin:'0 0 4px'}}>💰 Lipa Oda</h3>
        <p style={{fontSize:12.5,color:'#64748B',margin:'0 0 16px'}}>{payModal.customer_name} • {payModal.order_number}</p>
        <div style={{background:'#F8FAFC',borderRadius:10,padding:12,marginBottom:14,fontSize:13}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#64748B'}}>Jumla</span><b>{fm(payModal.total)}</b></div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#64748B'}}>Imelipwa</span><b style={{color:'#16A34A'}}>{fm(payModal.paid_amount)}</b></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#64748B'}}>Inabaki</span><b style={{color:'#EF4444'}}>{fm(payModal.remaining_amount)}</b></div>
        </div>
        <label style={{fontSize:12.5,fontWeight:600,color:'#475569',display:'block',marginBottom:6}}>Kiasi cha kulipa</label>
        <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:16,fontWeight:700,boxSizing:'border-box',marginBottom:12,outline:'none'}}/>
        <div style={{display:'flex',gap:5,marginBottom:12}}>
          <button onClick={()=>setPayAmt(String(payModal.remaining_amount))} style={{flex:1,padding:'7px 0',borderRadius:8,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#0B7A3B',fontWeight:700,fontSize:11.5,cursor:'pointer'}}>Lipa Yote</button>
          <button onClick={()=>setPayAmt(String(Math.round(payModal.remaining_amount/2)))} style={{flex:1,padding:'7px 0',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',color:'#64748B',fontWeight:600,fontSize:11.5,cursor:'pointer'}}>Nusu</button>
        </div>
        <label style={{fontSize:12.5,fontWeight:600,color:'#475569',display:'block',marginBottom:6}}>Njia ya malipo</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:16}}>
          {PAY_OPTS.map(m=><button key={m.v} onClick={()=>setPayMethod(m.v)} style={{padding:'8px 4px',borderRadius:8,border:payMethod===m.v?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:payMethod===m.v?'#F0FDF4':'#fff',fontSize:11,fontWeight:700,color:payMethod===m.v?'#0B7A3B':'#64748B',cursor:'pointer'}}>{m.l}</button>)}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setPayModal(null)} style={{flex:1,padding:12,borderRadius:12,border:'none',background:'#F1F5F9',color:'#64748B',fontWeight:700,cursor:'pointer'}}>Ghairi</button>
          <button onClick={doPay} disabled={busy} style={{flex:2,padding:12,borderRadius:12,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:800,cursor:'pointer'}}>{busy?'Inatuma...':'✅ Pokea Malipo'}</button>
        </div>
      </div>
    </div>}

    {/* History modal */}
    {histModal&&<div onClick={()=>setHistModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:18,padding:22,maxWidth:400,width:'100%',maxHeight:'80vh',overflow:'auto'}}>
        <h3 style={{fontSize:17,fontWeight:800,margin:'0 0 4px'}}>Historia ya Malipo</h3>
        <p style={{fontSize:12.5,color:'#64748B',margin:'0 0 16px'}}>{histModal.order_number}</p>
        {!history.length?<p style={{color:'#94A3B8',fontSize:13}}>Hakuna malipo bado.</p>:
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {history.map((p,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'#F8FAFC',borderRadius:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:13.5,color:'#0B7A3B'}}>{fm(p.amount)}</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>{payLabel(p.payment_method)} • {new Date(p.created_at).toLocaleString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <span style={{fontSize:16}}>✅</span>
            </div>
          ))}
        </div>}
        <button onClick={()=>setHistModal(null)} style={{width:'100%',marginTop:16,padding:12,borderRadius:12,border:'none',background:'#F1F5F9',color:'#64748B',fontWeight:700,cursor:'pointer'}}>Funga</button>
      </div>
    </div>}
  </div>;
}
