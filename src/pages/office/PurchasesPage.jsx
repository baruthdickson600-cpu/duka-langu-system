import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {fmtMoney,fmtDate,isToday,isThisMonth} from '../../utils/helpers';
import {Input,Sel,Modal,Empty} from '../../components/UI';

// ============================================================
// PurchasesPage — Manunuzi ya Stock (bidhaa za kuuza)
// HII SI expense. Faida haibadiliki. Ikiwa 'pesa ya duka',
// inapunguza pesa mkononi (Dashboard/Ripoti).
// ============================================================

export default function PurchasesPage(){
  const{purchases=[],addPurchase,deletePurchase,products=[],currency,activeBranch,canUseBranches}=useApp();
  const fm=n=>fmtMoney(n,currency||'TZS');
  const[modal,setModal]=useState(false);
  const[search,setSearch]=useState('');
  const[busy,setBusy]=useState(false);
  const[f,setF]=useState({productId:'',quantity:'',buyPrice:'',source:'shop',supplierName:'',note:''});

  const avail=useMemo(()=>products.filter(p=>!activeBranch||p.branch_id===activeBranch),[products,activeBranch]);

  const list=useMemo(()=>{
    let l=purchases||[];
    if(search){const s=search.toLowerCase();l=l.filter(p=>(p.product_name||'').toLowerCase().includes(s)||(p.supplier_name||'').toLowerCase().includes(s));}
    return l;
  },[purchases,search]);

  const stats=useMemo(()=>{
    const today=(purchases||[]).filter(p=>isToday(p.created_at));
    const month=(purchases||[]).filter(p=>isThisMonth(p.created_at));
    return{
      todayTotal:today.reduce((a,p)=>a+(p.total||0),0),
      todayShop:today.filter(p=>p.source==='shop').reduce((a,p)=>a+(p.total||0),0),
      monthTotal:month.reduce((a,p)=>a+(p.total||0),0),
      count:today.length,
    };
  },[purchases]);

  const selProd=avail.find(p=>p.id===f.productId);
  const total=(+f.quantity||0)*(+f.buyPrice||0);

  const pickProduct=(id)=>{
    const p=avail.find(x=>x.id===id);
    setF(prev=>({...prev,productId:id,buyPrice:p?.buy_price?String(p.buy_price):prev.buyPrice}));
  };

  const doSave=async()=>{
    if(!f.productId)return alert('Chagua bidhaa!');
    if(!f.quantity||+f.quantity<=0)return alert('Weka idadi!');
    if(!f.buyPrice||+f.buyPrice<=0)return alert('Weka bei ya kununua!');
    setBusy(true);
    const res=await addPurchase({productId:f.productId,quantity:+f.quantity,buyPrice:+f.buyPrice,source:f.source,supplierName:f.supplierName,note:f.note});
    setBusy(false);
    if(res.error)return alert('❌ '+res.error);
    alert(`✅ Manunuzi yamehifadhiwa!\n\n📦 ${selProd?.name}\nIdadi: +${f.quantity}\nGharama: ${fm(total)}\n${f.source==='shop'?'💵 Pesa ya duka imepungua':'💰 Pesa ya nje (mfukoni)'}\n\nStock imeongezeka. Faida haibadiliki.`);
    setModal(false);setF({productId:'',quantity:'',buyPrice:'',source:'shop',supplierName:'',note:''});
  };

  return <div>
    {/* HEADER */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap',marginBottom:14}}>
      <div>
        <h2 style={{fontSize:21,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>🛒 Manunuzi ya Stock</h2>
        <p style={{fontSize:12,color:'#64748B',margin:0,maxWidth:520,lineHeight:1.5}}>Rekodi unaponunua bidhaa za kuuza. Hii <b>si matumizi</b> — faida haibadiliki. Ukinunua kwa pesa ya duka, pesa mkononi inapungua.</p>
      </div>
      <button onClick={()=>setModal(true)} style={{padding:'11px 20px',borderRadius:12,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',whiteSpace:'nowrap'}}>+ Nunua Stock</button>
    </div>

    {/* STATS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
      {[
        {l:'🛒 Manunuzi Leo',v:fm(stats.todayTotal),c:'#0B7A3B'},
        {l:'💵 Pesa ya Duka (Leo)',v:fm(stats.todayShop),c:'#EF4444'},
        {l:'📆 Manunuzi Mwezi',v:fm(stats.monthTotal),c:'#3B82F6'},
        {l:'🧾 Idadi Leo',v:stats.count,c:'#8B5CF6'},
      ].map((s,i)=>(
        <div key={i} className="card" style={{padding:14}}>
          <div style={{fontSize:11,color:'#94A3B8',fontWeight:700,marginBottom:5}}>{s.l}</div>
          <div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div>
        </div>
      ))}
    </div>

    <input placeholder="🔍 Tafuta bidhaa au muuzaji..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:14,boxSizing:'border-box',outline:'none'}}/>

    {/* LIST */}
    {!list.length?<div className="card" style={{textAlign:'center',padding:36,color:'#94A3B8'}}>
      <div style={{fontSize:40,marginBottom:8}}>🛒</div>Hakuna manunuzi bado. Bonyeza "+ Nunua Stock".
    </div>:
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {list.map(p=>(
        <div key={p.id} className="card" style={{padding:'12px 15px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:160}}>
            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
              <b style={{fontSize:14,color:'#101828'}}>{p.product_name||'Bidhaa'}</b>
              <span style={{fontSize:9.5,padding:'2px 8px',borderRadius:6,fontWeight:800,background:p.source==='shop'?'#FEF2F2':'#F0FDF4',color:p.source==='shop'?'#B91C1C':'#15803D'}}>{p.source==='shop'?'💵 Pesa ya Duka':'💰 Pesa ya Nje'}</span>
            </div>
            <div style={{fontSize:11.5,color:'#98A2B3',marginTop:2}}>Idadi: +{p.quantity} • Bei: {fm(p.buy_price)} {p.supplier_name?`• ${p.supplier_name}`:''}</div>
            <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{new Date(p.created_at).toLocaleString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:16,fontWeight:900,color:'#0B7A3B'}}>{fm(p.total)}</div>
            <button onClick={()=>{if(window.confirm('Futa manunuzi haya? Stock itapunguzwa.'))deletePurchase(p.id);}} style={{marginTop:4,background:'#FEF2F2',border:'none',borderRadius:6,padding:'4px 10px',color:'#EF4444',fontSize:11,fontWeight:700,cursor:'pointer'}}>Futa</button>
          </div>
        </div>
      ))}
    </div>}

    {/* MODAL */}
    <Modal open={modal} onClose={()=>setModal(false)} title="🛒 Nunua Stock">
      <div style={{background:'#EFF6FF',borderRadius:10,padding:'9px 13px',marginBottom:14,fontSize:11.5,color:'#1E40AF'}}>
        💡 Chagua bidhaa, weka idadi uliyonunua na bei ya kununua. Stock itaongezeka. Faida HAIBADILIKI.
      </div>
      <label style={{fontSize:12.5,fontWeight:600,color:'#475569',display:'block',marginBottom:6}}>Bidhaa *</label>
      <select value={f.productId} onChange={e=>pickProduct(e.target.value)} style={{width:'100%',padding:'11px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',background:'#fff',marginBottom:12,boxSizing:'border-box'}}>
        <option value="">-- Chagua Bidhaa --</option>
        {avail.map(p=><option key={p.id} value={p.id}>{p.name} (stock: {p.quantity})</option>)}
      </select>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <Input label="Idadi *" type="number" value={f.quantity} onChange={e=>setF({...f,quantity:e.target.value})} placeholder="Mf: 50"/>
        <Input label="Bei ya Kununua (kila kimoja) *" type="number" value={f.buyPrice} onChange={e=>setF({...f,buyPrice:e.target.value})} placeholder="Mf: 800"/>
      </div>

      <label style={{fontSize:12.5,fontWeight:600,color:'#475569',display:'block',marginBottom:6}}>Pesa imetoka wapi? *</label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <button onClick={()=>setF({...f,source:'shop'})} style={{padding:'11px 8px',borderRadius:10,border:f.source==='shop'?'2px solid #EF4444':'1.5px solid #E2E8F0',background:f.source==='shop'?'#FEF2F2':'#fff',cursor:'pointer',textAlign:'center'}}>
          <div style={{fontSize:13,fontWeight:800,color:f.source==='shop'?'#B91C1C':'#64748B'}}>💵 Pesa ya Duka</div>
          <div style={{fontSize:9.5,color:'#94A3B8',marginTop:1}}>Punguza pesa mkononi</div>
        </button>
        <button onClick={()=>setF({...f,source:'external'})} style={{padding:'11px 8px',borderRadius:10,border:f.source==='external'?'2px solid #16A34A':'1.5px solid #E2E8F0',background:f.source==='external'?'#F0FDF4':'#fff',cursor:'pointer',textAlign:'center'}}>
          <div style={{fontSize:13,fontWeight:800,color:f.source==='external'?'#15803D':'#64748B'}}>💰 Pesa ya Nje</div>
          <div style={{fontSize:9.5,color:'#94A3B8',marginTop:1}}>Usiguse pesa mkononi</div>
        </button>
      </div>

      <Input label="Jina la Muuzaji (si lazima)" value={f.supplierName} onChange={e=>setF({...f,supplierName:e.target.value})} placeholder="Mf: Wakala wa jumla"/>
      <Input label="Maelezo (si lazima)" value={f.note} onChange={e=>setF({...f,note:e.target.value})} placeholder="Mf: Risiti namba..."/>

      <div style={{background:'#F8FAFC',borderRadius:10,padding:12,margin:'6px 0 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Gharama Jumla</span>
        <span style={{fontSize:19,fontWeight:900,color:'#0B7A3B'}}>{fm(total)}</span>
      </div>

      <button onClick={doSave} disabled={busy} style={{width:'100%',padding:14,borderRadius:12,border:'none',background:busy?'#86EFAC':'#0B7A3B',color:'#fff',fontWeight:800,fontSize:15,cursor:busy?'wait':'pointer'}}>{busy?'⏳ Inahifadhi...':'✅ Hifadhi Manunuzi'}</button>
    </Modal>
  </div>;
}
