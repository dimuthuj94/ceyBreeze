// src/pages/customer/myBookings/MyBookings.js
import React, { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Tabs, Tab, Spinner } from "react-bootstrap";

// 🔹 Import section components
import UnpaidPresetTours from "./presetTours/UnpaidPresetTours";
import PaidPresetTours from "./presetTours/PaidPresetTours";
import ConfirmedPresetTours from "./presetTours/ConfirmedPresetTours";
import CompletedPresetTours from "./presetTours/CompletedPresetTours";

import UnpaidCustomTours from "./customTours/UnpaidCustomTours";
import PaidCustomTours from "./customTours/PaidCustomTours";
import ConfirmedCustomTours from "./customTours/ConfirmedCustomTours";
import CompletedCustomTours from "./customTours/CompletedCustomTours";

import UnpaidVehicleBookings from "./vehicleBookings/UnpaidVehicleBookings";
import PaidVehicleBookings from "./vehicleBookings/PaidVehicleBookings";
import ConfirmedVehicleBookings from "./vehicleBookings/ConfirmedVehicleBookings";
import CompletedVehicleBookings from "./vehicleBookings/CompletedVehicleBookings";

export default function MyBookings() {
  const [loading, setLoading] = useState(true);
  const authInstance = getAuth();

  // 🔹 Bookings state
  const [bookings, setBookings] = useState({
    unpaidPreset: [],
    paidPreset: [],
    confirmedPreset: [],
    completedPreset: [],
    unpaidCustom: [],
    paidCustom: [],
    confirmedCustom: [],
    completedCustom: [],
    unpaidVehicle: [],
    paidVehicle: [],
    confirmedVehicle: [],
    completedVehicle: [],
  });

  const fetchBookings = async () => {
    if (!authInstance.currentUser) return;
    setLoading(true);
    try {
      const email = authInstance.currentUser.email;

      const fetchCollection = async (collectionName) => {
        const q = query(collection(db, collectionName), where("customerEmail", "==", email));
        const snap = await getDocs(q);
        let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => {
          const dateA = new Date(a.travelers?.arrivalDate || a.arrivalDate || 0);
          const dateB = new Date(b.travelers?.arrivalDate || b.arrivalDate || 0);
          return dateA - dateB;
        });
        return data;
      };

      setBookings({
        unpaidPreset: await fetchCollection("unpaidPresetBookings"),
        paidPreset: await fetchCollection("paidPresetBookings"),
        confirmedPreset: await fetchCollection("confirmedPresetBookings"),
        completedPreset: await fetchCollection("completedPresetBookings"),

        unpaidCustom: await fetchCollection("unpaidCustomBookings"),
        paidCustom: await fetchCollection("paidCustomBookings"),
        confirmedCustom: await fetchCollection("confirmedCustomBookings"),
        completedCustom: await fetchCollection("completedCustomBookings"),

        unpaidVehicle: await fetchCollection("unpaidVehicleBookings"),
        paidVehicle: await fetchCollection("paidVehicleBookings"),
        confirmedVehicle: await fetchCollection("confirmedVehicleBookings"),
        completedVehicle: await fetchCollection("completedVehicleBookings"),
      });
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(authInstance, (user) => {
      if (user) fetchBookings();
      else setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "#EFFAFD",
        color: "#00276b",
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "LibreFranklin, sans-serif",
      }}
    >
      <style>
        {`
          /* 🔹 Center Tabs and Customize Color */
          .nav-tabs {
            justify-content: center;
            
          }
          .nav-tabs .nav-link {
            color: #00276b;
            font-weight: 500;
            border-radius: 8px 8px 0 0;
            transition: 0.3s;
          }
          .nav-tabs .nav-link:hover {
            background-color: #d8f4f9;
            color: #00276b;
          }
          .nav-tabs .nav-link.active {
            background-color: #00276b !important;
            color: white !important;
            border: none;
          }
        `}
      </style>

      <h2 className=" mb-4" style={{ fontWeight: 600 }}>
        My Bookings
      </h2>

      {loading ? (
        <div className="text-center my-3">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <>
          {/* 🔹 Tabs Section */}
          <Tabs defaultActiveKey="preset" className="mt-3">
            <Tab eventKey="preset" title="Preset Tours">
              <Tabs defaultActiveKey="unpaid" className="mt-3">
                <Tab eventKey="unpaid" title="Unpaid">
                  <UnpaidPresetTours data={bookings.unpaidPreset} />
                </Tab>
                <Tab eventKey="paid" title="Paid">
                  <PaidPresetTours data={bookings.paidPreset} />
                </Tab>
                <Tab eventKey="confirmed" title="Confirmed">
                  <ConfirmedPresetTours data={bookings.confirmedPreset} />
                </Tab>
                <Tab eventKey="completed" title="Completed">
                  <CompletedPresetTours data={bookings.completedPreset} />
                </Tab>
              </Tabs>
            </Tab>

            <Tab eventKey="custom" title="Custom Tours">
              <Tabs defaultActiveKey="unpaid" className="mt-3">
                <Tab eventKey="unpaid" title="Unpaid">
                  <UnpaidCustomTours data={bookings.unpaidCustom} />
                </Tab>
                <Tab eventKey="paid" title="Paid">
                  <PaidCustomTours data={bookings.paidCustom} />
                </Tab>
                <Tab eventKey="confirmed" title="Confirmed">
                  <ConfirmedCustomTours data={bookings.confirmedCustom} />
                </Tab>
                <Tab eventKey="completed" title="Completed">
                  <CompletedCustomTours data={bookings.completedCustom} />
                </Tab>
              </Tabs>
            </Tab>

            <Tab eventKey="vehicle" title="Vehicle Bookings">
              <Tabs defaultActiveKey="unpaid" className="mt-3">
                <Tab eventKey="unpaid" title="Unpaid">
                  <UnpaidVehicleBookings data={bookings.unpaidVehicle} />
                </Tab>
                <Tab eventKey="paid" title="Paid">
                  <PaidVehicleBookings data={bookings.paidVehicle} />
                </Tab>
                <Tab eventKey="confirmed" title="Confirmed">
                  <ConfirmedVehicleBookings data={bookings.confirmedVehicle} />
                </Tab>
                <Tab eventKey="completed" title="Completed">
                  <CompletedVehicleBookings data={bookings.completedVehicle} />
                </Tab>
              </Tabs>
            </Tab>
          </Tabs>
        </>
      )}
    </div>
  );
}
