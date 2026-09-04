// src/pages/admin/contentManagement/CarouselManager.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db, storage } from "../../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";
import GeneralConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";
import GeneralDeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";

export default function CarouselManager() {
  const [slides, setSlides] = useState([]);
  const [newSlide, setNewSlide] = useState({ file: null, title: "", subtitle: "" });
  const [uploading, setUploading] = useState(false);

  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchSlides = async () => {
    const q = query(collection(db, "carouselSlides"), orderBy("order"));
    const snap = await getDocs(q);
    setSlides(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { fetchSlides(); }, []);

  const handleAddSlide = () => {
    if (!newSlide.file || !newSlide.title) return alert("Image and Title are required.");
    setShowAddConfirm(true);
  };

  const confirmAddSlide = async () => {
    setModalLoading(true);
    setUploading(true);
    try {
      const storageRef = ref(storage, `carousel/${Date.now()}-${newSlide.file.name}`);
      await uploadBytes(storageRef, newSlide.file);
      const imageUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, "carouselSlides"), {
        imageUrl, title: newSlide.title, subtitle: newSlide.subtitle, order: slides.length,
      });
      setNewSlide({ file: null, title: "", subtitle: "" });
      setShowAddConfirm(false);
      fetchSlides();
    } catch (err) {
      console.error(err); alert("Failed to upload slide.");
    } finally {
      setModalLoading(false); setUploading(false);
    }
  };

  const promptDelete = (id) => { setPendingDelete(id); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setModalLoading(true);
    await deleteDoc(doc(db, "carouselSlides", pendingDelete));
    setModalLoading(false);
    setShowDeleteConfirm(false);
    setPendingDelete(null);
    fetchSlides();
  };

  return (
    <ContentManagement pageTitle="Carousel Manager">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        <div className="cm-page-header">
          <h1 className="cm-page-title">Carousel Manager</h1>
          <p className="cm-page-sub">Control the homepage hero carousel — add, order and remove slides.</p>
        </div>

        {/* Add slide form */}
        <div className="cm-card" style={{ marginBottom: "20px" }}>
          <div className="cm-card-header">
            <span className="cm-card-title"><span>+</span> Add New Slide</span>
          </div>
          <div className="cm-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <div className="cm-form-group">
                  <label className="cm-label">Title *</label>
                  <input className="cm-input" placeholder="Slide title" value={newSlide.title} onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })} />
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">Subtitle</label>
                  <input className="cm-input" placeholder="Slide subtitle" value={newSlide.subtitle} onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="cm-label">Slide Image *</label>
                <div className="cm-upload-area">
                  <div className="cm-upload-area-icon">🖼</div>
                  <div className="cm-upload-area-text">{newSlide.file ? newSlide.file.name : "Click to upload slide image"}</div>
                  <input type="file" accept="image/*" onChange={(e) => setNewSlide({ ...newSlide, file: e.target.files[0] })} />
                </div>
                {newSlide.file && (
                  <img src={URL.createObjectURL(newSlide.file)} alt="preview" style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "8px", marginTop: "8px", border: "1px solid rgba(0,39,107,0.1)" }} />
                )}
              </div>
            </div>
            <button className="cm-btn primary" style={{ marginTop: "12px" }} onClick={handleAddSlide} disabled={uploading}>
              {uploading ? "Uploading..." : "+ Add Slide"}
            </button>
          </div>
        </div>

        {/* Slides list */}
        <div className="cm-card">
          <div className="cm-card-header">
            <span className="cm-card-title"><span>▦</span> Existing Slides</span>
            <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{slides.length} slide{slides.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="cm-card-body">
            {slides.length === 0 && <p style={{ color: "#adc6d8", fontSize: "13px" }}>No slides added yet.</p>}
            <div className="carousel-slides-grid">
              {slides.map((slide, i) => (
                <div key={slide.id} className="carousel-slide-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <img src={slide.imageUrl} alt={slide.title} className="carousel-slide-img" />
                  <div className="carousel-slide-body">
                    <div className="carousel-slide-title">{slide.title}</div>
                    {slide.subtitle && <div className="carousel-slide-sub">{slide.subtitle}</div>}
                    <button className="cm-btn danger sm" style={{ width: "100%" }} onClick={() => promptDelete(slide.id)}>
                      🗑 Remove Slide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GeneralConfirmationModal
        show={showAddConfirm}
        onHide={() => setShowAddConfirm(false)}
        onConfirm={confirmAddSlide}
        loading={modalLoading}
        title="Add Slide"
        message={`Add "${newSlide.title}" as a new carousel slide?`}
        confirmLabel="Add Slide"
      />
      <GeneralDeleteConfirmationModal
        show={showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        loading={modalLoading}
        title="Remove Slide"
        message="Are you sure you want to remove this carousel slide?"
      />
    </ContentManagement>
  );
}