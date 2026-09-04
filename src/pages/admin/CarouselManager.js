import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AdminLayout from "../../components/AdminLayout";

export default function CarouselManager() {
  const [slides, setSlides] = useState([]);
  const [newSlide, setNewSlide] = useState({ file: null, title: "", subtitle: "" });
  const [uploading, setUploading] = useState(false);

  const fetchSlides = async () => {
    const q = query(collection(db, "carouselSlides"), orderBy("order"));
    const querySnapshot = await getDocs(q);
    setSlides(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleAddSlide = async () => {
    if (!newSlide.file || !newSlide.title) {
      alert("Image and Title are required");
      return;
    }

    try {
      setUploading(true);
      const storageRef = ref(storage, `carousel/${Date.now()}-${newSlide.file.name}`);
      await uploadBytes(storageRef, newSlide.file);
      const imageUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "carouselSlides"), {
        imageUrl,
        title: newSlide.title,
        subtitle: newSlide.subtitle,
        order: slides.length,
      });

      setNewSlide({ file: null, title: "", subtitle: "" });
      fetchSlides();
    } catch (err) {
      console.error("Error uploading slide:", err);
      alert("Failed to upload slide.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "carouselSlides", id));
    fetchSlides();
  };

  return (
    <AdminLayout>
      <div className="container mt-4">
        <h2 className="mb-4 text-center text-primary">Manage Carousel Slides</h2>

        {/* Add New Slide */}
        <div className="card p-4 mb-5 shadow-sm border-0 bg-light">
          <h5 className="mb-3">Add New Slide</h5>
          <div className="mb-3">
            <input
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(e) => setNewSlide({ ...newSlide, file: e.target.files[0] })}
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Title"
              value={newSlide.title}
              onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Subtitle"
              value={newSlide.subtitle}
              onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
            />
          </div>
          <button
            className="btn btn-success w-100 fw-bold"
            onClick={handleAddSlide}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Add Slide"}
          </button>
        </div>

        {/* Slide List */}
        <div>
          <h5 className="mb-3">Existing Slides</h5>
          <div className="row">
            {slides.map((slide) => (
              <div key={slide.id} className="col-md-4 mb-4">
                <div className="card h-100 shadow-sm border-0 slide-card">
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="card-img-top rounded-top"
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                  <div className="card-body d-flex flex-column">
                    <h6 className="card-title">{slide.title}</h6>
                    <p className="card-text flex-grow-1">{slide.subtitle}</p>
                    <button
                      className="btn btn-danger btn-sm mt-2"
                      onClick={() => handleDelete(slide.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          .slide-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            transition: all 0.3s ease-in-out;
          }
          h2 {
            font-weight: 700;
          }
          .card-body h6 {
            font-weight: 600;
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}
