// src/components/layout/Sidebar.jsx
// Main sidebar navigation

import { APP_NAME } from "../../lib/constants";
import "./Sidebar.css";

const ADMIN_MENU = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "businesses", icon: "🏪", label: "Maduka Yote" },
  { key: "payments", icon: "💰", label: "Malipo", highlight: true },
  { key: "tokens", icon: "🔑", label: "Tokens" },
  { key: "promo", icon: "🎫", label: "Promo Codes" },
  { key: "settings", icon: "⚙️", label: "Mipangilio" },
];

const OFFICE_MENU = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "sales", icon: "🛒", label: "Mauzo" },
  { key: "products", icon: "📦", label: "Bidhaa" },
  { key: "categories", icon: "🏷️", label: "Makundi" },
  { key: "expenses", icon: "💸", label: "Matumizi" },
  { key: "reports", icon: "📈", label: "Ripoti" },
  { key: "workers", icon: "👥", label: "Wafanyakazi" },
  { key: "branches", icon: "🏢", label: "Matawi" },
  { key: "stock-history", icon: "📋", label: "Historia Stock" },
  { key: "payment", icon: "💳", label: "Lipa Usajili", highlight: true },
  { key: "token", icon: "🔑", label: "Tokens" },
  { key: "settings", icon: "⚙️", label: "Mipangilio" },
];

const WORKER_MENU = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "sales", icon: "🛒", label: "Mauzo" },
  { key: "products", icon: "📦", label: "Bidhaa" },
];

export default function Sidebar({
  role,
  activePage,
  onNavigate,
  onLogout,
  userName,
  businessName,
  collapsed,
  onToggle,
  pendingPayments = 0,
}) {
  const menu =
    role === "admin"
      ? ADMIN_MENU
      : role === "office"
      ? OFFICE_MENU
      : WORKER_MENU;

  return (
    <>
      {!collapsed && <div className="sidebar-overlay" onClick={onToggle} />}

      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🏪</span>
            <span className="logo-text">{APP_NAME}</span>
          </div>
          <button className="sidebar-close" onClick={onToggle}>✕</button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">
            {(userName || "U").charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <p className="profile-name">{userName || "User"}</p>
            <p className="profile-role">
              {role === "admin"
                ? "Administrator"
                : role === "office"
                ? businessName || "Office"
                : "Muuzaji"}
            </p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menu.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activePage === item.key ? "active" : ""} ${item.highlight ? "highlight" : ""}`}
              onClick={() => {
                onNavigate(item.key);
                if (window.innerWidth < 768) onToggle();
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.key === "payments" && pendingPayments > 0 && (
                <span style={{
                  marginLeft: "auto",
                  background: "var(--color-danger)",
                  color: "white",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "var(--radius-full)",
                  animation: "pulse 2s infinite",
                }}>
                  {pendingPayments}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={onLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Toka</span>
          </button>
        </div>
      </aside>
    </>
  );
}
