// src/components/modals/BookedModal.js
import React, { useRef } from "react";
import { Modal, Button, Table } from "react-bootstrap";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function BookedModal({ show, onClose, booking, collection }) {
  const modalRef = useRef();

  if (!booking) return null;

  const handleExportPDF = async () => {
    const input = modalRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`booking_${booking.id}.pdf`);
  };

  const renderObject = (obj) =>
    obj
      ? Object.entries(obj).map(([key, value]) => (
          <tr key={key}>
            <td className="text-capitalize">{key}</td>
            <td>{typeof value === "object" && value !== null ? JSON.stringify(value) : value?.toString()}</td>
          </tr>
        ))
      : null;

  return (
    <Modal show={show} onHide={onClose} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Booking Details</Modal.Title>
      </Modal.Header>
      <Modal.Body ref={modalRef}>
        <h5 className="mb-3">Collection: {collection}</h5>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {renderObject(booking)}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="success" onClick={handleExportPDF}>
          Export as PDF
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
