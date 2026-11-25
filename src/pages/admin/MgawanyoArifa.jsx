import React,{useState,useEffect,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {Badge} from '../../components/UI';
import {
  AINA_ARIFA,AINA_ZOTE,ainaLab,ARIFA_ZA_CHEO,CHEO_ZA_KAZI,cheoCha,cheoLab,
  arifaZake,wapokeajiWa,niWakala,
  smsAfya,smsWasiolipa,smsTiketiKazi,smsTiketiMpya,
  orodhaYaWasiolipa,urefuWaSms,sehemuZaSms,
} from '../../utils/tiketi';

// ============================================================
// DukaLangu — ARIFA ZA WAFANYAKAZI
//
// Hakuna mtu wa kuongeza hapa. Wafanyakazi tayari wako kwenye
// mfumo, na cheo cha kila mmoja ndicho kinachoamua arifa
// anazozipata — kama ilivyo kwa arifa za malipo.
//
// Ukurasa huu ni wa KUONA: nani anapokea nini, na SMS yenyewe
// inavyoonekana. Kubadilisha ni kwa kumbadilishia mtu cheo au
// namba ya simu kwenye akaunti yake.
// ============================================================

const G1='#0A6E47',INK='#17231D',MUT='#5C6A62',LINE='#D6E2DB',SOFT='#E6F2EC';

const SWICHI=[
  ['arifa_kazi_enabled','Arifa za wafanyakazi','Swichi kuu. Ikizimwa, hakuna arifa yoyote inayotoka kwenda kwa wafanyakazi.'],
  ['arifa_afya_enabled','Afya ya mfumo','Kila siku asubuhi kwa msimamizi.'],
  ['arifa_wasiolipa_enabled','Wateja wasiolipa','Kila siku kwa masoko na mawakala.'],
  ['arifa_tiketi_enabled','Tiketi mpya','Papo hapo mteja anapotuma tiketi.'],
  ['tiketi_sms_mteja','SMS ya tiketi kwa mteja','Mteja anapata namba ya tiketi na taarifa ya kila hatua.'],
];

export default function MgawanyoArifa(){
  const{businesses=[],tickets=[]}=useApp();
  const[cfg,setCfg]=useState({});
  const[watu,setWatu]=useState([]);
  const[kosa,setKosa]=useState('');
  const[jibu,setJibu]=useState(null);
  const[saving,setSaving]=useState(false);
  const[inasoma,setInasoma]=useState(true);

  useEffect(()=>{(async()=>{
    setInasoma(true);
    try{
      const{data}=await supabase.from('settings').select('key,value').in('key',SWICHI.map(s=>s[0]));
      const c={};(data||[]).forEach(r=>{c[r.key]=r.value});setCfg(c);
    }catch{/* mipangilio haipo bado */}
    try{
      // `select('*')` kwa makusudi: kutaja safu kwa majina kunafanya
      // query nzima ife kama safu moja haipo kwenye jedwali lako.
      const{data,error}=await supabase.from('users').select('*');
      if(error){setKosa(error.message);setWatu([])}
      else{
        const wote=data||[];
        const kazi=wote.filter(u=>CHEO_ZA_KAZI.includes(cheoCha(u))).filter(u=>u.is_active!==false);
        setWatu(kazi);
        if(!kazi.length){
          const vyeo=[...new Set(wote.map(u=>u.role).filter(Boolean))];
          setKosa(wote.length
            ?`Nimesoma watumiaji ${wote.length}, lakini hakuna mwenye cheo cha kazi. Vyeo vilivyopo: ${vyeo.join(', ')||'(hakuna)'}`
            :'Hakuna mtumiaji aliyerudishwa — inawezekana kinga (RLS) ya jedwali la users inakuzuia.');
        }
      }
    }catch(e){setKosa(e.message)}
    setInasoma(false);
  })()},[]);

  const washa=async(k,v)=>{
    setCfg(p=>({...p,[k]:v?'true':'false'}));setSaving(true);
    try{
      const{error}=await supabase.from('settings').upsert({key:k,value:v?'true':'false'},{onConflict:'key'});
      if(error)throw error;
      setJibu({ok:true,text:'Imehifadhiwa.'});
    }catch(e){
      setCfg(p=>({...p,[k]:v?'false':'true'}));
      setJibu({ok:false,text:'Imeshindikana kuhifadhi: '+e.message});
    }
    setSaving(false);
  };

  const imewashwa=k=>cfg[k]!=='false';
  const kuuImezimwa=cfg.arifa_kazi_enabled==='false';

  const wasiolipa=useMemo(()=>orodhaYaWasiolipa(businesses),[businesses]);
  const wazi=(tickets||[]).filter(t=>t.status!=='closed');
  const mfanoAfya=smsAfya({
    tiketiWazi:wazi.length,
    tiketiDharura:wazi.filter(t=>t.priority==='urgent').length,
    wasiolipa:wasiolipa.length,
    makaziHai:(businesses||[]).filter(b=>b.token_active).length,
  });

  // Mtu asiye na namba ya simu hapokei chochote — na hilo
  // halionekani popote pengine mpaka siku arifa inaposhindwa.
  const hawanaSimu=watu.filter(u=>!u.phone&&arifaZake(u).length);
  const wakalaBilaCode=watu.filter(u=>niWakala(u)&&u.phone&&!u.promo_code);

  return <div>
    {jibu&&<div style={{background:jibu.ok?SOFT:'#FBECE9',color:jibu.ok?'#15803D':'#B91C1C',
      padding:'10px 14px',borderRadius:11,marginBottom:14,fontWeight:600,fontSize:13}}>{jibu.text}</div>}

    <div style={{background:'linear-gradient(135deg,#064E2B,#0A6E47)',borderRadius:18,padding:'18px 20px',marginBottom:14,color:'#fff'}}>
      <div style={{fontSize:16,fontWeight:900,marginBottom:6}}>📣 Arifa za Wafanyakazi</div>
      <div style={{fontSize:12.5,opacity:.92,lineHeight:1.7}}>
        Hakuna mtu wa kuongeza hapa. Cheo cha mfanyakazi mfumoni ndicho kinachoamua
        arifa anazozipata, na namba yake inatoka kwenye akaunti yake.
        Kubadilisha, mbadilishie cheo au namba — arifa zinafuata mara moja.
      </div>
    </div>

    {/* ===== NANI ANAPOKEA NINI ===== */}
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 10px',color:INK}}>Nani anapokea nini</h3>
      {CHEO_ZA_KAZI.map(cheo=>{
        const arifa=ARIFA_ZA_CHEO[cheo]||[];
        const wao=watu.filter(u=>cheoCha(u)===cheo);
        return <div key={cheo} style={{padding:'11px 0',borderTop:`1px solid #F1F6F3`}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'baseline'}}>
            <div style={{fontSize:13.5,fontWeight:800,color:INK}}>
              {cheoLab(cheo)} <span style={{fontWeight:600,color:MUT,fontSize:12}}>({wao.length})</span>
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {arifa.length
                ?arifa.map(a=><Badge key={a} color={G1}>{ainaLab(a)}</Badge>)
                :<span style={{fontSize:11,color:MUT}}>Hapokei arifa za mfumo</span>}
            </div>
          </div>
          {wao.length>0&&<div style={{fontSize:11.5,color:MUT,marginTop:5,lineHeight:1.7}}>
            {wao.map(u=>(
              <span key={u.id} style={{marginRight:12,whiteSpace:'nowrap'}}>
                {u.name||u.email}
                <span style={{fontFamily:'ui-monospace,Menlo,monospace',color:u.phone?MUT:'#C2412D'}}>
                  {' '}{u.phone||'(hana simu)'}
                </span>
                {niWakala(u)&&<span style={{color:u.promo_code?MUT:'#C2412D'}}> · {u.promo_code||'hana promo code'}</span>}
              </span>
            ))}
          </div>}
          {cheo==='agent'||cheo==='supervisor'
            ?<div style={{fontSize:10.5,color:MUT,marginTop:4,fontStyle:'italic'}}>Wateja wake pekee, kwa promo code yake</div>
            :null}
        </div>;
      })}

      {inasoma&&<div style={{fontSize:12,color:MUT,paddingTop:10}}>Inasoma wafanyakazi…</div>}
      {!inasoma&&kosa&&<div style={{background:'#FBECE9',borderRadius:10,padding:'9px 12px',marginTop:10,
        fontSize:11.5,color:'#B91C1C',lineHeight:1.6}}>{kosa}</div>}

      {hawanaSimu.length>0&&<div style={{background:'#FFF8E6',color:'#92400E',fontSize:11.5,
        padding:'9px 12px',borderRadius:10,marginTop:10,lineHeight:1.6}}>
        <b>Hawapokei chochote kwa sababu hawana namba ya simu:</b> {hawanaSimu.map(u=>u.name||u.email).join(', ')}.
        Weka namba kwenye akaunti zao.
      </div>}
      {wakalaBilaCode.length>0&&<div style={{background:'#FFF8E6',color:'#92400E',fontSize:11.5,
        padding:'9px 12px',borderRadius:10,marginTop:8,lineHeight:1.6}}>
        <b>Mawakala hawa hawana promo code:</b> {wakalaBilaCode.map(u=>u.name||u.email).join(', ')}.
        Bila hiyo hawatambuliwi wateja wao, kwa hiyo hawapokei arifa yoyote ya mteja.
      </div>}
    </div>

    {/* ===== SWICHI ===== */}
    <div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14.5,fontWeight:800,margin:'0 0 4px',color:INK}}>Arifa zinazofanya kazi</h3>
      <p style={{fontSize:11.5,color:MUT,margin:'0 0 10px'}}>Zote zimewashwa. Zima kama hutaki gharama ya SMS.</p>
      {SWICHI.map(([k,jina,maelezo],i)=>{
        const hai=imewashwa(k),zimwa=i>0&&kuuImezimwa;
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
        Swichi kuu imezimwa — hakuna arifa inayotoka, hata zilizowashwa.
      </div>}
    </div>

    {/* ===== MFANO WA SMS ===== */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 4px',color:INK}}>Hivi ndivyo SMS zinavyoonekana</h3>
      <p style={{fontSize:11.5,color:MUT,margin:'0 0 12px'}}>
        Kwa data halisi ya sasa. Zote ni SMS moja — mfumo unapunguza mistari zikizidi.
      </p>
      <Mfano jina={`Kwa msimamizi — afya ya mfumo (${wapokeajiWa(watu,'afya').length})`} m={mfanoAfya}/>
      <Mfano jina={`Kwa masoko na mawakala — wasiolipa (${wapokeajiWa(watu,'wasiolipa').length})`}
        m={smsWasiolipa({idadi:wasiolipa.length,orodha:wasiolipa})||'(Hakuna mteja anayetakiwa kufuatiliwa leo)'}/>
      <Mfano jina={`Kwa masoko na mawakala — tiketi mpya (${wapokeajiWa(watu,'tiketi').length})`}
        m={smsTiketiKazi({no:'TK-2026-000123',biashara:businesses?.[0]?.name||'DUKA LA MFANO',
          kitengo:'kiufundi',priority:'urgent',simu:businesses?.[0]?.phone||'0754812390'})}/>
      <Mfano jina="Kwa mteja — tiketi imepokelewa"
        m={smsTiketiMpya({no:'TK-2026-000123',kitengo:'kiufundi'})}/>
    </div>
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
