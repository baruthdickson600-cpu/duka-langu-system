import React from 'react';

// ============================================================
// AnimatedLogo — Logo halisi ya DukaLangu yenye animation ya kuvutia.
// Awning inashuka, mkokoteni + risiti vinaonekana, jina linaingia,
// na mng'ao wa kijani unazunguka. Tumia kwenye splash/loader.
// size = upana wa SVG (px). withWordmark = onyesha "Duka Langu".
// ============================================================
export default function AnimatedLogo({size=120,withWordmark=true,loading=false}){
  const uid=React.useId().replace(/:/g,'');
  return <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:14}}>
    <style>{`
      @keyframes dl-glow-${uid}{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      @keyframes dl-drop-${uid}{0%{transform:translateY(-16px) scaleY(0.4);opacity:0}60%{transform:translateY(2px) scaleY(1.05);opacity:1}100%{transform:translateY(0) scaleY(1);opacity:1}}
      @keyframes dl-rise-${uid}{0%{transform:translateY(14px);opacity:0}100%{transform:translateY(0);opacity:1}}
      @keyframes dl-draw-${uid}{0%{stroke-dashoffset:120}100%{stroke-dashoffset:0}}
      @keyframes dl-pop-${uid}{0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
      @keyframes dl-word-${uid}{0%{opacity:0;transform:translateX(-10px)}100%{opacity:1;transform:translateX(0)}}
      @keyframes dl-float-${uid}{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      @keyframes dl-pulse-${uid}{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.6;transform:scale(1.08)}}
      .dl-wrap-${uid}{position:relative;display:inline-flex;align-items:center;gap:${Math.round(size*0.14)}px;animation:dl-float-${uid} 4.5s ease-in-out infinite ${loading?'':''}}
      .dl-glowring-${uid}{position:absolute;left:${-size*0.18}px;top:50%;width:${size*1.35}px;height:${size*1.35}px;transform:translateY(-50%);z-index:0;background:conic-gradient(from 0deg,transparent,rgba(74,222,128,.55),transparent 55%);border-radius:50%;filter:blur(14px);animation:dl-glow-${uid} 3.2s linear infinite;opacity:${loading?0.9:0}}
      .dl-haze-${uid}{position:absolute;left:${-size*0.1}px;top:50%;width:${size*1.1}px;height:${size*1.1}px;transform:translateY(-50%);z-index:0;background:radial-gradient(circle,rgba(34,197,94,.18),transparent 68%);filter:blur(16px);animation:dl-pulse-${uid} 3s ease-in-out infinite}
      .dl-awning-${uid}{transform-origin:center top;animation:dl-drop-${uid} .7s cubic-bezier(.34,1.3,.64,1) both}
      .dl-body-${uid}{animation:dl-rise-${uid} .6s ease .25s both}
      .dl-cart-${uid}{stroke-dasharray:120;animation:dl-draw-${uid} .9s ease .55s both,dl-pop-${uid} .5s ease .55s both}
      .dl-receipt-${uid}{transform-origin:center;animation:dl-pop-${uid} .55s cubic-bezier(.34,1.3,.64,1) .7s both}
      .dl-w1-${uid}{display:block;animation:dl-word-${uid} .5s ease .85s both}
      .dl-w2-${uid}{display:block;animation:dl-word-${uid} .5s ease 1s both}
      .dl-dots-${uid}{animation:dl-pulse-${uid} 1.2s ease-in-out infinite}
    `}</style>
    <div className={`dl-wrap-${uid}`}>
      <div className={`dl-haze-${uid}`}/>
      {loading&&<div className={`dl-glowring-${uid}`}/>}
      {/* ICON */}
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{position:'relative',zIndex:1,overflow:'visible'}}>
        <defs>
          <linearGradient id={`gdark${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E7A3C"/><stop offset="1" stopColor="#0E5E2A"/></linearGradient>
        </defs>

        {/* ===== DUKA BODY + RISITI (zinainuka) ===== */}
        <g className={`dl-body-${uid}`}>
          {/* storefront body */}
          <path d="M22 52 h58 v40 a6 6 0 0 1 -6 6 H28 a6 6 0 0 1 -6 -6 Z" fill={`url(#gdark${uid})`}/>
          {/* receipt (nyeupe, ncha za zigzag) */}
          <g className={`dl-receipt-${uid}`}>
            <path d="M64 58 h30 v46 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 z" fill="#fff" stroke="#0E5E2A" strokeWidth="2.5" strokeLinejoin="round"/>
            <g stroke="#1E7A3C" strokeWidth="3" strokeLinecap="round"><path d="M72 70 H86"/><path d="M72 78 H86"/><path d="M72 86 H82"/></g>
          </g>
        </g>

        {/* ===== CART (inachorwa) ===== */}
        <g className={`dl-cart-${uid}`} stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M30 64 H37 L42 86 H62 L67 70 H40"/>
          <circle cx="45" cy="92" r="2.4" fill="#fff" stroke="none"/>
          <circle cx="60" cy="92" r="2.4" fill="#fff" stroke="none"/>
        </g>

        {/* ===== AWNING iliyopinda (inashuka) ===== */}
        <g className={`dl-awning-${uid}`}>
          {/* kivuli cha nyuma */}
          <path d="M14 52 L24 30 H96 L106 52 Z" fill="#0E5E2A"/>
          {/* scallops: kijani-nyeupe kubadilishana */}
          <g>
            <path d="M18 52 q7 8 14 0 V36 H18 Z" fill="#1E7A3C"/>
            <path d="M32 52 q7 8 14 0 V33 H32 Z" fill="#fff"/>
            <path d="M46 52 q7 8 14 0 V31 H46 Z" fill="#6CC04A"/>
            <path d="M60 52 q7 8 14 0 V31 H60 Z" fill="#fff"/>
            <path d="M74 52 q7 8 14 0 V33 H74 Z" fill="#6CC04A"/>
            <path d="M88 52 q7 8 14 0 V36 H88 Z" fill="#1E7A3C"/>
          </g>
          {/* mstari wa juu */}
          <path d="M24 30 H96 L100 40 H20 Z" fill="#1E7A3C"/>
        </g>
      </svg>

      {/* ===== WORDMARK ===== */}
      {withWordmark&&<div style={{position:'relative',zIndex:1,lineHeight:0.98,fontFamily:'Poppins,Inter,sans-serif',fontWeight:800}}>
        <span className={`dl-w1-${uid}`} style={{fontSize:size*0.34,color:'#1E7A3C'}}>Duka</span>
        <span className={`dl-w2-${uid}`} style={{fontSize:size*0.34,color:'#6CC04A'}}>Langu</span>
      </div>}
    </div>

    {loading&&<div className={`dl-dots-${uid}`} style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
      <span style={{width:7,height:7,borderRadius:'50%',background:'#1E7A3C'}}/>
      <span style={{width:7,height:7,borderRadius:'50%',background:'#6CC04A'}}/>
      <span style={{width:7,height:7,borderRadius:'50%',background:'#BBF7D0'}}/>
    </div>}
  </div>;
}
