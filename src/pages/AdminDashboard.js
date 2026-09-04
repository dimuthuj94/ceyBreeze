// src/pages/admindashboard.js
import React from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout"; // Corrected import
import { FaPlane, FaBook, FaUsers, FaImages, FaImages as FaCarousel, FaMapMarkedAlt } from "react-icons/fa";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const adminCards = [
    {
      title: "Tours",
      description: "Add, edit, or remove tours",
      icon: <FaPlane size={40} className="mb-2 text-primary" />,
      route: "/admin/tours",
      btnClass: "btn-primary"
    },
    {
      title: "Bookings",
      description: "View & manage bookings",
      icon: <FaBook size={40} className="mb-2 text-success" />,
      route: "/admin/bookings",
      btnClass: "btn-success"
    },
    {
      title: "Users",
      description: "Manage user accounts",
      icon: <FaUsers size={40} className="mb-2 text-warning" />,
      route: "/admin/users",
      btnClass: "btn-warning text-dark"
    },
    {
      title: "Gallery",
      description: "Add or remove gallery images",
      icon: <FaImages size={40} className="mb-2 text-danger" />,
      route: "/admin/gallery",
      btnClass: "btn-danger"
    },
    {
      title: "Carousel Manager",
      description: "Manage homepage carousel",
      icon: <FaCarousel size={40} className="mb-2 text-info" />,
      route: "/admin/carouselmanager",
      btnClass: "btn-info text-dark"
    },
    {
      title: "Cities & Destinations",
      description: "Manage cities and travel destinations",
      icon: <FaMapMarkedAlt size={40} className="mb-2 text-secondary" />,
      route: "/admin/citiesanddestinations",
      btnClass: "btn-secondary"
    }
  ];

  return (
    <AdminLayout>
      <div className="container mt-4">
        <h2 className="mb-4">Welcome to Admin Dashboard</h2>
        <p>Manage your website content and monitor activities here.</p>

        <div className="row g-4 mt-3">
          {adminCards.map((card, index) => (
            <div key={index} className="col-md-6 col-lg-4">
              <div className="card shadow-sm text-center h-100">
                <div className="card-body d-flex flex-column justify-content-center">
                  {card.icon}
                  <h5 className="card-title">{card.title}</h5>
                  <p className="card-text">{card.description}</p>
                  <button
                    className={`btn ${card.btnClass} btn-sm mt-auto`}
                    onClick={() => navigate(card.route)}
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}