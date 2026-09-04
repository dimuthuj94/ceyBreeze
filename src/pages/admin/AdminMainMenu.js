// src/pages/admin/AdminMainMenu.js
import React from "react";
import { useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  { icon: "◈", title: "Content Management",         link: "/admin/content-management/content-dashboard" },
  { icon: "◎", title: "Reservation Management",      link: "/admin/reservation/dashboard"               },
  { icon: "◉", title: "User Management",             link: "/admin/user-management/users-dashboard"     },
  { icon: "✦", title: "Driver & Fleet Management",   link: "/admin/fleet/dashboard"                     },
  { icon: "▣", title: "Finance & Reports",           link: "/admin/finance/dashboard"                   },
  { icon: "✉", title: "Messages & Inquiries",        link: "/admin/messagesDashboard"                   },
];

export default function AdminMainMenu() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", minHeight: "100vh", background: "#EFFAFD" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#00276b", padding: "0 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        height: "56px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "17px", color: "#fff" }}>
            CeyBreeze
          </div>
          <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.15)" }} />
          <div style={{ fontSize: "11px", color: "#a8edff", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Management Hub
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate("/")}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: "11px", fontWeight: 700, padding: "6px 16px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            ⌂ Home
          </button>
          <button
            onClick={handleLogout}
            style={{ background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.3)", color: "#ff8a8a", fontSize: "11px", fontWeight: 700, padding: "6px 16px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            ⎋ Logout
          </button>
        </div>
      </div>

      {/* ── Hero strip ── */}
      <div style={{
        background: "#00276b", paddingBottom: "40px", paddingTop: "10px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Dot pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px", pointerEvents: "none",
        }} />
        <div style={{ textAlign: "center", position: "relative" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 10px" }}>
            Administrator Panel
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 4vw, 44px)",
            color: "#fff", fontWeight: 400, margin: "0 0 0",
            lineHeight: 1.1,
          }}>
            Management Hub
          </h1>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div style={{ maxWidth: "980px", margin: "-32px auto 0", padding: "0 24px 60px", paddingTop: "100px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "12px",
        }}>
          {MENU_ITEMS.map((item, i) => (
            <div
              key={i}
              onClick={() => navigate(item.link)}
              style={{
                background: "#fff",
                border: "1px solid rgba(0,39,107,0.08)",
                padding: "28px 24px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "20px",
                transition: "border-color 0.18s, box-shadow 0.18s, transform 0.18s",
                animation: `fadeUp 0.4s ease both`,
                animationDelay: `${i * 0.06}s`,
                position: "relative", overflow: "hidden",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#00276b";
                e.currentTarget.style.boxShadow  = "0 4px 24px rgba(0,39,107,0.10)";
                e.currentTarget.style.transform  = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(0,39,107,0.08)";
                e.currentTarget.style.boxShadow  = "none";
                e.currentTarget.style.transform  = "translateY(0)";
              }}
            >
              {/* Left accent bar */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "#00276b" }} />

              {/* Icon */}
              <div style={{
                width: "48px", height: "48px", background: "#EFFAFD",
                border: "1.5px solid rgba(0,39,107,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", color: "#00276b", flexShrink: 0,
              }}>
                {item.icon}
              </div>

              {/* Title + arrow */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#00276b", letterSpacing: "0.01em" }}>
                  {item.title}
                </div>
              </div>

              <div style={{ color: "#a8edff", fontSize: "18px", flexShrink: 0 }}>›</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}