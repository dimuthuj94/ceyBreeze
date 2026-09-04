// src/components/modals/adminModals/financeManagementModals/ToBeReceivedRecordPaymentModal.js
import React, { useEffect, useState } from "react";
import {
  doc, updateDoc, addDoc, collection,
  serverTimestamp, runTransaction,
} from "firebase/firestore";
import { db } from "../../../../firebase";
import { sendCustomerNotification, NOTIF_TYPES } from "../../../../utils/notificationHelper";

const fmtUSD = (n) => `USD ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtLKR = (n) => `LKR ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const generateTransactionNumber = async () => {
  return runTransaction(db, async (tx) => {
    const ref  = doc(db, "transactionCounters", "global");
    const snap = await tx.get(ref);
    const next = snap.exists() ? snap.data().lastNumber + 1 : 1;
    tx.set(ref, { lastNumber: next }, { merge: true });
    return `TXN-${String(next).padStart(8, "0")}`;
  });
};

export default function ToBeReceivedRecordPaymentModal({
  show, onHide, record, latestRate, onSettled,
}) {
  const [settleAmtUSD, setSettleAmtUSD] = useState("");
  const [settleAmtLKR, setSettleAmtLKR] = useState("");
  const [settleRate,   setSettleRate]   = useState("");
  const [settleDate,   setSettleDate]   = useState(new Date().toISOString().split("T")[0]);
  const [settleNotes,  setSettleNotes]  = useState("");
  const [lkrMode,      setLkrMode]      = useState("auto");
  const [saving,       setSaving]       = useState(false);

  /* ── Pre-fill when record changes ── */
  useEffect(() => {
    if (!record || !show) return;
    const maxUSD = record.remainingBalanceUSD ?? record.remainingBalance ?? 0;
    const rate   = record.exchangeRate || latestRate?.rateUSDtoLKR || 0;
    setSettleAmtUSD(String(maxUSD));
    setSettleRate(String(rate));
    setSettleAmtLKR(String((maxUSD * rate).toFixed(2)));
    setLkrMode("auto");
    setSettleNotes("");
    setSettleDate(new Date().toISOString().split("T")[0]);
  }, [record, show]);

  /* ── Auto-recalculate LKR in auto mode ── */
  useEffect(() => {
    if (lkrMode !== "auto") return;
    const rate = parseFloat(settleRate) || 0;
    const usd  = parseFloat(settleAmtUSD) || 0;
    if (rate > 0 && usd >= 0) setSettleAmtLKR((usd * rate).toFixed(2));
  }, [settleAmtUSD, settleRate, lkrMode]);

  const handleSettle = async () => {
    if (!record) return;
    const amountUSD = parseFloat(settleAmtUSD) || 0;
    const amountLKR = parseFloat(settleAmtLKR) || 0;
    const rate      = parseFloat(settleRate) || 0;

    if (amountUSD <= 0) { alert("Enter a valid USD amount."); return; }
    if (amountLKR <= 0) { alert("Enter the LKR equivalent."); return; }
    if (rate <= 0)      { alert("Enter the exchange rate."); return; }

    const currentRemainingUSD = record.remainingBalanceUSD ?? record.remainingBalance ?? 0;
    if (amountUSD > currentRemainingUSD + 0.001) {
      alert(`Amount exceeds remaining balance of ${fmtUSD(currentRemainingUSD)}.`); return;
    }

    setSaving(true);
    try {
      const txnId = await generateTransactionNumber();

      /* ── BUG FIX 1: Accumulate settled amounts (don't overwrite) ── */
      const prevSettledUSD = record.settledAmountUSD || 0;
      const prevSettledLKR = record.settledAmountLKR || 0;
      const newSettledUSD  = prevSettledUSD + amountUSD;
      const newSettledLKR  = prevSettledLKR + amountLKR;

      /* ── BUG FIX 2: New remaining = current remaining - this payment ── */
      const remainUSD = Math.max(0, currentRemainingUSD - amountUSD);
      const remainLKR = Math.max(0, (record.remainingBalanceLKR || 0) - amountLKR);

      /* ── BUG FIX 3: Status stays "pending" until FULLY settled ── 
         Previously set to "partial" which hid the record from the default filter */
      const isFully = remainUSD <= 0.001;
      const newStatus = isFully ? "settled" : "pending";

      /* Update TBR record */
      await updateDoc(doc(db, "financeTobeReceived", record.id), {
        status:               newStatus,
        settledAmountUSD:     newSettledUSD,   // accumulated total of all settlements
        settledAmountLKR:     newSettledLKR,   // accumulated total of all settlements
        remainingBalanceUSD:  remainUSD,
        remainingBalanceLKR:  remainLKR,
        settleExchangeRate:   rate,
        settledAt:            serverTimestamp(),
        settleNotes:          settleNotes.trim(),
        settleDate,
        lastUpdated:          serverTimestamp(),
      });

      /* Record in financeIncome */
      await addDoc(collection(db, "financeIncome"), {
        transactionId:    txnId,
        bookingId:        record.id,
        bookingReference: record.bookingReference,
        category:         "Balance Payment (On Tour)",
        description:      `Balance collected — ${record.tourName} (${record.bookingReference})`,
        amount:           amountUSD,
        amountUSD,
        amountLKR,
        exchangeRate:     rate,
        paymentMethod:    "Cash (On Tour)",
        date:             settleDate,
        status:           "received",
        customerName:     record.customerName,
        customerEmail:    record.customerEmail,
        notes:            settleNotes.trim(),
        createdAt:        serverTimestamp(),
        createdBy:        "admin",
      });

      /* Record in financialTransactions */
      await addDoc(collection(db, "financialTransactions"), {
        transactionId:         txnId,
        type:                  "income",
        category:              "Balance Payment (On Tour)",
        subCategory:           isFully ? "Balance Fully Settled" : "Partial Balance Settlement",
        amount:                amountUSD,
        amountUSD,
        amountLKR,
        exchangeRate:          rate,
        relatedReservationId:  record.id,
        relatedEntityId:       record.bookingReference,
        description:           `Balance collected — ${record.tourName} (${record.bookingReference})`,
        paymentMethod:         "Cash (On Tour)",
        customerName:          record.customerName,
        customerEmail:         record.customerEmail,
        arrivalDate:           record.arrivalDate,
        status:                "completed",
        createdAt:             serverTimestamp(),
        createdBy:             "admin",
      });

      /* Audit log */
      await addDoc(collection(db, "financeAuditLog"), {
        action:      isFully ? "BALANCE_FULLY_SETTLED" : "PARTIAL_BALANCE_RECORDED",
        entity:      "financeTobeReceived",
        bookingId:   record.id,
        amountUSD, amountLKR,
        remainUSD, remainLKR,
        exchangeRate: rate,
        performedBy: "admin",
        performedAt: serverTimestamp(),
      });

      /* Customer notification */
      await sendCustomerNotification({
        customerId:       record.customerId || null,
        customerEmail:    record.customerEmail,
        bookingId:        record.id,
        bookingReference: record.bookingReference,
        bookingType:      record.bookingType,
        type:             NOTIF_TYPES.BALANCE_UPDATED,
        title:            isFully ? "Balance fully settled!" : "Balance payment recorded",
        message:          isFully
          ? `Your balance of USD ${amountUSD.toFixed(2)} has been received. Your account is now fully settled. Thank you!`
          : `A balance payment of USD ${amountUSD.toFixed(2)} has been recorded. Remaining balance: USD ${remainUSD.toFixed(2)}.`,
        data: {
          settledAmountUSD: amountUSD.toFixed(2),
          settledAmountLKR: amountLKR.toFixed(2),
          remainingUSD:     remainUSD.toFixed(2),
          remainingLKR:     remainLKR.toFixed(2),
          fullySettled:     isFully,
        },
      });

      onSettled?.();
      onHide();
      alert(`USD ${amountUSD.toFixed(2)} / LKR ${amountLKR.toLocaleString()} recorded. ${isFully ? "Balance fully settled!" : "Partial — remaining balance updated."}`);
    } catch (e) {
      console.error(e);
      alert("Failed to record payment: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!show || !record) return null;

  const fi    = { width: "100%", padding: "9px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", outline: "none", background: "#fff", boxSizing: "border-box" };
  const lkrFi = { ...fi, borderColor: "#fac775", color: "#633806", background: "#fffdf7" };
  const btnStyle = (bg, color, disabled = false) => ({
    background: disabled ? "rgba(0,39,107,0.06)" : bg,
    color:      disabled ? "#adc6d8" : color,
    border: "none", fontSize: "11px", padding: "8px 16px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
  });

  const amtUSD    = parseFloat(settleAmtUSD) || 0;
  const amtLKR    = parseFloat(settleAmtLKR) || 0;
  const remaining = record.remainingBalanceUSD ?? record.remainingBalance ?? 0;
  const afterUSD  = Math.max(0, remaining - amtUSD);
  const afterLKR  = Math.max(0, (record.remainingBalanceLKR || 0) - amtLKR);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: "540px", maxWidth: "96vw", overflow: "hidden", maxHeight: "96vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ background: "#00276b", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Record Balance Payment
            </span>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
              {record.bookingReference} · {record.tourName}
            </div>
          </div>
          <button onClick={onHide} style={{ background: "none", border: "none", color: "#a8edff", cursor: "pointer", fontSize: "18px" }}>✕</button>
        </div>

        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>

          {/* Booking summary */}
          <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "12px 14px", marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", color: "#adc6d8" }}>{record.bookingReference}</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#00276b", margin: "3px 0" }}>{record.tourName}</div>
            <div style={{ fontSize: "12px", color: "#7a9ab8" }}>{record.customerName} · {record.customerEmail}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "12px" }}>
              {[
                ["TOTAL",     fmtUSD(record.totalAmountUSD || record.totalAmount), "#00276b"],
                ["PAID",      fmtUSD((record.paidAmountUSD || 0) + (record.settledAmountUSD || 0)), "#27a86e"],
                ["REMAINING", fmtUSD(remaining), "#8B0000"],
              ].map(([label, value, color]) => (
                <div key={label}>
                  <div style={{ fontSize: "9px", color: "#adc6d8", marginBottom: "2px" }}>{label}</div>
                  <div style={{ fontSize: "14px", fontFamily: "'DM Serif Display', serif", color }}>{value}</div>
                </div>
              ))}
            </div>
            {(record.settledAmountUSD || 0) > 0 && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#7a9ab8", borderTop: "1px solid rgba(0,39,107,0.06)", paddingTop: "6px" }}>
                Previous settlements: {fmtUSD(record.settledAmountUSD)} recorded
              </div>
            )}
          </div>

          {/* Exchange rate */}
          <div style={{ marginBottom: "14px", background: "#fffbf0", border: "1px solid rgba(253,174,0,0.25)", padding: "12px 14px" }}>
            <label style={{ fontSize: "10px", fontWeight: 700, color: "#633806", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
              Exchange Rate (1 USD = LKR) *
            </label>
            <input
              type="number" style={lkrFi} value={settleRate}
              onChange={e => setSettleRate(e.target.value)}
              placeholder="e.g. 320.50"
            />
            {latestRate && (
              <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "4px" }}>
                Latest rate: {latestRate.rateUSDtoLKR} ({latestRate.date})
                <button
                  onClick={() => setSettleRate(String(latestRate.rateUSDtoLKR))}
                  style={{ marginLeft: "8px", fontSize: "9px", background: "#fac775", color: "#633806", border: "none", padding: "1px 6px", cursor: "pointer", fontWeight: 700 }}
                >
                  USE
                </button>
              </div>
            )}
          </div>

          {/* Amounts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div>
              <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
                Amount Collected (USD) *
              </label>
              <input
                type="number" style={fi} value={settleAmtUSD}
                onChange={e => setSettleAmtUSD(e.target.value)}
                placeholder="0.00"
                max={remaining}
              />
              <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "3px" }}>
                Max: {fmtUSD(remaining)}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "10px", fontWeight: 700, color: "#633806", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
                LKR Equivalent *
                <button
                  onClick={() => {
                    const rate = parseFloat(settleRate) || 0;
                    const usd  = parseFloat(settleAmtUSD) || 0;
                    if (rate && usd) { setSettleAmtLKR((usd * rate).toFixed(2)); setLkrMode("auto"); }
                  }}
                  style={{ marginLeft: "6px", fontSize: "9px", background: "#fac775", color: "#633806", border: "none", padding: "1px 6px", cursor: "pointer", fontWeight: 700 }}
                >
                  AUTO
                </button>
              </label>
              <input
                type="number" style={lkrFi} value={settleAmtLKR}
                onChange={e => { setLkrMode("manual"); setSettleAmtLKR(e.target.value); }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Preview after settlement */}
          {amtUSD > 0 && amtLKR > 0 && (
            <div style={{ background: "rgba(39,168,110,0.06)", border: "1px solid rgba(39,168,110,0.2)", padding: "12px 14px", marginBottom: "14px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#085041", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                After This Payment
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#085041", marginBottom: "2px" }}>Remaining (USD)</div>
                  <div style={{ fontSize: "16px", fontFamily: "'DM Serif Display', serif", color: afterUSD <= 0 ? "#27a86e" : "#8B0000" }}>
                    {fmtUSD(afterUSD)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "#085041", marginBottom: "2px" }}>Remaining (LKR)</div>
                  <div style={{ fontSize: "16px", fontFamily: "'DM Serif Display', serif", color: afterLKR <= 0 ? "#27a86e" : "#633806" }}>
                    {fmtLKR(afterLKR)}
                  </div>
                </div>
              </div>
              {afterUSD <= 0 && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#27a86e", fontWeight: 600 }}>
                  ✓ This will fully settle the balance
                </div>
              )}
            </div>
          )}

          {/* Date + notes */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
              Date Collected
            </label>
            <input type="date" style={fi} value={settleDate} onChange={e => setSettleDate(e.target.value)} />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
              Notes (collection method, etc.)
            </label>
            <textarea
              style={{ ...fi, resize: "vertical", minHeight: "60px" }}
              value={settleNotes}
              onChange={e => setSettleNotes(e.target.value)}
              placeholder="e.g. Collected in cash at hotel, guide confirmed receipt..."
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(0,39,107,0.07)", display: "flex", gap: "10px", justifyContent: "flex-end", flexShrink: 0, background: "#fafafa" }}>
          <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={onHide}>Cancel</button>
          <button
            style={btnStyle("#27a86e", "#fff", saving || !settleAmtUSD || !settleAmtLKR)}
            onClick={handleSettle}
            disabled={saving || !settleAmtUSD || !settleAmtLKR}
          >
            {saving ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}