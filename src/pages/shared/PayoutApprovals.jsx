import React,{useState,useEffect} from 'react';
import { API_BASE } from '../../config/api';
import {useApp} from '../../context/AppContext';
import {Empty,Modal} from '../../components/UI';

const fm=n=>`TZS ${(+n||0).toLocaleString()}`;
const fmtDate=d=>d?new Date(d).toLocaleString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const CH={mpesa:'M-Pesa',tigopesa:'Mixx by Yas',airtelmoney:'Airtel Money',halopesa:'HaloPesa'};
const chName=c=>CH[c]||c||'—';

// Ukurasa wa idhini ya kutoa pesa — kwa Admin na Marketing
export default function PayoutApprovals(){
  const{user}=useApp();
  const role=user?.role; // admin | marketing
  const[list,setList]=useState([]);
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(null);
  const[msg,setMsg]=useState('');
  const[rejectFor,setRejectFor]=useState(null);
  const[rejectReason,setRejectReason]=useState('');
  const[tab,setTab]=useState('pending');

  const load=async()=>{
    setLoading(true);
    try{
      const r=await fetch(API_BASE+'/api/payments?action=payout_list');
      const d=await r.json();
      setList(d.success?(d.payouts||[]):[]);
    }catch{setList([])}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const myApproved=p=>role==='admin'?p.admin_approved:p.marketing_approved;

  const approve=async(p)=>{
    setBusy(p.id);setMsg('');
    try{
      const r=await fetch(API_BASE+'/api/payments?action=payout_approve',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({payout_id:p.id,role,approver_name:user?.name||user?.email}),
      });
      const d=await r.json();
      setMsg((d.success?'✅ ':'⚠️ ')+(d.message||d.error||''));
      load();
    }catch(e){setMsg('Tatizo: '+(e.message||''))}
    setBusy(null);
  };

  const doReject=async()=>{
    const p=rejectFor;setRejectFor(null);setBusy(p.id);setMsg('');
    try{
      const r=await fetch(API_BASE+'/api/payments?action=payout_reject',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({payout_id:p.id,role,approver_name:user?.name||user?.email,reason:rejectReason.trim()}),
      });
      const d=await r.json();
      setMsg((d.success?'✅ ':'⚠️ ')+(d.message||d.error||''));
      setRejectReason('');load();
    }catch(e){setMsg('Tatizo: '+(e.message||''))}
    setBusy(null);
  };

  const pending=list.filter(p=>p.status==='pending_approval');
  const done=list.filter(p=>p.status!=='pending_approval');
  const shown=tab==='pending'?pending:done;

  const stColor=s=>s==='completed'?'#0A6E47':s==='failed'||s==='rejected'?'#C2412D':s==='approved'?'#0A6E47':'#F2B705';
  const stLabel=s=>({completed:'IMEKAMILIKA',failed:'IMESHINDWA',rejected:'IMEKATALIWA',approved:'IMEIDHINISHWA',pending:'INATUMWA',pending_approval:'INASUBIRI'}[s]||'INASUBIRI');

  return <div style={{paddingBottom:20}}>
    <h2 style={{fontSize:20,fontWeight:900,color:'#0A6E47',margin:'0 0 4px'}}>✅ Idhini ya Kutoa Pesa</h2>
    <p style={{fontSize:12.5,color:'#5C6A62',margin:'0 0 14px'}}>Idhinisha au kataa maombi ya mhasibu. Pesa inatoka tu baada ya Admin NA Marketing kuidhinisha.</p>

    {msg&&<div style={{background:'#E6F2EC',color:'#0A6E47',padding:'11px 14px',borderRadius:10,fontSize:13,marginBottom:12,borderLeft:'4px solid #0A6E47'}}>{msg}</div>}

    <div style={{display:'flex',gap:8,marginBottom:16}}>
      <button onClick={()=>setTab('pending')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:tab==='pending'?'#0A6E47':'#F6F8F7',color:tab==='pending'?'#fff':'#5C6A62'}}>⏳ Yanasubiri {pending.length?`(${pending.length})`:''}</button>
      <button onClick={()=>setTab('done')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:tab==='done'?'#0A6E47':'#F6F8F7',color:tab==='done'?'#fff':'#5C6A62'}}>📋 Historia</button>
    </div>

    {loading?<Empty icon="⏳" text="Inapakua..."/>:shown.length?<div style={{display:'flex',flexDirection:'column',gap:12}}>
      {shown.map(p=>(
        <div key={p.id} className="card" style={{padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:'#17231D'}}>{fm(p.amount)}</div>
              <div style={{fontSize:12,color:'#5C6A62',marginTop:2}}>→ {p.recipient_name||p.recipient_number} ({p.method==='bank'?'Benki':chName(p.channel)})</div>
            </div>
            <span style={{fontSize:9.5,fontWeight:800,padding:'4px 10px',borderRadius:20,background:stColor(p.status)+'20',color:stColor(p.status),whiteSpace:'nowrap'}}>{stLabel(p.status)}</span>
          </div>

          <div style={{background:'#F6F8F7',borderRadius:10,padding:'10px 12px',fontSize:12.5,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#5C6A62'}}>Sababu</span><b style={{textAlign:'right'}}>{p.reason||'—'}</b></div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#5C6A62'}}>Ameomba</span><b>{p.requested_by||'Mhasibu'}</b></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#5C6A62'}}>Tarehe</span><b>{fmtDate(p.created_at)}</b></div>
          </div>

          {/* Hali ya idhini */}
          <div style={{display:'flex',gap:10,marginBottom:p.status==='pending_approval'?12:0,fontSize:12}}>
            <div style={{flex:1,textAlign:'center',padding:'8px',borderRadius:10,background:p.admin_approved?'#E6F2EC':'#F6F8F7',color:p.admin_approved?'#0A6E47':'#9AA5A0',fontWeight:700}}>
              {p.admin_approved?'✓':'○'} Admin{p.admin_approved_by?` · ${p.admin_approved_by}`:''}
            </div>
            <div style={{flex:1,textAlign:'center',padding:'8px',borderRadius:10,background:p.marketing_approved?'#E6F2EC':'#F6F8F7',color:p.marketing_approved?'#0A6E47':'#9AA5A0',fontWeight:700}}>
              {p.marketing_approved?'✓':'○'} Marketing{p.marketing_approved_by?` · ${p.marketing_approved_by}`:''}
            </div>
          </div>

          {p.status==='rejected'&&p.rejected_reason&&<div style={{fontSize:12,color:'#C2412D',marginTop:8}}>❌ Sababu ya kukataa: {p.rejected_reason}</div>}

          {/* Vitendo */}
          {p.status==='pending_approval'&&<div style={{display:'flex',gap:8}}>
            {myApproved(p)
              ?<div style={{flex:2,padding:12,textAlign:'center',background:'#E6F2EC',color:'#0A6E47',borderRadius:12,fontWeight:700,fontSize:13}}>✓ Umeshaidhinisha — inasubiri mwenzako</div>
              :<button disabled={busy===p.id} onClick={()=>approve(p)} style={{flex:2,padding:12,background:busy===p.id?'#86EFAC':'linear-gradient(135deg,#0A6E47,#06502F)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:busy===p.id?'wait':'pointer'}}>{busy===p.id?'...':'✅ Idhinisha'}</button>}
            <button disabled={busy===p.id} onClick={()=>{setRejectFor(p);setRejectReason('');}} style={{flex:1,padding:12,background:'#FBECE9',color:'#C2412D',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>Kataa</button>
          </div>}
        </div>
      ))}
    </div>:<Empty icon="✅" text={tab==='pending'?'Hakuna maombi yanayosubiri idhini':'Hakuna historia bado'}/>}

    {/* Modal ya kukataa */}
    <Modal open={!!rejectFor} onClose={()=>setRejectFor(null)} title="❌ Kataa Ombi">
      <div>
        <div style={{fontSize:13,color:'#5C6A62',marginBottom:12}}>Unakataa ombi la <b>{rejectFor?fm(rejectFor.amount):''}</b>. Andika sababu (mhasibu ataiona):</div>
        <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={3} placeholder="Mf: Sababu haijakamilika, hakiki tena..." style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #D6E2DB',fontSize:13,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}/>
        <div style={{display:'flex',gap:8,marginTop:14}}>
          <button onClick={()=>setRejectFor(null)} style={{flex:1,padding:12,background:'#F6F8F7',color:'#5C6A62',border:'none',borderRadius:12,fontWeight:700,fontSize:14,cursor:'pointer'}}>Ghairi</button>
          <button onClick={doReject} style={{flex:2,padding:12,background:'#C2412D',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>❌ Thibitisha Kukataa</button>
        </div>
      </div>
    </Modal>
  </div>;
}
