// src/pages/admin/driverAndFleetManagement/internalDriversAndVehicles/CreateVehicle.js
import React, { useEffect, useState } from "react";
import { collection, doc, setDoc, onSnapshot, getDocs, runTransaction } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../firebase";
import { Button } from "react-bootstrap";
import { SectionBlock, Field, inputStyle } from "../shared/driverVehicleHelpers";

export default function CreateVehicle({ collection: col, storageFolder, idPrefix, counterKey, onCreated }) {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [allExtVehicles, setAllExtVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([null, null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState([null, null, null, null]);
  const [dragActiveIdx, setDragActiveIdx] = useState(null);

  const initial = { vehicleType: "", vehicleMake: "", vehicleModel: "", ownerName: "ceyBreeze", ownerContact: "", manufactureYear: "", registrationNumber: "", minimumSeatCount: "", maximumSeatCount: "" };
  const [form, setForm] = useState(initial);

  useEffect(() => {
    getDocs(collection(db, "vehicles")).then((snap) => setVehicleTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u1 = onSnapshot(collection(db, "vehicleFleet"), (s) => setAllVehicles(s.docs.map((d) => d.data())));
    const u2 = onSnapshot(collection(db, "externalVehicles"), (s) => setAllExtVehicles(s.docs.map((d) => d.data())));
    return () => { u1(); u2(); };
  }, []);

  const allPool = [...allVehicles, ...allExtVehicles];

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleTypeChange = (e) => {
    const sel = vehicleTypes.find((v) => v.id === e.target.value);
    setForm((p) => ({ ...p, vehicleType: e.target.value, minimumSeatCount: sel?.minimumSeatCount ?? "", maximumSeatCount: sel?.maximumSeatCount ?? "" }));
  };

  const handlePhotoSelect = (file, idx) => {
    if (!file) return;
    const pf = [...photoFiles]; pf[idx] = file; setPhotoFiles(pf);
    const reader = new FileReader();
    reader.onloadend = () => { const pp = [...photoPreviews]; pp[idx] = reader.result; setPhotoPreviews(pp); };
    reader.readAsDataURL(file);
  };

  const generateId = async () => {
    const counterRef = doc(db, "counters", counterKey);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const n = snap.exists() ? snap.data().lastId + 1 : 1;
      tx.set(counterRef, { lastId: n }, { merge: true });
      return `${idPrefix}-${String(n).padStart(4, "0")}`;
    });
  };

  const handleCreate = async () => {
    if (!form.vehicleType || !form.vehicleModel || !form.registrationNumber || !form.ownerName) {
      alert("Please fill in all required fields."); return;
    }
    if (allPool.find((v) => v.registrationNumber === form.registrationNumber)) {
      alert("Registration number already exists across all vehicles."); return;
    }
    setLoading(true);
    try {
      const id = await generateId();
      const photoURLs = [];
      for (let i = 0; i < 4; i++) {
        if (photoFiles[i]) {
          const sRef = ref(storage, `${storageFolder}/${id}/photo_${i + 1}`);
          await uploadBytes(sRef, photoFiles[i]);
          photoURLs.push(await getDownloadURL(sRef));
        }
      }
      await setDoc(doc(db, col, id), { ...form, photos: photoURLs, createdAt: new Date() });
      setForm(initial); setPhotoFiles([null, null, null, null]); setPhotoPreviews([null, null, null, null]);
      onCreated?.();
      alert("Vehicle added successfully!");
    } catch (e) { alert("Failed: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0.5rem 0" }}>

      <SectionBlock title="Vehicle Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="Vehicle Type">
              <select name="vehicleType" value={form.vehicleType} onChange={handleTypeChange} style={inputStyle}>
                <option value="">Select type</option>
                {vehicleTypes.map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Vehicle Make"><input name="vehicleMake" value={form.vehicleMake} onChange={handleChange} placeholder="e.g. Toyota" style={inputStyle} /></Field>
          <Field label="Vehicle Model"><input name="vehicleModel" value={form.vehicleModel} onChange={handleChange} placeholder="e.g. HiAce" style={inputStyle} /></Field>
          <Field label="Manufacture Year"><input name="manufactureYear" value={form.manufactureYear} onChange={handleChange} placeholder="e.g. 2019" style={inputStyle} /></Field>
          <Field label="Registration Number"><input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} placeholder="e.g. WP CAB 1234" style={inputStyle} /></Field>
          <Field label="Owner Name"><input name="ownerName" value={form.ownerName} readOnly onChange={handleChange} placeholder="Owner full name" style={inputStyle} /></Field>
          <Field label="Owner Contact No"><input name="ownerContact" value={form.ownerContact} onChange={handleChange} placeholder="e.g. 0771234567" style={inputStyle} /></Field>
          <Field label="Min. Seats"><input value={form.minimumSeatCount} readOnly style={{ ...inputStyle, background: "#f8f9fa" }} placeholder="Auto-filled" /></Field>
          <Field label="Max. Seats"><input value={form.maximumSeatCount} readOnly style={{ ...inputStyle, background: "#f8f9fa" }} placeholder="Auto-filled" /></Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Vehicle Photos (up to 4)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx}>
              <p style={{ fontSize: "11px", color: "#6c757d", margin: "0 0 4px", fontWeight: 500 }}>Photo {idx + 1}{idx === 0 ? " (primary)" : ""}</p>
              <div
                onClick={() => document.getElementById(`createVPhoto-${col}-${idx}`).click()}
                onDrop={(e) => { e.preventDefault(); setDragActiveIdx(null); handlePhotoSelect(e.dataTransfer.files[0], idx); }}
                onDragOver={(e) => { e.preventDefault(); setDragActiveIdx(idx); }}
                onDragLeave={() => setDragActiveIdx(null)}
                style={{ border: `2px dashed ${dragActiveIdx === idx ? "#00276b" : "#dee2e6"}`, borderRadius: "8px", background: dragActiveIdx === idx ? "#f0f4ff" : "#fafafa", cursor: "pointer", height: "110px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "0.15s" }}
              >
                {photoPreviews[idx]
                  ? <img src={photoPreviews[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>Drop or click</p>}
                <input id={`createVPhoto-${col}-${idx}`} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoSelect(e.target.files[0], idx)} />
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button variant="secondary" onClick={() => { setForm(initial); setPhotoFiles([null, null, null, null]); setPhotoPreviews([null, null, null, null]); }}>Reset</Button>
        <Button style={{ background: "#00276b", border: "none" }} onClick={handleCreate} disabled={loading}>{loading ? "Adding..." : "Add Vehicle"}</Button>
      </div>
    </div>
  );
}