// src/pages/admin/messagesAndInquiries/TourChats.js
import React, { useEffect, useState, useRef } from "react";
import MessagesAndInquiries from "../../../components/layouts/admin/MessagesAndInquiries";
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function AdminTourChats() {
  const [threads,   setThreads]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const bottomRef = useRef(null);
  const auth = getAuth();

  useEffect(() => {
    const q = query(collection(db, "bookingMessages"), orderBy("lastMessageAt", "desc"));
    const unsub = onSnapshot(q, snap => setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const q = query(collection(db, "bookingMessages", selected.id, "messages"), orderBy("sentAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      updateDoc(doc(db, "bookingMessages", selected.id), { adminUnread: 0 }).catch(() => {});
    });
    return () => unsub();
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selected) return;
    setSending(true);
    try {
      const adminEmail = auth.currentUser?.email || "admin";
      await addDoc(collection(db, "bookingMessages", selected.id, "messages"), {
        text: input.trim(), senderEmail: adminEmail,
        senderRole: "admin", sentAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "bookingMessages", selected.id), {
        lastMessage: input.trim(), lastMessageAt: serverTimestamp(),
        customerUnread: (selected.customerUnread || 0) + 1,
      });
      setInput("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const filtered = threads.filter(t => {
    if (filter === "unread" && !t.adminUnread) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return t.bookingId?.toLowerCase().includes(s) || t.customerEmail?.toLowerCase().includes(s) || t.subject?.toLowerCase().includes(s);
    }
    return true;
  });

  const fi = { width: "100%", padding: "9px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", outline: "none", fontFamily: "'Outfit', sans-serif", boxSizing: "border-box" };

  return (
    <MessagesAndInquiries pageTitle="Tour Chats">
      <div style={{ marginBottom: "18px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Tour Booking Chats</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>Per-booking chat threads · {threads.filter(t => t.adminUnread > 0).length} unread</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "0", height: "680px", border: "1px solid rgba(0,39,107,0.07)", background: "#fff" }}>

        {/* Thread list */}
        <div style={{ borderRight: "1px solid rgba(0,39,107,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(0,39,107,0.07)" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search booking, email..." style={{ ...fi, padding: "7px 10px", fontSize: "12px" }} />
            <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
              {[["all", `All (${threads.length})`], ["unread", `Unread (${threads.filter(t => t.adminUnread > 0).length})`]].map(([f, l]) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  flex: 1, padding: "4px 0", fontSize: "10px", fontWeight: 700,
                  border: "none", cursor: "pointer",
                  background: filter === f ? "#00276b" : "rgba(0,39,107,0.05)",
                  color:      filter === f ? "#fff"     : "#7a9ab8",
                }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", color: "#adc6d8", fontSize: "12px" }}>No chats found.</div>
            )}
            {filtered.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                style={{
                  padding: "12px 14px", cursor: "pointer",
                  borderBottom: "1px solid rgba(0,39,107,0.05)",
                  background: selected?.id === t.id ? "rgba(0,39,107,0.05)" : "#fff",
                  borderLeft: selected?.id === t.id ? "3px solid #00276b" : "3px solid transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#00276b" }}>{t.bookingId || t.id}</div>
                  {t.adminUnread > 0 && (
                    <span style={{ background: "#e24b4a", color: "#fff", borderRadius: "10px", fontSize: "9px", fontWeight: 700, padding: "1px 5px" }}>{t.adminUnread}</span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#7a9ab8", marginTop: "2px" }}>{t.customerEmail}</div>
                <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "2px" }}>
                  {t.lastMessage ? `${t.lastMessage.slice(0, 35)}...` : "No messages"}
                </div>
                <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "5px", textAlign: "right" }}>
                  {fmtDate(t.lastMessageAt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat window */}
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,39,107,0.07)", background: "rgba(0,39,107,0.02)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#00276b" }}>Booking: {selected.bookingId || selected.id}</div>
              <div style={{ fontSize: "11px", color: "#adc6d8" }}>{selected.customerEmail} · {selected.subject || "Tour booking chat"}</div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8f9fa" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8", fontSize: "13px" }}>No messages yet.</div>
              )}
              {messages.map(m => {
                const isAdmin = m.senderRole === "admin";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", marginBottom: "10px" }}>
                    <div style={{
                      maxWidth: "72%",
                      background: isAdmin ? "#00276b" : "#fff",
                      color:      isAdmin ? "#fff"     : "#212529",
                      borderRadius: isAdmin ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "8px 12px",
                      border: isAdmin ? "none" : "1px solid rgba(0,39,107,0.08)",
                    }}>
                      {!isAdmin && (
                        <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "3px", fontWeight: 700 }}>
                          {m.senderEmail}
                        </div>
                      )}
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5 }}>{m.text}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: isAdmin ? "rgba(255,255,255,0.5)" : "#adb5bd", textAlign: "right" }}>
                        {fmtDate(m.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(0,39,107,0.07)", background: "#fff", display: "flex", gap: "8px" }}>
              <textarea
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Reply to customer... (Enter to send)"
                rows={2}
                style={{ flex: 1, border: "1.5px solid rgba(0,39,107,0.15)", padding: "8px 10px", fontSize: "13px", resize: "none", outline: "none", fontFamily: "'Outfit', sans-serif" }}
              />
              <button
                onClick={handleSend} disabled={sending || !input.trim()}
                style={{ background: "#00276b", color: "#fff", border: "none", padding: "8px 18px", fontSize: "12px", fontWeight: 700, cursor: "pointer", alignSelf: "stretch", opacity: sending || !input.trim() ? 0.5 : 1 }}
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#adc6d8", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "40px", opacity: 0.2 }}>✈</div>
            <div style={{ fontSize: "13px" }}>Select a booking chat</div>
          </div>
        )}
      </div>
    </MessagesAndInquiries>
  );
}