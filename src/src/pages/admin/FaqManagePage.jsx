import React,{useState,useEffect} from 'react';
import {supabase} from '../../config/supabase';
import {Input,Area,Btn,Modal,Empty,IC,Badge} from '../../components/UI';

// ============================================================
// FAQ MANAGEMENT — Admin anaweza kuongeza/hariri/futa FAQ
// bila kubadilisha code
// ============================================================

const CATEGORIES=['general','bidhaa','mauzo','madeni','wateja','ripoti','matumizi','wafanyakazi','matawi','akaunti','jumla'];

export default function FaqManagePage(){
  const[faqs,setFaqs]=useState([]);
  const[unanswered,setUnanswered]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState('faqs');
  const[modal,setModal]=useState(false);
  const[edit,setEdit]=useState(null);
  const[search,setSearch]=useState('');
  const[f,setF]=useState({question:'',answer:'',category:'general',keywords:''});

  const load=async()=>{
    setLoading(true);
    try{
      const{data:kb}=await supabase.from('knowledge_base').select('*').order('created_at',{ascending:false});
      setFaqs(kb||[]);
      const{data:un}=await supabase.from('faq_unanswered').select('*').eq('status','pending').order('created_at',{ascending:false});
      setUnanswered(un||[]);
    }catch(e){console.warn('FAQ load:',e);}
    setLoading(false);
  };
  useEffect(()=>{load()},[]);

  const save=async()=>{
    if(!f.question.trim()||!f.answer.trim())return alert('Jaza swali na jibu!');
    try{
      if(edit){
        await supabase.from('knowledge_base').update({
          question:f.question,answer:f.answer,category:f.category,keywords:f.keywords,updated_at:new Date().toISOString(),
        }).eq('id',edit);
      }else{
        await supabase.from('knowledge_base').insert({
          question:f.question,answer:f.answer,category:f.category,keywords:f.keywords,
        });
      }
      setModal(false);setEdit(null);setF({question:'',answer:'',category:'general',keywords:''});
      load();
    }catch(e){alert('Hitilafu: '+e.message);}
  };

  const del=async(id)=>{
    if(!window.confirm('Futa swali hili?'))return;
    try{await supabase.from('knowledge_base').delete().eq('id',id);load();}
    catch(e){alert('Hitilafu: '+e.message);}
  };

  const toggleActive=async(faq)=>{
    try{await supabase.from('knowledge_base').update({is_active:!faq.is_active}).eq('id',faq.id);load();}
    catch(e){alert('Hitilafu: '+e.message);}
  };

  const openEdit=(faq)=>{
    setEdit(faq.id);
    setF({question:faq.question,answer:faq.answer,category:faq.category||'general',keywords:faq.keywords||''});
    setModal(true);
  };

  const resolveUnanswered=async(id)=>{
    try{await supabase.from('faq_unanswered').update({status:'resolved'}).eq('id',id);load();}
    catch(e){alert('Hitilafu: '+e.message);}
  };

  const filtered=faqs.filter(f=>!search||f.question.toLowerCase().includes(search.toLowerCase())||f.answer.toLowerCase().includes(search.toLowerCase()));

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <h2 style={{fontSize:20,fontWeight:800,margin:0}}>❓ Maswali na Majibu (FAQ)</h2>
      <Btn onClick={()=>{setEdit(null);setF({question:'',answer:'',category:'general',keywords:''});setModal(true)}}>{IC.plus} Swali Jipya</Btn>
    </div>

    {/* Tabs */}
    <div style={{display:'flex',gap:8,marginBottom:16}}>
      <button onClick={()=>setTab('faqs')} style={{padding:'8px 16px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:tab==='faqs'?'#0B7A3B':'#F1F5F9',color:tab==='faqs'?'#fff':'#64748B'}}>
        Maswali ({faqs.length})
      </button>
      <button onClick={()=>setTab('unanswered')} style={{padding:'8px 16px',borderRadius:10,border:'none',fontWeight:700,fontSize:13,cursor:'pointer',background:tab==='unanswered'?'#EF4444':'#F1F5F9',color:tab==='unanswered'?'#fff':'#64748B'}}>
        Yasiyojibika ({unanswered.length})
      </button>
    </div>

    {loading?<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>Inapakia...</div>:
     tab==='faqs'?<>
      <Input placeholder="🔍 Tafuta swali..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:14}}/>
      {!filtered.length?<div className="card"><Empty icon="❓" text="Hakuna maswali bado. Ongeza la kwanza!"/></div>:
       <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(faq=>(
          <div key={faq.id} className="card" style={{opacity:faq.is_active?1:0.55}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <Badge color="#0B7A3B">{faq.category}</Badge>
                  {!faq.is_active&&<Badge color="#94A3B8">Imezimwa</Badge>}
                  {faq.views>0&&<span style={{fontSize:11,color:'#94A3B8'}}>👁 {faq.views}</span>}
                </div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4,color:'#1E293B'}}>{faq.question}</div>
                <div style={{fontSize:13,color:'#64748B',lineHeight:1.5}}>{faq.answer}</div>
                {faq.keywords&&<div style={{fontSize:11,color:'#94A3B8',marginTop:6}}>🔑 {faq.keywords}</div>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <button onClick={()=>openEdit(faq)} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:'6px 8px',cursor:'pointer',fontSize:13}} title="Hariri">{IC.gear}</button>
                <button onClick={()=>toggleActive(faq)} style={{background:faq.is_active?'#FEF3C7':'#DCFCE7',border:'none',borderRadius:6,padding:'6px 8px',cursor:'pointer',fontSize:12}} title={faq.is_active?'Zima':'Washa'}>{faq.is_active?'⏸':'▶'}</button>
                <button onClick={()=>del(faq.id)} style={{background:'#FEF2F2',border:'none',borderRadius:6,padding:'6px 8px',color:'#EF4444',cursor:'pointer',fontSize:13}} title="Futa">{IC.del}</button>
              </div>
            </div>
          </div>
        ))}
       </div>}
     </>:<>
      {/* Unanswered questions */}
      {!unanswered.length?<div className="card"><Empty icon="✅" text="Hakuna maswali yasiyojibika!"/></div>:
       <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {unanswered.map(u=>(
          <div key={u.id} className="card" style={{borderLeft:'4px solid #EF4444'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{u.question}</div>
                <div style={{fontSize:11,color:'#94A3B8'}}>
                  {u.user_email||'Mteja'} • {new Date(u.created_at).toLocaleDateString('sw')}
                </div>
              </div>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>{setEdit(null);setF({question:u.question,answer:'',category:'general',keywords:''});setModal(true);resolveUnanswered(u.id)}} style={{background:'#DCFCE7',border:'none',borderRadius:6,padding:'6px 10px',color:'#15803D',cursor:'pointer',fontSize:12,fontWeight:600}}>+ Jibu</button>
                <button onClick={()=>resolveUnanswered(u.id)} style={{background:'#F1F5F9',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:12}}>✓ Funga</button>
              </div>
            </div>
          </div>
        ))}
       </div>}
     </>}

    {/* Add/Edit Modal */}
    <Modal open={modal} onClose={()=>{setModal(false);setEdit(null)}} title={edit?'✏️ Hariri Swali':'➕ Swali Jipya'}>
      <Input label="Swali *" value={f.question} onChange={e=>setF({...f,question:e.target.value})} placeholder="Mfano: Nawezaje kuongeza bidhaa?"/>
      <Area label="Jibu *" value={f.answer} onChange={e=>setF({...f,answer:e.target.value})} placeholder="Andika jibu kamili..." rows={5}/>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,fontWeight:600,color:'#64748B',display:'block',marginBottom:4}}>Aina (Category)</label>
        <select value={f.category} onChange={e=>setF({...f,category:e.target.value})} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13}}>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Input label="Maneno Muhimu (keywords)" value={f.keywords} onChange={e=>setF({...f,keywords:e.target.value})} placeholder="bidhaa ongeza stock (yanasaidia utafutaji)"/>
      <Btn onClick={save} style={{width:'100%',justifyContent:'center',marginTop:8}}>{IC.ok} Hifadhi</Btn>
    </Modal>
  </div>;
}
