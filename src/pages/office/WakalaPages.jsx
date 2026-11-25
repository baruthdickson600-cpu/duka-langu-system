// ============================================================
// DukaLangu — KURASA ZA UWAKALA
//
// Huduma hii inajitegemea. Haigusi mauzo, stock wala ripoti za
// duka. Ikiwa imezimwa (wakala_enabled=false), kurasa hizi
// hazipakiwi hata kidogo.
//
// MUUNDO:
//   📲 Rekodi      — wakala anaandika muamala (haraka, kwa simu)
//   🔒 Funga Siku  — upatanisho: hesabu kwanza, jibu baadaye
//   📊 Dashibodi   — mmiliki: kamisheni, tofauti, float ya kila laini
//   🧾 Ripoti      — historia ya siku na miamala yote
//   ⚙️ Laini       — mmiliki anaweka mitandao na kiwango cha onyo
// ============================================================
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import useWakala from '../../hooks/useWakala';
import { IC, Btn, Modal, Input, Sel, Area, Badge, Empty, Tabs } from '../../components/UI';
import { PageHead, SumCard, HeroCard, HeroStats } from '../../components/Page';
import { fmtMoney, localDateStr, fmtDate } from '../../utils/helpers';
import Risiti from '../../components/Risiti';
import { risitiKutoka, RISITI } from '../../utils/risiti';
import { TiketiBar } from '../../components/Tiketi';
import { TX, txLabel, varianceState, doesWakala,
         GHARAMA, CHANZO, gharamaLabel, gharamaIcon,
         mtandaoUnalingana, mtandaoJina, nambaKamili,
         gharamaChanzo, gharamaKwaChanzo, KIBANDANI, OFISINI,
         beiYaUwakala, fmtBei, BEI, PUNGUZO, AINA, ainaYa } from '../../utils/wakala';

const C = {
  green: '#0A6E47', dark: '#06502F', gold: '#F2B705', red: '#C2412D',
  ink: '#17231D', muted: '#5C6A62', pale: '#9AA5A0',
  line: '#D6E2DB', soft: '#E6F2EC', warm: '#FFF8E6', blush: '#FBECE9',
};

const money = n => fmtMoney(Math.round(Number(n) || 0));
// Namba pekee (bila TZS) — kwa majedwali yenye safu nyingi kwenye simu
const num0 = n => Math.round(Number(n) || 0).toLocaleString();
// "2026-11-20" -> "20/11/2026" bila kupitia Date (saa za kifaa zisibadilishe siku)
const siku = d => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fmtDate(d);
};
const sign  = n => (Number(n) > 0 ? '+' : '') + Math.round(Number(n) || 0).toLocaleString();

// Aina zinazoonekana kwa wakala, kwa mpangilio wa matumizi
const MAIN = ['deposit', 'withdraw'];
const MORE = ['float_buy', 'float_sell', 'cash_in', 'cash_out'];
const ICONS = {
  deposit: '⬇️', withdraw: '⬆️', float_buy: '🔋', float_sell: '🔌',
  cash_in: '💰', cash_out: '🏧',
};

// ============================================================
// 💳 KULIPIA UWAKALA (Snippe)
//
// Mmiliki analipa mwenyewe bila kusubiri admin. Reference inaanza
// na WK-, kwa hiyo webhook inaiongeza kwenye uwakala PEKEE —
// usajili wa duka haubadiliki hata kidogo.
// ============================================================
function LipaUwakala({ compact }) {
  const { biz, user } = useApp();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(biz?.phone || '');
  const [hali, setHali] = useState(null);
  const [busy, setBusy] = useState(false);
  const [risiti, setRisiti] = useState(null);
  // Uwakala peke yake ni ghali kuliko wa nyongeza — hauna usajili
  // wa duka unaosaidia gharama.
  const aina = ainaYa(biz);
  const bei = beiYaUwakala(aina);

  const lipa = async () => {
    setBusy(true); setHali(null);
    try {
      const r = await fetch('/api/payments?action=wakala_pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: biz?.id, business_name: biz?.name,
          user_email: user?.email, phone, days: 30,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d?.success) { setHali({ bad: true, text: d?.error || 'Imeshindwa kuanzisha malipo.' }); return; }
      setHali({ bad: false, text: d.message, ref: d.reference });
      // Subiri webhook; kama imechelewa, uliza Snippe
      let n = 0;
      const piga = setInterval(async () => {
        n++;
        try {
          const q = await fetch(`/api/payments?action=wakala_pay_status&ref=${encodeURIComponent(d.reference)}`);
          const s2 = await q.json().catch(() => ({}));
          if (s2?.status === 'paid') {
            clearInterval(piga);
            if (!s2.risiti_no) {
              setHali({ bad: false, text: '✅ Malipo yamethibitishwa. Fungua upya ukurasa.' });
              setTimeout(() => window.location.reload(), 1800);
              return;
            }
            setHali(null);
            setRisiti(risitiKutoka({
              risiti_no: s2.risiti_no, amount: s2.amount ?? bei, days: s2.days ?? 30,
              status: 'paid', paid_at: new Date().toISOString(), inaisha: s2.inaisha,
              phone, business_name: biz?.name, provider: 'snippe',
              provider_ref: d.reference, aina: RISITI.uwakala,
            }, biz || {}));
          }
        } catch (_) {}
        if (n > 40) clearInterval(piga);
      }, 4000);
    } catch (e) {
      setHali({ bad: true, text: 'Mtandao haupatikani.' });
    } finally { setBusy(false); }
  };

  return <>
    <Btn onClick={() => setOpen(true)} style={compact ? {} : { marginTop: 4 }}>
      💳 Lipia uwakala — {fmtBei(bei)}
    </Btn>
    <Modal open={open} onClose={() => { setOpen(false); if (risiti) window.location.reload(); }} title={risiti ? 'Risiti ya malipo' : 'Lipia huduma ya uwakala'}>
      {risiti ? <div>
        <Risiti r={risiti} />
        <div className="dlr-hide" style={{ maxWidth: 680, margin: '16px auto 0' }}>
          <Btn onClick={() => window.location.reload()} style={{ width: '100%', padding: 14 }}>Endelea →</Btn>
          <div style={{ textAlign: 'center', fontSize: 12, color: C.pale, marginTop: 9 }}>Risiti hii imetumwa pia kwa SMS.</div>
        </div>
      </div> : <>
      <div style={{ background: C.soft, borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: C.dark }}>
        <b>{fmtBei(bei)} kwa mwezi mmoja.</b> {aina === AINA.uwakala
          ? <>Ukiongeza duka baadaye, vyote vinakuwa {fmtBei(BEI.zote)} — unaokoa {fmtBei(PUNGUZO)}.</>
          : <>Hii ni ya uwakala pekee — malipo ya duka ({fmtBei(BEI.duka)}) ni tofauti na hayaguswi.</>}
        {' '}Siku zitaongezwa juu ya ulizonazo, kwa hiyo hupotezi chochote ukilipa mapema.
      </div>
      <Input label="Namba ya kulipia (M-Pesa, Airtel, Mixx, Halopesa)" value={phone}
        onChange={e => setPhone(e.target.value)} placeholder="07.." inputMode="tel" />
      {hali && <div style={{
        borderRadius: 12, padding: '11px 13px', marginBottom: 12, fontSize: 13,
        background: hali.bad ? C.blush : C.soft, color: hali.bad ? '#7F2318' : C.dark,
      }}>{hali.text}</div>}
      <Btn onClick={lipa} disabled={busy || !phone} style={{ width: '100%', padding: '14px' }}>
        {busy ? 'Inaanzisha...' : `Lipa ${fmtBei(bei)}`}
      </Btn>
      <div style={{ fontSize: 11, color: C.pale, textAlign: 'center', marginTop: 8 }}>
        Utapokea ombi la PIN kwenye simu yako.
      </div>
      </>}
    </Modal>
  </>;
}

// ============================================================
// Ujumbe wa hali — jedwali halipo, au usajili umeisha
// ============================================================
function Hali({ wk }) {
  if (!wk.ready) return <div className="card" style={{ padding: 22, textAlign: 'center' }}>
    <div style={{ fontSize: 40 }}>🧱</div>
    <div style={{ fontWeight: 900, color: C.green, marginTop: 6 }}>Huduma haijakamilika</div>
    <p style={{ fontSize: 13, color: C.muted, maxWidth: 420, margin: '6px auto 0' }}>
      Jedwali la uwakala halipo kwenye database bado. Mjulishe msimamizi
      aendeshe <b>wakala-migration.sql</b>. Hakuna data iliyopotea.
    </p>
  </div>;

  if (wk.access.neverPaid) return <div className="card" style={{ padding: 22, textAlign: 'center', background: C.warm }}>
    <div style={{ fontSize: 40 }}>💳</div>
    <div style={{ fontWeight: 900, color: C.green, marginTop: 6 }}>Lipia huduma ya uwakala</div>
    <p style={{ fontSize: 13, color: C.muted, maxWidth: 430, margin: '6px auto 10px' }}>
      Huduma imewashwa kwa akaunti yako lakini malipo hayajakamilika.
      Gharama ni <b>{fmtBei(beiYaUwakala(wk.aina))} kwa mwezi</b>.
    </p>
    <LipaUwakala compact />
  </div>;

  if (wk.access.expired) return <div style={{
    background: C.blush, border: `1px solid ${C.red}33`, borderRadius: 14,
    padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#7F2318',
  }}>
    <b>⏰ Usajili wa uwakala umeisha.</b> Hauwezi kuandika muamala mpya,
    lakini <b>unaweza kufunga siku kwa siku {wk.access.graceLeft} zilizobaki</b> —
    pesa isibaki bila kuhesabiwa.
    <div style={{ marginTop: 10 }}><LipaUwakala compact /></div>
  </div>;

  if (wk.access.warn) return <div style={{
    background: C.warm, border: `1px solid ${C.gold}55`, borderRadius: 14,
    padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#7A5B00',
  }}>
    <b>⚠️ Zimebaki siku {wk.access.daysLeft}</b> za usajili wa uwakala.
    <div style={{ marginTop: 10 }}><LipaUwakala compact /></div>
  </div>;

  return null;
}

// ============================================================
// 📲 REKODI — hapa wakala anatumia muda wake wote
// ============================================================
export function WakalaRecordPage() {
  const { user } = useApp();
  const wk = useWakala();
  const [type, setType] = useState('deposit');
  const [showMore, setShowMore] = useState(false);
  const [f, setF] = useState({ amount: '', commission: '', line_id: '', customer: '', phone: '', note: '' });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [undo, setUndo] = useState(null);
  // Uthibitisho wa jina (Abliner)
  const [jina, setJina] = useState({ hali: 'tupu' });  // tupu|inatafuta|sawa|kosa
  const tmr = useRef(null);

  const def = TX[type] || {};
  const lineId = f.line_id || wk.lines[0]?.id || '';
  const todayTx = wk.txOn(wk.today);
  const closed = wk.closedOn(wk.today);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Namba ikikamilika, tafuta jina mara moja. Mtumiaji asisubiri
  // kubonyeza kitu — kuthibitisha lazima kuwe rahisi kuliko kuruka.
  useEffect(() => {
    clearTimeout(tmr.current);
    if (!nambaKamili(f.phone)) { setJina({ hali: 'tupu' }); return; }
    setJina({ hali: 'inatafuta' });
    tmr.current = setTimeout(async () => {
      const r = await wk.lookupJina(f.phone);
      if (r.ok) {
        setJina({ hali: 'sawa', name: r.name, network: r.network });
        setF(p => ({ ...p, customer: p.customer || r.name }));
      } else {
        setJina({ hali: 'kosa', error: r.error });
      }
    }, 650);
    return () => clearTimeout(tmr.current);
  }, [f.phone, wk.lookupJina]);

  // Mtandao wa namba dhidi ya laini iliyochaguliwa
  const laini = wk.lines.find(l => l.id === lineId);
  const oanisho = jina.hali === 'sawa'
    ? mtandaoUnalingana(jina.network, laini?.name) : { known: false, sawa: true };

  const submit = async () => {
    setMsg(null); setSaving(true);
    const r = await wk.addTx({ ...f, type, line_id: def.line ? lineId : null,
      jina_halisi: jina.hali === 'sawa' ? jina.name : null,
      mtandao: jina.hali === 'sawa' ? jina.network : null,
      jina_thibitishwa: jina.hali === 'sawa' });
    setSaving(false);
    if (!r.ok) { setMsg({ bad: true, text: r.error }); return; }
    setMsg({
      bad: false,
      text: r.duplicate ? 'Muamala huu ulishaingia — hakuna marudio.'
        : `${txLabel(type)} ${money(f.amount)} imeandikwa.`,
    });
    setF({ amount: '', commission: '', line_id: f.line_id, customer: '', phone: '', note: '' });
    setJina({ hali: 'tupu' });
  };

  if (!wk.ready || wk.access.neverPaid) return <div><PageHead icon="📲" title="Rekodi ya Uwakala" /><Hali wk={wk} /></div>;

  return <div>
    <PageHead icon="📲" title="Rekodi ya Uwakala" sub="Andika kila muamala papo hapo — ndiyo inayolinda pesa yako">
      <Badge color={C.green}>{todayTx.length} leo</Badge>
    </PageHead>

    <Hali wk={wk} />
    <UkaguziWazi wk={wk} />

    {closed && <div style={{ background: C.soft, borderRadius: 14, padding: '11px 14px', marginBottom: 14, fontSize: 13, color: C.dark }}>
      🔒 <b>Siku ya leo imefungwa tayari.</b> Muamala mpya hauwezi kuingia. Mmiliki
      anaweza kuifungua kutoka kwenye Ripoti kama kuna kosa.
    </div>}

    {/* ---------- Salio la sasa ---------- */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 }}>
      <SumCard label="Taslimu kasheni" value={money(wk.balances.cash)} color={wk.balances.cash < 0 ? C.red : C.green} />
      {wk.balances.lines.map(l => <SumCard key={l.id} label={`Float ${l.name}`} value={money(l.float)} color={l.float < 0 ? C.red : C.dark} />)}
      <SumCard label="Kamisheni leo" value={money(wk.balances.commission)} color={C.gold} />
    </div>

    {wk.lines.length === 0 && <div className="card" style={{ padding: 18, textAlign: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 32 }}>🔌</div>
      <div style={{ fontWeight: 800, color: C.green }}>Hakuna laini ya float</div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '5px 0 0' }}>
        {user?.role === 'office'
          ? 'Nenda "Laini za Float" uweke M-Pesa, Airtel Money au mtandao mwingine.'
          : 'Mwambie mmiliki aweke laini za mitandao kwanza.'}
      </p>
    </div>}

    {/* ---------- Fomu ---------- */}
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      {/* Aina */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {MAIN.map(t => <button key={t} onClick={() => setType(t)} style={{
          flex: 1, padding: '15px 8px', borderRadius: 16, cursor: 'pointer',
          border: type === t ? `2px solid ${C.green}` : `1.5px solid ${C.line}`,
          background: type === t ? C.soft : '#fff',
          color: type === t ? C.dark : C.muted, fontWeight: 900, fontSize: 15,
        }}>
          <div style={{ fontSize: 22 }}>{ICONS[t]}</div>
          {TX[t].label}
        </button>)}
      </div>

      <button onClick={() => setShowMore(s => !s)} style={{
        background: 'none', border: 'none', color: C.green, fontWeight: 700,
        fontSize: 12, cursor: 'pointer', padding: '0 0 10px',
      }}>{showMore ? '▴ Ficha nyingine' : '▾ Float na mtaji'}</button>

      {showMore && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 7, marginBottom: 12 }}>
        {MORE.map(t => <button key={t} onClick={() => setType(t)} style={{
          padding: '10px 6px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700,
          border: type === t ? `2px solid ${C.green}` : `1.5px solid ${C.line}`,
          background: type === t ? C.soft : '#fff', color: type === t ? C.dark : C.muted,
        }}>{ICONS[t]} {TX[t].label}</button>)}
      </div>}

      {/* Laini */}
      {def.line && wk.lines.length > 0 && <Sel label="Laini" value={lineId} onChange={e => set('line_id', e.target.value)}
        options={wk.lines.map(l => ({ value: l.id, label: `${l.name} · float ${money(wk.balances.lines.find(x => x.id === l.id)?.float || 0)}` }))} />}

      <Input label="Kiasi (TZS)" type="number" inputMode="numeric" value={f.amount}
        onChange={e => set('amount', e.target.value)} placeholder="0"
        style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', padding: '14px' }} />

      {def.earns && <>
        <Input label="Kamisheni uliyopata (TZS)" type="number" inputMode="numeric" value={f.commission}
          onChange={e => set('commission', e.target.value)} placeholder="0" />
        <div style={{ fontSize: 11, color: C.pale, margin: '-6px 0 12px' }}>
          Kamisheni haiongezi taslimu wala float sasa — mtandao hulipa baadaye.
          Mmiliki anaiona kwenye jumla ya mapato.
        </div>
      </>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input label="Namba ya mteja" value={f.phone} onChange={e => set('phone', e.target.value)}
          placeholder="07.." inputMode="tel" />
        <Input label="Jina" value={f.customer} onChange={e => set('customer', e.target.value)} />
      </div>

      {/* ---- Uthibitisho wa jina: kinga pekee KABLA pesa haijatoka ---- */}
      {jina.hali !== 'tupu' && <div style={{
        borderRadius: 12, padding: '10px 13px', marginBottom: 10, fontSize: 12.5,
        background: jina.hali === 'sawa' ? (oanisho.known && !oanisho.sawa ? C.blush : C.soft) : '#F6F8F7',
        border: `1px solid ${jina.hali === 'sawa' && oanisho.known && !oanisho.sawa ? C.red + '44' : C.line}`,
      }}>
        {jina.hali === 'inatafuta' && <span style={{ color: C.muted }}>⏳ Inatafuta jina...</span>}
        {jina.hali === 'kosa' && <span style={{ color: C.muted }}>
          ℹ️ {jina.error}. Andika jina mwenyewe — muamala utaendelea, lakini hautakuwa umethibitishwa.
        </span>}
        {jina.hali === 'sawa' && <>
          <div style={{ fontWeight: 900, color: C.dark, fontSize: 14 }}>✅ {jina.name}</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            {mtandaoJina(oanisho.namba || jina.network)} · jina limethibitishwa na mtandao
          </div>
          {oanisho.known && !oanisho.sawa && <div style={{
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.red}33`,
            color: '#7F2318', fontWeight: 700,
          }}>
            ⚠️ Namba hii ni <b>{mtandaoJina(oanisho.namba)}</b> lakini umechagua laini ya{' '}
            <b>{laini?.name}</b>. Hakikisha kabla ya kutuma — pesa ikienda vibaya hairudi.
          </div>}
        </>}
      </div>}

      {/* Athari — wakala aone kinachotokea kabla ya kubonyeza */}
      {Number(f.amount) > 0 && <div style={{
        background: C.soft, borderRadius: 12, padding: '10px 13px', marginBottom: 12,
        fontSize: 12.5, color: C.dark, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        <span>Taslimu: <b>{sign(def.cash * Number(f.amount))}</b></span>
        {def.line && <span>Float: <b>{sign(def.float * Number(f.amount))}</b></span>}
      </div>}

      {msg && <div style={{
        borderRadius: 12, padding: '10px 13px', marginBottom: 12, fontSize: 13, fontWeight: 600,
        background: msg.bad ? C.blush : C.soft, color: msg.bad ? '#7F2318' : C.dark,
      }}>{msg.bad ? '⚠️ ' : '✅ '}{msg.text}</div>}

      <Btn onClick={submit} disabled={saving || !Number(f.amount) || !!closed || !wk.access.canRecord}
        style={{ width: '100%', padding: '15px', fontSize: 16, borderRadius: 14 }}>
        {saving ? 'Inaandika...' : `${ICONS[type]} Andika ${TX[type]?.label || ''}`}
      </Btn>
    </div>

    {/* ---------- Miamala ya leo ---------- */}
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 10 }}>🧾 Miamala ya leo</div>
      {todayTx.length === 0 ? <Empty icon="🪙" text="Hakuna muamala leo" /> : <TxList
        txs={todayTx} lines={wk.lines}
        onReverse={wk.access.canRecord && !closed ? setUndo : null}
      />}
    </div>

    <UndoModal tx={undo} onClose={() => setUndo(null)} wk={wk} />
  </div>;
}

// ============================================================
// Orodha ya miamala
// ============================================================
function TxList({ txs, lines, onReverse }) {
  const nameOf = id => lines.find(l => l.id === id)?.name || '—';
  const reversedIds = new Set(txs.filter(t => t.reverses).map(t => t.reverses));

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
    {txs.map(t => {
      const rev = !!t.reverses;
      const gone = reversedIds.has(t.id);
      return <div key={t.id} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderRadius: 12, background: rev ? C.blush : gone ? '#F6F8F7' : '#fff',
        border: `1px solid ${rev ? C.red + '33' : C.line}`,
        opacity: gone ? .6 : 1,
      }}>
        <div style={{ fontSize: 20 }}>{rev ? '↩️' : ICONS[t.type]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: C.ink, textDecoration: gone ? 'line-through' : 'none' }}>
            {rev ? 'Marekebisho: ' : ''}{txLabel(t.type)} · {money(t.amount)}
          </div>
          <div style={{ fontSize: 11, color: C.pale }}>
            {t.line_id ? nameOf(t.line_id) + ' · ' : ''}
            {new Date(t.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            {t.customer ? ' · ' + t.customer : ''}
            {Number(t.commission) > 0 ? ` · kamisheni ${money(t.commission)}` : ''}
          </div>
        </div>
        {gone && <Badge color={C.pale}>imerekebishwa</Badge>}
        {onReverse && !rev && !gone && <button onClick={() => onReverse(t)} title="Rekebisha" style={{
          background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 10,
          padding: '6px 9px', cursor: 'pointer', fontSize: 12, color: C.muted, fontWeight: 700,
        }}>↩️</button>}
      </div>;
    })}
  </div>;
}

function UndoModal({ tx, onClose, wk }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!tx) return null;
  return <Modal open onClose={onClose} title="Rekebisha muamala">
    <div style={{ background: C.warm, borderRadius: 12, padding: '11px 13px', fontSize: 12.5, color: '#7A5B00', marginBottom: 14 }}>
      Muamala <b>haufutwi</b>. Mfumo unaandika <b>marekebisho</b> yanayogeuza
      muamala huu, na vyote viwili vinabaki vinaonekana kwa mmiliki.
      Muamala mmoja unarekebishwa <b>mara moja pekee</b>.
    </div>
    <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 12 }}>
      {ICONS[tx.type]} {txLabel(tx.type)} · {money(tx.amount)}
    </div>
    <Area label="Sababu (hiari)" value={note} onChange={e => setNote(e.target.value)} placeholder="Mfano: niliandika kiasi kibaya" />
    {err && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 10 }}>⚠️ {err}</div>}
    <div style={{ display: 'flex', gap: 8 }}>
      <Btn v="ghost" onClick={onClose} style={{ flex: 1 }}>Acha</Btn>
      <Btn v="danger" style={{ flex: 1 }} disabled={busy} onClick={async () => {
        setBusy(true); setErr('');
        const r = await wk.reverseTx(tx, note);
        setBusy(false);
        if (r.ok) onClose(); else setErr(r.error);
      }}>{busy ? 'Inaandika...' : 'Rekebisha'}</Btn>
    </div>
  </Modal>;
}

// ============================================================
// 🔍 UKAGUZI WA GHAFLA
//
// Wafanyakazi wa maduka tofauti wanaweza kukopeshana pesa wakati
// wa ukaguzi uliopangwa ili tofauti isionekane. Kinga pekee ni
// ukaguzi wasioujua unakuja — kwa hiyo hauwezi kufutwa wala
// kuahirishwa, na muda unaotumiwa unarekodiwa.
// ============================================================
function UkaguziWazi({ wk }) {
  const u = wk.ukaguziWazi;
  const [counted, setCounted] = useState({});
  const [cash, setCash] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [salio, setSalio] = useState(0);

  // Muda unaopungua — wakala aone kwamba saa inakimbia
  useEffect(() => {
    if (!u) return;
    const piga = () => setSalio(Math.max(0, Math.round((new Date(u.deadline) - new Date()) / 1000)));
    piga();
    const t = setInterval(piga, 1000);
    return () => clearInterval(t);
  }, [u]);

  if (!u) return null;
  const tayari = wk.lines.every(l => counted[l.id] !== undefined && counted[l.id] !== '') && cash !== '';
  const dk = Math.floor(salio / 60), sek = salio % 60;

  return <div style={{
    background: '#FFF3CD', border: `2px solid ${C.gold}`, borderRadius: 16,
    padding: '16px', marginBottom: 14,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 16, color: '#7A5B00' }}>🔍 UKAGUZI WA GHAFLA</div>
        <div style={{ fontSize: 12.5, color: '#7A5B00', marginTop: 3 }}>
          Mmiliki ameomba uhesabu <b>sasa hivi</b>. Piga <b>*150*00#</b> uone float halisi,
          na uhesabu taslimu kwa mkono.
        </div>
      </div>
      <span style={{
        background: salio < 120 ? C.red : C.gold, color: '#fff', padding: '7px 13px',
        borderRadius: 20, fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap',
      }}>{dk}:{String(sek).padStart(2, '0')}</span>
    </div>

    <div style={{ marginTop: 12 }}>
      {wk.lines.map(l => <Input key={l.id} label={`Float halisi — ${l.name}`} type="number"
        inputMode="numeric" value={counted[l.id] ?? ''}
        onChange={e => setCounted(p => ({ ...p, [l.id]: e.target.value }))} />)}
      <Input label="Taslimu halisi kasheni" type="number" inputMode="numeric" value={cash}
        onChange={e => setCash(e.target.value)} placeholder="0" />
    </div>

    {err && <div style={{ background: C.blush, borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: '#7F2318', marginBottom: 10 }}>⚠️ {err}</div>}

    <Btn disabled={busy || !tayari} onClick={async () => {
      setBusy(true); setErr('');
      const body = {};
      wk.lines.forEach(l => { body[l.id] = Number(counted[l.id]) || 0; });
      const r = await wk.jibuUkaguzi({ id: u.id, counted: body, countedCash: cash });
      setBusy(false);
      if (!r.ok) setErr(r.error); else { setCounted({}); setCash(''); }
    }} style={{ width: '100%', padding: '13px' }}>
      {busy ? 'Inatuma...' : '🔍 Tuma hesabu yangu'}
    </Btn>
    {salio === 0 && <div style={{ fontSize: 11.5, color: '#7F2318', textAlign: 'center', marginTop: 7 }}>
      Muda umeisha. Tuma hata hivyo — kuchelewa kunarekodiwa, lakini hesabu inahitajika.
    </div>}
  </div>;
}

// Matokeo ya ukaguzi mmoja, kwa mmiliki
function UkaguziKadi({ c, lines, threshold }) {
  const nameOf = id => lines.find(l => l.id === id)?.name || 'Laini';
  const jumla = Math.abs(Number(c.variance_cash) || 0) + Math.abs(Number(c.variance_float) || 0);
  const st = varianceState(jumla, threshold);
  const sawa = st === 'sawa' || st === 'ndogo';
  return <div style={{
    padding: '11px 13px', borderRadius: 12, marginBottom: 7,
    background: c.status === 'pending' ? C.warm : sawa ? '#fff' : C.blush,
    border: `1px solid ${C.line}`,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 13 }}>
          {c.status === 'pending' ? '⏳ Inasubiri majibu' : `🔍 ${siku(c.day)}`}
        </div>
        <div style={{ fontSize: 11, color: C.pale }}>
          {new Date(c.requested_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          {c.answered_at ? ` · amejibu baada ya dakika ${Number(c.dakika).toFixed(0)}` : ''}
          {c.status === 'expired' && c.answered_at ? ' · amechelewa' : ''}
        </div>
      </div>
      {c.answered_at && <Badge color={sawa ? C.green : C.red}>
        {sawa ? 'Sawa' : money(jumla)}
      </Badge>}
    </div>
    {c.answered_at && !sawa && <div style={{ marginTop: 8, fontSize: 12, color: '#7F2318' }}>
      Taslimu {sign(c.variance_cash)}
      {Object.entries(c.lines || {}).map(([id, d]) => Number(d.variance)
        ? ` · ${nameOf(id)} ${sign(d.variance)}` : '').join('')}
    </div>}
  </div>;
}

// ============================================================
// 🔒 FUNGA SIKU — upatanisho
//
// Mpangilio ni wa makusudi: wakala anaandika alichohesabu KWANZA,
// kisha anabonyeza. Jibu linaonekana BAADAYE. Akiona jibu kwanza
// atalinakili, na upatanisho unakuwa mapambo tu.
// ============================================================
export function WakalaClosePage() {
  const wk = useWakala();
  const [day, setDay] = useState(localDateStr(new Date()));
  const [counted, setCounted] = useState({});
  const [cash, setCash] = useState('');
  const [note, setNote] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const closed = wk.closedOn(day);
  const dayTx = wk.txOn(day);
  const allIn = wk.lines.every(l => counted[l.id] !== undefined && counted[l.id] !== '') && cash !== '';

  const submit = async () => {
    setBusy(true); setErr('');
    const body = {};
    wk.lines.forEach(l => { body[l.id] = Number(counted[l.id]) || 0; });
    const r = await wk.closeDay({ day, counted: body, countedCash: cash, note });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setRes(r.day);
  };

  if (!wk.ready || wk.access.neverPaid) return <div><PageHead icon="🔒" title="Funga Siku" /><Hali wk={wk} /></div>;

  // Jibu baada ya kufunga
  if (res) return <div>
    <PageHead icon="✅" title="Siku imefungwa" sub={siku(day)} />
    <Matokeo row={res} lines={wk.lines} threshold={wk.cfg.threshold} />
    <Btn v="ghost" onClick={() => { setRes(null); setCounted({}); setCash(''); setNote(''); }} style={{ marginTop: 12 }}>
      Funga siku nyingine
    </Btn>
  </div>;

  return <div>
    <PageHead icon="🔒" title="Funga Siku" sub="Hesabu float na taslimu halisi, kisha andika hapa" />
    <Hali wk={wk} />

    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <Input label="Tarehe" type="date" value={day} max={localDateStr(new Date())}
        onChange={e => { setDay(e.target.value); setCounted({}); setCash(''); }} />
      <div style={{ fontSize: 12.5, color: C.muted }}>
        Miamala ya siku hii: <b>{dayTx.length}</b>
      </div>
    </div>

    {closed ? <div className="card" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 10 }}>🔒 Siku hii imefungwa tayari</div>
      <Matokeo row={closed} lines={wk.lines} threshold={wk.cfg.threshold} />
    </div> : <>
      <div style={{
        background: C.soft, borderRadius: 14, padding: '12px 14px', marginBottom: 14,
        fontSize: 12.5, color: C.dark,
      }}>
        <b>Hatua:</b> piga <b>*150*00#</b> (au namba ya mtandao) uone float halisi ya kila laini,
        kisha hesabu taslimu iliyo kasheni kwa mkono. Andika namba <b>halisi</b>, si
        unazodhani. Mfumo unakuambia tofauti baada ya kubonyeza.
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 900, color: C.green, marginBottom: 12 }}>🔌 Float halisi kwa kila laini</div>
        {wk.lines.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Hakuna laini iliyowekwa.</div>}
        {wk.lines.map(l => <Input key={l.id} label={l.name} type="number" inputMode="numeric"
          value={counted[l.id] ?? ''} placeholder="Float iliyobaki"
          onChange={e => setCounted(p => ({ ...p, [l.id]: e.target.value }))} />)}

        <div style={{ height: 1, background: C.line, margin: '6px 0 16px' }} />

        <div style={{ fontWeight: 900, color: C.green, marginBottom: 12 }}>💵 Taslimu halisi kasheni</div>
        <Input label="Pesa uliyohesabu kwa mkono" type="number" inputMode="numeric" value={cash}
          onChange={e => setCash(e.target.value)} placeholder="0"
          style={{ fontSize: 20, fontWeight: 900, textAlign: 'center', padding: '13px' }} />

        <Area label="Maelezo (hiari)" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Mfano: nilitoa 20,000 kwa mmiliki saa nane" />

        {err && <div style={{ background: C.blush, borderRadius: 12, padding: '10px 13px', color: '#7F2318', fontSize: 13, marginBottom: 12 }}>⚠️ {err}</div>}

        <Btn onClick={submit} disabled={busy || !allIn || !wk.access.canClose}
          style={{ width: '100%', padding: '15px', fontSize: 16, borderRadius: 14 }}>
          {busy ? 'Inahesabu...' : '🔒 Funga siku na uone tofauti'}
        </Btn>
        {!allIn && <div style={{ fontSize: 11.5, color: C.pale, textAlign: 'center', marginTop: 8 }}>
          Jaza float ya kila laini na taslimu ili kuendelea.
        </div>}
      </div>
    </>}
  </div>;
}

// Matokeo ya upatanisho
function Matokeo({ row, lines, threshold }) {
  const nameOf = id => lines.find(l => l.id === id)?.name || 'Laini';
  const st = v => varianceState(v, threshold);
  const col = s => s === 'sawa' ? C.green : s === 'ndogo' ? C.gold : C.red;
  const label = { sawa: 'Sawa kabisa', ndogo: 'Tofauti ndogo', upungufu: 'UPUNGUFU', ziada: 'ZIADA' };
  const lineRows = Object.entries(row.lines || {});
  const vcash = Number(row.variance_cash) || 0;

  return <div>
    <HeroCard
      label="TOFAUTI YA SIKU"
      value={money(Math.abs(vcash) + Math.abs(Number(row.variance_float) || 0))}
      pill={siku(row.day)}
      sub={st(vcash) === 'sawa' && st(row.variance_float) === 'sawa'
        ? 'Hesabu zote zimekaa sawa' : 'Kuna tofauti — ona chini'}
    >
      <HeroStats items={[
        { l: 'MIAMALA', v: String(row.tx_count || 0) },
        { l: 'KAMISHENI', v: money(row.commission) },
        { l: 'TASLIMU', v: money(row.counted_cash) },
      ]} />
    </HeroCard>

    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 10 }}>💵 Taslimu</div>
      <Mstari l="Ilitakiwa kuwa" v={money(row.expected_cash)} />
      <Mstari l="Uliyohesabu" v={money(row.counted_cash)} />
      <Mstari l="Tofauti" v={sign(vcash)} color={col(st(vcash))} big
        tag={label[st(vcash)]} />
    </div>

    {lineRows.map(([id, d]) => {
      const v = Number(d.variance) || 0;
      return <div key={id} className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, color: C.green, marginBottom: 10 }}>🔌 {nameOf(id)}</div>
        <Mstari l="Ya asubuhi" v={money(d.opening)} />
        <Mstari l="Ilitakiwa kuwa" v={money(d.expected)} />
        <Mstari l="Uliyohesabu" v={money(d.counted)} />
        <Mstari l="Tofauti" v={sign(v)} color={col(st(v))} big tag={label[st(v)]} />
      </div>;
    })}

    {(st(vcash) === 'upungufu' || lineRows.some(([, d]) => st(d.variance) === 'upungufu')) &&
      <div style={{ background: C.blush, borderRadius: 14, padding: '12px 14px', fontSize: 12.5, color: '#7F2318' }}>
        <b>Upungufu unamaanisha nini:</b> pesa halisi ni chini ya rekodi. Mara nyingi
        ni muamala uliofanywa bila kuandikwa, au taslimu iliyotoka bila kurekodiwa.
        Pitia miamala ya siku hii na ulinganishe na ujumbe wa mtandao.
      </div>}

    {row.note && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 10 }}>📝 {row.note}</div>}
  </div>;
}

function Mstari({ l, v, color = C.ink, big, tag }) {
  return <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    padding: big ? '10px 0 0' : '5px 0', borderTop: big ? `1px solid ${C.line}` : 'none', marginTop: big ? 6 : 0,
  }}>
    <span style={{ fontSize: 12.5, color: C.muted, fontWeight: big ? 800 : 500 }}>{l}</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {tag && <Badge color={color}>{tag}</Badge>}
      <b style={{ fontSize: big ? 18 : 14, color, fontWeight: big ? 900 : 700 }}>{v}</b>
    </span>
  </div>;
}

// ============================================================
// 📊 DASHIBODI YA UWAKALA — mmiliki
// ============================================================
export function WakalaDash() {
  const wk = useWakala();
  const { employees, user } = useApp();
  const wakalaStaff = (employees || []).filter(doesWakala);
  const [ukaguziMsg, setUkaguziMsg] = useState(null);
  const [ukaguziBusy, setUkaguziBusy] = useState(false);
  const today = wk.today;
  const monthStart = today.slice(0, 7) + '-01';
  const weekStart = useMemo(() => {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - d.getDay());
    return localDateStr(d);
  }, [today]);

  const leo = wk.summary(today, today);
  const wiki = wk.summary(weekStart, today);
  const mwezi = wk.summary(monthStart, today);

  // Tofauti "kubwa" = iliyozidi kiwango alichoweka mmiliki
  const kubwa = v => {
    const s = varianceState(v, wk.cfg.threshold);
    return s !== 'sawa' && s !== 'ndogo';
  };
  const tofauti = wk.days
    .filter(d => kubwa(d.variance_cash) || kubwa(d.variance_float))
    .slice(0, 6);

  const hazijafungwa = useMemo(() => {
    const open = new Set(wk.txs.map(t => String(t.tx_date)));
    wk.days.forEach(d => open.delete(String(d.day)));
    open.delete(today);
    return [...open].sort().reverse();
  }, [wk.txs, wk.days, today]);

  if (!wk.ready || wk.access.neverPaid) return <div><PageHead icon="📊" title="Uwakala" /><Hali wk={wk} /></div>;

  return <div>
    <PageHead icon="📊" title="Uwakala" sub="Kutuma na kutoa pesa — hesabu kamili" />
    <Hali wk={wk} />
    {user?.role === 'office' && <TiketiBar />}

    <HeroCard
      tone={mwezi.hasara ? 'red' : undefined}
      label={mwezi.hasara ? 'HASARA MWEZI HUU' : 'FAIDA HALISI MWEZI HUU'}
      value={money(Math.abs(mwezi.faida))}
      pill={`${leo.idadi} miamala leo`}
      sub={mwezi.gharama > 0
        ? `Kamisheni ${money(mwezi.kamisheni)} kasoro gharama ${money(mwezi.gharama)}`
        : 'Hakuna gharama iliyoandikwa — faida hii bado si kamili'}>
      <HeroStats items={[
        { l: 'KAMISHENI LEO', v: money(leo.kamisheni) },
        { l: 'WIKI HII', v: money(wiki.kamisheni) },
        { l: 'TASLIMU KASHENI', v: money(wk.balances.cash), c: wk.balances.cash < 0 ? '#FFD9D2' : '#fff' },
      ]} />
    </HeroCard>

    {/* ---------- Ukaguzi wa ghafla ---------- */}
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ fontWeight: 900, color: C.green }}>🔍 Ukaguzi wa ghafla</div>
          <p style={{ fontSize: 12.5, color: C.muted, margin: '4px 0 0' }}>
            Wakala apate ujumbe wa kuhesabu <b>sasa hivi</b>, popote ulipo. Ukaguzi
            unaojulikana mapema hauna maana — wafanyakazi wanakopeshana ili tofauti
            isionekane.
          </p>
        </div>
        <Btn disabled={ukaguziBusy || !!wk.ukaguziWazi} onClick={async () => {
          setUkaguziBusy(true); setUkaguziMsg(null);
          const r = await wk.ombaUkaguzi(15);
          setUkaguziBusy(false);
          setUkaguziMsg(r.ok
            ? { ok: true, text: 'Ukaguzi umeombwa. Wakala amepata ujumbe.' }
            : { ok: false, text: r.error });
        }}>{ukaguziBusy ? 'Inatuma...' : wk.ukaguziWazi ? 'Unasubiri majibu' : '🔍 Omba ukaguzi sasa'}</Btn>
      </div>

      {ukaguziMsg && <div style={{
        marginTop: 10, borderRadius: 10, padding: '9px 12px', fontSize: 12.5,
        background: ukaguziMsg.ok ? C.soft : C.blush, color: ukaguziMsg.ok ? C.dark : '#7F2318',
      }}>{ukaguziMsg.ok ? '✅ ' : '⚠️ '}{ukaguziMsg.text}</div>}

      {(wk.checks || []).length > 0 && <div style={{ marginTop: 12 }}>
        {(wk.checks || []).slice(0, 5).map(c =>
          <UkaguziKadi key={c.id} c={c} lines={wk.lines} threshold={wk.cfg.threshold} />)}
      </div>}
    </div>

    {/* ---------- Kiwango cha uthibitisho wa majina ---------- */}
    {(() => {
      const u = mwezi.uthibitisho, p = wiki.uthibitisho;
      const h = wk.uthibitishoHali(p, u);
      if (!u || u.idadi < 5) return null;
      return <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontWeight: 900, color: C.green }}>✅ Majina yaliyothibitishwa</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: h.onyo ? C.red : C.green }}>
            {u.asilimia}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
          <div style={{ width: (u.asilimia || 0) + '%', height: '100%', borderRadius: 4,
            background: h.onyo ? C.red : C.green }} />
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>
          Miamala {u.thibitishwa} kati ya {u.idadi} mwezi huu. Kuthibitisha jina ni bure —
          hakuna sababu ya kuruka.
        </div>
        {h.onyo && <div style={{
          marginTop: 10, background: C.blush, borderRadius: 10, padding: '9px 12px',
          fontSize: 12.5, color: '#7F2318',
        }}>
          {h.hali === 'kushuka'
            ? <>⚠️ Kiwango kimeshuka kwa pointi {h.tofauti} wiki hii. Muulize wakala kwa nini ameacha kuandika namba.</>
            : <>⚠️ Zaidi ya theluthi ya miamala haijathibitishwa. Hii ni hatari ya pesa kwenda namba isiyo sahihi.</>}
        </div>}
      </div>;
    })()}

    {/* Gharama hazijaandikwa — faida inayoonekana si ya kweli */}
    {mwezi.gharama === 0 && mwezi.kamisheni > 0 && <div style={{
      background: C.warm, border: `1px solid ${C.gold}55`, borderRadius: 14,
      padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: '#7A5B00',
    }}>
      <b>Hujaandika gharama yoyote mwezi huu.</b> Kamisheni si faida — kodi, umeme,
      bando, usafiri na mshahara vinatoka hapo hapo. Nenda <b>Gharama za Uwakala</b>
      uziandike, uone unachobakiwa nacho kweli.
    </div>}

    {/* Hakuna mfanyakazi aliyepangiwa uwakala */}
    {wakalaStaff.length === 0 && (employees || []).length > 0 && <div style={{
      background: C.soft, borderRadius: 14, padding: '12px 14px', marginBottom: 14,
      fontSize: 12.5, color: C.dark,
    }}>
      <b>Hakuna mfanyakazi aliyepangiwa uwakala.</b> Kwa sasa wewe pekee ndiye
      unaweza kurekodi miamala. Nenda <b>Wafanyakazi</b>, bofya <b>Badilisha</b>
      kwenye "Kazi", umchague mtu. Si lazima afanye duka na uwakala kwa pamoja —
      unaweza kumpa uwakala pekee.
    </div>}

    {/* Onyo: siku hazijafungwa */}
    {hazijafungwa.length > 0 && <div style={{
      background: C.warm, border: `1px solid ${C.gold}55`, borderRadius: 14,
      padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#7A5B00',
    }}>
      <b>⚠️ Siku {hazijafungwa.length} hazijafungwa:</b> {hazijafungwa.slice(0, 5).map(siku).join(', ')}
      {hazijafungwa.length > 5 ? '...' : ''}. Siku isipofungwa, upotevu hauonekani.
    </div>}

    {/* Float ya kila laini */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 14 }}>
      {wk.balances.lines.map(l => <SumCard key={l.id} label={`🔌 ${l.name}`} value={money(l.float)}
        color={l.float <= 0 ? C.red : C.dark} hint={l.float <= 0 ? 'Float imeisha!' : `asubuhi ${money(l.opening)}`} />)}
      <SumCard label="💵 Taslimu" value={money(wk.balances.cash)} color={wk.balances.cash < 0 ? C.red : C.green}
        hint={wk.balances.cash < 0 ? 'Weka mtaji — hesabu haiwezekani' : null} />
    </div>

    {/* Hesabu kamili */}
    <div className="card" style={{ padding: 16, marginBottom: 14, overflowX: 'auto' }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 12 }}>🧮 Hesabu Kamili</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 330 }}>
        <thead><tr style={{ background: C.soft }}>
          {['', 'LEO', 'WIKI HII', 'MWEZI HUU'].map((h, i) => <th key={i} style={{
            padding: '8px 6px', textAlign: i ? 'right' : 'left', fontSize: 10,
            color: C.dark, fontWeight: 800, letterSpacing: .5,
          }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {[
            ['Kuweka (deposit)', 'kuweka'],
            ['Kutoa (withdraw)', 'kutoa'],
            ['Float iliyonunuliwa', 'floatNunuliwa'],
            ['Mtaji ulioingizwa', 'mtaji'],
            ['Kamisheni (mapato)', 'kamisheni'],
            ['Gharama', 'gharama'],
            ['— zilizotoka kasheni', 'gharamaTaslimu'],
            ['Idadi ya miamala', 'idadi'],
            ['Marekebisho', 'marejesho'],
          ].map(([l, k]) => <tr key={k} style={{ borderTop: `1px solid ${C.line}` }}>
            <td style={{ padding: '8px 6px', color: C.muted, fontWeight: 600, fontSize: 12 }}>{l}</td>
            {[leo, wiki, mwezi].map((p, i) => <td key={i} style={{
              padding: '8px 6px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap',
              color: k === 'kamisheni' ? C.gold
                   : k.startsWith('gharama') ? C.red
                   : k === 'marejesho' && p[k] ? C.red : C.ink,
            }}>{k === 'idadi' || k === 'marejesho' ? p[k] : num0(p[k])}</td>)}
          </tr>)}
          <tr style={{ borderTop: `2px solid ${C.green}`, background: C.soft }}>
            <td style={{ padding: '9px 6px', fontWeight: 900, color: C.dark, fontSize: 12 }}>FAIDA HALISI</td>
            {[leo, wiki, mwezi].map((p, i) => <td key={i} style={{
              padding: '9px 6px', textAlign: 'right', fontWeight: 900, whiteSpace: 'nowrap',
              color: p.hasara ? C.red : C.green,
            }}>{num0(p.faida)}</td>)}
          </tr>
          <tr style={{ background: C.soft }}>
            <td style={{ padding: '9px 6px', fontWeight: 900, color: C.dark, fontSize: 12 }}>Tofauti iliyokamatwa</td>
            {[leo, wiki, mwezi].map((p, i) => {
              const t = Math.abs(p.tofautiTaslimu) + Math.abs(p.tofautiFloat);
              return <td key={i} style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 900, whiteSpace: 'nowrap', color: t ? C.red : C.green }}>
                {t ? num0(t) : 'Sawa'}
              </td>;
            })}
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: C.pale, marginTop: 8 }}>
        Namba zote ni TZS. Kamisheni ni mapato yaliyopatikana — mitandao huilipa
        baadaye, kwa hiyo haiongezi taslimu papo hapo.
      </div>
    </div>

    {/* Tofauti zilizokamatwa */}
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 10 }}>🚨 Siku zenye tofauti</div>
      {tofauti.length === 0
        ? <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>Hakuna tofauti kubwa. Hesabu zinakaa sawa.</div>
        : tofauti.map(d => <div key={d.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12, background: C.blush, marginBottom: 7,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{siku(d.day)}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{d.tx_count} miamala</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 800 }}>Taslimu {sign(d.variance_cash)}</div>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 800 }}>Float {sign(d.variance_float)}</div>
          </div>
        </div>)}
    </div>
  </div>;
}

// ============================================================
// 🧾 RIPOTI YA UWAKALA
// ============================================================
export function WakalaReportPage() {
  const wk = useWakala();
  const [tab, setTab] = useState('siku');
  const [open, setOpen] = useState(null);
  const [from, setFrom] = useState(wk.today.slice(0, 8) + '01');
  const [to, setTo] = useState(wk.today);

  const inRange = d => String(d) >= String(from) && String(d) <= String(to);
  const days = wk.days.filter(d => inRange(d.day));
  const txs = wk.txs.filter(t => inRange(t.tx_date));
  const s = wk.summary(from, to);

  if (!wk.ready || wk.access.neverPaid) return <div><PageHead icon="🧾" title="Ripoti ya Uwakala" /><Hali wk={wk} /></div>;

  return <div>
    <PageHead icon="🧾" title="Ripoti ya Uwakala" sub={`${siku(from)} — ${siku(to)}`} />

    <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ flex: '1 1 140px' }}><Input label="Kutoka" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div style={{ flex: '1 1 140px' }}><Input label="Hadi" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 }}>
      <SumCard label="Kamisheni" value={money(s.kamisheni)} color={C.gold} />
      <SumCard label="Kuweka" value={money(s.kuweka)} color={C.green} hint={`${s.idadiKuweka} miamala`} />
      <SumCard label="Kutoa" value={money(s.kutoa)} color={C.dark} hint={`${s.idadiKutoa} miamala`} />
      <SumCard label="Gharama" value={money(s.gharama)} color={C.red} hint={`${s.idadiGharama} rekodi`} />
      <SumCard label={s.hasara ? 'Hasara' : 'Faida halisi'} value={money(Math.abs(s.faida))}
        color={s.hasara ? C.red : C.green} hint={s.kamisheni > 0 ? `${s.asilimia}% ya kamisheni` : null} />
      <SumCard label="Siku zilizofungwa" value={String(s.siku)} color={C.green} />
      <SumCard label="Tofauti" value={money(Math.abs(s.tofautiTaslimu) + Math.abs(s.tofautiFloat))}
        color={s.sikuZaTofauti ? C.red : C.green} hint={`siku ${s.sikuZaTofauti}`} />
    </div>

    <Tabs active={tab} onChange={setTab} tabs={[
      { id: 'siku', label: `📅 Siku (${days.length})` },
      { id: 'miamala', label: `🪙 Miamala (${txs.length})` },
    ]} />

    {tab === 'siku' ? <div className="card" style={{ padding: 16 }}>
      {days.length === 0 ? <Empty icon="📅" text="Hakuna siku iliyofungwa kipindi hiki" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {days.map(d => {
            const t = Math.abs(Number(d.variance_cash) || 0) + Math.abs(Number(d.variance_float) || 0);
            const bad = varianceState(t, wk.cfg.threshold);
            return <div key={d.id} onClick={() => setOpen(d)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              padding: '11px 13px', borderRadius: 12, cursor: 'pointer',
              background: bad === 'sawa' || bad === 'ndogo' ? '#fff' : C.blush,
              border: `1px solid ${C.line}`,
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5 }}>📅 {siku(d.day)}</div>
                <div style={{ fontSize: 11, color: C.pale }}>{d.tx_count} miamala · kamisheni {money(d.commission)}</div>
              </div>
              <Badge color={bad === 'sawa' || bad === 'ndogo' ? C.green : C.red}>
                {bad === 'sawa' ? 'Sawa' : bad === 'ndogo' ? 'Tofauti ndogo' : money(t)}
              </Badge>
            </div>;
          })}
        </div>}
    </div> : <div className="card" style={{ padding: 16 }}>
      {txs.length === 0 ? <Empty icon="🪙" text="Hakuna muamala kipindi hiki" />
        : <TxList txs={txs} lines={wk.lines} onReverse={null} />}
    </div>}

    <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Siku ya ${siku(open.day)}` : ''} wide>
      {open && <>
        <Matokeo row={open} lines={wk.lines} threshold={wk.cfg.threshold} />
        {wk.isOwner && <Btn v="danger" style={{ marginTop: 14 }} onClick={async () => {
          const r = await wk.reopenDay(open.id);
          if (r.ok) setOpen(null);
        }}>🔓 Fungua siku hii tena</Btn>}
      </>}
    </Modal>
  </div>;
}

// ============================================================
// ⚙️ LAINI ZA FLOAT — mmiliki
// ============================================================
export function WakalaLinesPage() {
  const wk = useWakala();
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [th, setTh] = useState('');
  const [cfg, setCfg] = useState({});
  const [arifaMsg, setArifaMsg] = useState(null);
  // Mipangilio ikishapakiwa, ijaze fomu mara moja
  useEffect(() => { setCfg(c => (c.__tayari ? c : { ...wk.cfg, __tayari: true })); }, [wk.cfg]);

  const save = async () => {
    setErr('');
    const r = await wk.saveLine(edit);
    if (r.ok) setEdit(null); else setErr(r.error);
  };

  if (!wk.ready) return <div><PageHead icon="⚙️" title="Laini za Float" /><Hali wk={wk} /></div>;

  return <div>
    <PageHead icon="⚙️" title="Laini za Float" sub="Mitandao unayotumia kutoa na kuweka pesa">
      <Btn onClick={() => setEdit({ name: '', opening_float: '', short_code: '' })}>{IC.plus} Ongeza laini</Btn>
    </PageHead>

    <div style={{ background: C.soft, borderRadius: 14, padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: C.dark }}>
      <b>Float ya asubuhi</b> inawekwa mara moja tu, mwanzo. Baada ya hapo mfumo
      unachukua ile uliyo<b>hesabu</b> siku iliyopita — ukweli ndio unaoendelea mbele,
      si unaotarajiwa.
    </div>

    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      {wk.lines.length === 0 ? <Empty icon="🔌" text="Hakuna laini. Ongeza M-Pesa, Airtel Money, Mix by Yas..." /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {wk.lines.map(l => <div key={l.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
            padding: '11px 13px', borderRadius: 12, background: '#fff', border: `1px solid ${C.line}`,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>🔌 {l.name}</div>
              <div style={{ fontSize: 11, color: C.pale }}>
                {l.short_code ? l.short_code + ' · ' : ''}float ya asubuhi {money(l.opening_float)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn v="ghost" onClick={() => setEdit(l)} style={{ padding: '7px 11px' }}>✏️</Btn>
              <Btn v="danger" onClick={() => wk.removeLine(l.id)} style={{ padding: '7px 11px' }}>🗑</Btn>
            </div>
          </div>)}
        </div>}
    </div>

    {/* Mipangilio */}
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 4 }}>🎚️ Kiwango cha onyo</div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 12px' }}>
        Tofauti ndogo kuliko hii haitatoa onyo. Weka kiasi unachoweza kuvumilia —
        wakala anaweza kuwa amesahau kuandika shilingi mia.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px' }}>
          <Input label="Kiwango (TZS)" type="number" value={th !== '' ? th : (wk.cfg.threshold ?? 1000)}
            onChange={e => setTh(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <Input label="Taslimu ya kuanzia (mara moja)" type="number"
            value={wk.cfg.cash_opening ?? 0}
            onChange={e => wk.saveCfg({ cash_opening: Number(e.target.value) || 0 })} />
        </div>
        <Btn onClick={() => { wk.saveCfg({ threshold: Number(th) || 0 }); setTh(''); }}
          style={{ marginBottom: 12 }}>Hifadhi</Btn>
      </div>
    </div>

    {/* ---------- Usajili ---------- */}
    <div className="card" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 4 }}>💳 Usajili wa uwakala</div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 10px' }}>
        {wk.access.daysLeft > 0
          ? <>Zimebaki <b>siku {wk.access.daysLeft}</b>. Ukilipa mapema, siku zinaongezwa juu ya ulizonazo.</>
          : 'Hujalipia bado. Huduma itafunguka mara malipo yatakapothibitishwa.'}
      </p>
      <LipaUwakala compact />
    </div>

    {/* ---------- Arifa kwa mmiliki (Beem SMS) ---------- */}
    <div className="card" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 4 }}>📨 Arifa za SMS</div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 12px' }}>
        Upotevu wa pesa ukigundulika saa tatu usiku, si lazima usubiri hadi asubuhi.
        Kila SMS inagharimu <b>TZS 23</b> kutoka bando lako, kwa hiyo chagua
        unachotaka kweli. Arifa moja ya aina moja kwa siku moja.
      </p>

      <Input label="Namba ya kupokea arifa" value={cfg.alert_phone ?? ''}
        onChange={e => setCfg(p => ({ ...p, alert_phone: e.target.value }))}
        placeholder="07.. (ikiachwa wazi, namba ya duka itatumika)" />

      {[
        ['arifa_tofauti', '🚨 Tofauti kwenye upatanisho', 'Siku ikifungwa na pesa isilingane na rekodi'],
        ['arifa_float', '🔋 Float inayoisha', 'Laini yoyote ikishuka chini ya kiwango ulichoweka'],
        ['arifa_mkubwa', '💰 Muamala mkubwa', 'Muamala unaozidi kiwango ulichoweka'],
        ['arifa_hitimisho', '📊 Hitimisho la siku', 'Kamisheni, gharama na faida siku ikifungwa'],
        ['arifa_asubuhi', '🌅 Uchambuzi wa asubuhi', 'Kila siku saa 1 asubuhi — miamala ya jana, float iliyobaki, na kama siku haikufungwa'],
      ].map(([k, jina, maelezo]) => <label key={k} style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
        borderRadius: 12, marginBottom: 7, cursor: 'pointer',
        background: cfg[k] ? C.soft : '#fff', border: `1.5px solid ${cfg[k] ? C.green : C.line}`,
      }}>
        <input type="checkbox" checked={!!cfg[k]} style={{ marginTop: 3, width: 17, height: 17 }}
          onChange={e => setCfg(p => ({ ...p, [k]: e.target.checked }))} />
        <span>
          <span style={{ fontWeight: 800, fontSize: 13, color: C.ink, display: 'block' }}>{jina}</span>
          <span style={{ fontSize: 11.5, color: C.muted }}>{maelezo}</span>
        </span>
      </label>)}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <Input label="Float ikishuka chini ya" type="number" value={cfg.float_chini ?? 50000}
          onChange={e => setCfg(p => ({ ...p, float_chini: e.target.value }))} />
        <Input label="Muamala unaozidi" type="number" value={cfg.kikomo_kikubwa ?? 500000}
          onChange={e => setCfg(p => ({ ...p, kikomo_kikubwa: e.target.value }))} />
      </div>

      <Btn onClick={async () => {
        const r = await wk.saveCfg({
          alert_phone: cfg.alert_phone || null,
          arifa_tofauti: !!cfg.arifa_tofauti, arifa_float: !!cfg.arifa_float,
          arifa_mkubwa: !!cfg.arifa_mkubwa, arifa_hitimisho: !!cfg.arifa_hitimisho,
          arifa_asubuhi: !!cfg.arifa_asubuhi,
          float_chini: Number(cfg.float_chini) || 0,
          kikomo_kikubwa: Number(cfg.kikomo_kikubwa) || 0,
        });
        setArifaMsg(r.ok ? { ok: true, text: 'Arifa zimehifadhiwa.' }
                         : { ok: false, text: r.error || 'Imeshindwa. Hakikisha wakala-6-gateway.sql imeendeshwa.' });
      }} style={{ width: '100%', marginTop: 12 }}>Hifadhi arifa</Btn>
      {arifaMsg && <div style={{
        marginTop: 10, borderRadius: 10, padding: '9px 12px', fontSize: 12.5,
        background: arifaMsg.ok ? C.soft : C.blush, color: arifaMsg.ok ? C.dark : '#7F2318',
      }}>{arifaMsg.ok ? '✅ ' : '⚠️ '}{arifaMsg.text}</div>}
    </div>

    <Modal open={!!edit} onClose={() => { setEdit(null); setErr(''); }} title={edit?.id ? 'Badilisha laini' : 'Laini mpya'}>
      {edit && <>
        <Input label="Jina la mtandao" value={edit.name} autoFocus
          onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} placeholder="M-Pesa" />
        <Input label="Namba ya wakala (hiari)" value={edit.short_code || ''}
          onChange={e => setEdit(p => ({ ...p, short_code: e.target.value }))} placeholder="123456" />
        <Input label="Float ya asubuhi (TZS)" type="number" value={edit.opening_float ?? ''}
          onChange={e => setEdit(p => ({ ...p, opening_float: e.target.value }))} placeholder="0" />
        {err && <div style={{ color: C.red, fontSize: 12.5, marginBottom: 10 }}>⚠️ {err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn v="ghost" onClick={() => setEdit(null)} style={{ flex: 1 }}>Acha</Btn>
          <Btn onClick={save} style={{ flex: 1 }}>Hifadhi</Btn>
        </div>
      </>}
    </Modal>
  </div>;
}

export default WakalaDash;


// ============================================================
// 💸 GHARAMA ZA UWAKALA
//
// Kamisheni si faida. Hapa mmiliki anaandika kodi, umeme, bando,
// mshahara, usafiri — kisha anaona FAIDA HALISI.
//
// Chanzo cha malipo ni muhimu kuliko inavyoonekana: gharama
// iliyolipwa kwa kasheni ya uwakala inapunguza kasheni. Ukiichagua
// vibaya, upatanisho wa siku utaonyesha upungufu usio wa kweli.
// ============================================================
export function WakalaGharamaPage() {
  const wk = useWakala();
  const { biz, employees } = useApp();
  const [chanzo, setChanzo] = useState('zote');
  const [f, setF] = useState({ aina: 'kodi', amount: '', chanzo: 'taslimu', maelezo: '', tarehe: localDateStr(new Date()) });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [futa, setFuta] = useState(null);
  const [kipindi, setKipindi] = useState('mwezi');

  const today = wk.today;
  const from = kipindi === 'leo' ? today
    : kipindi === 'wiki' ? (() => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - d.getDay()); return localDateStr(d); })()
    : today.slice(0, 8) + '01';
  const s = wk.summary(from, today);
  const zote = (wk.gharama || []).filter(g => String(g.tarehe) >= from && String(g.tarehe) <= today);
  const kwaChanzo = gharamaKwaChanzo(zote, biz?.owner_id);
  const orodha = chanzo === 'zote' ? zote
    : zote.filter(g => gharamaChanzo(g, biz?.owner_id) === chanzo);
  const jinaLa = id => (employees || []).find(e => e.id === id)?.name || 'Wakala';

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const submit = async () => {
    setMsg(null); setBusy(true);
    const r = await wk.addGharama(f);
    setBusy(false);
    if (!r.ok) return setMsg({ bad: true, text: r.error });
    setMsg({ bad: false, text: `${gharamaLabel(f.aina)} ${money(f.amount)} imeandikwa.` });
    setF(p => ({ ...p, amount: '', maelezo: '' }));
  };

  if (!wk.ready || wk.access.neverPaid) return <div><PageHead icon="💸" title="Gharama za Uwakala" /><Hali wk={wk} /></div>;

  const aina = Object.entries(s.gharamaKwaAina || {}).sort((a, b) => b[1] - a[1]);

  return <div>
    <PageHead icon="💸" title="Gharama za Uwakala"
      sub={wk.isOwner
        ? 'Kodi, umeme, bando, mshahara — ndizo zinazokula kamisheni'
        : 'Andika kila gharama ya kibandani — LUKU, usafiri, daftari'} />
    <Hali wk={wk} />

    {/* ---------- Faida halisi ---------- */}
    <HeroCard
      tone={s.hasara ? 'red' : undefined}
      label={s.hasara ? 'HASARA' : 'FAIDA HALISI'}
      value={money(Math.abs(s.faida))}
      pill={kipindi === 'leo' ? 'Leo' : kipindi === 'wiki' ? 'Wiki hii' : 'Mwezi huu'}
      sub={s.hasara
        ? 'Gharama zimezidi kamisheni kipindi hiki'
        : `Umebakiwa na ${s.asilimia}% ya kamisheni uliyopata`}
    >
      <HeroStats items={[
        { l: 'KAMISHENI', v: money(s.kamisheni) },
        { l: 'GHARAMA', v: money(s.gharama) },
        { l: 'ZA KASHENI', v: money(s.gharamaTaslimu) },
      ]} />
    </HeroCard>

    <Tabs active={kipindi} onChange={setKipindi} tabs={[
      { id: 'leo', label: 'Leo' }, { id: 'wiki', label: 'Wiki hii' }, { id: 'mwezi', label: 'Mwezi huu' },
    ]} />

    {/* ---------- Andika gharama ---------- */}
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 12 }}>➕ Andika gharama</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(104px,1fr))', gap: 7, marginBottom: 12 }}>
        {Object.entries(GHARAMA).map(([k, o]) => <button key={k} onClick={() => set('aina', k)} style={{
          padding: '9px 5px', borderRadius: 12, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, lineHeight: 1.3,
          border: f.aina === k ? `2px solid ${C.green}` : `1.5px solid ${C.line}`,
          background: f.aina === k ? C.soft : '#fff', color: f.aina === k ? C.dark : C.muted,
        }}><div style={{ fontSize: 17 }}>{o.icon}</div>{o.label}</button>)}
      </div>

      <Input label="Kiasi (TZS)" type="number" inputMode="numeric" value={f.amount}
        onChange={e => set('amount', e.target.value)} placeholder="0"
        style={{ fontSize: 21, fontWeight: 900, textAlign: 'center', padding: '13px' }} />

      {/* Chanzo — hapa ndipo upatanisho unapoamuliwa */}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Pesa imetoka wapi?</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        {Object.entries(CHANZO).map(([k, o]) => <button key={k} onClick={() => set('chanzo', k)} style={{
          flex: 1, padding: '11px 9px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
          border: f.chanzo === k ? `2px solid ${C.green}` : `1.5px solid ${C.line}`,
          background: f.chanzo === k ? C.soft : '#fff',
        }}>
          <div style={{ fontWeight: 800, fontSize: 12.5, color: f.chanzo === k ? C.dark : C.ink }}>
            {k === 'taslimu' ? '💵 ' : '🏦 '}{o.label}
          </div>
          <div style={{ fontSize: 10.5, color: C.pale, marginTop: 2 }}>{o.sub}</div>
        </button>)}
      </div>
      {f.chanzo === 'taslimu' && Number(f.amount) > 0 && <div style={{
        background: C.warm, borderRadius: 10, padding: '8px 11px', marginBottom: 12,
        fontSize: 11.5, color: '#7A5B00',
      }}>
        Kasheni itapungua kwa {money(f.amount)} — kutoka {money(wk.balances.cash)} hadi {money(wk.balances.cash - Number(f.amount))}.
      </div>}

      <Input label="Tarehe" type="date" value={f.tarehe} max={localDateStr(new Date())}
        onChange={e => set('tarehe', e.target.value)} />
      <Area label="Maelezo (hiari)" value={f.maelezo} onChange={e => set('maelezo', e.target.value)}
        placeholder="Mfano: LUKU ya mwezi Novemba" />

      {msg && <div style={{
        borderRadius: 12, padding: '10px 13px', marginBottom: 12, fontSize: 13, fontWeight: 600,
        background: msg.bad ? C.blush : C.soft, color: msg.bad ? '#7F2318' : C.dark,
      }}>{msg.bad ? '⚠️ ' : '✅ '}{msg.text}</div>}

      <Btn onClick={submit} disabled={busy || !Number(f.amount) || !wk.access.canRecord}
        style={{ width: '100%', padding: '14px', fontSize: 15.5, borderRadius: 14 }}>
        {busy ? 'Inaandika...' : `💸 Andika ${gharamaLabel(f.aina)}`}
      </Btn>
    </div>

    {/* ---------- Ofisini dhidi ya kibandani ---------- */}
    {wk.isOwner && kwaChanzo.jumla > 0 && <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 10 }}>🏢 Zilipotoka</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['ofisini', '🏢 Ofisini', kwaChanzo.ofisini, 'Kodi, leseni, mshahara — zako'],
          ['kibandani', '🏪 Kibandani', kwaChanzo.kibandani, 'Alizoandika wakala mwenyewe']]
          .map(([k, jina, d, maelezo]) => <button key={k}
            onClick={() => setChanzo(chanzo === k ? 'zote' : k)} style={{
            textAlign: 'left', padding: '12px 13px', borderRadius: 12, cursor: 'pointer',
            border: chanzo === k ? `2px solid ${C.green}` : `1.5px solid ${C.line}`,
            background: chanzo === k ? C.soft : '#fff',
          }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{jina}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: C.ink }}>{money(d.jumla)}</div>
            <div style={{ fontSize: 10.5, color: C.pale }}>{d.idadi} rekodi · {maelezo}</div>
          </button>)}
      </div>
      {chanzo !== 'zote' && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
        Orodha hapa chini inaonyesha za <b>{chanzo}</b> pekee. Bofya tena kuona zote.
      </div>}
    </div>}

    {/* ---------- Mchanganuo kwa aina ---------- */}
    {aina.length > 0 && <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 12 }}>📊 Gharama kwa aina</div>
      {aina.map(([k, v]) => {
        const pct = s.gharama > 0 ? Math.round((v / s.gharama) * 100) : 0;
        return <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: C.ink }}>{gharamaIcon(k)} {gharamaLabel(k)}</span>
            <span style={{ fontWeight: 800 }}>{money(v)} <span style={{ color: C.pale, fontWeight: 600 }}>{pct}%</span></span>
          </div>
          <div style={{ height: 7, background: C.line, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: C.green, borderRadius: 4 }} />
          </div>
        </div>;
      })}
      <div style={{ fontSize: 11, color: C.pale, marginTop: 8 }}>
        Aina inayoongoza ni <b>{gharamaLabel(s.gharamaKubwa)}</b>. Hapo ndipo pa kuanzia ukitaka kupunguza.
      </div>
    </div>}

    {/* ---------- Orodha ---------- */}
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, color: C.green, marginBottom: 10 }}>🧾 Gharama zilizoandikwa ({orodha.length})</div>
      {orodha.length === 0 ? <Empty icon="💸" text="Hakuna gharama kipindi hiki" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {orodha.map(g => <div key={g.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 12, background: '#fff', border: `1px solid ${C.line}`,
          }}>
            <div style={{ fontSize: 19 }}>{gharamaIcon(g.aina)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: C.ink }}>
                {gharamaLabel(g.aina)} · {money(g.amount)}
              </div>
              <div style={{ fontSize: 11, color: C.pale }}>
                {siku(g.tarehe)} · {g.chanzo === 'taslimu' ? '💵 kasheni' : '🏦 nje ya kasheni'}
                {' · '}{gharamaChanzo(g, biz?.owner_id) === OFISINI ? '🏢 ofisini' : '🏪 ' + jinaLa(g.recorded_by)}
                {g.maelezo ? ' · ' + g.maelezo : ''}
              </div>
            </div>
            {wk.isOwner && !wk.closedOn(g.tarehe) && <button onClick={() => setFuta(g)} title="Futa" style={{
              background: '#fff', border: `1.5px solid ${C.line}`, borderRadius: 10,
              padding: '6px 9px', cursor: 'pointer', fontSize: 12,
            }}>🗑</button>}
          </div>)}
        </div>}
    </div>

    <Modal open={!!futa} onClose={() => setFuta(null)} title="Futa gharama">
      {futa && <>
        <div style={{ background: C.warm, borderRadius: 12, padding: '11px 13px', fontSize: 12.5, color: '#7A5B00', marginBottom: 14 }}>
          {futa.chanzo === 'taslimu'
            ? <>Gharama hii ilipunguza kasheni. Ukiifuta, <b>kasheni itarudi</b> kwa {money(futa.amount)}.</>
            : <>Gharama hii haikugusa kasheni, kwa hiyo kufuta hakubadilishi salio.</>}
        </div>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>
          {gharamaIcon(futa.aina)} {gharamaLabel(futa.aina)} · {money(futa.amount)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn v="ghost" onClick={() => setFuta(null)} style={{ flex: 1 }}>Acha</Btn>
          <Btn v="danger" style={{ flex: 1 }} onClick={async () => {
            const r = await wk.delGharama(futa.id);
            if (!r.ok) return alert('⚠️ ' + r.error);
            setFuta(null);
          }}>Futa</Btn>
        </div>
      </>}
    </Modal>
  </div>;
}
