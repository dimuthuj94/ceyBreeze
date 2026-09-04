// src/pages/admin/contentManagement/NewsAndHighlights.js
import React, { useEffect, useState } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";
import GeneralConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";
import GeneralDeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123456";

const emptyNew = { title: "", body: "", visibility: "Yes", publishedDate: "", imageFile: null };

export default function NewsAndHighlights() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedItem, setEditedItem] = useState({});
  const [newItem, setNewItem] = useState(emptyNew);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD).catch(console.error);
    const unsub = onSnapshot(collection(db, "newsAndHighlights"), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const uploadImage = (file, title) =>
    new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const name = `${title.replace(/\s+/g, "_")}_${Date.now()}`;
      const storageRef = ref(storage, `newsAndHighlights/${name}`);
      const task = uploadBytesResumable(storageRef, file);
      setUploading(true);
      task.on("state_changed",
        (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        (err) => { setUploading(false); reject(err); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUploading(false);
          resolve({ url, path: task.snapshot.ref.fullPath });
        }
      );
    });

  const handleSave = async (item, isEdit = false) => {
    let imageUrl = item.imageUrl || "";
    let imagePath = item.imagePath || "";
    if (item.imageFile) {
      const uploaded = await uploadImage(item.imageFile, item.title);
      imageUrl = uploaded.url; imagePath = uploaded.path;
    }
    const id = item.id || Date.now().toString();
    await setDoc(doc(db, "newsAndHighlights", id), {
      title: item.title, body: item.body,
      visibility: item.visibility, publishedDate: item.publishedDate,
      imageUrl, imagePath,
    });
    setEditingIndex(null); setEditedItem({});
    setNewItem(emptyNew);
  };

  const confirmDelete = (item) => { setDeleteTarget(item); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setModalLoading(true);
    if (deleteTarget.imagePath) {
      try { await deleteObject(ref(storage, deleteTarget.imagePath)); } catch {}
    }
    await deleteDoc(doc(db, "newsAndHighlights", deleteTarget.id));
    setModalLoading(false); setShowDeleteModal(false); setDeleteTarget(null);
  };

  const fmtDate = (str) => {
    if (!str) return "";
    try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return str; }
  };

  return (
    <ContentManagement pageTitle="News & Highlights">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        <div className="cm-page-header">
          <h1 className="cm-page-title">News &amp; Highlights</h1>
          <p className="cm-page-sub">Publish news articles and highlight posts visible to all customers.</p>
        </div>

        {uploading && (
          <div className="aa-upload-progress" style={{ marginBottom: "16px" }}>
            <span style={{ fontSize: "12px", color: "#00276b" }}>Uploading image...</span>
            <div className="aa-progress-bar"><div className="aa-progress-fill" style={{ width: `${progress}%` }} /></div>
            <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{Math.round(progress)}%</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", alignItems: "start" }}>

          {/* List */}
          <div>
            {loading ? <p style={{ color: "#adc6d8", fontSize: "13px" }}>Loading...</p> : (
              items.length === 0 ? <p style={{ color: "#adc6d8", fontSize: "13px" }}>No news published yet.</p> :
              items.map((item, idx) => (
                <div key={item.id} className="nh-item-card">
                  {editingIndex === idx ? (
                    <div style={{ padding: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                        <div><label className="cm-label">Title</label><input className="cm-input" value={editedItem.title} onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })} placeholder="Title" /></div>
                        <div><label className="cm-label">Published Date</label><input type="date" className="cm-input" value={editedItem.publishedDate} onChange={(e) => setEditedItem({ ...editedItem, publishedDate: e.target.value })} /></div>
                      </div>
                      <div style={{ marginBottom: "10px" }}><label className="cm-label">Body</label><textarea className="cm-input" rows="3" value={editedItem.body} onChange={(e) => setEditedItem({ ...editedItem, body: e.target.value })} placeholder="Article body..." style={{ resize: "vertical" }} /></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                        <div><label className="cm-label">Visibility</label><select className="cm-input" value={editedItem.visibility} onChange={(e) => setEditedItem({ ...editedItem, visibility: e.target.value })}><option>Yes</option><option>No</option></select></div>
                        <div><label className="cm-label">Replace Image</label><div className="cm-upload-area" style={{ padding: "10px" }}><div className="cm-upload-area-text" style={{ fontSize: "11px" }}>Click to replace</div><input type="file" onChange={(e) => setEditedItem({ ...editedItem, imageFile: e.target.files[0] })} /></div></div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="cm-btn primary sm" onClick={() => handleSave(editedItem, true)}>✓ Save</button>
                        <button className="cm-btn outline sm" onClick={() => setEditingIndex(null)}>✕ Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="nh-item-body">
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.title} className="nh-item-thumb" />
                          : <div className="nh-item-thumb-placeholder">◆</div>
                        }
                        <div style={{ flex: 1 }}>
                          <div className="nh-item-title">{item.title}</div>
                          <div className="nh-item-text">{item.body}</div>
                          <div className="nh-item-meta">
                            {item.publishedDate && <span className="nh-item-date">{fmtDate(item.publishedDate)}</span>}
                            <span className={`nh-vis-badge ${item.visibility === "Yes" ? "yes" : "no"}`}>{item.visibility === "Yes" ? "Visible" : "Hidden"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="nh-item-footer">
                        <button className="cm-btn warn sm" onClick={() => { setEditingIndex(idx); setEditedItem(item); }}>✏ Edit</button>
                        <button className="cm-btn danger sm" onClick={() => confirmDelete(item)}>🗑 Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add form */}
          <div className="cm-card" style={{ position: "sticky", top: "80px" }}>
            <div className="cm-card-header">
              <span className="cm-card-title"><span>+</span> Add Article</span>
            </div>
            <div className="cm-card-body">
              <div className="cm-form-group"><label className="cm-label">Title *</label><input className="cm-input" placeholder="Article title" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} /></div>
              <div className="cm-form-group"><label className="cm-label">Body</label><textarea className="cm-input" rows="4" placeholder="Article body..." value={newItem.body} onChange={(e) => setNewItem({ ...newItem, body: e.target.value })} style={{ resize: "vertical" }} /></div>
              <div className="cm-form-group"><label className="cm-label">Published Date</label><input type="date" className="cm-input" value={newItem.publishedDate} onChange={(e) => setNewItem({ ...newItem, publishedDate: e.target.value })} /></div>
              <div className="cm-form-group"><label className="cm-label">Visibility</label><select className="cm-input" value={newItem.visibility} onChange={(e) => setNewItem({ ...newItem, visibility: e.target.value })}><option>Yes</option><option>No</option></select></div>
              <div className="cm-form-group">
                <label className="cm-label">Image</label>
                <div className="cm-upload-area"><div className="cm-upload-area-icon">◆</div><div className="cm-upload-area-text">{newItem.imageFile ? newItem.imageFile.name : "Click to upload"}</div><input type="file" onChange={(e) => setNewItem({ ...newItem, imageFile: e.target.files[0] })} /></div>
              </div>
              <button className="cm-btn primary" style={{ width: "100%" }} onClick={() => setShowSaveModal(true)}>+ Publish</button>
            </div>
          </div>
        </div>
      </div>

      <GeneralConfirmationModal
        show={showSaveModal}
        onHide={() => setShowSaveModal(false)}
        onConfirm={() => { handleSave(newItem); setShowSaveModal(false); }}
        title="Publish Article"
        message={`Publish "${newItem.title}" to the news feed?`}
        confirmLabel="Publish"
      />
      <GeneralDeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        loading={modalLoading}
        title="Delete Article"
        message={`Permanently delete "${deleteTarget?.title}" and its image?`}
      />
    </ContentManagement>
  );
}