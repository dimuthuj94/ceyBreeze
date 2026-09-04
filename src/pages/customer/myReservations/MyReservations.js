// src/pages/customer/myReservations/MyReservations.js
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, doc, getDoc,
  deleteDoc, onSnapshot,
} from "firebase/firestore";
import CustomerLayout from "../../../components/layouts/customer/CustomerLayout";

import ViewAndPayPresetTourModal       from "../../../components/modals/customer/ViewAndPayPresetTourModal";
import ViewAndPayCustomTourModal       from "../../../components/modals/customer/ViewAndPayCustomTourModal";
import ViewAndPayVehicleOnlyModal      from "../../../components/modals/customer/ViewAndPayVehicleOnlyModal";
import ViewPresetReservationModal      from "../../../components/modals/customer/ViewPresetReservationModal";
import ViewCustomReservationModal      from "../../../components/modals/customer/ViewCustomReservationModal";
import ViewVehicleOnlyReservationModal from "../../../components/modals/customer/ViewVehicleOnlyReservationModal";
import PresetBookedTourInvoiceModal    from "../../../components/modals/bookings/PresetBookedTourInvoiceModal";
import CustomBookedTourInvoiceModal    from "../../../components/modals/bookings/CustomBookedTourInvoiceModal";
import VehicleOnlyBookedInvoiceModal   from "../../../components/modals/bookings/VehicleOnlyBookedInvoiceModal";
import ViewPaymentProofModal           from "../../../components/modals/bookings/ViewPaymentProofModal";
import ViewReceiptModal                from "../../../components/modals/bookings/ViewReceiptModal";
import CustomerChatModal               from "../../../components/modals/customer/CustomerChatModal";
import GeneralConfirmationModal        from "../../../components/modals/general/GeneralConfirmationModal";
import GeneralDeleteConfirmationModal  from "../../../components/modals/general/GeneralDeleteConfirmationModal";
import ViewDriverModal                 from "../../../components/modals/general/ViewDriverModal";
import ViewVehicleModal                from "../../../components/modals/general/ViewVehicleModal";
import RequestDeletionModal            from "../../../components/modals/customer/RequestDeletionModal";
import RequestDateChangeModal          from "../../../components/modals/customer/RequestDateChangeModal";
import ViewNotificationsModal          from "../../../components/modals/customer/ViewNotificationsModal";

/* ── Constants ── */
const STEPS      = ["To Be Paid", "Paid", "Confirmed", "Started", "Completed"];
const STEP_INDEX = { unpaid: 0, paid: 1, confirmed: 2, started: 3, completed: 4 };

const COLLECTIONS = [
  { col: "unpaidPresetBookings",     status: "unpaid",    type: "preset"  },
  { col: "unpaidCustomBookings",     status: "unpaid",    type: "custom"  },
  { col: "unpaidVehicleBookings",    status: "unpaid",    type: "vehicle" },
  { col: "paidPresetBookings",       status: "paid",      type: "preset"  },
  { col: "paidCustomBookings",       status: "paid",      type: "custom"  },
  { col: "paidVehicleBookings",      status: "paid",      type: "vehicle" },
  { col: "confirmedPresetBookings",  status: "confirmed", type: "preset"  },
  { col: "confirmedCustomBookings",  status: "confirmed", type: "custom"  },
  { col: "confirmedVehicleBookings", status: "confirmed", type: "vehicle" },
  { col: "completedPresetBookings",  status: "completed", type: "preset"  },
  { col: "completedCustomBookings",  status: "completed", type: "custom"  },
  { col: "completedVehicleBookings", status: "completed", type: "vehicle" },
];

const TYPE_LABELS       = { preset: "Preset Tour", custom: "Custom Tour", vehicle: "Vehicle Only" };
const TYPE_BADGE_COLORS = {
  preset:  { background: "#e6f1fb", color: "#0c447c" },
  custom:  { background: "#e1f5ee", color: "#085041" },
  vehicle: { background: "#faeeda", color: "#633806" },
};
const STATUS_BADGE = {
  unpaid:    { background: "#fcebeb", color: "#791f1f", label: "To Be Paid"  },
  paid:      { background: "#faeeda", color: "#633806", label: "Paid"        },
  confirmed: { background: "#e6f1fb", color: "#0c447c", label: "Confirmed"   },
  started:   { background: "#e1f5ee", color: "#085041", label: "In Progress" },
  completed: { background: "#f1efe8", color: "#444441", label: "Completed"   },
};
const FILTER_OPTIONS = [
  { key: "all",       label: "All"         },
  { key: "unpaid",    label: "To Be Paid"  },
  { key: "paid",      label: "Paid"        },
  { key: "confirmed", label: "Confirmed"   },
  { key: "started",   label: "In Progress" },
  { key: "completed", label: "Completed"   },
];

/* ── Helpers ── */
const getTourName    = (b, t) => t === "vehicle" ? "Vehicle Reservation" : t === "custom" ? b["Tour Selection"]?.Tour || "Custom Tour" : b["Tour Info"]?.Tour || "Preset Tour";
const getArrivalDate = (b, t) => t === "vehicle" ? b.arrivalDate || "" : t === "custom" ? b["Traveler Details"]?.["Arrival Date"] || "" : b.Travelers?.["Arrival Date"] || "";
const getNights      = (b, t) => t === "vehicle" ? `${b.days || 0} days` : t === "custom" ? `${b["Tour Selection"]?.Nights || 0} nights` : `${b["Tour Info"]?.Nights || 0} nights`;
const getTravelers   = (b, t) => {
  if (t === "vehicle") return `${(b.vehicles || []).reduce((s, v) => s + (v.quantity || 0), 0)} vehicle(s)`;
  const src = t === "custom" ? b["Traveler Details"] : b.Travelers;
  const a = parseInt(src?.Adults) || 0;
  const c = parseInt(src?.Children) || 0;
  return [a && `${a} Adult${a > 1 ? "s" : ""}`, c && `${c} Child${c > 1 ? "ren" : ""}`].filter(Boolean).join(", ") || "—";
};
const getTotalPrice  = (b, t) => t === "vehicle" ? `$${b.totalPrice || 0}` : b["Pricing Summary"]?.["Total Price"] || "$0";
const getRef         = (b) => b.bookingReference || b.bookingId || b.id;
const getStepIndex   = (b) => b._status === "confirmed" && b.tourStatus === "started" ? 3 : STEP_INDEX[b._status] ?? 0;
const getProgressPct = (i) => [10, 30, 55, 78, 100][i] ?? 10;
const fmtDate        = (str) => {
  if (!str) return "—";
  try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return str; }
};

/* ════════════════════════════════════════════════════════
   MORE MENU — Portal-based to escape overflow:hidden
   Uses getBoundingClientRect() + position:fixed so the
   dropdown is never clipped by a parent card container.
════════════════════════════════════════════════════════ */
function MoreMenu({ items }) {
  const [open,    setOpen]    = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef  = useRef();
  const menuRef = useRef();

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect      = btnRef.current.getBoundingClientRect();
      const menuWidth = 200;
      const left      = Math.min(
        rect.right - menuWidth,
        window.innerWidth - menuWidth - 8
      );
      setMenuPos({ top: rect.bottom + 4, left: Math.max(8, left) });
    }
    setOpen(prev => !prev);
  };

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  /* Close on scroll */
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener("scroll", h, true);
    return () => window.removeEventListener("scroll", h, true);
  }, [open]);

  return (
    <>
      <button ref={btnRef} className="res-more-btn" onClick={handleOpen}>
        •••
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={menuRef}
          className="res-more-menu"
          style={{
            position: "fixed",
            top:      menuPos.top,
            left:     menuPos.left,
            zIndex:   99999,
            width:    "200px",
            background: "#fff",
            border: "1px solid rgba(0,39,107,0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {items.map((item, i) =>
            item === "divider"
              ? <div key={i} className="res-more-menu-divider" style={{ borderTop: "1px solid rgba(0,39,107,0.06)", margin: "4px 0" }} />
              : (
                <div
                  key={i}
                  className={`res-more-menu-item ${item.danger ? "danger" : ""}`}
                  onClick={() => { item.action?.(); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "9px 14px", cursor: "pointer", fontSize: "12px",
                    color: item.danger ? "#791f1f" : "#00276b",
                    background: "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#fcebeb" : "rgba(0,39,107,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontSize: "15px" }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{ background: "#e24b4a", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "1px 5px" }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/* ── Progress Bar ── */
function ReservationProgressBar({ stepIdx }) {
  return (
    <div className="res-card-progress">
      <div className="res-card-progress-track">
        <div className="res-card-progress-fill" style={{ width: `${getProgressPct(stepIdx)}%` }} />
      </div>
      <div className="res-card-steps">
        {STEPS.map((label, i) => {
          const isDone   = i < stepIdx;
          const isActive = i === stepIdx;
          return (
            <div key={i} className="res-card-step">
              <div className={`res-card-step-dot ${isDone ? "done" : isActive ? "active" : ""}`} />
              <span className={`res-card-step-label ${isDone ? "done" : isActive ? "active" : ""}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Active Tour Hero Card ── */
function ActiveTourCard({ booking, actions, unreadCount, notifCount }) {
  const { _type: type } = booking;
  const stepIdx = getStepIndex(booking);
  return (
    <div className="res-active-card">
      <div className="res-active-card-top">
        <div>
          <div className="res-active-tour-name">{getTourName(booking, type)}</div>
          <div className="res-active-ref">{getRef(booking)}</div>
        </div>
        <div className="res-active-status-pill">In Progress</div>
      </div>

      <div className="res-active-meta">
        {[
          { label: "Arrival",   val: fmtDate(getArrivalDate(booking, type)) },
          { label: "Duration",  val: getNights(booking, type)                },
          { label: "Travelers", val: getTravelers(booking, type)             },
          { label: "Total",     val: getTotalPrice(booking, type)            },
        ].map(({ label, val }) => (
          <div key={label} className="res-active-meta-item">
            <div className="res-active-meta-label">{label}</div>
            <div className="res-active-meta-val">{val}</div>
          </div>
        ))}
      </div>

      <div className="res-active-progress">
        <div className="res-active-progress-fill" style={{ width: `${getProgressPct(stepIdx)}%` }} />
      </div>
      <div className="res-active-steps">
        {STEPS.map((s, i) => (
          <span key={i} className={`res-active-step-label ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>{s}</span>
        ))}
      </div>

      <div className="res-active-actions">
        <button className="res-active-btn primary" onClick={() => actions.viewReservation(booking)}>View Reservation</button>
        <button className="res-active-btn ghost"   onClick={() => actions.viewInvoice(booking)}>Invoice</button>
        <button className="res-active-btn ghost"   onClick={() => actions.viewDriver(booking)}>Driver</button>
        <button className="res-active-btn ghost"   onClick={() => actions.viewVehicle(booking)}>Vehicle</button>
        <button className="res-active-btn ghost"   onClick={() => actions.chat(booking)} style={{ position: "relative" }}>
          💬 Chat
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: "3px", right: "3px", width: "7px", height: "7px", background: "#ff4444", border: "1.5px solid rgba(255,255,255,0.3)", display: "block" }} />
          )}
        </button>
        <button className="res-active-btn ghost" onClick={() => actions.viewNotifications(booking)} style={{ position: "relative" }}>
          🔔 Notifications
          {notifCount > 0 && (
            <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#e24b4a", color: "#fff", fontSize: "9px", fontWeight: 700, width: "15px", height: "15px", lineHeight: "15px", textAlign: "center", display: "block" }}>
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Reservation Card ── */
function ReservationCard({ booking, actions, unreadCount, notifCount }) {
  const { _type: type, _status: status } = booking;
  const stepIdx    = getStepIndex(booking);
  const statusInfo = status === "confirmed" && booking.tourStatus === "started"
    ? STATUS_BADGE.started : STATUS_BADGE[status];

  const primaryBtn = {
    unpaid:    { label: "View & Pay Now",   icon: "💳", action: () => actions.viewAndPay(booking)      },
    paid:      { label: "View Reservation", icon: "✈",  action: () => actions.viewReservation(booking) },
    confirmed: { label: "View Reservation", icon: "✈",  action: () => actions.viewReservation(booking) },
    started:   { label: "View Reservation", icon: "✈",  action: () => actions.viewReservation(booking) },
    completed: { label: "View Reservation", icon: "✈",  action: () => actions.viewReservation(booking) },
  }[status] || { label: "View", icon: "✈", action: () => {} };

  /* Notifications button */
  const NotifBtn = () => (
    <button className="res-btn-secondary" onClick={() => actions.viewNotifications(booking)} style={{ position: "relative" }}>
      <span>🔔</span> Notifications
      {notifCount > 0 && (
        <span style={{ display: "inline-block", background: "#e24b4a", color: "#fff", fontSize: "9px", fontWeight: 700, width: "14px", height: "14px", lineHeight: "14px", textAlign: "center", marginLeft: "4px", verticalAlign: "middle" }}>
          {notifCount > 9 ? "9+" : notifCount}
        </span>
      )}
    </button>
  );

  /* Chat button */
  const ChatBtn = () => (
    <button className="res-btn-secondary" onClick={() => actions.chat(booking)} style={{ position: "relative" }}>
      <span>💬</span> Chat
      {unreadCount > 0 && (
        <span style={{ position: "absolute", top: "4px", right: "4px", width: "7px", height: "7px", background: "#ff4444", border: "1.5px solid #fff", display: "block" }} />
      )}
    </button>
  );

  /* Secondary visible buttons per status */
  const secondaryBtns = {
    unpaid:    [<ChatBtn key="c" />],
    paid:      [<ChatBtn key="c" />],
    confirmed: [<ChatBtn key="c" />],
    started:   [
      <button key="inv" className="res-btn-secondary" onClick={() => actions.viewInvoice(booking)}><span>📄</span> Invoice</button>,
      <ChatBtn key="c" />,
    ],
    completed: [
      <button key="fb" className="res-btn-secondary" onClick={() => alert("Coming soon")}><span>⭐</span> Feedback</button>,
    ],
  }[status] || [];

  /* More menu items per status */
  const moreItems = {
    unpaid: [
      { icon: "📄", label: "View Invoice",        action: () => actions.viewInvoice(booking) },
      { icon: "💬", label: "Chat with Support",   action: () => actions.chat(booking) },
      "divider",
      { icon: "🗑", label: "Delete Reservation", action: () => actions.delete(booking), danger: true },
    ],
    paid: [
      { icon: "📄", label: "View Invoice",         action: () => actions.viewInvoice(booking) },
      { icon: "🧾", label: "View Payment Proof",    action: () => actions.viewProof(booking) },
      { icon: "📃", label: "View Receipt",          action: () => actions.viewReceipt(booking) },
      { icon: "📅", label: "Request Date Change",   action: () => actions.requestDateChange(booking) },
      "divider",
      { icon: "🗑", label: "Request Cancellation", action: () => actions.requestDelete(booking), danger: true },
    ],
    confirmed: [
      { icon: "📄", label: "View Invoice",         action: () => actions.viewInvoice(booking) },
      { icon: "🧾", label: "View Payment Proof",    action: () => actions.viewProof(booking) },
      { icon: "📃", label: "View Receipt",          action: () => actions.viewReceipt(booking) },
      { icon: "🚗", label: "View Driver",           action: () => actions.viewDriver(booking) },
      { icon: "🚌", label: "View Vehicle",          action: () => actions.viewVehicle(booking) },
      { icon: "📅", label: "Request Date Change",   action: () => actions.requestDateChange(booking) },
      "divider",
      { icon: "🗑", label: "Request Cancellation", action: () => actions.requestDelete(booking), danger: true },
    ],
    started: [
      { icon: "📄", label: "View Invoice",      action: () => actions.viewInvoice(booking) },
      { icon: "🧾", label: "View Payment Proof", action: () => actions.viewProof(booking)   },
      { icon: "📃", label: "View Receipt",       action: () => actions.viewReceipt(booking) },
      { icon: "🚗", label: "View Driver",        action: () => actions.viewDriver(booking)  },
      { icon: "🚌", label: "View Vehicle",       action: () => actions.viewVehicle(booking) },
    ],
    completed: [
      { icon: "📄", label: "View Invoice",      action: () => actions.viewInvoice(booking) },
      { icon: "🧾", label: "View Payment Proof", action: () => actions.viewProof(booking)   },
      { icon: "📃", label: "View Receipt",       action: () => actions.viewReceipt(booking) },
      { icon: "💬", label: "Chat",              action: () => actions.chat(booking)         },
    ],
  }[status] || [];

  return (
    <div className="res-card">
      <div className="res-card-top">
        <div className="res-card-top-row">
          <span className="res-card-type-badge"   style={TYPE_BADGE_COLORS[type]}>{TYPE_LABELS[type]}</span>
          <span className="res-card-status-badge" style={{ background: statusInfo?.background, color: statusInfo?.color }}>{statusInfo?.label}</span>
        </div>
        <div className="res-card-name">{getTourName(booking, type)}</div>
        <div className="res-card-ref">{getRef(booking)}</div>
        <div className="res-card-meta">
          <div className="res-card-meta-item"><span className="res-card-meta-label">Arrival</span><span className="res-card-meta-val">{fmtDate(getArrivalDate(booking, type))}</span></div>
          <div className="res-card-meta-item"><span className="res-card-meta-label">Duration</span><span className="res-card-meta-val">{getNights(booking, type)}</span></div>
          <div className="res-card-meta-item"><span className="res-card-meta-label">Travelers</span><span className="res-card-meta-val">{getTravelers(booking, type)}</span></div>
          <div className="res-card-meta-item"><span className="res-card-meta-label">Ref</span><span className="res-card-meta-val" style={{ fontSize: "10px" }}>{getRef(booking)}</span></div>
        </div>
        <div className="res-card-price-row">
          <span className="res-card-price-label">Total Amount</span>
          <span className="res-card-price-val">{getTotalPrice(booking, type)}</span>
        </div>
      </div>

      <ReservationProgressBar stepIdx={stepIdx} />

      <div className="res-card-actions">
        <button className="res-btn-primary" onClick={primaryBtn.action}>
          <span>{primaryBtn.icon}</span>{primaryBtn.label}
        </button>
        {secondaryBtns}
        <NotifBtn />
        {moreItems.length > 0 && <MoreMenu items={moreItems} />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function MyReservations() {
  const [allBookings,  setAllBookings]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("all");
  const [unreadMap,    setUnreadMap]    = useState({});
  const [notifMap,     setNotifMap]     = useState({});
  const navigate = useNavigate();

  /* Modal state */
  const [selectedBooking,       setSelectedBooking]       = useState(null);
  const [showViewAndPay,        setShowViewAndPay]        = useState(false);
  const [showViewReservation,   setShowViewReservation]   = useState(false);
  const [showInvoice,           setShowInvoice]           = useState(false);
  const [showProof,             setShowProof]             = useState(false);
  const [showReceipt,           setShowReceipt]           = useState(false);
  const [showChat,              setShowChat]              = useState(false);
  const [showDelete,            setShowDelete]            = useState(false);
  const [showRequestDelete,     setShowRequestDelete]     = useState(false);
  const [showRequestDateChange, setShowRequestDateChange] = useState(false);
  const [showDriver,            setShowDriver]            = useState(false);
  const [showVehicle,           setShowVehicle]           = useState(false);
  const [showNotAssigned,       setShowNotAssigned]       = useState(false);
  const [notAssignedMsg,        setNotAssignedMsg]        = useState("");
  const [showNotifModal,        setShowNotifModal]        = useState(false);
  const [deleteLoading,         setDeleteLoading]         = useState(false);
  const [driverData,            setDriverData]            = useState(null);
  const [vehicleData,           setVehicleData]           = useState(null);
  const [user,                  setUser]                  = useState(null);

  /* Auth */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { navigate("/customer-login"); return; }
      setUser(u);
    });
    return () => unsub();
  }, [navigate]);

  /* Load bookings */
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const all = [];
      await Promise.all(
        COLLECTIONS.map(async ({ col, status, type }) => {
          try {
            const q    = query(collection(db, col), where("customerEmail", "==", user.email));
            const snap = await getDocs(q);
            snap.docs.forEach(d => all.push({ id: d.id, _col: col, _status: status, _type: type, ...d.data() }));
          } catch (_) {}
        })
      );
      all.sort((a, b) => {
        const da  = new Date(getArrivalDate(a, a._type) || "9999");
        const db_ = new Date(getArrivalDate(b, b._type) || "9999");
        return da - db_;
      });
      if (active) { setAllBookings(all); setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [user]);

  /* Chat unread counts */
  useEffect(() => {
    if (!user) { setUnreadMap({}); return; }
    const q = query(collection(db, "bookingMessages"), where("customerEmail", "==", user.email));
    const unsub = onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data().customerUnread || 0; });
      setUnreadMap(map);
    }, () => {});
    return () => unsub();
  }, [user]);

  /* Notification unread per booking */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "customerNotifications"),
      where("customerId", "==", user.uid),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const bid = d.data().bookingId;
        if (bid) map[bid] = (map[bid] || 0) + 1;
      });
      setNotifMap(map);
    }, () => {});
    return () => unsub();
  }, [user]);

  /* Action handlers */
  const handleViewAndPay        = (b) => { setSelectedBooking(b); setShowViewAndPay(true);        };
  const handleViewReservation   = (b) => { setSelectedBooking(b); setShowViewReservation(true);   };
  const handleViewInvoice       = (b) => { setSelectedBooking(b); setShowInvoice(true);           };
  const handleViewProof         = (b) => { setSelectedBooking(b); setShowProof(true);             };
  const handleViewReceipt       = (b) => { setSelectedBooking(b); setShowReceipt(true);           };
  const handleChat              = (b) => { setSelectedBooking(b); setShowChat(true);              };
  const handleDeletePrompt      = (b) => { setSelectedBooking(b); setShowDelete(true);            };
  const handleRequestDelete     = (b) => { setSelectedBooking(b); setShowRequestDelete(true);     };
  const handleRequestDateChange = (b) => { setSelectedBooking(b); setShowRequestDateChange(true); };
  const handleViewNotifications = (b) => { setSelectedBooking(b); setShowNotifModal(true);        };

  const handleDeleteConfirm = async () => {
    if (!selectedBooking) return;
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, selectedBooking._col, selectedBooking.id));
      setAllBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
      setShowDelete(false);
    } catch (err) { alert("Failed to delete: " + err.message); }
    finally { setDeleteLoading(false); }
  };

  const handleViewDriver = async (booking) => {
    setSelectedBooking(booking);
    const driverId = booking.assignedDriverId;
    if (!driverId) {
      setNotAssignedMsg("No driver has been assigned yet. Our team will assign a driver closer to your arrival date.");
      setShowNotAssigned(true);
      return;
    }
    try {
      const colName = driverId.startsWith("DRV-E-") ? "drivers" : "externalDrivers";
      const snap    = await getDoc(doc(db, colName, driverId));
      setDriverData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    } catch { setDriverData(null); }
    setShowDriver(true);
  };

  const handleViewVehicle = async (booking) => {
    setSelectedBooking(booking);
    const vehicleId = booking.assignedVehicleId;
    if (!vehicleId) {
      setNotAssignedMsg("No vehicle has been assigned yet. Our team will assign a vehicle closer to your arrival date.");
      setShowNotAssigned(true);
      return;
    }
    try {
      const colName = vehicleId.startsWith("VEH-E-") ? "vehicleFleet" : "externalVehicles";
      const snap    = await getDoc(doc(db, colName, vehicleId));
      setVehicleData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    } catch { setVehicleData(null); }
    setShowVehicle(true);
  };

  const actions = {
    viewAndPay:        handleViewAndPay,
    viewReservation:   handleViewReservation,
    viewInvoice:       handleViewInvoice,
    viewProof:         handleViewProof,
    viewReceipt:       handleViewReceipt,
    chat:              handleChat,
    delete:            handleDeletePrompt,
    requestDelete:     handleRequestDelete,
    requestDateChange: handleRequestDateChange,
    viewDriver:        handleViewDriver,
    viewVehicle:       handleViewVehicle,
    viewNotifications: handleViewNotifications,
  };

  /* Derived lists */
  const activeBookings   = allBookings.filter(b => b._status === "confirmed" && b.tourStatus === "started");
  const upcomingBookings = allBookings.filter(b => b._status === "confirmed" && b.tourStatus !== "started");
  const filteredBookings = allBookings.filter(b => {
    if (b._status === "confirmed" && b.tourStatus === "started") return false;
    if (filter === "all")     return true;
    if (filter === "started") return b._status === "confirmed" && b.tourStatus === "started";
    return b._status === filter;
  });

  const selectedType = selectedBooking?._type;

  /* Loading state */
  if (loading) {
    return (
      <CustomerLayout pageTitle="My Reservations">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ overflow: "hidden", border: "1px solid rgba(0,39,107,0.08)" }}>
              <div className="res-skeleton" style={{ height: "160px" }} />
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="res-skeleton" style={{ height: "14px", width: "60%" }} />
                <div className="res-skeleton" style={{ height: "10px", width: "40%" }} />
                <div className="res-skeleton" style={{ height: "4px" }} />
              </div>
            </div>
          ))}
        </div>
      </CustomerLayout>
    );
  }

  /* ── Render ── */
  return (
    <CustomerLayout pageTitle="My Reservations">
      <div className="dash-root">

        <div className="res-page-header">
          <h1 className="res-page-title">My Reservations</h1>
          <p className="res-page-sub">
            {allBookings.length} reservation{allBookings.length !== 1 ? "s" : ""} · sorted by arrival date
          </p>
        </div>

        {/* Active tours */}
        {activeBookings.length > 0 && (
          <div className="res-active-section">
            <div className="res-active-label">
              <div className="res-active-pulse" />
              Tour In Progress
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeBookings.map(b => (
                <ActiveTourCard
                  key={b.id}
                  booking={b}
                  actions={actions}
                  unreadCount={unreadMap[b.id] || 0}
                  notifCount={notifMap[b.id] || 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming confirmed */}
        {upcomingBookings.length > 0 && (
          <>
            <div className="res-section-divider">
              <div className="res-section-divider-line" />
              <span className="res-section-divider-label">Upcoming Tours</span>
              <div className="res-section-divider-line" />
            </div>
            <div className="res-grid" style={{ marginBottom: "8px" }}>
              {upcomingBookings.map((b, i) => (
                <div key={b.id} style={{ animationDelay: `${i * 0.05}s` }}>
                  <ReservationCard booking={b} actions={actions} unreadCount={unreadMap[b.id] || 0} notifCount={notifMap[b.id] || 0} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Filter pills */}
        {allBookings.length > 0 && (
          <>
            <div className="res-section-divider">
              <div className="res-section-divider-line" />
              <span className="res-section-divider-label">All Reservations</span>
              <div className="res-section-divider-line" />
            </div>
            <div className="res-filter-row">
              {FILTER_OPTIONS.map(f => {
                const count = f.key === "all"
                  ? allBookings.filter(b => !(b._status === "confirmed" && b.tourStatus === "started")).length
                  : f.key === "started"
                    ? allBookings.filter(b => b._status === "confirmed" && b.tourStatus === "started").length
                    : allBookings.filter(b => b._status === f.key).length;
                return (
                  <button
                    key={f.key}
                    className={`res-filter-pill ${filter === f.key ? "active" : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}{count > 0 ? ` (${count})` : ""}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* All reservations grid */}
        {filteredBookings.length === 0 && !activeBookings.length && !upcomingBookings.length ? (
          <div className="res-empty">
            <div className="res-empty-icon">✈</div>
            <div className="res-empty-title">No reservations yet</div>
            <div className="res-empty-sub">Your Sri Lankan adventure is just one booking away.</div>
            <button
              className="dash-hero-btn primary"
              style={{ fontSize: "13px", padding: "10px 24px" }}
              onClick={() => navigate("/booknow")}
            >
              Book a Tour
            </button>
          </div>
        ) : (
          <div className="res-grid">
            {filteredBookings.map((b, i) => (
              <div key={b.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <ReservationCard booking={b} actions={actions} unreadCount={unreadMap[b.id] || 0} notifCount={notifMap[b.id] || 0} />
              </div>
            ))}
          </div>
        )}

        <div style={{ height: "32px" }} />
      </div>

      {/* ── MODALS ── */}
      {selectedBooking && selectedType === "preset"  && <ViewAndPayPresetTourModal  show={showViewAndPay} onHide={() => setShowViewAndPay(false)} booking={selectedBooking} />}
      {selectedBooking && selectedType === "custom"  && <ViewAndPayCustomTourModal  show={showViewAndPay} onHide={() => setShowViewAndPay(false)} booking={selectedBooking} />}
      {selectedBooking && selectedType === "vehicle" && <ViewAndPayVehicleOnlyModal show={showViewAndPay} onHide={() => setShowViewAndPay(false)} booking={selectedBooking} />}

      {selectedBooking && selectedType === "preset"  && <ViewPresetReservationModal      show={showViewReservation} onHide={() => setShowViewReservation(false)} booking={selectedBooking} />}
      {selectedBooking && selectedType === "custom"  && <ViewCustomReservationModal      show={showViewReservation} onHide={() => setShowViewReservation(false)} booking={selectedBooking} />}
      {selectedBooking && selectedType === "vehicle" && <ViewVehicleOnlyReservationModal show={showViewReservation} onHide={() => setShowViewReservation(false)} booking={selectedBooking} />}

      {selectedBooking && selectedType === "preset"  && <PresetBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && selectedType === "custom"  && <CustomBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && selectedType === "vehicle" && <VehicleOnlyBookedInvoiceModal show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}

      <ViewPaymentProofModal show={showProof}   onHide={() => setShowProof(false)}   booking={selectedBooking} />
      <ViewReceiptModal      show={showReceipt} onHide={() => setShowReceipt(false)} booking={selectedBooking} />
      <CustomerChatModal     show={showChat}    onHide={() => setShowChat(false)}    booking={selectedBooking} />

      <GeneralDeleteConfirmationModal
        show={showDelete}
        onHide={() => setShowDelete(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title="Delete Reservation"
        message={`Are you sure you want to permanently delete booking ${selectedBooking?.id}? This cannot be undone.`}
        confirmLabel="Delete"
      />
      <GeneralConfirmationModal
        show={showNotAssigned}
        onHide={() => setShowNotAssigned(false)}
        onConfirm={() => setShowNotAssigned(false)}
        title="Not Yet Assigned"
        message={notAssignedMsg}
        confirmLabel="OK"
        cancelLabel=""
      />
      <ViewDriverModal
        show={showDriver}
        onHide={() => { setShowDriver(false); setDriverData(null); }}
        driver={driverData}
      />
      <ViewVehicleModal
        show={showVehicle}
        onHide={() => { setShowVehicle(false); setVehicleData(null); }}
        vehicle={vehicleData}
      />
      <RequestDeletionModal
        show={showRequestDelete}
        onHide={() => setShowRequestDelete(false)}
        booking={selectedBooking}
      />
      <RequestDateChangeModal
        show={showRequestDateChange}
        onHide={() => setShowRequestDateChange(false)}
        booking={selectedBooking}
      />
      <ViewNotificationsModal
        show={showNotifModal}
        onHide={() => setShowNotifModal(false)}
        bookingId={selectedBooking?.id}
        bookingReference={selectedBooking ? getRef(selectedBooking) : ""}
      />
    </CustomerLayout>
  );
}