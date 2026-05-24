import React,{useState,useEffect,useRef} from 'react';
import {useApp} from '../context/AppContext';

// ============================================
// HELP BUTTON + CHAT WIDGET (Office/Employee)
// Floating "Need Help? Ask Me!" button
// ============================================
export function HelpChatWidget(){
  const{user,biz,chatMessages,loadChatMessages,sendChatMessage,markChatRead,unreadChatCount}=useApp();
  const[open,setOpen]=useState(false);
  const[input,setInput]=useState('');
  const[sending,setSending]=useState(false);
  const scrollRef=useRef(null);
  const inputRef=useRef(null);
  
  // Load messages on open
  useEffect(()=>{
    if(open){
      loadChatMessages();
      markChatRead();
      setTimeout(()=>inputRef.current?.focus(),300);
    }
  },[open]);
  
  // Auto-scroll to bottom on new message
  useEffect(()=>{
    if(open&&scrollRef.current){
      scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
    }
  },[chatMessages,open]);
  
  // Mark as read when chat is open + new message arrives
  useEffect(()=>{
    if(open)markChatRead();
  },[chatMessages.length,open]);
  
  const send=async()=>{
    if(!input.trim()||sending)return;
    setSending(true);
    await sendChatMessage(input);
    setInput('');
    setSending(false);
    inputRef.current?.focus();
  };
  
  const handleKey=(e)=>{
    if(e.key==='Enter'&&!e.shiftKey){
      e.preventDefault();
      send();
    }
  };
  
  // Don't show for admin (they have their own panel)
  if(user?.role==='admin')return null;
  
  // Only show for office and employee
  if(user?.role!=='office'&&user?.role!=='employee')return null;
  
  // Time formatter
  const fmtTime=(d)=>{
    if(!d)return '';
    const date=new Date(d);
    const now=new Date();
    const diff=now-date;
    if(diff<60000)return 'sasa hivi';
    if(diff<3600000)return `dakika ${Math.floor(diff/60000)} zilizopita`;
    if(date.toDateString()===now.toDateString())return date.toLocaleTimeString('sw-TZ',{hour:'2-digit',minute:'2-digit'});
    return date.toLocaleDateString('sw-TZ',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  };
  
  return <>
    {/* FLOATING BUTTON */}
    {!open&&<button onClick={()=>setOpen(true)} style={{
      position:'fixed',
      bottom:20,
      right:20,
      zIndex:9990,
      background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
      color:'#fff',
      border:'none',
      borderRadius:30,
      padding:'14px 22px',
      fontSize:14,
      fontWeight:800,
      cursor:'pointer',
      boxShadow:'0 8px 30px rgba(11,122,59,0.4)',
      display:'flex',
      alignItems:'center',
      gap:10,
      animation:'helpPulse 3s ease-in-out infinite',
    }}>
      <span style={{fontSize:20}}>💬</span>
      <span>Need Help? Ask me!</span>
      {unreadChatCount>0&&<span style={{
        background:'#EF4444',
        color:'#fff',
        borderRadius:'50%',
        width:22,
        height:22,
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        fontSize:11,
        fontWeight:900,
        animation:'badgeBounce 1s ease-in-out infinite',
      }}>{unreadChatCount>9?'9+':unreadChatCount}</span>}
    </button>}
    
    {/* CHAT MODAL */}
    {open&&<div style={{
      position:'fixed',
      bottom:20,
      right:20,
      zIndex:9991,
      width:'min(380px, calc(100vw - 40px))',
      height:'min(560px, calc(100vh - 100px))',
      background:'#fff',
      borderRadius:20,
      boxShadow:'0 25px 80px rgba(0,0,0,0.3)',
      display:'flex',
      flexDirection:'column',
      overflow:'hidden',
      animation:'chatSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {/* HEADER */}
      <div style={{
        background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
        color:'#fff',
        padding:'14px 18px',
        display:'flex',
        alignItems:'center',
        gap:12,
        position:'relative',
      }}>
        <div style={{
          width:44,
          height:44,
          borderRadius:'50%',
          background:'rgba(255,255,255,0.2)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          fontSize:22,
          backdropFilter:'blur(10px)',
        }}>🛟</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:15}}>Msaada wa Mfumo</div>
          <div style={{fontSize:11,opacity:0.9,display:'flex',alignItems:'center',gap:5}}>
            <span style={{
              width:8,
              height:8,
              borderRadius:'50%',
              background:'#22C55E',
              animation:'pulse 2s infinite',
            }}/>
            <span>Tupo online — uliza chochote</span>
          </div>
        </div>
        <button onClick={()=>setOpen(false)} style={{
          background:'rgba(255,255,255,0.2)',
          border:'none',
          color:'#fff',
          width:32,
          height:32,
          borderRadius:'50%',
          cursor:'pointer',
          fontSize:18,
          fontWeight:700,
        }}>✕</button>
      </div>
      
      {/* MESSAGES */}
      <div ref={scrollRef} style={{
        flex:1,
        overflowY:'auto',
        padding:'16px 14px',
        background:'#F8FAFC',
        backgroundImage:'radial-gradient(circle at 1px 1px, #E2E8F0 1px, transparent 0)',
        backgroundSize:'20px 20px',
      }}>
        {/* Welcome message */}
        {chatMessages.length===0&&<div style={{textAlign:'center',padding:'30px 20px'}}>
          <div style={{fontSize:48,marginBottom:10}}>👋</div>
          <div style={{fontWeight:800,fontSize:16,color:'#0B7A3B',marginBottom:6}}>Karibu {user?.name||user?.email}!</div>
          <div style={{fontSize:12,color:'#64748B',lineHeight:1.5}}>
            Una swali au tatizo la mfumo? Andika hapa chini, tutakujibu haraka iwezekanavyo.
          </div>
          
          {/* Quick suggestions */}
          <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:8}}>
            {[
              'Mfumo unaonyesha tatizo',
              'Sijapata SMS ya OTP',
              'Bidhaa hazitoki vizuri',
              'Naomba mafunzo',
            ].map(q=><button key={q} onClick={()=>setInput(q)} style={{
              background:'#fff',
              border:'1px solid #BBF7D0',
              color:'#0B7A3B',
              padding:'8px 14px',
              borderRadius:20,
              fontSize:12,
              fontWeight:600,
              cursor:'pointer',
              textAlign:'left',
            }}>💭 {q}</button>)}
          </div>
        </div>}
        
        {/* Messages list */}
        {chatMessages.map((m,i)=>{
          const isMe=m.sender_id===user?.id||m.sender_role!=='admin';
          const isAdmin=m.sender_role==='admin';
          // Group consecutive messages from same sender
          const prevMsg=chatMessages[i-1];
          const showSender=!prevMsg||prevMsg.sender_role!==m.sender_role;
          
          return <div key={m.id} style={{
            display:'flex',
            justifyContent:isMe?'flex-end':'flex-start',
            marginBottom:showSender?12:4,
            animation:'msgFadeIn 0.3s ease-out',
          }}>
            <div style={{maxWidth:'78%'}}>
              {showSender&&!isMe&&<div style={{fontSize:10,color:'#64748B',marginBottom:3,marginLeft:12,fontWeight:700}}>
                {isAdmin?'🛟 Admin':m.sender_name}
              </div>}
              <div style={{
                background:isMe?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#fff',
                color:isMe?'#fff':'#1E293B',
                padding:'10px 14px',
                borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                fontSize:13,
                lineHeight:1.4,
                boxShadow:'0 1px 3px rgba(0,0,0,0.08)',
                wordBreak:'break-word',
              }}>{m.message}</div>
              <div style={{
                fontSize:9,
                color:'#94A3B8',
                marginTop:3,
                textAlign:isMe?'right':'left',
                paddingLeft:isMe?0:6,
                paddingRight:isMe?6:0,
              }}>{fmtTime(m.created_at)}</div>
            </div>
          </div>;
        })}
      </div>
      
      {/* INPUT */}
      <div style={{
        background:'#fff',
        borderTop:'1px solid #E2E8F0',
        padding:'10px 12px',
        display:'flex',
        gap:8,
        alignItems:'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Andika ujumbe wako..."
          rows={1}
          style={{
            flex:1,
            padding:'10px 14px',
            borderRadius:20,
            border:'1.5px solid #E2E8F0',
            fontSize:13,
            resize:'none',
            outline:'none',
            fontFamily:'inherit',
            maxHeight:80,
          }}
        />
        <button onClick={send} disabled={!input.trim()||sending} style={{
          background:input.trim()?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#CBD5E1',
          color:'#fff',
          border:'none',
          width:42,
          height:42,
          borderRadius:'50%',
          cursor:input.trim()?'pointer':'not-allowed',
          fontSize:18,
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          transition:'transform 0.2s',
        }}>{sending?'⋯':'➤'}</button>
      </div>
    </div>}
    
    <style>{`
      @keyframes helpPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 8px 30px rgba(11,122,59,0.4); }
        50% { transform: scale(1.05); box-shadow: 0 8px 40px rgba(11,122,59,0.6); }
      }
      @keyframes badgeBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      @keyframes chatSlideIn {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes msgFadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.2); }
      }
    `}</style>
  </>;
}

// ============================================
// ADMIN CHAT PANEL — Full-page chat manager
// Shows all customer conversations on left, chat on right
// ============================================
export function AdminChatPanel(){
  const{user,businesses,chatMessages,loadChatMessages,sendChatMessage,markChatRead}=useApp();
  const[selectedBizId,setSelectedBizId]=useState(null);
  const[input,setInput]=useState('');
  const[sending,setSending]=useState(false);
  const[search,setSearch]=useState('');
  const scrollRef=useRef(null);
  
  // Load all messages on mount
  useEffect(()=>{
    loadChatMessages();
  },[]);
  
  // Mark as read when selecting conversation
  useEffect(()=>{
    if(selectedBizId){
      markChatRead(selectedBizId);
      setTimeout(()=>{
        if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
      },100);
    }
  },[selectedBizId]);
  
  // Auto-scroll on new message
  useEffect(()=>{
    if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
  },[chatMessages]);
  
  // Group messages by business
  const conversations=React.useMemo(()=>{
    const groups={};
    chatMessages.forEach(m=>{
      if(!m.business_id)return;
      if(!groups[m.business_id]){
        const biz=businesses.find(b=>b.id===m.business_id);
        groups[m.business_id]={
          businessId:m.business_id,
          businessName:biz?.name||'Mteja',
          ownerName:biz?.owner_name||biz?.name,
          phone:biz?.phone,
          email:biz?.email,
          messages:[],
          lastMessage:null,
          unreadCount:0,
        };
      }
      groups[m.business_id].messages.push(m);
      groups[m.business_id].lastMessage=m;
      if(!m.read_by_admin&&m.sender_role!=='admin'){
        groups[m.business_id].unreadCount++;
      }
    });
    return Object.values(groups).sort((a,b)=>
      new Date(b.lastMessage?.created_at||0)-new Date(a.lastMessage?.created_at||0)
    );
  },[chatMessages,businesses]);
  
  const filtered=conversations.filter(c=>
    !search||c.businessName?.toLowerCase().includes(search.toLowerCase())
  );
  
  const selectedConv=conversations.find(c=>c.businessId===selectedBizId);
  
  const send=async()=>{
    if(!input.trim()||sending||!selectedBizId)return;
    setSending(true);
    await sendChatMessage(input,selectedBizId);
    setInput('');
    setSending(false);
  };
  
  const fmtTime=(d)=>{
    if(!d)return '';
    const date=new Date(d);
    const now=new Date();
    const diff=now-date;
    if(diff<60000)return 'sasa hivi';
    if(diff<3600000)return `${Math.floor(diff/60000)}min`;
    if(date.toDateString()===now.toDateString())return date.toLocaleTimeString('sw-TZ',{hour:'2-digit',minute:'2-digit'});
    if(diff<7*86400000)return date.toLocaleDateString('sw-TZ',{weekday:'short'});
    return date.toLocaleDateString('sw-TZ',{day:'numeric',month:'short'});
  };
  
  const totalUnread=conversations.reduce((s,c)=>s+c.unreadCount,0);
  
  return <div>
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:22,fontWeight:900,color:'#0B7A3B',margin:'0 0 4px'}}>💬 Mazungumzo na Wateja</h2>
      <p style={{fontSize:12,color:'#64748B',margin:0}}>
        Jibu maswali ya wateja kwa wakati halisi
        {totalUnread>0&&<span style={{marginLeft:10,background:'#EF4444',color:'#fff',padding:'2px 10px',borderRadius:10,fontSize:11,fontWeight:700}}>{totalUnread} mpya</span>}
      </p>
    </div>
    
    <div style={{
      display:'grid',
      gridTemplateColumns:'320px 1fr',
      gap:0,
      height:'calc(100vh - 180px)',
      minHeight:500,
      background:'#fff',
      borderRadius:14,
      overflow:'hidden',
      boxShadow:'0 4px 20px rgba(0,0,0,0.05)',
      border:'1px solid #E2E8F0',
    }}>
      {/* CONVERSATIONS LIST */}
      <div style={{borderRight:'1px solid #E2E8F0',display:'flex',flexDirection:'column'}}>
        <div style={{padding:12,borderBottom:'1px solid #E2E8F0',background:'#F8FAFC'}}>
          <input
            type="text"
            placeholder="🔍 Tafuta mteja..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{
              width:'100%',
              padding:'10px 14px',
              border:'1px solid #E2E8F0',
              borderRadius:10,
              fontSize:13,
              outline:'none',
              boxSizing:'border-box',
            }}
          />
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {filtered.length?filtered.map(c=><div
            key={c.businessId}
            onClick={()=>setSelectedBizId(c.businessId)}
            style={{
              padding:'14px 16px',
              borderBottom:'1px solid #F1F5F9',
              cursor:'pointer',
              background:selectedBizId===c.businessId?'#F0FDF4':'transparent',
              borderLeft:selectedBizId===c.businessId?'3px solid #0B7A3B':'3px solid transparent',
              transition:'background 0.15s',
            }}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:'#1E293B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {c.businessName}
                </div>
                <div style={{fontSize:11,color:'#64748B',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {c.lastMessage?.sender_role==='admin'?'You: ':''}{c.lastMessage?.message}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:10,color:'#94A3B8'}}>{fmtTime(c.lastMessage?.created_at)}</div>
                {c.unreadCount>0&&<div style={{
                  background:'#EF4444',
                  color:'#fff',
                  borderRadius:'50%',
                  width:20,
                  height:20,
                  display:'inline-flex',
                  alignItems:'center',
                  justifyContent:'center',
                  fontSize:10,
                  fontWeight:700,
                  marginTop:4,
                }}>{c.unreadCount}</div>}
              </div>
            </div>
          </div>):<div style={{padding:30,textAlign:'center',color:'#94A3B8'}}>
            <div style={{fontSize:36,marginBottom:8}}>💬</div>
            <div style={{fontSize:13}}>Hakuna mazungumzo bado</div>
          </div>}
        </div>
      </div>
      
      {/* CHAT VIEW */}
      <div style={{display:'flex',flexDirection:'column',background:'#F8FAFC'}}>
        {selectedConv?<>
          {/* HEADER */}
          <div style={{
            background:'#fff',
            padding:'14px 18px',
            borderBottom:'1px solid #E2E8F0',
            display:'flex',
            alignItems:'center',
            gap:12,
          }}>
            <div style={{
              width:42,
              height:42,
              borderRadius:'50%',
              background:'linear-gradient(135deg,#0B7A3B,#065F2E)',
              color:'#fff',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              fontWeight:900,
              fontSize:16,
            }}>{(selectedConv.businessName||'?')[0].toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:800,fontSize:15}}>{selectedConv.businessName}</div>
              <div style={{fontSize:11,color:'#64748B'}}>
                📞 {selectedConv.phone||'—'} • 📧 {selectedConv.email||'—'}
              </div>
            </div>
          </div>
          
          {/* MESSAGES */}
          <div ref={scrollRef} style={{
            flex:1,
            overflowY:'auto',
            padding:'20px 18px',
            backgroundImage:'radial-gradient(circle at 1px 1px, #E2E8F0 1px, transparent 0)',
            backgroundSize:'20px 20px',
          }}>
            {selectedConv.messages.map((m,i)=>{
              const isMe=m.sender_role==='admin';
              const prevMsg=selectedConv.messages[i-1];
              const showSender=!prevMsg||prevMsg.sender_role!==m.sender_role;
              
              return <div key={m.id} style={{
                display:'flex',
                justifyContent:isMe?'flex-end':'flex-start',
                marginBottom:showSender?12:4,
                animation:'msgFadeIn 0.3s ease-out',
              }}>
                <div style={{maxWidth:'70%'}}>
                  {showSender&&!isMe&&<div style={{fontSize:10,color:'#64748B',marginBottom:3,marginLeft:12,fontWeight:700}}>
                    {m.sender_name}
                  </div>}
                  <div style={{
                    background:isMe?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#fff',
                    color:isMe?'#fff':'#1E293B',
                    padding:'10px 14px',
                    borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                    fontSize:13,
                    lineHeight:1.4,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.08)',
                    wordBreak:'break-word',
                  }}>{m.message}</div>
                  <div style={{
                    fontSize:9,
                    color:'#94A3B8',
                    marginTop:3,
                    textAlign:isMe?'right':'left',
                    paddingLeft:isMe?0:6,
                    paddingRight:isMe?6:0,
                  }}>{fmtTime(m.created_at)}</div>
                </div>
              </div>;
            })}
          </div>
          
          {/* INPUT */}
          <div style={{
            background:'#fff',
            borderTop:'1px solid #E2E8F0',
            padding:'12px 14px',
            display:'flex',
            gap:10,
            alignItems:'flex-end',
          }}>
            <textarea
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
              placeholder="Andika jibu lako..."
              rows={1}
              style={{
                flex:1,
                padding:'10px 14px',
                borderRadius:20,
                border:'1.5px solid #E2E8F0',
                fontSize:13,
                resize:'none',
                outline:'none',
                fontFamily:'inherit',
                maxHeight:100,
              }}
            />
            <button onClick={send} disabled={!input.trim()||sending} style={{
              background:input.trim()?'linear-gradient(135deg,#0B7A3B,#065F2E)':'#CBD5E1',
              color:'#fff',
              border:'none',
              width:42,
              height:42,
              borderRadius:'50%',
              cursor:input.trim()?'pointer':'not-allowed',
              fontSize:18,
            }}>{sending?'⋯':'➤'}</button>
          </div>
        </>:<div style={{
          flex:1,
          display:'flex',
          flexDirection:'column',
          alignItems:'center',
          justifyContent:'center',
          color:'#94A3B8',
          padding:30,
          textAlign:'center',
        }}>
          <div style={{fontSize:64,marginBottom:14}}>💬</div>
          <div style={{fontWeight:700,fontSize:16,color:'#475569',marginBottom:6}}>Chagua mteja kuanza mazungumzo</div>
          <div style={{fontSize:12}}>Bofya jina la mteja upande wa kushoto</div>
        </div>}
      </div>
    </div>
    
    <style>{`
      @keyframes msgFadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>;
}
