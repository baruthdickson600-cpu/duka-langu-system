import React,{useState,useEffect,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {ombiLaAdmin} from '../../config/api';
import {Modal,Btn,Input,Sel,Badge,Empty} from '../../components/UI';
import {
  CHEO_ZA_KAZI,cheoCha,cheoLab,JINSIA,jinsiaLab,
  safishaSimu,simuNiSahihi,safishaNida,nidaOnyo,fmtNida,
  umri,dobOnyo,SAFU,andaaKuhifadhi,kosaLaKuhifadhi,
  ukamilifu,rangiYaUkamilifu,zilizokosekana,
} from '../../utils/wafanyakazi';

// ============================================================
// DukaLangu — WAFANYAKAZI
//
// Taarifa binafsi za wafanyakazi wa DukaLangu: NIDA, tarehe ya
// kuzaliwa, anwani, ndugu wa karibu. Zinaonekana kwa msimamizi
// pekee — ni data inayolindwa na Sheria ya Ulinzi wa Taarifa
// Binafsi ya 2022, si ya kuonyeshwa kila mtu.
//
// Kuna njia mbili za kumwondoa mtu:
//   AMEACHA KAZI — anazimwa. Haingii mfumoni, hapokei arifa,
//                  lakini historia yake inabaki.
//   FUTA KABISA  — safu yake inatoweka. Haiwezi kurudishwa.
// ============================================================

const G1='#0A6E47',G2='#06502F',INK='#17231D',MUT='#5C6A62',LINE='#D6E2DB',SOFT='#E6F2EC';

export default function WafanyakaziPage(){
  const{user}=useApp();
  const[watu,setWatu]=useState([]);
  const[inasoma,setInasoma]=useState(true);
  const[kosa,setKosa]=useState('');
  const[jibu,setJibu]=useState(null);
  const[hariri,setHariri]=useState(null);
  const[futa,setFuta]=useState(null);
  const[tafuta,setTafuta]=useState('');
  const[onyeshaWalioacha,setOnyeshaWalioacha]=useState(false);

  const pakua=async()=>{
    setInasoma(true);setKosa('');
    try{
      const{data,error}=await supabase.from('users').select('*');
      if(error){setKosa(error.message);setWatu([])}
      else{
        const wote=data||[];
        const kazi=wote.filter(u=>CHEO_ZA_KAZI.includes(cheoCha(u)));
        setWatu(kazi);
        if(!kazi.length){
          const vyeo=[...new Set(wote.map(u=>u.role).filter(Boolean))];
          setKosa(wote.length
            ?`Nimesoma watumiaji ${wote.length}, hakuna mwenye cheo cha kazi. Vyeo vilivyopo: ${vyeo.join(', ')||'(hakuna)'}`
            :'Hakuna mtumiaji aliyerudishwa — inawezekana kinga (RLS) inakuzuia.');
        }
      }
    }catch(e){setKosa(e.message)}
    setInasoma(false);
  };
  useEffect(()=>{pakua()},[]);

  const hai=useMemo(()=>watu.filter(u=>u.is_active!==false),[watu]);
  const walioacha=useMemo(()=>watu.filter(u=>u.is_active===false),[watu]);
  const chuja=l=>{
    if(!tafuta)return l;
    const q=tafuta.toLowerCase();
    return l.filter(u=>[u.name,u.email,u.phone,u.nida,u.cheo_kazi]
      .some(x=>String(x||'').toLowerCase().includes(q)));
  };

  const badiliHali=async(u,washa)=>{
    const swali=washa
      ?`Mrudishe ${u.name||u.email} kazini?`
      :`${u.name||u.email} ameacha kazi?\n\nAtaacha kupokea SMS zote, NA hataweza kuingia mfumoni.\nHistoria ya kazi zake inabaki.`;
    if(!window.confirm(swali))return;
    try{
      const{error}=await supabase.from('users').update({is_active:washa}).eq('id',u.id);
      if(error)throw error;
      setWatu(p=>p.map(x=>x.id===u.id?{...x,is_active:washa}:x));
      setJibu({ok:true,text:washa?'Amerudishwa kazini.':'Ameondolewa — hatapokea arifa tena.'});
    }catch(e){setJibu({ok:false,text:'Imeshindikana: '+e.message})}
  };

  // Kufuta kunapitia server (service_role): safu ya users PEKEE
  // haitoshi — akaunti ya kuingia ingebaki, na aliyefutwa angeweza
  // kuingia tena na kuanzisha duka jipya.
  const futaKabisa=async(u)=>{
    try{
      const{d}=await ombiLaAdmin(supabase,{action:'delete_employee',emp_id:u.id,emp_email:u.email});
      if(!d?.success)return{error:d?.error||'Imeshindikana kufuta.'};
      setWatu(p=>p.filter(x=>x.id!==u.id));
      setFuta(null);
      setJibu({ok:true,text:`${u.name||u.email} amefutwa kabisa — safu na akaunti ya kuingia.`});
      return{ok:true};
    }catch(e){return{error:'Tatizo la mtandao: '+e.message}}
  };

  const hifadhi=async(f)=>{
    const k=kosaLaKuhifadhi(f);
    if(k)return{error:k};
    try{
      const{error}=await supabase.from('users').update(andaaKuhifadhi(f)).eq('id',f.id);
      if(error)return{error:error.message};
      setWatu(p=>p.map(x=>x.id===f.id?{...x,...andaaKuhifadhi(f)}:x));
      setJibu({ok:true,text:'Taarifa zimehifadhiwa.'});
      return{ok:true};
    }catch(e){return{error:e.message}}
  };

  const wasiokamilika=hai.filter(u=>ukamilifu(u)<100).length;

  return <div className="page-enter">
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:21,fontWeight:900,color:G1,margin:'0 0 3px'}}>👤 Wafanyakazi</h2>
      <p style={{fontSize:12,color:MUT,margin:0}}>Taarifa binafsi za timu ya DukaLangu — zinaonekana kwako pekee</p>
    </div>

    {jibu&&<div style={{background:jibu.ok?SOFT:'#FBECE9',color:jibu.ok?'#15803D':'#B91C1C',
      padding:'10px 14px',borderRadius:11,marginBottom:12,fontWeight:600,fontSize:13}}>{jibu.text}</div>}

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:14}}>
      <Kadi lab="Wanaofanya kazi" n={hai.length} rangi={G1}/>
      <Kadi lab="Wasio na taarifa kamili" n={wasiokamilika} rangi={wasiokamilika?'#B45309':'#9AA5A0'}/>
      <Kadi lab="Walioacha kazi" n={walioacha.length} rangi={MUT}/>
    </div>

    <div className="card" style={{marginBottom:12,padding:'12px 14px'}}>
      <Input placeholder="Tafuta jina, simu, NIDA au cheo…" value={tafuta} onChange={e=>setTafuta(e.target.value)}/>
    </div>

    <div className="card" style={{padding:0,overflow:'hidden'}}>
      {chuja(hai).map(u=>{
        const p=ukamilifu(u),mimi=u.id===user?.id;
        return <div key={u.id} style={{padding:'13px 15px',borderBottom:`1px solid #F1F6F3`,
          display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
          <Chembe jina={u.name||u.email}/>
          <div style={{minWidth:0,flex:'1 1 220px'}}>
            <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:14,fontWeight:800,color:INK}}>{u.name||u.email}</span>
              <Badge color={G1}>{cheoLab(cheoCha(u))}</Badge>
              {mimi&&<Badge color={MUT}>wewe</Badge>}
            </div>
            <div style={{fontSize:11.5,color:MUT,marginTop:3,lineHeight:1.7}}>
              <span style={{fontFamily:'ui-monospace,Menlo,monospace',color:u.phone?MUT:'#C2412D'}}>
                {u.phone||'hana simu'}
              </span>
              {u.cheo_kazi?` · ${u.cheo_kazi}`:''}
              {u.nida?<> · NIDA {fmtNida(u.nida)}</>:<span style={{color:'#B45309'}}> · hana NIDA</span>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:7}}>
              <div style={{flex:'0 0 110px',height:5,borderRadius:999,background:'#EEF3F0',overflow:'hidden'}}>
                <div style={{width:p+'%',height:'100%',background:rangiYaUkamilifu(p),transition:'width .2s'}}/>
              </div>
              <span style={{fontSize:10.5,fontWeight:700,color:rangiYaUkamilifu(p)}}>{p}% imejazwa</span>
            </div>
          </div>
          <div style={{display:'flex',gap:6,flex:'none',flexWrap:'wrap'}}>
            <Btn v="ghost" style={{padding:'6px 12px',fontSize:11.5}} onClick={()=>setHariri(u)}>Hariri</Btn>
            {!mimi&&<Btn v="ghost" style={{padding:'6px 12px',fontSize:11.5,color:'#B45309'}}
              onClick={()=>badiliHali(u,false)}>Ameacha kazi</Btn>}
          </div>
        </div>;
      })}
      {!inasoma&&!chuja(hai).length&&<div style={{padding:'26px 0'}}>
        <Empty icon="👤" text={tafuta?'Hakuna anayelingana na utafutaji':'Hakuna mfanyakazi'}/>
      </div>}
      {inasoma&&<div style={{padding:'20px 15px',fontSize:12.5,color:MUT}}>Inasoma…</div>}
    </div>

    {kosa&&<div style={{background:'#FBECE9',borderRadius:11,padding:'10px 14px',marginTop:12,
      fontSize:12,color:'#B91C1C',lineHeight:1.6}}>{kosa}</div>}

    {/* ===== WALIOACHA KAZI ===== */}
    {walioacha.length>0&&<div className="card" style={{marginTop:12}}>
      <button onClick={()=>setOnyeshaWalioacha(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',
        padding:0,fontSize:12.5,fontWeight:800,color:MUT}}>
        {onyeshaWalioacha?'▾':'▸'} Walioacha kazi ({walioacha.length})
      </button>
      {onyeshaWalioacha&&<div style={{marginTop:10}}>
        <div style={{fontSize:11,color:MUT,marginBottom:9,lineHeight:1.6}}>
          Hawaingii mfumoni wala hawapokei arifa. Historia yao ya kazi bado inaonekana kwenye tiketi.
        </div>
        {chuja(walioacha).map(u=>(
          <div key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',
            borderTop:`1px solid #F1F6F3`,flexWrap:'wrap'}}>
            <div style={{flex:'1 1 180px',minWidth:0}}>
              <span style={{fontSize:13,color:INK,textDecoration:'line-through'}}>{u.name||u.email}</span>
              <span style={{fontSize:11,color:MUT,marginLeft:8}}>{cheoLab(cheoCha(u))}</span>
            </div>
            <div style={{display:'flex',gap:6,flex:'none'}}>
              <Btn v="ghost" style={{padding:'5px 11px',fontSize:11,color:G1}} onClick={()=>badiliHali(u,true)}>Mrudishe</Btn>
              <Btn v="ghost" style={{padding:'5px 11px',fontSize:11,color:'#C2412D'}} onClick={()=>setFuta(u)}>Futa kabisa</Btn>
            </div>
          </div>
        ))}
      </div>}
    </div>}

    <HaririMfanyakazi row={hariri} onClose={()=>setHariri(null)} onSave={hifadhi}/>
    <FutaKabisa u={futa} onClose={()=>setFuta(null)} onFuta={futaKabisa}/>
  </div>;
}

const herufiZa=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';
const Chembe=({jina})=>(
  <div style={{width:38,height:38,borderRadius:13,flex:'none',display:'flex',alignItems:'center',
    justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',
    background:`linear-gradient(135deg,${G1},${G2})`}}>{herufiZa(jina)}</div>
);

function Kadi({lab,n,rangi}){
  return <div style={{background:'#fff',border:`1px solid ${LINE}`,borderRadius:14,padding:'12px 14px'}}>
    <div style={{fontSize:10,fontWeight:800,color:MUT,letterSpacing:'.1em',textTransform:'uppercase'}}>{lab}</div>
    <div style={{fontSize:26,fontWeight:900,color:rangi,lineHeight:1.15,marginTop:3}}>{n}</div>
  </div>;
}

// ============================================================
// FOMU YA TAARIFA
// ============================================================
function HaririMfanyakazi({row,onClose,onSave}){
  const[f,setF]=useState(row||{});
  const[busy,setBusy]=useState(false);
  const[kosa,setKosa]=useState('');
  useEffect(()=>{setF(row||{});setKosa('')},[row]);
  if(!row)return null;

  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const onyoNida=nidaOnyo(f.nida);
  const onyoDob=dobOnyo(f.tarehe_kuzaliwa);
  const u=umri(f.tarehe_kuzaliwa);
  const p=ukamilifu(f);
  const pungufu=zilizokosekana(f);

  const tuma=async()=>{
    setBusy(true);setKosa('');
    const r=await onSave(f);
    if(r?.error)setKosa(r.error);else onClose();
    setBusy(false);
  };

  return <Modal open onClose={onClose} title={row.name||row.email} wide>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
      <div style={{flex:1,height:6,borderRadius:999,background:'#EEF3F0',overflow:'hidden'}}>
        <div style={{width:p+'%',height:'100%',background:rangiYaUkamilifu(p),transition:'width .2s'}}/>
      </div>
      <span style={{fontSize:11.5,fontWeight:800,color:rangiYaUkamilifu(p),flex:'none'}}>{p}%</span>
    </div>
    {pungufu.length>0&&<div style={{fontSize:11,color:MUT,marginBottom:12,lineHeight:1.6}}>
      Hazijajazwa: {pungufu.join(', ')}
    </div>}

    <Sehemu>Utambulisho</Sehemu>
    <Input label="Jina kamili" value={f.name||''} onChange={e=>set('name',e.target.value)}/>
    <Input label="Namba ya simu" value={f.phone||''} onChange={e=>set('phone',safishaSimu(e.target.value))} placeholder="0713000000"/>
    {f.phone&&!simuNiSahihi(f.phone)&&<Onyo bad>Namba si sahihi — tumia 0713000000 au 255713000000</Onyo>}

    <Input label="NIDA" value={f.nida||''} onChange={e=>set('nida',e.target.value)} placeholder="19900101-12345-00001-12"/>
    {onyoNida?<Onyo>{onyoNida}</Onyo>
      :f.nida?<div style={{fontSize:11,color:G1,marginTop:-6,marginBottom:10,fontFamily:'ui-monospace,Menlo,monospace'}}>{fmtNida(f.nida)}</div>:null}

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
      <div>
        <Input label="Tarehe ya kuzaliwa" type="date" value={f.tarehe_kuzaliwa||''} onChange={e=>set('tarehe_kuzaliwa',e.target.value)}/>
        {onyoDob?<Onyo>{onyoDob}</Onyo>
          :u!=null?<div style={{fontSize:11,color:MUT,marginTop:-6,marginBottom:10}}>Miaka {u}</div>:null}
      </div>
      <Sel label="Jinsia" value={f.jinsia||''} onChange={e=>set('jinsia',e.target.value||null)}
        options={[{value:'',label:'— Chagua —'},...Object.entries(JINSIA).map(([v,l])=>({value:v,label:l}))]}/>
    </div>
    <Input label="Anwani" value={f.anwani||''} onChange={e=>set('anwani',e.target.value)} placeholder="Mfano: Bomavillage, Urambo"/>

    <Sehemu>Kazi</Sehemu>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
      <Input label="Cheo cha kazi" value={f.cheo_kazi||''} onChange={e=>set('cheo_kazi',e.target.value)} placeholder="Mfano: Afisa Masoko Mkuu"/>
      <Input label="Tarehe ya kuanza" type="date" value={f.tarehe_kuanza||''} onChange={e=>set('tarehe_kuanza',e.target.value)}/>
    </div>

    <Sehemu>Ndugu wa karibu</Sehemu>
    <div style={{fontSize:11,color:MUT,marginTop:-4,marginBottom:9,lineHeight:1.6}}>
      Mtu wa kumfuata dharura ikitokea.
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
      <Input label="Jina" value={f.ndugu_jina||''} onChange={e=>set('ndugu_jina',e.target.value)}/>
      <div>
        <Input label="Namba ya simu" value={f.ndugu_simu||''} onChange={e=>set('ndugu_simu',safishaSimu(e.target.value))}/>
        {f.ndugu_simu&&!simuNiSahihi(f.ndugu_simu)&&<Onyo bad>Namba si sahihi</Onyo>}
      </div>
    </div>

    <Input label="Maelezo (hiari)" value={f.maelezo||''} onChange={e=>set('maelezo',e.target.value)}/>

    <div style={{background:'#F6F8F7',borderRadius:11,padding:'9px 12px',margin:'12px 0',fontSize:10.5,color:MUT,lineHeight:1.6}}>
      Taarifa hizi zinaonekana kwa msimamizi pekee. Ni data binafsi inayolindwa na sheria —
      isishirikishwe bila sababu ya kazi.
    </div>

    {kosa&&<div style={{background:'#FBECE9',color:'#C2412D',fontSize:12.5,fontWeight:600,
      padding:'9px 12px',borderRadius:10,marginBottom:10}}>{kosa}</div>}

    <div style={{display:'flex',gap:8}}>
      <Btn v="ghost" style={{flex:1}} onClick={onClose}>Acha</Btn>
      <Btn style={{flex:2}} disabled={busy} onClick={tuma}>{busy?'Inahifadhi…':'Hifadhi'}</Btn>
    </div>
  </Modal>;
}

const Sehemu=({children})=>(
  <div style={{fontSize:10,letterSpacing:'.14em',textTransform:'uppercase',color:'#93A49A',
    fontWeight:800,margin:'16px 0 9px'}}>{children}</div>
);
const Onyo=({children,bad})=>(
  <div style={{fontSize:11,color:bad?'#C2412D':'#B45309',marginTop:-6,marginBottom:10,lineHeight:1.5}}>{children}</div>
);

// ============================================================
// KUFUTA KABISA — hatua mbili kwa makusudi
//
// Mtu anapofutwa, safu yake inatoweka. Kitufe kimoja
// kisingetosha kwa kitendo kisichoweza kurudishwa.
// ============================================================
function FutaKabisa({u,onClose,onFuta}){
  const[andika,setAndika]=useState('');
  const[busy,setBusy]=useState(false);
  const[kosa,setKosa]=useState('');
  useEffect(()=>{setAndika('');setKosa('')},[u]);
  if(!u)return null;

  const jina=(u.name||u.email||'').trim();
  const sahihi=andika.trim().toLowerCase()===jina.toLowerCase();

  return <Modal open onClose={onClose} title="Futa kabisa">
    <div style={{background:'#FBECE9',border:'1px solid #F3CFC8',borderRadius:13,padding:'13px 15px',marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:800,color:'#B91C1C',marginBottom:6}}>Hii haiwezi kurudishwa</div>
      <div style={{fontSize:12.5,color:'#7F1D1D',lineHeight:1.7}}>
        Safu ya <b>{jina}</b> itatoweka kabisa kwenye mfumo.
        Hataweza kuingia, na hutaweza kumrudisha.
      </div>
    </div>

    <div style={{fontSize:12.5,color:MUT,lineHeight:1.7,marginBottom:14}}>
      <b style={{color:INK}}>Kinachobaki:</b> historia ya tiketi alizozishughulikia na mazungumzo yake
      — majina yamehifadhiwa kwenye rekodi zenyewe, si kwenye safu yake.<br/>
      <b style={{color:INK}}>Hakikisha:</b> kama unataka tu akome kupokea arifa, tumia
      <b> "Ameacha kazi"</b> badala ya hii. Hiyo inarudishika.
    </div>

    <Input label={`Andika jina lake kuthibitisha: ${jina}`} value={andika}
      onChange={e=>setAndika(e.target.value)} placeholder={jina}/>

    {kosa&&<div style={{background:'#FBECE9',color:'#B91C1C',fontSize:12.5,fontWeight:600,
      padding:'10px 13px',borderRadius:10,margin:'4px 0 10px',lineHeight:1.6}}>{kosa}</div>}

    <div style={{display:'flex',gap:8,marginTop:6}}>
      <Btn v="ghost" style={{flex:1}} onClick={onClose}>Acha</Btn>
      <Btn style={{flex:2,borderColor:'transparent',
        // Kikiwa kimezimwa lazima bado kisomeke — kisiwe cheupe juu ya cheupe
        ...(sahihi?{background:'linear-gradient(135deg,#C2412D,#991B1B)',color:'#fff'}
                  :{background:'#F0E4E1',color:'#A8736A'})}}
        disabled={!sahihi||busy}
        onClick={async()=>{
          setBusy(true);setKosa('');
          const r=await onFuta(u);
          if(r?.error)setKosa(r.error);
          setBusy(false);
        }}>
        {busy?'Inafuta…':'Futa kabisa'}
      </Btn>
    </div>
  </Modal>;
}
