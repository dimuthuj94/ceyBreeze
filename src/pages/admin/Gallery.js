// src/pages/admin/Gallery.js
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Button, Card, Col, Row, Spinner, Form, Modal } from "react-bootstrap";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase";

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImage, setDeleteImage] = useState(null);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "gallery"));
      setImages(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return alert("Select an image first!");
    setUploading(true);
    try {
      const storageRef = ref(storage, `gallery/${selectedFile.name}-${Date.now()}`);
      await uploadBytes(storageRef, selectedFile);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "gallery"), {
        url,
        name: selectedFile.name,
        createdAt: new Date(),
        storagePath: storageRef.fullPath,
      });
      setSelectedFile(null);
      fetchImages();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (img) => {
    setShowDeleteModal(false);
    try {
      const storageRef = ref(storage, img.storagePath);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, "gallery", img.id));
      fetchImages();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <AdminLayout>
      <h2 className="mb-4 text-center fw-bold">Gallery Management</h2>
      <p className="text-center">Add or remove images from your gallery.</p>

      <div className="d-flex justify-content-center mb-4">
        <Form.Control
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          className="me-2"
          style={{ maxWidth: "300px" }}
        />
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : images.length === 0 ? (
        <p className="text-center text-muted">No images found.</p>
      ) : (
        <Row xs={1} sm={2} md={3} lg={4} className="g-4">
          {images.map((img) => (
            <Col key={img.id}>
              <Card className="h-100 shadow-sm border border-secondary border-opacity-25">
                <Card.Img
                  variant="top"
                  src={img.url}
                  style={{ height: "180px", objectFit: "cover" }}
                />
                <Card.Body className="d-flex flex-column justify-content-between">
                  <Card.Text className="text-truncate">{img.name}</Card.Text>
                  <Button
                    variant="danger"
                    className="mt-2"
                    onClick={() => {
                      setDeleteImage(img);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this image?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => handleDelete(deleteImage)}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
