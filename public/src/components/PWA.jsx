import React,{useState,useEffect} from 'react';

// ============================================
// PWA INSTALL PROMPT + ONLINE STATUS BANNER
// ============================================

export function PWAInstallPrompt(){
  const[deferredPrompt,setDeferredPrompt]=useState(null);
  const[showBanner,setShowBanner]=useState(false);
  const[isIOS,setIsIOS]=useState(false);
  const[showIOSGuide,setShowIOSGuide]=useState(false);

  useEffect(()=>{
    // Detect iOS
    const iOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
    const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
    setIsIOS(iOS);
    
    // Don't show if already installed
    if(isStandalone){
      console.log('PWA already installed');
      return;
    }
    
    // Don't show if dismissed in last 7 days
    const dismissed=localStorage.getItem('pwa-install-dismissed');
    if(dismissed){
      const days=(Date.now()-parseInt(dismissed))/(86400000);
      if(days<7)return;
    }
    
    // For iOS, show after 30 seconds
    if(iOS){
      const timer=setTimeout(()=>setShowBanner(true),30000);
      return()=>clearTimeout(timer);
    }
    
    // For Android/Desktop - listen for browser prompt
    const handler=(e)=>{
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 20 seconds of use
      setTimeout(()=>setShowBanner(true),20000);
    };
    window.addEventListener('beforeinstallprompt',handler);
    
    // Listen for successful install
    window.addEventListener('appinstalled',()=>{
      setShowBanner(false);
      console.log('🎉 PWA installed!');
    });
    
    return()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);

  const handleInstall=async()=>{
    if(isIOS){
      setShowIOSGuide(true);
      return;
    }
    if(!deferredPrompt)return;
    deferredPrompt.prompt();
    const{outcome}=await deferredPrompt.userChoice;
    if(outcome==='accepted'){
      console.log('User accepted install');
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss=()=>{
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed',Date.now().toString());
  };

  if(!showBanner&&!showIOSGuide)return null;

  // iOS Install Guide Modal
  if(showIOSGuide){
    return <div onClick={()=>setShowIOSGuide(false)} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20,
      animation:'fadeIn 0.3s'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#fff',borderRadius:20,padding:24,maxWidth:380,width:'100%',
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)',animation:'scaleIn 0.3s'
      }}>
        <div style={{textAlign:'center',marginBottom:16}}>
          <div style={{fontSize:48,marginBottom:8}}>📱</div>
          <h3 style={{margin:0,fontSize:20,fontWeight:900,color:'#0B7A3B'}}>Sakinisha App ya iOS</h3>
          <p style={{margin:'8px 0',fontSize:13,color:'#64748B'}}>Fuata hatua hizi 3:</p>
        </div>
        
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',gap:12,alignItems:'center',padding:'10px 14px',background:'#F0FDF4',borderRadius:12}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#0B7A3B',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,flexShrink:0}}>1</div>
            <div style={{fontSize:13}}>Bonyeza icon ya <b>Share</b> 🔗 chini ya Safari</div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center',padding:'10px 14px',background:'#F0FDF4',borderRadius:12}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#0B7A3B',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,flexShrink:0}}>2</div>
            <div style={{fontSize:13}}>Telezesha chini, chagua <b>"Add to Home Screen"</b> ➕</div>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center',padding:'10px 14px',background:'#F0FDF4',borderRadius:12}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#0B7A3B',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,flexShrink:0}}>3</div>
            <div style={{fontSize:13}}>Bonyeza <b>"Add"</b> kona ya juu kulia ✅</div>
          </div>
        </div>
        
        <button onClick={()=>{setShowIOSGuide(false);handleDismiss()}} style={{
          width:'100%',marginTop:18,padding:14,background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
          color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'
        }}>Nimeelewa</button>
      </div>
    </div>;
  }

  // Bottom slide-up install banner
  return <div style={{
    position:'fixed',bottom:20,left:20,right:20,zIndex:9998,
    maxWidth:480,margin:'0 auto',
    background:'linear-gradient(135deg,#fff,#F0FDF4)',
    borderRadius:16,padding:16,
    boxShadow:'0 12px 40px rgba(11,122,59,0.25)',
    border:'1.5px solid #BBF7D0',
    animation:'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)'
  }}>
    <div style={{display:'flex',gap:12,alignItems:'center'}}>
      <div style={{
        width:52,height:52,borderRadius:12,
        background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:'0 6px 20px rgba(11,122,59,0.3)',flexShrink:0
      }}>
        <img src="/logo.png" alt="" style={{width:32,height:32,borderRadius:8}}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:900,fontSize:14,color:'#0B7A3B',marginBottom:2}}>📱 Sakinisha App!</div>
        <div style={{fontSize:11,color:'#64748B'}}>Pata uzoefu wa simu, fanya kazi popote</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <button onClick={handleInstall} style={{
          padding:'10px 18px',background:'#0B7A3B',color:'#fff',border:'none',
          borderRadius:10,fontWeight:800,fontSize:12,cursor:'pointer',
          whiteSpace:'nowrap',boxShadow:'0 4px 12px rgba(11,122,59,0.3)'
        }}>{isIOS?'📥 Sakinisha':'📥 Sakinisha'}</button>
        <button onClick={handleDismiss} style={{
          padding:'4px',background:'transparent',color:'#94A3B8',
          border:'none',fontSize:11,cursor:'pointer'
        }}>Si sasa</button>
      </div>
    </div>
    
    <style>{`
      @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes scaleIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}
    `}</style>
  </div>;
}

// ============================================
// ONLINE/OFFLINE STATUS BAR
// ============================================
export function OnlineStatusBar(){
  const[isOnline,setIsOnline]=useState(navigator.onLine);
  const[showOffline,setShowOffline]=useState(false);
  const[justBackOnline,setJustBackOnline]=useState(false);

  useEffect(()=>{
    const handleOnline=()=>{
      setIsOnline(true);
      setShowOffline(false);
      setJustBackOnline(true);
      setTimeout(()=>setJustBackOnline(false),3000);
    };
    const handleOffline=()=>{
      setIsOnline(false);
      setShowOffline(true);
    };
    window.addEventListener('online',handleOnline);
    window.addEventListener('offline',handleOffline);
    return()=>{
      window.removeEventListener('online',handleOnline);
      window.removeEventListener('offline',handleOffline);
    };
  },[]);

  if(!showOffline&&!justBackOnline)return null;

  return <div style={{
    position:'fixed',top:0,left:0,right:0,zIndex:9997,
    padding:'10px 16px',textAlign:'center',
    background:isOnline?'linear-gradient(135deg,#22C55E,#16A34A)':'linear-gradient(135deg,#EF4444,#DC2626)',
    color:'#fff',fontWeight:700,fontSize:13,
    boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
    animation:'slideDown 0.3s ease-out',
    paddingTop:'calc(10px + env(safe-area-inset-top))'
  }}>
    {isOnline?'✅ Umerudi mtandaoni!':'📡 Hakuna mtandao — Unafanya kazi offline'}
    <style>{`@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}`}</style>
  </div>;
}
