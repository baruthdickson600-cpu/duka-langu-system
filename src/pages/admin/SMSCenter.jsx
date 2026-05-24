import React,{useState,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Stat,Badge,Empty,Input,Sel,Btn,Modal} from '../../components/UI';

const fmtDate=d=>d?new Date(d).toLocaleString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const fmtTime=d=>d?new Date(d).toLocaleTimeString('sw-TZ',{hour:'2-digit',minute:'2-digit'}):'—';

// Templates with personalization variables
const TEMPLATES={
  update:{label:'📢 Update',cat:'general',msg:'Habari {jina}! Duka Langu imeboreshwa — features mpya zimeongezwa. Fungua mfumo: duka-langu-system.vercel.app\n- Duka Langu'},
  offer:{label:'🎁 Offer',cat:'promo',msg:'Habari {jina}! OFFER MAALUM — Lipa miezi 3 upate mwezi 1 BURE!\nHALOPESA Lipa Namba 25187616. TZS 15,000/mwezi\n- Duka Langu'},
  eid:{label:'🌙 Eid',cat:'holiday',msg:'Heri ya Eid Mubarak {jina}! Tunakutakia siku njema na rehma za Mwenyezi Mungu.\n- Duka Langu'},
  christmas:{label:'🎄 Krismasi',cat:'holiday',msg:'Heri ya Krismasi {jina}! Tunakutakia furaha na mafanikio.\n- Duka Langu'},
  newyear:{label:'🎊 Mwaka Mpya',cat:'holiday',msg:'Heri ya Mwaka Mpya {jina}! Tunakutakia mwaka wa mafanikio.\n- Duka Langu'},
  ramadan:{label:'🌙 Ramadhani',cat:'holiday',msg:'{jina}, tunakutakia funga njema ya Ramadhani Mubarak.\n- Duka Langu'},
  reminder:{label:'⏰ Kumbusho',cat:'business',msg:'Habari {jina}! Hii ni kumbusho la kulipa Duka Langu. Lipa HALOPESA Lipa Namba 25187616. Msaada: 0617288752'},
  debt:{label:'💳 Deni',cat:'business',msg:'Habari {jina}, una deni la TZS {kiasi}. Tafadhali lipa hivi karibuni.\n- {biashara}'},
  welcome:{label:'👋 Karibu',cat:'general',msg:'Karibu Duka Langu {jina}! Mfumo wako uko tayari.\nLogin: duka-langu-system.vercel.app\nMsaada: 0617288752'},
  thanks:{label:'❤️ Asante',cat:'general',msg:'Asante {jina} kwa kutuamini! Mfumo wako wa Duka Langu uko tayari kukutumikia.\n- Duka Langu'},
  custom:{label:'✏️ Andika',cat:'custom',msg:''},
};

// Personalize message with variables
const personalize=(msg,recipient)=>{
  if(!msg)return msg;
  return msg
    .replace(/\{jina\}/gi,recipient.name||'Mteja')
    .replace(/\{biashara\}/gi,recipient.business||'Duka Langu')
    .replace(/\{kiasi\}/gi,recipient.amount?recipient.amount.toLocaleString():'0')
    .replace(/\{simu\}/gi,recipient.phone||'');
};

export function SMSCenterPage(){
  const{businesses=[],partners=[],promoCodes=[],customers=[],sales=[],supabase,user}=useApp();
  const[recipients,setRecipients]=useState('all_active');
  const[template,setTemplate]=useState('update');
  const[message,setMessage]=useState(TEMPLATES.update.msg);
  const[customNumber,setCustomNumber]=useState('');
  const[customNumbers,setCustomNumbers]=useState([]);
  const[sending,setSending]=useState(false);
  const[result,setResult]=useState(null);
  const[history,setHistory]=useState([]);
  const[search,setSearch]=useState('');
  const[filterStatus,setFilterStatus]=useState('all');
  const[scheduleDate,setScheduleDate]=useState('');
  const[scheduleTime,setScheduleTime]=useState('');
  const[autoConfig,setAutoConfig]=useState({payment:true,welcome:true,reminder:false,daily:false});
  const[showAutoModal,setShowAutoModal]=useState(false);
  const[smsBalance,setSmsBalance]=useState(0);

  // Load history & auto config
  useEffect(()=>{
    try{
      const h=JSON.parse(localStorage.getItem('sms_history')||'[]');setHistory(h);
      const cfg=JSON.parse(localStorage.getItem('sms_auto_config')||'null');
      if(cfg)setAutoConfig(cfg);
    }catch(e){}
  },[]);

  // Today stats
  const today=new Date().toISOString().split('T')[0];
  const todayMessages=history.filter(h=>h.sent_at?.startsWith(today));
  const todaySent=todayMessages.reduce((a,h)=>a+(h.success||0),0);
  const todayFailed=todayMessages.reduce((a,h)=>a+(h.failed||0),0);
  const totalSent=history.reduce((a,h)=>a+(h.success||0),0);
  const totalFailed=history.reduce((a,h)=>a+(h.failed||0),0);
  const deliveryRate=totalSent+totalFailed>0?Math.round(totalSent/(totalSent+totalFailed)*100):100;

  // Recipient list
  const ms=today.slice(0,7);
  const getRecipients=()=>{
    let list=[];
    switch(recipients){
      case'all_active':
        list=businesses.filter(b=>b.token_active&&!b.is_suspended&&b.phone).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name}));
        break;
      case'all_trial':
        list=businesses.filter(b=>!b.token_active&&!b.is_suspended&&b.phone).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name}));
        break;
      case'all_suspended':
        list=businesses.filter(b=>b.is_suspended&&b.phone).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name}));
        break;
      case'expiring':
        list=businesses.filter(b=>{if(!b.phone)return false;const e=b.token_active?b.token_expiry:b.trial_end;if(!e)return false;const days=Math.ceil((new Date(e)-new Date())/86400000);return days<=7&&days>0}).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name}));
        break;
      case'with_debt':
        list=businesses.filter(b=>b.phone&&!b.token_active).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name,amount:15000}));
        break;
      case'this_month':
        const monthBizIds=[...new Set(sales.filter(s=>s.created_at?.startsWith(ms)).map(s=>s.business_id))];
        list=businesses.filter(b=>b.phone&&monthBizIds.includes(b.id)).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name}));
        break;
      case'all_partners':
        const partnerList=partners.filter(p=>p.phone).map(p=>({phone:p.phone,name:p.name||p.email,business:'Mshirika'}));
        const agentList=promoCodes.filter(p=>p.agent_phone).map(p=>({phone:p.agent_phone,name:p.agent_name||'Wakala',business:'Wakala'}));
        list=[...partnerList,...agentList];
        break;
      case'all_agents':
        list=promoCodes.filter(p=>p.agent_phone).map(p=>({phone:p.agent_phone,name:p.agent_name||'Wakala',business:'Wakala'}));
        break;
      case'all_customers':
        list=businesses.filter(b=>b.phone).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name}));
        break;
      case'everyone':
        const bizList=businesses.filter(b=>b.phone).map(b=>({phone:b.phone,name:b.owner_name||b.name,business:b.name}));
        const ptList=partners.filter(p=>p.phone).map(p=>({phone:p.phone,name:p.name||p.email,business:'Mshirika'}));
        const agList=promoCodes.filter(p=>p.agent_phone).map(p=>({phone:p.agent_phone,name:p.agent_name||'Wakala',business:'Wakala'}));
        list=[...bizList,...ptList,...agList];
        break;
      case'custom':
        list=customNumbers.map(n=>({phone:n,name:'Mteja',business:'Duka'}));
        break;
    }
    return list;
  };

  const recipientsList=getRecipients();
  const charCount=message.length;
  const smsCount=Math.ceil(charCount/160)||1;
  const cost=recipientsList.length*smsCount*18;

  const handleTemplate=(key)=>{setTemplate(key);setMessage(TEMPLATES[key].msg)};

  const addCustomNumber=()=>{
    if(!customNumber)return;
    let n=customNumber.replace(/[^0-9]/g,'');
    if(n.startsWith('0'))n='255'+n.slice(1);
    if(!n.startsWith('255'))n='255'+n;
    if(n.length<12)return alert('Namba si sahihi!');
    setCustomNumbers(p=>[...p,n]);setCustomNumber('');
  };

  const sendSMS=async(scheduled=false)=>{
    if(!message.trim())return alert('Andika ujumbe!');
    if(!recipientsList.length)return alert('Hakuna mpokeaji!');
    if(scheduled&&(!scheduleDate||!scheduleTime))return alert('Weka tarehe na muda wa kutuma!');
    
    const action=scheduled?`Panga SMS itume ${scheduleDate} saa ${scheduleTime}`:`Tuma SMS sasa kwa watu ${recipientsList.length}?\n\nGharama: TZS ${cost.toLocaleString()}`;
    if(!confirm(action+'\n\nEndelea?'))return;
    
    setSending(true);setResult(null);
    
    if(scheduled){
      // Save to scheduled queue (localStorage for now)
      const scheduledItem={
        id:Date.now(),
        recipients:recipientsList,
        message,
        scheduled_for:`${scheduleDate}T${scheduleTime}:00`,
        created_at:new Date().toISOString(),
        status:'scheduled',
      };
      try{
        const scheduled=JSON.parse(localStorage.getItem('sms_scheduled')||'[]');
        scheduled.push(scheduledItem);
        localStorage.setItem('sms_scheduled',JSON.stringify(scheduled));
        await supabase?.from('scheduled_sms').insert({...scheduledItem,recipients_data:JSON.stringify(recipientsList)});
      }catch(e){console.warn('Scheduled save:',e.message)}
      
      setResult({success:0,failed:0,total:recipientsList.length,scheduled:true});
      setSending(false);
      return;
    }
    
    // BATCH SEND - one API call for all recipients (much faster, more reliable)
    let success=0,failed=0;
    const failedNumbers=[];
    
    // Filter valid recipients and personalize each message
    const validRecipients=recipientsList
      .filter(r=>r.phone&&r.phone.length>=9)
      .map(r=>({phone:r.phone,message:personalize(message,r),name:r.name}));
    
    const skipped=recipientsList.length-validRecipients.length;
    failed+=skipped;
    
    if(validRecipients.length>0){
      // Split into chunks of 20 to avoid Vercel timeout (60s with 5 parallel = ~12s per chunk)
      const CHUNK_SIZE=20;
      const chunks=[];
      for(let i=0;i<validRecipients.length;i+=CHUNK_SIZE){
        chunks.push(validRecipients.slice(i,i+CHUNK_SIZE));
      }
      
      for(const chunk of chunks){
        try{
          const controller=new AbortController();
          const timeoutId=setTimeout(()=>controller.abort(),55000); // 55s per chunk
          
          const res=await fetch('/api/send-sms',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({recipients:chunk}),
            signal:controller.signal,
          });
          clearTimeout(timeoutId);
          
          const d=await res.json().catch(()=>({success:false,error:'Parse error'}));
          if(d.success){
            success+=d.sent||0;
            failed+=d.failed||0;
            if(d.results){
              d.results.filter(r=>!r.ok).forEach(r=>failedNumbers.push({phone:r.phone,reason:r.error||r.status||'Failed'}));
            }
          }else{
            failed+=chunk.length;
            failedNumbers.push({phone:`Batch ${chunk.length}`,reason:d.error||'Server error'});
          }
        }catch(e){
          failed+=chunk.length;
          failedNumbers.push({phone:`Batch ${chunk.length}`,reason:e.name==='AbortError'?'Timeout':e.message});
        }
      }
    }
    
    const entry={
      id:Date.now(),
      message:message.slice(0,80)+(message.length>80?'...':''),
      full_message:message,
      recipients:recipientsList.length,
      success,failed,
      failed_numbers:failedNumbers.slice(0,5),
      template:TEMPLATES[template].label,
      sent_at:new Date().toISOString(),
      status:failed===0?'delivered':success===0?'failed':'partial',
    };
    const newHistory=[entry,...history].slice(0,100);
    setHistory(newHistory);
    try{localStorage.setItem('sms_history',JSON.stringify(newHistory))}catch(e){}
    try{await supabase?.from('audit_logs').insert({user_role:'admin',action:'sms_broadcast',details:`${TEMPLATES[template].label}: ${success}/${recipientsList.length}`})}catch(e){}
    
    setResult({success,failed,total:recipientsList.length});
    setSending(false);
  };

  const saveAutoConfig=async()=>{
    try{localStorage.setItem('sms_auto_config',JSON.stringify(autoConfig))}catch(e){}
    try{await supabase?.from('settings').upsert({key:'sms_auto_config',value:JSON.stringify(autoConfig)})}catch(e){}
    alert('✅ Mipangilio ya Auto SMS imehifadhiwa!');
    setShowAutoModal(false);
  };

  // Filter history
  const filteredHistory=history.filter(h=>{
    if(filterStatus!=='all'&&h.status!==filterStatus)return false;
    if(search&&!h.message.toLowerCase().includes(search.toLowerCase())&&!h.template.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,flexWrap:'wrap',gap:8}}>
      <div>
        <h3 style={{fontSize:22,fontWeight:900,margin:'0 0 4px',color:'#0B7A3B'}}>📱 SMS Center</h3>
        <p style={{fontSize:12,color:'#64748B',margin:0}}>Tuma SMS kwa wateja, washirika, makundi maalum</p>
      </div>
      <button onClick={()=>setShowAutoModal(true)} style={{padding:'10px 18px',borderRadius:12,border:'2px solid #8B5CF6',background:'#F5F3FF',color:'#7C3AED',fontWeight:700,fontSize:13,cursor:'pointer'}}>
        ⚙️ Auto SMS Settings
      </button>
    </div>

    {/* DASHBOARD STATS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:18,marginTop:14}}>
      <div className="card" style={{textAlign:'center',padding:'16px 14px',borderTop:'4px solid #22C55E',cursor:'default'}}>
        <div style={{fontSize:32,marginBottom:4}}>📨</div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>SMS Leo</div>
        <div style={{fontSize:24,fontWeight:900,color:'#22C55E'}}>{todaySent}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>zimetumwa</div>
      </div>
      <div className="card" style={{textAlign:'center',padding:'16px 14px',borderTop:'4px solid #EF4444'}}>
        <div style={{fontSize:32,marginBottom:4}}>❌</div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>Zilizofail</div>
        <div style={{fontSize:24,fontWeight:900,color:'#EF4444'}}>{todayFailed}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>leo</div>
      </div>
      <div className="card" style={{textAlign:'center',padding:'16px 14px',borderTop:'4px solid #3B82F6'}}>
        <div style={{fontSize:32,marginBottom:4}}>📊</div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>Delivery Rate</div>
        <div style={{fontSize:24,fontWeight:900,color:deliveryRate>=90?'#22C55E':deliveryRate>=70?'#F59E0B':'#EF4444'}}>{deliveryRate}%</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>kwa jumla</div>
      </div>
      <div className="card" style={{textAlign:'center',padding:'16px 14px',borderTop:'4px solid #8B5CF6'}}>
        <div style={{fontSize:32,marginBottom:4}}>📈</div>
        <div style={{fontSize:11,color:'#64748B',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>Total SMS</div>
        <div style={{fontSize:24,fontWeight:900,color:'#8B5CF6'}}>{totalSent}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>zimewahi tumwa</div>
      </div>
    </div>

    {result&&<div style={{background:result.scheduled?'#EFF6FF':result.failed?'#FEF3C7':'#F0FDF4',border:`2px solid ${result.scheduled?'#BFDBFE':result.failed?'#FCD34D':'#86EFAC'}`,borderRadius:14,padding:'14px 18px',marginBottom:14,boxShadow:'0 4px 15px rgba(0,0,0,0.05)',animation:'slideDown 0.4s ease both'}}>
      <div style={{fontWeight:800,fontSize:15,color:result.scheduled?'#1E40AF':result.failed?'#B45309':'#15803D'}}>
        {result.scheduled?'⏰ SMS Imepangwa Kutumwa!':result.failed===0?'✅ Imefanikiwa Kabisa!':result.success===0?'❌ Imeshindwa':'⚠️ Sehemu Tu'}
      </div>
      <div style={{fontSize:12,color:'#475569',marginTop:6}}>
        {result.scheduled?`Itatumwa ${scheduleDate} saa ${scheduleTime} kwa watu ${result.total}`:`Imefanikiwa: ${result.success} | Imeshindwa: ${result.failed} | Jumla: ${result.total}`}
      </div>
    </div>}

    {/* MAIN GRID */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:18}}>
      {/* COMPOSE */}
      <div>
        <div className="card" style={{marginBottom:12}}>
          <h4 style={{fontSize:14,fontWeight:800,margin:'0 0 10px',color:'#0B7A3B'}}>👥 Wapokeaji</h4>
          <Sel value={recipients} onChange={e=>setRecipients(e.target.value)} options={[
            {value:'all_active',label:`✅ Wateja Active (wanaolipa)`},
            {value:'all_trial',label:`⏳ Wateja Trial`},
            {value:'all_suspended',label:`🔒 Wateja Wamefungwa`},
            {value:'expiring',label:`⚠️ Muda Unaisha (siku 7)`},
            {value:'with_debt',label:`💳 Wenye Madeni`},
            {value:'this_month',label:`📅 Walio-uza Mwezi Huu`},
            {value:'all_customers',label:`🏪 Wateja Wote`},
            {value:'all_partners',label:`📋 Washirika & Mawakala`},
            {value:'all_agents',label:`👥 Mawakala Tu (${promoCodes.filter(p=>p.agent_phone).length})`},
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
          <div style={{marginTop:10,padding:'10px 14px',background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',borderRadius:10,fontSize:13,color:'#1E40AF',fontWeight:700,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>👤 Wapokeaji</span>
            <span style={{fontSize:18,fontWeight:900}}>{recipientsList.length}</span>
          </div>
        </div>

        <div className="card" style={{marginBottom:12}}>
          <h4 style={{fontSize:14,fontWeight:800,margin:'0 0 10px',color:'#0B7A3B'}}>📋 Templates</h4>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:6}}>
            {Object.entries(TEMPLATES).map(([k,t])=><button key={k} onClick={()=>handleTemplate(k)} style={{padding:'10px 8px',borderRadius:10,border:template===k?'2px solid #0B7A3B':'1px solid #E2E8F0',background:template===k?'linear-gradient(135deg,#F0FDF4,#DCFCE7)':'#fff',fontWeight:template===k?700:500,fontSize:11,cursor:'pointer',color:template===k?'#0B7A3B':'#64748B',textAlign:'left',transition:'all 0.25s cubic-bezier(.4,0,.2,1)'}}>{t.label}</button>)}
          </div>
        </div>

        <div className="card">
          <h4 style={{fontSize:14,fontWeight:800,margin:'0 0 10px',color:'#0B7A3B'}}>✏️ Ujumbe</h4>
          <div style={{background:'#FFF7ED',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:11,color:'#92400E',display:'flex',gap:6,alignItems:'flex-start'}}>
            <span>💡</span>
            <span><b>Personalization:</b> Tumia <b>{`{jina}`}</b>, <b>{`{biashara}`}</b>, <b>{`{kiasi}`}</b> kuongeza taarifa za mteja moja kwa moja</span>
          </div>
          <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Andika ujumbe wako... Tumia {jina}, {biashara}, {kiasi}" rows={5} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',resize:'vertical',outline:'none',transition:'all 0.3s',boxSizing:'border-box'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,gap:8,flexWrap:'wrap'}}>
            <span style={{color:'#94A3B8'}}>Herufi: <b style={{color:charCount>160?'#F59E0B':'#0B7A3B'}}>{charCount}</b></span>
            <span style={{color:'#94A3B8'}}>SMS: <b>{smsCount}</b></span>
            <span style={{color:'#EF4444',fontWeight:700}}>~TZS {cost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* PREVIEW & SEND */}
      <div>
        <div className="card" style={{marginBottom:12,background:'linear-gradient(135deg,#F8FAFC,#F1F5F9)'}}>
          <h4 style={{fontSize:14,fontWeight:800,margin:'0 0 10px',color:'#0B7A3B'}}>📱 Preview {recipientsList[0]?<span style={{fontSize:10,color:'#64748B',fontWeight:500}}>(ya {recipientsList[0]?.name})</span>:''}</h4>
          <div style={{background:'#1E293B',borderRadius:24,padding:10,maxWidth:280,margin:'0 auto',boxShadow:'0 12px 30px rgba(0,0,0,0.2)'}}>
            <div style={{background:'#fff',borderRadius:16,padding:'14px 12px',minHeight:200,position:'relative'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,paddingBottom:6,borderBottom:'1px solid #F1F5F9'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700}}>D</div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#1E293B'}}>dukalangu</div>
                  <div style={{fontSize:9,color:'#94A3B8'}}>{fmtTime(new Date())}</div>
                </div>
              </div>
              <div style={{background:'#E2E8F0',borderRadius:14,borderTopLeftRadius:4,padding:'10px 14px',fontSize:12,lineHeight:1.5,color:'#1E293B',whiteSpace:'pre-wrap',animation:'fadeIn 0.4s ease'}}>
                {recipientsList[0]?personalize(message,recipientsList[0]):message||'Andika ujumbe...'}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="card" style={{marginBottom:12}}>
          <h4 style={{fontSize:14,fontWeight:800,margin:'0 0 10px',color:'#0B7A3B'}}>⏰ Panga Muda (Hiari)</h4>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div>
              <label style={{fontSize:11,color:'#475569',fontWeight:600,display:'block',marginBottom:4}}>Tarehe</label>
              <input type="date" value={scheduleDate} min={today} onChange={e=>setScheduleDate(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{fontSize:11,color:'#475569',fontWeight:600,display:'block',marginBottom:4}}>Muda</label>
              <input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,boxSizing:'border-box'}}/>
            </div>
          </div>
          {scheduleDate&&scheduleTime&&<div style={{marginTop:8,padding:'8px 12px',background:'#EFF6FF',borderRadius:8,fontSize:11,color:'#1E40AF'}}>
            ⏰ Itatumwa: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('sw-TZ')}
          </div>}
        </div>

        {/* Send buttons */}
        <button onClick={()=>sendSMS(false)} disabled={sending||!recipientsList.length||!message.trim()} style={{width:'100%',padding:16,background:sending?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:14,fontWeight:800,fontSize:15,cursor:sending?'wait':'pointer',boxShadow:'0 8px 25px rgba(11,122,59,0.3)',transition:'all 0.25s'}}>
          {sending?'⏳ Inatuma...':`📱 Tuma Sasa (${recipientsList.length})`}
        </button>
        
        {scheduleDate&&scheduleTime&&<button onClick={()=>sendSMS(true)} disabled={sending} style={{width:'100%',marginTop:8,padding:14,background:'linear-gradient(135deg,#3B82F6,#1E40AF)',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer',boxShadow:'0 4px 15px rgba(59,130,246,0.3)'}}>
          ⏰ Panga Itume Baadaye
        </button>}
      </div>
    </div>

    {/* HISTORY with search & filter */}
    <div className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h4 style={{fontSize:14,fontWeight:800,margin:0,color:'#0B7A3B'}}>📜 Historia ({filteredHistory.length})</h4>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <input type="text" placeholder="🔍 Tafuta..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #E2E8F0',fontSize:12,minWidth:140}}/>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid #E2E8F0',fontSize:12,cursor:'pointer'}}>
            <option value="all">Zote</option>
            <option value="delivered">✅ Delivered</option>
            <option value="partial">⚠️ Partial</option>
            <option value="failed">❌ Failed</option>
          </select>
        </div>
      </div>
      <div style={{maxHeight:380,overflowY:'auto'}}>
        {filteredHistory.map(h=>{
          const sColor=h.status==='delivered'?'#22C55E':h.status==='partial'?'#F59E0B':'#EF4444';
          return <div key={h.id} style={{padding:'12px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,transition:'background 0.2s'}} onMouseOver={e=>e.currentTarget.style.background='#F8FAFC'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                <span style={{fontWeight:700,fontSize:13}}>{h.template}</span>
                <Badge color={sColor}>{h.status==='delivered'?'✅ Delivered':h.status==='partial'?'⚠️ Partial':'❌ Failed'}</Badge>
              </div>
              <div style={{fontSize:11,color:'#64748B'}}>{h.message}</div>
              <div style={{fontSize:10,color:'#94A3B8'}}>📅 {fmtDate(h.sent_at)}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:18,fontWeight:900,color:sColor}}>{h.success}/{h.recipients}</div>
              <div style={{fontSize:9,color:'#94A3B8'}}>delivered</div>
            </div>
          </div>;
        })}
        {!filteredHistory.length&&<Empty icon="📜" text={search||filterStatus!=='all'?'Hakuna inayoendana':'Hakuna SMS bado'}/>}
      </div>
    </div>

    {/* AUTO SMS MODAL */}
    {showAutoModal&&<Modal open onClose={()=>setShowAutoModal(false)} title="⚙️ Auto SMS Settings">
      <div style={{background:'#F5F3FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#5B21B6'}}>
        💡 Mfumo unatuma SMS automatic kwenye matukio yafuatayo. Washa au zima.
      </div>
      
      {[
        {key:'payment',title:'💰 Malipo Yakipokelewa',desc:'Mteja akilipa, atapata SMS ya uthibitisho na token'},
        {key:'welcome',title:'👋 Akaunti Mpya',desc:'Mteja mpya akijiunga, atapata SMS ya karibu'},
        {key:'reminder',title:'⏰ Kumbusho la Malipo',desc:'Tuma SMS siku 3 kabla muda kuisha'},
      ].map(item=><div key={item.key} style={{padding:'14px',background:autoConfig[item.key]?'#F0FDF4':'#F8FAFC',borderRadius:12,marginBottom:10,border:`2px solid ${autoConfig[item.key]?'#BBF7D0':'#E2E8F0'}`,transition:'all 0.25s'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:13,color:'#1E293B',marginBottom:2}}>{item.title}</div>
            <div style={{fontSize:11,color:'#64748B'}}>{item.desc}</div>
          </div>
          <button onClick={()=>setAutoConfig(p=>({...p,[item.key]:!p[item.key]}))} style={{position:'relative',width:48,height:26,borderRadius:13,background:autoConfig[item.key]?'#22C55E':'#CBD5E1',border:'none',cursor:'pointer',transition:'background 0.25s'}}>
            <div style={{position:'absolute',top:3,left:autoConfig[item.key]?25:3,width:20,height:20,borderRadius:'50%',background:'#fff',boxShadow:'0 2px 4px rgba(0,0,0,0.2)',transition:'left 0.25s'}}/>
          </button>
        </div>
      </div>)}
      
      {/* Daily reports info — Email only */}
      <div style={{padding:'14px',background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',borderRadius:12,marginBottom:10,border:'2px solid #BFDBFE'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
          <span style={{fontSize:24}}>📧</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:13,color:'#1E40AF',marginBottom:4}}>📊 Ripoti za Kila Siku — Kwa Email</div>
            <div style={{fontSize:11,color:'#1E40AF',lineHeight:1.6}}>
              Ripoti za kila siku zinatumwa kwa <b>email</b> kila asubuhi saa 2:00 — sio SMS.<br/>
              Admin & Washirika wanapata <b>ripoti kamili</b> kuhusu wateja, mapato, na shughuli za jana.<br/>
              <span style={{display:'inline-block',marginTop:4,padding:'2px 8px',background:'#fff',borderRadius:6,fontSize:10,fontWeight:700,color:'#0B7A3B'}}>✓ Imeshawashwa Automatic</span>
            </div>
          </div>
        </div>
      </div>
      
      <button onClick={saveAutoConfig} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#7C3AED,#5B21B6)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer',marginTop:6,boxShadow:'0 4px 15px rgba(124,58,237,0.3)'}}>
        💾 Hifadhi Mipangilio
      </button>
    </Modal>}
  </div>;
}
