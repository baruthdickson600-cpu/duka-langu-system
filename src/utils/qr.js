// ============================================================
// DukaLangu — QR CODE (byte mode, ngazi M, matoleo 1-6)
//
// Imeandikwa hapa, si kwa library, kwa sababu:
//   1. Tunahitaji QR moja tu — kiungo cha kuthibitisha risiti.
//   2. Haitegemei mtandao wala package nyingine.
//
// Matoleo 1-6 yanatosha: herufi 106 kwa ngazi M. Kiungo cha
// risiti ni herufi 30. Toleo 7 na kuendelea lingehitaji
// "version information blocks" ambazo hatuzihitaji.
//
// Imethibitishwa kwa kusomwa na OpenCV (jaribio la nje).
// ============================================================

// Data codewords na EC kwa kila toleo, ngazi M
// [data codewords, EC kwa block, idadi ya blocks]
const TOLEO = {
  1: { data: 16,  ec: 10, blocks: 1 },
  2: { data: 28,  ec: 16, blocks: 1 },
  3: { data: 44,  ec: 26, blocks: 1 },
  4: { data: 64,  ec: 18, blocks: 2 },
  5: { data: 86,  ec: 24, blocks: 2 },
  6: { data: 108, ec: 16, blocks: 4 },
};
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

// ===== GF(256) kwa Reed-Solomon =====
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

// Polynomial ya kutengeneza EC codewords
const rsPoly = (n) => {
  let p = [1];
  for (let i = 0; i < n; i++) {
    const q = [...p, 0];
    for (let j = 0; j < p.length; j++) q[j + 1] ^= mul(p[j], EXP[i]);
    p = q;
  }
  return p;
};

const rsEncode = (data, ecLen) => {
  const gen = rsPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const d of data) {
    const f = d ^ res[0];
    res.shift(); res.push(0);
    if (f !== 0) for (let i = 0; i < ecLen; i++) res[i] ^= mul(gen[i + 1], f);
  }
  return res;
};

// ===== Format information (ngazi M = 00) =====
const formatBits = (mask) => {
  const data = (0b00 << 3) | mask;          // ngazi M
  let v = data << 10;
  for (let i = 4; i >= 0; i--) if (v & (1 << (i + 10))) v ^= 0b10100110111 << i;
  return ((data << 10) | v) ^ 0b101010000010010;
};

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0,
  (r, c) => ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0,
];

// Chagua toleo dogo kabisa linaloweza kubeba herufi hizi
const chaguaToleo = (len) => {
  for (let v = 1; v <= 6; v++) if (len + 2 <= TOLEO[v].data) return v;
  return null;
};

// ============================================================
// qrMatrix(text) -> safu mbili za boolean (true = nyeusi), au null
// ============================================================
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(String(text || ''))];
  const ver = chaguaToleo(bytes.length);
  if (!ver) return null;                      // ndefu kupita kiasi
  const { data: dataLen, ec: ecLen, blocks } = TOLEO[ver];
  const size = 17 + ver * 4;

  // ---- 1. Bit stream: mode(4) + urefu(8) + data + terminator ----
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, 8);                      // matoleo 1-9: bits 8
  bytes.forEach(b => push(b, 8));
  for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);

  const cw = [];
  for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const PAD = [0xEC, 0x11];
  for (let i = 0; cw.length < dataLen; i++) cw.push(PAD[i % 2]);

  // ---- 2. Gawa kwenye blocks, tengeneza EC ----
  const perBlock = Math.floor(dataLen / blocks);
  const extra = dataLen % blocks;             // blocks za mwisho zina moja zaidi
  const dBlocks = [], eBlocks = [];
  let at = 0;
  for (let b = 0; b < blocks; b++) {
    const n = perBlock + (b >= blocks - extra ? 1 : 0);
    const d = cw.slice(at, at + n); at += n;
    dBlocks.push(d);
    eBlocks.push(rsEncode(d, ecLen));
  }
  // Interleave
  const out = [];
  const maxD = Math.max(...dBlocks.map(b => b.length));
  for (let i = 0; i < maxD; i++) for (const b of dBlocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ecLen; i++) for (const b of eBlocks) out.push(b[i]);

  // ---- 3. Matrix ----
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const wazi = Array.from({ length: size }, () => new Array(size).fill(false)); // true = imehifadhiwa

  const weka = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) { m[r][c] = v; wazi[r][c] = true; } };

  // Finder + separator
  const finder = (R, C) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const on = inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      weka(R + r, C + c, on);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

  // Timing
  for (let i = 8; i < size - 8; i++) { weka(6, i, i % 2 === 0); weka(i, 6, i % 2 === 0); }

  // Alignment
  const ap = ALIGN[ver];
  for (const r of ap) for (const c of ap) {
    if ((r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
      weka(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }

  // Dark module
  weka(size - 8, 8, true);

  // Nafasi za format info (zinajazwa baadaye)
  for (let i = 0; i < 9; i++) { if (!wazi[8][i]) weka(8, i, false); if (!wazi[i][8]) weka(i, 8, false); }
  for (let i = 0; i < 8; i++) { if (!wazi[8][size - 1 - i]) weka(8, size - 1 - i, false); if (!wazi[size - 1 - i][8]) weka(size - 1 - i, 8, false); }

  // ---- 4. Weka data (zigzag kutoka chini kulia) ----
  let bi = 0, up = true;
  const dataBits = [];
  out.forEach(b => { for (let i = 7; i >= 0; i--) dataBits.push((b >> i) & 1); });
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;                      // ruka safu ya timing
    for (let i = 0; i < size; i++) {
      const row = up ? size - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (wazi[row][c]) continue;
        m[row][c] = bi < dataBits.length ? dataBits[bi++] === 1 : false;
      }
    }
    up = !up;
  }

  // ---- 5. Chagua mask yenye adhabu ndogo ----
  let bora = null, adhabuBora = Infinity;
  for (let mk = 0; mk < 8; mk++) {
    const t = m.map((row, r) => row.map((v, c) => wazi[r][c] ? v : (MASKS[mk](r, c) ? !v : v)));
    wekaFormat(t, wazi, size, mk);
    const p = adhabu(t, size);
    if (p < adhabuBora) { adhabuBora = p; bora = t; }
  }
  return bora;
}

// Weka format bits kwenye nafasi zao mbili
function wekaFormat(t, wazi, size, mask) {
  const f = formatBits(mask);
  const bit = i => ((f >> i) & 1) === 1;
  // Nakala ya kwanza (inazunguka finder ya juu-kushoto)
  for (let i = 0; i <= 5; i++) t[i][8] = bit(i);
  t[7][8] = bit(6); t[8][8] = bit(7); t[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) t[8][14 - i] = bit(i);
  // Nakala ya pili (chini-kushoto na juu-kulia)
  for (let i = 0; i <= 7; i++) t[8][size - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) t[size - 15 + i][8] = bit(i);
  t[size - 8][8] = true;                       // dark module
}

// Adhabu kwa mujibu wa ISO/IEC 18004
function adhabu(t, size) {
  let p = 0;
  // N1: mfululizo wa rangi moja
  for (let i = 0; i < size; i++) {
    for (const mlalo of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const a = mlalo ? t[i][j] : t[j][i], b = mlalo ? t[i][j - 1] : t[j - 1][i];
        if (a === b) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
  }
  // N2: vizuizi 2x2
  for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++)
    if (t[r][c] === t[r][c + 1] && t[r][c] === t[r + 1][c] && t[r][c] === t[r + 1][c + 1]) p += 3;
  // N3: muundo 1:1:3:1:1
  const kielelezo = [true, false, true, true, true, false, true];
  const kuna = (arr, i) => kielelezo.every((v, k) => arr[i + k] === v);
  for (let i = 0; i < size; i++) {
    const row = t[i], col = t.map(r => r[i]);
    for (const arr of [row, col]) {
      for (let j = 0; j + 7 <= size; j++) {
        if (!kuna(arr, j)) continue;
        const kabla = arr.slice(Math.max(0, j - 4), j);
        const baada = arr.slice(j + 7, j + 11);
        if ((kabla.length === 4 && kabla.every(v => !v)) || (baada.length === 4 && baada.every(v => !v))) p += 40;
      }
    }
  }
  // N4: uwiano wa weusi
  let nyeusi = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (t[r][c]) nyeusi++;
  p += Math.floor(Math.abs(nyeusi * 100 / (size * size) - 50) / 5) * 10;
  return p;
}

// ============================================================
// qrPath(text) -> { d, size } kwa <path> moja ndani ya <svg viewBox="0 0 size size">
// ============================================================
export function qrPath(text) {
  const m = qrMatrix(text);
  if (!m) return null;
  const size = m.length;
  let d = '';
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (!m[r][c]) { c++; continue; }
      let w = 1;
      while (c + w < size && m[r][c + w]) w++;
      d += `M${c} ${r}h${w}v1h-${w}z`;
      c += w;
    }
  }
  return { d, size };
}
