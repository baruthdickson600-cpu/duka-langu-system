// Email sending utility — calls /api/send-email
const sendEmail = async (to, subject, type, data = {}) => {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, type, data }),
    });
    const result = await res.json();
    if (!res.ok) { console.warn('Email failed:', result); return false; }
    return true;
  } catch (e) { console.warn('Email error:', e); return false; }
};

// Shortcut functions
export const emailDailyReport = (to, data) => sendEmail(to, `📊 Ripoti ya Leo — ${new Date().toLocaleDateString('sw-TZ')}`, 'daily_report', data);
export const emailWeeklyReport = (to, data) => sendEmail(to, `📅 Muhtasari wa Wiki — ${new Date().toLocaleDateString('sw-TZ')}`, 'weekly_report', data);
export const emailMonthlyReport = (to, data) => sendEmail(to, `📊 Ripoti ya Mwezi — ${new Date().toLocaleDateString('sw-TZ', {month:'long',year:'numeric'})}`, 'monthly_report', data);
export const emailLowStock = (to, data) => sendEmail(to, `📦 Bidhaa ${data.count} Zinaisha — Agiza Sasa!`, 'low_stock', data);
export const emailOverdueDebt = (to, data) => sendEmail(to, `🚨 Deni Limechelewa — Wateja ${data.count}!`, 'overdue_debt', data);
export const emailPaymentReceived = (to, data) => sendEmail(to, `💰 ${data.customerName} Amelipa TZS ${(data.amount||0).toLocaleString()}`, 'payment_received', data);
export const emailNewCustomer = (to, data) => sendEmail(to, `🆕 Mteja Mpya: ${data.name}`, 'new_customer', data);
export const emailSubscriptionExpiry = (to, data) => sendEmail(to, `⏳ Muda Unakaribia Kuisha — Siku ${data.daysLeft}!`, 'subscription_expiry', data);
export const emailWelcome = (to, data) => sendEmail(to, '🎉 Karibu kwenye Duka Langu!', 'welcome', data);
export const emailPromotional = (to, data) => sendEmail(to, data.title || '🎉 Offer Maalum!', 'promotional', data);
export const emailAdminPayment = (to, data) => sendEmail(to, `💰 MALIPO MAPYA — ${data.businessName}!`, 'admin_payment', data);

export default sendEmail;
