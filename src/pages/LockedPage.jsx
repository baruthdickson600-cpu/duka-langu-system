import React,{useState} from 'react';
import {Input,Btn} from '../components/UI';
import {useApp} from '../context/AppContext';

export default function LockedPage(){
  const{activateToken,logout,settings}=useApp();
  const[code,setCode]=useState('');
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0B7A3B 0%,#065F2E 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#fff',borderRadius:20,padding:32,maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <img src="/logo.png" alt="Duka Langu" style={{width:80,height:80,objectFit:'contain',marginBottom:12}}/>
        <div style={{fontSize:28,marginBottom:4}}>🔒</div>
        <h2 style={{color:'#1E293B',margin:'0 0 8px'}}>Mfumo Umefungwa</h2>
        <p style={{color:'#64748B',fontSize:14,lineHeight:1.6}}>Muda wako umeisha. Lipa ili kuendelea.</p>
        <div style={{background:'#F0FDF4',borderRadius:12,padding:16,margin:'20px 0',border:'1px solid #BBF7D0'}}>
          <div style={{fontSize:12,color:'#15803D',fontWeight:600}}>Bei ya Mfumo</div>
          <div style={{fontSize:28,fontWeight:800,color:'#0B7A3B'}}>TZS {parseInt(settings.system_price||30000).toLocaleString()}</div>
        </div>
        <div style={{background:'#FFF7ED',borderRadius:12,padding:14,margin:'12px 0',border:'1px solid #FED7AA'}}>
          <div style={{fontSize:13,color:'#92400E',fontWeight:600}}>Lipa namba ya malipo</div>
          <div style={{fontSize:16,fontWeight:700,color:'#B45309',marginTop:4}}>{settings.payment_provider||'SELCOM'} {'>'} {settings.payment_number||'6113 4066'}</div>
          <div style={{fontSize:12,color:'#92400E'}}>Jina: {settings.payment_name||'BARUTH DICKSON THEO'}</div>
        </div>
        <div style={{textAlign:'left',marginTop:16}}>
          <Input label="Ingiza Token" placeholder="TK-XXXXXXXX" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleActivate()}/>
        </div>
        <Btn onClick={()=>{if(!code.trim())return alert('Ingiza token!');const e=activateToken(code.trim());if(e)alert(e);else{alert('Mfumo umefunguliwa! ✅');setCode('')}}} style={{width:'100%'}}>Fungua Mfumo</Btn>
        <button onClick={logout} style={{marginTop:16,background:'none',border:'none',color:'#EF4444',fontWeight:600,fontSize:13,cursor:'pointer'}}>Toka / Logout</button>
      </div>
    </div>
  );
}
