// src/components/renderers/VehicleRenderer.js
import React from "react";
import { Card, Table } from "react-bootstrap";

export default function VehicleRenderer({
  customerName,
  arrivalDate,
  departureDate,
  days,
  vehicles = [],
  selectedVehicles = {},
  totalPrice,
  // If rendering from Firestore booking
  vehicles: bookedVehicles,
}) {
  // Normalize data depending on where this renderer is used
  const isBooking = Array.isArray(bookedVehicles);
  const list = isBooking
    ? bookedVehicles
    : Object.entries(selectedVehicles)
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => {
          const v = vehicles.find((x) => x.id === id);
          return {
            vehicleId: id,
            vehicleType: v?.id || "N/A",
            pricePerDay: v?.pricePerDay || 0,
            seatRange: `${v?.minimumSeatCount || "?"} - ${
              v?.maximumSeatCount || "?"
            }`,
            count,
          };
        });

  const total = isBooking
    ? bookedVehicles.reduce(
        (sum, v) => sum + v.pricePerDay * v.count * (days || v.days || 1),
        0
      )
    : totalPrice;

  return (
    <Card className="shadow-sm mt-3">
      <Card.Body>
        <h5 className="fw-bold">Booking Summary</h5>
        <p>
          <strong>Customer:</strong> {customerName || "N/A"} <br />
          <strong>Arrival:</strong> {arrivalDate || "N/A"} <br />
          <strong>Departure:</strong> {departureDate || "N/A"} <br />
          <strong>Days:</strong> {days || "N/A"}
        </p>

        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Vehicle Type</th>
              <th>Seats</th>
              <th>Price/Day</th>
              <th>Quantity</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v, idx) => (
              <tr key={idx}>
                <td>{v.vehicleType}</td>
                <td>{v.seatRange}</td>
                <td>${v.pricePerDay}</td>
                <td>{v.count}</td>
                <td>${v.pricePerDay * v.count * (days || v.days || 1)}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        <h6 className="text-end fw-bold mt-3">Total: ${total}</h6>
      </Card.Body>
    </Card>
  );
}
