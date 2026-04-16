// src/components/admin/AdminSettings.jsx
// Admin settings - change price, trial days, payment info

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    subscription_price: "10000",
    trial_days: "5",
    payment_info: "",
    currency: "TZS",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("system_settings").select("*");
    if (data) {
      const obj = {};
      data.forEach((s) => (obj[s.setting_key] = s.setting_value));
      setSettings((prev) => ({ ...prev, ...obj }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from("system_settings")
          .upsert({ setting_key: key, setting_value: String(value), updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Kosa: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-container"><p>Inapakia...</p></div>;

  return (
    <div className="page-container animate-fade">
      <h2 className="page-title">Mipangilio ya Mfumo</h2>

      <div className="card" style={{ maxWidth: 600 }}>
        {saved && <div className="auth-success" style={{ marginBottom: 16 }}>Mipangilio imehifadhiwa!</div>}

        <div className="input-group">
          <label className="input-label">Bei ya Usajili (TZS)</label>
          <input
            className="input-field"
            type="number"
            value={settings.subscription_price}
            onChange={(e) => setSettings({ ...settings, subscription_price: e.target.value })}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            Bei hii itaonyeshwa kwa office wanaojisajili
          </p>
        </div>

        <div className="input-group">
          <label className="input-label">Siku za Majaribio Bure (Trial Days)</label>
          <input
            className="input-field"
            type="number"
            min={0}
            max={365}
            value={settings.trial_days}
            onChange={(e) => setSettings({ ...settings, trial_days: e.target.value })}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            Office mpya atapata siku hizi za bure anapojisajili
          </p>
        </div>

        <div className="input-group">
          <label className="input-label">Taarifa za Malipo</label>
          <textarea
            className="input-field"
            rows={3}
            value={settings.payment_info}
            onChange={(e) => setSettings({ ...settings, payment_info: e.target.value })}
            placeholder="Mfano: SELECOM > 6113 4066 jina BARUTH DICKSON THEO"
            style={{ resize: "vertical" }}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            Taarifa hii itaonyeshwa kwa office wanapohitaji kulipa
          </p>
        </div>

        <div className="input-group">
          <label className="input-label">Sarafu</label>
          <select
            className="input-field"
            value={settings.currency}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
          >
            <option value="TZS">TZS - Tanzania Shilling</option>
            <option value="KES">KES - Kenya Shilling</option>
            <option value="UGX">UGX - Uganda Shilling</option>
            <option value="USD">USD - US Dollar</option>
          </select>
        </div>

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={handleSave} disabled={saving}>
          {saving ? "Inahifadhi..." : "Hifadhi Mipangilio"}
        </button>
      </div>
    </div>
  );
}
