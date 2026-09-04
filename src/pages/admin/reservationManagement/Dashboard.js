// src/pages/admin/reservationManagement/ReservationDashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReservationManagement from "../../../components/layouts/admin/ReservationManagement";
import {
  collection, onSnapshot, query, where, orderBy, limit,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { getBookingType, getCustomerName, getArrivalDate, getTourName, getRef, formatDate } from "./manageReservations/bookingCardHelpers";

const fmtDate = formatDate;

const KPI = ({ label, value, color, sub, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: "#fff", border: "1px solid rgba(0,39,107,0.07)",
      padding: "18px 20px", flex: 1, minWidth: "140px",
      cursor: onClick ? "pointer" : "default",
      borderLeft: `3px solid ${color}`,
      transition: "box-shadow 0.18s",
      position: "relative",
    }}
    onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,39,107,0.08)")}
    onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = "none")}
  >
    <div style={{ fontSize: "10px", color: "#7a9ab8", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "30px", color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "5px" }}>{sub}</div>}
    {onClick && <div style={{ position: "absolute", right: "16px", bottom: "16px", fontSize: "14px", color: "#adc6d8" }}>›</div>}
  </div>
);

const BOOKING_TYPE_STYLE = {
  preset:  { background: "#e6f1fb", color: "#0c447c", label: "Preset"   },
  custom:  { background: "#e1f5ee", color: "#085041", label: "Custom"   },
  vehicle: { background: "#faeeda", color: "#633806", label: "Vehicle"  },
};

const PAID_COLS      = ["paidPresetBookings","paidCustomBookings","paidVehicleBookings"];
const CONFIRMED_COLS = ["confirmedPresetBookings","confirmedCustomBookings","confirmedVehicleBookings"];
const COMPLETED_COLS = ["completedPresetBookings","completedCustomBookings","completedVehicleBookings"];

export default function ReservationDashboard() {
  const navigate = useNavigate();
  const [counts,          setCounts]          = useState({ paid: 0, confirmed: 0, completed: 0, cancelPending: 0, datePending: 0 });
  const [recentPaid,      setRecentPaid]      = useState([]);
  const [recentConfirmed, setRecentConfirmed] = useState([]);
  const [cancelPending,   setCancelPending]   = useState([]);
  const [datePending,     setDatePending]     = useState([]);

  /* ── Live counts ── */
  useEffect(() => {
    const paidC = Array(PAID_COLS.length).fill(0);
    const confC = Array(CONFIRMED_COLS.length).fill(0);
    const compC = Array(COMPLETED_COLS.length).fill(0);
    const unsubs = [];

    PAID_COLS.forEach((col, i) => {
      unsubs.push(onSnapshot(collection(db, col), snap => {
        paidC[i] = snap.size;
        setCounts(p => ({ ...p, paid: paidC.reduce((a,b) => a+b, 0) }));
      }, () => {}));
    });
    CONFIRMED_COLS.forEach((col, i) => {
      unsubs.push(onSnapshot(collection(db, col), snap => {
        confC[i] = snap.size;
        setCounts(p => ({ ...p, confirmed: confC.reduce((a,b) => a+b, 0) }));
      }, () => {}));
    });
    COMPLETED_COLS.forEach((col, i) => {
      unsubs.push(onSnapshot(collection(db, col), snap => {
        compC[i] = snap.size;
        setCounts(p => ({ ...p, completed: compC.reduce((a,b) => a+b, 0) }));
      }, () => {}));
    });

    const u4 = onSnapshot(query(collection(db, "bookingCancellationRequests"), where("status","==","pending")),
      snap => { setCounts(p => ({ ...p, cancelPending: snap.size })); setCancelPending(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }, () => {});
    const u5 = onSnapshot(query(collection(db, "bookingDateChangeRequests"), where("status","==","pending")),
      snap => { setCounts(p => ({ ...p, datePending: snap.size })); setDatePending(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }, () => {});

    return () => { unsubs.forEach(u => u()); u4(); u5(); };
  }, []);

  /* ── Recent bookings (latest 5 from each paid col merged) ── */
  useEffect(() => {
    const allPaid = [];
    let loaded    = 0;
    PAID_COLS.forEach(col => {
      onSnapshot(collection(db, col), snap => {
        snap.docs.forEach(d => allPaid.push({ id: d.id, _col: col, ...d.data() }));
        loaded++;
        if (loaded === PAID_COLS.length) {
          allPaid.sort((a, b) => {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return db_ - da;
          });
          setRecentPaid(allPaid.slice(0, 5));
        }
      }, () => {});
    });

    const allConf = [];
    let loadedC = 0;
    CONFIRMED_COLS.forEach(col => {
      onSnapshot(collection(db, col), snap => {
        snap.docs.forEach(d => allConf.push({ id: d.id, _col: col, ...d.data() }));
        loadedC++;
        if (loadedC === CONFIRMED_COLS.length) {
          allConf.sort((a, b) => {
            const da  = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return db_ - da;
          });
          setRecentConfirmed(allConf.slice(0, 5));
        }
      }, () => {});
    });
  }, []);

  const SectionHeader = ({ title, count, action, actionLabel }) => (
    <div style={{ background: "#00276b", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {title} {count != null && <span style={{ background: "rgba(168,237,255,0.15)", padding: "1px 7px", borderRadius: "10px", marginLeft: "6px" }}>{count}</span>}
      </span>
      {action && (
        <button onClick={action} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#a8edff", fontSize: "10px", padding: "3px 10px", cursor: "pointer", fontWeight: 700 }}>
          {actionLabel || "View All →"}
        </button>
      )}
    </div>
  );

  const BookingRow = ({ b }) => {
    const type    = getBookingType(b);
    const ts      = BOOKING_TYPE_STYLE[type] || BOOKING_TYPE_STYLE.preset;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "3px" }}>
            <span style={{ ...ts, fontSize: "9px", fontWeight: 700, padding: "1px 7px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {ts.label}
            </span>
            <span style={{ fontSize: "11px", color: "#adc6d8" }}>{getRef(b)}</span>
          </div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#00276b" }}>{getCustomerName(b, type)}</div>
          <div style={{ fontSize: "11px", color: "#7a9ab8" }}>{getTourName(b, type)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: "#adc6d8" }}>Arrival: {getArrivalDate(b, type)}</div>
          <div style={{ fontSize: "11px", color: "#adc6d8" }}>Booked: {fmtDate(b.createdAt)}</div>
        </div>
      </div>
    );
  };

  const RequestRow = ({ r, type }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 500, color: "#00276b" }}>{r.customerName || r.customerEmail}</div>
        <div style={{ fontSize: "11px", color: "#7a9ab8" }}>{r.bookingReference}</div>
        {type === "date" && (
          <div style={{ fontSize: "11px", color: "#adc6d8" }}>
            {r.newArrivalDate} → {r.newDepartureDate}
          </div>
        )}
        {type === "cancel" && r.reason && (
          <div style={{ fontSize: "11px", color: "#adc6d8" }}>{r.reason.slice(0, 50)}{r.reason.length > 50 ? "..." : ""}</div>
        )}
      </div>
      <div style={{ fontSize: "10px", color: "#adc6d8" }}>{fmtDate(r.createdAt)}</div>
    </div>
  );

  return (
    <ReservationManagement pageTitle="Dashboard">
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>
          Reservations Overview
        </h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>Live snapshot of all booking activity</p>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        <KPI label="Paid — Awaiting Action"  value={counts.paid}          color="#0c447c"  sub="Need processing"  onClick={() => navigate("/admin/reservation/manage")} />
        <KPI label="Confirmed — Active"      value={counts.confirmed}     color="#085041"  sub="Tours in progress" onClick={() => navigate("/admin/reservation/manage")} />
        <KPI label="Completed Tours"         value={counts.completed}     color="#27a86e"  sub="All time"          onClick={() => navigate("/admin/reservation/manage")} />
        <KPI label="Cancel Requests"         value={counts.cancelPending} color={counts.cancelPending > 0 ? "#8B0000" : "#adc6d8"} sub="Pending review" onClick={() => navigate("/admin/reservation/cancellations")} />
        <KPI label="Date Change Requests"    value={counts.datePending}   color={counts.datePending > 0 ? "#633806" : "#adc6d8"} sub="Pending review" onClick={() => navigate("/admin/reservation/date-change-requests")} />
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

        {/* Recent Paid */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Recent Paid Bookings" count={counts.paid} action={() => navigate("/admin/reservation/manage")} actionLabel="Manage →" />
          {recentPaid.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No paid bookings.</p>
            : recentPaid.map(b => <BookingRow key={b.id} b={b} />)
          }
        </div>

        {/* Recent Confirmed */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Active Confirmed Bookings" count={counts.confirmed} action={() => navigate("/admin/reservation/manage")} actionLabel="Manage →" />
          {recentConfirmed.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No confirmed bookings.</p>
            : recentConfirmed.map(b => <BookingRow key={b.id} b={b} />)
          }
        </div>

        {/* Cancel requests */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader
            title="Cancellation Requests"
            count={cancelPending.length}
            action={() => navigate("/admin/reservation/cancellations")}
            actionLabel="Review →"
          />
          {cancelPending.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No pending cancellations.</p>
            : cancelPending.slice(0, 5).map(r => <RequestRow key={r.id} r={r} type="cancel" />)
          }
        </div>

        {/* Date change requests */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader
            title="Date Change Requests"
            count={datePending.length}
            action={() => navigate("/admin/reservation/date-change-requests")}
            actionLabel="Review →"
          />
          {datePending.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No pending date changes.</p>
            : datePending.slice(0, 5).map(r => <RequestRow key={r.id} r={r} type="date" />)
          }
        </div>
      </div>

      {/* ── Quick action strip ── */}
      <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {[
          { label: "Process Paid Bookings",     path: "/admin/reservation/manage",               color: "#00276b" },
          { label: "Review Cancellations",      path: "/admin/reservation/cancellations",         color: "#8B0000" },
          { label: "Review Date Changes",       path: "/admin/reservation/date-change-requests",  color: "#633806" },
        ].map(({ label, path, color }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{
              background: color, color: "#fff", border: "none",
              padding: "10px 20px", fontSize: "11px", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </ReservationManagement>
  );
}