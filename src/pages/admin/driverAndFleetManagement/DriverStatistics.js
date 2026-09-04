// src/pages/admin/driverAndFleetManagement/DriverStatistics.js
import React, { useEffect, useState } from "react";
import DriverAndFleetManagement from "../../../components/layouts/admin/DriverAndFleetManagement";
import {
  collection, onSnapshot, query, where, getDocs, orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";

const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtDate  = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const pill = (bg, color, text) => (
  <span style={{ background: bg, color, fontSize: "9px", fontWeight: 700, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-block" }}>
    {text}
  </span>
);

const SectionHeader = ({ title, sub }) => (
  <div style={{ background: "#00276b", padding: "10px 16px", marginBottom: "0" }}>
    <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</span>
    {sub && <span style={{ fontSize: "10px", color: "rgba(168,237,255,0.5)", marginLeft: "10px" }}>{sub}</span>}
  </div>
);

export default function DriverStatistics() {
  const [drivers,        setDrivers]        = useState([]);
  const [payrolls,       setPayrolls]        = useState([]);
  const [advances,       setAdvances]        = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [assignments,    setAssignments]     = useState({});  // driverId → [assignments]
  const [loading,        setLoading]         = useState(true);
  const [search,         setSearch]          = useState("");
  const [sortBy,         setSortBy]          = useState("name");
  const [expandedId,     setExpandedId]      = useState(null);

  /* ── Load base data ── */
  useEffect(() => {
    const u1 = onSnapshot(collection(db, "drivers"), snap => {
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    const u2 = onSnapshot(query(collection(db, "financeDriverPayroll"), orderBy("createdAt", "desc")), snap => {
      setPayrolls(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    const u3 = onSnapshot(collection(db, "financeDriverAdvances"), snap => {
      setAdvances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});

    /* Completed bookings across all types */
    const COMP_COLS = ["completedPresetBookings","completedCustomBookings","completedVehicleBookings"];
    let all = [];
    let loaded = 0;
    COMP_COLS.forEach(col => {
      getDocs(collection(db, col)).then(snap => {
        snap.docs.forEach(d => all.push({ id: d.id, _col: col, ...d.data() }));
        loaded++;
        if (loaded === COMP_COLS.length) { setCompletedBookings(all); setLoading(false); }
      }).catch(() => { loaded++; if (loaded === COMP_COLS.length) setLoading(false); });
    });

    return () => { u1(); u2(); u3(); };
  }, []);

  /* ── Load assignments per driver ── */
  useEffect(() => {
    if (!drivers.length) return;
    const map = {};
    let loaded = 0;
    drivers.forEach(d => {
      getDocs(collection(db, "driverSchedules", d.id, "assignments"))
        .then(snap => {
          map[d.id] = snap.docs.map(a => ({ id: a.id, ...a.data() }));
          loaded++;
          if (loaded === drivers.length) setAssignments({ ...map });
        }).catch(() => { loaded++; });
    });
  }, [drivers]);

  /* ── Per-driver computed stats ── */
  const driverStats = drivers.map(d => {
    const driverPayrolls  = payrolls.filter(p => p.driverId === d.id);
    const driverAdvances  = advances.filter(a => a.driverId === d.id);
    const driverAssign    = assignments[d.id] || [];
    const completedAssign = driverAssign.filter(a => a.status === "completed");
    const activeAssign    = driverAssign.filter(a => a.status === "active");
    const totalToursCount = completedAssign.length;

    const totalPayroll    = driverPayrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalGross      = driverPayrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
    const totalEPFEmp     = driverPayrolls.reduce((s, p) => s + (p.epfEmployeeAmount || 0), 0);
    const totalEPFEmpR    = driverPayrolls.reduce((s, p) => s + (p.epfEmployerAmount || 0), 0);
    const totalETF        = driverPayrolls.reduce((s, p) => s + (p.etfEmployerAmount || 0), 0);
    const totalAdvances   = driverAdvances.reduce((s, a) => s + (a.amount || 0), 0);
    const pendingAdvances = driverAdvances.filter(a => a.status === "pending_settlement").reduce((s, a) => s + (a.amount || 0), 0);
    const totalCost       = totalPayroll + totalEPFEmpR + totalETF;

    const latestPayroll   = driverPayrolls[0] || null;

    /* Idling: total days minus active assignment days */
    const totalAssignDays = driverAssign.reduce((s, a) => {
      if (!a.startDate || !a.endDate) return s;
      const diff = (new Date(a.endDate) - new Date(a.startDate)) / (1000 * 60 * 60 * 24);
      return s + Math.max(0, Math.ceil(diff));
    }, 0);

    return {
      ...d,
      driverPayrolls, driverAdvances, driverAssign, completedAssign, activeAssign,
      totalToursCount, totalPayroll, totalGross, totalEPFEmp, totalEPFEmpR, totalETF,
      totalAdvances, pendingAdvances, totalCost, latestPayroll, totalAssignDays,
    };
  });

  const sorted = [...driverStats]
    .filter(d => d.callingName?.toLowerCase().includes(search.toLowerCase()) || d.id?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name")       return (a.callingName || "").localeCompare(b.callingName || "");
      if (sortBy === "tours")      return b.totalToursCount - a.totalToursCount;
      if (sortBy === "cost")       return b.totalCost - a.totalCost;
      if (sortBy === "payroll")    return b.totalPayroll - a.totalPayroll;
      return 0;
    });

  /* ── Aggregate KPIs ── */
  const totalNetPaid     = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalEPFAll      = payrolls.reduce((s, p) => s + (p.epfEmployeeAmount || 0) + (p.epfEmployerAmount || 0), 0);
  const totalETFAll      = payrolls.reduce((s, p) => s + (p.etfEmployerAmount || 0), 0);
  const totalAdvAll      = advances.reduce((s, a) => s + (a.amount || 0), 0);
  const pendingAdvAll    = advances.filter(a => a.status === "pending_settlement").reduce((s, a) => s + (a.amount || 0), 0);
  const totalPayrollRecs = payrolls.length;
  const totalCompTours   = Object.values(assignments).reduce((s, arr) => s + arr.filter(a => a.status === "completed").length, 0);

  const KPI = ({ label, value, color, sub }) => (
    <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "16px 18px", flex: 1, minWidth: "130px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: "10px", color: "#7a9ab8", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "4px" }}>{sub}</div>}
    </div>
  );

  return (
    <DriverAndFleetManagement pageTitle="Driver Statistics">
      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Driver Statistics</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>{drivers.length} internal drivers · All-time payroll and performance data</p>
      </div>

      {/* Aggregate KPIs */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        <KPI label="Total Net Paid"       value={fmtMoney(totalNetPaid)}   color="#00276b" sub="To drivers (net)" />
        <KPI label="Total EPF (All)"      value={fmtMoney(totalEPFAll)}    color="#0c447c" sub="Employee + Employer" />
        <KPI label="Total ETF"            value={fmtMoney(totalETFAll)}    color="#085041" sub="Employer only" />
        <KPI label="Advances Issued"      value={fmtMoney(totalAdvAll)}    color="#633806" sub="All time" />
        <KPI label="Pending Advances"     value={fmtMoney(pendingAdvAll)}  color={pendingAdvAll > 0 ? "#8B0000" : "#adc6d8"} sub="Unsettled" />
        <KPI label="Payroll Records"      value={totalPayrollRecs}          color="#27a86e" sub="Processed" />
        <KPI label="Tours Completed"      value={totalCompTours}            color="#7a9ab8" sub="By internal drivers" />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <input
          placeholder="Search driver..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "12px", color: "#00276b", outline: "none" }}
        />
        <select
          value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ fontSize: "12px", padding: "8px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}
        >
          <option value="name">Sort by Name</option>
          <option value="tours">Sort by Tours Completed</option>
          <option value="cost">Sort by Total Cost</option>
          <option value="payroll">Sort by Net Paid</option>
        </select>
        <span style={{ fontSize: "12px", color: "#7a9ab8" }}>{sorted.length} drivers</span>
      </div>

      {loading ? (
        <p style={{ color: "#7a9ab8" }}>Loading...</p>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>🧑‍✈️</div>
          <p>No internal drivers found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sorted.map(d => {
            const isExpanded = expandedId === d.id;
            return (
              <div key={d.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                {/* Status stripe */}
                <div style={{ height: "3px", background: d.activeAssign.length > 0 ? "#27a86e" : "#adc6d8" }} />

                {/* Main row */}
                <div style={{ padding: "14px 18px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                  <img
                    src={d.photo || "/images/default-user.png"}
                    alt=""
                    style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,39,107,0.1)", flexShrink: 0 }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "5px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#00276b" }}>{d.title} {d.callingName}</span>
                      <span style={{ fontSize: "10px", color: "#adc6d8" }}>{d.id}</span>
                      {d.activeAssign.length > 0
                        ? pill("#e1f5ee", "#085041", "On Tour")
                        : pill("rgba(0,39,107,0.05)", "#adc6d8", "Available")}
                    </div>
                    <div style={{ fontSize: "12px", color: "#7a9ab8" }}>{d.mobile} · {d.city || "—"}</div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 20px", textAlign: "center" }}>
                    {[
                      ["Tours",        d.totalToursCount,        "#00276b"],
                      ["Net Paid",     fmtMoney(d.totalPayroll), "#27a86e"],
                      ["Total Cost",   fmtMoney(d.totalCost),    "#8B0000"],
                      ["Advances",     fmtMoney(d.pendingAdvances), d.pendingAdvances > 0 ? "#e24b4a" : "#adc6d8"],
                    ].map(([label, value, color]) => (
                      <div key={label}>
                        <div style={{ fontSize: "9px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>{label}</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color, fontFamily: typeof value === "number" ? "inherit" : "inherit" }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    style={{ background: "rgba(0,39,107,0.05)", border: "none", color: "#7a9ab8", fontSize: "11px", padding: "6px 14px", cursor: "pointer", fontWeight: 700 }}
                  >
                    {isExpanded ? "▲ Hide" : "▼ Details"}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(0,39,107,0.06)", padding: "20px 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>

                      {/* Payroll Summary */}
                      <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                        <SectionHeader title="Payroll Summary" sub={`${d.driverPayrolls.length} records`} />
                        <div style={{ padding: "12px" }}>
                          {[
                            ["Total Gross",       fmtMoney(d.totalGross),   "#27a86e"],
                            ["EPF Employee",      fmtMoney(d.totalEPFEmp),  "#dc3545"],
                            ["EPF Employer",      fmtMoney(d.totalEPFEmpR), "#633806"],
                            ["ETF Employer",      fmtMoney(d.totalETF),     "#633806"],
                            ["Total Net Paid",    fmtMoney(d.totalPayroll), "#00276b"],
                            ["Total Employer Cost", fmtMoney(d.totalEPFEmpR + d.totalETF), "#8B0000"],
                          ].map(([label, value, color]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,39,107,0.04)", fontSize: "12px" }}>
                              <span style={{ color: "#7a9ab8" }}>{label}</span>
                              <span style={{ color, fontWeight: 600 }}>{value}</span>
                            </div>
                          ))}
                          {d.latestPayroll && (
                            <div style={{ marginTop: "8px", fontSize: "11px", color: "#adc6d8" }}>
                              Last payroll: {d.latestPayroll.month} {d.latestPayroll.year}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tour Performance */}
                      <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                        <SectionHeader title="Tour Performance" sub={`${d.totalToursCount} completed`} />
                        <div style={{ padding: "12px" }}>
                          {[
                            ["Completed Tours",  d.completedAssign.length, "#27a86e"],
                            ["Active Tours",     d.activeAssign.length,    "#00276b"],
                            ["Total Assignments",d.driverAssign.length,    "#7a9ab8"],
                            ["Days on Duty",     d.totalAssignDays + " days", "#0c447c"],
                          ].map(([label, value, color]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,39,107,0.04)", fontSize: "12px" }}>
                              <span style={{ color: "#7a9ab8" }}>{label}</span>
                              <span style={{ color, fontWeight: 600 }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Advances */}
                      <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                        <SectionHeader title="Cash Advances" sub={`${d.driverAdvances.length} total`} />
                        <div style={{ padding: "12px" }}>
                          {[
                            ["Total Issued",    fmtMoney(d.totalAdvances),    "#633806"],
                            ["Settled",         fmtMoney(d.totalAdvances - d.pendingAdvances), "#27a86e"],
                            ["Outstanding",     fmtMoney(d.pendingAdvances),  d.pendingAdvances > 0 ? "#e24b4a" : "#adc6d8"],
                          ].map(([label, value, color]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,39,107,0.04)", fontSize: "12px" }}>
                              <span style={{ color: "#7a9ab8" }}>{label}</span>
                              <span style={{ color, fontWeight: 600 }}>{value}</span>
                            </div>
                          ))}

                          {d.driverAdvances.slice(0, 3).map((a, i) => (
                            <div key={a.id} style={{ marginTop: "6px", padding: "6px 8px", background: "rgba(0,39,107,0.02)", border: "1px solid rgba(0,39,107,0.05)", fontSize: "11px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#343a40" }}>{a.reason || "Cash advance"}</span>
                                <span style={{ color: a.status === "settled" ? "#27a86e" : "#633806", fontWeight: 700 }}>{fmtMoney(a.amount)}</span>
                              </div>
                              <div style={{ color: "#adc6d8", marginTop: "2px" }}>{fmtDate(a.createdAt)} · {a.status === "settled" ? "Settled" : "Pending"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Payroll history table */}
                    {d.driverPayrolls.length > 0 && (
                      <div style={{ marginTop: "16px", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                        <SectionHeader title="Payroll History" sub="All processed payslips" />
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "rgba(0,39,107,0.03)" }}>
                                {["Period","Basic","Gross","EPF Emp.","EPF Emp-r","ETF","Net"].map(h => (
                                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {d.driverPayrolls.map((p, i) => (
                                <tr key={p.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.04)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                                  <td style={{ padding: "8px 12px", color: "#7a9ab8" }}>{p.month} {p.year}</td>
                                  <td style={{ padding: "8px 12px" }}>      {fmtMoney(p.basicSalary)}</td>
                                  <td style={{ padding: "8px 12px", color: "#27a86e" }}>{fmtMoney(p.grossSalary)}</td>
                                  <td style={{ padding: "8px 12px", color: "#dc3545" }}>−{fmtMoney(p.epfEmployeeAmount)}</td>
                                  <td style={{ padding: "8px 12px", color: "#633806" }}>{fmtMoney(p.epfEmployerAmount)}</td>
                                  <td style={{ padding: "8px 12px", color: "#633806" }}>{fmtMoney(p.etfEmployerAmount)}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#00276b", fontWeight: 700 }}>{fmtMoney(p.netSalary)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DriverAndFleetManagement>
  );
}