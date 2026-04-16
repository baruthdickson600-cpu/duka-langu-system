// src/components/admin/AdminPromo.jsx
// Admin - manage promo/agent codes

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Modal from "../shared/Modal";

export default function AdminPromo({ userId }) {
  const [codes, setCodes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: "", agentName: "", agentPhone: "", discount: 0, maxUses: 100 });

  useEffect(() => { loadCodes(); }, []);

  const loadCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.code || !form.agentName) return alert("Jaza code na jina la wakala");
    const { error } = await supabase.from("promo_codes").insert([{
      code: form.code.toUpperCase().replace(/\s/g, ""),
      agent_name: form.agentName,
      agent_phone: form.agentPhone,
      discount_percent: form.discount,
      max_uses: form.maxUses,
      created_by: userId,
    }]);
    if (error) return alert(error.message);
    setShowCreate(false);
    setForm({ code: "", agentName: "", agentPhone: "", discount: 0, maxUses: 100 });
    loadCodes();
  };

  const toggleActive = async (id, current) => {
    await supabase.from("promo_codes").update({ is_active: !current }).eq("id", id);
    loadCodes();
  };

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Promo Codes / Wakala</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Ongeza Promo</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Wakala</th>
                <th>Simu</th>
                <th>Discount %</th>
                <th>Imetumika</th>
                <th>Max</th>
                <th>Hali</th>
                <th>Kitendo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : codes.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna promo codes</td></tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{c.code}</td>
                    <td>{c.agent_name}</td>
                    <td>{c.agent_phone || "-"}</td>
                    <td>{c.discount_percent}%</td>
                    <td>{c.times_used}</td>
                    <td>{c.max_uses}</td>
                    <td>
                      <span className={`badge ${c.is_active ? "badge-success" : "badge-danger"}`}>
                        {c.is_active ? "Active" : "Imezimwa"}
                      </span>
                    </td>
                    <td>
                      <button className={`btn btn-sm ${c.is_active ? "btn-danger" : "btn-primary"}`} onClick={() => toggleActive(c.id, c.is_active)}>
                        {c.is_active ? "Zima" : "Washa"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Ongeza Promo Code">
        <div className="input-group">
          <label className="input-label">Promo Code</label>
          <input className="input-field" placeholder="Mfano: WAKALA001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ textTransform: "uppercase" }} />
        </div>
        <div className="input-group">
          <label className="input-label">Jina la Wakala</label>
          <input className="input-field" placeholder="Jina kamili" value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
        </div>
        <div className="input-group">
          <label className="input-label">Simu ya Wakala</label>
          <input className="input-field" placeholder="07xxxxxxxx" value={form.agentPhone} onChange={(e) => setForm({ ...form, agentPhone: e.target.value })} />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label className="input-label">Discount (%)</label>
            <input className="input-field" type="number" min={0} max={100} value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Max Uses</label>
            <input className="input-field" type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleCreate}>Hifadhi</button>
      </Modal>
    </div>
  );
}
