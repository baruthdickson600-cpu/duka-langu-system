import React,{useState,useEffect,useRef} from 'react';
import {useApp} from '../context/AppContext';
import {Input} from '../components/UI';

const BG_COUNT=13;
const BG_INTERVAL=10000;

export default function LockedPage(){
  const{biz,user,settings,submitPayment,activateToken,paymentRequests,logout}=useApp();
  const[tab,setTab]=useState('pay');
  const[txId,setTxId]=useState('');
  const[phone,setPhone]=useState(user?.phone||'');
  const[payProvider,setPayProvider]=useState('HALOPESA');
  const[token,setToken]=useState('');
  const[submitting,setSubmitting]=useState(false);
  const[submitted,setSubmitted]=useState(false);
  const[err,setErr]=useState('');
  const[step,setStep]=useState(1); // 1=instructions, 2=enter, 3=success
  const[copied,setCopied]=useState('');
  const[bgA,setBgA]=useState(Math.floor(Math.random()*BG_COUNT)+1);
  const[bgB,setBgB]=useState(null);
  const[showB,setShowB]=useState(false);

  // My pending payment
  const myPending=paymentRequests?.find(p=>p.business_id===biz?.id&&p.status==='pending');
  const myRejected=paymentRequests?.find(p=>p.business_id===biz?.id&&p.status==='rejected');
  const hasPending=!!myPending;

  const price=parseInt(settings?.system_price||'15000');
  const PAYBILL='25187616';
  const RECIPIENT='DUKALANGU';

  // Crossfade backgrounds
  useEffect(()=>{
    const timer=setInterval(()=>{
      const next=(showB?bgA:bgB||bgA)%BG_COUNT+1;
      if(showB){setBgA(next);setTimeout(()=>setShowB(false),50)}
      else{setBgB(next);setTimeout(()=>setShowB(true),50)}
    },BG_INTERVAL);
    return()=>clearInterval(timer);
  },[bgA,bgB,showB]);

  const copyText=(text,key)=>{
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(()=>setCopied(''),2000);
  };

  const handleSubmitPayment=async()=>{
    if(!txId.trim())return setErr('Weka Transaction ID kutoka SMS!');
    if(txId.trim().length<5)return setErr('Transaction ID si sahihi (lazima iwe 5+ herufi)');
    if(!phone.trim())return setErr('Weka namba uliyolipia!');
    setSubmitting(true);setErr('');
    try{
      const result=await submitPayment(txId.trim(),price,payProvider,phone.trim());
      if(result?.error){setErr(result.error);setSubmitting(false);return}
      setSubmitted(true);
    }catch(e){setErr('Tatizo: '+(e.message||'Jaribu tena'))}
    setSubmitting(false);
  };

  const handleToken=async()=>{
    if(!token.trim())return setErr('Weka token!');
    setSubmitting(true);setErr('');
    const result=await activateToken(token.trim().toUpperCase());
    if(result?.error)setErr(result.error);
    else window.location.reload();
    setSubmitting(false);
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
            <div style={{background:'linear-gradient(135deg,#0B7A3B,#065F2E)',padding:'24px 22px',color:'#fff',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.1)'}}/>
              <div style={{position:'absolute',bottom:-30,left:-30,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
              <div style={{position:'relative',zIndex:1}}>
                <div style={{fontSize:11,fontWeight:600,opacity:0.85,letterSpacing:2,marginBottom:4}}>BEI YA MFUMO</div>
                <div style={{fontSize:38,fontWeight:900,letterSpacing:-1}}>TZS {price.toLocaleString()}</div>
                <div style={{fontSize:12,opacity:0.85,marginTop:2}}>kwa mwezi mmoja</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',background:'#F8FAFC',padding:6,margin:'14px 14px 0',borderRadius:12}}>
              <button onClick={()=>{setTab('pay');setErr('')}} style={{flex:1,padding:'11px 0',borderRadius:9,border:'none',fontWeight:800,fontSize:13,background:tab==='pay'?'#fff':'transparent',color:tab==='pay'?'#0B7A3B':'#94A3B8',boxShadow:tab==='pay'?'0 2px 8px rgba(0,0,0,0.06)':'none',cursor:'pointer',transition:'all 0.25s'}}>💰 Lipa Sasa</button>
              <button onClick={()=>{setTab('token');setErr('')}} style={{flex:1,padding:'11px 0',borderRadius:9,border:'none',fontWeight:800,fontSize:13,background:tab==='token'?'#fff':'transparent',color:tab==='token'?'#0B7A3B':'#94A3B8',boxShadow:tab==='token'?'0 2px 8px rgba(0,0,0,0.06)':'none',cursor:'pointer',transition:'all 0.25s'}}>🔑 Nina Token</button>
            </div>

            {/* Content */}
            <div style={{padding:'18px 22px 22px'}}>
              
              {tab==='pay'&&<>
                {/* Step Progress */}
                <div style={{display:'flex',gap:6,marginBottom:14}}>
                  {[1,2,3].map(n=><div key={n} style={{flex:1,height:5,borderRadius:5,background:step>=n?'#0B7A3B':'#E2E8F0',transition:'all 0.4s'}}/>)}
                </div>

                {step===1&&<>
                  <div style={{textAlign:'center',marginBottom:14}}>
                    <div style={{fontSize:14,fontWeight:800,color:'#1E293B',marginBottom:2}}>Hatua 1 — Lipa HaloPesa</div>
                    <div style={{fontSize:12,color:'#64748B'}}>Fuata hatua hizi kwenye simu yako</div>
                  </div>

                  {/* Selcom Steps */}
                  <div style={{background:'linear-gradient(135deg,#FFF7ED,#FFEDD5)',borderRadius:14,padding:'16px 18px',border:'1px solid #FED7AA',marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <span style={{fontSize:20}}>🟠</span>
                      <span style={{fontWeight:800,fontSize:14,color:'#9A3412'}}>Hatua za Kulipa HALOPESA Lipa Namba</span>
                    </div>
                    
                    {[
                      {n:1,t:'Fungua menu ya simu yako kupiga: *150*88#'},
                      {n:2,t:'Chagua "Lipa Bili" → "Lipa Namba"'},
                      {n:3,t:'Weka Lipa Namba:',copy:PAYBILL,key:'paybill'},
                      {n:4,t:'Hakikisha jina:',copy:RECIPIENT,key:'recipient',isText:true},
                      {n:5,t:'Weka kiasi:',copy:`${price}`,key:'amount',isAmount:true},
                      {n:6,t:'Thibitisha na ingiza PIN yako'},
                      {n:7,t:'Hifadhi Reference Number kutoka SMS'},
                    ].map((s,i)=><div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                      <div style={{minWidth:24,height:24,borderRadius:'50%',background:'#EA580C',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:11,flexShrink:0}}>{s.n}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:'#7C2D12',lineHeight:1.4}}>{s.t}</div>
                        {s.copy&&<div onClick={()=>copyText(s.copy,s.key)} style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:4,padding:'5px 10px',background:'#fff',borderRadius:8,border:'1px dashed #EA580C',cursor:'pointer',transition:'all 0.2s'}}>
                          <span style={{fontFamily:'monospace',fontWeight:800,color:s.isAmount?'#0B7A3B':'#9A3412',fontSize:s.isAmount?15:13}}>{s.isAmount?`TZS ${(+s.copy).toLocaleString()}`:s.copy}</span>
                          <span style={{fontSize:10,color:copied===s.key?'#22C55E':'#94A3B8',fontWeight:700}}>{copied===s.key?'✓ COPIED':'📋 COPY'}</span>
                        </div>}
                      </div>
                    </div>)}
                    
                    <div style={{marginTop:10,padding:'8px 12px',background:'#FEF3C7',borderRadius:8,fontSize:11,color:'#78350F',display:'flex',gap:6,alignItems:'flex-start'}}>
                      <span style={{fontSize:14}}>💡</span>
                      <span><b>Mitandao yote:</b> Vodacom, Tigo, Airtel, Halotel — wote wanaweza kulipia HaloPesa Lipa Namba kwa kupiga <b>*150*88#</b></span>
                    </div>
                  </div>

                  <button onClick={()=>setStep(2)} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer',boxShadow:'0 8px 24px rgba(11,122,59,0.35)'}}>
                    ✅ Nimemaliza Kulipa →
                  </button>
                </>}

                {step===2&&<>
                  <div style={{textAlign:'center',marginBottom:14}}>
                    <div style={{fontSize:14,fontWeight:800,color:'#1E293B',marginBottom:2}}>Hatua 2 — Thibitisha Malipo</div>
                    <div style={{fontSize:12,color:'#64748B'}}>Weka taarifa kutoka kwenye SMS uliyopokea</div>
                  </div>

                  {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'12px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444',display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18}}>⚠️</span><span>{err}</span></div>}

                  <Input label="🧾 Transaction ID (kutoka SMS ya HaloPesa)" placeholder="Mf: MP240501ABC123" value={txId} onChange={e=>setTxId(e.target.value)}/>
                  
                  <Input label="📱 Namba uliyolipia" placeholder="07XXXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)}/>

                  <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:11,color:'#1E40AF',display:'flex',gap:8,alignItems:'flex-start'}}>
                    <span style={{fontSize:14,flexShrink:0}}>💡</span>
                    <span>Transaction ID inapatikana kwenye SMS uliyopokea kutoka HaloPesa baada ya kulipa. Mfano: <b style={{fontFamily:'monospace'}}>MP240501ABC123</b></span>
                  </div>

                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>{setStep(1);setErr('')}} style={{padding:14,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:12,fontWeight:700,fontSize:13,cursor:'pointer',minWidth:80}}>← Rudi</button>
                    <button onClick={handleSubmitPayment} disabled={submitting} style={{flex:1,padding:14,background:submitting?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:submitting?'wait':'pointer',boxShadow:'0 8px 24px rgba(11,122,59,0.35)'}}>
                      {submitting?'⏳ Inatuma...':'📨 Tuma Ombi la Malipo'}
                    </button>
                  </div>
                </>}
              </>}

              {tab==='token'&&<>
                <div style={{textAlign:'center',marginBottom:14}}>
                  <div style={{fontSize:32,marginBottom:6}}>🔑</div>
                  <div style={{fontSize:14,fontWeight:800,color:'#1E293B',marginBottom:2}}>Ingiza Token</div>
                  <div style={{fontSize:12,color:'#64748B'}}>Token unayopata kutoka Admin au Mshirika</div>
                </div>

                {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'12px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>⚠️ {err}</div>}

                <input value={token} onChange={e=>setToken(e.target.value.toUpperCase())} placeholder="TK-XXXXXXXX" style={{width:'100%',padding:'16px 18px',borderRadius:12,border:'2px solid #E2E8F0',fontSize:18,fontFamily:'monospace',fontWeight:800,letterSpacing:3,textAlign:'center',color:'#0B7A3B',boxSizing:'border-box',marginBottom:14,background:'#F0FDF4'}}/>

                <button onClick={handleToken} disabled={submitting} style={{width:'100%',padding:14,background:submitting?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:submitting?'wait':'pointer',boxShadow:'0 8px 24px rgba(11,122,59,0.35)'}}>
                  {submitting?'⏳ Inathibitisha...':'🔓 Fungua Mfumo'}
                </button>
              </>}
            </div>
          </div>}

          {/* Success */}
          {submitted&&!hasPending&&<div style={{background:'#fff',borderRadius:20,padding:32,textAlign:'center',boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}}>
            <div style={{fontSize:64,marginBottom:14,animation:'popIn 0.5s ease both'}}>✅</div>
            <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 6px'}}>Ombi Limetumwa!</h2>
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

            <button onClick={()=>window.location.reload()} style={{width:'100%',padding:13,background:'#0B7A3B',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>🔄 Refresh Mfumo</button>
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
            <div style={{fontSize:10,opacity:0.6,marginTop:10}}>© 2026 PesaFly / Duka Langu • 🇹🇿</div>
          </div>
        </div>
      </div>
    </div>
  );
}
