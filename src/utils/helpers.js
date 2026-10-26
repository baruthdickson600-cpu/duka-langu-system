// Jina rafiki la njia ya malipo
export const PAY_LABELS={
  cash:'Taslimu',mpesa:'M-Pesa',mobile:'M-Pesa',airtel:'Airtel Money',
  tigo:'Tigo/Mixx',halopesa:'HaloPesa',nmb:'NMB',crdb:'CRDB',
  bank:'Benki',mix:'Mchanganyiko',credit:'Deni',wallet:'Wallet',
};
export const payLabel=(m)=>PAY_LABELS[m]||m||'Taslimu';

// ===== HELPERS =====
export const genId = () => crypto.randomUUID?.() || Math.random().toString(36).substr(2, 12);

// ---- TAREHE ZA NDANI (LOCAL) — zinazozingatia saa za mtumiaji (EAT UTC+3) ----
// MUHIMU: created_at inahifadhiwa UTC. Kulinganisha kwa UTC (toISOString) kunafanya
// mauzo ya jioni/usiku "yaruke" tarehe. Hapa tunatumia tarehe ya ndani ya kila muamala.
export const localDateStr = (d) => {
  const x = d ? new Date(d) : new Date();
  if (isNaN(x)) return '';
  // Toa tarehe kwa saa za ndani (sYYYY-MM-DD) bila athari ya UTC
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const todayStr = () => localDateStr(new Date()); // tarehe ya leo kwa saa za ndani
export const nowISO = () => new Date().toISOString();
export const timeStr = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
export const fmtMoney = (n, cur = 'TZS') => `${cur} ${(n || 0).toLocaleString()}`;

// Date ranges — zote zinatumia tarehe ya NDANI ya muamala
export const isToday = (d) => d ? localDateStr(d) === todayStr() : false;
export const isThisWeek = (d) => {
  if (!d) return false;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7, 0, 0, 0);
  const x = new Date(d);
  return x >= start && x < end;
};
export const isThisMonth = (d) => d ? localDateStr(d).slice(0, 7) === todayStr().slice(0, 7) : false;

// Je muamala uko ndani ya kipindi [from..to] (tarehe za ndani, zote zikijumuishwa)?
export const inDateRange = (d, from, to) => {
  if (!d || !from || !to) return false;
  const ds = localDateStr(d);
  return ds >= from && ds <= to;
};

// ============================================================
// CHANZO KIMOJA CHA UKWELI — Hesabu za fedha za kipindi
// computePeriodFinance({sales, returns, expenses, purchases, creditHistory})
// Zote tayari zimechujwa kwa kipindi husika (siku/wiki/mwezi/custom).
// Inarudisha namba zinazolingana kila mahali (Ripoti, Dashboard, email).
// ============================================================
export const computePeriodFinance = ({ sales = [], returns = [], expenses = [], purchases = [], creditHistory = [] } = {}) => {
  // Mauzo ya taslimu dhidi ya deni
  const cashSales = sales.filter(s => s.payment_method !== 'credit');
  const creditSales = sales.filter(s => s.payment_method === 'credit');

  const grossSales = sales.reduce((a, s) => a + (s.total || 0), 0);
  const grossProfit = sales.reduce((a, s) => a + (s.profit || 0), 0);
  const cashSalesTotal = cashSales.reduce((a, s) => a + (s.total || 0), 0);
  const cashSalesProfit = cashSales.reduce((a, s) => a + (s.profit || 0), 0);
  const creditSalesTotal = creditSales.reduce((a, s) => a + (s.total || 0), 0);

  // Malipo ya deni yaliyopokewa (pesa taslimu iliyoingia)
  const creditPaymentsReceived = (creditHistory || [])
    .filter(t => t.type === 'payment')
    .reduce((a, p) => a + (p.amount || 0), 0);

  // Marejesho (returns): tenga cash refunds na credit refunds
  const cashRefunds = (returns || []).filter(r => !r.was_credit).reduce((a, r) => a + (r.refund_amount || 0), 0);
  const totalRefunds = (returns || []).reduce((a, r) => a + (r.refund_amount || 0), 0);
  // Faida iliyopotea kwa returns zote
  const refundProfit = (returns || []).reduce((sum, r) => sum + ((r.items || []).reduce((s, i) => s + ((i.qty || 0) * ((i.price || 0) - (i.buyPrice || i.buy_price || 0)) * (i.fraction || 1)), 0)), 0);

  // Matumizi (expenses)
  const totalExpenses = (expenses || []).reduce((a, e) => a + (e.amount || 0), 0);

  // Manunuzi ya stock yaliyotumia PESA YA DUKA (yanapunguza pesa mkononi, si faida)
  const stockBuyShop = (purchases || []).filter(p => p.source === 'shop' || !p.source).reduce((a, p) => a + (p.total || 0), 0);

  // ===== PESA MKONONI (cash on hand) =====
  // = mauzo ya taslimu + malipo ya deni yaliyopokewa − cash refunds − matumizi − manunuzi ya duka
  const netCash = Math.max(0, cashSalesTotal + creditPaymentsReceived - cashRefunds - totalExpenses - stockBuyShop);

  // ===== FAIDA HALISI (net profit, cash-basis) =====
  // = faida ya mauzo ya taslimu − faida iliyopotea kwa refunds − matumizi
  const netProfit = cashSalesProfit - refundProfit - totalExpenses;

  return {
    grossSales, grossProfit,
    cashSalesTotal, cashSalesProfit, creditSalesTotal,
    creditPaymentsReceived,
    cashRefunds, totalRefunds, refundProfit,
    totalExpenses, stockBuyShop,
    netCash, netProfit,
    salesCount: sales.length,
    cashSalesCount: cashSales.length,
    creditSalesCount: creditSales.length,
  };
};

// Offline queue
const OFFLINE_KEY = 'duka_offline_queue';
export const addToOfflineQueue = (action) => {
  try {
    const q = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    q.push({ ...action, timestamp: nowISO() });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(q));
  } catch (e) { console.error('Offline queue error', e); }
};
export const getOfflineQueue = () => {
  try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); } catch { return []; }
};
export const clearOfflineQueue = () => { localStorage.removeItem(OFFLINE_KEY); };

// Token code generator
export const genTokenCode = () => 'TK-' + Math.random().toString(36).substr(2, 8).toUpperCase();
export const genPromoCode = () => 'PROMO-' + Math.random().toString(36).substr(2, 6).toUpperCase();

// PDF Export using jsPDF
export const exportToPDF = async (title, headers, rows, filename) => {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`🏪 Duka Langu`, 14, 15);
  doc.setFontSize(14);
  doc.text(title, 14, 25);
  doc.setFontSize(10);
  doc.text(`Tarehe: ${fmtDate(new Date())}`, 14, 32);
  doc.autoTable({ startY: 38, head: [headers], body: rows, theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: [11, 122, 59] } });
  doc.save(filename || 'report.pdf');
};

// Excel/CSV export (inafunguka kwenye Excel; ina BOM kwa herufi za Kiswahili)
export const exportToCSV = (title, headers, rows, filename) => {
  const esc = (v) => {
    const s = (v == null ? '' : String(v));
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  if (title) lines.push(esc(title));
  lines.push(headers.map(esc).join(','));
  rows.forEach(r => lines.push(r.map(esc).join(',')));
  const csv = '﻿' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'report.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Receipt PDF — 80mm thermal-style, urefu wa kutosha, maandishi meusi
export const exportReceiptPDF = async (sale, bizName, footer) => {
  const { default: jsPDF } = await import('jspdf');
  const W = 80;                 // upana 80mm
  const M = 5;                  // margin
  const CW = W - M * 2;         // upana wa maudhui
  const items = sale.items || [];
  // Kadiria urefu unaohitajika (kila bidhaa ~ mistari 2)
  const estH = 70 + items.length * 9 + (sale.payment_method === 'credit' ? 20 : 0);
  const doc = new jsPDF({ unit: 'mm', format: [W, Math.max(120, estH)] });

  let y = 8;
  const center = (t, size, bold) => { doc.setFontSize(size); doc.setFont('courier', bold ? 'bold' : 'normal'); doc.text(String(t), W / 2, y, { align: 'center' }); y += size * 0.45 + 1.5; };
  const line = () => { doc.setLineWidth(0.2); doc.setLineDashPattern([0.6, 0.6], 0); doc.line(M, y, W - M, y); doc.setLineDashPattern([], 0); y += 3; };
  const solid = () => { doc.setLineWidth(0.5); doc.line(M, y, W - M, y); y += 3; };
  const row = (l, r, size = 8, bold) => { doc.setFontSize(size); doc.setFont('courier', bold ? 'bold' : 'normal'); doc.text(String(l), M, y); doc.text(String(r), W - M, y, { align: 'right' }); y += size * 0.45 + 1.8; };

  doc.setTextColor(0, 0, 0);
  // HEADER
  center((bizName || 'DUKA LANGU').toUpperCase(), 13, true);
  center(sale.payment_method === 'credit' ? 'CREDIT SALE' : 'SALES RECEIPT', 9, true);
  y += 1; line();

  // SALE INFO
  const rcpt = 'DK-' + new Date(sale.created_at || Date.now()).getFullYear() + '-' + (sale.id || '').slice(0, 6).toUpperCase();
  row('Receipt:', rcpt);
  row('Tarehe:', fmtDate(sale.created_at));
  if (sale.seller_name) row('Muuzaji:', sale.seller_name);
  if (sale.customer_name) row('Mteja:', sale.customer_name);
  line();

  // ITEMS
  doc.setFontSize(8); doc.setFont('courier', 'bold');
  doc.text('BIDHAA', M, y); doc.text('JUMLA', W - M, y, { align: 'right' }); y += 4;
  doc.setFont('courier', 'normal');
  items.forEach(it => {
    const name = String(it.name || '').slice(0, 30);
    doc.setFontSize(8); doc.text(name, M, y); y += 3.5;
    doc.setFontSize(7.5);
    doc.text(`${it.qty} x ${Math.round(it.price).toLocaleString()}`, M, y);
    doc.text(Math.round(it.qty * it.price * (it.fraction || 1)).toLocaleString(), W - M, y, { align: 'right' });
    y += 4;
  });
  line();

  // SUMMARY
  const subtotal = sale.subtotal != null ? sale.subtotal : items.reduce((s, i) => s + i.qty * i.price, 0);
  row('Subtotal:', Math.round(subtotal).toLocaleString());
  if (sale.discount > 0) row('Punguzo:', '-' + Math.round(sale.discount).toLocaleString());
  solid();
  row('JUMLA', 'TZS ' + Math.round(sale.total || 0).toLocaleString(), 12, true);
  solid();

  // PAYMENT
  row('Malipo:', payLabel(sale.payment_method), 8);
  const isCredit = sale.payment_method === 'credit';
  const paid = isCredit ? (sale.paid_amount || 0) : (sale.paid_amount != null ? sale.paid_amount : sale.total);
  if (!isCredit) row('Amelipa:', Math.round(paid).toLocaleString(), 8);
  if (!isCredit && sale.cash_received) {
    const change = Math.max(0, sale.cash_received - (sale.total || 0));
    if (change > 0) row('Chenji:', Math.round(change).toLocaleString(), 8);
  }
  if (isCredit) {
    const due = (sale.total || 0) - paid;
    row('Amelipa:', Math.round(paid).toLocaleString(), 8);
    row('Deni:', 'TZS ' + Math.round(due).toLocaleString(), 9, true);
  }

  // STATUS
  y += 2;
  const status = isCredit ? (paid > 0 ? 'PARTIAL' : 'CREDIT') : 'PAID';
  center('*** ' + status + ' ***', 10, true);

  // FOOTER
  line();
  center(footer || 'Asante kwa kununua!', 8);
  center('Karibu tena.', 8);
  center('dukalangu.com', 7);
  center('Powered by DukaLangu POS', 6.5);

  doc.save(`risiti-${(sale.id || '').slice(0, 8)}.pdf`);
};

// WhatsApp share
export const shareWhatsApp = (sale, bizName) => {
  let msg = `*${bizName || 'Duka Langu'}*\nRisiti #${sale.id?.slice(0, 8).toUpperCase()}\n\n`;
  (sale.items || []).forEach(i => { msg += `${i.name} x${i.qty} = ${(i.qty * i.price).toLocaleString()}\n`; });
  if (sale.discount > 0) msg += `\nPunguzo: -${sale.discount?.toLocaleString()}`;
  msg += `\n*JUMLA: TZS ${sale.total?.toLocaleString()}*\nMalipo: ${payLabel(sale.payment_method)}\n\nAsante! 🙏`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

