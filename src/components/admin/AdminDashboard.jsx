// src/components/admin/AdminDashboard.jsx
// Admin main dashboard - overview of all businesses

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDate } from "../../lib/helpers";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ businesses: 0, activeTokens: 0, totalRevenue: 0, agents: 0 });
  const [recentBiz, setRecentBiz] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bizRes, tokenRes, promoRes] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact" }),
        supabase.from("tokens").select("*").eq("status", "active"),
        supabase.from("promo_codes").select("*", { count: "exact" }),
      ]);

      const totalRev = (tokenRes.data || []).reduce((s, t) => s + Number(t.price || 0), 0);

      setStats({
        businesses: bizRes.count || 0,
        activeTokens: (tokenRes.data || []).length,
        totalRevenue: totalRev,
        agents: promoRes.count || 0,
      });

      // Recent businesses
      const { data: recent } = await supabase
        .from("businesses")
        .select("*, users!businesses_owner_id_fkey(name, email, phone)")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentBiz(recent || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container"><p>Inapakia...</p></div>;

  return (
    <div className="page-container animate-fade">
      <h2 className="page-title">Admin Dashboard</h2>

      <div className="grid-4" style={{ marginBottom: "var(--space-xl)" }}>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Maduka Yote</p>
              <p className="stat-value">{stats.businesses}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-primary-50)", color: "var(--color-primary)" }}>🏪</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Tokens Hai</p>
              <p className="stat-value">{stats.activeTokens}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-info-light)", color: "var(--color-info)" }}>🔑</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Mapato Token</p>
              <p className="stat-value" style={{ fontSize: "1.25rem" }}>{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-success-light)", color: "var(--color-success)" }}>💰</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex-between">
            <div>
              <p className="stat-label">Wakala</p>
              <p className="stat-value">{stats.agents}</p>
            </div>
            <div className="stat-icon" style={{ background: "var(--color-warning-light)", color: "var(--color-warning)" }}>🎫</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>
          Maduka Yaliyojisajili Hivi Karibuni
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Duka</th>
                <th>Mmiliki</th>
                <th>Simu</th>
                <th>Email</th>
                <th>Promo</th>
                <th>Trial Inaisha</th>
                <th>Hali</th>
              </tr>
            </thead>
            <tbody>
              {recentBiz.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna maduka bado</td></tr>
              ) : (
                recentBiz.map((b) => {
                  const owner = b.users || {};
                  const trialDays = b.trial_ends_at
                    ? Math.max(0, Math.ceil((new Date(b.trial_ends_at) - new Date()) / 86400000))
                    : 0;
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.business_name}</td>
                      <td>{owner.name || "-"}</td>
                      <td>{owner.phone || b.phone || "-"}</td>
                      <td>{b.email || owner.email || "-"}</td>
                      <td>{b.promo_code || <span style={{ color: "var(--color-text-muted)" }}>-</span>}</td>
                      <td>{formatDate(b.trial_ends_at)}</td>
                      <td>
                        {trialDays > 0 ? (
                          <span className="badge badge-warning">Trial ({trialDays}d)</span>
                        ) : b.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Expired</span>
                        )}
                      </td>
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
