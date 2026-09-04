import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaPlane,
  FaBook,
  FaUsers,
  FaImages,
  FaHome,
  FaMapMarkerAlt,
  FaCarSide,
  FaMoneyBillAlt,
  FaSwimmer
} from "react-icons/fa";


export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setCollapsed(!collapsed);
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };
  
  const goToMenu = () => {
    navigate("/admin/mainmenu");
  };
  

  


  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      {isAdmin && (
        <div
          className="bg-dark text-light p-3 d-flex flex-column"
          style={{ width: collapsed ? "60px" : "240px", transition: "width 0.3s" }}
        >
          <h5 className="text-center fw-bold mb-4">{collapsed ? "TE" : "Menu"}</h5>

          <ul className="nav nav-pills flex-column mb-auto">
            <li className="nav-item mb-2">
              <Link to="/admin" className="nav-link text-light d-flex align-items-center">
                <FaHome className="me-2" /> {!collapsed && "Dashboard"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link to="/admin/tours" className="nav-link text-light d-flex align-items-center">
                <FaPlane className="me-2" /> {!collapsed && "Tours"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link to="/admin/users" className="nav-link text-light d-flex align-items-center">
                <FaUsers className="me-2" /> {!collapsed && "Users"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link to="/admin/gallery" className="nav-link text-light d-flex align-items-center">
                <FaImages className="me-2" /> {!collapsed && "Gallery"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link to="/admin/carouselmanager" className="nav-link text-light d-flex align-items-center">
                <FaImages className="me-2" /> {!collapsed && "Main Carousel"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/citiesanddestinations"
                className="nav-link text-light d-flex align-items-center"
              >
                <FaMapMarkerAlt className="me-2" /> {!collapsed && "Cities and Destinations"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/vehiclesandaccommodations"
                className="nav-link text-light d-flex align-items-center"
              >
                <FaCarSide className="me-2" /> {!collapsed && "Vehicles and Accommodations"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/manageprices"
                className="nav-link text-light d-flex align-items-center"
              >
                <FaMoneyBillAlt className="me-2" /> {!collapsed && "Prices and Inclusions"}
              </Link>
            </li>
             <li className="nav-item mb-2">
              <Link
                to="/admin/activitiesandadventure"
                className="nav-link text-light d-flex align-items-center"
              >
                <FaSwimmer className="me-2" /> {!collapsed && "Activities and Adventure"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/content-management/news-and-highlights"
                className="nav-link text-light d-flex align-items-center"
              >
                <FaSwimmer className="me-2" /> {!collapsed && "News and Highlights"}
              </Link>
            </li>
            <li className="nav-item mb-2">
              <Link
                to="/admin/reports"
                className="nav-link text-light d-flex align-items-center"
              >
                <FaSwimmer className="me-2" /> {!collapsed && "Reports"}
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
      )}

      {/* Main Content */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Topbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
          <div className="container-fluid">
            <button className="btn btn-outline-secondary" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <span className="navbar-brand ms-3">Content Management</span>
            {isAdmin && (
              <button className="btn btn-outline-danger ms-auto" onClick={handleLogout}>
                Logout
              </button>
            )}
            <button className="btn btn-primary ms-auto" onClick={goToMenu}>
                Go to Menu
              </button>
          </div>
        </nav>

        {/* Content Area */}
        <div className="p-4 flex-grow-1 bg-light">{children}</div>
      </div>
    </div>
  );
}