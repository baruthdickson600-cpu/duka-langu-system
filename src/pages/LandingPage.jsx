import React,{useState,useEffect} from 'react';

export default function LandingPage({onLogin,onSignup,onDemo}){
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
    {/* NAV */}
    <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #E2E8F0',padding:'12px 16px'}}>
      <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:40,height:40,background:'linear-gradient(135deg,#0B7A3B,#065F2E)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:18}}>D</div>
          <div>
            <div style={{fontWeight:900,fontSize:18,color:'#0B7A3B'}}>Duka Langu</div>
            <div style={{fontSize:10,color:'#64748B'}}>Smart POS Tanzania</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onLogin} style={{padding:'9px 18px',borderRadius:10,border:'1.5px solid #0B7A3B',background:'#fff',color:'#0B7A3B',fontWeight:700,fontSize:13,cursor:'pointer'}}>Login</button>
          <button onClick={onSignup} style={{padding:'9px 18px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'0 4px 12px rgba(11,122,59,0.25)'}}>Anza Bure →</button>
        </div>
      </div>
    </nav>

    {/* HERO */}
    <div style={{position:'relative',minHeight:'85vh',display:'flex',alignItems:'center',overflow:'hidden'}}>
      <div style={bgStyle(bgIdx,!showB)}/>
      {bgB&&<div style={bgStyle(bgB,showB)}/>}
      <div style={{position:'absolute',inset:0,zIndex:1,background:'linear-gradient(135deg,rgba(11,122,59,0.85),rgba(6,95,46,0.75))'}}/>
      <div style={{position:'relative',zIndex:2,maxWidth:1100,margin:'0 auto',padding:'40px 16px',color:'#fff',width:'100%'}}>
        <div style={{maxWidth:700}}>
          <div style={{display:'inline-block',padding:'6px 14px',background:'rgba(255,255,255,0.2)',borderRadius:20,fontSize:12,fontWeight:600,marginBottom:16,backdropFilter:'blur(10px)'}}>🇹🇿 #1 Smart POS Tanzania</div>
          <h1 style={{fontSize:54,fontWeight:900,lineHeight:1.1,margin:'0 0 16px',textShadow:'0 4px 20px rgba(0,0,0,0.3)'}}>
            Endesha Duka Lako<br/>Kwa Akili Zaidi
          </h1>
          <p style={{fontSize:18,opacity:0.95,lineHeight:1.6,marginBottom:28,maxWidth:550,textShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
            Mfumo wa kisasa wa POS unaokusaidia kuuza, kufuatilia stock, kupata ripoti za faida, na kusimamia wafanyakazi — kwenye simu yako tu.
          </p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <button onClick={onSignup} style={{padding:'14px 28px',borderRadius:12,border:'none',background:'#fff',color:'#0B7A3B',fontWeight:800,fontSize:15,cursor:'pointer',boxShadow:'0 8px 25px rgba(0,0,0,0.2)'}}>🚀 Anza Trial Bure (Siku 7)</button>
            <button onClick={onDemo} style={{padding:'14px 28px',borderRadius:12,border:'2px solid rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.1)',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',backdropFilter:'blur(10px)'}}>👁️ Tazama Demo</button>
          </div>
          <div style={{display:'flex',gap:24,marginTop:32,flexWrap:'wrap'}}>
            {[
              {n:'500+',l:'Wateja Tanzania'},
              {n:'TZS 15K',l:'Bei kwa Mwezi'},
              {n:'24/7',l:'Msaada'},
              {n:'4.9★',l:'Maoni ya Wateja'},
            ].map((s,i)=><div key={i}>
              <div style={{fontSize:24,fontWeight:900}}>{s.n}</div>
              <div style={{fontSize:12,opacity:0.85}}>{s.l}</div>
            </div>)}
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
        ].map((f,i)=><div key={i} style={{background:'#fff',padding:24,borderRadius:16,border:'1px solid #E2E8F0',transition:'all 0.3s'}} onMouseOver={e=>{e.currentTarget.style.boxShadow='0 12px 30px rgba(11,122,59,0.12)';e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.borderColor='#BBF7D0'}} onMouseOut={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='#E2E8F0'}}>
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
        <div style={{fontSize:11,fontWeight:700,color:'#0B7A3B',letterSpacing:2,marginBottom:8}}>WATEJA WANASEMA</div>
        <h2 style={{fontSize:38,fontWeight:900,color:'#1E293B',margin:0}}>Wajasiriamali Wanasifu</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20}}>
        {[
          {q:'"Nilikuwa nashindwa kujua faida halisi. Sasa Duka Langu inaniambia kila siku — naona pesa zinaingia wapi na zinakwenda wapi."',n:'Asha Mwakihaba',b:'Duka la Vipodozi, Mbeya',r:'⭐⭐⭐⭐⭐'},
          {q:'"Nimepunguza wizi wa wafanyakazi kwa 90%. Kila mauzo yanarekodiwa — sasa najua kila kitu kinachoendelea kwenye duka langu."',n:'Hassan Juma',b:'Duka la Madawa, Dar',r:'⭐⭐⭐⭐⭐'},
          {q:'"Mfumo umenisaidia kuuza bidhaa zaidi. Wateja wanapenda risiti za professional — wanahisi wanapata huduma ya hadhi."',n:'Mariam Said',b:'Boutique, Arusha',r:'⭐⭐⭐⭐⭐'},
        ].map((t,i)=><div key={i} style={{padding:24,borderRadius:16,background:'linear-gradient(135deg,#F0FDF4,#FFFFFF)',border:'1px solid #BBF7D0'}}>
          <div style={{fontSize:14,marginBottom:10}}>{t.r}</div>
          <p style={{fontSize:14,color:'#1E293B',lineHeight:1.6,margin:'0 0 16px',fontStyle:'italic'}}>{t.q}</p>
          <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:14,borderTop:'1px solid #E2E8F0'}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#0B7A3B,#065F2E)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>{t.n[0]}</div>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:'#1E293B'}}>{t.n}</div>
              <div style={{fontSize:11,color:'#64748B'}}>{t.b}</div>
            </div>
          </div>
        </div>)}
      </div>
    </Section>

    {/* PRICING */}
    <Section bg="#F8FAFC" py={70}>
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{fontSize:11,fontWeight:700,color:'#0B7A3B',letterSpacing:2,marginBottom:8}}>BEI YA WAZI</div>
        <h2 style={{fontSize:38,fontWeight:900,color:'#1E293B',margin:'0 0 12px'}}>Bei Bila Kuficha</h2>
        <p style={{fontSize:16,color:'#64748B'}}>Lipa unayoona — hakuna ada za ziada</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20,maxWidth:900,margin:'0 auto'}}>
        {[
          {n:'BASIC',p:'15,000',f:['Mauzo','Stock automatic','Wafanyakazi 3','Ripoti za msingi','Branch 1','Msaada via WhatsApp'],c:'#64748B',pop:false},
          {n:'PREMIUM',p:'25,000',f:['Yote ya Basic','Wafanyakazi 10','Branch 3','Ripoti za kina','SMS automatic','Madeni na invoice','Msaada wa simu'],c:'#0B7A3B',pop:true},
          {n:'ENTERPRISE',p:'50,000',f:['Yote ya Premium','Wafanyakazi BILA UKOMO','Branch BILA UKOMO','API access','Custom features','Mafunzo ya bure','Priority support'],c:'#8B5CF6',pop:false},
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

    {/* CTA */}
    <Section bg="linear-gradient(135deg,#0B7A3B,#065F2E)" py={60}>
      <div style={{textAlign:'center',color:'#fff'}}>
        <h2 style={{fontSize:36,fontWeight:900,margin:'0 0 12px'}}>Tayari Kuanza?</h2>
        <p style={{fontSize:16,opacity:0.9,marginBottom:24,maxWidth:500,margin:'0 auto 24px'}}>Jiunge na wajasiriamali 500+ Tanzania wanaotumia Duka Langu kuongeza faida</p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={onSignup} style={{padding:'15px 32px',borderRadius:12,border:'none',background:'#fff',color:'#0B7A3B',fontWeight:800,fontSize:15,cursor:'pointer',boxShadow:'0 8px 25px rgba(0,0,0,0.2)'}}>🚀 Anza Trial Bure</button>
          <button onClick={onDemo} style={{padding:'15px 32px',borderRadius:12,border:'2px solid rgba(255,255,255,0.5)',background:'transparent',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>👁️ Tazama Demo</button>
        </div>
      </div>
    </Section>

    {/* FOOTER */}
    <div style={{background:'#1E293B',color:'#94A3B8',padding:'40px 16px 20px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:24,marginBottom:30}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div style={{width:36,height:36,background:'#0B7A3B',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900}}>D</div>
              <div style={{fontWeight:900,fontSize:16,color:'#fff'}}>Duka Langu</div>
            </div>
            <p style={{fontSize:12,lineHeight:1.6}}>Mfumo wa kisasa wa POS unaowasaidia wajasiriamali Tanzania kuendesha biashara kwa ufanisi.</p>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:'#fff',marginBottom:14,letterSpacing:1}}>WASILIANA NASI</div>
            <div style={{fontSize:12,lineHeight:1.8}}>
              📞 +255 628 986 770<br/>
              💬 +255 628 319 789<br/>
              📧 pesafly1@gmail.com<br/>
              🆘 0617 288 752
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
          © 2026 PesaFly Technologies — Tanzania 🇹🇿 — Made with ❤️ for Tanzanian Entrepreneurs
        </div>
      </div>
    </div>
  </div>;
}
