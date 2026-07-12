import React,{useState,useEffect} from 'react';
import {Input,PasswordInput} from '../components/UI';
import {TermsPage,PrivacyPage} from './LegalPages';
import InfoUpdateRequest from './InfoUpdateRequest';

const BG_COUNT=13;
const BG_INTERVAL=10000;

// ===== BUSINESS TYPES =====
const BUSINESS_TYPES=[
  {value:'retail',    icon:'🏪', label:'Retail Shop',    desc:'Duka la jumla/rejareja'},
  {value:'fashion',   icon:'👗', label:'Fashion',        desc:'Mavazi, viatu, accessories'},
  {value:'hardware',  icon:'🔩', label:'Hardware',       desc:'Vifaa vya ujenzi, zana'},
  {value:'agrovet',   icon:'🌱', label:'Agrovet',        desc:'Mbegu, dawa za mimea'},
  {value:'restaurant',icon:'🍽', label:'Restaurant',     desc:'Chakula, cafe, fast food'},
  {value:'pharmacy',  icon:'💊', label:'Pharmacy',       desc:'Dawa, vifaa vya afya'},
  {value:'electronics',icon:'💻',label:'Electronics',    desc:'Simu, kompyuta, gadgets'},
  {value:'stationery',icon:'📚', label:'Stationery',     desc:'Vitabu, kalamu, ofisi'},
  {value:'beauty',    icon:'💇', label:'Beauty Salon',   desc:'Nywele, ngozi, cosmetics'},
  {value:'other',     icon:'📦', label:'Nyingine',       desc:'Biashara nyingine'},
];

// ===== SIGNUP WIZARD STEPS =====
// Step 1: Taarifa za msingi (Jina, Email, Simu)
// Step 2: Aina ya Biashara
// Step 3: Password + Promo + Terms

export default function AuthPage({onLogin,onSignup,onForgotPassword}){
  const[tab,setTab]=useState('login');
  const[step,setStep]=useState(1); // signup wizard step
  const[f,setF]=useState({name:'',email:'',password:'',business:'',phone:'',promo:'',businessType:''});
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

  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  // Crossfade backgrounds
  useEffect(()=>{
    const timer=setInterval(()=>{
      const next=(showB?bgA:bgB||bgA)%BG_COUNT+1;
      if(showB){setBgA(next);setTimeout(()=>setShowB(false),50);}
      else{setBgB(next);setTimeout(()=>setShowB(true),50);}
    },BG_INTERVAL);
    return()=>clearInterval(timer);
  },[bgA,bgB,showB]);

  if(legalPage==='terms')return <TermsPage onBack={()=>setLegalPage(null)}/>;
  if(legalPage==='privacy')return <PrivacyPage onBack={()=>setLegalPage(null)}/>;
  if(showInfoRequest)return <InfoUpdateRequest onBack={()=>setShowInfoRequest(false)}/>;

  // ===== STEP NAVIGATION =====
  const goStep1=()=>{setStep(1);setErr('');};
  const goStep2=()=>{
    if(!f.name.trim()){setErr('Weka jina lako kamili!');return;}
    if(!f.email.trim()||!f.email.includes('@')){setErr('Weka email sahihi!');return;}
    if(!f.business.trim()){setErr('Weka jina la biashara!');return;}
    setErr('');setStep(2);
  };
  const goStep3=()=>{
    if(!f.businessType){setErr('Chagua aina ya biashara!');return;}
    setErr('');setStep(3);
  };

  // ===== FINAL SUBMIT =====
  const submitSignup=async()=>{
    if(!agreed){setErr('Lazima ukubali masharti ya huduma!');return;}
    if(!f.password||f.password.length<6){setErr('Password lazima iwe angalau herufi 6!');return;}
    setBusy(true);
    const result=await onSignup(f.name,f.email,f.password,f.business,f.phone,f.promo,f.businessType);
    if(result)setErr(result);
    setBusy(false);
  };

  const submitLogin=async()=>{
    if(!f.email||!f.password){setErr('Jaza email na password!');return;}
    setBusy(true);
    const result=await onLogin(f.email,f.password);
    if(result)setErr(result);
    setBusy(false);
  };

  const handleForgot=async()=>{
    if(!forgotEmail){setErr('Weka email yako!');return;}
    setBusy(true);setErr('');
    const result=await onForgotPassword(forgotEmail);
    if(result)setErr(result);else setMsg('Link imetumwa kwenye email yako!');
    setBusy(false);
  };

  const bgStyle=(img,visible)=>({
    position:'fixed',inset:0,zIndex:0,
    backgroundImage:`url(/bg/bg${img}.jpg)`,
    backgroundSize:'cover',backgroundPosition:'center',
    opacity:visible?1:0,transition:'opacity 1.5s ease-in-out',
  });

  // ===== STEP INDICATOR =====
  const StepDots=()=>(
    <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:20}}>
      {[1,2,3].map(n=>(
        <div key={n} style={{
          width:n===step?28:8,height:8,borderRadius:4,
          background:n===step?'#0B7A3B':n<step?'#22C55E':'#CBD5E1',
          transition:'all 0.3s ease',
        }}/>
      ))}
    </div>
  );

  return(
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden'}}>
      <div style={bgStyle(bgA,!showB)}/>
      {bgB&&<div style={bgStyle(bgB,showB)}/>}
      <div style={{position:'fixed',inset:0,zIndex:1,background:'linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.2) 40%,rgba(0,0,0,0.45) 100%)'}}/>
      <div style={{position:'relative',zIndex:2,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{width:'100%',maxWidth:tab==='signup'&&step===2?520:440}}>

          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:24,color:'#fff'}}>
            <img src="/logo-white.png" alt="Duka Langu" style={{width:90,height:90,objectFit:'contain',marginBottom:6,filter:'drop-shadow(0 6px 24px rgba(0,0,0,0.5))'}}/> 
            <div style={{fontSize:26,fontWeight:900,letterSpacing:2,textShadow:'0 3px 15px rgba(0,0,0,0.5)'}}>DUKA LANGU</div>
            <p style={{margin:'4px 0 0',opacity:.9,fontSize:13,fontWeight:500,textShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>Smart POS — Together for the better</p>
          </div>

          {/* Glass Card */}
          <div style={{background:'rgba(255,255,255,0.92)',borderRadius:24,padding:'28px 24px',boxShadow:'0 25px 80px rgba(0,0,0,0.4)',backdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.2)'}}>

            {/* ===== FORGOT PASSWORD ===== */}
            {showForgot?(
              <>
                <h3 style={{fontSize:20,fontWeight:800,color:'#1E293B',margin:'0 0 8px'}}>Umesahau Password?</h3>
                <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Weka email yako na tutakutumia link.</p>
                {err&&<ErrBox msg={err}/>}
                {msg&&<div style={{background:'#F0FDF4',color:'#15803D',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #22C55E'}}>{msg}</div>}
                <Input label="Email" type="email" placeholder="email@mfano.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleForgot()}/>
                <Btn label={busy?'Subiri...':'Tuma Link'} onClick={handleForgot} disabled={busy}/>
                <p onClick={()=>{setShowForgot(false);setErr('');setMsg('');}} style={{textAlign:'center',marginTop:14,color:'#0B7A3B',cursor:'pointer',fontWeight:700,fontSize:13}}>← Rudi kwenye Login</p>
              </>
            ):(
              <>
                {/* ===== TABS ===== */}
                <div style={{display:'flex',background:'#F1F5F9',borderRadius:14,padding:4,marginBottom:20}}>
                  {['login','signup'].map(t=>(
                    <button key={t} onClick={()=>{setTab(t);setErr('');setStep(1);}} style={{flex:1,padding:'11px 0',borderRadius:11,border:'none',fontWeight:800,fontSize:15,background:tab===t?'#fff':'transparent',color:tab===t?'#0B7A3B':'#94A3B8',boxShadow:tab===t?'0 2px 12px rgba(0,0,0,.08)':'none',cursor:'pointer',transition:'all 0.25s'}}>
                      {t==='login'?'Ingia':'Jisajili'}
                    </button>
                  ))}
                </div>

                {err&&<ErrBox msg={err}/>}

                {/* ===== LOGIN ===== */}
                {tab==='login'&&(
                  <>
                    <Input label="Email" type="email" placeholder="email@mfano.com" value={f.email} onChange={e=>s('email',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitLogin()}/>
                    <PasswordInput label="Password" placeholder="••••••••" value={f.password} onChange={e=>s('password',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitLogin()}/>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:-4,marginBottom:10,gap:10}}>
                      <p onClick={()=>setShowInfoRequest(true)} style={{fontSize:11,color:'#64748B',cursor:'pointer',fontWeight:600,margin:0,textDecoration:'underline'}}>📝 Badilisha taarifa?</p>
                      <p onClick={()=>{setShowForgot(true);setErr('');setForgotEmail(f.email);}} style={{fontSize:12,color:'#0B7A3B',cursor:'pointer',fontWeight:600,margin:0}}>Umesahau password?</p>
                    </div>
                    <Btn label={busy?'⏳ Subiri...':'Ingia'} onClick={submitLogin} disabled={busy}/>
                  </>
                )}

                {/* ===== SIGNUP WIZARD ===== */}
                {tab==='signup'&&(
                  <>
                    <StepDots/>

                    {/* STEP 1: Taarifa za Msingi */}
                    {step===1&&(
                      <>
                        <h3 style={{fontSize:17,fontWeight:800,color:'#1E293B',margin:'0 0 4px'}}>Hatua 1 ya 3</h3>
                        <p style={{fontSize:13,color:'#64748B',margin:'0 0 16px'}}>Taarifa za msingi za akaunti yako</p>
                        <Input label="Jina Lako Kamili" placeholder="Mfano: Rehema Juma" value={f.name} onChange={e=>s('name',e.target.value)}/>
                        <Input label="Jina la Biashara" placeholder="Mfano: Duka la Rehema" value={f.business} onChange={e=>s('business',e.target.value)}/>
                        <Input label="Email" type="email" placeholder="email@mfano.com" value={f.email} onChange={e=>s('email',e.target.value)}/>
                        <Input label="Simu / WhatsApp" placeholder="07XXXXXXXX" value={f.phone} onChange={e=>s('phone',e.target.value)}/>
                        <Btn label="Endelea →" onClick={goStep2}/>
                      </>
                    )}

                    {/* STEP 2: Chagua Aina ya Biashara */}
                    {step===2&&(
                      <>
                        <h3 style={{fontSize:17,fontWeight:800,color:'#1E293B',margin:'0 0 4px'}}>Hatua 2 ya 3</h3>
                        <p style={{fontSize:13,color:'#64748B',margin:'0 0 16px'}}>Biashara yako ni ya aina gani?</p>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                          {BUSINESS_TYPES.map(bt=>(
                            <div key={bt.value} onClick={()=>s('businessType',bt.value)} style={{
                              padding:'14px 12px',borderRadius:14,cursor:'pointer',textAlign:'center',
                              border:f.businessType===bt.value?'2.5px solid #0B7A3B':'2px solid #E2E8F0',
                              background:f.businessType===bt.value?'#F0FDF4':'#FAFAFA',
                              transform:f.businessType===bt.value?'scale(1.02)':'scale(1)',
                              transition:'all 0.18s',boxShadow:f.businessType===bt.value?'0 4px 16px rgba(11,122,59,0.15)':'none',
                            }}>
                              <div style={{fontSize:26,marginBottom:4}}>{bt.icon}</div>
                              <div style={{fontSize:12,fontWeight:700,color:f.businessType===bt.value?'#0B7A3B':'#1E293B',lineHeight:1.2}}>{bt.label}</div>
                              <div style={{fontSize:10,color:'#94A3B8',marginTop:2,lineHeight:1.3}}>{bt.desc}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:10}}>
                          <button onClick={goStep1} style={{flex:1,padding:13,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>← Rudi</button>
                          <button onClick={goStep3} style={{flex:2,padding:13,background:'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer',boxShadow:'0 4px 16px rgba(11,122,59,0.3)'}}>Endelea →</button>
                        </div>
                      </>
                    )}

                    {/* STEP 3: Password + Promo + Terms */}
                    {step===3&&(
                      <>
                        <h3 style={{fontSize:17,fontWeight:800,color:'#1E293B',margin:'0 0 4px'}}>Hatua 3 ya 3</h3>
                        <p style={{fontSize:13,color:'#64748B',margin:'0 0 16px'}}>Weka password na ukamilishe usajili</p>

                        {/* Summary ya biashara */}
                        {f.businessType&&(()=>{
                          const bt=BUSINESS_TYPES.find(b=>b.value===f.businessType);
                          return bt?(
                            <div style={{background:'#F0FDF4',border:'1.5px solid #BBF7D0',borderRadius:12,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
                              <span style={{fontSize:22}}>{bt.icon}</span>
                              <div>
                                <div style={{fontSize:12,color:'#15803D',fontWeight:700}}>{f.business}</div>
                                <div style={{fontSize:11,color:'#64748B'}}>{bt.label}</div>
                              </div>
                              <button onClick={()=>setStep(2)} style={{marginLeft:'auto',fontSize:11,color:'#0B7A3B',background:'none',border:'none',cursor:'pointer',fontWeight:700,textDecoration:'underline'}}>Badilisha</button>
                            </div>
                          ):null;
                        })()}

                        <PasswordInput label="Password" placeholder="Angalau herufi 6" value={f.password} onChange={e=>s('password',e.target.value)}/>
                        <Input label="Promo Code (si lazima)" placeholder="PROMO-XXXXXX" value={f.promo} onChange={e=>s('promo',e.target.value)}/>
                        <div style={{display:'flex',alignItems:'flex-start',gap:8,marginTop:4,marginBottom:14}}>
                          <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} id="tc" style={{marginTop:3,width:18,height:18,accentColor:'#0B7A3B'}}/>
                          <label htmlFor="tc" style={{fontSize:12,color:'#475569',lineHeight:1.5}}>
                            Nakubali{' '}
                            <span onClick={e=>{e.preventDefault();setLegalPage('terms');}} style={{color:'#0B7A3B',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Masharti</span>
                            {' '}na{' '}
                            <span onClick={e=>{e.preventDefault();setLegalPage('privacy');}} style={{color:'#0B7A3B',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Sera ya Faragha</span>
                          </label>
                        </div>
                        <div style={{display:'flex',gap:10}}>
                          <button onClick={()=>setStep(2)} style={{flex:1,padding:13,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>← Rudi</button>
                          <button onClick={submitSignup} disabled={busy} style={{flex:2,padding:13,background:busy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer',boxShadow:'0 4px 16px rgba(11,122,59,0.3)'}}>
                            {busy?'⏳ Subiri...':'🎉 Jisajili Sasa'}
                          </button>
                        </div>
                        <div style={{textAlign:'center',fontSize:12,color:'#22C55E',marginTop:10,fontWeight:600}}>🎁 Siku 5 za majaribio BURE!</div>
                      </>
                    )}
                  </>
                )}

                <div style={{textAlign:'center',marginTop:14,fontSize:11,color:'#94A3B8'}}>
                  <span onClick={()=>setLegalPage('terms')} style={{color:'#64748B',cursor:'pointer'}}>Masharti</span>
                  {' • '}
                  <span onClick={()=>setLegalPage('privacy')} style={{color:'#64748B',cursor:'pointer'}}>Faragha</span>
                </div>
              </>
            )}
          </div>

          <div style={{textAlign:'center',marginTop:18}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.85)',fontWeight:600,textShadow:'0 2px 6px rgba(0,0,0,0.4)'}}>Lipa: HALOPESA → 25187616 • DUKALANGU</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:5}}>© 2026 Duka Langu • Tanzania 🇹🇿</div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ===== HELPERS =====
const ErrBox=({msg})=>(
  <div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:14,borderLeft:'4px solid #EF4444',display:'flex',alignItems:'center',gap:8}}>
    <span>⚠️</span>{msg}
  </div>
);

const Btn=({label,onClick,disabled})=>(
  <button onClick={onClick} disabled={disabled} style={{width:'100%',padding:15,background:disabled?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:14,fontWeight:800,fontSize:15,marginTop:6,cursor:'pointer',opacity:disabled?.7:1,boxShadow:'0 4px 20px rgba(11,122,59,0.35)',transition:'all 0.2s'}}>
    {label}
  </button>
);
