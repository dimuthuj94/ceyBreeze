// src/components/layouts/admin/MessagesAndInquiries.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection, query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "../../../firebase";

const NAV_SECTIONS = [
  {
    heading: "Inbox",
    items: [
      { label: "Dashboard",        icon: "◈", path: "/admin/messagesDashboard"                 },
      { label: "Direct Messages",  icon: "✉", path: "/admin/direct-messages",  badge: "direct"  },
      { label: "Tour Chats",       icon: "✈", path: "/admin/tour-chats", badge: "tours" },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "All Conversations", icon: "◎", path: "/admin/messages/all"  },
      { label: "Closed / Archived", icon: "◇", path: "/admin/messages/closed" },
    ],
  },
];

export default function MessagesAndInquiries({ children, pageTitle = "Messages" }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobile,     setMobile]     = useState(window.innerWidth < 900);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges,     setBadges]     = useState({ direct: 0, tours: 0 });

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 900);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  /* ── Real-time unread counts ── */
  useEffect(() => {
    /* Direct messages with adminUnread > 0 */
    const q1 = query(collection(db, "directMessages"), where("adminUnread", ">", 0));
    const u1 = onSnapshot(q1, snap => setBadges(p => ({ ...p, direct: snap.size })), () => {});

    /* Booking messages with adminUnread > 0 */
    const q2 = query(collection(db, "bookingMessages"), where("adminUnread", ">", 0));
    const u2 = onSnapshot(q2, snap => setBadges(p => ({ ...p, tours: snap.size })), () => {});

    return () => { u1(); u2(); };
  }, []);

  const isActive = (path) =>
    path === "/admin/messages"
      ? location.pathname === path
      : location.pathname.startsWith(path);

  const SIDEBAR_W = collapsed ? 64 : 240;

  const sidebarStyle = {
    position: "fixed", top: 0, left: 0, height: "100vh",
    width: mobile ? (mobileOpen ? 240 : 0) : SIDEBAR_W,
    background: "#00276b",
    transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
    overflow: "hidden", zIndex: 300,
    display: "flex", flexDirection: "column",
    boxShadow: "2px 0 20px rgba(0,0,0,0.12)",
  };

  const topbarStyle = {
    position: "fixed", top: 0,
    left: mobile ? 0 : SIDEBAR_W,
    right: 0, height: 56,
    background: "rgba(239,250,253,0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(0,39,107,0.08)",
    display: "flex", alignItems: "center",
    padding: "0 24px", zIndex: 200,
    transition: "left 0.25s",
    justifyContent: "space-between",
  };

  const contentStyle = {
    marginLeft: mobile ? 0 : SIDEBAR_W,
    marginTop: 56,
    minHeight: "calc(100vh - 56px)",
    padding: "28px 32px",
    background: "#EFFAFD",
    transition: "margin-left 0.25s",
  };

  return (
    <>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: "18px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#fff", lineHeight: 1.1 }}>CeyBreeze</div>
              <div style={{ fontSize: "9px", color: "#a8edff", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: "2px" }}>Messages</div>
            </div>
          )}
          {!mobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#a8edff", cursor: "pointer", borderRadius: "6px", padding: "5px 7px", fontSize: "12px" }}
            >
              {collapsed ? "▶" : "◀"}
            </button>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", scrollbarWidth: "none" }}>
          {NAV_SECTIONS.map(sec => (
            <div key={sec.heading} style={{ marginBottom: "6px" }}>
              {!collapsed && (
                <div style={{ fontSize: "8px", fontWeight: 700, color: "rgba(168,237,255,0.45)", letterSpacing: "0.18em", textTransform: "uppercase", padding: "10px 18px 4px" }}>
                  {sec.heading}
                </div>
              )}
              {sec.items.map(item => {
                const active  = isActive(item.path);
                const badgeN  = item.badge ? badges[item.badge] : 0;
                return (
                  <div
                    key={item.path}
                    onClick={() => { navigate(item.path); if (mobile) setMobileOpen(false); }}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: collapsed ? "11px 0" : "10px 18px",
                      justifyContent: collapsed ? "center" : "flex-start",
                      cursor: "pointer",
                      background: active ? "rgba(168,237,255,0.12)" : "transparent",
                      borderLeft: active ? "3px solid #a8edff" : "3px solid transparent",
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: "15px", color: active ? "#a8edff" : "rgba(255,255,255,0.5)", flexShrink: 0, position: "relative" }}>
                      {item.icon}
                      {badgeN > 0 && collapsed && (
                        <span style={{ position: "absolute", top: "-5px", right: "-6px", background: "#e24b4a", color: "#fff", borderRadius: "50%", fontSize: "8px", fontWeight: 700, width: "13px", height: "13px", lineHeight: "13px", textAlign: "center", display: "block" }}>
                          {badgeN}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span style={{ fontSize: "12px", fontWeight: active ? 600 : 400, color: active ? "#fff" : "rgba(255,255,255,0.55)", flex: 1 }}>
                          {item.label}
                        </span>
                        {badgeN > 0 && (
                          <span style={{ background: "#e24b4a", color: "#fff", borderRadius: "10px", fontSize: "9px", fontWeight: 700, padding: "1px 6px" }}>
                            {badgeN}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { label: "Go to Menu", icon: "⊞", action: () => navigate("/admin/mainmenu") },
            { label: "Go to Home", icon: "⌂", action: () => navigate("/") },
            { label: "Logout",     icon: "⎋", action: () => { localStorage.removeItem("isAdmin"); navigate("/admin-login"); } },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} style={{
              background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.6)",
              cursor: "pointer", borderRadius: "6px", padding: collapsed ? "8px" : "8px 12px",
              fontSize: "12px", display: "flex", alignItems: "center", gap: "8px",
              justifyContent: collapsed ? "center" : "flex-start",
            }}>
              <span>{btn.icon}</span>
              {!collapsed && <span>{btn.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile overlay */}
      {mobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 299 }} />
      )}

      {/* Topbar */}
      <div style={topbarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {mobile && (
            <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: "none", border: "none", fontSize: "18px", color: "#00276b", cursor: "pointer" }}>☰</button>
          )}
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px", color: "#00276b" }}>{pageTitle}</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {(badges.direct + badges.tours) > 0 && (
            <span style={{ background: "#e24b4a", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "12px" }}>
              {badges.direct + badges.tours} unread
            </span>
          )}
          <span style={{ fontSize: "11px", color: "#7a9ab8", background: "rgba(0,39,107,0.06)", padding: "4px 12px", borderRadius: "20px" }}>Messages</span>
          <span style={{ fontSize: "11px", color: "#00276b", fontWeight: 600 }}>Admin</span>
        </div>
      </div>

      {/* Page content */}
      <div style={contentStyle}>{children}</div>
    </>
  );
}