// src/components/modals/customer/ViewCustomReservationModal.js
import React from "react";
import { Modal, Button, Card } from "react-bootstrap";

export default function ViewCustomReservationModal({ show, onHide, booking }) {
  if (!booking) return null;
  const b = booking;

  const renderSection = (section, content) => {
    if (section === "Locations, Adventures and Activities") {
      return (<>{content["Selected Locations"] && (<><h6 className="fw-semibold mt-2">Selected locations</h6><ul>{content["Selected Locations"].map((day, i) => <li key={i}>{day}</li>)}</ul></>)}{content["Adventures"]?.length > 0 && (<><h6 className="fw-semibold mt-3">Adventures</h6><ul>{content["Adventures"].map((act, i) => <li key={i}>{act}</li>)}</ul></>)}{content["Activities"]?.length > 0 && (<><h6 className="fw-semibold mt-3">Activities</h6><ul>{content["Activities"].map((act, i) => <li key={i}>{act}</li>)}</ul></>)}</>);
    }
    if (section === "Meals & Notes") {
      const meal = content["Meal Preference"];
      const notes = content["Tour Notes"];
      const showMeal = meal && meal.trim() !== "" && meal !== "N/A";
      const notesList = typeof notes === "string" ? notes.split(/\r?\n/).map(n => n.trim()).filter(n => n !== "" && n !== "N/A") : [];
      if (!showMeal && notesList.length === 0) return null;
      return (<div>{showMeal && <p><strong>Meal Preference:</strong> <span className="float-end fw-semibold">{meal}</span></p>}{notesList.length > 0 && <div className="mt-2"><strong>Tour Notes:</strong><ul className="mb-0 ps-3">{notesList.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}</div>);
    }
    if (section === "Traveler Details") {
      const order = ["Full Name","Arrival Date","Departure Date","Arrival Airport","Adults","Children","Infants","Tour Guide","Child Car Seat"];
      return <ul className="mb-0">{order.map(key => content[key] ? <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{content[key]}</span></li> : null)}</ul>;
    }
    if (section === "Accommodation") {
      return (<><p><strong>Type:</strong> {content.Type}</p>{content["Luxury Rooms"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul>{content["Luxury Rooms"].map((room, i) => <li key={i}>{room.label} <span className="float-end fw-semibold">{room.price}</span></li>)}</ul></>)}{content["Luxury Rooms Total"] && <p className="fw-semibold"><strong>Luxury Rooms Total:</strong><span className="float-end">{content["Luxury Rooms Total"]}</span></p>}</>);
    }
    if (section === "Pricing Summary") {
      const pricing = content;
      return (<>
        <p><strong>Travelers:</strong> <span className="float-end fw-semibold">{pricing.Travelers}</span></p>
        <p><strong>Nights:</strong> <span className="float-end fw-semibold">{pricing.Nights}</span></p>
        {Array.isArray(pricing["Tour Price"]) && pricing["Tour Price"].length > 0 && (<><h6 className="fw-semibold mt-2">Tour Price</h6><ul className="mb-0">{pricing["Tour Price"].map((item, i) => <li key={i} className="d-flex justify-content-between"><span>{item.label}</span>{item.price && <span className="fw-semibold">{item.price}</span>}</li>)}</ul></>)}
        {Array.isArray(pricing["Accommodation"]) && pricing["Accommodation"].length > 0 && (<><h6 className="fw-semibold mt-2">Accommodation</h6><ul className="mb-0">{pricing["Accommodation"].map((item, i) => <li key={i} className="d-flex justify-content-between"><span>{item.label}</span>{item.price && <span className="fw-semibold">{item.price}</span>}</li>)}</ul></>)}
        {pricing["Luxury Rooms"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul>{pricing["Luxury Rooms"].map((room, i) => <li key={i} className="d-flex justify-content-between"><span>{room.label}</span><span className="fw-semibold">{room.price}</span></li>)}</ul></>)}
        {pricing["Adventures"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Adventures</h6><ul>{pricing["Adventures"].map((act, i) => <li key={i} className="d-flex justify-content-between"><span>{act.label}</span><span className="fw-semibold">{act.price}</span></li>)}</ul></>)}
        {pricing["Activities"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Activities</h6><ul>{pricing["Activities"].map((act, i) => <li key={i} className="d-flex justify-content-between"><span>{act.label}</span><span className="fw-semibold">{act.price}</span></li>)}</ul></>)}
        {pricing.Transport && pricing.Transport !== "$0" && <p className="fw-semibold"><strong>Transport:</strong><span className="float-end">{pricing.Transport}</span></p>}
        {pricing["Tour Guide"] && pricing["Tour Guide"] !== "$0" && <p className="fw-semibold"><strong>Tour Guide:</strong><span className="float-end">{pricing["Tour Guide"]}</span></p>}
        {pricing["Total Price"] && <p className="fw-semibold border-top pt-2 mt-2"><strong>Total Price:</strong><span className="float-end">{pricing["Total Price"]}</span></p>}
      </>);
    }
    if (typeof content === "object" && !Array.isArray(content)) return <ul className="mb-0">{Object.entries(content).map(([key, value]) => <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value, null, 2) : value}</span></li>)}</ul>;
    if (Array.isArray(content)) { if (content.length === 0) return null; return <ul className="mb-0">{content.map((item, i) => <li key={i}>{item}</li>)}</ul>; }
    return <p>{content}</p>;
  };

  const sections = b.sectionOrder || ["Tour Selection","Traveler Details","Accommodation","Transport Options","Tour Inclusions","Locations, Adventures and Activities","Meals & Notes","Pricing Summary"];

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <div>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>Reservation Details — Custom Tour</p>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{b.bookingReference || b.id} · {b["Tour Selection"]?.Tour || "Tour"}</p>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px" }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small mb-3 p-2" style={{ background: "#f8fbff", borderRadius: "8px" }}>
          <div className="me-3 mb-1"><strong>Ref:</strong> <span className="text-secondary">{b.bookingReference || "N/A"}</span></div>
          <div className="me-3 mb-1"><strong>Tour:</strong> <span className="text-secondary">{b["Tour Selection"]?.Tour || "N/A"}</span></div>
          <div className="me-3 mb-1"><strong>Arrival:</strong> <span className="text-secondary">{b["Traveler Details"]?.["Arrival Date"] || "N/A"}</span></div>
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