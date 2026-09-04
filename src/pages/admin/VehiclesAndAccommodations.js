import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import AdminLayout from "../../components/AdminLayout";
import { FaTrash, FaPlus, FaEdit, FaTimes } from "react-icons/fa";

export default function VehiclesAndAccommodations() {
  const [vehicles, setVehicles] = useState([]);
  const [accommodations, setAccommodations] = useState([]);

  const [newVehicle, setNewVehicle] = useState({
    id: "",
    minimumSeatCount: "",
    maximumSeatCount: "",
    pricePerDay: "",
  });

  const [newAccommodation, setNewAccommodation] = useState({
    id: "",
    guestCount: "",
    additionalPricePerDay: "",
  });

  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingAccommodation, setEditingAccommodation] = useState(null);

  const ADMIN_EMAIL = "admin@example.com";
  const ADMIN_PASSWORD = "123456";

  useEffect(() => {
    const signInAdmin = async () => {
      try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        fetchVehicles();
        fetchAccommodations();
      } catch (err) {
        console.error("Admin login failed:", err);
        alert("Firebase authentication failed. Check credentials.");
      }
    };
    signInAdmin();
  }, []);

  const fetchVehicles = async () => {
    try {
      const snapshot = await getDocs(collection(db, "vehicles"));
      setVehicles(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  const fetchAccommodations = async () => {
    try {
      const snapshot = await getDocs(collection(db, "accommodations"));
      setAccommodations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching accommodations:", err);
    }
  };

  const handleAddOrUpdateVehicle = async () => {
    const { id, minimumSeatCount, maximumSeatCount, pricePerDay } = newVehicle;

    if (!id.trim() || !minimumSeatCount || !maximumSeatCount || !pricePerDay)
      return alert("Type, seat counts, and price per day are required.");

    if (Number(maximumSeatCount) < Number(minimumSeatCount))
      return alert("Maximum seat count must be greater than or equal to minimum seat count.");

    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL)
      return alert("You must be signed in as admin to perform this action.");

    try {
      await setDoc(doc(db, "vehicles", id.trim()), {
        name: id.trim(),
        minimumSeatCount: Number(minimumSeatCount),
        maximumSeatCount: Number(maximumSeatCount),
        pricePerDay: Number(pricePerDay),
      });
      setNewVehicle({ id: "", minimumSeatCount: "", maximumSeatCount: "", pricePerDay: "" });
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      console.error("Error saving vehicle:", err);
    }
  };

  const handleAddOrUpdateAccommodation = async () => {
    const { id, guestCount, additionalPricePerDay } = newAccommodation;

    if (!id.trim() || !guestCount || !additionalPricePerDay)
      return alert("Type, guest count, and additional price are required.");

    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL)
      return alert("You must be signed in as admin to perform this action.");

    try {
      await setDoc(doc(db, "accommodations", id.trim()), {
        name: id.trim(),
        guestCount: Number(guestCount),
        additionalPricePerDay: Number(additionalPricePerDay),
      });
      setNewAccommodation({ id: "", guestCount: "", additionalPricePerDay: "" });
      setEditingAccommodation(null);
      fetchAccommodations();
    } catch (err) {
      console.error("Error saving accommodation:", err);
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
      fetchVehicles();
    } catch (err) {
      console.error("Error deleting vehicle:", err);
    }
  };

  const handleDeleteAccommodation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this accommodation?")) return;
    try {
      await deleteDoc(doc(db, "accommodations", id));
      fetchAccommodations();
    } catch (err) {
      console.error("Error deleting accommodation:", err);
    }
  };

  const handleEditVehicle = (vehicle) => {
    setNewVehicle({
      id: vehicle.id,
      minimumSeatCount: vehicle.minimumSeatCount,
      maximumSeatCount: vehicle.maximumSeatCount,
      pricePerDay: vehicle.pricePerDay || "",
    });
    setEditingVehicle(vehicle.id);
  };

  const handleEditAccommodation = (acc) => {
    setNewAccommodation({
      id: acc.id,
      guestCount: acc.guestCount,
      additionalPricePerDay: acc.additionalPricePerDay,
    });
    setEditingAccommodation(acc.id);
  };

  const cancelEditVehicle = () => {
    setNewVehicle({ id: "", minimumSeatCount: "", maximumSeatCount: "", pricePerDay: "" });
    setEditingVehicle(null);
  };

  const cancelEditAccommodation = () => {
    setNewAccommodation({ id: "", guestCount: "", additionalPricePerDay: "" });
    setEditingAccommodation(null);
  };

  return (
    <AdminLayout>
      <div className="container my-4">
        <h2 className="text-center mb-5 fw-bold" style={{ color: "#343a40" }}>
          Manage Vehicles & Accommodations
        </h2>

        <div className="row g-4">
          {/* Vehicles */}
          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-header bg-dark text-white">
                <h5 className="mb-0">Vehicles</h5>
              </div>
              <div className="card-body">
                {/* Form */}
                <div className="mb-3 row g-2">
                  <div className="col-12">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Vehicle Type (ID)"
                      value={newVehicle.id}
                      onChange={(e) => setNewVehicle((prev) => ({ ...prev, id: e.target.value }))}
                      disabled={editingVehicle}
                    />
                  </div>
                  <div className="col-4">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min Seats"
                      value={newVehicle.minimumSeatCount}
                      onChange={(e) =>
                        setNewVehicle((prev) => ({ ...prev, minimumSeatCount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-4">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max Seats"
                      value={newVehicle.maximumSeatCount}
                      onChange={(e) =>
                        setNewVehicle((prev) => ({ ...prev, maximumSeatCount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-4">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Price / Day"
                      value={newVehicle.pricePerDay}
                      onChange={(e) =>
                        setNewVehicle((prev) => ({ ...prev, pricePerDay: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 d-flex gap-2 mt-2">
                    <button className="btn btn-success w-100" onClick={handleAddOrUpdateVehicle}>
                      <FaPlus className="me-2" /> {editingVehicle ? "Update" : "Add"}
                    </button>
                    {editingVehicle && (
                      <button className="btn btn-secondary w-100" onClick={cancelEditVehicle}>
                        <FaTimes className="me-2" /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Table-like display */}
                <div className="table-responsive mt-3">
                  <table className="table table-striped table-bordered align-middle mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Type</th>
                        <th>Seats</th>
                        <th>Price / Day</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.length > 0 ? (
                        vehicles.map((v) => (
                          <tr key={v.id}>
                            <td>{v.id}</td>
                            <td>{v.minimumSeatCount}-{v.maximumSeatCount}</td>
                            <td>${v.pricePerDay}</td>
                            <td className="d-flex gap-1">
                              <button className="btn btn-primary btn-sm" onClick={() => handleEditVehicle(v)}>
                                <FaEdit />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteVehicle(v.id)}>
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center text-muted">
                            No vehicles added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Accommodations */}
          <div className="col-lg-6">
            <div className="card shadow-sm">
              <div className="card-header bg-dark text-white">
                <h5 className="mb-0">Accommodations</h5>
              </div>
              <div className="card-body">
                {/* Form */}
                <div className="mb-3 row g-2">
                  <div className="col-12">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Accommodation Type (ID)"
                      value={newAccommodation.id}
                      onChange={(e) =>
                        setNewAccommodation((prev) => ({ ...prev, id: e.target.value }))
                      }
                      disabled={editingAccommodation}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Guest Count"
                      value={newAccommodation.guestCount}
                      onChange={(e) =>
                        setNewAccommodation((prev) => ({ ...prev, guestCount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Price / Day"
                      value={newAccommodation.additionalPricePerDay}
                      onChange={(e) =>
                        setNewAccommodation((prev) => ({ ...prev, additionalPricePerDay: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 d-flex gap-2 mt-2">
                    <button className="btn btn-success w-100" onClick={handleAddOrUpdateAccommodation}>
                      <FaPlus className="me-2" /> {editingAccommodation ? "Update" : "Add"}
                    </button>
                    {editingAccommodation && (
                      <button className="btn btn-secondary w-100" onClick={cancelEditAccommodation}>
                        <FaTimes className="me-2" /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Table-like display */}
                <div className="table-responsive mt-3">
                  <table className="table table-striped table-bordered align-middle mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Type</th>
                        <th>Guests</th>
                        <th>Price / Day</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accommodations.length > 0 ? (
                        accommodations.map((a) => (
                          <tr key={a.id}>
                            <td>{a.id}</td>
                            <td>{a.guestCount}</td>
                            <td>${a.additionalPricePerDay}</td>
                            <td className="d-flex gap-1">
                              <button className="btn btn-primary btn-sm" onClick={() => handleEditAccommodation(a)}>
                                <FaEdit />
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAccommodation(a.id)}>
                                <FaTrash />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center text-muted">
                            No accommodations added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}