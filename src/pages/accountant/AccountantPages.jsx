import React,{useState,useMemo} from 'react';
import {useApp} from '../../context/AppContext';
import {IC,Stat,Badge,Empty,Input,Sel,Btn} from '../../components/UI';

const fmtDate=d=>d?new Date(d).toLocaleDateString('sw-TZ',{day:'numeric',month:'short',year:'numeric'}):'—';
const fmtMoney=n=>`TZS ${(+n||0).toLocaleString()}`;

// ===== ACCOUNTANT DASHBOARD =====
export function AccountantDashboard(){
  const{paymentRequests,businesses,tokens,partners}=useApp();
  const approved=paymentRequests.filter(p=>p.status==='approved');
  const pending=paymentRequests.filter(p=>p.status==='pending');
  const rejected=paymentRequests.filter(p=>p.status==='rejected');
  const totalRev=approved.reduce((a,p)=>a+(p.amount||0),0);
  const today=new Date().toISOString().split('T')[0];
  const monthStart=today.slice(0,7);
  const todayRev=approved.filter(p=>p.created_at?.startsWith(today)).reduce((a,p)=>a+(p.amount||0),0);
  const monthRev=approved.filter(p=>p.created_at?.startsWith(monthStart)).reduce((a,p)=>a+(p.amount||0),0);
  const activeBiz=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const monthlyExpected=activeBiz.length*15000;

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 16px'}}>📊 Muhasibu — Dashboard</h3>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.dollar} label="Mapato Jumla" value={fmtMoney(totalRev)} color="#0B7A3B" sub="tangu kuanza"/>
      <Stat icon={IC.dollar} label="Mwezi Huu" value={fmtMoney(monthRev)} color="#3B82F6"/>
      <Stat icon={IC.dollar} label="Leo" value={fmtMoney(todayRev)} color="#22C55E"/>
      <Stat icon={IC.clock} label="Inasubiri" value={pending.length} color="#F59E0B"/>
    </div>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.store} label="Maduka Active" value={activeBiz.length} color="#22C55E"/>
      <Stat icon={IC.dollar} label="Mapato Tarajiwa" value={fmtMoney(monthlyExpected)} color="#8B5CF6" sub="kwa mwezi"/>
      <Stat icon={IC.ok} label="Malipo Yamekubaliwa" value={approved.length} color="#22C55E"/>
      <Stat icon={IC.warn} label="Yamekataliwa" value={rejected.length} color="#EF4444"/>
    </div>

    {/* Quick Summary */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
      {/* Recent Payments */}
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#0B7A3B'}}>💰 Malipo ya Hivi Karibuni</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {approved.slice(0,10).map(p=><div key={p.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>{p.business_name}</div>
              <div style={{fontSize:11,color:'#94A3B8'}}>{fmtDate(p.created_at)} • {p.payment_method||'SELCOM'}</div>
            </div>
            <div style={{fontWeight:800,fontSize:14,color:'#0B7A3B'}}>{fmtMoney(p.amount)}</div>
          </div>)}
          {!approved.length&&<Empty icon="💰" text="Hakuna malipo bado"/>}
        </div>
      </div>

      {/* Pending */}
      {pending.length>0&&<div className="card" style={{border:'2px solid #FED7AA'}}>
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#F59E0B'}}>⏳ Yanasubiri ({pending.length})</h3>
        {pending.map(p=><div key={p.id} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:600,fontSize:13}}>{p.business_name}</div>
            <div style={{fontSize:11,color:'#94A3B8'}}>TX: {p.transaction_id}</div>
          </div>
          <div style={{fontWeight:800,fontSize:14,color:'#F59E0B'}}>{fmtMoney(p.amount)}</div>
        </div>)}
      </div>}
    </div>
  </div>;
}

// ===== REVENUE PAGE =====
export function RevenuePage(){
  const{paymentRequests,tokens,partners,businesses}=useApp();
  const[period,setPeriod]=useState('all');
  const approved=paymentRequests.filter(p=>p.status==='approved');
  const today=new Date().toISOString().split('T')[0];
  const weekAgo=new Date(Date.now()-7*86400000).toISOString();
  const monthStart=today.slice(0,7);

  const filtered=period==='today'?approved.filter(p=>p.created_at?.startsWith(today))
    :period==='week'?approved.filter(p=>p.created_at>=weekAgo)
    :period==='month'?approved.filter(p=>p.created_at?.startsWith(monthStart))
    :approved;

  const totalFiltered=filtered.reduce((a,p)=>a+(p.amount||0),0);

  // Group by month
  const monthMap={};approved.forEach(p=>{const m=p.created_at?.slice(0,7);if(m){monthMap[m]=(monthMap[m]||0)+(p.amount||0)}});
  const monthData=Object.entries(monthMap).sort().slice(-6);

  // Group by partner
  const partnerMap={};filtered.forEach(p=>{
    const tk=tokens.find(t=>t.code===p.token_code);
    const pName=tk?.assigned_name||'Admin (Moja kwa moja)';
    partnerMap[pName]=(partnerMap[pName]||0)+(p.amount||0);
  });

  const exportPDF=()=>{
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Mapato Report</title><style>body{font-family:Arial;margin:30px;color:#1E293B}h1{color:#0B7A3B;border-bottom:3px solid #0B7A3B;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#0B7A3B;color:#fff;padding:10px;text-align:left;font-size:12px}td{padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:12px}tr:nth-child(even){background:#F8FAFC}.total{font-size:20px;font-weight:900;color:#0B7A3B}@media print{body{margin:15px}}</style></head><body>
    <h1>PESAFLY / DUKA LANGU — RIPOTI YA MAPATO</h1>
    <p>Tarehe: ${new Date().toLocaleDateString('sw-TZ')} | Kipindi: ${period==='today'?'Leo':period==='week'?'Wiki Hii':period==='month'?'Mwezi Huu':'Yote'}</p>
    <p class="total">JUMLA: TZS ${totalFiltered.toLocaleString()}</p>
    <h2>Malipo Yote (${filtered.length})</h2>
    <table><tr><th>#</th><th>Biashara</th><th>Kiasi</th><th>Njia</th><th>Transaction</th><th>Token</th><th>Partner</th><th>Tarehe</th></tr>
    ${filtered.map((p,i)=>{const tk=tokens.find(t=>t.code===p.token_code);return`<tr><td>${i+1}</td><td><b>${p.business_name}</b></td><td style="color:#0B7A3B;font-weight:700">TZS ${(p.amount||0).toLocaleString()}</td><td>${p.payment_method||'SELCOM'}</td><td style="font-family:monospace">${p.transaction_id||''}</td><td>${p.token_code||'—'}</td><td>${tk?.assigned_name||'Admin'}</td><td>${fmtDate(p.created_at)}</td></tr>`}).join('')}
    </table>
    <h2>Mapato kwa Washirika</h2>
    <table><tr><th>Mshirika</th><th>Mapato</th><th>%</th></tr>
    ${Object.entries(partnerMap).sort((a,b)=>b[1]-a[1]).map(([name,amt])=>`<tr><td><b>${name}</b></td><td style="font-weight:700">TZS ${amt.toLocaleString()}</td><td>${totalFiltered?Math.round(amt/totalFiltered*100):0}%</td></tr>`).join('')}
    </table>
    ${monthData.length>0?`<h2>Mapato kwa Mwezi</h2><table><tr><th>Mwezi</th><th>Mapato</th></tr>${monthData.map(([m,a])=>`<tr><td>${m}</td><td style="font-weight:700">TZS ${a.toLocaleString()}</td></tr>`).join('')}</table>`:''}
    <div style="margin-top:30px;border-top:2px solid #0B7A3B;padding-top:12px;text-align:center;color:#64748B;font-size:11px">PesaFly / Duka Langu — pesafly1@gmail.com | Ripoti: ${new Date().toLocaleString('sw-TZ')}</div>
    </body></html>`);
    w.document.close();setTimeout(()=>w.print(),500);
  };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:16}}>
      <h3 style={{fontSize:18,fontWeight:800,margin:0}}>💰 Mapato</h3>
      <button onClick={exportPDF} style={{padding:'8px 18px',borderRadius:10,border:'none',background:'#0B7A3B',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>📥 Pakua PDF</button>
    </div>

    {/* Period Filter */}
    <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
      {[{id:'today',label:'Leo'},{id:'week',label:'Wiki'},{id:'month',label:'Mwezi'},{id:'all',label:'Yote'}].map(t=>
        <button key={t.id} onClick={()=>setPeriod(t.id)} style={{padding:'8px 16px',borderRadius:10,border:period===t.id?'2px solid #0B7A3B':'1px solid #E2E8F0',background:period===t.id?'#F0FDF4':'#fff',fontWeight:period===t.id?700:500,fontSize:13,cursor:'pointer',color:period===t.id?'#0B7A3B':'#64748B'}}>{t.label}</button>)}
    </div>

    {/* Total */}
    <div className="card" style={{marginBottom:16,background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',border:'2px solid #BBF7D0',textAlign:'center',padding:24}}>
      <div style={{fontSize:13,color:'#15803D',fontWeight:600,textTransform:'uppercase'}}>Mapato — {period==='today'?'Leo':period==='week'?'Wiki Hii':period==='month'?'Mwezi Huu':'Jumla'}</div>
      <div style={{fontSize:36,fontWeight:900,color:'#0B7A3B',margin:'6px 0'}}>{fmtMoney(totalFiltered)}</div>
      <div style={{fontSize:13,color:'#15803D'}}>Malipo {filtered.length} yamethibitishwa</div>
    </div>

    {/* Partner Breakdown */}
    {Object.keys(partnerMap).length>0&&<div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📊 Mapato kwa Mshirika</h3>
      {Object.entries(partnerMap).sort((a,b)=>b[1]-a[1]).map(([name,amt])=><div key={name} style={{padding:'8px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:32,height:32,borderRadius:8,background:'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📋</div>
          <span style={{fontWeight:600,fontSize:13}}>{name}</span>
        </div>
        <div>
          <span style={{fontWeight:800,color:'#0B7A3B',fontSize:14}}>{fmtMoney(amt)}</span>
          <span style={{fontSize:11,color:'#94A3B8',marginLeft:6}}>({totalFiltered?Math.round(amt/totalFiltered*100):0}%)</span>
        </div>
      </div>)}
    </div>}

    {/* Monthly Chart */}
    {monthData.length>0&&<div className="card" style={{marginBottom:16}}>
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📅 Mapato kwa Mwezi</h3>
      {monthData.map(([m,a])=>{const max=Math.max(...monthData.map(d=>d[1]));const pct=max?a/max*100:0;return<div key={m} style={{padding:'6px 0',display:'flex',alignItems:'center',gap:10}}>
        <span style={{width:60,fontSize:12,fontWeight:600,color:'#64748B'}}>{m}</span>
        <div style={{flex:1,background:'#F1F5F9',borderRadius:6,height:24,overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:'linear-gradient(90deg,#0B7A3B,#22C55E)',borderRadius:6,transition:'width 0.5s'}}/></div>
        <span style={{fontWeight:700,fontSize:12,color:'#0B7A3B',minWidth:100,textAlign:'right'}}>{fmtMoney(a)}</span>
      </div>})}
    </div>}

    {/* All payments */}
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>📋 Malipo ({filtered.length})</h3>
      <div style={{maxHeight:400,overflowY:'auto'}}>
        {filtered.map(p=>{const tk=tokens.find(t=>t.code===p.token_code);return<div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <div>
            <div style={{fontWeight:600,fontSize:13}}>{p.business_name}</div>
            <div style={{fontSize:11,color:'#94A3B8'}}>
              {fmtDate(p.created_at)} • {p.payment_method||'SELCOM'} • <span style={{fontFamily:'monospace'}}>{p.transaction_id}</span>
              {tk?.assigned_name&&<span> • 📋 <b style={{color:'#8B5CF6'}}>{tk.assigned_name}</b></span>}
              {p.token_code&&<span> • 🔑 {p.token_code}</span>}
            </div>
          </div>
          <div style={{fontWeight:800,fontSize:15,color:'#0B7A3B'}}>{fmtMoney(p.amount)}</div>
        </div>})}
        {!filtered.length&&<Empty icon="💰" text="Hakuna malipo"/>}
      </div>
    </div>
  </div>;
}

// ===== EXPENSES PAGE (System Expenses) =====
export function AccExpensesPage(){
  const{paymentRequests,businesses}=useApp();
  const pending=paymentRequests.filter(p=>p.status==='pending');
  const rejected=paymentRequests.filter(p=>p.status==='rejected');
  const approved=paymentRequests.filter(p=>p.status==='approved');
  const totalRev=approved.reduce((a,p)=>a+(p.amount||0),0);
  const activeBiz=businesses.filter(b=>b.token_active&&!b.is_suspended);
  const trialBiz=businesses.filter(b=>!b.token_active&&!b.is_suspended);
  const suspBiz=businesses.filter(b=>b.is_suspended);

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 16px'}}>🏪 Hali ya Wateja</h3>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.store} label="Jumla" value={businesses.length} color="#0B7A3B"/>
      <Stat icon={IC.ok} label="Active" value={activeBiz.length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Trial" value={trialBiz.length} color="#F59E0B"/>
      <Stat icon={IC.warn} label="Suspended" value={suspBiz.length} color="#EF4444"/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#22C55E'}}>✅ Wanaolipa ({activeBiz.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{activeBiz.map(b=>{
          const d=b.token_expiry?Math.ceil((new Date(b.token_expiry)-new Date())/86400000):0;
          return<div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',fontSize:12}}>
            <div><b>{b.name}</b><br/><span style={{color:'#94A3B8'}}>{b.email}</span></div>
            <div style={{textAlign:'right'}}><Badge color="#8B5CF6">{b.plan||'basic'}</Badge><br/><span style={{color:d<=5?'#EF4444':'#22C55E',fontWeight:700,fontSize:11}}>Siku {d}</span></div>
          </div>})}{!activeBiz.length&&<Empty icon="✅" text="Hakuna"/>}</div>
      </div>
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#F59E0B'}}>⏳ Trial ({trialBiz.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{trialBiz.map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',fontSize:12}}><b>{b.name}</b> — {b.email}</div>)}{!trialBiz.length&&<Empty icon="⏳" text="Hakuna"/>}</div>
      </div>
      <div className="card">
        <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px',color:'#EF4444'}}>🔒 Wamefungwa ({suspBiz.length})</h3>
        <div style={{maxHeight:300,overflowY:'auto'}}>{suspBiz.map(b=><div key={b.id} style={{padding:'6px 0',borderBottom:'1px solid #F1F5F9',fontSize:12}}><b>{b.name}</b> — {b.email}</div>)}{!suspBiz.length&&<Empty icon="🔒" text="Hakuna"/>}</div>
      </div>
    </div>
  </div>;
}

// ===== TOKENS VIEW (Read-Only for Accountant) =====
export function AccTokensPage(){
  const{tokens,businesses,partners}=useApp();
  const used=tokens.filter(t=>t.used);const free=tokens.filter(t=>!t.used);
  const getBizName=t=>{const b=businesses.find(b=>b.id===t.used_by);return b?.name||'—'};

  return <div>
    <h3 style={{fontSize:18,fontWeight:800,margin:'0 0 16px'}}>🔑 Tokens — Muhasibu View</h3>
    <div className="flex-wrap" style={{marginBottom:16}}>
      <Stat icon={IC.key} label="Jumla" value={tokens.length} color="#0B7A3B"/>
      <Stat icon={IC.ok} label="Zinapatikana" value={free.length} color="#22C55E"/>
      <Stat icon={IC.clock} label="Zimetumika" value={used.length} color="#F59E0B"/>
    </div>
    <div className="card">
      <h3 style={{fontSize:14,fontWeight:700,margin:'0 0 10px'}}>Tokens Zilizotumika ({used.length})</h3>
      <div style={{maxHeight:400,overflowY:'auto'}}>
        {used.map(t=><div key={t.id} style={{padding:'10px 0',borderBottom:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
          <div>
            <span style={{fontFamily:'monospace',fontWeight:700,fontSize:13,background:'#FFF7ED',padding:'3px 8px',borderRadius:6,color:'#92400E'}}>{t.code}</span>
            <span style={{fontSize:11,color:'#94A3B8',marginLeft:8}}>Siku: {t.days} • {fmtDate(t.created_at)}</span>
            {t.assigned_name&&<span style={{fontSize:11,color:'#8B5CF6',marginLeft:6}}>📋 {t.assigned_name}</span>}
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:600,fontSize:12,color:'#0B7A3B'}}>→ {getBizName(t)}</div>
            <Badge color={t.plan==='premium'?'#8B5CF6':'#64748B'}>{t.plan||'basic'}</Badge>
          </div>
        </div>)}
        {!used.length&&<Empty icon="🔑" text="Hakuna token zilizotumika"/>}
      </div>
    </div>
  </div>;
}
