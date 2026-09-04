// src/components/modals/bookings/PresetBookedTourInvoiceModal.js
import React, { useEffect, useState, useRef } from "react";
import { Modal, Row, Col, Image } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import html2pdf from "html2pdf.js";

const fontStyle = `
  @font-face {
    font-family: 'LibreFranklin';
    src: url('/fonts/LibreFranklin-VariableFont_wght.ttf') format('truetype');
    font-weight: 100 900; font-style: normal;
  }
  .invoice-font { font-family: 'LibreFranklin', Arial, sans-serif !important; letter-spacing: 0.2px; }
`;
if (typeof document !== "undefined" && !document.getElementById("libre-franklin-font")) {
  const s = document.createElement("style"); s.id = "libre-franklin-font"; s.innerHTML = fontStyle; document.head.appendChild(s);
}

const renderValue = (val) => {
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object" && val !== null) return JSON.stringify(val);
  return val || "N/A";
};

/* ── Shared sub-components ── */
const SectionCard = ({ title, children }) => (
  <div style={{ border: "1px solid rgba(0,39,107,0.1)", overflow: "hidden", marginBottom: "16px" }}>
    <div style={{ background: "#00276b", padding: "9px 16px" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#a8edff", letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</span>
    </div>
    <div style={{ padding: "14px 16px", background: "#fff" }}>{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
    <span style={{ color: "#7a9ab8" }}>{label}</span>
    <span style={{ color: "#00276b", fontWeight: 600 }}>{value}</span>
  </div>
);

export default function PresetBookedTourInvoiceModal({ show, onHide, selectedBooking, b }) {
  const [bankDetails,  setBankDetails]  = useState(null);
  const [invoiceTerms, setInvoiceTerms] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [bankSnap, termsSnap] = await Promise.all([
          getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails")),
          getDoc(doc(db, "invoiceTermsAndConditions", "PresetTourInvoices")),
        ]);
        if (bankSnap.exists())  setBankDetails(bankSnap.data());
        if (termsSnap.exists()) setInvoiceTerms(termsSnap.data());
      } catch (err) { console.error(err); }
    };
    fetch();
  }, []);

  if (!b) return null;

  const invoiceDate = b?.bookedDateTime?.toDate ? b.bookedDateTime.toDate() : null;
  const expiryDate  = invoiceDate ? new Date(new Date(invoiceDate).setDate(invoiceDate.getDate() + 3)) : null;
  const formatDate  = (d) => d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

  const handleDownloadPDF = () => {
    const el = pdfRef.current; if (!el) return;
    const omh = el.style.maxHeight; const ooy = el.style.overflowY;
    el.style.maxHeight = "none"; el.style.overflowY = "visible";
    html2pdf().set({
      margin: 10, filename: `PresetTourInvoice_${b?.id || "invoice"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "avoid-all"], before: ".section-header" },
    }).from(el).toPdf().get("pdf").then((pdf) => {
      const n = pdf.internal.getNumberOfPages();
      const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(10);
      for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.text(`CEYBREEZE TOURS - PAGE ${i} of ${n}`, pw / 2, ph - 8, { align: "center" }); }
    }).save().then(() => { el.style.maxHeight = omh; el.style.overflowY = ooy; });
  };

  /* ── Section renderers (logic unchanged) ── */
  const renderSection = (section, content) => {
    if (!content) return null;

    if (section === "Daily Plan & Destinations") {
      return (
        <>
          {content["🗓️ Daily Plan"] && (
            <><p style={{ fontSize: 11, fontWeight: 700, color: "#56c6e8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Daily Plan</p>
            <ul style={{ paddingLeft: 16, margin: "0 0 10px", fontSize: 13, color: "#495057" }}>
              {content["🗓️ Daily Plan"].map((d, i) => <li key={i}>{d}</li>)}
            </ul></>
          )}
          {content["🗺️ Destinations"] && (
            <><p style={{ fontSize: 11, fontWeight: 700, color: "#56c6e8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Destinations</p>
            {content["🗺️ Destinations"].map((d, i) => (
              <div key={i} style={{ marginBottom: 6, fontSize: 13, color: "#495057" }}>
                <strong style={{ color: "#00276b" }}>{d.city}</strong>
                <ul style={{ paddingLeft: 16, margin: "2px 0 0" }}>{d.destinations?.map((p, j) => <li key={j}>{p}</li>)}</ul>
              </div>
            ))}</>
          )}
          {content["🎯 Activities Planned"]?.length > 0 && (
            <><p style={{ fontSize: 11, fontWeight: 700, color: "#56c6e8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Activities Planned</p>
            <ul style={{ paddingLeft: 16, fontSize: 13, color: "#495057" }}>
              {content["🎯 Activities Planned"].map((a, i) => <li key={i}>{a}</li>)}
            </ul></>
          )}
        </>
      );
    }

    if (section === "Meals & Notes") {
      const meal  = content["Meal Preference"];
      const notes = content["Tour Notes"];
      const showMeal = meal && meal.trim() !== "" && meal !== "N/A";
      const notesList = typeof notes === "string" ? notes.split(/\r?\n/).map(n => n.trim()).filter(n => n !== "" && n !== "N/A") : [];
      if (!showMeal && notesList.length === 0) return null;
      return (
        <div style={{ fontSize: 13, color: "#495057" }}>
          {showMeal && <InfoRow label="Meal Preference" value={meal} />}
          {notesList.length > 0 && <><p style={{ fontWeight: 600, color: "#00276b", marginTop: 8, marginBottom: 4 }}>Tour Notes</p><ul style={{ paddingLeft: 16 }}>{notesList.map((n, i) => <li key={i}>{n}</li>)}</ul></>}
        </div>
      );
    }

    if (section === "Travelers") {
      const order = ["Full Name","Arrival Date","Arrival Airport","Adults","Children","Infants","Tour Guide","Child Car Seat"];
      const filled = order.filter(k => content[k]);
      if (!filled.length) return null;
      return <div style={{ fontSize: 13 }}>{filled.map(k => <InfoRow key={k} label={k} value={content[k]} />)}</div>;
    }

    if (section === "Accommodation") {
      const hasType = content.Type != null && content.Type.toString().trim() !== "" && content.Type !== "0" && content.Type !== "$0";
      const hasLuxury = Array.isArray(content["Luxury Rooms"]) && content["Luxury Rooms"].some(r => r.label?.trim() || (r.price && r.price !== "0" && r.price !== "$0"));
      const hasLuxTotal = content["Luxury Rooms Total"] != null && content["Luxury Rooms Total"] !== 0 && content["Luxury Rooms Total"] !== "$0";
      if (!hasType && !hasLuxury && !hasLuxTotal) return null;
      return (
        <div style={{ fontSize: 13 }}>
          {hasType && <InfoRow label="Type" value={content.Type} />}
          {hasLuxury && (
            <><p style={{ fontWeight: 600, color: "#00276b", marginTop: 8, marginBottom: 4 }}>Luxury Rooms</p>
            <ul style={{ paddingLeft: 16 }}>
              {content["Luxury Rooms"].filter(r => r.label?.trim() && r.price && r.price !== "0" && r.price !== "$0").map((r, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between" }}><span>{r.label}</span><span style={{ fontWeight: 600 }}>{r.price}</span></li>
              ))}
            </ul></>
          )}
          {hasLuxTotal && <InfoRow label="Luxury Rooms Total" value={content["Luxury Rooms Total"]} />}
        </div>
      );
    }

    if (section === "Pricing Summary") {
      const p = content;
      const hasPricing = p && Object.values(p).some(v => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length));
      if (!hasPricing) return null;
      return (
        <div style={{ fontSize: 13 }}>
          {p.Travelers && <InfoRow label="Travelers" value={p.Travelers} />}
          {p.Nights    && <InfoRow label="Nights"    value={p.Nights}    />}
          {p["Tour Price"] && (
            <><p style={{ fontWeight: 600, color: "#00276b", marginTop: 8, marginBottom: 4 }}>Tour Price</p>
            <ul style={{ paddingLeft: 16 }}>
              <li style={{ display: "flex", justifyContent: "space-between" }}><span>Per Night</span><span style={{ fontWeight: 600 }}>{p["Tour Price"]["Per Day"]}</span></li>
              <li style={{ display: "flex", justifyContent: "space-between" }}><span>Total</span><span style={{ fontWeight: 600 }}>{p["Tour Price"].Total}</span></li>
            </ul></>
          )}
          {p.Accommodation && Object.keys(p.Accommodation).length > 0 && (
            <><p style={{ fontWeight: 600, color: "#00276b", marginTop: 8, marginBottom: 4 }}>Accommodation</p>
            <ul style={{ paddingLeft: 16 }}>{Object.entries(p.Accommodation).map(([k, v]) => <li key={k} style={{ display: "flex", justifyContent: "space-between" }}><span>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></li>)}</ul></>
          )}
          {Array.isArray(p["Luxury Rooms"]) && p["Luxury Rooms"].filter(r => r?.label?.trim() && r.price && r.price !== "0" && r.price !== "$0").length > 0 && (
            <><p style={{ fontWeight: 600, color: "#00276b", marginTop: 8, marginBottom: 4 }}>Luxury Rooms</p>
            <ul style={{ paddingLeft: 16 }}>{p["Luxury Rooms"].filter(r => r?.label?.trim() && r.price && r.price !== "0" && r.price !== "$0").map((r, i) => <li key={i} style={{ display: "flex", justifyContent: "space-between" }}><span>{r.label}</span><span style={{ fontWeight: 600 }}>{r.price}</span></li>)}</ul></>
          )}
          {Array.isArray(p.Activities) && p.Activities.filter(a => a?.label?.trim() && a.price && a.price !== "0" && a.price !== "$0").length > 0 && (
            <><p style={{ fontWeight: 600, color: "#00276b", marginTop: 8, marginBottom: 4 }}>Activities</p>
            <ul style={{ paddingLeft: 16 }}>{p.Activities.filter(a => a?.label?.trim() && a.price && a.price !== "0" && a.price !== "$0").map((a, i) => <li key={i} style={{ display: "flex", justifyContent: "space-between" }}><span>{a.label}</span><span style={{ fontWeight: 600 }}>{a.price}</span></li>)}</ul></>
          )}
          {p.Transport && p.Transport !== "0" && p.Transport !== "$0" && p.Transport.toString().trim() !== "" && <InfoRow label="Transport" value={p.Transport} />}
          {p["Tour Guide"] != null && p["Tour Guide"].toString().trim() !== "" && p["Tour Guide"] !== 0 && p["Tour Guide"] !== "$0" && <InfoRow label="Tour Guide" value={p["Tour Guide"]} />}
          {p["Total Price"] && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#00276b", borderTop: "2px solid rgba(0,39,107,0.12)", marginTop: 8, paddingTop: 8 }}>
              <span>Total Price</span><span>{p["Total Price"]}</span>
            </div>
          )}
        </div>
      );
    }

    // Generic
    if (typeof content === "object" && !Array.isArray(content)) {
      return <div style={{ fontSize: 13 }}>{Object.entries(content).map(([k, v]) => <InfoRow key={k} label={k} value={renderValue(v)} />)}</div>;
    }
    if (Array.isArray(content)) {
      return <ul style={{ paddingLeft: 16, fontSize: 13, color: "#495057", margin: 0 }}>{content.map((item, i) => <li key={i}>{renderValue(item)}</li>)}</ul>;
    }
    return <p style={{ fontSize: 13, color: "#495057", margin: 0 }}>{renderValue(content)}</p>;
  };

  const sections = b.sectionOrder || ["Tour Info","Travelers","Accommodation","Transport Options","Tour Inclusions","Daily Plan & Destinations","Meals & Notes","Pricing Summary"];

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="invoice-modal">
      <Modal.Header closeButton style={{ background: "#00276b", color: "#fff", borderRadius: 0 }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#fff", fontWeight: 400 }}>Preset Tour Invoice</span>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body ref={pdfRef} style={{ maxHeight: "80vh", overflowY: "auto", background: "#EFFAFD", padding: "20px" }} className="invoice-font">

        {/* ── Letterhead ── */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.1)", padding: "18px 20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#00276b", marginBottom: 4 }}>CEYBREEZE TOURS (PVT) LTD</div>
              <p style={{ margin: 0, fontSize: 12, color: "#7a9ab8" }}>No. 45, Beach Road, Colombo, Sri Lanka</p>
              <p style={{ margin: 0, fontSize: 12, color: "#7a9ab8" }}>Email: info@ceybreezetours.com</p>
              <p style={{ margin: 0, fontSize: 12, color: "#7a9ab8" }}>Tel: +94 11 234 5678</p>
            </div>
            <img src="/images/logo.png" alt="CeyBreeze" style={{ maxWidth: 100, objectFit: "contain" }} />
          </div>
          <div style={{ borderTop: "2px solid #00276b", margin: "14px 0" }} />
          <div style={{ background: "#00276b", padding: "10px 0", textAlign: "center", marginBottom: "14px" }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#fff", letterSpacing: "0.5px" }}>Preset Booked Tour Invoice</span>
          </div>
          <div style={{ fontSize: 13 }}>
            <InfoRow label="Customer Name"  value={b?.Travelers?.["Full Name"] || "N/A"} />
            <InfoRow label="Customer Email" value={b?.customerEmail || "N/A"} />
            <InfoRow label="Invoice Number" value={b?.id || "N/A"} />
            <InfoRow label="Invoice Date"   value={formatDate(invoiceDate)} />
            <InfoRow label="Expiry Date"    value={formatDate(expiryDate)} />
          </div>
        </div>

        {/* ── Tour sections ── */}
        {sections.map(section => {
          const content = b[section];
          if (!content) return null;
          const rendered = renderSection(section, content);
          if (rendered === null) return null;
          return <SectionCard key={section} title={section}>{rendered}</SectionCard>;
        })}

        {/* ── Bank Details ── */}
        {bankDetails && (
          <div style={{ border: "1px solid rgba(0,39,107,0.12)", overflow: "hidden", marginTop: 16, marginBottom: 16 }}>
            <div style={{ background: "#00276b", padding: "9px 16px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#a8edff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Bank Transfer Details</span>
            </div>
            <div style={{ padding: "14px 16px", background: "#fff" }}>
              {Object.entries(bankDetails).map(([k, v], i) => <InfoRow key={k} label={k} value={v} />)}
            </div>
          </div>
        )}

        {/* ── Terms ── */}
        {invoiceTerms && (
          <div style={{ border: "1px solid rgba(250,199,117,0.5)", overflow: "hidden", marginTop: 16 }}>
            <div style={{ background: "#faeeda", padding: "9px 16px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#633806", letterSpacing: "0.1em", textTransform: "uppercase" }}>Terms and Conditions</span>
            </div>
            <div style={{ padding: "14px 16px", background: "#fff" }}>
              <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: "#495057" }}>
                {Object.entries(invoiceTerms).map(([k, v]) => <li key={k} style={{ marginBottom: 6 }}><strong>{k}:</strong> {v}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ background: "#fff", borderTop: "1px solid rgba(0,39,107,0.1)", padding: "12px 20px" }}>
        <button onClick={handleDownloadPDF} style={{ background: "#00276b", color: "#fff", border: "none", padding: "9px 22px", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Download PDF
        </button>
        <button onClick={onHide} style={{ background: "#f1f3f5", color: "#444", border: "1px solid #d3d1c7", padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 8 }}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
}