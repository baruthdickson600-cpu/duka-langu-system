import React,{useState,useMemo,useEffect} from 'react';
import {useApp} from '../context/AppContext';
import {Modal,Badge,Empty} from './UI';
import {TiketiMazungumzo} from './Tiketi';
import {
  haliLab,haliRangi,niWazi,tanguLini,imechelewa,kitengoLab,kipaumbeleLab,
} from '../utils/tiketi';

// ============================================================
// DukaLangu — TIKETI ZA KAZI (juu ya dashibodi)
//
// Haikai kwenye side bar. Tiketi iliyofichwa nyuma ya menyu ni
// tiketi isiyoshughulikiwa: mtu anafungua mfumo, anaona namba
// za mauzo, anatoka — na mteja anasubiri.
//
// Hapa inakuwa kitu cha KWANZA anachokiona, na tiketi
// zilizoingia tangu mara ya mwisho zinawekwa alama ya MPYA
// inayowaka mpaka azifungue.
// ============================================================

const G1='#0A6E47',INK='#17231D',MUT='#5C6A62',LINE='#D6E2DB',SOFT='#E6F2EC';
const NYEKUNDU='#C2412D',MANJANO='#B45309';

// Alama ya mwisho kuona — kwa kila mtumiaji peke yake
const ufunguo=u=>`tiketi_niliona_${u||'x'}`;
const somaAlama=(u)=>{try{return localStorage.getItem(ufunguo(u))||''}catch(_){return''}};
const wekaAlama=(u,t)=>{try{localStorage.setItem(ufunguo(u),t)}catch(_){}};

export default function TiketiKaziBar({onNav}){
  const{tickets=[],user,businesses=[]}=useApp();
  const[fungua,setFungua]=useState(false);
  const[soma,setSoma]=useState(null);
  const[niliona,setNiliona]=useState(()=>somaAlama(user?.id));

  const cheo=String(user?.role||'').trim().toLowerCase();

  // Wakala anaona za wateja wake pekee; wengine wanaona zote.
  const promoYa=useMemo(()=>{
    const m={};(businesses||[]).forEach(b=>{m[b.id]=b.promo_code||''});return m;
  },[businesses]);

  const zangu=useMemo(()=>{
    if(cheo!=='agent')return tickets||[];
    const code=user?.promo_code;
    if(!code)return [];
    return (tickets||[]).filter(t=>promoYa[t.business_id]===code);
  },[tickets,cheo,user,promoYa]);

  const wazi=useMemo(()=>
    zangu.filter(t=>niWazi(t.status))
      .sort((a,b)=>{
        // Dharura kwanza, kisha iliyochelewa, kisha mpya zaidi
        const da=a.priority==='urgent'?0:1, db=b.priority==='urgent'?0:1;
        if(da!==db)return da-db;
        const ca=imechelewa(a)?0:1, cb=imechelewa(b)?0:1;
        if(ca!==cb)return ca-cb;
        return String(b.created_at||'').localeCompare(String(a.created_at||''));
      }),[zangu]);

  const dharura=wazi.filter(t=>t.priority==='urgent').length;
  const zimechelewa=wazi.filter(t=>imechelewa(t)).length;
  const mpya=useMemo(()=>
    niliona?wazi.filter(t=>String(t.created_at||'')>niliona):wazi
  ,[wazi,niliona]);

  // Akizifungua, alama inasogea mbele
  const nimeona=()=>{
    const juu=zangu.reduce((m,t)=>{
      const c=String(t.created_at||'');return c>m?c:m;
    },'');
    if(juu){wekaAlama(user?.id,juu);setNiliona(juu)}
  };

  const rangi=dharura?NYEKUNDU:mpya.length?MANJANO:G1;

  return <>
    <style>{`@keyframes dlPigo{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

    <div style={{background:'#fff',border:`1px solid ${mpya.length?rangi+'55':LINE}`,borderRadius:18,
      marginBottom:16,overflow:'hidden',
      boxShadow:mpya.length?`0 4px 18px ${rangi}22`:'0 2px 8px rgba(10,110,71,.05)'}}>

      {/* ===== KICHWA ===== */}
      <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',
        background:mpya.length?rangi+'0C':'#fff'}}>
        <div style={{width:42,height:42,borderRadius:13,flex:'none',display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:20,background:rangi+'18',position:'relative'}}>
          🎧
          {mpya.length>0&&<span style={{position:'absolute',top:-4,right:-4,minWidth:20,height:20,
            borderRadius:999,background:rangi,color:'#fff',fontSize:11,fontWeight:900,
            display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px',
            animation:'dlPigo 1.4s ease-in-out infinite'}}>{mpya.length}</span>}
        </div>

        <div style={{flex:'1 1 180px',minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
            <span style={{fontSize:15,fontWeight:900,color:INK}}>Tiketi za Wateja</span>
            {mpya.length>0&&<Badge color={rangi}>MPYA {mpya.length}</Badge>}
          </div>
          <div style={{fontSize:12,color:MUT,marginTop:3}}>
            {wazi.length
              ?<>Wazi <b style={{color:INK}}>{wazi.length}</b>
                {dharura>0&&<> · dharura <b style={{color:NYEKUNDU}}>{dharura}</b></>}
                {zimechelewa>0&&<> · zimechelewa <b style={{color:MANJANO}}>{zimechelewa}</b></>}</>
              :'Hakuna tiketi wazi — wateja wote wako sawa.'}
          </div>
        </div>

        {wazi.length>0&&<button onClick={()=>{setFungua(v=>!v);if(!fungua)nimeona()}} style={{
          flex:'none',padding:'9px 16px',borderRadius:11,cursor:'pointer',fontSize:12.5,fontWeight:800,
          border:'none',background:rangi,color:'#fff'}}>
          {fungua?'Ficha':'Zifungue'}
        </button>}
      </div>

      {/* ===== ORODHA ===== */}
      {fungua&&<div style={{borderTop:`1px solid #F1F6F3`}}>
        {wazi.slice(0,6).map(t=>{
          const niMpya=niliona?String(t.created_at||'')>niliona:true;
          return <button key={t.id} onClick={()=>setSoma(t)} style={{
            width:'100%',textAlign:'left',border:'none',cursor:'pointer',
            borderBottom:'1px solid #F6F8F7',padding:'12px 16px',
            background:niMpya?SOFT+'88':'#fff',
            display:'flex',gap:11,alignItems:'flex-start',flexWrap:'wrap'}}>
            <div style={{width:7,height:7,borderRadius:999,marginTop:6,flex:'none',
              background:t.priority==='urgent'?NYEKUNDU:imechelewa(t)?MANJANO:G1}}/>
            <div style={{flex:'1 1 200px',minWidth:0}}>
              <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:11.5,fontWeight:800,color:G1}}>
                  {t.ticket_no||'—'}</span>
                <Badge color={haliRangi(t.status)}>{haliLab(t.status)}</Badge>
                {t.priority==='urgent'&&<Badge color={NYEKUNDU}>DHARURA</Badge>}
                {imechelewa(t)&&<Badge color={MANJANO}>Imechelewa</Badge>}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:INK,marginTop:3,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject||'(hakuna kichwa)'}</div>
              <div style={{fontSize:11,color:MUT,marginTop:2}}>
                {t.business_name||'Mteja'} · {kitengoLab(t.kitengo)} · {tanguLini(t.created_at)} iliyopita
              </div>
            </div>
          </button>;
        })}

        {wazi.length>6&&<div style={{padding:'10px 16px',fontSize:12,color:MUT}}>
          …na nyingine {wazi.length-6}
        </div>}

        {onNav&&<button onClick={()=>onNav('tickets')} style={{
          width:'100%',padding:'12px 16px',border:'none',cursor:'pointer',background:'#F6F8F7',
          fontSize:12.5,fontWeight:800,color:G1}}>
          Fungua foleni kamili →
        </button>}
      </div>}
    </div>

    <Modal open={!!soma} onClose={()=>setSoma(null)} title={soma?.ticket_no||'Tiketi'} wide>
      {soma&&<>
        <div style={{fontSize:14,fontWeight:800,color:INK,marginBottom:3}}>{soma.subject}</div>
        <div style={{fontSize:11.5,color:MUT,marginBottom:12}}>
          {soma.business_name||'Mteja'} · {kitengoLab(soma.kitengo)} · {kipaumbeleLab(soma.priority)}
          {soma.phone?` · ${soma.phone}`:''}
        </div>
        <TiketiMazungumzo t={soma}/>
      </>}
    </Modal>
  </>;
}
