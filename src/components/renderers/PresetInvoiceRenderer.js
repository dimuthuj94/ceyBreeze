// src/components/renderers/PresetInvoiceRenderer.js
import React from "react";
import { Card, ListGroup } from "react-bootstrap";

export default function PresetInvoiceRenderer({ summaryTable }) {
  const renderCardItem = (label, value) => (
    <div className="d-flex justify-content-between mb-1">
      <span className="fw-semibold">{label}</span>
      <span>{value}</span>
    </div>
  );

  const formatSummaryValue = (val) => {
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

  if (!summaryTable || summaryTable.length === 0)
    return <p className="text-muted">No summary available.</p>;

  return (
    <div>
      {summaryTable.map((section, idx) => {
        const key = Object.keys(section)[0];
        const content = section[key];
        return (
          <Card key={idx} className="mb-2 shadow-sm">
            <Card.Header className="fw-semibold bg-light">{key}</Card.Header>
            <Card.Body>
              {typeof content === "object" && !Array.isArray(content) ? (
                Object.entries(content).map(([label, val], i) => (
                  <div key={i}>{renderCardItem(label, formatSummaryValue(val))}</div>
                ))
              ) : Array.isArray(content) ? (
                <ListGroup variant="flush">
                  {content.map((item, i) => (
                    <ListGroup.Item key={i}>{formatSummaryValue(item)}</ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div>{content}</div>
              )}
            </Card.Body>
          </Card>
        );
      })}
    </div>
  );
}
