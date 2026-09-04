// src/pages/Gallery.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ImageModal from "../components/modals/ImageModal";

export default function Gallery() {
  const [images, setImages]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedImage, setSelectedImage] = useState({ imageUrl: "", title: "" });

  useEffect(() => {
    getDocs(collection(db, "gallery"))
      .then(snap => setImages(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: "'Outfit', 'Libre Franklin', sans-serif" }}>

      {/* ── Hero ── */}
      <div className="gl-hero">
        <div className="bn-hero-dots" />
        <div className="gl-hero-content">
          <span className="gl-hero-eyebrow">Visual Stories</span>
          <h1 className="gl-hero-title">Gallery</h1>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="gl-content">

        {loading ? (
          <div className="gl-loading">
            <div style={{ fontSize: "40px", opacity: 0.2, marginBottom: "14px", animation: "res-pulse 2s infinite" }}>◧</div>
            <p>Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <p style={{ color: "#adc6d8", fontSize: "13px", textAlign: "center", paddingTop: "60px" }}>No images found.</p>
        ) : (
          <div className="gl-grid">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="gl-item"
                onClick={() => setSelectedImage({ imageUrl: img.url, title: img.title || "Gallery Image" })}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {img.url && <img src={img.url} alt={img.title || "Gallery"} className="gl-item-img" />}
                <div className="gl-item-overlay">
                  <span className="gl-item-title">{img.title || "View Image"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImageModal
        show={!!selectedImage.imageUrl}
        imageUrl={selectedImage.imageUrl}
        title={selectedImage.title}
        onClose={() => setSelectedImage({ imageUrl: "", title: "" })}
      />
    </div>
  );
}