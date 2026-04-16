// src/components/office/OfficeSettings.jsx

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function OfficeSettings({ businessId, userId, userProfile, business, onUpdate }) {
  const [bizForm, setBizForm] = useState({ business_name: "", email: "", phone: "", address: "" });
  const [userForm, setUserForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business) {
      setBizForm({
        business_name: business.business_name || "",
        email: business.email || "",
        phone: business.phone || "",
        address: business.address || "",
      });
    }
    if (userProfile) {
      setUserForm({ name: userProfile.name || "", phone: userProfile.phone || "" });
    }
  }, [business, userProfile]);

  const handleSaveBiz = async () => {
    setSaving(true);
    await supabase.from("businesses").update(bizForm).eq("id", businessId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    if (onUpdate) onUpdate();
    setSaving(false);
  };

  const handleSaveUser = async () => {
    setSaving(true);
    await supabase.from("users").update(userForm).eq("id", userId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    if (onUpdate) onUpdate();
    setSaving(false);
  };

  return (
    <div className="page-container animate-fade">
      <h2 className="page-title">Mipangilio</h2>

      {saved && <div className="auth-success" style={{ marginBottom: 16, maxWidth: 500 }}>Imehifadhiwa!</div>}

      <div className="grid-2">
        {/* Business info */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>Taarifa za Biashara</h3>
          <div className="input-group">
            <label className="input-label">Jina la Biashara</label>
            <input className="input-field" value={bizForm.business_name} onChange={(e) => setBizForm({ ...bizForm, business_name: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input-field" value={bizForm.email} onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Simu</label>
            <input className="input-field" value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Anwani</label>
            <input className="input-field" value={bizForm.address} onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSaveBiz} disabled={saving}>
            {saving ? "..." : "Hifadhi"}
          </button>
        </div>

        {/* User info */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>Taarifa Zako</h3>
          <div className="input-group">
            <label className="input-label">Jina</label>
            <input className="input-field" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Simu</label>
            <input className="input-field" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSaveUser} disabled={saving}>
            {saving ? "..." : "Hifadhi"}
          </button>
        </div>
      </div>
    </div>
  );
}
