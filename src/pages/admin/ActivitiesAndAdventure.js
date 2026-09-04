// src/pages/admin/ActivitiesAndAdventure.js
import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, auth, storage } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import AdminLayout from "../../components/AdminLayout";
import { FaEdit, FaTimes, FaPlus, FaTrash, FaSave } from "react-icons/fa";
import { Modal, Button, Badge, ProgressBar, Spinner } from "react-bootstrap";
import Select from "react-select";

const MONTH_OPTIONS = [
  { value: "Jan", label: "Jan" },
  { value: "Feb", label: "Feb" },
  { value: "Mar", label: "Mar" },
  { value: "Apr", label: "Apr" },
  { value: "May", label: "May" },
  { value: "Jun", label: "Jun" },
  { value: "Jul", label: "Jul" },
  { value: "Aug", label: "Aug" },
  { value: "Sep", label: "Sep" },
  { value: "Oct", label: "Oct" },
  { value: "Nov", label: "Nov" },
  { value: "Dec", label: "Dec" },
];

export default function ActivitiesAndAdventure() {
  const ADMIN_EMAIL = "admin@example.com";
  const ADMIN_PASSWORD = "123456";

  const [activities, setActivities] = useState([]);
  const [adventures, setAdventures] = useState([]);

  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [editedActivity, setEditedActivity] = useState({
    id: null,
    name: "",
    availability: "Yes",
    price: "",
    imageUrl: "",
    imageFile: null,
    description: "",
    time: "",
    availableMonths: [],
  });
  const [newActivity, setNewActivity] = useState({
    name: "",
    availability: "Yes",
    price: "",
    imageFile: null,
    description: "",
    time: "",
    availableMonths: [],
  });

  const [editingAdventureIndex, setEditingAdventureIndex] = useState(null);
  const [editedAdventure, setEditedAdventure] = useState({
    id: null,
    name: "",
    availability: "Yes",
    price: "",
    imageUrl: "",
    imageFile: null,
    description: "",
    time: "",
    availableMonths: [],
  });
  const [newAdventure, setNewAdventure] = useState({
    name: "",
    availability: "Yes",
    price: "",
    imageFile: null,
    description: "",
    time: "",
    availableMonths: [],
  });

  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingAdventures, setLoadingAdventures] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: "", id: "" });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const signInAdmin = async () => {
      try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        listenActivities();
        listenAdventures();
      } catch (err) {
        console.error("Admin login failed:", err);
        alert("Firebase authentication failed. Check credentials.");
      }
    };
    signInAdmin();
  }, []);

  const listenActivities = () => {
    setLoadingActivities(true);
    return onSnapshot(
      collection(db, "additionalActivities"),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Ensure availableMonths is array
        items.forEach((item) => {
          if (!Array.isArray(item.availableMonths)) item.availableMonths = [];
        });
        setActivities(items);
        setLoadingActivities(false);
      },
      (err) => {
        console.error("listenActivities error:", err);
        setLoadingActivities(false);
      }
    );
  };

  const listenAdventures = () => {
    setLoadingAdventures(true);
    return onSnapshot(
      collection(db, "adventure"),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.forEach((item) => {
          if (!Array.isArray(item.availableMonths)) item.availableMonths = [];
        });
        setAdventures(items);
        setLoadingAdventures(false);
      },
      (err) => {
        console.error("listenAdventures error:", err);
        setLoadingAdventures(false);
      }
    );
  };

  const uploadImage = (file, folder, name) =>
    new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const safeName = (name || "file").replace(/\s+/g, "_") + "_" + Date.now();
      const storageRef = ref(storage, `${folder}/${safeName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      setUploading(true);
      setUploadProgress(0);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          setUploading(false);
          reject(error);
        },
        async () => {
          setUploading(false);
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

  const saveItem = async (item, collectionName) => {
    const docId = item.id || item.name || Date.now().toString();
    let imageUrl = item.imageUrl || "";
    if (item.imageFile) {
      imageUrl = await uploadImage(item.imageFile, collectionName, item.name || docId);
    }
    await setDoc(doc(db, collectionName, docId), {
      name: item.name,
      availability: item.availability,
      price: Number(item.price),
      imageUrl,
      description: item.description || "",
      time: item.time || "",
      availableMonths: item.availableMonths.map((m) => m.value),
    });
  };

  const saveActivity = (item) => saveItem(item, "additionalActivities");
  const saveAdventure = (item) => saveItem(item, "adventure");

  const deleteItem = async () => {
    const { type, id } = deleteTarget;
    if (!type || !id) return;
    await deleteDoc(doc(db, type === "activity" ? "additionalActivities" : "adventure", id));
    setShowDeleteModal(false);
    setDeleteTarget({ type: "", id: "" });
  };

  const confirmDelete = (type, id) => {
    setDeleteTarget({ type, id });
    setShowDeleteModal(true);
  };

  // ----------------- Add / Edit Handlers -----------------
  const handleAddActivity = async () => {
    if (!newActivity.name || !newActivity.availability || !newActivity.price) return alert("Fill required fields.");
    await saveActivity(newActivity);
    setNewActivity({
      name: "",
      availability: "Yes",
      price: "",
      imageFile: null,
      description: "",
      time: "",
      availableMonths: [],
    });
  };

  const handleEditActivity = async (idx) => {
    if (!editedActivity.name || !editedActivity.availability || !editedActivity.price) return alert("Fill required fields.");
    await saveActivity(editedActivity);
    setEditingActivityIndex(null);
    setEditedActivity({
      id: null,
      name: "",
      availability: "Yes",
      price: "",
      imageUrl: "",
      imageFile: null,
      description: "",
      time: "",
      availableMonths: [],
    });
  };

  const handleAddAdventure = async () => {
    if (!newAdventure.name || !newAdventure.availability || !newAdventure.price) return alert("Fill required fields.");
    await saveAdventure(newAdventure);
    setNewAdventure({
      name: "",
      availability: "Yes",
      price: "",
      imageFile: null,
      description: "",
      time: "",
      availableMonths: [],
    });
  };

  const handleEditAdventure = async (idx) => {
    if (!editedAdventure.name || !editedAdventure.availability || !editedAdventure.price) return alert("Fill required fields.");
    await saveAdventure(editedAdventure);
    setEditingAdventureIndex(null);
    setEditedAdventure({
      id: null,
      name: "",
      availability: "Yes",
      price: "",
      imageUrl: "",
      imageFile: null,
      description: "",
      time: "",
      availableMonths: [],
    });
  };

  // ----------------- Render Helpers -----------------
  const truncate = (text, n = 120) => text?.length > n ? text.slice(0, n) + "…" : text || "";

  const renderMonthSelect = (value, onChange) => (
    <Select
      isMulti
      options={MONTH_OPTIONS}
      value={value}
      onChange={onChange}
      classNamePrefix="react-select"
      placeholder="Select months"
    />
  );

  const renderItemCard = (item, idx, editingIndex, editedItem, setEditedItem, handleEdit, type) => (
    <li key={item.id} className="list-group-item d-flex align-items-start justify-content-between flex-wrap py-3 shadow-sm mb-2 rounded">
      {editingIndex === idx ? (
        <div className="w-100">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-3">
              <input type="text" className="form-control form-control-sm" value={editedItem.name} onChange={e => setEditedItem({...editedItem, name: e.target.value})} placeholder="Name" />
            </div>
            <div className="col-12 col-md-2">
              <select className="form-control form-control-sm" value={editedItem.availability} onChange={e => setEditedItem({...editedItem, availability: e.target.value})}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <input type="number" className="form-control form-control-sm" value={editedItem.price} onChange={e => setEditedItem({...editedItem, price: e.target.value})} placeholder="Price" />
            </div>
            <div className="col-12 col-md-5">
              <input type="file" className="form-control form-control-sm" onChange={e => setEditedItem({...editedItem, imageFile: e.target.files[0]})} />
            </div>
            <div className="col-12">
              <textarea className="form-control form-control-sm" rows={2} placeholder="Description (optional)" value={editedItem.description} onChange={e => setEditedItem({...editedItem, description: e.target.value})} />
            </div>
            <div className="col-12 col-md-6">
              <input type="text" className="form-control form-control-sm" placeholder="Activity/Adventure time" value={editedItem.time} onChange={e => setEditedItem({...editedItem, time: e.target.value})} />
            </div>
            <div className="col-12 col-md-6">
              {renderMonthSelect(editedItem.availableMonths, selected => setEditedItem({...editedItem, availableMonths: selected || []}))}
            </div>
            <div className="col-12 d-flex gap-2 mt-2">
              <button className="btn btn-success btn-sm" onClick={() => handleEdit(idx)}><FaSave /> Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                type === "activity" ? setEditingActivityIndex(null) : setEditingAdventureIndex(null);
                setEditedItem({ id: null, name: "", availability: "Yes", price: "", imageUrl: "", imageFile: null, description: "", time: "", availableMonths: [] });
              }}><FaTimes /> Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex align-items-start gap-3 flex-grow-1">
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="rounded border" style={{width:80,height:80,objectFit:"cover"}} />}
            <div className="flex-grow-1">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <h6 className="mb-1">{item.name}</h6>
                  <div className="mb-1">
                    <Badge bg={item.availability === "Yes" ? "success":"secondary"} className="me-2">{item.availability}</Badge>
                    <span className="text-muted">${item.price}</span>
                  </div>
                </div>
                <div className="text-end">
                  {item.time && <div className="small text-muted">Time: {item.time}</div>}
                  {item.availableMonths.length>0 && <div className="small text-muted">Months: {item.availableMonths.join(", ")}</div>}
                </div>
              </div>
              {item.description ? <p className="mb-0 text-muted" style={{fontSize:13}}>{truncate(item.description,180)}</p> : <p className="mb-0 text-muted" style={{fontSize:13}}><em>No description</em></p>}
            </div>
          </div>
          <div className="d-flex gap-2 mt-2">
            <button className="btn btn-outline-primary btn-sm" onClick={() => {
              if(type==="activity"){setEditingActivityIndex(idx); setEditedItem({...item, availableMonths: item.availableMonths.map(m=>({value:m,label:m}))});}
              else {setEditingAdventureIndex(idx); setEditedItem({...item, availableMonths: item.availableMonths.map(m=>({value:m,label:m}))});}
            }}><FaEdit /></button>
            <button className="btn btn-outline-danger btn-sm" onClick={()=>confirmDelete(type,item.id)}><FaTrash /></button>
          </div>
        </>
      )}
    </li>
  );

  const renderAddNewForm = (newItem,setNewItem,handleAdd,typeLabel) => (
    <div className="d-flex gap-2 align-items-center flex-wrap mt-3 p-3 border rounded shadow-sm bg-light">
      <input type="text" className="form-control" placeholder="Name" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} />
      <select className="form-control" value={newItem.availability} onChange={e=>setNewItem({...newItem,availability:e.target.value})}><option value="Yes">Yes</option><option value="No">No</option></select>
      <input type="number" className="form-control" placeholder="Price" value={newItem.price} onChange={e=>setNewItem({...newItem,price:e.target.value})} />
      <input type="file" className="form-control" onChange={e=>setNewItem({...newItem,imageFile:e.target.files[0]})} />
      <input type="text" className="form-control" placeholder="Activity/Adventure time" value={newItem.time} onChange={e=>setNewItem({...newItem,time:e.target.value})} />
      {renderMonthSelect(newItem.availableMonths, selected => setNewItem({...newItem,availableMonths: selected || []}))}
      <input type="text" className="form-control" placeholder="Short description" value={newItem.description} onChange={e=>setNewItem({...newItem,description:e.target.value})} />
      {newItem.imageFile && <img src={URL.createObjectURL(newItem.imageFile)} alt="preview" style={{width:50,height:50,objectFit:"cover"}} className="rounded border"/>}
      <button className="btn btn-primary" onClick={handleAdd}><FaPlus /> Add {typeLabel}</button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="container my-4">
        <h2 className="text-center mb-5 fw-bold text-dark">Manage Activities & Adventures</h2>

        {uploading && (
          <div className="mb-3 d-flex align-items-center gap-3">
            <Spinner animation="border" size="sm" role="status" />
            <ProgressBar now={uploadProgress} label={`${Math.round(uploadProgress)}%`} striped animated className="flex-grow-1" />
          </div>
        )}

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm h-100 p-3">
              <h5 className="mb-3 text-primary">Additional Activities</h5>
              {loadingActivities ? <p>Loading activities...</p> :
                <>
                  <ul className="list-unstyled">
                    {activities.map((item, idx)=>renderItemCard(item, idx, editingActivityIndex, editedActivity, setEditedActivity, handleEditActivity, "activity"))}
                  </ul>
                  {renderAddNewForm(newActivity,setNewActivity,handleAddActivity,"Activity")}
                </>
              }
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100 p-3">
              <h5 className="mb-3 text-success">Adventure Activities</h5>
              {loadingAdventures ? <p>Loading adventures...</p> :
                <>
                  <ul className="list-unstyled">
                    {adventures.map((item, idx)=>renderItemCard(item, idx, editingAdventureIndex, editedAdventure, setEditedAdventure, handleEditAdventure, "adventure"))}
                  </ul>
                  {renderAddNewForm(newAdventure,setNewAdventure,handleAddAdventure,"Adventure")}
                </>
              }
            </div>
          </div>
        </div>

        <Modal show={showDeleteModal} onHide={()=>setShowDeleteModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>Are you sure you want to delete this {deleteTarget.type}?</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={()=>setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={deleteItem}>Delete</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </AdminLayout>
  );
}