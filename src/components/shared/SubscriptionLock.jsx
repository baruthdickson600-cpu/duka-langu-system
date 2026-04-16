// src/components/shared/SubscriptionLock.jsx
// Lock screen when subscription expires
// - Still allows submitting payment + entering manual token
// - Auto-unlocks via realtime when admin approves

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { APP_NAME } from "../../lib/constants";
import { formatCurrency, formatDateTime } from "../../lib/helpers";

export default function SubscriptionLock({ paymentInfo, price, businessId, userId, userName, onActivated }) {
  const [tab, setTab] = useState("pay"); // 'pay' or 'token'
  const [tokenCode, setTokenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingRequest, setPendingRequest] = useState(null);

  const [form, setForm] = useState({
    transaction_id: "",
    payer_phone: "",
    payer_name: userName || "",
    amount: price || "10000",
    days_requested: 30,
    payment_method: "selcom",
  });

  // Load pending request
  useEffect(() => {
    if (!businessId) return;
    loadPending();
  }, [businessId]);

  // 🔥 REALTIME: Auto-unlock when token is approved
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`lock-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tokens",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          if (payload.new.status === "active") {
            setSuccess("🎉 Malipo yamethibitishwa! Mfumo unafunguliwa...");
            setTimeout(() => {
              if (onActivated) onActivated();
              window.location.reload();
            }, 1500);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_requests",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          if (payload.new.status === "rejected") {
            setError(`❌ Malipo yalikataliwa: ${payload.new.rejection_reason || "Wasiliana na admin"}`);
            loadPending();
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [businessId, onActivated]);

  const loadPending = async () => {
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPendingRequest(data);
  };

  const handleSubmitPayment = async () => {
    if (!form.transaction_id.trim()) return setError("Weka Transaction ID");
    if (!form.payer_phone.trim()) return setError("Weka namba yako");
    if (!form.amount || Number(form.amount) <= 0) return setError("Weka kiasi");

    setLoading(true);
    setError("");

    try {
      const { error: err } = await supabase.from("payment_requests").insert([{
        business_id: businessId,
        requested_by: userId,
        transaction_id: form.transaction_id.trim().toUpperCase(),
        payer_name: form.payer_name || null,
        payer_phone: form.payer_phone,
        amount: Number(form.amount),
        days_requested: Number(form.days_requested),
        payment_method: form.payment_method,
        status: "pending",
      }]);

      if (err) throw err;

      setSuccess("✅ Ombi limewasilishwa. Subiri admin athibitishe (kawaida dakika chache).");
      loadPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateToken = async () => {
    if (!tokenCode.trim()) return setError("Weka token code");
    setLoading(true);
    setError("");

    try {
      const { data: token, error: fetchErr } = await supabase
        .from("tokens")
        .select("*")
        .eq("token_code", tokenCode.trim().toUpperCase())
        .eq("status", "unused")
        .is("business_id", null)
        .maybeSingle();

      if (fetchErr || !token) {
        setError("Token haipo au imetumika tayari");
        setLoading(false);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + token.days_valid);

      await supabase
        .from("tokens")
        .update({
          business_id: businessId,
          status: "active",
          activated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", token.id);

      setSuccess("🎉 Token imeamilishwa!");
      setTimeout(() => {
        if (onActivated) onActivated();
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(135deg, #065A2B 0%, #0B7A3B 60%, #10A54F 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, padding: 16, overflowY: "auto",
    }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", color: "white", marginBottom: 20 }}>
          <div style={{ fontSize: "3rem", marginBottom: 8 }}>🔒</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>
            {APP_NAME} - Usajili Umeisha
          </h2>
          <p style={{ fontSize: "0.875rem", opacity: 0.85 }}>
            Lipa ili kuendelea kutumia mfumo
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "white", borderRadius: "var(--radius-xl)",
          padding: "var(--space-xl)", boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        }}>
          {/* Pending alert */}
          {pendingRequest && (
            <div style={{
              background: "var(--color-warning-light)",
              border: "1px solid var(--color-warning)",
              padding: 12, borderRadius: "var(--radius-md)",
              marginBottom: 16, fontSize: "0.875rem",
            }}>
              <p style={{ fontWeight: 700, color: "var(--color-warning)", marginBottom: 4 }}>
                ⏳ Ombi lako linasubiri
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                TxID: <strong>{pendingRequest.transaction_id}</strong><br />
                Kiasi: <strong>{formatCurrency(pendingRequest.amount)}</strong><br />
                Imetumwa: {formatDateTime(pendingRequest.created_at)}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-primary)", marginTop: 6, fontWeight: 600 }}>
                🔔 Mfumo utafunguka wenyewe admin atathibitisha
              </p>
            </div>
          )}

          {/* Payment info */}
          {paymentInfo && (
            <div style={{
              background: "var(--color-primary-50)",
              border: "2px dashed var(--color-primary)",
              padding: 14, borderRadius: "var(--radius-md)",
              marginBottom: 16, textAlign: "center",
            }}>
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: 4, fontWeight: 600, letterSpacing: "0.05em" }}>
                LIPA HAPA:
              </p>
              <p style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-primary-dark)" }}>
                {paymentInfo}
              </p>
              <p style={{ fontSize: "0.8125rem", marginTop: 6 }}>
                Kiasi: <strong>{formatCurrency(price)}</strong>
              </p>
            </div>
          )}

          {error && (
            <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>
          )}
          {success && (
            <div className="auth-success" style={{ marginBottom: 12 }}>{success}</div>
          )}

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 4, background: "var(--color-bg)",
            padding: 3, borderRadius: "var(--radius-md)", marginBottom: 16,
          }}>
            <button
              onClick={() => { setTab("pay"); setError(""); }}
              style={{
                flex: 1, padding: 10, border: "none",
                background: tab === "pay" ? "white" : "transparent",
                borderRadius: "var(--radius-sm)", cursor: "pointer",
                fontWeight: 600, fontSize: "0.8125rem",
                color: tab === "pay" ? "var(--color-primary)" : "var(--color-text-secondary)",
                boxShadow: tab === "pay" ? "var(--shadow-sm)" : "none",
              }}
            >
              💳 Nimelipa
            </button>
            <button
              onClick={() => { setTab("token"); setError(""); }}
              style={{
                flex: 1, padding: 10, border: "none",
                background: tab === "token" ? "white" : "transparent",
                borderRadius: "var(--radius-sm)", cursor: "pointer",
                fontWeight: 600, fontSize: "0.8125rem",
                color: tab === "token" ? "var(--color-primary)" : "var(--color-text-secondary)",
                boxShadow: tab === "token" ? "var(--shadow-sm)" : "none",
              }}
            >
              🔑 Nina Token
            </button>
          </div>

          {/* Payment tab */}
          {tab === "pay" && !pendingRequest && (
            <>
              <div className="input-group">
                <label className="input-label">Transaction ID (kutoka SMS) *</label>
                <input
                  className="input-field"
                  placeholder="Mfano: CGH7K3M9L2"
                  value={form.transaction_id}
                  onChange={(e) => setForm({ ...form, transaction_id: e.target.value.toUpperCase() })}
                  style={{ textTransform: "uppercase", fontFamily: "monospace", fontWeight: 600 }}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Namba Uliyotumia Kulipa *</label>
                <input
                  className="input-field"
                  placeholder="07xxxxxxxx"
                  value={form.payer_phone}
                  onChange={(e) => setForm({ ...form, payer_phone: e.target.value })}
                />
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Kiasi (TZS) *</label>
                  <input
                    className="input-field"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Siku</label>
                  <select
                    className="input-field"
                    value={form.days_requested}
                    onChange={(e) => setForm({ ...form, days_requested: Number(e.target.value) })}
                  >
                    <option value={7}>7</option>
                    <option value={30}>30</option>
                    <option value={90}>90</option>
                    <option value={180}>180</option>
                    <option value={365}>365</option>
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
                </select>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: 14 }}
                onClick={handleSubmitPayment}
                disabled={loading}
              >
                {loading ? "Inawasilisha..." : "✅ Wasilisha Malipo"}
              </button>
            </>
          )}

          {/* Token tab */}
          {tab === "token" && (
            <>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: 12 }}>
                Kama una token kutoka admin, weka hapa chini:
              </p>
              <div className="input-group">
                <input
                  className="input-field"
                  placeholder="DL-XXXX-XXXX"
                  value={tokenCode}
                  onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, fontFamily: "monospace" }}
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: 14 }}
                onClick={handleActivateToken}
                disabled={loading}
              >
                {loading ? "..." : "🔓 Fungua Mfumo"}
              </button>
            </>
          )}

          {/* Logout link */}
          <p
            style={{ textAlign: "center", marginTop: 16, fontSize: "0.75rem", color: "var(--color-text-muted)", cursor: "pointer" }}
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
          >
            Toka Mfumoni
          </p>
        </div>
      </div>
    </div>
  );
}
