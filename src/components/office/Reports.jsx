// src/components/office/Reports.jsx
// Sales reports - daily, monthly, profit analysis

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDate } from "../../lib/helpers";

export default function Reports({ businessId }) {
  const [period, setPeriod] = useState("today");
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ total: 0, profit: 0, count: 0, expenses: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (businessId) loadReport();
  }, [businessId, period, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
    }
    if (period === "week") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString(), end: now.toISOString() };
    }
    if (period === "custom") {
      return {
        start: new Date(dateRange.start).toISOString(),
        end: new Date(new Date(dateRange.end).getTime() + 86400000).toISOString(),
      };
    }
    return { start: new Date(0).toISOString(), end: now.toISOString() };
  };

  const loadReport = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Sales
      const { data: salesData } = await supabase
        .from("sales")
        .select("*, users!sales_sold_by_fkey(name), sale_items(*)")
        .eq("business_id", businessId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      setSales(salesData || []);

      const totalSales = (salesData || []).reduce((s, r) => s + Number(r.total_amount), 0);
      const totalProfit = (salesData || []).reduce((s, r) => s + Number(r.total_profit), 0);

      // Expenses in same period
      const { data: expData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("business_id", businessId)
        .gte("created_at", start)
        .lte("created_at", end);

      const totalExpenses = (expData || []).reduce((s, e) => s + Number(e.amount), 0);

      setSummary({
        total: totalSales,
        profit: totalProfit,
        count: (salesData || []).length,
        expenses: totalExpenses,
      });

      // Top products
      const productMap = {};
      (salesData || []).forEach((sale) => {
        (sale.sale_items || []).forEach((item) => {
          if (!productMap[item.product_name]) {
            productMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0, profit: 0 };
          }
          productMap[item.product_name].qty += Number(item.quantity);
          productMap[item.product_name].revenue += Number(item.total_price);
          productMap[item.product_name].profit += Number(item.profit);
        });
      });
      setTopProducts(Object.values(productMap).sort((a, b) => b.qty - a.qty));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const netProfit = summary.profit - summary.expenses;

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Ripoti</h2>
        <div className="flex-gap" style={{ flexWrap: "wrap" }}>
          {["today", "week", "month", "custom"].map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setPeriod(p)}
            >
              {p === "today" ? "Leo" : p === "week" ? "Wiki" : p === "month" ? "Mwezi" : "Custom"}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex-gap">
              <input type="date" className="input-field" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={{ width: 150 }} />
              <span>-</span>
              <input type="date" className="input-field" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={{ width: 150 }} />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="stat-card">
          <p className="stat-label">Mauzo</p>
          <p className="stat-value">{formatCurrency(summary.total)}</p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>{summary.count} orders</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Faida Ghafi</p>
          <p className="stat-value" style={{ color: "var(--color-success)" }}>{formatCurrency(summary.profit)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Matumizi</p>
          <p className="stat-value" style={{ color: "var(--color-warning)" }}>{formatCurrency(summary.expenses)}</p>
        </div>
        <div className="stat-card" style={{ borderTop: `3px solid ${netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)"}` }}>
          <p className="stat-label">Faida Halisi</p>
          <p className="stat-value" style={{ color: netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {formatCurrency(netProfit)}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>Mauzo - Matumizi</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "var(--space-xl)" }}>
        {/* Top Products */}
        <div className="card">
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>Bidhaa Zinazouzwa Zaidi</h3>
          {topProducts.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Hakuna data</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>#</th><th>Bidhaa</th><th>Qty</th><th>Mapato</th><th>Faida</th></tr>
                </thead>
                <tbody>
                  {topProducts.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.qty}</td>
                      <td>{formatCurrency(p.revenue)}</td>
                      <td style={{ color: "var(--color-success)", fontWeight: 600 }}>{formatCurrency(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Weak Products */}
        <div className="card">
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>Bidhaa Dhaifu (Mauzo Kidogo)</h3>
          {topProducts.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Hakuna data</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>#</th><th>Bidhaa</th><th>Qty</th><th>Mapato</th></tr>
                </thead>
                <tbody>
                  {[...topProducts].sort((a, b) => a.qty - b.qty).slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ color: "var(--color-danger)" }}>{p.qty}</td>
                      <td>{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sales List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "var(--space-md) var(--space-lg)" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Mauzo Yote</h3>
        </div>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Risiti</th>
                <th>Tarehe</th>
                <th>Muuzaji</th>
                <th>Mteja</th>
                <th>Malipo</th>
                <th>Jumla</th>
                <th>Faida</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna mauzo</td></tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{s.receipt_number}</td>
                    <td>{formatDate(s.created_at)}</td>
                    <td>{s.users?.name || "-"}</td>
                    <td>{s.customer_name || "-"}</td>
                    <td><span className="badge badge-info">{s.payment_method}</span></td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(s.total_amount)}</td>
                    <td style={{ fontWeight: 700, color: "var(--color-success)" }}>{formatCurrency(s.total_profit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
