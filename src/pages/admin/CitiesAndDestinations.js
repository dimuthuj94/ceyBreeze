import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import AdminLayout from "../../components/AdminLayout";
import { FaTrash, FaPlus, FaSave, FaUpload } from "react-icons/fa";

export default function CitiesAndDestinations() {
  const [cities, setCities] = useState([]);
  const [newCity, setNewCity] = useState("");
  const [cityImage, setCityImage] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [destinations, setDestinations] = useState({});
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const ADMIN_EMAIL = "admin@example.com";
  const ADMIN_PASSWORD = "123456";

  useEffect(() => {
    const signInAdmin = async () => {
      try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        fetchCities();
      } catch (err) {
        console.error("Admin login failed:", err);
        alert("Firebase authentication failed. Check credentials.");
      }
    };
    signInAdmin();
  }, []);

  // Fetch cities
  const fetchCities = async () => {
    try {
      const q = query(collection(db, "citiesAndDestinations"), orderBy("name"));
      const snapshot = await getDocs(q);
      setCities(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching cities:", err);
    }
  };

  // Add new city
  const handleAddCity = async () => {
    if (!newCity.trim() || !cityImage)
      return alert("City name and image required.");
    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL)
      return alert("You must be signed in as admin to perform this action.");

    try {
      setUploading(true);
      const imageRef = ref(storage, `cityImages/${newCity.trim()}-${Date.now()}.jpg`);
      await uploadBytes(imageRef, cityImage);
      const imageUrl = await getDownloadURL(imageRef);

      await setDoc(doc(db, "citiesAndDestinations", newCity.trim()), {
        name: newCity.trim(),
        imageUrl,
        description: "",
      });

      setNewCity("");
      setCityImage(null);
      fetchCities();
    } catch (err) {
      console.error("Error adding city:", err);
      alert("Failed to add city.");
    } finally {
      setUploading(false);
    }
  };

  // Delete city
  const handleDeleteCity = async (id, imageUrl) => {
    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL)
      return alert("You must be signed in as admin to perform this action.");

    try {
      await deleteDoc(doc(db, "citiesAndDestinations", id));
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(() => console.warn("Image not found."));
      }
      if (selectedCity?.id === id) setSelectedCity(null);
      fetchCities();
    } catch (err) {
      console.error("Error deleting city:", err);
    }
  };

  // Select city
  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setDescription(city.description || "");
    const cityDestinations = {};
    for (let i = 1; i <= 6; i++) {
      cityDestinations[`destination${i}`] = city[`destination${i}`] || "";
    }
    setDestinations(cityDestinations);
  };

  // Update city image
  const handleUpdateCityImage = async (city, file) => {
    if (!file) return;
    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL)
      return alert("You must be signed in as admin to perform this action.");

    try {
      setUploading(true);
      if (city.imageUrl) {
        const oldImageRef = ref(storage, city.imageUrl);
        await deleteObject(oldImageRef).catch(() => console.warn("Old image not found."));
      }

      const newImageRef = ref(storage, `cityImages/${city.id}-${Date.now()}.jpg`);
      await uploadBytes(newImageRef, file);
      const newImageUrl = await getDownloadURL(newImageRef);

      await updateDoc(doc(db, "citiesAndDestinations", city.id), { imageUrl: newImageUrl });
      fetchCities();
    } catch (err) {
      console.error("Error updating city image:", err);
    } finally {
      setUploading(false);
    }
  };

  // Handle destination change
  const handleDestinationChange = (key, value) => {
    setDestinations((prev) => ({ ...prev, [key]: value }));
  };

  // Save destinations
  const handleSaveDestinations = async () => {
    if (!selectedCity) return;
    try {
      const updateData = {};
      Object.keys(destinations).forEach((key) => {
        if (destinations[key].trim()) updateData[key] = destinations[key].trim();
        else updateData[key] = deleteField();
      });
      await updateDoc(doc(db, "citiesAndDestinations", selectedCity.id), updateData);
      fetchCities();
      alert("Destinations updated successfully!");
    } catch (err) {
      console.error("Error saving destinations:", err);
    }
  };

  // Save description
  const handleSaveDescription = async () => {
    if (!selectedCity) return;
    try {
      await updateDoc(doc(db, "citiesAndDestinations", selectedCity.id), { description: description.trim() });
      fetchCities();
      alert("Description updated!");
    } catch (err) {
      console.error("Error updating description:", err);
    }
  };

  // Delete single destination
  const handleDeleteDestination = async (key) => {
    if (!selectedCity) return;
    try {
      await updateDoc(doc(db, "citiesAndDestinations", selectedCity.id), { [key]: deleteField() });
      setDestinations((prev) => ({ ...prev, [key]: "" }));
      fetchCities();
    } catch (err) {
      console.error("Error deleting destination:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="container-fluid" style={{ fontSize: "0.85rem" }}>
        <h2 className="mb-4 text-center">Manage Cities & Destinations</h2>
        <div className="row">
          {/* Cities List */}
          <div className="col-md-4 border-end">
            <h5 className="mb-3">Cities</h5>
            <div className="mb-3">
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Add new city"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
              <input
                type="file"
                className="form-control mb-2"
                accept="image/*"
                onChange={(e) => setCityImage(e.target.files[0])}
              />
              <button
                className="btn btn-success w-100 mb-2"
                onClick={handleAddCity}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : <><FaPlus className="me-2" /> Add City</>}
              </button>
            </div>
            <ul className="list-group">
              {cities.map((city) => (
                <li
                  key={city.id}
                  className={`list-group-item d-flex justify-content-between align-items-center ${
                    selectedCity?.id === city.id ? "active" : ""
                  }`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSelectCity(city)}
                >
                  <div className="d-flex align-items-center">
                    {city.imageUrl && (
                      <img
                        src={city.imageUrl}
                        alt={city.name}
                        className="me-2 rounded"
                        style={{ width: "35px", height: "35px", objectFit: "cover" }}
                      />
                    )}
                    {city.name}
                  </div>
                  <div className="d-flex gap-1">
                    <label className="btn btn-sm btn-outline-primary mb-0">
                      <FaUpload />
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleUpdateCityImage(city, e.target.files[0])}
                      />
                    </label>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCity(city.id, city.imageUrl);
                      }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </li>
              ))}
              {cities.length === 0 && (
                <li className="list-group-item text-muted">No cities added yet.</li>
              )}
            </ul>
          </div>

          {/* Destination & Description Manager */}
          <div className="col-md-8">
            {selectedCity ? (
              <div>
                <h5>{selectedCity.name} Details</h5>

                {/* Description */}
                <div className="mb-3">
                  <label className="form-label">City Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <button className="btn btn-primary mt-2" onClick={handleSaveDescription}>
                    <FaSave className="me-2" /> Save Description
                  </button>
                </div>

                {/* Destinations */}
                <h6>Destinations</h6>
                {[...Array(6)].map((_, i) => {
                  const key = `destination${i + 1}`;
                  return (
                    <div key={key} className="mb-2 d-flex align-items-center">
                      <input
                        type="text"
                        className="form-control me-2"
                        placeholder={`Destination ${i + 1}`}
                        value={destinations[key]}
                        onChange={(e) => handleDestinationChange(key, e.target.value)}
                      />
                      {destinations[key] && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteDestination(key)}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button className="btn btn-success mt-2" onClick={handleSaveDestinations}>
                  <FaSave className="me-2" /> Save All Destinations
                </button>
              </div>
            ) : (
              <p className="text-muted">Select a city to manage details and destinations.</p>
            )}
          </div>
        </div>

        {/* Styles */}
        <style>{`
          .list-group-item { transition: all 0.2s ease-in-out; }
          .list-group-item:hover { background-color: #f1f3f5; }
          .list-group-item.active { background-color: #0d6efd; color: #fff; }
          input.form-control, textarea.form-control { font-size: 0.85rem; }
          button { font-size: 0.8rem; }
        `}</style>
      </div>
    </AdminLayout>
  );
}
