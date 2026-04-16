// src/components/office/Sales.jsx
// POS Sales interface - select products, create sale, print receipt

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/helpers";
import { PAYMENT_METHODS } from "../../lib/constants";
import Modal from "../shared/Modal";

export default function Sales({ businessId, branchId, userId, businessName }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  useEffect(() => {
    if (businessId) loadProducts();
  }, [businessId]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .gt("quantity", 0)
      .order("name");
    setProducts(data || []);
    setLoading(false);
  };

  const addToCart = (product) => {
    const existing = cart.find((c) => c.product_id === product.id);
    if (existing) {
      if (existing.quantity >= Number(product.quantity)) {
        alert(`Stock ya "${product.name}" ni ${product.quantity} tu`);
        return;
      }
      setCart(cart.map((c) =>
        c.product_id === product.id
          ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price }
          : c
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        unit_price: Number(product.selling_price),
        buying_price: Number(product.buying_price),
        quantity: 1,
        total: Number(product.selling_price),
        max_qty: Number(product.quantity),
        unit: product.unit,
      }]);
    }
    setSearch("");
    if (searchRef.current) searchRef.current.focus();
  };

  const updateQty = (productId, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter((c) => c.product_id !== productId));
      return;
    }
    const item = cart.find((c) => c.product_id === productId);
    if (newQty > item.max_qty) {
      alert(`Stock ya "${item.product_name}" ni ${item.max_qty} tu`);
      return;
    }
    setCart(cart.map((c) =>
      c.product_id === productId
        ? { ...c, quantity: newQty, total: newQty * c.unit_price }
        : c
    ));
  };

  const removeItem = (productId) => {
    setCart(cart.filter((c) => c.product_id !== productId));
  };

  const cartTotal = cart.reduce((s, c) => s + c.total, 0);
  const cartProfit = cart.reduce((s, c) => s + (c.unit_price - c.buying_price) * c.quantity, 0);

  const handleSale = async () => {
    if (cart.length === 0) return alert("Hakuna bidhaa kwenye kikapu");
    setProcessing(true);

    try {
      // Create sale
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert([{
          business_id: businessId,
          branch_id: branchId || null,
          sold_by: userId,
          customer_name: customerName || null,
          total_amount: cartTotal,
          total_profit: cartProfit,
          payment_method: payMethod,
          status: "completed",
        }])
        .select()
        .single();

      if (saleErr) throw saleErr;

      // Create sale items (triggers stock update)
      const items = cart.map((c) => ({
        sale_id: sale.id,
        product_id: c.product_id,
        product_name: c.product_name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        buying_price: c.buying_price,
        total_price: c.total,
        profit: (c.unit_price - c.buying_price) * c.quantity,
      }));

      await supabase.from("sale_items").insert(items);

      // Show receipt
      setReceipt({
        ...sale,
        items: cart,
        businessName,
      });
      setShowReceipt(true);
      setCart([]);
      setCustomerName("");
      loadProducts();
    } catch (err) {
      alert("Kosa: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    const w = window.open("", "_blank", "width=300,height=600");
    if (!w || !receipt) return;
    const html = `
      <html><head><style>
        body { font-family: monospace; font-size: 12px; width: 270px; margin: 0 auto; padding: 10px; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
      </style></head><body>
        <div class="center"><h2>${receipt.businessName || "Duka Langu"}</h2></div>
        <div class="center">${new Date(receipt.created_at).toLocaleString()}</div>
        <div class="center">Receipt: ${receipt.receipt_number || "-"}</div>
        ${receipt.customer_name ? `<div class="center">Mteja: ${receipt.customer_name}</div>` : ""}
        <div class="line"></div>
        <table>
          <tr class="bold"><td>Bidhaa</td><td class="right">Qty</td><td class="right">Jumla</td></tr>
          ${receipt.items.map((i) => `<tr><td>${i.product_name}</td><td class="right">${i.quantity}</td><td class="right">${formatCurrency(i.total)}</td></tr>`).join("")}
        </table>
        <div class="line"></div>
        <div class="bold" style="display:flex;justify-content:space-between;font-size:14px;">
          <span>JUMLA:</span><span>${formatCurrency(receipt.total_amount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Malipo:</span><span>${receipt.payment_method}</span>
        </div>
        <div class="line"></div>
        <div class="center" style="margin-top:10px;">Asante kwa kununua!</div>
        <div class="center" style="font-size:10px;margin-top:5px;">Powered by Duka Langu</div>
        <script>window.print();</script>
      </body></html>
    `;
    w.document.write(html);
    w.document.close();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || "").includes(search)
  );

  return (
    <div className="page-container animate-fade">
      <h2 className="page-title">Mauzo</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--space-lg)" }}>
        {/* Product selection */}
        <div>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <input
              ref={searchRef}
              className="input-field"
              placeholder="🔍 Tafuta bidhaa au scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "var(--space-sm)",
            maxHeight: "calc(100vh - 250px)",
            overflowY: "auto",
            paddingRight: 4,
          }}>
            {loading ? (
              <p>Inapakia bidhaa...</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", gridColumn: "1/-1", textAlign: "center", padding: 40 }}>
                {search ? "Hakuna bidhaa inayofanana" : "Hakuna bidhaa"}
              </p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  style={{
                    background: "white", border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)", padding: 12, cursor: "pointer",
                    textAlign: "left", transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--color-primary)"}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                >
                  <p style={{ fontWeight: 700, fontSize: "0.8125rem", marginBottom: 4 }}>{p.name}</p>
                  <p style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: "0.875rem" }}>{formatCurrency(p.selling_price)}</p>
                  <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: 4 }}>
                    Stock: {p.quantity} {p.unit}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="card" style={{ position: "sticky", top: "calc(var(--header-height) + 24px)", height: "fit-content" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>
            🛒 Kikapu ({cart.length})
          </h3>

          {cart.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 20, fontSize: "0.875rem" }}>
              Chagua bidhaa kuongeza
            </p>
          ) : (
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
              {cart.map((item) => (
                <div key={item.product_id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid var(--color-border-light)",
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{item.product_name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>@ {formatCurrency(item.unit_price)}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
                    <span style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</button>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", minWidth: 80, textAlign: "right" }}>
                    {formatCurrency(item.total)}
                  </p>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.product_id)} style={{ color: "var(--color-danger)", marginLeft: 4 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <>
              <div style={{ background: "var(--color-bg)", padding: 12, borderRadius: "var(--radius-md)", marginBottom: 12 }}>
                <div className="flex-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Jumla</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-primary)" }}>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Mteja (Hiari)</label>
                <input className="input-field" placeholder="Jina la mteja" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>

              <div className="input-group">
                <label className="input-label">Malipo</label>
                <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", padding: 14, fontSize: "1rem" }}
                onClick={handleSale}
                disabled={processing}
              >
                {processing ? "Inaprocess..." : `Uza - ${formatCurrency(cartTotal)}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="Risiti">
        {receipt && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, color: "var(--color-primary)" }}>{receipt.businessName}</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                {new Date(receipt.created_at).toLocaleString()}
              </p>
              <p style={{ fontSize: "0.8125rem", fontFamily: "monospace" }}>#{receipt.receipt_number}</p>
            </div>

            <div style={{ borderTop: "2px dashed var(--color-border)", borderBottom: "2px dashed var(--color-border)", padding: "12px 0", margin: "12px 0" }}>
              {receipt.items.map((item, i) => (
                <div key={i} className="flex-between" style={{ padding: "4px 0" }}>
                  <span style={{ fontSize: "0.8125rem" }}>{item.product_name} x{item.quantity}</span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="flex-between" style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: 16 }}>
              <span>JUMLA</span>
              <span style={{ color: "var(--color-primary)" }}>{formatCurrency(receipt.total_amount)}</span>
            </div>

            <div className="flex-gap" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={printReceipt}>🖨️ Print</button>
              <button className="btn btn-secondary" onClick={() => setShowReceipt(false)}>Funga</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 900px) {
          .page-container > div:first-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
