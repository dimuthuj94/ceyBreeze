// src/components/CustomInvoiceRenderer.js
import React, { useEffect, useState } from "react";
import { Card, ListGroup, Spinner } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function CustomInvoiceRenderer({ bookingId, summaryTable }) {
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ If summaryTable is already passed, no need to fetch
    if (summaryTable && summaryTable.length > 0) {
      setBookingData({ bookingId: bookingId || "Custom Booking", summaryTable });
      setLoading(false);
      return;
    }

    if (!bookingId) {
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      setLoading(true);
      try {
        // Try unpaid first
        const docRef = doc(db, "unpaidCustomBookings", bookingId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBookingData(docSnap.data());
        } else {
          // Try paid as fallback
          const paidRef = doc(db, "paidCustomBookings", bookingId);
          const paidSnap = await getDoc(paidRef);
          if (paidSnap.exists()) setBookingData(paidSnap.data());
          else setBookingData(null);
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setBookingData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, summaryTable]);

  const renderValue = (val) => {
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && val !== null)
      return Object.entries(val)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
          if (typeof v === "object" && v !== null) return `${k}: ${JSON.stringify(v)}`;
          return `${k}: ${v}`;
        })
        .join(" | ");
    return val;
  };

  const renderSummary = (summaryTable) => {
    return summaryTable.map((section, idx) => {
      const key = Object.keys(section)[0];
      const content = section[key];

      if (!content) return null;

      return (
        <Card key={idx} className="mb-2">
          <Card.Header className="fw-semibold bg-secondary text-white">{key}</Card.Header>
          <Card.Body>
            {typeof content === "object" && !Array.isArray(content) ? (
              Object.entries(content).map(([label, val], i) => (
                <div key={i} className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">{label}</span>
                  <span>{renderValue(val)}</span>
                </div>
              ))
            ) : Array.isArray(content) ? (
              <ListGroup variant="flush">
                {content.map((item, i) => (
                  <ListGroup.Item key={i}>{renderValue(item)}</ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div>{renderValue(content)}</div>
            )}
          </Card.Body>
        </Card>
      );
    });
  };

  if (loading)
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
        <p className="mt-2">Loading invoice...</p>
      </div>
    );

  if (!bookingData) return <p className="text-muted">Booking data not found.</p>;

  return (
    <div>
      <h6 className="fw-semibold mb-3">
        Invoice — {bookingData.bookingId || bookingId}
      </h6>
      {bookingData.summaryTable && bookingData.summaryTable.length > 0 ? (
        renderSummary(bookingData.summaryTable)
      ) : (
        <p className="text-muted">No summary details available.</p>
      )}
    </div>
  );
}
