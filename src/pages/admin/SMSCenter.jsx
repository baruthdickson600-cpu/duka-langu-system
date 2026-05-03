import React,{useState,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Stat,Badge,Empty,Input,Sel,Btn,Modal} from '../../components/UI';

const fmtDate=d=>d?new Date(d).toLocaleString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';

// Pre-made templates
const TEMPLATES={
  update:{label:'📢 Update Mpya',message:'Habari! Duka Langu imeboreshwa — features mpya zimeongezwa. Fungua: duka-langu-system.vercel.app\nAsante - Duka Langu'},
  offer:{label:'🎁 Offer Maalum',message:'OFFER MAALUM! Duka Langu — Lipa miezi 3 upate mwezi 1 BURE!\nLipa SELCOM 6113 4066. Bei: TZS 15,000/mwezi\nAsante - Duka Langu'},
  eid:{label:'🌙 Heri ya Eid',message:'Heri ya Eid Mubarak! Tunakutakia siku njema na rehma za Mwenyezi Mungu.\n- Duka Langu'},
  christmas:{label:'🎄 Krismasi',message:'Heri ya Krismasi na Mwaka Mpya! Tunakutakia furaha na mafanikio.\n- Duka Langu'},
  newyear:{label:'🎊 Mwaka Mpya',message:'Heri ya Mwaka Mpya! Tunakutakia mwaka wa mafanikio na furaha.\n- Duka Langu'},
  ramadan:{label:'🌙 Ramadhani',message:'Tunakutakia funga njema ya Ramadhani Mubarak. Mwenyezi Mungu akubariki.\n- Duka Langu'},
  reminder:{label:'⏰ Kumbusho la Malipo',message:'Habari! Hii ni kumbusho la kulipa Duka Langu. Lipa SELCOM 6113 4066 kuendelea.\nMsaada: 0617288752',},
  welcome:{label:'👋 Karibu',message:'Karibu Duka Langu! Mfumo wako uko tayari. Login: duka-langu-system.vercel.app\nMsaada: 0617288752'},
  thanks:{label:'❤️ Asante',message:'Asante kwa kutuamini! Mfumo wako wa Duka Langu uko tayari kukutumikia.\n- Duka Langu'},
  custom:{label:'✏️ Andika Mwenyewe',message:''},
};

export function SMSCenterPage(){
  const{businesses=[],partners=[],supabase,user}=useApp();
  const[recipients,setRecipients]=useState('all_active');
  const[template,setTemplate]=useState('update');
  const[message,setMessage]=useState(TEMPLATES.update.message);
  const[customNumber,setCustomNumber]=useState('');
  const[customNumbers,setCustomNumbers]=useState([]);
  const[sending,setSending]=useState(false);
  const[result,setResult]=useState(null);
  const[history,setHistory]=useState([]);
  const[preview,setPreview]=useState(false);

  // Load history from localStorage
  useEffect(()=>{
    try{const h=JSON.parse(localStorage.getItem('sms_history')||'[]');setHistory(h)}catch(e){}
  },[]);

  // Get recipients based on selection
  const getRecipients=()=>{
    let list=[];
    switch(recipients){
      case'all_active':
        list=businesses.filter(b=>b.token_active&&!b.is_suspended&&b.phone).map(b=>({phone:b.phone,name:b.name}));
        break;
      case'all_trial':
        list=businesses.filter(b=>!b.token_active&&!b.is_suspended&&b.phone).map(b=>({phone:b.phone,name:b.name}));
        break;
      case'all_suspended':
        list=businesses.filter(b=>b.is_suspended&&b.phone).map(b=>({phone:b.phone,name:b.name}));
        break;
      case'expiring':
        list=businesses.filter(b=>{
          if(!b.phone)return false;
          const e=b.token_active?b.token_expiry:b.trial_end;
          if(!e)return false;
          const days=Math.ceil((new Date(e)-new Date())/86400000);
          return days<=7&&days>0;
        }).map(b=>({phone:b.phone,name:b.name}));
        break;
      case'all_partners':
        list=partners.filter(p=>p.phone).map(p=>({phone:p.phone,name:p.name||p.email}));
        break;
      case'all_customers':
        list=businesses.filter(b=>b.phone).map(b=>({phone:b.phone,name:b.name}));
        break;
      case'everyone':
        const bizList=businesses.filter(b=>b.phone).map(b=>({phone:b.phone,name:b.name}));
        const ptList=partners.filter(p=>p.phone).map(p=>({phone:p.phone,name:p.name||p.email}));
        list=[...bizList,...ptList];
        break;
      case'custom':
        list=customNumbers.map(n=>({phone:n,name:'Custom'}));
        break;
    }
    return list;
  };

  const recipientsList=getRecipients();
  const charCount=message.length;
  const smsCount=Math.ceil(charCount/160)||1;
  const cost=recipientsList.length*smsCount*18;

  const handleTemplate=(key)=>{
    setTemplate(key);
    setMessage(TEMPLATES[key].message);
  };

  const addCustomNumber=()=>{
    if(!customNumber)return;
    let n=customNumber.replace(/[^0-9]/g,'');
    if(n.startsWith('0'))n='255'+n.slice(1);
    if(!n.startsWith('255'))n='255'+n;
    if(n.length<12)return alert('Namba si sahihi!');
    setCustomNumbers(p=>[...p,n]);
    setCustomNumber('');
  };

  const sendSMS=async()=>{
    if(!message.trim())return alert('Andika ujumbe!');
    if(!recipientsList.length)return alert('Hakuna mpokeaji!');
    if(!confirm(`Tuma SMS kwa watu ${recipientsList.length}?\n\nGharama tarajiwa: TZS ${cost.toLocaleString()}\n\nEndelea?`))return;
    
    setSending(true);setResult(null);
    let success=0,failed=0;
    
    for(const r of recipientsList){
      try{
        const res=await fetch('/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:r.phone,message})});
        const d=await res.json();
        if(d.success)success++;else failed++;
      }catch(e){failed++}
    }
    
    // Save to history
    const entry={
      id:Date.now(),
      message:message.slice(0,50)+(message.length>50?'...':''),
      recipients:recipientsList.length,
      success,failed,
      template:TEMPLATES[template].label,
      sent_at:new Date().toISOString(),
    };
    const newHistory=[entry,...history].slice(0,50);
    setHistory(newHistory);
    try{localStorage.setItem('sms_history',JSON.stringify(newHistory))}catch(e){}
    
    // Audit log
    supabase?.from('audit_logs').insert({user_role:'admin',action:'sms_broadcast',details:`${TEMPLATES[template].label}: ${success}/${recipientsList.length} sent`}).catch(()=>{});
    
    setResult({success,failed,total:recipientsList.length});
    setSending(false);
    setPreview(false);
  };

  return <div>
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 4px',color:'#0B7A3B'}}>📱 SMS Center</h3>
    <p style={{fontSize:12,color:'#64748B',margin:'0 0 16px'}}>Tuma SMS kwa wateja, washirika, au makundi maalum</p>

    {result&&<div style={{background:result.failed?'#FEF3C7':'#F0FDF4',border:`2px solid ${result.failed?'#FCD34D':'#86EFAC'}`,borderRadius:12,padding:'12px 16px',marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:14,color:result.failed?'#B45309':'#15803D'}}>
        {result.failed===0?'✅ Imefanikiwa kabisa!':result.success===0?'❌ Imeshindwa':'⚠️ Sehemu tu imefanikiwa'}
      </div>
      <div style={{fontSize:12,color:'#475569',marginTop:4}}>Imefanikiwa: <b>{result.success}</b> | Imeshindwa: <b>{result.failed}</b> | Jumla: <b>{result.total}</b></div>
    </div>}

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      {/* LEFT: Compose */}
      <div>
        {/* Recipients */}
        <div className="card" style={{marginBottom:14}}>
          <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>👥 Wapokeaji</h4>
          <Sel value={recipients} onChange={e=>setRecipients(e.target.value)} options={[
            {value:'all_active',label:`✅ Wateja Active (wanaolipa)`},
            {value:'all_trial',label:`⏳ Wateja Trial`},
            {value:'all_suspended',label:`🔒 Wateja Wamefungwa`},
            {value:'expiring',label:`⚠️ Muda Unaisha (siku 7)`},
            {value:'all_customers',label:`🏪 Wateja Wote`},
            {value:'all_partners',label:`📋 Washirika Wote`},
            {value:'everyone',label:`🌍 Kila Mtu`},
            {value:'custom',label:`✏️ Namba za Kawaida`},
          ]}/>
          {recipients==='custom'&&<div style={{marginTop:8}}>
            <div style={{display:'flex',gap:6}}>
              <input type="tel" placeholder="07XXXXXXXX" value={customNumber} onChange={e=>setCustomNumber(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustomNumber()} style={{flex:1,padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13}}/>
              <button onClick={addCustomNumber} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>+</button>
            </div>
            {customNumbers.length>0&&<div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:4}}>{customNumbers.map((n,i)=><span key={i} style={{background:'#F0FDF4',padding:'4px 10px',borderRadius:8,fontSize:11,fontFamily:'monospace',display:'inline-flex',alignItems:'center',gap:4}}>{n}<button onClick={()=>setCustomNumbers(p=>p.filter((_,idx)=>idx!==i))} style={{background:'none',border:'none',color:'#EF4444',fontWeight:700,cursor:'pointer'}}>×</button></span>)}</div>}
          </div>}
          <div style={{marginTop:10,padding:'8px 12px',background:'#EFF6FF',borderRadius:8,fontSize:12,color:'#1E40AF'}}>
            👤 Wapokeaji: <b>{recipientsList.length}</b>
          </div>
        </div>

        {/* Templates */}
        <div className="card" style={{marginBottom:14}}>
          <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📋 Templates</h4>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:6}}>
            {Object.entries(TEMPLATES).map(([k,t])=><button key={k} onClick={()=>handleTemplate(k)} style={{padding:'8px 10px',borderRadius:8,border:template===k?'2px solid #0B7A3B':'1px solid #E2E8F0',background:template===k?'#F0FDF4':'#fff',fontWeight:template===k?700:500,fontSize:11,cursor:'pointer',color:template===k?'#0B7A3B':'#64748B',textAlign:'left'}}>{t.label}</button>)}
          </div>
        </div>

        {/* Message */}
        <div className="card">
          <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>✏️ Ujumbe</h4>
          <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Andika ujumbe wako..." rows={6} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',resize:'vertical',outline:'none',transition:'all 0.3s'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,color:'#94A3B8'}}>
            <span>Herufi: <b style={{color:charCount>160?'#F59E0B':'#0B7A3B'}}>{charCount}</b></span>
            <span>SMS: <b>{smsCount}</b></span>
            <span>Gharama: <b style={{color:'#EF4444'}}>~TZS {cost.toLocaleString()}</b></span>
          </div>
        </div>
      </div>

      {/* RIGHT: Preview & Send */}
      <div>
        <div className="card" style={{marginBottom:14,background:'#FAFBFC'}}>
          <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📱 Preview</h4>
          {/* Phone mockup */}
          <div style={{background:'#1E293B',borderRadius:20,padding:8,maxWidth:280,margin:'0 auto'}}>
            <div style={{background:'#fff',borderRadius:14,padding:'14px 12px',minHeight:200}}>
              <div style={{fontSize:10,color:'#94A3B8',fontWeight:600,marginBottom:6}}>SMS • dukalangu</div>
              <div style={{background:'#E2E8F0',borderRadius:14,borderTopLeftRadius:4,padding:'10px 14px',fontSize:12,lineHeight:1.5,color:'#1E293B',whiteSpace:'pre-wrap'}}>
                {message||'Andika ujumbe...'}
              </div>
              <div style={{fontSize:9,color:'#94A3B8',marginTop:6,textAlign:'right'}}>{new Date().toLocaleTimeString('sw-TZ',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>
        </div>

        {/* Send Button */}
        <button onClick={sendSMS} disabled={sending||!recipientsList.length||!message.trim()} style={{width:'100%',padding:16,background:sending?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:14,fontWeight:800,fontSize:15,cursor:sending?'wait':'pointer',boxShadow:'0 4px 20px rgba(11,122,59,0.3)'}}>
          {sending?'⏳ Inatuma...':`📱 Tuma SMS (${recipientsList.length})`}
        </button>
        
        <div style={{marginTop:8,padding:'10px 14px',background:'#FFF7ED',borderRadius:10,border:'1px solid #FED7AA',fontSize:11,color:'#B45309'}}>
          ⚠️ Hakikisha ujumbe ni sahihi kabla kutuma. Haitarudishwa.
        </div>
      </div>
    </div>

    {/* History */}
    {history.length>0&&<div className="card" style={{marginTop:16}}>
      <h4 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📜 Historia ya SMS ({history.length})</h4>
      <div style={{maxHeight:300,overflowY:'auto'}}>
        {history.map(h=><div key={h.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontWeight:600,fontSize:13}}>{h.template}</div>
            <div style={{fontSize:11,color:'#64748B'}}>{h.message}</div>
            <div style={{fontSize:10,color:'#94A3B8'}}>{fmtDate(h.sent_at)}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <Badge color={h.failed?'#F59E0B':'#22C55E'}>{h.success}/{h.recipients}</Badge>
          </div>
        </div>)}
      </div>
    </div>}
  </div>;
}
