import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import Risiti from '../components/Risiti';
import { risitiKutoka, niNambaHalali, safishaNamba, RISITI } from '../utils/risiti';

// ============================================================
// UKURASA WA KUTHIBITISHA RISITI — dukalangu.com/r/DL-2026-000418
//
// Hauhitaji kuingia mfumoni: mwenye namba ya risiti ndiye
// mwenye haki ya kuiona. Lakini hapati jedwali — anapata safu
// MOJA kupitia dl_risiti(), bila barua pepe na namba ya simu
// imefichwa katikati.
// ============================================================

// Namba inatoka kwenye /r/NAMBA au ?risiti=NAMBA
export const nambaKutokaUrl = (href) => {
  try {
    const u = new URL(href);
    const m = /^\/r\/([^/?#]+)/i.exec(u.pathname);
    return safishaNamba(m ? decodeURIComponent(m[1]) : (u.searchParams.get('risiti') || ''));
  } catch { return ''; }
};

const BG = 'linear-gradient(170deg,#F6F8F7 0%,#EAF3ED 100%)';

export default function RisitiPage({ no: noProp }) {
  const no = safishaNamba(noProp || nambaKutokaUrl(window.location.href));
  const [hali, setHali] = useState('inasoma');  // inasoma | sawa | haipo | kosa
  const [r, setR] = useState(null);
  const [kosa, setKosa] = useState('');

  useEffect(() => {
    let hai = true;
    (async () => {
      if (!niNambaHalali(no)) { setHali('haipo'); setKosa('Namba ya risiti si sahihi.'); return; }
      try {
        const { data, error } = await supabase.rpc('dl_risiti', { p_no: no });
        if (!hai) return;
        if (error) {
          // Function haipo bado (migration haijaendeshwa)
          setHali('kosa');
          setKosa(/dl_risiti|PGRST202|function/i.test(error.message || '')
            ? 'Huduma ya kuthibitisha risiti bado haijawashwa.'
            : 'Imeshindikana kusoma risiti. Jaribu tena.');
          return;
        }
        if (!data?.ok) { setHali('haipo'); setKosa(data?.error || 'Risiti haijapatikana.'); return; }
        setR(risitiKutoka({
          risiti_no: data.risiti_no, amount: data.amount, days: data.days, plan: data.plan,
          status: data.status, paid_at: data.paid_at, created_at: data.created_at, inaisha: data.inaisha,
          phone: data.phone, business_name: data.business_name,
          channel: data.channel, provider: data.provider,
          external_id: data.external_id, provider_ref: data.provider_ref,
          aina: data.aina === 'uwakala' ? RISITI.uwakala : RISITI.duka,
        }, {
          name: data.business_name, region: data.region, district: data.district,
          akaunti_aina: data.akaunti_aina,
        }));
        setHali('sawa');
      } catch (e) {
        if (hai) { setHali('kosa'); setKosa('Tatizo la mtandao. Jaribu tena.'); }
      }
    })();
    return () => { hai = false; };
  }, [no]);

  const Shell = ({ children }) => (
    <div style={{ minHeight: '100vh', background: BG, padding: '28px 16px 44px', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {children}
      <div className="dlr-hide" style={{ textAlign: 'center', marginTop: 26 }}>
        <a href="/" style={{ fontSize: 12.5, color: '#5B6B61', textDecoration: 'none', fontWeight: 600 }}>
          dukalangu.com — Mfumo wa duka na uwakala
        </a>
      </div>
    </div>
  );

  if (hali === 'inasoma') return <Shell>
    <div style={{ maxWidth: 680, margin: '60px auto', textAlign: 'center', color: '#5B6B61', fontSize: 14 }}>Inasoma risiti…</div>
  </Shell>;

  if (hali !== 'sawa') return <Shell>
    <div style={{ maxWidth: 480, margin: '50px auto', background: '#fff', borderRadius: 18, padding: '30px 26px', textAlign: 'center', boxShadow: '0 14px 34px rgba(14,94,42,.1)' }}>
      <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#FBECE9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C2412D" strokeWidth="2.6" strokeLinecap="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F1A13' }}>{kosa}</div>
      {no && <div style={{ fontSize: 12.5, color: '#5B6B61', marginTop: 8 }}>
        Namba uliyotafuta: <b style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>{no}</b>
      </div>}
      <div style={{ fontSize: 12.5, color: '#5B6B61', marginTop: 14, lineHeight: 1.7 }}>
        Kama unaamini risiti hii ni halali, wasiliana nasi: <b>0617 288 752</b>
      </div>
    </div>
  </Shell>;

  return <Shell><Risiti r={r} hadhara /></Shell>;
}
