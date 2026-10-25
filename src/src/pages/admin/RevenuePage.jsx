import React,{useState,useMemo,useEffect} from 'react';
import {useApp} from '../../context/AppContext';
import {supabase} from '../../config/supabase';
import {Input,Sel,Btn,Badge,Empty,IC} from '../../components/UI';
import {fmtMoney} from '../../utils/helpers';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';

// ============================================================
// RIPOTI YA MAPATO — Admin + Mhasibu
// Inakusanya: payment_requests (approved) + admin extensions
// ============================================================

export default function RevenuePage(){
  const{currency,businesses,user}=useApp();
  const[payments,setPayments]=useState([]);
  const[loading,setLoading]=useState(true);
  const[period,setPeriod]=useState('month');
  const[search,setSearch]=useState('');
  const[typeFilter,setTypeFilter]=useState('all');
  const fm=n=>fmtMoney(n,currency||'TZS');

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const{data}=await supabase.from('payment_requests').select('*').eq('status','approved').order('approved_at',{ascending:false});
        setPayments(data||[]);
      }catch(e){console.warn('[revenue]',e?.message);}
      setLoading(false);
    })();
  },[]);

  const now=new Date();

  // Chuja kwa muda
  const inPeriod=(dateStr)=>{
    if(!dateStr)return false;
    const d=new Date(dateStr);
    if(period==='today')return d.toDateString()===now.toDateString();
    if(period==='week'){const w=new Date(now);w.setDate(w.getDate()-7);return d>=w;}
    if(period==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    if(period==='year')return d.getFullYear()===now.getFullYear();
    return true;
  };

  // Aina ya muamala
  const getType=(p)=>p.revenue_type||(p.source==='admin_extend'?'sale':'sale');

  const filtered=useMemo(()=>{
    let list=payments.filter(p=>inPeriod(p.approved_at||p.created_at));
    if(typeFilter!=='all')list=list.filter(p=>getType(p)===typeFilter);
    if(search){
      const s=search.toLowerCase();
      list=list.filter(p=>(p.payer_name||p.business_name||'').toLowerCase().includes(s)||(p.transaction_id||'').toLowerCase().includes(s)||(p.payer_phone||'').includes(search));
    }
    return list;
  },[payments,period,typeFilter,search]);

  // Takwimu
  const stats=useMemo(()=>{
    const sales=filtered.filter(p=>getType(p)==='sale');
    const gifts=filtered.filter(p=>getType(p)==='gift');
    const comps=filtered.filter(p=>getType(p)==='compensation');
    const total=sales.reduce((a,p)=>a+(p.amount||0),0);

    // Njia za malipo
    const methods={};
    sales.forEach(p=>{const m=p.payment_method||'Nyingine';methods[m]=(methods[m]||0)+(p.amount||0);});

    // Chanzo
    const fromAdmin=sales.filter(p=>p.source==='admin_extend');
    const fromCustomer=sales.filter(p=>p.source!=='admin_extend');

    return{
      total,
      count:sales.length,
      avg:sales.length?Math.round(total/sales.length):0,
      gifts:gifts.length,
      comps:comps.length,
      methods:Object.entries(methods).sort((a,b)=>b[1]-a[1]),
      adminRevenue:fromAdmin.reduce((a,p)=>a+(p.amount||0),0),
      adminCount:fromAdmin.length,
      custRevenue:fromCustomer.reduce((a,p)=>a+(p.amount||0),0),
      custCount:fromCustomer.length,
    };
  },[filtered]);

  // Chart - mapato kwa siku/mwezi
  const chartData=useMemo(()=>{
    const map={};
    const sales=filtered.filter(p=>getType(p)==='sale');

    if(period==='year'){
      const months=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ago','Sep','Okt','Nov','Des'];
      months.forEach(m=>map[m]=0);
      sales.forEach(p=>{
        const d=new Date(p.approved_at||p.created_at);
        map[months[d.getMonth()]]+=(p.amount||0);
      });
    }else{
      const days=period==='today'?1:period==='week'?7:30;
      for(let i=days-1;i>=0;i--){
        const d=new Date(now);d.setDate(d.getDate()-i);
        map[d.toLocaleDateString('sw',{day:'numeric',month:'short'})]=0;
      }
      sales.forEach(p=>{
        const d=new Date(p.approved_at||p.created_at);
        const k=d.toLocaleDateString('sw',{day:'numeric',month:'short'});
        if(map[k]!==undefined)map[k]+=(p.amount||0);
      });
    }
    return Object.entries(map).map(([name,value])=>({name,value}));
  },[filtered,period]);

  // Wateja waliolipa zaidi
  const topPayers=useMemo(()=>{
    const map={};
    filtered.filter(p=>getType(p)==='sale').forEach(p=>{
      const name=p.payer_name||p.business_name||'—';
      if(!map[name])map[name]={name,total:0,count:0,phone:p.payer_phone};
      map[name].total+=(p.amount||0);
      map[name].count++;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,10);
  },[filtered]);

  const exportCSV=()=>{
    const rows=[
      ['Tarehe','Biashara','Simu','Kiasi','Njia','Aina','Siku','Chanzo','Maelezo'],
      ...filtered.map(p=>[
        new Date(p.approved_at||p.created_at).toLocaleString('sw'),
        p.payer_name||p.business_name||'—',
        p.payer_phone||'—',
        p.amount||0,
        p.payment_method||'—',
        getType(p)==='sale'?'Mauzo':getType(p)==='gift'?'Zawadi':'Fidia',
        p.days_given||'—',
        p.source==='admin_extend'?'Admin':'Mteja',
        (p.notes||'').replace(/[\n,]/g,' '),
      ])
    ];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const b=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(b);
    a.download=`mapato-${period}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const PERIODS=[['today','Leo'],['week','Wiki'],['month','Mwezi'],['year','Mwaka'],['all','Zote']];

  return <div>
    <div style={{marginBottom:16}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>💰 Ripoti ya Mapato</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>Mapato yote — malipo ya wateja + siku ulizoongeza</p>
    </div>

    {/* Muda */}
    <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
      {PERIODS.map(([id,l])=>(
        <button key={id} onClick={()=>setPeriod(id)} style={{padding:'8px 16px',borderRadius:10,border:'none',fontWeight:700,fontSize:12.5,cursor:'pointer',background:period===id?'#0B7A3B':'#F1F5F9',color:period===id?'#fff':'#64748B'}}>{l}</button>
      ))}
    </div>

    {/* HERO — Jumla */}
    <div style={{
      background:'linear-gradient(135deg,#064E2B 0%,#0B7A3B 55%,#16A34A 100%)',
      borderRadius:20,padding:'22px 24px',marginBottom:14,color:'#fff',
      position:'relative',overflow:'hidden',boxShadow:'0 8px 24px -8px rgba(11,122,59,0.45)',
    }}>
      <div style={{position:'absolute',top:-40,right:-30,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.07)'}}/>
      <div style={{position:'relative'}}>
        <div style={{fontSize:11,opacity:0.75,fontWeight:700,letterSpacing:1.2,marginBottom:6}}>
          JUMLA YA MAPATO — {PERIODS.find(p=>p[0]===period)?.[1].toUpperCase()}
        </div>
        <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:8}}>
          <span style={{fontSize:14,opacity:0.7,fontWeight:600}}>TZS</span>
          <span style={{fontSize:38,fontWeight:900,letterSpacing:-1,lineHeight:1}}>{stats.total.toLocaleString()}</span>
        </div>
        <div style={{display:'flex',gap:18,flexWrap:'wrap',fontSize:12,opacity:0.85}}>
          <span>📊 Malipo {stats.count}</span>
          <span>📈 Wastani {fm(stats.avg)}</span>
          {stats.gifts>0&&<span>🎁 Zawadi {stats.gifts}</span>}
          {stats.comps>0&&<span>🔧 Fidia {stats.comps}</span>}
        </div>
      </div>
    </div>

    {/* Chanzo cha mapato */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:14}}>
      <div className="card" style={{padding:16}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:700,marginBottom:6}}>👑 ULIZOONGEZA WEWE</div>
        <div style={{fontSize:22,fontWeight:900,color:'#0B7A3B'}}>{fm(stats.adminRevenue)}</div>
        <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>Malipo {stats.adminCount}</div>
      </div>
      <div className="card" style={{padding:16}}>
        <div style={{fontSize:11,color:'#64748B',fontWeight:700,marginBottom:6}}>🏪 MTEJA ALIYETUMA</div>
        <div style={{fontSize:22,fontWeight:900,color:'#3B82F6'}}>{fm(stats.custRevenue)}</div>
        <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>Malipo {stats.custCount}</div>
      </div>
      {stats.methods.slice(0,2).map(([m,amt],i)=>(
        <div key={i} className="card" style={{padding:16}}>
          <div style={{fontSize:11,color:'#64748B',fontWeight:700,marginBottom:6}}>💳 {m.toUpperCase()}</div>
          <div style={{fontSize:22,fontWeight:900,color:'#8B5CF6'}}>{fm(amt)}</div>
          <div style={{fontSize:11,color:'#94A3B8',marginTop:2}}>{Math.round((amt/stats.total)*100)||0}% ya jumla</div>
        </div>
      ))}
    </div>

    {/* Chart */}
    {chartData.some(d=>d.value>0)&&<div className="card" style={{marginBottom:14,padding:18}}>
      <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 14px',color:'#101828'}}>📈 Mwenendo wa Mapato</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
          <XAxis dataKey="name" tick={{fontSize:10,fill:'#94A3B8'}} interval="preserveStartEnd"/>
          <YAxis tick={{fontSize:10,fill:'#94A3B8'}} tickFormatter={v=>v>=1000?`${v/1000}K`:v}/>
          <Tooltip formatter={v=>fm(v)} contentStyle={{borderRadius:10,border:'1px solid #E2E8F0',fontSize:12}}/>
          <Bar dataKey="value" fill="#0B7A3B" radius={[6,6,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>}

    {/* Wateja waliolipa zaidi */}
    {topPayers.length>0&&<div className="card" style={{marginBottom:14}}>
      <h3 style={{fontSize:14,fontWeight:800,margin:'0 0 12px',color:'#101828'}}>🏆 Wateja Waliolipa Zaidi</h3>
      <div style={{display:'flex',flexDirection:'column',gap:2}}>
        {topPayers.map((p,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:i<topPayers.length-1?'1px solid #F9FAFB':'none'}}>
            <span style={{
              width:24,height:24,borderRadius:'50%',flexShrink:0,fontSize:11,fontWeight:800,
              display:'flex',alignItems:'center',justifyContent:'center',
              background:i<3?'#F0FDF4':'#F8FAFC',color:i<3?'#0B7A3B':'#94A3B8',
            }}>{i+1}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:'#344054'}}>{p.name}</div>
              <div style={{fontSize:11,color:'#98A2B3'}}>{p.phone||'—'} • Malipo {p.count}</div>
            </div>
            <span style={{fontSize:14,fontWeight:800,color:'#0B7A3B',flexShrink:0}}>{fm(p.total)}</span>
          </div>
        ))}
      </div>
    </div>}

    {/* Orodha ya malipo */}
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
      <Input placeholder="🔍 Tafuta biashara, simu, au namba..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:0,flex:1,minWidth:180}}/>
      <div style={{display:'flex',gap:6}}>
        {[['all','Zote'],['sale','💰 Mauzo'],['gift','🎁 Zawadi'],['compensation','🔧 Fidia']].map(([id,l])=>(
          <button key={id} onClick={()=>setTypeFilter(id)} style={{padding:'8px 12px',borderRadius:8,border:typeFilter===id?'2px solid #0B7A3B':'1px solid #E2E8F0',background:typeFilter===id?'#F0FDF4':'#fff',color:typeFilter===id?'#0B7A3B':'#64748B',fontWeight:600,fontSize:11.5,cursor:'pointer',whiteSpace:'nowrap'}}>{l}</button>
        ))}
      </div>
      <button onClick={exportCSV} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #0B7A3B',background:'#fff',color:'#0B7A3B',fontWeight:700,fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>📥 Excel</button>
    </div>

    <div style={{fontSize:12,color:'#64748B',marginBottom:8}}>Malipo {filtered.length}</div>

    {loading?<div className="card"><div style={{height:60,background:'#F1F5F9',borderRadius:8}}/></div>:
     !filtered.length?<div className="card"><Empty icon="💰" text="Hakuna mapato kwa muda huu"/></div>:
     <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {filtered.map(p=>{
        const type=getType(p);
        const isAdmin=p.source==='admin_extend';
        return <div key={p.id} className="card" style={{padding:'12px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:150}}>
              <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:3}}>
                <b style={{fontSize:13.5,color:'#101828'}}>{p.payer_name||p.business_name||'—'}</b>
                {isAdmin&&<Badge color="#0B7A3B">👑 Admin</Badge>}
                {type==='gift'&&<Badge color="#8B5CF6">🎁 Zawadi</Badge>}
                {type==='compensation'&&<Badge color="#EA580C">🔧 Fidia</Badge>}
              </div>
              <div style={{fontSize:11.5,color:'#98A2B3'}}>
                {p.payer_phone||'—'} • {p.payment_method||'—'}
                {p.days_given&&` • Siku ${p.days_given}`}
              </div>
              {p.notes&&<div style={{fontSize:11,color:'#94A3B8',marginTop:3,fontStyle:'italic'}}>{p.notes}</div>}
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:16,fontWeight:900,color:type==='sale'?'#0B7A3B':'#94A3B8'}}>
                {type==='sale'?fm(p.amount):'—'}
              </div>
              <div style={{fontSize:10,color:'#98A2B3',marginTop:2}}>
                {new Date(p.approved_at||p.created_at).toLocaleDateString('sw',{day:'numeric',month:'short',year:'numeric'})}
              </div>
            </div>
          </div>
        </div>;
      })}
     </div>}
  </div>;
}
