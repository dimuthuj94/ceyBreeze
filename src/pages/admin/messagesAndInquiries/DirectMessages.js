// src/pages/admin/messagesAndInquiries/DirectMessages.js
import React, { useEffect, useState, useRef } from "react";
import MessagesAndInquiries from "../../../components/layouts/admin/MessagesAndInquiries";
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp, increment,
} from "firebase/firestore";
import { db } from "../../../firebase";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fi = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid rgba(0,39,107,0.15)",
  fontSize: "13px", color: "#00276b", outline: "none",
  fontFamily: "'Outfit', sans-serif", boxSizing: "border-box",
};

export default function AdminDirectMessages() {
  const [threads,  setThreads]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [sendError,setSendError]= useState("");
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const bottomRef = useRef(null);

  /* ── Load all direct message threads ── */
  useEffect(() => {
    const q = query(
      collection(db, "directMessages"),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      const updated = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setThreads(updated);

      /* Keep selected in sync when the thread data updates */
      setSelected(prev => {
        if (!prev) return prev;
        const fresh = updated.find(t => t.id === prev.id);
        return fresh || prev;
      });
    }, err => console.error("directMessages listener:", err));
    return () => unsub();
  }, []);

  /* ── Load messages for selected thread ── */
  useEffect(() => {
    if (!selected) { setMessages([]); return; }

    const q = query(
      collection(db, "directMessages", selected.id, "messages"),
      orderBy("sentAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      /* Mark admin unread as 0 */
      updateDoc(doc(db, "directMessages", selected.id), { adminUnread: 0 }).catch(() => {});
    }, err => console.error("messages listener:", err));

    return () => unsub();
  }, [selected?.id]);

  /* Auto-scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  const handleSend = async () => {
    if (!input.trim() || !selected) return;
    setSending(true);
    setSendError("");

    const text       = input.trim();
    const threadId   = selected.id;
    const adminLabel = "admin"; /* Admin uses localStorage auth — no Firebase Auth uid */

    try {
      /* 1. Add message to sub-collection */
      await addDoc(
        collection(db, "directMessages", threadId, "messages"),
        {
          text,
          senderEmail: adminLabel,
          senderRole:  "admin",
          senderName:  "CeyBreeze Admin",
          sentAt:      serverTimestamp(),
        }
      );

      /* 2. Update thread meta — use increment() to avoid stale state race */
      await updateDoc(doc(db, "directMessages", threadId), {
        lastMessage:    text,
        lastMessageAt:  serverTimestamp(),
        customerUnread: increment(1),
        status:         "open",
      });

      setInput("");
    } catch (err) {
      console.error("Send failed:", err);
      setSendError(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  /* ── Close / Reopen thread ── */
  const setThreadStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "directMessages", id), { status });
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  /* ── Filtered thread list ── */
  const filtered = threads.filter(t => {
    if (filter === "unread" && !(t.adminUnread > 0)) return false;
    if (filter === "open"   && t.status !== "open")  return false;
    if (filter === "closed" && t.status !== "closed") return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        t.subject?.toLowerCase().includes(s)       ||
        t.customerName?.toLowerCase().includes(s)  ||
        t.customerEmail?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const unreadCount = threads.filter(t => t.adminUnread > 0).length;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <MessagesAndInquiries pageTitle="Direct Messages">

      <div style={{ marginBottom: "18px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>
          Direct Messages
        </h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
          Customer-to-CeyBreeze inquiries · {unreadCount} unread
        </p>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "280px 1fr",
        height: "680px", border: "1px solid rgba(0,39,107,0.07)",
        background: "#fff", overflow: "hidden",
      }}>

        {/* ── Thread list ── */}
        <div style={{ borderRight: "1px solid rgba(0,39,107,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Search + filter */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(0,39,107,0.07)", flexShrink: 0 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search subject, name, email..."
              style={{ ...fi, padding: "7px 10px", fontSize: "12px" }}
            />
            <div style={{ display: "flex", gap: "3px", marginTop: "8px" }}>
              {[
                ["all",    `All (${threads.length})`],
                ["unread", `Unread (${unreadCount})`],
                ["open",   "Open"],
                ["closed", "Closed"],
              ].map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  flex: 1, padding: "4px 0", fontSize: "9px", fontWeight: 700,
                  border: "none", cursor: "pointer",
                  background: filter === f ? "#00276b" : "rgba(0,39,107,0.05)",
                  color:      filter === f ? "#fff"    : "#7a9ab8",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Thread items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "24px", textAlign: "center", color: "#adc6d8", fontSize: "12px" }}>
                No threads found.
              </div>
            )}
            {filtered.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                style={{
                  padding: "12px 14px", cursor: "pointer",
                  borderBottom: "1px solid rgba(0,39,107,0.05)",
                  background: selected?.id === t.id ? "rgba(0,39,107,0.05)" : "#fff",
                  borderLeft:  selected?.id === t.id ? "3px solid #00276b"   : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#00276b", flex: 1, marginRight: "6px", lineHeight: 1.3 }}>
                    {t.subject || "(No subject)"}
                  </div>
                  {t.adminUnread > 0 && (
                    <span style={{ background: "#e24b4a", color: "#fff", borderRadius: "10px", fontSize: "9px", fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>
                      {t.adminUnread}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#7a9ab8", marginTop: "3px" }}>
                  {t.customerName || t.customerEmail}
                </div>
                <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "2px" }}>
                  {t.lastMessage
                    ? `${t.lastMessage.slice(0, 38)}${t.lastMessage.length > 38 ? "..." : ""}`
                    : "No messages yet"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                  <span style={{
                    fontSize: "9px", fontWeight: 700, padding: "1px 6px", textTransform: "uppercase",
                    background: t.status === "closed" ? "#f1f3f5" : "#e1f5ee",
                    color:      t.status === "closed" ? "#6c757d"  : "#085041",
                  }}>
                    {t.status || "open"}
                  </span>
                  <span style={{ fontSize: "10px", color: "#adc6d8" }}>
                    {fmtDate(t.lastMessageAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chat window ── */}
        {selected ? (
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Thread header */}
            <div style={{
              padding: "12px 16px", flexShrink: 0,
              borderBottom: "1px solid rgba(0,39,107,0.07)",
              background: "rgba(0,39,107,0.02)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#00276b" }}>
                  {selected.subject || "(No subject)"}
                </div>
                <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "2px" }}>
                  {selected.customerName && `${selected.customerName} · `}{selected.customerEmail}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {selected.status !== "closed" ? (
                  <button
                    onClick={() => setThreadStatus(selected.id, "closed")}
                    style={{
                      background: "#f1f3f5", color: "#6c757d", border: "none",
                      fontSize: "11px", padding: "6px 14px",
                      cursor: "pointer", fontWeight: 700, letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Close Thread
                  </button>
                ) : (
                  <button
                    onClick={() => setThreadStatus(selected.id, "open")}
                    style={{
                      background: "#e1f5ee", color: "#085041", border: "none",
                      fontSize: "11px", padding: "6px 14px",
                      cursor: "pointer", fontWeight: 700, letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Reopen Thread
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8f9fa" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8", fontSize: "13px" }}>
                  No messages yet. Send the first reply below.
                </div>
              )}
              {messages.map(m => {
                const isAdmin = m.senderRole === "admin";
                return (
                  <div key={m.id} style={{
                    display: "flex",
                    justifyContent: isAdmin ? "flex-end" : "flex-start",
                    marginBottom: "10px",
                  }}>
                    <div style={{
                      maxWidth: "72%",
                      background: isAdmin ? "#00276b" : "#fff",
                      color:      isAdmin ? "#fff"    : "#212529",
                      borderRadius: isAdmin ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "8px 12px",
                      border: isAdmin ? "none" : "1px solid rgba(0,39,107,0.08)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}>
                      {!isAdmin && (
                        <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "3px", fontWeight: 700 }}>
                          {m.senderName || m.senderEmail}
                        </div>
                      )}
                      {isAdmin && (
                        <div style={{ fontSize: "10px", color: "rgba(168,237,255,0.7)", marginBottom: "3px", fontWeight: 700 }}>
                          CeyBreeze Admin
                        </div>
                      )}
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5 }}>{m.text}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "10px", textAlign: "right", color: isAdmin ? "rgba(255,255,255,0.5)" : "#adb5bd" }}>
                        {fmtDate(m.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Error banner */}
            {sendError && (
              <div style={{
                padding: "8px 14px", background: "#fcebeb",
                color: "#791f1f", fontSize: "12px", flexShrink: 0,
                borderTop: "1px solid rgba(220,53,69,0.15)",
              }}>
                ⚠ {sendError}
              </div>
            )}

            {/* Input row — disabled when thread is closed */}
            {selected.status !== "closed" ? (
              <div style={{
                padding: "10px 14px", flexShrink: 0,
                borderTop: "1px solid rgba(0,39,107,0.07)",
                background: "#fff", display: "flex", gap: "8px",
              }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Reply to customer... (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  disabled={sending}
                  style={{
                    flex: 1, border: "1.5px solid rgba(0,39,107,0.15)",
                    padding: "8px 10px", fontSize: "13px", resize: "none",
                    outline: "none", fontFamily: "'Outfit', sans-serif",
                    opacity: sending ? 0.6 : 1,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  style={{
                    background: "#00276b", color: "#fff", border: "none",
                    padding: "0 22px", fontSize: "12px", fontWeight: 700,
                    cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                    alignSelf: "stretch",
                    opacity: sending || !input.trim() ? 0.5 : 1,
                    transition: "opacity 0.2s",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    minWidth: "80px",
                  }}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            ) : (
              <div style={{
                padding: "14px 16px", flexShrink: 0,
                background: "#f8f9fa",
                borderTop: "1px solid rgba(0,39,107,0.07)",
                textAlign: "center", fontSize: "12px", color: "#adc6d8",
              }}>
                This conversation is closed.
                <button
                  onClick={() => setThreadStatus(selected.id, "open")}
                  style={{
                    marginLeft: "10px", background: "none", border: "none",
                    color: "#00276b", fontSize: "12px", cursor: "pointer",
                    fontWeight: 700, textDecoration: "underline",
                  }}
                >
                  Reopen to reply
                </button>
              </div>
            )}
          </div>

        ) : (
          /* No thread selected */
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "12px", color: "#adc6d8",
          }}>
            <div style={{ fontSize: "40px", opacity: 0.2 }}>✉</div>
            <div style={{ fontSize: "13px" }}>Select a conversation to reply</div>
            <div style={{ fontSize: "11px" }}>
              {threads.length === 0 ? "No direct messages yet." : `${threads.length} thread${threads.length > 1 ? "s" : ""} available`}
            </div>
          </div>
        )}
      </div>
    </MessagesAndInquiries>
  );
}