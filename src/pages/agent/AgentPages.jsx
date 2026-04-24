import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Btn,Stat,Modal,Badge,Empty} from '../../components/UI';
import {fmtMoney,fmtDate} from '../../utils/helpers';

const fm=n=>fmtMoney(n);

// ===== AGENT DASHBOARD =====
export function AgentDashboard(){
  const{user,businesses,AGENT_TIERS,settings}=useApp();
  const myCode=user?.promo_code;
  const myBiz=useMemo(()=>businesses.filter(b=>b.promo_code===myCode),[businesses,myCode]);
  const active=myBiz.filter(b=>b.token_active&&!b.is_suspended);
  const trial=myBiz.filter(b=>!b.token_active&&!b.is_suspended);
  const expired=myBiz.filter(b=>b.is_suspended||(!b.token_active&&b.trial_end&&new Date(b.trial_end)<new Date()));

  // Current tier
  const tiers=(AGENT_TIERS||[]).filter(t=>t.min>0).reverse();
  const currentTier=tiers.filter(t=>active.length>=t.min).pop()||{name:'Bado',emoji:'⏳',color:'#94A3B8',bonus:0,min:0};
  const nextTier=tiers.find(t=>t.min>active.length);
  const toNext=nextTier?nextTier.min-active.length:0;
  const progress=nextTier?Math.min(100,Math.round(active.length/nextTier.min*100)):100;
  const price=parseInt(settings.system_price||15000);
  const revenue=active.length*price;
  const commission=revenue*(user?.commission_rate||10)/100;

  return <div>
    {/* Welcome */}
    <div style={{background:'linear-gradient(135deg,#0B7A3B,#065F2E)',borderRadius:16,padding:'20px 24px',marginBottom:20,color:'#fff'}}>
      <div style={{fontSize:13,opacity:.8}}>Karibu, Wakala</div>
      <div style={{fontSize:22,fontWeight:800,marginTop:2}}>{user?.name}</div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
        <span style={{fontSize:24}}>{currentTier.emoji}</span>
        <div>
          <div style={{fontWeight:700,fontSize:16}}>{currentTier.name}</div>
          {toNext>0&&<div style={{fontSize:12,opacity:.8}}>Wateja {toNext} zaidi kwa {nextTier?.emoji} {nextTier?.name}</div>}
          {toNext<=0&&currentTier.name==='Shujaa'&&<div style={{fontSize:12}}>🏆 Daraja la Juu!</div>}
        </div>
      </div>
      {nextTier&&<div style={{marginTop:10}}>
        <div style={{height:8,background:'rgba(255,255,255,0.2)',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${progress}%`,background:'#fff',borderRadius:4,transition:'width 0.5s'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,opacity:.7,marginTop:3}}><span>{active.length} active</span><span>{nextTier.min} kwa {nextTier.name}</span></div>
      </div>}
    </div>

    {/* Stats */}
    <div className="flex-wrap" style={{marginBottom:20}}>
      <Stat icon={IC.store} label="Wateja Jumla" value={myBiz.length} color="#0B7A3B"/>
      <Stat icon={IC.ok} label="Wanaolipa" value={active.length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Trial" value={trial.length} color="#F59E0B"/>
      <Stat icon={IC.dollar} label="Kamisheni" value={fm(commission)} color="#8B5CF6"/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      {/* Promo Code */}
      <div className="card" style={{textAlign:'center'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🔗 Promo Code Yako</h3>
        <div style={{fontSize:28,fontWeight:900,fontFamily:'monospace',color:'#8B5CF6',background:'#F5F3FF',borderRadius:12,padding:14,marginBottom:10}}>{myCode||'—'}</div>
        <div style={{fontSize:12,color:'#64748B',marginBottom:8}}>Mteja akisajili na code hii, unapata credit</div>
        <div style={{background:'#F8FAFC',borderRadius:8,padding:'8px 10px',fontSize:11,marginBottom:8}}>
          🔗 <code>duka-langu-system.vercel.app</code>
        </div>
        <button onClick={()=>{navigator.clipboard.writeText(`https://duka-langu-system.vercel.app`);alert('Link imecopy! Mtumie mteja akisajili atumie promo code: '+myCode)}} style={{width:'100%',padding:'10px',background:'#0B7A3B',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>📋 Copy Link</button>
      </div>

      {/* Current Tier Detail */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🏆 Daraja Lako</h3>
        <div style={{background:currentTier.color+'15',borderRadius:12,padding:16,textAlign:'center',border:`2px solid ${currentTier.color}33`,marginBottom:10}}>
          <div style={{fontSize:36}}>{currentTier.emoji}</div>
          <div style={{fontWeight:900,fontSize:20,color:currentTier.color,marginTop:4}}>{currentTier.name}</div>
          <div style={{fontSize:14,fontWeight:700,color:currentTier.color,marginTop:4}}>Bonus: {fm(currentTier.bonus)}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div style={{background:'#F8FAFC',borderRadius:8,padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Commission Rate</div>
            <div style={{fontWeight:800,fontSize:18,color:'#8B5CF6'}}>{user?.commission_rate||10}%</div>
          </div>
          <div style={{background:'#F8FAFC',borderRadius:8,padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#94A3B8'}}>Revenue</div>
            <div style={{fontWeight:800,fontSize:16,color:'#0B7A3B'}}>{fm(revenue)}</div>
          </div>
        </div>
      </div>

      {/* Recent Customers */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🕐 Wateja wa Hivi Karibuni</h3>
        {myBiz.slice(0,5).map(b=>(
          <div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:600,fontSize:12}}>{b.name}</div>
              <div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(b.created_at)}</div>
            </div>
            <Badge color={b.token_active?'#22C55E':b.is_suspended?'#EF4444':'#F59E0B'}>{b.token_active?'Active':'Trial'}</Badge>
          </div>
        ))}
        {!myBiz.length&&<Empty icon="👥" text="Sajili mteja wako wa kwanza!"/>}
      </div>
    </div>
  </div>;
}

// ===== REGISTER CUSTOMER =====
export function AgentRegisterPage(){
  const{registerCustomerByAgent,user}=useApp();
  const[f,setF]=useState({bizName:'',name:'',email:'',phone:''});
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);

  const handleRegister=async()=>{
    if(!f.bizName||!f.email)return alert('Jaza jina la biashara na email!');
    setLoading(true);
    const res=await registerCustomerByAgent(f.bizName,f.email,f.phone,f.name);
    setLoading(false);
    if(res?.success){
      setResult(res);
      setF({bizName:'',name:'',email:'',phone:''});
    }else{
      alert(res?.error||'Tatizo limejitokeza. Jaribu tena.');
    }
  };

  return <div style={{maxWidth:500}}>
    <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 16px'}}>📝 Sajili Mteja Mpya</h3>

    {result&&<div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:14,padding:20,marginBottom:20,textAlign:'center'}}>
      <div style={{fontSize:36,marginBottom:8}}>🎉</div>
      <div style={{fontSize:18,fontWeight:800,color:'#0B7A3B',marginBottom:6}}>Mteja Amesajiliwa!</div>
      <div style={{background:'#fff',borderRadius:10,padding:14,textAlign:'left',fontSize:13,lineHeight:1.8}}>
        <div><b>Biashara:</b> {result.bizName}</div>
        <div><b>Email:</b> {result.email}</div>
        <div><b>Password:</b> <code style={{background:'#E2E8F0',padding:'2px 8px',borderRadius:4,fontWeight:700}}>{result.password}</code></div>
        <div><b>Promo Code:</b> {user?.promo_code}</div>
      </div>
      <div style={{fontSize:12,color:'#64748B',marginTop:10}}>Mtumie mteja taarifa hizi aingie kwenye mfumo</div>
      <div style={{display:'flex',gap:8,marginTop:12,justifyContent:'center'}}>
        <button onClick={()=>{
          const msg=`Habari! Umesajiliwa kwenye Duka Langu - Smart POS.%0A%0AIngia hapa: https://duka-langu-system.vercel.app%0AEmail: ${result.email}%0APassword: ${result.password}%0A%0AUtapata siku 5 za bure!`;
          window.open(`https://wa.me/${f.phone?.replace(/\D/g,'')||''}?text=${msg}`,'_blank');
        }} style={{padding:'8px 16px',background:'#22C55E',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>📱 Tuma WhatsApp</button>
        <button onClick={()=>setResult(null)} style={{padding:'8px 16px',background:'#F1F5F9',color:'#475569',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>+ Sajili Mwingine</button>
      </div>
    </div>}

    {!result&&<div className="card">
      <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#1E40AF'}}>
        Mteja atasajiliwa na promo code yako: <b>{user?.promo_code}</b>. Utapata commission kwa kila mteja anayeelipa.
      </div>
      <Input label="Jina la Biashara *" value={f.bizName} onChange={e=>setF({...f,bizName:e.target.value})} placeholder="Mf: Duka la Mama Fatuma"/>
      <Input label="Jina la Mmiliki" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Mf: Fatuma Hassan"/>
      <Input label="Email *" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@mfano.com"/>
      <Input label="Simu / WhatsApp" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} placeholder="07XXXXXXXX"/>
      <button onClick={handleRegister} disabled={loading} style={{width:'100%',padding:14,background:loading?'#86EFAC':'#0B7A3B',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,cursor:loading?'not-allowed':'pointer',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        {loading?'⏳ Inasajili...':'📝 Sajili Mteja'}
      </button>
    </div>}
  </div>;
}

// ===== MY CUSTOMERS =====
export function AgentCustomersPage(){
  const{user,businesses}=useApp();
  const myCode=user?.promo_code;
  const[filter,setFilter]=useState('all');
  const[search,setSearch]=useState('');

  const myBiz=useMemo(()=>{
    let list=businesses.filter(b=>b.promo_code===myCode);
    if(search){list=list.filter(b=>b.name?.toLowerCase().includes(search.toLowerCase())||b.email?.toLowerCase().includes(search.toLowerCase())||b.phone?.includes(search))}
    if(filter==='active')list=list.filter(b=>b.token_active&&!b.is_suspended);
    if(filter==='trial')list=list.filter(b=>!b.token_active&&!b.is_suspended);
    if(filter==='expired')list=list.filter(b=>b.is_suspended||(!b.token_active&&b.trial_end&&new Date(b.trial_end)<new Date()));
    return list.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  },[businesses,myCode,filter,search]);

  const all=businesses.filter(b=>b.promo_code===myCode);
  const activeCount=all.filter(b=>b.token_active).length;
  const trialCount=all.filter(b=>!b.token_active&&!b.is_suspended).length;

  const getDaysLeft=(b)=>{const end=b.token_active?b.token_expiry:b.trial_end;if(!end)return 0;return Math.max(0,Math.ceil((new Date(end)-new Date())/86400000))};

  return <div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.store} label="Jumla" value={all.length} color="#0B7A3B"/>
      <Stat icon={IC.ok} label="Wanaolipa" value={activeCount} color="#22C55E"/>
      <Stat icon={IC.clock} label="Trial" value={trialCount} color="#F59E0B"/>
    </div>

    {/* Search + Filter */}
    <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
      <div style={{position:'relative',flex:'1 1 200px',maxWidth:300}}>
        <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94A3B8'}}>{IC.find}</span>
        <input placeholder="Tafuta kwa jina, email, simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 10px 10px 36px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
      </div>
      {[{v:'all',l:`Wote (${all.length})`},{v:'active',l:`Wanaolipa (${activeCount})`},{v:'trial',l:`Trial (${trialCount})`},{v:'expired',l:'Wameisha'}].map(f=>
        <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:'8px 14px',borderRadius:8,border:filter===f.v?'2px solid #0B7A3B':'1px solid #E2E8F0',background:filter===f.v?'#F0FDF4':'#fff',fontWeight:filter===f.v?700:500,fontSize:12,cursor:'pointer',color:filter===f.v?'#0B7A3B':'#64748B'}}>{f.l}</button>
      )}
    </div>

    {/* Customer Cards */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
      {myBiz.map(b=>{const dl=getDaysLeft(b);
        return <div key={b.id} className="card" style={{border:b.token_active?'1px solid #BBF7D0':b.is_suspended?'1px solid #FECACA':'1px solid #FED7AA'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{b.name}</div>
              <div style={{fontSize:12,color:'#64748B'}}>{b.email}</div>
            </div>
            <Badge color={b.token_active?'#22C55E':b.is_suspended?'#EF4444':'#F59E0B'}>{b.token_active?'ACTIVE':b.is_suspended?'EXPIRED':'TRIAL'}</Badge>
          </div>

          {/* Contact Info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}>
              <div style={{fontSize:10,color:'#94A3B8'}}>Simu</div>
              <div style={{fontWeight:600,fontSize:13}}>{b.phone||'—'}</div>
            </div>
            <div style={{background:'#F8FAFC',borderRadius:8,padding:'6px 10px'}}>
              <div style={{fontSize:10,color:'#94A3B8'}}>Siku</div>
              <div style={{fontWeight:700,fontSize:14,color:dl<=3?'#EF4444':dl<=7?'#F59E0B':'#22C55E'}}>{dl} zimebaki</div>
            </div>
          </div>

          <div style={{fontSize:11,color:'#94A3B8',marginBottom:8}}>
            📅 Alisajili: {fmtDate(b.created_at)} • Plan: <b>{(b.plan||'trial').toUpperCase()}</b>
          </div>

          {/* Actions */}
          <div style={{display:'flex',gap:6}}>
            {b.phone&&<a href={`https://wa.me/${b.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#15803D',fontWeight:600,fontSize:12,textDecoration:'none',textAlign:'center'}}>💬 WhatsApp</a>}
            {b.phone&&<a href={`tel:${b.phone}`} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #93C5FD',background:'#EFF6FF',color:'#2563EB',fontWeight:600,fontSize:12,textDecoration:'none'}}>📞</a>}
          </div>
        </div>;
      })}
    </div>
    {!myBiz.length&&<div className="card"><Empty icon="👥" text={search?'Hakuna matokeo':'Sajili mteja wako wa kwanza!'}/></div>}
  </div>;
}

// ===== TIERS PAGE =====
export function AgentTiersPage(){
  const{user,businesses,AGENT_TIERS}=useApp();
  const myCode=user?.promo_code;
  const active=businesses.filter(b=>b.promo_code===myCode&&b.token_active).length;
  const tiers=(AGENT_TIERS||[]).filter(t=>t.min>0).reverse();
  const currentTier=tiers.filter(t=>active>=t.min).pop()||{name:'Bado',emoji:'⏳',color:'#94A3B8',bonus:0,min:0};

  return <div style={{maxWidth:600}}>
    <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 6px'}}>🏆 Madaraja ya Malipo</h3>
    <p style={{fontSize:13,color:'#64748B',marginBottom:20}}>Kadri unavyosajili wateja wengi zaidi, ndivyo unavyopanda daraja na kupata malipo makubwa zaidi.</p>

    {/* Current Status */}
    <div style={{background:'linear-gradient(135deg,#0B7A3B,#065F2E)',borderRadius:16,padding:'20px 24px',marginBottom:20,color:'#fff',textAlign:'center'}}>
      <div style={{fontSize:40}}>{currentTier.emoji}</div>
      <div style={{fontSize:22,fontWeight:900,marginTop:4}}>{currentTier.name}</div>
      <div style={{fontSize:16,opacity:.9,marginTop:4}}>Wateja Active: <b>{active}</b></div>
      <div style={{fontSize:18,fontWeight:800,marginTop:6}}>Bonus: TZS {(currentTier.bonus||0).toLocaleString()}</div>
    </div>

    {/* All Tiers */}
    {tiers.map((t,i)=>{
      const isCurrent=t.name===currentTier.name;
      const isPast=active>=t.min;
      const isNext=!isPast&&tiers[i-1]&&active>=tiers[i-1]?.min;
      return <div key={t.name} style={{background:isCurrent?t.color+'15':'#fff',border:isCurrent?`2px solid ${t.color}`:'1.5px solid #E2E8F0',borderRadius:14,padding:'16px 20px',marginBottom:10,display:'flex',alignItems:'center',gap:14,position:'relative',overflow:'hidden'}}>
        {isCurrent&&<div style={{position:'absolute',top:0,right:0,background:t.color,color:'#fff',padding:'2px 12px',borderRadius:'0 0 0 10px',fontSize:10,fontWeight:700}}>SASA HAPA</div>}
        <span style={{fontSize:30,opacity:isPast?1:.4}}>{t.emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:16,color:isPast?t.color:'#94A3B8'}}>{t.name}</div>
          <div style={{fontSize:13,color:'#64748B'}}>Wateja {t.min}+ wanaolipa</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:800,fontSize:16,color:isPast?t.color:'#94A3B8'}}>TZS {(t.bonus||0).toLocaleString()}</div>
          {isPast&&!isCurrent&&<div style={{fontSize:11,color:'#22C55E'}}>✅ Umepita</div>}
          {isNext&&<div style={{fontSize:11,color:t.color,fontWeight:700}}>→ Wateja {t.min-active} zaidi</div>}
          {!isPast&&!isNext&&<div style={{fontSize:11,color:'#94A3B8'}}>🔒</div>}
        </div>
      </div>;
    })}

    <div style={{background:'#FFF7ED',borderRadius:12,padding:'12px 16px',marginTop:16,fontSize:12,color:'#92400E',lineHeight:1.6}}>
      <b>Vigezo:</b> Ni wateja wanaolipa tu (Active) wanaohesabika. Trial na expired hawahesabiwi. Malipo hulipwa tarehe 1-5 ya mwezi unaofuata kupitia M-Pesa au Benki.
    </div>
  </div>;
}
