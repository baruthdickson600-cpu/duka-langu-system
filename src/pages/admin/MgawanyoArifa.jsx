import React,{useState,useEffect,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {Modal,Btn,Input,Sel,Badge,Empty} from '../../components/UI';
import {
  WAJIBU,WAJIBU_ZOTE,wajibuLab,AINA_ARIFA,AINA_ZOTE,ainaLab,
  smsAfya,smsWasiolipa,smsTiketiKazi,smsTiketiMpya,
  orodhaYaWasiolipa,watejaWake,anapokea,urefuWaSms,sehemuZaSms,
} from '../../utils/tiketi';

// ============================================================
// DukaLangu — MGAWANYO WA ARIFA
//
// Nani anapokea SMS gani. Namba za simu zinakaa kwenye database,
// si ndani ya code — mfanyakazi akiondoka unamzima hapa, hakuna
// kupeleka toleo jipya la mfumo.
//
// Kila arifa ni gharama ya DukaLangu, si bando la mteja. Ndiyo
// maana kila kitu kinaanza kimezimwa hadi uwashe mwenyewe.
// ============================================================

const G1='#0A6E47',G2='#06502F',INK='#17231D',MUT='#5C6A62',LINE='#D6E2DB',SOFT='#E6F2EC';

const SWICHI=[
  ['arifa_kazi_enabled','Swichi kuu ya arifa za wafanyakazi','Ikizimwa, hakuna arifa yoyote inayotoka kwenda kwa wafanyakazi.'],
  ['arifa_afya_enabled','Afya ya mfumo kwa msimamizi','Kila siku asubuhi: tiketi wazi, malipo yaliyokwama, SMS zilizoshindwa.'],
  ['arifa_wasiolipa_enabled','Wateja wasiolipa','Kila siku: orodha ya wateja wanaotakiwa kufuatiliwa.'],
  ['arifa_tiketi_enabled','Tiketi mpya','Papo hapo mteja anapotuma tiketi.'],
  ['tiketi_sms_mteja','SMS ya tiketi kwa mteja','Mteja anapata namba ya tiketi na taarifa ya kila hatua.'],
];

export default function MgawanyoArifa(){
  const{arifaWapokeaji=[],loadArifaWapokeaji,saveArifaMpokeaji,delArifaMpokeaji,businesses=[],tickets=[]}=useApp();
  const[cfg,setCfg]=useState({});
  const[saving,setSaving]=useState(false);
  const[jibu,setJibu]=useState(null);
  const[hariri,setHariri]=useState(null);
  const[inasoma,setInasoma]=useState(true);

  useEffect(()=>{(async()=>{
    setInasoma(true);
    try{
      const{data}=await supabase.from('settings').select('key,value')
        .in('key',SWICHI.map(s=>s[0]));
      const c={};(data||[]).forEach(r=>{c[r.key]=r.value});
      setCfg(c);
    }catch{/* mipangilio haipo bado */}
    await loadArifaWapokeaji();
    setInasoma(false);
  })()},[]);

  const washa=async(k,v)=>{
    setCfg(p=>({...p,[k]:v?'true':'false'}));
    setSaving(true);
    try{
      const{error}=await supabase.from('settings').upsert({key:k,value:v?'true':'false'},{onConflict:'key'});
      if(error)throw error;
      setJibu({ok:true,text:'Imehifadhiwa.'});
    }catch(e){
      setCfg(p=>({...p,[k]:v?'false':'true'}));   // rudisha ilivyokuwa
      setJibu({ok:false,text:'Imeshindikana kuhifadhi: '+e.message});
    }
    setSaving(false);
  };

  const imewashwa=k=>cfg[k]!=='false';
  const kuuImezimwa=cfg.arifa_kazi_enabled==='false';

  // ===== Hesabu halisi za leo, kwa mfano wa SMS =====
  const wasiolipa=useMemo(()=>orodhaYaWasiolipa(businesses),[businesses]);
  const wazi=(tickets||[]).filter(t=>t.status!=='closed');
  const mfanoAfya=smsAfya({
    tiketiWazi:wazi.length,
    tiketiDharura:wazi.filter(t=>t.priority==='urgent').length,
    wasiolipa:wasiolipa.length,
    makaziHai:(businesses||[]).filter(b=>b.token_active).length,
  });

  const kwaWajibu=w=>arifaWapokeaji.filter(m=>m.wajibu===w);

  return <div>
    {jibu&&<div style={{background:jibu.ok?SOFT:'#FBECE9',color:jibu.ok?'#15803D':'#B91C1C',
      padding:'10px 14px',borderRadius:11,marginBottom:14,fontWeight:600,fontSize:13}}>{jibu.text}</div>}

    {/* ===== MAELEZO ===== */}
    <div style={{background:'linear-gradient(135deg,#064E2B,#0A6E47)',borderRadius:18,padding:'18px 20px',marginBottom:14,color:'#fff'}}>
      <div style={{fontSize:16,fontWeight:900,marginBottom:6}}>👥 Nani anapokea nini</div>
      <div style={{fontSize:12.5,opacity:.9,lineHeight:1.7}}>
        <b>Msimamizi</b> anapata afya ya mfumo kila siku — matatizo ya kiufundi na ya wateja.<br/>
        <b>Afisa masoko</b> anapata wateja wasiolipa na tiketi zote za kufuatilia.<br/>
        <b>Wakala</b> anapata tiketi na wateja <b>wake pekee</b>, kwa promo code yake.
      </div>
    </div>

    {/* ===== SWICHI ===== */}
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 4px',color:INK}}>Arifa zinazofanya kazi</h3>
      <p style={{fontSize:11.5,color:MUT,margin:'0 0 12px'}}>Kila SMS ni gharama yetu. Washa unachokihitaji pekee.</p>
      {SWICHI.map(([k,jina,maelezo],i)=>{
        const hai=imewashwa(k);
        const zimwa=i>0&&kuuImezimwa;
        return <div key={k} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',
          borderTop:i?`1px solid #F1F6F3`:'none',opacity:zimwa?.45:1}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:INK}}>{jina}</div>
            <div style={{fontSize:11,color:MUT,marginTop:2}}>{maelezo}</div>
          </div>
          <button onClick={()=>!zimwa&&washa(k,!hai)} disabled={saving||zimwa} style={{
            width:48,height:27,borderRadius:999,border:'none',flex:'none',position:'relative',
            cursor:zimwa?'not-allowed':'pointer',background:hai&&!zimwa?G1:'#CBD5D0',transition:'background .15s'}}>
            <span style={{position:'absolute',top:3,left:hai?24:3,width:21,height:21,borderRadius:'50%',
              background:'#fff',transition:'left .15s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
          </button>
        </div>;
      })}
      {kuuImezimwa&&<div style={{background:'#FFF8E6',color:'#92400E',fontSize:12,fontWeight:600,
        padding:'9px 12px',borderRadius:10,marginTop:10}}>
        Swichi kuu imezimwa — hakuna arifa inayotoka kwenda kwa wafanyakazi, hata zilizowashwa.
      </div>}
    </div>

    {/* ===== WAPOKEAJI ===== */}
    {WAJIBU_ZOTE.map(w=>{
      const watu=kwaWajibu(w);
      return <div className="card" key={w} style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:10}}>
          <div>
            <h3 style={{fontSize:14,fontWeight:800,margin:0,color:INK}}>{wajibuLab(w)}</h3>
            <p style={{fontSize:11,color:MUT,margin:'2px 0 0'}}>{WAJIBU[w].maelezo}</p>
          </div>
          <Btn v="ghost" style={{padding:'6px 12px',fontSize:12}}
            onClick={()=>setHariri({wajibu:w,jina:'',simu:'',aina:[],active:true})}>+ Ongeza</Btn>
        </div>

        {watu.map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',
            borderTop:`1px solid #F1F6F3`,opacity:m.active?1:.5}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:INK}}>
                {m.jina} {!m.active&&<Badge color="#9AA5A0">Imezimwa</Badge>}
              </div>
              <div style={{fontSize:11,color:MUT,marginTop:2,fontFamily:'ui-monospace,Menlo,monospace'}}>
                {m.simu}{m.promo_code?` · ${m.promo_code}`:''}
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:5}}>
                {(m.aina||[]).length
                  ?m.aina.map(a=><Badge key={a} color={G1}>{ainaLab(a)}</Badge>)
                  :<span style={{fontSize:10.5,color:'#C2412D',fontWeight:600}}>Hajachagua arifa yoyote — hatapokea kitu</span>}
              </div>
            </div>
            <Btn v="ghost" style={{padding:'5px 10px',fontSize:11,flex:'none'}} onClick={()=>setHariri(m)}>Hariri</Btn>
          </div>
        ))}
        {!watu.length&&<div style={{fontSize:12,color:MUT,padding:'10px 0',borderTop:`1px solid #F1F6F3`}}>
          {w==='wakala'
            ?'Hakuna wakala. Kila mmoja anahitaji promo code yake ili apate wateja wake pekee.'
            :'Hakuna mtu hapa bado.'}
        </div>}
      </div>;
    })}

    {/* ===== MFANO WA SMS ===== */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 4px',color:INK}}>Hivi ndivyo SMS zinavyoonekana</h3>
      <p style={{fontSize:11.5,color:MUT,margin:'0 0 12px'}}>
        Kwa data halisi ya sasa. Zote ni SMS moja — mfumo unapunguza mistari zikizidi.
      </p>
      <Mfano jina="Kwa msimamizi — afya ya mfumo" m={mfanoAfya}/>
      <Mfano jina="Kwa masoko na wakala — wasiolipa"
        m={smsWasiolipa({idadi:wasiolipa.length,orodha:wasiolipa})||'(Hakuna mteja anayetakiwa kufuatiliwa leo)'}/>
      <Mfano jina="Kwa masoko na wakala — tiketi mpya"
        m={smsTiketiKazi({no:'TK-2026-000123',biashara:businesses?.[0]?.name||'DUKA LA MFANO',
          kitengo:'kiufundi',priority:'urgent',simu:businesses?.[0]?.phone||'0754812390'})}/>
      <Mfano jina="Kwa mteja — tiketi imepokelewa"
        m={smsTiketiMpya({no:'TK-2026-000123',kitengo:'kiufundi'})}/>
    </div>

    <HaririMpokeaji row={hariri} onClose={()=>setHariri(null)}
      onSave={async r=>{
        const res=await saveArifaMpokeaji(r);
        setJibu(res?.error?{ok:false,text:res.error}:{ok:true,text:'Imehifadhiwa.'});
        if(!res?.error)setHariri(null);
      }}
      onDel={async id=>{
        const res=await delArifaMpokeaji(id);
        setJibu(res?.error?{ok:false,text:res.error}:{ok:true,text:'Imeondolewa.'});
        if(!res?.error)setHariri(null);
      }}/>
  </div>;
}

function Mfano({jina,m}){
  const sehemu=sehemuZaSms(m);
  return <div style={{marginBottom:11}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
      <span style={{fontSize:11.5,fontWeight:700,color:MUT}}>{jina}</span>
      <span style={{fontSize:10.5,color:sehemu>1?'#C2412D':'#9AA5A0',fontWeight:700}}>
        herufi {urefuWaSms(m)} · SMS {sehemu}
      </span>
    </div>
    <pre style={{background:'#F6F8F7',border:`1px solid ${LINE}`,borderRadius:11,padding:'10px 12px',
      fontSize:12,color:INK,whiteSpace:'pre-wrap',margin:0,fontFamily:'ui-monospace,Menlo,monospace',lineHeight:1.5}}>{m}</pre>
  </div>;
}

function HaririMpokeaji({row,onClose,onSave,onDel}){
  const[f,setF]=useState(row||{});
  useEffect(()=>{setF(row||{})},[row]);
  if(!row)return null;

  const geuza=a=>setF(p=>({...p,aina:(p.aina||[]).includes(a)
    ?(p.aina||[]).filter(x=>x!==a):[...(p.aina||[]),a]}));

  const simuSahihi=/^0\d{9}$|^255\d{9}$|^\+255\d{9}$/.test(String(f.simu||'').replace(/\s/g,''));

  return <Modal open onClose={onClose} title={row.id?'Hariri mpokeaji':'Ongeza mpokeaji'}>
    <Input label="Jina" value={f.jina||''} onChange={e=>setF({...f,jina:e.target.value})} placeholder="Mfano: Asha Mwinyi"/>
    <Input label="Namba ya simu" value={f.simu||''} onChange={e=>setF({...f,simu:e.target.value.replace(/\s/g,'')})} placeholder="0713000000"/>
    {f.simu&&!simuSahihi&&<div style={{fontSize:11,color:'#C2412D',marginTop:-6,marginBottom:8}}>Namba si sahihi — tumia 0713000000 au 255713000000</div>}

    <Sel label="Wajibu" value={f.wajibu||'masoko'} onChange={e=>setF({...f,wajibu:e.target.value})}
      options={WAJIBU_ZOTE.map(w=>({value:w,label:wajibuLab(w)}))}/>

    {f.wajibu==='wakala'&&<>
      <Input label="Promo code yake" value={f.promo_code||''} onChange={e=>setF({...f,promo_code:e.target.value.toUpperCase()})} placeholder="WK01"/>
      <div style={{fontSize:11,color:MUT,marginTop:-6,marginBottom:10,lineHeight:1.6}}>
        Hii ndiyo inayoamua wateja wake. Bila promo code, hatapokea arifa yoyote ya mteja.
      </div>
    </>}

    <div style={{fontSize:11,fontWeight:800,color:MUT,letterSpacing:'.08em',textTransform:'uppercase',margin:'10px 0 8px'}}>Anapokea arifa zipi?</div>
    {AINA_ZOTE.map(a=>{
      const hai=(f.aina||[]).includes(a);
      return <label key={a} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'9px 11px',marginBottom:6,
        borderRadius:11,cursor:'pointer',border:hai?`1.5px solid ${G1}`:`1px solid ${LINE}`,background:hai?SOFT:'#fff'}}>
        <input type="checkbox" checked={hai} onChange={()=>geuza(a)} style={{marginTop:2}}/>
        <span style={{minWidth:0}}>
          <span style={{display:'block',fontSize:12.5,fontWeight:700,color:INK}}>{AINA_ARIFA[a].lab}</span>
          <span style={{display:'block',fontSize:10.5,color:MUT,marginTop:1}}>{AINA_ARIFA[a].maelezo}</span>
        </span>
      </label>;
    })}

    <label style={{display:'flex',gap:9,alignItems:'center',fontSize:12.5,color:MUT,margin:'10px 0 14px',cursor:'pointer',fontWeight:600}}>
      <input type="checkbox" checked={f.active!==false} onChange={e=>setF({...f,active:e.target.checked})}/>
      Anafanya kazi (ondoa alama badala ya kumfuta — historia inabaki)
    </label>

    <div style={{display:'flex',gap:8}}>
      {row.id&&<Btn v="ghost" style={{flex:1,color:'#C2412D'}} onClick={()=>onDel(row.id)}>Ondoa</Btn>}
      <Btn v="ghost" style={{flex:1}} onClick={onClose}>Acha</Btn>
      <Btn style={{flex:2}} disabled={!f.jina?.trim()||!simuSahihi} onClick={()=>onSave(f)}>Hifadhi</Btn>
    </div>
  </Modal>;
}
