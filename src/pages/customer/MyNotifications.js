// src/pages/customer/MyNotifications.js
import React, { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, writeBatch, deleteDoc, getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import CustomerLayout from "../../components/layouts/customer/CustomerLayout";
import { NOTIF_META } from "../../utils/notificationHelper";
import { useNavigate } from "react-router-dom";
import ViewDriverModal  from "../../components/modals/general/ViewDriverModal";
import ViewVehicleModal from "../../components/modals/general/ViewVehicleModal";
import ViewReceiptModal from "../../components/modals/bookings/ViewReceiptModal";
import ViewFinalReceiptModal from "../../components/modals/bookings/ViewFinalReceiptModal";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d    = ts?.toDate ? ts.toDate() : new Date(ts);
  const now  = new Date();
  const diff = now - d;
  if (diff < 60000)     return "Just now";
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const dataRow = (label, value) => value ? (
  <div style={{ display: "flex", gap: "8px", fontSize: "11px", marginTop: "3px" }}>
    <span style={{ color: "#adc6d8", minWidth: "120px", flexShrink: 0 }}>{label}</span>
    <span style={{ color: "#343a40", fontWeight: 500 }}>{value}</span>
  </div>
) : null;

const TYPE_LABEL = { preset: "Preset Tour", custom: "Custom Tour", vehicle: "Vehicle Only" };

/* ── Small action button ── */
const ActBtn = ({ onClick, children, danger = false, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: danger ? "#fcebeb" : "rgba(0,39,107,0.06)",
      color:      danger ? "#791f1f" : "#00276b",
      border: `1px solid ${danger ? "rgba(220,53,69,0.2)" : "rgba(0,39,107,0.12)"}`,
      fontSize: "10px", fontWeight: 700, padding: "4px 10px",
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: "0.04em", textTransform: "uppercase",
      opacity: disabled ? 0.5 : 1, borderRadius: "4px",
    }}
  >
    {children}
  </button>
);

export default function MyNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [uid,           setUid]           = useState(null);
  const [userEmail,     setUserEmail]     = useState(null);
  const [tab,           setTab]           = useState("all");
  const [filterType,    setFilterType]    = useState("all");
  const [expanded,      setExpanded]      = useState({});
  const navigate = useNavigate();

  /* ── Modal state ── */
  const [driverModal,       setDriverModal]       = useState({ show: false, driver: null });
  const [vehicleModal,      setVehicleModal]       = useState({ show: false, vehicle: null });
  const [receiptModal,      setReceiptModal]       = useState({ show: false, booking: null });
  const [finalReceiptModal, setFinalReceiptModal]  = useState({ show: false, bookingId: null });
  const [loadingAction,     setLoadingAction]      = useState(null); // notif ID being actioned

  /* ── Persistent refs ── */
  const byIdRef    = useRef([]);
  const byEmailRef = useRef([]);
  const loadedRef  = useRef({ a: false, b: false });

  /* ── Auth ── */
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, user => {
      if (user) { setUid(user.uid); setUserEmail(user.email); }
      else navigate("/customer-login");
    });
    return () => unsub();
  }, []);

  /* ── Dual real-time queries ── */
  useEffect(() => {
    if (!uid || !userEmail) return;
    byIdRef.current    = [];
    byEmailRef.current = [];
    loadedRef.current  = { a: false, b: false };
    setLoading(true);
    setNotifications([]);

    const merge = () => {
      if (!loadedRef.current.a || !loadedRef.current.b) return;
      const seen = new Map();
      [...byIdRef.current, ...byEmailRef.current].forEach(n => {
        if (!seen.has(n.id)) seen.set(n.id, n);
      });
      const sorted = [...seen.values()].sort((a, b) => {
        const da  = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return db_ - da;
      });
      setNotifications(sorted);
      setLoading(false);
    };

    const q1 = query(collection(db, "customerNotifications"), where("customerId", "==", uid));
    const unsub1 = onSnapshot(q1, { includeMetadataChanges: true }, snap => {
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (snap.metadata.fromCache && fresh.length === 0 && byIdRef.current.length > 0) return;
      byIdRef.current   = fresh;
      loadedRef.current = { ...loadedRef.current, a: true };
      merge();
    }, err => { console.warn("UID query:", err.message); loadedRef.current = { ...loadedRef.current, a: true }; merge(); });

    const q2 = query(collection(db, "customerNotifications"), where("customerEmail", "==", userEmail));
    const unsub2 = onSnapshot(q2, { includeMetadataChanges: true }, snap => {
      const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (snap.metadata.fromCache && fresh.length === 0 && byEmailRef.current.length > 0) return;
      byEmailRef.current = fresh;
      loadedRef.current  = { ...loadedRef.current, b: true };
      merge();
    }, err => { console.warn("Email query:", err.message); loadedRef.current = { ...loadedRef.current, b: true }; merge(); });

    return () => { unsub1(); unsub2(); };
  }, [uid, userEmail]);

  /* ── Actions ── */
  const markRead = async (id) => {
    try { await updateDoc(doc(db, "customerNotifications", id), { read: true }); } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => batch.update(doc(db, "customerNotifications", n.id), { read: true }));
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  const clearNotification = async (n) => {
    try { await deleteDoc(doc(db, "customerNotifications", n.id)); } catch (e) { console.error(e); }
  };

  const clearAll = async () => {
    if (!window.confirm(`Clear all ${notifications.length} notifications? This cannot be undone.`)) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => batch.delete(doc(db, "customerNotifications", n.id)));
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  /* ── View Driver ── */
  const handleViewDriver = async (n) => {
    const driverId = n.data?.driverId;
    if (!driverId) { alert("Driver ID not available."); return; }
    setLoadingAction(n.id);
    try {
      const colName = driverId.startsWith("DRV-E-") ? "drivers" : "externalDrivers";
      const snap    = await getDoc(doc(db, colName, driverId));
      if (snap.exists()) setDriverModal({ show: true, driver: { id: snap.id, ...snap.data() } });
      else alert("Driver details not found.");
    } catch (e) { alert("Failed to load driver: " + e.message); }
    finally { setLoadingAction(null); }
  };

  /* ── View Vehicle ── */
  const handleViewVehicle = async (n) => {
    const vehicleId = n.data?.vehicleId;
    if (!vehicleId) { alert("Vehicle ID not available."); return; }
    setLoadingAction(n.id);
    try {
      const colName = vehicleId.startsWith("VEH-E-") ? "vehicleFleet" : "externalVehicles";
      const snap    = await getDoc(doc(db, colName, vehicleId));
      if (snap.exists()) setVehicleModal({ show: true, vehicle: { id: snap.id, ...snap.data() } });
      else alert("Vehicle details not found.");
    } catch (e) { alert("Failed to load vehicle: " + e.message); }
    finally { setLoadingAction(null); }
  };

  /* ── View Receipt ── */
  const handleViewReceipt = (n) => {
    const receiptId = n.data?.receiptId;
    if (!receiptId) { alert("Receipt ID not available."); return; }
    setReceiptModal({ show: true, booking: { id: n.bookingId, receiptId } });
  };

  /* ── View Final (Balance) Receipt ── */
  const handleViewFinalReceipt = (n) => {
    if (!n.bookingId) { alert("Booking ID not available."); return; }
    setFinalReceiptModal({ show: true, bookingId: n.bookingId });
  };

  /* ── Derived ── */
  const unreadCount = notifications.filter(n => !n.read).length;
  const types       = [...new Set(notifications.map(n => n.type).filter(Boolean))];

  const filtered = notifications.filter(n => {
    if (tab === "unread" && n.read)                    return false;
    if (filterType !== "all" && n.type !== filterType) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, n) => {
    const key = n.bookingId || "general";
    if (!acc[key]) acc[key] = {
      bookingId:        key,
      bookingReference: n.bookingReference || key,
      bookingType:      n.bookingType || null,
      items:            [],
    };
    acc[key].items.push(n);
    return acc;
  }, {});

  const tabStyle = (t) => ({
    padding: "8px 18px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none",
    background: tab === t ? "#00276b" : "transparent",
    color:      tab === t ? "#fff"     : "#7a9ab8",
    borderRadius: "6px", transition: "all 0.2s",
  });

  /* ── Render action buttons per notification type ── */
  const renderButtons = (n) => {
    const isBusy = loadingAction === n.id;
    const buttons = [];

    /* View Booking — always if bookingId exists */
    if (n.bookingId && n.bookingId !== "general") {
      buttons.push(
        <ActBtn key="booking" onClick={() => navigate("/customer/my-reservations")}>
          ✈ View Booking
        </ActBtn>
      );
    }

    /* Type-specific buttons */
    if (n.type === "receipt_available" || n.type === "booking_payment_received") {
      if (n.data?.receiptId) {
        buttons.push(
          <ActBtn key="receipt" onClick={() => handleViewReceipt(n)} disabled={isBusy}>
            🧾 View Receipt
          </ActBtn>
        );
      }
    }

    if (n.type === "driver_assigned" || n.type === "driver_changed") {
      if (n.data?.driverId) {
        buttons.push(
          <ActBtn key="driver" onClick={() => handleViewDriver(n)} disabled={isBusy}>
            {isBusy ? "Loading..." : "🧑‍✈️ View Driver"}
          </ActBtn>
        );
      }
    }

    if (n.type === "vehicle_assigned" || n.type === "vehicle_changed") {
      if (n.data?.vehicleId) {
        buttons.push(
          <ActBtn key="vehicle" onClick={() => handleViewVehicle(n)} disabled={isBusy}>
            {isBusy ? "Loading..." : "🚐 View Vehicle"}
          </ActBtn>
        );
      }
    }

    if (n.type === "balance_updated") {
      buttons.push(
        <ActBtn key="finalreceipt" onClick={() => handleViewFinalReceipt(n)} disabled={isBusy}>
          💰 View Balance Receipt
        </ActBtn>
      );
    }

    if (n.type === "tour_confirmed") {
      buttons.push(
        <ActBtn key="booking2" onClick={() => navigate("/customer/my-reservations")}>
          ✈ View Booking
        </ActBtn>
      );
    }

    /* Clear this notification */
    buttons.push(
      <ActBtn key="clear" onClick={() => clearNotification(n)} danger>✕ Clear</ActBtn>
    );

    return buttons.length > 0 ? (
      <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {buttons}
      </div>
    ) : null;
  };

  /* ════════════════════════════════════════════════════════════ */
  return (
    <CustomerLayout pageTitle="Notifications">

      {/* ── Modals ── */}
      <ViewDriverModal
        show={driverModal.show}
        onHide={() => setDriverModal({ show: false, driver: null })}
        driver={driverModal.driver}
      />
      <ViewVehicleModal
        show={vehicleModal.show}
        onHide={() => setVehicleModal({ show: false, vehicle: null })}
        vehicle={vehicleModal.vehicle}
      />
      <ViewReceiptModal
        show={receiptModal.show}
        onHide={() => setReceiptModal({ show: false, booking: null })}
        booking={receiptModal.booking}
      />
      <ViewFinalReceiptModal
        show={finalReceiptModal.show}
        onHide={() => setFinalReceiptModal({ show: false, bookingId: null })}
        bookingId={finalReceiptModal.bookingId}
      />

      <div >

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>
              Notifications
            </h3>
            <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
              {notifications.length} total
              {unreadCount > 0 && (
                <span style={{ marginLeft: "8px", background: "#e24b4a", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "1px 8px", borderRadius: "10px" }}>
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: "rgba(0,39,107,0.06)", border: "none", color: "#00276b", fontSize: "11px", fontWeight: 700, padding: "8px 14px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                ✓ Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} style={{ background: "#fcebeb", border: "none", color: "#791f1f", fontSize: "11px", fontWeight: 700, padding: "8px 14px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                ✕ Clear All
              </button>
            )}
          </div>
        </div>

        {/* Tabs + filter */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "4px", background: "rgba(0,39,107,0.04)", borderRadius: "8px", padding: "4px" }}>
            <button style={tabStyle("all")}    onClick={() => setTab("all")}>All ({notifications.length})</button>
            <button style={tabStyle("unread")} onClick={() => setTab("unread")}>Unread ({unreadCount})</button>
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: "12px", padding: "7px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
            <option value="all">All Types</option>
            {types.map(t => { const meta = NOTIF_META[t] || {}; return <option key={t} value={t}>{meta.label || t}</option>; })}
          </select>
          <span style={{ fontSize: "12px", color: "#7a9ab8", marginLeft: "auto" }}>{filtered.length} shown</span>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#adc6d8" }}>
            <div style={{ fontSize: "32px", opacity: 0.2, marginBottom: "12px" }}>🔔</div>
            <p style={{ fontSize: "13px" }}>Loading notifications...</p>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#adc6d8" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.2 }}>🔔</div>
            <p style={{ fontSize: "14px" }}>
              {tab === "unread" ? "No unread notifications." : "No notifications yet."}
            </p>
            <p style={{ fontSize: "12px", marginTop: "8px" }}>
              Notifications appear here when receipts are generated, drivers and vehicles are assigned, and more.
            </p>
          </div>

        ) : (
          Object.values(grouped).map(group => {
            const groupUnread = group.items.filter(n => !n.read).length;
            const isExpanded  = expanded[group.bookingId] !== false;

            return (
              <div key={group.bookingId} style={{ marginBottom: "20px" }}>

                {/* Group header */}
                <div
                  onClick={() => setExpanded(p => ({ ...p, [group.bookingId]: !isExpanded }))}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#00276b", cursor: "pointer", userSelect: "none" }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {group.bookingType ? (TYPE_LABEL[group.bookingType] || "Booking") : "General"}
                    </span>
                    {group.bookingReference !== "general" && (
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>{group.bookingReference}</span>
                    )}
                    {groupUnread > 0 && (
                      <span style={{ background: "#e24b4a", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "1px 7px", borderRadius: "10px" }}>
                        {groupUnread} new
                      </span>
                    )}
                  </div>
                  <span style={{ color: "#a8edff", fontSize: "12px" }}>{group.items.length} · {isExpanded ? "▲" : "▼"}</span>
                </div>

                {/* Notification items */}
                {isExpanded && (
                  <div style={{ border: "1px solid rgba(0,39,107,0.07)", borderTop: "none" }}>
                    {group.items.map((n, i) => {
                      const meta   = NOTIF_META[n.type] || { icon: "🔔", color: "#7a9ab8", bg: "#f1f3f5", label: n.type || "Notification" };
                      const isLast = i === group.items.length - 1;

                      return (
                        <div
                          key={n.id}
                          style={{
                            display: "flex", gap: "14px", padding: "14px 16px",
                            borderBottom: !isLast ? "1px solid rgba(0,39,107,0.05)" : "none",
                            background:   n.read ? "#fafafa" : "#fff",
                            transition:   "background 0.2s",
                          }}
                        >
                          {/* Icon */}
                          <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: meta.bg, border: `2px solid ${meta.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                            {meta.icon}
                          </div>

                          {/* Body */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 7px", background: meta.bg, color: meta.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {meta.label}
                                  </span>
                                  {!n.read && (
                                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#e24b4a", display: "inline-block", flexShrink: 0 }} />
                                  )}
                                </div>
                                <div
                                  style={{ fontSize: "13px", fontWeight: 600, color: "#00276b", marginBottom: "3px", cursor: !n.read ? "pointer" : "default" }}
                                  onClick={() => !n.read && markRead(n.id)}
                                >
                                  {n.title}
                                </div>
                                <div style={{ fontSize: "12px", color: "#7a9ab8", lineHeight: 1.5 }}>{n.message}</div>
                              </div>
                              <div style={{ fontSize: "10px", color: "#adc6d8", whiteSpace: "nowrap", flexShrink: 0 }}>{fmtDate(n.createdAt)}</div>
                            </div>

                            {/* Extra data panel */}
                            {n.data && Object.keys(n.data).length > 0 && (
                              <div style={{ marginTop: "10px", padding: "9px 12px", background: "rgba(0,39,107,0.025)", borderLeft: `3px solid ${meta.color}` }}>
                                {dataRow("Driver",         n.data.driverName)}
                                {dataRow("Vehicle",        n.data.vehicleName)}
                                {dataRow("Plate No.",      n.data.vehiclePlate)}
                                {dataRow("Receipt ID",     n.data.receiptId)}
                                {dataRow("Amount Paid",    n.data.paidAmountUSD ? `USD ${n.data.paidAmountUSD} / LKR ${n.data.paidAmountLKR}` : null)}
                                {dataRow("Remaining",      n.data.remainingUSD ? `USD ${n.data.remainingUSD}` : null)}
                                {dataRow("New Arrival",    n.data.newArrivalDate)}
                                {dataRow("New Departure",  n.data.newDepartureDate)}
                                {dataRow("New Price",      n.data.newPrice ? `USD ${n.data.newPrice}` : n.data.newTotalPrice || null)}
                                {dataRow("Refund Amount",  n.data.refundAmount ? `USD ${n.data.refundAmount}` : null)}
                                {dataRow("Refund Type",    n.data.refundType)}
                                {dataRow("Admin Note",     n.data.adminNote || n.data.reason || n.data.rejectionReason || null)}
                                {dataRow("Settled (USD)",  n.data.settledAmountUSD ? `USD ${n.data.settledAmountUSD}` : null)}
                                {dataRow("Settled (LKR)",  n.data.settledAmountLKR ? `LKR ${n.data.settledAmountLKR}` : null)}
                                {dataRow("Fully Settled",  n.data.fullySettled != null ? (n.data.fullySettled ? "Yes" : "No — partial") : null)}
                                {dataRow("Exchange Rate",  n.data.exchangeRate ? `1 USD = LKR ${n.data.exchangeRate}` : null)}
                              </div>
                            )}

                            {/* ── Action buttons ── */}
                            {renderButtons(n)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        <div style={{ height: "32px" }} />
      </div>
    </CustomerLayout>
  );
}