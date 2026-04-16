// src/components/office/Products.jsx
// Product CRUD management

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/helpers";
import { UNITS } from "../../lib/constants";
import Modal from "../shared/Modal";

const emptyProduct = {
  name: "", unit: "piece", category_id: "", buying_price: "",
  selling_price: "", quantity: "", min_stock: "5", barcode: "",
};

export default function Products({ businessId, branchId, role }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadProducts();
      loadCategories();
    }
  }, [businessId]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");
    setProducts(data || []);
    setLoading(false);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("business_id", businessId)
      .order("name");
    setCategories(data || []);
  };

  const handleSave = async () => {
    if (!form.name || !form.selling_price) return alert("Jaza jina na bei ya kuuza");
    setSaving(true);

    const payload = {
      name: form.name,
      unit: form.unit,
      category_id: form.category_id || null,
      buying_price: Number(form.buying_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      quantity: Number(form.quantity) || 0,
      min_stock: Number(form.min_stock) || 5,
      barcode: form.barcode || null,
      business_id: businessId,
      branch_id: branchId || null,
    };

    try {
      if (editId) {
        await supabase.from("products").update(payload).eq("id", editId);
      } else {
        await supabase.from("products").insert([payload]);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ ...emptyProduct });
      loadProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setForm({
      name: p.name,
      unit: p.unit,
      category_id: p.category_id || "",
      buying_price: p.buying_price,
      selling_price: p.selling_price,
      quantity: p.quantity,
      min_stock: p.min_stock,
      barcode: p.barcode || "",
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Una uhakika unataka kufuta bidhaa hii?")) return;
    await supabase.from("products").update({ is_active: false }).eq("id", id);
    loadProducts();
  };

  const handleRestock = async (product) => {
    const qty = prompt(`Ongeza stock ya "${product.name}" (sasa: ${product.quantity})`);
    if (!qty || isNaN(qty)) return;
    const newQty = Number(product.quantity) + Number(qty);
    await supabase.from("products").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", product.id);
    
    // Record stock history
    await supabase.from("stock_history").insert([{
      product_id: product.id,
      business_id: businessId,
      branch_id: branchId || null,
      change_type: "restock",
      quantity_change: Number(qty),
      quantity_before: Number(product.quantity),
      quantity_after: newQty,
      notes: "Manual restock",
    }]);
    
    loadProducts();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || "").includes(search)
  );

  const isOffice = role === "office" || role === "admin";

  return (
    <div className="page-container animate-fade">
      <div className="flex-between" style={{ marginBottom: "var(--space-lg)", flexWrap: "wrap", gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Bidhaa ({products.length})</h2>
        <div className="flex-gap">
          <input
            className="input-field"
            placeholder="Tafuta bidhaa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
          />
          {isOffice && (
            <button className="btn btn-primary" onClick={() => { setForm({ ...emptyProduct }); setEditId(null); setShowForm(true); }}>
              + Ongeza Bidhaa
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Bidhaa</th>
                <th>Kundi</th>
                <th>Kipimo</th>
                {isOffice && <th>Bei Nunua</th>}
                <th>Bei Uza</th>
                <th>Stock</th>
                <th>Min</th>
                <th>Hali</th>
                {isOffice && <th>Vitendo</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center" }}>Inapakia...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--color-text-muted)" }}>Hakuna bidhaa</td></tr>
              ) : (
                filtered.map((p, i) => {
                  const isLow = Number(p.quantity) <= Number(p.min_stock);
                  const isOut = Number(p.quantity) <= 0;
                  return (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.categories?.name || "-"}</td>
                      <td>{p.unit}</td>
                      {isOffice && <td>{formatCurrency(p.buying_price)}</td>}
                      <td style={{ fontWeight: 600 }}>{formatCurrency(p.selling_price)}</td>
                      <td style={{ fontWeight: 700, color: isOut ? "var(--color-danger)" : isLow ? "var(--color-warning)" : "var(--color-text)" }}>
                        {p.quantity}
                      </td>
                      <td>{p.min_stock}</td>
                      <td>
                        {isOut ? (
                          <span className="badge badge-danger">Imeisha</span>
                        ) : isLow ? (
                          <span className="badge badge-warning">Chini</span>
                        ) : (
                          <span className="badge badge-success">Sawa</span>
                        )}
                      </td>
                      {isOffice && (
                        <td>
                          <div className="flex-gap">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleRestock(p)}>+Stock</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(p)}>✏️</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)} style={{ color: "var(--color-danger)" }}>🗑️</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? "Hariri Bidhaa" : "Ongeza Bidhaa Mpya"}>
        <div className="input-group">
          <label className="input-label">Jina la Bidhaa *</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mfano: Mchele kg" />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label className="input-label">Kipimo</label>
            <select className="input-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Kundi</label>
            <select className="input-field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">-- Chagua --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label className="input-label">Bei ya Kununua *</label>
            <input className="input-field" type="number" min={0} value={form.buying_price} onChange={(e) => setForm({ ...form, buying_price: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Bei ya Kuuza *</label>
            <input className="input-field" type="number" min={0} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label className="input-label">Kiasi (Stock)</label>
            <input className="input-field" type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Minimum Stock</label>
            <input className="input-field" type="number" min={0} value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Barcode (Hiari)</label>
          <input className="input-field" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Barcode number" />
        </div>
        {form.buying_price && form.selling_price && (
          <div style={{ background: "var(--color-primary-50)", padding: 12, borderRadius: "var(--radius-md)", marginBottom: 16 }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-primary-dark)" }}>
              Faida kwa bidhaa: <strong>{formatCurrency(Number(form.selling_price) - Number(form.buying_price))}</strong>
            </p>
          </div>
        )}
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSave} disabled={saving}>
          {saving ? "Inahifadhi..." : editId ? "Hifadhi Mabadiliko" : "Ongeza Bidhaa"}
        </button>
      </Modal>
    </div>
  );
}
