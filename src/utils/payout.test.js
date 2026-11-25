import { describe, it, expect } from 'vitest';
import { payoutBody } from '../../api/payments.js';

// ============================================================
// Muundo wa ombi la kutoa pesa — unatoka kwenye nyaraka rasmi
// za Snippe (disbursements). Toleo la zamani lilikuwa linatuma
// `payout_type` na `details{}`, ambavyo Snippe haviujui kabisa:
// kutoa pesa hakukuwahi kufanya kazi hata mara moja.
//
// Jaribio hili linazuia hilo kurudi. Ni code inayohamisha pesa.
// ============================================================

const SNIPPE_MOBILE = ['amount', 'channel', 'recipient_phone', 'recipient_name', 'narration', 'webhook_url', 'metadata'];
const SNIPPE_BANK = ['amount', 'channel', 'recipient_bank', 'recipient_account', 'recipient_name', 'narration', 'webhook_url', 'metadata'];
// Safu za toleo la zamani — zisirudi kamwe
const ZA_ZAMANI = ['payout_type', 'details', 'phone_number', 'bank_code', 'account_number', 'account_name'];

describe('payoutBody — simu', () => {
  const b = payoutBody({
    amount: 27000, method: 'mobile', recipientNumber: '0617288752',
    recipientName: 'THOMAS ANDERSON KAJUNI', reference: 'PO-1', narration: 'kulipia ghalama za mhuri',
    webhookUrl: 'https://dukalangu.com/api/payments?action=webhook',
  });

  it('ina safu zote Snippe anazohitaji', () => {
    SNIPPE_MOBILE.forEach(k => expect(b, k).toHaveProperty(k));
  });
  it('haina safu za toleo la zamani', () => {
    ZA_ZAMANI.forEach(k => expect(b[k], k).toBeUndefined());
  });
  it('channel ni "mobile", si jina la mtandao', () => {
    expect(b.channel).toBe('mobile');
  });
  it('namba ni 255XXXXXXXXX bila + wala 0', () => {
    expect(b.recipient_phone).toBe('255617288752');
    expect(b.recipient_phone).toMatch(/^255\d{9}$/);
  });
  it('kiasi ni nambari nzima, si herufi wala senti', () => {
    expect(b.amount).toBe(27000);
    expect(Number.isInteger(b.amount)).toBe(true);
  });
  it('hakuna safu ya pesa iliyofichwa ndani ya details', () => {
    expect(JSON.stringify(b)).not.toContain('details');
  });
});

describe('payoutBody — benki', () => {
  const b = payoutBody({
    amount: 50000, method: 'bank', recipientNumber: ' 0150000000 ',
    bankCode: ' crdb ', recipientName: 'Vendor LLC', reference: 'PO-2',
  });

  it('ina safu zote za benki', () => {
    SNIPPE_BANK.forEach(k => expect(b, k).toHaveProperty(k));
  });
  it('haina safu za simu', () => {
    expect(b.recipient_phone).toBeUndefined();
  });
  it('channel ni "bank"', () => expect(b.channel).toBe('bank'));
  it('code ya benki ni herufi kubwa, bila nafasi', () => {
    expect(b.recipient_bank).toBe('CRDB');
  });
  it('namba ya akaunti ni herufi, nafasi zimeondolewa', () => {
    expect(b.recipient_account).toBe('0150000000');
    expect(typeof b.recipient_account).toBe('string');
  });
});

describe('payoutBody — mifano ya hatari', () => {
  it('namba ya simu kwa maumbo yote inakuwa 255', () => {
    [['0617288752', '255617288752'], ['255617288752', '255617288752'],
     ['+255617288752', '255617288752'], ['617288752', '255617288752'],
     ['0617 288 752', '255617288752']]
      .forEach(([ingia, toka]) => {
        expect(payoutBody({ method: 'mobile', recipientNumber: ingia, amount: 1000 }).recipient_phone, ingia).toBe(toka);
      });
  });

  it('kiasi cha desimali kinazungushwa, si kukatwa', () => {
    expect(payoutBody({ method: 'mobile', amount: 1000.6, recipientNumber: '0617288752' }).amount).toBe(1001);
  });

  it('kiasi kibovu kinakuwa 0, si NaN — Snippe akatae badala ya kutuma takataka', () => {
    [null, undefined, '', 'elfu', NaN].forEach(x => {
      const b = payoutBody({ method: 'mobile', amount: x, recipientNumber: '0617288752' });
      expect(b.amount, String(x)).toBe(0);
      expect(Number.isNaN(b.amount)).toBe(false);
    });
  });

  it('jina tupu halitumi "undefined" kwa Snippe', () => {
    const b = payoutBody({ method: 'mobile', amount: 1000, recipientNumber: '0617288752' });
    expect(b.recipient_name).toBe('DukaLangu');
    expect(JSON.stringify(b)).not.toContain('undefined');
    expect(JSON.stringify(b)).not.toContain('null');
  });

  it('sababu ndefu inakatwa, haivunji ombi', () => {
    const b = payoutBody({ method: 'mobile', amount: 1000, recipientNumber: '0617288752', narration: 'x'.repeat(500) });
    expect(b.narration.length).toBe(100);
  });

  it('reference inabaki kwenye metadata kwa kufuatilia', () => {
    expect(payoutBody({ method: 'mobile', amount: 1000, recipientNumber: '0617288752', reference: 'PO-9' }).metadata)
      .toEqual({ reference: 'PO-9' });
  });
});
