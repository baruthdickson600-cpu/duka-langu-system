import React,{useState,useEffect} from 'react';

export default function LandingPage({onLogin,onSignup,onDemo}){
  const[activeVideo,setActiveVideo]=React.useState(0);
  const[bgIdx,setBgIdx]=useState(1);
  const[showB,setShowB]=useState(false);
  const[bgB,setBgB]=useState(null);
  
  useEffect(()=>{
    const t=setInterval(()=>{
      const next=(showB?bgIdx:bgB||bgIdx)%13+1;
      if(showB){setBgIdx(next);setTimeout(()=>setShowB(false),50)}
      else{setBgB(next);setTimeout(()=>setShowB(true),50)}
    },10000);
    return()=>clearInterval(t);
  },[bgIdx,bgB,showB]);

  const bgStyle=(i,visible)=>({
    position:'absolute',inset:0,zIndex:0,
    backgroundImage:`url(/bg/bg${i}.jpg)`,backgroundSize:'cover',backgroundPosition:'center',
    opacity:visible?1:0,transition:'opacity 1.5s ease-in-out',
  });

  const Section=({children,bg='#fff',py=80})=>(
    <div style={{background:bg,padding:`${py}px 16px`}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>{children}</div>
    </div>
  );

  return <div style={{minHeight:'100vh',background:'#fff',fontFamily:'Inter,sans-serif'}}>
    {/* GLOBAL ANIMATIONS */}
    <style>{`
      @keyframes fadeInUp {from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeInLeft {from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
      @keyframes fadeInRight {from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
      @keyframes slideDown {from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes float {0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
      @keyframes pulse {0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}
      @keyframes scaleIn {from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
      @keyframes shimmer {0%{background-position:-200% 0}100%{background-position:200% 0}}
      .anim-card{animation:fadeInUp 0.7s ease both;transition:all 0.35s cubic-bezier(.4,0,.2,1)}
      .anim-card:hover{transform:translateY(-8px)}
    `}</style>
    {/* NAV */}
    <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #E2E8F0',padding:'12px 16px',animation:'slideDown 0.6s ease both'}}>
      <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,animation:'fadeInLeft 0.8s ease both'}}>
          <img src="/logo.png" alt="Duka Langu" style={{height:48,width:'auto'}}/>
        </div>
        <div style={{display:'flex',gap:8,animation:'fadeInRight 0.8s ease both'}}>
          <button onClick={onLogin} style={{padding:'9px 18px',borderRadius:10,border:'1.5px solid #0B7A3B',background:'#fff',color:'#0B7A3B',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.25s'}} onMouseOver={e=>{e.currentTarget.style.background='#F0FDF4';e.currentTarget.style.transform='translateY(-2px)'}} onMouseOut={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.transform='translateY(0)'}}>Login</button>
          <button onClick={onSignup} style={{padding:'9px 18px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'0 4px 12px rgba(11,122,59,0.25)',transition:'all 0.25s'}} onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 20px rgba(11,122,59,0.4)'}} onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 12px rgba(11,122,59,0.25)'}}>Anza Bure →</button>
        </div>
      </div>
    </nav>

    <style>{`
      /* ===== RESPONSIVE ===== */
      @media (max-width: 1024px) {
        .hero-img { flex: 1 1 100% !important; margin-top: 28px; }
      }
      @media (max-width: 768px) {
        .hero-stats { grid-template-columns: repeat(2, auto) !important; gap: 16px 22px !important; }
        .hero-btns { width: 100%; }
        .hero-btns button { flex: 1; min-width: 140px; }
      }
      @media (max-width: 480px) {
        .hero-stats { grid-template-columns: repeat(2, auto) !important; }
      }
    `}</style>

    {/* HERO */}
    <div style={{position:'relative',minHeight:'85vh',display:'flex',alignItems:'center',overflow:'hidden'}}>
      <div style={bgStyle(bgIdx,!showB)}/>
      {bgB&&<div style={bgStyle(bgB,showB)}/>}
      <div style={{position:'absolute',inset:0,zIndex:1,background:'linear-gradient(135deg,rgba(11,122,59,0.85),rgba(6,95,46,0.75))'}}/>
      <div style={{position:'relative',zIndex:2,maxWidth:1240,margin:'0 auto',padding:'48px 24px',color:'#fff',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:48,flexWrap:'wrap'}}>
          <div style={{flex:'1 1 440px',minWidth:300}}>
            <div style={{display:'inline-block',padding:'6px 14px',background:'rgba(255,255,255,0.2)',borderRadius:20,fontSize:12,fontWeight:600,marginBottom:16,backdropFilter:'blur(10px)',animation:'fadeInUp 0.6s ease both'}}>🇹🇿 Biashara yako mkononi mwako</div>
            <h1 style={{fontSize:'clamp(32px,4.2vw,52px)',fontWeight:900,lineHeight:1.12,margin:'0 0 18px',letterSpacing:-1,textShadow:'0 4px 20px rgba(0,0,0,0.3)',animation:'fadeInUp 0.7s ease 0.1s both'}}>
              Endesha Biashara<br/>Yako Kidijitali
            </h1>
            <p style={{fontSize:'clamp(15px,1.15vw,17.5px)',opacity:0.94,lineHeight:1.65,marginBottom:28,maxWidth:490,textShadow:'0 2px 8px rgba(0,0,0,0.25)',animation:'fadeInUp 0.8s ease 0.2s both'}}>
              Mfumo wa kisasa wa POS unaokusaidia kuuza, kufuatilia stock, kupata ripoti za faida, na kusimamia wafanyakazi — kwenye simu yako tu.
            </p>
            <div className="hero-btns" style={{display:'flex',gap:11,flexWrap:'wrap',animation:'fadeInUp 0.9s ease 0.3s both'}}>
              <button onClick={onSignup} style={{padding:'14px 24px',whiteSpace:'nowrap',borderRadius:12,border:'none',background:'#fff',color:'#0B7A3B',fontWeight:800,fontSize:15,cursor:'pointer',boxShadow:'0 8px 25px rgba(0,0,0,0.2)',transition:'all 0.3s'}} onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px) scale(1.02)';e.currentTarget.style.boxShadow='0 14px 35px rgba(0,0,0,0.3)'}} onMouseOut={e=>{e.currentTarget.style.transform='translateY(0) scale(1)';e.currentTarget.style.boxShadow='0 8px 25px rgba(0,0,0,0.2)'}}>🚀 Anza Trial Bure (Siku 7)</button>
              <button onClick={onDemo} style={{padding:'14px 24px',whiteSpace:'nowrap',borderRadius:12,border:'2px solid rgba(255,255,255,0.45)',background:'rgba(255,255,255,0.1)',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',backdropFilter:'blur(10px)',transition:'all 0.3s'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,0.2)';e.currentTarget.style.transform='translateY(-3px)'}} onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.transform='translateY(0)'}}>👁️ Tazama Demo</button>
            </div>
            <div className="hero-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,auto)',gap:'20px 26px',marginTop:34,justifyContent:'start',animation:'fadeInUp 1s ease 0.4s both'}}>
              {[
                {n:'500+',l:'Wateja Tanzania'},
                {n:'TZS 15K',l:'Bei kwa Mwezi'},
                {n:'24/7',l:'Msaada'},
                {n:'4.9★',l:'Maoni ya Wateja'},
              ].map((s,i)=><div key={i} style={{animation:`fadeInUp 1.1s ease ${0.5+i*0.1}s both`}}>
                <div style={{fontSize:'clamp(19px,1.6vw,24px)',fontWeight:900,lineHeight:1.15,whiteSpace:'nowrap'}}>{s.n}</div>
                <div style={{fontSize:11.5,opacity:0.8,fontWeight:600,whiteSpace:'nowrap'}}>{s.l}</div>
              </div>)}
            </div>
          </div>
          {/* PICHA YA MFUMO (Laptop + Simu) */}
          <div className="hero-img" style={{flex:'1 1 500px',minWidth:280,display:'flex',justifyContent:'center',animation:'fadeInRight 1s ease 0.3s both'}}>
            <div style={{position:'relative',width:'100%',maxWidth:740,animation:'float 6s ease-in-out infinite'}}>
              {/* Mwanga wa nyuma */}
              <div style={{
                position:'absolute',inset:'-10% -6%',
                background:'radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 45%, transparent 70%)',
                filter:'blur(40px)',animation:'pulse 4s ease-in-out infinite',
              }}/>
              <img
                src="/dukalangu-preview.png"
                alt="DukaLangu — Dashboard kwenye Laptop na Simu"
                style={{
                  position:'relative',width:'100%',height:'auto',display:'block',
                  filter:'drop-shadow(0 30px 60px rgba(0,0,0,0.45)) drop-shadow(0 8px 20px rgba(0,0,0,0.25))',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* FEATURES */}
    <Section bg="#fff">
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{fontSize:11,fontWeight:700,color:'#0B7A3B',letterSpacing:2,marginBottom:8}}>FAIDA ZA DUKA LANGU</div>
        <h2 style={{fontSize:38,fontWeight:900,color:'#1E293B',margin:'0 0 12px'}}>Kila Kitu Unachohitaji</h2>
        <p style={{fontSize:16,color:'#64748B',maxWidth:600,margin:'0 auto'}}>Mfumo kamili wa kuendesha biashara yako bila kuwa na ujuzi wa kompyuta</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20}}>
        {[
          {i:'🛒',t:'Mauzo ya Kasi',d:'Uza kwa sekunde 5! Bonyeza bidhaa, ingiza kiasi, kamilisha mauzo. Risiti automatic.'},
          {i:'📦',t:'Stock Automatic',d:'Mfumo unahesabu stock peke yake. Bidhaa ikipungua, unapata arifa kabla ya kuisha kabisa.'},
          {i:'💰',t:'Ripoti za Faida',d:'Jua faida halisi ya kila siku, wiki, mwezi. Bidhaa ipi inaleta faida zaidi? Unajua moja kwa moja.'},
          {i:'👥',t:'Wafanyakazi',d:'Sajili wauzaji wako. Ujue mauzo ya kila mfanyakazi, masaa ya kazi, na ufanisi wao.'},
          {i:'💳',t:'Madeni',d:'Wateja wakichukua kwa mkopo, mfumo unawakumbuka. SMS automatic za kukumbusha kulipa.'},
          {i:'📊',t:'Multi-Branch',d:'Una maduka mengi? Simamia yote mahali pamoja. Linganisha mauzo, profits, na stock.'},
          {i:'🔒',t:'Salama 100%',d:'Data yako imefungwa kwa encryption. Hata internet ikienda, mfumo unaendelea kufanya kazi.'},
          {i:'📱',t:'Inafanya Mahali Popote',d:'Tumia kwenye simu, tablet, au kompyuta. Hakuna kufunga programu — fungua na browser tu.'},
          {i:'🆘',t:'Msaada 24/7',d:'Tatizo lolote? Tupigie simu au WhatsApp masaa yote. Tunazungumza Kiswahili.'},
        ].map((f,i)=><div key={i} className="anim-card" style={{background:'#fff',padding:24,borderRadius:16,border:'1px solid #E2E8F0',animationDelay:`${i*0.08}s`}} onMouseOver={e=>{e.currentTarget.style.boxShadow='0 12px 30px rgba(11,122,59,0.12)';e.currentTarget.style.borderColor='#BBF7D0'}} onMouseOut={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='#E2E8F0'}}>
          <div style={{width:54,height:54,background:'#F0FDF4',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,marginBottom:14}}>{f.i}</div>
          <h3 style={{fontSize:17,fontWeight:800,color:'#1E293B',margin:'0 0 8px'}}>{f.t}</h3>
          <p style={{fontSize:13,color:'#64748B',lineHeight:1.6,margin:0}}>{f.d}</p>
        </div>)}
      </div>
    </Section>

    {/* HOW IT WORKS */}
    <Section bg="#F8FAFC" py={70}>
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{fontSize:11,fontWeight:700,color:'#0B7A3B',letterSpacing:2,marginBottom:8}}>JINSI INAVYOFANYA KAZI</div>
        <h2 style={{fontSize:38,fontWeight:900,color:'#1E293B',margin:'0 0 12px'}}>Anza Kwa Hatua 4 Tu</h2>
        <p style={{fontSize:16,color:'#64748B'}}>Ndani ya dakika 10 unaweza kuanza kuuza</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:18}}>
        {[
          {n:'1',t:'Jisajili',d:'Toa email na password. Sekunde 30 tu.'},
          {n:'2',t:'Ingiza Bidhaa',d:'Weka bei, stock, na picha. Au upload Excel.'},
          {n:'3',t:'Anza Kuuza',d:'Bonyeza bidhaa → Kamilisha mauzo → Risiti.'},
          {n:'4',t:'Pata Ripoti',d:'Mauzo, faida, na stock kwenye dashboard.'},
        ].map((s,i)=><div key={i} style={{position:'relative',background:'#fff',padding:24,borderRadius:14,border:'1px solid #E2E8F0'}}>
          <div style={{position:'absolute',top:-15,left:20,width:36,height:36,background:'linear-gradient(135deg,#0B7A3B,#065F2E)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:16,boxShadow:'0 4px 12px rgba(11,122,59,0.3)'}}>{s.n}</div>
          <h3 style={{fontSize:16,fontWeight:800,color:'#1E293B',margin:'14px 0 8px'}}>{s.t}</h3>
          <p style={{fontSize:13,color:'#64748B',lineHeight:1.5,margin:0}}>{s.d}</p>
        </div>)}
      </div>
    </Section>

    {/* TESTIMONIALS */}
    <Section bg="#fff">
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{display:'inline-block',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:20,padding:'4px 16px',fontSize:11,fontWeight:700,color:'#0B7A3B',letterSpacing:2,marginBottom:16}}>💬 WATEJA WANASEMA</div>
        <h2 style={{fontSize:38,fontWeight:900,color:'#1E293B',margin:'0 0 12px'}}>Wajasiriamali Tanzania Wanaamini</h2>
        <p style={{fontSize:16,color:'#64748B',margin:0}}>Zaidi ya wajasiriamali 500+ wanategemea Duka Langu kila siku</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20}}>
        {[
          {q:'Duka Langu imenisaidia kujua faida yangu halisi kila siku. Nilikuwa nadhani ninafanya vizuri, lakini baada ya kutumia mfumo nilifahamu wapi pesa zilikuwa zinaendelea kupotea. Sasa biashara yangu iko imara.',n:'Asha Mwakihaba',b:'Duka la Vipodozi, Mbeya',r:5,color:'#0B7A3B'},
          {q:'Nimepunguza wizi wa wafanyakazi kwa 90%. Kila mauzo yanarekodiwa automatically — sasa najua kila kitu kinachoendelea kwenye duka langu saa yoyote hata nikiwa mbali.',n:'Hassan Juma',b:'Duka la Madawa, Dar es Salaam',r:5,color:'#8B5CF6'},
          {q:'Bidhaa zangu za pembejeo zilikuwa zinakwisha bila kujua. Sasa mfumo unaniambia mapema niagize nini. Wateja wangu hawapotei tena kwa sababu ya kukosa bidhaa.',n:'Christina Mbwambo',b:'Duka la Pembejeo, Urambo',r:5,color:'#F59E0B'},
          {q:'Mfumo umenisaidia kuuza bidhaa zaidi. Wateja wanapenda risiti za professional — wanahisi wanapata huduma ya hadhi ya kweli. Mapato yamepanda kwa 30%.',n:'Mariam Said',b:'Boutique ya Mavazi, Arusha',r:5,color:'#EC4899'},
        ].map((t,i)=><div key={i} style={{padding:28,borderRadius:20,background:'#fff',border:'1px solid #E2E8F0',boxShadow:'0 4px 24px rgba(0,0,0,.06)',display:'flex',flexDirection:'column',gap:0,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${t.color},${t.color}88)`}}/>
          <div style={{fontSize:28,marginBottom:12,marginTop:8}}>❝</div>
          <p style={{fontSize:14,color:'#374151',lineHeight:1.75,margin:'0 0 20px',flex:1}}>{t.q}</p>
          <div style={{display:'flex',alignItems:'center',gap:12,paddingTop:16,borderTop:'1px solid #F1F5F9'}}>
            <div style={{width:46,height:46,borderRadius:'50%',background:`linear-gradient(135deg,${t.color},${t.color}88)`,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:18,flexShrink:0}}>{t.n[0]}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:13,color:'#1E293B'}}>{t.n}</div>
              <div style={{fontSize:11,color:'#64748B',marginTop:2}}>{t.b}</div>
            </div>
            <div style={{fontSize:13,letterSpacing:1}}>{'⭐'.repeat(t.r)}</div>
          </div>
        </div>)}
      </div>
    </Section>


    {/* ===== VIDEO MAFUNZO ===== */}
    <Section bg="#fff" py={80}>
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{display:'inline-block',background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:20,padding:'4px 16px',fontSize:11,fontWeight:700,color:'#92400E',letterSpacing:2,marginBottom:16}}>🎬 VIDEO ZA MAFUNZO</div>
        <h2 style={{fontSize:38,fontWeight:900,color:'#1E293B',margin:'0 0 12px'}}>Jifunze Kutumia Duka Langu</h2>
        <p style={{fontSize:16,color:'#64748B',margin:0}}>Video fupi za kueleza kila sehemu — tayari kutumia ndani ya dakika chache</p>
      </div>

      {/* Tabs za kuchagua video */}
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:32}}>
        {[
          {i:0,icon:'🛒',label:'Mauzo'},
          {i:1,icon:'📦',label:'Stock'},
          {i:2,icon:'📊',label:'Ripoti'},
          {i:3,icon:'👥',label:'Wateja'},
          {i:4,icon:'🎯',label:'Supervisors'},
          {i:5,icon:'⚙️',label:'Mipangilio'},
        ].map(t=>(
          <button key={t.i} onClick={()=>setActiveVideo(t.i)} style={{padding:'8px 18px',borderRadius:30,border:activeVideo===t.i?'2px solid #0B7A3B':'2px solid #E2E8F0',background:activeVideo===t.i?'#0B7A3B':'#fff',color:activeVideo===t.i?'#fff':'#64748B',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.2s',display:'flex',alignItems:'center',gap:6}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Video Player Area */}
      <div style={{maxWidth:800,margin:'0 auto'}}>
        {[
          {icon:'🛒',title:'Jinsi ya Kufanya Mauzo ya Haraka',desc:'Jifunze jinsi ya kuuza bidhaa, kupokea malipo ya cash/mobile, kutoa risiti na kufunga mauzo kwa sekunde chache.',duration:'~2 dakika',ytId:'PLACEHOLDER_MAUZO'},
          {icon:'📦',title:'Usimamizi wa Stock na Bidhaa',desc:'Jinsi ya kuongeza bidhaa, kusimamia stock, kupata arifa za bidhaa zinazokwisha, na kufuatilia historia ya stock.',duration:'~2 dakika',ytId:'PLACEHOLDER_STOCK'},
          {icon:'📊',title:'Ripoti na Uchambuzi wa Biashara',desc:'Angalia mauzo ya kila siku, wiki, mwezi — jua faida yako halisi, bidhaa zinazouza zaidi, na mwelekeo wa biashara.',duration:'~2 dakika',ytId:'PLACEHOLDER_RIPOTI'},
          {icon:'👥',title:'Usimamizi wa Wateja na Madeni',desc:'Jinsi ya kuhifadhi wateja, kuweka madeni, kupokea malipo ya deni, na kutuma arifa za malipo.',duration:'~2 dakika',ytId:'PLACEHOLDER_WATEJA'},
          {icon:'🎯',title:'Mfumo wa Supervisors na Targets',desc:'Jinsi supervisors wanavyosajili wateja, kujaza taarifa za ziara, kuona targets na bonasi zao.',duration:'~2 dakika',ytId:'PLACEHOLDER_SUPERVISORS'},
          {icon:'⚙️',title:'Mipangilio na Usanidi wa Mfumo',desc:'Jinsi ya kuweka jina la biashara, logo, bei, wafanyakazi, na mipangilio mingine ya mfumo wako.',duration:'~2 dakika',ytId:'PLACEHOLDER_MIPANGILIO'},
        ].map((v,i)=>i===activeVideo&&(
          <div key={i} style={{borderRadius:20,overflow:'hidden',boxShadow:'0 12px 48px rgba(0,0,0,.12)',border:'1px solid #E2E8F0'}}>
            {/* Video Placeholder */}
            <div style={{background:'linear-gradient(135deg,#0F172A,#1E3A5F)',aspectRatio:'16/9',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',position:'relative',cursor:'pointer'}}
              onClick={()=>window.open('https://youtube.com','_blank')}>
              {/* Fake thumbnail pattern */}
              <div style={{position:'absolute',inset:0,opacity:.1,backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)',backgroundSize:'30px 30px'}}/>
              <div style={{fontSize:72,marginBottom:16}}>{v.icon}</div>
              {/* Play button */}
              <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,.95)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 32px rgba(0,0,0,.3)',marginBottom:20}}>
                <div style={{width:0,height:0,borderTop:'14px solid transparent',borderBottom:'14px solid transparent',borderLeft:'22px solid #0B7A3B',marginLeft:4}}/>
              </div>
              <div style={{color:'#fff',fontSize:16,fontWeight:800,textAlign:'center',padding:'0 20px'}}>{v.title}</div>
              <div style={{position:'absolute',top:14,right:14,background:'rgba(0,0,0,.5)',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:6}}>⏱ {v.duration}</div>
              <div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',background:'#FF0000',color:'#fff',fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:4,letterSpacing:1}}>▶ YouTube</div>
            </div>
            {/* Info chini */}
            <div style={{background:'#fff',padding:'20px 24px',display:'flex',alignItems:'flex-start',gap:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:'#F0FDF4',border:'1px solid #BBF7D0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{v.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:16,color:'#1E293B',marginBottom:4}}>{v.title}</div>
                <div style={{fontSize:13,color:'#64748B',lineHeight:1.6}}>{v.desc}</div>
              </div>
              <div style={{flexShrink:0}}>
                <span style={{background:'#F0FDF4',color:'#15803D',border:'1px solid #BBF7D0',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>⏱ {v.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA chini ya video */}
      <div style={{textAlign:'center',marginTop:40}}>
        <p style={{fontSize:14,color:'#94A3B8',marginBottom:16}}>💡 Video hizi zitasasishwa mara kwa mara. Subscribe YouTube channel yetu usikose!</p>
        <button onClick={()=>window.open('https://youtube.com/@dukalangu','_blank')} style={{padding:'12px 28px',background:'#FF0000',color:'#fff',border:'none',borderRadius:30,fontWeight:800,fontSize:14,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 4px 20px rgba(255,0,0,.3)'}}>
          ▶ Tembelea Channel Yetu YouTube
        </button>
      </div>
    </Section>
    {/* PRICING */}
    <Section bg="#F8FAFC" py={70}>
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{fontSize:11,fontWeight:700,color:'#0B7A3B',letterSpacing:2,marginBottom:8}}>BEI YA WAZI</div>
        <h2 style={{fontSize:'clamp(26px,3.2vw,38px)',fontWeight:900,color:'#1E293B',margin:'0 0 12px',letterSpacing:-0.5}}>Bei Bila Kuficha</h2>
        <p style={{fontSize:16,color:'#64748B'}}>Lipa unayoona — hakuna ada za ziada</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:22,maxWidth:720,margin:'0 auto'}}>
        {[
          {n:'BASIC',p:'15,000',sub:'Kifurushi cha Kuanza',f:['✅ Mauzo ya POS','✅ Usimamizi wa Stock','✅ Wateja & Madeni','✅ Matumizi','✅ Wafanyakazi 3','✅ Tawi 1','✅ Ripoti za Msingi','✅ Supervisors','✅ Arifa & Notification'],c:'#3B82F6',pop:false},
          {n:'PREMIUM',p:'25,000',sub:'Biashara Inayokua',f:['🔵 Yote ya Basic','⭐ Matawi Mengi (hadi 10)','⭐ Wafanyakazi Wasio na Kikomo','⭐ Ripoti za Kina','⭐ AI Uchambuzi wa Biashara','⭐ SMS Center (Auto)','⭐ Export CSV & PDF','⭐ Priority Support'],c:'#8B5CF6',pop:true},
        ].map((p,i)=><div key={i} style={{position:'relative',padding:28,borderRadius:18,background:'#fff',border:p.pop?`2px solid ${p.c}`:'1px solid #E2E8F0',boxShadow:p.pop?'0 12px 40px rgba(11,122,59,0.15)':'none',transform:p.pop?'scale(1.03)':'none'}}>
          {p.pop&&<div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',padding:'4px 16px',background:p.c,color:'#fff',borderRadius:20,fontSize:11,fontWeight:800,letterSpacing:1}}>POPULAR</div>}
          <div style={{fontSize:13,fontWeight:800,color:p.c,letterSpacing:2}}>{p.n}</div>
          <div style={{margin:'12px 0',display:'flex',alignItems:'baseline',gap:4}}>
            <span style={{fontSize:14,color:'#64748B'}}>TZS</span>
            <span style={{fontSize:42,fontWeight:900,color:'#1E293B'}}>{p.p}</span>
            <span style={{fontSize:13,color:'#64748B'}}>/mwezi</span>
          </div>
          <div style={{borderTop:'1px solid #E2E8F0',paddingTop:16,marginTop:8}}>
            {p.f.map((ft,j)=><div key={j} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',fontSize:13,color:'#475569'}}>
              <span style={{color:'#22C55E',fontWeight:800}}>✓</span>{ft}
            </div>)}
          </div>
          <button onClick={onSignup} style={{width:'100%',padding:13,marginTop:18,borderRadius:12,border:'none',background:p.pop?`linear-gradient(135deg,${p.c},${p.c})`:'#F1F5F9',color:p.pop?'#fff':'#1E293B',fontWeight:800,fontSize:14,cursor:'pointer'}}>Anza Sasa →</button>
        </div>)}
      </div>
    </Section>

    {/* ===== MAONI YA WATEJA ===== */}
    <Section bg="#F8FAFC" py={60}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <div style={{display:'inline-block',padding:'6px 16px',borderRadius:20,background:'#F0FDF4',color:'#0B7A3B',fontSize:12,fontWeight:800,letterSpacing:1,marginBottom:14}}>MAONI YA WATEJA</div>
        <h2 style={{fontSize:'clamp(26px,3.2vw,38px)',fontWeight:900,color:'#1E293B',margin:'0 0 12px',letterSpacing:-0.5}}>Wanachosema Wafanyabiashara</h2>
        <p style={{fontSize:15,color:'#64748B',maxWidth:520,margin:'0 auto'}}>Wajasiriamali halisi wa Tanzania wanaotumia Duka Langu kila siku</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20,maxWidth:1000,margin:'0 auto'}}>
        {[
          {n:'Mwajuma S.',b:'Duka la Vyakula, Urambo',t:'Zamani nilikuwa naandika mauzo kwenye daftari. Sasa kila kitu kiko kwenye simu. Naona faida yangu ya kila siku bila kuhesabu.',r:5,i:'👩🏾'},
          {n:'Emmanuel K.',b:'Agrovet, Urambo',t:'Ripoti za kila siku zinanifikia kwa email saa mbili asubuhi. Najua stock inayoisha kabla haijaisha kabisa. Hii imeniokoa hasara kubwa.',r:5,i:'👨🏿'},
          {n:'Halima J.',b:'Duka la Jumla, Tabora Mjini',t:'Nina matawi mawili — Tabora na Urambo. Naona mauzo ya yote kutoka nyumbani. Sihitaji kwenda kila duka kila siku.',r:5,i:'👩🏾'},
          {n:'Ramadhani M.',b:'Duka la Pembejeo, Urambo',t:'Wakulima wananunua kwa mkopo. Mfumo unanikumbusha nani anadaiwa na nani amechelewa. Madeni yamepungua sana.',r:5,i:'👨🏾'},
          {n:'Zainabu H.',b:'Baa na Mgahawa, Tabora',t:'Wafanyakazi wangu wanatumia mfumo kwa urahisi. Naona nani ameuza nini. Wizi umepungua kabisa tangu nianze.',r:5,i:'👩🏿'},
          {n:'Salum A.',b:'Duka la Vipuri, Tabora',t:'Mfumo unafanya kazi hata mtandao ukiwa mbovu. Hapa Tabora mtandao si mzuri kila wakati, lakini biashara inaendelea.',r:5,i:'👨🏾'},
          {n:'Neema P.',b:'Duka la Nguo, Urambo',t:'Bei ni nafuu — elfu kumi na tano tu kwa mwezi. Mifumo mingine walitaka laki. Hii inatosha kabisa kwa duka langu.',r:5,i:'👩🏾'},
          {n:'Juma B.',b:'Duka la Vinywaji, Tabora',t:'Ripoti zinaonyesha bidhaa gani inauzwa zaidi. Sasa naagiza kwa akili — sinunui bidhaa zisizouzwa.',r:5,i:'👨🏿'},
          {n:'Asha M.',b:'Duka la Dawa, Urambo',t:'Kila kitu kiko Kiswahili. Sikuwa na uzoefu wa kompyuta, lakini nilijifunza kwa siku moja tu.',r:5,i:'👩🏾'},
          {n:'John M.',b:'Wholesale, Mbeya',t:'SMS za ukumbusho zinawafikia wateja wangu moja kwa moja. Sihitaji kupiga simu kila mmoja. Muda umeokolewa.',r:5,i:'👨🏾'},
          {n:'Grace N.',b:'Duka la Vifaa, Mwanza',t:'Msaada wao ni mzuri. Nilipopata tatizo, walinipigia simu na kunisaidia ndani ya dakika kumi. Wanajali wateja.',r:5,i:'👩🏿'},
        ].map((t,i)=>(
          <div key={i} style={{padding:24,borderRadius:18,background:'#fff',border:'1px solid #EEF2F6',boxShadow:'0 2px 8px rgba(16,24,40,0.04)'}}>
            <div style={{display:'flex',gap:3,marginBottom:12}}>
              {[...Array(t.r)].map((_,j)=><span key={j} style={{color:'#F59E0B',fontSize:15}}>★</span>)}
            </div>
            <p style={{fontSize:14,color:'#475569',lineHeight:1.7,margin:'0 0 18px',fontStyle:'italic'}}>"{t.t}"</p>
            <div style={{display:'flex',alignItems:'center',gap:11,paddingTop:14,borderTop:'1px solid #F2F4F7'}}>
              <div style={{width:42,height:42,borderRadius:'50%',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{t.i}</div>
              <div>
                <div style={{fontSize:13.5,fontWeight:800,color:'#101828'}}>{t.n}</div>
                <div style={{fontSize:12,color:'#98A2B3'}}>{t.b}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>

    {/* ===== FAQ ===== */}
    <Section bg="#fff" py={60}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <div style={{display:'inline-block',padding:'6px 16px',borderRadius:20,background:'#EFF6FF',color:'#3B82F6',fontSize:12,fontWeight:800,letterSpacing:1,marginBottom:14}}>MASWALI YANAYOULIZWA</div>
        <h2 style={{fontSize:'clamp(26px,3.2vw,38px)',fontWeight:900,color:'#1E293B',margin:'0 0 12px',letterSpacing:-0.5}}>Una Swali? Tuna Jibu</h2>
        <p style={{fontSize:15,color:'#64748B',maxWidth:520,margin:'0 auto'}}>Kila unachohitaji kujua kuhusu Duka Langu</p>
      </div>

      <div style={{maxWidth:760,margin:'0 auto',display:'flex',flexDirection:'column',gap:10}}>
        {[
          {q:'Duka Langu ni nini hasa?',a:'Duka Langu ni mfumo wa kusimamia biashara (POS) uliotengenezwa mahsusi kwa wafanyabiashara wa Tanzania. Unakusaidia kurekodi mauzo, kufuatilia bidhaa, kusimamia madeni, kudhibiti matumizi, na kupata ripoti za biashara yako — yote kutoka kwenye simu au kompyuta yako.'},
          {q:'Je ninahitaji internet kutumia mfumo?',a:'Mfumo unafanya kazi hata bila internet. Unaweza kuuza, kuongeza bidhaa, na kurekodi madeni ukiwa offline. Data inahifadhiwa kwenye kifaa chako, na inapanda kwenye mtandao mara internet inaporudi. Hii inafaa sana kwa maeneo yenye mtandao dhaifu.'},
          {q:'Naanza vipi? Ni ngumu?',a:'Ni rahisi sana. Jisajili kwa dakika 2 (jina la biashara, simu, email). Utapata majaribio ya bure. Kisha ongeza bidhaa zako — unaweza kuandika moja moja au kupakia Excel. Ukiwa tayari, anza kuuza. Tuna video za mafunzo pia.'},
          {q:'Bei ni ngapi na nalipaje?',a:'BASIC ni TZS 15,000 kwa mwezi (duka moja) na PREMIUM ni TZS 25,000 (matawi mengi + vipengele vya ziada). Hakuna gharama ya kujiunga wala gharama za siri. Unalipa kupitia HALOPESA — Lipa Namba 25187616 (jina: DUKALANGU). Baada ya kulipa, bonyeza "Nimelipa" mfumoni, mhasibu atathibitisha na mfumo utafunguka kiotomatiki.'},
          {q:'Je nikitaka kuacha? Data yangu itakuwaje?',a:'Data yako ni yako. Unaweza kupakua ripoti zako (Excel/PDF) wakati wowote. Hakuna mkataba wa kukufunga — ukiacha kulipa, mfumo unafunga lakini data yako inabaki. Ukirudi, unaendelea ulipoishia.'},
          {q:'Wafanyakazi na matawi mengi?',a:'Ndio. Unaweza kuongeza wafanyakazi na kuwapa ruhusa tofauti — mfanyakazi anauza lakini haoni faida yako. Unaona nani ameuza nini na lini, hii inadhibiti wizi. Kwa PREMIUM, unaweza pia kusimamia matawi mengi na kuona mauzo ya kila tawi kwa pekee.'},
          {q:'Naweza kufuatilia madeni?',a:'Ndio. Unarekodi mteja anayedaiwa, kiasi, na tarehe ya kulipa. Mfumo unakukumbusha nani anadaiwa na nani amechelewa. Unaweza pia kutuma SMS ya ukumbusho kwa mteja moja kwa moja.'},
          {q:'Ripoti zinapatikanaje?',a:'Unapata ripoti za mauzo, faida, bidhaa zinazouzwa zaidi, matumizi, na madeni. Unaweza kuziona mfumoni, kupakua Excel/PDF, au kupokea kwa email kila siku saa mbili asubuhi. Ripoti za wiki na mwezi pia zinapatikana.'},
          {q:'Ni salama? Data yangu inalindwa?',a:'Ndio. Data yako inahifadhiwa kwenye seva salama (Supabase) yenye ulinzi wa kimataifa. Kila biashara ina data yake pekee — hakuna mtu mwingine anayeweza kuona mauzo yako. Tunahifadhi nakala (backup) kila siku.'},
          {q:'Nikipata tatizo, nitasaidiwaje?',a:'Tuna msaada kwa simu na WhatsApp: +255 617 288 752. Pia kuna sehemu ya Tickets ndani ya mfumo — andika tatizo lako, tutakujibu. Wateja wa PREMIUM wanapata msaada wa haraka zaidi.'},
        ].map((f,i)=><FAQItem key={i} q={f.q} a={f.a}/>)}
      </div>

      <div style={{textAlign:'center',marginTop:36,padding:'20px 24px',background:'#F8FAFC',borderRadius:16,maxWidth:560,margin:'36px auto 0'}}>
        <div style={{fontSize:14.5,fontWeight:700,color:'#101828',marginBottom:6}}>Bado una swali?</div>
        <div style={{fontSize:13.5,color:'#64748B',marginBottom:14}}>Tupigie simu au tuandikie WhatsApp — tuko tayari kukusaidia</div>
        <a href="tel:+255617288752" style={{display:'inline-block',padding:'11px 24px',background:'#0B7A3B',color:'#fff',textDecoration:'none',borderRadius:10,fontWeight:700,fontSize:13.5}}>📞 +255 617 288 752</a>
      </div>
    </Section>

    {/* CTA */}
    <Section bg="linear-gradient(135deg,#0B7A3B,#065F2E)" py={60}>
      <div style={{textAlign:'center',color:'#fff',position:'relative'}}>
        <div style={{
          display:'inline-block',padding:'6px 16px',borderRadius:20,
          background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',
          fontSize:12,fontWeight:800,letterSpacing:1,marginBottom:18,
          backdropFilter:'blur(8px)',
        }}>
          🎁 MAJARIBIO YA BURE — HAKUNA KADI YA BENKI
        </div>

        <h2 style={{fontSize:'clamp(27px,3.4vw,40px)',fontWeight:900,margin:'0 0 14px',letterSpacing:-1,lineHeight:1.18}}>
          Anza Kusimamia Biashara<br/>Yako Kidijitali Leo
        </h2>

        <p style={{fontSize:'clamp(14.5px,1.2vw,16.5px)',opacity:0.9,maxWidth:520,margin:'0 auto 28px',lineHeight:1.65}}>
          Jiunge na wafanyabiashara wa Tanzania wanaotumia Duka Langu kuongeza faida, kupunguza wizi, na kukuza biashara zao.
        </p>

        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:26}}>
          <button onClick={onSignup} style={{
            padding:'16px 36px',borderRadius:13,border:'none',background:'#fff',
            color:'#0B7A3B',fontWeight:800,fontSize:15.5,cursor:'pointer',
            boxShadow:'0 10px 30px rgba(0,0,0,0.25)',transition:'transform 0.2s',
          }}
          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            🚀 Jisajili Bure Sasa
          </button>
          <button onClick={onDemo} style={{
            padding:'16px 32px',borderRadius:13,
            border:'2px solid rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.1)',
            color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',
            backdropFilter:'blur(8px)',
          }}>
            👁️ Tazama Demo
          </button>
        </div>

        {/* Uhakikisho */}
        <div style={{
          display:'flex',gap:22,justifyContent:'center',flexWrap:'wrap',
          fontSize:13,opacity:0.85,fontWeight:600,
        }}>
          {['✓ Hakuna gharama ya kujiunga','✓ Ghairi wakati wowote','✓ Msaada wa Kiswahili'].map((x,i)=>(
            <span key={i}>{x}</span>
          ))}
        </div>
      </div>
    </Section>

    {/* FOOTER */}
    <div style={{background:'#1E293B',color:'#94A3B8',padding:'40px 16px 20px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:24,marginBottom:30}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <img src="/logo.png" alt="Duka Langu" style={{height:50,width:'auto',filter:'brightness(1.2)'}}/>
            </div>
            <p style={{fontSize:12,lineHeight:1.6}}>Mfumo wa kisasa wa POS unaowasaidia wajasiriamali Tanzania kuendesha biashara kwa ufanisi.</p>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:'#fff',marginBottom:14,letterSpacing:1}}>📬 WASILIANA NASI</div>
            <div style={{fontSize:12,lineHeight:2}}>
              <a href="https://wa.me/255628986770" target="_blank" rel="noreferrer" style={{color:'#BBF7D0',textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>💬 +255 628 986 770 <span style={{background:'#25D366',color:'#fff',fontSize:9,padding:'1px 5px',borderRadius:4,fontWeight:700}}>WhatsApp</span></a>
              <a href="tel:+255628319789" style={{color:'#BBF7D0',textDecoration:'none'}}>📞 +255 628 319 789</a><br/>
              <a href="mailto:dukalangusalesmanagement@gmail.com" style={{color:'#BBF7D0',textDecoration:'none'}}>📧 dukalangusalesmanagement@gmail.com</a><br/>
              <a href="mailto:dukalangusupport@gmail.com" style={{color:'#BBF7D0',textDecoration:'none'}}>🆘 dukalangusupport@gmail.com</a>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:'#fff',marginBottom:14,letterSpacing:1}}>JIUNGE NASI</div>
            <div style={{fontSize:12,lineHeight:1.8}}>
              <span style={{cursor:'pointer'}} onClick={onLogin}>🔐 Login</span><br/>
              <span style={{cursor:'pointer'}} onClick={onSignup}>🚀 Jisajili</span><br/>
              <span style={{cursor:'pointer'}} onClick={onDemo}>👁️ Demo</span>
            </div>
          </div>
        </div>
        <div style={{borderTop:'1px solid #334155',paddingTop:20,textAlign:'center',fontSize:11}}>
          © 2026 Duka Langu — Tanzania 🇹🇿 — Made with ❤️ for Tanzanian Entrepreneurs
        </div>
      </div>
    </div>
  </div>;
}

// ===== FAQ Item (inayofunguka/kufunga) =====
function FAQItem({q,a}){
  const[open,setOpen]=React.useState(false);
  return <div style={{
    border:'1px solid #EEF2F6',borderRadius:14,overflow:'hidden',
    background:open?'#F8FAFC':'#fff',transition:'all 0.2s',
  }}>
    <button onClick={()=>setOpen(!open)} style={{
      width:'100%',padding:'17px 20px',background:'none',border:'none',
      display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,
      cursor:'pointer',textAlign:'left',
    }}>
      <span style={{fontSize:14.5,fontWeight:700,color:'#101828',flex:1}}>{q}</span>
      <span style={{
        width:24,height:24,borderRadius:'50%',flexShrink:0,
        background:open?'#0B7A3B':'#F1F5F9',color:open?'#fff':'#98A2B3',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:14,fontWeight:800,transition:'all 0.2s',
        transform:open?'rotate(45deg)':'none',
      }}>+</span>
    </button>
    {open&&<div style={{
      padding:'0 20px 18px',fontSize:14,color:'#475569',lineHeight:1.75,
      animation:'fadeInUp 0.25s ease',
    }}>
      {a}
    </div>}
  </div>;
}
