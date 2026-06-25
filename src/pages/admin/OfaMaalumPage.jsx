import React,{useState,useEffect,useMemo} from 'react';
import { API_BASE } from '../../config/api';
import {useApp} from '../../context/AppContext';
import {IC,Modal,Empty,Input,Sel,Btn,Badge} from '../../components/UI';

const fmt=n=>(n||0).toLocaleString();
const fmtDate=d=>d?new Date(d).toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'}):'—';
const daysSince=d=>d?Math.floor((new Date()-new Date(d))/86400000):0;

export default function OfaMaalumPage(){
  const{businesses=[],supabase,user}=useApp();
  const[tab,setTab]=useState('eligible');
  const[search,setSearch]=useState('');
  const[applied,setApplied]=useState([]);
  const[selected,setSelected]=useState(null);
  const[modal,setModal]=useState(false);
  const[settings,setSettings]=useState({
    enabled:true,
    minMonths:1,            // Mteja awe ametumia angalau mwezi 1
    minPayment:15000,       // Rafiki alipe TSH 15,000
    bonusAmount:5000,       // Bonus TSH 5,000
    nextMonthPrice:10000,   // Mwezi unaofuata atalipa TSH 10,000
  });
  
  // Load applied bonuses from storage
  useEffect(()=>{
    (async()=>{
      try{
        const{data}=await supabase?.from('referral_bonuses').select('*').order('created_at',{ascending:false})||{};
        if(data)setApplied(data);
      }catch(e){}
      try{
        const{data}=await supabase?.from('settings').select('value').eq('key','ofa_settings').maybeSingle()||{};
        if(data?.value)setSettings({...settings,...JSON.parse(data.value)});
      }catch(e){}
    })();
  },[]);
  
  // Calculate ELIGIBLE customers
  const eligible=useMemo(()=>{
    return businesses.filter(b=>{
      if(!b.token_active)return false; // Must be active payer
      if(b.is_suspended)return false;
      const months=Math.floor(daysSince(b.created_at)/30);
      if(months<settings.minMonths)return false;
      return true;
    }).map(b=>{
      const months=Math.floor(daysSince(b.created_at)/30);
      const refCode='REF-'+b.id.slice(0,8).toUpperCase();
      // Count referred-by-this-customer (those who used this customer's ref code on signup)
      const referred=businesses.filter(x=>x.referred_by===refCode||x.referred_by===b.id);
      const referredPaid=referred.filter(x=>x.token_active);
      // Has applied bonus already this month?
      const thisMonth=new Date().toISOString().slice(0,7);
      const monthBonuses=applied.filter(a=>a.business_id===b.id&&a.month===thisMonth);
      return{
        ...b,
        months,
        refCode,
        referredCount:referred.length,
        referredPaidCount:referredPaid.length,
        referred,
        referredPaid,
        bonusesThisMonth:monthBonuses.length,
        totalBonusesGiven:applied.filter(a=>a.business_id===b.id).length,
      };
    });
  },[businesses,applied,settings]);
  
  // Customers who QUALIFY for bonus (have referred someone who paid)
  const qualifying=eligible.filter(b=>b.referredPaidCount>0);
  
  // Apply bonus
  const applyBonus=async(biz,referredBiz)=>{
    if(!confirm(`Toa bonus ya TSH ${fmt(settings.bonusAmount)} kwa ${biz.name}?\n\nMwezi unaofuata atalipa TSH ${fmt(settings.nextMonthPrice)} badala ya TSH ${fmt(15000)}.`))return;
    
    const record={
      business_id:biz.id,
      business_name:biz.name,
      referred_business_id:referredBiz.id,
      referred_business_name:referredBiz.name,
      bonus_amount:settings.bonusAmount,
      next_month_price:settings.nextMonthPrice,
      month:new Date().toISOString().slice(0,7),
      applied_by:user?.id,
      status:'pending', // pending until applied to payment
    };
    
    try{
      const{data}=await supabase?.from('referral_bonuses').insert(record).select().single()||{};
      if(data){
        setApplied(p=>[data,...p]);
        // Send SMS to customer
        const msg=`DUKA LANGU\n\n🎉 OFA MAALUM!\n\nHongera ${biz.owner_name||biz.name}!\n\nRafiki yako ${referredBiz.name} amejiunga na kulipa.\n\nBONUS YAKO: TSH ${fmt(settings.bonusAmount)}\n\nMwezi unaofuata utalipa:\n* TSH ${fmt(settings.nextMonthPrice)} (badala ya TSH 15,000)\n\nAsante kwa kuwa mteja wetu!\nMsaada: 0617288752`;
        fetch(API_BASE+'/api/send-sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:biz.phone,message:msg})});
        alert(`✅ Bonus imetolewa!\n\n${biz.name} atapata punguzo la TSH ${fmt(settings.bonusAmount)} mwezi unaofuata.`);
      }
    }catch(e){
      console.error(e);
      alert('❌ Tatizo: '+e.message);
    }
  };
  
  // Save settings
  const saveSettings=async()=>{
    try{
      await supabase?.from('settings').upsert({key:'ofa_settings',value:JSON.stringify(settings)});
      alert('✅ Mipangilio imehifadhiwa!');
    }catch(e){alert('Tatizo: '+e.message)}
  };
  
  // Stats
  const stats={
    eligibleCount:eligible.length,
    qualifyingCount:qualifying.length,
    totalBonusesGiven:applied.length,
    totalSavings:applied.reduce((s,a)=>s+(a.bonus_amount||0),0),
    thisMonthBonuses:applied.filter(a=>a.month===new Date().toISOString().slice(0,7)).length,
  };
  
  // Filter list
  const filtered=(tab==='eligible'?eligible:tab==='qualifying'?qualifying:[])
    .filter(b=>!search||b.name?.toLowerCase().includes(search.toLowerCase())||b.phone?.includes(search));
  
  return <div>
    {/* HEADER */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap',marginBottom:16}}>
      <div>
        <h2 style={{fontSize:24,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px',display:'flex',alignItems:'center',gap:8}}>
          🎁 Ofa Maalum — Referral Bonus
        </h2>
        <p style={{fontSize:12,color:'#64748B',margin:0}}>Simamia ofa za referral na utoe bonus kwa wateja waliokushinda</p>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setModal(true)} style={{padding:'10px 18px',borderRadius:10,border:'2px solid #8B5CF6',background:'#F5F3FF',color:'#7C3AED',fontWeight:700,fontSize:13,cursor:'pointer'}}>⚙️ Mipangilio</button>
      </div>
    </div>
    
    {/* CURRENT OFFER BANNER */}
    <div style={{background:'linear-gradient(135deg,#0B7A3B 0%,#065F2E 100%)',borderRadius:18,padding:24,marginBottom:18,color:'#fff',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
      <div style={{position:'absolute',bottom:-60,left:-60,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
      <div style={{position:'relative',zIndex:1,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:18}}>
        <div>
          <div style={{display:'inline-block',padding:'4px 12px',background:'rgba(255,255,255,0.2)',borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>📋 VIGEZO</div>
          <div style={{fontSize:13,opacity:0.95,lineHeight:1.7}}>
            ✓ Mteja amerumia mfumo angalau <b>mwezi {settings.minMonths}</b><br/>
            ✓ Amealika rafiki yake<br/>
            ✓ Rafiki amefanya malipo ya <b>TSH {fmt(settings.minPayment)}</b>
          </div>
        </div>
        <div>
          <div style={{display:'inline-block',padding:'4px 12px',background:'rgba(255,255,255,0.2)',borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>🎁 BONUS</div>
          <div style={{fontSize:32,fontWeight:900,lineHeight:1,marginBottom:4}}>TSH {fmt(settings.bonusAmount)}</div>
          <div style={{fontSize:12,opacity:0.9}}>kupunguzwa mwezi unaofuata</div>
          <div style={{fontSize:11,opacity:0.85,marginTop:6}}>Atalipa <b>TSH {fmt(settings.nextMonthPrice)}</b> badala ya TSH 15,000</div>
        </div>
        <div>
          <div style={{display:'inline-block',padding:'4px 12px',background:'rgba(255,255,255,0.2)',borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>📊 HALI</div>
          <div style={{fontSize:13,opacity:0.95,lineHeight:1.8}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Walio-qualify:</span><b>{stats.eligibleCount}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Wenye Referrals:</span><b>{stats.qualifyingCount}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Bonus zilizotolewa:</span><b>{stats.totalBonusesGiven}</b></div>
          </div>
        </div>
      </div>
    </div>
    
    {/* STATS CARDS */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:16}}>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #22C55E'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:700,letterSpacing:.5}}>WALIO-QUALIFY</div>
        <div style={{fontSize:28,fontWeight:900,color:'#22C55E'}}>{stats.eligibleCount}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>mwezi {settings.minMonths}+</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #F59E0B'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:700,letterSpacing:.5}}>WENYE REFERRAL</div>
        <div style={{fontSize:28,fontWeight:900,color:'#F59E0B'}}>{stats.qualifyingCount}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>tayari kupata bonus</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #3B82F6'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:700,letterSpacing:.5}}>BONUS LEO</div>
        <div style={{fontSize:28,fontWeight:900,color:'#3B82F6'}}>{stats.thisMonthBonuses}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>mwezi huu</div>
      </div>
      <div className="card" style={{padding:14,textAlign:'center',borderLeft:'4px solid #8B5CF6'}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:700,letterSpacing:.5}}>JUMLA YA BONUS</div>
        <div style={{fontSize:18,fontWeight:900,color:'#8B5CF6'}}>TSH {fmt(stats.totalSavings)}</div>
        <div style={{fontSize:10,color:'#94A3B8'}}>tumetoa</div>
      </div>
    </div>
    
    {/* TABS */}
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {[
        {v:'qualifying',l:`✨ Wamefikia Vigezo (${stats.qualifyingCount})`,c:'#F59E0B'},
        {v:'eligible',l:`✅ Wote Walio-qualify (${stats.eligibleCount})`,c:'#22C55E'},
        {v:'history',l:`📋 Historia (${stats.totalBonusesGiven})`,c:'#8B5CF6'},
      ].map(t=><button key={t.v} onClick={()=>setTab(t.v)} style={{padding:'10px 16px',borderRadius:10,border:tab===t.v?`2px solid ${t.c}`:'1px solid #E2E8F0',background:tab===t.v?'#fff':'#F8FAFC',color:tab===t.v?t.c:'#64748B',fontWeight:tab===t.v?800:500,fontSize:13,cursor:'pointer',transition:'all 0.2s'}}>{t.l}</button>)}
    </div>
    
    {/* SEARCH */}
    {tab!=='history'&&<input type="text" placeholder="🔍 Tafuta jina la biashara au simu..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,marginBottom:14,boxSizing:'border-box'}}/>}
    
    {/* QUALIFYING TAB - Customers who can get bonus NOW */}
    {tab==='qualifying'&&<div className="card" style={{padding:0,overflow:'hidden'}}>
      {filtered.length?filtered.map(b=><div key={b.id} style={{padding:16,borderBottom:'1px solid #F1F5F9',background:b.bonusesThisMonth>0?'#F0FDF4':'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:240}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
              <div style={{fontSize:15,fontWeight:800,color:'#1E293B'}}>{b.name}</div>
              {b.bonusesThisMonth>0&&<span style={{background:'#DCFCE7',color:'#15803D',padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>✓ AMEPATA BONUS MWEZI HUU</span>}
              <span style={{background:'#FEF3C7',color:'#92400E',padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>🎁 {b.referredPaidCount} REFERRALS</span>
            </div>
            <div style={{fontSize:12,color:'#64748B',marginBottom:4}}>
              👤 {b.owner_name||'—'} • 📞 {b.phone||'—'} • 📅 Mteja kwa <b>miezi {b.months}</b>
            </div>
            <div style={{fontSize:11,color:'#94A3B8',fontFamily:'monospace',background:'#F1F5F9',padding:'3px 8px',borderRadius:6,display:'inline-block'}}>
              {b.refCode}
            </div>
            
            {/* Referred customers */}
            <div style={{marginTop:10,background:'#F8FAFC',borderRadius:8,padding:10}}>
              <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:6}}>🎯 Wateja Aliowaalika:</div>
              {b.referredPaid.map(r=><div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px dashed #E2E8F0',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700}}>{r.name}</div>
                  <div style={{fontSize:10,color:'#64748B'}}>Alijiunga: {fmtDate(r.created_at)} • <span style={{color:'#22C55E',fontWeight:700}}>✓ Amelipa</span></div>
                </div>
                <button onClick={()=>applyBonus(b,r)} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',boxShadow:'0 4px 12px rgba(245,158,11,0.3)'}}>
                  🎁 Toa Bonus
                </button>
              </div>)}
            </div>
          </div>
        </div>
      </div>):<Empty icon="✨" text="Hakuna mteja aliyefikia vigezo bado"/>}
    </div>}
    
    {/* ELIGIBLE TAB - All customers who qualify by tenure */}
    {tab==='eligible'&&<div className="card" style={{padding:0,overflow:'hidden'}}>
      {filtered.length?filtered.map(b=><div key={b.id} style={{padding:14,borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontWeight:800,fontSize:14,color:'#1E293B'}}>{b.name}</div>
            <div style={{fontSize:11,color:'#64748B'}}>👤 {b.owner_name||'—'} • 📞 {b.phone||'—'}</div>
            <div style={{fontSize:10,color:'#94A3B8',marginTop:4,fontFamily:'monospace'}}>{b.refCode}</div>
          </div>
          <div style={{display:'flex',gap:16,fontSize:11,textAlign:'center'}}>
            <div>
              <div style={{color:'#94A3B8',fontWeight:600}}>MIEZI</div>
              <div style={{fontWeight:900,color:'#0B7A3B',fontSize:16}}>{b.months}</div>
            </div>
            <div>
              <div style={{color:'#94A3B8',fontWeight:600}}>REFERRALS</div>
              <div style={{fontWeight:900,color:b.referredCount>0?'#F59E0B':'#CBD5E1',fontSize:16}}>{b.referredCount}</div>
            </div>
            <div>
              <div style={{color:'#94A3B8',fontWeight:600}}>WAMELIPA</div>
              <div style={{fontWeight:900,color:b.referredPaidCount>0?'#22C55E':'#CBD5E1',fontSize:16}}>{b.referredPaidCount}</div>
            </div>
          </div>
        </div>
      </div>):<Empty icon="✅" text="Hakuna walio-qualify bado"/>}
    </div>}
    
    {/* HISTORY TAB */}
    {tab==='history'&&<div className="card" style={{padding:0,overflow:'hidden'}}>
      {applied.length?applied.map(a=><div key={a.id} style={{padding:14,borderBottom:'1px solid #F1F5F9'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <div style={{fontWeight:800,fontSize:14,color:'#1E293B'}}>🎁 {a.business_name}</div>
              <span style={{background:a.status==='applied'?'#DCFCE7':'#FEF3C7',color:a.status==='applied'?'#15803D':'#92400E',padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:700}}>{a.status==='applied'?'✓ IMETUMIKA':'⏳ INASUBIRI'}</span>
            </div>
            <div style={{fontSize:12,color:'#64748B',marginTop:3}}>
              Aliyekuletea: <b>{a.referred_business_name}</b> • {fmtDate(a.created_at)}
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'#94A3B8'}}>Bonus:</div>
            <div style={{fontSize:18,fontWeight:900,color:'#22C55E'}}>TSH {fmt(a.bonus_amount)}</div>
          </div>
        </div>
      </div>):<Empty icon="📋" text="Hakuna bonus zilizotolewa bado"/>}
    </div>}
    
    {/* SETTINGS MODAL */}
    <Modal open={modal} onClose={()=>setModal(false)} title="⚙️ Mipangilio ya Ofa">
      <div style={{background:'#F0FDF4',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#15803D'}}>
        💡 Badili vigezo vya ofa hapa. Mabadiliko yataathirika kwa wateja wote.
      </div>
      
      <Input label="Mwezi wa Chini (Vigezo)" type="number" value={settings.minMonths} onChange={e=>setSettings({...settings,minMonths:+e.target.value})}/>
      <Input label="Kiasi cha Chini cha Rafiki Kulipa (TSH)" type="number" value={settings.minPayment} onChange={e=>setSettings({...settings,minPayment:+e.target.value})}/>
      <Input label="Bonus ya Mteja (TSH)" type="number" value={settings.bonusAmount} onChange={e=>setSettings({...settings,bonusAmount:+e.target.value})}/>
      <Input label="Bei ya Mwezi Unaofuata (TSH)" type="number" value={settings.nextMonthPrice} onChange={e=>setSettings({...settings,nextMonthPrice:+e.target.value})}/>
      
      <div style={{padding:'12px',background:'#F8FAFC',borderRadius:10,marginTop:8,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>Ofa Inafanya Kazi?</div>
            <div style={{fontSize:11,color:'#64748B'}}>Zima kuto-toa bonus mpya</div>
          </div>
          <button onClick={()=>setSettings({...settings,enabled:!settings.enabled})} style={{position:'relative',width:48,height:26,borderRadius:13,background:settings.enabled?'#22C55E':'#CBD5E1',border:'none',cursor:'pointer'}}>
            <div style={{position:'absolute',top:3,left:settings.enabled?25:3,width:20,height:20,borderRadius:'50%',background:'#fff',boxShadow:'0 2px 4px rgba(0,0,0,0.2)',transition:'left 0.25s'}}/>
          </button>
        </div>
      </div>
      
      <button onClick={saveSettings} style={{width:'100%',padding:14,background:'linear-gradient(135deg,#7C3AED,#5B21B6)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>💾 Hifadhi Mipangilio</button>
    </Modal>
  </div>;
}
