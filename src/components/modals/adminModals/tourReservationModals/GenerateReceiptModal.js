// src/components/modals/adminModals/tourReservationModals/GenerateReceiptModal.js
import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import {
  doc, getDoc, setDoc, updateDoc,
  runTransaction, addDoc, collection,
  serverTimestamp, query, orderBy, limit, getDocs,
} from "firebase/firestore";
import { db } from "../../../../firebase";
import {
  getBookingType, getTotalPrice, getCustomerName,
  getArrivalDate, getTourName,
} from "../../../../pages/admin/reservationManagement/manageReservations/bookingCardHelpers";
import { sendCustomerNotification, NOTIF_TYPES } from "../../../../utils/notificationHelper";

const PAID_COL = {
  preset:  "paidPresetBookings",
  custom:  "paidCustomBookings",
  vehicle: "paidVehicleBookings",
};
const CONFIRMED_COL = {
  preset:  "confirmedPresetBookings",
  custom:  "confirmedCustomBookings",
  vehicle: "confirmedVehicleBookings",
};

const FieldRow = ({ label, sub, children }) => (
  <div style={{ marginBottom: "12px" }}>
    <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500, marginBottom: "2px", display: "block" }}>{label}</label>
    {sub && <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "4px" }}>{sub}</div>}
    {children}
  </div>
);
const inp = { border: "1px solid #dee2e6", padding: "7px 10px", fontSize: "13px", color: "#212529", width: "100%", background: "#fff" };
const ro  = { ...inp, background: "#f8f9fa", color: "#6c757d" };
const lkrInp = { ...inp, borderColor: "#fac775", color: "#633806", background: "#fffdf7" };

const SectionBlock = ({ title, accent, children }) => (
  <div style={{ border: `1px solid ${accent ? "rgba(253,174,0,0.25)" : "#e9ecef"}`, overflow: "hidden", marginBottom: "14px" }}>
    <div style={{ background: accent ? "#fffbf0" : "#f8f9fa", padding: "7px 14px", borderBottom: `1px solid ${accent ? "rgba(253,174,0,0.25)" : "#e9ecef"}`, display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "7px", height: "7px", background: accent ? "#fac775" : "#00276b", flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: accent ? "#633806" : "#00276b", letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</p>
    </div>
    <div style={{ padding: "14px" }}>{children}</div>
  </div>
);

const generateReceiptNumber = async () =>
  runTransaction(db, async (tx) => {
    const ref  = doc(db, "receiptCounters", "global");
    const snap = await tx.get(ref);
    const next = snap.exists() ? snap.data().lastReceiptNumber + 1 : 1;
    tx.set(ref, { lastReceiptNumber: next }, { merge: true });
    return `RCP-${String(next).padStart(6, "0")}`;
  });

const generateTransactionNumber = async () =>
  runTransaction(db, async (tx) => {
    const ref  = doc(db, "transactionCounters", "global");
    const snap = await tx.get(ref);
    const next = snap.exists() ? snap.data().lastNumber + 1 : 1;
    tx.set(ref, { lastNumber: next }, { merge: true });
    return `TXN-${String(next).padStart(8, "0")}`;
  });

export default function GenerateReceiptModal({ show, onHide, booking }) {
  const [paidAmountUSD,       setPaidAmountUSD]       = useState("");
  const [paidAmountLKR,       setPaidAmountLKR]       = useState("");
  const [balanceUSD,          setBalanceUSD]           = useState("");
  const [balanceLKR,          setBalanceLKR]           = useState("");
  const [exchangeRate,        setExchangeRate]         = useState("");
  const [paymentReceivedDate, setPaymentReceivedDate]  = useState("");
  const [receiptDate,         setReceiptDate]          = useState(new Date().toISOString().split("T")[0]);
  const [notes,               setNotes]                = useState("");
  const [saving,              setSaving]               = useState(false);
  const [alreadyGenerated,    setAlreadyGenerated]     = useState(false);
  const [existingReceiptId,   setExistingReceiptId]    = useState(null);
  const [showAmendConfirm,    setShowAmendConfirm]     = useState(false);
  const [latestRate,          setLatestRate]           = useState(null);
  const [lkrMode,             setLkrMode]              = useState("auto"); // "auto" | "manual"

  const type         = booking ? getBookingType(booking) : null;
  const rawTotal     = booking ? getTotalPrice(booking, type) : "$0";
  const totalUSD     = parseFloat(String(rawTotal).replace(/[^\d.]/g, "")) || 0;

  /* ── Fetch latest exchange rate on open ── */
  useEffect(() => {
    if (!show) return;
    getDocs(query(collection(db, "financeExchangeRates"), orderBy("createdAt", "desc"), limit(1)))
      .then(snap => {
        if (!snap.empty) {
          const r = snap.docs[0].data();
          setLatestRate(r);
          setExchangeRate(String(r.rateUSDtoLKR));
        }
      }).catch(() => {});
  }, [show]);

  /* ── Pre-fill on open ── */
  useEffect(() => {
    if (!booking || !show) return;
    const col = PAID_COL[type] || CONFIRMED_COL[type];
    if (!col) return;
    getDoc(doc(db, col, booking.id)).then(snap => {
      if (snap.exists() && snap.data().receiptId) {
        setAlreadyGenerated(true);
        setExistingReceiptId(snap.data().receiptId);
      } else {
        setAlreadyGenerated(false);
        setExistingReceiptId(null);
      }
    });
    const paid = booking.paymentAmountValue || booking.paidAmount || totalUSD;
    setPaidAmountUSD(String(paid));
    setPaymentReceivedDate(
      booking.paidAt?.toDate
        ? booking.paidAt.toDate().toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
  }, [booking, show]);

  /* ── Auto-recalculate USD balance ── */
  useEffect(() => {
    const paid = parseFloat(paidAmountUSD) || 0;
    setBalanceUSD(String(Math.max(0, totalUSD - paid).toFixed(2)));
  }, [paidAmountUSD, totalUSD]);

  /* ── Auto-calculate LKR from rate (auto mode) ── */
  useEffect(() => {
    if (lkrMode !== "auto") return;
    const rate = parseFloat(exchangeRate) || 0;
    const paid = parseFloat(paidAmountUSD) || 0;
    const bal  = parseFloat(balanceUSD) || 0;
    if (rate > 0) {
      setPaidAmountLKR((paid * rate).toFixed(2));
      setBalanceLKR((bal * rate).toFixed(2));
    }
  }, [paidAmountUSD, balanceUSD, exchangeRate, lkrMode]);

  /* ── Core save ── */
  const handleSave = async (isAmendment = false) => {
    if (!booking) return;
    const paidUSD  = parseFloat(paidAmountUSD) || 0;
    const paidLKR  = parseFloat(paidAmountLKR) || 0;
    const balUSD   = parseFloat(balanceUSD)    || 0;
    const balLKR   = parseFloat(balanceLKR)    || 0;
    const rate     = parseFloat(exchangeRate)  || 0;

    if (paidUSD === 0) { alert("Paid amount cannot be zero."); return; }
    if (paidLKR === 0) { alert("LKR equivalent is required for internal records."); return; }
    if (rate === 0) { alert("Exchange rate is required."); return; }

    setSaving(true);
    try {
      const receiptId    = isAmendment ? existingReceiptId : await generateReceiptNumber();
      const col          = PAID_COL[type] || CONFIRMED_COL[type] || "paidPresetBookings";
      const tourName     = getTourName(booking, type);
      const customerName = getCustomerName(booking, type);
      const arrivalDate  = getArrivalDate(booking, type);
      const bookingRef   = booking.bookingReference || booking.bookingId || booking.id;

      const receiptData = {
        receiptId,
        bookingId:          booking.id,
        bookingReference:   bookingRef,
        bookingType:        type,
        tourName,
        customerName,
        customerEmail:      booking.customerEmail,
        arrivalDate,
        /* USD — customer-facing */
        currencyUSD:        "USD",
        totalAmountUSD:     totalUSD,
        paidAmountUSD:      paidUSD,
        remainingBalanceUSD: balUSD,
        /* LKR — internal */
        currencyLKR:        "LKR",
        totalAmountLKR:     (totalUSD * rate),
        paidAmountLKR:      paidLKR,
        remainingBalanceLKR: balLKR,
        exchangeRate:       rate,
        /* Meta */
        paymentReceivedDate,
        receiptDate,
        paymentMethod:      booking.paymentMethod || "N/A",
        notes:              notes.trim(),
        isAmendment,
        ...(isAmendment ? { amendedAt: serverTimestamp() } : { generatedAt: serverTimestamp() }),
      };

      /* 1. Save receipt */
      await setDoc(doc(db, "paymentReceipts", receiptId), receiptData, { merge: true });

      /* 2. Update booking */
      await updateDoc(doc(db, col, booking.id), { receiptId, receiptData });

      /* 3. Record income (paid portion) */
      if (paidUSD > 0) {
        const incTxnId = await generateTransactionNumber();
        const incomeDoc = {
          transactionId:    incTxnId,
          receiptId,
          bookingId:        booking.id,
          bookingReference: bookingRef,
          category:         type === "vehicle" ? "Vehicle Booking Payment" : type === "custom" ? "Custom Tour Payment" : "Preset Tour Payment",
          description:      `Payment received — ${tourName} (${bookingRef})`,
          /* USD */
          amount:           paidUSD,
          amountUSD:        paidUSD,
          currencyUSD:      "USD",
          /* LKR */
          amountLKR:        paidLKR,
          currencyLKR:      "LKR",
          exchangeRate:     rate,
          paymentMethod:    booking.paymentMethod || "N/A",
          date:             paymentReceivedDate,
          status:           "received",
          customerName,
          customerEmail:    booking.customerEmail,
          isAmendment,
          createdAt:        serverTimestamp(),
          createdBy:        "admin",
        };
        await addDoc(collection(db, "financeIncome"), incomeDoc);

        await addDoc(collection(db, "financialTransactions"), {
          transactionId:         incTxnId,
          receiptId,
          type:                  "income",
          category:              type === "vehicle" ? "Vehicle Booking Payment" : type === "custom" ? "Custom Tour Payment" : "Preset Tour Payment",
          subCategory:           booking.paymentAmount === "half" ? "Advance Payment" : "Full Payment",
          /* USD */
          amount:                paidUSD,
          amountUSD:             paidUSD,
          currencyUSD:           "USD",
          /* LKR */
          amountLKR:             paidLKR,
          currencyLKR:           "LKR",
          exchangeRate:          rate,
          relatedReservationId:  booking.id,
          relatedEntityId:       bookingRef,
          description:           `Tour income — ${tourName} (${bookingRef})`,
          paymentMethod:         booking.paymentMethod || "N/A",
          customerName,
          customerEmail:         booking.customerEmail,
          arrivalDate,
          status:                "completed",
          isAmendment,
          createdAt:             serverTimestamp(),
          createdBy:             "admin",
        });
      }

      /* 4. Record to-be-received (balance) */
      if (balUSD > 0) {
        const balTxnId = await generateTransactionNumber();
        await setDoc(doc(db, "financeTobeReceived", booking.id), {
          transactionId:       balTxnId,
          receiptId,
          bookingId:           booking.id,
          bookingReference:    bookingRef,
          bookingType:         type,
          tourName,
          customerName,
          customerEmail:       booking.customerEmail,
          arrivalDate,
          /* USD */
          totalAmountUSD:      totalUSD,
          paidAmountUSD:       paidUSD,
          remainingBalanceUSD: balUSD,
          /* LKR */
          totalAmountLKR:      totalUSD * rate,
          paidAmountLKR:       paidLKR,
          remainingBalanceLKR: balLKR,
          exchangeRate:        rate,
          paymentMethod:       booking.paymentMethod || "N/A",
          status:              "pending",
          notes:               notes.trim(),
          updatedAt:           serverTimestamp(),
          createdAt:           serverTimestamp(),
          createdBy:           "admin",
        }, { merge: true });

        await addDoc(collection(db, "financialTransactions"), {
          transactionId:         balTxnId,
          receiptId,
          type:                  "to_be_received",
          category:              type === "vehicle" ? "Vehicle Booking Balance" : type === "custom" ? "Custom Tour Balance" : "Preset Tour Balance",
          subCategory:           "Outstanding Balance",
          amount:                balUSD,
          amountUSD:             balUSD,
          amountLKR:             balLKR,
          exchangeRate:          rate,
          currencyUSD:           "USD",
          currencyLKR:           "LKR",
          relatedReservationId:  booking.id,
          relatedEntityId:       bookingRef,
          description:           `Balance outstanding — ${tourName} (${bookingRef})`,
          customerName,
          customerEmail:         booking.customerEmail,
          arrivalDate,
          status:                "pending",
          isAmendment,
          createdAt:             serverTimestamp(),
          createdBy:             "admin",
        });
      } else if (!isAmendment) {
        const tbr = doc(db, "financeTobeReceived", booking.id);
        const tbrSnap = await getDoc(tbr);
        if (tbrSnap.exists() && tbrSnap.data().status === "pending") {
          await updateDoc(tbr, { status: "settled", settledAt: serverTimestamp() });
        }
      }

      /* 5. Audit log */
      await addDoc(collection(db, "financeAuditLog"), {
        action:       isAmendment ? "RECEIPT_AMENDED" : "RECEIPT_GENERATED",
        entity:       "paymentReceipts",
        receiptId,
        bookingId:    booking.id,
        paidAmountUSD: paidUSD,
        paidAmountLKR: paidLKR,
        exchangeRate:  rate,
        performedBy:  "admin",
        performedAt:  serverTimestamp(),
      });

      /* ── 6. Customer notification ── */
      await sendCustomerNotification({
        customerId:       booking.customerId || booking.uid || null,
        customerEmail:    booking.customerEmail,
        bookingId:        booking.id,
        bookingReference: bookingRef,
        bookingType:      type,
        type:             NOTIF_TYPES.RECEIPT_AVAILABLE,
        title:            "Your receipt is ready",
        message:          `A payment receipt (${receiptId}) has been generated for your booking. Paid: USD ${paidUSD.toFixed(2)}.`,
        data: {
          receiptId,
          paidAmountUSD:    paidUSD.toFixed(2),
          paidAmountLKR:    paidLKR.toFixed(2),
          remainingUSD:     balUSD.toFixed(2),
          remainingLKR:     balLKR.toFixed(2),
          exchangeRate:     rate,
          receiptDate,
        },
      });

      setAlreadyGenerated(true);
      setExistingReceiptId(receiptId);
      setShowAmendConfirm(false);
      alert(`Receipt ${receiptId} generated. Income recorded in USD + LKR.`);
      onHide();
    } catch (err) {
      console.error(err);
      alert("Failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;

  const paidUSD  = parseFloat(paidAmountUSD) || 0;
  const paidLKR  = parseFloat(paidAmountLKR) || 0;
  const balUSD   = parseFloat(balanceUSD) || 0;
  const balLKR   = parseFloat(balanceLKR) || 0;
  const rate     = parseFloat(exchangeRate) || 0;

  const fmtLKR = (n) => `LKR ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }} className="border-0">
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>
          Generate Receipt — {booking.id}
        </Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>

        {/* Already generated warning */}
        {alreadyGenerated && (
          <div style={{ background: "#faeeda", border: "1px solid #fac775", padding: "10px 14px", marginBottom: "14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#633806", fontWeight: 500 }}>
              Receipt already generated: <strong>{existingReceiptId}</strong>
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#633806" }}>
              Use Amend to correct errors — this overwrites income records and preserves the receipt number.
            </p>
            {!showAmendConfirm ? (
              <button onClick={() => setShowAmendConfirm(true)} style={{ fontSize: "12px", padding: "4px 12px", border: "1px solid #fac775", background: "#fff", color: "#633806", cursor: "pointer" }}>
                Amend Receipt
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#791f1f" }}>This will update all USD + LKR income records.</span>
                <button onClick={() => handleSave(true)} style={{ fontSize: "12px", padding: "4px 12px", border: "none", background: "#00276b", color: "#fff", cursor: "pointer" }}>Yes, Amend</button>
                <button onClick={() => setShowAmendConfirm(false)} style={{ fontSize: "12px", padding: "4px 12px", border: "1px solid #dee2e6", background: "#fff", cursor: "pointer" }}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* No rate warning */}
        {!latestRate && (
          <div style={{ background: "#fcebeb", border: "1px solid rgba(220,53,69,0.2)", padding: "10px 14px", marginBottom: "14px", fontSize: "12px", color: "#791f1f" }}>
            ⚠ No exchange rate found. Please set today's rate in <strong>Currency Rates</strong> page before generating receipts.
          </div>
        )}

        {/* Booking summary */}
        <SectionBlock title="Booking Summary">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
            {[
              ["Tour",            getTourName(booking, type)],
              ["Customer",        getCustomerName(booking, type)],
              ["Booking ID",      booking.id],
              ["Total (USD)",     rawTotal],
              ["Payment Method",  booking.paymentMethod || "N/A"],
              ["Arrival Date",    getArrivalDate(booking, type)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "#adb5bd" }}>{label}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#212529" }}>{value}</span>
              </div>
            ))}
          </div>
        </SectionBlock>

        {/* Exchange rate */}
        <SectionBlock title="Exchange Rate" accent>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FieldRow label="1 USD = ? LKR *" sub={latestRate ? `Latest: ${latestRate.rateUSDtoLKR} (${latestRate.date})` : "No rate set"}>
              <input
                type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)}
                placeholder="e.g. 320.50" style={lkrInp}
              />
            </FieldRow>
            <FieldRow label="LKR Calculation Mode">
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                {[["auto","Auto (from rate)"],["manual","Enter manually"]].map(([v, l]) => (
                  <button key={v} onClick={() => setLkrMode(v)} style={{
                    flex: 1, padding: "8px 6px", fontSize: "11px", fontWeight: 600, border: "1.5px solid",
                    borderColor: lkrMode === v ? "#fac775" : "rgba(0,39,107,0.12)",
                    background: lkrMode === v ? "#fffbf0" : "#fff", color: lkrMode === v ? "#633806" : "#7a9ab8",
                    cursor: "pointer",
                  }}>{l}</button>
                ))}
              </div>
            </FieldRow>
          </div>
        </SectionBlock>

        {/* USD amounts (receipt) */}
        <SectionBlock title="USD Amounts — Customer Receipt">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
            <FieldRow label="Total Amount (USD)">
              <input type="number" value={totalUSD} readOnly style={ro} />
            </FieldRow>
            <FieldRow label="Paid Amount (USD) *">
              <input type="number" value={paidAmountUSD} onChange={e => setPaidAmountUSD(e.target.value)} style={inp} placeholder="0.00" />
            </FieldRow>
            <FieldRow label="Balance Remaining (USD)">
              <input type="number" value={balanceUSD} readOnly style={ro} />
            </FieldRow>
          </div>
        </SectionBlock>

        {/* LKR amounts (internal) */}
        <SectionBlock title="LKR Equivalents — Internal Financial Records" accent>
          <div style={{ fontSize: "11px", color: "#633806", marginBottom: "12px", background: "#fffbf0", border: "1px solid rgba(253,174,0,0.25)", padding: "8px 12px" }}>
            These LKR amounts are recorded in <strong>financeIncome</strong>, <strong>financialTransactions</strong> and <strong>financeTobeReceived</strong> for internal P&L statements. The receipt itself is issued in USD only.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 16px" }}>
            <FieldRow label="Total (LKR equivalent)">
              <input type="number" value={rate > 0 ? (totalUSD * rate).toFixed(2) : ""} readOnly style={ro} placeholder="Auto-calculated" />
            </FieldRow>
            <FieldRow label="Paid Amount (LKR) *" sub={lkrMode === "auto" ? `Auto: $${paidUSD} × ${rate || "?"} = LKR ${(paidUSD * rate).toFixed(2)}` : "Enter manually"}>
              <input
                type="number" value={paidAmountLKR}
                onChange={e => { setLkrMode("manual"); setPaidAmountLKR(e.target.value); }}
                readOnly={lkrMode === "auto"}
                style={lkrInp}
                placeholder="0.00"
              />
            </FieldRow>
            <FieldRow label="Balance Remaining (LKR)" sub={balUSD > 0 ? `Balance to collect: LKR ${(balUSD * rate).toFixed(2)}` : ""}>
              <input
                type="number" value={balanceLKR}
                onChange={e => { setLkrMode("manual"); setBalanceLKR(e.target.value); }}
                readOnly={lkrMode === "auto"}
                style={lkrInp}
                placeholder="0.00"
              />
            </FieldRow>
          </div>
        </SectionBlock>

        {/* Dates and notes */}
        <SectionBlock title="Receipt Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FieldRow label="Payment Received Date">
              <input type="date" value={paymentReceivedDate} onChange={e => setPaymentReceivedDate(e.target.value)} style={inp} />
            </FieldRow>
            <FieldRow label="Receipt Date">
              <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} style={inp} />
            </FieldRow>
          </div>
          <FieldRow label="Notes (internal)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inp, resize: "vertical", minHeight: "55px" }} placeholder="Optional notes..." />
          </FieldRow>
        </SectionBlock>

        {/* Recording preview */}
        <SectionBlock title="What Will Be Recorded">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {paidUSD > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "8px 12px", background: "#e1f5ee" }}>
                <span style={{ color: "#085041" }}>✓ Income → <em>financeIncome</em> + <em>financialTransactions</em></span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#085041", fontWeight: 700 }}>USD {paidUSD.toFixed(2)}</div>
                  <div style={{ color: "#085041", fontWeight: 700 }}>LKR {paidLKR.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
            {balUSD > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "8px 12px", background: "#faeeda" }}>
                <span style={{ color: "#633806" }}>⏳ Balance → <em>financeTobeReceived</em> + <em>financialTransactions</em></span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#633806", fontWeight: 700 }}>USD {balUSD.toFixed(2)}</div>
                  <div style={{ color: "#633806", fontWeight: 700 }}>LKR {balLKR.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
            <div style={{ fontSize: "11px", padding: "6px 10px", background: "rgba(0,39,107,0.03)", color: "#7a9ab8" }}>
              Exchange rate used: 1 USD = LKR {rate || "—"}
            </div>
          </div>
        </SectionBlock>

      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Cancel</Button>
        <Button
          onClick={() => handleSave(false)}
          disabled={saving || alreadyGenerated || !paidUSD || !paidLKR || !rate}
          style={{ background: "#00276b", border: "none", fontSize: "13px" }}
        >
          {saving ? "Generating..." : "Generate Receipt & Record Income"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}