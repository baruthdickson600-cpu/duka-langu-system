import React from 'react';
import { qrPath } from '../utils/qr';
import {
  fmtTsh, tareheKati, tareheSaa, njiaJina, risitiUrl, risitiUrlFupi, safishaNamba,
} from '../utils/risiti';

// ============================================================
// DukaLangu — RISITI YA MALIPO YA MFUMO
//
// Kadi moja inayotumika sehemu tatu: baada ya malipo, kwenye
// historia ya malipo, na kwenye ukurasa wa kuthibitisha.
// Ndiyo maana haijui chochote kuhusu AppContext — inapokea
// data tu, hivyo hata mtu asiyeingia mfumoni anaweza kuiona.
// ============================================================

const G1 = '#1E7A3C', G2 = '#0E5E2A', G3 = '#6CC04A';
const INK = '#0F1A13', MUT = '#5B6B61', LINE = '#DCE8E0', SOFT = '#EAF3ED';

const Tick = ({ s = 18, c = '#fff', w = 3.4 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
);

// Nembo ya DukaLangu (toleo tulivu — bila animation, inachapika)
const Nembo = ({ s = 38 }) => (
  <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
    <defs><linearGradient id="dlr-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2E9A52" /><stop offset="1" stopColor={G2} /></linearGradient></defs>
    <path d="M22 52 h58 v40 a6 6 0 0 1 -6 6 H28 a6 6 0 0 1 -6 -6 Z" fill="url(#dlr-g)" />
    <path d="M64 58 h30 v46 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 z" fill="#fff" stroke={G2} strokeWidth="2.5" strokeLinejoin="round" />
    <g stroke={G1} strokeWidth="3" strokeLinecap="round"><path d="M72 70 H86" /><path d="M72 78 H86" /><path d="M72 86 H82" /></g>
    <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M30 64 H37 L42 86 H62 L67 70 H40" /><circle cx="45" cy="92" r="2.4" fill="#fff" stroke="none" /><circle cx="60" cy="92" r="2.4" fill="#fff" stroke="none" />
    </g>
    <path d="M14 52 L24 30 H96 L106 52 Z" fill={G2} />
    <path d="M18 52 q7 8 14 0 V36 H18 Z" fill={G1} /><path d="M32 52 q7 8 14 0 V33 H32 Z" fill="#fff" />
    <path d="M46 52 q7 8 14 0 V31 H46 Z" fill={G3} /><path d="M60 52 q7 8 14 0 V31 H60 Z" fill="#fff" />
    <path d="M74 52 q7 8 14 0 V33 H74 Z" fill={G3} /><path d="M88 52 q7 8 14 0 V36 H88 Z" fill={G1} />
    <path d="M24 30 H96 L100 40 H20 Z" fill={G1} />
  </svg>
);

const QR = ({ text, s = 86 }) => {
  const p = React.useMemo(() => qrPath(text), [text]);
  if (!p) return null;
  return (
    <svg width={s} height={s} viewBox={`-2 -2 ${p.size + 4} ${p.size + 4}`}
      style={{ flex: 'none', background: '#fff', borderRadius: 10, padding: 5, border: `1px solid ${LINE}`, boxSizing: 'content-box' }}
      shapeRendering="crispEdges" role="img" aria-label="QR ya kuthibitisha risiti">
      <rect x="-2" y="-2" width={p.size + 4} height={p.size + 4} fill="#fff" />
      <path d={p.d} fill={G2} />
    </svg>
  );
};

const Mstari = ({ k, v, sub, mono }) => (
  <div className="dlr-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', gap: 16 }}>
    <div style={{ fontSize: 13, color: MUT, flex: 'none' }}>{k}</div>
    <div style={{ fontSize: mono ? 12.5 : 13.5, color: INK, fontWeight: 700, textAlign: 'right', fontFamily: mono ? 'ui-monospace,Menlo,monospace' : undefined, wordBreak: 'break-word' }}>
      {v || '—'}
      {sub && <small style={{ display: 'block', fontWeight: 500, color: MUT, fontSize: 11.5, marginTop: 2, fontFamily: 'inherit' }}>{sub}</small>}
    </div>
  </div>
);

const Sehemu = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: '.17em', textTransform: 'uppercase', color: '#93A49A', fontWeight: 800, margin: '18px 0 10px' }}>{children}</div>
);

// ============================================================
// RISITI — kadi yenyewe
// ============================================================
export default function Risiti({ r, hadhara = false }) {
  if (!r) return null;
  const no = safishaNamba(r.no);
  const url = no ? risitiUrl(no) : '';
  const imelipwa = r.hali === 'paid';

  return (
    <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
      <style>{`
        @media print{
          body *{visibility:hidden}
          .dlr-print,.dlr-print *{visibility:visible}
          .dlr-print{position:absolute;left:0;top:0;width:100%;box-shadow:none !important;filter:none !important}
          .dlr-hide{display:none !important}
          @page{margin:12mm}
        }
        .dlr-row+.dlr-row{border-top:1px solid #F1F6F3}
        .dlr-zig{height:16px;background:#fff;margin-top:-1px;
          -webkit-mask-image:linear-gradient(45deg,transparent 50%,#000 50%),linear-gradient(-45deg,transparent 50%,#000 50%);
          -webkit-mask-size:18px 18px;-webkit-mask-repeat:repeat-x;-webkit-mask-position:0 -9px,0 -9px;
          mask-image:linear-gradient(45deg,transparent 50%,#000 50%),linear-gradient(-45deg,transparent 50%,#000 50%);
          mask-size:18px 18px;mask-repeat:repeat-x;mask-position:0 -9px,0 -9px}
      `}</style>

      <div className="dlr-print" style={{ filter: 'drop-shadow(0 18px 38px rgba(14,94,42,.16)) drop-shadow(0 2px 5px rgba(0,0,0,.05))' }}>
        <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>

          {/* KICHWA */}
          <div style={{ background: `linear-gradient(135deg,${G1} 0%,${G2} 70%)`, padding: '22px 24px 46px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -70, top: -90, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,192,74,.36),transparent 65%)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Nembo s={36} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 25, lineHeight: 1, letterSpacing: '-.3px' }}>
                    <span style={{ color: '#fff' }}>Duka</span><span style={{ color: G3 }}>Langu</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.72)', letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 5, fontWeight: 600 }}>Risiti ya Malipo</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9.5, letterSpacing: '.16em', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', fontWeight: 700 }}>Risiti Namba</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 15, color: '#fff', fontWeight: 700, marginTop: 4 }}>{no || '—'}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.7)', marginTop: 5 }}>{tareheSaa(r.kulipwa)}</div>
              </div>
            </div>
          </div>

          {/* BENGI */}
          <div style={{ position: 'relative', height: 0, zIndex: 5 }}>
            <div style={{ position: 'absolute', left: 24, top: -27, display: 'inline-flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 999, padding: '9px 18px 9px 10px', boxShadow: '0 8px 22px rgba(14,94,42,.22)', whiteSpace: 'nowrap' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: imelipwa ? 'linear-gradient(135deg,#22C55E,#15803D)' : 'linear-gradient(135deg,#F59E0B,#B45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {imelipwa ? <Tick /> : <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>!</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: imelipwa ? '#15803D' : '#B45309', lineHeight: 1.1 }}>
                  {imelipwa ? 'MALIPO YAMETHIBITISHWA' : 'MALIPO HAYAJAKAMILIKA'}
                </div>
                <div style={{ fontSize: 10, color: MUT, fontWeight: 600, letterSpacing: '.04em' }}>
                  {imelipwa ? 'Huduma imefunguliwa papo hapo' : 'Bado hayajathibitishwa'}
                </div>
              </div>
            </div>
          </div>

          {/* KIASI */}
          <div style={{ padding: '44px 24px 22px', textAlign: 'center', borderBottom: `1px dashed ${LINE}` }}>
            <div style={{ fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: MUT, fontWeight: 700 }}>Kiasi Kilicholipwa</div>
            <div style={{ fontSize: 46, fontWeight: 800, color: INK, letterSpacing: '-1.4px', lineHeight: 1.05, marginTop: 7 }}>
              <span style={{ fontSize: 22, color: G1, fontWeight: 700, verticalAlign: 12, marginRight: 6 }}>TZS</span>
              {Math.round(Number(r.kiasi) || 0).toLocaleString('en-US')}
            </div>
            {imelipwa && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, background: SOFT, color: G2, fontSize: 12, fontWeight: 700, padding: '7px 15px', borderRadius: 999 }}>
              <Tick s={13} c={G2} w={2.6} /> Imelipwa kikamilifu kwa {njiaJina(r.njia)}
            </div>}
          </div>

          {/* MISTARI */}
          <div style={{ padding: '18px 24px 4px' }}>
            <Sehemu>Mlipaji</Sehemu>
            <Mstari k="Biashara" v={r.biashara} sub={r.mahali} />
            {!hadhara && r.barua && <Mstari k="Barua pepe" v={r.barua} />}
            <Mstari k="Namba ya simu" v={r.simu} mono />

            <Sehemu>Huduma</Sehemu>
            <Mstari k="Kifurushi" v={r.kifurushi} sub={r.maelezo} />
            <Mstari k="Muda" v={`Siku ${r.siku}`} />

            <div style={{ margin: '14px 0 4px', background: 'linear-gradient(135deg,#F3FAF5,#EAF5EE)', border: '1px solid #D8EADF', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10.5, color: MUT, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>Imeanza</div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: G2, marginTop: 3 }}>{tareheKati(r.kulipwa)}</div>
              </div>
              <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke={G3} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M1 7h21M17 2l5 5-5 5" /></svg>
              <div>
                <div style={{ fontSize: 10.5, color: MUT, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>Inaisha</div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: G2, marginTop: 3 }}>{tareheKati(r.inaisha)}</div>
              </div>
              <div style={{ background: G1, color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 12px', borderRadius: 10, flex: 'none', textAlign: 'center', lineHeight: 1.2 }}>
                {r.siku}<small style={{ display: 'block', fontSize: 9, fontWeight: 600, opacity: .8, letterSpacing: '.1em' }}>SIKU</small>
              </div>
            </div>

            <Sehemu>Muamala</Sehemu>
            <Mstari k="Njia ya malipo" v={njiaJina(r.njia)} />
            {r.kumbukumbuMtandao && <Mstari k="Kumbukumbu ya mtandao" v={r.kumbukumbuMtandao} mono />}
            {r.kumbukumbuMfumo && <Mstari k="Kumbukumbu ya mfumo" v={r.kumbukumbuMfumo} mono />}
            <Mstari k="Tarehe ya malipo" v={imelipwa ? `${tareheSaa(r.kulipwa)} EAT` : '—'} />

            {/* MGUU */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${LINE}`, padding: '16px 0 4px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {no && <QR text={risitiUrlFupi(no)} />}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, letterSpacing: '.02em' }}>DUKALANGU SOLUTION GROUP</div>
                <p style={{ fontSize: 11.5, color: MUT, lineHeight: 1.65, margin: '3px 0 0' }}>
                  Bomavillage, Urambo – Tabora · S.L.P 45<br />
                  Msaada: 0617 288 752 · <span style={{ color: G1, fontWeight: 700 }}>dukalangu.com</span>
                </p>
                <div style={{ fontSize: 10.5, color: '#93A49A', lineHeight: 1.6, marginTop: 9, fontStyle: 'italic' }}>
                  Risiti hii imetolewa kiotomatiki baada ya malipo kuthibitishwa.
                  {no && ' Piga picha QR kuithibitisha mtandaoni.'}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="dlr-zig" />
      </div>

      {/* VITENDO — havichapishwi */}
      {no && <div className="dlr-hide" style={{ display: 'flex', gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
        <Kitufe pri onClick={() => window.print()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5h20v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
          Chapisha / Pakua PDF
        </Kitufe>
        <Kitufe onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Risiti ya DukaLangu ${no} — ${fmtTsh(r.kiasi)}\n${url}`)}`, '_blank')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G1} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H7l-3 3z" /></svg>
          Tuma kwa WhatsApp
        </Kitufe>
        <Kitufe onClick={() => { try { navigator.clipboard.writeText(url); } catch { /* kivinjari cha zamani */ } }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G1} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          Nakili kiungo
        </Kitufe>
      </div>}
    </div>
  );
}

const Kitufe = ({ pri, onClick, children }) => (
  <button onClick={onClick} style={{
    flex: '1 1 160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 13, borderRadius: 13, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
    border: pri ? '1px solid transparent' : `1px solid ${LINE}`,
    background: pri ? `linear-gradient(135deg,${G1},${G2})` : '#fff',
    color: pri ? '#fff' : INK,
    boxShadow: pri ? '0 8px 18px rgba(14,94,42,.2)' : 'none',
  }}>{children}</button>
);
