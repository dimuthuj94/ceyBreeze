// src/pages/admin/reservationManagement/manageReservations/CompletedReservations.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import {
  getBookingType, getCustomerName, getArrivalDate, getTourName,
  getNights, getTravelers, getTotalPrice, getPaymentType,
  getRef, formatDate, typeBadgeStyle, typeLabel,
} from "./bookingCardHelpers";
import AdminCompletedTourModal       from "../../../../components/modals/adminModals/tourReservationModals/AdminCompletedTourModal";
import PresetBookedTourInvoiceModal  from "../../../../components/modals/bookings/PresetBookedTourInvoiceModal";
import CustomBookedTourInvoiceModal  from "../../../../components/modals/bookings/CustomBookedTourInvoiceModal";
import VehicleOnlyBookedInvoiceModal from "../../../../components/modals/bookings/VehicleOnlyBookedInvoiceModal";
import ViewCustomerModal             from "../../../../components/modals/general/ViewCustomerModal";

const btn = (variant = "outline") => {
  const map = {
    primary: { background: "#00276b", color: "#fff",    border: "1px solid #00276b"            },
    outline: { background: "#fff",    color: "#00276b", border: "1px solid rgba(0,39,107,0.3)" },
    warn:    { background: "#faeeda", color: "#633806", border: "1px solid #fac775"            },
    gray:    { background: "#f1f3f5", color: "#444441", border: "1px solid #d3d1c7"            },
  };
  return { ...map[variant], fontSize: 11, padding: "4px 10px", cursor: "pointer", fontWeight: 500 };
};

export default function CompletedReservations() {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedBooking,  setSelectedBooking]  = useState(null);
  const [showView,         setShowView]         = useState(false);
  const [showInvoice,      setShowInvoice]      = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showViewCustomer, setShowViewCustomer] = useState(false);

  useEffect(() => {
    const cols = ["completedPresetBookings", "completedCustomBookings", "completedVehicleBookings"];
    const unsubs = cols.map(col =>
      onSnapshot(collection(db, col), snap => {
        setBookings(prev => {
          const others = prev.filter(b => !snap.docs.find(d => d.id === b.id));
          const fresh  = snap.docs.map(d => ({ id: d.id, _col: col, ...d.data() }));
          return [...others, ...fresh].sort((a, b) =>
            new Date(getArrivalDate(a, getBookingType(a))) - new Date(getArrivalDate(b, getBookingType(b)))
          );
        });
        setLoading(false);
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  const handleViewCustomer = async (booking) => {
    const uid   = booking.customerId || booking.uid;
    const email = booking.customerEmail || "";
    let customer = { email, id: uid || null };
    if (uid) {
      try {
        const snap = await getDoc(doc(db, "customers", uid));
        if (snap.exists()) customer = { id: snap.id, ...snap.data(), email };
      } catch (_) {}
    }
    setSelectedCustomer(customer);
    setShowViewCustomer(true);
  };

  const open = (booking, setter) => { setSelectedBooking(booking); setter(true); };

  if (loading)          return <p style={{ color: "#7a9ab8", fontSize: 13 }}>Loading completed reservations...</p>;
  if (!bookings.length) return <p style={{ color: "#7a9ab8", fontSize: 13 }}>No completed reservations found.</p>;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {bookings.map(b => {
          const type = getBookingType(b);
          return (
            <div key={b.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.08)", overflow: "hidden" }}>
              <div style={{ height: 3, background: "#adc6d8" }} />
              <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,39,107,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={typeBadgeStyle(type)}>{typeLabel(type)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#f1f3f5", color: "#444441", padding: "2px 8px" }}>COMPLETED</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#00276b", margin: "0 0 2px" }}>{getTourName(b, type)}</p>
                <p style={{ fontSize: 10, color: "#adc6d8", margin: "0 0 8px" }}>{getRef(b)} · Completed {formatDate(b.completedAt || b.paidAt)}</p>
                {[
                  ["Customer", getCustomerName(b, type)],
                  ["Arrival",  getArrivalDate(b, type)],
                  ["Duration", getNights(b, type)],
                  ["Travelers",getTravelers(b, type)],
                  ["Payment",  getPaymentType(b)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#7a9ab8" }}>{k}</span>
                    <span style={{ color: "#00276b", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,39,107,0.06)" }}>
                  <span style={{ fontSize: 10, color: "#adc6d8" }}>Total</span>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#00276b" }}>{getTotalPrice(b, type)}</span>
                </div>
              </div>
              <div style={{ padding: "10px 14px", background: "rgba(0,39,107,0.02)", display: "flex", flexWrap: "wrap", gap: 5 }}>
                <button style={btn("primary")} onClick={() => open(b, setShowView)}>View</button>
                <button style={btn("outline")} onClick={() => open(b, setShowInvoice)}>Invoice</button>
                <button style={btn("warn")}    onClick={() => alert("Coming soon")}>Message</button>
                <button style={btn("gray")}    onClick={() => alert("Coming soon")}>Receipt</button>
                <button style={btn("gray")}    onClick={() => handleViewCustomer(b)}>View Customer</button>
              </div>
            </div>
          );
        })}
      </div>

      <AdminCompletedTourModal show={showView} onHide={() => setShowView(false)} booking={selectedBooking} />

      {selectedBooking && getBookingType(selectedBooking) === "preset"  && <PresetBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && getBookingType(selectedBooking) === "custom"  && <CustomBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && getBookingType(selectedBooking) === "vehicle" && <VehicleOnlyBookedInvoiceModal show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}

      <ViewCustomerModal
        show={showViewCustomer}
        onHide={() => { setShowViewCustomer(false); setSelectedCustomer(null); }}
        customer={selectedCustomer}
      />
    </>
  );
}