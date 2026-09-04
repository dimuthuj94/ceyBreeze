// src/pages/admin/contentManagement/ManagePrices.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";
import GeneralConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123456";

export default function ManagePrices() {
  const [prices, setPrices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedPrice, setEditedPrice] = useState("");
  const [accommodationTypes, setAccommodationTypes] = useState([]);
  const [loadingAccommodation, setLoadingAccommodation] = useState(true);
  const [newPriceId, setNewPriceId] = useState("");
  const [newPriceValue, setNewPriceValue] = useState("");
  const [inclusions, setInclusions] = useState([]);
  const [newInclusion, setNewInclusion] = useState("");
  const [editingInclusionIndex, setEditingInclusionIndex] = useState(null);
  const [editedInclusion, setEditedInclusion] = useState("");
  const [loadingInclusions, setLoadingInclusions] = useState(true);

  // Modal state
  const [showSaveAccomm, setShowSaveAccomm] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
      .then(() => { fetchPrices(); fetchAccommodationPrices(); fetchInclusions(); })
      .catch((err) => console.error("Admin login failed:", err));
  }, []);

  const fetchPrices = async () => {
    const snap = await getDocs(collection(db, "prices"));
    setPrices(snap.docs.filter((d) => d.id !== "Accommodation").map((d) => ({ id: d.id, ...d.data() })));
  };

  const handleUpdatePrice = async (id) => {
    if (!editedPrice) return alert("Enter a valid price.");
    await setDoc(doc(db, "prices", id), { price: Number(editedPrice) }, { merge: true });
    setEditingId(null); setEditedPrice(""); fetchPrices();
  };

  const handleAddGeneralPrice = async () => {
    if (!newPriceId.trim() || !newPriceValue) return alert("Enter both name and price.");
    await setDoc(doc(db, "prices", newPriceId), { price: Number(newPriceValue) });
    setNewPriceId(""); setNewPriceValue(""); fetchPrices();
  };

  const fetchAccommodationPrices = async () => {
    setLoadingAccommodation(true);
    const snap = await getDoc(doc(db, "prices", "Accommodation"));
    setAccommodationTypes(snap.exists() && snap.data().types?.length ? snap.data().types : [{ name: "", price: "" }]);
    setLoadingAccommodation(false);
  };

  const confirmSaveAccommodation = async () => {
    for (const t of accommodationTypes) {
      if (!t.name.trim() || !t.price) return alert("Enter name and price for all types.");
    }
    setModalLoading(true);
    await setDoc(doc(db, "prices", "Accommodation"), { types: accommodationTypes });
    setShowSaveAccomm(false); setModalLoading(false);
    fetchAccommodationPrices();
  };

  const fetchInclusions = async () => {
    setLoadingInclusions(true);
    try {
      const snap = await getDoc(doc(db, "inclusions", "General Inclusions"));
      setInclusions(snap.exists() ? snap.data().items || [] : []);
    } catch { setInclusions([]); }
    setLoadingInclusions(false);
  };

  const saveInclusions = async (items) => {
    await setDoc(doc(db, "inclusions", "General Inclusions"), { items });
    fetchInclusions();
  };

  const handleAddInclusion = async () => {
    if (!newInclusion.trim()) return;
    await saveInclusions([...inclusions, newInclusion.trim()]);
    setNewInclusion("");
  };

  const handleEditInclusion = async (idx) => {
    if (!editedInclusion.trim()) return;
    const u = [...inclusions]; u[idx] = editedInclusion.trim();
    await saveInclusions(u); setEditingInclusionIndex(null); setEditedInclusion("");
  };

  const handleRemoveInclusion = async (idx) => {
    await saveInclusions(inclusions.filter((_, i) => i !== idx));
  };

  return (
    <ContentManagement pageTitle="Prices & Inclusions">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        <div className="cm-page-header">
          <h1 className="cm-page-title">Prices &amp; Inclusions</h1>
          <p className="cm-page-sub">Manage general pricing, accommodation tiers and tour inclusions.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

          {/* General Prices */}
          <div className="cm-card">
            <div className="cm-card-header">
              <span className="cm-card-title"><span>◇</span> General Prices</span>
              <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{prices.length} items</span>
            </div>
            <div className="cm-card-body">
              {prices.length === 0 && <p style={{ color: "#adc6d8", fontSize: "13px" }}>No price items.</p>}
              {prices.map((p) => (
                <div key={p.id} className="mp-price-row">
                  <span className="mp-price-name">{p.id}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {editingId === p.id ? (
                      <>
                        <input type="number" className="cm-input" style={{ width: "90px" }} value={editedPrice} onChange={(e) => setEditedPrice(e.target.value)} />
                        <button className="cm-btn success sm" onClick={() => handleUpdatePrice(p.id)}>✓</button>
                        <button className="cm-btn outline sm" onClick={() => setEditingId(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <span className="mp-price-val">${p.price}</span>
                        <button className="cm-btn warn sm" onClick={() => { setEditingId(p.id); setEditedPrice(p.price); }}>✏</button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(0,39,107,0.06)" }}>
                <label className="cm-label">Add Price Item</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px" }}>
                  <input className="cm-input" placeholder="Name" value={newPriceId} onChange={(e) => setNewPriceId(e.target.value)} />
                  <input type="number" className="cm-input" placeholder="Price" value={newPriceValue} onChange={(e) => setNewPriceValue(e.target.value)} />
                  <button className="cm-btn primary" onClick={handleAddGeneralPrice} style={{ whiteSpace: "nowrap" }}>+ Add</button>
                </div>
              </div>
            </div>
          </div>

          {/* Accommodation Prices */}
          <div className="cm-card">
            <div className="cm-card-header">
              <span className="cm-card-title"><span>◈</span> Accommodation Prices</span>
            </div>
            <div className="cm-card-body">
              {loadingAccommodation ? <p style={{ color: "#adc6d8", fontSize: "13px" }}>Loading...</p> : (
                <>
                  {accommodationTypes.map((type, idx) => (
                    <div key={idx} className="mp-acc-row">
                      <input className="cm-input" placeholder="Type name" value={type.name} onChange={(e) => { const t = [...accommodationTypes]; t[idx].name = e.target.value; setAccommodationTypes(t); }} />
                      <input type="number" className="cm-input" placeholder="Price" value={type.price} onChange={(e) => { const t = [...accommodationTypes]; t[idx].price = e.target.value; setAccommodationTypes(t); }} />
                      <button className="cm-btn danger sm" onClick={() => setAccommodationTypes(accommodationTypes.filter((_, i) => i !== idx))}>🗑</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button className="cm-btn outline sm" onClick={() => setAccommodationTypes([...accommodationTypes, { name: "", price: "" }])}>+ Add Type</button>
                    <button className="cm-btn success sm" onClick={() => setShowSaveAccomm(true)}>✓ Save All</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inclusions */}
        <div className="cm-card">
          <div className="cm-card-header">
            <span className="cm-card-title"><span>◆</span> Tour Inclusions</span>
            <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{inclusions.length} items</span>
          </div>
          <div className="cm-card-body">
            {loadingInclusions ? <p style={{ color: "#adc6d8", fontSize: "13px" }}>Loading...</p> : (
              <>
                {inclusions.length === 0 && <p style={{ color: "#adc6d8", fontSize: "13px" }}>No inclusions yet.</p>}
                {inclusions.map((item, idx) => (
                  <div key={idx} className="mp-inclusion-row">
                    <div className="mp-inclusion-dot" />
                    {editingInclusionIndex === idx ? (
                      <>
                        <input className="cm-input" style={{ flex: 1 }} value={editedInclusion} onChange={(e) => setEditedInclusion(e.target.value)} />
                        <button className="cm-btn success sm" onClick={() => handleEditInclusion(idx)}>✓</button>
                        <button className="cm-btn outline sm" onClick={() => setEditingInclusionIndex(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <span className="mp-inclusion-text">{item}</span>
                        <button className="cm-btn warn sm" onClick={() => { setEditingInclusionIndex(idx); setEditedInclusion(item); }}>✏</button>
                        <button className="cm-btn danger sm" onClick={() => handleRemoveInclusion(idx)}>🗑</button>
                      </>
                    )}
                  </div>
                ))}
                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <input className="cm-input" placeholder="Add new inclusion..." value={newInclusion} onChange={(e) => setNewInclusion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddInclusion()} />
                  <button className="cm-btn primary" onClick={handleAddInclusion}>+ Add</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <GeneralConfirmationModal
        show={showSaveAccomm}
        onHide={() => setShowSaveAccomm(false)}
        onConfirm={confirmSaveAccommodation}
        loading={modalLoading}
        title="Save Accommodation Prices"
        message="Save all accommodation price types to Firestore?"
        confirmLabel="Save"
      />
    </ContentManagement>
  );
}