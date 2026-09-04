// src/components/Navbar.js
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const NAV_LINKS = [
  { name: "Home",    to: "/" },
  { name: "Tours",   to: "/tours" },
  { name: "Explore", to: "/citiesadventureactivities" },
  { name: "Book Now",to: "/booknow" },
  { name: "Gallery", to: "/gallery" },
  { name: "Reviews", to: "/reviews" },
  { name: "About Us",to: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser]                 = useState(null);
  const [customerName, setCustomerName] = useState("");
  const dropdownRef = useRef(null);
  const navigate    = useNavigate();
  const location    = useLocation();

  /* ── scroll ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── auth ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        localStorage.setItem("isCustomer", "true");
        try {
          const snap = await getDoc(doc(db, "customers", u.uid));
          if (snap.exists()) setCustomerName(snap.data().firstName || "Account");
        } catch {}
      } else {
        localStorage.removeItem("isCustomer");
        setCustomerName("");
      }
    });
    return () => unsub();
  }, []);

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── close mobile on route change ── */
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location]);

  /* ── lock body scroll when mobile menu open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try { await signOut(auth); localStorage.removeItem("isCustomer"); navigate("/"); }
    catch (e) { console.error(e); }
  };

  const isActive = (to) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <>
      <nav
        className={`nav-root ${scrolled || mobileOpen ? "scrolled" : "top"}`}
        style={{
          background: scrolled || mobileOpen
            ? undefined
            : "linear-gradient(to bottom, rgba(0,39,107,0.72), transparent)",
        }}
      >
        <div className="nav-inner">

          {/* ── Logo ── */}
          <Link to="/" className="nav-logo">
            cey<span>Breeze</span> Tours
          </Link>

          {/* ── Desktop nav links (margin-left:auto pushes them right) ── */}
          <ul
            className="nav-links"
            style={{
              listStyle: "none",
              margin: "0 0 0 auto",   /* key: pushes block to the right */
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            {NAV_LINKS.map((link) => (
              <li key={link.name}>
                <Link
                  to={link.to}
                  className={`nav-link-item ${isActive(link.to) ? "active" : ""}`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Right cluster: Contact | Auth | Burger ── */}
          <div style={{ display: "flex", alignItems: "center" }}>

            {/* Contact */}
            <Link to="/contact" className="nav-contact">Contact Us</Link>

            {/* Auth — desktop */}
            {user ? (
              <div className="nav-dropdown" ref={dropdownRef}>
                <button
                  className="nav-link-item"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {customerName || "Account"} ▾
                </button>
                {dropdownOpen && (
                  <ul className="nav-dropdown-menu">
                    <li>
                      <Link to="/customer/dashboard" className="nav-dropdown-item">
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link to="/customer/my-reservations" className="nav-dropdown-item">
                        My Reservations
                      </Link>
                    </li>
                    <li>
                      <Link to="/customer/profile" className="nav-dropdown-item">
                        My Profile
                      </Link>
                    </li>
                    <li style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "4px" }}>
                      <button className="nav-dropdown-item danger" onClick={handleLogout}>
                        Log Out
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            ) : (
              <Link to="/customer-login" className="nav-cta">Login</Link>
            )}

            {/* Burger — always rendered, shown/hidden via CSS */}
            <button
              className={`nav-burger ${mobileOpen ? "open" : ""}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <span className="nav-burger-line" />
              <span className="nav-burger-line" />
              <span className="nav-burger-line" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile fullscreen menu ── */}
      <div className={`nav-mobile ${mobileOpen ? "open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link key={link.name} to={link.to} className="nav-mobile-link">
            {link.name}
          </Link>
        ))}
        <Link to="/contact" className="nav-mobile-link">Contact Us</Link>

        {user ? (
          <>
            <Link
              to="/customer/dashboard"
              className="nav-mobile-link"
              style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", paddingTop: "10px" }}
            >
              Dashboard
            </Link>
            <Link
              to="/customer/my-reservations"
              className="nav-mobile-link"
              style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)" }}
            >
              My Reservations
            </Link>
            <button
              onClick={handleLogout}
              className="nav-mobile-link"
              style={{ fontSize: "15px", color: "#ffadad", borderTop: "1px solid rgba(255,80,80,0.15)" }}
            >
              Log Out
            </button>
          </>
        ) : (
          <div className="nav-mobile-actions">
            <Link to="/customer-login" className="hp-btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              Login
            </Link>
            <Link to="/booknow" className="hp-btn-ghost" style={{ flex: 1, justifyContent: "center" }}>
              Book Now
            </Link>
          </div>
        )}
      </div>

      {/* Height spacer so page content clears the fixed navbar */}
      <div style={{ height: "68px" }} />
    </>
  );
}