// src/components/modals/adminModals/driverAndFleetManagementModals/ViewVehicleScheduleModal.js
import React, { useEffect, useState, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../../firebase";
import html2pdf from "html2pdf.js";

const fmt = (str) => {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const statusStyle = (status) => {
  const map = {
    active: { background: "#eaf3de", color: "#27500a" },
    completed: { background: "#e6f1fb", color: "#0c447c" },
    replaced: { background: "#faeeda", color: "#633806" },
  };
  return {
    ...(map[status] || { background: "#f1efe8", color: "#444441" }),
    fontSize: "10px", fontWeight: 600, padding: "2px 8px",
    borderRadius: "12px", textTransform: "capitalize",
  };
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "replaced", label: "Replaced" },
];

export default function ViewVehicleScheduleModal({ show, onHide, vehicle, vehiclePool = "internal" }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportMode, setExportMode] = useState("yearly");
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportQuarter, setExportQuarter] = useState(1);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [showExportPanel, setShowExportPanel] = useState(false);

  useEffect(() => {
    if (!show || !vehicle) return;
    setLoading(true);
    getDocs(
      query(collection(db, "vehicleSchedules", vehicle.id, "assignments"), orderBy("effectiveFrom", "desc"))
    ).then((snap) => {
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [show, vehicle]);

  const filtered = assignments.filter((a) => statusFilter === "all" || a.status === statusFilter);

  const filterByExport = (list) => {
    return list.filter((a) => {
      const date = new Date(a.effectiveFrom);
      if (isNaN(date)) return false;
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      if (exportMode === "yearly") return y === Number(exportYear);
      if (exportMode === "monthly") return y === Number(exportYear) && m === Number(exportMonth);
      if (exportMode === "quarterly") return y === Number(exportYear) && Math.ceil(m / 3) === Number(exportQuarter);
      if (exportMode === "custom") {
        const from = new Date(exportFrom);
        const to = new Date(exportTo);
        return (!exportFrom || date >= from) && (!exportTo || date <= to);
      }
      return true;
    });
  };

  const handleDownloadPDF = () => {
    const exportList = filterByExport(assignments);
    if (!exportList.length) { alert("No assignments found for the selected period."); return; }

    const modeLabel = {
      yearly: `Year ${exportYear}`,
      monthly: `${new Date(exportYear, exportMonth - 1).toLocaleString("default", { month: "long" })} ${exportYear}`,
      quarterly: `Q${exportQuarter} ${exportYear}`,
      custom: `${exportFrom || "Start"} to ${exportTo || "End"}`,
    }[exportMode];

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; font-size: 12px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
          <div>
            <p style="font-size:15px; font-weight:700; color:#00276b; margin:0 0 4px;">CEYBREEZE TOURS (PVT) LTD</p>
            <p style="font-size:11px; color:#6c757d; margin:0;">Vehicle Schedule Report · ${modeLabel}</p>
          </div>
          <img src="/images/logo.png" style="max-height:40px; max-width:80px;" />
        </div>

        <div style="background:#f8f9fa; border-radius:8px; padding:12px; margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          <div><p style="margin:0; font-size:10px; color:#adb5bd;">Vehicle ID</p><p style="margin:0; font-weight:600;">${vehicle?.id}</p></div>
          <div><p style="margin:0; font-size:10px; color:#adb5bd;">Registration</p><p style="margin:0; font-weight:600;">${vehicle?.registrationNumber}</p></div>
          <div><p style="margin:0; font-size:10px; color:#adb5bd;">Type</p><p style="margin:0; font-weight:600;">${vehiclePool === "external" ? "External" : "Internal"}</p></div>
          <div><p style="margin:0; font-size:10px; color:#adb5bd;">Vehicle Type</p><p style="margin:0; font-weight:600;">${vehicle?.vehicleType || "—"}</p></div>
          <div><p style="margin:0; font-size:10px; color:#adb5bd;">Make / Model</p><p style="margin:0; font-weight:600;">${vehicle?.vehicleMake || "—"} ${vehicle?.vehicleModel || ""}</p></div>
          <div><p style="margin:0; font-size:10px; color:#adb5bd;">Total Assignments</p><p style="margin:0; font-weight:600;">${exportList.length}</p></div>
        </div>

        ${vehicle?.photos?.[0] ? `<div style="margin-bottom:12px;"><img src="${vehicle.photos[0]}" style="height:80px; width:120px; object-fit:cover; border-radius:6px; border:1px solid #e9ecef;" /></div>` : ""}

        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr style="background:#00276b; color:#fff;">
              <th style="padding:7px 8px; text-align:left;">#</th>
              <th style="padding:7px 8px; text-align:left;">Booking ID</th>
              <th style="padding:7px 8px; text-align:left;">Tour</th>
              <th style="padding:7px 8px; text-align:left;">Type</th>
              <th style="padding:7px 8px; text-align:left;">From</th>
              <th style="padding:7px 8px; text-align:left;">To</th>
              <th style="padding:7px 8px; text-align:left;">Days</th>
              <th style="padding:7px 8px; text-align:left;">Replacement</th>
              <th style="padding:7px 8px; text-align:left;">Replaced Vehicle</th>
              <th style="padding:7px 8px; text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${exportList.map((a, i) => `
              <tr style="background:${i % 2 === 0 ? "#fff" : "#f8f9fa"}; border-bottom:1px solid #e9ecef;">
                <td style="padding:6px 8px;">${i + 1}</td>
                <td style="padding:6px 8px; font-weight:500;">${a.bookingId || "—"}</td>
                <td style="padding:6px 8px;">${a.tourName || "—"}</td>
                <td style="padding:6px 8px; text-transform:capitalize;">${a.tourType || "—"}</td>
                <td style="padding:6px 8px;">${fmt(a.effectiveFrom)}</td>
                <td style="padding:6px 8px;">${fmt(a.departureDateEffective || a.departureDate)}</td>
                <td style="padding:6px 8px;">${a.totalDays || "—"}</td>
                <td style="padding:6px 8px;">${a.isReplacement ? "Yes" : "No"}</td>
                <td style="padding:6px 8px;">${a.replacedVehicleId || "—"}</td>
                <td style="padding:6px 8px; text-transform:capitalize;">${a.status || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <p style="margin-top:20px; font-size:10px; color:#adb5bd; text-align:center;">
          Generated on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · Ceybreeze Tours (Pvt) Ltd
        </p>
      </div>
    `;

    html2pdf().set({
      margin: 8,
      filename: `VehicleSchedule_${vehicle?.id}_${modeLabel.replace(/\s/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    }).from(html).save();
  };

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (!vehicle) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="xl">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <div>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>Vehicle Schedule</p>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
            {vehicle.id} · {vehicle.registrationNumber} · {vehicle.vehicleType} · {vehiclePool === "external" ? "External" : "Internal"}
          </p>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px", maxHeight: "78vh", overflowY: "auto" }}>

        {/* Vehicle summary strip */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "#f8f9fa", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
          {vehicle.photos?.[0] ? (
            <img src={vehicle.photos[0]} alt="Vehicle" style={{ width: "80px", height: "56px", borderRadius: "6px", objectFit: "cover", border: "2px solid #00276b", flexShrink: 0 }} />
          ) : (
            <div style={{ width: "80px", height: "56px", borderRadius: "6px", background: "#e8edf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: "#00276b", flexShrink: 0 }}>
              {vehicle.vehicleType?.slice(0, 3).toUpperCase()}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px 20px", flex: 1 }}>
            {[
              ["Vehicle ID", vehicle.id],
              ["Registration", vehicle.registrationNumber],
              ["Type", vehiclePool === "external" ? "External" : "Internal"],
              ["Vehicle Type", vehicle.vehicleType],
              ["Make / Model", `${vehicle.vehicleMake || "—"} ${vehicle.vehicleModel || ""}`],
              ["Owner", vehicle.ownerName],
              ["Total Assignments", assignments.length],
              ["Active", assignments.filter((a) => a.status === "active").length],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: "10px", color: "#adb5bd" }}>{label}</p>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: "#212529" }}>{value ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter + Export */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                style={{
                  padding: "4px 12px", fontSize: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: 500,
                  border: "1px solid",
                  background: statusFilter === f.key ? "#00276b" : "#fff",
                  color: statusFilter === f.key ? "#fff" : "#6c757d",
                  borderColor: statusFilter === f.key ? "#00276b" : "#dee2e6",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowExportPanel(!showExportPanel)}
            style={{ padding: "5px 14px", fontSize: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: 500, border: "1px solid #00276b", background: showExportPanel ? "#00276b" : "#fff", color: showExportPanel ? "#fff" : "#00276b" }}
          >
            Export PDF
          </button>
        </div>

        {/* Export panel */}
        {showExportPanel && (
          <div style={{ background: "#f0f4ff", border: "1px solid #b5d4f4", borderRadius: "8px", padding: "14px 16px", marginBottom: "16px" }}>
            <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 600, color: "#00276b" }}>Export Options</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500 }}>Period</label>
                <select value={exportMode} onChange={(e) => setExportMode(e.target.value)} style={{ border: "1px solid #dee2e6", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {exportMode !== "custom" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500 }}>Year</label>
                  <select value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))} style={{ border: "1px solid #dee2e6", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}

              {exportMode === "monthly" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500 }}>Month</label>
                  <select value={exportMonth} onChange={(e) => setExportMonth(Number(e.target.value))} style={{ border: "1px solid #dee2e6", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {exportMode === "quarterly" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500 }}>Quarter</label>
                  <select value={exportQuarter} onChange={(e) => setExportQuarter(Number(e.target.value))} style={{ border: "1px solid #dee2e6", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}>
                    <option value={1}>Q1 (Jan–Mar)</option>
                    <option value={2}>Q2 (Apr–Jun)</option>
                    <option value={3}>Q3 (Jul–Sep)</option>
                    <option value={4}>Q4 (Oct–Dec)</option>
                  </select>
                </div>
              )}

              {exportMode === "custom" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500 }}>From</label>
                    <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} style={{ border: "1px solid #dee2e6", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500 }}>To</label>
                    <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} style={{ border: "1px solid #dee2e6", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }} />
                  </div>
                </>
              )}

              <button
                onClick={handleDownloadPDF}
                style={{ padding: "6px 16px", fontSize: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: 500, border: "none", background: "#00276b", color: "#fff", alignSelf: "flex-end" }}
              >
                Download PDF
              </button>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#6c757d" }}>
              {filterByExport(assignments).length} assignment(s) will be included in the export.
            </p>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p style={{ color: "#adb5bd", fontSize: "13px" }}>Loading schedule...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#adb5bd", fontSize: "13px" }}>No assignments found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                  {["#", "Booking ID", "Tour Name", "Type", "Effective From", "To", "Days", "Replacement?", "Replaced Vehicle", "Status"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#6c757d", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f3f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "8px 10px", color: "#adb5bd" }}>{i + 1}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 500, color: "#212529" }}>{a.bookingId || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{a.tourName || "—"}</td>
                    <td style={{ padding: "8px 10px", textTransform: "capitalize" }}>{a.tourType || "—"}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fmt(a.effectiveFrom)}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{fmt(a.departureDateEffective || a.departureDate)}</td>
                    <td style={{ padding: "8px 10px" }}>{a.totalDays || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {a.isReplacement
                        ? <span style={{ background: "#faeeda", color: "#633806", fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px" }}>Yes</span>
                        : <span style={{ color: "#adb5bd" }}>No</span>}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#6c757d", fontSize: "11px" }}>{a.replacedVehicleId || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={statusStyle(a.status)}>{a.status || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px", borderTop: "1px solid #f1f3f5" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}