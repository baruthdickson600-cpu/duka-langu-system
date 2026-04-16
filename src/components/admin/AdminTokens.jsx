// src/components/admin/AdminTokens.jsx
// Admin - generate and manage tokens

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDate } from "../../lib/helpers";
import Modal from "../shared/Modal";

export default function AdminTokens({ userId }) {
  const [tokens, setTokens] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ count: 1, daysValid: 30, price: 10000 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    const { data } = await supabase
      .from("tokens")
      .select("*, businesses(business_name)")
      .order("created_at", { ascending: false });
    setTokens(data || []);
    setLoading(false);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "DL-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    code += "-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const newTokens = [];
      for (let i = 0; i < form.count; i++) {
        newTokens.push({
          token_code: generateCode(),
          days_valid: form.daysValid,
          price: form.price,
          status: "unused",
          created_by: userId,
        });
      }
      await supabase.from("tokens").insert(newTokens);
      setShowCreate(false);
      loadTokens();
    } catch (err) {
      alert("Kosa: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Token Management</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Tengeneza Token
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: "var(--space-lg)" }}>
        <div className="stat-card">
          <p className="stat-label">Tokens Zote</p>
          <p className="stat-value">{tokens.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Hazijatumika</p>
          <p className="stat-value" style={{ color: "var(--color-info)" }}>
            {tokens.filter((t) => t.status === "unused").length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Mapato</p>
          <p className="stat-value" style={{ color: "var(--color-success)" }}>
            {formatCurrency(tokens.filter((t) => t.status === "active").reduce((s, t) => s + Number(t.price || 0), 0))}
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Token Code</th>
                <th>Siku</th>
                <th>Bei</th>
                <th>Hali</th>
                <th>Duka</th>
                <th>Imeamilishwa</th>
                <th>Inaisha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : tokens.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna tokens</td></tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.05em" }}>
                      {t.token_code}
                    </td>
                    <td>{t.days_valid} siku</td>
                    <td>{formatCurrency(t.price)}</td>
                    <td>
                      <span className={`badge ${
                        t.status === "unused" ? "badge-info" :
                        t.status === "active" ? "badge-success" : "badge-danger"
                      }`}>
                        {t.status === "unused" ? "Haijatumika" :
                         t.status === "active" ? "Inatumika" : "Imeisha"}
                      </span>
                    </td>
                    <td>{t.businesses?.business_name || "-"}</td>
                    <td>{formatDate(t.activated_at)}</td>
                    <td>{formatDate(t.expires_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tengeneza Token Mpya">
        <div className="input-group">
          <label className="input-label">Idadi ya Tokens</label>
          <input
            className="input-field"
            type="number"
            min={1}
            max={50}
            value={form.count}
            onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Siku za Uhalali</label>
          <input
            className="input-field"
            type="number"
            min={1}
            value={form.daysValid}
            onChange={(e) => setForm({ ...form, daysValid: parseInt(e.target.value) || 30 })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Bei (TZS)</label>
          <input
            className="input-field"
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
          />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleCreate} disabled={creating}>
          {creating ? "Inatengeneza..." : `Tengeneza Token ${form.count > 1 ? `(${form.count})` : ""}`}
        </button>
      </Modal>
    </div>
  );
}
