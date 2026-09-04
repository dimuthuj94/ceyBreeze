// src/pages/admin/driverAndFleetManagement/externalDriversAndVehicles/CreateDriver.js
import React, { useEffect, useState } from "react";
import { collection, doc, setDoc, updateDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../firebase";
import { Button } from "react-bootstrap";
import { SectionBlock, Field, inputStyle } from "../shared/driverVehicleHelpers";
import ConfirmationModal from "../../../../components/modals/general/GeneralConfirmationModal";

export default function CreateDriver({ collection: col, storageFolder, idPrefix, counterKey, onCreated }) {
  const [allDrivers, setAllDrivers] = useState([]);
  const [allExternalDrivers, setAllExternalDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileKey, setFileKey] = useState(Date.now());

  const initial = {
    title: "", gender: "", fullName: "", callingName: "", birthday: "",
    house: "", street1: "", street2: "", city: "", postalCode: "",
    mobile: "", home: "", nic: "", dl: "", permit: "",
  };
  const [form, setForm] = useState(initial);

  // Load both pools for cross-pool duplicate checking
  useEffect(() => {
    const u1 = onSnapshot(collection(db, "drivers"), (s) => setAllDrivers(s.docs.map((d) => d.data())));
    const u2 = onSnapshot(collection(db, "externalDrivers"), (s) => setAllExternalDrivers(s.docs.map((d) => d.data())));
    return () => { u1(); u2(); };
  }, []);

  const allPool = [...allDrivers, ...allExternalDrivers];

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileSelect = (file) => {
    if (!file) return;
    setForm((prev) => ({ ...prev, photoFile: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const required = ["title", "gender", "fullName", "callingName", "house", "street1", "city", "postalCode", "mobile", "nic", "dl", "permit"];
    for (let k of required) { if (!form[k]) { alert(`${k} is required`); return false; } }
    if (!/^(\d{9}[VXvx]|\d{12})$/.test(form.nic)) { alert("Invalid NIC"); return false; }
    if (!/^0\d{9}$/.test(form.mobile)) { alert("Invalid mobile"); return false; }
    if (allPool.find((d) => d.nic === form.nic)) { alert("NIC already exists across all drivers"); return false; }
    if (allPool.find((d) => d.dl === form.dl)) { alert("Driving License already exists across all drivers"); return false; }
    if (allPool.find((d) => d.permit === form.permit)) { alert("Permit number already exists across all drivers"); return false; }
    if (allPool.find((d) => d.mobile === form.mobile)) { alert("Mobile already exists across all drivers"); return false; }
    return true;
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

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { photoFile, ...clean } = form;
      const id = await generateId();
      await setDoc(doc(db, col, id), {
        ...clean,
        address: `${form.house}, ${form.street1}, ${form.street2}, ${form.city}, ${form.postalCode}`,
      });
      if (photoFile) {
        const sRef = ref(storage, `${storageFolder}/${id}`);
        await uploadBytes(sRef, photoFile);
        await updateDoc(doc(db, col, id), { photo: await getDownloadURL(sRef) });
      }
      setForm(initial); setPreview(null); setFileKey(Date.now());
      setShowConfirm(false);
      onCreated?.();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0.5rem 0" }}>

      <SectionBlock title="Personal Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
          <Field label="Title">
            <select name="title" value={form.title} onChange={handleChange} style={inputStyle}>
              <option value="">Select</option><option>Mr</option><option>Miss</option><option>Mrs</option>
            </select>
          </Field>
          <Field label="Gender">
            <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle}>
              <option value="">Select</option><option>Male</option><option>Female</option>
            </select>
          </Field>
          <Field label="Birthday">
            <input type="date" name="birthday" value={form.birthday} onChange={handleChange} style={inputStyle} />
          </Field>
          <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            <Field label="Full Name"><input name="fullName" value={form.fullName} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Calling Name"><input name="callingName" value={form.callingName} onChange={handleChange} style={inputStyle} /></Field>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="Address Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
          <div style={{ gridColumn: "1/-1" }}><Field label="House No / Name"><input name="house" value={form.house} onChange={handleChange} style={inputStyle} /></Field></div>
          <Field label="Street Line 1"><input name="street1" value={form.street1} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="Street Line 2"><input name="street2" value={form.street2} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="City"><input name="city" value={form.city} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="Postal Code"><input name="postalCode" value={form.postalCode} onChange={handleChange} style={inputStyle} /></Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Contact Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
          <Field label="Mobile Number"><input name="mobile" value={form.mobile} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="Home Number"><input name="home" value={form.home} onChange={handleChange} style={inputStyle} /></Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Identification Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
          <Field label="NIC Number"><input name="nic" value={form.nic} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="Driving License No"><input name="dl" value={form.dl} onChange={handleChange} style={inputStyle} /></Field>
          <Field label="Permit Number"><input name="permit" value={form.permit} onChange={handleChange} style={inputStyle} /></Field>
        </div>
      </SectionBlock>

      <SectionBlock title="Driver Photo">
        <div
          onClick={() => document.getElementById(`driverPhoto-${col}`).click()}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileSelect(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          style={{ border: `2px dashed ${dragActive ? "#00276b" : "#dee2e6"}`, borderRadius: "10px", padding: "28px", textAlign: "center", cursor: "pointer", background: dragActive ? "#f0f4ff" : "#fafafa", transition: "0.15s" }}
        >
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#495057", margin: "0 0 4px" }}>Drag &amp; Drop Photo Here</p>
          <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>or click to browse</p>
          <input key={fileKey} id={`driverPhoto-${col}`} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileSelect(e.target.files[0])} />
        </div>
        {preview && (
          <div style={{ marginTop: "14px", textAlign: "center" }}>
            <img src={preview} alt="Preview" style={{ width: "150px", height: "150px", objectFit: "cover", borderRadius: "10px", border: "3px solid #00276b" }} />
            <p style={{ fontSize: "11px", color: "#adb5bd", marginTop: "6px" }}>{form.photoFile?.name}</p>
          </div>
        )}
      </SectionBlock>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
        <Button variant="secondary" onClick={() => { setForm(initial); setPreview(null); setFileKey(Date.now()); }}>Reset</Button>
        <Button style={{ background: "#00276b", border: "none" }} onClick={() => setShowConfirm(true)}>Add Driver</Button>
      </div>

      <ConfirmationModal show={showConfirm} onHide={() => setShowConfirm(false)} onConfirm={handleSave} loading={loading} />
    </div>
  );
}