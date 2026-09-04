// src/pages/customer/myBookings/presetTours/PaidPresetTours.js
import React, { useEffect, useState } from "react";
import { Accordion, Card, Spinner, Button, Form } from "react-bootstrap";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../firebase";
import { getAuth } from "firebase/auth";
import PresetBookedTourInvoiceModal from "../../../../components/modals/bookings/PresetBookedTourInvoiceModal";
import TermsAndConditionsModal from "../../../../components/modals/TermsAndConditionsModal";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";

export default function PaidPresetTours() {
  const [paidBookings, setPaidBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [paymentAmount, setPaymentAmount] = useState("full");
  const [paymentAmountValue, setPaymentAmountValue] = useState(0);
  const [receiptFile, setReceiptFile] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({  title: "",  body: "",  variant: "success", });

  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

   useEffect(() => {
      if (!user) return;
  
      setLoading(true);
      const q = query(
        collection(db, "paidPresetBookings"),
        where("customerEmail", "==", user.email)
      );
  
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setPaidBookings(list);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching paid bookings:", err);
          setLoading(false);
        }
      );
  
      return () => unsubscribe();
    }, [user]);
  
    useEffect(() => {
    if (!user) return;
  
    setLoading(true);
    const q = query(
      collection(db, "paidPresetBookings"),
      where("customerEmail", "==", user.email)
    );
  
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPaidBookings(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching paid bookings:", err);
        setLoading(false);
      }
    );
  
    return () => unsubscribe();
  }, [user]);
  
  // 🔹 Add this right below the above useEffect
  useEffect(() => {
    const fetchBankDetails = async () => {
      try {
        const docRef = doc(db, "invoiceTermsAndConditions", "BankDetails");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBankDetails(docSnap.data());
        } else {
          console.warn("No BankDetails document found in Firestore.");
        }
      } catch (error) {
        console.error("Error fetching bank details:", error);
      }
    };
  
    fetchBankDetails();
  }, []);
  
  
    const handleConfirmPayment = async () => {
      if (!selectedBooking) return alert("Please select a booking.");
      if (paymentMethod === "Bank Transfer" && !receiptFile)
        return alert("Please upload a receipt for Bank Transfer.");
  
      setSaving(true);
  
      // ✅ Calculate payment details
      const paidAmount =
        selectedBooking?.paymentAmountValue ||
        selectedBooking?.totalPrice ||
        0;
  
      const paymentType =
        selectedBooking?.paymentAmount === "half"
          ? "50% Advance"
          : "Full Payment";
  
      let receiptURL = null;
  
      try {
        if (paymentMethod === "Bank Transfer") {
          const storageRef = ref(
            storage,
            `paymentReceipts/${user.email}/${selectedBooking.id}_${receiptFile.name}`
          );
          await uploadBytes(storageRef, receiptFile);
          receiptURL = await getDownloadURL(storageRef);
        }
  
        const paidBookingRef = doc(db, "paidPresetBookings", selectedBooking.id);
        await setDoc(paidBookingRef, {
          ...selectedBooking,
          paymentMethod,
          receiptURL,
          paidAt: new Date(),
          paymentType,
          paidAmount,
        });
  
        await deleteDoc(doc(db, "paidPresetBookings", selectedBooking.id));
  
        alert("✅ Payment successful!");
        setSelectedBooking(null);
        setReceiptFile(null);
        setPaymentMethod("Credit Card");
      } catch (err) {
        console.error("Payment error:", err);
        alert("❌ Failed to confirm payment. Try again.");
      } finally {
        setSaving(false);
      }
    };
  const handleDeleteBooking = async () => {
  if (!bookingToDelete) return;
  try {
    await deleteDoc(doc(db, "paidPresetBookings", bookingToDelete.id));

    setPaidBookings((prev) =>
      prev.filter((b) => b.id !== bookingToDelete.id)
    );

    setBookingToDelete(null);
    setShowDeleteModal(false);

    // ✅ Show success modal
    setMessageModalContent({
      title: "Booking Deleted",
      body: "✅ The booking was deleted successfully!",
      variant: "success",
    });
    setShowMessageModal(true);
  } catch (err) {
    console.error("Error deleting booking:", err);

    // ❌ Show error modal
    setMessageModalContent({
      title: "Delete Failed",
      body: "❌ Failed to delete booking. Please try again.",
      variant: "danger",
    });
    setShowMessageModal(true);
  }
};

    const canConfirm = selectedBooking && paymentMethod === "Bank Transfer" && receiptFile;
  
    return (
      <div style={{  maxWidth: "800px",  margin: "0 auto", position:"relative", padding: "20px", color:"#00276b"}}>
        
        {/* Paid Bookings */}
        <h5 className="mt-4 mb-3">SELECT BOOKING TO VIEW</h5>
        {loading ? (
          <Spinner animation="border" size="sm" />
        ) : paidBookings.length === 0 ? (
          <p className="text-muted">No paid bookings found.</p>
        ) : (
          <Accordion flush>
            {paidBookings.map((b, idx) => {
              const createdDate = b.createdAt?.toDate
                ? b.createdAt.toDate().toLocaleString()
                : b.createdAt || "N/A";
  
              return (
                <Accordion.Item
                  eventKey={idx.toString()}
                  key={b.id}
                  onClick={() => !saving && setSelectedBooking(b)}
                >
                  <Accordion.Header>
    <div className="w-100">
      {/* ✅ Line 1 — Tour + Price */}
      <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small mb-2">
        <div className="me-3 mb-1">
          <strong>Booking Reference:</strong>{" "}
          <span className="text-secondary">
            {b.bookingReference || "N/A"}
          </span>
        </div>
  
        <div className="mb-1">
          <strong>Booked On:</strong>{" "}
          <span>
            {b.bookedDateTime?.toDate
              ? b.bookedDateTime.toDate().toLocaleString()
              : b.bookedDateTime || "N/A"}
          </span>
        </div>
  
  
        
      </div>
  
      {/* ✅ Line 2 — Booking details */}
      <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small">
        <div className="me-3 mb-1">
          <strong>Tour:</strong>{" "}
          <span className="text-secondary">
            {b["Tour Info"]?.Tour || "N/A"}
          </span>{" "}
          <span className="text-secondary small">
            ({b["Tour Info"]?.Nights || 0} nights)
          </span>
        </div>
  
        <div className="me-3 mb-1">
          <strong>Arrival Date:</strong>{" "}
          <span className="text-secondary">
            {b["Travelers"]?.["Arrival Date"] || "N/A"}
          </span>
        </div>
  
        <div className="mb-1">
          <strong>Total Price:</strong>{" "}
          <span className="text-success fw-semibold">
            {b["Pricing Summary"]?.["Total Price"] || "$0"}
          </span>
        </div>
      </div>
    </div>
  </Accordion.Header>
  
  
  
  
  
                  <Accordion.Body>
                    {selectedBooking?.id === b.id && (
                      <>
                        {(b.sectionOrder || [
                          "Tour Info",
                          "Travelers",
                          "Accommodation",
                          "Transport Options",
                          "Tour Inclusions",
                          "Daily Plan & Destinations",
                          "Meals & Notes",
                          "Pricing Summary",
                        ]).map((section) => {
                          const content = b[section];
                          if (!content) return null;
  
                         const renderSection = () => {
    // ✅ Daily Plan & Destinations
    if (section === "Daily Plan & Destinations") {
      const hasDailyPlan =
        Array.isArray(content["🗓️ Daily Plan"]) && content["🗓️ Daily Plan"].length > 0;
      const hasDestinations =
        Array.isArray(content["🗺️ Destinations"]) && content["🗺️ Destinations"].length > 0;
      const hasActivities =
        Array.isArray(content["🎯 Activities Planned"]) &&
        content["🎯 Activities Planned"].length > 0;
  
      if (!hasDailyPlan && !hasDestinations && !hasActivities) return null; // 👈 skip empty section
  
      return (
        <>
          {hasDailyPlan && (
            <>
              <h6 className="fw-semibold mt-2">Daily Plan</h6>
              <ul>
                {content["🗓️ Daily Plan"].map((day, i) => (
                  <li key={i}>{day}</li>
                ))}
              </ul>
            </>
          )}
  
          {hasDestinations && (
            <>
              <h6 className="fw-semibold mt-3">Destinations</h6>
              {content["🗺️ Destinations"].map((d, i) => (
                <div key={i} className="mb-2">
                  {d.city} - 
                  <ul className="mb-0">
                    {d.destinations?.map((place, j) => (
                      <li key={j}>{place}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
  
          {hasActivities && (
            <>
              <h6 className="fw-semibold mt-3">Activities Planned</h6>
              <ul>
                {content["🎯 Activities Planned"].map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </>
          )}
        </>
      );
    }
  // ✅ Meals & Notes
  if (section === "Meals & Notes") {
    const meal = content["Meal Preference"];
    const notes = content["Tour Notes"];
  
    // Only show meal if it's not empty or "N/A"
    const showMeal = meal && meal.trim() !== "" && meal !== "N/A";
  
    // If notes is a string, split by newlines to make a list
    const notesList =
      typeof notes === "string"
        ? notes
            .split(/\r?\n/)
            .map((n) => n.trim())
            .filter((n) => n !== "" && n !== "N/A")
        : [];
  
    // If nothing to show, return null to skip entire section
    if (!showMeal && notesList.length === 0) return null;
  
    return (
      <div>
        {showMeal && (
          <p>
            <strong>Meal Preference:</strong>{" "}
            <span className="float-end fw-semibold">{meal}</span>
          </p>
        )}
  
        {notesList.length > 0 && (
          <div className="mt-2">
            <strong>Tour Notes:</strong>
            <ul className="mb-0 ps-3">
              {notesList.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  
  
    // ✅ Travelers
    if (section === "Travelers") {
      const order = [
        "Full Name",
        "Arrival Date",
        "Arrival Airport",
        "Adults",
        "Children",
        "Infants",
        "Tour Guide",
        "Child Car Seat",
      ];
      const filled = order.filter((k) => content[k]);
      if (filled.length === 0) return null; // 👈 skip empty section
      return (
        <ul className="mb-0">
          {filled.map((key) => (
            <li key={key}>
              <strong>{key}:</strong>{" "}
              <span className="float-end fw-semibold">{content[key]}</span>
            </li>
          ))}
        </ul>
      );
    }
  
    // ✅ Accommodation
  if (section === "Accommodation") {
    const hasType =
      content.Type != null &&
      content.Type.toString().trim() !== "" &&
      content.Type !== "0" &&
      content.Type !== "$0";
  
    const hasLuxuryRooms =
      Array.isArray(content["Luxury Rooms"]) &&
      content["Luxury Rooms"].some(
        (room) =>
          (room.label && room.label.toString().trim() !== "") ||
          (room.price &&
            room.price.toString().trim() !== "" &&
            room.price !== 0 &&
            room.price !== "$0")
      );
  
    const hasLuxuryTotal =
      content["Luxury Rooms Total"] != null &&
      content["Luxury Rooms Total"].toString().trim() !== "" &&
      content["Luxury Rooms Total"] !== 0 &&
      content["Luxury Rooms Total"] !== "$0";
  
    // Skip entire Accommodation section if nothing to show
    if (!hasType && !hasLuxuryRooms && !hasLuxuryTotal) return null;
  
    return (
      <>
        {hasType && (
          <p>
            <strong>Type:</strong>{" "}
            <span className="float-end fw-semibold">{content.Type}</span>
          </p>
        )}
  
        {hasLuxuryRooms && (
          <>
            <h6 className="fw-semibold mt-2">Luxury Rooms</h6>
            <ul>
              {content["Luxury Rooms"].map((room, i) => {
                if (
                  (!room.label || room.label.toString().trim() === "") &&
                  (!room.price ||
                    room.price.toString().trim() === "" ||
                    room.price === 0 ||
                    room.price === "$0")
                )
                  return null;
  
                return (
                  <li key={i}>
                    {room.label}
                    <span className="float-end fw-semibold">{room.price}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
  
        {hasLuxuryTotal && (
          <p className="fw-semibold">
            Luxury Rooms Total:
            <span className="float-end">{content["Luxury Rooms Total"]}</span>
          </p>
        )}
      </>
    );
  }
  
  
    // ✅ Pricing Summary
    if (section === "Pricing Summary") {
      const pricing = content;
      const hasPricing =
        pricing &&
        Object.values(pricing).some(
          (v) =>
            v !== null &&
            v !== undefined &&
            v !== "" &&
            !(Array.isArray(v) && v.length === 0) &&
            !(typeof v === "object" && Object.keys(v).length === 0)
        );
      if (!hasPricing) return null; // 👈 skip empty Pricing Summary
  
      return (
        <>
          {pricing.Travelers && (
            <p>
              <strong>Travelers:</strong>{" "}
              <span className="float-end fw-semibold">{pricing.Travelers}</span>
            </p>
          )}
          {pricing.Nights && (
            <p>
              <strong>Nights:</strong>{" "}
              <span className="float-end fw-semibold">{pricing.Nights}</span>
            </p>
          )}
  
          {pricing["Tour Price"] && (
            <>
              <h6 className="fw-semibold mt-2">Tour Price:</h6>
              <ul>
                <li>
                  Per Night {pricing["Tour Price"]["Per Day"]}
                  <li>
                    Total{" "}
                    <span className="float-end fw-semibold">
                      {pricing["Tour Price"].Total}
                    </span>
                  </li>
                </li>
              </ul>
            </>
          )}
  
          {pricing["Accommodation"] &&
            Object.keys(pricing["Accommodation"]).length > 0 && (
              <>
                <h6 className="fw-semibold mt-2">Accommodation</h6>
                <ul>
                  {Object.entries(pricing["Accommodation"]).map(([key, value]) => (
                    <li key={key}>
                      <span>{key}:</span>
                      <span className="float-end fw-semibold">{value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
  
         {Array.isArray(pricing["Luxury Rooms"]) &&
    pricing["Luxury Rooms"].filter(
      (room) =>
        room &&
        room.label &&
        room.label.trim() !== "" &&
        room.price &&
        room.price !== "0" &&
        room.price !== "$0"
    ).length > 0 && (
      <>
        <h6 className="fw-semibold mt-2">Luxury Rooms</h6>
        <ul className="mb-2 ps-3" style={{ listStyleType: "disc" }}>
          {pricing["Luxury Rooms"]
            .filter(
              (room) =>
                room &&
                room.label &&
                room.label.trim() !== "" &&
                room.price &&
                room.price !== "0" &&
                room.price !== "$0"
            )
            .map((room, i) => (
              <li key={i}>
                {room.label}
                <span className="float-end fw-semibold">{room.price}</span>
              </li>
            ))}
        </ul>
      </>
    )}
  
  
          {Array.isArray(pricing["Activities"]) &&
    pricing["Activities"].filter(
      (act) =>
        act &&
        act.label &&
        act.label.trim() !== "" &&
        act.price &&
        act.price !== "0" &&
        act.price !== "$0"
    ).length > 0 && (
      <>
        <h6 className="fw-semibold mt-2">Activities</h6>
        <ul className="mb-2 ps-3" style={{ listStyleType: "disc" }}>
          {pricing["Activities"]
            .filter(
              (act) =>
                act &&
                act.label &&
                act.label.trim() !== "" &&
                act.price &&
                act.price !== "0" &&
                act.price !== "$0"
            )
            .map((act, i) => (
              <li key={i}>
                {act.label}
                <span className="float-end fw-semibold">{act.price}</span>
              </li>
            ))}
        </ul>
      </>
    )}
  
  
          {pricing.Transport &&
    pricing.Transport !== "0" &&
    pricing.Transport !== "$0" &&
    pricing.Transport.toString().trim() !== "" && (
      <p className="fw-semibold mb-1">
        Transport:
        <span className="float-end">{pricing.Transport}</span>
      </p>
    )}
  {pricing["Tour Guide"] != null &&
    pricing["Tour Guide"].toString().trim() !== "" &&
    pricing["Tour Guide"] !== 0 &&
    pricing["Tour Guide"] !== "$0" && (
      <p className="fw-semibold mb-1">
        Tour Guide:
        <span className="float-end">{pricing["Tour Guide"]}</span>
      </p>
    )}
  
  
   
          {pricing["Total Price"] && (
            <p className="fw-semibold">
              <strong>Total Price:</strong>
              <span className="float-end">{pricing["Total Price"]}</span>
            </p>
          )}
        </>
      );
    }
  
    // ✅ Generic object section fallback
    if (typeof content === "object" && !Array.isArray(content)) {
      const entries = Object.entries(content).filter(
        ([, value]) =>
          value !== null &&
          value !== undefined &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === "object" && Object.keys(value).length === 0)
      );
  
      if (entries.length === 0) return null; // 👈 skip empty section
  
      return (
        <ul className="mb-0">
          {entries.map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong>{" "}
              <span className="float-end fw-semibold">
                {Array.isArray(value)
                  ? value.join(", ")
                  : typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : value}
              </span>
            </li>
          ))}
        </ul>
      );
    }
  
    // ✅ Generic array fallback
    if (Array.isArray(content)) {
      if (content.length === 0) return null;
      return (
        <ul className="mb-0">
          {content.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
  
    return <p>{content}</p>;
  };
  
   
  
                          return (
                            <Card key={section} className="mb-3 shadow-sm">
                              <Card.Header className="fw-semibold" style={{fontFamily: "LibreFranklin, sans-serif",}}>{section}</Card.Header>
                              <Card.Body style={{fontFamily: "LibreFranklin, sans-serif",}}>{renderSection()}</Card.Body>
                            </Card>
                          );
                        })}
  
                        {/* 🔹 Buttons Container */}
<div
  style={{
    display: "flex",
    justifyContent: "space-between", // one left, one right
    alignItems: "center",
    marginTop: "15px",
    width: "100%",
  }}
>
  {/* 🔹 View Invoice Button (Left) */}
  <Button
    variant="info"
    onClick={() => setShowInvoiceModal(true)}
    disabled={!selectedBooking}
    style={{
      backgroundColor: "#00276b",
      border: "none",
      color: "white",
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 500,
      padding: "6px 18px",
    }}
  >
    View Invoice
  </Button>

  {/* 🔹 View Receipt Button (Left) */}
  <Button
    variant="info"
    onClick={() => setShowInvoiceModal(true)}
    disabled={!selectedBooking}
    style={{
      backgroundColor: "#00276b",
      border: "none",
      color: "white",
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 500,
      padding: "6px 18px",
    }}
  >
    View Receipt
  </Button>

  {/* 🔹 Delete Tour Button (Right) */}
  <Button
    variant="danger"
    onClick={() => {
      setBookingToDelete(selectedBooking);
      setShowDeleteModal(true);
    }}
    disabled={!selectedBooking}
    style={{
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 500,
      padding: "6px 18px",
    }}
  >
    Delete Tour
  </Button>
</div>

  

                          
                      </>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
  
        {saving && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255,255,255,0.8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 fw-semibold">Processing Payment...</p>
          </div>
        )}
   

<>
  <style>
    {`
      .custom-accordion .accordion-button {
        background-color: #00276b !important;
        color: white !important;
        font-family: 'LibreFranklin', sans-serif;
        font-weight: 500;
        border-radius: 8px !important;
      }

      .custom-accordion .accordion-button:not(.collapsed) {
        background-color: #00276b !important;
        color: white !important;
        box-shadow: none !important;
      }

      .custom-accordion .accordion-button::after {
        filter: invert(1); /* makes arrow white */
      }
    `}
  </style>

  {/* 🔹 Informational Notes Accordion */}
  <Accordion defaultActiveKey={null} className="custom-accordion mt-4 shadow-sm rounded-3">
    <Accordion.Item eventKey="0">
      <Accordion.Header>Please Note</Accordion.Header>

      <Accordion.Body
        style={{
          backgroundColor: "#ffffff",
          borderLeft: "5px solid #0d6efd",
          fontFamily: "LibreFranklin, sans-serif",
          fontSize: "0.95rem",
          lineHeight: "1.6",
          color: "#555",
          borderBottomLeftRadius: "8px",
          borderBottomRightRadius: "8px",
        }}
      >
        <ul className="mb-0 ps-3">
          <li>Guests may opt to defer payment at the time of reservation.</li>
          <li>Full payment must be completed within two (2) calendar days from the date of reservation.</li>
          <li>
            The payment interface is accessible via the following path:{" "}
            <strong>/customer dashboard/unpaid tours</strong>.
          </li>
          <li>
            If the guest selects the 50% advance payment option, the remaining balance must be settled upon arrival.
          </li>
          <li>
            In the event that ceyBreeze fails to deliver any of the additional luxury accommodations or activities as
            specified, a full refund corresponding to each unprovided service will be issued at the conclusion of the tour.
          </li>
          <li>For bank transfers, attaching the official payment receipt is mandatory to validate the transaction.</li>
          <li>All pricing information is transparently presented in the designated pricing section.</li>
          <li>There are no hidden fees or undisclosed charges associated with the booking.</li>
        </ul>
      </Accordion.Body>
    </Accordion.Item>
  </Accordion>
</>

        
  
        {selectedBooking && (
    <PresetBookedTourInvoiceModal
      show={showInvoiceModal}
      onHide={() => setShowInvoiceModal(false)}
      selectedBooking={selectedBooking}
      b={selectedBooking}   // 👈 this must be here
      paymentMethod={paymentMethod}
      saving={saving}
      canConfirm={canConfirm}
      setReceiptFile={setReceiptFile}
      handleConfirmPayment={handleConfirmPayment}
    />
  
  
    
  )}
  {selectedBooking && (
    <TermsAndConditionsModal
      show={showTermsModal}
      onHide={() => setShowTermsModal(false)}
      onConfirm={handleConfirmPayment} // only triggers after agreeing
    />
  )}

<style>
{`
  @font-face {
    font-family: 'LibreFranklin';
    src: url('/fonts/LibreFranklin-VariableFont_wght.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
  }
`}
</style>

<Modal
  show={showDeleteModal}
  onHide={() => setShowDeleteModal(false)}
  centered
>
  {/* 🔹 Header */}
  <Modal.Header
    closeButton
    style={{
      backgroundColor: "#00276b",
      color: "white",
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 400,
      padding: "8px 16px", // thinner header
    }}
  >
    <Modal.Title
      style={{
        color: "white",
        fontFamily: "LibreFranklin, sans-serif",
        fontWeight: 400,
        letterSpacing: "0.5px",
      }}
    >
      Confirm Delete
    </Modal.Title>
  </Modal.Header>

  {/* 🔹 Body */}
  <Modal.Body
    style={{
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 300,
      fontSize: "16px",
      color: "#333",
      padding: "15px 20px",
    }}
  >
    Are you sure you want to delete this tour booking? This action cannot be undone.
  </Modal.Body>

  {/* 🔹 Footer */}
  <Modal.Footer
    style={{
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 400,
      padding: "8px 16px", // thinner footer
      display: "flex",
      justifyContent: "flex-end",
      
    }}
  >
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setShowDeleteModal(false)}
    >
      Cancel
    </Button>
    <Button
      variant="danger"
      size="sm"
      onClick={handleDeleteBooking}
    >
      Delete
    </Button>
  </Modal.Footer>
</Modal>




<style>
{`
  @font-face {
    font-family: 'LibreFranklin';
    src: url('/fonts/LibreFranklin-VariableFont_wght.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
  }
`}
</style>

<style>
{`
  @font-face {
    font-family: 'LibreFranklin';
    src: url('/fonts/LibreFranklin-VariableFont_wght.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
  }
`}
</style>

<Modal
  show={showMessageModal}
  onHide={() => setShowMessageModal(false)}
  centered
>
  {/* 🔹 Header */}
  <Modal.Header
    closeButton
    style={{
      backgroundColor: "#00276b",
      color: "white",
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 400,
      padding: "8px 16px",
      borderBottom: "1px solid #dee2e6",
    }}
  >
    <Modal.Title
      style={{
        color: "white",
        fontFamily: "LibreFranklin, sans-serif",
        fontWeight: 400,
        letterSpacing: "0.5px",
      }}
    >
      {messageModalContent.title}
    </Modal.Title>
  </Modal.Header>

  {/* 🔹 Body */}
  <Modal.Body
    style={{
      backgroundColor: "#ffffff",
      color:
        messageModalContent.variant === "success" ? "#155724" : "#721c24",
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 400,
      fontSize: "16px",
      padding: "15px 20px",
    }}
  >
    {messageModalContent.body}
  </Modal.Body>

  {/* 🔹 Footer */}
  <Modal.Footer
    style={{
      backgroundColor: "#ffffff",
      fontFamily: "LibreFranklin, sans-serif",
      fontWeight: 400,
      padding: "8px 16px",
      borderTop: "1px solid #dee2e6",
      justifyContent: "flex-end", // 👈 align button to the right
    }}
  >
    <Button
      variant={
        messageModalContent.variant === "success" ? "success" : "danger"
      }
      size="sm"
      onClick={() => setShowMessageModal(false)}
      style={{
        fontFamily: "LibreFranklin, sans-serif",
        fontWeight: 500,
        minWidth: "80px",
      }}
    >
      OK
    </Button>
  </Modal.Footer>
</Modal>



  
      </div>
    );
  }
  