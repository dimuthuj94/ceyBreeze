// src/components/modals/customer/ViewNotificationsModal.js
import React, { useEffect, useState, useRef } from "react";
import {
  collection, query, where, onSnapshot,
  orderBy, doc, writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { NOTIF_META } from "../../../utils/notificationHelper";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d   = ts?.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)     return "Just now";
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const dataRow = (label, value) => value ? (
  <div style={{ display: "flex", gap: "8px", fontSize: "11px", marginTop: "4px" }}>
    <span style={{ color: "#adc6d8", minWidth: "120px", flexShrink: 0 }}>{label}</span>
    <span style={{ color: "#343a40", fontWeight: 500 }}>{value}</span>
  </div>
) : null;

export default function ViewNotificationsModal({ show, onHide, bookingId, bookingReference }) {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);

  /* Persistent accumulators */
  const byBookingRef  = useRef([]);
  const loadedRef     = useRef(false);

  /* ── Listen while modal is open ── */
  useEffect(() => {
    if (!show || !bookingId) return;

    /* Reset on each open */
    byBookingRef.current = [];
    loadedRef.current    = false;
    setLoading(true);
    setNotifications([]);

    const q = query(
      collection(db, "customerNotifications"),
      where("bookingId", "==", bookingId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      snap => {
        byBookingRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        loadedRef.current    = true;

        /* Sort newest first (Firestore already does this but be explicit) */
        const sorted = [...byBookingRef.current].sort((a, b) => {
          const da  = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return db_ - da;
        });

        setNotifications(sorted);
        setLoading(false);
      },
      err => {
        console.warn("ViewNotificationsModal query error:", err.message);
        loadedRef.current = true;
        setLoading(false);
      }
    );

    return () => unsub();
  }, [show, bookingId]);

  /* ── Mark all as read when modal opens and notifications load ── */
  useEffect(() => {
    if (!show || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n =>
      batch.update(doc(db, "customerNotifications", n.id), { read: true })
    );
    batch.commit().catch(() => {});
  }, [show, notifications.length]); /* Only re-run when count changes, not on every render */

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)", zIndex: 600,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", width: "520px", maxWidth: "96vw",
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          background: "#00276b", padding: "16px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "16px", color: "#fff" }}>
              Notifications
            </div>
            <div style={{ fontSize: "11px", color: "#a8edff", marginTop: "2px" }}>
              {bookingReference} · {notifications.length} total
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: "8px", background: "#e24b4a", color: "#fff",
                  borderRadius: "10px", padding: "0 6px",
                  fontSize: "10px", fontWeight: 700,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onHide}
            style={{ background: "none", border: "none", color: "#a8edff", cursor: "pointer", fontSize: "18px" }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
              <div style={{ fontSize: "28px", opacity: 0.2, marginBottom: "12px" }}>🔔</div>
              <p style={{ fontSize: "13px" }}>Loading...</p>
            </div>

          ) : notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.3 }}>🔔</div>
              <p style={{ fontSize: "13px" }}>No notifications for this booking yet.</p>
            </div>

          ) : (
            <div style={{ position: "relative" }}>
              {/* Timeline spine */}
              <div style={{
                position: "absolute", left: "19px", top: 0, bottom: 0,
                width: "2px", background: "rgba(0,39,107,0.07)",
              }} />

              {notifications.map((n) => {
                const meta = NOTIF_META[n.type] || {
                  icon: "🔔", color: "#7a9ab8", bg: "#f1f3f5", label: n.type || "Notification",
                };

                return (
                  <div key={n.id} style={{ display: "flex", gap: "14px", marginBottom: "16px", position: "relative" }}>

                    {/* Icon dot */}
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "50%",
                      background: meta.bg, border: `2px solid ${meta.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "16px", flexShrink: 0, zIndex: 1,
                    }}>
                      {meta.icon}
                    </div>

                    {/* Content bubble */}
                    <div style={{
                      flex: 1,
                      background: n.read ? "#fafafa" : "#fff",
                      border: `1px solid ${n.read ? "rgba(0,39,107,0.06)" : meta.color}`,
                      padding: "12px 14px",
                      opacity: n.read ? 0.85 : 1,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{
                              fontSize: "9px", fontWeight: 700, padding: "1px 7px",
                              background: meta.bg, color: meta.color,
                              textTransform: "uppercase", letterSpacing: "0.06em",
                            }}>
                              {meta.label}
                            </span>
                            {!n.read && (
                              <span style={{
                                width: "7px", height: "7px", borderRadius: "50%",
                                background: "#e24b4a", display: "inline-block",
                              }} />
                            )}
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#00276b", marginBottom: "3px" }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: "12px", color: "#7a9ab8", lineHeight: 1.5 }}>
                            {n.message}
                          </div>
                        </div>
                        <div style={{ fontSize: "10px", color: "#adc6d8", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {fmtDate(n.createdAt)}
                        </div>
                      </div>

                      {/* Extra data */}
                      {n.data && Object.keys(n.data).length > 0 && (
                        <div style={{
                          marginTop: "10px", padding: "8px 10px",
                          background: "rgba(0,39,107,0.025)",
                          borderLeft: `3px solid ${meta.color}`,
                        }}>
                          {dataRow("Driver",         n.data.driverName)}
                          {dataRow("Vehicle",        n.data.vehicleName)}
                          {dataRow("Plate No.",      n.data.vehiclePlate)}
                          {dataRow("Receipt ID",     n.data.receiptId)}
                          {dataRow("Amount Paid",    n.data.paidAmountUSD
                            ? `USD ${n.data.paidAmountUSD} / LKR ${n.data.paidAmountLKR}`
                            : null
                          )}
                          {dataRow("Remaining",      n.data.remainingUSD
                            ? `USD ${n.data.remainingUSD}`
                            : null
                          )}
                          {dataRow("New Arrival",    n.data.newArrivalDate)}
                          {dataRow("New Departure",  n.data.newDepartureDate)}
                          {dataRow("New Price",      n.data.newPrice
                            ? `USD ${n.data.newPrice}`
                            : n.data.newTotalPrice || null
                          )}
                          {dataRow("Refund Amount",  n.data.refundAmount
                            ? `USD ${n.data.refundAmount}`
                            : null
                          )}
                          {dataRow("Refund Type",    n.data.refundType)}
                          {dataRow("Admin Note",     n.data.reason
                            || n.data.rejectionReason
                            || n.data.adminNote
                            || null
                          )}
                          {dataRow("Settled (USD)",  n.data.settledAmountUSD
                            ? `USD ${n.data.settledAmountUSD}`
                            : null
                          )}
                          {dataRow("Settled (LKR)",  n.data.settledAmountLKR
                            ? `LKR ${n.data.settledAmountLKR}`
                            : null
                          )}
                          {dataRow("Fully Settled",  n.data.fullySettled != null
                            ? (n.data.fullySettled ? "Yes" : "No — partial")
                            : null
                          )}
                          {dataRow("Exchange Rate",  n.data.exchangeRate
                            ? `1 USD = LKR ${n.data.exchangeRate}`
                            : null
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid rgba(0,39,107,0.07)",
          padding: "12px 20px",
          display: "flex", justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          <button
            onClick={onHide}
            style={{
              background: "rgba(0,39,107,0.06)", border: "none",
              color: "#00276b", fontSize: "12px", fontWeight: 700,
              padding: "8px 20px", cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}