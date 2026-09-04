// src/components/modals/adminModals/financeManagementModals/ExchangeRateModal.js
import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import {
  collection, addDoc, query, orderBy,
  limit, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../../firebase";

export default function ExchangeRateModal({ show, onHide, onRateSet }) {
  const [rate,    setRate]    = useState("");
  const [note,    setNote]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!show) return;
    getDocs(query(collection(db, "financeExchangeRates"), orderBy("createdAt", "desc"), limit(10)))
      .then(snap => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [show]);

  const handleSave = async () => {
    const r = parseFloat(rate);
    if (!r || r <= 0) { alert("Enter a valid exchange rate."); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const doc = await addDoc(collection(db, "financeExchangeRates"), {
        date: today,
        rateUSDtoLKR: r,
        note: note.trim(),
        setBy: "admin",
        createdAt: serverTimestamp(),
      });
      onRateSet?.({ id: doc.id, date: today, rateUSDtoLKR: r });
      setRate(""); setNote("");
      onHide();
    } catch (e) { alert("Failed: " + e.message); }
    finally { setSaving(false); }
  };

  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton style={{ background: "#00276b", color: "#fff" }} className="border-0">
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500 }}>Set Exchange Rate</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>
      <Modal.Body style={{ padding: "20px" }}>

        <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "#7a9ab8", lineHeight: 1.7 }}>
          Set today's <strong style={{ color: "#00276b" }}>USD → LKR</strong> rate. This will be used as the default for all financial records created today. You can always override the rate per transaction.
        </div>

        <Form.Group className="mb-3">
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
            1 USD = ? LKR *
          </label>
          <input
            type="number" value={rate} onChange={e => setRate(e.target.value)}
            placeholder="e.g. 320.50"
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "15px", color: "#00276b", outline: "none", background: "#fff", boxSizing: "border-box" }}
          />
          {rate && parseFloat(rate) > 0 && (
            <div style={{ fontSize: "12px", color: "#27a86e", marginTop: "6px", fontWeight: 500 }}>
              Example: $100 USD = LKR {(parseFloat(rate) * 100).toLocaleString()}
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-4">
          <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
            Note (optional)
          </label>
          <input
            type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. Central Bank rate, market rate..."
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", outline: "none", background: "#fff", boxSizing: "border-box" }}
          />
        </Form.Group>

        {history.length > 0 && (
          <>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Recent Rates</div>
            <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
              {history.map((h, i) => (
                <div key={h.id} onClick={() => setRate(String(h.rateUSDtoLKR))} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: i < history.length - 1 ? "1px solid rgba(0,39,107,0.05)" : "none", cursor: "pointer", background: "hover" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#00276b" }}>1 USD = LKR {h.rateUSDtoLKR.toLocaleString()}</span>
                    {h.note && <span style={{ fontSize: "11px", color: "#adc6d8", marginLeft: "8px" }}>{h.note}</span>}
                  </div>
                  <span style={{ fontSize: "11px", color: "#adc6d8" }}>{fmtDate(h.createdAt)}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "6px" }}>Click any rate to use it as today's rate.</div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !rate} style={{ background: "#00276b", border: "none" }}>
          {saving ? "Setting..." : "Set Rate"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}