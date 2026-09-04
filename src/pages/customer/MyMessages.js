// src/pages/customer/MyMessages.js
import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, doc, setDoc, updateDoc, getDoc,
  serverTimestamp, getDocs,
} from "firebase/firestore";
import CustomerLayout from "../../components/layouts/customer/CustomerLayout";
import CustomerChatModal from "../../components/modals/customer/CustomerChatModal";
import { useNavigate } from "react-router-dom";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d    = ts?.toDate ? ts.toDate() : new Date(ts);
  const now  = new Date();
  const diff = now - d;
  if (diff < 60000)     return "Just now";
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const BOOKING_COLLECTIONS = [
  { col: "unpaidPresetBookings",     type: "preset",   status: "unpaid"    },
  { col: "unpaidCustomBookings",     type: "custom",   status: "unpaid"    },
  { col: "unpaidVehicleBookings",    type: "vehicle",  status: "unpaid"    },
  { col: "paidPresetBookings",       type: "preset",   status: "paid"      },
  { col: "paidCustomBookings",       type: "custom",   status: "paid"      },
  { col: "paidVehicleBookings",      type: "vehicle",  status: "paid"      },
  { col: "confirmedPresetBookings",  type: "preset",   status: "confirmed" },
  { col: "confirmedCustomBookings",  type: "custom",   status: "confirmed" },
  { col: "confirmedVehicleBookings", type: "vehicle",  status: "confirmed" },
  { col: "completedPresetBookings",  type: "preset",   status: "completed" },
  { col: "completedCustomBookings",  type: "custom",   status: "completed" },
  { col: "completedVehicleBookings", type: "vehicle",  status: "completed" },
];

const getTourName = (b, type) => {
  if (type === "vehicle") return "Vehicle Reservation";
  if (type === "custom")  return b["Tour Selection"]?.Tour || "Custom Tour";
  return b["Tour Info"]?.Tour || "Preset Tour";
};

const TYPE_COLORS = {
  preset:  { bg: "#e6f1fb", color: "#0c447c", label: "Preset Tour"   },
  custom:  { bg: "#e1f5ee", color: "#085041", label: "Custom Tour"   },
  vehicle: { bg: "#faeeda", color: "#633806", label: "Vehicle Only"  },
};

const STATUS_COLORS = {
  unpaid:    { bg: "#fcebeb", color: "#791f1f", label: "To Be Paid"  },
  paid:      { bg: "#faeeda", color: "#633806", label: "Paid"         },
  confirmed: { bg: "#e6f1fb", color: "#0c447c", label: "Confirmed"   },
  started:   { bg: "#e1f5ee", color: "#085041", label: "In Progress" },
  completed: { bg: "#f1efe8", color: "#444441", label: "Completed"   },
};

/* ════════════════════════════════════════════════════════════
   DIRECT MESSAGE THREAD COMPONENT
   ════════════════════════════════════════════════════════════ */
function DirectMessageThread({ uid, userEmail, userName }) {
  const [thread,    setThread]    = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [subject,   setSubject]   = useState("");
  const [showNew,   setShowNew]   = useState(false);
  const [threads,   setThreads]   = useState([]);
  const bottomRef = useRef(null);

  /* Load all direct message threads for this customer */
  useEffect(() => {
    if (!userEmail) return;
    const q = query(
      collection(db, "directMessages"),
      where("customerEmail", "==", userEmail),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [userEmail]);

  /* Load messages for selected thread */
  useEffect(() => {
    if (!thread) return;
    const q = query(
      collection(db, "directMessages", thread.id, "messages"),
      orderBy("sentAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      /* Mark customer messages as read */
      updateDoc(doc(db, "directMessages", thread.id), { customerUnread: 0 }).catch(() => {});
    });
    return () => unsub();
  }, [thread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewThread = async () => {
    if (!subject.trim()) { alert("Please enter a subject."); return; }
    setSending(true);
    try {
      const ref = await addDoc(collection(db, "directMessages"), {
        customerId:      uid,
        customerEmail:   userEmail,
        customerName:    userName,
        subject:         subject.trim(),
        status:          "open",
        lastMessage:     null,
        lastMessageAt:   serverTimestamp(),
        adminUnread:     0,
        customerUnread:  0,
        createdAt:       serverTimestamp(),
      });
      setThread({ id: ref.id, subject: subject.trim(), customerName: userName, customerEmail: userEmail });
      setSubject("");
      setShowNew(false);
    } catch (e) { alert("Failed to start conversation."); }
    finally { setSending(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !thread) return;
    setSending(true);
    try {
      await addDoc(collection(db, "directMessages", thread.id, "messages"), {
        text:        input.trim(),
        senderEmail: userEmail,
        senderRole:  "customer",
        senderName:  userName,
        sentAt:      serverTimestamp(),
      });
      await updateDoc(doc(db, "directMessages", thread.id), {
        lastMessage:   input.trim(),
        lastMessageAt: serverTimestamp(),
        adminUnread:   (threads.find(t => t.id === thread.id)?.adminUnread || 0) + 1,
        status:        "open",
      });
      setInput("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const fi = {
    width: "100%", padding: "9px 12px",
    border: "1.5px solid rgba(0,39,107,0.15)",
    fontSize: "13px", color: "#00276b",
    outline: "none", fontFamily: "'Outfit', sans-serif",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "0", height: "600px", border: "1px solid rgba(0,39,107,0.07)", background: "#fff" }}>

      {/* Thread list sidebar */}
      <div style={{ borderRight: "1px solid rgba(0,39,107,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,39,107,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#00276b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Conversations</span>
          <button
            onClick={() => { setShowNew(!showNew); setThread(null); }}
            style={{ background: "#00276b", color: "#fff", border: "none", fontSize: "11px", padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}
          >
            + New
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {threads.length === 0 && (
            <div style={{ padding: "24px 14px", textAlign: "center", color: "#adc6d8", fontSize: "12px" }}>
              No conversations yet.<br />Start one with + New.
            </div>
          )}
          {threads.map(t => (
            <div
              key={t.id}
              onClick={() => { setThread(t); setShowNew(false); }}
              style={{
                padding: "12px 14px", cursor: "pointer",
                borderBottom: "1px solid rgba(0,39,107,0.05)",
                background: thread?.id === t.id ? "rgba(0,39,107,0.05)" : "#fff",
                borderLeft: thread?.id === t.id ? "3px solid #00276b" : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#00276b", flex: 1, marginRight: "6px" }}>
                  {t.subject}
                </div>
                {t.customerUnread > 0 && (
                  <span style={{ background: "#e24b4a", color: "#fff", borderRadius: "10px", fontSize: "9px", fontWeight: 700, padding: "1px 5px" }}>
                    {t.customerUnread}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "3px" }}>
                {t.lastMessage
                  ? `${t.lastMessage.slice(0, 35)}${t.lastMessage.length > 35 ? "..." : ""}`
                  : "No messages yet"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span style={{
                  fontSize: "9px", fontWeight: 700, padding: "1px 6px",
                  background: t.status === "closed" ? "#f1f3f5" : "#e1f5ee",
                  color:      t.status === "closed" ? "#6c757d"  : "#085041",
                  textTransform: "uppercase",
                }}>
                  {t.status || "open"}
                </span>
                <span style={{ fontSize: "10px", color: "#adc6d8" }}>{fmtDate(t.lastMessageAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat / New thread area */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {showNew && !thread ? (
          /* New thread form */
          <div style={{ padding: "28px", flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px", color: "#00276b", marginBottom: "6px" }}>Start a New Conversation</div>
            <p style={{ fontSize: "13px", color: "#7a9ab8", marginBottom: "20px" }}>Send a message directly to the CeyBreeze Tours team.</p>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>Subject *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} style={{ ...fi, width: "100%", boxSizing: "border-box" }} placeholder="e.g. Question about my upcoming tour" />
            </div>
            <button
              onClick={handleNewThread} disabled={sending || !subject.trim()}
              style={{ background: "#00276b", color: "#fff", border: "none", padding: "10px 24px", fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {sending ? "Starting..." : "Start Conversation"}
            </button>
          </div>
        ) : thread ? (
          /* Chat window */
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,39,107,0.07)", background: "rgba(0,39,107,0.02)" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#00276b" }}>{thread.subject}</div>
              <div style={{ fontSize: "11px", color: "#adc6d8" }}>Direct conversation with CeyBreeze Tours</div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8f9fa" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8", fontSize: "13px" }}>
                  Start the conversation by sending a message below.
                </div>
              )}
              {messages.map(m => {
                const isCustomer = m.senderRole === "customer";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: isCustomer ? "flex-end" : "flex-start", marginBottom: "10px" }}>
                    <div style={{
                      maxWidth: "72%",
                      background: isCustomer ? "#00276b" : "#fff",
                      color:      isCustomer ? "#fff"     : "#212529",
                      borderRadius: isCustomer ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "8px 12px",
                      border: isCustomer ? "none" : "1px solid rgba(0,39,107,0.08)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}>
                      {!isCustomer && <div style={{ fontSize: "10px", color: "#a8edff", fontWeight: 700, marginBottom: "3px", background: "#00276b", display: "inline-block", padding: "1px 7px", borderRadius: "8px" }}>CeyBreeze</div>}
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5 }}>{m.text}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: isCustomer ? "rgba(255,255,255,0.55)" : "#adb5bd", textAlign: "right" }}>
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
                placeholder="Type a message... (Enter to send)"
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
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#adc6d8", textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.2 }}>✉</div>
            <div style={{ fontSize: "14px", marginBottom: "8px" }}>Select a conversation</div>
            <div style={{ fontSize: "12px" }}>Or click + New to start a new one</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */
export default function MyMessages() {
  const [uid,          setUid]          = useState(null);
  const [userEmail,    setUserEmail]    = useState(null);
  const [userName,     setUserName]     = useState("Traveller");
  const [tab,          setTab]          = useState("direct");
  const [bookings,     setBookings]     = useState([]);
  const [chatMeta,     setChatMeta]     = useState({}); // { bookingId: { lastMessage, adminUnread, customerUnread } }
  const [loading,      setLoading]      = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showChat,     setShowChat]     = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const navigate = useNavigate();

  /* ── Auth ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { navigate("/customer-login"); return; }
      setUid(user.uid);
      setUserEmail(user.email);
      try {
        const snap = await getDoc(doc(db, "customers", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserName(`${d.firstName || ""} ${d.lastName || ""}`.trim() || "Traveller");
        }
      } catch (_) {}
    });
    return () => unsub();
  }, []);

  /* ── Load all bookings ── */
  useEffect(() => {
    if (!userEmail) return;
    const load = async () => {
      const all = [];
      await Promise.all(
        BOOKING_COLLECTIONS.map(async ({ col, type, status }) => {
          try {
            const q    = query(collection(db, col), where("customerEmail", "==", userEmail));
            const snap = await getDocs(q);
            snap.docs.forEach(d => all.push({ id: d.id, _col: col, _type: type, _status: status, ...d.data() }));
          } catch (_) {}
        })
      );
      setBookings(all);
      setLoading(false);
    };
    load();
  }, [userEmail]);

  /* ── Listen to bookingMessages for all bookings ── */
  useEffect(() => {
    if (!bookings.length) return;
    const unsubs = bookings.map(b => {
      return onSnapshot(doc(db, "bookingMessages", b.id), snap => {
        if (snap.exists()) {
          setChatMeta(prev => ({ ...prev, [b.id]: snap.data() }));
        }
      }, () => {});
    });
    return () => unsubs.forEach(u => u());
  }, [bookings]);

  const filteredBookings = bookings.filter(b => {
    const hasMeta = !!chatMeta[b.id]; // only show if chat has been initiated
    if (!hasMeta) return false;
    if (filterStatus === "all") return true;
    return b._status === filterStatus;
  });

  const totalUnread = Object.values(chatMeta).reduce((s, m) => s + (m.customerUnread || 0), 0);

  const tabStyle = (t) => ({
    padding: "10px 22px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
    border: "none",
    background: tab === t ? "#00276b" : "transparent",
    color:      tab === t ? "#fff"     : "#7a9ab8",
    borderRadius: "6px", transition: "all 0.2s",
    position: "relative",
  });

  return (
    <CustomerLayout pageTitle="Messages">
      <div style={{margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>
            Messages
          </h3>
          <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
            Direct messages to CeyBreeze · Tour chats
            {totalUnread > 0 && (
              <span style={{ marginLeft: "10px", background: "#e24b4a", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "1px 8px", borderRadius: "10px" }}>
                {totalUnread} unread
              </span>
            )}
          </p>
        </div>

        {/* Tab strip */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(0,39,107,0.04)", borderRadius: "8px", padding: "4px", marginBottom: "24px", width: "fit-content" }}>
          <button style={tabStyle("direct")} onClick={() => setTab("direct")}>
            ✉ Direct Messages
          </button>
          <button style={{ ...tabStyle("tours"), position: "relative" }} onClick={() => setTab("tours")}>
            ✈ Tour Chats
            {totalUnread > 0 && (
              <span style={{ marginLeft: "6px", background: "#e24b4a", color: "#fff", borderRadius: "10px", fontSize: "9px", fontWeight: 700, padding: "1px 5px" }}>
                {totalUnread}
              </span>
            )}
          </button>
        </div>

        {/* ── DIRECT MESSAGES TAB ── */}
        {tab === "direct" && (
          <DirectMessageThread uid={uid} userEmail={userEmail} userName={userName} />
        )}

        {/* ── TOUR CHATS TAB ── */}
        {tab === "tours" && (
          <div>
            {/* Filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {["all","unpaid","paid","confirmed","completed"].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    padding: "6px 14px", fontSize: "11px", fontWeight: 600,
                    border: "1.5px solid",
                    borderColor: filterStatus === s ? "#00276b" : "rgba(0,39,107,0.15)",
                    background:  filterStatus === s ? "#00276b" : "#fff",
                    color:       filterStatus === s ? "#fff"     : "#7a9ab8",
                    cursor: "pointer", textTransform: "capitalize",
                  }}
                >
                  {s === "all" ? "All Tours" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>Loading tour chats...</div>
            ) : filteredBookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#adc6d8" }}>
                <div style={{ fontSize: "40px", opacity: 0.2, marginBottom: "16px" }}>✈</div>
                <p style={{ fontSize: "14px" }}>
                  {bookings.length === 0
                    ? "No bookings found."
                    : "No tour chats initiated yet. Chats appear here after your admin or you starts a conversation on a booking."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredBookings.map(b => {
                  const meta     = chatMeta[b.id] || {};
                  const typeInfo = TYPE_COLORS[b._type] || TYPE_COLORS.preset;
                  const statInfo = STATUS_COLORS[b._status] || STATUS_COLORS.confirmed;
                  const unread   = meta.customerUnread || 0;
                  const tourName = getTourName(b, b._type);
                  const ref      = b.bookingReference || b.id;

                  return (
                    <div key={b.id} style={{
                      background: "#fff",
                      border: `1px solid ${unread > 0 ? "#00276b" : "rgba(0,39,107,0.07)"}`,
                      padding: "16px 18px",
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", flexWrap: "wrap", gap: "12px",
                    }}>
                      {/* Left info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                          <span style={{ ...typeInfo, fontSize: "9px", fontWeight: 700, padding: "1px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {typeInfo.label}
                          </span>
                          <span style={{ ...statInfo, fontSize: "9px", fontWeight: 700, padding: "1px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {statInfo.label}
                          </span>
                          <span style={{ fontSize: "11px", color: "#adc6d8" }}>{ref}</span>
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#00276b", marginBottom: "3px" }}>
                          {tourName}
                        </div>
                        <div style={{ fontSize: "12px", color: "#7a9ab8" }}>
                          {meta.lastMessage
                            ? `${meta.lastMessage.slice(0, 60)}${meta.lastMessage.length > 60 ? "..." : ""}`
                            : "No messages yet"}
                        </div>
                      </div>

                      {/* Right */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                        <div style={{ fontSize: "11px", color: "#adc6d8" }}>
                          {fmtDate(meta.lastMessageAt)}
                        </div>
                        {unread > 0 && (
                          <span style={{
                            background: "#e24b4a", color: "#fff",
                            borderRadius: "12px", fontSize: "10px",
                            fontWeight: 700, padding: "2px 8px",
                          }}>
                            {unread} new
                          </span>
                        )}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => { setSelectedChat(b); setShowChat(true); }}
                            style={{
                              background: unread > 0 ? "#00276b" : "rgba(0,39,107,0.06)",
                              color:      unread > 0 ? "#fff"     : "#00276b",
                              border: "none", padding: "7px 14px",
                              fontSize: "11px", fontWeight: 700,
                              cursor: "pointer", letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            💬 {unread > 0 ? `Open (${unread})` : "Open Chat"}
                          </button>
                          <button
                            onClick={() => navigate("/customer/my-reservations")}
                            style={{
                              background: "rgba(0,39,107,0.04)",
                              color: "#7a9ab8", border: "1px solid rgba(0,39,107,0.12)",
                              padding: "7px 12px", fontSize: "11px", fontWeight: 700,
                              cursor: "pointer", letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            ✈ View Booking
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ height: "32px" }} />
      </div>

      {/* Tour chat modal */}
      <CustomerChatModal
        show={showChat}
        onHide={() => { setShowChat(false); setSelectedChat(null); }}
        booking={selectedChat}
      />
    </CustomerLayout>
  );
}