import React from 'react';

// ============================================================
// VIPENGELE VYA PAMOJA VYA UKURASA
// Hutumika na akaunti zote (Mhasibu, Admin, Marketing...) ili
// kurasa zote zifanane — rangi za NAYA, mviringo, vivuli.
// ============================================================

// Kichwa cha ukurasa: aikoni + jina + maelezo mafupi + vitendo
export function PageHead({icon,title,sub,children}){
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:10,flexWrap:'wrap',marginBottom:16}}>
    <div>
      <h2 style={{fontSize:20,fontWeight:900,margin:'0 0 3px',color:'#0A6E47'}}>{icon} {title}</h2>
      {sub&&<p style={{fontSize:12.5,color:'#5C6A62',margin:0}}>{sub}</p>}
    </div>
    {children&&<div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>{children}</div>}
  </div>;
}

// Kitufe cha msingi (kijani cha NAYA)
export const GBtn=({children,...p})=><button className="ripple" {...p} style={{padding:'9px 18px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 6px 16px rgba(10,110,71,.25)',...(p.style||{})}}>{children}</button>;

// Input ya mwezi
export const MonthIn=p=><input type="month" {...p} style={{padding:'9px 12px',borderRadius:12,border:'1.5px solid #D6E2DB',fontSize:13,background:'#fff',color:'#17231D'}}/>;

// Kadi ya muhtasari (KPI). Namba ndefu hujipunguza ili zisikatike mstari.
export function SumCard({label,value,color='#0A6E47',hint}){
  const s=String(value??'');
  const fs=s.length>13?12.5:s.length>10?14.5:s.length>7?17:21;
  return <div className="card" style={{padding:'14px 10px',textAlign:'center'}}>
    <div style={{fontSize:9.5,color:'#5C6A62',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>{label}</div>
    <div style={{fontSize:fs,fontWeight:900,color,marginTop:3,letterSpacing:'-.5px',whiteSpace:'nowrap'}}>{value}</div>
    {hint&&<div style={{fontSize:10,color:'#9AA5A0',marginTop:2}}>{hint}</div>}
  </div>;
}

// Kadi kubwa ya kijani (hero) — kwa takwimu kuu ya ukurasa
// `tone` ni ya hiari; bila yo ni kijani kama zamani kwenye kurasa zote.
// Hasara haipaswi kuonekana kijani — ni ujumbe tofauti kabisa.
export function HeroCard({label,value,pill,children,sub,tone}){
  const red=tone==='red';
  return <div style={{background:red?'linear-gradient(140deg,#8C2C1E,#C2412D)':'linear-gradient(140deg,#06502F,#0A6E47)',borderRadius:22,padding:'22px',marginBottom:14,color:'#fff',boxShadow:red?'0 14px 34px rgba(194,65,45,.28)':'0 14px 34px rgba(10,110,71,.28)',position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',right:-30,top:-30,width:150,height:150,borderRadius:'50%',background:'rgba(242,183,5,.12)'}}/>
    <div style={{position:'relative'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,opacity:.85,letterSpacing:1}}>{label}</div>
          <div style={{fontSize:34,fontWeight:900,letterSpacing:'-1px',margin:'2px 0',lineHeight:1.1}}>{value}</div>
          {sub&&<div style={{fontSize:12,opacity:.85}}>{sub}</div>}
        </div>
        {pill&&<span style={{background:'rgba(255,255,255,.18)',padding:'6px 13px',borderRadius:20,fontSize:12,fontWeight:800,whiteSpace:'nowrap'}}>{pill}</span>}
      </div>
      {children}
    </div>
  </div>;
}

// Safu ya takwimu ndogo ndani ya HeroCard
export function HeroStats({items}){
  return <div style={{display:'flex',gap:10,marginTop:18,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.18)'}}>
    {items.map((it,i)=><div key={i} style={{flex:1,minWidth:0}}>
      <div style={{fontSize:9.5,opacity:.8,fontWeight:700}}>{it.l}</div>
      <div style={{fontSize:15.5,fontWeight:800,whiteSpace:'nowrap',color:it.c||'#fff'}}>{it.v}</div>
    </div>)}
  </div>;
}
