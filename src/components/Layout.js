import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children, hideFooter = false }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Navbar always visible */}
      <Navbar />

      {/* Main content */}
      <main className="flex-grow-1">
        {children}
      </main>

      {/* Footer visible only if hideFooter is false */}
      {!hideFooter && <Footer />}
    </div>
  );
}