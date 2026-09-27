import React,{useState,useEffect,useRef} from 'react';
import {useApp} from '../context/AppContext';

// ============================================================
// SnapPay — Malipo ya moja kwa moja (Snippe)
// Mteja anachagua njia -> anaweka namba -> analipa -> mfumo unajifungua
// Hakuna token.
// ============================================================

const GREEN='#0B7A3B';
const PROVIDERS=[
  {id:'mpesa',   name:'M-Pesa',       color:'#E30613', emoji:'📱'},
  {id:'tigo',    name:'Mixx (Tigo/Yas)',color:'#0033A0', emoji:'📱'},
  {id:'airtel',  name:'Airtel Money', color:'#ED1C24', emoji:'📱'},
  {id:'halopesa',name:'HaloPesa',     color:'#F7941E', emoji:'📱'},
];

export default function SnapPay({amount=15000,days=30,plan='basic',onSuccess,onClose}){
  const{snippeCreatePayment,snippeCheckStatus,biz}=useApp();
  const[provider,setProvider]=useState('mpesa');
  const[phone,setPhone]=useState(biz?.phone||'');
  const[phase,setPhase]=useState('form'); // form | processing | success | failed
  const[err,setErr]=useState('');
  const[reference,setReference]=useState('');
  const[failReason,setFailReason]=useState('');
  const[elapsed,setElapsed]=useState(0);
  const pollRef=useRef(null);
  const timerRef=useRef(null);

  const fm=n=>'TZS '+Math.round(n||0).toLocaleString();

  // Safisha timers
  useEffect(()=>()=>{clearInterval(pollRef.current);clearInterval(timerRef.current);},[]);

  const startPayment=async()=>{
    setErr('');
    const clean=(phone||'').replace(/\D/g,'');
    if(clean.length<9)return setErr('Weka namba sahihi ya simu.');

    setPhase('processing');setElapsed(0);
    const res=await snippeCreatePayment({amount,phone,provider,days,plan});
    if(!res.ok){setPhase('form');setErr(res.error);return;}
    setReference(res.reference);

    // Timer ya muda
    timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000);

    // Polling ya status kila sekunde 3
    pollRef.current=setInterval(async()=>{
      const st=await snippeCheckStatus(res.reference);
      if(st.ok){
        if(st.paymentStatus==='completed'){
          clearInterval(pollRef.current);clearInterval(timerRef.current);
          setPhase('success');
          try{if(navigator.vibrate)navigator.vibrate([15,40,80]);}catch(e){}
          setTimeout(()=>onSuccess&&onSuccess(),2200);
        }else if(['failed','voided','expired'].includes(st.paymentStatus)){
          clearInterval(pollRef.current);clearInterval(timerRef.current);
          setFailReason(st.failureReason||'Malipo hayakukamilika');
          setPhase('failed');
        }
      }
    },3000);

    // Timeout baada ya dakika 3
    setTimeout(()=>{
      if(pollRef.current){clearInterval(pollRef.current);clearInterval(timerRef.current);
        setPhase(p=>p==='processing'?'failed':p);
        setFailReason('Muda umeisha. Ikiwa umelipa, mfumo utafunguka wenyewe.');
      }
    },180000);
  };

  const retry=()=>{setPhase('form');setErr('');setFailReason('');setReference('');};

  return <div style={{maxWidth:440,margin:'0 auto'}}>
    <style>{CSS}</style>

    {/* ===== FORM ===== */}
    {phase==='form'&&<div className="sp-card">
      <div className="sp-head">
        <div className="sp-plan">{(plan||'basic').toUpperCase()}</div>
        <div className="sp-amount">{fm(amount)}</div>
        <div className="sp-sub">Siku {days} • Usajili wa mfumo</div>
      </div>

      <div className="sp-body">
        <label className="sp-label">Chagua njia ya malipo</label>
        <div className="sp-providers">
          {PROVIDERS.map(p=>(
            <button key={p.id} onClick={()=>setProvider(p.id)} className={`sp-prov ${provider===p.id?'active':''}`}>
              <span className="sp-prov-emoji">{p.emoji}</span>
              <span className="sp-prov-name">{p.name}</span>
              {provider===p.id&&<span className="sp-prov-check">✓</span>}
            </button>
          ))}
        </div>

        <label className="sp-label" style={{marginTop:14}}>Namba ya simu</label>
        <input className="sp-input" type="tel" inputMode="numeric" placeholder="07XX XXX XXX" value={phone} onChange={e=>setPhone(e.target.value)}/>

        {err&&<div className="sp-err">{err}</div>}

        <button className="sp-pay-btn" onClick={startPayment}>
          🔒 Lipa {fm(amount)}
        </button>

        <div className="sp-secure">
          <span>🔒</span> Malipo salama yamelindwa • Snippe
        </div>
      </div>

      {onClose&&<button className="sp-close" onClick={onClose}>Ghairi</button>}
    </div>}

    {/* ===== PROCESSING ===== */}
    {phase==='processing'&&<div className="sp-card sp-center">
      <div className="sp-spinner"></div>
      <h3 className="sp-title">Inasubiri malipo...</h3>
      <p className="sp-msg">Angalia simu yako <b>{phone}</b><br/>Weka PIN kuidhinisha malipo ya {fm(amount)}</p>
      <div className="sp-progress"><div className="sp-progress-bar"></div></div>
      <p className="sp-timer">Muda: {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</p>
      <p className="sp-hint">Usifunge ukurasa huu. Mfumo utajifungua wenyewe malipo yakikamilika.</p>
    </div>}

    {/* ===== SUCCESS ===== */}
    {phase==='success'&&<div className="sp-card sp-center">
      <div className="sp-check-wrap">
        <svg className="sp-check" viewBox="0 0 52 52">
          <circle className="sp-check-c" cx="26" cy="26" r="24" fill="none"/>
          <path className="sp-check-m" fill="none" d="M14 27 l8 8 l16 -18"/>
        </svg>
      </div>
      <h3 className="sp-title" style={{color:GREEN}}>Malipo Yamekamilika!</h3>
      <p className="sp-msg">Mfumo wako umefunguliwa.<br/>Siku {days} zimeongezwa.</p>
    </div>}

    {/* ===== FAILED ===== */}
    {phase==='failed'&&<div className="sp-card sp-center">
      <div className="sp-fail-icon">✕</div>
      <h3 className="sp-title" style={{color:'#DC2626'}}>Malipo Hayakukamilika</h3>
      <p className="sp-msg">{failReason}</p>
      <button className="sp-pay-btn" onClick={retry} style={{marginTop:18}}>Jaribu Tena</button>
      {onClose&&<button className="sp-close" onClick={onClose}>Funga</button>}
    </div>}
  </div>;
}

const CSS=`
.sp-card{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px -12px rgba(11,122,59,.25);border:1px solid #EEF2F6;}
.sp-head{background:linear-gradient(135deg,#064E2B,#0B7A3B 60%,#16A34A);padding:26px 24px;text-align:center;color:#fff;position:relative;}
.sp-head::after{content:'';position:absolute;top:-30px;right:-20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.08);}
.sp-plan{display:inline-block;padding:4px 14px;border-radius:20px;background:rgba(255,255,255,.2);font-size:11px;font-weight:800;letter-spacing:2px;margin-bottom:10px;}
.sp-amount{font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1;}
.sp-sub{font-size:12.5px;opacity:.85;margin-top:6px;}
.sp-body{padding:22px 24px;}
.sp-label{display:block;font-size:12.5px;font-weight:700;color:#475569;margin-bottom:9px;}
.sp-providers{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.sp-prov{position:relative;display:flex;align-items:center;gap:8px;padding:13px 12px;border-radius:13px;border:1.5px solid #E2E8F0;background:#fff;cursor:pointer;transition:all .15s;text-align:left;}
.sp-prov.active{border-color:#0B7A3B;background:#F0FDF4;box-shadow:0 0 0 3px rgba(11,122,59,.1);}
.sp-prov-emoji{font-size:17px;}
.sp-prov-name{font-size:12.5px;font-weight:700;color:#334155;flex:1;}
.sp-prov-check{color:#0B7A3B;font-weight:900;}
.sp-input{width:100%;padding:13px 15px;border-radius:13px;border:1.5px solid #E2E8F0;font-size:16px;font-weight:600;outline:none;box-sizing:border-box;transition:border-color .15s;}
.sp-input:focus{border-color:#0B7A3B;}
.sp-err{background:#FEF2F2;color:#B91C1C;padding:10px 13px;border-radius:10px;font-size:12.5px;margin-top:12px;border-left:4px solid #EF4444;}
.sp-pay-btn{width:100%;padding:15px 0;border-radius:14px;border:none;background:linear-gradient(135deg,#0B7A3B,#16A34A);color:#fff;font-weight:800;font-size:15.5px;cursor:pointer;margin-top:18px;box-shadow:0 8px 20px -6px rgba(11,122,59,.5);transition:transform .15s;}
.sp-pay-btn:active{transform:scale(.98);}
.sp-secure{text-align:center;font-size:11.5px;color:#94A3B8;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:5px;}
.sp-close{display:block;width:100%;padding:12px;background:none;border:none;color:#94A3B8;font-size:13px;font-weight:600;cursor:pointer;}
.sp-center{padding:34px 26px;text-align:center;}
.sp-title{font-size:19px;font-weight:800;color:#101828;margin:16px 0 8px;}
.sp-msg{font-size:13.5px;color:#64748B;line-height:1.6;margin:0;}
.sp-spinner{width:52px;height:52px;border:4px solid #E2E8F0;border-top-color:#0B7A3B;border-radius:50%;margin:0 auto;animation:spSpin .8s linear infinite;}
@keyframes spSpin{to{transform:rotate(360deg);}}
.sp-progress{height:6px;background:#F1F5F9;border-radius:4px;overflow:hidden;margin:20px 0 10px;}
.sp-progress-bar{height:100%;width:40%;background:linear-gradient(90deg,#0B7A3B,#16A34A);border-radius:4px;animation:spProg 1.5s ease-in-out infinite;}
@keyframes spProg{0%{margin-left:-40%;}100%{margin-left:100%;}}
.sp-timer{font-size:12px;color:#94A3B8;font-weight:600;margin:6px 0 0;}
.sp-hint{font-size:11.5px;color:#B0B7C3;margin-top:14px;line-height:1.5;}
.sp-check-wrap{width:76px;height:76px;margin:0 auto;}
.sp-check{width:76px;height:76px;}
.sp-check-c{stroke:#0B7A3B;stroke-width:3;stroke-dasharray:151;stroke-dashoffset:151;animation:spCircle .5s ease forwards;}
.sp-check-m{stroke:#0B7A3B;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:44;stroke-dashoffset:44;animation:spMark .35s ease .4s forwards;}
@keyframes spCircle{to{stroke-dashoffset:0;}}
@keyframes spMark{to{stroke-dashoffset:0;}}
.sp-fail-icon{width:64px;height:64px;border-radius:50%;background:#FEF2F2;color:#DC2626;font-size:32px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto;}
@media (prefers-reduced-motion:reduce){.sp-spinner,.sp-progress-bar,.sp-check-c,.sp-check-m{animation:none !important;}.sp-check-c,.sp-check-m{stroke-dashoffset:0;}}
`;
