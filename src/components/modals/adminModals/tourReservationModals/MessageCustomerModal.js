// src/components/modals/adminModals/tourReservationModals/MessageCustomerModal.js
import React, { useState, useEffect, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../../../../firebase";
import { getAuth } from "firebase/auth";
import { sendCustomerNotification, NOTIF_TYPES } from "../../../../utils/notificationHelper";

export default function MessageCustomerModal({ show, onHide, booking }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const auth = getAuth();
  const adminEmail = auth.currentUser?.email || "admin";

  useEffect(() => {
    if (!booking || !show) return;

    // Ensure parent chat doc exists
    const ensureChat = async () => {
      const chatRef = doc(db, "bookingMessages", booking.id);
      const snap = await getDoc(chatRef);
      if (!snap.exists()) {
        await setDoc(chatRef, {
          bookingId: booking.id,
          customerEmail: booking.customerEmail,
          subject: `Reservation ${booking.id}`,
          createdAt: serverTimestamp(),
          lastMessage: null,
          adminUnread: 0,
          customerUnread: 0,
        });
      }
      // Mark admin messages as read
      await updateDoc(chatRef, { adminUnread: 0 });
    };
    ensureChat();

    const q = query(
      collection(db, "bookingMessages", booking.id, "messages"),
      orderBy("sentAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [booking, show]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !booking) return;
    setSending(true);
    try {
      await addDoc(collection(db, "bookingMessages", booking.id, "messages"), {
        text: input.trim(),
        senderEmail: adminEmail,
        senderRole: "admin",
        sentAt: serverTimestamp(),
      });
      // Update parent doc
      await updateDoc(doc(db, "bookingMessages", booking.id), {
        lastMessage: input.trim(),
        lastMessageAt: serverTimestamp(),
        customerUnread: (messages.filter(m => m.senderRole === "admin").length || 0) + 1,
      });

      //notifications
      await sendCustomerNotification({
        customerId:       booking.customerId || booking.uid || null,
        customerEmail:    booking.customerEmail,
        bookingId:        booking.id,
        bookingReference: booking.bookingReference || booking.id,
        /* bookingType:      getBookingType(booking), */
        type:             NOTIF_TYPES.MESSAGE_RECEIVED,
        title:            "New message from CeyBreeze Tours",
        message:          `You have a new message regarding your booking. Open the chat to read it.`,
        data:             {},
      });

      setInput("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) +
      " · " + ts.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  if (!booking) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <div>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>Message Customer</p>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
            Re: {booking.id} · {booking.customerEmail}
          </p>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      {/* Chat area */}
      <Modal.Body style={{ padding: 0, height: "420px", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#f8f9fa" }}>
          {messages.length === 0 && (
            <p style={{ textAlign: "center", color: "#adb5bd", fontSize: "13px", marginTop: "80px" }}>
              No messages yet. Start the conversation.
            </p>
          )}
          {messages.map((m) => {
            const isAdmin = m.senderRole === "admin";
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", marginBottom: "10px" }}>
                <div style={{
                  maxWidth: "72%",
                  background: isAdmin ? "#00276b" : "#fff",
                  color: isAdmin ? "#fff" : "#212529",
                  borderRadius: isAdmin ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "8px 12px",
                  border: isAdmin ? "none" : "1px solid #e9ecef",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }}>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5 }}>{m.text}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "10px", color: isAdmin ? "rgba(255,255,255,0.6)" : "#adb5bd", textAlign: "right" }}>
                    {fmt(m.sentAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #e9ecef", background: "#fff", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message... (Enter to send)"
            rows={2}
            style={{
              flex: 1, border: "1px solid #dee2e6", borderRadius: "8px",
              padding: "8px 10px", fontSize: "13px", resize: "none",
              fontFamily: "Arial, sans-serif",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              background: "#00276b", color: "#fff", border: "none",
              borderRadius: "8px", padding: "8px 16px", cursor: "pointer",
              fontSize: "13px", fontWeight: 500, alignSelf: "stretch",
              opacity: sending || !input.trim() ? 0.6 : 1,
            }}
          >
            Send
          </button>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ padding: "10px 14px", borderTop: "1px solid #f1f3f5" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}