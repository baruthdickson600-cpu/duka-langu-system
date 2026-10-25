import React from 'react';
import {IC} from '../components/UI';

export function TermsPage({onBack}){
  return <div style={{minHeight:'100vh',background:'#F8FAFC',padding:16}}>
    <div style={{maxWidth:700,margin:'0 auto'}}>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'#0B7A3B',fontWeight:600,fontSize:14,marginBottom:16,cursor:'pointer'}}>← Rudi</button>
      <div style={{background:'#fff',borderRadius:16,padding:'28px 24px',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#1E293B',marginBottom:4}}>📄 TERMS OF SERVICE</h1>
        <p style={{fontSize:13,color:'#64748B',marginBottom:20}}>Masharti ya Huduma — Duka Langu Platform | Effective: 04/04/2026</p>

        <Section t="1. Utangulizi" c="Karibu kwenye mfumo wa Duka Langu. Masharti haya yanaelezea sheria na taratibu za matumizi ya mfumo wetu wa POS, usimamizi wa biashara, na huduma zinazohusiana. Kwa kutumia huduma hii, unakubali masharti haya kikamilifu."/>
        <Section t="2. Maelezo ya Huduma" c="Duka Langu inatoa: Mfumo wa POS (Point of Sale), Usimamizi wa biashara na mauzo, Uhifadhi wa data kupitia Supabase, SMS notifications (receipts, alerts, reports)."/>
        <Section t="3. Usajili na Akaunti" c="Mtumiaji anatakiwa kutoa taarifa sahihi. Akaunti ni ya mtumiaji binafsi. Mtumiaji anawajibika kulinda nenosiri lake. Duka Langu ina haki ya kusimamisha akaunti ikiwa masharti yatakiukwa."/>
        <Section t="4. Matumizi Yanayoruhusiwa" c="Hairuhusiwi: Kutumia mfumo kwa shughuli zisizo halali, Kujaribu kuvuruga au kuingilia mfumo, Kutoa taarifa za uongo."/>
        <Section t="5. Malipo na Ada" c="Baadhi ya huduma zitahitaji malipo. Bei zinaweza kubadilika kwa taarifa ya awali. Malipo hayarudishwi isipokuwa imeelezwa tofauti."/>
        <Section t="6. SMS na Mawasiliano" c="Kwa kutumia huduma hii: Unakubali kupokea SMS (OTP, receipts, reports). SMS zinaweza kutumwa kupitia third-party providers. Mfumo unaweza kutuma daily sales report kiotomatiki."/>
        <Section t="7. Uhifadhi wa Data" c="Data zako zinahifadhiwa kupitia Supabase. Tunafanya automatic backups mara kwa mara. Tunatumia mifumo ya kisasa ya usalama kulinda taarifa zako."/>
        <Section t="8. Upatikanaji wa Huduma" c="Tunalenga uptime ya karibu 99.9%. Tunaweza kufanya matengenezo ya muda mfupi ili kuboresha mfumo. Tutatoa taarifa pale inapowezekana kabla ya matengenezo."/>
        <Section t="9. Msaada kwa Wateja" c="Tunatoa msaada wa kiufundi kwa watumiaji. Masuala muhimu yatashughulikiwa ndani ya masaa 24. Tunajitahidi kuhakikisha mfumo wako unaendelea kufanya kazi bila usumbufu."/>
        <Section t="10. Ukomo wa Uwajibikaji" c="Duka Langu inajitahidi kutoa huduma salama na ya kuaminika. Data zako zinalindwa na backup systems. Hitilafu zinarekebishwa haraka iwezekanavyo. Maboresho yanafanyika mara kwa mara."/>
        <Section t="11. Kusitisha Huduma" c="Tunaweza kusimamisha au kufuta akaunti ikiwa masharti yatakiukwa."/>
        <Section t="12. Mabadiliko ya Masharti" c="Masharti haya yanaweza kubadilishwa muda wowote."/>
        <Section t="13. Sheria" c="Masharti haya yataongozwa na sheria za Jamhuri ya Muungano wa Tanzania."/>
        <Section t="14. Mawasiliano" c="Email: baruthdickson600@gmail.com | Simu: +255 628 986 770"/>
      </div>
    </div>
  </div>;
}

export function PrivacyPage({onBack}){
  return <div style={{minHeight:'100vh',background:'#F8FAFC',padding:16}}>
    <div style={{maxWidth:700,margin:'0 auto'}}>
      <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'#0B7A3B',fontWeight:600,fontSize:14,marginBottom:16,cursor:'pointer'}}>← Rudi</button>
      <div style={{background:'#fff',borderRadius:16,padding:'28px 24px',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#1E293B',marginBottom:4}}>🔒 SERA YA FARAGHA</h1>
        <p style={{fontSize:13,color:'#64748B',marginBottom:20}}>Privacy Policy — Duka Langu Platform | Effective: 04/04/2026</p>

        <Section t="1. Utangulizi" c="Duka Langu inalinda faragha ya watumiaji wake kwa viwango vya juu vya usalama wa taarifa."/>
        <Section t="2. Taarifa Tunazokusanya" c="Tunakusanya: Jina kamili, Namba ya simu, Barua pepe, Taarifa za biashara, Data za mauzo (POS transactions), Device & usage data."/>
        <Section t="3. Matumizi ya Taarifa" c="Taarifa zako hutumika kwa: Kuendesha mfumo wa POS, Kutuma SMS (receipts, reports, alerts), Kuboresha huduma, Kuzuia udanganyifu."/>
        <Section t="4. Uhifadhi wa Data" c="Data zinahifadhiwa kupitia Supabase. Tunatumia encryption na secure APIs. Tunafanya backups mara kwa mara."/>
        <Section t="5. Kushiriki Taarifa" c="Hatutauza data zako. Tunaweza kushiriki kwa watoa huduma (SMS APIs, hosting), kwa mujibu wa sheria, na kulinda usalama wa mfumo."/>
        <Section t="6. SMS & Notifications" c="Kwa kutumia huduma: Unakubali kupokea SMS kutoka Duka Langu. SMS zinaweza kuwa za mauzo, OTP, na taarifa muhimu."/>
        <Section t="7. Usalama wa Taarifa" c="Tunatumia: Encryption, Access control, Secure infrastructure. Tunajitahidi kuhakikisha data zako ziko salama muda wote."/>
        <Section t="8. Haki za Mtumiaji" c="Una haki ya: Kuomba taarifa zako, Kusahihisha taarifa, Kufuta akaunti, Kudhibiti matumizi ya data."/>
        <Section t="9. Data Retention" c="Data huhifadhiwa kwa muda unaohitajika. Inaweza kufutwa baada ya akaunti kufungwa."/>
        <Section t="10. Cookies" c="Tunatumia cookies kuboresha matumizi ya mfumo."/>
        <Section t="11. Mabadiliko" c="Sera inaweza kubadilishwa muda wowote."/>
        <Section t="12. Mawasiliano" c="Email: baruthdickson600@gmail.com | Simu: +255 628 986 770"/>
      </div>
    </div>
  </div>;
}

function Section({t,c}){
  return <div style={{marginBottom:16}}>
    <h3 style={{fontSize:14,fontWeight:700,color:'#1E293B',marginBottom:4}}>{t}</h3>
    <p style={{fontSize:13,color:'#475569',lineHeight:1.7}}>{c}</p>
  </div>;
}
