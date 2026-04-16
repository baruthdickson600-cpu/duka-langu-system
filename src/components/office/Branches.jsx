// src/components/office/Branches.jsx

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Modal from "../shared/Modal";

export default function Branches({ businessId }) {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ branch_name: "", address: "", phone: "" });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) loadBranches();
  }, [businessId]);

  const loadBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("*, users(id), products(id)")
      .eq("business_id", businessId)
      .order("is_main", { ascending: false });
    setBranches(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.branch_name) return alert("Jaza jina la tawi");
    const payload = {
      branch_name: form.branch_name,
      address: form.address || null,
      phone: form.phone || null,
      business_id: businessId,
    };
    if (editId) {
      await supabase.from("branches").update(payload).eq("id", editId);
    } else {
      await supabase.from("branches").insert([payload]);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ branch_name: "", address: "", phone: "" });
    loadBranches();
  };

  const handleEdit = (b) => {
    setForm({ branch_name: b.branch_name, address: b.address || "", phone: b.phone || "" });
    setEditId(b.id);
    setShowForm(true);
  };

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Matawi</h2>
        <button className="btn btn-primary" onClick={() => { setForm({ branch_name: "", address: "", phone: "" }); setEditId(null); setShowForm(true); }}>
          + Ongeza Tawi
        </button>
      </div>

      <div className="grid-3">
        {loading ? (
          <p>Inapakia...</p>
        ) : branches.length === 0 ? (
          <div className="empty-state card" style={{ gridColumn: "1/-1" }}>
            <div className="empty-icon">🏢</div>
            <p>Hakuna matawi</p>
          </div>
        ) : (
          branches.map((b) => (
            <div className="card" key={b.id}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <h4 style={{ fontWeight: 700 }}>
                  {b.branch_name}
                  {b.is_main && <span className="badge badge-success" style={{ marginLeft: 8 }}>Kuu</span>}
                </h4>
                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(b)}>✏️</button>
              </div>
              {b.address && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: 8 }}>{b.address}</p>}
              {b.phone && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: 8 }}>📞 {b.phone}</p>}
              <div className="flex-gap" style={{ marginTop: 8 }}>
                <span className="badge badge-info">👥 {(b.users || []).length} wafanyakazi</span>
                <span className="badge badge-warning">📦 {(b.products || []).length} bidhaa</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? "Hariri Tawi" : "Ongeza Tawi Jipya"}>
        <div className="input-group">
          <label className="input-label">Jina la Tawi *</label>
          <input className="input-field" value={form.branch_name} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} placeholder="Mfano: Tawi la Kariakoo" />
        </div>
        <div className="input-group">
          <label className="input-label">Anwani</label>
          <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Anwani ya tawi" />
        </div>
        <div className="input-group">
          <label className="input-label">Simu</label>
          <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Namba ya simu" />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSave}>Hifadhi</button>
      </Modal>
    </div>
  );
}
