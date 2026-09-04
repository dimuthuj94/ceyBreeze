// src/pages/booknow/customtours/Step5Summary.js
import React, { useEffect, useState } from "react";
import { Collapse, ListGroup } from "react-bootstrap";
import ConfirmBookingModal from "../../../components/modals/ConfirmBookingModal";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";

export default function Step5Summary({
  selectedTour, travelers = {}, accommodation = "", mealPreference, pricing = {},
  selectedRooms = {}, roomDetails = {}, selectedActivities = [], tourNotes,
  providedVehicles = [], selectedLocations = [], baseAdventurePrice = 0, setActiveKey,
}) {
  const [saving, setSaving]             = useState(false);
  const [summaryTable, setSummaryTable] = useState([]);
  const [openCards, setOpenCards]       = useState({});
  const [showConfirm, setShowConfirm]   = useState(false);
  const [inclusions, setInclusions]     = useState([]);
  const [loadingInclusions, setLoadingInclusions] = useState(true);

  let nights = 1;
  if (travelers?.arrivalDate && travelers?.departureDate) {
    const diff = Math.ceil((new Date(travelers.departureDate) - new Date(travelers.arrivalDate)) / (1000 * 60 * 60 * 24));
    nights = diff > 0 ? diff : 1;
  } else if (selectedTour?.nights) { nights = selectedTour.nights; }

  const chargeableTravelers = (travelers.adults || 0) + (travelers.children || 0);
  const totalTravelersDisplay = chargeableTravelers + (travelers.infants || 0) + (travelers.guideRequired ? 1 : 0);

  const toggleCard = (key) => setOpenCards(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    getDoc(doc(db, "inclusions", "General Inclusions")).then(snap => {
      setInclusions(snap.exists() ? Object.values(snap.data()).flat() : ["No inclusions found"]);
    }).catch(() => setInclusions(["Error loading inclusions"])).finally(() => setLoadingInclusions(false));
  }, []);

  useEffect(() => {
    if (!selectedTour) return;
    const luxuryRoomItems = Object.keys(selectedRooms).filter(r => selectedRooms[r] > 0).map(r => {
      const days = selectedRooms[r]; const price = roomDetails[r]?.additionalPricePerDay || 0;
      return { label: `${r} (${days} days × $${price} × ${chargeableTravelers} travelers)`, price: `$${days * price * chargeableTravelers}` };
    });
    const activitiesItems = [
      ...(pricing.additionalActivitiesPrice > 0 ? [{ label: "Extra Activity Base Price", price: `$${pricing.additionalActivitiesPrice}` }] : []),
      ...(pricing.activities?.map(a => ({ label: `${a.name} ($${a.pricePerPerson} × ${chargeableTravelers})`, price: `$${(a.pricePerPerson || 0) * chargeableTravelers}` })) || []),
    ];
    const adventureItems = [];
    if (pricing.adventures?.length > 0) {
      adventureItems.push({ label: "Adventure Base Price", price: `$${baseAdventurePrice}` });
      pricing.adventures.forEach(adv => adventureItems.push({ label: `${adv.name} ($${adv.pricePerPerson} × ${chargeableTravelers})`, price: `$${adv.pricePerPerson * chargeableTravelers}` }));
    }
    const table = [
      { "Traveler Details": { "Full Name": travelers.fullName, "Arrival Airport": travelers.arrivalAirport, "Arrival Date": travelers.arrivalDate, "Departure Date": travelers.departureDate, Adults: travelers.adults, Children: travelers.children, Infants: travelers.infants, "Tour Guide": travelers.guideRequired ? "Yes" : "No", "Child Car Seat": travelers.childCarSeat ? "Yes" : "No" } },
      { "Tour Selection": { Tour: selectedTour.name || selectedTour.title, Nights: nights } },
      { "Locations, Adventures and Activities": { "Selected Locations": selectedLocations.filter(l => l.type !== "Adventure").map(l => l.name).length > 0 ? selectedLocations.filter(l => l.type !== "Adventure").map(l => l.name) : ["No locations selected"], "Adventures": selectedLocations.filter(l => l.type === "Adventure").length > 0 ? selectedLocations.filter(l => l.type === "Adventure").map(a => a.name) : ["No adventures selected"], "Activities": selectedActivities.length > 0 ? selectedActivities.map(a => a.name) : ["No activities selected"] } },
      { "Accommodation": (() => { const s = { Type: accommodation }; if (luxuryRoomItems.length > 0) s["Luxury Rooms"] = luxuryRoomItems; return s; })() },
      { "Transport Options": providedVehicles.length ? providedVehicles.map(v => `${v.name || "Vehicle"}`) : ["No transport selected"] },
      { "Tour Inclusions": loadingInclusions ? ["Loading..."] : inclusions },
      { "Meals & Notes": { "Meal Preference": mealPreference, "Tour Notes": tourNotes || "N/A" } },
      { "Pricing Summary": (() => {
          const s = { Travelers: totalTravelersDisplay, Nights: nights, "Tour Price": [{ label: `Per Day: $${pricing.basePerDay || 0}` }, { label: "Total:", price: `$${pricing.base || 0}` }] };
          if (accommodation && pricing.accommodationCost) s["Accommodation"] = [{ label: `${accommodation}:`, price: `$${pricing.accommodationCost || 0}` }];
          if (luxuryRoomItems.length > 0) s["Luxury Rooms"] = luxuryRoomItems;
          if (adventureItems.length > 0) s["Adventures"] = adventureItems;
          if (activitiesItems.length > 0) s["Activities"] = activitiesItems;
          if (pricing.transport > 0) s["Transport"] = `$${pricing.transport}`;
          if (travelers.guideRequired && pricing.tourGuide > 0) s["Tour Guide"] = `$${pricing.tourGuide}`;
          s["Total Price"] = `$${pricing.total || 0}`;
          return s;
        })()
      },
    ];
    setSummaryTable(table);
    const open = {};
    table.forEach(s => { open[Object.keys(s)[0]] = true; });
    setOpenCards(open);
  }, [selectedTour, travelers, accommodation, selectedRooms, roomDetails, pricing, selectedActivities, selectedLocations, tourNotes, loadingInclusions]);

  const handleNext = async () => {
    const user = getAuth().currentUser;
    if (!user?.email) { alert("You must be logged in to save a booking."); return; }
    setSaving(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
      const counterRef = doc(db, "customBookingCounters", dateStr);
      await runTransaction(db, async tx => {
        const cSnap = await tx.get(counterRef);
        const seq = cSnap.exists() ? cSnap.data().seq + 1 : 1;
        tx.set(counterRef, { seq }, { merge: true });
        const ref = `CUSTOMBOOK-${dateStr}-${String(seq).padStart(3,"0")}`;
        const summaryObj = {};
        summaryTable.forEach(s => { const k = Object.keys(s)[0]; summaryObj[k] = s[k]; });
        tx.set(doc(db, "unpaidCustomBookings", ref), { bookingReference: ref, bookedDateTime: serverTimestamp(), customerEmail: user.email, ...summaryObj });
      });
      setActiveKey("step6");
    } catch (err) { console.error(err); alert(`Failed to save booking: ${err.code || err.message}`); }
    finally { setSaving(false); setShowConfirm(false); }
  };

  const formatSummaryValue = (val) => {
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && val !== null) return Object.entries(val).map(([k, v]) => `${k}: ${formatSummaryValue(v)}`).join(" | ");
    return val;
  };

  const renderCardItem = (label, value) => (
    <div className="pt-summary-row">
      <span className="pt-summary-key">{label}</span>
      <span className="pt-summary-val">{value}</span>
    </div>
  );

  if (!selectedTour) return <p style={{ color: "#adc6d8", textAlign: "center", padding: "40px 0" }}>No tour selected.</p>;

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
            const isOpen  = openCards[key];
            return (
              <div key={idx} className="pt-summary-card">
                <div className="pt-summary-card-header" onClick={() => toggleCard(key)}>
                  <span>{key}</span>
                  <span>{isOpen ? "▲" : "▼"}</span>
                </div>
                <Collapse in={isOpen}>
                  <div>
                    <div className="pt-summary-card-body">
                      {Array.isArray(content) ? (
                        <ListGroup variant="flush">
                          {content.map((item, i) => <ListGroup.Item key={i} style={{ fontSize: "13px", color: "#7a9ab8", border: "none", borderBottom: "1px solid rgba(0,39,107,0.05)", padding: "6px 0" }}>{formatSummaryValue(item)}</ListGroup.Item>)}
                        </ListGroup>
                      ) : typeof content === "object" ? (
                        Object.entries(content).map(([label, val], i) => (
                          <div key={i} style={{ marginBottom: "6px" }}>
                            {Array.isArray(val) ? (
                              <>
                                <span className="pt-summary-sub-head">{label}</span>
                                <ul className="pt-summary-list">
                                  {val.map((item, j) => typeof item === "object" && item.label
                                    ? <li key={j}><span>{item.label}</span>{item.price && <span>{item.price}</span>}</li>
                                    : <li key={j} style={{ display: "block" }}>{item}</li>
                                  )}
                                </ul>
                              </>
                            ) : renderCardItem(label, formatSummaryValue(val))}
                          </div>
                        ))
                      ) : <div style={{ fontSize: "13px", color: "#7a9ab8" }}>{content}</div>}
                    </div>
                  </div>
                </Collapse>
              </div>
            );
          })}

          <div className="pt-nav-row" style={{ marginTop: "8px" }}>
            <button className="pt-nav-btn secondary" onClick={() => setActiveKey("step4")} disabled={saving}>‹ Previous</button>
            <button className="pt-nav-btn primary" onClick={() => setShowConfirm(true)} disabled={saving}>
              {saving ? "Saving..." : "Confirm & Continue ›"}
            </button>
          </div>
        </>
      )}

      <ConfirmBookingModal show={showConfirm} onHide={() => setShowConfirm(false)} onConfirm={handleNext} title="Confirm Booking" message="Do you wish to proceed with this booking?" loading={saving} confirmLabel="Confirm" cancelLabel="Cancel" />
    </div>
  );
}