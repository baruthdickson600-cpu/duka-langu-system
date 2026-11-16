import React,{useState,useEffect,useMemo} from 'react';
import { API_BASE } from '../config/api';
import {useApp} from '../context/AppContext';
import {Modal} from './UI';

const fm=n=>`TZS ${(+n||0).toLocaleString()}`;

// ============================================================
// UKUMBUSHO WA DENI KWA SMS
// Hutuma kwa wateja wenye deni. Hukagua salio KABLA ya kutuma
// ili lisikatike katikati.
// ============================================================
export default function DebtReminder({onDone}){
  const{customers=[],biz,bizId,user}=useApp();
  const[open,setOpen]=useState(false);
  const[balance,setBalance]=useState(null);
  const[sel,setSel]=useState({});          // id -> true
  const[sending,setSending]=useState(false);
  const[progress,setProgress]=useState(null);
  const[result,setResult]=useState(null);
  const[err,setErr]=useState('');

  // Wadaiwa wenye namba ya simu
  const debtors=useMemo(()=>customers
    .filter(c=>(+c.credit_balance||0)>0&&(c.phone||'').replace(/\D/g,'').length>=9)
    .sort((a,b)=>(+b.credit_balance||0)-(+a.credit_balance||0)),[customers]);
  const noPhone=useMemo(()=>customers.filter(c=>(+c.credit_balance||0)>0&&(c.phone||'').replace(/\D/g,'').length<9).length,[customers]);

  const chosen=debtors.filter(c=>sel[c.id]);
  const need=chosen.length;
  const enough=balance==null||balance>=need;

  const loadBalance=async()=>{
    if(!bizId)return;
    try{
      const r=await fetch(`${API_BASE}/api/payments?action=sms_balance&business_id=${bizId}`);
      const d=await r.json();
      setBalance(d.success?d.balance:null);
    }catch{setBalance(null)}
  };
  useEffect(()=>{if(open){loadBalance();setSel(Object.fromEntries(debtors.map(c=>[c.id,true])));setResult(null);setErr('')}},[open]);

  const msgFor=c=>`${(biz?.name||'DUKA').toUpperCase()}\n\nHabari ${c.name||''},\nUna deni la ${fm(c.credit_balance)}.\nTafadhali lipa ukipata nafasi.\n\nAsante kwa kununua kwetu.${biz?.phone?`\nMawasiliano: ${biz.phone}`:''}`;

  const send=async()=>{
    if(!need)return setErr('Chagua angalau mteja mmoja.');
    if(!enough)return setErr(`Una SMS ${balance} lakini unahitaji ${need}. Nunua bando au punguza wateja.`);
    setSending(true);setErr('');setProgress({done:0,total:need});
    let sent=0,failed=0,stopped=false;
    for(const c of chosen){
      try{
        const r=await fetch(API_BASE+'/api/send-sms',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            phone:c.phone,message:msgFor(c),
            business_id:bizId,customer_id:c.id,kind:'debt_reminder',
            sent_by:user?.name||user?.email,
          }),
        });
        const d=await r.json().catch(()=>({}));
        if(d.success)sent++;
        else{
          failed++;
          // Salio limeisha katikati — simama, usiendelee kujaribu bure
          if(d.code==='NO_SMS_BALANCE'){stopped=true;break}
        }
      }catch{failed++}
      setProgress(p=>({...p,done:(p?.done||0)+1}));
    }
    setSending(false);
    setResult({sent,failed,stopped});
    loadBalance();
    onDone?.();
  };

  const toggle=id=>setSel(s=>({...s,[id]:!s[id]}));
  const allOn=debtors.length>0&&debtors.every(c=>sel[c.id]);

  if(!debtors.length&&!noPhone)return null;

  return <>
    <button onClick={()=>setOpen(true)} className="ripple"
      style={{padding:'9px 16px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',fontWeight:800,fontSize:12.5,cursor:'pointer',boxShadow:'0 6px 16px rgba(10,110,71,.25)'}}>
      📨 Kumbusha Wadaiwa ({debtors.length})
    </button>

    <Modal open={open} onClose={()=>!sending&&setOpen(false)} title="📨 Ukumbusho wa Deni">
      {result
        ? <div style={{textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:8}}>{result.sent?'✅':'⚠️'}</div>
            <div style={{fontSize:15,fontWeight:800,color:'#17231D',marginBottom:6}}>
              Zimetumwa {result.sent}{result.failed?` • Zimeshindwa ${result.failed}`:''}
            </div>
            {result.stopped&&<div style={{background:'#FBECE9',color:'#C2412D',padding:'10px 12px',borderRadius:10,fontSize:12.5,margin:'10px 0'}}>
              Salio la SMS limeisha katikati. Nunua bando ili kumalizia waliobaki.
            </div>}
            <div style={{fontSize:12.5,color:'#5C6A62',marginBottom:14}}>Salio lililobaki: <b>SMS {balance??'—'}</b></div>
            <button onClick={()=>setOpen(false)} style={{width:'100%',padding:13,background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>Sawa</button>
          </div>
        : <div>
            {/* Salio na gharama */}
            <div style={{background:enough?'#F6F8F7':'#FBECE9',borderRadius:12,padding:'12px 14px',marginBottom:12,fontSize:13}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{color:'#5C6A62'}}>Salio lako</span><b style={{color:'#17231D'}}>SMS {balance??'...'}</b>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'#5C6A62'}}>Zitakazotumika</span>
                <b style={{color:enough?'#0A6E47':'#C2412D'}}>SMS {need}</b>
              </div>
              {!enough&&<div style={{marginTop:8,fontSize:12,color:'#C2412D',fontWeight:600}}>
                ⚠️ Salio halitoshi. Nunua bando au ondoa baadhi ya wateja.
              </div>}
            </div>

            {noPhone>0&&<div style={{background:'#FFF8E6',color:'#7A5C00',padding:'9px 12px',borderRadius:10,fontSize:11.5,marginBottom:10}}>
              Wadaiwa {noPhone} hawana namba ya simu — hawatapata ujumbe.
            </div>}
            {err&&<div style={{background:'#FBECE9',color:'#C2412D',padding:'10px 12px',borderRadius:10,fontSize:12.5,marginBottom:10}}>⚠️ {err}</div>}

            {/* Orodha */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:11.5,fontWeight:800,color:'#5C6A62'}}>WADAIWA ({debtors.length})</span>
              <button onClick={()=>setSel(allOn?{}:Object.fromEntries(debtors.map(c=>[c.id,true])))}
                style={{background:'none',border:'none',color:'#0A6E47',fontWeight:700,fontSize:11.5,cursor:'pointer'}}>
                {allOn?'Ondoa wote':'Chagua wote'}
              </button>
            </div>
            <div style={{maxHeight:230,overflowY:'auto',display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
              {debtors.map(c=>(
                <label key={c.id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 11px',borderRadius:10,background:sel[c.id]?'#E6F2EC':'#F6F8F7',cursor:'pointer'}}>
                  <input type="checkbox" checked={!!sel[c.id]} onChange={()=>toggle(c.id)} style={{width:16,height:16,accentColor:'#0A6E47'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:'#17231D'}}>{c.name||'—'}</div>
                    <div style={{fontSize:10.5,color:'#5C6A62'}}>{c.phone}</div>
                  </div>
                  <b style={{fontSize:12.5,color:'#C2412D',whiteSpace:'nowrap'}}>{fm(c.credit_balance)}</b>
                </label>
              ))}
            </div>

            {sending&&progress&&<div style={{marginBottom:10}}>
              <div style={{background:'#F6F8F7',borderRadius:6,height:8,overflow:'hidden'}}>
                <div style={{width:`${Math.round(progress.done/progress.total*100)}%`,height:'100%',background:'linear-gradient(90deg,#06502F,#19C277)',transition:'width .3s'}}/>
              </div>
              <div style={{fontSize:11.5,color:'#5C6A62',marginTop:4,textAlign:'center'}}>Inatuma {progress.done}/{progress.total}...</div>
            </div>}

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setOpen(false)} disabled={sending} style={{flex:1,padding:13,background:'#F6F8F7',color:'#5C6A62',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Ghairi</button>
              <button onClick={send} disabled={sending||!need||!enough}
                style={{flex:2,padding:13,background:(sending||!need||!enough)?'#9AA5A0':'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:(sending||!need||!enough)?'not-allowed':'pointer'}}>
                {sending?'Inatuma...':`📨 Tuma kwa ${need}`}
              </button>
            </div>
          </div>}
    </Modal>
  </>;
}
