// src/pages/admin/Reports.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Spinner } from "react-bootstrap";
import AdminLayout from "../../components/AdminLayout";

export default function Reports() {
  const [monthlyIncome, setMonthlyIncome] = useState([]);
  const [monthlyCounts, setMonthlyCounts] = useState([]);
  const [popularTours, setPopularTours] = useState([]);
  const [deletionStats, setDeletionStats] = useState([]);
  const [totals, setTotals] = useState({ preset: 0, custom: 0, vehicle: 0 });
  const [loading, setLoading] = useState(true); // 🔹 loading state

  const COLORS = ["#dc3545", "#198754"];

  const fetchCollectionData = async (collectionName) => {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const collections = [
          "unpaidPresetBookings",
          "paidPresetBookings",
          "confirmedPresetBookings",
          "unpaidCustomBookings",
          "paidCustomBookings",
          "confirmedCustomBookings",
          "unpaidVehicleBookings",
          "paidVehicleBookings",
          "confirmedVehicleBookings",
        ];

        let allBookings = [];
        let presetCount = 0;
        let customCount = 0;
        let vehicleCount = 0;

        for (const col of collections) {
          const data = await fetchCollectionData(col);

          if (col.includes("Preset")) presetCount += data.length;
          if (col.includes("Custom")) customCount += data.length;
          if (col.includes("Vehicle")) vehicleCount += data.length;

          const enriched = data.map((b) => {
            let status = "other";
            if (col.includes("unpaid")) status = "unpaid";
            if (col.includes("paid")) status = "paid";
            if (col.toLowerCase().includes("confirmed")) status = "confirmed";

            return {
              ...b,
              bookingType: col.includes("Preset")
                ? "Preset"
                : col.includes("Custom")
                ? "Custom"
                : "Vehicle",
              status,
              createdAt: b.createdAt || null,
              totalPrice: b.totalPrice || 0,
              tourTitle: b.tourTitle || "Unknown Tour",
            };
          });

          allBookings = [...allBookings, ...enriched];
        }

        setTotals({ preset: presetCount, custom: customCount, vehicle: vehicleCount });

        const normalizeDate = (ts) => {
          if (!ts) return null;
          if (ts.toDate) return ts.toDate();
          if (ts.seconds) return new Date(ts.seconds * 1000);
          return null;
        };

        // Monthly Income
        const incomeMap = {};
        allBookings.forEach((b) => {
          if (b.status === "paid") {
            const dateObj = normalizeDate(b.createdAt);
            if (dateObj) {
              const month = dateObj.toLocaleString("default", { month: "short", year: "numeric" });
              incomeMap[month] = (incomeMap[month] || 0) + b.totalPrice;
            }
          }
        });
        const monthlyIncomeArr = Object.entries(incomeMap)
          .map(([month, income]) => ({ month, income }))
          .sort((a, b) => new Date(a.month) - new Date(b.month));
        setMonthlyIncome(monthlyIncomeArr);

        // Monthly Counts
        const countsMap = {};
        allBookings.forEach((b) => {
          const dateObj = normalizeDate(b.createdAt);
          if (dateObj) {
            const month = dateObj.toLocaleString("default", { month: "short", year: "numeric" });
            if (!countsMap[month]) countsMap[month] = { month, unpaid: 0, paid: 0, confirmed: 0, completed: 0 };
            if (b.status === "unpaid") countsMap[month].unpaid++;
            if (b.status === "paid") countsMap[month].paid++;
            if (b.status === "confirmed") countsMap[month].confirmed++;
            if (b.status === "completed") countsMap[month].completed++;
          }
        });
        const monthlyCountsArr = Object.values(countsMap).sort((a, b) => new Date(a.month) - new Date(b.month));
        setMonthlyCounts(monthlyCountsArr);

        // Popular Tours
        const popularMap = {};
        allBookings.forEach((b) => {
          const dateObj = normalizeDate(b.createdAt);
          if (dateObj && b.tourTitle) {
            const month = dateObj.toLocaleString("default", { month: "short", year: "numeric" });
            const key = `${month}-${b.tourTitle}`;
            popularMap[key] = (popularMap[key] || 0) + 1;
          }
        });
        const popularToursArr = Object.entries(popularMap)
          .map(([key, count]) => {
            const [month, ...rest] = key.split("-");
            const tourTitle = rest.join("-");
            return { month, tourTitle, count };
          })
          .sort((a, b) => b.count - a.count);
        setPopularTours(popularToursArr);

        // Deletion Stats
        const deletedBookings = await fetchCollectionData("deletedBookings");
        const deletedCount = deletedBookings.length;
        const totalCount = allBookings.length + deletedCount || 1;
        const deletionPercent = ((deletedCount / totalCount) * 100).toFixed(2);
        setDeletionStats([
          { type: "Deleted Tours", percent: parseFloat(deletionPercent) },
          { type: "Active Tours", percent: 100 - parseFloat(deletionPercent) },
        ]);

        setLoading(false); // 🔹 finished loading
      } catch (error) {
        console.error("❌ Error fetching reports:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="d-flex justify-content-center align-items-center vh-100">
          <Spinner animation="border" variant="primary" role="status" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container py-4 text-light">
        <h2 className="mb-4">Admin Reports Dashboard</h2>

        {/* KPI Tiles */}
        <div className="row mb-5">
          <div className="col-md-4">
            <div className="bg-primary rounded-4 p-4 shadow-lg text-center">
              <h5>Preset Bookings</h5>
              <h2>{totals.preset}</h2>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-success rounded-4 p-4 shadow-lg text-center">
              <h5>Custom Bookings</h5>
              <h2>{totals.custom}</h2>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-warning rounded-4 p-4 shadow-lg text-center">
              <h5>Vehicle Bookings</h5>
              <h2>{totals.vehicle}</h2>
            </div>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="mb-5 bg-dark rounded-4 p-4 shadow-lg">
          <h4 className="mb-3">Monthly Income</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyIncome}>
              <XAxis dataKey="month" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip formatter={(value) => `₹${value}`} />
              <Legend />
              <Bar dataKey="income" fill="#0d6efd" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Counts */}
        <div className="mb-5 bg-dark rounded-4 p-4 shadow-lg">
          <h4 className="mb-3">Monthly Booking Counts</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyCounts}>
              <XAxis dataKey="month" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip formatter={(value) => Number(value)} />
              <Legend />
              <Line dataKey="unpaid" stroke="#ffc107" />
              <Line dataKey="paid" stroke="#0d6efd" />
              <Line dataKey="confirmed" stroke="#198754" />
              <Line dataKey="completed" stroke="#6f42c1" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Popular Tours */}
        <div className="mb-5 bg-dark rounded-4 p-4 shadow-lg">
          <h4 className="mb-3">Most Popular Tours (Monthly)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={popularTours}>
              <XAxis dataKey="month" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip formatter={(value) => Number(value)} />
              <Legend />
              <Bar dataKey="count">
                {popularTours.map((entry, index) => {
                  let color = "#17a2b8";
                  if (index === 0) color = "#ffc107";
                  else if (index === 1) color = "#fd7e14";
                  else if (index === 2) color = "#0d6efd";
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deletion Stats */}
        <div className="mb-5 bg-dark rounded-4 p-4 shadow-lg">
          <h4 className="mb-3">Tour Deletion Percentage</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deletionStats}
                dataKey="percent"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {deletionStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}
