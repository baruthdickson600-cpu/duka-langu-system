import React,{useState,useEffect,useRef,useCallback} from 'react';
import {supabase} from '../config/supabase';
import {useApp} from '../context/AppContext';

// ============================================================
// ASK ME — FAQ Chat System (BURE, hakuna gharama ya AI)
// Inatafuta majibu kutoka knowledge_base kwa keyword matching
// ============================================================

// Synonyms - maneno yanayofanana (Kiswahili)
const SYNONYMS={
  'duka':'biashara','shop':'biashara','store':'biashara',
  'product':'bidhaa','item':'bidhaa','goods':'bidhaa',
  'sell':'uza','sale':'mauzo','sales':'mauzo',
  'customer':'mteja','client':'mteja',
  'debt':'deni','credit':'mkopo','loan':'mkopo',
  'profit':'faida','report':'ripoti',
  'employee':'mfanyakazi','staff':'mfanyakazi','worker':'mfanyakazi','cashier':'muuzaji',
  'branch':'tawi','price':'bei','cost':'bei',
  'stock':'stock','inventory':'stock',
  'pay':'lipa','payment':'malipo','money':'pesa',
  'help':'msaada','support':'msaada',
  'add':'ongeza','create':'tengeneza','new':'mpya',
  'change':'badilisha','edit':'hariri','update':'badilisha',
  'delete':'futa','remove':'ondoa',
  'how':'jinsi','vipi':'jinsi','namna':'jinsi',
};

function normalize(text){
  let t=text.toLowerCase().trim();
  // Badilisha synonyms
  Object.entries(SYNONYMS).forEach(([en,sw])=>{
    t=t.replace(new RegExp('\\b'+en+'\\b','g'),sw);
  });
  return t;
}

// Smart search: linganisha swali la mteja na FAQ
function scoreMatch(query, faq){
  const q=normalize(query);
  const words=q.split(/\s+/).filter(w=>w.length>2);
  if(!words.length)return 0;
  let score=0;
  const question=normalize(faq.question||'');
  const keywords=normalize(faq.keywords||'');
  const answer=normalize(faq.answer||'');
  // Exact/partial question match = best
  if(question.includes(q))score+=100;
  // Word matches
  words.forEach(w=>{
    if(question.includes(w))score+=10;
    if(keywords.includes(w))score+=8;
    if(answer.includes(w))score+=3;
    // Partial match (mwanzo wa neno) - kwa makosa ya tahajia
    const qWords=question.split(/\s+/).concat(keywords.split(/\s+/));
    qWords.forEach(qw=>{
      if(qw.length>3&&w.length>3){
        if(qw.startsWith(w.slice(0,4))||w.startsWith(qw.slice(0,4)))score+=2;
      }
    });
  });
  return score;
}

export default function AskMe(){
  const{user,biz}=useApp();
  const[open,setOpen]=useState(false);
  const[faqs,setFaqs]=useState([]);
  const[messages,setMessages]=useState([]);
  const[input,setInput]=useState('');
  const[typing,setTyping]=useState(false);
  const[loaded,setLoaded]=useState(false);
  const endRef=useRef(null);
  const convId=useRef(null);

  // Load FAQs once when opened
  useEffect(()=>{
    if(open&&!loaded){
      (async()=>{
        try{
          const{data}=await supabase.from('knowledge_base').select('*').eq('is_active',true);
          setFaqs(data||[]);
        }catch(e){console.warn('FAQ load:',e);}
        setLoaded(true);
        // Welcome message + maswali yanayoulizwa sana
        setMessages([{
          id:'welcome',sender:'bot',
          content:`Karibu ${user?.name||''}! 👋 Mimi ni msaidizi wa DukaLangu. Niulize swali lolote kuhusu jinsi ya kutumia mfumo.`,
          time:new Date(),
        },{
          id:'quick',sender:'bot',type:'quick',
          content:'Maswali yanayoulizwa sana:',
          quick:[
            'Nawezaje kuongeza bidhaa?',
            'Nawezaje kufanya mauzo?',
            'Nawezaje kuuza kwa mkopo?',
            'Nawezaje kuona faida yangu?',
            'Nawezaje kuongeza mfanyakazi?',
          ],
          time:new Date(),
        }]);
      })();
    }
  },[open,loaded,user]);

  // Auto-scroll
  useEffect(()=>{
    endRef.current?.scrollIntoView({behavior:'smooth'});
  },[messages,typing]);

  // Create conversation in DB (best-effort)
  const ensureConv=useCallback(async(firstMsg)=>{
    if(convId.current)return convId.current;
    try{
      const{data}=await supabase.from('faq_conversations').insert({
        business_id:biz?.id||null,
        user_id:user?.id||null,
        user_email:user?.email||null,
        title:firstMsg.slice(0,50),
        last_message:firstMsg,
      }).select().single();
      if(data){convId.current=data.id;return data.id;}
    }catch(e){console.warn('conv:',e);}
    return null;
  },[biz,user]);

  // Save message to DB (best-effort, won't block UI)
  const saveMsg=useCallback(async(cId,sender,content,faqId=null)=>{
    if(!cId)return;
    try{
      await supabase.from('faq_messages').insert({
        conversation_id:cId,sender,content,matched_faq_id:faqId,
      });
    }catch(e){/* silent */}
  },[]);

  // Save unanswered question for Customer Care
  const saveUnanswered=useCallback(async(question)=>{
    try{
      await supabase.from('faq_unanswered').insert({
        business_id:biz?.id||null,
        user_email:user?.email||null,
        question,
      });
    }catch(e){/* silent */}
  },[biz,user]);

  const send=async(directText)=>{
    const text=(directText||input).trim();
    if(!text)return;
    setInput('');
    const userMsg={id:Date.now(),sender:'user',content:text,time:new Date()};
    setMessages(prev=>[...prev,userMsg]);
    setTyping(true);

    const cId=await ensureConv(text);
    saveMsg(cId,'user',text);

    // Search FAQ
    const scored=faqs.map(f=>({faq:f,score:scoreMatch(text,f)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score);

    // Simulate typing delay (natural feel)
    setTimeout(async()=>{
      setTyping(false);
      if(scored.length&&scored[0].score>=8){
        const best=scored[0].faq;
        const botMsg={id:Date.now()+1,sender:'bot',content:best.answer,time:new Date(),faqId:best.id};
        setMessages(prev=>[...prev,botMsg]);
        saveMsg(cId,'bot',best.answer,best.id);
        // Show related questions
        const related=scored.slice(1,4).filter(x=>x.score>=8);
        if(related.length){
          setTimeout(()=>{
            setMessages(prev=>[...prev,{
              id:Date.now()+2,sender:'bot',type:'related',
              content:'Maswali mengine yanayohusiana:',
              related:related.map(x=>x.faq),time:new Date(),
            }]);
          },400);
        }
        // Update FAQ views
        try{supabase.from('knowledge_base').update({views:(best.views||0)+1}).eq('id',best.id).then(()=>{});}catch(_){}
      }else{
        // No match - escalate to Customer Care
        const fallback='Samahani, sijapata jibu la swali hili. 😔 Nimelihifadhi na timu yetu ya Customer Care itakusaidia. Unaweza pia kutuma tiketi kwenye "Msaada" au kuwasiliana nasi kupitia WhatsApp.';
        setMessages(prev=>[...prev,{id:Date.now()+1,sender:'bot',content:fallback,time:new Date()}]);
        saveMsg(cId,'bot',fallback);
        saveUnanswered(text);
      }
    },700+Math.random()*500);
  };

  const askRelated=(faq)=>{
    const userMsg={id:Date.now(),sender:'user',content:faq.question,time:new Date()};
    const botMsg={id:Date.now()+1,sender:'bot',content:faq.answer,time:new Date(),faqId:faq.id};
    setMessages(prev=>[...prev,userMsg,botMsg]);
  };

  const fmtTime=(d)=>{
    try{return new Date(d).toLocaleTimeString('sw',{hour:'2-digit',minute:'2-digit'});}
    catch{return '';}
  };

  return(
    <>
      {/* Floating Button */}
      {!open&&(
        <button onClick={()=>setOpen(true)} style={{
          position:'fixed',bottom:24,right:24,zIndex:9998,
          width:60,height:60,borderRadius:'50%',border:'none',
          background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
          color:'#fff',fontSize:26,cursor:'pointer',
          boxShadow:'0 8px 28px rgba(11,122,59,0.45)',
          display:'flex',alignItems:'center',justifyContent:'center',
          transition:'transform 0.2s',
        }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
           onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
           title="Uliza Swali">
          💬
        </button>
      )}

      {/* Chat Window */}
      {open&&(
        <div style={{
          position:'fixed',bottom:24,right:24,zIndex:9999,
          width:'min(380px,calc(100vw - 32px))',height:'min(560px,calc(100vh - 100px))',
          background:'#fff',borderRadius:20,
          boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
          display:'flex',flexDirection:'column',overflow:'hidden',
          border:'1px solid #E2E8F0',
        }}>
          {/* Header */}
          <div style={{
            background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
            padding:'16px 18px',display:'flex',alignItems:'center',gap:12,
          }}>
            <div style={{
              width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.2)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,
            }}>💬</div>
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:15}}>Uliza Swali</div>
              <div style={{color:'rgba(255,255,255,0.8)',fontSize:11}}>● Tuko hapa kukusaidia</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{
              background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,
              width:32,height:32,color:'#fff',fontSize:18,cursor:'pointer',
            }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'16px',background:'#F8FAFC'}}>
            {messages.map(m=>(
              <div key={m.id} style={{
                display:'flex',
                justifyContent:m.sender==='user'?'flex-end':'flex-start',
                marginBottom:12,
              }}>
                <div style={{maxWidth:'85%'}}>
                  <div style={{
                    padding:'10px 14px',borderRadius:14,fontSize:13.5,lineHeight:1.5,
                    background:m.sender==='user'?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#fff',
                    color:m.sender==='user'?'#fff':'#1E293B',
                    border:m.sender==='user'?'none':'1px solid #E2E8F0',
                    borderBottomRightRadius:m.sender==='user'?4:14,
                    borderBottomLeftRadius:m.sender==='user'?14:4,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    {m.content}
                    {/* Quick questions (welcome) */}
                    {m.type==='quick'&&m.quick&&(
                      <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
                        {m.quick.map((q,i)=>(
                          <button key={i} onClick={()=>send(q)} style={{
                            textAlign:'left',background:'#F0FDF4',border:'1px solid #BBF7D0',
                            borderRadius:8,padding:'8px 10px',fontSize:12,color:'#0B7A3B',
                            cursor:'pointer',fontWeight:600,
                          }}>❓ {q}</button>
                        ))}
                      </div>
                    )}
                    {/* Related questions */}
                    {m.type==='related'&&m.related&&(
                      <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
                        {m.related.map(f=>(
                          <button key={f.id} onClick={()=>askRelated(f)} style={{
                            textAlign:'left',background:'#F0FDF4',border:'1px solid #BBF7D0',
                            borderRadius:8,padding:'8px 10px',fontSize:12,color:'#0B7A3B',
                            cursor:'pointer',fontWeight:600,
                          }}>❓ {f.question}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize:10,color:'#94A3B8',marginTop:3,
                    textAlign:m.sender==='user'?'right':'left',
                  }}>{fmtTime(m.time)}</div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing&&(
              <div style={{display:'flex',justifyContent:'flex-start',marginBottom:12}}>
                <div style={{
                  padding:'12px 16px',borderRadius:14,background:'#fff',
                  border:'1px solid #E2E8F0',display:'flex',gap:4,
                }}>
                  {[0,1,2].map(i=>(
                    <span key={i} style={{
                      width:7,height:7,borderRadius:'50%',background:'#94A3B8',
                      animation:`askmebounce 1.2s ${i*0.2}s infinite`,
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Input */}
          <div style={{padding:'12px 14px',borderTop:'1px solid #E2E8F0',background:'#fff',display:'flex',gap:8}}>
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Andika swali lako..."
              style={{
                flex:1,padding:'11px 14px',borderRadius:12,
                border:'1.5px solid #E2E8F0',fontSize:13.5,outline:'none',
              }}
            />
            <button onClick={send} disabled={!input.trim()} style={{
              width:44,height:44,borderRadius:12,border:'none',
              background:input.trim()?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#CBD5E1',
              color:'#fff',fontSize:18,cursor:input.trim()?'pointer':'default',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>➤</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes askmebounce {
          0%,60%,100%{transform:translateY(0);opacity:0.4;}
          30%{transform:translateY(-6px);opacity:1;}
        }
      `}</style>
    </>
  );
}
