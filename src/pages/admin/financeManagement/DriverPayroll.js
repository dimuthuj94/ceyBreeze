// src/pages/admin/financeManagement/DriverPayroll.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, getDocs, updateDoc,
  doc, getDoc, setDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import ViewPayrollModal from "../../../components/modals/adminModals/driverAndFleetManagementModals/ViewPayrollModal";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const btnStyle = (bg, color, disabled = false) => ({
  background: disabled ? "rgba(0,39,107,0.06)" : bg, color: disabled ? "#adc6d8" : color,
  border: "none", fontSize: "11px", padding: "7px 14px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
});
const fl = { fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" };
const fi = { width: "100%", padding: "10px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", outline: "none", background: "#fff", boxSizing: "border-box" };

/* ── Default EPF/ETF rates ── */
const DEFAULT_SETTINGS = { epfEmployeeRate: 8, epfEmployerRate: 12, etfEmployerRate: 3 };

/* ── Payroll calculation ── */
const calcPayroll = (f, settings) => {
  const basic           = parseFloat(f.basicSalary) || 0;
  const overtimePay     = parseFloat(f.overtimePay) || 0;
  const tripAllowance   = parseFloat(f.tripAllowance) || 0;
  const fuelReimb       = parseFloat(f.fuelReimbursement) || 0;
  const bonuses         = parseFloat(f.bonuses) || 0;
  const advancesDeducted= parseFloat(f.advancesDeducted) || 0;

  const totalAdditions      = (f.additions || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const totalCustomDeductions = (f.customDeductions || []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

  const epfEmpRate  = parseFloat(f.epfEmployeeRate  ?? settings?.epfEmployeeRate  ?? DEFAULT_SETTINGS.epfEmployeeRate);
  const epfErpRate  = parseFloat(f.epfEmployerRate  ?? settings?.epfEmployerRate  ?? DEFAULT_SETTINGS.epfEmployerRate);
  const etfErpRate  = parseFloat(f.etfEmployerRate  ?? settings?.etfEmployerRate  ?? DEFAULT_SETTINGS.etfEmployerRate);

  const epfEmployee  = basic * epfEmpRate  / 100;
  const epfEmployer  = basic * epfErpRate  / 100;
  const etfEmployer  = basic * etfErpRate  / 100;

  const gross           = basic + overtimePay + tripAllowance + fuelReimb + bonuses + totalAdditions;
  const totalDeductions = epfEmployee + advancesDeducted + totalCustomDeductions;
  const netSalary       = gross - totalDeductions;
  const totalEmployerContributions = epfEmployer + etfEmployer;

  return {
    gross, totalAdditions, epfEmployee, epfEmployer, etfEmployer,
    advancesDeducted, totalCustomDeductions, totalDeductions,
    netSalary, totalEmployerContributions,
    epfEmployeeRate: epfEmpRate, epfEmployerRate: epfErpRate, etfEmployerRate: etfErpRate,
  };
};

/* ── Dynamic list editor (additions / deductions) ── */
function DynamicListEditor({ label, items, onChange, color = "#00276b" }) {
  const add    = () => onChange([...(items || []), { name: "", amount: "" }]);
  const remove = (i) => { const a = [...items]; a.splice(i, 1); onChange(a); };
  const update = (i, key, val) => { const a = [...items]; a[i] = { ...a[i], [key]: val }; onChange(a); };

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <label style={{ ...fl, marginBottom: 0 }}>{label}</label>
        <button onClick={add} style={{ background: color, color: "#fff", border: "none", padding: "3px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>
          + Add
        </button>
      </div>
      {(items || []).length === 0 && (
        <div style={{ fontSize: "11px", color: "#adc6d8", padding: "6px 0" }}>No items added.</div>
      )}
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
          <input
            style={{ ...fi, flex: 2 }}
            placeholder="Description (e.g. Housing Allowance)"
            value={item.name}
            onChange={e => update(i, "name", e.target.value)}
          />
          <input
            type="number"
            style={{ ...fi, flex: 1 }}
            placeholder="Amount"
            value={item.amount}
            onChange={e => update(i, "amount", e.target.value)}
          />
          <button
            onClick={() => remove(i)}
            style={{ background: "#fcebeb", color: "#791f1f", border: "none", padding: "4px 10px", cursor: "pointer", fontWeight: 700, fontSize: "13px", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default function DriverPayroll() {
  const [payrolls,    setPayrolls]    = useState([]);
  const [advances,    setAdvances]    = useState([]);
  const [drivers,     setDrivers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("payroll");
  const [showForm,    setShowForm]    = useState(false);
  const [showAdvForm, setShowAdvForm] = useState(false);
  const [showSettings,setShowSettings]= useState(false);
  const [saving,      setSaving]      = useState(false);
  const [settings,    setSettings]    = useState(DEFAULT_SETTINGS);
  const [settingsForm,setSettingsForm]= useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [viewPayroll, setViewPayroll] = useState(null); // payroll record for modal

  const now = new Date();

  const [form, setForm] = useState({
    driverId: "", driverName: "", month: MONTHS[now.getMonth()], year: now.getFullYear(),
    basicSalary: "", overtimePay: "", tripAllowance: "", fuelReimbursement: "",
    bonuses: "", advancesDeducted: "",
    additions: [], customDeductions: [],
    epfEmployeeRate: DEFAULT_SETTINGS.epfEmployeeRate,
    epfEmployerRate: DEFAULT_SETTINGS.epfEmployerRate,
    etfEmployerRate: DEFAULT_SETTINGS.etfEmployerRate,
    notes: "",
  });

  const [advForm, setAdvForm] = useState({
    driverId: "", driverName: "", amount: "", reason: "",
    date: now.toISOString().split("T")[0], status: "pending_settlement",
  });

  /* ── Load data ── */
  useEffect(() => {
    /* Load EPF/ETF settings */
    getDoc(doc(db, "financePayrollSettings", "global")).then(snap => {
      if (snap.exists()) {
        const s = snap.data();
        const loaded = {
          epfEmployeeRate: s.epfEmployeeRate ?? DEFAULT_SETTINGS.epfEmployeeRate,
          epfEmployerRate: s.epfEmployerRate ?? DEFAULT_SETTINGS.epfEmployerRate,
          etfEmployerRate: s.etfEmployerRate ?? DEFAULT_SETTINGS.etfEmployerRate,
        };
        setSettings(loaded);
        setSettingsForm(loaded);
        setForm(p => ({ ...p, ...loaded }));
      }
    }).catch(() => {});

    getDocs(collection(db, "drivers")).then(snap =>
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const u1 = onSnapshot(
      query(collection(db, "financeDriverPayroll"), orderBy("createdAt", "desc")),
      snap => { setPayrolls(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    const u2 = onSnapshot(
      query(collection(db, "financeDriverAdvances"), orderBy("createdAt", "desc")),
      snap => setAdvances(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, []);

  /* ── Save EPF/ETF settings ── */
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "financePayrollSettings", "global"), {
        epfEmployeeRate: parseFloat(settingsForm.epfEmployeeRate) || 8,
        epfEmployerRate: parseFloat(settingsForm.epfEmployerRate) || 12,
        etfEmployerRate: parseFloat(settingsForm.etfEmployerRate) || 3,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      const saved = {
        epfEmployeeRate: parseFloat(settingsForm.epfEmployeeRate) || 8,
        epfEmployerRate: parseFloat(settingsForm.epfEmployerRate) || 12,
        etfEmployerRate: parseFloat(settingsForm.etfEmployerRate) || 3,
      };
      setSettings(saved);
      setForm(p => ({ ...p, ...saved }));
      setShowSettings(false);
      alert("Payroll settings saved.");
    } catch (e) { alert(e.message); }
    finally { setSavingSettings(false); }
  };

  /* ── Save payroll ── */
  const handleSavePayroll = async () => {
    if (!form.driverName || !form.basicSalary) { alert("Driver name and basic salary required."); return; }
    setSaving(true);
    try {
      const calc = calcPayroll(form, settings);
      const record = {
        driverId:          form.driverId,
        driverName:        form.driverName,
        month:             form.month,
        year:              parseInt(form.year),
        basicSalary:       parseFloat(form.basicSalary) || 0,
        overtimePay:       parseFloat(form.overtimePay) || 0,
        tripAllowance:     parseFloat(form.tripAllowance) || 0,
        fuelReimbursement: parseFloat(form.fuelReimbursement) || 0,
        bonuses:           parseFloat(form.bonuses) || 0,
        advancesDeducted:  parseFloat(form.advancesDeducted) || 0,
        additions:         form.additions.filter(a => a.name && a.amount),
        customDeductions:  form.customDeductions.filter(d => d.name && d.amount),
        /* Calculated */
        totalAdditions:    calc.totalAdditions,
        grossSalary:       calc.gross,
        epfEmployeeRate:   calc.epfEmployeeRate,
        epfEmployeeAmount: calc.epfEmployee,
        epfEmployerRate:   calc.epfEmployerRate,
        epfEmployerAmount: calc.epfEmployer,
        etfEmployerRate:   calc.etfEmployerRate,
        etfEmployerAmount: calc.etfEmployer,
        totalCustomDeductions: calc.totalCustomDeductions,
        totalDeductions:   calc.totalDeductions,
        netSalary:         calc.netSalary,
        totalEmployerContributions: calc.totalEmployerContributions,
        notes:             form.notes,
        status:            "processed",
        createdAt:         serverTimestamp(),
        createdBy:         "admin",
      };

      await addDoc(collection(db, "financeDriverPayroll"), record);
      await addDoc(collection(db, "financeExpenses"), {
        category:    "Driver Payment (Internal)",
        description: `Payroll — ${form.driverName} (${form.month} ${form.year})`,
        amount:      calc.netSalary,
        amountLKR:   0,
        date:        new Date().toISOString().split("T")[0],
        paymentMethod: "Bank Transfer",
        createdAt:   serverTimestamp(), createdBy: "admin",
      });
      await addDoc(collection(db, "financeAuditLog"), {
        action: "PAYROLL_PROCESSED", entity: "financeDriverPayroll",
        data: { driverName: form.driverName, month: form.month, year: form.year, netSalary: calc.netSalary },
        performedBy: "admin", performedAt: serverTimestamp(),
      });

      setShowForm(false);
      setForm(p => ({
        ...p, driverId: "", driverName: "", basicSalary: "", overtimePay: "",
        tripAllowance: "", fuelReimbursement: "", bonuses: "", advancesDeducted: "",
        additions: [], customDeductions: [], notes: "",
      }));
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleSaveAdvance = async () => {
    if (!advForm.driverName || !advForm.amount) { alert("Driver name and amount required."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "financeDriverAdvances"), {
        ...advForm, amount: parseFloat(advForm.amount) || 0,
        createdAt: serverTimestamp(), createdBy: "admin",
      });
      setShowAdvForm(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const settleAdvance = async (adv) => {
    await updateDoc(doc(db, "financeDriverAdvances", adv.id), { status: "settled", settledAt: serverTimestamp() });
  };

  const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const fmtDate  = (ts) => { if (!ts) return "—"; const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

  const pendingAdvTotal = advances.filter(a => a.status === "pending_settlement").reduce((s, a) => s + (a.amount || 0), 0);

  /* Live preview */
  const preview = calcPayroll(form, settings);

  const tabStyle = (t) => ({
    padding: "8px 20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
    border: "none", background: tab === t ? "#00276b" : "transparent",
    color: tab === t ? "#fff" : "#7a9ab8", borderRadius: "6px", transition: "all 0.2s",
  });

  return (
    <FinanceReportsAndStatistics pageTitle="Driver Payroll">

      {/* View Payroll Modal */}
      <ViewPayrollModal
        show={!!viewPayroll}
        onHide={() => setViewPayroll(null)}
        payroll={viewPayroll}
        allPayrolls={payrolls}
      />

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Driver Payroll & Advances</h3>
          <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
            Internal drivers · {payrolls.length} payroll records ·{" "}
            <strong style={{ color: "#8B0000" }}>Unsettled advances: {fmtMoney(pendingAdvTotal)}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => { setShowSettings(!showSettings); setShowForm(false); setShowAdvForm(false); }}>
            ⚙ EPF/ETF Rates
          </button>
          <button style={btnStyle("#00276b", "#fff")} onClick={() => { setShowForm(!showForm); setShowAdvForm(false); setShowSettings(false); }}>
            {showForm ? "✕ Cancel" : "+ Process Payroll"}
          </button>
          <button style={btnStyle("#633806", "#faeeda")} onClick={() => { setShowAdvForm(!showAdvForm); setShowForm(false); setShowSettings(false); }}>
            {showAdvForm ? "✕ Cancel" : "+ Cash Advance"}
          </button>
        </div>
      </div>

      {/* ── EPF/ETF Settings Panel ── */}
      {showSettings && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "22px", marginBottom: "24px" }}>
          <div style={{ background: "#00276b", margin: "-22px -22px 20px", padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Statutory Contribution Rates
            </span>
            <span style={{ fontSize: "11px", color: "rgba(168,237,255,0.5)" }}>Government rates — update when policies change</span>
          </div>
          <div style={{ background: "#fffbf0", border: "1px solid rgba(253,174,0,0.25)", padding: "10px 14px", marginBottom: "18px", fontSize: "12px", color: "#633806" }}>
            ⚠ Changing these rates affects future payroll calculations only. Historical payrolls are not affected.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            {[
              { label: "EPF Employee Rate (%)", key: "epfEmployeeRate", sub: "Deducted from employee salary" },
              { label: "EPF Employer Rate (%)", key: "epfEmployerRate", sub: "Employer cost — not deducted from salary" },
              { label: "ETF Employer Rate (%)", key: "etfEmployerRate", sub: "Employer cost — not deducted from salary" },
            ].map(({ label, key, sub }) => (
              <div key={key}>
                <label style={fl}>{label}</label>
                <input
                  type="number" style={fi}
                  value={settingsForm[key]}
                  onChange={e => setSettingsForm(p => ({ ...p, [key]: e.target.value }))}
                  step="0.01" min="0" max="100"
                />
                <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "4px" }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px", background: "rgba(0,39,107,0.02)", border: "1px solid rgba(0,39,107,0.06)", padding: "12px 14px", display: "flex", gap: "24px" }}>
            <div style={{ fontSize: "12px", color: "#7a9ab8" }}>
              For a basic salary of <strong>$1,000</strong>:
              Employee takes home: <strong style={{ color: "#00276b" }}>${1000 - (1000 * (parseFloat(settingsForm.epfEmployeeRate) || 0) / 100)}</strong> (after EPF deduction)
            </div>
            <div style={{ fontSize: "12px", color: "#7a9ab8" }}>
              Employer pays extra: <strong style={{ color: "#8B0000" }}>${((1000 * (parseFloat(settingsForm.epfEmployerRate) || 0) / 100) + (1000 * (parseFloat(settingsForm.etfEmployerRate) || 0) / 100)).toFixed(2)}</strong> (EPF + ETF)
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => { setSettingsForm(settings); setShowSettings(false); }}>Cancel</button>
            <button style={btnStyle("#00276b", "#fff")} onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Rates"}
            </button>
          </div>
        </div>
      )}

      {/* ── Payroll Form ── */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "22px", marginBottom: "24px" }}>
          <div style={{ background: "#00276b", margin: "-22px -22px 20px", padding: "13px 20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>Process Payroll</span>
          </div>

          {/* Driver + Period */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "18px" }}>
            <div>
              <label style={fl}>Driver *</label>
              <select style={fi} value={form.driverId} onChange={e => {
                const d = drivers.find(d => d.id === e.target.value);
                setForm(p => ({ ...p, driverId: e.target.value, driverName: d ? (d.callingName || d.name || d.id) : "" }));
              }}>
                <option value="">Select driver...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.callingName || d.name || d.id}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Month *</label>
              <select style={fi} value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Year *</label>
              <input type="number" style={fi} value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
            </div>
          </div>

          {/* Earnings */}
          <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden", marginBottom: "18px" }}>
            <div style={{ background: "rgba(0,39,107,0.04)", padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: "#00276b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Earnings
            </div>
            <div style={{ padding: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                {[
                  { label: "Basic Salary ($) *", key: "basicSalary" },
                  { label: "Overtime Pay ($)",   key: "overtimePay" },
                  { label: "Trip Allowance ($)",  key: "tripAllowance" },
                  { label: "Fuel Reimbursement ($)", key: "fuelReimbursement" },
                  { label: "Bonuses ($)",         key: "bonuses" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={fl}>{label}</label>
                    <input type="number" style={fi} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <DynamicListEditor
                label="Custom Additions"
                items={form.additions}
                onChange={additions => setForm(p => ({ ...p, additions }))}
                color="#00276b"
              />
            </div>
          </div>

          {/* Deductions */}
          <div style={{ border: "1px solid rgba(220,53,69,0.15)", overflow: "hidden", marginBottom: "18px" }}>
            <div style={{ background: "rgba(220,53,69,0.04)", padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: "#8B0000", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Deductions
            </div>
            <div style={{ padding: "14px" }}>
              {/* EPF/ETF rates for this payroll */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px", padding: "12px 14px", background: "#fffbf0", border: "1px solid rgba(253,174,0,0.25)" }}>
                {[
                  { label: "EPF Employee Rate (%)", key: "epfEmployeeRate", sub: "Deducted from salary" },
                  { label: "EPF Employer Rate (%)", key: "epfEmployerRate", sub: "Employer contribution" },
                  { label: "ETF Employer Rate (%)", key: "etfEmployerRate", sub: "Employer contribution" },
                ].map(({ label, key, sub }) => (
                  <div key={key}>
                    <label style={{ ...fl, color: "#633806" }}>{label}</label>
                    <input
                      type="number" style={{ ...fi, borderColor: "#fac775", color: "#633806", background: "#fffdf7" }}
                      value={form[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      step="0.01"
                    />
                    <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "3px" }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={fl}>Cash Advance Deduction ($)</label>
                  <input type="number" style={fi} value={form.advancesDeducted} onChange={e => setForm(p => ({ ...p, advancesDeducted: e.target.value }))} />
                </div>
              </div>
              <DynamicListEditor
                label="Custom Deductions"
                items={form.customDeductions}
                onChange={customDeductions => setForm(p => ({ ...p, customDeductions }))}
                color="#8B0000"
              />
            </div>
          </div>

          {/* Live calculation preview */}
          {form.basicSalary && (
            <div style={{ border: "1px solid rgba(0,39,107,0.08)", overflow: "hidden", marginBottom: "18px" }}>
              <div style={{ background: "rgba(0,39,107,0.04)", padding: "8px 14px", fontSize: "11px", fontWeight: 700, color: "#00276b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Calculation Preview
              </div>
              <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", fontSize: "12px" }}>
                {[
                  ["Gross Earnings",       fmtMoney(preview.gross),      "#27a86e"],
                  ["EPF Employee Deduction", `−${fmtMoney(preview.epfEmployee)}`, "#dc3545"],
                  ["Cash Advances",         `−${fmtMoney(preview.advancesDeducted)}`, "#dc3545"],
                  ["Custom Deductions",     `−${fmtMoney(preview.totalCustomDeductions)}`, "#dc3545"],
                  ["Total Deductions",      fmtMoney(preview.totalDeductions), "#8B0000"],
                  ["NET SALARY",            fmtMoney(preview.netSalary),   "#00276b"],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
                    <span style={{ color: "#7a9ab8", fontWeight: label === "NET SALARY" ? 700 : 400 }}>{label}</span>
                    <span style={{ color, fontWeight: label === "NET SALARY" ? 700 : 500, fontFamily: label === "NET SALARY" ? "'DM Serif Display', serif" : "inherit", fontSize: label === "NET SALARY" ? "16px" : "12px" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fffbf0", padding: "10px 14px", borderTop: "1px solid rgba(253,174,0,0.25)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "12px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#adc6d8" }}>EPF Employer ({preview.epfEmployerRate}%)</div>
                  <div style={{ color: "#633806", fontWeight: 600 }}>{fmtMoney(preview.epfEmployer)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#adc6d8" }}>ETF Employer ({preview.etfEmployerRate}%)</div>
                  <div style={{ color: "#633806", fontWeight: 600 }}>{fmtMoney(preview.etfEmployer)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#adc6d8" }}>Total Employer Cost</div>
                  <div style={{ color: "#8B0000", fontWeight: 700 }}>{fmtMoney(preview.totalEmployerContributions)}</div>
                </div>
                <div style={{ gridColumn: "1 / -1", fontSize: "10px", color: "#adc6d8" }}>
                  ★ EPF Employer + ETF amounts are recorded for compliance but NOT deducted from the employee's salary.
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: "16px" }}>
            <label style={fl}>Notes</label>
            <textarea style={{ ...fi, resize: "vertical", minHeight: "60px" }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => setShowForm(false)}>Cancel</button>
            <button style={btnStyle("#00276b", "#fff", saving)} onClick={handleSavePayroll} disabled={saving}>
              {saving ? "Processing..." : "Process Payroll"}
            </button>
          </div>
        </div>
      )}

      {/* ── Advance Form ── */}
      {showAdvForm && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "22px", marginBottom: "24px" }}>
          <div style={{ background: "#633806", margin: "-22px -22px 20px", padding: "13px 20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#faeeda", letterSpacing: "0.12em", textTransform: "uppercase" }}>Cash Advance</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={fl}>Driver</label>
              <select style={fi} value={advForm.driverId} onChange={e => {
                const d = drivers.find(d => d.id === e.target.value);
                setAdvForm(p => ({ ...p, driverId: e.target.value, driverName: d ? (d.callingName || d.name || d.id) : "" }));
              }}>
                <option value="">Select driver...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.callingName || d.name || d.id}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Amount ($)</label>
              <input type="number" style={fi} value={advForm.amount} onChange={e => setAdvForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label style={fl}>Date</label>
              <input type="date" style={fi} value={advForm.date} onChange={e => setAdvForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: "14px" }}>
            <label style={fl}>Reason</label>
            <input type="text" style={fi} value={advForm.reason} onChange={e => setAdvForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for advance..." />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => setShowAdvForm(false)}>Cancel</button>
            <button style={btnStyle("#633806", "#faeeda", saving)} onClick={handleSaveAdvance} disabled={saving}>{saving ? "Saving..." : "Record Advance"}</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "rgba(0,39,107,0.04)", borderRadius: "8px", padding: "4px", marginBottom: "20px", width: "fit-content" }}>
        <button style={tabStyle("payroll")} onClick={() => setTab("payroll")}>Payroll Records ({payrolls.length})</button>
        <button style={tabStyle("advances")} onClick={() => setTab("advances")}>
          Cash Advances ({advances.length})
          {advances.filter(a => a.status === "pending_settlement").length > 0 && (
            <span style={{ background: "#e24b4a", color: "#fff", borderRadius: "10px", fontSize: "10px", padding: "1px 6px", marginLeft: "6px" }}>
              {advances.filter(a => a.status === "pending_settlement").length}
            </span>
          )}
        </button>
      </div>

      {/* ── Payroll Table ── */}
      {tab === "payroll" && (
        loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : payrolls.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}><p>No payroll records yet.</p></div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                  {["Driver","Period","Basic","Gross","EPF Emp.","EPF Emp-r","ETF","Net Salary","Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrolls.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                    <td style={{ padding: "10px 12px", color: "#00276b", fontWeight: 500 }}>{r.driverName}</td>
                    <td style={{ padding: "10px 12px", color: "#7a9ab8" }}>{r.month} {r.year}</td>
                    <td style={{ padding: "10px 12px" }}>{fmtMoney(r.basicSalary)}</td>
                    <td style={{ padding: "10px 12px", color: "#27a86e" }}>{fmtMoney(r.grossSalary)}</td>
                    <td style={{ padding: "10px 12px", color: "#dc3545" }}>−{fmtMoney(r.epfEmployeeAmount)} <span style={{ fontSize: "10px", color: "#adc6d8" }}>({r.epfEmployeeRate}%)</span></td>
                    <td style={{ padding: "10px 12px", color: "#633806" }}>{fmtMoney(r.epfEmployerAmount)} <span style={{ fontSize: "10px", color: "#adc6d8" }}>({r.epfEmployerRate}%)</span></td>
                    <td style={{ padding: "10px 12px", color: "#633806" }}>{fmtMoney(r.etfEmployerAmount)} <span style={{ fontSize: "10px", color: "#adc6d8" }}>({r.etfEmployerRate}%)</span></td>
                    <td style={{ padding: "10px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#00276b", fontWeight: 700 }}>{fmtMoney(r.netSalary)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={() => setViewPayroll(r)}
                        style={{ background: "#e6f1fb", color: "#0c447c", border: "none", fontSize: "10px", padding: "4px 10px", cursor: "pointer", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
                      >
                        View Payroll
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Advances Table ── */}
      {tab === "advances" && (
        advances.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}><p>No cash advances recorded.</p></div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                  {["Date","Driver","Amount","Reason","Status","Action"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
                    <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{fmtDate(a.createdAt)}</td>
                    <td style={{ padding: "10px 14px", color: "#00276b", fontWeight: 500 }}>{a.driverName}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#633806" }}>{fmtMoney(a.amount)}</td>
                    <td style={{ padding: "10px 14px", color: "#343a40" }}>{a.reason || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", background: a.status === "settled" ? "#e1f5ee" : "#faeeda", color: a.status === "settled" ? "#085041" : "#633806" }}>
                        {a.status === "settled" ? "Settled" : "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {a.status !== "settled" && (
                        <button onClick={() => settleAdvance(a)} style={{ background: "#e1f5ee", color: "#085041", border: "none", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>
                          Mark Settled
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </FinanceReportsAndStatistics>
  );
}