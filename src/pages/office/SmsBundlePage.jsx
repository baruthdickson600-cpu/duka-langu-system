import React,{useState,useEffect} from 'react';
import { API_BASE } from '../../config/api';
import {useApp} from '../../context/AppContext';
import {Empty,Input,Modal} from '../../components/UI';
import {PageHead} from '../../components/Page';
import {SMS_BUNDLES,getPlan} from '../../config/plans';

const fm=n=>`TZS ${(+n||0).toLocaleString()}`;
const fmtDate=d=>d?new Date(d).toLocaleString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const KIND={debt_reminder:'Ukumbusho wa deni',receipt:'Risiti',payment_confirm:'Uthibitisho wa malipo',promo:'Tangazo',other:'Nyingine'};

export default function SmsBundlePage(){
  const{biz,bizId,user,supabase}=useApp();
  const plan=getPlan(biz?.plan);
  const[balance,setBalance]=useState(null);
  const[loading,setLoading]=useState(true);
  const[logs,setLogs]=useState([]);
  const[buying,setBuying]=useState(null);     // bundle inayonunuliwa
  const[phone,setPhone]=useState(user?.phone||biz?.phone||'');
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');
  const[err,setErr]=useState('');
  const[polling,setPolling]=useState(false);

  const loadBalance=async()=>{
    if(!bizId){setLoading(false);return}
    try{
      const r=await fetch(`${API_BASE}/api/payments?action=sms_balance&business_id=${bizId}`);
      const d=await r.json();
      setBalance(d.success?d.balance:null);
    }catch{setBalance(null)}
    setLoading(false);
  };
  const loadLogs=async()=>{
    if(!supabase||!bizId)return;
    try{
      const{data}=await supabase.from('sms_log').select('*').eq('business_id',bizId)
        .order('created_at',{ascending:false}).limit(30);
      setLogs(data||[]);
    }catch{}
  };
  useEffect(()=>{loadBalance();loadLogs();},[bizId]);

  const buy=async()=>{
    const ph=phone.trim();
    if(!ph||ph.replace(/\D/g,'').length<9)return setErr('Weka namba sahihi ya simu (mf. 0712345678).');
    setBusy(true);setErr('');setMsg('');
    try{
      const r=await fetch(API_BASE+'/api/payments?action=sms_buy',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          business_id:bizId,business_name:biz?.name,user_email:user?.email,
          phone:ph,bundle_id:buying.id,sms_count:buying.sms,amount:buying.price,
        }),
      });
      const d=await r.json();
      if(!d.success){setErr(d.error||'Imeshindwa kuanzisha malipo.');setBusy(false);return}
      setMsg(d.message||'📲 Angalia simu yako — weka PIN.');
      setBuying(null);
      // Subiri malipo: angalia kila sekunde 5 kwa hadi dakika 3
      if(d.reference){
        setPolling(true);
        let n=0;
        const t=setInterval(async()=>{
          n++;
          try{
            const s=await fetch(`${API_BASE}/api/payments?action=sms_status&reference=${encodeURIComponent(d.reference)}`);
            const sd=await s.json();
            if(sd.status==='paid'){
              clearInterval(t);setPolling(false);
              setBalance(sd.balance);setMsg(`✅ Bando limeongezwa! Salio lako sasa ni SMS ${sd.balance}.`);
              loadLogs();
            }else if(sd.status==='failed'){
              clearInterval(t);setPolling(false);setErr('Malipo hayakukamilika. Jaribu tena.');setMsg('');
            }
          }catch{}
          if(n>=36){clearInterval(t);setPolling(false);}
        },5000);
      }
    }catch(e){setErr('Tatizo: '+(e.message||''))}
    setBusy(false);
  };

  const low=balance!=null&&balance<=10;

  return <div className="page-enter" style={{paddingBottom:20}}>
    <PageHead icon="📨" title="Bando la SMS" sub="SMS za kuwatumia wateja wako"/>

    {msg&&<div style={{background:'#E6F2EC',color:'#0A6E47',padding:'11px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #0A6E47'}}>{msg}{polling&&' (inasubiri uthibitisho...)'}</div>}
    {err&&<div style={{background:'#FBECE9',color:'#C2412D',padding:'11px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #C2412D'}}>⚠️ {err}</div>}

    {/* Salio */}
    <div style={{background:low?'linear-gradient(140deg,#9B3322,#C2412D)':'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'22px',marginBottom:14,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:-30,top:-30,width:150,height:150,borderRadius:'50%',background:'rgba(242,183,5,.12)'}}/>
      <div style={{position:'relative'}}>
        <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>SALIO LAKO LA SMS</div>
        <div style={{fontSize:38,fontWeight:900,letterSpacing:'-1.5px',lineHeight:1.1,margin:'2px 0 6px'}}>
          {loading?'...':balance!=null?balance:'—'}
        </div>
        <div style={{fontSize:12,opacity:.9}}>
          {plan.icon} {plan.name} • unapata SMS {plan.smsQuota} kila mwezi
        </div>
        {low&&<div style={{marginTop:10,background:'rgba(255,255,255,.18)',padding:'8px 12px',borderRadius:10,fontSize:12,fontWeight:700}}>
          ⚠️ Salio linakaribia kuisha — nunua bando ili usikwame
        </div>}
      </div>
    </div>

    {/* Bando la kununua */}
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 4px',color:'#17231D'}}>🛒 Nunua Bando</h3>
      <p style={{fontSize:11.5,color:'#5C6A62',margin:'0 0 12px'}}>Ulizonunua hazikwishi. Bando la mwezi linaisha mwisho wa mwezi.</p>
      <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {SMS_BUNDLES.map(b=>(
          <button key={b.id} className="ripple" onClick={()=>{setBuying(b);setErr('');setMsg('')}}
            style={{padding:'14px 6px',borderRadius:14,border:'1.5px solid #D6E2DB',background:'#fff',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:19,fontWeight:900,color:'#0A6E47'}}>{b.sms}</div>
            <div style={{fontSize:9.5,color:'#5C6A62',fontWeight:700,letterSpacing:.3}}>SMS</div>
            <div style={{fontSize:12,fontWeight:800,color:'#17231D',marginTop:5}}>{(b.price/1000)}k</div>
            <div style={{fontSize:9,color:'#9AA5A0',marginTop:1}}>{Math.round(b.price/b.sms)}/sms</div>
          </button>
        ))}
      </div>
    </div>

    {/* Historia */}
    <div className="card">
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:'#17231D'}}>📜 SMS Zilizotumwa</h3>
      {logs.length?<div style={{maxHeight:380,overflowY:'auto',display:'flex',flexDirection:'column',gap:7}}>
        {logs.map(l=>(
          <div key={l.id} style={{padding:'9px 11px',borderRadius:10,background:'#F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:700,color:'#17231D'}}>{l.phone}</div>
              <div style={{fontSize:10.5,color:'#5C6A62',marginTop:1}}>{KIND[l.kind]||l.kind} • {fmtDate(l.created_at)}</div>
            </div>
            <span style={{fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:20,whiteSpace:'nowrap',
              background:l.status==='sent'?'#E6F2EC':'#FBECE9',color:l.status==='sent'?'#0A6E47':'#C2412D'}}>
              {l.status==='sent'?'IMETUMWA':'IMESHINDWA'}
            </span>
          </div>
        ))}
      </div>:<Empty icon="📨" text="Hujatuma SMS yoyote bado"/>}
    </div>

    {/* Modal ya kununua */}
    <Modal open={!!buying} onClose={()=>setBuying(null)} title="🛒 Nunua Bando la SMS">
      {buying&&<div>
        <div style={{background:'#F6F8F7',borderRadius:12,padding:'14px',marginBottom:14,textAlign:'center'}}>
          <div style={{fontSize:30,fontWeight:900,color:'#0A6E47'}}>{buying.sms}</div>
          <div style={{fontSize:11,color:'#5C6A62',fontWeight:700}}>SMS</div>
          <div style={{fontSize:17,fontWeight:800,color:'#17231D',marginTop:6}}>{fm(buying.price)}</div>
          <div style={{fontSize:11,color:'#9AA5A0'}}>Salio jipya litakuwa SMS {(balance||0)+buying.sms}</div>
        </div>
        <Input label="Namba ya simu ya kulipia" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XXXXXXXX"/>
        <div style={{background:'#FFF8E6',borderRadius:10,padding:'10px 12px',margin:'4px 0 14px',fontSize:11.5,color:'#7A5C00'}}>
          📲 Utapokea ujumbe simuni — weka PIN kuthibitisha. Bando litaongezwa papo hapo.
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setBuying(null)} style={{flex:1,padding:13,background:'#F6F8F7',color:'#5C6A62',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Ghairi</button>
          <button onClick={buy} disabled={busy} style={{flex:2,padding:13,background:busy?'#86EFAC':'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:busy?'wait':'pointer'}}>
            {busy?'Inatuma...':`⚡ Lipa ${fm(buying.price)}`}
          </button>
        </div>
      </div>}
    </Modal>
  </div>;
}
