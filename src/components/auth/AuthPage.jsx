// src/components/auth/AuthPage.jsx
// Login & Signup page for Duka Langu

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { APP_NAME, APP_TAGLINE } from "../../lib/constants";
import "./AuthPage.css";

export default function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    business: "",
    promoCode: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (onAuth) onAuth(data);
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.name || !form.email || !form.password || !form.business) {
      setError("Tafadhali jaza taarifa zote muhimu");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password iwe angalau herufi 6");
      setLoading(false);
      return;
    }

    try {
      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authErr) throw authErr;
      const userId = authData.user.id;

      // 2. Create user profile
      const { error: userErr } = await supabase.from("users").insert([
        {
          id: userId,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          role: "office",
        },
      ]);
      if (userErr) throw userErr;

      // 3. Check promo code
      let promoId = null;
      if (form.promoCode) {
        const { data: promo } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("code", form.promoCode.toUpperCase())
          .eq("is_active", true)
          .single();

        if (promo) {
          promoId = promo.code;
          await supabase
            .from("promo_codes")
            .update({ times_used: promo.times_used + 1 })
            .eq("id", promo.id);
        }
      }

      // 4. Create business (trial auto-set by DB trigger)
      const { data: bizData, error: bizErr } = await supabase
        .from("businesses")
        .insert([
          {
            business_name: form.business,
            email: form.email,
            phone: form.phone || null,
            owner_id: userId,
            promo_code: promoId,
          },
        ])
        .select()
        .single();
      if (bizErr) throw bizErr;

      // 5. Update user with business_id
      await supabase
        .from("users")
        .update({ business_id: bizData.id })
        .eq("id", userId);

      // 6. Create default main branch
      await supabase.from("branches").insert([
        {
          business_id: bizData.id,
          branch_name: "Tawi Kuu",
          is_main: true,
        },
      ]);

      setSuccess("Account imeundwa! Unaweza login sasa.");
      setIsLogin(true);
    } catch (err) {
      setError(err.message || "Kosa limetokea, jaribu tena");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-pattern" />
      </div>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">
            <span className="logo-icon">🏪</span>
            <h1>{APP_NAME}</h1>
          </div>
          <p className="auth-tagline">{APP_TAGLINE}</p>
        </div>

        <div className="auth-card animate-fade">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? "active" : ""}`}
              onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            >
              Ingia
            </button>
            <button
              className={`auth-tab ${!isLogin ? "active" : ""}`}
              onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
            >
              Jisajili
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={isLogin ? handleLogin : handleSignup}>
            {!isLogin && (
              <>
                <div className="input-group">
                  <label className="input-label">Jina Lako</label>
                  <input
                    className="input-field"
                    name="name"
                    placeholder="Mfano: John Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Jina la Biashara</label>
                  <input
                    className="input-field"
                    name="business"
                    placeholder="Mfano: Duka la John"
                    value={form.business}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Simu</label>
                  <input
                    className="input-field"
                    name="phone"
                    placeholder="Mfano: 0712345678"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input-field"
                name="email"
                type="email"
                placeholder="barua@mfano.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input-field"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {!isLogin && (
              <div className="input-group">
                <label className="input-label">Promo Code (Hiari)</label>
                <input
                  className="input-field"
                  name="promoCode"
                  placeholder="Weka promo code kama unayo"
                  value={form.promoCode}
                  onChange={handleChange}
                />
              </div>
            )}

            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Subiri..."
                : isLogin
                ? "Ingia"
                : "Jisajili"}
            </button>
          </form>

          <p className="auth-switch" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
            {isLogin
              ? "Huna account? Jisajili hapa"
              : "Una account tayari? Ingia hapa"}
          </p>
        </div>

        <p className="auth-footer">
          &copy; {new Date().getFullYear()} {APP_NAME}. Powered with ❤️
        </p>
      </div>
    </div>
  );
}
