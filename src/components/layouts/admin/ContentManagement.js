// src/components/layouts/admin/ContentManagement.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase";

const NAV_SECTIONS = [
  {
    label: "Content",
    items: [
      { key: "dashboard",  label: "Dashboard",              icon: "⊞", path: "/admin/content-management/content-dashboard"   },
      { key: "tours",      label: "Tour Management",        icon: "✈", path: "/admin/content-management/tours"               },
      { key: "cities",     label: "Cities & Destinations",  icon: "◉", path: "/admin/content-management/cities"              },
      { key: "activities", label: "Activities & Adventure", icon: "◎", path: "/admin/content-management/activities"          },
      { key: "vehicles",   label: "Vehicles & Accommodation",icon:"◈", path: "/admin/content-management/vehicles"            },
      { key: "carousel",   label: "Main Carousel",          icon: "▦", path: "/admin/content-management/carousel"            },
      { key: "news",       label: "News & Highlights",      icon: "◆", path: "/admin/content-management/news-and-highlights" },
      { key: "gallery",    label: "Gallery",                icon: "◧", path: "/admin/content-management/gallery"             },
    ],
  },
  {
    label: "Pricing & Services",
    items: [
      { key: "prices", label: "Prices & Inclusions", icon: "◇", path: "/admin/content-management/prices" },
    ],
  },
  {
    label: "System",
    items: [
      { key: "reports",  label: "Reports",  icon: "◐", path: "/admin/content-management/reports"  },
      { key: "settings", label: "Settings", icon: "⊛", path: "/admin/content-management/settings" },
    ],
  },
];

/* ── Bottom action buttons ── */
const BOTTOM_BTNS = [
  { label: "Go to Menu", icon: "⊞", path: "/admin/mainmenu",  className: "home"   },
  { label: "Home",       icon: "⌂", path: "/",                className: "home"   },
  { label: "Log Out",    icon: "⏻", path: null,               className: "logout" },
];

export default function ContentManagement({ children, pageTitle = "Dashboard" }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth <= 768);
  const navigate  = useNavigate();
  const location  = useLocation();

  const isAdmin = localStorage.getItem("isAdmin") === "true";

  useEffect(() => {
    if (!isAdmin) navigate("/admin-login");
  }, [isAdmin, navigate]);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (_) {}
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };

  const activeKey = (() => {
    for (const sec of NAV_SECTIONS)
      for (const item of sec.items)
        if (location.pathname === item.path || location.pathname.startsWith(item.path + "/"))
          return item.key;
    return "dashboard";
  })();

  if (!isAdmin) return null;

  /* ── Sidebar width ── */
  const SIDEBAR_W = collapsed ? 64 : 260;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(0,39,107,0.35)", backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ════ Sidebar ════ */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: isMobile ? (mobileOpen ? 260 : 0) : SIDEBAR_W,
        background: "#00276b",
        display: "flex", flexDirection: "column",
        transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden", zIndex: 200,
        boxShadow: "2px 0 20px rgba(0,0,0,0.12)",
      }}>

        {/* Brand */}
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{
              width: 34, height: 34, background: "linear-gradient(135deg,#56c6e8,#a8edff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#00276b", flexShrink: 0,
              fontFamily: "'DM Serif Display', serif",
            }}>
              CB
            </div>
            {!collapsed && (
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: "#fff" }}>
                cey<span style={{ color: "#a8edff" }}>Breeze</span>
              </div>
            )}
          </div>

          {!collapsed && (
            <div style={{
              marginTop: 12,
              background: "rgba(168,237,255,0.1)",
              border: "1px solid rgba(168,237,255,0.18)",
              padding: "5px 10px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 7, height: 7, background: "#56c6e8", flexShrink: 0,
                boxShadow: "0 0 6px rgba(86,198,232,0.6)",
              }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#a8edff", textTransform: "uppercase" }}>
                Content Management
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
          {NAV_SECTIONS.map(sec => (
            <div key={sec.label}>
              {!collapsed && (
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                  padding: "12px 10px 4px",
                }}>
                  {sec.label}
                </div>
              )}
              {sec.items.map(item => {
                const active = activeKey === item.key;
                return (
                  <div
                    key={item.key}
                    onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex", alignItems: "center",
                      gap: collapsed ? 0 : 11,
                      padding: collapsed ? "10px 0" : "9px 12px",
                      justifyContent: collapsed ? "center" : "flex-start",
                      cursor: "pointer",
                      background: active ? "rgba(168,237,255,0.12)" : "transparent",
                      borderLeft: active ? "3px solid #a8edff" : "3px solid transparent",
                      marginBottom: 1,
                      transition: "all 0.18s",
                    }}
                    onMouseEnter={e => !active && (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                    onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 15, color: active ? "#a8edff" : "rgba(255,255,255,0.5)", width: 20, textAlign: "center", flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ fontSize: 13, color: active ? "#fff" : "rgba(255,255,255,0.55)", fontWeight: active ? 600 : 400 }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 8px", flexShrink: 0 }}>

          {/* Go to Menu */}
          <button
            onClick={() => navigate("/admin/mainmenu")}
            title={collapsed ? "Go to Menu" : undefined}
            style={{
              width: "100%", background: "rgba(168,237,255,0.08)",
              border: "none", color: "#a8edff", cursor: "pointer",
              padding: collapsed ? "9px" : "9px 12px",
              fontSize: 12, display: "flex", alignItems: "center",
              gap: collapsed ? 0 : 8,
              justifyContent: collapsed ? "center" : "flex-start",
              marginBottom: 4, fontFamily: "'Outfit', sans-serif",
              transition: "background 0.18s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(168,237,255,0.16)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(168,237,255,0.08)"}
          >
            <span style={{ fontSize: 14 }}>⊞</span>
            {!collapsed && <span>Go to Menu</span>}
          </button>

          {/* Home */}
          <button
            onClick={() => navigate("/")}
            title={collapsed ? "Home" : undefined}
            style={{
              width: "100%", background: "none",
              border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer",
              padding: collapsed ? "8px" : "8px 12px",
              fontSize: 12, display: "flex", alignItems: "center",
              gap: collapsed ? 0 : 8,
              justifyContent: collapsed ? "center" : "flex-start",
              marginBottom: 4, fontFamily: "'Outfit', sans-serif",
              transition: "all 0.18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            <span style={{ fontSize: 14 }}>⌂</span>
            {!collapsed && <span>Home</span>}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? "Log Out" : undefined}
            style={{
              width: "100%", background: "none",
              border: "none", color: "#ff8585", cursor: "pointer",
              padding: collapsed ? "8px" : "8px 12px",
              fontSize: 12, display: "flex", alignItems: "center",
              gap: collapsed ? 0 : 8,
              justifyContent: collapsed ? "center" : "flex-start",
              marginBottom: 4, fontFamily: "'Outfit', sans-serif",
              transition: "all 0.18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,80,80,0.1)"; e.currentTarget.style.color = "#ffadad"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#ff8585"; }}
          >
            <span style={{ fontSize: 14 }}>⏻</span>
            {!collapsed && <span>Log Out</span>}
          </button>

          {/* Collapse toggle — desktop only */}
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                marginTop: 6, width: "100%", padding: "6px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "none", color: "rgba(255,255,255,0.35)",
                cursor: "pointer", fontSize: 11,
                fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
            >
              {collapsed ? "→ Expand" : "← Collapse"}
            </button>
          )}
        </div>
      </aside>

      {/* ════ Topbar ════ */}
      <div style={{
        position: "fixed", top: 0,
        left: isMobile ? 0 : SIDEBAR_W,
        right: 0, height: 54,
        background: "rgba(239,250,253,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(0,39,107,0.07)",
        display: "flex", alignItems: "center", padding: "0 24px",
        zIndex: 100,
        transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: "none", border: "none", fontSize: 18, color: "#00276b", cursor: "pointer" }}
            >
              ☰
            </button>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#00276b", lineHeight: 1.2 }}>{pageTitle}</div>
            <div style={{ fontSize: 10, color: "#adc6d8", letterSpacing: "0.06em" }}>
              Content Management · {pageTitle}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate("/admin/mainmenu")}
            style={{
              height: 32, padding: "0 14px",
              border: "1px solid rgba(0,39,107,0.12)",
              background: "#fff", color: "#00276b",
              display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#00276b"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#00276b"; }}
          >
            <span>⊞</span> Menu
          </button>
          <button
            onClick={() => navigate("/")}
            style={{
              height: 32, padding: "0 14px",
              border: "1px solid rgba(0,39,107,0.12)",
              background: "#fff", color: "#00276b",
              display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#00276b"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#00276b"; }}
          >
            <span>⌂</span> Home
          </button>
          <button
            onClick={handleLogout}
            style={{
              height: 32, padding: "0 14px",
              border: "1px solid rgba(220,53,69,0.2)",
              background: "#fff", color: "#dc3545",
              display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontSize: 11, fontWeight: 600,
              fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#dc3545"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#dc3545"; e.currentTarget.style.borderColor = "rgba(220,53,69,0.2)"; }}
          >
            <span>⏻</span> Logout
          </button>
        </div>
      </div>

      {/* ════ Main content ════ */}
      <div style={{
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        marginTop: 54,
        minHeight: "calc(100vh - 54px)",
        padding: "28px 32px",
        background: "#EFFAFD",
        transition: "margin-left 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {children}
      </div>
    </>
  );
}