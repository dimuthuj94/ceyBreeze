// src/components/layouts/customer/CustomerLayout.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { key: "dashboard",    label: "Dashboard",       icon: "⊞", path: "/customer/dashboard"       },
      { key: "reservations", label: "My Reservations", icon: "✈", path: "/customer/my-reservations"  },
      { key: "messages",     label: "Messages",        icon: "✉", path: "/customer/my-messages"      },
      { key: "activity",     label: "My Activity",     icon: "◎", path: "/customer/activity"         },
    ],
  },
  {
    label: "Discover",
    items: [
      { key: "explore",  label: "Explore Tours", icon: "◉", path: "/tours"             },
      { key: "wishlist", label: "Wishlist",      icon: "♡", path: "/customer/wishlist" },
      { key: "payments", label: "Payments",      icon: "◈", path: "/customer/payments" },
    ],
  },
  {
    label: "Account",
    items: [
      { key: "profile",       label: "My Profile",    icon: "◐",  path: "/customer/profile"           },
      { key: "settings",      label: "Settings",      icon: "⊛",  path: "/customer/settings"          },
      { key: "security",      label: "Security",      icon: "⊕",  path: "/customer/security"          },
      { key: "notifications", label: "Notifications", icon: "🔔", path: "/customer/my-notifications", notifBadge: true },
      { key: "support",       label: "Support",       icon: "⊙",  path: "/customer/support"           },
    ],
  },
];

export default function CustomerLayout({ children, pageTitle = "Dashboard" }) {
  const [collapsed,        setCollapsed]        = useState(false);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [customerData,     setCustomerData]     = useState(null);
  const [user,             setUser]             = useState(null);
  const [isMobile,         setIsMobile]         = useState(window.innerWidth <= 768);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        localStorage.setItem("isCustomer", "true");
        try {
          const snap = await getDoc(doc(db, "customers", u.uid));
          setCustomerData(snap.exists()
            ? { uid: u.uid, email: u.email, ...snap.data() }
            : { uid: u.uid, email: u.email, firstName: "Traveller" }
          );
        } catch {
          setCustomerData({ uid: u.uid, email: u.email, firstName: "Traveller" });
        }
      } else {
        localStorage.removeItem("isCustomer");
        navigate("/customer-login");
      }
    });
    return () => unsub();
  }, [navigate]);

  /* Real-time unread notifications */
  useEffect(() => {
    if (!user) { setUnreadNotifCount(0); return; }
    const q = query(
      collection(db, "customerNotifications"),
      where("customerId", "==", user.uid),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, snap => setUnreadNotifCount(snap.size), () => {});
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("isCustomer");
    navigate("/");
  };

  const activeKey = (() => {
    for (const sec of NAV_SECTIONS) {
      const found = sec.items.find(n =>
        location.pathname === n.path || location.pathname.startsWith(n.path + "/")
      );
      if (found) return found.key;
    }
    return "dashboard";
  })();

  const initials = customerData
    ? `${(customerData.firstName || "T")[0]}${(customerData.lastName || "")[0] || ""}`.toUpperCase()
    : "CB";
  const fullName = customerData
    ? `${customerData.firstName || ""} ${customerData.lastName || ""}`.trim()
    : "Loading...";

  const renderNavItem = (item) => {
    const active = activeKey === item.key;
    const badge  = item.notifBadge ? unreadNotifCount : 0;
    return (
      <div
        key={item.key}
        className={`cb-nav-item ${active ? "active" : ""}`}
        onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
      >
        <span className="cb-nav-icon" style={{ position: "relative", display: "inline-block" }}>
          {item.icon}
          {badge > 0 && collapsed && (
            <span style={{
              position: "absolute", top: "-5px", right: "-6px",
              background: "#e24b4a", color: "#fff",
              fontSize: "8px", fontWeight: 700,
              width: "13px", height: "13px", lineHeight: "13px",
              textAlign: "center", display: "block",
              /* square badge */
            }}>
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="cb-nav-label" style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
            {item.label}
            {badge > 0 && (
              <span style={{
                background: "#e24b4a", color: "#fff",
                fontSize: "9px", fontWeight: 700,
                padding: "1px 5px", lineHeight: 1.4,
              }}>
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="cb-layout">

      {/* Mobile overlay */}
      <div className={`cb-overlay ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`cb-sidebar ${collapsed && !isMobile ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>

        {/* Brand + user */}
        <div className="cb-sidebar-top">
          <div className="cb-brand">
            <div className="cb-brand-logo">CB</div>
            {!collapsed && <div className="cb-brand-text">cey<span>Breeze</span></div>}
          </div>
          {!collapsed && (
            <div className="cb-user-pill">
              {/* Square avatar */}
              <div className="cb-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initials}
              </div>
              <div className="cb-user-info">
                <div className="cb-user-name">{fullName}</div>
                <div className="cb-user-role">TRAVELLER</div>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="cb-nav">
          {NAV_SECTIONS.map(sec => (
            <React.Fragment key={sec.label}>
              {!collapsed && <div className="cb-nav-section-label">{sec.label}</div>}
              {sec.items.map(renderNavItem)}
            </React.Fragment>
          ))}
        </nav>

        {/* Bottom */}
        <div className="cb-sidebar-bottom">
          <button className="cb-bottom-btn home" onClick={() => navigate("/")}>
            <span className="icon">⌂</span>
            {!collapsed && <span>Go to Home</span>}
          </button>
          <button className="cb-bottom-btn logout" onClick={handleLogout}>
            <span className="icon">⏻</span>
            {!collapsed && <span>Log Out</span>}
          </button>
          {!isMobile && (
            <button className="cb-toggle-btn" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? "→" : "← Collapse"}
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={`cb-main ${collapsed && !isMobile ? "collapsed" : ""}`}>

        {/* Topbar */}
        <header className="cb-topbar">
          <div className="cb-topbar-left">
            {isMobile && (
              <button
                style={{ background: "none", border: "none", fontSize: "18px", color: "#00276b", cursor: "pointer" }}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                ☰
              </button>
            )}
            <span className="cb-page-title">{pageTitle}</span>
          </div>

          <div className="cb-topbar-right">
            <div className="cb-search-bar">
              <span style={{ color: "rgba(0,39,107,0.3)", fontSize: "13px" }}>⌕</span>
              <input placeholder="Search..." />
            </div>

            {/* Notifications */}
            <button
              className="cb-topbar-btn"
              title="Notifications"
              onClick={() => navigate("/customer/my-notifications")}
              style={{ position: "relative" }}
            >
              🔔
              {unreadNotifCount > 0 && (
                <span style={{
                  position: "absolute", top: "4px", right: "4px",
                  width: "8px", height: "8px",
                  background: "#e24b4a", border: "1.5px solid #fff",
                  display: "block",
                }} />
              )}
            </button>

            <button className="cb-topbar-btn" onClick={() => navigate("/customer/my-messages")}>✉</button>
            <button className="cb-topbar-btn" onClick={() => navigate("/customer/profile")}>◐</button>
          </div>
        </header>

        {/* Content */}
        <main className="cb-content">
          {children}
        </main>
      </div>
    </div>
  );
}