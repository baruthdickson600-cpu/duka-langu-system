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

  const niWakala=user?.role==='agent'||user?.role==='supervisor';
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

    <div className="flex-wrap" style={{marginBottom:14}}>
      <Stat icon={IC.bell} label="Wazi" value={wazi.length} color={wazi.length?'#C2412D':'#9AA5A0'}/>
      <Stat icon={IC.bell} label="Dharura" value={dharura.length} color={dharura.length?'#C2412D':'#9AA5A0'}/>
      <Stat icon={IC.clock} label="Zimechelewa" value={chelewa.length} color={chelewa.length?'#F2B705':'#9AA5A0'}/>
      <Stat icon={IC.ok} label="Zimefungwa leo" value={leo.length} color={G1}/>
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
        return <div key={t.id} onClick={()=>setSel(t)} style={{
          padding:'12px 14px',borderBottom:`1px solid #F1F6F3`,cursor:'pointer',
          borderLeft:`3px solid ${niDharura(t.priority)&&niWazi(t.status)?'#C2412D':marehemu?'#F2B705':'transparent'}`,
          background:niDharura(t.priority)&&niWazi(t.status)?'#FFFBFA':'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{minWidth:0,flex:'1 1 240px'}}>
              <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:11.5,fontWeight:800,color:G1}}>{t.ticket_no||'—'}</span>
                <Badge color={haliRangi(t.status)}>{haliLab(t.status)}</Badge>
                {niDharura(t.priority)&&<Badge color="#C2412D">DHARURA</Badge>}
                {marehemu&&<Badge color="#F2B705">Imechelewa</Badge>}
                <Badge color={MUT}>{kitengoLab(t.kitengo)}</Badge>
              </div>
              <div style={{fontSize:13.5,fontWeight:700,color:INK,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.subject}</div>
              <div style={{fontSize:11,color:MUT,marginTop:2}}>
                {t.business_name||t.user_email||'—'}
                {t.phone?' · '+t.phone:''} · {tanguLini(t.created_at)}
                {t.assigned_name?` · ${t.assigned_name}`:''}
              </div>
            </div>
            <div style={{display:'flex',gap:6,flex:'none'}}>
              {niWazi(t.status)&&!t.assigned_to&&
                <Btn v="ghost" style={{padding:'6px 12px',fontSize:11.5}} onClick={e=>{e.stopPropagation();chukua(t)}}>Chukua</Btn>}
              <Btn v="ghost" style={{padding:'6px 12px',fontSize:11.5}} onClick={e=>{e.stopPropagation();setSel(t)}}>Fungua</Btn>
            </div>
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
            <Btn style={{padding:'8px 14px',fontSize:12}} onClick={()=>chukua(sel)}>Chukua tiketi hii</Btn>}
          {niWazi(sel.status)&&sel.status!=='working'&&
            <Btn v="ghost" style={{padding:'8px 14px',fontSize:12}} onClick={()=>badili(sel,'working')}>Ninaifanyia kazi</Btn>}
          {niWazi(sel.status)&&
            <Btn v="ghost" style={{padding:'8px 14px',fontSize:12}} onClick={async()=>{await closeTicket(sel.id);setSel({...sel,status:'closed'})}}>Funga tiketi</Btn>}
          {sel.status==='closed'&&niAdmin&&
            <Btn v="ghost" style={{padding:'8px 14px',fontSize:12}} onClick={()=>badili(sel,'open')}>Fungua tena</Btn>}
        </div>
        <div style={{fontSize:10.5,color:MUT,marginTop:9,lineHeight:1.6}}>
          Kila hatua hapa inamfikia mteja kwa SMS. Maelezo ya ndani hayamfikii.
        </div>
      </>}
    </Modal>
  </div>;
}

const chipStyle=hai=>({
  padding:'7px 11px',borderRadius:10,cursor:'pointer',fontSize:11.5,fontWeight:700,
  border:hai?`1.5px solid ${G1}`:`1px solid ${LINE}`,
  background:hai?SOFT:'#fff',color:hai?G2:MUT,
});
