// src/components/office/PaymentRequest.jsx
// Office submits payment + tracks its status

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDateTime } from "../../lib/helpers";
import Modal from "../shared/Modal";

export default function PaymentRequest({ businessId, userId, userProfile, onApproved }) {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState("");
  const [price, setPrice] = useState("10000");
  const [form, setForm] = useState({
    transaction_id: "",
    payer_name: "",
    payer_phone: "",
    amount: "",
    days_requested: 30,
    payment_method: "selcom",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (businessId) loadData();
  }, [businessId]);

  // 🔥 REALTIME: Listen for status changes on this business's requests
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`payments-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_requests",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log("Payment status changed:", payload);
          loadData();

          if (payload.new.status === "approved") {
            setSuccess("🎉 Malipo yamethibitishwa! Mfumo unafunguliwa...");
            if (onApproved) onApproved();
            // Force reload after 2 seconds to refresh full state
            setTimeout(() => window.location.reload(), 2000);
          } else if (payload.new.status === "rejected") {
            setError(`Malipo yamekataliwa: ${payload.new.rejection_reason || "Wasiliana na admin"}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, onApproved]);

  const loadData = async () => {
    const [settingsRes, priceRes, requestsRes] = await Promise.all([
      supabase.from("system_settings").select("*").eq("setting_key", "payment_info").maybeSingle(),
      supabase.from("system_settings").select("*").eq("setting_key", "subscription_price").maybeSingle(),
      supabase
        .from("payment_requests")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (settingsRes.data) setPaymentInfo(settingsRes.data.setting_value);
    if (priceRes.data) {
      setPrice(priceRes.data.setting_value);
      setForm((f) => ({ ...f, amount: priceRes.data.setting_value }));
    }
    setRequests(requestsRes.data || []);
  };

  const handleSubmit = async () => {
    if (!form.transaction_id.trim()) {
      setError("Weka Transaction ID kutoka kwa SMS ya malipo");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Weka kiasi ulicholipa");
      return;
    }
    if (!form.payer_phone.trim()) {
      setError("Weka namba uliyotumia kulipa");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { error: insertErr } = await supabase.from("payment_requests").insert([
        {
          business_id: businessId,
          requested_by: userId,
          transaction_id: form.transaction_id.trim().toUpperCase(),
          payer_name: form.payer_name || userProfile?.name || null,
          payer_phone: form.payer_phone,
          amount: Number(form.amount),
          days_requested: Number(form.days_requested),
          payment_method: form.payment_method,
          status: "pending",
        },
      ]);

      if (insertErr) throw insertErr;

      setSuccess("Ombi la malipo limewasilishwa. Subiri admin athibitishe.");
      setShowForm(false);
      setForm({
        transaction_id: "",
        payer_name: "",
        payer_phone: "",
        amount: price,
        days_requested: 30,
        payment_method: "selcom",
      });
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequest = requests.find((r) => r.status === "pending");

  return (
    <div className="page-container animate-fade">
      <h2 className="page-title">Malipo ya Usajili</h2>

      {error && <div className="auth-error" style={{ marginBottom: 16, maxWidth: 600 }}>{error}</div>}
      {success && <div className="auth-success" style={{ marginBottom: 16, maxWidth: 600 }}>{success}</div>}

      {/* Payment Instructions */}
      <div className="card" style={{ marginBottom: "var(--space-lg)", maxWidth: 700 }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12, color: "var(--color-primary)" }}>
          📱 Hatua za Malipo
        </h3>

        <div style={{
          background: "var(--color-primary-50)",
          border: "2px dashed var(--color-primary)",
          padding: 16,
          borderRadius: "var(--radius-lg)",
          marginBottom: 16,
        }}>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 4 }}>
            LIPA KUPITIA:
          </p>
          <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-primary-dark)", marginBottom: 8 }}>
            {paymentInfo || "Wasiliana na admin"}
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            Kiasi: <strong>{formatCurrency(price)}</strong> (siku 30)
          </p>
        </div>

        <ol style={{ paddingLeft: 20, fontSize: "0.875rem", lineHeight: 1.8 }}>
          <li>Piga <strong>*150*00#</strong> kwenye simu yako</li>
          <li>Chagua <strong>Tuma Pesa</strong> → <strong>Kwa namba</strong></li>
          <li>Weka namba ya malipo hapo juu</li>
          <li>Weka kiasi: <strong>{formatCurrency(price)}</strong></li>
          <li>Thibitisha na PIN yako</li>
          <li>Nakili <strong>Transaction ID</strong> kutoka SMS ya uthibitisho</li>
          <li>Bonyeza <strong>"Nimelipa"</strong> hapo chini na uweke Transaction ID</li>
        </ol>
      </div>

      {/* Pending Request Status */}
      {pendingRequest && (
        <div className="card" style={{
          maxWidth: 700,
          marginBottom: "var(--space-lg)",
          borderLeft: "4px solid var(--color-warning)",
          background: "var(--color-warning-light)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "var(--color-warning)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.25rem",
              animation: "spin 2s linear infinite",
            }}>⏳</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: "var(--color-warning)" }}>
                Ombi lako linasubiri uthibitisho
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                TxID: <strong style={{ fontFamily: "monospace" }}>{pendingRequest.transaction_id}</strong> •
                Kiasi: <strong>{formatCurrency(pendingRequest.amount)}</strong> •
                Imetumwa: {formatDateTime(pendingRequest.created_at)}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
                🔔 Mfumo utafunguka wenyewe mara admin atathibitisha
              </p>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Submit Payment Button */}
      {!pendingRequest && (
        <button
          className="btn btn-primary"
          style={{ fontSize: "1rem", padding: "14px 28px", marginBottom: "var(--space-lg)" }}
          onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}
        >
          ✅ Nimelipa - Wasilisha Taarifa
        </button>
      )}

      {/* Payment History */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "var(--space-md) var(--space-lg)" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Historia ya Malipo</h3>
        </div>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Tarehe</th>
                <th>Transaction ID</th>
                <th>Simu</th>
                <th>Kiasi</th>
                <th>Siku</th>
                <th>Hali</th>
                <th>Thibitishwa</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 30 }}>
                    Hakuna historia ya malipo bado
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateTime(r.created_at)}</td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{r.transaction_id}</td>
                    <td>{r.payer_phone}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</td>
                    <td>{r.days_requested} siku</td>
                    <td>
                      {r.status === "approved" ? (
                        <span className="badge badge-success">✅ Imethibitishwa</span>
                      ) : r.status === "rejected" ? (
                        <span className="badge badge-danger">❌ Imekataliwa</span>
                      ) : (
                        <span className="badge badge-warning">⏳ Inasubiri</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                      {r.approved_at ? formatDateTime(r.approved_at) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Payment Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Wasilisha Taarifa za Malipo">
        <div style={{
          background: "var(--color-info-light)", padding: 12,
          borderRadius: "var(--radius-md)", marginBottom: 16,
          fontSize: "0.8125rem", color: "var(--color-info)",
        }}>
          💡 <strong>Kumbuka:</strong> Transaction ID unaipata kwenye SMS ya uthibitisho wa malipo kutoka kwa Selcom/M-Pesa
        </div>

        <div className="input-group">
          <label className="input-label">Transaction ID * (kutoka SMS)</label>
          <input
            className="input-field"
            value={form.transaction_id}
            onChange={(e) => setForm({ ...form, transaction_id: e.target.value.toUpperCase() })}
            placeholder="Mfano: CGH7K3M9L2"
            style={{ textTransform: "uppercase", fontFamily: "monospace", fontWeight: 600 }}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Namba Uliyotumia Kulipa *</label>
          <input
            className="input-field"
            value={form.payer_phone}
            onChange={(e) => setForm({ ...form, payer_phone: e.target.value })}
            placeholder="Mfano: 0712345678"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Jina Lako</label>
          <input
            className="input-field"
            value={form.payer_name}
            onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
            placeholder="Jina kamili"
          />
        </div>

        <div className="grid-2">
          <div className="input-group">
            <label className="input-label">Kiasi Ulicholipa (TZS) *</label>
            <input
              className="input-field"
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Siku Unaomba</label>
            <select
              className="input-field"
              value={form.days_requested}
              onChange={(e) => setForm({ ...form, days_requested: Number(e.target.value) })}
            >
              <option value={7}>Siku 7</option>
              <option value={14}>Siku 14</option>
              <option value={30}>Siku 30 (mwezi)</option>
              <option value={60}>Siku 60</option>
              <option value={90}>Siku 90</option>
              <option value={180}>Siku 180 (miezi 6)</option>
              <option value={365}>Siku 365 (mwaka)</option>
            </select>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Njia ya Malipo</label>
          <select
            className="input-field"
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
          >
            <option value="selcom">SELCOM</option>
            <option value="mpesa">M-Pesa</option>
            <option value="tigopesa">Tigo Pesa</option>
            <option value="airtel">Airtel Money</option>
            <option value="halopesa">HaloPesa</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: "100%", padding: 14 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Inawasilisha..." : "✅ Wasilisha Malipo"}
        </button>
      </Modal>
    </div>
  );
}
