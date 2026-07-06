import React from 'react';
const S = (d) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
export const IC = {
  home:S(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
  box:S(<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>),
  cart:S(<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></>),
  chart:S(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
  wallet:S(<><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>),
  users:S(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>),
  bell:S(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>),
  gear:S(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>),
  key:S(<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>),
  store:S(<><path d="M3 3h18l-2 13H5L3 3z"/><path d="M7.5 16v5"/><path d="M16.5 16v5"/><path d="M4 21h16"/></>),
  out:S(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
  plus:S(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  x:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ok:S(<polyline points="20 6 9 17 4 12"/>),
  del:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  find:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  minus:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  gift:S(<><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></>),
  warn:S(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  menu:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  people:S(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></>),
  lock:S(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>),
  globe:S(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>),
  wifi:S(<><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></>),
  wifiOff:S(<><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></>),
  dl:S(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>),
  send:S(<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>),
  clock:S(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>),
  shield:S(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>),
  file:S(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
  eye:S(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>),
  star:S(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>),
  dollar:S(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>),
  refresh:S(<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>),
};

// ===== INPUT =====
export function Input({label,style,...p}){
  return <div style={{marginBottom:12}}>{label&&<label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:5,transition:'color 0.2s'}}>{label}</label>}<input {...p} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',background:'#FAFBFC',boxSizing:'border-box',transition:'all 0.3s cubic-bezier(.4,0,.2,1)',...style}}/></div>;
}

// ===== PASSWORD INPUT (na kitufe cha jicho) =====
export function PasswordInput({label,style,...p}){
  const [show,setShow]=React.useState(false);
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:5}}>{label}</label>}
    <div style={{position:'relative'}}>
      <input {...p} type={show?'text':'password'} style={{width:'100%',padding:'11px 44px 11px 14px',borderRadius:12,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',background:'#FAFBFC',boxSizing:'border-box',transition:'all 0.3s cubic-bezier(.4,0,.2,1)',...style}}/>
      <button type="button" onClick={()=>setShow(s=>!s)} tabIndex={-1} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:18,padding:6,lineHeight:1,opacity:0.6}} title={show?'Ficha password':'Onyesha password'}>
        {show?'🙈':'👁️'}
      </button>
    </div>
  </div>;
}

// ===== SELECT =====
export function Sel({label,options=[],...p}){
  return <div style={{marginBottom:12}}>{label&&<label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:4}}>{label}</label>}<select {...p} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',background:'#F8FAFC',boxSizing:'border-box'}}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}

// ===== TEXTAREA =====
export function Area({label,...p}){
  return <div style={{marginBottom:12}}>{label&&<label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:4}}>{label}</label>}<textarea {...p} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:14,outline:'none',background:'#F8FAFC',boxSizing:'border-box',minHeight:80,resize:'vertical'}}/></div>;
}

// ===== BUTTON =====
const BV={primary:{background:'#0B7A3B',color:'#fff'},danger:{background:'#EF4444',color:'#fff'},ghost:{background:'#F1F5F9',color:'#475569'},outline:{background:'transparent',color:'#0B7A3B',border:'1.5px solid #0B7A3B'},warning:{background:'#F59E0B',color:'#fff'},blue:{background:'#3B82F6',color:'#fff'}};
export function Btn({children,v='primary',style:s,disabled,...p}){
  return <button {...p} disabled={disabled} style={{padding:'10px 20px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,display:'inline-flex',alignItems:'center',gap:6,opacity:disabled?.5:1,...BV[v],...s}}>{children}</button>;
}

// ===== MODAL =====
export function Modal({open,onClose,title,children,wide}){
  if(!open) return null;
  return <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:8000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
    <div className="modal-content" onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:wide?780:460,maxHeight:'88vh',overflow:'auto',boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 22px',borderBottom:'1px solid #F1F5F9',position:'sticky',top:0,background:'#fff',borderRadius:'20px 20px 0 0',zIndex:1}}>
        <h3 style={{margin:0,fontSize:17,fontWeight:800,color:'#1E293B'}}>{title}</h3>
        <button onClick={onClose} style={{background:'#F1F5F9',border:'none',borderRadius:10,padding:'6px 8px',color:'#64748B',transition:'all 0.2s'}}>{IC.x}</button>
      </div>
      <div style={{padding:22}}>{children}</div>
    </div>
  </div>;
}

// ===== STAT CARD =====
export function Stat({icon,label,value,color='#0B7A3B',sub,trend}){
  return <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',flex:'1 1 160px',minWidth:140,boxShadow:'0 1px 3px rgba(0,0,0,.04)',borderLeft:`4px solid ${color}`,transition:'all 0.3s cubic-bezier(.4,0,.2,1)',cursor:'default'}} onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 25px rgba(0,0,0,.1)'}} onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,.04)'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
      <span style={{color,transition:'transform 0.3s'}}>{icon}</span>
      <span style={{fontSize:11,color:'#94A3B8',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>{label}</span>
      {trend!==undefined&&<span style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:trend>=0?'#22C55E':'#EF4444',animation:'countUp 0.5s ease both'}}>{trend>=0?'↑':'↓'}{Math.abs(trend)}%</span>}
    </div>
    <div className="stat-value" style={{fontSize:22,fontWeight:800,color:'#1E293B'}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{sub}</div>}
  </div>;
}

// ===== NOTIFICATION POPUP =====
export function NotifPopup({items,onDismiss,onClear}){
  if(!items?.length) return null;
  const c=(t)=>({bg:t==='danger'?'#FEF2F2':t==='warning'?'#FFF7ED':'#F0FDF4',bd:t==='danger'?'#FECACA':t==='warning'?'#FED7AA':'#BBF7D0',ac:t==='danger'?'#EF4444':t==='warning'?'#F59E0B':'#22C55E',em:t==='danger'?'🚨':t==='warning'?'⚠️':'✅'});
  return <div style={{position:'fixed',top:12,right:12,zIndex:9999,display:'flex',flexDirection:'column',gap:8,maxWidth:380,width:'calc(100% - 24px)'}}>
    {items.slice(0,4).map((n,i)=>{const s=c(n.type);return <div key={n.id} className="toast-enter" style={{background:s.bg,border:`1px solid ${s.bd}`,borderLeft:`4px solid ${s.ac}`,borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:10,boxShadow:'0 8px 30px rgba(0,0,0,0.12)',animationDelay:`${i*0.08}s`}}>
      <span style={{fontSize:22,lineHeight:1}}>{s.em}</span>
      <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:'#1E293B',marginBottom:3}}>{n.title}</div><div style={{fontSize:12,color:'#64748B',lineHeight:1.5}}>{n.message}</div></div>
      <button onClick={()=>onDismiss(n.id)} style={{background:'none',border:'none',color:'#94A3B8',padding:4,borderRadius:6}}>{IC.x}</button>
    </div>})}
    {items.length>1&&<button onClick={onClear} style={{background:'#1E293B',color:'#fff',border:'none',borderRadius:10,padding:'10px 18px',fontSize:12,alignSelf:'flex-end',fontWeight:700,boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>Ondoa Zote ({items.length})</button>}
  </div>;
}

// ===== BADGE =====
export function Badge({children,color='#0B7A3B',bg}){
  return <span style={{fontSize:11,padding:'3px 10px',borderRadius:6,fontWeight:600,background:bg||`${color}15`,color}}>{children}</span>;
}

// ===== TABS =====
export function Tabs({tabs,active,onChange}){
  return <div style={{display:'flex',background:'#F1F5F9',borderRadius:14,padding:4,marginBottom:16}}>
    {tabs.map(t=><button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:'9px 12px',borderRadius:11,border:'none',fontWeight:700,fontSize:13,background:active===t.id?'#fff':'transparent',color:active===t.id?'#0B7A3B':'#94A3B8',boxShadow:active===t.id?'0 2px 10px rgba(0,0,0,.06)':'none',transition:'all 0.25s cubic-bezier(.4,0,.2,1)'}}>{t.label}</button>)}
  </div>;
}

// ===== ONLINE STATUS =====
export function OnlineStatus({isOnline}){
  return <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:isOnline?'#22C55E':'#F59E0B',fontWeight:600}}>
    <div style={{width:8,height:8,borderRadius:'50%',background:isOnline?'#22C55E':'#F59E0B',animation:isOnline?'glow 3s infinite':'pulse 2s infinite',transition:'background 0.3s'}}/>
    {isOnline?'Online':'Offline'}
  </div>;
}

// ===== EMPTY STATE =====
export function Empty({icon='📭',text='Hakuna data'}){
  return <div style={{textAlign:'center',padding:40,color:'#94A3B8',animation:'fadeIn 0.5s ease both'}}><div style={{fontSize:48,marginBottom:12,animation:'popIn 0.4s cubic-bezier(.4,0,.2,1) both'}}>{icon}</div><div style={{fontSize:14,fontWeight:500}}>{text}</div></div>;
}

export const EMOJIS=['📦','🍬','🍚','🫗','🧼','🌾','🥛','🥤','🍞','🧴','🥫','🫘','🧈','🍺','🧹','💊','🔋','📱','🥚','🧃','🍕','🍎','🥬','🧀','🍗','🐟'];
