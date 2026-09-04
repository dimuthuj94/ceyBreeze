// src/pages/admin/contentManagement/Dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";

const SHORTCUTS = [
  { key: "tours",      label: "Tour Management",          icon: "✈",  desc: "Add, edit and remove tours from the platform.",          path: "/admin/content-management/tours",      bg: "#e6f1fb", iconColor: "#0c447c" },
  { key: "cities",     label: "Cities & Destinations",    icon: "◉",  desc: "Manage travel cities, destinations and city imagery.",    path: "/admin/content-management/cities",     bg: "#e1f5ee", iconColor: "#085041" },
  { key: "gallery",    label: "Gallery",                  icon: "◧",  desc: "Upload, organise and remove gallery images.",             path: "/admin/content-management/gallery",    bg: "#faeeda", iconColor: "#633806" },
  { key: "carousel",   label: "Main Carousel",            icon: "▦",  desc: "Control the homepage hero carousel slides.",             path: "/admin/content-management/carousel",   bg: "#f1efe8", iconColor: "#444441" },
  { key: "vehicles",   label: "Vehicles & Accommodation", icon: "◈",  desc: "Set up available vehicle types and accommodation tiers.", path: "/admin/content-management/vehicles",   bg: "#fcebeb", iconColor: "#791f1f" },
  { key: "prices",     label: "Prices & Inclusions",      icon: "◇",  desc: "Define pricing rules and tour inclusions.",               path: "/admin/content-management/prices",     bg: "#eaf3de", iconColor: "#27500a" },
  { key: "activities", label: "Activities & Adventure",   icon: "◎",  desc: "Manage adventure options and activities offered.",        path: "/admin/content-management/activities", bg: "#e6f1fb", iconColor: "#0c447c" },
  { key: "news",       label: "News & Highlights",        icon: "◆",  desc: "Publish news articles and highlight posts to customers.", path: "/admin/content-management/news-and-highlights", bg: "#e1f5ee", iconColor: "#085041" },
  { key: "reports",    label: "Reports",                  icon: "◐",  desc: "View content analytics and platform reports.",           path: "/admin/content-management/reports",    bg: "#faeeda", iconColor: "#633806" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ tours: 0, cities: 0 });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [toursSnap, citiesSnap] = await Promise.all([
          getDocs(collection(db, "tours")),
          getDocs(collection(db, "citiesAndDestinations")),
        ]);
        setCounts({ tours: toursSnap.size, cities: citiesSnap.size });
      } catch (_) {}
    };
    loadCounts();
  }, []);

  return (
    <ContentManagement pageTitle="Dashboard">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        {/* Hero */}
        <div className="cmd-hero">
          <div className="cmd-hero-title">Content <span>Management</span></div>
          <div className="cmd-hero-sub">Manage all visible content, tours, cities, media and pricing from one place.</div>
          <div className="cmd-hero-stats">
            {[
              { val: counts.tours, label: "Tours Published" },
              { val: counts.cities, label: "Cities Managed" },
              { val: "9", label: "Content Sections" },
            ].map(({ val, label }) => (
              <div key={label}>
                <div className="cmd-hero-stat-val">{val}</div>
                <div className="cmd-hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="cmd-stats-row">
          {[
            { icon: "✈", val: counts.tours, label: "Total Tours",    bg: "#e6f1fb" },
            { icon: "◉", val: counts.cities, label: "Cities",        bg: "#e1f5ee" },
            { icon: "◧", val: "—",          label: "Gallery Images", bg: "#faeeda" },
            { icon: "◆", val: "—",          label: "News Articles",  bg: "#eaf3de" },
          ].map(({ icon, val, label, bg }, i) => (
            <div className="cmd-stat-card" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="cmd-stat-icon-row">
                <div className="cmd-stat-icon" style={{ background: bg }}>{icon}</div>
              </div>
              <div className="cmd-stat-val">{val}</div>
              <div className="cmd-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Shortcuts grid */}
        <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: "#7a9ab8", textTransform: "uppercase" }}>Quick Access</p>
          <div style={{ flex: 1, height: "1px", background: "rgba(0,39,107,0.07)" }} />
        </div>

        <div className="cmd-grid">
          {SHORTCUTS.map((s, i) => (
            <div
              key={s.key}
              className="cmd-shortcut-card"
              onClick={() => navigate(s.path)}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="cmd-shortcut-icon" style={{ background: s.bg, color: s.iconColor }}>
                {s.icon}
              </div>
              <div>
                <div className="cmd-shortcut-title">{s.label}</div>
                <div className="cmd-shortcut-desc">{s.desc}</div>
              </div>
              <div className="cmd-shortcut-arrow">→</div>
            </div>
          ))}
        </div>

        <div style={{ height: "28px" }} />
      </div>
    </ContentManagement>
  );
}