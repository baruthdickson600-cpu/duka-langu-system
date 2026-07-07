import React,{useState,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {Input,Area,Btn,Badge,Empty,IC} from '../../components/UI';
import {API_BASE} from '../../config/api';

// ============================================================
// SMS CENTER — Kutuma SMS kwa wateja kupitia Beem Africa
// ============================================================

export default function SMSCenterPage(){
  const{businesses}=useApp();
  const[tab,setTab]=useState('bulk');
  const[message,setMessage]=useState('');
  const[phone,setPhone]=useState('');
  const[sending,setSending]=useState(false);
  const[result,setResult]=useState(null);
  const[history,setHistory]=useState([]);
  const[audience,setAudience]=useState('all');
  const[progress,setProgress]=useState({sent:0,failed:0,total:0});

  // Wateja wenye simu
  const withPhone=(businesses||[]).filter(b=>b.phone&&b.phone.trim());
  const activeCustomers=withPhone.filter(b=>b.token_active);
  const trialCustomers=withPhone.filter(b=>!b.token_active);

  const getAudience=()=>{
    if(audience==='active')return activeCustomers;
    if(audience==='trial')return trialCustomers;
    return withPhone;
  };

  // Load history
  const loadHistory=async()=>{
    try{
      const{data}=await supabase.from('sms_logs').select('*').order('created_at',{ascending:false}).limit(50);
      setHistory(data||[]);
    }catch(e){/* table inaweza kuwa haipo bado */}
  };
  useEffect(()=>{loadHistory()},[]);

  // Tuma SMS moja
  const sendOne=async()=>{
    if(!phone.trim()||!message.trim())return alert('Jaza namba na ujumbe!');
    setSending(true);setResult(null);
    try{
      const r=await fetch(API_BASE+'/api/send-sms',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({phone:phone.trim(),message:message.trim()}),
      });
      const d=await r.json();
      if(d.success){
        setResult({ok:true,text:`✅ SMS imetumwa kwa ${phone}`});
        logSMS(phone,message,'sent');
        setPhone('');
      }else{
        setResult({ok:false,text:`❌ ${d.error||'Imeshindwa'}`});
        logSMS(phone,message,'failed');
      }
    }catch(e){
      setResult({ok:false,text:'❌ Tatizo la mtandao'});
    }
    setSending(false);
  };

  // Tuma bulk (wateja wote)
  const sendBulk=async()=>{
    const targets=getAudience();
    if(!message.trim())return alert('Andika ujumbe!');
    if(!targets.length)return alert('Hakuna wateja wenye simu!');
    if(!window.confirm(`Tuma SMS kwa wateja ${targets.length}? Kila SMS ina gharama.`))return;

    setSending(true);setResult(null);
    setProgress({sent:0,failed:0,total:targets.length});
    let sent=0,failed=0;

    for(const cust of targets){
      try{
        const r=await fetch(API_BASE+'/api/send-sms',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({phone:cust.phone,message:message.trim()}),
        });
        const d=await r.json();
        if(d.success){sent++;}else{failed++;}
      }catch(e){failed++;}
      setProgress({sent,failed,total:targets.length});
      // Subiri kidogo kuepuka rate limit
      await new Promise(res=>setTimeout(res,300));
    }

    logSMS(`Bulk (${targets.length})`,message,`sent:${sent} failed:${failed}`);
    setResult({ok:sent>0,text:`✅ Zimetumwa: ${sent} | ❌ Zimeshindwa: ${failed}`});
    setSending(false);
    loadHistory();
  };

  const logSMS=async(to,msg,status)=>{
    try{
      await supabase.from('sms_logs').insert({recipient:to,message:msg.slice(0,500),status});
    }catch(e){/* silent */}
  };

  return <div>
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>📱 SMS Center</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Tuma ujumbe kwa wateja kupitia Beem Africa</p>
    </div>

    {/* Tabs */}
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      {[['bulk','📢 Bulk (Wote)'],['single','👤 Mmoja'],['history','📋 Historia']].map(([id,label])=>(
        <button key={id} onClick={()=>{setTab(id);setResult(null)}} style={{padding:'8px 16px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:tab===id?'#0B7A3B':'#F1F5F9',color:tab===id?'#fff':'#64748B'}}>
          {label}
        </button>
      ))}
    </div>

    {/* Result banner */}
    {result&&<div style={{background:result.ok?'#F0FDF4':'#FEF2F2',color:result.ok?'#15803D':'#B91C1C',padding:'12px 16px',borderRadius:12,marginBottom:16,fontWeight:600,fontSize:14,borderLeft:`4px solid ${result.ok?'#22C55E':'#EF4444'}`}}>
      {result.text}
    </div>}

    {/* BULK TAB */}
    {tab==='bulk'&&<div className="card">
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:600,color:'#64748B',display:'block',marginBottom:6}}>Wapokeaji</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['all',`Wote (${withPhone.length})`],['active',`Wanaolipa (${activeCustomers.length})`],['trial',`Majaribio (${trialCustomers.length})`]].map(([id,label])=>(
            <button key={id} onClick={()=>setAudience(id)} style={{padding:'8px 14px',borderRadius:10,border:audience===id?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:audience===id?'#F0FDF4':'#fff',color:audience===id?'#0B7A3B':'#64748B',fontWeight:600,fontSize:13,cursor:'pointer'}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <Area label="Ujumbe" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Andika ujumbe wako hapa..." rows={5}/>
      <div style={{fontSize:11,color:'#94A3B8',marginBottom:12}}>
        Herufi: {message.length} {message.length>160&&`(SMS ${Math.ceil(message.length/160)})`} • Watapokea: {getAudience().length} wateja
      </div>

      {sending&&progress.total>0&&<div style={{marginBottom:12}}>
        <div style={{fontSize:12,color:'#64748B',marginBottom:4}}>Inatuma... {progress.sent+progress.failed}/{progress.total}</div>
        <div style={{height:8,background:'#F1F5F9',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',background:'#0B7A3B',width:`${((progress.sent+progress.failed)/progress.total)*100}%`,transition:'width 0.3s'}}/>
        </div>
      </div>}

      <Btn onClick={sendBulk} disabled={sending} style={{width:'100%',justifyContent:'center'}}>
        {sending?'Inatuma...':`📢 Tuma kwa ${getAudience().length} Wateja`}
      </Btn>
    </div>}

    {/* SINGLE TAB */}
    {tab==='single'&&<div className="card">
      <Input label="Namba ya Simu" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0712345678"/>
      <Area label="Ujumbe" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Andika ujumbe..." rows={5}/>
      <div style={{fontSize:11,color:'#94A3B8',marginBottom:12}}>Herufi: {message.length}</div>
      <Btn onClick={sendOne} disabled={sending} style={{width:'100%',justifyContent:'center'}}>
        {sending?'Inatuma...':'👤 Tuma SMS'}
      </Btn>
    </div>}

    {/* HISTORY TAB */}
    {tab==='history'&&<div>
      {!history.length?<div className="card"><Empty icon="📭" text="Hakuna historia ya SMS bado"/></div>:
       <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {history.map(h=>(
          <div key={h.id} className="card" style={{padding:'12px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{h.recipient}</div>
                <div style={{fontSize:12,color:'#64748B'}}>{h.message}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <Badge color={h.status?.includes('sent')?'#22C55E':'#EF4444'}>{h.status}</Badge>
                <div style={{fontSize:10,color:'#94A3B8',marginTop:4}}>{new Date(h.created_at).toLocaleDateString('sw')}</div>
              </div>
            </div>
          </div>
        ))}
       </div>}
    </div>}
  </div>;
}
