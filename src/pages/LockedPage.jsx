import React,{useState,useEffect,useRef} from 'react';
import {useApp} from '../context/AppContext';
import {Input} from '../components/UI';

const BG_COUNT=13;
const BG_INTERVAL=10000;

export default function LockedPage(){
  const{biz,user,settings,initiatePayment,checkPaymentStatus,paymentRequests,logout}=useApp();
  const[phone,setPhone]=useState(user?.phone||'');
  const[submitted,setSubmitted]=useState(false);
  const[err,setErr]=useState('');
  const[bgA,setBgA]=useState(Math.floor(Math.random()*BG_COUNT)+1);
  const[bgB,setBgB]=useState(null);
  const[showB,setShowB]=useState(false);

  // My pending payment
  const myPending=paymentRequests?.find(p=>p.business_id===biz?.id&&p.status==='pending');
  const myRejected=paymentRequests?.find(p=>p.business_id===biz?.id&&p.status==='rejected');
  const hasPending=!!myPending;

  const price=parseInt(settings?.system_price||'15000');

  // Crossfade backgrounds
  useEffect(()=>{
    const timer=setInterval(()=>{
      const next=(showB?bgA:bgB||bgA)%BG_COUNT+1;
      if(showB){setBgA(next);setTimeout(()=>setShowB(false),50)}
      else{setBgB(next);setTimeout(()=>setShowB(true),50)}
    },BG_INTERVAL);
    return()=>clearInterval(timer);
  },[bgA,bgB,showB]);

  // Malipo ya auto (gateway + webhook -> jifungua yenyewe)
  const[autoLoading,setAutoLoading]=useState(false);
  const[autoMsg,setAutoMsg]=useState('');
  const[autoRef,setAutoRef]=useState('');
  const[polling,setPolling]=useState(false);
  const handleAutoPay=async()=>{
    const ph=phone.trim();
    if(!ph||ph.replace(/\D/g,'').length<9)return setErr('Weka namba sahihi ya simu (mf. 0712345678)!');
    setAutoLoading(true);setErr('');setAutoMsg('');
    try{
      const res=await initiatePayment({amount:price,days:30,plan:'basic',phone:ph});
      if(!res?.success){setErr(res?.error||'Imeshindwa kuanzisha malipo.');setAutoLoading(false);return}
      const ref=res.reference||'';
      setAutoRef(ref);
      setAutoMsg(res.message||'📲 Angalia simu yako — weka PIN kuthibitisha malipo. Mfumo utajifungua wenyewe.');
      // Anza polling: angalia status kila sekunde 5 kwa hadi dakika 3
      if(ref&&checkPaymentStatus){
        setPolling(true);
        let tries=0;
        const timer=setInterval(async()=>{
          tries++;
          const st=await checkPaymentStatus(ref);
          if(st?.status==='paid'){
            clearInterval(timer);
            setAutoMsg('🎉 Malipo yamethibitishwa! Mfumo unafunguka...');
            setTimeout(()=>window.location.reload(),1800);
          }else if(st?.status==='failed'){
            clearInterval(timer);setPolling(false);
            setErr('❌ Malipo hayakufaulu. Tafadhali jaribu tena.');
            setAutoMsg('');
          }else if(tries>=36){ // dakika 3 (36 x 5s)
            clearInterval(timer);setPolling(false);
            setAutoMsg('⏳ Bado tunasubiri uthibitisho. Ukishamaliza kulipa, mfumo utajifungua wenyewe. Unaweza kuonyesha upya ukurasa.');
          }
        },5000);
      }
    }catch(e){setErr('Tatizo: '+(e.message||'Jaribu tena'))}
    setAutoLoading(false);
  };


  const bgStyle=(img,visible)=>({
    position:'fixed',inset:0,zIndex:0,
    backgroundImage:`url(/bg/bg${img}.jpg)`,backgroundSize:'cover',backgroundPosition:'center',
    opacity:visible?1:0,transition:'opacity 1.5s ease-in-out',
  });

  return(
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden'}}>
      <div style={bgStyle(bgA,!showB)}/>{bgB&&<div style={bgStyle(bgB,showB)}/>}
      <div style={{position:'fixed',inset:0,zIndex:1,background:'linear-gradient(180deg,rgba(0,0,0,0.5),rgba(0,0,0,0.3) 40%,rgba(0,0,0,0.6))'}}/>
      
      <div style={{position:'relative',zIndex:2,minHeight:'100vh',padding:'20px 16px',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{width:'100%',maxWidth:520}}>
          
          {/* Header */}
          <div style={{textAlign:'center',marginBottom:20,color:'#fff'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(239,68,68,0.95)',padding:'8px 18px',borderRadius:30,boxShadow:'0 8px 30px rgba(239,68,68,0.4)',marginBottom:12,animation:'pulse 2s infinite'}}>
              <span style={{fontSize:18}}>🔒</span>
              <span style={{fontSize:13,fontWeight:800,letterSpacing:1}}>MFUMO UMEFUNGWA</span>
            </div>
            <h1 style={{fontSize:24,fontWeight:900,margin:'4px 0',textShadow:'0 3px 15px rgba(0,0,0,0.5)'}}>{biz?.name||'Biashara'}</h1>
            <p style={{fontSize:13,opacity:0.9,margin:0,textShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>Lipa ili kuendelea kutumia mfumo</p>
          </div>

          {/* Pending Status */}
          {hasPending&&<div style={{background:'#fff',borderRadius:18,padding:'18px 20px',marginBottom:14,boxShadow:'0 10px 30px rgba(0,0,0,0.15)',borderLeft:'5px solid #F59E0B'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:42,height:42,borderRadius:12,background:'#FFF7ED',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⏳</div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'#1E293B'}}>Ombi Linasubiri</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>Admin atathibitisha hivi karibuni</div>
              </div>
            </div>
            <div style={{background:'#FFF7ED',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#92400E',marginBottom:8}}>
              💳 Transaction: <b style={{fontFamily:'monospace'}}>{myPending.transaction_id}</b><br/>
              💵 Kiasi: <b>TZS {(+myPending.amount).toLocaleString()}</b><br/>
              📅 Tarehe: <b>{new Date(myPending.created_at).toLocaleString('sw-TZ')}</b>
            </div>
            <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#1E40AF',display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:16}}>📞</span>
              <span>Tatizo? Wasiliana: <b>0617 288 752</b> | WhatsApp: <b>+255 628 319 789</b></span>
            </div>
          </div>}

          {/* Rejected Notice */}
          {!hasPending&&myRejected&&<div style={{background:'#FEF2F2',borderRadius:14,padding:'12px 16px',marginBottom:14,borderLeft:'4px solid #EF4444',boxShadow:'0 4px 15px rgba(239,68,68,0.15)'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#B91C1C',marginBottom:4}}>❌ Ombi la awali lilikataliwa</div>
            <div style={{fontSize:11,color:'#7F1D1D'}}>Sababu: {myRejected.reject_reason||'Transaction ID si sahihi'}</div>
          </div>}

          {/* Main Card */}
          {!hasPending&&!submitted&&<div style={{background:'#fff',borderRadius:20,padding:0,boxShadow:'0 25px 60px rgba(0,0,0,0.3)',overflow:'hidden'}}>
            
            {/* Price Hero */}
            <div style={{background:'linear-gradient(135deg,#0A6E47,#0A6E47)',padding:'24px 22px',color:'#fff',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.1)'}}/>
              <div style={{position:'absolute',bottom:-30,left:-30,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
              <div style={{position:'relative',zIndex:1}}>
                <div style={{fontSize:11,fontWeight:600,opacity:0.85,letterSpacing:2,marginBottom:4}}>BEI YA MFUMO</div>
                <div style={{fontSize:38,fontWeight:900,letterSpacing:-1}}>TZS {price.toLocaleString()}</div>
                <div style={{fontSize:12,opacity:0.85,marginTop:2}}>kwa mwezi mmoja</div>
              </div>
            </div>

            {/* Content */}
            <div style={{padding:'18px 22px 22px'}}>
              {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'12px 14px',borderRadius:10,fontSize:13,marginBottom:14,borderLeft:'4px solid #EF4444',display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18}}>⚠️</span><span>{err}</span></div>}

              {/* ==== MALIPO YA HARAKA (AUTO) — mteja akilipa mfumo unajifungua wenyewe ==== */}
              <div style={{background:'linear-gradient(135deg,#0A6E47,#06502F)',borderRadius:16,padding:'20px',marginBottom:14,color:'#fff',boxShadow:'0 10px 28px rgba(10,110,71,0.3)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:22}}>⚡</span>
                  <span style={{fontWeight:800,fontSize:16}}>Lipa Sasa</span>
                  <span style={{marginLeft:'auto',fontSize:9,fontWeight:800,background:'rgba(242,183,5,0.25)',color:'#F2B705',padding:'3px 9px',borderRadius:20}}>MFUMO HUJIFUNGUA</span>
                </div>
                <div style={{fontSize:12.5,opacity:0.92,lineHeight:1.55,marginBottom:14}}>
                  Weka namba yako ya simu, bonyeza "Lipa Sasa", kisha weka PIN kwenye simu yako. Malipo yakithibitika, mfumo utajifungua wenyewe papo hapo.
                </div>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="📱 Namba yako (07XXXXXXXX)"
                  style={{width:'100%',padding:'13px 15px',borderRadius:11,border:'none',fontSize:15,fontWeight:600,marginBottom:11,boxSizing:'border-box'}}/>
                {autoMsg
                  ?<div style={{background:'rgba(255,255,255,0.16)',borderRadius:11,padding:'14px 15px',fontSize:12.5,lineHeight:1.55}}>
                    <div style={{fontWeight:800,marginBottom:4}}>⏳ Inasubiri uthibitisho...</div>
                    {autoMsg}
                    {autoRef&&<div style={{marginTop:6,fontFamily:'monospace',fontSize:11,opacity:0.85}}>Kumb: {autoRef}</div>}
                  </div>
                  :<button onClick={handleAutoPay} disabled={autoLoading}
                    style={{width:'100%',padding:15,background:'#fff',color:'#0A6E47',border:'none',borderRadius:11,fontWeight:800,fontSize:16,cursor:autoLoading?'wait':'pointer',opacity:autoLoading?0.7:1}}>
                    {autoLoading?'Inatuma...':`⚡ Lipa Sasa — TZS ${price.toLocaleString()}`}
                  </button>}
              </div>

              <div style={{textAlign:'center',fontSize:11.5,color:'#94A3B8',lineHeight:1.5}}>
                Malipo yanashughulikiwa kwa usalama. Ukikwama, wasiliana nasi kupitia namba zilizo chini.
              </div>
            </div>
          </div>}

          {/* Success */}
          {submitted&&!hasPending&&<div style={{background:'#fff',borderRadius:20,padding:32,textAlign:'center',boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}}>
            <div style={{fontSize:64,marginBottom:14,animation:'popIn 0.5s ease both'}}>✅</div>
            <h2 style={{fontSize:22,fontWeight:900,color:'#0A6E47',margin:'0 0 6px'}}>Ombi Limetumwa!</h2>
            <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Admin atathibitisha malipo yako ndani ya dakika chache</p>

            <div style={{background:'#F0FDF4',borderRadius:12,padding:'14px 16px',textAlign:'left',marginBottom:14,border:'1px solid #BBF7D0'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#15803D',marginBottom:6}}>📋 HATUA ZIJAZO:</div>
              <ol style={{fontSize:12,color:'#166534',margin:0,paddingLeft:18,lineHeight:1.7}}>
                <li>Admin atapokea taarifa</li>
                <li>Atathibitisha malipo (dakika 5-30)</li>
                <li>Mfumo utafunguka automatic</li>
                <li>Utapata SMS na email ya kuthibitisha</li>
              </ol>
            </div>

            <button onClick={()=>window.location.reload()} style={{width:'100%',padding:13,background:'#0A6E47',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>🔄 Refresh Mfumo</button>
          </div>}

          {/* Footer */}
          <div style={{textAlign:'center',marginTop:18,color:'#fff'}}>
            <div style={{display:'inline-flex',gap:14,fontSize:11,opacity:0.9,marginBottom:8,flexWrap:'wrap',justifyContent:'center'}}>
              <span>📞 0617 288 752</span>
              <span>💬 +255 628 319 789</span>
            </div>
            <div>
              <button onClick={logout} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',padding:'8px 18px',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer'}}>← Toka</button>
            </div>
            <div style={{fontSize:10,opacity:0.6,marginTop:10}}>© 2026 Duka Langu • 🇹🇿</div>
          </div>
        </div>
      </div>
    </div>
  );
}
