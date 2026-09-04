// src/components/modals/adminModals/tourReservationModals/AssignDriverModal.js
import React, { useEffect, useState, useMemo } from "react";
import { Modal, Button } from "react-bootstrap";
import {
  collection, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, query, where, getDocs,
} from "firebase/firestore";
import { db } from "../../../../firebase";
import {
  getBookingType, getCustomerName, getArrivalDate,
  getTourName, getNights,
} from "../../../../pages/admin/reservationManagement/manageReservations/bookingCardHelpers";
import { sendCustomerNotification, NOTIF_TYPES } from "../../../../utils/notificationHelper";

const toYMD   = (d) => d ? new Date(d).toISOString().split("T")[0] : "";
const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return toYMD(d); };
const parseD  = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };

const isBusy = (did, from, to, assignments) => {
  const f = parseD(from); const t = parseD(to);
  if (!f || !t) return false;
  return assignments.some(a => {
    if (a.driverId !== did || a.status === "completed") return false;
    const af = parseD(a.effectiveFrom);
    const at = parseD(a.departureDateEffective || a.departureDate);
    if (!af || !at) return false;
    return f <= at && t >= af;
  });
};

const SectionLabel = ({ children }) => (
  <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: "#00276b", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid rgba(0,39,107,0.1)", paddingBottom: 5 }}>
    {children}
  </p>
);

const DriverTile = ({ driver, busy, selected, onSelect }) => (
  <div
    onClick={() => !busy && onSelect(driver)}
    style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px", marginBottom: 8,
      border: selected ? "2px solid #00276b" : "1px solid rgba(0,39,107,0.12)",
      background: selected ? "rgba(0,39,107,0.05)" : busy ? "#fafafa" : "#fff",
      cursor: busy ? "not-allowed" : "pointer",
      opacity: busy ? 0.5 : 1,
    }}
  >
    {driver.photo ? (
      <img src={driver.photo} alt="" style={{ width: 42, height: 42, objectFit: "cover", border: "1px solid rgba(0,39,107,0.1)", flexShrink: 0 }} />
    ) : (
      <div style={{ width: 42, height: 42, background: "#00276b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#a8edff", flexShrink: 0, fontFamily: "'DM Serif Display', serif" }}>
        {driver.callingName?.slice(0, 2).toUpperCase()}
      </div>
    )}
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#00276b" }}>{driver.title} {driver.callingName}</p>
      <p style={{ margin: 0, fontSize: 11, color: "#adc6d8" }}>{driver.id} · {driver.pool === "internal" ? "Internal" : "External"}</p>
    </div>
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", background: busy ? "#fcebeb" : "#e1f5ee", color: busy ? "#791f1f" : "#085041" }}>
      {busy ? "Busy" : "Available"}
    </span>
    {selected && <span style={{ color: "#00276b", fontSize: 16 }}>✓</span>}
  </div>
);

export default function AssignDriverModal({ show, onHide, booking }) {
  const [internalDrivers, setInternalDrivers] = useState([]);
  const [externalDrivers, setExternalDrivers] = useState([]);
  const [allAssignments,  setAllAssignments]  = useState([]);
  const [saving,          setSaving]          = useState(false);

  /* Single driver (preset/custom) */
  const [selectedDriver,  setSelectedDriver]  = useState(null);

  /* Multi-driver (vehicle-only): { [slotIndex]: driverObject } */
  const [selectedDrivers, setSelectedDrivers] = useState({});
  const [activeSlot,      setActiveSlot]      = useState(0);

  const [effectiveDate, setEffectiveDate] = useState("");

  const type          = booking ? getBookingType(booking) : null;
  const arrivalDate   = booking ? getArrivalDate(booking, type) : "";
  const nightsStr     = booking ? getNights(booking, type) : "0";
  const totalDays     = parseInt(nightsStr) || 0;
  const departureDate = arrivalDate ? addDays(arrivalDate, totalDays) : "";
  const isChange      = !!(booking?.assignedDriverId || booking?.assignedDrivers?.length);
  const checkFrom     = isChange && effectiveDate ? effectiveDate : arrivalDate;

  /* ── Driver slots for vehicle-only ── */
  const driverSlots = useMemo(() => {
    if (!booking || type !== "vehicle") return [{ slotIndex: 0, label: "Driver" }];
    const slots = [];
    (booking.vehicles || []).forEach(v => {
      for (let q = 0; q < (v.quantity || 1); q++) {
        slots.push({
          slotIndex: slots.length,
          vehicleType: (v.id || "").trim(),
          quantityIndex: q,
          label: `${v.id}${v.quantity > 1 ? ` #${q + 1}` : ""}`,
        });
      }
    });
    return slots;
  }, [booking, type]);

  useEffect(() => {
    if (!show) return;
    const u1 = onSnapshot(collection(db, "drivers"),         s => setInternalDrivers(s.docs.map(d => ({ id: d.id, pool: "internal", ...d.data() }))));
    const u2 = onSnapshot(collection(db, "externalDrivers"), s => setExternalDrivers(s.docs.map(d => ({ id: d.id, pool: "external", ...d.data() }))));

    const loadAssignments = async () => {
      const list = [];
      for (const col of ["drivers", "externalDrivers"]) {
        const snap = await getDocs(collection(db, col));
        for (const d of snap.docs) {
          const aSnap = await getDocs(query(collection(db, "driverSchedules", d.id, "assignments"), where("status", "==", "active")));
          aSnap.docs.forEach(a => list.push({ driverId: d.id, id: a.id, ...a.data() }));
        }
      }
      setAllAssignments(list);
    };
    loadAssignments();

    setEffectiveDate(arrivalDate);
    setSelectedDriver(null);
    setSelectedDrivers({});
    setActiveSlot(0);

    return () => { u1(); u2(); };
  }, [show, booking]);

  /* ── Save: multi-slot vehicle-only ── */
  const handleAssignMulti = async () => {
    const bookingCol = booking._col || "confirmedVehicleBookings";
    const assignedArr = [];

    for (const slot of driverSlots) {
      const d = selectedDrivers[slot.slotIndex];
      if (!d) continue;

      // Mark old assignment for this slot as replaced
      if (isChange) {
        const oldArr = booking.assignedDrivers || [];
        const old = oldArr.find(a => a.slotIndex === slot.slotIndex);
        if (old?.driverId) {
          const prev = await getDocs(query(
            collection(db, "driverSchedules", old.driverId, "assignments"),
            where("bookingId", "==", booking.id), where("status", "==", "active")
          ));
          for (const doc_ of prev.docs) {
            await updateDoc(doc(db, "driverSchedules", old.driverId, "assignments", doc_.id), {
              status: "replaced", replacedAt: serverTimestamp(),
            });
          }
        }
      }

      await addDoc(collection(db, "driverSchedules", d.id, "assignments"), {
        bookingId: booking.id,
        tourName: getTourName(booking, type),
        tourType: type, slotIndex: slot.slotIndex,
        vehicleType: slot.vehicleType,
        arrivalDate, departureDate,
        effectiveFrom: isChange && effectiveDate ? effectiveDate : arrivalDate,
        departureDateEffective: departureDate,
        totalDays, status: "active",
        assignedAt: serverTimestamp(), driverPool: d.pool,
      });

      assignedArr.push({
        slotIndex:   slot.slotIndex,
        driverId:    d.id,
        driverName:  `${d.title || ""} ${d.callingName}`.trim(),
        driverPool:  d.pool,
        vehicleType: slot.vehicleType,
      });
    }

    await updateDoc(doc(db, bookingCol, booking.id), {
      assignedDrivers: assignedArr,
      assignedDriverId:   assignedArr[0]?.driverId   || null,
      assignedDriverName: assignedArr[0]?.driverName || null,
    });

    await sendCustomerNotification({
      customerId: booking.customerId || booking.uid || null,
      customerEmail: booking.customerEmail,
      bookingId: booking.id,
      bookingReference: booking.bookingReference || booking.id,
      bookingType: type,
      type: isChange ? NOTIF_TYPES.DRIVER_CHANGED : NOTIF_TYPES.DRIVER_ASSIGNED,
      title: isChange ? "Your drivers have been updated" : "Drivers assigned to your booking",
      message: `${assignedArr.length} driver(s) assigned to your booking.`,
      data: { assignedDrivers: assignedArr },
    });
  };

  /* ── Save: single driver (preset/custom) ── */
  const handleAssignSingle = async () => {
    if (!selectedDriver) return;
    const bookingCol = booking._col || `confirmed${type === "preset" ? "Preset" : "Custom"}Bookings`;

    if (isChange && booking.assignedDriverId) {
      const prev = await getDocs(query(
        collection(db, "driverSchedules", booking.assignedDriverId, "assignments"),
        where("bookingId", "==", booking.id), where("status", "==", "active")
      ));
      for (const d of prev.docs) {
        await updateDoc(doc(db, "driverSchedules", booking.assignedDriverId, "assignments", d.id), {
          status: "replaced", replacedAt: serverTimestamp(), departureDateEffective: effectiveDate,
        });
      }
    }

    await addDoc(collection(db, "driverSchedules", selectedDriver.id, "assignments"), {
      bookingId: booking.id,
      tourName: getTourName(booking, type), tourType: type,
      arrivalDate, departureDate,
      effectiveFrom: isChange && effectiveDate ? effectiveDate : arrivalDate,
      departureDateEffective: departureDate,
      totalDays, isReplacement: isChange,
      replacedDriverId: isChange ? booking.assignedDriverId : null,
      status: "active", assignedAt: serverTimestamp(), driverPool: selectedDriver.pool,
    });

    await updateDoc(doc(db, bookingCol, booking.id), {
      assignedDriverId:   selectedDriver.id,
      assignedDriverName: `${selectedDriver.title || ""} ${selectedDriver.callingName}`.trim(),
      assignedDriverPool: selectedDriver.pool,
    });

    await sendCustomerNotification({
      customerId: booking.customerId || booking.uid || null,
      customerEmail: booking.customerEmail,
      bookingId: booking.id,
      bookingReference: booking.bookingReference || booking.id,
      bookingType: type,
      type: isChange ? NOTIF_TYPES.DRIVER_CHANGED : NOTIF_TYPES.DRIVER_ASSIGNED,
      title: isChange ? "Your driver has been updated" : "Driver assigned to your tour",
      message: isChange
        ? `Your driver has been updated to ${selectedDriver.callingName}.`
        : `${selectedDriver.callingName} has been assigned as your driver.`,
      data: { driverId: selectedDriver.id, driverName: selectedDriver.callingName },
    });
  };

  const handleAssign = async () => {
    setSaving(true);
    try {
      if (type === "vehicle") {
        const total    = driverSlots.length;
        const assigned = driverSlots.filter(s => selectedDrivers[s.slotIndex]).length;
        if (assigned < total) {
          if (!window.confirm(`Only ${assigned} of ${total} drivers assigned. Save anyway?`)) { setSaving(false); return; }
        }
        await handleAssignMulti();
      } else {
        if (!selectedDriver) { alert("Please select a driver."); setSaving(false); return; }
        await handleAssignSingle();
      }
      alert("Driver(s) assigned successfully!");
      onHide();
    } catch (err) {
      console.error(err);
      alert("Failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderPool = (drivers, poolLabel) => (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel>{poolLabel}</SectionLabel>
      {drivers.length === 0 ? (
        <p style={{ fontSize: 12, color: "#adc6d8" }}>No {poolLabel.toLowerCase()} drivers found.</p>
      ) : drivers.map(d => {
        const busy  = isBusy(d.id, checkFrom, departureDate, allAssignments);
        const isSel = type === "vehicle"
          ? selectedDrivers[activeSlot]?.id === d.id
          : selectedDriver?.id === d.id;
        return (
          <DriverTile key={d.id} driver={d} busy={busy} selected={isSel}
            onSelect={driver => {
              if (type === "vehicle") setSelectedDrivers(p => ({ ...p, [activeSlot]: driver }));
              else setSelectedDriver(driver);
            }}
          />
        );
      })}
    </div>
  );

  if (!booking) return null;
  const assignedCount = driverSlots.filter(s => selectedDrivers[s.slotIndex]).length;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ background: "#00276b", color: "#fff", borderRadius: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
            {isChange ? "Change Driver(s)" : "Assign Driver(s)"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {booking.id} · {getTourName(booking, type)} · {totalDays} days
          </div>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "18px 20px", maxHeight: "72vh", overflowY: "auto" }}>

        {/* Tour summary */}
        <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "10px 14px", marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px" }}>
          {[
            ["Customer",       getCustomerName(booking, type)],
            ["Arrival",        arrivalDate],
            ["Departure",      departureDate],
            ["Duration",       `${totalDays} days`],
            ["Current Driver", booking.assignedDriverName || (booking.assignedDrivers?.length ? `${booking.assignedDrivers.length} assigned` : "None")],
            type === "vehicle" ? ["Drivers Needed", driverSlots.length] : ["Type", type],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 9, color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#00276b" }}>{v || "—"}</div>
            </div>
          ))}
        </div>

        {/* Mid-tour effective date */}
        {isChange && (
          <div style={{ background: "#faeeda", border: "1px solid rgba(250,199,117,0.5)", padding: "10px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#633806", marginBottom: 6 }}>Change effective from</div>
            <input
              type="date" value={effectiveDate} min={arrivalDate} max={departureDate}
              onChange={e => setEffectiveDate(e.target.value)}
              style={{ border: "1px solid rgba(250,199,117,0.6)", padding: "6px 10px", fontSize: 13, background: "#fff", color: "#00276b" }}
            />
          </div>
        )}

        {/* Vehicle-only: driver slot tabs */}
        {type === "vehicle" && driverSlots.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#7a9ab8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Assign driver per vehicle slot · {assignedCount}/{driverSlots.length}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {driverSlots.map(slot => (
                <button
                  key={slot.slotIndex}
                  onClick={() => setActiveSlot(slot.slotIndex)}
                  style={{
                    padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: "1px solid",
                    borderColor: activeSlot === slot.slotIndex ? "#00276b" : "rgba(0,39,107,0.15)",
                    background: activeSlot === slot.slotIndex ? "#00276b" : selectedDrivers[slot.slotIndex] ? "#e1f5ee" : "#fff",
                    color: activeSlot === slot.slotIndex ? "#fff" : selectedDrivers[slot.slotIndex] ? "#085041" : "#7a9ab8",
                  }}
                >
                  {slot.label}{selectedDrivers[slot.slotIndex] ? " ✓" : ""}
                </button>
              ))}
            </div>
            {driverSlots[activeSlot] && (
              <div style={{ fontSize: 11, color: "#56c6e8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 10 }}>
                Assigning driver for: {driverSlots[activeSlot].label}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 11, color: "#7a9ab8", marginBottom: 12 }}>
          Availability: <strong>{checkFrom}</strong> → <strong>{departureDate}</strong>
        </div>

        {renderPool(internalDrivers, "Internal Drivers")}
        {renderPool(externalDrivers, "External Drivers")}
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px", background: "#fafcff" }}>
        {type === "vehicle" ? (
          <span style={{ marginRight: "auto", fontSize: 12, color: "#7a9ab8" }}>
            {assignedCount}/{driverSlots.length} drivers selected
          </span>
        ) : selectedDriver && (
          <span style={{ marginRight: "auto", fontSize: 12, color: "#00276b", fontWeight: 500 }}>
            Selected: {selectedDriver.title} {selectedDriver.callingName}
          </span>
        )}
        <Button variant="secondary" onClick={onHide} style={{ borderRadius: 0 }}>Cancel</Button>
        <Button
          onClick={handleAssign}
          disabled={saving || (type !== "vehicle" && !selectedDriver)}
          style={{ background: "#00276b", border: "none", borderRadius: 0 }}
        >
          {saving ? "Saving..." : isChange ? "Confirm Change" : "Assign Driver(s)"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}