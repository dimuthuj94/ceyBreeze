// src/pages/admin/contentManagement/ActivitiesAndAdventure.js
import React, { useEffect, useState } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";
import GeneralConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";
import GeneralDeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";
import Select from "react-select";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123456";

const MONTH_OPTIONS = [
  { value: "Jan", label: "Jan" }, { value: "Feb", label: "Feb" },
  { value: "Mar", label: "Mar" }, { value: "Apr", label: "Apr" },
  { value: "May", label: "May" }, { value: "Jun", label: "Jun" },
  { value: "Jul", label: "Jul" }, { value: "Aug", label: "Aug" },
  { value: "Sep", label: "Sep" }, { value: "Oct", label: "Oct" },
  { value: "Nov", label: "Nov" }, { value: "Dec", label: "Dec" },
];

const emptyItem = { id: null, name: "", availability: "Yes", price: "", imageUrl: "", imageFile: null, description: "", time: "", availableMonths: [] };

export default function ActivitiesAndAdventure() {
  const [activities, setActivities] = useState([]);
  const [adventures, setAdventures] = useState([]);
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [editedActivity, setEditedActivity] = useState(emptyItem);
  const [newActivity, setNewActivity] = useState({ ...emptyItem });
  const [editingAdventureIndex, setEditingAdventureIndex] = useState(null);
  const [editedAdventure, setEditedAdventure] = useState(emptyItem);
  const [newAdventure, setNewAdventure] = useState({ ...emptyItem });
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingAdventures, setLoadingAdventures] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: "", id: "" });
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
      .then(() => { listenActivities(); listenAdventures(); })
      .catch((err) => { console.error("Admin login failed:", err); });
  }, []);

  const listenActivities = () => {
    setLoadingActivities(true);
    return onSnapshot(collection(db, "additionalActivities"), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.forEach((i) => { if (!Array.isArray(i.availableMonths)) i.availableMonths = []; });
      setActivities(items); setLoadingActivities(false);
    }, () => setLoadingActivities(false));
  };

  const listenAdventures = () => {
    setLoadingAdventures(true);
    return onSnapshot(collection(db, "adventure"), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.forEach((i) => { if (!Array.isArray(i.availableMonths)) i.availableMonths = []; });
      setAdventures(items); setLoadingAdventures(false);
    }, () => setLoadingAdventures(false));
  };

  const uploadImage = (file, folder, name) =>
    new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const safeName = (name || "file").replace(/\s+/g, "_") + "_" + Date.now();
      const storageRef = ref(storage, `${folder}/${safeName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      setUploading(true); setUploadProgress(0);
      uploadTask.on("state_changed",
        (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        (err) => { setUploading(false); reject(err); },
        async () => { setUploading(false); resolve(await getDownloadURL(uploadTask.snapshot.ref)); }
      );
    });

  const saveItem = async (item, collectionName) => {
    const docId = item.id || item.name || Date.now().toString();
    let imageUrl = item.imageUrl || "";
    if (item.imageFile) imageUrl = await uploadImage(item.imageFile, collectionName, item.name || docId);
    await setDoc(doc(db, collectionName, docId), {
      name: item.name, availability: item.availability,
      price: Number(item.price), imageUrl,
      description: item.description || "", time: item.time || "",
      availableMonths: item.availableMonths.map((m) => m.value),
    });
  };

  const saveActivity = (item) => saveItem(item, "additionalActivities");
  const saveAdventure = (item) => saveItem(item, "adventure");

  const handleDeleteConfirm = async () => {
    const { type, id } = deleteTarget;
    if (!type || !id) return;
    setModalLoading(true);
    await deleteDoc(doc(db, type === "activity" ? "additionalActivities" : "adventure", id));
    setModalLoading(false);
    setShowDeleteModal(false);
    setDeleteTarget({ type: "", id: "" });
  };

  const confirmDelete = (type, id) => { setDeleteTarget({ type, id }); setShowDeleteModal(true); };

  const handleAddActivity = async () => {
    if (!newActivity.name || !newActivity.availability || !newActivity.price) return alert("Fill required fields.");
    await saveActivity(newActivity);
    setNewActivity({ ...emptyItem });
  };

  const handleEditActivity = async () => {
    if (!editedActivity.name || !editedActivity.availability || !editedActivity.price) return alert("Fill required fields.");
    await saveActivity(editedActivity);
    setEditingActivityIndex(null); setEditedActivity(emptyItem);
  };

  const handleAddAdventure = async () => {
    if (!newAdventure.name || !newAdventure.availability || !newAdventure.price) return alert("Fill required fields.");
    await saveAdventure(newAdventure);
    setNewAdventure({ ...emptyItem });
  };

  const handleEditAdventure = async () => {
    if (!editedAdventure.name || !editedAdventure.availability || !editedAdventure.price) return alert("Fill required fields.");
    await saveAdventure(editedAdventure);
    setEditingAdventureIndex(null); setEditedAdventure(emptyItem);
  };

  const truncate = (text, n = 140) => text?.length > n ? text.slice(0, n) + "…" : text || "";

  const MonthSelect = ({ value, onChange }) => (
    <Select isMulti options={MONTH_OPTIONS} value={value} onChange={onChange} placeholder="Select months..." classNamePrefix="react-select" styles={{ control: (b) => ({ ...b, borderColor: "rgba(0,39,107,0.15)", borderRadius: "9px", fontSize: "12px" }) }} />
  );

  const EditForm = ({ item, setItem, onSave, onCancel }) => (
    <div style={{ background: "rgba(0,39,107,0.03)", borderRadius: "10px", padding: "14px", marginTop: "8px" }}>
      <div className="aa-form-grid" style={{ marginBottom: "8px" }}>
        <div><label className="cm-label">Name</label><input className="cm-input" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Name" /></div>
        <div><label className="cm-label">Availability</label><select className="cm-input" value={item.availability} onChange={(e) => setItem({ ...item, availability: e.target.value })}><option>Yes</option><option>No</option></select></div>
        <div><label className="cm-label">Price ($)</label><input type="number" className="cm-input" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} placeholder="0" /></div>
        <div><label className="cm-label">Time</label><input className="cm-input" value={item.time} onChange={(e) => setItem({ ...item, time: e.target.value })} placeholder="e.g. 2-3 hours" /></div>
      </div>
      <div style={{ marginBottom: "8px" }}><label className="cm-label">Description</label><textarea className="cm-input" rows="2" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} placeholder="Description..." style={{ resize: "vertical" }} /></div>
      <div style={{ marginBottom: "8px" }}><label className="cm-label">Available Months</label><MonthSelect value={item.availableMonths} onChange={(s) => setItem({ ...item, availableMonths: s || [] })} /></div>
      <div style={{ marginBottom: "10px" }}><label className="cm-label">Image</label><div className="cm-upload-area"><div className="cm-upload-area-icon">🖼</div><div className="cm-upload-area-text">Click to upload image</div><input type="file" onChange={(e) => setItem({ ...item, imageFile: e.target.files[0] })} /></div></div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="cm-btn primary sm" onClick={onSave}>✓ Save</button>
        <button className="cm-btn outline sm" onClick={onCancel}>✕ Cancel</button>
      </div>
    </div>
  );

  const AddForm = ({ item, setItem, onAdd, label }) => (
    <div className="aa-add-form">
      <div className="aa-add-form-title">+ Add New {label}</div>
      <div className="aa-form-grid" style={{ marginBottom: "8px" }}>
        <div><label className="cm-label">Name</label><input className="cm-input" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Name" /></div>
        <div><label className="cm-label">Availability</label><select className="cm-input" value={item.availability} onChange={(e) => setItem({ ...item, availability: e.target.value })}><option>Yes</option><option>No</option></select></div>
        <div><label className="cm-label">Price ($)</label><input type="number" className="cm-input" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} placeholder="0" /></div>
        <div><label className="cm-label">Time</label><input className="cm-input" value={item.time} onChange={(e) => setItem({ ...item, time: e.target.value })} placeholder="e.g. 2-3 hours" /></div>
      </div>
      <div style={{ marginBottom: "8px" }}><label className="cm-label">Description</label><input className="cm-input" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} placeholder="Short description" /></div>
      <div style={{ marginBottom: "8px" }}><label className="cm-label">Available Months</label><MonthSelect value={item.availableMonths} onChange={(s) => setItem({ ...item, availableMonths: s || [] })} /></div>
      <div style={{ marginBottom: "10px" }}><label className="cm-label">Image</label><div className="cm-upload-area"><div className="cm-upload-area-icon">🖼</div><div className="cm-upload-area-text">{item.imageFile ? item.imageFile.name : "Click to upload"}</div><input type="file" onChange={(e) => setItem({ ...item, imageFile: e.target.files[0] })} /></div>{item.imageFile && <img src={URL.createObjectURL(item.imageFile)} alt="preview" style={{ width: "60px", height: "48px", borderRadius: "6px", objectFit: "cover", marginTop: "6px" }} />}</div>
      <button className="cm-btn primary" onClick={onAdd}>+ Add {label}</button>
    </div>
  );

  const renderList = (items, loadingFlag, editingIndex, editedItem, setEditedItem, handleEdit, onEditStart, confirmDel, type) => {
    if (loadingFlag) return <p style={{ color: "#adc6d8", fontSize: "13px" }}>Loading...</p>;
    return items.map((item, idx) => (
      <div key={item.id} className="aa-item-card">
        {editingIndex === idx ? (
          <EditForm item={editedItem} setItem={setEditedItem} onSave={handleEdit} onCancel={() => { if (type === "activity") { setEditingActivityIndex(null); setEditedActivity(emptyItem); } else { setEditingAdventureIndex(null); setEditedAdventure(emptyItem); } }} />
        ) : (
          <>
            <div className="aa-item-header">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="aa-item-thumb" />}
              <div style={{ flex: 1 }}>
                <div className="aa-item-name">{item.name}</div>
                <div className="aa-item-meta">
                  <span className={`aa-badge ${item.availability === "Yes" ? "available" : "unavailable"}`}>{item.availability}</span>
                  <span className="aa-price">${item.price}</span>
                </div>
              </div>
            </div>
            {item.description && <div className="aa-item-desc">{truncate(item.description, 180)}</div>}
            <div className="aa-item-footer">
              <div className="aa-item-extra">
                {item.time && <span>⏱ {item.time}</span>}
                {item.availableMonths?.length > 0 && <span style={{ marginLeft: "8px" }}>📅 {item.availableMonths.join(", ")}</span>}
              </div>
              <div className="aa-item-actions">
                <button className="cm-btn warn sm" onClick={() => onEditStart(idx, item)}>✏ Edit</button>
                <button className="cm-btn danger sm" onClick={() => confirmDel(type, item.id)}>🗑</button>
              </div>
            </div>
          </>
        )}
      </div>
    ));
  };

  return (
    <ContentManagement pageTitle="Activities & Adventure">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        <div className="cm-page-header">
          <h1 className="cm-page-title">Activities &amp; Adventure</h1>
          <p className="cm-page-sub">Manage additional activities and adventure options offered on tours.</p>
        </div>

        {uploading && (
          <div className="aa-upload-progress">
            <span style={{ fontSize: "12px", color: "#00276b", whiteSpace: "nowrap" }}>Uploading...</span>
            <div className="aa-progress-bar"><div className="aa-progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
            <span style={{ fontSize: "11px", color: "#7a9ab8", whiteSpace: "nowrap" }}>{Math.round(uploadProgress)}%</span>
          </div>
        )}

        <div className="aa-grid">
          {/* Activities */}
          <div className="cm-card">
            <div className="cm-card-header">
              <span className="cm-card-title"><span>◎</span> Additional Activities</span>
              <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{activities.length} items</span>
            </div>
            <div className="cm-card-body">
              {renderList(activities, loadingActivities, editingActivityIndex, editedActivity, setEditedActivity, handleEditActivity,
                (idx, item) => { setEditingActivityIndex(idx); setEditedActivity({ ...item, availableMonths: item.availableMonths.map((m) => ({ value: m, label: m })) }); },
                confirmDelete, "activity"
              )}
              <AddForm item={newActivity} setItem={setNewActivity} onAdd={handleAddActivity} label="Activity" />
            </div>
          </div>

          {/* Adventures */}
          <div className="cm-card">
            <div className="cm-card-header">
              <span className="cm-card-title"><span>◉</span> Adventure Activities</span>
              <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{adventures.length} items</span>
            </div>
            <div className="cm-card-body">
              {renderList(adventures, loadingAdventures, editingAdventureIndex, editedAdventure, setEditedAdventure, handleEditAdventure,
                (idx, item) => { setEditingAdventureIndex(idx); setEditedAdventure({ ...item, availableMonths: item.availableMonths.map((m) => ({ value: m, label: m })) }); },
                confirmDelete, "adventure"
              )}
              <AddForm item={newAdventure} setItem={setNewAdventure} onAdd={handleAddAdventure} label="Adventure" />
            </div>
          </div>
        </div>
      </div>

      <GeneralDeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        loading={modalLoading}
        title="Delete Item"
        message={`Are you sure you want to delete this ${deleteTarget.type}? This cannot be undone.`}
      />
    </ContentManagement>
  );
}