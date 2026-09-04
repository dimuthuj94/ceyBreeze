// src/pages/admin/contentManagement/CitiesAndDestinations.js
import React, { useEffect, useState } from "react";
import {
  collection, getDocs, setDoc, deleteDoc, doc,
  query, orderBy, updateDoc, deleteField,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";
import GeneralConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";
import GeneralDeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123456";

export default function CitiesAndDestinations() {
  const [cities, setCities] = useState([]);
  const [newCity, setNewCity] = useState("");
  const [cityImage, setCityImage] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [destinations, setDestinations] = useState({});
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // Modal state
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveDescsConfirm, setShowSaveDescsConfirm] = useState(false);
  const [showSaveDescConfirm, setShowSaveDescConfirm] = useState(false);
  const [pendingDeleteCity, setPendingDeleteCity] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
      .then(fetchCities)
      .catch((err) => { console.error("Admin login failed:", err); });
  }, []);

  const fetchCities = async () => {
    try {
      const q = query(collection(db, "citiesAndDestinations"), orderBy("name"));
      const snap = await getDocs(q);
      setCities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  // Add city
  const handleAddCity = async () => {
    if (!newCity.trim() || !cityImage) return alert("City name and image required.");
    setShowAddConfirm(true);
  };

  const confirmAddCity = async () => {
    setModalLoading(true);
    setUploading(true);
    try {
      const imageRef = ref(storage, `cityImages/${newCity.trim()}-${Date.now()}.jpg`);
      await uploadBytes(imageRef, cityImage);
      const imageUrl = await getDownloadURL(imageRef);
      await setDoc(doc(db, "citiesAndDestinations", newCity.trim()), {
        name: newCity.trim(), imageUrl, description: "",
      });
      setNewCity(""); setCityImage(null);
      setShowAddConfirm(false);
      fetchCities();
    } catch (err) { console.error(err); alert("Failed to add city."); }
    finally { setModalLoading(false); setUploading(false); }
  };

  // Delete city
  const promptDeleteCity = (city) => { setPendingDeleteCity(city); setShowDeleteConfirm(true); };

  const confirmDeleteCity = async () => {
    if (!pendingDeleteCity) return;
    setModalLoading(true);
    try {
      await deleteDoc(doc(db, "citiesAndDestinations", pendingDeleteCity.id));
      if (pendingDeleteCity.imageUrl) {
        await deleteObject(ref(storage, pendingDeleteCity.imageUrl)).catch(() => {});
      }
      if (selectedCity?.id === pendingDeleteCity.id) setSelectedCity(null);
      setPendingDeleteCity(null);
      setShowDeleteConfirm(false);
      fetchCities();
    } catch (err) { console.error(err); }
    finally { setModalLoading(false); }
  };

  // Select city
  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setDescription(city.description || "");
    const cd = {};
    for (let i = 1; i <= 6; i++) cd[`destination${i}`] = city[`destination${i}`] || "";
    setDestinations(cd);
  };

  // Update city image
  const handleUpdateCityImage = async (city, file) => {
    if (!file) return;
    setUploading(true);
    try {
      if (city.imageUrl) await deleteObject(ref(storage, city.imageUrl)).catch(() => {});
      const newRef = ref(storage, `cityImages/${city.id}-${Date.now()}.jpg`);
      await uploadBytes(newRef, file);
      const newUrl = await getDownloadURL(newRef);
      await updateDoc(doc(db, "citiesAndDestinations", city.id), { imageUrl: newUrl });
      fetchCities();
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const handleDestinationChange = (key, value) => setDestinations((prev) => ({ ...prev, [key]: value }));

  // Save destinations
  const confirmSaveDestinations = async () => {
    if (!selectedCity) return;
    setModalLoading(true);
    try {
      const updateData = {};
      Object.keys(destinations).forEach((key) => {
        updateData[key] = destinations[key].trim() ? destinations[key].trim() : deleteField();
      });
      await updateDoc(doc(db, "citiesAndDestinations", selectedCity.id), updateData);
      setShowSaveDescsConfirm(false);
      fetchCities();
    } catch (err) { console.error(err); }
    finally { setModalLoading(false); }
  };

  // Save description
  const confirmSaveDescription = async () => {
    if (!selectedCity) return;
    setModalLoading(true);
    try {
      await updateDoc(doc(db, "citiesAndDestinations", selectedCity.id), { description: description.trim() });
      setShowSaveDescConfirm(false);
      fetchCities();
    } catch (err) { console.error(err); }
    finally { setModalLoading(false); }
  };

  const handleDeleteDestination = async (key) => {
    if (!selectedCity) return;
    try {
      await updateDoc(doc(db, "citiesAndDestinations", selectedCity.id), { [key]: deleteField() });
      setDestinations((prev) => ({ ...prev, [key]: "" }));
      fetchCities();
    } catch (err) { console.error(err); }
  };

  return (
    <ContentManagement pageTitle="Cities & Destinations">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        <div className="cm-page-header">
          <h1 className="cm-page-title">Cities &amp; Destinations</h1>
          <p className="cm-page-sub">Manage travel cities, their images, descriptions and destination points.</p>
        </div>

        <div className="cd-layout">
          {/* ── Left: City list ── */}
          <div>
            {/* Add city form */}
            <div className="cm-card" style={{ marginBottom: "16px" }}>
              <div className="cm-card-header">
                <span className="cm-card-title"><span>+</span> Add New City</span>
              </div>
              <div className="cm-card-body">
                <div className="cm-form-group">
                  <label className="cm-label">City Name</label>
                  <input
                    className="cm-input"
                    placeholder="e.g. Kandy"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                  />
                </div>
                <div className="cm-form-group">
                  <label className="cm-label">City Image</label>
                  <div className="cm-upload-area">
                    <div className="cm-upload-area-icon">🌆</div>
                    <div className="cm-upload-area-text">
                      {cityImage ? cityImage.name : "Click to upload city image"}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => setCityImage(e.target.files[0])} />
                  </div>
                </div>
                <button className="cm-btn primary" style={{ width: "100%" }} onClick={handleAddCity} disabled={uploading}>
                  {uploading ? "Uploading..." : "+ Add City"}
                </button>
              </div>
            </div>

            {/* City list */}
            <div className="cm-card">
              <div className="cm-card-header">
                <span className="cm-card-title"><span>◉</span> Cities</span>
                <span style={{ fontSize: "11px", color: "#7a9ab8", fontWeight: 500 }}>{cities.length} cities</span>
              </div>
              <div className="cm-card-body" style={{ padding: "10px 14px" }}>
                {cities.length === 0 && <p style={{ color: "#adc6d8", fontSize: "12px" }}>No cities added yet.</p>}
                {cities.map((city) => (
                  <div
                    key={city.id}
                    className={`cd-city-item ${selectedCity?.id === city.id ? "active" : ""}`}
                    onClick={() => handleSelectCity(city)}
                  >
                    {city.imageUrl
                      ? <img src={city.imageUrl} alt={city.name} className="cd-city-thumb" />
                      : <div className="cd-city-thumb-placeholder">🌆</div>
                    }
                    <span className="cd-city-name">{city.name}</span>
                    <div className="cd-city-actions">
                      <label className="cm-btn outline sm" title="Replace image" onClick={(e) => e.stopPropagation()} style={{ cursor: "pointer", padding: "4px 8px" }}>
                        🖼
                        <input type="file" accept="image/*" hidden onChange={(e) => handleUpdateCityImage(city, e.target.files[0])} />
                      </label>
                      <button
                        className="cm-btn danger sm"
                        title="Delete city"
                        onClick={(e) => { e.stopPropagation(); promptDeleteCity(city); }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: City details ── */}
          <div>
            {!selectedCity ? (
              <div className="cm-card" style={{ height: "100%" }}>
                <div className="cm-card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "#adc6d8" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px", opacity: 0.2 }}>◉</div>
                  <p style={{ fontSize: "13px" }}>Select a city from the list to manage its details.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* City header strip */}
                <div className="cm-card">
                  <div className="cm-card-body" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    {selectedCity.imageUrl && (
                      <img src={selectedCity.imageUrl} alt={selectedCity.name} style={{ width: "64px", height: "52px", borderRadius: "10px", objectFit: "cover", border: "1px solid rgba(0,39,107,0.1)", flexShrink: 0 }} />
                    )}
                    <div>
                      <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#00276b" }}>{selectedCity.name}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#7a9ab8" }}>
                        {Object.keys(selectedCity).filter(k => k.startsWith("destination")).length} destinations defined
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="cm-card">
                  <div className="cm-card-header">
                    <span className="cm-card-title">◆ City Description</span>
                  </div>
                  <div className="cm-card-body">
                    <textarea
                      className="cm-input"
                      rows="4"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter a description for this city..."
                      style={{ resize: "vertical" }}
                    />
                    <button className="cm-btn primary" style={{ marginTop: "12px" }} onClick={() => setShowSaveDescConfirm(true)}>
                      ✓ Save Description
                    </button>
                  </div>
                </div>

                {/* Destinations */}
                <div className="cm-card">
                  <div className="cm-card-header">
                    <span className="cm-card-title">◉ Destinations</span>
                    <span style={{ fontSize: "11px", color: "#7a9ab8" }}>Up to 6 destinations</span>
                  </div>
                  <div className="cm-card-body">
                    {[...Array(6)].map((_, i) => {
                      const key = `destination${i + 1}`;
                      return (
                        <div key={key} className="cd-dest-row">
                          <div className="cd-dest-num">{i + 1}</div>
                          <input
                            className="cm-input"
                            placeholder={`Destination ${i + 1}`}
                            value={destinations[key] || ""}
                            onChange={(e) => handleDestinationChange(key, e.target.value)}
                          />
                          {destinations[key] && (
                            <button
                              className="cm-btn danger sm"
                              onClick={() => handleDeleteDestination(key)}
                              title="Remove destination"
                              style={{ flexShrink: 0 }}
                            >🗑</button>
                          )}
                        </div>
                      );
                    })}
                    <button className="cm-btn success" style={{ marginTop: "12px" }} onClick={() => setShowSaveDescsConfirm(true)}>
                      ✓ Save All Destinations
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <GeneralConfirmationModal
        show={showAddConfirm}
        onHide={() => setShowAddConfirm(false)}
        onConfirm={confirmAddCity}
        loading={modalLoading}
        title="Add City"
        message={`Add "${newCity}" as a new city?`}
        confirmLabel="Add City"
      />
      <GeneralDeleteConfirmationModal
        show={showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteCity}
        loading={modalLoading}
        title="Delete City"
        message={`Are you sure you want to delete "${pendingDeleteCity?.name}"? All destinations for this city will be lost.`}
      />
      <GeneralConfirmationModal
        show={showSaveDescsConfirm}
        onHide={() => setShowSaveDescsConfirm(false)}
        onConfirm={confirmSaveDestinations}
        loading={modalLoading}
        title="Save Destinations"
        message={`Save all destinations for "${selectedCity?.name}"?`}
        confirmLabel="Save Destinations"
      />
      <GeneralConfirmationModal
        show={showSaveDescConfirm}
        onHide={() => setShowSaveDescConfirm(false)}
        onConfirm={confirmSaveDescription}
        loading={modalLoading}
        title="Save Description"
        message={`Save the description for "${selectedCity?.name}"?`}
        confirmLabel="Save Description"
      />
    </ContentManagement>
  );
}