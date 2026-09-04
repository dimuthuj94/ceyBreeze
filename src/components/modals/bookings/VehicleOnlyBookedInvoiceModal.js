// src/components/modals/bookings/VehicleOnlyBookedInvoiceModal.js
import React, { useEffect, useState, useRef } from "react";
import { Modal } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import html2pdf from "html2pdf.js";

const fontStyle = `
  @font-face { font-family: 'LibreFranklin'; src: url('/fonts/LibreFranklin-VariableFont_wght.ttf') format('truetype'); font-weight: 100 900; font-style: normal; }
  .invoice-font { font-family: 'LibreFranklin', Arial, sans-serif !important; letter-spacing: 0.2px; }
`;
if (typeof document !== "undefined" && !document.getElementById("libre-franklin-font")) {
  const s = document.createElement("style"); s.id = "libre-franklin-font"; s.innerHTML = fontStyle; document.head.appendChild(s);
}

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

export default function VehicleOnlyBookedInvoiceModal({ show, onHide, selectedBooking, b }) {
  const [bankDetails,  setBankDetails]  = useState(null);
  const [invoiceTerms, setInvoiceTerms] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [bankSnap, termsSnap] = await Promise.all([
          getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails")),
          getDoc(doc(db, "invoiceTermsAndConditions", "VehicleOnlyInvoices")),
        ]);
        if (bankSnap.exists())  setBankDetails(bankSnap.data());
        if (termsSnap.exists()) setInvoiceTerms(termsSnap.data());
      } catch (err) { console.error(err); }
    };
    fetch();
  }, []);

  if (!b) return null;

  const invoiceDate = b?.createdAt?.toDate ? b.createdAt.toDate() : null;
  const expiryDate  = invoiceDate ? new Date(new Date(invoiceDate).setDate(invoiceDate.getDate() + 3)) : null;
  const formatDate  = (d) => d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

  const handleDownloadPDF = () => {
    const el = pdfRef.current; if (!el) return;
    const omh = el.style.maxHeight; const ooy = el.style.overflowY;
    el.style.maxHeight = "none"; el.style.overflowY = "visible";
    html2pdf().set({
      margin: 10, filename: `VehicleOnlyInvoice_${b?.id || "invoice"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "avoid-all"], before: ".section-header" },
    }).from(el).toPdf().get("pdf").then((pdf) => {
      const n = pdf.internal.getNumberOfPages(); const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(10);
      for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.text(`CEYBREEZE TOURS - PAGE ${i} of ${n}`, pw / 2, ph - 8, { align: "center" }); }
    }).save().then(() => { el.style.maxHeight = omh; el.style.overflowY = ooy; });
  };

  /* ── Section renderers (logic unchanged) ── */
  const renderSection = (section, content) => {
    if (section === "Booking Details") {
      return (
        <div style={{ fontSize: 13 }}>
          <InfoRow label="Customer Name"   value={b.customerName}   />
          <InfoRow label="Email"           value={b.customerEmail}  />
          <InfoRow label="Arrival Date"    value={b.arrivalDate}    />
          <InfoRow label="Departure Date"  value={b.departureDate}  />
          <InfoRow label="Duration"        value={`${b.days} days`} />
        </div>
      );
    }

    if (section === "Vehicles") {
      if (!Array.isArray(b.vehicles) || !b.vehicles.length) return <p style={{ color: "#adc6d8", fontSize: 13 }}>No vehicles selected</p>;
      return (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.06)" }}>
                {["Vehicle","Price/Day","Qty","Days","Subtotal"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "Vehicle" ? "left" : "right", fontSize: 10, fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.vehicles.map((v, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(0,39,107,0.06)" }}>
                  <td style={{ padding: "8px 12px", color: "#00276b", fontWeight: 500 }}>{v.id}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#495057" }}>${v.pricePerDay}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#495057" }}>{v.quantity}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#495057" }}>{v.days}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#00276b", fontWeight: 600 }}>${v.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (section === "Pricing Summary") {
      return (
        <div style={{ fontSize: 13 }}>
          {b.vehicles?.map((v, i) => <InfoRow key={i} label={`${v.id} ($${v.pricePerDay} × ${v.quantity} × ${v.days})`} value={`$${v.subtotal}`} />)}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "#00276b", borderTop: "2px solid rgba(0,39,107,0.12)", marginTop: 8, paddingTop: 8 }}>
            <span>Total</span><span>${b.totalPrice}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  const sections = b.sectionOrder || ["Booking Details", "Vehicles", "Pricing Summary"];

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="invoice-modal">
      <Modal.Header closeButton style={{ background: "#00276b", color: "#fff", borderRadius: 0 }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#fff", fontWeight: 400 }}>Vehicle-Only Invoice</span>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body ref={pdfRef} style={{ maxHeight: "80vh", overflowY: "auto", background: "#EFFAFD", padding: "20px" }} className="invoice-font">

        {/* Letterhead */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.1)", padding: "18px 20px", marginBottom: 16 }}>
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
          <div style={{ background: "#00276b", padding: "10px 0", textAlign: "center", marginBottom: 14 }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#fff", letterSpacing: "0.5px" }}>Vehicle-Only Reservation Invoice</span>
          </div>
          <div style={{ fontSize: 13 }}>
            <InfoRow label="Customer Name"  value={b?.customerName  || "N/A"} />
            <InfoRow label="Customer Email" value={b?.customerEmail || "N/A"} />
            <InfoRow label="Invoice Number" value={b?.id            || "N/A"} />
            <InfoRow label="Invoice Date"   value={formatDate(invoiceDate)} />
            <InfoRow label="Expiry Date"    value={formatDate(expiryDate)} />
          </div>
        </div>

        {/* Sections */}
        {sections.map(section => {
          const rendered = renderSection(section, b[section]);
          if (rendered === null) return null;
          return <SectionCard key={section} title={section}>{rendered}</SectionCard>;
        })}

        {/* Bank Details */}
        {bankDetails && (
          <div style={{ border: "1px solid rgba(0,39,107,0.12)", overflow: "hidden", marginTop: 16, marginBottom: 16 }}>
            <div style={{ background: "#00276b", padding: "9px 16px" }}><span style={{ fontSize: 10, fontWeight: 700, color: "#a8edff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Bank Transfer Details</span></div>
            <div style={{ padding: "14px 16px", background: "#fff" }}>{Object.entries(bankDetails).map(([k, v]) => <InfoRow key={k} label={k} value={v} />)}</div>
          </div>
        )}

        {/* Terms */}
        {invoiceTerms && (
          <div style={{ border: "1px solid rgba(250,199,117,0.5)", overflow: "hidden", marginTop: 16 }}>
            <div style={{ background: "#faeeda", padding: "9px 16px" }}><span style={{ fontSize: 10, fontWeight: 700, color: "#633806", letterSpacing: "0.1em", textTransform: "uppercase" }}>Terms and Conditions</span></div>
            <div style={{ padding: "14px 16px", background: "#fff" }}>
              <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: "#495057" }}>
                {Object.entries(invoiceTerms).map(([k, v]) => <li key={k} style={{ marginBottom: 6 }}><strong>{k}:</strong> {v}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ background: "#fff", borderTop: "1px solid rgba(0,39,107,0.1)", padding: "12px 20px" }}>
        <button onClick={handleDownloadPDF} style={{ background: "#00276b", color: "#fff", border: "none", padding: "9px 22px", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>Download PDF</button>
        <button onClick={onHide} style={{ background: "#f1f3f5", color: "#444", border: "1px solid #d3d1c7", padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 8 }}>Close</button>
      </Modal.Footer>
    </Modal>
  );
}