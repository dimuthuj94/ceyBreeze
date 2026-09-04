// src/pages/admin/driverAndFleetManagement/externalDriversAndVehicles/ViewDriver.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../../../firebase";
import ViewDriverModal         from "../../../../components/modals/general/ViewDriverModal";
import EditDriver              from "../../../../components/modals/adminModals/driverAndFleetManagementModals/EditDriver";
import DeleteConfirmationModal from "../../../../components/modals/general/GeneralDeleteConfirmationModal";
import ViewDriverScheduleModal from "../../../../components/modals/adminModals/driverAndFleetManagementModals/ViewDriverScheduleModal";
import ViewPayrollModal        from "../../../../components/modals/adminModals/driverAndFleetManagementModals/ViewPayrollModal";

const Btn = ({ onClick, bg, color, border, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? "rgba(0,39,107,0.04)" : bg,
      color:      disabled ? "#adc6d8" : color,
      border:     `1px solid ${disabled ? "rgba(0,39,107,0.08)" : border}`,
      fontSize: "10px", fontWeight: 700, padding: "5px 10px",
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: "0.04em", textTransform: "uppercase",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </button>
);

export default function ViewDriver({ collection: col, storageFolder }) {
  const [drivers,       setDrivers]       = useState([]);
  const [search,        setSearch]        = useState("");
  const [selected,      setSelected]      = useState(null);
  const [showView,      setShowView]      = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [showSchedule,  setShowSchedule]  = useState(false);
  const [showPayroll,   setShowPayroll]   = useState(false);
  const [latestPayroll, setLatestPayroll] = useState(null);
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, col), snap =>
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [col]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      try { await deleteObject(ref(storage, `${storageFolder}/${selected.id}`)); }
      catch (e) { if (e.code !== "storage/object-not-found") console.warn(e); }
      await deleteDoc(doc(db, col, selected.id));
      setShowDelete(false);
    } catch (e) { alert("Delete failed: " + e.message); }
    finally { setLoading(false); }
  };

  const handleEditSave = async (data) => {
    await updateDoc(doc(db, col, selected.id), data);
    setShowEdit(false);
  };

  const handleViewPayroll = async (d) => {
    setSelected(d);
    try {
      const snap = await getDocs(
        query(collection(db, "financeDriverPayroll"),
          where("driverId", "==", d.id),
          orderBy("createdAt", "desc")
        )
      );
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLatestPayroll(all[0] || null);
    } catch (_) {
      setLatestPayroll(null);
    }
    setShowPayroll(true);
  };

  const filtered = drivers.filter(d =>
    d.callingName?.toLowerCase().includes(search.toLowerCase()) ||
    d.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Search */}
      <div style={{ marginBottom: "14px" }}>
        <input
          placeholder="Search by calling name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "9px 12px",
            border: "1.5px solid rgba(0,39,107,0.15)",
            fontSize: "13px", color: "#00276b",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
        {filtered.map(d => (
          <div key={d.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.08)", overflow: "hidden" }}>

            {/* Photo */}
            <div style={{ position: "relative" }}>
              <img
                src={d.photo || "/images/default-user.png"}
                alt="Driver"
                style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", top: "10px", left: "10px", background: "#faeeda", color: "#633806", fontSize: "9px", fontWeight: 700, padding: "2px 8px", letterSpacing: "0.08em" }}>
                EXTERNAL · {d.id}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#00276b", marginBottom: "8px" }}>
                {d.title} {d.callingName}
              </div>
              {[["Mobile", d.mobile], ["Address", d.address]].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#adc6d8", minWidth: "52px" }}>{label}</span>
                  <span style={{ fontSize: "11px", color: "#495057", lineHeight: 1.4 }}>{value || "—"}</span>
                </div>
              ))}

              <div style={{ borderTop: "1px solid rgba(0,39,107,0.06)", marginTop: "12px", paddingTop: "12px" }}>
                {/* Row 1 */}
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "5px" }}>
                  <Btn onClick={() => { setSelected(d); setShowView(true); }}     bg="#00276b" color="#fff"     border="#00276b">View</Btn>
                  <Btn onClick={() => { setSelected(d); setShowEdit(true); }}     bg="#EFFAFD" color="#00276b" border="rgba(0,39,107,0.2)">Edit</Btn>
                  <Btn onClick={() => { setSelected(d); setShowSchedule(true); }} bg="#EFFAFD" color="#00276b" border="rgba(0,39,107,0.2)">Schedule</Btn>
                  <Btn onClick={() => handleViewPayroll(d)}                        bg="#e1f5ee" color="#085041" border="rgba(39,168,110,0.2)">View Paysheet</Btn>
                </div>
                {/* Row 2 */}
                <div style={{ display: "flex", gap: "5px" }}>
                  <Btn onClick={() => alert("Coming soon")}                        bg="#faeeda" color="#633806" border="rgba(253,174,0,0.3)">Fire</Btn>
                  <Btn onClick={() => { setSelected(d); setShowDelete(true); }}   bg="#fcebeb" color="#791f1f" border="rgba(220,53,69,0.2)">Delete</Btn>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p style={{ color: "#adc6d8", fontSize: "13px" }}>No external drivers found.</p>}
      </div>

      <ViewDriverModal         show={showView}     onHide={() => setShowView(false)}     driver={selected} onDelete={() => { setShowView(false); setShowDelete(true); }} onUploadPhoto={() => {}} />
      <EditDriver              show={showEdit}     onHide={() => setShowEdit(false)}     driver={selected} onSave={handleEditSave} storageFolder={storageFolder} />
      <DeleteConfirmationModal show={showDelete}   onHide={() => setShowDelete(false)}   onConfirm={handleDelete} loading={loading} message={`Delete driver ${selected?.callingName}? This cannot be undone.`} />
      <ViewDriverScheduleModal show={showSchedule} onHide={() => setShowSchedule(false)} driver={selected} driverPool="external" />
      <ViewPayrollModal        show={showPayroll}  onHide={() => setShowPayroll(false)}  payroll={latestPayroll} allPayrolls={[]} />
    </>
  );
}