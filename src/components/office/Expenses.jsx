// src/components/office/Expenses.jsx
// Record and view business expenses

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDate } from "../../lib/helpers";
import { EXPENSE_CATEGORIES } from "../../lib/constants";
import Modal from "../shared/Modal";

export default function Expenses({ businessId, branchId, userId }) {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "Nyingine", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("month"); // month, week, all

  useEffect(() => {
    if (businessId) loadExpenses();
  }, [businessId, filter]);

  const loadExpenses = async () => {
    let query = supabase
      .from("expenses")
      .select("*, users!expenses_recorded_by_fkey(name)")
      .eq("business_id", businessId)
      .order("expense_date", { ascending: false });

    if (filter === "month") {
      const start = new Date();
      start.setDate(1);
      query = query.gte("expense_date", start.toISOString().split("T")[0]);
    } else if (filter === "week") {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      query = query.gte("expense_date", start.toISOString().split("T")[0]);
    }

    const { data } = await query;
    setExpenses(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.amount) return alert("Weka kiasi");
    await supabase.from("expenses").insert([{
      business_id: businessId,
      branch_id: branchId || null,
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount),
      recorded_by: userId,
      expense_date: form.expense_date,
    }]);
    setShowForm(false);
    setForm({ category: "Nyingine", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
    loadExpenses();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Futa matumizi haya?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    loadExpenses();
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Group by category
  const byCategory = {};
  expenses.forEach((e) => {
    if (!byCategory[e.category]) byCategory[e.category] = 0;
    byCategory[e.category] += Number(e.amount);
  });

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Matumizi</h2>
        <div className="flex-gap">
          <select className="input-field" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 150 }}>
            <option value="week">Wiki Hii</option>
            <option value="month">Mwezi Huu</option>
            <option value="all">Yote</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Ongeza Matumizi</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-2" style={{ marginBottom: "var(--space-lg)" }}>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--color-warning)" }}>
          <p className="stat-label">Jumla Matumizi</p>
          <p className="stat-value" style={{ color: "var(--color-warning)" }}>{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 8 }}>Kwa Kundi</p>
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <div key={cat} className="flex-between" style={{ padding: "4px 0", borderBottom: "1px solid var(--color-border-light)" }}>
              <span style={{ fontSize: "0.8125rem" }}>{cat}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{formatCurrency(amt)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses list */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Tarehe</th>
                <th>Kundi</th>
                <th>Maelezo</th>
                <th>Kiasi</th>
                <th>Ameingiza</th>
                <th>Kitendo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna matumizi</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.expense_date)}</td>
                    <td><span className="badge badge-warning">{e.category}</span></td>
                    <td>{e.description || "-"}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(e.amount)}</td>
                    <td>{e.users?.name || "-"}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)} style={{ color: "var(--color-danger)" }}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Ongeza Matumizi">
        <div className="input-group">
          <label className="input-label">Kundi</label>
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Kiasi (TZS) *</label>
          <input className="input-field" type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Kiasi" />
        </div>
        <div className="input-group">
          <label className="input-label">Maelezo</label>
          <input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Maelezo mafupi" />
        </div>
        <div className="input-group">
          <label className="input-label">Tarehe</label>
          <input className="input-field" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSave}>Hifadhi</button>
      </Modal>
    </div>
  );
}
