// ============================================================
// SOUND EFFECTS — Web Audio API (hakuna faili, hakuna gharama)
// Inazalisha toni za kisasa zinazovutia
// ============================================================

let audioCtx = null;

// Pata au unda AudioContext (mara moja tu)
function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  // Resume kama imesimama (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Piga toni moja
function playTone(freq, startTime, duration, type = 'sine', volume = 0.3) {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Envelope nzuri: panda haraka, shuka taratibu (kuepuka mlio mkali)
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

// ===== SAUTI YA MAUZO YALIYOFANIKIWA =====
// "Cha-ching!" ya kisasa — arpeggio ya kupanda inayovutia
export function playSaleSuccess() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Arpeggio nzuri ya mafanikio (C - E - G - C ya juu)
  // Kama kengele ya cash register lakini ya kisasa
  playTone(523.25, now,        0.15, 'sine', 0.25);  // C5
  playTone(659.25, now + 0.08, 0.15, 'sine', 0.25);  // E5
  playTone(783.99, now + 0.16, 0.18, 'sine', 0.28);  // G5
  playTone(1046.50, now + 0.24, 0.35, 'sine', 0.30); // C6 (kilele)

  // Ongeza "shimmer" ya juu kidogo kwa mvuto
  playTone(1567.98, now + 0.26, 0.25, 'triangle', 0.10); // G6 laini
}

// ===== SAUTI YA DENI (CREDIT) =====
// Toni mbili za upole — kuonyesha mauzo ya mkopo
export function playCreditSale() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(440.00, now,       0.18, 'sine', 0.22); // A4
  playTone(587.33, now + 0.12, 0.30, 'sine', 0.25); // D5
}

// ===== SAUTI YA HITILAFU =====
// Toni ya chini ya onyo
export function playError() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(311.13, now,        0.15, 'square', 0.15); // Eb4
  playTone(233.08, now + 0.12, 0.25, 'square', 0.15); // Bb3
}

// "Unlock" AudioContext kwenye first user interaction
// (browser autoplay policy)
let unlocked = false;
export function unlockAudio() {
  if (unlocked) return;
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => { unlocked = true; }).catch(() => {});
  } else if (ctx) {
    unlocked = true;
  }
}
