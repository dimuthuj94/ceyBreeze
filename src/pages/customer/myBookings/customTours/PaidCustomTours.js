// src/pages/customer/myBookings/customTours/PaidCustomTours.js
import React from "react";
import { Accordion } from "react-bootstrap";
import CustomInvoiceRenderer from "../../../../components/renderers/CustomInvoiceRenderer";

export default function PaidCustomTours({ data }) {
  if (!data.length) return <p className="text-muted text-center">No paid custom tours.</p>;

  return (
    <Accordion defaultActiveKey="">
      {data.map((b) => (
        <Accordion.Item eventKey={b.id} key={b.id}>
          <Accordion.Header>
            {`Name: ${b.customerName || "N/A"} | Booking ID: ${b.id} | Tour: ${b.tourTitle || "N/A"}`}
          </Accordion.Header>
          <Accordion.Body>
            <CustomInvoiceRenderer summaryTable={b.summaryTable || []} bookingId={b.id} />
            {/* Add buttons or payment forms if needed */}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
