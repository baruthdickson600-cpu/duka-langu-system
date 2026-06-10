import React,{useState,useEffect,useRef} from 'react';
import {Input} from '../components/UI';
import {TermsPage,PrivacyPage} from './LegalPages';
import InfoUpdateRequest from './InfoUpdateRequest';

const BG_COUNT=13;
const BG_INTERVAL=10000;

export default function AuthPage({onLogin,onSignup,onForgotPassword,otpPending,otpSending,onVerifyOTP,onCancelOTP,onResendOTP,promoPending,onVerifyPromo,onCancelPromo}){
  const[tab,setTab]=useState('login');
  const[f,setF]=useState({name:'',email:'',password:'',business:'',phone:'',promo:''});
  const[err,setErr]=useState('');
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);
  const[agreed,setAgreed]=useState(false);
  const[legalPage,setLegalPage]=useState(null);
  const[showForgot,setShowForgot]=useState(false);
  const[showInfoRequest,setShowInfoRequest]=useState(false);
  const[forgotEmail,setForgotEmail]=useState('');
  const[bgA,setBgA]=useState(Math.floor(Math.random()*BG_COUNT)+1);
  const[bgB,setBgB]=useState(null);
  const[showB,setShowB]=useState(false);
  const[otpCode,setOtpCode]=useState('');
  const[otpErr,setOtpErr]=useState('');
  const[otpTimer,setOtpTimer]=useState(300);
  const[verifying,setVerifying]=useState(false);
  const[promoCode,setPromoCode]=useState('');
  const[promoErr,setPromoErr]=useState('');
  const[promoVerifying,setPromoVerifying]=useState(false);
  const handleVerifyPromo=async()=>{
    if(!promoCode.trim()){setPromoErr('Ingiza promo code yako!');return}
    setPromoVerifying(true);setPromoErr('');
    const result=await onVerifyPromo(promoCode);
    setPromoVerifying(false);
    if(!result.success){setPromoErr(result.error||'Promo code si sahihi. Jaribu tena.');}
    else{setPromoCode('');setPromoErr('');}
  };
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  // Crossfade backgrounds
  useEffect(()=>{
    const timer=setInterval(()=>{
      const next=(showB?bgA:bgB||bgA)%BG_COUNT+1;
      if(showB){setBgA(next);setTimeout(()=>setShowB(false),50)}
      else{setBgB(next);setTimeout(()=>setShowB(true),50)}
    },BG_INTERVAL);
    return()=>clearInterval(timer);
  },[bgA,bgB,showB]);

  // OTP countdown timer
  useEffect(()=>{
    if(!otpPending)return;
    setOtpTimer(300);
    const t=setInterval(()=>setOtpTimer(p=>{if(p<=1){clearInterval(t);return 0}return p-1}),1000);
    return()=>clearInterval(t);
  },[otpPending]);

  if(legalPage==='terms')return <TermsPage onBack={()=>setLegalPage(null)}/>;
  if(legalPage==='privacy')return <PrivacyPage onBack={()=>setLegalPage(null)}/>;
  if(showInfoRequest)return <InfoUpdateRequest onBack={()=>setShowInfoRequest(false)}/>;

  const submit=async()=>{
    setErr('');setMsg('');
    if(tab==='signup'&&!agreed){setErr('Lazima ukubali masharti ya huduma!');return}
    setBusy(true);
    if(tab==='login'){
      if(!f.email||!f.password){setErr('Jaza email na password!');setBusy(false);return}
      const e=await onLogin(f.email,f.password);
      if(e&&e!=='OTP_REQUIRED')setErr(e);
    }else{
      if(!f.name||!f.email||!f.password||!f.business){setErr('Jaza taarifa zote!');setBusy(false);return}
      if(f.password.length<6){setErr('Password lazima iwe angalau herufi 6!');setBusy(false);return}
      const e=await onSignup(f.name,f.email,f.password,f.business,f.phone,f.promo);if(e)setErr(e);
    }
    setBusy(false);
  };

  const handleForgot=async()=>{
    if(!forgotEmail){setErr('Weka email yako!');return}
    setBusy(true);setErr('');
    const e=await onForgotPassword(forgotEmail);
    if(e)setErr(e);else setMsg('Link imetumwa kwenye email yako!');
    setBusy(false);
  };

  const handleVerifyOTP=async()=>{
    if(!otpCode||otpCode.length<6){setOtpErr('Ingiza code ya namba 6');return}
    setVerifying(true);setOtpErr('');
    const result=await onVerifyOTP(otpCode);
    if(!result.success)setOtpErr(result.error||'Code si sahihi');
    setVerifying(false);
  };

  const handleResend=async()=>{
    if(otpTimer>240){setOtpErr('Subiri kidogo kabla ya kutuma tena');return}
    setOtpErr('');
    const result=await onResendOTP(otpPending.email,otpPending.isAdmin,otpPending.phone||'');
    if(result.success){setOtpTimer(300);setMsg('Code mpya imetumwa!')}
    else setOtpErr(result.error||'Haikutumwa. Jaribu tena.');
  };

  const fmtTime=(s)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const bgStyle=(img,visible)=>({
    position:'fixed',inset:0,zIndex:0,
    backgroundImage:`url(/bg/bg${img}.jpg)`,backgroundSize:'cover',backgroundPosition:'center',
    opacity:visible?1:0,transition:'opacity 1.5s ease-in-out',
  });

  return(
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden'}}>
      <div style={bgStyle(bgA,!showB)}/>{bgB&&<div style={bgStyle(bgB,showB)}/>}
      <div style={{position:'fixed',inset:0,zIndex:1,background:'linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.2) 40%,rgba(0,0,0,0.45) 100%)'}}/>
      <div style={{position:'relative',zIndex:2,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{width:'100%',maxWidth:440}}>
          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:28,color:'#fff'}}>
            <img src="/logo-white.png" alt="Duka Langu" style={{width:110,height:110,objectFit:'contain',marginBottom:6,filter:'drop-shadow(0 6px 24px rgba(0,0,0,0.5))'}}/>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:2,textShadow:'0 3px 15px rgba(0,0,0,0.5)'}}>DUKA LANGU</div>
            <p style={{margin:'6px 0 0',opacity:.9,fontSize:14,fontWeight:500,textShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>Smart POS — Together for the better</p>
          </div>

          {/* Glass Card */}
          <div style={{background:'rgba(255,255,255,0.92)',borderRadius:24,padding:'32px 28px',boxShadow:'0 25px 80px rgba(0,0,0,0.4)',backdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.2)'}}>

            {/* ===== OTP SCREEN ===== */}
            {otpPending?<>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{width:70,height:70,margin:'0 auto 14px',borderRadius:'50%',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>🔐</div>
                <h3 style={{fontSize:22,fontWeight:800,color:'#1E293B',margin:'0 0 6px'}}>Thibitisha ni Wewe</h3>
                <p style={{fontSize:13,color:'#64748B',margin:0}}>Tumetuma code kwenye {otpPending.isAdmin||otpPending.phone?'SMS':'email yako'}</p>
                <p style={{fontSize:15,fontWeight:700,color:'#0B7A3B',margin:'6px 0 0'}}>{otpPending.isAdmin?'📱 ***6770':otpPending.phone?`📱 ***${otpPending.phone.replace(/[^0-9]/g,'').slice(-4)}`:otpPending.email?.replace(/(.{2})(.*)(@.*)/,'$1***$3')}</p>
              </div>

              {otpErr&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>{otpErr}</div>}
              {msg&&<div style={{background:'#F0FDF4',color:'#15803D',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #22C55E'}}>{msg}</div>}

              {/* OTP Input */}
              <div style={{marginBottom:16}}>
                <input
                  type="text" inputMode="numeric" maxLength={6} autoFocus
                  value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,''))}
                  onKeyDown={e=>e.key==='Enter'&&handleVerifyOTP()}
                  placeholder="______"
                  style={{width:'100%',textAlign:'center',fontSize:32,fontWeight:900,letterSpacing:12,padding:'16px 0',border:'2px solid #E2E8F0',borderRadius:14,outline:'none',fontFamily:'monospace',boxSizing:'border-box',color:'#0B7A3B'}}
                />
              </div>

              {/* Timer */}
              <div style={{textAlign:'center',marginBottom:16}}>
                {otpTimer>0?
                  <span style={{fontSize:14,color:otpTimer<60?'#EF4444':'#64748B',fontWeight:600}}>⏳ Inaisha: {fmtTime(otpTimer)}</span>:
                  <span style={{fontSize:14,color:'#EF4444',fontWeight:600}}>⏳ Code imeisha muda!</span>
                }
              </div>

              {/* Verify Button */}
              <button onClick={handleVerifyOTP} disabled={verifying||otpCode.length<6} style={{width:'100%',padding:16,background:verifying?'#86EFAC':otpCode.length===6?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#E2E8F0',color:otpCode.length===6?'#fff':'#94A3B8',border:'none',borderRadius:14,fontWeight:800,fontSize:16,cursor:otpCode.length===6?'pointer':'not-allowed',boxShadow:otpCode.length===6?'0 4px 20px rgba(11,122,59,0.35)':'none',transition:'all 0.2s'}}>
                {verifying?'⏳ Inathibitisha...':'✅ Thibitisha'}
              </button>

              {/* Resend + Cancel */}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:16}}>
                <button onClick={handleResend} disabled={otpTimer>240||otpSending} style={{background:'none',border:'none',color:otpTimer>240?'#94A3B8':'#0B7A3B',fontWeight:700,fontSize:13,cursor:otpTimer>240?'default':'pointer'}}>
                  {otpSending?'Inatuma...':'🔄 Tuma Tena'}
                </button>
                <button onClick={()=>{onCancelOTP();setOtpCode('');setOtpErr('');setMsg('')}} style={{background:'none',border:'none',color:'#EF4444',fontWeight:600,fontSize:13,cursor:'pointer'}}>← Rudi</button>
              </div>

              {/* Email Fallback Button — kama SMS haijafika */}
              {(otpPending.isAdmin||otpPending.phone)&&<button onClick={async()=>{
                setMsg('📧 Inatuma OTP kwa email...');
                const r=await fetch('/api/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',email:otpPending.email,isAdmin:false,phone:''})});
                const d=await r.json();
                if(d.success){
                  setMsg('✅ Code imetumwa kwa email yako! Angalia inbox.');
                  setTimeout(()=>setMsg(''),5000);
                }else{
                  setMsg('❌ Tatizo: '+(d.error||'Jaribu tena'));
                }
              }} style={{width:'100%',marginTop:12,padding:'12px',background:'#EFF6FF',color:'#1E40AF',border:'2px dashed #BFDBFE',borderRadius:12,fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.2s'}}>
                📧 Hujapata SMS? Tuma kwa Email Badala Yake
              </button>}

              <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginTop:16,fontSize:11,color:'#1E40AF',textAlign:'center'}}>
                🔒 OTP inalinda akaunti yako — hata mtu akijua password yako, hawezi kuingia bila code hii
              </div>
            </>:promoPending?<>
            {/* ===== PROMO CODE SCREEN (WAKALA) ===== */}
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{width:70,height:70,margin:'0 auto 14px',borderRadius:'50%',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>🎯</div>
              <h3 style={{fontSize:22,fontWeight:800,color:'#1E293B',margin:'0 0 6px'}}>Ingiza Promo Code Yako</h3>
              <p style={{fontSize:13,color:'#64748B',margin:'0 0 4px'}}>Karibu, <b style={{color:'#0B7A3B'}}>{promoPending?.userData?.name||'Wakala'}</b>!</p>
              <p style={{fontSize:12,color:'#94A3B8',margin:0}}>Thibitisha utambulisho wako kwa promo code uliyopewa na Admin</p>
            </div>
            {promoErr&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>{promoErr}</div>}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:6}}>🔑 PROMO CODE YAKO</label>
              <input
                type="text" autoFocus autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                value={promoCode}
                onChange={e=>setPromoCode(e.target.value.toUpperCase())}
                onKeyDown={e=>e.key==='Enter'&&handleVerifyPromo()}
                placeholder="Mfano: DL-THOMAS01"
                style={{width:'100%',textAlign:'center',fontSize:22,fontWeight:900,letterSpacing:4,padding:'16px 12px',border:'2px solid #BBF7D0',borderRadius:14,outline:'none',fontFamily:'monospace',boxSizing:'border-box',color:'#0B7A3B',background:'#F0FDF4'}}
              />
            </div>
            <button onClick={handleVerifyPromo} disabled={promoVerifying||!promoCode.trim()} style={{width:'100%',padding:16,background:promoVerifying?'#86EFAC':promoCode.trim()?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#E2E8F0',color:promoCode.trim()?'#fff':'#94A3B8',border:'none',borderRadius:14,fontWeight:800,fontSize:16,cursor:promoCode.trim()?'pointer':'not-allowed',boxShadow:promoCode.trim()?'0 4px 20px rgba(11,122,59,0.35)':'none',transition:'all 0.2s'}}>
              {promoVerifying?'⏳ Inathibitisha...':'✅ Ingia'}
            </button>
            <div style={{textAlign:'center',marginTop:14}}>
              <button onClick={()=>{onCancelPromo();setPromoCode('');setPromoErr('');}} style={{background:'none',border:'none',color:'#EF4444',fontWeight:600,fontSize:13,cursor:'pointer'}}>← Rudi Nyuma</button>
            </div>
            <div style={{background:'#F0FDF4',borderRadius:10,padding:'10px 14px',marginTop:16,fontSize:11,color:'#15803D',textAlign:'center',border:'1px solid #BBF7D0'}}>
              🔒 Promo code yako ndiyo funguo lako la kuingia — isimwambie mtu mwingine
            </div>
            </>:<>

            {/* ===== NORMAL LOGIN/SIGNUP ===== */}
            {showForgot?<>
              <h3 style={{fontSize:20,fontWeight:800,color:'#1E293B',margin:'0 0 8px'}}>Umesahau Password?</h3>
              <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Weka email yako na tutakutumia link.</p>
              {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>{err}</div>}
              {msg&&<div style={{background:'#F0FDF4',color:'#15803D',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #22C55E'}}>{msg}</div>}
              <Input label="Email" type="email" placeholder="email@mfano.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleForgot()}/>
              <button onClick={handleForgot} disabled={busy} style={{width:'100%',padding:15,background:busy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:14,fontWeight:700,fontSize:15,marginTop:6,cursor:'pointer',boxShadow:'0 4px 20px rgba(11,122,59,0.35)'}}>{busy?'Subiri...':'Tuma Link'}</button>
              <p onClick={()=>{setShowForgot(false);setErr('');setMsg('')}} style={{textAlign:'center',marginTop:16,color:'#0B7A3B',cursor:'pointer',fontWeight:700,fontSize:13}}>← Rudi kwenye Login</p>
            </>:<>
            <div style={{display:'flex',background:'#F1F5F9',borderRadius:14,padding:4,marginBottom:22}}>
              {['login','signup'].map(t=><button key={t} onClick={()=>{setTab(t);setErr('')}} style={{flex:1,padding:'12px 0',borderRadius:11,border:'none',fontWeight:800,fontSize:15,background:tab===t?'#fff':'transparent',color:tab===t?'#0B7A3B':'#94A3B8',boxShadow:tab===t?'0 2px 12px rgba(0,0,0,.08)':'none',cursor:'pointer',transition:'all 0.25s'}}>{t==='login'?'Ingia':'Jisajili'}</button>)}
            </div>
            {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:14,borderLeft:'4px solid #EF4444',display:'flex',alignItems:'center',gap:8}}><span>⚠️</span>{err}</div>}
            {tab==='signup'&&<>
              <Input label="Jina Lako" placeholder="Jina kamili" value={f.name} onChange={e=>s('name',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
              <Input label="Jina la Biashara" placeholder="Mfano: Duka la Rehema" value={f.business} onChange={e=>s('business',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
              <Input label="Simu / WhatsApp" placeholder="07XXXXXXXX" value={f.phone} onChange={e=>s('phone',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            </>}
            <Input label="Email" type="email" placeholder="email@mfano.com" value={f.email} onChange={e=>s('email',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            <Input label="Password" type="password" placeholder="••••••••" value={f.password} onChange={e=>s('password',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            {tab==='login'&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:-4,marginBottom:10,gap:10}}>
              <p onClick={()=>setShowInfoRequest(true)} style={{fontSize:11,color:'#64748B',cursor:'pointer',fontWeight:600,margin:0,textDecoration:'underline'}}>📝 Badilisha taarifa?</p>
              <p onClick={()=>{setShowForgot(true);setErr('');setForgotEmail(f.email)}} style={{fontSize:12,color:'#0B7A3B',cursor:'pointer',fontWeight:600,margin:0}}>Umesahau password?</p>
            </div>}
            {tab==='signup'&&<>
              <Input label="Promo Code (si lazima)" placeholder="PROMO-XXXXXX" value={f.promo} onChange={e=>s('promo',e.target.value)}/>
              <div style={{display:'flex',alignItems:'flex-start',gap:8,marginTop:6,marginBottom:14}}>
                <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} id="tc" style={{marginTop:3,width:18,height:18,accentColor:'#0B7A3B'}}/>
                <label htmlFor="tc" style={{fontSize:12,color:'#475569',lineHeight:1.5}}>
                  Nakubali <span onClick={e=>{e.preventDefault();setLegalPage('terms')}} style={{color:'#0B7A3B',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Masharti</span> na <span onClick={e=>{e.preventDefault();setLegalPage('privacy')}} style={{color:'#0B7A3B',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Sera ya Faragha</span>
                </label>
              </div>
            </>}
            <button onClick={submit} disabled={busy} style={{width:'100%',padding:16,background:busy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:14,fontWeight:800,fontSize:16,marginTop:6,cursor:'pointer',opacity:busy?.7:1,boxShadow:'0 4px 20px rgba(11,122,59,0.35)',transition:'all 0.2s'}}>
              {busy?'⏳ Subiri...':tab==='login'?'Ingia':'Jisajili Sasa'}
            </button>
            {tab==='signup'&&<div style={{textAlign:'center',fontSize:12,color:'#22C55E',marginTop:12,fontWeight:600}}>🎁 Siku 5 za majaribio BURE!</div>}
            <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'#94A3B8'}}>
              <span onClick={()=>setLegalPage('terms')} style={{color:'#64748B',cursor:'pointer'}}>Masharti</span>{' • '}<span onClick={()=>setLegalPage('privacy')} style={{color:'#64748B',cursor:'pointer'}}>Faragha</span>
            </div>
            </>}
            </>}
          </div>

          <div style={{textAlign:'center',marginTop:20}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.85)',fontWeight:600,textShadow:'0 2px 6px rgba(0,0,0,0.4)'}}>Lipa: HALOPESA → 25187616 • DUKALANGU</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:6}}>© 2026 PesaFly / Duka Langu • Tanzania 🇹🇿</div>
          </div>
        </div>
      </div>
    </div>
  );
}
