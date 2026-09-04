// src/pages/admin/reservationManagement/manageReservations/ConfirmedReservations.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../../firebase";
import {
  getBookingType, getCustomerName, getArrivalDate, getTourName,
  getNights, getTravelers, getTotalPrice, getPaymentType,
  getRef, formatDate, typeBadgeStyle, typeLabel,
} from "./bookingCardHelpers";
import AdminConfirmedTourModal       from "../../../../components/modals/adminModals/tourReservationModals/AdminConfirmedTourModal";
import PresetBookedTourInvoiceModal  from "../../../../components/modals/bookings/PresetBookedTourInvoiceModal";
import CustomBookedTourInvoiceModal  from "../../../../components/modals/bookings/CustomBookedTourInvoiceModal";
import VehicleOnlyBookedInvoiceModal from "../../../../components/modals/bookings/VehicleOnlyBookedInvoiceModal";
import MessageCustomerModal          from "../../../../components/modals/adminModals/tourReservationModals/MessageCustomerModal";
import ViewReceiptModal              from "../../../../components/modals/bookings/ViewReceiptModal";
import AssignDriverModal             from "../../../../components/modals/adminModals/tourReservationModals/AssignDriverModal";
import AssignVehicleModal            from "../../../../components/modals/adminModals/tourReservationModals/AssignVehicleModal";
import GeneralConfirmationModal      from "../../../../components/modals/general/GeneralConfirmationModal";
import ViewCustomerModal             from "../../../../components/modals/general/ViewCustomerModal";

const btn = (variant = "outline", disabled = false) => {
  const map = {
    primary: { background: "#00276b", color: "#fff",    border: "1px solid #00276b"            },
    outline: { background: "#fff",    color: "#00276b", border: "1px solid rgba(0,39,107,0.3)" },
    info:    { background: "#e6f1fb", color: "#0c447c", border: "1px solid #b5d4f4"            },
    success: { background: "#e1f5ee", color: "#085041", border: "1px solid #9fe1cb"            },
    warn:    { background: "#faeeda", color: "#633806", border: "1px solid #fac775"            },
    gray:    { background: "#f1f3f5", color: "#444441", border: "1px solid #d3d1c7"            },
    teal:    { background: "#e1f5ee", color: "#085041", border: "1px solid #9fe1cb"            },
  };
  return { ...map[variant], fontSize: 11, padding: "4px 10px", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 500, opacity: disabled ? 0.5 : 1 };
};

const collectionMap = {
  preset:  { from: "confirmedPresetBookings",  to: "completedPresetBookings"  },
  custom:  { from: "confirmedCustomBookings",  to: "completedCustomBookings"  },
  vehicle: { from: "confirmedVehicleBookings", to: "completedVehicleBookings" },
};

export default function ConfirmedReservations() {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [unreadMap,   setUnreadMap]   = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionLoading,   setActionLoading]   = useState(false);

  const [showView,         setShowView]         = useState(false);
  const [showInvoice,      setShowInvoice]      = useState(false);
  const [showMessage,      setShowMessage]      = useState(false);
  const [showViewReceipt,  setShowViewReceipt]  = useState(false);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [showAssignVehicle,setShowAssignVehicle]= useState(false);
  const [showStartTour,    setShowStartTour]    = useState(false);
  const [showCompleteTour, setShowCompleteTour] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showViewCustomer, setShowViewCustomer] = useState(false);

  useEffect(() => {
    const cols = ["confirmedPresetBookings", "confirmedCustomBookings", "confirmedVehicleBookings"];
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookingMessages"), snap => {
      const map = {};
      snap.docs.forEach(d => { if (d.data().adminUnread > 0) map[d.id] = d.data().adminUnread; });
      setUnreadMap(map);
    });
    return () => unsub();
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

  const handleStartTour = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      const type = getBookingType(selectedBooking);
      await updateDoc(doc(db, collectionMap[type].from, selectedBooking.id), {
        tourStatus: "started", tourStartedAt: serverTimestamp(),
      });
      setShowStartTour(false);
    } catch (err) { alert("Failed: " + err.message); }
    finally { setActionLoading(false); }
  };

  const handleCompleteTour = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      const type = getBookingType(selectedBooking);
      const { from, to } = collectionMap[type];
      const snap = await getDoc(doc(db, from, selectedBooking.id));
      if (!snap.exists()) throw new Error("Booking not found.");

      await setDoc(doc(db, to, selectedBooking.id), { ...snap.data(), tourStatus: "completed", tourCompletedAt: serverTimestamp() });

      // Free driver schedules
      if (selectedBooking.assignedDriverId) {
        const dSnap = await getDocs(query(collection(db, "driverSchedules", selectedBooking.assignedDriverId, "assignments"), where("bookingId", "==", selectedBooking.id), where("status", "==", "active")));
        for (const d of dSnap.docs) await updateDoc(doc(db, "driverSchedules", selectedBooking.assignedDriverId, "assignments", d.id), { status: "completed" });
      }
      // Free multi-driver (vehicle-only)
      for (const da of (selectedBooking.assignedDrivers || [])) {
        const dSnap = await getDocs(query(collection(db, "driverSchedules", da.driverId, "assignments"), where("bookingId", "==", selectedBooking.id), where("status", "==", "active")));
        for (const d of dSnap.docs) await updateDoc(doc(db, "driverSchedules", da.driverId, "assignments", d.id), { status: "completed" });
      }
      // Free vehicle schedules
      if (selectedBooking.assignedVehicleId) {
        const vSnap = await getDocs(query(collection(db, "vehicleSchedules", selectedBooking.assignedVehicleId, "assignments"), where("bookingId", "==", selectedBooking.id), where("status", "==", "active")));
        for (const d of vSnap.docs) await updateDoc(doc(db, "vehicleSchedules", selectedBooking.assignedVehicleId, "assignments", d.id), { status: "completed" });
      }
      for (const va of (selectedBooking.assignedVehicles || [])) {
        const vSnap = await getDocs(query(collection(db, "vehicleSchedules", va.vehicleId, "assignments"), where("bookingId", "==", selectedBooking.id), where("status", "==", "active")));
        for (const d of vSnap.docs) await updateDoc(doc(db, "vehicleSchedules", va.vehicleId, "assignments", d.id), { status: "completed" });
      }

      await deleteDoc(doc(db, from, selectedBooking.id));
      setShowCompleteTour(false);
    } catch (err) { alert("Failed: " + err.message); }
    finally { setActionLoading(false); }
  };

  const open = (booking, setter) => { setSelectedBooking(booking); setter(true); };

  if (loading)       return <p style={{ color: "#7a9ab8", fontSize: 13 }}>Loading confirmed reservations...</p>;
  if (!bookings.length) return <p style={{ color: "#7a9ab8", fontSize: 13 }}>No confirmed reservations found.</p>;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {bookings.map(b => {
          const type    = getBookingType(b);
          const started = b.tourStatus === "started";
          const driverLabel  = b.assignedDriverName  || (b.assignedDrivers?.length  ? `${b.assignedDrivers.length} assigned`  : null);
          const vehicleLabel = b.assignedVehicleReg   || (b.assignedVehicles?.length ? `${b.assignedVehicles.length} assigned` : null);

          return (
            <div key={b.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.08)", overflow: "hidden" }}>
              <div style={{ height: 3, background: started ? "#27a86e" : "#56c6e8" }} />

              <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,39,107,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={typeBadgeStyle(type)}>{typeLabel(type)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: started ? "#e1f5ee" : "#e6f1fb", color: started ? "#085041" : "#0c447c", padding: "2px 8px" }}>
                    {started ? "IN PROGRESS" : "CONFIRMED"}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#00276b", margin: "0 0 2px" }}>{getTourName(b, type)}</p>
                <p style={{ fontSize: 10, color: "#adc6d8", margin: "0 0 8px" }}>{getRef(b)} · Confirmed {formatDate(b.confirmedAt || b.paidAt)}</p>

                {[
                  ["Customer",  getCustomerName(b, type)],
                  ["Arrival",   getArrivalDate(b, type)],
                  ["Duration",  getNights(b, type)],
                  ["Travelers", getTravelers(b, type)],
                  ["Driver",    driverLabel  || "Not assigned"],
                  ["Vehicle",   vehicleLabel || "Not assigned"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#7a9ab8" }}>{k}</span>
                    <span style={{ color: v?.includes("Not") ? "#adc6d8" : "#00276b", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,39,107,0.06)" }}>
                  <span style={{ fontSize: 10, color: "#adc6d8" }}>Total</span>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#00276b" }}>{getTotalPrice(b, type)}</span>
                </div>
              </div>

              <div style={{ padding: "10px 14px", background: "rgba(0,39,107,0.02)", display: "flex", flexWrap: "wrap", gap: 5 }}>
                <button style={btn("primary")} onClick={() => open(b, setShowView)}>View</button>
                <button style={btn("gray")}    onClick={() => open(b, setShowAssignDriver)}>
                  {b.assignedDriverId || b.assignedDrivers?.length ? "Change Driver" : "Assign Driver"}
                </button>
                <button style={btn("gray")}    onClick={() => open(b, setShowAssignVehicle)}>
                  {b.assignedVehicleId || b.assignedVehicles?.length ? "Change Vehicle" : "Assign Vehicle"}
                </button>
                <button style={btn("teal", started)} disabled={started}
                  onClick={() => { if (!started) open(b, setShowStartTour); }}>
                  {started ? "Tour Started" : "Start Tour"}
                </button>
                <button style={btn("success")} onClick={() => open(b, setShowCompleteTour)}>Complete Tour</button>
                <button style={btn("outline")} onClick={() => open(b, setShowInvoice)}>Invoice</button>
                <button style={btn("warn")}    onClick={() => open(b, setShowMessage)}>
                  Message
                  {unreadMap[b.id] > 0 && (
                    <span style={{ display: "inline-block", background: "#e24b4a", color: "#fff", fontSize: 9, fontWeight: 700, width: 14, height: 14, lineHeight: "14px", textAlign: "center", marginLeft: 5, verticalAlign: "middle" }}>
                      {unreadMap[b.id]}
                    </span>
                  )}
                </button>
                <button style={btn("gray")} onClick={() => open(b, setShowViewReceipt)}>Receipt</button>
                <button style={btn("gray")} onClick={() => handleViewCustomer(b)}>View Customer</button>
              </div>
            </div>
          );
        })}
      </div>

      <AdminConfirmedTourModal show={showView} onHide={() => setShowView(false)} booking={selectedBooking} />

      {selectedBooking && getBookingType(selectedBooking) === "preset"  && <PresetBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && getBookingType(selectedBooking) === "custom"  && <CustomBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && getBookingType(selectedBooking) === "vehicle" && <VehicleOnlyBookedInvoiceModal show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}

      <MessageCustomerModal show={showMessage}     onHide={() => setShowMessage(false)}     booking={selectedBooking} />
      <ViewReceiptModal     show={showViewReceipt} onHide={() => setShowViewReceipt(false)} booking={selectedBooking} />
      <AssignDriverModal    show={showAssignDriver} onHide={() => setShowAssignDriver(false)} booking={selectedBooking} />
      <AssignVehicleModal   show={showAssignVehicle} onHide={() => setShowAssignVehicle(false)} booking={selectedBooking} />

      <GeneralConfirmationModal
        show={showStartTour} onHide={() => setShowStartTour(false)} onConfirm={handleStartTour}
        loading={actionLoading} title="Start Tour"
        message={`Mark booking ${selectedBooking?.id} as started?`} confirmLabel="Start Tour"
      />
      <GeneralConfirmationModal
        show={showCompleteTour} onHide={() => setShowCompleteTour(false)} onConfirm={handleCompleteTour}
        loading={actionLoading} title="Complete Tour"
        message={`Complete and archive booking ${selectedBooking?.id}? Driver and vehicle schedules will be freed.`}
        confirmLabel="Complete Tour"
      />
      <ViewCustomerModal
        show={showViewCustomer}
        onHide={() => { setShowViewCustomer(false); setSelectedCustomer(null); }}
        customer={selectedCustomer}
      />
    </>
  );
}