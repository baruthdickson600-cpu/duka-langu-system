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
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import useWakala from '../../hooks/useWakala';
import { IC, Btn, Modal, Input, Sel, Area, Badge, Empty, Tabs } from '../../components/UI';
import { PageHead, SumCard, HeroCard, HeroStats } from '../../components/Page';
import { fmtMoney, localDateStr, fmtDate } from '../../utils/helpers';
import { TX, txLabel, varianceState } from '../../utils/wakala';

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
      Gharama ni <b>TZS 13,000 kwa mwezi</b>, tofauti na malipo ya duka.
    </p>
    <Btn onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'notifications' }))}>
      Jinsi ya kulipa
    </Btn>
  </div>;

  if (wk.access.expired) return <div style={{
    background: C.blush, border: `1px solid ${C.red}33`, borderRadius: 14,
    padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#7F2318',
  }}>
    <b>⏰ Usajili wa uwakala umeisha.</b> Hauwezi kuandika muamala mpya,
    lakini <b>unaweza kufunga siku kwa siku {wk.access.graceLeft} zilizobaki</b> —
    pesa isibaki bila kuhesabiwa. Lipia TZS 13,000 ili kuendelea.
  </div>;

  if (wk.access.warn) return <div style={{
    background: C.warm, border: `1px solid ${C.gold}55`, borderRadius: 14,
    padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#7A5B00',
  }}>
    <b>⚠️ Zimebaki siku {wk.access.daysLeft}</b> za usajili wa uwakala. Lipia mapema
    ili huduma isisimame.
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

  const def = TX[type] || {};
  const lineId = f.line_id || wk.lines[0]?.id || '';
  const todayTx = wk.txOn(wk.today);
  const closed = wk.closedOn(wk.today);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setMsg(null); setSaving(true);
    const r = await wk.addTx({ ...f, type, line_id: def.line ? lineId : null });
    setSaving(false);
    if (!r.ok) { setMsg({ bad: true, text: r.error }); return; }
    setMsg({
      bad: false,
      text: r.duplicate ? 'Muamala huu ulishaingia — hakuna marudio.'
        : `${txLabel(type)} ${money(f.amount)} imeandikwa.`,
    });
    setF({ amount: '', commission: '', line_id: f.line_id, customer: '', phone: '', note: '' });
  };

  if (!wk.ready || wk.access.neverPaid) return <div><PageHead icon="📲" title="Rekodi ya Uwakala" /><Hali wk={wk} /></div>;

  return <div>
    <PageHead icon="📲" title="Rekodi ya Uwakala" sub="Andika kila muamala papo hapo — ndiyo inayolinda pesa yako">
      <Badge color={C.green}>{todayTx.length} leo</Badge>
    </PageHead>

    <Hali wk={wk} />

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
        <Input label="Jina la mteja (hiari)" value={f.customer} onChange={e => set('customer', e.target.value)} />
        <Input label="Namba (hiari)" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="07.." />
      </div>

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

    <HeroCard label="KAMISHENI LEO" value={money(leo.kamisheni)} pill={`${leo.idadi} miamala`}
      sub={`Kuweka ${money(leo.kuweka)} · Kutoa ${money(leo.kutoa)}`}>
      <HeroStats items={[
        { l: 'WIKI HII', v: money(wiki.kamisheni) },
        { l: 'MWEZI HUU', v: money(mwezi.kamisheni) },
        { l: 'TASLIMU KASHENI', v: money(wk.balances.cash), c: wk.balances.cash < 0 ? '#FFD9D2' : '#fff' },
      ]} />
    </HeroCard>

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
            ['Kamisheni', 'kamisheni'],
            ['Idadi ya miamala', 'idadi'],
            ['Marekebisho', 'marejesho'],
          ].map(([l, k]) => <tr key={k} style={{ borderTop: `1px solid ${C.line}` }}>
            <td style={{ padding: '8px 6px', color: C.muted, fontWeight: 600, fontSize: 12 }}>{l}</td>
            {[leo, wiki, mwezi].map((p, i) => <td key={i} style={{
              padding: '8px 6px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap',
              color: k === 'kamisheni' ? C.gold : k === 'marejesho' && p[k] ? C.red : C.ink,
            }}>{k === 'idadi' || k === 'marejesho' ? p[k] : num0(p[k])}</td>)}
          </tr>)}
          <tr style={{ borderTop: `2px solid ${C.green}`, background: C.soft }}>
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
