// src/components/modals/adminModals/tourReservationModals/AssignVehicleModal.js
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

/* ── Helpers ── */
const toYMD   = (d) => d ? new Date(d).toISOString().split("T")[0] : "";
const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return toYMD(d); };
const parseD  = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; };

const isBusy = (vid, from, to, assignments) => {
  const f = parseD(from); const t = parseD(to);
  if (!f || !t) return false;
  return assignments.some(a => {
    if (a.vehicleId !== vid || a.status === "completed") return false;
    const af = parseD(a.effectiveFrom);
    const at = parseD(a.departureDateEffective || a.departureDate);
    if (!af || !at) return false;
    return f <= at && t >= af;
  });
};

/* ── Does a fleet vehicle match a required type string? ── */
const matchesType = (vehicle, requiredType) => {
  const vt = (vehicle.vehicleType || vehicle.name || "").trim().toLowerCase();
  const rt = (requiredType || "").trim().toLowerCase();
  return vt === rt || vt.includes(rt) || rt.includes(vt);
};

/* ── Inline label ── */
const SectionLabel = ({ children }) => (
  <p style={{
    margin: "0 0 8px", fontSize: "10px", fontWeight: 700, color: "#00276b",
    letterSpacing: "0.1em", textTransform: "uppercase",
    borderBottom: "1px solid rgba(0,39,107,0.1)", paddingBottom: "5px",
  }}>
    {children}
  </p>
);

/* ── Vehicle tile ── */
const VehicleTile = ({ vehicle, busy, selected, onSelect }) => (
  <div
    onClick={() => !busy && onSelect(vehicle)}
    style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 12px", marginBottom: "8px",
      border: selected ? "2px solid #00276b" : busy ? "1px solid rgba(0,39,107,0.1)" : "1px solid rgba(0,39,107,0.12)",
      background: selected ? "rgba(0,39,107,0.05)" : busy ? "#fafafa" : "#fff",
      cursor: busy ? "not-allowed" : "pointer",
      opacity: busy ? 0.5 : 1,
      transition: "border 0.15s",
    }}
  >
    {vehicle.photos?.[0] ? (
      <img src={vehicle.photos[0]} alt="" style={{ width: 54, height: 38, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(0,39,107,0.08)" }} />
    ) : (
      <div style={{ width: 54, height: 38, background: "rgba(0,39,107,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#00276b", fontWeight: 700, flexShrink: 0 }}>
        {(vehicle.vehicleType || "VEH").slice(0, 3).toUpperCase()}
      </div>
    )}
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#00276b" }}>{vehicle.registrationNumber}</p>
      <p style={{ margin: 0, fontSize: 11, color: "#7a9ab8" }}>{vehicle.vehicleType} · {vehicle.vehicleModel}</p>
      <p style={{ margin: 0, fontSize: 10, color: "#adc6d8" }}>{vehicle.id} · {vehicle.pool === "internal" ? "Internal" : "External"} · {vehicle.minimumSeatCount}–{vehicle.maximumSeatCount} seats</p>
    </div>
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px",
      background: busy ? "#fcebeb" : "#e1f5ee",
      color: busy ? "#791f1f" : "#085041",
    }}>
      {busy ? "Busy" : "Available"}
    </span>
    {selected && <span style={{ color: "#00276b", fontSize: 16 }}>✓</span>}
  </div>
);

export default function AssignVehicleModal({ show, onHide, booking }) {
  const [internalVehicles, setInternalVehicles] = useState([]);
  const [externalVehicles, setExternalVehicles] = useState([]);
  const [allAssignments,   setAllAssignments]   = useState([]);
  const [saving,           setSaving]           = useState(false);

  /* ── Single vehicle (preset/custom) ── */
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  /* ── Multi-slot (vehicle-only): { [slotIndex]: vehicleObject } ── */
  const [selectedVehicles, setSelectedVehicles] = useState({});
  const [activeSlot,       setActiveSlot]       = useState(0);

  /* ── Mid-tour change ── */
  const [effectiveDate, setEffectiveDate] = useState("");

  const type         = booking ? getBookingType(booking) : null;
  const arrivalDate  = booking ? getArrivalDate(booking, type) : "";
  const nightsStr    = booking ? getNights(booking, type) : "0";
  const totalDays    = parseInt(nightsStr) || 0;
  const departureDate= arrivalDate ? addDays(arrivalDate, totalDays) : "";
  const isChange     = !!(booking?.assignedVehicleId || booking?.assignedVehicles?.length);
  const checkFrom    = isChange && effectiveDate ? effectiveDate : arrivalDate;
  const checkTo      = departureDate;

  /* ── Transport options for preset/custom ── */
  const transportOptions = useMemo(() => {
    if (!booking || type === "vehicle") return [];
    return (booking["Transport Options"] || []).map(t => t.trim().toLowerCase());
  }, [booking, type]);

  /* ── Vehicle slots for vehicle-only ── */
  const vehicleSlots = useMemo(() => {
    if (!booking || type !== "vehicle") return [];
    const slots = [];
    (booking.vehicles || []).forEach(v => {
      for (let q = 0; q < (v.quantity || 1); q++) {
        slots.push({
          slotIndex: slots.length,
          vehicleType: (v.id || "").trim(),
          quantityIndex: q,
          vehicleItem: v,
        });
      }
    });
    return slots;
  }, [booking, type]);

  /* ── Filter vehicle list ── */
  const filterVehicles = (vehicles, slotType) => {
    if (type === "vehicle") {
      // Show only vehicles matching the slot's required type
      return vehicles.filter(v => matchesType(v, slotType));
    }
    if (transportOptions.length > 0) {
      // Preset/custom: only show vehicles matching Transport Options
      return vehicles.filter(v => transportOptions.some(opt => matchesType(v, opt)));
    }
    return vehicles; // no filter
  };

  /* ── Load data ── */
  useEffect(() => {
    if (!show) return;
    const u1 = onSnapshot(collection(db, "vehicleFleet"),    s => setInternalVehicles(s.docs.map(d => ({ id: d.id, pool: "internal", ...d.data() }))));
    const u2 = onSnapshot(collection(db, "externalVehicles"),s => setExternalVehicles(s.docs.map(d => ({ id: d.id, pool: "external", ...d.data() }))));

    const loadAssignments = async () => {
      const list = [];
      for (const col of ["vehicleFleet", "externalVehicles"]) {
        const snap = await getDocs(collection(db, col));
        for (const d of snap.docs) {
          const aSnap = await getDocs(query(collection(db, "vehicleSchedules", d.id, "assignments"), where("status", "==", "active")));
          aSnap.docs.forEach(a => list.push({ vehicleId: d.id, id: a.id, ...a.data() }));
        }
      }
      setAllAssignments(list);
    };
    loadAssignments();

    setEffectiveDate(arrivalDate);
    setSelectedVehicle(null);
    setSelectedVehicles({});
    setActiveSlot(0);

    return () => { u1(); u2(); };
  }, [show, booking]);

  /* ── Save — vehicle-only multi-slot ── */
  const handleAssignVehicleOnly = async () => {
    const bookingCol = booking._col || "confirmedVehicleBookings";
    const assignedArr = [];

    for (const slot of vehicleSlots) {
      const v = selectedVehicles[slot.slotIndex];
      if (!v) continue;

      // Mark old assignment for this slot as replaced
      if (isChange) {
        const oldArr = (booking.assignedVehicles || []);
        const old = oldArr.find(a => a.slotIndex === slot.slotIndex);
        if (old?.vehicleId) {
          const prevSnap = await getDocs(query(
            collection(db, "vehicleSchedules", old.vehicleId, "assignments"),
            where("bookingId", "==", booking.id), where("status", "==", "active")
          ));
          for (const d of prevSnap.docs) {
            await updateDoc(doc(db, "vehicleSchedules", old.vehicleId, "assignments", d.id), {
              status: "replaced", replacedAt: serverTimestamp(),
            });
          }
        }
      }

      await addDoc(collection(db, "vehicleSchedules", v.id, "assignments"), {
        bookingId: booking.id,
        tourName: getTourName(booking, type),
        tourType: type,
        slotIndex: slot.slotIndex,
        requiredVehicleType: slot.vehicleType,
        arrivalDate, departureDate,
        effectiveFrom: isChange && effectiveDate ? effectiveDate : arrivalDate,
        departureDateEffective: departureDate,
        totalDays, status: "active",
        assignedAt: serverTimestamp(),
        vehiclePool: v.pool,
      });

      assignedArr.push({
        slotIndex:   slot.slotIndex,
        vehicleId:   v.id,
        vehicleReg:  v.registrationNumber,
        vehicleType: slot.vehicleType,
        vehiclePool: v.pool,
      });
    }

    await updateDoc(doc(db, bookingCol, booking.id), {
      assignedVehicles: assignedArr,
      assignedVehicleId: assignedArr[0]?.vehicleId || null, // compat
      assignedVehicleReg: assignedArr[0]?.vehicleReg || null,
    });

    await sendCustomerNotification({
      customerId: booking.customerId || booking.uid || null,
      customerEmail: booking.customerEmail,
      bookingId: booking.id,
      bookingReference: booking.bookingReference || booking.id,
      bookingType: type,
      type: isChange ? NOTIF_TYPES.VEHICLE_CHANGED : NOTIF_TYPES.VEHICLE_ASSIGNED,
      title: isChange ? "Your vehicles have been updated" : "Vehicles assigned to your booking",
      message: isChange ? "The vehicles for your booking have been updated." : `${assignedArr.length} vehicle(s) have been assigned to your booking.`,
      data: { assignedVehicles: assignedArr },
    });
  };

  /* ── Save — preset/custom single vehicle ── */
  const handleAssignSingle = async () => {
    if (!selectedVehicle) return;
    const bookingCol = booking._col || `confirmed${type === "preset" ? "Preset" : "Custom"}Bookings`;

    if (isChange && booking.assignedVehicleId) {
      const prevSnap = await getDocs(query(
        collection(db, "vehicleSchedules", booking.assignedVehicleId, "assignments"),
        where("bookingId", "==", booking.id), where("status", "==", "active")
      ));
      for (const d of prevSnap.docs) {
        await updateDoc(doc(db, "vehicleSchedules", booking.assignedVehicleId, "assignments", d.id), {
          status: "replaced", replacedAt: serverTimestamp(), departureDateEffective: effectiveDate,
        });
      }
    }

    await addDoc(collection(db, "vehicleSchedules", selectedVehicle.id, "assignments"), {
      bookingId: booking.id,
      tourName: getTourName(booking, type),
      tourType: type, arrivalDate, departureDate,
      effectiveFrom: isChange && effectiveDate ? effectiveDate : arrivalDate,
      departureDateEffective: departureDate,
      totalDays, isReplacement: isChange,
      replacedVehicleId: isChange ? booking.assignedVehicleId : null,
      status: "active", assignedAt: serverTimestamp(), vehiclePool: selectedVehicle.pool,
    });

    await updateDoc(doc(db, bookingCol, booking.id), {
      assignedVehicleId:   selectedVehicle.id,
      assignedVehicleReg:  selectedVehicle.registrationNumber,
      assignedVehiclePool: selectedVehicle.pool,
    });

    await sendCustomerNotification({
      customerId: booking.customerId || booking.uid || null,
      customerEmail: booking.customerEmail,
      bookingId: booking.id,
      bookingReference: booking.bookingReference || booking.id,
      bookingType: type,
      type: isChange ? NOTIF_TYPES.VEHICLE_CHANGED : NOTIF_TYPES.VEHICLE_ASSIGNED,
      title: isChange ? "Your vehicle has been updated" : "Vehicle assigned to your tour",
      message: isChange
        ? `Your tour vehicle has been updated to ${selectedVehicle.registrationNumber}.`
        : `${selectedVehicle.registrationNumber} has been assigned to your tour.`,
      data: { vehicleId: selectedVehicle.id, vehicleReg: selectedVehicle.registrationNumber },
    });
  };

  const handleAssign = async () => {
    setSaving(true);
    try {
      if (type === "vehicle") {
        const total = vehicleSlots.length;
        const assigned = vehicleSlots.filter(s => selectedVehicles[s.slotIndex]).length;
        if (assigned < total) {
          if (!window.confirm(`Only ${assigned} of ${total} slots assigned. Save anyway?`)) { setSaving(false); return; }
        }
        await handleAssignVehicleOnly();
      } else {
        await handleAssignSingle();
      }
      alert("Vehicle(s) assigned successfully!");
      onHide();
    } catch (err) {
      console.error(err);
      alert("Failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderVehiclePool = (vehicles, poolLabel, slotType) => {
    const filtered = filterVehicles(vehicles, slotType);
    return (
      <div style={{ marginBottom: 16 }}>
        <SectionLabel>{poolLabel}</SectionLabel>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 12, color: "#adc6d8" }}>
            No {poolLabel.toLowerCase()} vehicles match
            {slotType ? ` type "${slotType}"` : " the required transport options"}.
          </p>
        ) : (
          filtered.map(v => {
            const busy = isBusy(v.id, checkFrom, checkTo, allAssignments);
            const isSel = type === "vehicle"
              ? selectedVehicles[activeSlot]?.id === v.id
              : selectedVehicle?.id === v.id;
            return (
              <VehicleTile
                key={v.id} vehicle={v} busy={busy} selected={isSel}
                onSelect={vehicle => {
                  if (type === "vehicle") {
                    setSelectedVehicles(prev => ({ ...prev, [activeSlot]: vehicle }));
                  } else {
                    setSelectedVehicle(vehicle);
                  }
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  if (!booking) return null;

  const currentSlotType = type === "vehicle" ? vehicleSlots[activeSlot]?.vehicleType : null;
  const allSlotsCount   = vehicleSlots.length;
  const assignedCount   = vehicleSlots.filter(s => selectedVehicles[s.slotIndex]).length;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ background: "#00276b", color: "#fff", borderRadius: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
            {isChange ? "Change Vehicle" : "Assign Vehicle"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {booking.id} · {getTourName(booking, type)} · {totalDays} days
          </div>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "18px 20px", maxHeight: "72vh", overflowY: "auto" }}>

        {/* ── Tour summary ── */}
        <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "10px 14px", marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 16px" }}>
          {[
            ["Customer",     getCustomerName(booking, type)],
            ["Arrival",      arrivalDate],
            ["Departure",    departureDate],
            ["Duration",     `${totalDays} days`],
            ["Current",      booking.assignedVehicleReg || (booking.assignedVehicles?.length ? `${booking.assignedVehicles.length} assigned` : "None")],
            type === "vehicle" ? ["Vehicles Needed", vehicleSlots.length] : ["Transport",    (booking["Transport Options"] || []).join(", ") || "Any"],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 9, color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#00276b" }}>{v || "—"}</div>
            </div>
          ))}
        </div>

        {/* ── Mid-tour change date ── */}
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

        {/* ── Vehicle-only: slot tabs ── */}
        {type === "vehicle" && vehicleSlots.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#7a9ab8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Select a slot to assign · {assignedCount}/{allSlotsCount} assigned
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {vehicleSlots.map(slot => (
                <button
                  key={slot.slotIndex}
                  onClick={() => setActiveSlot(slot.slotIndex)}
                  style={{
                    padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: "1px solid",
                    borderColor: activeSlot === slot.slotIndex ? "#00276b" : "rgba(0,39,107,0.15)",
                    background: activeSlot === slot.slotIndex ? "#00276b" : selectedVehicles[slot.slotIndex] ? "#e1f5ee" : "#fff",
                    color: activeSlot === slot.slotIndex ? "#fff" : selectedVehicles[slot.slotIndex] ? "#085041" : "#7a9ab8",
                  }}
                >
                  {slot.vehicleType}{slot.quantityIndex > 0 ? ` #${slot.quantityIndex + 1}` : ""}
                  {selectedVehicles[slot.slotIndex] ? " ✓" : ""}
                </button>
              ))}
            </div>

            {currentSlotType && (
              <div style={{ fontSize: 11, color: "#56c6e8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                Showing vehicles matching: {currentSlotType}
              </div>
            )}
          </div>
        )}

        {/* ── Preset/custom: transport options info ── */}
        {type !== "vehicle" && transportOptions.length > 0 && (
          <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "8px 14px", marginBottom: 12, fontSize: 11, color: "#00276b" }}>
            Showing vehicles matching Transport Options: <strong>{(booking["Transport Options"] || []).join(", ")}</strong>
          </div>
        )}

        <div style={{ fontSize: 11, color: "#7a9ab8", marginBottom: 12 }}>
          Availability: <strong>{checkFrom}</strong> → <strong>{checkTo}</strong>
        </div>

        {renderVehiclePool(internalVehicles, "Internal Fleet", currentSlotType)}
        {renderVehiclePool(externalVehicles, "External Fleet", currentSlotType)}

      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px", background: "#fafcff" }}>
        {type === "vehicle" ? (
          <span style={{ marginRight: "auto", fontSize: 12, color: "#7a9ab8" }}>
            {assignedCount}/{allSlotsCount} vehicles selected
          </span>
        ) : selectedVehicle && (
          <span style={{ marginRight: "auto", fontSize: 12, color: "#00276b", fontWeight: 500 }}>
            Selected: {selectedVehicle.registrationNumber} — {selectedVehicle.vehicleType}
          </span>
        )}
        <Button variant="secondary" onClick={onHide} style={{ borderRadius: 0 }}>Cancel</Button>
        <Button
          onClick={handleAssign}
          disabled={saving || (type !== "vehicle" && !selectedVehicle)}
          style={{ background: "#00276b", border: "none", borderRadius: 0 }}
        >
          {saving ? "Saving..." : isChange ? "Confirm Change" : "Assign Vehicle(s)"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}