import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {Modal,Btn,Input,Badge,Stat,Empty,IC} from '../../components/UI';
import {TiketiMazungumzo} from '../../components/Tiketi';
import {
  HALI,HALI_ZOTE,haliLab,haliRangi,niWazi,
  KITENGO,VITENGO_ZOTE,kitengoLab,
  kipaumbeleLab,kipaumbeleRangi,niDharura,
  tanguLini,imechelewa,
} from '../../utils/tiketi';

// ============================================================
// DukaLangu — FOLENI YA TIKETI (admin, masoko, wakala)
//
// Ukurasa mmoja unaojibadilisha kulingana na anayeutumia:
//   admin  — anaona zote, anagawa, anafunga
//   masoko — anaona zote, anachukua na kujibu
//   wakala — anaona za wateja WAKE pekee
//
// Mgawanyo huu uko hapa na pia kwenye RLS ya database. Kuuweka
// hapa pekee kungekuwa ni pazia, si kinga.
// ============================================================

const G1='#0A6E47',G2='#06502F',INK='#17231D',MUT='#5C6A62',LINE='#D6E2DB',SOFT='#E6F2EC';

export default function TiketiPage(){
  const{tickets=[],businesses=[],user,assignTicket,setTicketStatus,closeTicket}=useApp();
  const[hali,setHali]=useState('wazi');
  const[kitengo,setKitengo]=useState('');
  const[tafuta,setTafuta]=useState('');
  const[sel,setSel]=useState(null);

  // Wakala PEKEE anafungiwa kwa promo code. Supervisor anasimamia
  // wateja wote, kwa hiyo anaona tiketi zote kama afisa masoko.
  const niWakala=user?.role==='agent';
  const niAdmin=user?.role==='admin';

  // Ramani ya business_id -> promo_code, ili wakala aone zake tu
  const promoYa=useMemo(()=>{
    const m={};(businesses||[]).forEach(b=>{m[b.id]=b.promo_code||''});return m;
  },[businesses]);

  const zangu=useMemo(()=>{
    let l=tickets||[];
    if(niWakala){
      const code=user?.promo_code;
      l=code?l.filter(t=>promoYa[t.business_id]===code):[];
    }
    return l;
  },[tickets,niWakala,user,promoYa]);

  const orodha=useMemo(()=>{
    let l=[...zangu];
    if(hali==='wazi')l=l.filter(t=>niWazi(t.status));
    else if(hali==='dharura')l=l.filter(t=>niDharura(t.priority)&&niWazi(t.status));
    else if(hali==='zimechelewa')l=l.filter(t=>imechelewa(t));
    else if(hali==='zangu')l=l.filter(t=>t.assigned_to===user?.id&&niWazi(t.status));
    else if(hali&&hali!=='zote')l=l.filter(t=>t.status===hali);
    if(kitengo)l=l.filter(t=>(t.kitengo||'nyingine')===kitengo);
    if(tafuta){
      const q=tafuta.toLowerCase();
      l=l.filter(t=>[t.ticket_no,t.subject,t.business_name,t.user_email,t.message]
        .some(x=>String(x||'').toLowerCase().includes(q)));
    }
    // Dharura kwanza, kisha mpya zaidi
    return l.sort((a,b)=>{
      const d=(niDharura(b.priority)?1:0)-(niDharura(a.priority)?1:0);
      if(d)return d;
      return new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at);
    });
  },[zangu,hali,kitengo,tafuta,user]);

  const wazi=zangu.filter(t=>niWazi(t.status));
  const dharura=wazi.filter(t=>niDharura(t.priority));
  const chelewa=zangu.filter(t=>imechelewa(t));
  const leo=zangu.filter(t=>t.status==='closed'&&t.closed_at&&new Date(t.closed_at).toDateString()===new Date().toDateString());

  const VICHUJIO=[
    ['wazi',`Wazi (${wazi.length})`],
    ['dharura',`Dharura (${dharura.length})`],
    ['zimechelewa',`Zimechelewa (${chelewa.length})`],
    ['zangu','Nilizochukua'],
    ['closed','Zilizofungwa'],
    ['zote','Zote'],
  ];

  const chukua=async(t)=>{
    await assignTicket(t.id,user?.role,user?.id,user?.name||user?.email);
    setSel(s=>s&&s.id===t.id?{...s,assigned_to:user?.id,assigned_name:user?.name||user?.email,status:'assigned'}:s);
  };
  const badili=async(t,s)=>{
    await setTicketStatus(t.id,s,user?.name||user?.email);
    setSel(x=>x&&x.id===t.id?{...x,status:s}:x);
  };

  return <div className="page-enter">
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:21,fontWeight:900,color:G1,margin:'0 0 3px'}}>🎫 Tiketi za Wateja</h2>
      <p style={{fontSize:12,color:MUT,margin:0}}>
        {niWakala?'Tiketi za wateja wako':'Kila ombi la mteja, kuanzia linapofika hadi linapofungwa'}
      </p>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:14}}>
      <Kadi lab="Wazi" n={wazi.length} rangi={wazi.length?'#C2412D':'#9AA5A0'}/>
      <Kadi lab="Dharura" n={dharura.length} rangi={dharura.length?'#C2412D':'#9AA5A0'} nyekundu={!!dharura.length}/>
      <Kadi lab="Zimechelewa" n={chelewa.length} rangi={chelewa.length?'#B45309':'#9AA5A0'}/>
      <Kadi lab="Zimefungwa leo" n={leo.length} rangi={G1}/>
    </div>

    <div className="card" style={{marginBottom:12,padding:'12px 14px'}}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        {VICHUJIO.map(([id,lab])=>(
          <button key={id} onClick={()=>setHali(id)} style={{
            padding:'7px 13px',borderRadius:999,cursor:'pointer',fontSize:12,fontWeight:700,
            border:hali===id?'none':`1px solid ${LINE}`,
            background:hali===id?G1:'#fff',color:hali===id?'#fff':MUT}}>{lab}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <div style={{flex:'1 1 220px'}}>
          <Input placeholder="Tafuta namba, mteja au tatizo…" value={tafuta} onChange={e=>setTafuta(e.target.value)}/>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={()=>setKitengo('')} style={chipStyle(!kitengo)}>Vyote</button>
          {VITENGO_ZOTE.map(k=>(
            <button key={k} onClick={()=>setKitengo(kitengo===k?'':k)} style={chipStyle(kitengo===k)}>
              {KITENGO[k].ikoni} {KITENGO[k].lab}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="card" style={{padding:0,overflow:'hidden'}}>
      {orodha.map(t=>{
        const marehemu=imechelewa(t);
        const dhrr=niDharura(t.priority)&&niWazi(t.status);
        return <div key={t.id} onClick={()=>setSel(t)} className="tk-row" style={{
          padding:'13px 15px',borderBottom:`1px solid #F1F6F3`,cursor:'pointer',
          borderLeft:`3px solid ${dhrr?'#C2412D':marehemu?'#F2B705':'transparent'}`,
          background:dhrr?'#FFFBFA':'#fff',display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{width:34,height:34,borderRadius:11,flex:'none',display:'flex',alignItems:'center',
            justifyContent:'center',fontSize:15,background:dhrr?'#FBECE9':SOFT}}>
            {KITENGO[t.kitengo||'nyingine']?.ikoni||'📝'}
          </div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
              <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:11,fontWeight:800,color:G1}}>{t.ticket_no||'—'}</span>
              <Badge color={haliRangi(t.status)}>{haliLab(t.status)}</Badge>
              {dhrr&&<Badge color="#C2412D">DHARURA</Badge>}
              {marehemu&&<Badge color="#B45309">Imechelewa</Badge>}
            </div>
            <div style={{fontSize:13.5,fontWeight:700,color:INK,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</div>
            <div style={{fontSize:11,color:MUT,marginTop:3}}>
              <b style={{color:'#3A4A42',fontWeight:600}}>{t.business_name||t.user_email||'—'}</b>
              {t.phone?' · '+t.phone:''} · {tanguLini(t.created_at)}
              {t.assigned_name?<> · <span style={{color:G1,fontWeight:700}}>{t.assigned_name}</span></>:''}
            </div>
          </div>
          <div style={{display:'flex',gap:6,flex:'none',alignItems:'center'}}>
            {niWazi(t.status)&&!t.assigned_to&&
              <Btn style={{padding:'6px 13px',fontSize:11.5}} onClick={e=>{e.stopPropagation();chukua(t)}}>Chukua</Btn>}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA5A0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>;
      })}
      {!orodha.length&&<div style={{padding:'28px 0'}}>
        <Empty icon="🎫" text={niWakala&&!user?.promo_code
          ? 'Huna promo code — wateja wako hawawezi kutambulika'
          : 'Hakuna tiketi kwenye kichujio hiki'}/>
      </div>}
    </div>

    <Modal open={!!sel} onClose={()=>setSel(null)} title={sel?.ticket_no||'Tiketi'} wide>
      {sel&&<>
        <TiketiMazungumzo t={sel}/>
        <div style={{borderTop:`1px solid ${LINE}`,marginTop:14,paddingTop:12,display:'flex',gap:7,flexWrap:'wrap'}}>
          {!sel.assigned_to&&niWazi(sel.status)&&
            <Btn style={{padding:'9px 15px',fontSize:12.5}} onClick={()=>chukua(sel)}>Chukua tiketi hii</Btn>}
          {niWazi(sel.status)&&sel.status!=='working'&&
            <Btn v="ghost" style={{padding:'9px 15px',fontSize:12.5}} onClick={()=>badili(sel,'working')}>Ninaifanyia kazi</Btn>}
          {niWazi(sel.status)&&
            <Btn style={{padding:'9px 15px',fontSize:12.5,marginLeft:'auto'}}
              onClick={async()=>{await closeTicket(sel.id);setSel({...sel,status:'closed'})}}>✓ Nimetatua — funga</Btn>}
          {sel.status==='closed'&&niAdmin&&
            <Btn v="ghost" style={{padding:'9px 15px',fontSize:12.5}} onClick={()=>badili(sel,'open')}>Fungua tena</Btn>}
        </div>
        <div style={{fontSize:10.5,color:MUT,marginTop:9,lineHeight:1.6}}>
          Ukifunga, mteja anapata SMS: <i>"Tatizo lako limetatuliwa."</i> Maelezo ya ndani hayamfikii.
        </div>
      </>}
    </Modal>
  </div>;
}

function Kadi({lab,n,rangi,nyekundu}){
  return <div style={{background:'#fff',border:`1px solid ${nyekundu?'#F3CFC8':LINE}`,borderRadius:14,
    padding:'12px 14px',boxShadow:'0 1px 3px rgba(10,110,71,.04)'}}>
    <div style={{fontSize:10,fontWeight:800,color:MUT,letterSpacing:'.1em',textTransform:'uppercase'}}>{lab}</div>
    <div style={{fontSize:26,fontWeight:900,color:rangi,lineHeight:1.15,marginTop:3}}>{n}</div>
  </div>;
}

const chipStyle=hai=>({
  padding:'7px 11px',borderRadius:10,cursor:'pointer',fontSize:11.5,fontWeight:700,
  border:hai?`1.5px solid ${G1}`:`1px solid ${LINE}`,
  background:hai?SOFT:'#fff',color:hai?G2:MUT,
});
