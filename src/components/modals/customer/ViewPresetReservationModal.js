// src/components/modals/customer/ViewPresetReservationModal.js
import React from "react";
import { Modal, Button, Card } from "react-bootstrap";

export default function ViewPresetReservationModal({ show, onHide, booking }) {
  if (!booking) return null;
  const b = booking;

  const renderSection = (section, content) => {
    if (section === "Daily Plan & Destinations") {
      const hasDailyPlan = Array.isArray(content["🗓️ Daily Plan"]) && content["🗓️ Daily Plan"].length > 0;
      const hasDestinations = Array.isArray(content["🗺️ Destinations"]) && content["🗺️ Destinations"].length > 0;
      const hasActivities = Array.isArray(content["🎯 Activities Planned"]) && content["🎯 Activities Planned"].length > 0;
      if (!hasDailyPlan && !hasDestinations && !hasActivities) return null;
      return (<>
        {hasDailyPlan && (<><h6 className="fw-semibold mt-2">Daily Plan</h6><ul>{content["🗓️ Daily Plan"].map((day, i) => <li key={i}>{day}</li>)}</ul></>)}
        {hasDestinations && (<><h6 className="fw-semibold mt-3">Destinations</h6>{content["🗺️ Destinations"].map((d, i) => (<div key={i} className="mb-2">{d.city} - <ul className="mb-0">{d.destinations?.map((place, j) => <li key={j}>{place}</li>)}</ul></div>))}</>)}
        {hasActivities && (<><h6 className="fw-semibold mt-3">Activities Planned</h6><ul>{content["🎯 Activities Planned"].map((act, i) => <li key={i}>{act}</li>)}</ul></>)}
      </>);
    }
    if (section === "Meals & Notes") {
      const meal = content["Meal Preference"];
      const notes = content["Tour Notes"];
      const showMeal = meal && meal.trim() !== "" && meal !== "N/A";
      const notesList = typeof notes === "string" ? notes.split(/\r?\n/).map(n => n.trim()).filter(n => n !== "" && n !== "N/A") : [];
      if (!showMeal && notesList.length === 0) return null;
      return (<div>{showMeal && <p><strong>Meal Preference:</strong> <span className="float-end fw-semibold">{meal}</span></p>}{notesList.length > 0 && <div className="mt-2"><strong>Tour Notes:</strong><ul className="mb-0 ps-3">{notesList.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}</div>);
    }
    if (section === "Travelers") {
      const order = ["Full Name","Arrival Date","Arrival Airport","Adults","Children","Infants","Tour Guide","Child Car Seat"];
      const filled = order.filter(k => content[k]);
      if (filled.length === 0) return null;
      return <ul className="mb-0">{filled.map(key => <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{content[key]}</span></li>)}</ul>;
    }
    if (section === "Accommodation") {
      const hasType = content.Type != null && content.Type.toString().trim() !== "" && content.Type !== "0" && content.Type !== "$0";
      const hasLuxuryRooms = Array.isArray(content["Luxury Rooms"]) && content["Luxury Rooms"].some(r => (r.label && r.label.toString().trim() !== "") || (r.price && r.price.toString().trim() !== "" && r.price !== 0 && r.price !== "$0"));
      const hasLuxuryTotal = content["Luxury Rooms Total"] != null && content["Luxury Rooms Total"].toString().trim() !== "" && content["Luxury Rooms Total"] !== 0 && content["Luxury Rooms Total"] !== "$0";
      if (!hasType && !hasLuxuryRooms && !hasLuxuryTotal) return null;
      return (<>{hasType && <p><strong>Type:</strong> <span className="float-end fw-semibold">{content.Type}</span></p>}{hasLuxuryRooms && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul>{content["Luxury Rooms"].map((room, i) => { if ((!room.label || room.label.toString().trim() === "") && (!room.price || room.price.toString().trim() === "" || room.price === 0 || room.price === "$0")) return null; return <li key={i}>{room.label}<span className="float-end fw-semibold">{room.price}</span></li>; })}</ul></>)}{hasLuxuryTotal && <p className="fw-semibold">Luxury Rooms Total:<span className="float-end">{content["Luxury Rooms Total"]}</span></p>}</>);
    }
    if (section === "Pricing Summary") {
      const pricing = content;
      const hasPricing = pricing && Object.values(pricing).some(v => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0) && !(typeof v === "object" && Object.keys(v).length === 0));
      if (!hasPricing) return null;
      return (<>
        {pricing.Travelers && <p><strong>Travelers:</strong> <span className="float-end fw-semibold">{pricing.Travelers}</span></p>}
        {pricing.Nights && <p><strong>Nights:</strong> <span className="float-end fw-semibold">{pricing.Nights}</span></p>}
        {pricing["Tour Price"] && (<><h6 className="fw-semibold mt-2">Tour Price:</h6><ul><li>Per Night {pricing["Tour Price"]["Per Day"]}<li>Total <span className="float-end fw-semibold">{pricing["Tour Price"].Total}</span></li></li></ul></>)}
        {pricing["Accommodation"] && Object.keys(pricing["Accommodation"]).length > 0 && (<><h6 className="fw-semibold mt-2">Accommodation</h6><ul>{Object.entries(pricing["Accommodation"]).map(([key, value]) => <li key={key}><span>{key}:</span><span className="float-end fw-semibold">{value}</span></li>)}</ul></>)}
        {Array.isArray(pricing["Luxury Rooms"]) && pricing["Luxury Rooms"].filter(r => r && r.label && r.label.trim() !== "" && r.price && r.price !== "0" && r.price !== "$0").length > 0 && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul className="mb-2 ps-3" style={{listStyleType:"disc"}}>{pricing["Luxury Rooms"].filter(r => r && r.label && r.label.trim() !== "" && r.price && r.price !== "0" && r.price !== "$0").map((room, i) => <li key={i}>{room.label}<span className="float-end fw-semibold">{room.price}</span></li>)}</ul></>)}
        {Array.isArray(pricing["Activities"]) && pricing["Activities"].filter(a => a && a.label && a.label.trim() !== "" && a.price && a.price !== "0" && a.price !== "$0").length > 0 && (<><h6 className="fw-semibold mt-2">Activities</h6><ul className="mb-2 ps-3" style={{listStyleType:"disc"}}>{pricing["Activities"].filter(a => a && a.label && a.label.trim() !== "" && a.price && a.price !== "0" && a.price !== "$0").map((act, i) => <li key={i}>{act.label}<span className="float-end fw-semibold">{act.price}</span></li>)}</ul></>)}
        {pricing.Transport && pricing.Transport !== "0" && pricing.Transport !== "$0" && pricing.Transport.toString().trim() !== "" && <p className="fw-semibold mb-1">Transport:<span className="float-end">{pricing.Transport}</span></p>}
        {pricing["Tour Guide"] != null && pricing["Tour Guide"].toString().trim() !== "" && pricing["Tour Guide"] !== 0 && pricing["Tour Guide"] !== "$0" && <p className="fw-semibold mb-1">Tour Guide:<span className="float-end">{pricing["Tour Guide"]}</span></p>}
        {pricing["Total Price"] && <p className="fw-semibold"><strong>Total Price:</strong><span className="float-end">{pricing["Total Price"]}</span></p>}
      </>);
    }
    if (typeof content === "object" && !Array.isArray(content)) {
      const entries = Object.entries(content).filter(([, value]) => value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0) && !(typeof value === "object" && Object.keys(value).length === 0));
      if (entries.length === 0) return null;
      return <ul className="mb-0">{entries.map(([key, value]) => <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value, null, 2) : value}</span></li>)}</ul>;
    }
    if (Array.isArray(content)) { if (content.length === 0) return null; return <ul className="mb-0">{content.map((item, i) => <li key={i}>{item}</li>)}</ul>; }
    return <p>{content}</p>;
  };

  const sections = b.sectionOrder || ["Tour Info","Travelers","Accommodation","Transport Options","Tour Inclusions","Daily Plan & Destinations","Meals & Notes","Pricing Summary"];

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <div>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>Reservation Details — Preset Tour</p>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{b.bookingReference || b.id} · {b["Tour Info"]?.Tour || "Tour"}</p>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px" }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small mb-3 p-2" style={{ background: "#f8fbff", borderRadius: "8px" }}>
          <div className="me-3 mb-1"><strong>Ref:</strong> <span className="text-secondary">{b.bookingReference || "N/A"}</span></div>
          <div className="me-3 mb-1"><strong>Tour:</strong> <span className="text-secondary">{b["Tour Info"]?.Tour || "N/A"}</span></div>
          <div className="me-3 mb-1"><strong>Arrival:</strong> <span className="text-secondary">{b["Travelers"]?.["Arrival Date"] || "N/A"}</span></div>
          <div><strong>Total:</strong> <span className="text-success fw-semibold">{b["Pricing Summary"]?.["Total Price"] || "$0"}</span></div>
        </div>
        {sections.map((section) => {
          const content = b[section];
          if (!content) return null;
          const rendered = renderSection(section, content);
          if (!rendered) return null;
          return (<Card key={section} className="mb-3 shadow-sm step6-card"><Card.Header className="fw-semibold step1-header">{section}</Card.Header><Card.Body className="step1-body">{rendered}</Card.Body></Card>);
        })}
      </Modal.Body>
      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}