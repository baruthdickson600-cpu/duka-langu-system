import React,{useState,useEffect} from 'react';
import {Input,Badge} from '../components/UI';
import {useApp} from '../context/AppContext';

const BG_COUNT=13;
export default function LockedPage(){
  const{activateToken,logout,settings,submitPayment,myLatestPayment,biz}=useApp();
  const[tab,setTab]=useState('pay');
  const[code,setCode]=useState('');
  const[txId,setTxId]=useState('');
  const[phone,setPhone]=useState('');
  const[submitting,setSubmitting]=useState(false);
  const[submitted,setSubmitted]=useState(false);
  const[bgA,setBgA]=useState(Math.floor(Math.random()*BG_COUNT)+1);
  const[bgB,setBgB]=useState(null);
  const[showB,setShowB]=useState(false);

  const price=parseInt(settings.system_price||15000);
  const payNum=settings.payment_number||'6113 4066';
  const payName=settings.payment_name||'PESAFLY';
  const payProvider=settings.payment_provider||'SELCOM';
  const hasPending=myLatestPayment?.status==='pending';
  const wasRejected=myLatestPayment?.status==='rejected';
  const wasApproved=myLatestPayment?.status==='approved';

  useEffect(()=>{if(hasPending)setSubmitted(true)},[hasPending]);
  useEffect(()=>{
    const t=setInterval(()=>{
      const next=(showB?bgA:bgB||bgA)%BG_COUNT+1;
      if(showB){setBgA(next);setTimeout(()=>setShowB(false),50)}
      else{setBgB(next);setTimeout(()=>setShowB(true),50)}
    },10000);
    return()=>clearInterval(t);
  },[bgA,bgB,showB]);

  const[err,setErr]=useState('');

  const handleSubmitPayment=async()=>{
    if(!txId.trim())return alert('Weka Transaction ID!');
    if(txId.trim().length<4)return alert('Transaction ID ni fupi sana!');
    setSubmitting(true);setErr('');
    try{
      const result=await submitPayment(txId.trim(),price,payProvider,phone.trim());
      if(result?.error){
        setErr(result.error);
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    }catch(e){
      setErr('Tatizo la mfumo: '+(e.message||'Jaribu tena'));
    }
    setSubmitting(false);
  };
  const handleActivateToken=async()=>{
    if(!code.trim())return alert('Ingiza token!');
    const e=await activateToken(code.trim());
    if(e)alert(e);else{alert('Mfumo umefunguliwa!');setCode('')}
  };

  const bgStyle=(img,visible)=>({position:'fixed',inset:0,zIndex:0,backgroundImage:`url(/bg/bg${img}.jpg)`,backgroundSize:'cover',backgroundPosition:'center',opacity:visible?1:0,transition:'opacity 1.5s ease-in-out'});

  return(
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden'}}>
      <div style={bgStyle(bgA,!showB)}/>{bgB&&<div style={bgStyle(bgB,showB)}/>}
      <div style={{position:'fixed',inset:0,zIndex:1,background:'linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0.2) 40%,rgba(0,0,0,0.5) 100%)'}}/>
      <div style={{position:'relative',zIndex:2,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{background:'rgba(255,255,255,0.94)',borderRadius:24,maxWidth:440,width:'100%',boxShadow:'0 25px 80px rgba(0,0,0,.4)',overflow:'hidden',backdropFilter:'blur(24px)'}}>
          <div style={{background:'linear-gradient(135deg,#0B7A3B,#065F2E)',padding:'24px 28px',textAlign:'center',color:'#fff'}}>
            <img src="/logo-white.png" alt="Logo" style={{width:70,height:70,objectFit:'contain',marginBottom:8,filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'}}/>
            <div style={{fontSize:22,fontWeight:900}}>Mfumo Umefungwa</div>
            <div style={{fontSize:13,opacity:.85,marginTop:4}}>Lipa ili kuendelea kutumia mfumo</div>
          </div>
          <div style={{padding:'24px 28px'}}>
            <div style={{background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',borderRadius:14,padding:16,marginBottom:16,textAlign:'center',border:'1px solid #BBF7D0'}}>
              <div style={{fontSize:12,color:'#15803D',fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>Bei ya Mfumo</div>
              <div style={{fontSize:34,fontWeight:900,color:'#0B7A3B',margin:'4px 0'}}>TZS {price.toLocaleString()}</div>
              <div style={{fontSize:12,color:'#15803D'}}>kwa mwezi</div>
            </div>
            <div style={{background:'#FFF7ED',borderRadius:12,padding:14,marginBottom:16,border:'1px solid #FED7AA'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#92400E',marginBottom:6}}>Hatua za Kulipa:</div>
              <div style={{fontSize:12,color:'#92400E',lineHeight:1.8}}>
                <b>1.</b> Nenda {payProvider} kwenye simu yako<br/>
                <b>2.</b> Lipa namba: <span style={{fontWeight:800,fontSize:14,color:'#B45309'}}>{payNum}</span><br/>
                <b>3.</b> Jina: <b>{payName}</b><br/>
                <b>4.</b> Kiasi: <b>TZS {price.toLocaleString()}</b><br/>
                <b>5.</b> Nakili Transaction ID kutoka SMS
              </div>
            </div>
            {!submitted&&!hasPending&&<div style={{display:'flex',background:'#F1F5F9',borderRadius:10,padding:3,marginBottom:16}}>
              <button onClick={()=>setTab('pay')} style={{flex:1,padding:'9px 0',borderRadius:8,border:'none',fontWeight:700,fontSize:13,background:tab==='pay'?'#fff':'transparent',color:tab==='pay'?'#0B7A3B':'#94A3B8',cursor:'pointer'}}>Lipa Sasa</button>
              <button onClick={()=>setTab('token')} style={{flex:1,padding:'9px 0',borderRadius:8,border:'none',fontWeight:700,fontSize:13,background:tab==='token'?'#fff':'transparent',color:tab==='token'?'#0B7A3B':'#94A3B8',cursor:'pointer'}}>Nina Token</button>
            </div>}
            {!submitted&&!hasPending&&tab==='pay'&&<>
              {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>{err}</div>}
              <Input label="Transaction ID (kutoka SMS)" placeholder="Mf: MP240415ABC123" value={txId} onChange={e=>setTxId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmitPayment()}/>
              <Input label="Namba ya Simu" placeholder="07XXXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)}/>
              <button onClick={handleSubmitPayment} disabled={submitting} style={{width:'100%',padding:14,background:submitting?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,cursor:submitting?'not-allowed':'pointer',marginTop:4,boxShadow:'0 4px 15px rgba(11,122,59,0.3)'}}>
                {submitting?'⏳ Inatuma...':'Tuma Ombi la Malipo'}
              </button>
            </>}
            {!submitted&&!hasPending&&tab==='token'&&<>
              <Input label="Token Code" placeholder="TK-XXXXXXXX" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleActivateToken()}/>
              <button onClick={handleActivateToken} style={{width:'100%',padding:14,background:'#3B82F6',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,cursor:'pointer',marginTop:4}}>Fungua kwa Token</button>
            </>}
            {(submitted||hasPending)&&!wasApproved&&!wasRejected&&<div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{width:60,height:60,margin:'0 auto 16px',borderRadius:'50%',background:'#FFF7ED',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,animation:'pulse 2s infinite'}}>⏳</div>
              <div style={{fontSize:18,fontWeight:700,color:'#92400E',marginBottom:6}}>Ombi Linasubiri...</div>
              <div style={{fontSize:13,color:'#64748B',lineHeight:1.6,marginBottom:12}}>Tumepokea ombi lako.<br/>Admin atathibitisha hivi karibuni.<br/>Mfumo utafunguka moja kwa moja!</div>
              {myLatestPayment&&<div style={{background:'#F8FAFC',borderRadius:10,padding:12,textAlign:'left',fontSize:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#64748B'}}>Transaction:</span><span style={{fontWeight:700,fontFamily:'monospace'}}>{myLatestPayment.transaction_id}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#64748B'}}>Kiasi:</span><span style={{fontWeight:700}}>TZS {(myLatestPayment.amount||0).toLocaleString()}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#64748B'}}>Hali:</span><Badge color="#F59E0B">Inasubiri</Badge></div>
              </div>}
            </div>}
            {wasRejected&&<div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>❌</div>
              <div style={{fontSize:18,fontWeight:700,color:'#B91C1C',marginBottom:6}}>Malipo Yamekataliwa</div>
              <div style={{fontSize:13,color:'#64748B',marginBottom:12}}>{myLatestPayment?.reject_reason||'Transaction ID si sahihi.'}</div>
              <button onClick={()=>{setSubmitted(false);setTxId('');setTab('pay')}} style={{padding:'10px 24px',background:'#0B7A3B',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer'}}>Jaribu Tena</button>
            </div>}
            {wasApproved&&<div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>🎉</div>
              <div style={{fontSize:18,fontWeight:700,color:'#0B7A3B',marginBottom:6}}>Malipo Yamethibitishwa!</div>
              <div style={{fontSize:13,color:'#64748B'}}>Mfumo unafunguka...</div>
            </div>}
            <div style={{borderTop:'1px solid #E2E8F0',marginTop:16,paddingTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:11,color:'#94A3B8'}}>Msaada: 0617 288 752<br/>WhatsApp: +255 628 319 789</div>
              <button onClick={logout} style={{background:'none',border:'1px solid #FCA5A5',borderRadius:8,padding:'6px 14px',color:'#EF4444',fontWeight:600,fontSize:12,cursor:'pointer'}}>Toka</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
    </div>
  );
}
