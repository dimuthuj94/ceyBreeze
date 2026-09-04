import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db, auth, storage } from "../../firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { signInWithEmailAndPassword } from "firebase/auth";
import AdminLayout from "../../components/AdminLayout";
import { FaSave, FaEdit, FaTrash, FaTimes } from "react-icons/fa";

export default function Tours() {
  const [cities, setCities] = useState([]);
  const [tours, setTours] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [newTour, setNewTour] = useState({
    title: "",
    description: "",
    nights: 1,
    price: "",
    dailyPlan: [],
    imageFile: null,
    imageUrl: "",
    imagePath: "",
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const ADMIN_EMAIL = "admin@example.com";
  const ADMIN_PASSWORD = "123456";

  useEffect(() => {
    const init = async () => {
      await signInAdminOnce();
      await fetchCities();
      await fetchTours();
    };
    init();
  }, []);

  const signInAdminOnce = async () => {
    if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) return true;
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    return true;
  };

  const fetchCities = async () => {
    const snapshot = await getDocs(collection(db, "citiesAndDestinations"));
    setCities(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchTours = async () => {
    const snapshot = await getDocs(collection(db, "tours"));
    setTours(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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
        while (updatedPlan.length < totalDays) {
          updatedPlan.push({ type: "", city: "" });
        }
        if (totalDays >= 1 && !updatedPlan[0].type) updatedPlan[0].type = "arrival/stay";
        if (totalDays >= 2 && !updatedPlan[totalDays - 1].type) updatedPlan[totalDays - 1].type = "departure/from";
        return { ...prev, dailyPlan: updatedPlan };
      });
    }
  };

  const handleTypeChange = (i, type) => {
    setNewTour((p) => {
      const updated = [...(p.dailyPlan || [])];
      updated[i] = { ...(updated[i] || {}), type };
      return { ...p, dailyPlan: updated };
    });
  };

  const handleCityChange = (i, city) => {
    setNewTour((p) => {
      const updated = [...(p.dailyPlan || [])];
      updated[i] = { ...(updated[i] || {}), city };
      return { ...p, dailyPlan: updated };
    });
  };

  const makeTourId = (title) => title.trim().replace(/\s+/g, "_").toLowerCase();

  const handleSaveTour = async () => {
    if (!newTour.title || !newTour.description || !newTour.price)
      return alert("Fill in title, description, and price.");
    if (!newTour.imageFile && !newTour.imageUrl)
      return alert("Please upload a tour image.");

    setUploading(true);

    try {
      const tourId = editingId || makeTourId(newTour.title);
      let imageUrl = newTour.imageUrl;
      let imagePath = newTour.imagePath;

      if (newTour.imageFile) {
        if (imagePath) {
          try { await deleteObject(ref(storage, imagePath)); } catch {}
        }

        const path = `tours/${tourId}-${Date.now()}`;
        const imageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(imageRef, newTour.imageFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setUploadProgressText(`Uploading: ${pct}%`);
            },
            reject,
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              imagePath = path;
              resolve();
            }
          );
        });
      }

      const docData = {
        title: newTour.title,
        description: newTour.description,
        nights: parseInt(newTour.nights),
        totalDays: newTour.dailyPlan.length,
        price: parseFloat(newTour.price),
        dailyPlan: newTour.dailyPlan,
        imageUrl,
        imagePath,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "tours", tourId), docData, { merge: true });
      alert(editingId ? "Tour updated!" : "Tour added!");
      resetForm();
      fetchTours();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save tour. See console.");
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  };

  const handleEdit = (tour) => {
    setEditingId(tour.id);
    setNewTour({ ...tour, imageFile: null });
    setImagePreview(tour.imageUrl);
  };

  const handleCancelEdit = () => resetForm();

  const resetForm = () => {
    setNewTour({ title: "", description: "", nights: 1, price: "", dailyPlan: [], imageFile: null, imageUrl: "", imagePath: "" });
    setEditingId(null);
    setImagePreview(null);
  };

  const handleDelete = async (tour) => {
    if (!window.confirm(`Are you sure you want to delete the tour "${tour.title}"?`)) return;

    try {
      await deleteDoc(doc(db, "tours", tour.id));
      if (tour.imagePath) {
        try { await deleteObject(ref(storage, tour.imagePath)); } catch {}
      }
      alert("Tour deleted.");
      fetchTours();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete tour.");
    }
  };

  return (
    <AdminLayout>
      <div className="container-fluid" style={{ fontSize: "0.8rem" }}>
        <h2 className="mb-4 text-center">Tours Management</h2>

        {/* ADD / EDIT FORM */}
        <div className="card p-3 mb-4 shadow-sm">
          <h5 className="mb-3">{editingId ? "Edit Tour" : "Add New Tour"}</h5>
          
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Tour Title</label>
              <input className="form-control" name="title" value={newTour.title} onChange={handleInputChange} />

              <label className="form-label mt-2">Nights</label>
              <input type="number" name="nights" className="form-control" value={newTour.nights} onChange={handleInputChange} />

              <label className="form-label mt-2">Price</label>
              <input type="number" name="price" className="form-control" value={newTour.price} onChange={handleInputChange} />

              <label className="form-label mt-2">Image</label>
              <input type="file" name="imageFile" className="form-control" onChange={handleInputChange} />
              {imagePreview && <img src={imagePreview} alt="preview" className="img-fluid mt-2" style={{ maxWidth: "100%", borderRadius: 4 }} />}
            </div>

            <div className="col-md-6">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows="6" name="description" value={newTour.description} onChange={handleInputChange} />

              <div className="mt-2">
                <h6>Daily Plan (Total Days: {newTour.dailyPlan.length})</h6>
                {newTour.dailyPlan.map((day, i) => (
                  <div key={i} className="d-flex gap-2 mb-2 align-items-center">
                    <span>Day {i + 1}</span>
                    <select value={day.type} onChange={(e) => handleTypeChange(i, e.target.value)} className="form-select w-auto">
                      <option value="">-- Type --</option>
                      <option value="arrival/stay">Arrival & Stay</option>
                      <option value="travel/stay">Travel & Stay</option>
                      <option value="visit">Visit</option>
                      <option value="departure/from">Departure</option>
                    </select>
                    <select value={day.city} onChange={(e) => handleCityChange(i, e.target.value)} className="form-select w-auto">
                      <option value="">-- City --</option>
                      {cities.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-success" onClick={handleSaveTour} disabled={uploading}>
              {uploading ? "Saving..." : <><FaSave /> {editingId ? "Update Tour" : "Add Tour"}</>}
            </button>
            {editingId && <button className="btn btn-secondary" onClick={handleCancelEdit}><FaTimes /> Cancel Edit</button>}
          </div>
          {uploadProgressText && <div className="text-muted mt-2">{uploadProgressText}</div>}
        </div>

        {/* TOURS LIST */}
        <div className="card p-3 shadow-sm">
          <h5 className="mb-3">Existing Tours</h5>
          {tours.map((t) => (
            <div key={t.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
              <span><strong>{t.title}</strong> (${t.price}) - Total Days: {t.totalDays}</span>
              <div>
                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(t)}><FaEdit /></button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t)}><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}