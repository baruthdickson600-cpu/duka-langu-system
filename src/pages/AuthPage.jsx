import React,{useState,useEffect} from 'react';
import {Input} from '../components/UI';
import {TermsPage,PrivacyPage} from './LegalPages';

const BG_COUNT=13;
const BG_INTERVAL=6000;

export default function AuthPage({onLogin,onSignup,onForgotPassword}){
  const[tab,setTab]=useState('login');
  const[f,setF]=useState({name:'',email:'',password:'',business:'',phone:'',promo:''});
  const[err,setErr]=useState('');
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);
  const[agreed,setAgreed]=useState(false);
  const[legalPage,setLegalPage]=useState(null);
  const[showForgot,setShowForgot]=useState(false);
  const[forgotEmail,setForgotEmail]=useState('');
  const[bgIdx,setBgIdx]=useState(Math.floor(Math.random()*BG_COUNT)+1);
  const[fade,setFade]=useState(true);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

  useEffect(()=>{
    const timer=setInterval(()=>{
      setFade(false);
      setTimeout(()=>{setBgIdx(prev=>(prev%BG_COUNT)+1);setFade(true)},800);
    },BG_INTERVAL);
    return()=>clearInterval(timer);
  },[]);

  if(legalPage==='terms')return <TermsPage onBack={()=>setLegalPage(null)}/>;
  if(legalPage==='privacy')return <PrivacyPage onBack={()=>setLegalPage(null)}/>;

  const submit=async()=>{
    setErr('');setMsg('');
    if(tab==='signup'&&!agreed){setErr('Lazima ukubali masharti ya huduma!');return}
    setBusy(true);
    if(tab==='login'){
      if(!f.email||!f.password){setErr('Jaza email na password!');setBusy(false);return}
      const e=await onLogin(f.email,f.password);if(e)setErr(e);
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

  return(
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden'}}>
      <div style={{position:'fixed',inset:0,zIndex:0,backgroundImage:`url(/bg/bg${bgIdx}.jpg)`,backgroundSize:'cover',backgroundPosition:'center',opacity:fade?1:0,transition:'opacity 0.8s ease-in-out'}}/>
      <div style={{position:'fixed',inset:0,zIndex:1,background:'linear-gradient(135deg,rgba(11,122,59,0.6) 0%,rgba(6,95,46,0.65) 50%,rgba(4,61,30,0.75) 100%)'}}/>
      <div style={{position:'relative',zIndex:2,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{width:'100%',maxWidth:440}}>
          <div style={{textAlign:'center',marginBottom:28,color:'#fff'}}>
            <img src="/logo-white.png" alt="Duka Langu" style={{width:120,height:120,objectFit:'contain',marginBottom:6,filter:'drop-shadow(0 4px 20px rgba(0,0,0,0.35))'}}/>
            <div style={{fontSize:26,fontWeight:900,letterSpacing:1,textShadow:'0 2px 10px rgba(0,0,0,0.3)'}}>DUKA LANGU</div>
            <p style={{margin:'4px 0 0',opacity:.85,fontSize:13,fontWeight:500}}>Smart POS — Together for the better</p>
          </div>
          <div style={{background:'rgba(255,255,255,0.97)',borderRadius:24,padding:'32px 28px',boxShadow:'0 25px 80px rgba(0,0,0,0.35)',backdropFilter:'blur(20px)'}}>
            {showForgot?<>
              <h3 style={{fontSize:20,fontWeight:800,color:'#1E293B',margin:'0 0 8px'}}>Umesahau Password?</h3>
              <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Weka email yako na tutakutumia link.</p>
              {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>{err}</div>}
              {msg&&<div style={{background:'#F0FDF4',color:'#15803D',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #22C55E'}}>{msg}</div>}
              <Input label="Email" type="email" placeholder="email@mfano.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleForgot()}/>
              <button onClick={handleForgot} disabled={busy} style={{width:'100%',padding:15,background:busy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:14,fontWeight:700,fontSize:15,marginTop:6,cursor:'pointer',boxShadow:'0 4px 15px rgba(11,122,59,0.3)'}}>{busy?'Subiri...':'Tuma Link'}</button>
              <p onClick={()=>{setShowForgot(false);setErr('');setMsg('')}} style={{textAlign:'center',marginTop:16,color:'#0B7A3B',cursor:'pointer',fontWeight:700,fontSize:13}}>← Rudi kwenye Login</p>
            </>:<>
            <div style={{display:'flex',background:'#F1F5F9',borderRadius:14,padding:4,marginBottom:22}}>
              {['login','signup'].map(t=><button key={t} onClick={()=>{setTab(t);setErr('')}} style={{flex:1,padding:'11px 0',borderRadius:11,border:'none',fontWeight:800,fontSize:14,background:tab===t?'#fff':'transparent',color:tab===t?'#0B7A3B':'#94A3B8',boxShadow:tab===t?'0 2px 10px rgba(0,0,0,.08)':'none',cursor:'pointer',transition:'all 0.2s'}}>{t==='login'?'Ingia':'Jisajili'}</button>)}
            </div>
            {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:14,borderLeft:'4px solid #EF4444',display:'flex',alignItems:'center',gap:8}}><span>⚠️</span>{err}</div>}
            {tab==='signup'&&<>
              <Input label="Jina Lako" placeholder="Jina kamili" value={f.name} onChange={e=>s('name',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
              <Input label="Jina la Biashara" placeholder="Mfano: Duka la Rehema" value={f.business} onChange={e=>s('business',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
              <Input label="Simu / WhatsApp" placeholder="07XXXXXXXX" value={f.phone} onChange={e=>s('phone',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            </>}
            <Input label="Email" type="email" placeholder="email@mfano.com" value={f.email} onChange={e=>s('email',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            <Input label="Password" type="password" placeholder="••••••••" value={f.password} onChange={e=>s('password',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            {tab==='login'&&<p onClick={()=>{setShowForgot(true);setErr('');setForgotEmail(f.email)}} style={{textAlign:'right',fontSize:12,color:'#0B7A3B',cursor:'pointer',fontWeight:600,marginTop:-4,marginBottom:10}}>Umesahau password?</p>}
            {tab==='signup'&&<>
              <Input label="Promo Code (si lazima)" placeholder="PROMO-XXXXXX" value={f.promo} onChange={e=>s('promo',e.target.value)}/>
              <div style={{display:'flex',alignItems:'flex-start',gap:8,marginTop:6,marginBottom:14}}>
                <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} id="tc" style={{marginTop:3,width:18,height:18,accentColor:'#0B7A3B'}}/>
                <label htmlFor="tc" style={{fontSize:12,color:'#475569',lineHeight:1.5}}>
                  Nakubali <span onClick={e=>{e.preventDefault();setLegalPage('terms')}} style={{color:'#0B7A3B',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Masharti</span> na <span onClick={e=>{e.preventDefault();setLegalPage('privacy')}} style={{color:'#0B7A3B',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Sera ya Faragha</span>
                </label>
              </div>
            </>}
            <button onClick={submit} disabled={busy} style={{width:'100%',padding:15,background:busy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:14,fontWeight:800,fontSize:16,marginTop:6,cursor:'pointer',opacity:busy?.7:1,boxShadow:'0 4px 15px rgba(11,122,59,0.3)',transition:'all 0.2s'}}>
              {busy?'⏳ Subiri...':tab==='login'?'Ingia':'Jisajili Sasa'}
            </button>
            {tab==='signup'&&<div style={{textAlign:'center',fontSize:12,color:'#22C55E',marginTop:12,fontWeight:600}}>🎁 Siku 5 za majaribio BURE!</div>}
            <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'#94A3B8'}}>
              <span onClick={()=>setLegalPage('terms')} style={{color:'#64748B',cursor:'pointer'}}>Masharti</span>{' • '}<span onClick={()=>setLegalPage('privacy')} style={{color:'#64748B',cursor:'pointer'}}>Faragha</span>
            </div>
            </>}
          </div>
          <div style={{textAlign:'center',marginTop:18}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.7)',fontWeight:500}}>Lipa: SELCOM → 6113 4066 • PESAFLY</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:6}}>© 2026 PesaFly / Duka Langu • Tanzania 🇹🇿</div>
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:5,marginTop:12}}>
            {Array.from({length:BG_COUNT}).map((_,i)=><div key={i} style={{width:bgIdx===i+1?16:6,height:6,borderRadius:3,background:bgIdx===i+1?'rgba(255,255,255,.9)':'rgba(255,255,255,.3)',transition:'all 0.3s'}}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}
