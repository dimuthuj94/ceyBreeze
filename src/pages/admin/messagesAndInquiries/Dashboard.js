// src/pages/admin/messagesAndInquiries/Dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MessagesAndInquiries from "../../../components/layouts/admin/MessagesAndInquiries";
import {
  collection, query, where, onSnapshot, orderBy, limit,
} from "firebase/firestore";
import { db } from "../../../firebase";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function AdminMessagesDashboard() {
  const navigate = useNavigate();
  const [directUnread,  setDirectUnread]  = useState([]);
  const [tourUnread,    setTourUnread]    = useState([]);
  const [recentDirect,  setRecentDirect]  = useState([]);
  const [recentTours,   setRecentTours]   = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "directMessages"), where("adminUnread", ">", 0)), snap => setDirectUnread(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(query(collection(db, "bookingMessages"), where("adminUnread", ">", 0)), snap => setTourUnread(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, "directMessages"), orderBy("lastMessageAt", "desc"), limit(5)), snap => setRecentDirect(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(query(collection(db, "bookingMessages"), orderBy("lastMessageAt", "desc"), limit(5)), snap => setRecentTours(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const KPI = ({ label, value, color, sub, onClick }) => (
    <div
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid rgba(0,39,107,0.07)",
        padding: "20px 22px", flex: 1, minWidth: "160px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ fontSize: "11px", color: "#7a9ab8", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "32px", color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "6px" }}>{sub}</div>}
    </div>
  );

  const RecentRow = ({ item, type }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#00276b" }}>
          {type === "direct" ? item.subject : item.subject || item.bookingId}
        </div>
        <div style={{ fontSize: "11px", color: "#adc6d8" }}>
          {item.customerName || item.customerEmail}
          {item.lastMessage && ` · ${item.lastMessage.slice(0, 40)}...`}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        {(type === "direct" ? item.adminUnread : item.adminUnread) > 0 && (
          <span style={{ background: "#e24b4a", color: "#fff", borderRadius: "10px", fontSize: "10px", fontWeight: 700, padding: "1px 7px", display: "block", marginBottom: "4px" }}>
            {type === "direct" ? item.adminUnread : item.adminUnread} new
          </span>
        )}
        <div style={{ fontSize: "10px", color: "#adc6d8" }}>{fmtDate(item.lastMessageAt)}</div>
      </div>
    </div>
  );

  return (
    <MessagesAndInquiries pageTitle="Messages Dashboard">
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Messages & Inquiries</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>Overview of all customer communications</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
        <KPI label="Unread Direct"    value={directUnread.length} color="#8B0000" sub="Direct messages" onClick={() => navigate("/admin/messages/direct")} />
        <KPI label="Unread Tour Chats" value={tourUnread.length}  color="#0c447c" sub="Booking chats"   onClick={() => navigate("/admin/messages/tour-chats")} />
        <KPI label="Total Unread"     value={directUnread.length + tourUnread.length} color={directUnread.length + tourUnread.length > 0 ? "#e24b4a" : "#27a86e"} sub="Needs attention" />
      </div>

      {/* Recent panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Recent direct */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <div style={{ background: "#00276b", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>Recent Direct Messages</span>
            <button onClick={() => navigate("/admin/messages/direct")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#a8edff", fontSize: "10px", padding: "3px 8px", cursor: "pointer", fontWeight: 700 }}>View All</button>
          </div>
          {recentDirect.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No direct messages.</p>
            : recentDirect.map(d => <RecentRow key={d.id} item={d} type="direct" />)
          }
        </div>

        {/* Recent tour chats */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <div style={{ background: "#00276b", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>Recent Tour Chats</span>
            <button onClick={() => navigate("/admin/messages/tour-chats")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#a8edff", fontSize: "10px", padding: "3px 8px", cursor: "pointer", fontWeight: 700 }}>View All</button>
          </div>
          {recentTours.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No tour chats.</p>
            : recentTours.map(d => <RecentRow key={d.id} item={d} type="tour" />)
          }
        </div>
      </div>
    </MessagesAndInquiries>
  );
}