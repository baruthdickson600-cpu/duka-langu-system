// src/components/layout/Header.jsx
// Top header bar with notifications and mobile toggle

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getGreeting, formatDateTime } from "../../lib/helpers";
import "./Header.css";

export default function Header({ onMenuToggle, userName, userId, businessId, daysLeft, isTrial, isAdmin }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, [businessId, userId]);

  // 🔥 REALTIME notifications
  useEffect(() => {
    if (!businessId && !userId) return;

    const channel = supabase
      .channel(`notifs-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new;
          // Show notification if it's for this user or business
          if (n.user_id === userId || n.business_id === businessId || (isAdmin && n.user_id === userId)) {
            loadNotifications();
            // Browser notification if allowed
            if (Notification.permission === "granted") {
              new Notification(n.title, { body: n.message });
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [businessId, userId, isAdmin]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const loadNotifications = async () => {
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (isAdmin && userId) {
      query = query.eq("user_id", userId);
    } else if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data } = await query;
    if (data) {
      setNotifications(data);
      setUnread(data.filter((n) => !n.is_read).length);
    }
  };

  const markAllRead = async () => {
    if (isAdmin && userId) {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    } else if (businessId) {
      await supabase.from("notifications").update({ is_read: true }).eq("business_id", businessId).eq("is_read", false);
    }
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuToggle}>☰</button>
        <div className="header-greeting">
          <p className="greeting-text">{getGreeting()}, <strong>{userName || "User"}</strong></p>
        </div>
      </div>

      <div className="header-right">
        {daysLeft !== undefined && daysLeft <= 7 && daysLeft > 0 && (
          <div className={`header-badge ${daysLeft <= 3 ? "danger" : "warning"}`}>
            {isTrial ? "Majaribio" : "Usajili"}: siku {daysLeft}
          </div>
        )}

        <div className="notif-wrapper">
          <button className="header-icon-btn" onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead(); }}>
            🔔
            {unread > 0 && <span className="notif-count">{unread}</span>}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <strong>Arifa</strong>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNotif(false)}>✕</button>
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <p className="notif-empty">Hakuna arifa</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${n.is_read ? "" : "unread"}`}>
                      <span className="notif-type-icon">
                        {n.type === "stock_alert" ? "📦" :
                         n.type === "token_expiry" ? "🔑" :
                         n.type === "success" ? "✅" :
                         n.type === "error" ? "❌" : "ℹ️"}
                      </span>
                      <div>
                        <p className="notif-title">{n.title}</p>
                        <p className="notif-msg">{n.message}</p>
                        <p className="notif-time">{formatDateTime(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
