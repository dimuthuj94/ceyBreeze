//E:\HDSE\Final Project\UI\application\src\pages\admin\driverAndFleetManagement\DriverManagement.js

import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { db, storage } from "../../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Tabs, Tab, Form, Button, Row, Col, Card } from "react-bootstrap";

import ConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";
import DeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";
import PhotoUploadModal from "../../../components/modals/general/GeneralPhotoUploadModal";
import ViewDriverModal from "../../../components/modals/general/ViewDriverModal";
import DriverAndFleetManagement from "../../../components/layouts/admin/DriverAndFleetManagement";
import EditDriver from "../../../components/modals/adminModals/driverAndFleetManagementModals/EditDriver";



export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEditSave = async (updatedData) => {
  await updateDoc(doc(db, "drivers", selectedDriver.id), updatedData);
  setShowEditModal(false);
};

  const initialForm = {
    gender: "",
    title: "",
    fullName: "",
    callingName: "",
    house: "",
    street1: "",
    street2: "",
    city: "",
    postalCode: "",
    mobile: "",
    home: "",
    nic: "",
    dl: "",
    permit: "",
  };

  const [form, setForm] = useState(initialForm);
  const [editMode, setEditMode] = useState(false);

  const [showView, setShowView] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileKey, setFileKey] = useState(Date.now());
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  
  // ✅ REALTIME FETCH
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "drivers"), (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // ✅ VALIDATION
  const validateForm = () => {
  for (let key in form) {
    if (!form[key]) {
      alert("All fields are required");
      return false;
    }
  }

  const nicRegex = /^(\d{9}[VXvx]|\d{12})$/;
  if (!nicRegex.test(form.nic)) {
    alert("Invalid NIC");
    return false;
  }

  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(form.mobile)) {
    alert("Invalid mobile");
    return false;
  }

  // 🔥 DUPLICATE CHECK
  const duplicateNIC = drivers.find(d => d.nic === form.nic);
  if (duplicateNIC) {
    alert("NIC already exists");
    return false;
  }

  const duplicateMobile = drivers.find(d => d.mobile === form.mobile);
  if (duplicateMobile) {
    alert("Mobile already exists");
    return false;
  }

  return true;
};

  // ✅ SAFE ID GENERATOR
  const generateDriverId = async () => {
    const counterRef = doc(db, "counters", "drivers");

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let newId = 1;
      if (counterDoc.exists()) {
        newId = counterDoc.data().lastId + 1;
      }

      // ✅ FIXED
      transaction.set(counterRef, { lastId: newId }, { merge: true });

      return `DRV-E-${String(newId).padStart(4, "0")}`;
    });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const buildAddress = () =>
    `${form.house}, ${form.street1}, ${form.street2}, ${form.city}, ${form.postalCode}`;


  const handleFileSelect = (file) => {
  if (!file) return;

  // Save file
  setForm((prev) => ({ ...prev, photoFile: file }));

  // 🔥 Create preview
  const reader = new FileReader();
  reader.onloadend = () => {
    setPreview(reader.result);
  };
  reader.readAsDataURL(file);
  };
  
  const handleSave = async () => {
  if (!validateForm()) return;

  setLoading(true);

  try {
    let id;

    // 🔥 REMOVE photoFile from payload
    const { photoFile, ...cleanForm } = form;

    const payload = {
      ...cleanForm,
      address: buildAddress(),
    };

    // ✅ CREATE / UPDATE
    if (editMode) {
      id = selectedDriver.id;
      await updateDoc(doc(db, "drivers", id), payload);
    } else {
      id = await generateDriverId();
      await setDoc(doc(db, "drivers", id), payload);
    }



    // ✅ UPLOAD IMAGE (AFTER DOC CREATED)
    if (photoFile) {
      const storageRef = ref(storage, `drivers/${id}`);
      await uploadBytes(storageRef, photoFile);

      const url = await getDownloadURL(storageRef);

      // ✅ SAVE IMAGE URL TO FIRESTORE
      await updateDoc(doc(db, "drivers", id), {
        photo: url,
      });
    }

    resetForm();
    setShowConfirm(false);

  } catch (err) {
    console.error("🔥 SAVE ERROR:", err);
    alert(err.message);
  }

  setLoading(false);
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setDragActive(false);

  const file = e.dataTransfer.files[0];
  handleFileSelect(file);
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setDragActive(true);
};

const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setDragActive(false);
};

  // ✅ DELETE
  const handleDelete = async () => {
    setLoading(true);
    await deleteDoc(doc(db, "drivers", selectedDriver.id));
    setShowDelete(false);
    setLoading(false);
  };

  // ✅ UPLOAD (FIXED)
  const handleUpload = async ({ file, location }) => {
    const storageRef = ref(storage, `${location}/${selectedDriver.id}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "drivers", selectedDriver.id), {
      photo: url,
    });
  };

  // ✅ EDIT FIX (IMPORTANT)
  const handleEdit = (driver) => {
    setSelectedDriver(driver);

    const parts = driver.address?.split(",") || [];

    setForm({
      ...driver,
      house: parts[0] || "",
      street1: parts[1] || "",
      street2: parts[2] || "",
      city: parts[3] || "",
      postalCode: parts[4] || "",
    });

    setEditMode(true);
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditMode(false);
    setFileKey(Date.now());
    setPreview(null);
  };

  const filteredDrivers = drivers.filter((d) =>
    d.callingName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DriverAndFleetManagement>
      <div className="container">
        <h4 className="mb-4">Driver Management</h4>

        <Form.Control
          placeholder="Search by Calling Name..."
          className="mb-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          />

        <Tabs defaultActiveKey="view">

          {/* VIEW */}
          <Tab eventKey="view" title="View Drivers">
            <Row>
              {/* VIEW TAB - replace the existing Row + Col + Card block */}
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "16px",
  padding: "1rem 0"
}}>
  {filteredDrivers.map((d) => (
    <div key={d.id} style={{
      background: "white",
      border: "1px solid #e9ecef",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }}>
      {/* Photo */}
      <img
        src={d.photo || "/images/default-user.png"}
        alt="Driver"
        style={{ width: "100%", height: "160px", objectFit: "cover", display: "block", background: "#f8f9fa" }}
      />

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: "11px", color: "#adb5bd", letterSpacing: "0.04em", margin: "0 0 4px" }}>{d.id}</p>
        <p style={{ fontSize: "15px", fontWeight: 500, color: "#212529", margin: "0 0 10px" }}>
          {d.title} {d.callingName}
        </p>

        {[
          { label: "Address", value: d.address },
          { label: "Mobile",  value: d.mobile },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "5px" }}>
            <span style={{ fontSize: "12px", color: "#adb5bd", minWidth: "54px" }}>{label}</span>
            <span style={{ fontSize: "12px", color: "#495057", lineHeight: 1.4 }}>{value}</span>
          </div>
        ))}

        <hr style={{ border: "none", borderTop: "1px solid #f1f3f5", margin: "12px 0" }} />

        {/* Primary actions */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <Button size="sm" variant="outline-primary" onClick={() => { setSelectedDriver(d); setShowView(true); }}>
            View
          </Button>
          <Button size="sm" variant="outline-warning" onClick={() => { setSelectedDriver(d); setShowEditModal(true); }}>
            Edit
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={() => {}}>
            View Schedule
          </Button>
        </div>

        {/* Destructive actions - separated */}
        <div style={{ display: "flex", gap: "6px" }}>
          <Button size="sm" variant="outline-danger" onClick={() => {}}>
            Fire
          </Button>
          <Button size="sm" variant="outline-danger" onClick={() => { setSelectedDriver(d); setShowDelete(true); }}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  ))}
</div>
            </Row>
          </Tab>

          <Tab eventKey="form" title="Create Driver">
  <Form className="mt-3">

    {/* ================= PERSONAL DETAILS ================= */}
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <h5 className="mb-3">Personal Details</h5>

        <Row>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Title</Form.Label>
              <Form.Select name="title" value={form.title} onChange={handleChange}>
                <option value="">Select Title</option>
                <option>Mr</option>
                <option>Miss</option>
                <option>Mrs</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Gender</Form.Label>
              <Form.Select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Birthday</Form.Label>
              <Form.Control
                type="date"
                name="birthday"
                value={form.birthday || ""}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mt-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Calling Name</Form.Label>
              <Form.Control
                name="callingName"
                value={form.callingName}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>
      </Card.Body>
    </Card>

    {/* ================= ADDRESS ================= */}
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <h5 className="mb-3">Address Details</h5>

        <Form.Group>
          <Form.Label>House No / Name</Form.Label>
          <Form.Control name="house" value={form.house} onChange={handleChange} />
        </Form.Group>

        <Row className="mt-2">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Street Line 1</Form.Label>
              <Form.Control name="street1" value={form.street1} onChange={handleChange} />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Street Line 2</Form.Label>
              <Form.Control name="street2" value={form.street2} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mt-2">
          <Col md={6}>
            <Form.Group>
              <Form.Label>City</Form.Label>
              <Form.Control name="city" value={form.city} onChange={handleChange} />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Postal Code</Form.Label>
              <Form.Control name="postalCode" value={form.postalCode} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>
      </Card.Body>
    </Card>

    {/* ================= CONTACT ================= */}
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <h5 className="mb-3">Contact Details</h5>

        <Row>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control name="mobile" value={form.mobile} onChange={handleChange} />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Home Number</Form.Label>
              <Form.Control name="home" value={form.home} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>
      </Card.Body>
    </Card>

    {/* ================= IDENTIFICATION ================= */}
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <h5 className="mb-3">Identification Details</h5>

        <Row>
          <Col md={4}>
            <Form.Group>
              <Form.Label>NIC Number</Form.Label>
              <Form.Control name="nic" value={form.nic} onChange={handleChange} />
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Driving License No</Form.Label>
              <Form.Control name="dl" value={form.dl} onChange={handleChange} />
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label>Permit Number</Form.Label>
              <Form.Control name="permit" value={form.permit} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>
      </Card.Body>
    </Card>

    {/* ================= PHOTO ================= */}
    <Card className="mb-3 shadow-sm">
      <Card className="mb-3 shadow-sm">
  <Card.Body>
    <h5 className="mb-3">Driver Photo</h5>

    {/* 🔥 DRAG & DROP ZONE */}
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        border: "2px dashed #ccc",
        borderRadius: "12px",
        padding: "30px",
        textAlign: "center",
        background: dragActive ? "#f1f3f5" : "#fff",
        transition: "0.2s ease",
        cursor: "pointer"
      }}
      onClick={() => document.getElementById("fileInput").click()}
    >
      <p style={{ marginBottom: "10px", fontWeight: "500" }}>
        Drag & Drop Image Here
      </p>

      <p style={{ fontSize: "13px", color: "#888" }}>
        or click to browse
      </p>

      {/* HIDDEN INPUT */}
      <input
        key={fileKey}
        id="fileInput"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelect(e.target.files[0])}
      />
    </div>

    {/* 🔥 PREVIEW */}
    {preview && (
      <div className="mt-3 text-center">
        <img
          src={preview}
          alt="Preview"
          style={{
            width: "200px",
            height: "200px",
            objectFit: "cover",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
          }}
        />

        <p className="mt-2 text-muted">
          {form.photoFile?.name}
        </p>
      </div>
    )}

  </Card.Body>
</Card>
    </Card>

    {/* ================= ACTIONS ================= */}
    <div className="mt-3 d-flex justify-content-end gap-2">
      <Button variant="secondary" onClick={resetForm}>
        Reset
      </Button>

      <Button onClick={() => setShowConfirm(true)}>
        Create Driver
      </Button>
    </div>

  </Form>

          </Tab>
        </Tabs>

        {/* MODALS */}
        <ViewDriverModal
          show={showView}
          onHide={() => setShowView(false)}
          driver={selectedDriver}
          onDelete={() => {
            setShowView(false);
            setShowDelete(true);
          }}
          onUploadPhoto={() => setShowUpload(true)}
        />

        <DeleteConfirmationModal
          show={showDelete}
          onHide={() => setShowDelete(false)}
          onConfirm={handleDelete}
          loading={loading}
        />

        <ConfirmationModal
          show={showConfirm}
          onHide={() => setShowConfirm(false)}
          onConfirm={handleSave}
          loading={loading}
        />

        <PhotoUploadModal
          show={showUpload}
          onHide={() => setShowUpload(false)}
          onUpload={handleUpload}
          locations={["drivers"]}
        />
      </div>

      <EditDriver
  show={showEditModal}
  onHide={() => setShowEditModal(false)}
  driver={selectedDriver}
  onSave={handleEditSave}
/>
    </DriverAndFleetManagement>

    
  );

  
}