// src/components/office/Workers.jsx
// Manage workers/sellers for the business

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatDate } from "../../lib/helpers";
import Modal from "../shared/Modal";

export default function Workers({ businessId, branchId }) {
  const [workers, setWorkers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  useEffect(() => {
    if (businessId) {
      loadWorkers();
      loadBranches();
    }
  }, [businessId]);

  const loadWorkers = async () => {
    const { data } = await supabase
      .from("users")
      .select("*, branches(branch_name)")
      .eq("business_id", businessId)
      .eq("role", "worker")
      .order("created_at", { ascending: false });
    setWorkers(data || []);
    setLoading(false);
  };

  const loadBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("business_id", businessId);
    setBranches(data || []);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return alert("Jaza taarifa zote muhimu");
    if (form.password.length < 6) return alert("Password iwe angalau herufi 6");
    setCreating(true);

    try {
      // Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authErr) throw authErr;

      // Create user profile
      await supabase.from("users").insert([{
        id: authData.user.id,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: "worker",
        business_id: businessId,
        branch_id: selectedBranch || branchId || null,
      }]);

      setShowForm(false);
      setForm({ name: "", email: "", password: "", phone: "" });
      setSelectedBranch("");
      loadWorkers();
    } catch (err) {
      alert("Kosa: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id, current) => {
    await supabase.from("users").update({ is_active: !current }).eq("id", id);
    loadWorkers();
  };

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Wafanyakazi ({workers.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Ongeza Mfanyakazi</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Jina</th>
                <th>Email</th>
                <th>Simu</th>
                <th>Tawi</th>
                <th>Tarehe Sajili</th>
                <th>Hali</th>
                <th>Kitendo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : workers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna wafanyakazi bado</td></tr>
              ) : (
                workers.map((w, i) => (
                  <tr key={w.id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>{w.email}</td>
                    <td>{w.phone || "-"}</td>
                    <td>{w.branches?.branch_name || "-"}</td>
                    <td>{formatDate(w.created_at)}</td>
                    <td>
                      <span className={`badge ${w.is_active ? "badge-success" : "badge-danger"}`}>
                        {w.is_active ? "Active" : "Imezimwa"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${w.is_active ? "btn-danger" : "btn-primary"}`}
                        onClick={() => toggleActive(w.id, w.is_active)}
                      >
                        {w.is_active ? "Zima" : "Washa"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ongeza Mfanyakazi Mpya">
        <div className="input-group">
          <label className="input-label">Jina Kamili *</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jina la mfanyakazi" />
        </div>
        <div className="input-group">
          <label className="input-label">Email *</label>
          <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email ya login" />
        </div>
        <div className="input-group">
          <label className="input-label">Password *</label>
          <input className="input-field" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (angalau 6)" />
        </div>
        <div className="input-group">
          <label className="input-label">Simu</label>
          <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xxxxxxxx" />
        </div>
        {branches.length > 1 && (
          <div className="input-group">
            <label className="input-label">Tawi</label>
            <select className="input-field" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="">-- Chagua Tawi --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
        )}
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleCreate} disabled={creating}>
          {creating ? "Inaunda..." : "Unda Mfanyakazi"}
        </button>
      </Modal>
    </div>
  );
}
