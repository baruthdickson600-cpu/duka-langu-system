import React,{useState,useEffect,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {Input,Area,Btn,Badge,Empty,IC} from '../../components/UI';
import {API_BASE} from '../../config/api';

// ============================================================
// SMS CENTER — Enterprise Communication Center (Phase 1)
// Beem Africa. API/Secret zimefichwa (server-side).
// ============================================================

const DEFAULT_TEMPLATES=[
  {id:'welcome',name:'Karibu Mteja',body:'Karibu Duka Langu! Asante kwa kujisajili. Tumia dukalangu.com kuanza.'},
  {id:'payment',name:'Malipo Yamepokelewa',body:'Asante! Malipo yako yamepokelewa. Mfumo wako umefunguliwa.'},
  {id:'approved',name:'Usajili Umethibitishwa',body:'Hongera! Usajili wako umethibitishwa. Mfumo wako uko hai sasa.'},
  {id:'expiring',name:'Usajili Unaisha',body:'Kumbuko: Usajili wako wa Duka Langu unaisha karibuni. Ongeza muda ili kuendelea.'},
  {id:'expired',name:'Usajili Umeisha',body:'Usajili wako umeisha. Lipa HALOPESA namba 25187616 (DUKALANGU) kufungua mfumo tena.'},
  {id:'otp',name:'OTP',body:'Nambari yako ya uthibitisho wa Duka Langu ni: {CODE}. Usimpe mtu yeyote.'},
  {id:'thanks',name:'Asante',body:'Asante kwa kuwa mteja wa Duka Langu! Tunathamini biashara yako.'},
  {id:'debt',name:'Ukumbusho wa Deni',body:'Habari, huu ni ukumbusho wa deni lako. Tafadhali lipa kwa wakati. Asante.'},
];

export default function SMSCenterPage(){
  const{businesses}=useApp();
  const[tab,setTab]=useState('dashboard');
  const[message,setMessage]=useState('');
  const[phone,setPhone]=useState('');
  const[sending,setSending]=useState(false);
  const[result,setResult]=useState(null);
  const[history,setHistory]=useState([]);
  const[loading,setLoading]=useState(true);
  const[audience,setAudience]=useState('all');
  const[progress,setProgress]=useState({sent:0,failed:0,total:0});
  const[templates,setTemplates]=useState(DEFAULT_TEMPLATES);
  const[tplModal,setTplModal]=useState(null);
  const[tplForm,setTplForm]=useState({name:'',body:''});
  const[tplSearch,setTplSearch]=useState('');
  const[histSearch,setHistSearch]=useState('');
  const[histFilter,setHistFilter]=useState('all');
  const[page,setPage]=useState(1);
  const PER_PAGE=15;

  const withPhone=(businesses||[]).filter(b=>b.phone&&b.phone.trim());
  const activeCustomers=withPhone.filter(b=>b.token_active);
  const trialCustomers=withPhone.filter(b=>!b.token_active);
  const getAudience=()=>audience==='active'?activeCustomers:audience==='trial'?trialCustomers:withPhone;

  const loadHistory=async()=>{
    setLoading(true);
    try{const{data}=await supabase.from('sms_logs').select('*').order('created_at',{ascending:false}).limit(500);setHistory(data||[]);}catch(e){}
    try{const{data:tpls}=await supabase.from('sms_templates').select('*').order('created_at',{ascending:false});if(tpls&&tpls.length)setTemplates([...tpls,...DEFAULT_TEMPLATES.filter(d=>!tpls.find(t=>t.name===d.name))]);}catch(e){}
    setLoading(false);
  };
  useEffect(()=>{loadHistory()},[]);

  const stats=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    const sent=history.filter(h=>h.status?.includes('sent')).length;
    const failed=history.filter(h=>h.status?.includes('failed')).length;
    const total=sent+failed;
    return{sentToday:history.filter(h=>h.created_at?.startsWith(today)&&h.status?.includes('sent')).length,failed,pending:history.filter(h=>h.status==='pending').length,deliveryRate:total>0?Math.round((sent/total)*100):100,totalSent:sent};
  },[history]);

  const logSMS=async(to,msg,status)=>{try{await supabase.from('sms_logs').insert({recipient:to,message:msg.slice(0,500),status});}catch(e){}};

  const sendOne=async(testMode=false)=>{
    if(!phone.trim()||!message.trim())return alert('Jaza namba na ujumbe!');
    setSending(true);setResult(null);
    try{
      const r=await fetch(API_BASE+'/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:phone.trim(),message:message.trim()})});
      const d=await r.json();
      if(d.success){setResult({ok:true,text:`✅ SMS imetumwa kwa ${phone}`});logSMS(phone,message,'sent');if(!testMode)setPhone('');}
      else{setResult({ok:false,text:`❌ ${d.error||'Imeshindwa'}`});logSMS(phone,message,'failed');}
    }catch(e){setResult({ok:false,text:'❌ Tatizo la mtandao'});}
    setSending(false);loadHistory();
  };

  const sendBulk=async()=>{
    const targets=getAudience();
    if(!message.trim())return alert('Andika ujumbe!');
    if(!targets.length)return alert('Hakuna wateja wenye simu!');
    if(!window.confirm(`Tuma SMS kwa wateja ${targets.length}? Kila SMS ina gharama.`))return;
    setSending(true);setResult(null);setProgress({sent:0,failed:0,total:targets.length});
    let sent=0,failed=0;
    for(const cust of targets){
      try{const r=await fetch(API_BASE+'/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:cust.phone,message:message.trim()})});const d=await r.json();if(d.success){sent++;}else{failed++;}}catch(e){failed++;}
      setProgress({sent,failed,total:targets.length});await new Promise(res=>setTimeout(res,300));
    }
    logSMS(`Bulk (${targets.length})`,message,`sent:${sent} failed:${failed}`);
    setResult({ok:sent>0,text:`✅ Zimetumwa: ${sent} | ❌ Zimeshindwa: ${failed}`});
    setSending(false);loadHistory();
  };

  const saveTpl=async()=>{
    if(!tplForm.name.trim()||!tplForm.body.trim())return alert('Jaza jina na ujumbe!');
    try{
      if(tplModal==='edit'&&tplForm.id&&!DEFAULT_TEMPLATES.find(d=>d.id===tplForm.id)){await supabase.from('sms_templates').update({name:tplForm.name,body:tplForm.body}).eq('id',tplForm.id);}
      else{await supabase.from('sms_templates').insert({name:tplForm.name,body:tplForm.body});}
      setTplModal(null);setTplForm({name:'',body:''});loadHistory();
    }catch(e){alert('Templates table haipo bado. Run SQL kwanza.');}
  };
  const delTpl=async(t)=>{
    if(DEFAULT_TEMPLATES.find(d=>d.id===t.id))return alert('Huwezi kufuta template ya msingi.');
    if(!window.confirm('Futa template hii?'))return;
    try{await supabase.from('sms_templates').delete().eq('id',t.id);loadHistory();}catch(e){}
  };
  const useTpl=(t)=>{setMessage(t.body);setTab('single');setResult({ok:true,text:`Template "${t.name}" imewekwa.`});};

  const filteredHist=useMemo(()=>{
    let h=history;
    if(histFilter==='sent')h=h.filter(x=>x.status?.includes('sent'));
    if(histFilter==='failed')h=h.filter(x=>x.status?.includes('failed'));
    if(histSearch)h=h.filter(x=>(x.recipient||'').includes(histSearch)||(x.message||'').toLowerCase().includes(histSearch.toLowerCase()));
    return h;
  },[history,histFilter,histSearch]);
  const pagedHist=filteredHist.slice((page-1)*PER_PAGE,page*PER_PAGE);
  const totalPages=Math.ceil(filteredHist.length/PER_PAGE);
  const filteredTpls=templates.filter(t=>!tplSearch||t.name.toLowerCase().includes(tplSearch.toLowerCase()));

  const TABS=[['dashboard','📊 Dashibodi'],['single','👤 Tuma Mmoja'],['bulk','📢 Bulk'],['templates','📝 Templates'],['history','📋 Historia'],['settings','⚙️ Mipangilio']];

  return <div>
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>📱 SMS Center</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Kituo cha mawasiliano — Beem Africa</p>
    </div>

    <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
      {TABS.map(([id,label])=>(
        <button key={id} onClick={()=>{setTab(id);setResult(null)}} style={{padding:'8px 14px',borderRadius:10,border:'none',fontWeight:700,fontSize:12.5,cursor:'pointer',background:tab===id?'#0B7A3B':'#F1F5F9',color:tab===id?'#fff':'#64748B'}}>{label}</button>
      ))}
    </div>

    {result&&<div style={{background:result.ok?'#F0FDF4':'#FEF2F2',color:result.ok?'#15803D':'#B91C1C',padding:'12px 16px',borderRadius:12,marginBottom:16,fontWeight:600,fontSize:14,borderLeft:`4px solid ${result.ok?'#22C55E':'#EF4444'}`}}>{result.text}</div>}

    {tab==='dashboard'&&<div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:16}}>
        {[{label:'Zimetumwa Leo',value:stats.sentToday,icon:'📤',color:'#0B7A3B'},{label:'Jumla Zimetumwa',value:stats.totalSent,icon:'✅',color:'#3B82F6'},{label:'Zimeshindwa',value:stats.failed,icon:'❌',color:'#EF4444'},{label:'Zinasubiri',value:stats.pending,icon:'⏳',color:'#F59E0B'},{label:'Kiwango cha Ufikishaji',value:`${stats.deliveryRate}%`,icon:'📊',color:'#8B5CF6'}].map((c,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:16,padding:16,border:`1px solid ${c.color}18`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><span style={{fontSize:20}}>{c.icon}</span><span style={{fontSize:11,color:'#64748B',fontWeight:600}}>{c.label}</span></div>
            <div style={{fontSize:26,fontWeight:900,color:c.color}}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:14,padding:16,fontSize:13,color:'#15803D'}}>💡 Tumia "Tuma Mmoja" kwa SMS moja, "Bulk" kwa wengi, au "Templates" kwa ujumbe uliotayarishwa.</div>
    </div>}

    {tab==='single'&&<div className="card">
      <Input label="Namba ya Simu" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0712345678"/>
      <Area label="Ujumbe" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Andika ujumbe..." rows={5}/>
      <div style={{fontSize:11,color:'#94A3B8',marginBottom:12}}>Herufi: {message.length} {message.length>160&&`• SMS ${Math.ceil(message.length/160)}`}</div>
      <Btn onClick={()=>sendOne(false)} disabled={sending} style={{width:'100%',justifyContent:'center'}}>{sending?'Inatuma...':'👤 Tuma SMS'}</Btn>
    </div>}

    {tab==='bulk'&&<div className="card">
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:600,color:'#64748B',display:'block',marginBottom:6}}>Wapokeaji</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['all',`Wote (${withPhone.length})`],['active',`Wanaolipa (${activeCustomers.length})`],['trial',`Majaribio (${trialCustomers.length})`]].map(([id,label])=>(
            <button key={id} onClick={()=>setAudience(id)} style={{padding:'8px 14px',borderRadius:10,border:audience===id?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:audience===id?'#F0FDF4':'#fff',color:audience===id?'#0B7A3B':'#64748B',fontWeight:600,fontSize:13,cursor:'pointer'}}>{label}</button>
          ))}
        </div>
      </div>
      <Area label="Ujumbe" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Andika ujumbe..." rows={5}/>
      <div style={{fontSize:11,color:'#94A3B8',marginBottom:12}}>Herufi: {message.length} {message.length>160&&`(SMS ${Math.ceil(message.length/160)})`} • Watapokea: {getAudience().length}</div>
      {sending&&progress.total>0&&<div style={{marginBottom:12}}>
        <div style={{fontSize:12,color:'#64748B',marginBottom:4}}>Inatuma... {progress.sent+progress.failed}/{progress.total}</div>
        <div style={{height:8,background:'#F1F5F9',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:'#0B7A3B',width:`${((progress.sent+progress.failed)/progress.total)*100}%`,transition:'width 0.3s'}}/></div>
      </div>}
      <Btn onClick={sendBulk} disabled={sending} style={{width:'100%',justifyContent:'center'}}>{sending?'Inatuma...':`📢 Tuma kwa ${getAudience().length} Wateja`}</Btn>
    </div>}

    {tab==='templates'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:8,flexWrap:'wrap'}}>
        <Input placeholder="🔍 Tafuta template..." value={tplSearch} onChange={e=>setTplSearch(e.target.value)} style={{marginBottom:0,flex:1,minWidth:180}}/>
        <Btn onClick={()=>{setTplForm({name:'',body:''});setTplModal('new')}}>{IC.plus} Mpya</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
        {filteredTpls.map(t=>(
          <div key={t.id} className="card" style={{padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <b style={{fontSize:14,color:'#0B7A3B'}}>{t.name}</b>
              {DEFAULT_TEMPLATES.find(d=>d.id===t.id)&&<Badge color="#94A3B8">Msingi</Badge>}
            </div>
            <div style={{fontSize:12,color:'#64748B',lineHeight:1.5,marginBottom:10,minHeight:54}}>{t.body}</div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>useTpl(t)} style={{flex:1,padding:'7px',background:'#0B7A3B',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>Tumia</button>
              {!DEFAULT_TEMPLATES.find(d=>d.id===t.id)&&<>
                <button onClick={()=>{setTplForm(t);setTplModal('edit')}} style={{padding:'7px 10px',background:'#F1F5F9',border:'none',borderRadius:8,fontSize:12,cursor:'pointer'}}>{IC.gear}</button>
                <button onClick={()=>delTpl(t)} style={{padding:'7px 10px',background:'#FEF2F2',color:'#EF4444',border:'none',borderRadius:8,fontSize:12,cursor:'pointer'}}>{IC.del}</button>
              </>}
            </div>
          </div>
        ))}
      </div>
    </div>}

    {tab==='history'&&<div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <Input placeholder="🔍 Tafuta..." value={histSearch} onChange={e=>{setHistSearch(e.target.value);setPage(1)}} style={{marginBottom:0,flex:1,minWidth:180}}/>
        <div style={{display:'flex',gap:6}}>
          {[['all','Zote'],['sent','✅'],['failed','❌']].map(([id,l])=>(
            <button key={id} onClick={()=>{setHistFilter(id);setPage(1)}} style={{padding:'8px 12px',borderRadius:8,border:histFilter===id?'2px solid #0B7A3B':'1px solid #E2E8F0',background:histFilter===id?'#F0FDF4':'#fff',color:histFilter===id?'#0B7A3B':'#64748B',fontWeight:600,fontSize:12,cursor:'pointer'}}>{l}</button>
          ))}
        </div>
      </div>
      {loading?<div className="card"><div style={{height:60,background:'#F1F5F9',borderRadius:8,animation:'pulse 1.5s infinite'}}/></div>:
       !pagedHist.length?<div className="card"><Empty icon="📭" text="Hakuna historia"/></div>:
       <>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {pagedHist.map(h=>(
            <div key={h.id} className="card" style={{padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{h.recipient}</div><div style={{fontSize:12,color:'#64748B'}}>{h.message}</div></div>
                <div style={{textAlign:'right'}}><Badge color={h.status?.includes('sent')?'#22C55E':'#EF4444'}>{h.status?.includes('sent')?'Imetumwa':'Imeshindwa'}</Badge><div style={{fontSize:10,color:'#94A3B8',marginTop:4}}>{new Date(h.created_at).toLocaleDateString('sw')}</div></div>
              </div>
            </div>
          ))}
        </div>
        {totalPages>1&&<div style={{display:'flex',justifyContent:'center',gap:8,marginTop:12,alignItems:'center'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',cursor:page===1?'default':'pointer',opacity:page===1?0.5:1}}>←</button>
          <span style={{fontSize:13,color:'#64748B'}}>Ukurasa {page}/{totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',cursor:page===totalPages?'default':'pointer',opacity:page===totalPages?0.5:1}}>→</button>
        </div>}
       </>}
    </div>}

    {tab==='settings'&&<div className="card">
      <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 14px'}}>⚙️ Mipangilio ya SMS</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'#F8FAFC',borderRadius:10}}><span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Mtoa Huduma</span><span style={{fontSize:13,fontWeight:700,color:'#0B7A3B'}}>Beem Africa</span></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'#F8FAFC',borderRadius:10}}><span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Sender ID</span><span style={{fontSize:13,fontWeight:700,color:'#1E293B'}}>Imewekwa (server-side)</span></div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'#F8FAFC',borderRadius:10}}><span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Hali ya API</span><Badge color="#22C55E">● Imeunganishwa</Badge></div>
        <div style={{padding:'12px 14px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:10,fontSize:12,color:'#9A3412'}}>🔒 API Key na Secret zimefichwa kwa usalama (Vercel Environment Variables).</div>
        <div style={{marginTop:8}}>
          <Input label="Namba ya Kupima" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0712345678"/>
          <Btn onClick={()=>{if(!phone.trim())return alert('Weka namba!');setMessage('Hii ni SMS ya majaribio kutoka Duka Langu. Beem inafanya kazi!');setTimeout(()=>sendOne(true),100)}} disabled={sending} style={{width:'100%',justifyContent:'center'}}>{sending?'Inatuma...':'🧪 Tuma SMS ya Majaribio'}</Btn>
        </div>
      </div>
    </div>}

    {tplModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setTplModal(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,padding:20,maxWidth:440,width:'100%'}}>
        <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 14px'}}>{tplModal==='edit'?'✏️ Hariri Template':'➕ Template Mpya'}</h3>
        <Input label="Jina" value={tplForm.name} onChange={e=>setTplForm({...tplForm,name:e.target.value})} placeholder="Mfano: Karibu Mteja"/>
        <Area label="Ujumbe" value={tplForm.body} onChange={e=>setTplForm({...tplForm,body:e.target.value})} placeholder="Andika ujumbe..." rows={4}/>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button onClick={()=>setTplModal(null)} style={{flex:1,padding:11,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ghairi</button>
          <button onClick={saveTpl} style={{flex:2,padding:11,background:'#0B7A3B',color:'#fff',border:'none',borderRadius:10,fontWeight:800,cursor:'pointer'}}>Hifadhi</button>
        </div>
      </div>
    </div>}

    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
  </div>;
}
