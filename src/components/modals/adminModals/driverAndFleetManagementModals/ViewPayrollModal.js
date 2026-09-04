// src/components/modals/adminModals/driverAndFleetManagementModals/ViewPayrollModal.js
import React, { useState, useEffect, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import {
  collection, query, where, getDocs, orderBy,
} from "firebase/firestore";
import { db } from "../../../../firebase";
import html2pdf from "html2pdf.js";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Row = ({ label, value, sub, indent = false, bold = false, color = "#212529", borderTop = false, bg }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    padding: "6px 0", fontSize: "12px",
    borderTop: borderTop ? "1.5px solid #e9ecef" : "1px solid #f8f9fa",
    background: bg,
    paddingLeft: indent ? "20px" : "0",
  }}>
    <span style={{ color: "#6c757d", fontWeight: bold ? 600 : 400 }}>{label}</span>
    <div style={{ textAlign: "right" }}>
      <div style={{ fontWeight: bold ? 700 : 500, color }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "#adb5bd" }}>{sub}</div>}
    </div>
  </div>
);

export default function ViewPayrollModal({ show, onHide, payroll, allPayrolls }) {
  const [selected,      setSelected]      = useState(null);
  const [navMonth,      setNavMonth]      = useState("");
  const [navYear,       setNavYear]       = useState("");
  const [searching,     setSearching]     = useState(false);
  const pdfRef = useRef();

  useEffect(() => {
    if (!payroll || !show) return;
    setSelected(payroll);
    setNavMonth(payroll.month || "");
    setNavYear(String(payroll.year || new Date().getFullYear()));
  }, [payroll, show]);

  const handleNavigate = async () => {
    if (!selected || !navMonth || !navYear) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, "financeDriverPayroll"),
        where("driverId", "==", selected.driverId),
        where("month", "==", navMonth),
        where("year", "==", parseInt(navYear))
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        alert(`No payroll found for ${selected.driverName} — ${navMonth} ${navYear}.`);
      } else {
        setSelected({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) { alert("Search failed: " + e.message); }
    finally { setSearching(false); }
  };

  const handleDownloadPDF = () => {
    if (!pdfRef.current) return;
    html2pdf().set({
      margin: [8, 8, 8, 8],
      filename: `Payroll_${selected?.driverName?.replace(/\s+/g, "_")}_${selected?.month}_${selected?.year}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(pdfRef.current).save();
  };

  if (!show || !selected) return null;

  const r = selected;
  const additions       = r.additions       || [];
  const customDeductions= r.customDeductions || [];
  const fmtDate = (ts) => ts?.toDate ? ts.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }} className="border-0">
        <div>
          <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>
            Driver Payroll Slip
          </Modal.Title>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
            {r.driverName} · {r.month} {r.year}
          </div>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "0", maxHeight: "82vh", overflowY: "auto" }}>

        {/* Month/Year navigation */}
        <div style={{ padding: "12px 20px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: "#6c757d", fontWeight: 600 }}>Navigate to:</span>
          <select
            value={navMonth} onChange={e => setNavMonth(e.target.value)}
            style={{ fontSize: "12px", padding: "4px 8px", border: "1px solid #dee2e6", color: "#212529" }}
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="number" value={navYear} onChange={e => setNavYear(e.target.value)}
            style={{ width: "80px", fontSize: "12px", padding: "4px 8px", border: "1px solid #dee2e6", color: "#212529" }}
          />
          <button
            onClick={handleNavigate} disabled={searching}
            style={{ background: "#00276b", color: "#fff", border: "none", padding: "5px 14px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
          >
            {searching ? "Searching..." : "Go"}
          </button>
          <span style={{ fontSize: "11px", color: "#adb5bd", marginLeft: "auto" }}>
            Showing: {r.month} {r.year}
          </span>
        </div>

        {/* ── Printable payslip ── */}
        <div ref={pdfRef} style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>

          {/* Company header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", paddingBottom: "16px", borderBottom: "2px solid #00276b" }}>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#00276b", marginBottom: "3px" }}>CEYBREEZE TOURS (PVT) LTD</div>
              <div style={{ fontSize: "11px", color: "#6c757d" }}>No. 45, Beach Road, Colombo, Sri Lanka</div>
              <div style={{ fontSize: "11px", color: "#6c757d" }}>info@ceybreezetours.com · +94 11 234 5678</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: "#00276b", color: "#fff", padding: "6px 14px", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", marginBottom: "4px" }}>
                PAYROLL SLIP
              </div>
              <div style={{ fontSize: "11px", color: "#6c757d" }}>Generated: {new Date().toLocaleDateString("en-GB")}</div>
            </div>
          </div>

          {/* Employee + Period info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginBottom: "20px", padding: "14px 16px", background: "#f8f9fa", border: "1px solid #e9ecef" }}>
            {[
              ["Employee",    r.driverName],
              ["Employee ID", r.driverId || "—"],
              ["Pay Period",  `${r.month} ${r.year}`],
              ["Processed",   fmtDate(r.createdAt)],
              ["Status",      r.status || "Processed"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: "10px", color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#212529" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            {/* Left column — Earnings */}
            <div>
              <div style={{ background: "#00276b", color: "#a8edff", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 12px", marginBottom: "0" }}>
                Earnings
              </div>
              <div style={{ border: "1px solid #e9ecef", borderTop: "none", padding: "4px 12px 8px" }}>
                <Row label="Basic Salary"        value={fmtMoney(r.basicSalary)} />
                {r.overtimePay     > 0 && <Row label="Overtime Pay"       value={fmtMoney(r.overtimePay)} indent />}
                {r.tripAllowance   > 0 && <Row label="Trip Allowance"      value={fmtMoney(r.tripAllowance)} indent />}
                {r.fuelReimbursement > 0 && <Row label="Fuel Reimbursement" value={fmtMoney(r.fuelReimbursement)} indent />}
                {r.bonuses         > 0 && <Row label="Bonuses"             value={fmtMoney(r.bonuses)} indent />}
                {additions.map((a, i) => (
                  <Row key={i} label={a.name || `Addition ${i + 1}`} value={fmtMoney(parseFloat(a.amount) || 0)} indent />
                ))}
                {r.totalAdditions  > 0 && <Row label="Total Custom Additions" value={fmtMoney(r.totalAdditions)} sub="included above" />}
                <Row label="GROSS SALARY" value={fmtMoney(r.grossSalary)} bold color="#27a86e" borderTop />
              </div>
            </div>

            {/* Right column — Deductions */}
            <div>
              <div style={{ background: "#8B0000", color: "#faeeda", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "7px 12px" }}>
                Deductions
              </div>
              <div style={{ border: "1px solid #e9ecef", borderTop: "none", padding: "4px 12px 8px" }}>
                <Row
                  label={`EPF Employee (${r.epfEmployeeRate}%)`}
                  value={`−${fmtMoney(r.epfEmployeeAmount)}`}
                  sub={`${r.epfEmployeeRate}% of Basic`}
                  color="#dc3545"
                />
                {r.advancesDeducted > 0 && (
                  <Row label="Cash Advance Deduction" value={`−${fmtMoney(r.advancesDeducted)}`} color="#dc3545" />
                )}
                {customDeductions.map((d, i) => (
                  <Row key={i} label={d.name || `Deduction ${i + 1}`} value={`−${fmtMoney(parseFloat(d.amount) || 0)}`} indent color="#dc3545" />
                ))}
                {r.totalCustomDeductions > 0 && (
                  <Row label="Total Custom Deductions" value={`−${fmtMoney(r.totalCustomDeductions)}`} sub="included above" color="#dc3545" />
                )}
                <Row label="TOTAL DEDUCTIONS" value={`−${fmtMoney(r.totalDeductions)}`} bold color="#8B0000" borderTop />
              </div>
            </div>
          </div>

          {/* Net salary banner */}
          <div style={{ background: "#00276b", color: "#fff", padding: "14px 16px", marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3px" }}>
                Net Salary (Take-Home Pay)
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                {r.month} {r.year}
              </div>
            </div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color: "#a8edff" }}>
              {fmtMoney(r.netSalary)}
            </div>
          </div>

          {/* Employer contributions */}
          <div style={{ marginTop: "16px", border: "1px solid #fac775", overflow: "hidden" }}>
            <div style={{ background: "#fffbf0", padding: "7px 12px", borderBottom: "1px solid #fac775" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#633806", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Employer Statutory Contributions (Not Deducted from Employee Salary)
              </span>
            </div>
            <div style={{ padding: "4px 12px 8px" }}>
              <Row
                label={`EPF Employer Contribution (${r.epfEmployerRate}%)`}
                value={fmtMoney(r.epfEmployerAmount)}
                sub={`${r.epfEmployerRate}% of Basic — paid by employer to EPF`}
                color="#633806"
              />
              <Row
                label={`ETF Employer Contribution (${r.etfEmployerRate}%)`}
                value={fmtMoney(r.etfEmployerAmount)}
                sub={`${r.etfEmployerRate}% of Basic — paid by employer to ETF`}
                color="#633806"
              />
              <Row
                label="Total EPF (Employee + Employer)"
                value={fmtMoney((r.epfEmployeeAmount || 0) + (r.epfEmployerAmount || 0))}
                sub="Total EPF contribution to fund"
                color="#8B0000"
                bold
                borderTop
              />
              <Row
                label="Total Employer Statutory Cost"
                value={fmtMoney(r.totalEmployerContributions)}
                sub="EPF Employer + ETF — company's additional labour cost"
                color="#8B0000"
                bold
              />
            </div>
          </div>

          {/* Notes */}
          {r.notes && (
            <div style={{ marginTop: "14px", padding: "10px 12px", background: "#f8f9fa", border: "1px solid #e9ecef", fontSize: "12px", color: "#6c757d" }}>
              <strong>Notes:</strong> {r.notes}
            </div>
          )}

          {/* Signature block */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "28px", paddingTop: "16px", borderTop: "1px solid #e9ecef" }}>
            {["Employee Signature", "Accounts Officer", "Director / HR"].map(label => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ height: "40px", borderBottom: "1px solid #dee2e6", marginBottom: "6px" }} />
                <div style={{ fontSize: "10px", color: "#adb5bd" }}>{label}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "10px", color: "#adb5bd", textAlign: "center", marginTop: "16px", margin: "16px 0 0" }}>
            This is a computer-generated payroll slip. For queries contact the HR/Accounts department.
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
        <Button
          onClick={handleDownloadPDF}
          style={{ background: "#00276b", border: "none", fontSize: "13px" }}
        >
          ⬇ Download PDF
        </Button>
      </Modal.Footer>
    </Modal>
  );
}