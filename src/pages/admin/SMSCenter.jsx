import React,{useState,useEffect,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {Input,Area,Btn,Badge,Empty,IC} from '../../components/UI';
import {API_BASE} from '../../config/api';

// ============================================================
// SMS CENTER V2 — Kituo cha Mawasiliano cha Kibiashara
// Beem Africa. API/Secret zimefichwa (server-side).
// ============================================================

const SMS_COST=25; // TZS kwa SMS (makadirio)

const DEFAULT_TEMPLATES=[
  {id:'welcome',name:'Karibu Mteja',body:'Karibu DukaLangu Smart POS!\n\nHabari {{jina}},\n\nTunakukaribisha rasmi kwenye familia ya DukaLangu. Simamia mauzo, bidhaa, madeni na matumizi popote ulipo.\n\nIngia: dukalangu.com\n\nDukaLangu Smart POS'},
  {id:'payment',name:'Malipo ya Usajili',body:'Habari {{jina}},\n\nTumepokea malipo yako ya usajili wa DukaLangu Smart POS.\n\nAkaunti yako imeendelea kuwa hai na utaendelea kutumia huduma zote bila usumbufu.\n\nAsante kwa kuendelea kutuamini.\n\nDukaLangu Smart POS'},
  {id:'reminder',name:'Ukumbusho wa Usajili',body:'Habari {{jina}},\n\nUsajili wako wa DukaLangu Smart POS unaisha baada ya siku {{siku}}.\n\nTafadhali fanya malipo mapema ili huduma zisikatike.\n\nLipa: HALOPESA 25187616 (DUKALANGU)\n\nAsante.'},
  {id:'reactivation',name:'Mfumo Umefunguliwa',body:'Habari {{jina}},\n\nMalipo yako yamepokelewa kikamilifu.\n\nAkaunti yako imefunguliwa na huduma zote zimeanza kufanya kazi tena.\n\nAsante kwa kuendelea kutumia DukaLangu.\n\nDukaLangu Smart POS'},
  {id:'debt',name:'Ukumbusho wa Deni',body:'Habari {{jina}},\n\nHuu ni ukumbusho wa deni lako la TZS {{kiasi}}.\n\nTafadhali lipa kwa wakati.\n\nAsante.'},
  {id:'confirm',name:'Uthibitisho wa Malipo',body:'Habari {{jina}},\n\nTumepokea malipo yako ya TZS {{kiasi}}.\n\nAsante kwa kulipa kwa wakati.\n\nDukaLangu Smart POS'},
  {id:'promo',name:'Matangazo',body:'Habari {{jina}},\n\nTuna ofa maalum kwako! Tembelea duka letu upate bei nzuri.\n\nAsante kwa kuwa mteja wetu.'},
  {id:'arrival',name:'Bidhaa Mpya',body:'Habari {{jina}},\n\nBidhaa mpya zimefika dukani! Karibu uone.\n\nAsante.'},
  {id:'holiday',name:'Salamu za Sikukuu',body:'Habari {{jina}},\n\nTunakutakia sikukuu njema! Asante kwa kuwa mteja wetu mwaminifu.\n\nDukaLangu Smart POS'},
  {id:'custom',name:'Ujumbe Binafsi',body:'Habari {{jina}},\n\n[Andika ujumbe wako hapa]\n\nAsante.'},
];

// Vikundi vya wateja
const GROUPS=[
  {id:'all',label:'Wote',icon:'👥'},
  {id:'active',label:'Wanaolipa',icon:'✅'},
  {id:'expired',label:'Waliomaliza',icon:'⏰'},
  {id:'new',label:'Wapya (siku 30)',icon:'🆕'},
  {id:'trial',label:'Majaribio',icon:'🎁'},
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
  const[group,setGroup]=useState('all');
  const[custSearch,setCustSearch]=useState('');
  const[selectedCust,setSelectedCust]=useState([]);
  const[progress,setProgress]=useState({sent:0,failed:0,total:0});
  const[templates,setTemplates]=useState(DEFAULT_TEMPLATES);
  const[tplModal,setTplModal]=useState(null);
  const[tplForm,setTplForm]=useState({name:'',body:''});
  const[tplSearch,setTplSearch]=useState('');
  const[histSearch,setHistSearch]=useState('');
  const[histFilter,setHistFilter]=useState('all');
  const[histDate,setHistDate]=useState('');
  const[page,setPage]=useState(1);
  const[showPreview,setShowPreview]=useState(false);
  const[balance,setBalance]=useState(null);
  const[balLoading,setBalLoading]=useState(false);
  const[balError,setBalError]=useState(null);
  // Settings (zinahifadhiwa kwenye settings table)
  const[cfg,setCfg]=useState({sms_signature:'',sms_footer:'',auto_sms_enabled:'true',auto_reminder_7:'true',auto_reminder_3:'true',auto_reminder_1:'true',auto_expired:'true',auto_welcome:'true',auto_payment:'true'});
  const[savingCfg,setSavingCfg]=useState(false);
  const PER_PAGE=15;

  const withPhone=(businesses||[]).filter(b=>b.phone&&b.phone.trim());

  // ===== Customer Groups =====
  const getGroupCustomers=(g)=>{
    const now=Date.now();
    if(g==='active')return withPhone.filter(b=>b.token_active&&new Date(b.token_expiry||0)>now);
    if(g==='expired')return withPhone.filter(b=>{const end=b.token_active?b.token_expiry:b.trial_end;return end&&new Date(end)<now;});
    if(g==='new')return withPhone.filter(b=>b.created_at&&(now-new Date(b.created_at))<30*86400000);
    if(g==='trial')return withPhone.filter(b=>!b.token_active);
    return withPhone;
  };
  const groupCustomers=getGroupCustomers(group);
  const searchedCustomers=groupCustomers.filter(c=>!custSearch||(c.name||'').toLowerCase().includes(custSearch.toLowerCase())||(c.phone||'').includes(custSearch));
  const targets=selectedCust.length?withPhone.filter(c=>selectedCust.includes(c.id)):groupCustomers;

  // ===== Load =====
  const loadHistory=async()=>{
    setLoading(true);
    try{const{data}=await supabase.from('sms_logs').select('*').order('created_at',{ascending:false}).limit(1000);setHistory(data||[]);}catch(e){}
    try{const{data:tpls}=await supabase.from('sms_templates').select('*').order('created_at',{ascending:false});if(tpls&&tpls.length)setTemplates([...tpls,...DEFAULT_TEMPLATES.filter(d=>!tpls.find(t=>t.name===d.name))]);}catch(e){}
    setLoading(false);
  };

  // Pata salio la SMS kutoka Beem
  const loadBalance=async()=>{
    setBalLoading(true);setBalError(null);
    try{
      const r=await fetch(API_BASE+'/api/sms-balance');
      const d=await r.json();
      if(d.success&&d.balance!==null)setBalance(d.balance);
      else setBalError(d.error||'Imeshindwa kupata salio');
    }catch(e){setBalError('Tatizo la mtandao');}
    setBalLoading(false);
  };

  // Soma settings kutoka database
  const loadSettings=async()=>{
    try{
      const{data}=await supabase.from('settings').select('key,value');
      if(data){
        const s={};data.forEach(r=>{if(r.key?.startsWith('sms_')||r.key?.startsWith('auto_'))s[r.key]=r.value;});
        setCfg(p=>({...p,...s}));
      }
    }catch(e){}
  };

  // Hifadhi settings
  const saveSettings=async()=>{
    setSavingCfg(true);
    try{
      for(const[k,v]of Object.entries(cfg)){
        await supabase.from('settings').upsert({key:k,value:String(v)},{onConflict:'key'});
      }
      setResult({ok:true,text:'✅ Mipangilio imehifadhiwa!'});
    }catch(e){setResult({ok:false,text:'❌ Imeshindwa kuhifadhi: '+e.message});}
    setSavingCfg(false);
  };

  useEffect(()=>{loadHistory();loadBalance();loadSettings();},[]);

  // ===== Dashboard stats =====
  const stats=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    const month=new Date().toISOString().slice(0,7);
    const sent=history.filter(h=>h.status?.includes('sent'));
    const failed=history.filter(h=>h.status?.includes('failed'));
    const total=sent.length+failed.length;
    return{
      today:history.filter(h=>h.created_at?.startsWith(today)).length,
      month:history.filter(h=>h.created_at?.startsWith(month)).length,
      sent:sent.length,
      failed:failed.length,
      pending:history.filter(h=>h.status==='pending').length,
      rate:total>0?Math.round((sent.length/total)*100):100,
      last:history[0]||null,
    };
  },[history]);

  const smsCount=Math.max(1,Math.ceil(message.length/160));
  const estCost=targets.length*smsCount*SMS_COST;

  const logSMS=async(to,msg,status)=>{
    const row={recipient:to,message:(msg||'').slice(0,500),status};
    try{
      let{error}=await supabase.from('sms_logs').insert(row);
      let t=0;
      while(error&&error.message?.includes('column')&&t<5){
        const m=error.message.match(/column "?([a-z_]+)"?/i);
        if(m&&m[1]&&row[m[1]]!==undefined){delete row[m[1]];t++;({error}=await supabase.from('sms_logs').insert(row));}else break;
      }
    }catch(e){}
  };

  // ===== Send =====
  const sendOne=async()=>{
    if(!phone.trim()||!message.trim())return alert('Jaza namba na ujumbe!');
    setSending(true);setResult(null);
    try{
      const r=await fetch(API_BASE+'/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:phone.trim(),message:message.trim()})});
      const d=await r.json();
      if(d.success){setResult({ok:true,text:`✅ SMS imetumwa kwa ${phone}`});logSMS(phone,message,'sent');setPhone('');}
      else{setResult({ok:false,text:`❌ ${d.error||'Imeshindwa'}`});logSMS(phone,message,'failed');}
    }catch(e){setResult({ok:false,text:'❌ Tatizo la mtandao'});}
    setSending(false);loadHistory();
  };

  const sendBulk=async()=>{
    if(!message.trim())return alert('Andika ujumbe!');
    if(!targets.length)return alert('Hakuna wateja!');
    if(!window.confirm(`Tuma SMS kwa wateja ${targets.length}?\nGharama: ~TZS ${estCost.toLocaleString()}`))return;
    setSending(true);setResult(null);setProgress({sent:0,failed:0,total:targets.length});
    let sent=0,failed=0;
    for(const c of targets){
      const msg=message.replace(/\{\{jina\}\}/g,c.name||'Mteja');
      try{
        const r=await fetch(API_BASE+'/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:c.phone,message:msg})});
        const d=await r.json();
        if(d.success){sent++;logSMS(c.phone,msg,'sent');}else{failed++;logSMS(c.phone,msg,'failed');}
      }catch(e){failed++;}
      setProgress({sent,failed,total:targets.length});
      await new Promise(r=>setTimeout(r,300));
    }
    setResult({ok:sent>0,text:`✅ Zimetumwa: ${sent} | ❌ Zimeshindwa: ${failed}`});
    setSending(false);setSelectedCust([]);loadHistory();
  };

  // Resend failed
  const resendFailed=async(h)=>{
    if(!window.confirm(`Tuma tena kwa ${h.recipient}?`))return;
    setSending(true);
    try{
      const r=await fetch(API_BASE+'/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:h.recipient,message:h.message})});
      const d=await r.json();
      if(d.success){alert('✅ SMS imetumwa!');logSMS(h.recipient,h.message,'sent');}
      else alert(`❌ ${d.error}`);
    }catch(e){alert('❌ Tatizo la mtandao');}
    setSending(false);loadHistory();
  };

  // ===== Templates CRUD =====
  const saveTpl=async()=>{
    if(!tplForm.name.trim()||!tplForm.body.trim())return alert('Jaza jina na ujumbe!');
    try{
      if(tplModal==='edit'&&tplForm.id&&!DEFAULT_TEMPLATES.find(d=>d.id===tplForm.id))
        await supabase.from('sms_templates').update({name:tplForm.name,body:tplForm.body}).eq('id',tplForm.id);
      else await supabase.from('sms_templates').insert({name:tplForm.name,body:tplForm.body});
      setTplModal(null);setTplForm({name:'',body:''});loadHistory();
    }catch(e){alert('Templates table haipo. Run SQL kwanza.');}
  };
  const delTpl=async(t)=>{
    if(DEFAULT_TEMPLATES.find(d=>d.id===t.id))return alert('Huwezi kufuta template ya msingi.');
    if(!window.confirm('Futa template hii?'))return;
    try{await supabase.from('sms_templates').delete().eq('id',t.id);loadHistory();}catch(e){}
  };
  const useTpl=(t)=>{setMessage(t.body);setTab('send');setResult({ok:true,text:`Template "${t.name}" imewekwa.`});};

  // ===== History filters =====
  const filteredHist=useMemo(()=>{
    let h=history;
    if(histFilter==='sent')h=h.filter(x=>x.status?.includes('sent'));
    if(histFilter==='failed')h=h.filter(x=>x.status?.includes('failed'));
    if(histDate)h=h.filter(x=>x.created_at?.startsWith(histDate));
    if(histSearch)h=h.filter(x=>(x.recipient||'').includes(histSearch)||(x.message||'').toLowerCase().includes(histSearch.toLowerCase()));
    return h;
  },[history,histFilter,histSearch,histDate]);
  const pagedHist=filteredHist.slice((page-1)*PER_PAGE,page*PER_PAGE);
  const totalPages=Math.ceil(filteredHist.length/PER_PAGE);
  const filteredTpls=templates.filter(t=>!tplSearch||t.name.toLowerCase().includes(tplSearch.toLowerCase()));

  // Export CSV
  const exportCSV=()=>{
    const rows=[['Mpokeaji','Ujumbe','Hali','Tarehe'],...filteredHist.map(h=>[h.recipient,(h.message||'').replace(/[\n,]/g,' '),h.status,new Date(h.created_at).toLocaleString('sw')])];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download=`sms-history-${new Date().toISOString().slice(0,10)}.csv`;a.click();
  };

  const TABS=[['dashboard','📊 Dashibodi'],['send','📤 Tuma SMS'],['templates','📝 Templates'],['history','📋 Historia'],['settings','⚙️ Mipangilio']];

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

    {/* ===== DASHBOARD ===== */}
    {tab==='dashboard'&&<div>
      {/* SALIO LA SMS */}
      <div style={{background:'linear-gradient(135deg,#0B7A3B,#15803D)',borderRadius:18,padding:20,marginBottom:14,color:'#fff',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
        <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:12,opacity:0.85,fontWeight:600,marginBottom:4}}>💰 SALIO LA SMS (BEEM)</div>
            {balLoading?<div style={{fontSize:20,fontWeight:700,opacity:0.7}}>Inapakia...</div>:
             balError?<div style={{fontSize:13,opacity:0.9}}>⚠️ {balError}</div>:
             balance!==null?<>
               <div style={{fontSize:32,fontWeight:900,lineHeight:1.1}}>TZS {balance.toLocaleString()}</div>
               <div style={{fontSize:11.5,opacity:0.8,marginTop:2}}>≈ SMS {Math.floor(balance/SMS_COST).toLocaleString()} zinabaki</div>
             </>:<div style={{fontSize:16,opacity:0.8}}>—</div>}
          </div>
          <button onClick={loadBalance} disabled={balLoading} style={{padding:'9px 16px',background:'rgba(255,255,255,0.2)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:10,fontWeight:700,fontSize:12.5,cursor:'pointer'}}>
            {balLoading?'...':'🔄 Sasisha'}
          </button>
        </div>
        {balance!==null&&balance<5000&&<div style={{marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,0.15)',borderRadius:8,fontSize:12,fontWeight:600}}>
          ⚠️ Salio ni ndogo! Ongeza salio kwenye akaunti yako ya Beem.
        </div>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:16}}>
        {[
          {l:'SMS Leo',v:stats.today,i:'📅',c:'#0B7A3B'},
          {l:'SMS Mwezi Huu',v:stats.month,i:'📆',c:'#3B82F6'},
          {l:'Zimefanikiwa',v:stats.sent,i:'✅',c:'#22C55E'},
          {l:'Zimeshindwa',v:stats.failed,i:'❌',c:'#EF4444'},
          {l:'Zinasubiri',v:stats.pending,i:'⏳',c:'#F59E0B'},
          {l:'Kiwango cha Ufikishaji',v:`${stats.rate}%`,i:'📊',c:'#8B5CF6'},
        ].map((c,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:16,padding:14,border:`1px solid ${c.c}18`,boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}><span style={{fontSize:18}}>{c.i}</span><span style={{fontSize:10.5,color:'#64748B',fontWeight:600}}>{c.l}</span></div>
            <div style={{fontSize:24,fontWeight:900,color:c.c}}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Last SMS + Recent */}
      <div className="card" style={{marginBottom:12}}>
        <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 10px',color:'#1E293B'}}>🕐 Shughuli za Hivi Karibuni</h3>
        {!history.length?<Empty icon="📭" text="Hakuna SMS bado"/>:
         <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {history.slice(0,5).map(h=>(
            <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#FAFBFC',borderRadius:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600}}>{h.recipient}</div>
                <div style={{fontSize:11,color:'#94A3B8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.message}</div>
              </div>
              <Badge color={h.status?.includes('sent')?'#22C55E':'#EF4444'}>{h.status?.includes('sent')?'✓':'✗'}</Badge>
            </div>
          ))}
         </div>}
      </div>

      <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:14,padding:14,fontSize:12.5,color:'#15803D'}}>
        🤖 <b>SMS za Otomatiki zinafanya kazi:</b> Karibu mteja mpya • Malipo yamepokelewa • Mfumo umefunguliwa • Ukumbusho (siku 7/3/1) • Usajili umeisha
      </div>
    </div>}

    {/* ===== SEND SMS ===== */}
    {tab==='send'&&<div>
      {/* Customer Groups */}
      <div className="card" style={{marginBottom:12}}>
        <label style={{fontSize:12,fontWeight:700,color:'#334155',display:'block',marginBottom:8}}>👥 Chagua Kikundi</label>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
          {GROUPS.map(g=>{
            const n=getGroupCustomers(g.id).length;
            return <button key={g.id} onClick={()=>{setGroup(g.id);setSelectedCust([])}} style={{padding:'7px 12px',borderRadius:9,border:group===g.id?'2px solid #0B7A3B':'1.5px solid #E2E8F0',background:group===g.id?'#F0FDF4':'#fff',color:group===g.id?'#0B7A3B':'#64748B',fontWeight:600,fontSize:12,cursor:'pointer'}}>
              {g.icon} {g.label} ({n})
            </button>;
          })}
        </div>

        {/* Customer search + select */}
        <Input placeholder="🔍 Tafuta mteja (jina au namba)..." value={custSearch} onChange={e=>setCustSearch(e.target.value)} style={{marginBottom:8}}/>
        {custSearch&&<div style={{maxHeight:150,overflowY:'auto',border:'1px solid #E2E8F0',borderRadius:8,marginBottom:8}}>
          {searchedCustomers.slice(0,20).map(c=>(
            <div key={c.id} onClick={()=>setSelectedCust(p=>p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderBottom:'1px solid #F1F5F9',cursor:'pointer',background:selectedCust.includes(c.id)?'#F0FDF4':'#fff'}}>
              <div><div style={{fontSize:12.5,fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:'#94A3B8'}}>{c.phone}</div></div>
              {selectedCust.includes(c.id)&&<span style={{color:'#0B7A3B',fontWeight:800}}>✓</span>}
            </div>
          ))}
        </div>}
        {selectedCust.length>0&&<div style={{fontSize:12,color:'#0B7A3B',fontWeight:600}}>✓ Wateja {selectedCust.length} wamechaguliwa <button onClick={()=>setSelectedCust([])} style={{marginLeft:8,background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:11}}>Ondoa</button></div>}
      </div>

      {/* Message */}
      <div className="card">
        <Area label="Ujumbe" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Andika ujumbe... Tumia {{jina}} kuweka jina la mteja." rows={5}/>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94A3B8',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <span>Herufi: {message.length} • SMS: {smsCount}</span>
          <span>Watapokea: <b style={{color:'#0B7A3B'}}>{targets.length}</b> • Gharama: <b style={{color:'#EA580C'}}>~TZS {estCost.toLocaleString()}</b></span>
        </div>

        {message&&<button onClick={()=>setShowPreview(!showPreview)} style={{marginBottom:10,padding:'6px 12px',background:'#F1F5F9',border:'none',borderRadius:8,fontSize:12,cursor:'pointer',color:'#475569',fontWeight:600}}>
          {showPreview?'🙈 Ficha':'👁️ Onyesho la Awali'}
        </button>}
        {showPreview&&<div style={{background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:10,padding:12,marginBottom:10,fontSize:12.5,whiteSpace:'pre-wrap',color:'#334155'}}>
          {message.replace(/\{\{jina\}\}/g,targets[0]?.name||'Mteja')}
        </div>}

        {sending&&progress.total>0&&<div style={{marginBottom:10}}>
          <div style={{fontSize:12,color:'#64748B',marginBottom:4}}>Inatuma... {progress.sent+progress.failed}/{progress.total}</div>
          <div style={{height:8,background:'#F1F5F9',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:'#0B7A3B',width:`${((progress.sent+progress.failed)/progress.total)*100}%`,transition:'width 0.3s'}}/></div>
        </div>}

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <Btn onClick={sendBulk} disabled={sending} style={{flex:2,justifyContent:'center',minWidth:160}}>
            {sending?'Inatuma...':`📢 Tuma kwa ${targets.length}`}
          </Btn>
        </div>

        <div style={{borderTop:'1px solid #F1F5F9',marginTop:14,paddingTop:14}}>
          <div style={{fontSize:12,fontWeight:700,color:'#334155',marginBottom:8}}>👤 Au tuma kwa namba moja:</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Input placeholder="0712345678" value={phone} onChange={e=>setPhone(e.target.value)} style={{marginBottom:0,flex:1,minWidth:140}}/>
            <Btn onClick={sendOne} disabled={sending} style={{minWidth:110,justifyContent:'center'}}>Tuma</Btn>
          </div>
        </div>
      </div>
    </div>}

    {/* ===== TEMPLATES ===== */}
    {tab==='templates'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:8,flexWrap:'wrap'}}>
        <Input placeholder="🔍 Tafuta template..." value={tplSearch} onChange={e=>setTplSearch(e.target.value)} style={{marginBottom:0,flex:1,minWidth:180}}/>
        <Btn onClick={()=>{setTplForm({name:'',body:''});setTplModal('new')}}>{IC.plus} Mpya</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:12}}>
        {filteredTpls.map(t=>(
          <div key={t.id} className="card" style={{padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <b style={{fontSize:13.5,color:'#0B7A3B'}}>{t.name}</b>
              {DEFAULT_TEMPLATES.find(d=>d.id===t.id)&&<Badge color="#94A3B8">Msingi</Badge>}
            </div>
            <div style={{fontSize:11.5,color:'#64748B',lineHeight:1.5,marginBottom:10,minHeight:60,whiteSpace:'pre-wrap',overflow:'hidden',maxHeight:80}}>{t.body}</div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>useTpl(t)} style={{flex:1,padding:'7px',background:'#0B7A3B',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>Tumia</button>
              <button onClick={()=>{setTplForm(t);setTplModal('edit')}} style={{padding:'7px 10px',background:'#F1F5F9',border:'none',borderRadius:8,fontSize:12,cursor:'pointer'}}>{IC.gear}</button>
              {!DEFAULT_TEMPLATES.find(d=>d.id===t.id)&&<button onClick={()=>delTpl(t)} style={{padding:'7px 10px',background:'#FEF2F2',color:'#EF4444',border:'none',borderRadius:8,fontSize:12,cursor:'pointer'}}>{IC.del}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>}

    {/* ===== HISTORY ===== */}
    {tab==='history'&&<div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <Input placeholder="🔍 Tafuta..." value={histSearch} onChange={e=>{setHistSearch(e.target.value);setPage(1)}} style={{marginBottom:0,flex:1,minWidth:150}}/>
        <Input type="date" value={histDate} onChange={e=>{setHistDate(e.target.value);setPage(1)}} style={{marginBottom:0,minWidth:130}}/>
        <div style={{display:'flex',gap:6}}>
          {[['all','Zote'],['sent','✅'],['failed','❌']].map(([id,l])=>(
            <button key={id} onClick={()=>{setHistFilter(id);setPage(1)}} style={{padding:'8px 12px',borderRadius:8,border:histFilter===id?'2px solid #0B7A3B':'1px solid #E2E8F0',background:histFilter===id?'#F0FDF4':'#fff',color:histFilter===id?'#0B7A3B':'#64748B',fontWeight:600,fontSize:12,cursor:'pointer'}}>{l}</button>
          ))}
        </div>
        <button onClick={exportCSV} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #0B7A3B',background:'#fff',color:'#0B7A3B',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Excel</button>
      </div>

      <div style={{fontSize:12,color:'#64748B',marginBottom:8}}>Jumla: {filteredHist.length} SMS</div>

      {loading?<div className="card"><div style={{height:60,background:'#F1F5F9',borderRadius:8,animation:'pulse 1.5s infinite'}}/></div>:
       !pagedHist.length?<div className="card"><Empty icon="📭" text="Hakuna historia"/></div>:
       <>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {pagedHist.map(h=>(
            <div key={h.id} className="card" style={{padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:150}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{h.recipient}</div>
                  <div style={{fontSize:12,color:'#64748B',whiteSpace:'pre-wrap'}}>{h.message}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <Badge color={h.status?.includes('sent')?'#22C55E':'#EF4444'}>{h.status?.includes('sent')?'Imetumwa':'Imeshindwa'}</Badge>
                  <div style={{fontSize:10,color:'#94A3B8',marginTop:4}}>{new Date(h.created_at).toLocaleString('sw',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  {h.status?.includes('failed')&&<button onClick={()=>resendFailed(h)} disabled={sending} style={{marginTop:6,padding:'4px 10px',background:'#0B7A3B',color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄 Tuma Tena</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {totalPages>1&&<div style={{display:'flex',justifyContent:'center',gap:8,marginTop:12,alignItems:'center'}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',cursor:page===1?'default':'pointer',opacity:page===1?0.5:1}}>←</button>
          <span style={{fontSize:13,color:'#64748B'}}>{page}/{totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',cursor:page===totalPages?'default':'pointer',opacity:page===totalPages?0.5:1}}>→</button>
        </div>}
       </>}
    </div>}

    {/* ===== SETTINGS ===== */}
    {tab==='settings'&&<div>
      {/* Hali ya Muunganisho */}
      <div className="card" style={{marginBottom:12}}>
        <h3 style={{fontSize:15,fontWeight:800,margin:'0 0 12px'}}>🔌 Hali ya Muunganisho</h3>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 14px',background:'#F8FAFC',borderRadius:10}}><span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Mtoa Huduma</span><span style={{fontSize:13,fontWeight:700,color:'#0B7A3B'}}>Beem Africa</span></div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 14px',background:'#F8FAFC',borderRadius:10}}><span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Sender ID</span><span style={{fontSize:13,fontWeight:700,color:'#1E293B'}}>Imewekwa (Vercel)</span></div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 14px',background:'#F8FAFC',borderRadius:10}}><span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Hali ya API</span><Badge color={balError?'#EF4444':'#22C55E'}>{balError?'● Tatizo':'● Imeunganishwa'}</Badge></div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 14px',background:'#F8FAFC',borderRadius:10}}><span style={{fontSize:13,color:'#64748B',fontWeight:600}}>Salio</span><span style={{fontSize:13,fontWeight:800,color:balance!==null&&balance<5000?'#EF4444':'#0B7A3B'}}>{balance!==null?`TZS ${balance.toLocaleString()}`:'—'}</span></div>
          <div style={{padding:'11px 14px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:10,fontSize:12,color:'#9A3412'}}>🔒 API Key na Secret zimefichwa kwa usalama. Ili kubadilisha Sender ID, nenda Vercel → Environment Variables → BEEM_SENDER_ID.</div>
        </div>
      </div>

      {/* SMS Signature & Footer */}
      <div className="card" style={{marginBottom:12}}>
        <h3 style={{fontSize:15,fontWeight:800,margin:'0 0 12px'}}>✍️ Sahihi na Kifuatisho</h3>
        <Input label="Sahihi ya SMS (mwanzo)" value={cfg.sms_signature} onChange={e=>setCfg({...cfg,sms_signature:e.target.value})} placeholder="Mfano: DukaLangu"/>
        <Area label="Kifuatisho (mwisho wa kila SMS)" value={cfg.sms_footer} onChange={e=>setCfg({...cfg,sms_footer:e.target.value})} placeholder="Mfano: DukaLangu Smart POS - Simamia Biashara Yako Kidijitali." rows={2}/>
        <div style={{fontSize:11,color:'#94A3B8',marginBottom:10}}>💡 Hivi vitaongezwa kwenye SMS za otomatiki. Kumbuka: maandishi marefu = SMS nyingi = gharama zaidi.</div>
      </div>

      {/* Automatic SMS Controls */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <h3 style={{fontSize:15,fontWeight:800,margin:0}}>🤖 SMS za Otomatiki</h3>
          <button onClick={()=>setCfg({...cfg,auto_sms_enabled:cfg.auto_sms_enabled==='true'?'false':'true'})} style={{padding:'7px 16px',borderRadius:20,border:'none',background:cfg.auto_sms_enabled==='true'?'#22C55E':'#CBD5E1',color:'#fff',fontWeight:800,fontSize:12,cursor:'pointer'}}>
            {cfg.auto_sms_enabled==='true'?'● IMEWASHWA':'○ IMEZIMWA'}
          </button>
        </div>

        {cfg.auto_sms_enabled==='true'?<div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[
            ['auto_welcome','👋 Karibu Mteja Mpya','Mteja anapojisajili'],
            ['auto_payment','💰 Malipo Yamepokelewa','Malipo yanapothibitishwa'],
            ['auto_reminder_7','📅 Ukumbusho — Siku 7','Siku 7 kabla ya kuisha'],
            ['auto_reminder_3','📅 Ukumbusho — Siku 3','Siku 3 kabla ya kuisha'],
            ['auto_reminder_1','⚠️ Ukumbusho — Siku 1','Siku 1 kabla ya kuisha'],
            ['auto_expired','🔴 Usajili Umeisha','Siku ya kuisha'],
          ].map(([key,label,desc])=>(
            <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:cfg[key]==='true'?'#F0FDF4':'#FAFBFC',borderRadius:10,border:`1px solid ${cfg[key]==='true'?'#BBF7D0':'#F1F5F9'}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'#334155'}}>{label}</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>{desc}</div>
              </div>
              <button onClick={()=>setCfg({...cfg,[key]:cfg[key]==='true'?'false':'true'})} style={{width:44,height:24,borderRadius:12,border:'none',background:cfg[key]==='true'?'#22C55E':'#CBD5E1',cursor:'pointer',position:'relative',flexShrink:0}}>
                <span style={{position:'absolute',top:2,left:cfg[key]==='true'?22:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
              </button>
            </div>
          ))}
          <div style={{padding:'10px 12px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:10,fontSize:11.5,color:'#9A3412'}}>
            💡 Makadirio: wateja {withPhone.length} × ukumbusho 3 ≈ TZS {(withPhone.length*3*SMS_COST).toLocaleString()}/mwezi
          </div>
        </div>:
        <div style={{padding:'14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,fontSize:12.5,color:'#B91C1C'}}>
          ⚠️ SMS zote za otomatiki zimezimwa. Wateja hawatapokea ukumbusho wala karibu.
        </div>}

        <Btn onClick={saveSettings} disabled={savingCfg} style={{width:'100%',justifyContent:'center',marginTop:12}}>
          {savingCfg?'Inahifadhi...':'💾 Hifadhi Mipangilio'}
        </Btn>
      </div>

      {/* Test SMS */}
      <div className="card">
        <h3 style={{fontSize:15,fontWeight:800,margin:'0 0 12px'}}>🧪 Jaribio</h3>
        <Input label="Namba ya Kupima" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0712345678"/>
        <Btn onClick={()=>{if(!phone.trim())return alert('Weka namba!');setMessage('Hii ni SMS ya majaribio kutoka DukaLangu Smart POS. Beem inafanya kazi!');setTimeout(sendOne,100)}} disabled={sending} style={{width:'100%',justifyContent:'center'}}>
          {sending?'Inatuma...':'🧪 Tuma SMS ya Majaribio'}
        </Btn>
      </div>
    </div>}

    {/* Template Modal */}
    {tplModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setTplModal(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,padding:20,maxWidth:460,width:'100%',maxHeight:'85vh',overflowY:'auto'}}>
        <h3 style={{fontSize:16,fontWeight:800,margin:'0 0 14px'}}>{tplModal==='edit'?'✏️ Hariri Template':'➕ Template Mpya'}</h3>
        <Input label="Jina" value={tplForm.name} onChange={e=>setTplForm({...tplForm,name:e.target.value})} placeholder="Mfano: Karibu Mteja"/>
        <Area label="Ujumbe (tumia {{jina}} kwa jina la mteja)" value={tplForm.body} onChange={e=>setTplForm({...tplForm,body:e.target.value})} rows={6}/>
        <div style={{fontSize:11,color:'#94A3B8',marginBottom:8}}>Herufi: {tplForm.body.length} • SMS: {Math.max(1,Math.ceil(tplForm.body.length/160))}</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setTplModal(null)} style={{flex:1,padding:11,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ghairi</button>
          <button onClick={saveTpl} style={{flex:2,padding:11,background:'#0B7A3B',color:'#fff',border:'none',borderRadius:10,fontWeight:800,cursor:'pointer'}}>Hifadhi</button>
        </div>
      </div>
    </div>}

    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
  </div>;
}
