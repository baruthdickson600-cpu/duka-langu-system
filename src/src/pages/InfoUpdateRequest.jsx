// Customer-facing form to request info update
// Accessible without login - public page
import React,{useState,useEffect} from 'react';
import { API_BASE } from '../config/api';
import {createClient} from '@supabase/supabase-js';

const supabase=createClient('https://snosfxagzglswaotrgzv.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE');

export default function InfoUpdateRequest({onBack}){
  const[step,setStep]=useState(1);// 1=identify, 2=request, 3=success
  const[oldEmail,setOldEmail]=useState('');
  const[oldPhone,setOldPhone]=useState('');
  const[bizName,setBizName]=useState('');
  const[foundBiz,setFoundBiz]=useState(null);
  const[form,setForm]=useState({new_email:'',new_phone:'',new_name:'',new_owner_name:'',reason:'',id_number:'',whatsapp:''});
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));

  const findCustomer=async()=>{
    setErr('');setBusy(true);
    if(!oldEmail&&!oldPhone&&!bizName){setErr('Jaza angalau email, simu, au jina la biashara');setBusy(false);return}
    try{
      let q=supabase.from('businesses').select('*');
      if(oldEmail)q=q.eq('email',oldEmail.trim().toLowerCase());
      else if(oldPhone)q=q.eq('phone',oldPhone.trim());
      else if(bizName)q=q.ilike('name',`%${bizName.trim()}%`);
      const{data,error}=await q.limit(1);
      if(error)throw error;
      if(!data||!data.length){setErr('Hatukukupata kwenye mfumo. Hakikisha taarifa ni sahihi.');setBusy(false);return}
      setFoundBiz(data[0]);setStep(2);
    }catch(e){setErr('Tatizo: '+e.message)}
    setBusy(false);
  };

  const submitRequest=async()=>{
    setErr('');
    if(!form.reason)return setErr('Tafadhali eleza sababu ya kubadilisha taarifa');
    if(!form.new_email&&!form.new_phone&&!form.new_name&&!form.new_owner_name)return setErr('Andika angalau kitu kimoja unachotaka kubadilisha');
    if(!form.id_number&&!form.whatsapp)return setErr('Tunahitaji namba ya kitambulisho au WhatsApp kuthibitisha ni wewe');
    
    setBusy(true);
    try{
      const requestData={
        business_id:foundBiz.id,
        business_name:foundBiz.name,
        old_email:foundBiz.email,
        old_phone:foundBiz.phone,
        new_email:form.new_email||null,
        new_phone:form.new_phone||null,
        new_name:form.new_name||null,
        new_owner_name:form.new_owner_name||null,
        reason:form.reason,
        id_number:form.id_number,
        whatsapp:form.whatsapp,
        status:'pending',
      };
      
      const{error}=await supabase.from('info_update_requests').insert(requestData);
      if(error)throw error;
      
      // Notify admin
      try{
        await supabase.from('notifications').insert({
          target_type:'admin',
          type:'warning',
          title:'📝 Ombi la Kubadilisha Taarifa',
          message:`${foundBiz.name} (${foundBiz.email||foundBiz.phone}) ameomba kubadilisha taarifa zake. Sababu: ${form.reason.slice(0,100)}`,
        });
      }catch(e){}
      
      // Email admin
      try{
        await fetch(API_BASE+'/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          to:'pesafly1@gmail.com',
          subject:`📝 Ombi la Kubadilisha Taarifa — ${foundBiz.name}`,
          type:'promotional',
          data:{
            title:'📝 Ombi Jipya la Kubadilisha Taarifa',
            emoji:'📝',
            message:`Mteja: ${foundBiz.name}\nEmail ya sasa: ${foundBiz.email||'—'}\nSimu ya sasa: ${foundBiz.phone||'—'}\n\nMABADILIKO YANAOMBWA:\n${form.new_email?`📧 Email mpya: ${form.new_email}\n`:''}${form.new_phone?`📱 Simu mpya: ${form.new_phone}\n`:''}${form.new_name?`🏪 Jina jipya: ${form.new_name}\n`:''}${form.new_owner_name?`👤 Mmiliki: ${form.new_owner_name}\n`:''}\nSABABU: ${form.reason}\n\nUTHIBITISHO:\n${form.id_number?`Kitambulisho: ${form.id_number}\n`:''}${form.whatsapp?`WhatsApp: ${form.whatsapp}\n`:''}\nIngia kwenye Admin → Ombi za Mabadiliko kuthibitisha.`,
            cta:'Fungua Admin →'
          }
        })});
      }catch(e){}
      
      setStep(3);
    }catch(e){setErr('Tatizo: '+e.message)}
    setBusy(false);
  };

  return <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',padding:'20px 16px'}}>
    <div style={{maxWidth:600,margin:'0 auto'}}>
      {/* Header */}
      <div style={{textAlign:'center',marginBottom:24}}>
        <div style={{width:70,height:70,margin:'0 auto 10px',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,boxShadow:'0 8px 24px rgba(11,122,59,.3)'}}>📝</div>
        <h1 style={{fontSize:24,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>Ombi la Kubadilisha Taarifa</h1>
        <p style={{fontSize:13,color:'#64748B',margin:0}}>Duka Langu — Together for the better</p>
      </div>

      {/* Progress */}
      <div style={{display:'flex',gap:6,marginBottom:20}}>
        {[1,2,3].map(n=><div key={n} style={{flex:1,height:6,borderRadius:6,background:step>=n?'#0B7A3B':'#E2E8F0',transition:'all 0.3s'}}/>)}
      </div>

      {step===1&&<div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 4px 20px rgba(0,0,0,.05)'}}>
        <h2 style={{fontSize:18,fontWeight:800,color:'#1E293B',margin:'0 0 6px'}}>Hatua 1: Tutafute</h2>
        <p style={{fontSize:13,color:'#64748B',marginBottom:16}}>Jaza moja kati ya hizi kukutambua kwenye mfumo wetu</p>
        
        {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>{err}</div>}
        
        <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>Email yako (ya kale)</label>
        <input type="email" placeholder="email@mfano.com" value={oldEmail} onChange={e=>setOldEmail(e.target.value)} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:14,marginBottom:12,boxSizing:'border-box'}}/>
        
        <div style={{textAlign:'center',color:'#94A3B8',fontSize:12,margin:'4px 0'}}>— AU —</div>
        
        <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>Simu yako (ya kale)</label>
        <input type="tel" placeholder="07XXXXXXXX" value={oldPhone} onChange={e=>setOldPhone(e.target.value)} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:14,marginBottom:12,boxSizing:'border-box'}}/>
        
        <div style={{textAlign:'center',color:'#94A3B8',fontSize:12,margin:'4px 0'}}>— AU —</div>
        
        <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>Jina la Biashara</label>
        <input placeholder="Mf: Duka la Rehema" value={bizName} onChange={e=>setBizName(e.target.value)} style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:14,marginBottom:16,boxSizing:'border-box'}}/>
        
        <button onClick={findCustomer} disabled={busy} style={{width:'100%',padding:14,background:busy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>
          {busy?'⏳ Inatafuta...':'🔍 Endelea →'}
        </button>
        
        {onBack&&<button onClick={onBack} style={{width:'100%',marginTop:8,padding:12,background:'transparent',color:'#64748B',border:'none',fontWeight:600,fontSize:13,cursor:'pointer'}}>← Rudi</button>}
      </div>}

      {step===2&&<div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 4px 20px rgba(0,0,0,.05)'}}>
        <h2 style={{fontSize:18,fontWeight:800,color:'#1E293B',margin:'0 0 6px'}}>Hatua 2: Mabadiliko</h2>
        
        {/* Found business */}
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:14,marginBottom:16}}>
          <div style={{fontSize:11,color:'#15803D',fontWeight:600,marginBottom:4}}>✅ TUMEKUPATA:</div>
          <div style={{fontWeight:700,fontSize:15}}>{foundBiz.name}</div>
          <div style={{fontSize:12,color:'#64748B'}}>📧 {foundBiz.email||'—'}<br/>📱 {foundBiz.phone||'—'}</div>
        </div>

        {err&&<div style={{background:'#FEF2F2',color:'#B91C1C',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #EF4444'}}>{err}</div>}

        <p style={{fontSize:13,color:'#64748B',marginBottom:14}}><b>Andika ZILE TU unazotaka kubadilisha</b> — acha tupu zile zinazobaki vivyo hivyo</p>

        <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>📧 Email Mpya</label>
        <input type="email" placeholder="email_mpya@mfano.com" value={form.new_email} onChange={e=>s('new_email',e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:10,boxSizing:'border-box'}}/>

        <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>📱 Namba Mpya ya Simu</label>
        <input type="tel" placeholder="07XXXXXXXX" value={form.new_phone} onChange={e=>s('new_phone',e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:10,boxSizing:'border-box'}}/>

        <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>🏪 Jina Jipya la Biashara</label>
        <input placeholder="Mf: Duka la Rehema Jipya" value={form.new_name} onChange={e=>s('new_name',e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:10,boxSizing:'border-box'}}/>

        <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>👤 Jina la Mmiliki</label>
        <input placeholder="Jina kamili" value={form.new_owner_name} onChange={e=>s('new_owner_name',e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:14,boxSizing:'border-box'}}/>

        <div style={{borderTop:'1px solid #E2E8F0',paddingTop:14,marginTop:6}}>
          <h3 style={{fontSize:14,fontWeight:700,color:'#0B7A3B',margin:'0 0 10px'}}>🔐 Uthibitisho (Lazima)</h3>
          
          <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>Sababu ya Kubadilisha *</label>
          <textarea placeholder="Mf: Nimepoteza simu yangu, ninataka kubadilisha namba" value={form.reason} onChange={e=>s('reason',e.target.value)} rows={3} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:10,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>

          <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>Namba ya Kitambulisho (NIDA/Voter)</label>
          <input placeholder="Mf: 19850101-12345-67890-12" value={form.id_number} onChange={e=>s('id_number',e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:10,boxSizing:'border-box'}}/>

          <label style={{fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5}}>WhatsApp ya Kuwasiliana</label>
          <input type="tel" placeholder="07XXXXXXXX (tutakupigia kuthibitisha)" value={form.whatsapp} onChange={e=>s('whatsapp',e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:14,boxSizing:'border-box'}}/>
        </div>

        <div style={{background:'#FFF7ED',borderLeft:'4px solid #F59E0B',borderRadius:10,padding:'10px 14px',fontSize:11,color:'#92400E',marginBottom:14}}>
          ⚠️ <b>Onyo:</b> Admin atakagua ombi lako kwa makini. Tutawasiliana nawe kupitia WhatsApp/Simu kuthibitisha ni wewe kabla ya kubadilisha taarifa. Ombi linachukua masaa 24-48.
        </div>

        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setStep(1)} style={{flex:1,padding:13,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:12,fontWeight:700,fontSize:13,cursor:'pointer'}}>← Rudi</button>
          <button onClick={submitRequest} disabled={busy} style={{flex:2,padding:13,background:busy?'#86EFAC':'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>
            {busy?'⏳ Inatuma...':'📨 Tuma Ombi'}
          </button>
        </div>
      </div>}

      {step===3&&<div style={{background:'#fff',borderRadius:16,padding:32,boxShadow:'0 4px 20px rgba(0,0,0,.05)',textAlign:'center'}}>
        <div style={{fontSize:64,marginBottom:12}}>✅</div>
        <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 8px'}}>Ombi Limetumwa!</h2>
        <p style={{fontSize:14,color:'#64748B',marginBottom:16}}>Ombi lako limetumwa kwa Admin. Tutawasiliana nawe ndani ya masaa 24-48.</p>
        
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:14,textAlign:'left',marginBottom:16}}>
          <div style={{fontSize:12,color:'#15803D',fontWeight:600,marginBottom:6}}>📋 Hatua zinazofuata:</div>
          <ol style={{fontSize:12,color:'#1E293B',margin:0,paddingLeft:18,lineHeight:1.7}}>
            <li>Admin atakagua ombi lako</li>
            <li>Tutakupigia simu/WhatsApp kuthibitisha ni wewe</li>
            <li>Mabadiliko yatafanyika</li>
            <li>Utapata SMS na email ya kuthibitisha</li>
          </ol>
        </div>

        <div style={{fontSize:12,color:'#64748B',marginBottom:14}}>
          <b>Msaada:</b><br/>
          📞 0617 288 752<br/>
          💬 WhatsApp: +255 628 319 789
        </div>

        {onBack&&<button onClick={onBack} style={{padding:'12px 24px',background:'#0B7A3B',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>Rudi Mwanzo</button>}
      </div>}

      <div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#64748B'}}>
        🔒 Taarifa zako ziko salama. Hatuwasiliani na watu wengine kuhusu wewe.
      </div>
    </div>
  </div>;
}
