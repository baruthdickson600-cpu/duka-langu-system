import React,{useState} from 'react';
import {Input} from '../components/UI';
import {TermsPage,PrivacyPage} from './LegalPages';

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
  const s=(k,v)=>setF(p=>({...p,[k]:v}));

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
    if(e)setErr(e);
    else setMsg('Link ya kubadilisha password imetumwa kwenye email yako! Angalia inbox.');
    setBusy(false);
  };

  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0B7A3B 0%,#065F2E 50%,#043D1E 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{width:'100%',maxWidth:420}}>
        <div style={{textAlign:'center',marginBottom:24,color:'#fff'}}>
          <img src="/logo-white.png" alt="Duka Langu" style={{width:140,height:140,objectFit:'contain',marginBottom:8,filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.25))'}}/>
          <p style={{margin:'4px 0 0',opacity:.8,fontSize:13}}>Together for the better</p>
        </div>
        <div style={{background:'#fff',borderRadius:20,padding:28,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>

          {/* FORGOT PASSWORD VIEW */}
          {showForgot?<>
            <h3 style={{fontSize:18,fontWeight:700,color:'#1E293B',margin:'0 0 8px'}}>Umesahau Password?</h3>
            <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Weka email yako na tutakutumia link ya kubadilisha password.</p>
            {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:12,borderLeft:'3px solid #EF4444'}}>{err}</div>}
            {msg&&<div style={{background:'#F0FDF4',color:'#15803D',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:12,borderLeft:'3px solid #22C55E'}}>{msg}</div>}
            <Input label="Email" type="email" placeholder="email@mfano.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleForgot()}/>
            <button onClick={handleForgot} disabled={busy} style={{width:'100%',padding:14,background:busy?'#86EFAC':'#0B7A3B',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,marginTop:4,cursor:'pointer'}}>{busy?'⏳ Subiri...':'Tuma Link'}</button>
            <p onClick={()=>{setShowForgot(false);setErr('');setMsg('')}} style={{textAlign:'center',marginTop:14,color:'#0B7A3B',cursor:'pointer',fontWeight:600,fontSize:13}}>← Rudi kwenye Login</p>
          </>:<>

          {/* NORMAL LOGIN/SIGNUP */}
          <div style={{display:'flex',background:'#F1F5F9',borderRadius:12,padding:3,marginBottom:20}}>
            {['login','signup'].map(t=><button key={t} onClick={()=>{setTab(t);setErr('')}} style={{flex:1,padding:'10px 0',borderRadius:10,border:'none',fontWeight:700,fontSize:14,background:tab===t?'#fff':'transparent',color:tab===t?'#0B7A3B':'#94A3B8',boxShadow:tab===t?'0 2px 8px rgba(0,0,0,.08)':'none',cursor:'pointer'}}>{t==='login'?'Ingia':'Jisajili'}</button>)}
          </div>
          {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'8px 12px',borderRadius:8,fontSize:13,marginBottom:12,borderLeft:'3px solid #EF4444'}}>{err}</div>}
          {tab==='signup'&&<>
            <Input label="Jina Lako" placeholder="Jina kamili" value={f.name} onChange={e=>s('name',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            <Input label="Jina la Biashara" placeholder="Mfano: Duka la Rehema" value={f.business} onChange={e=>s('business',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
            <Input label="Simu" placeholder="07XXXXXXXX" value={f.phone} onChange={e=>s('phone',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          </>}
          <Input label="Email" type="email" placeholder="email@mfano.com" value={f.email} onChange={e=>s('email',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          <Input label="Password" type="password" placeholder="••••••••" value={f.password} onChange={e=>s('password',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
          {tab==='login'&&<p onClick={()=>{setShowForgot(true);setErr('');setForgotEmail(f.email)}} style={{textAlign:'right',fontSize:12,color:'#0B7A3B',cursor:'pointer',fontWeight:600,marginTop:-4,marginBottom:8}}>Umesahau password?</p>}
          {tab==='signup'&&<>
            <Input label="Promo Code (si lazima)" placeholder="PROMO-XXXXXX" value={f.promo} onChange={e=>s('promo',e.target.value)}/>
            <div style={{display:'flex',alignItems:'flex-start',gap:8,marginTop:4,marginBottom:12}}>
              <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} id="tc" style={{marginTop:3,width:18,height:18,accentColor:'#0B7A3B'}}/>
              <label htmlFor="tc" style={{fontSize:12,color:'#475569',lineHeight:1.5}}>
                Nakubali <span onClick={e=>{e.preventDefault();setLegalPage('terms')}} style={{color:'#0B7A3B',fontWeight:600,cursor:'pointer',textDecoration:'underline'}}>Masharti ya Huduma</span> na <span onClick={e=>{e.preventDefault();setLegalPage('privacy')}} style={{color:'#0B7A3B',fontWeight:600,cursor:'pointer',textDecoration:'underline'}}>Sera ya Faragha</span>
              </label>
            </div>
          </>}
          <button onClick={submit} disabled={busy} style={{width:'100%',padding:14,background:busy?'#86EFAC':'#0B7A3B',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,marginTop:4,cursor:'pointer',opacity:busy?.7:1}}>{busy?'⏳ Subiri...':tab==='login'?'Ingia':'Jisajili'}</button>
          {tab==='signup'&&<div style={{textAlign:'center',fontSize:11,color:'#94A3B8',marginTop:10}}>🎁 Utapata siku 5 za majaribio bure!</div>}
          <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'#94A3B8'}}>
            <span onClick={()=>setLegalPage('terms')} style={{color:'#0B7A3B',cursor:'pointer',textDecoration:'underline'}}>Masharti</span> • <span onClick={()=>setLegalPage('privacy')} style={{color:'#0B7A3B',cursor:'pointer',textDecoration:'underline'}}>Faragha</span>
          </div>
          </>}
        </div>
        <div style={{textAlign:'center',marginTop:16,fontSize:11,color:'rgba(255,255,255,.5)'}}>Lipa: SELCOM {'>'} 6113 4066 • PESAFLY</div>
        <div style={{textAlign:'center',marginTop:6,fontSize:10,color:'rgba(255,255,255,.3)'}}>© 2026 PesaFly / Duka Langu</div>
      </div>
    </div>
  );
}
