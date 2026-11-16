import React,{useState,useMemo} from 'react';
import PhoneNameInput from '../../components/PhoneNameInput';
import {useApp} from '../../context/AppContext';
import {IC,Input,Btn,Stat,Modal,Badge,Empty} from '../../components/UI';
import {fmtMoney,fmtDate,exportToPDF} from '../../utils/helpers';

const fm=n=>fmtMoney(n);

// Siku zilizobaki kwa duka (active=token_expiry, trial=trial_end)
const daysLeft=(b)=>{const end=b.token_active?b.token_expiry:b.trial_end;if(!end)return 999;return Math.ceil((new Date(end)-new Date())/86400000);};

// ===== AGENT DASHBOARD =====
export function AgentDashboard({onNav}){
  const{user,businesses,AGENT_TIERS,settings}=useApp();
  const myCode=user?.promo_code;
  const myBiz=useMemo(()=>businesses.filter(b=>b.promo_code===myCode),[businesses,myCode]);
  const active=myBiz.filter(b=>b.token_active&&!b.is_suspended);
  const trial=myBiz.filter(b=>!b.token_active&&!b.is_suspended);
  const expired=myBiz.filter(b=>b.is_suspended||(!b.token_active&&b.trial_end&&new Date(b.trial_end)<new Date()));

  // Current tier
  const tiers=(AGENT_TIERS||[]).filter(t=>t.min>0).reverse();
  const currentTier=tiers.filter(t=>active.length>=t.min).pop()||{name:'Bado',emoji:'⏳',color:'#9AA5A0',bonus:0,min:0};
  const nextTier=tiers.find(t=>t.min>active.length);
  const toNext=nextTier?nextTier.min-active.length:0;
  const progress=nextTier?Math.min(100,Math.round(active.length/nextTier.min*100)):100;
  const price=parseInt(settings.system_price||15000);
  // NB: haya ni MAKADIRIO — wateja wanaolipa × bei × asilimia yako.
  const revenue=active.length*price;
  const commission=revenue*(user?.commission_rate||10)/100;
  const hour=new Date().getHours();
  const greet=hour<12?'Habari za asubuhi':hour<16?'Habari za mchana':hour<19?'Habari za jioni':'Habari za usiku';
  const QA=[{p:'register',i:'➕',l:'Sajili'},{p:'mycustomers',i:'🏪',l:'Wateja'},{p:'visits',i:'📋',l:'Ufuatiliaji'},{p:'tiers',i:'🏆',l:'Madaraja'}];

  return <div className="page-enter">
    <h3 style={{fontSize:20,fontWeight:900,margin:'0 0 4px',color:'#0A6E47'}}>🤝 WAKALA — Dashboard</h3>
    <p style={{fontSize:12,color:'#5C6A62',margin:'0 0 16px'}}>{greet}, {user?.name} • {new Date().toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long'})}</p>

    {/* Hero — daraja na maendeleo */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'22px',marginBottom:14,color:'#fff',boxShadow:'0 14px 34px rgba(10,110,71,.28)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',right:-30,top:-30,width:150,height:150,borderRadius:'50%',background:'rgba(242,183,5,.12)'}}/>
      <div style={{position:'relative'}}>
        <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>WATEJA WANAOLIPA</div>
        <div style={{display:'flex',alignItems:'center',gap:10,margin:'2px 0 6px'}}>
          <span style={{fontSize:38,fontWeight:900,letterSpacing:'-1.5px',lineHeight:1.1}}>{active.length}</span>
          <span style={{fontSize:30}}>{currentTier.emoji}</span>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>{currentTier.name}</div>
            {toNext>0&&<div style={{fontSize:11,opacity:.85}}>Wateja {toNext} zaidi kwa {nextTier?.emoji} {nextTier?.name}</div>}
            {toNext<=0&&currentTier.name==='Shujaa'&&<div style={{fontSize:11}}>🏆 Daraja la Juu!</div>}
          </div>
        </div>
        {nextTier&&<div style={{marginTop:10}}>
          <div style={{height:8,background:'rgba(255,255,255,0.2)',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${progress}%`,background:'#86EFAC',borderRadius:4,transition:'width .8s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10.5,opacity:.8,marginTop:4}}><span>{active.length} active</span><span>{nextTier.min} kwa {nextTier.name}</span></div>
        </div>}
        <div style={{display:'flex',gap:10,marginTop:16,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.18)'}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>WATEJA WOTE</div><div style={{fontSize:15.5,fontWeight:800}}>{myBiz.length}</div></div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>TRIAL</div><div style={{fontSize:15.5,fontWeight:800,color:'#FDE68A'}}>{trial.length}</div></div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>KAMISHENI*</div><div style={{fontSize:15.5,fontWeight:800,whiteSpace:'nowrap'}}>{(commission||0).toLocaleString()}</div></div>
        </div>
        <div style={{fontSize:9.5,opacity:.7,marginTop:6}}>*makadirio: wateja wanaolipa × bei × {user?.commission_rate||10}%</div>
      </div>
    </div>

    {/* Vitendo vya haraka */}
    <div className="stagger" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
      {QA.map(a=><button key={a.p} className="qbtn ripple" onClick={()=>onNav?.(a.p)} style={{background:'#fff',border:'1px solid #D6E2DB',borderRadius:16,padding:'13px 4px',textAlign:'center',cursor:'pointer'}}>
        <div style={{fontSize:21}}>{a.i}</div>
        <div style={{fontSize:10.5,fontWeight:700,color:'#17231D',marginTop:3}}>{a.l}</div>
      </button>)}
    </div>

    {/* ===== WATEJA WANAOHITAJI MSAADA ===== */}
    {(()=>{
      const expiringSoon=myBiz.filter(b=>b.token_active&&!b.is_suspended&&daysLeft(b)<=5&&daysLeft(b)>=0);
      const notStarted=trial.filter(b=>{const age=Math.ceil((new Date()-new Date(b.created_at))/86400000);return age>=2;});
      const needHelp=[...expiringSoon.map(b=>({...b,reason:'expiring',dl:daysLeft(b)})),...notStarted.map(b=>({...b,reason:'idle'}))];
      if(!needHelp.length)return null;
      const reminderMsg=(b)=>{
        if(b.reason==='expiring')return `Habari ${b.name}! Muda wa DukaLangu unakaribia kuisha (siku ${b.dl}). Tafadhali lipia ili uendelee kutumia mfumo bila kukatizwa. Nipo kukusaidia. Asante!`;
        return `Habari ${b.name}! Umejisajili DukaLangu lakini bado hujaanza kutumia. Nipo kukusaidia kuanza — ni rahisi sana! Nijulishe uko tayari lini.`;
      };
      return <div style={{background:'#fff',borderRadius:16,marginBottom:16,overflow:'hidden',border:'1px solid #F2D98B',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{background:'linear-gradient(135deg,#EA580C,#C2410C)',padding:'13px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{fontSize:14,fontWeight:800,margin:0,color:'#fff'}}>🔔 Wateja Wanaohitaji Msaada</h3>
          <span style={{fontSize:11,color:'#FDF0CC',fontWeight:600}}>{needHelp.length}</span>
        </div>
        <div style={{padding:12,display:'flex',flexDirection:'column',gap:8}}>
          {needHelp.slice(0,10).map(b=>(
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:10,background:b.reason==='expiring'?'#FFF8E6':'#FEFCE8'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:'#17231D',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.name}</div>
                <div style={{fontSize:11,color:b.reason==='expiring'?'#C2410C':'#A16207',fontWeight:600}}>
                  {b.reason==='expiring'?`⏳ Inaisha siku ${b.dl}`:'💤 Hajaanza kutumia'}
                </div>
              </div>
              {b.phone&&<a href={`https://wa.me/${b.phone.replace(/\D/g,'')}?text=${encodeURIComponent(reminderMsg(b))}`} target="_blank" rel="noreferrer" style={{padding:'7px 12px',borderRadius:8,background:'#0A6E47',color:'#fff',fontWeight:700,fontSize:12,textDecoration:'none',flexShrink:0}}>💬 Kumbusha</a>}
            </div>
          ))}
        </div>
      </div>;
    })()}

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      {/* Promo Code */}
      <div className="card" style={{textAlign:'center'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🔗 Promo Code Yako</h3>
        <div style={{fontSize:28,fontWeight:900,fontFamily:'monospace',color:'#8B5CF6',background:'#F5F3FF',borderRadius:12,padding:14,marginBottom:10}}>{myCode||'—'}</div>
        <div style={{fontSize:12,color:'#5C6A62',marginBottom:8}}>Mteja akisajili na code hii, unapata credit</div>
        <div style={{background:'#F6F8F7',borderRadius:8,padding:'8px 10px',fontSize:11,marginBottom:8}}>
          🔗 <code>duka-langu-system.vercel.app</code>
        </div>
        <button onClick={()=>{navigator.clipboard.writeText(`https://duka-langu-system.vercel.app`);alert('Link imecopy! Mtumie mteja akisajili atumie promo code: '+myCode)}} style={{width:'100%',padding:'10px',background:'#0A6E47',color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>📋 Copy Link</button>
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
          <div style={{background:'#F6F8F7',borderRadius:8,padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#9AA5A0'}}>Commission Rate</div>
            <div style={{fontWeight:800,fontSize:18,color:'#8B5CF6'}}>{user?.commission_rate||10}%</div>
          </div>
          <div style={{background:'#F6F8F7',borderRadius:8,padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'#9AA5A0'}}>Thamani (makadirio)</div>
            <div style={{fontWeight:800,fontSize:16,color:'#0A6E47'}}>{fm(revenue)}</div>
          </div>
        </div>
      </div>

      {/* Recent Customers */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 12px'}}>🕐 Wateja wa Hivi Karibuni</h3>
        {myBiz.slice(0,5).map(b=>(
          <div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F6F8F7',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:600,fontSize:12}}>{b.name}</div>
              <div style={{fontSize:11,color:'#9AA5A0'}}>{fmtDate(b.created_at)}</div>
            </div>
            <Badge color={b.token_active?'#0A6E47':b.is_suspended?'#C2412D':'#F2B705'}>{b.token_active?'Active':'Trial'}</Badge>
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

    {result&&<div style={{background:'#E6F2EC',border:'1px solid #C2DED1',borderRadius:14,padding:20,marginBottom:20,textAlign:'center'}}>
      <div style={{fontSize:36,marginBottom:8}}>🎉</div>
      <div style={{fontSize:18,fontWeight:800,color:'#0A6E47',marginBottom:6}}>Mteja Amesajiliwa!</div>
      <div style={{background:'#fff',borderRadius:10,padding:14,textAlign:'left',fontSize:13,lineHeight:1.8}}>
        <div><b>Biashara:</b> {result.bizName}</div>
        <div><b>Email:</b> {result.email}</div>
        <div><b>Password:</b> <code style={{background:'#D6E2DB',padding:'2px 8px',borderRadius:4,fontWeight:700}}>{result.password}</code></div>
        <div><b>Promo Code:</b> {user?.promo_code}</div>
      </div>
      <div style={{fontSize:12,color:'#5C6A62',marginTop:10}}>Mtumie mteja taarifa hizi aingie kwenye mfumo</div>
      <div style={{display:'flex',gap:8,marginTop:12,justifyContent:'center'}}>
        <button onClick={()=>{
          const msg=`Habari! Umesajiliwa kwenye Duka Langu - Smart POS.%0A%0AIngia hapa: https://duka-langu-system.vercel.app%0AEmail: ${result.email}%0APassword: ${result.password}%0A%0AUtapata siku 5 za bure!`;
          window.open(`https://wa.me/${f.phone?.replace(/\D/g,'')||''}?text=${msg}`,'_blank');
        }} style={{padding:'8px 16px',background:'#0A6E47',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>📱 Tuma WhatsApp</button>
        <button onClick={()=>setResult(null)} style={{padding:'8px 16px',background:'#F6F8F7',color:'#475569',border:'none',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer'}}>+ Sajili Mwingine</button>
      </div>
    </div>}

    {!result&&<div className="card">
      <div style={{background:'#EFF6FF',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#1E40AF'}}>
        Mteja atasajiliwa na promo code yako: <b>{user?.promo_code}</b>. Utapata commission kwa kila mteja anayeelipa.
      </div>
      <Input label="Jina la Biashara *" value={f.bizName} onChange={e=>setF({...f,bizName:e.target.value})} placeholder="Mf: Duka la Mama Fatuma"/>
      <PhoneNameInput label="Simu / WhatsApp" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} currentName={f.name} onName={n=>setF(p=>({...p,name:n}))}/>
      <Input label="Jina la Mmiliki" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Mf: Fatuma Hassan"/>
      <Input label="Email *" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="email@mfano.com"/>
      <button onClick={handleRegister} disabled={loading} style={{width:'100%',padding:14,background:loading?'#86EFAC':'#0A6E47',color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,cursor:loading?'not-allowed':'pointer',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
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

  return <div className="page-enter">
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.store} label="Jumla" value={all.length} color="#0A6E47"/>
      <Stat icon={IC.ok} label="Wanaolipa" value={activeCount} color="#0A6E47"/>
      <Stat icon={IC.clock} label="Trial" value={trialCount} color="#F2B705"/>
    </div>

    {/* Search + Filter */}
    <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
      <div style={{position:'relative',flex:'1 1 200px',maxWidth:300}}>
        <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9AA5A0'}}>{IC.find}</span>
        <input placeholder="Tafuta kwa jina, email, simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 10px 10px 36px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
      </div>
      {[{v:'all',l:`Wote (${all.length})`},{v:'active',l:`Wanaolipa (${activeCount})`},{v:'trial',l:`Trial (${trialCount})`},{v:'expired',l:'Wameisha'}].map(f=>
        <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:'8px 14px',borderRadius:8,border:filter===f.v?'2px solid #0A6E47':'1px solid #D6E2DB',background:filter===f.v?'#E6F2EC':'#fff',fontWeight:filter===f.v?700:500,fontSize:12,cursor:'pointer',color:filter===f.v?'#0A6E47':'#5C6A62'}}>{f.l}</button>
      )}
    </div>

    {/* Customer Cards */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12}}>
      {myBiz.map(b=>{const dl=getDaysLeft(b);
        return <div key={b.id} className="card" style={{border:b.token_active?'1px solid #C2DED1':b.is_suspended?'1px solid #F0D9D4':'1px solid #F2D98B'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{b.name}</div>
              <div style={{fontSize:12,color:'#5C6A62'}}>{b.email}</div>
            </div>
            <Badge color={b.token_active?'#0A6E47':b.is_suspended?'#C2412D':'#F2B705'}>{b.token_active?'ACTIVE':b.is_suspended?'EXPIRED':'TRIAL'}</Badge>
          </div>

          {/* Contact Info */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div style={{background:'#F6F8F7',borderRadius:8,padding:'6px 10px'}}>
              <div style={{fontSize:10,color:'#9AA5A0'}}>Simu</div>
              <div style={{fontWeight:600,fontSize:13}}>{b.phone||'—'}</div>
            </div>
            <div style={{background:'#F6F8F7',borderRadius:8,padding:'6px 10px'}}>
              <div style={{fontSize:10,color:'#9AA5A0'}}>Siku</div>
              <div style={{fontWeight:700,fontSize:14,color:dl<=3?'#C2412D':dl<=7?'#F2B705':'#0A6E47'}}>{dl} zimebaki</div>
            </div>
          </div>

          <div style={{fontSize:11,color:'#9AA5A0',marginBottom:8}}>
            📅 Alisajili: {fmtDate(b.created_at)} • Plan: <b>{(b.plan||'trial').toUpperCase()}</b>
          </div>

          {/* Actions */}
          <div style={{display:'flex',gap:6}}>
            {b.phone&&<a href={`https://wa.me/${b.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid #C2DED1',background:'#E6F2EC',color:'#15803D',fontWeight:600,fontSize:12,textDecoration:'none',textAlign:'center'}}>💬 WhatsApp</a>}
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
  const currentTier=tiers.filter(t=>active>=t.min).pop()||{name:'Bado',emoji:'⏳',color:'#9AA5A0',bonus:0,min:0};

  return <div style={{maxWidth:600}}>
    <h3 style={{fontSize:16,fontWeight:700,margin:'0 0 6px'}}>🏆 Madaraja ya Malipo</h3>
    <p style={{fontSize:13,color:'#5C6A62',marginBottom:20}}>Kadri unavyosajili wateja wengi zaidi, ndivyo unavyopanda daraja na kupata malipo makubwa zaidi.</p>

    {/* Current Status */}
    <div style={{background:'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:16,padding:'20px 24px',marginBottom:20,color:'#fff',textAlign:'center'}}>
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
      return <div key={t.name} style={{background:isCurrent?t.color+'15':'#fff',border:isCurrent?`2px solid ${t.color}`:'1.5px solid #D6E2DB',borderRadius:14,padding:'16px 20px',marginBottom:10,display:'flex',alignItems:'center',gap:14,position:'relative',overflow:'hidden'}}>
        {isCurrent&&<div style={{position:'absolute',top:0,right:0,background:t.color,color:'#fff',padding:'2px 12px',borderRadius:'0 0 0 10px',fontSize:10,fontWeight:700}}>SASA HAPA</div>}
        <span style={{fontSize:30,opacity:isPast?1:.4}}>{t.emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:16,color:isPast?t.color:'#9AA5A0'}}>{t.name}</div>
          <div style={{fontSize:13,color:'#5C6A62'}}>Wateja {t.min}+ wanaolipa</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:800,fontSize:16,color:isPast?t.color:'#9AA5A0'}}>TZS {(t.bonus||0).toLocaleString()}</div>
          {isPast&&!isCurrent&&<div style={{fontSize:11,color:'#0A6E47'}}>✅ Umepita</div>}
          {isNext&&<div style={{fontSize:11,color:t.color,fontWeight:700}}>→ Wateja {t.min-active} zaidi</div>}
          {!isPast&&!isNext&&<div style={{fontSize:11,color:'#9AA5A0'}}>🔒</div>}
        </div>
      </div>;
    })}

    <div style={{background:'#FFF8E6',borderRadius:12,padding:'12px 16px',marginTop:16,fontSize:12,color:'#92400E',lineHeight:1.6}}>
      <b>Vigezo:</b> Ni wateja wanaolipa tu (Active) wanaohesabika. Trial na expired hawahesabiwi. Malipo hulipwa tarehe 1-5 ya mwezi unaofuata kupitia M-Pesa au Benki.
    </div>
  </div>;
}

// ===== ZANA & RIPOTI YA WAKALA =====
export function AgentToolsPage(){
  const{user,businesses,settings}=useApp();
  const myCode=user?.promo_code;
  const myBiz=useMemo(()=>businesses.filter(b=>b.promo_code===myCode),[businesses,myCode]);
  const active=myBiz.filter(b=>b.token_active&&!b.is_suspended);
  const trial=myBiz.filter(b=>!b.token_active&&!b.is_suspended);
  const expired=myBiz.filter(b=>b.is_suspended);
  const price=parseInt(settings?.system_price||15000);
  const commission=active.length*price*(user?.commission_rate||10)/100;

  // Pakua ripoti kamili ya PDF
  const downloadReport=()=>{
    const rows=myBiz
      .slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
      .map((b,i)=>[
        i+1,
        b.name||'—',
        b.phone||'—',
        b.token_active?'Analipa':b.is_suspended?'Imeisha':'Trial',
        (b.plan||'trial').toUpperCase(),
        fmtDate(b.created_at),
      ]);
    rows.push(['','','','','','']);
    rows.push(['','JUMLA YA WATEJA',String(myBiz.length),`Analipa: ${active.length}`,`Trial: ${trial.length}`,`Imeisha: ${expired.length}`]);
    exportToPDF(
      `Ripoti ya Wakala — ${user?.name||''} (Code: ${myCode||'—'})`,
      ['#','Biashara','Simu','Hali','Plan','Alisajili'],
      rows,
      `ripoti-wakala-${Date.now()}.pdf`
    );
  };

  const steps=[
    {icon:'1️⃣',t:'Msaidie kujisajili',d:'Mfungulie akaunti kwa kutumia ukurasa wa "Sajili Mteja", kisha mpe email na password zake. Mhakikishie anaweza kuingia.'},
    {icon:'2️⃣',t:'Mwonyeshe kuweka bidhaa',d:'Msaidie kuongeza bidhaa zake za kwanza (jina, bei ya kununua, bei ya kuuza). Hii ndiyo msingi wa mfumo.'},
    {icon:'3️⃣',t:'Mfundishe kuuza',d:'Mwonyeshe jinsi ya kufanya mauzo — kuchagua bidhaa, kupokea pesa, na kutoa risiti. Mfanye jaribio moja pamoja naye.'},
    {icon:'4️⃣',t:'Mwonyeshe ripoti',d:'Mwambie aangalie ripoti zake za kila siku — mauzo, faida, na pesa mkononi. Hii humfanya aone thamani ya mfumo.'},
    {icon:'5️⃣',t:'Fuatilia na kumbusha',d:'Rudi kumuangalia baada ya siku chache. Ukiona muda unakaribia kuisha, mkumbushe mapema kulipia.'},
  ];

  return <div style={{paddingBottom:20}}>
    <h2 style={{fontSize:20,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>🧰 Zana & Ripoti</h2>
    <p style={{fontSize:12.5,color:'#5C6A62',margin:'0 0 16px'}}>Pakua ripoti ya wateja wako na jifunze jinsi ya kuwasaidia</p>

    {/* Muhtasari + Pakua PDF */}
    <div style={{background:'linear-gradient(135deg,#0A6E47,#06502F)',borderRadius:18,padding:'20px 22px',marginBottom:16,color:'#fff'}}>
      <div style={{fontSize:11,fontWeight:700,opacity:0.8,letterSpacing:1,marginBottom:10}}>📊 MUHTASARI WAKO</div>
      <div style={{display:'flex',gap:18,flexWrap:'wrap',marginBottom:16}}>
        <div><div style={{fontSize:10.5,opacity:0.8}}>Wateja Jumla</div><div style={{fontSize:22,fontWeight:900}}>{myBiz.length}</div></div>
        <div><div style={{fontSize:10.5,opacity:0.8}}>Wanaolipa</div><div style={{fontSize:22,fontWeight:900}}>{active.length}</div></div>
        <div><div style={{fontSize:10.5,opacity:0.8}}>Trial</div><div style={{fontSize:22,fontWeight:900}}>{trial.length}</div></div>
        <div><div style={{fontSize:10.5,opacity:0.8}}>Kamisheni</div><div style={{fontSize:22,fontWeight:900}}>{fm(commission)}</div></div>
      </div>
      <button onClick={downloadReport} style={{width:'100%',padding:13,background:'#fff',color:'#0A6E47',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>📄 Pakua Ripoti Kamili (PDF)</button>
    </div>

    {/* Mafunzo */}
    <div style={{background:'#fff',borderRadius:16,padding:18,border:'1px solid #ECFDF5',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
      <h3 style={{fontSize:15,fontWeight:800,color:'#0A6E47',margin:'0 0 4px'}}>📚 Jinsi ya Kumsaidia Mteja Afanikiwe</h3>
      <p style={{fontSize:12,color:'#5C6A62',margin:'0 0 16px'}}>Mteja akifanikiwa kutumia mfumo, anaendelea kulipa — na wewe unapata kamisheni endelevu.</p>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {steps.map((s,i)=>(
          <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{fontSize:22,flexShrink:0}}>{s.icon}</div>
            <div>
              <div style={{fontWeight:800,fontSize:13.5,color:'#17231D',marginBottom:2}}>{s.t}</div>
              <div style={{fontSize:12.5,color:'#5C6A62',lineHeight:1.5}}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>;
}

// =====================================================
// AGENT VISITS PAGE - Ufuatiliaji wa Wateja
// Supevaiza anajaza taarifa za wateja waliotembelea
// Taarifa zinaenda kama tiketi kwa Admin
// =====================================================
export function SupervisorVisitsPage(){
  const{user,businesses,supabase}=useApp();
  const myCode=user?.promo_code;
  // Supevaiza anaona wateja WOTE wanaotumia mfumo (sio wake tu)
  const myCustomers=useMemo(()=>[...businesses].sort((a,b)=>(a.name||'').localeCompare(b.name||'')),[businesses]);
  
  const[visits,setVisits]=useState([]);
  const[loading,setLoading]=useState(true);
  const[custSearch,setCustSearch]=useState('');
  const[showCustList,setShowCustList]=useState(false);
  const[showForm,setShowForm]=useState(false);
  const[viewing,setViewing]=useState(null);
  const[period,setPeriod]=useState('all');
  
  const today=new Date().toISOString().slice(0,10);
  const filteredCusts=useMemo(()=>{
    if(!custSearch.trim())return myCustomers.slice(0,30);
    const q=custSearch.toLowerCase();
    return myCustomers.filter(c=>
      (c.name||'').toLowerCase().includes(q)||
      (c.owner_name||'').toLowerCase().includes(q)||
      (c.phone||'').includes(q)||
      (c.location||'').toLowerCase().includes(q)||
      (c.region||'').toLowerCase().includes(q)
    ).slice(0,30);
  },[myCustomers,custSearch]);
  const initialForm={
    customer_name:'',
    customer_phone:'',
    customer_business:'',
    customer_location:'',
    business_id:'',
    visit_date:today,
    visit_purpose:'',
    visit_type:'follow_up',
    customer_satisfaction:'happy',
    is_using_system:'yes',
    has_issues:false,
    issues_description:'',
    issue_category:'',
    urgency:'normal',
    customer_needs:'',
    feedback:'',
    recommendations:'',
    next_visit_date:'',
    notes:'',
  };
  const[form,setForm]=useState(initialForm);
  
  // Load visits
  React.useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const{data}=await supabase.from('customer_visits')
          .select('*')
          .eq('agent_id',user.id)
          .order('created_at',{ascending:false})
          .limit(100);
        setVisits(data||[]);
      }catch(e){console.warn('Load visits:',e)}
      setLoading(false);
    })();
  },[user?.id]);
  
  // Filtered visits
  const filteredVisits=visits.filter(v=>{
    if(period==='all')return true;
    const d=new Date(v.created_at);
    const now=new Date();
    if(period==='today')return d.toDateString()===now.toDateString();
    if(period==='week'){const w=new Date(now);w.setDate(now.getDate()-7);return d>=w}
    if(period==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  });
  
  // Stats
  const totalVisits=visits.length;
  const newVisits=visits.filter(v=>v.status==='new').length;
  const inProgressVisits=visits.filter(v=>v.status==='in_progress').length;
  const resolvedVisits=visits.filter(v=>v.status==='resolved').length;
  const withIssues=visits.filter(v=>v.has_issues).length;
  
  // When customer selected from dropdown, autofill
  const onCustomerSelect=(bizId)=>{
    if(!bizId){setForm({...form,business_id:'',customer_business:''});return}
    const biz=myCustomers.find(b=>b.id===bizId);
    if(biz){
      setForm({
        ...form,
        business_id:biz.id,
        customer_name:biz.owner_name||biz.name,
        customer_phone:biz.phone||'',
        customer_business:biz.name,
        customer_location:biz.location||biz.region||'',
      });
    }
  };
  
  const submitVisit=async()=>{
    if(!form.customer_name.trim())return alert('Weka jina la mteja!');
    if(!form.visit_purpose.trim())return alert('Eleza lengo la ziara!');
    if(form.has_issues&&!form.issues_description.trim())return alert('Eleza changamoto za mteja!');
    
    try{
      const payload={
        ...form,
        agent_id:user.id,
        agent_name:user.name||user.email,
        agent_phone:user.phone||'',
        status:'new',
      };
      
      const{data,error}=await supabase.from('customer_visits').insert(payload).select().single();
      if(error)throw error;
      
      // Tuma notification kwa admin
      try{
        await supabase.from('notifications').insert({
          target_type:'admin',
          type:form.has_issues?'warning':'info',
          title:`📋 Ufuatiliaji Mpya - ${form.customer_name}`,
          message:`Supevaiza ${user.name||user.email} ametembelea ${form.customer_name}${form.customer_business?' ('+form.customer_business+')':''}. ${form.has_issues?'⚠️ Ana changamoto - inahitaji utekelezaji!':'✅ Ziara imekamilika vizuri.'}`,
        });
      }catch(e){console.warn('Notification failed:',e)}
      
      setVisits([data,...visits]);
      setShowForm(false);
      setForm(initialForm);
      
      alert(`✅ TAARIFA IMETUMWA!\n\n📋 Tiketi imefunguliwa kwa Admin\n👤 Mteja: ${form.customer_name}\n${form.has_issues?'⚠️ Changamoto zimerekodi kwa utekelezaji':'✅ Ziara nzuri imerekodi'}\n\nAdmin atapata taarifa hii moja kwa moja.`);
    }catch(e){
      alert('❌ Tatizo la kuhifadhi: '+e.message);
    }
  };
  
  const getSatLabel=(s)=>({
    very_happy:'😊 Furaha Sana',
    happy:'🙂 Furaha',
    neutral:'😐 Wastani',
    unhappy:'😕 Hairidhiki',
    very_unhappy:'😡 Hairidhiki Kabisa',
  }[s]||s);
  
  const getStatusColor=(s)=>({
    new:'#F2B705',
    in_progress:'#3B82F6',
    resolved:'#0A6E47',
    closed:'#9AA5A0',
  }[s]||'#5C6A62');
  
  const getStatusLabel=(s)=>({
    new:'🆕 Mpya',
    in_progress:'🔄 Inashughulikiwa',
    resolved:'✅ Imetatuliwa',
    closed:'🔒 Imefungwa',
  }[s]||s);
  
  const getUrgencyColor=(u)=>({
    low:'#9AA5A0',
    normal:'#3B82F6',
    high:'#F2B705',
    critical:'#DC2626',
  }[u]||'#5C6A62');
  
  return <div className="page-enter">
    {/* Header */}
    <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'start',flexWrap:'wrap',gap:10}}>
      <div>
        <h2 style={{fontSize:22,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>📋 Ufuatiliaji wa Wateja</h2>
        <p style={{fontSize:12,color:'#5C6A62',margin:0}}>Jaza taarifa za wateja uliowatembelea — zinaenda kwa Admin moja kwa moja</p>
      </div>
      <button onClick={()=>{setForm(initialForm);setShowForm(true)}} style={{
        padding:'12px 20px',
        background:'linear-gradient(140deg,#06502F,#0A6E47)',
        color:'#fff',border:'none',borderRadius:12,
        fontWeight:800,fontSize:13,cursor:'pointer',
        boxShadow:'0 4px 15px rgba(11,122,59,0.3)',
        display:'flex',alignItems:'center',gap:6,
      }}>
        <span style={{fontSize:18}}>+</span> Ziara Mpya
      </button>
    </div>
    
    {/* Stats */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:16}}>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #0A6E47',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:10,color:'#15803D',fontWeight:700,letterSpacing:0.5}}>JUMLA YA ZIARA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#0A6E47',marginTop:4}}>{totalVisits}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #F2B705',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:10,color:'#B45309',fontWeight:700,letterSpacing:0.5}}>MPYA (HAZIJASHUGULIKIWA)</div>
        <div style={{fontSize:24,fontWeight:900,color:'#F2B705',marginTop:4}}>{newVisits}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #3B82F6',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:10,color:'#1D4ED8',fontWeight:700,letterSpacing:0.5}}>ZINAFANYIWA KAZI</div>
        <div style={{fontSize:24,fontWeight:900,color:'#3B82F6',marginTop:4}}>{inProgressVisits}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #0A6E47',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:10,color:'#15803D',fontWeight:700,letterSpacing:0.5}}>ZIMETATULIWA</div>
        <div style={{fontSize:24,fontWeight:900,color:'#0A6E47',marginTop:4}}>{resolvedVisits}</div>
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:14,borderLeft:'4px solid #DC2626',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{fontSize:10,color:'#991B1B',fontWeight:700,letterSpacing:0.5}}>ZENYE CHANGAMOTO</div>
        <div style={{fontSize:24,fontWeight:900,color:'#DC2626',marginTop:4}}>{withIssues}</div>
      </div>
    </div>
    
    {/* Period filter */}
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {[{id:'all',label:'🗓️ Vyote'},{id:'today',label:'📅 Leo'},{id:'week',label:'🗓️ Wiki'},{id:'month',label:'📆 Mwezi'}].map(p=>
        <button key={p.id} onClick={()=>setPeriod(p.id)} style={{
          padding:'8px 14px',borderRadius:10,
          border:period===p.id?'2px solid #0A6E47':'1.5px solid #D6E2DB',
          background:period===p.id?'#0A6E47':'#fff',
          fontWeight:700,fontSize:12,cursor:'pointer',
          color:period===p.id?'#fff':'#475569',
        }}>{p.label}</button>
      )}
    </div>
    
    {/* Visits list */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:800,color:'#0A6E47',margin:'0 0 14px'}}>📋 Orodha ya Ziara ({filteredVisits.length})</h3>
      
      {loading?<div style={{textAlign:'center',padding:40,color:'#9AA5A0'}}>
        <div style={{fontSize:30,marginBottom:8}}>⏳</div>
        <div>Inaleta ziara...</div>
      </div>:filteredVisits.length>0?<div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filteredVisits.map(v=><div key={v.id} onClick={()=>setViewing(v)} style={{
          padding:'14px 16px',
          background:'#fff',
          border:'1.5px solid #D6E2DB',
          borderLeft:`4px solid ${getStatusColor(v.status)}`,
          borderRadius:10,
          cursor:'pointer',
          transition:'all 0.2s',
        }} onMouseOver={e=>e.currentTarget.style.background='#F6F8F7'}
            onMouseOut={e=>e.currentTarget.style.background='#fff'}>
          
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:10,marginBottom:8,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:14,color:'#17231D'}}>
                👤 {v.customer_name}
              </div>
              {v.customer_business&&<div style={{fontSize:12,color:'#5C6A62',marginTop:2}}>
                🏪 {v.customer_business}
              </div>}
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              <span style={{padding:'3px 10px',borderRadius:6,background:`${getStatusColor(v.status)}15`,color:getStatusColor(v.status),fontSize:10,fontWeight:800}}>{getStatusLabel(v.status)}</span>
              {v.has_issues&&<span style={{padding:'3px 10px',borderRadius:6,background:`${getUrgencyColor(v.urgency)}15`,color:getUrgencyColor(v.urgency),fontSize:10,fontWeight:800}}>⚠️ {v.urgency==='critical'?'DHARURA':v.urgency==='high'?'KUBWA':v.urgency==='normal'?'WASTANI':'NDOGO'}</span>}
            </div>
          </div>
          
          <div style={{fontSize:11,color:'#5C6A62',marginBottom:6,display:'flex',gap:10,flexWrap:'wrap'}}>
            <span>📅 {new Date(v.visit_date||v.created_at).toLocaleDateString('sw-TZ')}</span>
            {v.customer_phone&&<span>📞 {v.customer_phone}</span>}
            {v.customer_location&&<span>📍 {v.customer_location}</span>}
          </div>
          
          {v.visit_purpose&&<div style={{fontSize:12,color:'#475569',padding:'8px 10px',background:'#F6F8F7',borderRadius:6}}>
            <b>Lengo:</b> {v.visit_purpose.slice(0,100)}{v.visit_purpose.length>100?'...':''}
          </div>}
        </div>)}
      </div>:<div style={{textAlign:'center',padding:40,color:'#9AA5A0'}}>
        <div style={{fontSize:50,marginBottom:10}}>📋</div>
        <div style={{fontWeight:700,color:'#5C6A62'}}>Hakuna ziara bado</div>
        <div style={{fontSize:12,marginTop:4}}>Bonyeza "+ Ziara Mpya" kuanza</div>
      </div>}
    </div>
    
    {/* VISIT FORM MODAL */}
    {showForm&&<Modal open={true} onClose={()=>setShowForm(false)} title="📋 Jaza Taarifa za Ziara">
      <div style={{maxHeight:'72vh',overflowY:'auto',paddingRight:8}}>
        
        {/* Searchable customer picker */}
        <div style={{background:'#E6F2EC',padding:'10px 12px',borderRadius:10,marginBottom:12,border:'1.5px solid #C2DED1',position:'relative'}}>
          <label style={{fontSize:11,fontWeight:700,color:'#0A6E47',display:'block',marginBottom:2}}>🔍 Tafuta &amp; Chagua Mteja</label>
          <div style={{fontSize:10,color:'#15803D',marginBottom:6}}>Andika jina, simu au mahali — taarifa zake zitajaza moja kwa moja</div>
          {/* Selected badge */}
          {form.business_id&&<div style={{background:'#D6EADF',border:'1.5px solid #16A34A',borderRadius:8,padding:'6px 10px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:12,fontWeight:700,color:'#15803D'}}>✅ {form.customer_business||form.customer_name}</span>
            <button onClick={()=>{onCustomerSelect('');setCustSearch('');setShowCustList(false)}} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer',fontSize:14,fontWeight:700,padding:'0 2px'}}>✕</button>
          </div>}
          <input
            type="text"
            value={custSearch}
            onChange={e=>{setCustSearch(e.target.value);setShowCustList(true)}}
            onFocus={()=>setShowCustList(true)}
            placeholder={form.business_id?'Badilisha mteja...':'Andika jina, simu, au mahali...'}
            style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #C2DED1',fontSize:13,background:'#fff',boxSizing:'border-box',outline:'none'}}
          />
          {showCustList&&<div style={{position:'absolute',left:12,right:12,background:'#fff',border:'1.5px solid #C2DED1',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',zIndex:999,maxHeight:220,overflowY:'auto',marginTop:4}}>
            {filteredCusts.length===0?<div style={{padding:'12px',textAlign:'center',color:'#9AA5A0',fontSize:12}}>Hakuna mteja anayepatikana</div>:
            filteredCusts.map(c=><div key={c.id} onMouseDown={()=>{onCustomerSelect(c.id);setCustSearch('');setShowCustList(false)}} style={{padding:'9px 12px',cursor:'pointer',borderBottom:'1px solid #E6F2EC',display:'flex',flexDirection:'column',gap:2}} onMouseEnter={e=>e.currentTarget.style.background='#E6F2EC'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <span style={{fontSize:13,fontWeight:700,color:'#17231D'}}>{c.name}</span>
              <span style={{fontSize:11,color:'#5C6A62'}}>{[c.owner_name,c.phone,c.location||c.region].filter(Boolean).join(' · ')}</span>
            </div>)}
            {!custSearch&&myCustomers.length>30&&<div style={{padding:'8px',textAlign:'center',fontSize:10,color:'#9AA5A0'}}>Andika kuzidi {myCustomers.length-30} zaidi...</div>}
          </div>}
          <div style={{fontSize:10,color:'#9AA5A0',marginTop:4}}>Wateja {myCustomers.length} kwenye mfumo</div>
        </div>
        
        {/* Customer info */}
        <h4 style={{fontSize:13,fontWeight:800,color:'#0A6E47',margin:'0 0 8px'}}>👤 Taarifa za Mteja</h4>
        <Input label="Jina la Mteja *" value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} placeholder="Mfano: Mama Grace"/>
        <Input label="Jina la Biashara" value={form.customer_business} onChange={e=>setForm({...form,customer_business:e.target.value})} placeholder="Mfano: Duka la Sukari"/>
        <Input label="Simu" value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})} placeholder="0712345678"/>
        <Input label="Mahali (Mkoa/Wilaya)" value={form.customer_location} onChange={e=>setForm({...form,customer_location:e.target.value})} placeholder="Mfano: Mbeya, Kawetere"/>
        
        {/* Visit details */}
        <h4 style={{fontSize:13,fontWeight:800,color:'#0A6E47',margin:'14px 0 8px'}}>📅 Taarifa za Ziara</h4>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Tarehe ya Ziara</label>
            <input type="date" value={form.visit_date} onChange={e=>setForm({...form,visit_date:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box'}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Aina ya Ziara</label>
            <select value={form.visit_type} onChange={e=>setForm({...form,visit_type:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box',background:'#fff'}}>
              <option value="follow_up">🔄 Ufuatiliaji</option>
              <option value="training">🎓 Mafunzo</option>
              <option value="support">🛟 Msaada</option>
              <option value="complaint">😡 Lalama</option>
              <option value="sales">💰 Kuuza</option>
              <option value="other">📌 Nyingine</option>
            </select>
          </div>
        </div>
        
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Lengo la Ziara *</label>
          <textarea value={form.visit_purpose} onChange={e=>setForm({...form,visit_purpose:e.target.value})} rows="2" placeholder="Mfano: Kukagua matumizi ya mfumo na kusaidia mafunzo" style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
        </div>
        
        {/* Customer status */}
        <h4 style={{fontSize:13,fontWeight:800,color:'#0A6E47',margin:'14px 0 8px'}}>📊 Hali ya Mteja</h4>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Kuridhika</label>
            <select value={form.customer_satisfaction} onChange={e=>setForm({...form,customer_satisfaction:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box',background:'#fff'}}>
              <option value="very_happy">😊 Furaha Sana</option>
              <option value="happy">🙂 Furaha</option>
              <option value="neutral">😐 Wastani</option>
              <option value="unhappy">😕 Hairidhiki</option>
              <option value="very_unhappy">😡 Hairidhiki Kabisa</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Anatumia Mfumo?</label>
            <select value={form.is_using_system} onChange={e=>setForm({...form,is_using_system:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box',background:'#fff'}}>
              <option value="yes">✅ Ndio, Kila Siku</option>
              <option value="sometimes">⚠️ Mara Chache</option>
              <option value="no">❌ Hatumii</option>
            </select>
          </div>
        </div>
        
        {/* Issues section */}
        <div style={{background:form.has_issues?'#FBECE9':'#F6F8F7',padding:'12px 14px',borderRadius:10,marginBottom:10,border:`1.5px solid ${form.has_issues?'#FCA5A5':'#D6E2DB'}`}}>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:form.has_issues?12:0}}>
            <input type="checkbox" checked={form.has_issues} onChange={e=>setForm({...form,has_issues:e.target.checked})} style={{width:18,height:18,cursor:'pointer'}}/>
            <span style={{fontWeight:800,fontSize:13,color:form.has_issues?'#991B1B':'#475569'}}>
              ⚠️ Mteja Ana Changamoto/Lalama
            </span>
          </label>
          
          {form.has_issues&&<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Aina ya Changamoto</label>
                <select value={form.issue_category} onChange={e=>setForm({...form,issue_category:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #FCA5A5',fontSize:13,boxSizing:'border-box',background:'#fff'}}>
                  <option value="">Chagua...</option>
                  <option value="technical">🔧 Technical (Mfumo)</option>
                  <option value="payment">💰 Malipo</option>
                  <option value="training">🎓 Mafunzo</option>
                  <option value="sms">📱 SMS</option>
                  <option value="features">✨ Vipengele</option>
                  <option value="other">📌 Nyingine</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Uharaka</label>
                <select value={form.urgency} onChange={e=>setForm({...form,urgency:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #FCA5A5',fontSize:13,boxSizing:'border-box',background:'#fff'}}>
                  <option value="low">🟢 Ndogo</option>
                  <option value="normal">🔵 Wastani</option>
                  <option value="high">🟠 Kubwa</option>
                  <option value="critical">🔴 DHARURA</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Eleza Changamoto *</label>
              <textarea value={form.issues_description} onChange={e=>setForm({...form,issues_description:e.target.value})} rows="3" placeholder="Eleza kwa undani kile mteja anachokumbana nacho..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #FCA5A5',fontSize:13,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
            </div>
          </>}
        </div>
        
        {/* Customer needs & feedback */}
        <h4 style={{fontSize:13,fontWeight:800,color:'#0A6E47',margin:'14px 0 8px'}}>💬 Maoni na Mahitaji</h4>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Mteja Anahitaji Nini?</label>
          <textarea value={form.customer_needs} onChange={e=>setForm({...form,customer_needs:e.target.value})} rows="2" placeholder="Mfano: Anahitaji mafunzo ya kutumia ripoti..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
        </div>
        
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Maoni ya Mteja kuhusu Mfumo</label>
          <textarea value={form.feedback} onChange={e=>setForm({...form,feedback:e.target.value})} rows="2" placeholder="Mfano: Anasema mfumo ni mzuri lakini ungeongeza..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
        </div>
        
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>Mapendekezo Yako (kama Supevaiza)</label>
          <textarea value={form.recommendations} onChange={e=>setForm({...form,recommendations:e.target.value})} rows="2" placeholder="Mfano: Napendekeza Admin amfuate mteja huyu kwa mafunzo..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box',fontFamily:'inherit',resize:'vertical'}}/>
        </div>
        
        {/* Next visit */}
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:8,marginBottom:14}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#475569',display:'block',marginBottom:5}}>📅 Tarehe ya Ziara Ijayo (Optional)</label>
            <input type="date" value={form.next_visit_date} min={today} onChange={e=>setForm({...form,next_visit_date:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #D6E2DB',fontSize:13,boxSizing:'border-box'}}/>
          </div>
        </div>
        
        {/* Submit */}
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowForm(false)} style={{flex:1,padding:12,background:'#fff',color:'#5C6A62',border:'2px solid #D6E2DB',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer'}}>Ghairi</button>
          <button onClick={submitVisit} style={{flex:2,padding:12,background:'linear-gradient(140deg,#06502F,#0A6E47)',color:'#fff',border:'none',borderRadius:10,fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 4px 15px rgba(11,122,59,0.3)'}}>📤 Tuma kwa Admin</button>
        </div>
      </div>
    </Modal>}
    
    {/* VIEW DETAIL MODAL */}
    {viewing&&<Modal open={true} onClose={()=>setViewing(null)} title={`📋 Ziara ya ${viewing.customer_name}`}>
      <div style={{maxHeight:'70vh',overflowY:'auto',paddingRight:8}}>
        
        {/* Status badge */}
        <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
          <span style={{padding:'4px 12px',borderRadius:8,background:`${getStatusColor(viewing.status)}15`,color:getStatusColor(viewing.status),fontSize:11,fontWeight:800}}>{getStatusLabel(viewing.status)}</span>
          {viewing.has_issues&&<span style={{padding:'4px 12px',borderRadius:8,background:`${getUrgencyColor(viewing.urgency)}15`,color:getUrgencyColor(viewing.urgency),fontSize:11,fontWeight:800}}>⚠️ {viewing.urgency==='critical'?'DHARURA':viewing.urgency==='high'?'KUBWA':viewing.urgency==='normal'?'WASTANI':'NDOGO'}</span>}
        </div>
        
        {/* Customer info */}
        <div style={{background:'#F6F8F7',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#5C6A62',fontWeight:700,marginBottom:5}}>👤 MTEJA</div>
          <div style={{fontWeight:800,fontSize:14,color:'#17231D'}}>{viewing.customer_name}</div>
          {viewing.customer_business&&<div style={{fontSize:12,color:'#475569'}}>🏪 {viewing.customer_business}</div>}
          {viewing.customer_phone&&<div style={{fontSize:12,color:'#475569'}}>📞 {viewing.customer_phone}</div>}
          {viewing.customer_location&&<div style={{fontSize:12,color:'#475569'}}>📍 {viewing.customer_location}</div>}
        </div>
        
        {/* Visit info */}
        <div style={{background:'#F6F8F7',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#5C6A62',fontWeight:700,marginBottom:5}}>📅 ZIARA</div>
          <div style={{fontSize:12,color:'#475569'}}><b>Tarehe:</b> {new Date(viewing.visit_date||viewing.created_at).toLocaleDateString('sw-TZ')}</div>
          <div style={{fontSize:12,color:'#475569'}}><b>Aina:</b> {viewing.visit_type}</div>
          {viewing.visit_purpose&&<div style={{fontSize:12,color:'#475569',marginTop:6}}><b>Lengo:</b><br/>{viewing.visit_purpose}</div>}
        </div>
        
        {/* Status */}
        <div style={{background:'#E6F2EC',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #C2DED1'}}>
          <div style={{fontSize:11,color:'#15803D',fontWeight:700,marginBottom:5}}>📊 HALI YA MTEJA</div>
          <div style={{fontSize:12,color:'#166534'}}><b>Kuridhika:</b> {getSatLabel(viewing.customer_satisfaction)}</div>
          <div style={{fontSize:12,color:'#166534'}}><b>Anatumia:</b> {viewing.is_using_system==='yes'?'✅ Kila Siku':viewing.is_using_system==='sometimes'?'⚠️ Mara Chache':'❌ Hatumii'}</div>
        </div>
        
        {/* Issues */}
        {viewing.has_issues&&<div style={{background:'#FBECE9',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #FCA5A5'}}>
          <div style={{fontSize:11,color:'#991B1B',fontWeight:700,marginBottom:5}}>⚠️ CHANGAMOTO</div>
          {viewing.issue_category&&<div style={{fontSize:12,color:'#7F1D1D'}}><b>Aina:</b> {viewing.issue_category}</div>}
          <div style={{fontSize:12,color:'#7F1D1D',marginTop:6}}>{viewing.issues_description}</div>
        </div>}
        
        {/* Other fields */}
        {viewing.customer_needs&&<div style={{background:'#F6F8F7',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#5C6A62',fontWeight:700,marginBottom:5}}>💡 MAHITAJI YA MTEJA</div>
          <div style={{fontSize:12,color:'#475569'}}>{viewing.customer_needs}</div>
        </div>}
        
        {viewing.feedback&&<div style={{background:'#F6F8F7',padding:'12px 14px',borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#5C6A62',fontWeight:700,marginBottom:5}}>💬 MAONI</div>
          <div style={{fontSize:12,color:'#475569'}}>{viewing.feedback}</div>
        </div>}
        
        {viewing.recommendations&&<div style={{background:'#EFF6FF',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #BFDBFE'}}>
          <div style={{fontSize:11,color:'#1E40AF',fontWeight:700,marginBottom:5}}>📝 MAPENDEKEZO YAKO</div>
          <div style={{fontSize:12,color:'#1E3A8A'}}>{viewing.recommendations}</div>
        </div>}
        
        {viewing.admin_notes&&<div style={{background:'#FFF8E6',padding:'12px 14px',borderRadius:10,marginBottom:10,border:'1px solid #FCD34D'}}>
          <div style={{fontSize:11,color:'#92400E',fontWeight:700,marginBottom:5}}>📌 ADMIN ALISEMA</div>
          <div style={{fontSize:12,color:'#78350F'}}>{viewing.admin_notes}</div>
        </div>}
        
        {viewing.next_visit_date&&<div style={{background:'#E6F2EC',padding:'10px 14px',borderRadius:10,marginBottom:10,fontSize:12,color:'#15803D'}}>
          📅 <b>Ziara Ijayo:</b> {new Date(viewing.next_visit_date).toLocaleDateString('sw-TZ')}
        </div>}
      </div>
    </Modal>}
  </div>;
}
