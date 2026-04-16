// src/components/office/Categories.jsx

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Modal from "../shared/Modal";

export default function Categories({ businessId }) {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) loadCategories();
  }, [businessId]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*, products(id)")
      .eq("business_id", businessId)
      .order("name");
    setCategories(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name) return alert("Jaza jina la kundi");
    const payload = { name: form.name, description: form.description || null, business_id: businessId };
    if (editId) {
      await supabase.from("categories").update(payload).eq("id", editId);
    } else {
      await supabase.from("categories").insert([payload]);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: "", description: "" });
    loadCategories();
  };

  const handleEdit = (c) => {
    setForm({ name: c.name, description: c.description || "" });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Futa kundi hili?")) return;
    await supabase.from("categories").delete().eq("id", id);
    loadCategories();
  };

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Makundi ya Bidhaa</h2>
        <button className="btn btn-primary" onClick={() => { setForm({ name: "", description: "" }); setEditId(null); setShowForm(true); }}>
          + Ongeza Kundi
        </button>
      </div>

      <div className="grid-3">
        {loading ? (
          <p>Inapakia...</p>
        ) : categories.length === 0 ? (
          <div className="empty-state card" style={{ gridColumn: "1/-1" }}>
            <div className="empty-icon">🏷️</div>
            <p>Hakuna makundi bado</p>
          </div>
        ) : (
          categories.map((c) => (
            <div className="card" key={c.id}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <h4 style={{ fontWeight: 700 }}>{c.name}</h4>
                <div className="flex-gap">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(c)}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)} style={{ color: "var(--color-danger)" }}>🗑️</button>
                </div>
              </div>
              {c.description && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: 8 }}>{c.description}</p>}
              <span className="badge badge-info">{(c.products || []).length} bidhaa</span>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? "Hariri Kundi" : "Ongeza Kundi Jipya"}>
        <div className="input-group">
          <label className="input-label">Jina la Kundi</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mfano: Vyakula" />
        </div>
        <div className="input-group">
          <label className="input-label">Maelezo (Hiari)</label>
          <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Maelezo mafupi" />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSave}>Hifadhi</button>
      </Modal>
    </div>
  );
}
