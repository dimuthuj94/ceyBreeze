// E:\HDSE\Final Project\UI\application\src\components\modals\general\GeneralPhotoUploadModal.js
import React, { useState } from "react";
import { Modal, Button, Form, Image } from "react-bootstrap";

/**
 * General photo upload modal with location selection, drag-and-drop, and preview.
 *
 * @param {boolean} show - Controls visibility of the modal
 * @param {function} onHide - Called when the modal is closed
 * @param {function} onUpload - Called when the user confirms upload
 * @param {string[]} locations - Array of available location options
 */
export default function PhotoUploadModal({
  show,
  onHide,
  onUpload,
  locations = [],
}) {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleConfirmUpload = () => {
    if (file && selectedLocation) {
      onUpload({ file, location: selectedLocation });
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header
        closeButton
        style={{
          backgroundColor: "#00276b",
          color: "white",
          fontFamily: "LibreFranklin, sans-serif",
          fontWeight: 400,
          padding: "8px 16px",
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
          Upload Photo
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ fontFamily: "LibreFranklin, sans-serif" }}>
        {/* Location Selection */}
        <Form.Group className="mb-3">
          <Form.Label>Select Location</Form.Label>
          <Form.Select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">-- Choose a location --</option>
            {locations.map((loc, idx) => (
              <option key={idx} value={loc}>
                {loc}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {/* Drag and Drop Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: dragActive ? "2px dashed #00276b" : "2px dashed #ccc",
            borderRadius: "6px",
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: dragActive ? "#f0f8ff" : "#fafafa",
          }}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {file ? (
            <p>{file.name}</p>
          ) : (
            <p>Drag & drop a photo here, or click to select</p>
          )}
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {/* Preview Thumbnail */}
        {previewUrl && (
          <div className="mt-3 text-center">
            <Image
              src={previewUrl}
              alt="Preview"
              thumbnail
              style={{ maxHeight: "200px", objectFit: "contain" }}
            />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer
        style={{
          backgroundColor: "#ffffff",
          fontFamily: "LibreFranklin, sans-serif",
          fontWeight: 400,
          padding: "8px 16px",
          borderTop: "1px solid #dee2e6",
          justifyContent: "flex-end",
        }}
      >
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirmUpload}
          disabled={!file || !selectedLocation}
          style={{
            backgroundColor: "#00276b",
            borderColor: "#00276b",
          }}
        >
          Upload
        </Button>
      </Modal.Footer>
    </Modal>
  );
}