// src/pages/booknow/presettours/presettours/Step5Summary.js
import ConfirmBookingModal from "../../../components/modals/ConfirmBookingModal";
import React, { useEffect, useState } from "react";
import { Collapse } from "react-bootstrap";
import { collection, getDocs, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";

export default function Step5Summary({
  selectedTour, travelers = {}, accommodation = "", mealPreference, pricing = {},
  selectedRooms = {}, roomDetails = {}, selectedActivities = [], tourNotes,
  providedVehicles = [], setActiveKey,
}) {
  const [destinations, setDestinations]         = useState({});
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [inclusions, setInclusions]             = useState([]);
  const [loadingInclusions, setLoadingInclusions] = useState(true);
  const [saving, setSaving]                     = useState(false);
  const [summaryTable, setSummaryTable]         = useState([]);
  const [openCards, setOpenCards]               = useState({});
  const [showConfirm, setShowConfirm]           = useState(false);

  const nights = selectedTour?.nights || selectedTour?.days || 1;
  const chargeableTravelers = (travelers.adults || 0) + (travelers.children || 0);
  const totalTravelersDisplay = chargeableTravelers + (travelers.infants || 0) + (travelers.guideRequired ? 1 : 0);

  const toggleCard = (key) => setOpenCards(prev => ({ ...prev, [key]: !prev[key] }));

  const renderCardItem = (label, value) => (
    <div className="pt-summary-item">
      <span className="pt-summary-key">{label}</span>
      <span className="pt-summary-val">{value}</span>
    </div>
  );

  const formatSummaryValue = (val) => {
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && val !== null)
      return Object.entries(val).map(([k, v]) => Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${v}`).join(" | ");
    return val;
  };

  useEffect(() => {
    if (!selectedTour) return;
    setLoadingDestinations(true);
    getDocs(collection(db, "citiesAndDestinations")).then(snap => {
      const data = {};
      snap.docs.forEach(d => {
        const cd = d.data();
        const dests = Object.keys(cd).filter(k => k.startsWith("destination")).map(k => cd[k]);
        data[d.id] = { ...cd, destinations: [...new Set(dests)] };
      });
      setDestinations(data);
    }).catch(() => setDestinations({})).finally(() => setLoadingDestinations(false));
  }, [selectedTour]);

  useEffect(() => {
    getDoc(doc(db, "inclusions", "General Inclusions")).then(snap => {
      setInclusions(snap.exists() ? Object.values(snap.data()).flat() : ["No inclusions found"]);
    }).catch(() => setInclusions(["Error loading inclusions"])).finally(() => setLoadingInclusions(false));
  }, []);

  useEffect(() => {
    if (!selectedTour || loadingDestinations) return;
    const dailyPlanList = selectedTour.dailyPlan?.map((day, i) => `Day ${i + 1}: ${day.type} in ${day.city}`) || [];
    const cityMap = {};
    selectedTour.dailyPlan?.forEach(day => {
      if (day.city && destinations[day.city]?.destinations) {
        if (!cityMap[day.city]) cityMap[day.city] = new Set();
        destinations[day.city].destinations.forEach(d => cityMap[day.city].add(d));
      }
    });
    const destinationDisplay = Object.entries(cityMap).map(([city, s]) => ({ city, destinations: Array.from(s) }));
    let luxuryRoomsTotal = 0;
    const luxuryRoomItems = Object.keys(selectedRooms).filter(r => selectedRooms[r] > 0).map(r => {
      const count = selectedRooms[r];
      const price = roomDetails[r]?.additionalPricePerDay || 0;
      const total = count * price * chargeableTravelers;
      luxuryRoomsTotal += total;
      return { label: `${r} (${count} days × $${price} × ${chargeableTravelers})`, price: `$${total}` };
    });
    const activitiesItems = [
      ...(pricing.additionalActivitiesPrice > 0 ? [{ label: "Base Activity Fee", price: `$${pricing.additionalActivitiesPrice}` }] : []),
      ...(pricing.activities?.map(a => ({ label: `${a.name} ($${a.pricePerPerson} × ${chargeableTravelers})`, price: `$${a.totalPrice}` })) || []),
    ];
    const table = [
      { "Tour Info": { Tour: selectedTour.name || selectedTour.title || "N/A", Nights: selectedTour.nights || selectedTour.days } },
      { "Travelers": { "Full Name": travelers.fullName || "N/A", "Arrival Airport": travelers.arrivalAirport || "N/A", "Arrival Date": travelers.arrivalDate || "N/A", Adults: travelers.adults || 0, Children: travelers.children || 0, Infants: travelers.infants || 0, "Tour Guide": travelers.guideRequired ? "Yes" : "No", "Child Car Seat": travelers.childCarSeat ? "Yes" : "No" } },
      { "Accommodation": (() => { const s = {}; if (accommodation) s.Type = accommodation; if (luxuryRoomItems.length) s["Luxury Rooms"] = luxuryRoomItems; if (luxuryRoomsTotal) s["Luxury Rooms Total"] = `$${luxuryRoomsTotal}`; return Object.keys(s).length ? s : null; })() },
      { "Transport Options": providedVehicles.length ? providedVehicles.map(v => typeof v === "string" ? v : v.name) : ["No transport selected"] },
      { "Tour Inclusions": loadingInclusions ? ["Loading..."] : inclusions },
      { "Daily Plan & Destinations": { "🗓️ Daily Plan": dailyPlanList, "🗺️ Destinations": destinationDisplay, "🎯 Activities Planned": selectedActivities?.length > 0 ? selectedActivities.map(a => typeof a === "string" ? a : a.name || "Unnamed") : ["No activities selected"] } },
      { "Meals & Notes": { "Meal Preference": mealPreference || "N/A", "Tour Notes": tourNotes || "N/A" } },
      { "Pricing Summary": { Travelers: totalTravelersDisplay, Nights: nights, "Tour Price": { "Per Day": `$${pricing.basePerDay || 0}`, Total: `$${pricing.base || 0}` }, Accommodation: { [accommodation]: `$${pricing.accommodationCost || 0}` }, ...(luxuryRoomItems.length ? { "Luxury Rooms": luxuryRoomItems } : {}), ...(activitiesItems.length ? { Activities: activitiesItems } : {}), ...(pricing.transport ? { Transport: `$${pricing.transport}` } : {}), ...(travelers.guideRequired && pricing.tourGuide ? { "Tour Guide": `$${pricing.tourGuide}` } : {}), "Total Price": `$${pricing.total || 0}` } },
    ];
    setSummaryTable(table);
    const open = {};
    table.forEach(s => { open[Object.keys(s)[0]] = true; });
    setOpenCards(open);
  }, [selectedTour, travelers, accommodation, selectedRooms, roomDetails, pricing, selectedActivities, tourNotes, providedVehicles, destinations, loadingDestinations, inclusions, loadingInclusions]);

  const handleNext = async () => {
    const user = getAuth().currentUser;
    if (!user?.email) { alert("You must be logged in to save a booking."); return; }
    setSaving(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
      const counterRef = doc(db, "presetBookingCounters", dateStr);
      await runTransaction(db, async (tx) => {
        const cSnap = await tx.get(counterRef);
        const seq = cSnap.exists() ? cSnap.data().seq + 1 : 1;
        tx.set(counterRef, { seq }, { merge: true });
        const ref = `PRESETBOOK-${dateStr}-${String(seq).padStart(3,"0")}`;
        const summaryObj = {};
        summaryTable.forEach(s => {
          const k = Object.keys(s)[0];
          summaryObj[k] = k === "Daily Plan & Destinations"
            ? { ...s[k], "🎯 Activities Planned": s[k]["🎯 Activities Planned"] || (selectedActivities?.length > 0 ? selectedActivities.map(a => typeof a === "string" ? a : a.name || "Unnamed") : ["No activities selected"]) }
            : s[k];
        });
        tx.set(doc(db, "unpaidPresetBookings", ref), { bookingReference: ref, bookedDateTime: serverTimestamp(), customerEmail: user.email, ...summaryObj });
      });
      setActiveKey("step6");
    } catch (err) {
      console.error(err);
      alert(`Failed to save booking: ${err.code || err.message}`);
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const renderDailyPlanSection = (data) => (
    <div>
      <span className="pt-summary-sub-title">Daily Plan</span>
      <ul className="pt-summary-list">
        {data["🗓️ Daily Plan"].map((d, i) => <li key={i} style={{ display: "block" }}>{d}</li>)}
      </ul>
      <span className="pt-summary-sub-title">Destinations</span>
      {data["🗺️ Destinations"].map(({ city, destinations }, i) => (
        <div key={i} style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#00276b", marginBottom: "3px" }}>{city}</div>
          <ul className="pt-summary-list">{destinations.map((d, j) => <li key={j} style={{ display: "block" }}>{d}</li>)}</ul>
        </div>
      ))}
      {data["🎯 Activities Planned"] && (
        <>
          <span className="pt-summary-sub-title">Activities Planned</span>
          <ul className="pt-summary-list">{data["🎯 Activities Planned"].map((a, i) => <li key={i} style={{ display: "block" }}>{a}</li>)}</ul>
        </>
      )}
    </div>
  );

  if (!selectedTour) return <p style={{ color: "#adc6d8", fontSize: "15px", textAlign: "center", paddingTop: "40px" }}>No tour selected yet.</p>;

  return (
    <div>
      {summaryTable.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "32px", opacity: 0.2, marginBottom: "12px", animation: "res-pulse 2s infinite" }}>◎</div>
          <p>Building summary...</p>
        </div>
      ) : (
        <>
          {summaryTable.map((section, idx) => {
            const key     = Object.keys(section)[0];
            const content = section[key];
            if (!content) return null;
            const isOpen  = openCards[key];

            return (
              <div key={idx} className="pt-card" style={{ marginBottom: "12px" }}>
                <div className="pt-card-header clickable" onClick={() => toggleCard(key)}>
                  <span className="pt-card-header-title">{key}</span>
                  <span className="pt-card-header-toggle">{isOpen ? "▲" : "▼"}</span>
                </div>
                <Collapse in={isOpen}>
                  <div>
                    <div className="pt-card-body">
                      {key === "Daily Plan & Destinations" ? renderDailyPlanSection(content)
                        : Array.isArray(content) ? (
                          <ul className="pt-summary-list">
                            {content.map((item, i) => <li key={i} style={{ display: "block" }}>{formatSummaryValue(item)}</li>)}
                          </ul>
                        ) : typeof content === "object" ? (
                          Object.entries(content).map(([label, val], i) => {
                            if (label === "Accommodation" && typeof val === "object" && !Array.isArray(val)) {
                              return (
                                <div key={i} style={{ marginBottom: "8px" }}>
                                  <span className="pt-summary-key" style={{ display: "block", marginBottom: "4px" }}>{label}</span>
                                  <ul className="pt-summary-list">
                                    {Object.entries(val).map(([t, p], j) => <li key={j}><span>{t}</span><span>{p}</span></li>)}
                                  </ul>
                                </div>
                              );
                            }
                            if (key === "Pricing Summary" && label === "Tour Price" && typeof val === "object") {
                              return (
                                <div key={i} style={{ marginBottom: "10px" }}>
                                  <span className="pt-summary-key" style={{ display: "block", marginBottom: "4px" }}>{label}</span>
                                  <ul className="pt-summary-list">
                                    {Object.entries(val).map(([sl, sv], j) => <li key={j}><span>{sl}</span><span>{sv}</span></li>)}
                                  </ul>
                                </div>
                              );
                            }
                            return (
                              <div key={i} style={{ marginBottom: "6px" }}>
                                {Array.isArray(val) ? (
                                  <>
                                    <span className="pt-summary-sub-title">{label}</span>
                                    <ul className="pt-summary-list">
                                      {val.map((item, j) => typeof item === "object" && item.label
                                        ? <li key={j}><span>{item.label}</span><span>{item.price}</span></li>
                                        : <li key={j} style={{ display: "block" }}>{item}</li>
                                      )}
                                    </ul>
                                  </>
                                ) : renderCardItem(label, formatSummaryValue(val))}
                              </div>
                            );
                          })
                        ) : <div style={{ fontSize: "15px", color: "#7a9ab8" }}>{content}</div>
                      }
                    </div>
                  </div>
                </Collapse>
              </div>
            );
          })}

          <div className="pt-nav">
            <button className="pt-btn secondary" onClick={() => setActiveKey("step4")} disabled={saving}>‹ Previous</button>
            <button className="pt-btn primary" onClick={() => setShowConfirm(true)} disabled={saving}>
              {saving ? "Saving..." : "Confirm & Continue ›"}
            </button>
          </div>
        </>
      )}

      <ConfirmBookingModal
        show={showConfirm}
        onHide={() => setShowConfirm(false)}
        onConfirm={handleNext}
        title="Confirm Booking"
        message="Do you wish to proceed with this booking?"
        loading={saving}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />
    </div>
  );
}