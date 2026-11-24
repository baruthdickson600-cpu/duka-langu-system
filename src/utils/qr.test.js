import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { qrMatrix, qrPath } from './qr';
import { risitiUrlFupi } from './risiti';

const hash = (m) => crypto.createHash('sha256')
  .update(m.map(r => r.map(v => (v ? 1 : 0)).join('')).join('')).digest('hex');

describe('qrMatrix', () => {
  it('ukubwa unakua kadri data inavyoongezeka (17 + toleo*4)', () => {
    expect(qrMatrix('A').length).toBe(21);          // toleo 1
    expect(qrMatrix('A'.repeat(30)).length).toBe(29); // toleo 3
    expect(qrMatrix('A'.repeat(100)).length).toBe(41); // toleo 6
  });

  it('data ndefu kupita kiasi inarudisha null badala ya QR mbovu', () => {
    expect(qrMatrix('A'.repeat(107))).toBe(null);
    expect(qrMatrix('A'.repeat(500))).toBe(null);
  });

  it('finder patterns zipo pembe tatu', () => {
    const m = qrMatrix(risitiUrlFupi('DL-2026-000418'));
    const n = m.length;
    const finder = (R, C) => {
      for (let r = 0; r <= 6; r++) for (let c = 0; c <= 6; c++) {
        const on = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        if (m[R + r][C + c] !== on) return false;
      }
      return true;
    };
    expect(finder(0, 0)).toBe(true);
    expect(finder(0, n - 7)).toBe(true);
    expect(finder(n - 7, 0)).toBe(true);
  });

  it('timing patterns zinabadilishana', () => {
    const m = qrMatrix(risitiUrlFupi('DL-2026-000418'));
    for (let i = 8; i < m.length - 8; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
  });

  it('dark module ipo', () => {
    const m = qrMatrix('A');
    expect(m[m.length - 8][8]).toBe(true);
  });

  it('kila moduli ni boolean — hakuna null iliyobaki', () => {
    const m = qrMatrix(risitiUrlFupi('DL-2026-000418'));
    m.forEach(row => row.forEach(v => expect(typeof v).toBe('boolean')));
  });

  it('matokeo ni yaleyale kila mara (QR isibadilike kati ya kurasa)', () => {
    const a = qrMatrix('dukalangu.com/r/DL-2026-000418');
    const b = qrMatrix('dukalangu.com/r/DL-2026-000418');
    expect(hash(a)).toBe(hash(b));
  });

  // Hii ndiyo QR iliyothibitishwa kusomeka na OpenCV. Ikibadilika,
  // encoder imevunjika — isipite mpaka ithibitishwe tena.
  it('inalingana na QR iliyothibitishwa kusomeka', () => {
    const m = qrMatrix('dukalangu.com/r/DL-2026-000418');
    expect(m.length).toBe(29);
    expect(hash(m)).toBe('4b614c300c93ff1df6e2609d32620cbca49c49da047f7c197ccd38e81042e328');
  });

  it('data tofauti inatoa QR tofauti', () => {
    expect(hash(qrMatrix('dukalangu.com/r/DL-2026-000418')))
      .not.toBe(hash(qrMatrix('dukalangu.com/r/DL-2026-000419')));
  });
});

describe('qrPath', () => {
  it('inarudisha path na ukubwa', () => {
    const p = qrPath('dukalangu.com/r/DL-2026-000418');
    expect(p.size).toBe(29);
    expect(p.d.startsWith('M')).toBe(true);
    expect(p.d.length).toBeGreaterThan(100);
    expect(p.d).not.toContain('NaN');
    expect(p.d).not.toContain('undefined');
  });
  it('null kwa data ndefu kupita kiasi', () => {
    expect(qrPath('A'.repeat(200))).toBe(null);
  });
});
