// ============================================================
// DukaLangu — HOOK YA UWAKALA
//
// Iko peke yake, SI ndani ya AppContext. Sababu: AppContext ni
// mistari 3,000 na ni moyo wa mfumo wote. Kuiongeza data ya
// uwakala huko ni kuweka hatari kwenye mauzo, stock na ripoti —
// vitu vinavyofanya kazi sasa.
//
// Hook hii inajipakia yenyewe, pale ukurasa wa uwakala ukifunguka
// pekee. Huduma ikiwa imezimwa, haigusi database hata mara moja.
//
// Jedwali likiwa halipo bado (SQL haijaendeshwa), inarudisha orodha
// tupu na `ready:false` — HAIVUNJI ukurasa. Somo la offline_id.
// ============================================================
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  wakalaAccess, floatAfter, cashAfter, commissionTotal,
  dayTotals, validateTx, txDeltas,
} from '../utils/wakala';
import { localDateStr, genId } from '../utils/helpers';

// PostgREST inaweza kurudisha kitu kimoja au orodha kutegemea `single()`.
// Hesabu ya pesa haipaswi kutegemea umbo la jibu.
const one = d => (Array.isArray(d) ? d[0] : d) || null;

// Jedwali halipo / safu haipo — si kosa la mtumiaji
const missingTable = e => {
  const m = String(e?.message || e?.msg || e || '');
  return /PGRST205|PGRST202|does not exist|schema cache|relation .* does not exist/i.test(m);
};

export function useWakala({ load = true } = {}) {
  const { supabase, biz, user } = useApp();
  const bizId = biz?.id || null;

  const [lines, setLines]       = useState([]);
  const [txs, setTxs]           = useState([]);
  const [days, setDays]         = useState([]);
  const [cfg, setCfg]           = useState({ cash_opening: 0, threshold: 1000, alert_sms: false });
  const [ready, setReady]       = useState(false);   // jedwali lipo?
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const busy = useRef(false);

  // ===== RUHUSA =====
  const access = useMemo(() => wakalaAccess({
    enabled:   biz?.wakala_enabled,
    paidUntil: biz?.wakala_paid_until,
  }), [biz?.wakala_enabled, biz?.wakala_paid_until]);

  // ===== KUPAKIA =====
  const reload = useCallback(async () => {
    if (!bizId || !supabase || busy.current) return;
    busy.current = true;
    setLoading(true);
    setErr('');
    try {
      const q = t => supabase.from(t).select('*').eq('business_id', bizId);
      const [ln, tx, dy, st] = await Promise.all([
        q('wakala_lines').order('sort_order'),
        q('wakala_tx').order('created_at', { ascending: false }).limit(1500),
        q('wakala_days').order('day', { ascending: false }).limit(400),
        supabase.from('wakala_settings').select('*').eq('business_id', bizId).maybeSingle(),
      ]);

      // Jedwali halipo -> huduma haiwezi kutumika, lakini ukurasa
      // unaonyesha maelezo badala ya kuvunjika
      if (ln.error && missingTable(ln.error)) { setReady(false); return; }
      if (ln.error) throw ln.error;

      setLines((ln.data || []).filter(l => l.active !== false));
      setTxs(tx.error ? [] : (tx.data || []));
      setDays(dy.error ? [] : (dy.data || []));
      if (!st.error && st.data) setCfg(st.data);
      setReady(true);
    } catch (e) {
      if (missingTable(e)) setReady(false);
      else setErr(e?.message || 'Imeshindwa kupakia data ya uwakala');
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }, [bizId, supabase]);

  useEffect(() => {
    if (load && access.visible && bizId) reload();
  }, [load, access.visible, bizId, reload]);

  // ===== MIAMALA =====
  // Kuandika muamala. recorded_by na created_at vinapigwa chapa na
  // DATABASE, si hapa — kwa hiyo hatuvitumi kabisa.
  const addTx = useCallback(async (input) => {
    if (!access.canRecord) return { ok: false, error: 'Usajili wa uwakala umeisha. Lipia kwanza.' };

    const tx = {
      business_id: bizId,
      line_id:     input.line_id || null,
      type:        input.type,
      amount:      Number(input.amount) || 0,
      commission:  Number(input.commission) || 0,
      customer:    input.customer || null,
      phone:       input.phone || null,
      ref:         input.ref || null,
      note:        input.note || null,
      tx_date:     input.tx_date || localDateStr(new Date()),
      offline_id:  input.offline_id || genId(),
    };

    const v = validateTx(tx, { lines });
    if (!v.ok) return { ok: false, error: v.errors.join(' ') };

    try {
      const { data, error } = await supabase.from('wakala_tx').insert(tx).select().single();
      if (error) {
        // 23505 = ulishaingia. Mtandao hafifu ulirudia ombi — si kosa.
        if (String(error.code) === '23505') {
          await reload();
          return { ok: true, duplicate: true };
        }
        return { ok: false, error: error.message || 'Imeshindwa kuandika muamala' };
      }
      const row = one(data);
      if (!row) { await reload(); return { ok: true }; }
      setTxs(p => [row, ...p]);
      return { ok: true, tx: row };
    } catch (e) {
      return { ok: false, error: e?.message || 'Imeshindwa kuandika muamala' };
    }
  }, [access.canRecord, bizId, lines, supabase, reload]);

  // Kurekebisha = KUANDIKA REJESHO, si kufuta. Rekodi ya awali
  // inabaki ikionekana kwa mmiliki. Hapo mwanya wa kufuta unafungwa.
  const reverseTx = useCallback(async (orig, note) => {
    if (!orig?.id) return { ok: false, error: 'Muamala haujachaguliwa' };
    if (!access.canRecord) return { ok: false, error: 'Usajili wa uwakala umeisha. Lipia kwanza.' };
    try {
      const { data, error } = await supabase.from('wakala_tx').insert({
        business_id: bizId,
        line_id:     orig.line_id,
        type:        orig.type,
        amount:      orig.amount,
        commission:  orig.commission || 0,
        customer:    orig.customer || null,
        reverses:    orig.id,
        note:        note || 'Marekebisho',
        tx_date:     orig.tx_date,
        offline_id:  'rev-' + orig.id,
      }).select().single();
      if (error) {
        if (String(error.code) === '23505')
          return { ok: false, error: 'Muamala huu umekwisha rekebishwa tayari.' };
        return { ok: false, error: error.message };
      }
      const row = one(data);
      if (!row) { await reload(); return { ok: true }; }
      setTxs(p => [row, ...p]);
      return { ok: true, tx: row };
    } catch (e) {
      return { ok: false, error: e?.message || 'Imeshindwa' };
    }
  }, [access.canRecord, bizId, supabase]);

  // ===== KUFUNGA SIKU =====
  // Hesabu inafanyika UPANDE WA DATABASE. Wakala anatuma alichohesabu
  // pekee; haoni inayotarajiwa kabla. Hapo upotevu unakamatwa.
  const closeDay = useCallback(async ({ day, counted, countedCash, note }) => {
    if (!access.canClose) return { ok: false, error: 'Huduma imefungwa. Lipia kwanza.' };
    try {
      const { data, error } = await supabase.rpc('dl_wakala_close_day', {
        p_biz: bizId,
        p_day: day,
        p_counted: counted || {},
        p_counted_cash: Number(countedCash) || 0,
        p_note: note || null,
      });
      if (error) {
        if (missingTable(error))
          return { ok: false, error: 'SQL ya uwakala haijaendeshwa bado. Mjulishe msimamizi.' };
        return { ok: false, error: error.message || 'Imeshindwa kufunga siku' };
      }
      await reload();
      return { ok: true, day: data };
    } catch (e) {
      return { ok: false, error: e?.message || 'Imeshindwa kufunga siku' };
    }
  }, [access.canClose, bizId, supabase, reload]);

  // Kufungua siku (mmiliki pekee — RLS inazuia muuzaji)
  const reopenDay = useCallback(async (dayId) => {
    try {
      const { error } = await supabase.from('wakala_days').delete().eq('id', dayId);
      if (error) return { ok: false, error: error.message };
      setDays(p => p.filter(d => d.id !== dayId));
      return { ok: true };
    } catch (e) { return { ok: false, error: e?.message }; }
  }, [supabase]);

  // ===== LAINI ZA FLOAT (mmiliki) =====
  const saveLine = useCallback(async (line) => {
    try {
      const row = {
        business_id:   bizId,
        name:          (line.name || '').trim(),
        short_code:    line.short_code || null,
        opening_float: Number(line.opening_float) || 0,
        sort_order:    Number(line.sort_order) || 0,
        active:        line.active !== false,
      };
      if (!row.name) return { ok: false, error: 'Weka jina la laini' };
      const r = line.id
        ? await supabase.from('wakala_lines').update(row).eq('id', line.id).select().single()
        : await supabase.from('wakala_lines').insert(row).select().single();
      if (r.error) return { ok: false, error: r.error.message };
      const saved = one(r.data);
      setLines(p => line.id ? p.map(l => l.id === line.id ? (saved || l) : l) : (saved ? [...p, saved] : p));
      return { ok: true, line: saved };
    } catch (e) { return { ok: false, error: e?.message }; }
  }, [bizId, supabase]);

  const removeLine = useCallback(async (id) => {
    try {
      // Laini iliyo na miamala HAIFUTIKI (ON DELETE RESTRICT).
      // Tunaizima badala ya kuifuta — historia inabaki.
      const { error } = await supabase.from('wakala_lines').update({ active: false }).eq('id', id);
      if (error) return { ok: false, error: error.message };
      setLines(p => p.filter(l => l.id !== id));
      return { ok: true };
    } catch (e) { return { ok: false, error: e?.message }; }
  }, [supabase]);

  const saveCfg = useCallback(async (patch) => {
    try {
      const row = { business_id: bizId, ...cfg, ...patch, updated_at: new Date().toISOString() };
      delete row.id;
      const { data, error } = await supabase.from('wakala_settings')
        .upsert(row, { onConflict: 'business_id' }).select().single();
      if (error) return { ok: false, error: error.message };
      setCfg(one(data) || row);
      return { ok: true };
    } catch (e) { return { ok: false, error: e?.message }; }
  }, [bizId, cfg, supabase]);

  // ===== HESABU =====
  const today = localDateStr(new Date());
  const txOn  = useCallback(d => txs.filter(t => String(t.tx_date) === String(d)), [txs]);
  const closedOn = useCallback(d => days.find(x => String(x.day) === String(d)) || null, [days]);

  // Float ya kuanzia: iliyohesabiwa HALISI siku ya mwisho kufungwa.
  // Ukweli ndio unaoendelea mbele, si inayotarajiwa.
  const openingFloat = useCallback((lineId, day = today) => {
    const prev = days
      .filter(d => String(d.day) < String(day) && d.lines && d.lines[lineId])
      .sort((a, b) => String(b.day).localeCompare(String(a.day)))[0];
    if (prev) return Number(prev.lines[lineId].counted) || 0;
    return Number(lines.find(l => l.id === lineId)?.opening_float) || 0;
  }, [days, lines, today]);

  const openingCash = useCallback((day = today) => {
    const prev = days
      .filter(d => String(d.day) < String(day))
      .sort((a, b) => String(b.day).localeCompare(String(a.day)))[0];
    if (prev) return Number(prev.counted_cash) || 0;
    return Number(cfg.cash_opening) || 0;
  }, [days, cfg.cash_opening, today]);

  // Salio la sasa kwa kila laini + taslimu
  const balances = useMemo(() => {
    const t = txOn(today);
    return {
      day: today,
      cash: cashAfter(openingCash(today), t),
      commission: commissionTotal(t),
      totals: dayTotals(t),
      lines: lines.map(l => ({
        ...l,
        opening: openingFloat(l.id, today),
        float:   floatAfter(openingFloat(l.id, today), t, l.id),
      })),
    };
  }, [txOn, today, openingCash, openingFloat, lines]);

  // Muhtasari wa kipindi (mmiliki): kamisheni, idadi, tofauti
  const summary = useCallback((from, to) => {
    const inRange = d => (!from || String(d) >= String(from)) && (!to || String(d) <= String(to));
    const t  = txs.filter(x => inRange(x.tx_date));
    const dd = days.filter(x => inRange(x.day));
    return {
      ...dayTotals(t),
      siku:          dd.length,
      tofautiTaslimu: dd.reduce((a, d) => a + (Number(d.variance_cash) || 0), 0),
      tofautiFloat:   dd.reduce((a, d) => a + (Number(d.variance_float) || 0), 0),
      sikuZaTofauti:  dd.filter(d => Number(d.variance_cash) || Number(d.variance_float)).length,
    };
  }, [txs, days]);

  return {
    // hali
    access, ready, loading, err, isOwner: user?.role === 'office',
    // data
    lines, txs, days, cfg, balances, today,
    // vitendo
    reload, addTx, reverseTx, closeDay, reopenDay, saveLine, removeLine, saveCfg,
    // vikokotoo
    txOn, closedOn, openingFloat, openingCash, summary, txDeltas,
  };
}

export default useWakala;
