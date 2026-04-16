// src/components/worker/WorkerDashboard.jsx
// Simple dashboard for workers - today's sales only

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, getGreeting } from "../../lib/helpers";

export default function WorkerDashboard({ businessId, userId, userName }) {
  const [todaySales, setTodaySales] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) loadStats();
  }, [businessId]);

  const loadStats = async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("sales")
      .select("total_amount")
      .eq("business_id", businessId)
      .eq("sold_by", userId)
      .gte("created_at", startOfDay.toISOString());

    const total = (data || []).reduce((s, r) => s + Number(r.total_amount), 0);
    setTodaySales(total);
    setTodayCount((data || []).length);
    setLoading(false);
  };

  return (
    <div className="page-container animate-fade">
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h2 className="page-title" style={{ marginBottom: 4 }}>{getGreeting()}, {userName}!</h2>
        <p style={{ color: "var(--color-text-secondary)" }}>Karibu tena kazini</p>
      </div>

      <div className="grid-2" style={{ maxWidth: 500 }}>
        <div className="stat-card">
          <p className="stat-label">Mauzo Yako Leo</p>
          <p className="stat-value">{formatCurrency(todaySales)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Orders Leo</p>
          <p className="stat-value">{todayCount}</p>
        </div>
      </div>
    </div>
  );
}
