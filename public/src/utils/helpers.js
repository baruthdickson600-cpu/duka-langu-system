// ===== HELPERS =====
export const genId = () => crypto.randomUUID?.() || Math.random().toString(36).substr(2, 12);
export const todayStr = () => new Date().toISOString().split('T')[0];
export const nowISO = () => new Date().toISOString();
export const timeStr = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
export const fmtMoney = (n, cur = 'TZS') => `${cur} ${(n || 0).toLocaleString()}`;

// Date ranges
export const isToday = (d) => d?.startsWith(todayStr());
export const isThisWeek = (d) => {
  if (!d) return false;
  const now = new Date(), start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  return new Date(d) >= start;
};
export const isThisMonth = (d) => d?.startsWith(todayStr().slice(0, 7));

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

// Receipt PDF
export const exportReceiptPDF = async (sale, bizName, footer) => {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
  doc.setFontSize(14);
  doc.text(bizName || 'Duka Langu', 40, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Risiti #${sale.id?.slice(0, 8).toUpperCase()}`, 40, 16, { align: 'center' });
  doc.text(`${sale.date || fmtDate(sale.created_at)} ${sale.time || ''}`, 40, 20, { align: 'center' });
  const rows = (sale.items || []).map(i => [i.name, i.qty, (i.qty * i.price).toLocaleString()]);
  doc.autoTable({ startY: 24, head: [['Bidhaa', 'Qty', 'Jumla']], body: rows, theme: 'plain', styles: { fontSize: 7 }, margin: { left: 4, right: 4 }, columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 20, halign: 'right' } } });
  const y = doc.lastAutoTable.finalY + 4;
  if (sale.discount > 0) { doc.text(`Punguzo: -${sale.discount?.toLocaleString()}`, 4, y); }
  doc.setFontSize(11);
  doc.text(`JUMLA: TZS ${sale.total?.toLocaleString()}`, 4, y + 6);
  doc.setFontSize(7);
  doc.text(`Malipo: ${sale.payment_method || 'cash'}`, 4, y + 12);
  doc.setFontSize(8);
  doc.text(footer || 'Asante kwa kununua! Karibu tena', 40, y + 20, { align: 'center' });
  doc.save(`risiti-${sale.id?.slice(0, 8)}.pdf`);
};

// WhatsApp share
export const shareWhatsApp = (sale, bizName) => {
  let msg = `*${bizName || 'Duka Langu'}*\nRisiti #${sale.id?.slice(0, 8).toUpperCase()}\n\n`;
  (sale.items || []).forEach(i => { msg += `${i.name} x${i.qty} = ${(i.qty * i.price).toLocaleString()}\n`; });
  if (sale.discount > 0) msg += `\nPunguzo: -${sale.discount?.toLocaleString()}`;
  msg += `\n*JUMLA: TZS ${sale.total?.toLocaleString()}*\nMalipo: ${sale.payment_method || 'cash'}\n\nAsante! 🙏`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};
