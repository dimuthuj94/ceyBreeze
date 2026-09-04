// src/pages/admin/contentManagement/TourManagement.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db, auth, storage } from "../../../firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { signInWithEmailAndPassword } from "firebase/auth";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";
import GeneralConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";
import GeneralDeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123456";

export default function TourManagement() {
  const [cities, setCities] = useState([]);
  const [tours, setTours] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newTour, setNewTour] = useState({ title: "", description: "", nights: 1, price: "", dailyPlan: [], imageFile: null, imageUrl: "", imagePath: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // Modal state
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      await signInAdminOnce();
      await fetchCities();
      await fetchTours();
    };
    init();
  }, []);

  const signInAdminOnce = async () => {
    if (auth.currentUser?.email === ADMIN_EMAIL) return;
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  };

  const fetchCities = async () => {
    const snap = await getDocs(collection(db, "citiesAndDestinations"));
    setCities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchTours = async () => {
    const snap = await getDocs(collection(db, "tours"));
    setTours(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "imageFile") {
      const file = files?.[0] ?? null;
      setNewTour((p) => ({ ...p, imageFile: file }));
      setImagePreview(file ? URL.createObjectURL(file) : newTour.imageUrl || null);
      return;
    }
    setNewTour((prev) => ({ ...prev, [name]: value }));
    if (name === "nights") {
      const nights = parseInt(value) || 1;
      setNewTour((prev) => {
        const totalDays = nights + 1;
        const updatedPlan = (prev.dailyPlan || []).slice(0, totalDays);
        while (updatedPlan.length < totalDays) updatedPlan.push({ type: "", city: "" });
        if (totalDays >= 1 && !updatedPlan[0].type) updatedPlan[0].type = "arrival/stay";
        if (totalDays >= 2 && !updatedPlan[totalDays - 1].type) updatedPlan[totalDays - 1].type = "departure/from";
        return { ...prev, dailyPlan: updatedPlan };
      });
    }
  };

  const handleTypeChange = (i, type) => {
    setNewTour((p) => { const u = [...(p.dailyPlan || [])]; u[i] = { ...(u[i] || {}), type }; return { ...p, dailyPlan: u }; });
  };
  const handleCityChange = (i, city) => {
    setNewTour((p) => { const u = [...(p.dailyPlan || [])]; u[i] = { ...(u[i] || {}), city }; return { ...p, dailyPlan: u }; });
  };

  const makeTourId = (title) => title.trim().replace(/\s+/g, "_").toLowerCase();

  const handleSaveTour = async () => {
    if (!newTour.title || !newTour.description || !newTour.price) return alert("Fill in title, description, and price.");
    if (!newTour.imageFile && !newTour.imageUrl) return alert("Please upload a tour image.");
    setShowSaveConfirm(true);
  };

  const confirmSaveTour = async () => {
    setModalLoading(true);
    setUploading(true);
    try {
      const tourId = editingId || makeTourId(newTour.title);
      let imageUrl = newTour.imageUrl;
      let imagePath = newTour.imagePath;

      if (newTour.imageFile) {
        if (imagePath) { try { await deleteObject(ref(storage, imagePath)); } catch {} }
        const path = `tours/${tourId}-${Date.now()}`;
        const imageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(imageRef, newTour.imageFile);
        await new Promise((resolve, reject) => {
          uploadTask.on("state_changed",
            (snap) => setUploadProgressText(`Uploading: ${Math.round((snap.bytesTransferred / snap.totalBytes) * 100)}%`),
            reject,
            async () => { imageUrl = await getDownloadURL(uploadTask.snapshot.ref); imagePath = path; resolve(); }
          );
        });
      }

      await setDoc(doc(db, "tours", tourId), {
        title: newTour.title, description: newTour.description,
        nights: parseInt(newTour.nights), totalDays: newTour.dailyPlan.length,
        price: parseFloat(newTour.price), dailyPlan: newTour.dailyPlan,
        imageUrl, imagePath, updatedAt: new Date(),
      }, { merge: true });

      setShowSaveConfirm(false);
      resetForm();
      fetchTours();
    } catch (err) {
      console.error(err);
      alert("Failed to save tour.");
    } finally {
      setModalLoading(false);
      setUploading(false);
      setUploadProgressText("");
    }
  };

  const handleEdit = (tour) => {
    setEditingId(tour.id);
    setNewTour({ ...tour, imageFile: null });
    setImagePreview(tour.imageUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => resetForm();

  const resetForm = () => {
    setNewTour({ title: "", description: "", nights: 1, price: "", dailyPlan: [], imageFile: null, imageUrl: "", imagePath: "" });
    setEditingId(null);
    setImagePreview(null);
  };

  const promptDelete = (tour) => { setPendingDelete(tour); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setModalLoading(true);
    try {
      await deleteDoc(doc(db, "tours", pendingDelete.id));
      if (pendingDelete.imagePath) { try { await deleteObject(ref(storage, pendingDelete.imagePath)); } catch {} }
      setShowDeleteConfirm(false);
      setPendingDelete(null);
      fetchTours();
    } catch (err) {
      console.error(err);
      alert("Failed to delete tour.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <ContentManagement pageTitle="Tour Management">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        <div className="cm-page-header">
          <h1 className="cm-page-title">Tour Management</h1>
          <p className="cm-page-sub">Add, edit and manage all tours on the CeyBreeze platform.</p>
        </div>

        {/* ── Form ── */}
        <div className="cm-card" style={{ marginBottom: "20px" }}>
          <div className="cm-card-header">
            <span className="cm-card-title">
              <span>{editingId ? "✏" : "+"}</span>
              {editingId ? "Edit Tour" : "Add New Tour"}
            </span>
            {editingId && (
              <button className="cm-btn outline sm" onClick={handleCancelEdit}>✕ Cancel Edit</button>
            )}
          </div>
          <div className="cm-card-body">
            <div className="tm-form-grid">
              {/* Left column */}
              <div>
                <div className="cm-form-group">
                  <label className="cm-label">Tour Title</label>
                  <input className="cm-input" name="title" value={newTour.title} onChange={handleInputChange} placeholder="Enter tour title..." />
                </div>
                <div className="cm-form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="cm-label">Nights</label>
                    <input type="number" className="cm-input" name="nights" value={newTour.nights} onChange={handleInputChange} min="1" />
                  </div>
                  <div>
                    <label className="cm-label">Price ($)</label>
                    <input type="number" className="cm-input" name="price" value={newTour.price} onChange={handleInputChange} placeholder="0.00" />
                  </div>
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">Tour Image</label>
                  <div className="cm-upload-area">
                    <div className="cm-upload-area-icon">🖼</div>
                    <div className="cm-upload-area-text">Click to upload or replace image</div>
                    <input type="file" name="imageFile" accept="image/*" onChange={handleInputChange} />
                  </div>
                  {imagePreview && <img src={imagePreview} alt="preview" className="tm-image-preview" />}
                  {uploadProgressText && <div className="tm-upload-progress">{uploadProgressText}</div>}
                </div>
              </div>

              {/* Right column */}
              <div>
                <div className="cm-form-group">
                  <label className="cm-label">Description</label>
                  <textarea
                    className="cm-input"
                    rows="5"
                    name="description"
                    value={newTour.description}
                    onChange={handleInputChange}
                    placeholder="Tour description..."
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">Daily Plan ({newTour.dailyPlan.length} days)</label>
                  <div style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
                    {newTour.dailyPlan.map((day, i) => (
                      <div key={i} className="tm-daily-plan-row">
                        <span className="tm-day-badge">Day {i + 1}</span>
                        <select value={day.type} onChange={(e) => handleTypeChange(i, e.target.value)} className="tm-select">
                          <option value="">— Type —</option>
                          <option value="arrival/stay">Arrival &amp; Stay</option>
                          <option value="travel/stay">Travel &amp; Stay</option>
                          <option value="visit">Visit</option>
                          <option value="departure/from">Departure</option>
                        </select>
                        <select value={day.city} onChange={(e) => handleCityChange(i, e.target.value)} className="tm-select">
                          <option value="">— City —</option>
                          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button className="cm-btn primary" onClick={handleSaveTour} disabled={uploading}>
                {uploading ? "Saving..." : (editingId ? "✓ Update Tour" : "+ Add Tour")}
              </button>
            </div>
          </div>
        </div>

        {/* ── Tours list ── */}
        <div className="cm-card">
          <div className="cm-card-header">
            <span className="cm-card-title"><span>✈</span> Published Tours</span>
            <span style={{ fontSize: "11px", color: "#7a9ab8", fontWeight: 500 }}>{tours.length} tour{tours.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="cm-card-body" style={{ padding: "0 20px" }}>
            {tours.length === 0 && <p style={{ color: "#adc6d8", fontSize: "13px", padding: "20px 0" }}>No tours found. Add your first tour above.</p>}
            {tours.map((t) => (
              <div key={t.id} className="tm-tour-list-item">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {t.imageUrl && (
                    <img src={t.imageUrl} alt={t.title} style={{ width: "48px", height: "36px", borderRadius: "6px", objectFit: "cover", border: "1px solid rgba(0,39,107,0.08)", flexShrink: 0 }} />
                  )}
                  <div>
                    <div className="tm-tour-name">{t.title}</div>
                    <div className="tm-tour-meta">${t.price} · {t.nights} nights · {t.totalDays} days</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="cm-btn warn sm" onClick={() => handleEdit(t)}>✏ Edit</button>
                  <button className="cm-btn danger sm" onClick={() => promptDelete(t)}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <GeneralConfirmationModal
        show={showSaveConfirm}
        onHide={() => setShowSaveConfirm(false)}
        onConfirm={confirmSaveTour}
        loading={modalLoading}
        title={editingId ? "Update Tour" : "Add Tour"}
        message={`Are you sure you want to ${editingId ? "update" : "add"} the tour "${newTour.title}"?`}
        confirmLabel={editingId ? "Update" : "Add Tour"}
      />
      <GeneralDeleteConfirmationModal
        show={showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        loading={modalLoading}
        title="Delete Tour"
        message={`Are you sure you want to permanently delete "${pendingDelete?.title}"? This cannot be undone.`}
      />
    </ContentManagement>
  );
}