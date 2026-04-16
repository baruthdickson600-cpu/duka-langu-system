// src/components/office/OfficeDashboard.jsx
// Office owner dashboard - today's sales, profit, stock alerts

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/helpers";

export default function OfficeDashboard({ businessId, branchId }) {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    totalProducts: 0,
    lowStock: 0,
    monthSales: 0,
    monthProfit: 0,
    monthExpenses: 0,
  });
  const [topProducts, setTopProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) loadDashboard();
  }, [businessId]);

  const loadDashboard = async () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    try {
      // Today's sales
      const { data: todaySalesData } = await supabase
        .from("sales")
        .select("total_amount, total_profit")
        .eq("business_id", businessId)
        .gte("created_at", startOfDay);

      const todaySales = (todaySalesData || []).reduce((s, r) => s + Number(r.total_amount), 0);
      const todayProfit = (todaySalesData || []).reduce((s, r) => s + Number(r.total_profit), 0);

      // Month sales
      const { data: monthSalesData } = await supabase
        .from("sales")
        .select("total_amount, total_profit")
        .eq("business_id", businessId)
        .gte("created_at", startOfMonth);

      const monthSales = (monthSalesData || []).reduce((s, r) => s + Number(r.total_amount), 0);
      const monthProfit = (monthSalesData || []).reduce((s, r) => s + Number(r.total_profit), 0);

      // Month expenses
      const { data: expData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("business_id", businessId)
        .gte("created_at", startOfMonth);

      const monthExpenses = (expData || []).reduce((s, r) => s + Number(r.amount), 0);

      // Products count
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("is_active", true);

      // Low stock
      const { data: lowData } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .filter("quantity", "lte", "min_stock")
        .order("quantity", { ascending: true })
        .limit(10);

      setLowStockItems(lowData || []);

      // Recent sales
      const { data: recent } = await supabase
        .from("sales")
        .select("*, users!sales_sold_by_fkey(name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentSales(recent || []);

      // Top products this month
      const { data: topData } = await supabase
        .from("sale_items")
        .select("product_name, quantity, total_price, profit, sales!inner(business_id, created_at)")
        .eq("sales.business_id", businessId)
        .gte("sales.created_at", startOfMonth);

      // Aggregate top products
      const productMap = {};
      (topData || []).forEach((item) => {
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0, profit: 0 };
        }
        productMap[item.product_name].qty += Number(item.quantity);
        productMap[item.product_name].revenue += Number(item.total_price);
        productMap[item.product_name].profit += Number(item.profit);
      });
      const sorted = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
      setTopProducts(sorted);

      setStats({
        todaySales,
        todayProfit,
        totalProducts: totalProducts || 0,
        lowStock: (lowData || []).length,
        monthSales,
        monthProfit,
        monthExpenses,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container"><p>Inapakia dashboard...</p></div>;

  const netProfit = stats.monthProfit - stats.monthExpenses;

  return (
    <div className="page-container animate-fade">
      <h2 className="page-title">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Mauzo Leo</p>
              <p className="stat-value">{formatCurrency(stats.todaySales)}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-primary-50)", color: "var(--color-primary)" }}>🛒</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Faida Leo</p>
              <p className="stat-value" style={{ color: "var(--color-success)" }}>{formatCurrency(stats.todayProfit)}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-success-light)", color: "var(--color-success)" }}>💰</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Bidhaa</p>
              <p className="stat-value">{stats.totalProducts}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-info-light)", color: "var(--color-info)" }}>📦</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Stock Chini</p>
              <p className="stat-value" style={{ color: stats.lowStock > 0 ? "var(--color-danger)" : "var(--color-text)" }}>{stats.lowStock}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-warning-light)", color: "var(--color-warning)" }}>⚠️</div>
          </div>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid-3" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--color-primary)" }}>
          <p className="stat-label">Mauzo Mwezi Huu</p>
          <p className="stat-value">{formatCurrency(stats.monthSales)}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid var(--color-warning)" }}>
          <p className="stat-label">Matumizi Mwezi Huu</p>
          <p className="stat-value">{formatCurrency(stats.monthExpenses)}</p>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)"}` }}>
          <p className="stat-label">Faida Halisi</p>
          <p className="stat-value" style={{ color: netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {formatCurrency(netProfit)}
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Top Products */}
        <div className="card">
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>
            🏆 Bidhaa Zinazouzwa Zaidi (Mwezi)
          </h3>
          {topProducts.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Hakuna mauzo mwezi huu bado</p>
          ) : (
            topProducts.map((p, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: i < topProducts.length - 1 ? "1px solid var(--color-border-light)" : "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "var(--radius-full)",
                    background: i === 0 ? "var(--color-primary)" : "var(--color-bg)",
                    color: i === 0 ? "white" : "var(--color-text-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700,
                  }}>{i + 1}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.name}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem" }}>{p.qty} sold</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{formatCurrency(p.revenue)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>
            ⚠️ Stock Alerts
          </h3>
          {lowStockItems.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Stock zote ziko salama</p>
          ) : (
            lowStockItems.map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", marginBottom: 6,
                background: Number(p.quantity) <= 0 ? "var(--color-danger-light)" : "var(--color-warning-light)",
                borderRadius: "var(--radius-md)",
              }}>
                <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{p.name}</span>
                <span style={{
                  fontWeight: 700, fontSize: "0.8125rem",
                  color: Number(p.quantity) <= 0 ? "var(--color-danger)" : "var(--color-warning)",
                }}>
                  {p.quantity} {p.unit} (min: {p.min_stock})
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
