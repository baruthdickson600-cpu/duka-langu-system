import React,{useState,useMemo,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Input,Btn,Modal,Badge,Empty} from '../../components/UI';
import {fmtMoney,fmtDate} from '../../utils/helpers';
import {watejaWake} from '../../utils/tiketi';
import {siku,haliYa,HALI,hesabuZaWateja,pangaKwaDharura} from '../../utils/wateja';

// ============================================================
// DukaLangu — WATEJA WOTE (Supevaiza)
//
// Supevaiza hauzi; anafuatilia. Kwa hiyo ukurasa huu unaanza na
// swali moja: NANI ANATAKIWA KULIPIA LEO?
//
// Mteja mmoja = sehemu moja. Ukimbofya, unaona kila kitu kuhusu
// yeye: usajili, wakala wake, malipo, tiketi na ziara — bila
// kuhama ukurasa. Ufuatiliaji unaorekodiwa hapa hapa.
// ============================================================

const G1='#0A6E47',G2='#06502F',INK='#17231D',MUT='#5C6A62',LINE='#D6E2DB',SOFT='#E6F2EC';
const MANJANO='#B45309',NYEKUNDU='#C2412D';

// siku(), haliYa() na HALI zinatoka src/utils/wateja.js — chanzo
// kimoja kwa kurasa zote, ili mteja asionekane "analipa" hapa na
// "ameishiwa" sehemu nyingine.

export default function WatejaWotePage(){
  const{user,businesses,promoCodes,tickets,supabase}=useApp();
  const[kichujio,setKichujio]=useState('kulipia');
  const[tafuta,setTafuta]=useState('');
  const[wazi,setWazi]=useState(null);

  const wote=useMemo(()=>watejaWake(user,businesses),[user,businesses]);

  // code -> jina la wakala
  const wakalaWa=useMemo(()=>{
    const m={};(promoCodes||[]).forEach(p=>{if(p.code)m[p.code]=p.agent_name||p.code});
    return m;
  },[promoCodes]);

  const hesabu=useMemo(()=>hesabuZaWateja(wote),[wote]);

  const orodha=useMemo(()=>{
    let l=wote;
    if(kichujio!=='wote')l=l.filter(b=>haliYa(b)===kichujio);
    if(tafuta){
      const q=tafuta.toLowerCase();
      l=l.filter(b=>[b.name,b.owner_name,b.email,b.phone,b.promo_code]
        .some(x=>String(x||'').toLowerCase().includes(q)));
    }
    return pangaKwaDharura(l);
  },[wote,kichujio,tafuta]);

  const VICHUJIO=[
    {v:'kulipia',l:'Anatakiwa kulipia',n:hesabu.kulipia,rangi:NYEKUNDU},
    {v:'trial',l:'Trial',n:hesabu.trial,rangi:MANJANO},
    {v:'analipa',l:'Wanaolipa',n:hesabu.analipa,rangi:G1},
    {v:'ameondoka',l:'Wameondoka',n:hesabu.ameondoka,rangi:MUT},
    {v:'wote',l:'Wote',n:hesabu.wote,rangi:INK},
  ];

  return <div className="page-enter">
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:21,fontWeight:900,color:G1,margin:'0 0 3px'}}>👥 Wateja Wote</h2>
      <p style={{fontSize:12,color:MUT,margin:0}}>
        Wateja wote waliosajili — wa kila wakala, si wa code moja
      </p>
    </div>

    {/* Kiini: nani anatakiwa kulipia */}
    {hesabu.kulipia>0&&<div style={{background:'linear-gradient(135deg,#C2412D,#991B1B)',borderRadius:18,
      padding:'17px 19px',marginBottom:14,color:'#fff'}}>
      <div style={{fontSize:10.5,fontWeight:800,opacity:.88,letterSpacing:'.1em'}}>WANAOTAKIWA KULIPIA</div>
      <div style={{fontSize:34,fontWeight:900,lineHeight:1.15,margin:'1px 0 3px'}}>{hesabu.kulipia}</div>
      <div style={{fontSize:12,opacity:.9,lineHeight:1.6}}>
        Wameishiwa au wanaishiwa ndani ya siku 5. Hawa wakipotea, ni pesa iliyopotea.
      </div>
    </div>}

    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
      {VICHUJIO.map(f=>(
        <button key={f.v} onClick={()=>setKichujio(f.v)} style={{
          padding:'7px 14px',borderRadius:10,cursor:'pointer',fontSize:12,
          border:kichujio===f.v?`2px solid ${f.rangi}`:`1.5px solid ${LINE}`,
          background:kichujio===f.v?f.rangi+'12':'#fff',
          color:kichujio===f.v?f.rangi:MUT,fontWeight:kichujio===f.v?800:600}}>
          {f.l} <b style={{color:f.rangi}}>{f.n}</b>
        </button>
      ))}
    </div>

    <div className="card" style={{marginBottom:12,padding:'12px 14px'}}>
      <Input placeholder="Tafuta duka, mmiliki, simu au code…" value={tafuta} onChange={e=>setTafuta(e.target.value)}/>
    </div>

    <div className="card" style={{padding:0,overflow:'hidden'}}>
      {orodha.map(b=>{
        const h=haliYa(b),d=siku(b),H=HALI[h];
        return <button key={b.id} onClick={()=>setWazi(b)} style={{
          width:'100%',textAlign:'left',background:'none',cursor:'pointer',
          border:'none',borderBottom:'1px solid #F1F6F3',padding:'13px 15px',
          display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{width:38,height:38,borderRadius:12,flex:'none',display:'flex',alignItems:'center',
            justifyContent:'center',fontSize:17,background:H.rangi+'15'}}>{H.ikoni}</div>
          <div style={{flex:'1 1 200px',minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:800,color:INK}}>{b.name||'(hana jina)'}</div>
            <div style={{fontSize:11.5,color:MUT,marginTop:2,lineHeight:1.6}}>
              {b.phone||'hana simu'}
              {b.promo_code
                ?` · ${wakalaWa[b.promo_code]||'code '+b.promo_code+' (hana wakala)'}`
                :' · hana wakala'}
            </div>
          </div>
          <div style={{flex:'none',textAlign:'right'}}>
            <Badge color={H.rangi}>{H.lab}</Badge>
            <div style={{fontSize:11,color:d!=null&&d<=5?NYEKUNDU:MUT,marginTop:4,fontWeight:d!=null&&d<=5?700:500}}>
              {d==null?'—':d<0?`Imeisha siku ${Math.abs(d)}`:`Siku ${d}`}
            </div>
          </div>
        </button>;
      })}
      {!orodha.length&&<div style={{padding:'26px 0'}}>
        <Empty icon="👥" text={tafuta?'Hakuna anayelingana':'Hakuna mteja kwenye kundi hili'}/>
      </div>}
    </div>

    <MtejaKamili b={wazi} onClose={()=>setWazi(null)}
      wakala={wazi?.promo_code?(wakalaWa[wazi.promo_code]||null):null}
      tickets={tickets} supabase={supabase} user={user}/>
  </div>;
}

// ============================================================
// KILA KITU KUHUSU MTEJA MMOJA
// ============================================================
function MtejaKamili({b,onClose,wakala,tickets,supabase,user}){
  const[malipo,setMalipo]=useState(null);
  const[ziara,setZiara]=useState(null);
  const[kosa,setKosa]=useState('');
  const[fomu,setFomu]=useState(false);

  useEffect(()=>{
    if(!b){setMalipo(null);setZiara(null);setKosa('');setFomu(false);return}
    let imefungwa=false;
    (async()=>{
      // Kila swali peke yake: jedwali moja likikosekana,
      // lingine bado linaonekana.
      try{
        const{data,error}=await supabase.from('payment_transactions')
          .select('id,amount,plan,days,status,created_at,risiti_no')
          .eq('business_id',b.id).order('created_at',{ascending:false}).limit(10);
        if(!imefungwa)error?setKosa(k=>k||error.message):setMalipo(data||[]);
      }catch(e){if(!imefungwa)setKosa(k=>k||e.message)}
      try{
        const{data}=await supabase.from('customer_visits')
          .select('*').eq('business_id',b.id).order('visit_date',{ascending:false}).limit(10);
        if(!imefungwa)setZiara(data||[]);
      }catch(_){ if(!imefungwa)setZiara([]) }
    })();
    return()=>{imefungwa=true};
  },[b,supabase]);

  if(!b)return null;

  const h=haliYa(b),d=siku(b),H=HALI[h];
  const zake=(tickets||[]).filter(t=>t.business_id===b.id);
  const wazi=zake.filter(t=>t.status!=='closed');
  const simu=String(b.phone||'').replace(/\D/g,'');

  const ujumbe=d!=null&&d<0
    ?`Habari ${b.name}! Muda wa DukaLangu umeisha siku ${Math.abs(d)} zilizopita. Tafadhali lipia ili mfumo ufunguliwe. Lipa: HALOPESA 25187616 (DUKALANGU). Nipo kukusaidia.`
    :`Habari ${b.name}! Muda wa DukaLangu unaisha baada ya siku ${d}. Lipia mapema ili huduma isikatike. Lipa: HALOPESA 25187616 (DUKALANGU). Nipo kukusaidia.`;

  return <Modal open onClose={onClose} title={b.name||'Mteja'} wide>
    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
      <Badge color={H.rangi}>{H.ikoni} {H.lab}</Badge>
      <Badge color="#8B5CF6">{(b.plan||'trial').toUpperCase()}</Badge>
      <span style={{fontSize:12,color:d!=null&&d<=5?NYEKUNDU:MUT,fontWeight:700}}>
        {d==null?'Hakuna tarehe':d<0?`Imeisha siku ${Math.abs(d)}`:`Siku ${d} zimebaki`}
      </span>
    </div>

    {(h==='kulipia')&&simu&&<div style={{background:'#FBECE9',border:'1px solid #F3CFC8',borderRadius:13,
      padding:'13px 15px',marginBottom:14}}>
      <div style={{fontSize:12.5,color:'#7F1D1D',lineHeight:1.7,marginBottom:10}}>
        Huyu anatakiwa kulipia. Mkumbushe sasa, kisha rekodi ulichofanya hapa chini.
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <a href={`https://wa.me/${simu}?text=${encodeURIComponent(ujumbe)}`} target="_blank" rel="noreferrer"
          style={{padding:'9px 15px',borderRadius:10,background:G1,color:'#fff',fontWeight:800,
            fontSize:12.5,textDecoration:'none'}}>💬 Kumbusha WhatsApp</a>
        <a href={`tel:${b.phone}`} style={{padding:'9px 15px',borderRadius:10,background:'#fff',
          border:`1px solid ${LINE}`,color:INK,fontWeight:700,fontSize:12.5,textDecoration:'none'}}>📞 Mpigie</a>
      </div>
    </div>}

    <Safu lab="Mmiliki" v={b.owner_name||'—'}/>
    <Safu lab="Simu" v={b.phone||'—'}/>
    <Safu lab="Email" v={b.email||'—'}/>
    <Safu lab="Mahali" v={b.location||b.address||'—'}/>
    <Safu lab="Alisajili" v={b.created_at?fmtDate(b.created_at):'—'}/>
    <Safu lab="Wakala wake"
      v={wakala||(b.promo_code?'Code haina mwenyewe':'Hana wakala')} onyo={!wakala}/>
    <Safu lab="Promo code" v={b.promo_code||'—'}/>

    <Kichwa>Malipo</Kichwa>
    {malipo===null?<Tulia>Inasoma…</Tulia>
      :malipo.length?malipo.map(m=>(
        <div key={m.id} style={{display:'flex',justifyContent:'space-between',gap:10,
          padding:'8px 0',borderBottom:'1px solid #F6F8F7',fontSize:12.5,flexWrap:'wrap'}}>
          <div>
            <div style={{fontWeight:700,color:INK}}>{fmtMoney(m.amount||0)}</div>
            <div style={{fontSize:11,color:MUT}}>
              {(m.plan||'—').toUpperCase()} · siku {m.days||'—'}{m.risiti_no?` · ${m.risiti_no}`:''}
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <Badge color={m.status==='success'||m.status==='completed'?G1:m.status==='pending'?MANJANO:NYEKUNDU}>
              {m.status||'—'}</Badge>
            <div style={{fontSize:11,color:MUT,marginTop:3}}>{m.created_at?fmtDate(m.created_at):''}</div>
          </div>
        </div>
      )):<Tulia>Hajawahi kulipa — yupo kwenye trial au ameishiwa tangu mwanzo.</Tulia>}
    {kosa&&<div style={{fontSize:11,color:MANJANO,marginTop:6,lineHeight:1.6}}>
      Historia ya malipo haikusomeka: {kosa}
    </div>}

    <Kichwa>Tiketi {wazi.length>0&&<b style={{color:NYEKUNDU}}>({wazi.length} wazi)</b>}</Kichwa>
    {zake.length?zake.slice(0,6).map(t=>(
      <div key={t.id} style={{display:'flex',justifyContent:'space-between',gap:10,
        padding:'8px 0',borderBottom:'1px solid #F6F8F7',fontSize:12.5,flexWrap:'wrap'}}>
        <div style={{flex:'1 1 180px',minWidth:0}}>
          <div style={{fontWeight:700,color:INK}}>{t.subject||'(hakuna kichwa)'}</div>
          <div style={{fontSize:11,color:MUT,fontFamily:'ui-monospace,Menlo,monospace'}}>{t.ticket_no||''}</div>
        </div>
        <Badge color={t.status==='closed'?MUT:t.priority==='urgent'?NYEKUNDU:MANJANO}>
          {t.status==='closed'?'Imefungwa':'Wazi'}</Badge>
      </div>
    )):<Tulia>Hajawahi kulalamika.</Tulia>}

    <Kichwa>Ufuatiliaji</Kichwa>
    {ziara===null?<Tulia>Inasoma…</Tulia>
      :ziara.length?ziara.slice(0,6).map(z=>(
        <div key={z.id} style={{padding:'8px 0',borderBottom:'1px solid #F6F8F7',fontSize:12.5}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,color:INK}}>{z.visit_purpose||z.visit_type||'Ziara'}</span>
            <span style={{fontSize:11,color:MUT}}>{z.visit_date||''}</span>
          </div>
          {z.has_issues&&<div style={{fontSize:11.5,color:NYEKUNDU,marginTop:3}}>
            ⚠️ {z.issues_description||'Ana changamoto'}</div>}
          {z.notes&&<div style={{fontSize:11.5,color:MUT,marginTop:3}}>{z.notes}</div>}
        </div>
      )):<Tulia>Hajawahi kutembelewa wala kufuatiliwa.</Tulia>}

    <div style={{marginTop:14,display:'flex',gap:8}}>
      <Btn v="ghost" style={{flex:1}} onClick={onClose}>Funga</Btn>
      <Btn style={{flex:2}} onClick={()=>setFomu(true)}>Rekodi ufuatiliaji</Btn>
    </div>

    <RekodiZiara open={fomu} onClose={()=>setFomu(false)} b={b} supabase={supabase} user={user}
      onSaved={z=>{setZiara(p=>[z,...(p||[])]);setFomu(false)}}/>
  </Modal>;
}

const Safu=({lab,v,onyo})=>(
  <div style={{display:'flex',justifyContent:'space-between',gap:12,padding:'7px 0',
    borderBottom:'1px solid #F6F8F7',fontSize:12.5}}>
    <span style={{color:MUT}}>{lab}</span>
    <span style={{fontWeight:700,color:onyo?MANJANO:INK,textAlign:'right'}}>{v}</span>
  </div>
);
const Kichwa=({children})=>(
  <div style={{fontSize:10,letterSpacing:'.14em',textTransform:'uppercase',color:'#93A49A',
    fontWeight:800,margin:'16px 0 7px'}}>{children}</div>
);
const Tulia=({children})=>(
  <div style={{fontSize:12,color:MUT,padding:'6px 0',lineHeight:1.6}}>{children}</div>
);

// ============================================================
// REKODI UFUATILIAJI
//
// Ufuatiliaji usioandikwa ni ufuatiliaji usiofanyika: hakuna
// anayejua ulimpigia nani, lini, na alisema nini.
// ============================================================
function RekodiZiara({open,onClose,b,supabase,user,onSaved}){
  const[f,setF]=useState({visit_purpose:'',notes:'',has_issues:false,issues_description:'',next_visit_date:''});
  const[busy,setBusy]=useState(false);
  const[kosa,setKosa]=useState('');
  useEffect(()=>{if(open){setF({visit_purpose:'',notes:'',has_issues:false,issues_description:'',next_visit_date:''});setKosa('')}},[open,b]);
  if(!open||!b)return null;

  const hifadhi=async()=>{
    if(!f.visit_purpose.trim())return setKosa('Andika ulichofanya.');
    setBusy(true);setKosa('');
    const row={
      business_id:b.id,
      customer_name:b.owner_name||b.name||'',
      customer_business:b.name||'',
      customer_phone:b.phone||'',
      visit_date:new Date().toISOString().slice(0,10),
      visit_type:'follow_up',
      visit_purpose:f.visit_purpose.trim(),
      notes:f.notes.trim()||null,
      has_issues:!!f.has_issues,
      issues_description:f.has_issues?(f.issues_description.trim()||null):null,
      next_visit_date:f.next_visit_date||null,
      supervisor_id:user?.id||null,
      supervisor_name:user?.name||user?.email||null,
    };
    try{
      const{data,error}=await supabase.from('customer_visits').insert(row).select().single();
      if(error)throw error;
      onSaved?.(data||{...row,id:'tmp-'+Date.now()});
    }catch(e){setKosa('Imeshindikana kuhifadhi: '+(e.message||''))}
    setBusy(false);
  };

  return <Modal open onClose={onClose} title={'Ufuatiliaji — '+(b.name||'')}>
    <Input label="Umefanya nini? *" value={f.visit_purpose}
      onChange={e=>setF({...f,visit_purpose:e.target.value})}
      placeholder="Mfano: Nimempigia kumkumbusha malipo"/>
    <Input label="Alisema nini?" value={f.notes}
      onChange={e=>setF({...f,notes:e.target.value})}
      placeholder="Mfano: Atalipa Ijumaa akipata mauzo"/>

    <label style={{display:'flex',alignItems:'center',gap:8,margin:'10px 0',cursor:'pointer',fontSize:13,color:INK}}>
      <input type="checkbox" checked={f.has_issues} onChange={e=>setF({...f,has_issues:e.target.checked})}/>
      Ana changamoto inayohitaji msaada
    </label>
    {f.has_issues&&<Input label="Changamoto ni ipi?" value={f.issues_description}
      onChange={e=>setF({...f,issues_description:e.target.value})}/>}

    <Input label="Umfuate tena lini?" type="date" value={f.next_visit_date}
      onChange={e=>setF({...f,next_visit_date:e.target.value})}/>

    {kosa&&<div style={{background:'#FBECE9',color:NYEKUNDU,fontSize:12.5,fontWeight:600,
      padding:'9px 12px',borderRadius:10,margin:'8px 0'}}>{kosa}</div>}

    <div style={{display:'flex',gap:8,marginTop:8}}>
      <Btn v="ghost" style={{flex:1}} onClick={onClose}>Acha</Btn>
      <Btn style={{flex:2}} disabled={busy} onClick={hifadhi}>{busy?'Inahifadhi…':'Hifadhi'}</Btn>
    </div>
  </Modal>;
}
