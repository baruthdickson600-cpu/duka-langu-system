import React,{useState,useRef,useEffect,useCallback} from 'react';
import {useApp} from '../context/AppContext';

// ============================================================
// DukaLangu Signature DNA OTP Animation + Password Reset
// Njia A: Supabase email OTP (signInWithOtp -> verifyOtp -> updateUser)
// Backend inathibitisha OTP KABLA ya success animation.
// ============================================================

const GREEN='#0B7A3B';
const GREEN_LIGHT='#16A34A';

// Heshimu prefers-reduced-motion
const prefersReduced=()=>{
  try{return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  catch(e){return false;}
};

// Haptic feedback (kama device inaruhusu)
const haptic=(pattern)=>{
  try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(e){}
};

export default function OtpReset({email,onDone,onBack}){
  const{sendResetOtp,verifyResetOtp,setNewPassword}=useApp();
  const[phase,setPhase]=useState('otp'); // otp | verifying | success | password
  const[digits,setDigits]=useState(['','','','','','']);
  const[err,setErr]=useState('');
  const[expired,setExpired]=useState(false);
  const[shake,setShake]=useState(false);
  const[resending,setResending]=useState(false);
  const[cooldown,setCooldown]=useState(0);
  const inputs=useRef([]);
  const reduced=prefersReduced();

  // Cooldown ya "Tuma tena"
  useEffect(()=>{
    if(cooldown<=0)return;
    const t=setInterval(()=>setCooldown(c=>c-1),1000);
    return()=>clearInterval(t);
  },[cooldown]);

  // Focus ya kwanza
  useEffect(()=>{setTimeout(()=>inputs.current[0]?.focus(),300);},[]);

  const focusIndex=(i)=>{if(i>=0&&i<6)inputs.current[i]?.focus();};

  const handleChange=(i,val)=>{
    setErr('');setExpired(false);
    const clean=val.replace(/\D/g,'');
    if(!clean){
      // backspace/clear
      const next=[...digits];next[i]='';setDigits(next);
      return;
    }
    // Kama ame-paste tarakimu nyingi
    if(clean.length>1){
      const next=[...digits];
      for(let k=0;k<6;k++){next[k]=clean[k]||'';}
      setDigits(next);
      const last=Math.min(clean.length,6)-1;
      focusIndex(last<5?last+1:5);
      if(clean.length>=6)autoVerify(next.join(''));
      return;
    }
    const next=[...digits];next[i]=clean;setDigits(next);
    if(i<5)focusIndex(i+1);
    // Digit ya 6 ikiingia -> auto verify
    if(i===5||next.every(d=>d!=='')){
      const code=next.join('');
      if(code.length===6)autoVerify(code);
    }
  };

  const handleKeyDown=(i,e)=>{
    if(e.key==='Backspace'&&!digits[i]&&i>0){
      focusIndex(i-1);
      const next=[...digits];next[i-1]='';setDigits(next);
    }
    if(e.key==='ArrowLeft'&&i>0)focusIndex(i-1);
    if(e.key==='ArrowRight'&&i<5)focusIndex(i+1);
  };

  const handlePaste=(e)=>{
    e.preventDefault();
    const text=(e.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,6);
    if(!text)return;
    const next=['','','','','',''];
    for(let k=0;k<text.length;k++)next[k]=text[k];
    setDigits(next);
    focusIndex(Math.min(text.length,6)-1);
    if(text.length>=6)autoVerify(text);
  };

  // ===== AUTO VERIFICATION (backend kwanza, kisha animation) =====
  const autoVerify=useCallback(async(code)=>{
    if(phase==='verifying'||phase==='success')return;
    setPhase('verifying');
    setErr('');
    haptic(20);

    const res=await verifyResetOtp(email,code);

    if(res.ok){
      // Backend imethibitisha -> ANZA success animation
      haptic([15,40,80]);
      setPhase('success');
      const successDelay=reduced?600:2600; // muda wa animation
      setTimeout(()=>setPhase('password'),successDelay);
    }else{
      // Kosa -> capsule itikisike, rudi kwenye boxes
      haptic([60,30,60]);
      if(res.error==='expired'){
        setExpired(true);
        setErr('Code imeisha muda.');
      }else{
        setErr('Code si sahihi. Tafadhali jaribu tena.');
      }
      setShake(true);
      setTimeout(()=>setShake(false),reduced?0:500);
      setPhase('otp');
      setDigits(['','','','','','']);
      setTimeout(()=>focusIndex(0),reduced?0:520);
    }
  },[email,phase,reduced,verifyResetOtp]);

  const resend=async()=>{
    if(cooldown>0||resending)return;
    setResending(true);setErr('');setExpired(false);
    const res=await sendResetOtp(email);
    setResending(false);
    if(res.ok){setCooldown(45);setDigits(['','','','','','']);focusIndex(0);}
    else setErr(res.error||'Imeshindwa kutuma. Jaribu tena.');
  };

  const code=digits.join('');

  return <div style={{width:'100%'}}>
    <style>{OTP_CSS}</style>

    {phase!=='password'&&<>
      <h3 style={{fontSize:20,fontWeight:800,color:'#1E293B',margin:'0 0 6px'}}>Thibitisha Code</h3>
      <p style={{fontSize:13,color:'#64748B',marginBottom:20,lineHeight:1.5}}>
        Tumetuma code ya tarakimu 6 kwa<br/><b style={{color:GREEN}}>{email}</b>
      </p>

      {/* ===== OTP STAGE ===== */}
      <div className={`otp-stage ${phase==='verifying'||phase==='success'?'dna-active':''} ${shake&&!reduced?'otp-shake':''}`}>

        {/* OTP boxes (zinakunjika kuwa capsule) */}
        <div className={`otp-boxes ${phase==='verifying'||phase==='success'?'merge':''}`}>
          {digits.map((d,i)=>(
            <input
              key={i}
              ref={el=>inputs.current[i]=el}
              type="tel"
              inputMode="numeric"
              autoComplete={i===0?'one-time-code':'off'}
              maxLength={6}
              value={d}
              disabled={phase==='verifying'||phase==='success'}
              onChange={e=>handleChange(i,e.target.value)}
              onKeyDown={e=>handleKeyDown(i,e)}
              onPaste={handlePaste}
              className={`otp-box ${err&&!expired?'otp-box-err':''} ${d?'otp-box-filled':''}`}
            />
          ))}
        </div>

        {/* Capsule + DNA + Logo + Check (inaonekana wakati wa verify/success) */}
        {(phase==='verifying'||phase==='success')&&(
          <div className="dna-wrap" aria-hidden="true">
            <div className={`capsule ${phase==='success'?'cap-success':''}`}>
              <div className="wave"></div>
              {/* Mistari miwili ya DNA */}
              {!reduced&&<>
                <span className="dna-line dna-l"></span>
                <span className="dna-line dna-r"></span>
              </>}
            </div>

            {phase==='success'&&(
              <div className="reveal">
                {/* Logo (inatumia iliyopo kwenye project) */}
                <img src="/logo-white.png" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/logo.png';}} alt="DukaLangu" className="reveal-logo"/>
                {/* Animated checkmark */}
                <svg className="check-svg" viewBox="0 0 52 52">
                  <circle className="check-circle" cx="26" cy="26" r="24" fill="none"/>
                  <path className="check-mark" fill="none" d="M14 27 l8 8 l16 -18"/>
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ujumbe wa hali */}
      {phase==='success'&&(
        <div className="success-text">
          <div className="st-1">Imethibitishwa!</div>
          <div className="st-2">Tunaandaa akaunti yako...</div>
        </div>
      )}

      {phase==='verifying'&&(
        <p style={{textAlign:'center',fontSize:13,color:GREEN,fontWeight:600,marginTop:16}}>Inathibitisha...</p>
      )}

      {/* Makosa */}
      {phase==='otp'&&err&&(
        <div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginTop:16,borderLeft:'4px solid #EF4444',textAlign:'center'}}>
          {err}
        </div>
      )}

      {/* Tuma code mpya */}
      {phase==='otp'&&(
        <div style={{textAlign:'center',marginTop:20}}>
          {expired||err?(
            <button onClick={resend} disabled={cooldown>0||resending} style={{background:cooldown>0?'#E2E8F0':GREEN,color:cooldown>0?'#94A3B8':'#fff',border:'none',borderRadius:10,padding:'10px 20px',fontWeight:700,fontSize:13,cursor:cooldown>0?'default':'pointer'}}>
              {resending?'Inatuma...':cooldown>0?`Subiri ${cooldown}s`:'Tuma Code Mpya'}
            </button>
          ):(
            <p style={{fontSize:12.5,color:'#64748B',margin:0}}>
              Hujapokea code?{' '}
              <span onClick={resend} style={{color:cooldown>0?'#94A3B8':GREEN,fontWeight:700,cursor:cooldown>0?'default':'pointer'}}>
                {cooldown>0?`Subiri ${cooldown}s`:'Tuma tena'}
              </span>
            </p>
          )}
          <p onClick={onBack} style={{marginTop:14,color:'#0B7A3B',cursor:'pointer',fontWeight:700,fontSize:13}}>← Rudi kwenye Login</p>
        </div>
      )}
    </>}

    {/* ===== PASSWORD MPYA ===== */}
    {phase==='password'&&(
      <div className="pw-slide">
        <NewPasswordForm setNewPassword={setNewPassword} onDone={onDone}/>
      </div>
    )}
  </div>;
}

// ============================================================
// SET NEW PASSWORD
// ============================================================
function NewPasswordForm({setNewPassword,onDone}){
  const[pw,setPw]=useState('');
  const[pw2,setPw2]=useState('');
  const[show,setShow]=useState(false);
  const[show2,setShow2]=useState(false);
  const[err,setErr]=useState('');
  const[busy,setBusy]=useState(false);

  const rules=[
    {ok:pw.length>=8,label:'Herufi 8 au zaidi'},
    {ok:/[A-Z]/.test(pw),label:'Herufi kubwa 1 (A-Z)'},
    {ok:/[0-9]/.test(pw),label:'Namba 1 (0-9)'},
    {ok:/[^A-Za-z0-9]/.test(pw),label:'Alama maalum 1 (!@#$...)'},
  ];
  const passed=rules.filter(r=>r.ok).length;
  const strength=passed===0?0:passed===1?1:passed===2?2:passed===3?3:4;
  const strengthLabel=['','Dhaifu','Wastani','Nzuri','Imara'][strength];
  const strengthColor=['#E2E8F0','#EF4444','#F59E0B','#3B82F6','#16A34A'][strength];
  const allOk=rules.every(r=>r.ok);

  const submit=async()=>{
    setErr('');
    if(!allOk)return setErr('Password haijakidhi masharti yote.');
    if(pw!==pw2)return setErr('Password hazifanani.');
    setBusy(true);
    const res=await setNewPassword(pw);
    setBusy(false);
    if(res.ok){haptic([15,40,80]);onDone&&onDone();}
    else setErr(res.error||'Imeshindwa kubadilisha password.');
  };

  const eye=(v)=>(
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {v?<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>
        :<><path d="M17.94 17.94A10 10 0 0 1 12 20c-6.5 0-10-8-10-8a18 18 0 0 1 5-6M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>}
    </svg>
  );

  const inpWrap={position:'relative',marginBottom:14};
  const inp={width:'100%',padding:'12px 44px 12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',boxSizing:'border-box'};
  const eyeBtn={position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#94A3B8',cursor:'pointer',padding:0,display:'flex'};

  return <div>
    <h3 style={{fontSize:20,fontWeight:800,color:'#1E293B',margin:'0 0 6px'}}>Unda Password Mpya</h3>
    <p style={{fontSize:13,color:'#64748B',marginBottom:20}}>Chagua password imara ili kulinda akaunti yako.</p>

    {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:14,borderLeft:'4px solid #EF4444'}}>{err}</div>}

    <label style={{fontSize:12.5,fontWeight:600,color:'#475569',display:'block',marginBottom:6}}>Password Mpya</label>
    <div style={inpWrap}>
      <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={inp}/>
      <button type="button" onClick={()=>setShow(s=>!s)} style={eyeBtn}>{eye(show)}</button>
    </div>

    {/* Strength indicator */}
    {pw&&<div style={{marginTop:-6,marginBottom:14}}>
      <div style={{display:'flex',gap:5,marginBottom:8}}>
        {[1,2,3,4].map(n=>(
          <div key={n} style={{flex:1,height:5,borderRadius:3,background:n<=strength?strengthColor:'#E2E8F0',transition:'all 0.3s'}}/>
        ))}
      </div>
      <div style={{fontSize:11.5,fontWeight:700,color:strengthColor,marginBottom:8}}>{strengthLabel}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 10px'}}>
        {rules.map((r,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:r.ok?'#16A34A':'#94A3B8'}}>
            <span style={{fontSize:12}}>{r.ok?'✓':'○'}</span>{r.label}
          </div>
        ))}
      </div>
    </div>}

    <label style={{fontSize:12.5,fontWeight:600,color:'#475569',display:'block',marginBottom:6}}>Rudia Password</label>
    <div style={inpWrap}>
      <input type={show2?'text':'password'} value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" style={{...inp,borderColor:pw2&&pw!==pw2?'#EF4444':'#E2E8F0'}} onKeyDown={e=>e.key==='Enter'&&submit()}/>
      <button type="button" onClick={()=>setShow2(s=>!s)} style={eyeBtn}>{eye(show2)}</button>
    </div>
    {pw2&&pw!==pw2&&<div style={{fontSize:11,color:'#EF4444',marginTop:-8,marginBottom:12}}>Password hazifanani</div>}

    <button onClick={submit} disabled={busy||!allOk||pw!==pw2} style={{width:'100%',padding:'13px 0',borderRadius:12,border:'none',fontWeight:800,fontSize:15,cursor:busy||!allOk?'default':'pointer',background:(!allOk||pw!==pw2)?'#CBD5E1':GREEN,color:'#fff',transition:'all 0.2s'}}>
      {busy?'Inahifadhi...':'Hifadhi Password Mpya'}
    </button>
  </div>;
}

// ============================================================
// CSS — transform/opacity tu (GPU-friendly, no layout thrash)
// ============================================================
const OTP_CSS=`
.otp-stage{position:relative;min-height:76px;display:flex;align-items:center;justify-content:center;}
.otp-boxes{display:flex;gap:9px;justify-content:center;transition:opacity .2s ease;}
.otp-box{width:46px;height:56px;border:1.5px solid #E2E8F0;border-radius:13px;text-align:center;font-size:24px;font-weight:800;color:#0B7A3B;outline:none;background:#fff;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;-moz-appearance:textfield;}
.otp-box::-webkit-outer-spin-button,.otp-box::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
.otp-box:focus{border-color:#0B7A3B;box-shadow:0 0 0 3px rgba(11,122,59,.14);transform:translateY(-2px);}
.otp-box-filled{border-color:#0B7A3B;background:#F0FDF4;}
.otp-box-err{border-color:#EF4444 !important;background:#FEF2F2 !important;}

@media (max-width:360px){.otp-box{width:40px;height:50px;font-size:20px;gap:6px;}.otp-boxes{gap:6px;}}

/* Boxes zinakunjika kuelekea center -> capsule */
.otp-boxes.merge{opacity:0;transform:scaleX(.15);transition:opacity .25s ease,transform .25s cubic-bezier(.5,0,.3,1);pointer-events:none;position:absolute;}

/* ===== CAPSULE ===== */
.dna-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
.capsule{position:relative;width:120px;height:52px;border-radius:26px;background:linear-gradient(135deg,#0B7A3B,#16A34A);box-shadow:0 8px 24px -6px rgba(11,122,59,.55),0 0 0 4px rgba(11,122,59,.10);opacity:0;transform:scale(.2);animation:capIn .25s cubic-bezier(.34,1.56,.64,1) forwards;overflow:hidden;}
@keyframes capIn{to{opacity:1;transform:scale(1);}}

/* Emerald wave kutoka center */
.wave{position:absolute;top:50%;left:50%;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.55);transform:translate(-50%,-50%) scale(0);animation:waveOut .35s ease-out .18s forwards;}
@keyframes waveOut{to{transform:translate(-50%,-50%) scale(9);opacity:0;}}

/* Mistari miwili ya emerald inayozunguka capsule (DNA -> D) */
.dna-line{position:absolute;top:50%;left:50%;width:60px;height:4px;border-radius:4px;background:rgba(255,255,255,.9);box-shadow:0 0 10px rgba(255,255,255,.7);transform-origin:center;opacity:0;}
.dna-l{animation:dnaL .8s ease-in-out .3s forwards;}
.dna-r{animation:dnaR .8s ease-in-out .3s forwards;}
@keyframes dnaL{0%{opacity:0;transform:translate(-50%,-50%) rotate(0) translateX(-40px) scaleX(.3);}40%{opacity:1;}100%{opacity:.9;transform:translate(-50%,-50%) rotate(200deg) translateX(-18px) scaleX(1);}}
@keyframes dnaR{0%{opacity:0;transform:translate(-50%,-50%) rotate(180deg) translateX(40px) scaleX(.3);}40%{opacity:1;}100%{opacity:.9;transform:translate(-50%,-50%) rotate(-20deg) translateX(18px) scaleX(1);}}

.cap-success{animation:capIn .25s cubic-bezier(.34,1.56,.64,1) forwards,capMorph .3s ease .1s forwards;}
@keyframes capMorph{to{width:64px;height:64px;border-radius:20px;}}

/* Logo reveal + checkmark */
.reveal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
.reveal-logo{max-width:90px;max-height:40px;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,.25));opacity:0;transform:scale(.4);animation:logoIn .3s cubic-bezier(.34,1.56,.64,1) .1s forwards,logoOut .3s ease .55s forwards;}
@keyframes logoIn{to{opacity:1;transform:scale(1);}}
@keyframes logoOut{to{opacity:0;transform:scale(.7);}}

.check-svg{position:absolute;width:60px;height:60px;opacity:0;animation:checkShow .01s linear .85s forwards;}
.check-circle{stroke:#0B7A3B;stroke-width:3;stroke-dasharray:151;stroke-dashoffset:151;animation:checkCircle .5s ease .85s forwards;}
.check-mark{stroke:#0B7A3B;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:44;stroke-dashoffset:44;animation:checkMark .35s ease 1.15s forwards;}
@keyframes checkShow{to{opacity:1;}}
@keyframes checkCircle{to{stroke-dashoffset:0;}}
@keyframes checkMark{to{stroke-dashoffset:0;}}

/* Success text */
.success-text{text-align:center;margin-top:18px;}
.st-1{font-size:18px;font-weight:800;color:#0B7A3B;opacity:0;animation:fadeUp .4s ease 1.3s forwards;}
.st-2{font-size:13px;color:#64748B;margin-top:4px;opacity:0;animation:fadeUp .4s ease 1.55s forwards;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

/* Shake ya kosa */
.otp-shake{animation:shake .5s cubic-bezier(.36,.07,.19,.97);}
@keyframes shake{10%,90%{transform:translateX(-1px);}20%,80%{transform:translateX(2px);}30%,50%,70%{transform:translateX(-4px);}40%,60%{transform:translateX(4px);}}

/* Password slide-in */
.pw-slide{animation:slideIn .35s ease forwards;}
@keyframes slideIn{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}

/* prefers-reduced-motion: OTP inafanya kazi, animations zinazimwa */
@media (prefers-reduced-motion: reduce){
  .otp-box,.otp-boxes.merge,.capsule,.wave,.dna-line,.cap-success,.reveal-logo,.check-svg,.check-circle,.check-mark,.st-1,.st-2,.pw-slide,.otp-shake{animation:none !important;transition:none !important;}
  .otp-boxes.merge{opacity:0;position:absolute;}
  .capsule{opacity:1;transform:scale(1);}
  .reveal-logo{opacity:1;transform:none;}
  .check-circle{stroke-dashoffset:0;}
  .check-mark{stroke-dashoffset:0;}
  .st-1,.st-2{opacity:1;}
}
`;
