// src/components/admin/AdminPayments.jsx
// Admin reviews and approves/rejects payment requests

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDateTime } from "../../lib/helpers";
import Modal from "../shared/Modal";

export default function AdminPayments({ userId }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  // 🔥 REALTIME: Listen for new payment requests
  useEffect(() => {
    const channel = supabase
      .channel("admin-payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_requests" },
        () => loadRequests()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    let query = supabase
      .from("payment_requests")
      .select("*, businesses(business_name, phone, email), users!payment_requests_requested_by_fkey(name, phone)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  };

  const handleApprove = async (req) => {
    if (!window.confirm(`Thibitisha malipo ya ${req.businesses?.business_name}?\n\nKiasi: ${formatCurrency(req.amount)}\nTxID: ${req.transaction_id}\n\nMfumo wake utafunguka mara moja.`)) return;

    setProcessing(true);
    try {
      // Just update status to 'approved' - trigger will do the rest (create token, activate, notify)
      const { error } = await supabase
        .from("payment_requests")
        .update({
          status: "approved",
          approved_by: userId,
        })
        .eq("id", req.id);

      if (error) throw error;

      alert(`✅ Imethibitishwa! Mfumo wa ${req.businesses?.business_name} umefunguliwa.`);
      loadRequests();
    } catch (err) {
      alert("Kosa: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      alert("Weka sababu ya kukataa");
      return;
    }

    setProcessing(true);
    try {
      await supabase
        .from("payment_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectReason,
          approved_by: userId,
        })
        .eq("id", selected.id);

      setShowReject(false);
      setRejectReason("");
      setSelected(null);
      loadRequests();
    } catch (err) {
      alert("Kosa: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>
          Malipo ya Wateja
          {filter === "pending" && counts.pending > 0 && (
            <span style={{
              marginLeft: 10, padding: "4px 10px",
              background: "var(--color-danger)", color: "white",
              borderRadius: "var(--radius-full)", fontSize: "0.75rem",
              animation: "pulse 2s infinite",
            }}>
              {counts.pending} mpya
            </span>
          )}
        </h2>
        <div className="flex-gap" style={{ flexWrap: "wrap" }}>
          <button
            className={`btn btn-sm ${filter === "pending" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter("pending")}
          >
            ⏳ Zinasubiri
          </button>
          <button
            className={`btn btn-sm ${filter === "approved" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter("approved")}
          >
            ✅ Zilizothibitishwa
          </button>
          <button
            className={`btn btn-sm ${filter === "rejected" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter("rejected")}
          >
            ❌ Zilizokataliwa
          </button>
          <button
            className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter("all")}
          >
            Zote
          </button>
        </div>
      </div>

      {/* Instructions card */}
      <div className="card" style={{
        marginBottom: "var(--space-lg)",
        background: "var(--color-info-light)",
        borderLeft: "4px solid var(--color-info)",
      }}>
        <p style={{ fontSize: "0.875rem", color: "var(--color-info)" }}>
          💡 <strong>Jinsi ya kuthibitisha:</strong> Angalia SMS yako ya SELCOM/M-Pesa, linganisha Transaction ID, kiasi,
          na namba ya mtumaji. Kama yanafanana → bonyeza "Thibitisha". Mfumo wa mtumiaji utafunguka wenyewe mara moja! ⚡
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Tarehe</th>
                <th>Duka</th>
                <th>Mmiliki</th>
                <th>Simu</th>
                <th>Transaction ID</th>
                <th>Njia</th>
                <th>Kiasi</th>
                <th>Siku</th>
                <th>Hali</th>
                <th>Kitendo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 40 }}>
                    {filter === "pending"
                      ? "🎉 Hakuna malipo mapya ya kuthibitisha"
                      : "Hakuna data"}
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: "0.8125rem" }}>{formatDateTime(r.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{r.businesses?.business_name || "-"}</td>
                    <td>{r.payer_name || r.users?.name || "-"}</td>
                    <td style={{ fontFamily: "monospace" }}>{r.payer_phone}</td>
                    <td style={{
                      fontFamily: "monospace", fontWeight: 700,
                      background: "var(--color-primary-50)", padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                    }}>
                      {r.transaction_id}
                    </td>
                    <td><span className="badge badge-info">{r.payment_method}</span></td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</td>
                    <td>{r.days_requested}</td>
                    <td>
                      {r.status === "approved" ? (
                        <span className="badge badge-success">Imethibitishwa</span>
                      ) : r.status === "rejected" ? (
                        <span className="badge badge-danger">Imekataliwa</span>
                      ) : (
                        <span className="badge badge-warning">Inasubiri</span>
                      )}
                    </td>
                    <td>
                      {r.status === "pending" ? (
                        <div className="flex-gap">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(r)}
                            disabled={processing}
                          >
                            ✅ Thibitisha
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { setSelected(r); setShowReject(true); }}
                            disabled={processing}
                          >
                            ❌
                          </button>
                        </div>
                      ) : r.rejection_reason ? (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }} title={r.rejection_reason}>
                          {r.rejection_reason.slice(0, 20)}...
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject modal */}
      <Modal
        isOpen={showReject}
        onClose={() => { setShowReject(false); setRejectReason(""); setSelected(null); }}
        title="Kataa Ombi la Malipo"
      >
        {selected && (
          <>
            <div style={{ background: "var(--color-bg)", padding: 12, borderRadius: "var(--radius-md)", marginBottom: 16 }}>
              <p style={{ fontSize: "0.8125rem" }}>
                <strong>Duka:</strong> {selected.businesses?.business_name}<br />
                <strong>TxID:</strong> <span style={{ fontFamily: "monospace" }}>{selected.transaction_id}</span><br />
                <strong>Kiasi:</strong> {formatCurrency(selected.amount)}<br />
                <strong>Simu:</strong> {selected.payer_phone}
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Sababu ya Kukataa *</label>
              <textarea
                className="input-field"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Mfano: Transaction ID haipatikani kwenye SMS zangu, au kiasi kipo chini ya bei..."
                style={{ resize: "vertical" }}
              />
            </div>

            <button
              className="btn btn-danger"
              style={{ width: "100%" }}
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? "Inachakata..." : "Kataa Malipo"}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
