import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import AdminLayout from "../../components/AdminLayout";
import { FaEdit, FaTimes, FaPlus, FaTrash, FaSave } from "react-icons/fa";

export default function ManagePrices() {
  const [prices, setPrices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedPrice, setEditedPrice] = useState("");

  const [accommodationTypes, setAccommodationTypes] = useState([]);
  const [loadingAccommodation, setLoadingAccommodation] = useState(true);

  const [newPriceId, setNewPriceId] = useState("");
  const [newPriceValue, setNewPriceValue] = useState("");

  // ---------------- Inclusions ----------------
  const [inclusions, setInclusions] = useState([]);
  const [newInclusion, setNewInclusion] = useState("");
  const [editingInclusionIndex, setEditingInclusionIndex] = useState(null);
  const [editedInclusion, setEditedInclusion] = useState("");
  const [loadingInclusions, setLoadingInclusions] = useState(true);

  const ADMIN_EMAIL = "admin@example.com";
  const ADMIN_PASSWORD = "123456";

  // ---------------- Admin Sign In ----------------
  useEffect(() => {
    const signInAdmin = async () => {
      try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        fetchPrices();
        fetchAccommodationPrices();
        fetchInclusions();
      } catch (err) {
        console.error("Admin login failed:", err);
        alert("Firebase authentication failed. Check credentials.");
      }
    };
    signInAdmin();
  }, []);

  // ---------------- General Prices ----------------
  const fetchPrices = async () => {
    const snapshot = await getDocs(collection(db, "prices"));
    setPrices(
      snapshot.docs
        .filter((doc) => doc.id !== "Accommodation") 
        .map((doc) => ({ id: doc.id, ...doc.data() }))
    );
  };

  const handleUpdatePrice = async (id) => {
    if (!editedPrice) return alert("Enter a valid price.");
    await setDoc(doc(db, "prices", id), { price: Number(editedPrice) }, { merge: true });
    setEditingId(null);
    setEditedPrice("");
    fetchPrices();
  };

  const handleAddGeneralPrice = async () => {
    if (!newPriceId.trim() || !newPriceValue) return alert("Enter both name and price.");
    await setDoc(doc(db, "prices", newPriceId), { price: Number(newPriceValue) });
    setNewPriceId("");
    setNewPriceValue("");
    fetchPrices();
  };

  // ---------------- Accommodation ----------------
  const fetchAccommodationPrices = async () => {
    setLoadingAccommodation(true);
    const docRef = doc(db, "prices", "Accommodation");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setAccommodationTypes(data.types && data.types.length ? data.types : [{ name: "", price: "" }]);
    } else {
      setAccommodationTypes([{ name: "", price: "" }]);
    }
    setLoadingAccommodation(false);
  };

  const handleSaveAccommodation = async () => {
    for (const t of accommodationTypes) {
      if (!t.name.trim() || !t.price) return alert("Enter name and price for all accommodation types.");
    }
    await setDoc(doc(db, "prices", "Accommodation"), { types: accommodationTypes });
    alert("Accommodation prices updated!");
    fetchAccommodationPrices();
  };

  const handleAddType = () => setAccommodationTypes([...accommodationTypes, { name: "", price: "" }]);
  const handleRemoveType = (index) => setAccommodationTypes(accommodationTypes.filter((_, i) => i !== index));

  // ---------------- Inclusions ----------------
  const fetchInclusions = async () => {
    try {
      setLoadingInclusions(true);
      const docRef = doc(db, "inclusions", "General Inclusions");
      const docSnap = await getDoc(docRef);
      setInclusions(docSnap.exists() ? docSnap.data().items || [] : []);
    } catch (err) {
      console.error("Error fetching inclusions:", err);
      setInclusions([]);
    } finally {
      setLoadingInclusions(false);
    }
  };

  const saveInclusions = async (updatedItems) => {
    await setDoc(doc(db, "inclusions", "General Inclusions"), { items: updatedItems });
    fetchInclusions();
  };

  const handleAddInclusion = async () => {
    if (!newInclusion.trim()) return;
    await saveInclusions([...inclusions, newInclusion.trim()]);
    setNewInclusion("");
  };

  const handleEditInclusion = async (index) => {
    if (!editedInclusion.trim()) return;
    const updated = [...inclusions];
    updated[index] = editedInclusion.trim();
    await saveInclusions(updated);
    setEditingInclusionIndex(null);
    setEditedInclusion("");
  };

  const handleRemoveInclusion = async (index) => {
    await saveInclusions(inclusions.filter((_, i) => i !== index));
  };

  // ---------------- Render ----------------
  return (
    <AdminLayout>
      <div className="container-fluid my-4">
        <h2 className="text-center mb-5 fw-bold" style={{ color: "#343a40" }}>Manage Prices & Inclusions</h2>
        <div className="row">
          {/* General Prices */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="mb-3">General Prices</h5>
                <ul className="list-group mb-3">
                  {prices.length ? (
                    prices.map((p) => (
                      <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>{p.id}</div>
                        <div className="d-flex gap-2 align-items-center">
                          {editingId === p.id ? (
                            <>
                              <input type="number" className="form-control form-control-sm" value={editedPrice} onChange={(e) => setEditedPrice(e.target.value)} />
                              <button className="btn btn-success btn-sm" onClick={() => handleUpdatePrice(p.id)}><FaSave /></button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}><FaTimes /></button>
                            </>
                          ) : (
                            <>
                              <span>${p.price}</span>
                              <button className="btn btn-primary btn-sm" onClick={() => { setEditingId(p.id); setEditedPrice(p.price); }}><FaEdit /></button>
                            </>
                          )}
                        </div>
                      </li>
                    ))
                  ) : (<li className="list-group-item text-muted">No price items found.</li>)}
                </ul>
                <div className="d-flex gap-2 align-items-center">
                  <input type="text" className="form-control" placeholder="Price Name" value={newPriceId} onChange={(e) => setNewPriceId(e.target.value)} />
                  <input type="number" className="form-control" placeholder="Price" value={newPriceValue} onChange={(e) => setNewPriceValue(e.target.value)} />
                  <button className="btn btn-outline-primary" onClick={handleAddGeneralPrice}><FaPlus /> Add</button>
                </div>
              </div>
            </div>
          </div>

          {/* Accommodation Prices */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="mb-3">Accommodation Prices</h5>
                {loadingAccommodation ? (<p>Loading...</p>) : (
                  <>
                    {accommodationTypes.map((type, idx) => (
                      <div key={idx} className="mb-3 d-flex gap-2 align-items-center">
                        <input type="text" className="form-control" placeholder={`Accommodation Type ${idx + 1}`} value={type.name} onChange={(e) => { const newTypes = [...accommodationTypes]; newTypes[idx].name = e.target.value; setAccommodationTypes(newTypes); }} />
                        <input type="number" className="form-control" placeholder="Price" value={type.price} onChange={(e) => { const newTypes = [...accommodationTypes]; newTypes[idx].price = e.target.value; setAccommodationTypes(newTypes); }} />
                        <button className="btn btn-danger" onClick={() => handleRemoveType(idx)}><FaTrash /></button>
                      </div>
                    ))}
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-primary" onClick={handleAddType}><FaPlus /> Add Type</button>
                      <button className="btn btn-success" onClick={handleSaveAccommodation}>Save Accommodation Prices</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Inclusions */}
          <div className="col-md-12 mb-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">Manage Inclusions</h5>
                {loadingInclusions ? (<p>Loading inclusions...</p>) : (
                  <>
                    <ul className="list-group mb-3">
                      {inclusions.length === 0 && (<li className="list-group-item text-muted">No inclusions found.</li>)}
                      {inclusions.map((item, idx) => (
                        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                          {editingInclusionIndex === idx ? (
                            <div className="d-flex gap-2 flex-grow-1">
                              <input type="text" className="form-control form-control-sm" value={editedInclusion} onChange={(e) => setEditedInclusion(e.target.value)} />
                              <button className="btn btn-success btn-sm" onClick={() => handleEditInclusion(idx)}><FaSave /></button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingInclusionIndex(null)}><FaTimes /></button>
                            </div>
                          ) : (
                            <>
                              <span>{item}</span>
                              <div className="d-flex gap-2">
                                <button className="btn btn-primary btn-sm" onClick={() => { setEditingInclusionIndex(idx); setEditedInclusion(item); }}><FaEdit /></button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveInclusion(idx)}><FaTrash /></button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="d-flex gap-2 align-items-center">
                      <input type="text" className="form-control" placeholder="Add new inclusion" value={newInclusion} onChange={(e) => setNewInclusion(e.target.value)} />
                      <button className="btn btn-outline-primary" onClick={handleAddInclusion}><FaPlus /> Add</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}