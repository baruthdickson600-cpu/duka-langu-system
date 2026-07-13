import React,{useState,useMemo,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {Input,Btn,Badge,Empty,IC,Modal} from '../../components/UI';
import {fmtMoney} from '../../utils/helpers';

// ============================================================
// USAFISHAJI WA AKAUNTI — Zima kwanza, futa baadaye
// Salama: inaonyesha data ya kila akaunti kabla ya hatua yoyote
// ============================================================

export default function AccountCleanupPage(){
  const{businesses,currency,updateBiz}=useApp();
  const[filter,setFilter]=useState('suspicious');
  const[search,setSearch]=useState('');
  const[selected,setSelected]=useState([]);
  const[stats,setStats]=useState({}); // data ya kila biashara
  const[loading,setLoading]=useState(true);
  const[confirmModal,setConfirmModal]=useState(null); // 'suspend' | 'delete' | 'restore'
  const[confirmText,setConfirmText]=useState('');
  const[busy,setBusy]=useState(false);
  const[detail,setDetail]=useState(null);
  const fm=n=>fmtMoney(n,currency||'TZS');

  // Pakia takwimu za kila biashara (mauzo, bidhaa, malipo)
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const[{data:sales},{data:prods},{data:pays}]=await Promise.all([
          supabase.from('sales').select('business_id,total'),
          supabase.from('products').select('business_id'),
          supabase.from('payment_requests').select('business_id,status,amount'),
        ]);
        const s={};
        (businesses||[]).forEach(b=>{
          const bizSales=(sales||[]).filter(x=>x.business_id===b.id);
          const bizProds=(prods||[]).filter(x=>x.business_id===b.id);
          const bizPays=(pays||[]).filter(x=>x.business_id===b.id&&x.status==='approved');
          s[b.id]={
            sales:bizSales.length,
            revenue:bizSales.reduce((a,x)=>a+(x.total||0),0),
            products:bizProds.length,
            payments:bizPays.length,
            paid:bizPays.reduce((a,x)=>a+(x.amount||0),0),
          };
        });
        setStats(s);
      }catch(e){console.warn('[cleanup]',e?.message);}
      setLoading(false);
    })();
  },[businesses]);

  const now=Date.now();

  // Ainisha kila akaunti
  const classify=(b)=>{
    const st=stats[b.id]||{};
    const end=b.token_active?b.token_expiry:b.trial_end;
    const expired=end&&new Date(end)<now;
    const daysOld=b.created_at?Math.floor((now-new Date(b.created_at))/86400000):0;
    const hasData=(st.sales>0)||(st.products>0);
    const hasPaid=(st.payments>0);
    const nameLower=(b.name||'').toLowerCase();
    const isTestName=/test|demo|jaribio|asdf|xxx|123|aaa/.test(nameLower);

    // Sababu za kuwa "suspicious"
    const reasons=[];
    if(isTestName)reasons.push('Jina la majaribio');
    if(!hasData&&daysOld>14)reasons.push('Hakuna data (siku 14+)');
    if(expired&&!hasPaid&&daysOld>30)reasons.push('Majaribio yaliyoisha, hakulipa');
    if(!b.phone&&!b.email)reasons.push('Hakuna mawasiliano');

    return{
      ...st,expired,daysOld,hasData,hasPaid,reasons,
      isSuspicious:reasons.length>0&&!hasPaid, // kamwe usipendekeze aliyelipa
      isActive:b.token_active&&!expired,
      isSuspended:b.is_suspended===true,
    };
  };

  const enriched=useMemo(()=>
    (businesses||[]).map(b=>({...b,_:classify(b)})),
    [businesses,stats]
  );

  const filtered=useMemo(()=>{
    let list=enriched;
    if(filter==='suspicious')list=list.filter(b=>b._.isSuspicious&&!b._.isSuspended);
    else if(filter==='suspended')list=list.filter(b=>b._.isSuspended);
    else if(filter==='active')list=list.filter(b=>b._.isActive);
    else if(filter==='paid')list=list.filter(b=>b._.hasPaid);
    if(search)list=list.filter(b=>(b.name||'').toLowerCase().includes(search.toLowerCase())||(b.phone||'').includes(search)||(b.email||'').toLowerCase().includes(search.toLowerCase()));
    return list;
  },[enriched,filter,search]);

  const counts={
    suspicious:enriched.filter(b=>b._.isSuspicious&&!b._.isSuspended).length,
    suspended:enriched.filter(b=>b._.isSuspended).length,
    active:enriched.filter(b=>b._.isActive).length,
    paid:enriched.filter(b=>b._.hasPaid).length,
    all:enriched.length,
  };

  const toggle=(id)=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const selectAll=()=>setSelected(filtered.map(b=>b.id));
  const clearAll=()=>setSelected([]);

  // ===== Kuzima =====
  const doSuspend=async()=>{
    setBusy(true);
    let ok=0,fail=0;
    for(const id of selected){
      if(!id||typeof id!=='string'||id.length<10){fail++;continue;}
      try{
        const{error}=await supabase.from('businesses').update({is_suspended:true}).eq('id',id);
        if(error)fail++;else ok++;
      }catch(e){fail++;}
    }
    setBusy(false);setConfirmModal(null);setSelected([]);
    alert(`✅ Zimezimwa: ${ok}${fail?` | ❌ Zimeshindwa: ${fail}`:''}\n\nData bado ipo. Unaweza kurudisha wakati wowote.`);
    window.location.reload();
  };

  // ===== Kurudisha =====
  const doRestore=async()=>{
    setBusy(true);
    let ok=0;
    for(const id of selected){
      try{
        await supabase.from('businesses').update({is_suspended:false}).eq('id',id);
        ok++;
      }catch(e){}
    }
    setBusy(false);setConfirmModal(null);setSelected([]);
    alert(`✅ Zimerudishwa: ${ok}`);
    window.location.reload();
  };

  // ===== Kufuta (hatari!) =====
  const doDelete=async()=>{
    if(confirmText!=='FUTA')return alert('Andika FUTA kuthibitisha.');
    setBusy(true);
    let ok=0,fail=0;
    for(const id of selected){
      // ULINZI: hakikisha id ni halali
      if(!id||typeof id!=='string'||id.length<10){fail++;continue;}
      // ULINZI: usifute biashara iliyolipa (mara mbili)
      const biz=enriched.find(b=>b.id===id);
      if(biz?._.hasPaid&&!window.confirm(`⚠️ "${biz.name}" AMELIPA! Una uhakika kufuta?`)){fail++;continue;}
      try{
        // Futa data zote za biashara
        await supabase.from('sales').delete().eq('business_id',id);
        await supabase.from('products').delete().eq('business_id',id);
        await supabase.from('expenses').delete().eq('business_id',id);
        await supabase.from('customers').delete().eq('business_id',id);
        await supabase.from('users').delete().eq('business_id',id);
        const{error}=await supabase.from('businesses').delete().eq('id',id);
        if(error)fail++;else ok++;
      }catch(e){fail++;}
    }
    setBusy(false);setConfirmModal(null);setConfirmText('');setSelected([]);
    alert(`🗑️ Zimefutwa: ${ok}${fail?` | ❌ Zimeshindwa: ${fail}`:''}`);
    window.location.reload();
  };

  const TABS=[
    ['suspicious',`⚠️ Zinazoshukiwa (${counts.suspicious})`,'#EA580C'],
    ['suspended',`⏸️ Zilizozimwa (${counts.suspended})`,'#64748B'],
    ['active',`✅ Hai (${counts.active})`,'#16A34A'],
    ['paid',`💰 Zilizolipa (${counts.paid})`,'#0B7A3B'],
    ['all',`📋 Zote (${counts.all})`,'#3B82F6'],
  ];

  return <div>
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>🧹 Usafishaji wa Akaunti</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Zima kwanza (salama) • Futa baadaye ukiwa na uhakika</p>
    </div>

    {/* Onyo */}
    <div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:12.5,color:'#9A3412',lineHeight:1.6}}>
      ⚠️ <b>Kuzima</b> — akaunti haitumiki, lakini data inabaki. Unaweza kurudisha wakati wowote.<br/>
      🗑️ <b>Kufuta</b> — data yote inapotea <b>milele</b>. Haiwezi kurudishwa.
    </div>

    {/* Tabs */}
    <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
      {TABS.map(([id,label,col])=>(
        <button key={id} onClick={()=>{setFilter(id);setSelected([])}} style={{padding:'8px 13px',borderRadius:10,border:'none',fontWeight:700,fontSize:12,cursor:'pointer',background:filter===id?col:'#F1F5F9',color:filter===id?'#fff':'#64748B'}}>{label}</button>
      ))}
    </div>

    <Input placeholder="🔍 Tafuta biashara, simu, au email..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:12}}/>

    {/* Vitendo */}
    {selected.length>0&&<div style={{display:'flex',gap:8,marginBottom:12,padding:'12px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,flexWrap:'wrap',alignItems:'center'}}>
      <span style={{fontSize:13,fontWeight:700,color:'#15803D'}}>✓ {selected.length} zimechaguliwa</span>
      <div style={{flex:1}}/>
      {filter==='suspended'?
        <button onClick={()=>setConfirmModal('restore')} style={{padding:'8px 16px',background:'#16A34A',color:'#fff',border:'none',borderRadius:9,fontWeight:700,fontSize:12.5,cursor:'pointer'}}>↩️ Rudisha</button>
      :
        <button onClick={()=>setConfirmModal('suspend')} style={{padding:'8px 16px',background:'#EA580C',color:'#fff',border:'none',borderRadius:9,fontWeight:700,fontSize:12.5,cursor:'pointer'}}>⏸️ Zima</button>
      }
      <button onClick={()=>setConfirmModal('delete')} style={{padding:'8px 16px',background:'#fff',color:'#DC2626',border:'1.5px solid #DC2626',borderRadius:9,fontWeight:700,fontSize:12.5,cursor:'pointer'}}>🗑️ Futa Kabisa</button>
      <button onClick={clearAll} style={{padding:'8px 12px',background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:9,fontWeight:600,fontSize:12,cursor:'pointer'}}>Ondoa</button>
    </div>}

    {filtered.length>0&&selected.length===0&&<button onClick={selectAll} style={{marginBottom:10,padding:'7px 14px',background:'#F1F5F9',border:'none',borderRadius:8,fontSize:12,fontWeight:600,color:'#475569',cursor:'pointer'}}>☑️ Chagua zote ({filtered.length})</button>}

    {/* Orodha */}
    {loading?<div className="card"><div style={{height:60,background:'#F1F5F9',borderRadius:8}}/></div>:
     !filtered.length?<div className="card"><Empty icon="✨" text="Hakuna akaunti hapa"/></div>:
     <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {filtered.map(b=>{
        const d=b._;
        const sel=selected.includes(b.id);
        return <div key={b.id} className="card" style={{padding:'12px 14px',border:sel?'2px solid #0B7A3B':'1px solid #EEF2F6',background:sel?'#F0FDF4':'#fff'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:11}}>
            <input type="checkbox" checked={sel} onChange={()=>toggle(b.id)} style={{marginTop:3,width:17,height:17,cursor:'pointer',accentColor:'#0B7A3B'}}/>

            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:3}}>
                <b style={{fontSize:14,color:'#101828'}}>{b.name||'—'}</b>
                {d.hasPaid&&<Badge color="#0B7A3B">💰 Alilipa</Badge>}
                {d.isSuspended&&<Badge color="#64748B">⏸️ Imezimwa</Badge>}
                {d.isActive&&<Badge color="#16A34A">✅ Hai</Badge>}
                {d.expired&&!d.hasPaid&&<Badge color="#EF4444">Imeisha</Badge>}
              </div>

              <div style={{fontSize:11.5,color:'#98A2B3',marginBottom:6}}>
                {b.phone||'—'} • {b.email||'—'} • Siku {d.daysOld}
              </div>

              {/* Takwimu */}
              <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:11.5}}>
                <span style={{color:d.sales>0?'#16A34A':'#D0D5DD',fontWeight:600}}>🛒 Mauzo: {d.sales||0}</span>
                <span style={{color:d.products>0?'#3B82F6':'#D0D5DD',fontWeight:600}}>📦 Bidhaa: {d.products||0}</span>
                <span style={{color:d.paid>0?'#0B7A3B':'#D0D5DD',fontWeight:600}}>💰 Alilipa: {d.paid>0?fm(d.paid):'—'}</span>
              </div>

              {/* Sababu */}
              {d.reasons.length>0&&<div style={{marginTop:7,display:'flex',gap:5,flexWrap:'wrap'}}>
                {d.reasons.map((r,i)=>(
                  <span key={i} style={{fontSize:10.5,padding:'2px 8px',borderRadius:6,background:'#FFF7ED',color:'#9A3412',fontWeight:600}}>{r}</span>
                ))}
              </div>}
            </div>

            <button onClick={()=>setDetail(b)} style={{padding:'5px 10px',background:'#F1F5F9',border:'none',borderRadius:7,fontSize:11,cursor:'pointer',color:'#475569',fontWeight:600,flexShrink:0}}>Ona</button>
          </div>
        </div>;
      })}
     </div>}

    {/* Modal ya uthibitisho - ZIMA */}
    {confirmModal==='suspend'&&<Modal open onClose={()=>setConfirmModal(null)} title="⏸️ Zima Akaunti">
      <div style={{fontSize:13.5,color:'#344054',lineHeight:1.7,marginBottom:16}}>
        Unakaribia kuzima akaunti <b>{selected.length}</b>.
        <div style={{marginTop:10,padding:'11px 13px',background:'#F0FDF4',borderRadius:9,fontSize:12.5,color:'#15803D'}}>
          ✅ <b>Salama:</b> Data yote inabaki. Wateja hawataweza kuingia, lakini unaweza kuwarudisha wakati wowote.
        </div>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setConfirmModal(null)} style={{flex:1,padding:11,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ghairi</button>
        <button onClick={doSuspend} disabled={busy} style={{flex:2,padding:11,background:'#EA580C',color:'#fff',border:'none',borderRadius:10,fontWeight:800,cursor:'pointer'}}>{busy?'Inazima...':'⏸️ Zima'}</button>
      </div>
    </Modal>}

    {/* Modal - RUDISHA */}
    {confirmModal==='restore'&&<Modal open onClose={()=>setConfirmModal(null)} title="↩️ Rudisha Akaunti">
      <div style={{fontSize:13.5,color:'#344054',marginBottom:16}}>
        Rudisha akaunti <b>{selected.length}</b>? Wateja wataweza kuingia tena.
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setConfirmModal(null)} style={{flex:1,padding:11,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ghairi</button>
        <button onClick={doRestore} disabled={busy} style={{flex:2,padding:11,background:'#16A34A',color:'#fff',border:'none',borderRadius:10,fontWeight:800,cursor:'pointer'}}>{busy?'...':'↩️ Rudisha'}</button>
      </div>
    </Modal>}

    {/* Modal - FUTA (hatari) */}
    {confirmModal==='delete'&&<Modal open onClose={()=>{setConfirmModal(null);setConfirmText('')}} title="🗑️ Futa Kabisa">
      <div style={{padding:'13px 15px',background:'#FEF2F2',border:'1.5px solid #FECACA',borderRadius:11,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:800,color:'#B91C1C',marginBottom:6}}>⚠️ ONYO KALI</div>
        <div style={{fontSize:12.5,color:'#B42318',lineHeight:1.65}}>
          Unakaribia kufuta akaunti <b>{selected.length}</b> <b>MILELE</b>.<br/><br/>
          Vitakavyofutwa: mauzo, bidhaa, matumizi, wateja, wafanyakazi.<br/><br/>
          <b>HAKUNA NJIA YA KURUDISHA.</b>
        </div>
      </div>

      {/* Onyesha kama kuna aliyelipa */}
      {selected.some(id=>enriched.find(b=>b.id===id)?._.hasPaid)&&
        <div style={{padding:'11px 13px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:9,marginBottom:14,fontSize:12.5,color:'#9A3412',fontWeight:600}}>
          🚨 Baadhi ya akaunti ulizochagua <b>ZIMELIPA</b>! Hakikisha kabla ya kufuta.
        </div>}

      <div style={{fontSize:12.5,color:'#475569',marginBottom:8}}>Andika <b>FUTA</b> kuthibitisha:</div>
      <Input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="FUTA"/>

      <div style={{display:'flex',gap:8,marginTop:8}}>
        <button onClick={()=>{setConfirmModal(null);setConfirmText('')}} style={{flex:1,padding:11,background:'#F1F5F9',color:'#64748B',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ghairi</button>
        <button onClick={doDelete} disabled={busy||confirmText!=='FUTA'} style={{flex:2,padding:11,background:confirmText==='FUTA'?'#DC2626':'#FCA5A5',color:'#fff',border:'none',borderRadius:10,fontWeight:800,cursor:confirmText==='FUTA'?'pointer':'not-allowed'}}>{busy?'Inafuta...':'🗑️ Futa Milele'}</button>
      </div>
    </Modal>}

    {/* Modal ya maelezo */}
    {detail&&<Modal open onClose={()=>setDetail(null)} title={detail.name||'Biashara'}>
      {(()=>{
        const d=detail._;
        return <div style={{display:'flex',flexDirection:'column',gap:9}}>
          {[
            ['Jina',detail.name||'—'],
            ['Simu',detail.phone||'—'],
            ['Email',detail.email||'—'],
            ['Plan',detail.plan||'basic'],
            ['Siku tangu ajisajili',d.daysOld],
            ['Mauzo',d.sales||0],
            ['Bidhaa',d.products||0],
            ['Malipo',d.payments||0],
            ['Jumla aliyolipa',d.paid>0?fm(d.paid):'Hakulipa'],
          ].map(([k,v],i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 12px',background:'#F9FAFB',borderRadius:8}}>
              <span style={{fontSize:12.5,color:'#667085',fontWeight:600}}>{k}</span>
              <span style={{fontSize:12.5,color:'#101828',fontWeight:700}}>{v}</span>
            </div>
          ))}
          {d.reasons.length>0&&<div style={{padding:'11px 13px',background:'#FFF7ED',borderRadius:9,fontSize:12,color:'#9A3412'}}>
            <b>Sababu za kushukiwa:</b><br/>{d.reasons.join(' • ')}
          </div>}
        </div>;
      })()}
    </Modal>}
  </div>;
}
