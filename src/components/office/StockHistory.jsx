// src/components/office/StockHistory.jsx

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatDate } from "../../lib/helpers";

export default function StockHistory({ businessId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (businessId) loadHistory();
  }, [businessId, filter]);

  const loadHistory = async () => {
    let query = supabase
      .from("stock_history")
      .select("*, products(name, unit), users!stock_history_changed_by_fkey(name)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("change_type", filter);
    }

    const { data } = await query;
    setHistory(data || []);
    setLoading(false);
  };

  const typeLabels = {
    sale: { label: "Mauzo", color: "var(--color-info)" },
    restock: { label: "Ongeza Stock", color: "var(--color-success)" },
    adjustment: { label: "Marekebisho", color: "var(--color-warning)" },
    return: { label: "Kurudisha", color: "var(--color-primary)" },
    transfer: { label: "Uhamisho", color: "var(--color-text-secondary)" },
  };

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Historia ya Stock</h2>
        <div className="flex-gap">
          {["all", "sale", "restock", "adjustment", "return"].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Zote" : typeLabels[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Tarehe</th>
                <th>Bidhaa</th>
                <th>Aina</th>
                <th>Mabadiliko</th>
                <th>Kabla</th>
                <th>Baada</th>
                <th>Amefanya</th>
                <th>Maelezo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna historia bado</td></tr>
              ) : (
                history.map((h) => {
                  const typeInfo = typeLabels[h.change_type] || { label: h.change_type, color: "gray" };
                  return (
                    <tr key={h.id}>
                      <td>{formatDate(h.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{h.products?.name || "-"}</td>
                      <td>
                        <span style={{
                          padding: "2px 8px", borderRadius: "var(--radius-full)",
                          fontSize: "0.75rem", fontWeight: 600,
                          background: typeInfo.color + "15", color: typeInfo.color,
                        }}>{typeInfo.label}</span>
                      </td>
                      <td style={{
                        fontWeight: 700,
                        color: Number(h.quantity_change) > 0 ? "var(--color-success)" : "var(--color-danger)",
                      }}>
                        {Number(h.quantity_change) > 0 ? "+" : ""}{h.quantity_change}
                      </td>
                      <td>{h.quantity_before}</td>
                      <td>{h.quantity_after}</td>
                      <td>{h.users?.name || "-"}</td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>{h.notes || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
