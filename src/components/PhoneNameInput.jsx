import React,{useState,useEffect,useRef} from 'react';
import { API_BASE } from '../config/api';
import {Input} from './UI';

// ============================================================
// NAMBA YA SIMU YENYE KUJAZA JINA
// Mtu akiandika namba, jina la mmiliki linatoka lenyewe.
//
// Haliandiki juu ya jina alilolitandika mtu mwenyewe — linajaza tu
// kama sehemu ya jina ni tupu, au kama lililopo ni lile lile
// lililojazwa na mfumo awali.
// ============================================================
export default function PhoneNameInput({
  label='Namba ya Simu',
  value,
  onChange,
  onName,              // (jina) => void — huitwa jina likipatikana
  currentName='',      // jina lililopo sasa kwenye fomu
  placeholder='07XXXXXXXX',
  required=false,
  ...rest
}){
  const[state,setState]=useState('idle');   // idle | loading | found | notfound
  const[found,setFound]=useState('');
  const lastFilled=useRef('');

  useEffect(()=>{
    const num=String(value||'').replace(/\D/g,'');
    setFound('');setState('idle');
    // Namba ikibadilika, ondoa jina tulilolijaza awali — lisibaki
    // likionyesha mmiliki wa namba ya zamani.
    const clearOurs=()=>{
      if(lastFilled.current&&String(currentName||'').trim()===lastFilled.current){
        lastFilled.current='';
        onName?.('');
      }
    };
    if(num.length<9){clearOurs();return}
    let cancelled=false;
    setState('loading');
    const t=setTimeout(async()=>{
      try{
        const r=await fetch(API_BASE+'/api/payments?action=name_lookup&phone='+encodeURIComponent(value));
        const d=await r.json();
        if(cancelled)return;
        if(d.success&&d.name){
          setFound(d.name);setState('found');
          // Jaza tu kama hakuna jina, au lililopo ni letu la awali
          const cur=String(currentName||'').trim();
          if(!cur||cur===lastFilled.current){
            lastFilled.current=d.name;
            onName?.(d.name);
          }
        }else{setState('notfound');clearOurs()}
      }catch{if(!cancelled){setState('notfound');clearOurs()}}
    },700);
    return()=>{cancelled=true;clearTimeout(t)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[value]);

  return <div>
    <Input label={label+(required?' *':'')} value={value} onChange={onChange} placeholder={placeholder} {...rest}/>
    {state==='loading'&&<div style={{fontSize:11.5,color:'#5C6A62',margin:'-8px 0 10px'}}>🔎 Inaangalia jina...</div>}
    {state==='found'&&<div style={{fontSize:11.5,color:'#0A6E47',margin:'-8px 0 10px',fontWeight:600}}>✅ {found}</div>}
    {state==='notfound'&&<div style={{fontSize:11.5,color:'#9AA5A0',margin:'-8px 0 10px'}}>Jina halikupatikana — andika mwenyewe</div>}
  </div>;
}

// Hook ya kuangalia jina — kwa fomu zisizotumia <Input>
export function useNameLookup(phone){
  const[state,setState]=useState('idle');
  const[name,setName]=useState('');
  useEffect(()=>{
    const num=String(phone||'').replace(/\D/g,'');
    setName('');setState('idle');
    if(num.length<9)return;
    let cancelled=false;
    setState('loading');
    const t=setTimeout(async()=>{
      try{
        const r=await fetch(API_BASE+'/api/payments?action=name_lookup&phone='+encodeURIComponent(phone));
        const d=await r.json();
        if(cancelled)return;
        if(d.success&&d.name){setName(d.name);setState('found')}
        else setState('notfound');
      }catch{if(!cancelled)setState('notfound')}
    },700);
    return()=>{cancelled=true;clearTimeout(t)};
  },[phone]);
  return{name,state};
}

// Mstari mdogo wa hali (kwa fomu zisizotumia <Input>)
export function NameHint({state,name}){
  if(state==='loading')return <div style={{fontSize:11.5,color:'#5C6A62',marginTop:4}}>🔎 Inaangalia jina...</div>;
  if(state==='found')return <div style={{fontSize:11.5,color:'#0A6E47',marginTop:4,fontWeight:600}}>✅ {name}</div>;
  if(state==='notfound')return <div style={{fontSize:11.5,color:'#9AA5A0',marginTop:4}}>Jina halikupatikana — andika mwenyewe</div>;
  return null;
}
