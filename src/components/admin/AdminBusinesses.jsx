// src/components/admin/AdminBusinesses.jsx
// Admin view - list all registered businesses

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatDate, formatCurrency } from "../../lib/helpers";

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("*, users!businesses_owner_id_fkey(name, email, phone)")
      .order("created_at", { ascending: false });
    setBusinesses(data || []);
    setLoading(false);
  };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from("businesses").update({ is_active: !currentStatus }).eq("id", id);
    loadBusinesses();
  };

  const filtered = businesses.filter(
    (b) =>
      b.business_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.users?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Maduka Yote ({businesses.length})</h2>
      </div>

      <div style={{ marginBottom: "var(--space-md)" }}>
        <input
          className="input-field"
          placeholder="Tafuta duka, mmiliki, au email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Jina la Duka</th>
                <th>Mmiliki</th>
                <th>Simu</th>
                <th>Email</th>
                <th>Promo Code</th>
                <th>Tarehe Sajili</th>
                <th>Trial Inaisha</th>
                <th>Hali</th>
                <th>Kitendo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna maduka</td></tr>
              ) : (
                filtered.map((b, i) => {
                  const owner = b.users || {};
                  return (
                    <tr key={b.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{b.business_name}</td>
                      <td>{owner.name || "-"}</td>
                      <td>{owner.phone || b.phone || "-"}</td>
                      <td style={{ fontSize: "0.8125rem" }}>{b.email || owner.email || "-"}</td>
                      <td>{b.promo_code || "-"}</td>
                      <td>{formatDate(b.created_at)}</td>
                      <td>{formatDate(b.trial_ends_at)}</td>
                      <td>
                        {b.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Imezimwa</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${b.is_active ? "btn-danger" : "btn-primary"}`}
                          onClick={() => toggleActive(b.id, b.is_active)}
                        >
                          {b.is_active ? "Zima" : "Washa"}
                        </button>
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
