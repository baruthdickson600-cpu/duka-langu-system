import React,{useState,useEffect,useMemo} from 'react';
import {useApp} from '../context/AppContext';
import {Modal,Btn,Input,Area,Badge,Empty} from './UI';
import {
  KITENGO,VITENGO_ZOTE,kitengoLab,KIPAUMBELE,kipaumbeleLab,kipaumbeleRangi,
  haliLab,haliRangi,haliMteja,niWazi,tanguLini,imechelewa,safishaTiketi,
} from '../utils/tiketi';

// ============================================================
// DukaLangu — TIKETI ZA WATEJA
//
// Kadi hii inakaa JUU ya dashibodi, si kwenye side bar. Mteja
// mwenye tatizo hatafuti mahali pa kulalamikia — anaona mara
// moja. Hiyo ndiyo tofauti kati ya kupata taarifa ya tatizo na
// kumpoteza mteja kimya kimya.
// ============================================================

const G1='#0A6E47',G2='#06502F',INK='#17231D',MUT='#5C6A62',LINE='#D6E2DB',SOFT='#E6F2EC';

const Ikoni=({d,s=16,c='currentColor',w=2.2})=>(
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const I_TIKETI=<><path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 000 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a2 2 0 000-4V9z"/><path d="M13 7v10" strokeDasharray="2 2"/></>;
const I_SEND=<><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></>;
const I_CHEVRON=<path d="M9 18l6-6-6-6"/>;

// ============================================================
// 1. KADI YA JUU — mteja anaiona kila anapofungua mfumo
// ============================================================
export function TiketiBar(){
  const{tickets=[],user}=useApp();
  const[fungua,setFungua]=useState(false);
  const[soma,setSoma]=useState(null);

  const zangu=useMemo(()=>(tickets||[]).filter(t=>t.business_id===user?.business_id||!user?.business_id),[tickets,user]);
  const wazi=zangu.filter(t=>niWazi(t.status));
  const mpya=wazi[0]||null;

  return <>
    <div style={{background:'#fff',border:`1px solid ${LINE}`,borderRadius:16,padding:'12px 14px',marginBottom:12,
      display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',boxShadow:'0 2px 8px rgba(10,110,71,.05)'}}>
      <div style={{width:38,height:38,borderRadius:12,background:SOFT,display:'flex',alignItems:'center',justifyContent:'center',flex:'none',color:G1}}>
        <Ikoni d={I_TIKETI} s={19}/>
      </div>

      {mpya?(
        <div style={{flex:'1 1 200px',minWidth:0,cursor:'pointer'}} onClick={()=>setSoma(mpya)}>
          <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
            <span style={{fontFamily:'ui-monospace,Menlo,monospace',fontSize:12,fontWeight:800,color:G1}}>{mpya.ticket_no||'Tiketi'}</span>
            <Badge color={haliRangi(mpya.status)}>{haliMteja(mpya.status)}</Badge>
            {imechelewa(mpya)&&<Badge color="#C2412D">Imechelewa</Badge>}
          </div>
          <div style={{fontSize:12.5,color:INK,fontWeight:600,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{mpya.subject}</div>
          <div style={{fontSize:11,color:MUT,marginTop:1}}>Ulituma {tanguLini(mpya.created_at)} iliyopita · bofya kusoma</div>
        </div>
      ):(
        <div style={{flex:'1 1 200px',minWidth:0}}>
          <div style={{fontSize:13.5,fontWeight:800,color:INK}}>Una tatizo au swali?</div>
          <div style={{fontSize:11.5,color:MUT,marginTop:2}}>Tuma tiketi — utapata namba yake kwa SMS, na jibu letu.</div>
        </div>
      )}

      <div style={{display:'flex',gap:7,marginLeft:'auto',flexWrap:'wrap'}}>
        {zangu.length>0&&<Btn v="ghost" style={{padding:'8px 12px',fontSize:12}} onClick={()=>setSoma(zangu[0])}>Tiketi zangu ({zangu.length})</Btn>}
        <Btn style={{padding:'8px 14px',fontSize:12.5,display:'flex',alignItems:'center',gap:6}} onClick={()=>setFungua(true)}>
          <Ikoni d={I_SEND} s={14} c="#fff" w={2.4}/> Tuma tiketi
        </Btn>
      </div>
    </div>

    <TiketiFomu open={fungua} onClose={()=>setFungua(false)} onTuma={t=>{setFungua(false);setSoma(t)}}/>
    <TiketiZangu open={!!soma} onClose={()=>setSoma(null)} tiketi={soma} zote={zangu} onChagua={setSoma}/>
  </>;
}

// ============================================================
// 2. FOMU YA KUTUMA
// ============================================================
function TiketiFomu({open,onClose,onTuma}){
  const{createTicket}=useApp();
  const[kitengo,setKitengo]=useState('kiufundi');
  const[subject,setSubject]=useState('');
  const[message,setMessage]=useState('');
  const[priority,setPriority]=useState('normal');
  const[busy,setBusy]=useState(false);
  const[kosa,setKosa]=useState('');

  useEffect(()=>{if(open){setSubject('');setMessage('');setKitengo('kiufundi');setPriority('normal');setKosa('')}},[open]);

  const tuma=async()=>{
    if(subject.trim().length<4)return setKosa('Andika kichwa cha tatizo (angalau herufi 4).');
    if(message.trim().length<10)return setKosa('Eleza tatizo kwa undani zaidi ili tukusaidie haraka.');
    setBusy(true);setKosa('');
    try{
      const t=await createTicket(subject.trim(),message.trim(),priority,kitengo);
      onTuma?.(t);
    }catch(e){setKosa('Imeshindikana kutuma. Jaribu tena.')}
    setBusy(false);
  };

  return <Modal open={open} onClose={onClose} title="Tuma tiketi" wide>
    <div style={{fontSize:12.5,color:MUT,marginBottom:14,lineHeight:1.6}}>
      Eleza tatizo lako. Utapata <b>namba ya tiketi kwa SMS</b> papo hapo, na tutakujulisha kila hatua.
    </div>

    <div style={{fontSize:11,fontWeight:800,color:MUT,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Ni jambo gani?</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8,marginBottom:16}}>
      {VITENGO_ZOTE.map(k=>{
        const hai=kitengo===k;
        return <button key={k} onClick={()=>setKitengo(k)} style={{
          textAlign:'left',padding:'11px 12px',borderRadius:13,cursor:'pointer',
          border:hai?`2px solid ${G1}`:`1px solid ${LINE}`,background:hai?SOFT:'#fff'}}>
          <div style={{fontSize:13,fontWeight:800,color:hai?G2:INK}}>{KITENGO[k].ikoni} {KITENGO[k].lab}</div>
          {KITENGO[k].maelezo&&<div style={{fontSize:10.5,color:MUT,marginTop:2}}>{KITENGO[k].maelezo}</div>}
        </button>;
      })}
    </div>

    <Input label="Kichwa cha tatizo" placeholder="Mfano: Mauzo hayahifadhiwi"
      value={subject} onChange={e=>setSubject(e.target.value)} maxLength={120}/>
    <Area label="Eleza kwa undani" rows={5}
      placeholder="Ilitokea lini? Ulikuwa unafanya nini? Ujumbe gani uliouona?"
      value={message} onChange={e=>setMessage(e.target.value)} maxLength={1500}/>

    <div style={{fontSize:11,fontWeight:800,color:MUT,letterSpacing:'.08em',textTransform:'uppercase',margin:'10px 0 8px'}}>Ni la haraka kiasi gani?</div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:6}}>
      {Object.keys(KIPAUMBELE).map(p=>{
        const hai=priority===p;
        return <button key={p} onClick={()=>setPriority(p)} style={{
          flex:'1 1 100px',padding:'9px 10px',borderRadius:11,cursor:'pointer',fontSize:12,fontWeight:700,
          border:hai?`2px solid ${kipaumbeleRangi(p)}`:`1px solid ${LINE}`,
          background:hai?kipaumbeleRangi(p)+'18':'#fff',color:hai?kipaumbeleRangi(p):INK}}>
          {kipaumbeleLab(p)}
        </button>;
      })}
    </div>
    <div style={{fontSize:10.5,color:MUT,marginBottom:14}}>
      Biashara yako imesimama kabisa? Chagua <b>Ya dharura</b> — inamfikia msimamizi moja kwa moja.
    </div>

    {kosa&&<div style={{background:'#FBECE9',color:'#C2412D',fontSize:12.5,fontWeight:600,padding:'9px 12px',borderRadius:10,marginBottom:10}}>{kosa}</div>}

    <div style={{display:'flex',gap:8}}>
      <Btn v="ghost" style={{flex:1}} onClick={onClose}>Acha</Btn>
      <Btn style={{flex:2}} disabled={busy} onClick={tuma}>{busy?'Inatuma…':'Tuma tiketi'}</Btn>
    </div>
  </Modal>;
}

// ============================================================
// 3. TIKETI ZANGU — mteja anasoma na kujibu
// ============================================================
function TiketiZangu({open,onClose,tiketi,zote=[],onChagua}){
  if(!tiketi)return null;
  return <Modal open={open} onClose={onClose} title={tiketi.ticket_no||'Tiketi yangu'} wide>
    {zote.length>1&&<div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:10}}>
      {zote.map(t=>{
        const hai=t.id===tiketi.id;
        return <button key={t.id} onClick={()=>onChagua(t)} style={{
          flex:'none',padding:'6px 11px',borderRadius:999,cursor:'pointer',fontSize:11,fontWeight:700,
          border:hai?`1.5px solid ${G1}`:`1px solid ${LINE}`,background:hai?SOFT:'#fff',
          color:hai?G2:MUT,fontFamily:'ui-monospace,Menlo,monospace'}}>
          {t.ticket_no||'—'}
        </button>;
      })}
    </div>}
    <TiketiMazungumzo t={tiketi} niMteja/>
  </Modal>;
}

// ============================================================
// 4. MAZUNGUMZO — inatumika pande zote mbili
// ============================================================
export function TiketiMazungumzo({t,niMteja=false}){
  const{ticketMsgs,loadTicketMsgs,addTicketMsg,user}=useApp();
  const[andika,setAndika]=useState('');
  const[ndani,setNdani]=useState(false);
  const[busy,setBusy]=useState(false);
  const[kosa,setKosa]=useState('');
  const msgs=ticketMsgs?.[t?.id]||[];

  useEffect(()=>{if(t?.id)loadTicketMsgs(t.id)},[t?.id]);

  const tuma=async()=>{
    if(!andika.trim())return;
    setBusy(true);setKosa('');
    const r=await addTicketMsg(t.id,andika,ndani);
    if(r?.error)setKosa(r.error);else setAndika('');
    setBusy(false);
  };

  return <div>
    <div style={{background:SOFT,borderRadius:13,padding:'12px 14px',marginBottom:12}}>
      <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center',marginBottom:6}}>
        <Badge color={haliRangi(t.status)}>{niMteja?haliMteja(t.status):haliLab(t.status)}</Badge>
        <Badge color={kipaumbeleRangi(t.priority)}>{kipaumbeleLab(t.priority)}</Badge>
        <Badge color={MUT}>{kitengoLab(t.kitengo)}</Badge>
        {!niMteja&&t.business_name&&<span style={{fontSize:11.5,color:MUT,fontWeight:700}}>{t.business_name}</span>}
      </div>
      <div style={{fontSize:14,fontWeight:800,color:INK}}>{t.subject}</div>
      <div style={{fontSize:12.5,color:'#334',marginTop:6,whiteSpace:'pre-wrap',lineHeight:1.6}}>{t.message}</div>
      <div style={{fontSize:10.5,color:MUT,marginTop:7}}>
        {tanguLini(t.created_at)} iliyopita
        {t.assigned_name&&<> · anashughulikiwa na <b>{t.assigned_name}</b></>}
      </div>
    </div>

    {/* Jibu la zamani (kabla ya mazungumzo) halipotei */}
    {t.reply&&<div style={{background:'#F6F8F7',borderLeft:`3px solid ${G1}`,borderRadius:'0 10px 10px 0',padding:'9px 12px',marginBottom:10}}>
      <div style={{fontSize:10.5,fontWeight:800,color:G1,letterSpacing:'.05em'}}>JIBU</div>
      <div style={{fontSize:12.5,color:INK,marginTop:3,whiteSpace:'pre-wrap'}}>{t.reply}</div>
    </div>}

    <div style={{maxHeight:300,overflowY:'auto',marginBottom:12}}>
      {msgs.map(m=>{
        const wangu=m.sender_id===user?.id;
        const kazi=['admin','marketing','supervisor','agent','accountant'].includes(m.sender_role);
        return <div key={m.id} style={{display:'flex',justifyContent:wangu?'flex-end':'flex-start',marginBottom:8}}>
          <div style={{maxWidth:'82%',background:m.ni_ndani?'#FFF8E6':wangu?SOFT:'#F6F8F7',
            border:m.ni_ndani?'1px dashed #E0B646':'none',borderRadius:13,padding:'9px 12px'}}>
            <div style={{fontSize:10.5,fontWeight:800,color:m.ni_ndani?'#92400E':kazi?G1:MUT,marginBottom:3}}>
              {m.ni_ndani?'MAELEZO YA NDANI · ':''}{m.sender_name||(kazi?'DukaLangu':'Mteja')}
            </div>
            <div style={{fontSize:12.5,color:INK,whiteSpace:'pre-wrap',lineHeight:1.55}}>{m.body}</div>
            <div style={{fontSize:10,color:MUT,marginTop:4}}>{tanguLini(m.created_at)}</div>
          </div>
        </div>;
      })}
      {!msgs.length&&<div style={{fontSize:12,color:MUT,textAlign:'center',padding:'14px 0'}}>
        {niMteja?'Bado hakuna jibu. Tutakujulisha kwa SMS.':'Hakuna mazungumzo bado.'}
      </div>}
    </div>

    {t.status!=='closed'&&<div>
      {!niMteja&&<label style={{display:'flex',alignItems:'center',gap:7,fontSize:11.5,color:MUT,marginBottom:7,cursor:'pointer',fontWeight:600}}>
        <input type="checkbox" checked={ndani} onChange={e=>setNdani(e.target.checked)}/>
        Maelezo ya ndani — mteja HAONI, wala hapati SMS
      </label>}
      {kosa&&<div style={{background:'#FBECE9',color:'#C2412D',fontSize:12,padding:'7px 10px',borderRadius:9,marginBottom:7}}>{kosa}</div>}
      <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
        <div style={{flex:1}}>
          <Input placeholder={niMteja?'Ongeza maelezo…':ndani?'Maelezo ya ndani…':'Andika jibu kwa mteja…'}
            value={andika} onChange={e=>setAndika(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();tuma()}}}/>
        </div>
        <Btn style={{padding:'11px 16px',flex:'none'}} disabled={busy||!andika.trim()} onClick={tuma}>
          {busy?'…':'Tuma'}
        </Btn>
      </div>
    </div>}
  </div>;
}

export {TiketiFomu};
