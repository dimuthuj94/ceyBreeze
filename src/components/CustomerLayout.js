import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FaBars, FaBook, FaUser, FaComment, FaHome } from "react-icons/fa";

export default function CustomerLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        localStorage.setItem("isCustomer", "true");

        const docRef = doc(db, "customers", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCustomerName(docSnap.data().firstName || "Profile");
        }
      } else {
        localStorage.removeItem("isCustomer");
        navigate("/customer-login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("isCustomer");
    navigate("/");
  };

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <div
        className={`bg-dark text-light p-3 d-flex flex-column`}
        style={{ width: collapsed ? "60px" : "220px", transition: "width 0.3s" }}
      >
        <h5 className="text-center fw-bold mb-4">{collapsed ? "CB" : "CeyBreeze"}</h5>
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item mb-2">
            <Link className="nav-link text-light d-flex align-items-center" to="/customer-dashboard">
              <FaHome className="me-2" /> {!collapsed && "Dashboard"}
            </Link>
          </li>
          <li className="nav-item mb-2">
            <Link className="nav-link text-light d-flex align-items-center" to="/customer/my-bookings">
              <FaBook className="me-2" /> {!collapsed && "My Bookings"}
            </Link>
          </li>
          <li className="nav-item mb-2">
            <Link className="nav-link text-light d-flex align-items-center" to="/customer/give-feedback">
              <FaComment className="me-2" /> {!collapsed && "Give Feedback"}
            </Link>
          </li>
          <li className="nav-item mb-2">
            <Link className="nav-link text-light d-flex align-items-center" to="/customer/profile">
              <FaUser className="me-2" /> {!collapsed && "My Profile"}
            </Link>
          </li>
        </ul>

        <button
          className="btn btn-secondary mt-auto"
          onClick={toggleSidebar}
          style={{ fontSize: "0.8rem" }}
        >
          {collapsed ? "→" : "Collapse"}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-grow-1 d-flex flex-column">
        <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
          <div className="container-fluid">
            <button className="btn btn-outline-secondary" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <span className="navbar-brand ms-3">Customer Panel</span>
            <button className="btn btn-outline-danger ms-auto" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>

        <div className="p-4 flex-grow-1">{children}</div>
      </div>
    </div>
  );
}