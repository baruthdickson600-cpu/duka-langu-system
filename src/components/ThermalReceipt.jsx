import React,{useState,useMemo,useRef} from 'react';
import {useApp} from '../context/AppContext';
import {exportReceiptPDF,shareWhatsApp,payLabel} from '../utils/helpers';

// ============================================================
// ThermalReceipt — Risiti ya kitaalamu (58mm / 80mm)
// Inachukua data kutoka sale iliyokamilika (dynamic, hakuna hardcoded)
// Haibadilishi logic ya mauzo wala database.
// ============================================================

// Formatters
const fmtTZS=(n)=>'TZS '+Math.round(n||0).toLocaleString('en-US');
const fmtNum=(n)=>Math.round(n||0).toLocaleString('en-US');
const fmtDMY=(d)=>{const x=new Date(d||Date.now());return `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}/${x.getFullYear()}`;};
const fmtHM=(d)=>{const x=new Date(d||Date.now());return `${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`;};

export default function ThermalReceipt({sale,onClose}){
  const{biz,settings}=useApp();
  const[width,setWidth]=useState('80'); // 58 | 80
  const[duplicate,setDuplicate]=useState(false);
  const printRef=useRef();

  const data=useMemo(()=>{
    if(!sale)return null;
    const items=sale.items||[];
    const totalItems=items.length;
    const totalQty=items.reduce((s,i)=>s+(i.qty||0),0);
    const subtotal=sale.subtotal!=null?sale.subtotal:items.reduce((s,i)=>s+(i.qty*i.price),0);
    const discount=sale.discount||0;
    const total=sale.total!=null?sale.total:subtotal-discount;
    const isCredit=sale.payment_method==='credit';
    const paid=isCredit?(sale.paid_amount||0):(sale.paid_amount!=null?sale.paid_amount:total);
    const due=isCredit?(total-paid):0;
    const change=(!isCredit&&sale.cash_received)?Math.max(0,sale.cash_received-total):0;
    const status=isCredit?(paid>0?'PARTIAL':'CREDIT'):'PAID';
    return{items,totalItems,totalQty,subtotal,discount,total,isCredit,paid,due,change,status};
  },[sale]);

  if(!sale||!data)return null;

  const receiptNo=('DK-'+new Date(sale.created_at||Date.now()).getFullYear()+'-'+(sale.id||'').slice(0,6).toUpperCase())||'DK-000000';
  const saleRef=sale.notes||('SALE/POS/'+(sale.id||'').slice(0,8).toUpperCase());
  const verifyUrl=`https://dukalangu.com/verify/${(sale.id||'').slice(0,12)}`;
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

  const doPrint=()=>{
    setDuplicate(false);
    setTimeout(()=>window.print(),50);
  };
  const doReprint=()=>{
    setDuplicate(true);
    setTimeout(()=>{window.print();},50);
  };

  const statusColor=data.status==='PAID'?'#16A34A':data.status==='PARTIAL'?'#3B82F6':'#EF4444';

  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:2000,overflow:'auto',padding:'20px 12px'}} onClick={onClose}>
    <style>{PRINT_CSS}</style>
    <div onClick={e=>e.stopPropagation()} style={{maxWidth:440,width:'100%'}}>

      {/* Controls (hazichapishwi) */}
      <div className="no-print" style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:'14px 16px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',borderBottom:'1px solid #EEF2F6'}}>
        <b style={{fontSize:14,color:'#101828',flex:1}}>🧾 Risiti</b>
        <div style={{display:'flex',gap:4,background:'#F1F5F9',borderRadius:8,padding:3}}>
          <button onClick={()=>setWidth('58')} style={{padding:'5px 12px',borderRadius:6,border:'none',fontSize:11.5,fontWeight:700,cursor:'pointer',background:width==='58'?'#0B7A3B':'transparent',color:width==='58'?'#fff':'#64748B'}}>58mm</button>
          <button onClick={()=>setWidth('80')} style={{padding:'5px 12px',borderRadius:6,border:'none',fontSize:11.5,fontWeight:700,cursor:'pointer',background:width==='80'?'#0B7A3B':'transparent',color:width==='80'?'#fff':'#64748B'}}>80mm</button>
        </div>
        <button onClick={onClose} style={{background:'#F1F5F9',border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:16,color:'#64748B'}}>×</button>
      </div>

      {/* RECEIPT (inachapishwa) */}
      <div className="receipt-scroll" style={{background:'#F8FAFC',padding:'18px 12px',maxHeight:'60vh',overflow:'auto'}}>
        <div ref={printRef} id="thermal-receipt" className={`receipt receipt-${width}`}>
          {duplicate&&<div className="dup-watermark">NAKALA</div>}

          {/* HEADER */}
          <div className="r-center">
            {(biz?.logo||settings?.logo)&&<img src={biz?.logo||settings?.logo} alt="" className="r-logo" onError={e=>e.currentTarget.style.display='none'}/>}
            <div className="r-bizname">{(biz?.name||'DUKALANGU SHOP').toUpperCase()}</div>
            <div className="r-doctype">{data.isCredit?'CREDIT SALE':'SALES RECEIPT'}</div>
            {biz?.address&&<div className="r-sm">{biz.address}</div>}
            {biz?.region&&!biz?.address&&<div className="r-sm">{biz.region}</div>}
            {biz?.phone&&<div className="r-sm">Tel: {biz.phone}</div>}
            {biz?.email&&<div className="r-sm">{biz.email}</div>}
            {biz?.tin&&<div className="r-sm">TIN: {biz.tin}</div>}
            {biz?.vrn&&<div className="r-sm">VRN: {biz.vrn}</div>}
          </div>

          <div className="r-divider"></div>

          {/* SALE INFO */}
          <div className="r-info">
            <div className="r-row"><span>Receipt:</span><span>{receiptNo}</span></div>
            <div className="r-row"><span>Tarehe:</span><span>{fmtDMY(sale.created_at)}</span></div>
            <div className="r-row"><span>Muda:</span><span>{fmtHM(sale.created_at)}</span></div>
            <div className="r-row"><span>Muuzaji:</span><span>{sale.seller_name||'-'}</span></div>
            {sale.customer_name&&<div className="r-row"><span>Mteja:</span><span>{sale.customer_name}</span></div>}
            {sale.customer_phone&&<div className="r-row"><span>Simu:</span><span>{sale.customer_phone}</span></div>}
          </div>

          <div className="r-divider"></div>

          {/* ITEMS */}
          <div className="r-items-head">
            <span className="c-item">BIDHAA</span>
            <span className="c-amt">JUMLA</span>
          </div>
          <div className="r-dotted"></div>
          {data.items.map((it,i)=>(
            <div key={i} className="r-item">
              <div className="r-item-name">{it.name}</div>
              <div className="r-item-line">
                <span className="c-qty">{fmtNum(it.qty)} × {fmtNum(it.price)}</span>
                <span className="c-amt">{fmtNum(it.qty*it.price)}</span>
              </div>
            </div>
          ))}

          <div className="r-divider"></div>

          {/* SUMMARY */}
          <div className="r-info">
            <div className="r-row"><span>Bidhaa:</span><span>{data.totalItems}</span></div>
            <div className="r-row"><span>Idadi:</span><span>{fmtNum(data.totalQty)}</span></div>
            <div className="r-row"><span>Subtotal:</span><span>{fmtNum(data.subtotal)}</span></div>
            {data.discount>0&&<div className="r-row"><span>Punguzo:</span><span>-{fmtNum(data.discount)}</span></div>}
            {(biz?.vrn||biz?.tin)&&<div className="r-row"><span>VAT:</span><span>Included</span></div>}
          </div>

          <div className="r-double"></div>
          <div className="r-total-row">
            <span>JUMLA</span>
            <span>{fmtTZS(data.total)}</span>
          </div>
          <div className="r-double"></div>

          {/* PAYMENT */}
          <div className="r-info" style={{marginTop:6}}>
            <div className="r-row"><span>Malipo:</span><span>{payLabel(sale.payment_method)}</span></div>
            {!data.isCredit&&<div className="r-row"><span>Amelipa:</span><span>{fmtNum(data.paid)}</span></div>}
            {data.change>0&&<div className="r-row"><span>Chenji:</span><span>{fmtNum(data.change)}</span></div>}
            {sale.transaction_id&&<div className="r-row"><span>TXN:</span><span>{sale.transaction_id}</span></div>}
          </div>

          {/* CREDIT BADGE */}
          {data.isCredit&&<div className="r-credit-box">
            <div className="r-credit-badge">CREDIT SALE</div>
            <div className="r-row"><span>Amelipa:</span><span>{fmtNum(data.paid)}</span></div>
            <div className="r-row r-bold"><span>Deni:</span><span>{fmtTZS(data.due)}</span></div>
            {sale.due_date&&<div className="r-row"><span>Tarehe ya kulipa:</span><span>{fmtDMY(sale.due_date)}</span></div>}
          </div>}

          {/* STATUS */}
          <div className="r-status" style={{color:statusColor,borderColor:statusColor}}>{data.status}</div>

          {/* FOOTER */}
          <div className="r-divider"></div>
          <div className="r-center r-footer">
            <div className="r-footer-msg">{biz?.receipt_footer||'Asante kwa kununua!'}</div>
            <div className="r-footer-msg">Karibu tena.</div>
            <img src={qrUrl} alt="QR" className="r-qr" onError={e=>e.currentTarget.style.display='none'}/>
            <div className="r-sm">Scan kuthibitisha risiti</div>
            {biz?.phone&&<div className="r-sm">WhatsApp: {biz.phone}</div>}
            <div className="r-sm">dukalangu.com</div>
            <div className="r-powered">Powered by DukaLangu POS</div>
          </div>
        </div>
      </div>

      {/* ACTIONS (hazichapishwi) */}
      <div className="no-print" style={{background:'#fff',borderRadius:'0 0 16px 16px',padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <button onClick={doPrint} style={btnStyle('#0B7A3B','#fff')}>🖨️ Chapisha</button>
        <button onClick={doReprint} style={btnStyle('#F1F5F9','#475569')}>🔁 Chapisha Nakala</button>
        <button onClick={()=>exportReceiptPDF(sale,biz?.name,biz?.receipt_footer)} style={btnStyle('#EFF6FF','#2563EB')}>📄 Pakua PDF</button>
        <button onClick={()=>shareWhatsApp(sale,biz?.name)} style={btnStyle('#F0FDF4','#16A34A')}>💬 WhatsApp</button>
      </div>
    </div>
  </div>;
}

const btnStyle=(bg,color)=>({padding:'11px 0',borderRadius:11,border:'none',background:bg,color,fontWeight:700,fontSize:13,cursor:'pointer'});

// ============================================================
// PRINT CSS — 58mm & 80mm thermal
// ============================================================
const PRINT_CSS=`
.receipt{background:#fff;color:#000;font-family:'Courier New',monospace;margin:0 auto;padding:10px 8px;box-shadow:0 2px 12px rgba(0,0,0,.08);}
.receipt-80{width:300px;font-size:12px;}
.receipt-58{width:216px;font-size:10.5px;}
.receipt *{line-height:1.35;}
.r-center{text-align:center;}
.r-logo{max-width:70px;max-height:50px;object-fit:contain;margin:0 auto 4px;display:block;}
.r-bizname{font-weight:800;font-size:1.45em;letter-spacing:.5px;}
.r-doctype{font-weight:700;font-size:.95em;margin:3px 0;letter-spacing:1px;}
.r-sm{font-size:.82em;color:#222;}
.r-divider{border-top:1px dashed #000;margin:7px 0;}
.r-double{border-top:2px solid #000;margin:5px 0;}
.r-dotted{border-top:1px dotted #555;margin:3px 0;}
.r-info .r-row{display:flex;justify-content:space-between;gap:8px;}
.r-row span:first-child{color:#333;}
.r-row span:last-child{font-weight:600;text-align:right;}
.r-bold span{font-weight:800 !important;}
.r-items-head{display:flex;justify-content:space-between;font-weight:800;font-size:.85em;}
.r-item{margin:4px 0;padding-bottom:3px;border-bottom:1px dotted #ccc;}
.r-item-name{font-weight:700;word-break:break-word;}
.r-item-line{display:flex;justify-content:space-between;}
.c-qty{color:#333;}
.c-amt{text-align:right;font-weight:700;}
.r-total-row{display:flex;justify-content:space-between;align-items:center;font-weight:900;}
.receipt-80 .r-total-row{font-size:1.4em;}
.receipt-58 .r-total-row{font-size:1.2em;}
.r-credit-box{border:1.5px solid #000;border-radius:6px;padding:6px 8px;margin:8px 0;}
.r-credit-badge{text-align:center;font-weight:800;font-size:.95em;letter-spacing:1px;margin-bottom:4px;background:#000;color:#fff;padding:2px;border-radius:3px;}
.r-status{text-align:center;font-weight:900;font-size:1.1em;letter-spacing:3px;border:2px solid;border-radius:6px;padding:4px;margin:8px auto;width:60%;}
.r-footer{margin-top:6px;}
.r-footer-msg{font-size:.9em;font-weight:600;}
.r-qr{width:90px;height:90px;margin:8px auto;display:block;}
.receipt-58 .r-qr{width:70px;height:70px;}
.r-powered{font-size:.72em;color:#666;margin-top:6px;}
.dup-watermark{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:2.4em;font-weight:900;color:rgba(0,0,0,.08);pointer-events:none;letter-spacing:6px;}
#thermal-receipt{position:relative;}

@media print{
  body *{visibility:hidden !important;}
  #thermal-receipt,#thermal-receipt *{visibility:visible !important;}
  #thermal-receipt{position:absolute;left:0;top:0;margin:0;padding:6px 4px;box-shadow:none;width:100% !important;max-width:80mm;}
  .no-print{display:none !important;}
  .receipt-58{max-width:58mm;font-size:10px;}
  .receipt-80{max-width:80mm;font-size:11px;}
  .r-item,.r-total-row,.r-credit-box{page-break-inside:avoid;}
  @page{margin:0;}
}
`;
