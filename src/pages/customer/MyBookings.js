// src/pages/customer/MyBookings.js
import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Tabs,
  Tab,
  Spinner,
  Button,
  Form,
  Row,
  Col,
  Modal,
  Accordion,
  Card,
} from "react-bootstrap";
import CustomInvoiceRenderer from "../../components/renderers/CustomInvoiceRenderer";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function MyBookings() {
  const [loading, setLoading] = useState(true);

  const [unpaidPreset, setUnpaidPreset] = useState([]);
  const [paidPreset, setPaidPreset] = useState([]);
  const [confirmedPreset, setConfirmedPreset] = useState([]);
  const [completedPreset, setCompletedPreset] = useState([]);

  const [unpaidCustom, setUnpaidCustom] = useState([]);
  const [paidCustom, setPaidCustom] = useState([]);
  const [confirmedCustom, setConfirmedCustom] = useState([]);
  const [completedCustom, setCompletedCustom] = useState([]);

  const [unpaidVehicle, setUnpaidVehicle] = useState([]);
  const [paidVehicle, setPaidVehicle] = useState([]);
  const [confirmedVehicle, setConfirmedVehicle] = useState([]);
  const [completedVehicle, setCompletedVehicle] = useState([]);

  const [filterDate, setFilterDate] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [newArrivalDate, setNewArrivalDate] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBooking, setDeleteBooking] = useState(null);
  const [deleteCollection, setDeleteCollection] = useState("");

  const [paymentStates, setPaymentStates] = useState({});
  const authInstance = getAuth();

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackBooking, setFeedbackBooking] = useState(null);
  const [starCount, setStarCount] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const fetchBookings = async () => {
    if (!authInstance.currentUser) return;
    setLoading(true);
    try {
      const email = authInstance.currentUser.email;

      const fetchCollection = async (collectionName) => {
        const q = query(collection(db, collectionName), where("customerEmail", "==", email));
        const snap = await getDocs(q);
        let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const dateA = new Date(a.travelers?.arrivalDate || a.arrivalDate || 0);
          const dateB = new Date(b.travelers?.arrivalDate || b.arrivalDate || 0);
          return dateA - dateB;
        });
        return data;
      };

      // Preset bookings
      setUnpaidPreset(await fetchCollection("unpaidPresetBookings"));
      setPaidPreset(await fetchCollection("paidPresetBookings"));
      setConfirmedPreset(await fetchCollection("confirmedPresetBookings"));
      setCompletedPreset(await fetchCollection("completedPresetBookings"));

      // Custom bookings
      setUnpaidCustom(await fetchCollection("unpaidCustomBookings"));
      setPaidCustom(await fetchCollection("paidCustomBookings"));
      setConfirmedCustom(await fetchCollection("confirmedCustomBookings"));
      setCompletedCustom(await fetchCollection("completedCustomBookings"));

      // Vehicle bookings
      setUnpaidVehicle(await fetchCollection("unpaidVehicleBookings"));
      setPaidVehicle(await fetchCollection("paidVehicleBookings"));
      setConfirmedVehicle(await fetchCollection("confirmedVehicleBookings"));
      setCompletedVehicle(await fetchCollection("completedVehicleBookings"));
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        fetchBookings();
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const filterByDate = (bookings) => {
    if (!filterDate) return bookings;
    return bookings.filter(
      (b) =>
        (b.travelers?.arrivalDate || b.arrivalDate) &&
        new Date(b.travelers?.arrivalDate || b.arrivalDate)
          .toISOString()
          .startsWith(filterDate)
    );
  };

  const handleDeleteUnpaid = async (bookingId, collectionName) => {
    if (!window.confirm("Are you sure you want to delete this unpaid booking?")) return;
    try {
      await deleteDoc(doc(db, collectionName, bookingId));
      alert("Booking deleted successfully.");
      fetchBookings();
    } catch (err) {
      console.error("Error deleting booking:", err);
      alert("Failed to delete booking.");
    }
  };

  const handleEditPaid = (booking) => {
    setEditBooking(booking);
    setNewArrivalDate(booking.travelers?.arrivalDate || booking.arrivalDate || "");
    setShowEditModal(true);
  };

  const saveEditArrivalDate = async () => {
    if (!editBooking) return;
    try {
      const bookingRef = doc(db, editBooking.collection || "paidPresetBookings", editBooking.id);
      await updateDoc(bookingRef, { "travelers.arrivalDate": newArrivalDate });
      alert("Arrival date updated successfully.");
      setShowEditModal(false);
      setEditBooking(null);
      fetchBookings();
    } catch (err) {
      console.error("Error updating arrival date:", err);
      alert("Failed to update arrival date.");
    }
  };

  const handleDeletePaid = (booking, collectionName) => {
  if (!booking || !collectionName) return;
  setDeleteBooking(booking);
  setDeleteCollection(collectionName);
  setShowDeleteModal(true);
};

const confirmDeletePaid = async () => {
  if (!deleteBooking || !deleteCollection) return;

  try {
    // Check if a pending request already exists
    const q = query(
      collection(db, "deletionRequests"),
      where("bookingId", "==", deleteBooking.id),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("A pending deletion request already exists for this booking.");
      setShowDeleteModal(false);
      setDeleteBooking(null);
      return;
    }

    // Always use the currently logged-in user's email
    await addDoc(collection(db, "deletionRequests"), {
      bookingId: deleteBooking.id,
      collection: deleteCollection,
      customerEmail: authInstance.currentUser.email, // ✅ current user
      status: "pending",
      requestedAt: serverTimestamp(),
    });

    alert("Deletion request sent to admin.");
    setShowDeleteModal(false);
    setDeleteBooking(null);
    setDeleteCollection("");
    fetchBookings();
  } catch (err) {
    console.error("Error sending deletion request:", err);
    alert("❌ Failed to request deletion. Check console for details.");
  }
};




  const handleConfirmPayment = async (booking, collectionName) => {
    const state = paymentStates[booking.id];
    if (!state) return;
    const { method, file } = state;

    if (method === "Bank Transfer" && !file) {
      return alert("Please upload a receipt for Bank Transfer.");
    }

    setPaymentStates((prev) => ({ ...prev, [booking.id]: { ...prev[booking.id], saving: true } }));

    try {
      let receiptURL = null;
      if (method === "Bank Transfer") {
        const storageRef = ref(storage, `paymentReceipts/${authInstance.currentUser.email}/${booking.id}_${file.name}`);
        await uploadBytes(storageRef, file);
        receiptURL = await getDownloadURL(storageRef);
      }

      const paidCollectionName = collectionName.replace("unpaid", "paid");
      const paidBookingRef = doc(db, paidCollectionName, booking.id);

      await setDoc(paidBookingRef, {
        ...booking,
        paymentMethod: method,
        receiptURL,
        paidAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, collectionName, booking.id));

      alert("✅ Payment successful!");
      fetchBookings();
    } catch (err) {
      console.error("Payment error:", err);
      alert("❌ Failed to confirm payment. Try again.");
    } finally {
      setPaymentStates((prev) => ({ ...prev, [booking.id]: { method: "Credit Card", file: null, saving: false } }));
    }
  };

  const handleOpenFeedback = (booking) => {
    setFeedbackBooking(booking);
    setStarCount(0);
    setReviewText("");
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackBooking) return;
    try {
      await addDoc(collection(db, "reviews"), {
        customerName: feedbackBooking.customerName || "Anonymous",
        customerEmail: authInstance.currentUser.email,
        starCount,
        bookingId: feedbackBooking.id,
        review: reviewText,
        createdAt: serverTimestamp(),
      });
      alert("✅ Feedback submitted successfully!");
      setShowFeedbackModal(false);
    } catch (err) {
      console.error("Feedback submission error:", err);
      alert("❌ Failed to submit feedback.");
    }
  };

  const renderAccordion = (bookings, status, collectionName) => {
    const filtered = filterByDate(bookings);
    if (!filtered.length) return <p className="text-muted text-center">No {status} bookings.</p>;

    return (
      <Accordion defaultActiveKey="">
        {filtered.map((b) => {
          const state = paymentStates[b.id] || { method: "Credit Card", file: null, saving: false };
          const arrivalDisplay = b.travelers?.arrivalDate || b.arrivalDate || b.arrival || "N/A";
          const headerText = `Name: ${b.customerName || "N/A"} | Arrival: ${arrivalDisplay ? formatDate(arrivalDisplay) : "N/A"} | Booking ID: ${b.bookingId || b.id} | Tour: ${b.tourTitle || "N/A"} | Price: ${b.totalPrice ? "$" + b.totalPrice : "N/A"}`;

          return (
            <Accordion.Item eventKey={b.id} key={b.id}>
              <Accordion.Header>{headerText}</Accordion.Header>
              <Accordion.Body>
                <CustomInvoiceRenderer summaryTable={b.summaryTable || []} bookingId={b.id} />

                {status === "Unpaid" && (
                  <Card className="mt-3 p-3 shadow-sm">
                    <h6 className="fw-semibold mb-2">Payment Method</h6>
                    <Form.Check type="radio" label="Credit Card" name={`paymentMethod-${b.id}`} value="Credit Card"
                      checked={state.method === "Credit Card"}
                      onChange={() => setPaymentStates(prev => ({ ...prev, [b.id]: { ...prev[b.id], method: "Credit Card" } }))}
                      disabled={state.saving} />
                    <Form.Check type="radio" label="Bank Transfer" name={`paymentMethod-${b.id}`} value="Bank Transfer"
                      checked={state.method === "Bank Transfer"}
                      onChange={() => setPaymentStates(prev => ({ ...prev, [b.id]: { ...prev[b.id], method: "Bank Transfer" } }))}
                      disabled={state.saving} />
                    {state.method === "Bank Transfer" && (
                      <Form.Group className="mt-2">
                        <Form.Label>Upload Bank Transfer Receipt</Form.Label>
                        <Form.Control type="file" accept="image/*,application/pdf"
                          onChange={(e) => setPaymentStates(prev => ({ ...prev, [b.id]: { ...prev[b.id], file: e.target.files[0] } }))}
                          disabled={state.saving} />
                      </Form.Group>
                    )}
                    <div className="d-flex justify-content-end mt-2">
                      <Button size="sm" variant="success" onClick={() => handleConfirmPayment(b, collectionName)} disabled={state.saving}>
                        {state.saving ? "Processing..." : "Confirm & Pay"}
                      </Button>
                    </div>
                  </Card>
                )}

                <div className="mt-3">
                  {status === "Unpaid" && <Button size="sm" variant="danger" onClick={() => handleDeleteUnpaid(b.id, collectionName)}>Delete Booking</Button>}
                  {status === "Paid" && <>
                    <Button size="sm" variant="warning" className="me-2" onClick={() => handleEditPaid({ ...b, collection: collectionName })}>Edit Arrival</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeletePaid(b, collectionName)}>Request Delete</Button>
                  </>}
                  {status === "Completed" && <Button size="sm" variant="info" className="mt-2" onClick={() => handleOpenFeedback(b)}>Give Feedback</Button>}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
    );
  };

  return (
    <div>
      <h2>My Bookings</h2>
      {loading && <div className="text-center my-3"><Spinner animation="border" /></div>}

      <Form className="mb-3">
        <Row className="align-items-center">
          <Col xs="auto"><Form.Label>Filter by Arrival Date:</Form.Label></Col>
          <Col xs="auto"><Form.Control type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></Col>
          <Col xs="auto"><Button variant="secondary" onClick={() => setFilterDate("")}>Clear</Button></Col>
        </Row>
      </Form>

      <Tabs defaultActiveKey="preset" className="mt-3">
        {/* Preset */}
        <Tab eventKey="preset" title="Preset Bookings">
          <Tabs defaultActiveKey="unpaid" className="mt-3">
            <Tab eventKey="unpaid" title="Unpaid">{renderAccordion(unpaidPreset, "Unpaid", "unpaidPresetBookings")}</Tab>
            <Tab eventKey="paid" title="Paid">{renderAccordion(paidPreset, "Paid", "paidPresetBookings")}</Tab>
            <Tab eventKey="confirmed" title="Confirmed">{renderAccordion(confirmedPreset, "Confirmed", "confirmedPresetBookings")}</Tab>
            <Tab eventKey="completed" title="Completed">{renderAccordion(completedPreset, "Completed", "completedPresetBookings")}</Tab>
          </Tabs>
        </Tab>

        {/* Custom */}
        <Tab eventKey="custom" title="Custom Bookings">
          <Tabs defaultActiveKey="unpaid" className="mt-3">
            <Tab eventKey="unpaid" title="Unpaid">{renderAccordion(unpaidCustom, "Unpaid", "unpaidCustomBookings")}</Tab>
            <Tab eventKey="paid" title="Paid">{renderAccordion(paidCustom, "Paid", "paidCustomBookings")}</Tab>
            <Tab eventKey="confirmed" title="Confirmed">{renderAccordion(confirmedCustom, "Confirmed", "confirmedCustomBookings")}</Tab>
            <Tab eventKey="completed" title="Completed">{renderAccordion(completedCustom, "Completed", "completedCustomBookings")}</Tab>
          </Tabs>
        </Tab>

        {/* Vehicle */}
        <Tab eventKey="vehicle" title="Vehicle Bookings">
          <Tabs defaultActiveKey="unpaid" className="mt-3">
            <Tab eventKey="unpaid" title="Unpaid">{renderAccordion(unpaidVehicle, "Unpaid", "unpaidVehicleBookings")}</Tab>
            <Tab eventKey="paid" title="Paid">{renderAccordion(paidVehicle, "Paid", "paidVehicleBookings")}</Tab>
            <Tab eventKey="confirmed" title="Confirmed">{renderAccordion(confirmedVehicle, "Confirmed", "confirmedVehicleBookings")}</Tab>
            <Tab eventKey="completed" title="Completed">{renderAccordion(completedVehicle, "Completed", "completedVehicleBookings")}</Tab>
          </Tabs>
        </Tab>
      </Tabs>

      {/* Edit Arrival Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton><Modal.Title>Edit Arrival Date</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Arrival Date</Form.Label>
            <Form.Control type="date" value={newArrivalDate?.split("T")[0] || ""} onChange={e => setNewArrivalDate(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEditArrivalDate}>Save</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Request Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton><Modal.Title>Request Booking Deletion</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>You're requesting deletion for booking <strong>{deleteBooking?.bookingId || deleteBooking?.id}</strong>.</p>
          <p>If you confirm, an admin will review the request. If approved the booking will be permanently deleted — if rejected it will remain unchanged.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeletePaid}>Send Deletion Request</Button>
        </Modal.Footer>
      </Modal>

      {/* Feedback Modal */}
      <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)}>
        <Modal.Header closeButton><Modal.Title>Give Feedback</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <Form.Label>Star Rating</Form.Label>
            <div>{[1,2,3,4,5].map(star => (
              <Button key={star} variant={star <= starCount ? "warning" : "secondary"} className="me-1" onClick={() => setStarCount(star)}>★</Button>
            ))}</div>
          </div>
          <Form.Group>
            <Form.Label>Review</Form.Label>
            <Form.Control as="textarea" rows={3} value={reviewText} onChange={e => setReviewText(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmitFeedback}>Submit Feedback</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
