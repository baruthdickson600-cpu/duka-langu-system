// src/components/office/TokenPage.jsx
// Office - view subscription status, activate token

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatDate, daysRemaining } from "../../lib/helpers";

export default function TokenPage({ businessId }) {
  const [tokens, setTokens] = useState([]);
  const [tokenCode, setTokenCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) loadData();
  }, [businessId]);

  const loadData = async () => {
    const [tokenRes, settingsRes, priceRes] = await Promise.all([
      supabase.from("tokens").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("system_settings").select("*").eq("setting_key", "payment_info").single(),
      supabase.from("system_settings").select("*").eq("setting_key", "subscription_price").single(),
    ]);
    setTokens(tokenRes.data || []);
    setPaymentInfo(settingsRes.data?.setting_value || "");
    setPrice(priceRes.data?.setting_value || "");
    setLoading(false);
  };

  const handleActivate = async () => {
    if (!tokenCode.trim()) return setError("Weka token code");
    setActivating(true);
    setError("");

    try {
      const { data: token, error: fetchErr } = await supabase
        .from("tokens")
        .select("*")
        .eq("token_code", tokenCode.trim().toUpperCase())
        .eq("status", "unused")
        .is("business_id", null)
        .single();

      if (fetchErr || !token) {
        setError("Token haipo au imetumika tayari");
        setActivating(false);
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

      setSuccess("Token imeamilishwa!");
      setTokenCode("");
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActivating(false);
    }
  };

  const activeToken = tokens.find((t) => t.status === "active" && daysRemaining(t.expires_at) > 0);

  return (
    <div className="page-container animate-fade">
      <h2 className="page-title">Usajili / Token</h2>

      <div className="grid-2" style={{ marginBottom: "var(--space-xl)" }}>
        {/* Current status */}
        <div className="card" style={{ borderTop: `4px solid ${activeToken ? "var(--color-success)" : "var(--color-danger)"}` }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>Hali ya Usajili</h3>
          {activeToken ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: "2rem" }}>✅</span>
                <div>
                  <p style={{ fontWeight: 700, color: "var(--color-success)" }}>Mfumo Umefunguliwa</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                    Siku {daysRemaining(activeToken.expires_at)} zimebaki
                  </p>
                </div>
              </div>
              <p style={{ fontSize: "0.8125rem" }}>Inaisha: {formatDate(activeToken.expires_at)}</p>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "2rem" }}>🔒</span>
              <div>
                <p style={{ fontWeight: 700, color: "var(--color-danger)" }}>Usajili Umeisha</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Weka token kufungua mfumo</p>
              </div>
            </div>
          )}
        </div>

        {/* Activate token */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>Weka Token</h3>

          {paymentInfo && (
            <div style={{
              background: "var(--color-primary-50)", padding: 12, borderRadius: "var(--radius-md)",
              marginBottom: 16, border: "1px dashed var(--color-primary)",
            }}>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 4 }}>Lipa kupitia:</p>
              <p style={{ fontWeight: 700, color: "var(--color-primary-dark)" }}>{paymentInfo}</p>
              {price && <p style={{ fontSize: "0.8125rem", marginTop: 4 }}>Bei: {formatCurrency(price)}</p>}
            </div>
          )}

          {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
          {success && <div className="auth-success" style={{ marginBottom: 12 }}>{success}</div>}

          <div className="input-group">
            <input
              className="input-field"
              placeholder="Weka Token Code (Mfano: DL-ABCD-1234)"
              value={tokenCode}
              onChange={(e) => { setTokenCode(e.target.value.toUpperCase()); setError(""); }}
              style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleActivate} disabled={activating}>
            {activating ? "Inaamilisha..." : "Amilisha Token"}
          </button>
        </div>
      </div>

      {/* Token history */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "var(--space-md) var(--space-lg)" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Historia ya Token</h3>
        </div>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Siku</th>
                <th>Hali</th>
                <th>Imeamilishwa</th>
                <th>Inaisha</th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna tokens</td></tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{t.token_code}</td>
                    <td>{t.days_valid} siku</td>
                    <td>
                      <span className={`badge ${t.status === "active" ? "badge-success" : t.status === "expired" ? "badge-danger" : "badge-info"}`}>
                        {t.status === "active" ? "Inatumika" : t.status === "expired" ? "Imeisha" : "Haijatumika"}
                      </span>
                    </td>
                    <td>{formatDate(t.activated_at)}</td>
                    <td>{formatDate(t.expires_at)}</td>
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
