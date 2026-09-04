/* import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  return isAdmin ? children : <Navigate to="/admin-login" />;
}
 */
/* import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  if (role === "admin") {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    return isAdmin ? children : <Navigate to="/admin-login" replace />;
  } else if (role === "customer") {
    const isCustomer = localStorage.getItem("isCustomerLoggedIn") === "true";
    return isCustomer ? children : <Navigate to="/customer-login" replace />;
  } else {
    // fallback: if role not provided, block access
    return <Navigate to="/" replace />;
  }
} */

/*   // ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

export default function ProtectedRoute({ children, role }) {
  const user = auth.currentUser;

  if (role === "customer") {
    // Customer must be logged in and email verified
    if (user && user.emailVerified) {
      return children;
    } else {
      return <Navigate to="/customer-login" replace />;
    }
  }

  if (role === "admin") {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    return isAdmin ? children : <Navigate to="/admin-login" replace />;
  }

  return <Navigate to="/" replace />;
} */

  // ProtectedRoute.js
/* import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";

export default function ProtectedRoute({ children, role }) {
  const user = auth.currentUser;
  const location = useLocation(); // capture the page user tried to access

  if (role === "customer") {
    if (user && user.emailVerified) {
      return children;
    } else {
      // redirect to login and pass the intended page in state
      return <Navigate to="/customer-login" state={{ from: location }} replace />;
    }
  }

  if (role === "admin") {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    return isAdmin ? children : <Navigate to="/admin-login" replace />;
  }

  return <Navigate to="/" replace />;
}
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";

export default function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const user = auth.currentUser;

  if (role === "customer") {
    if (user && user.emailVerified) {
      return children;
    } else {
      // Pass the page user tried to access to login page
      return <Navigate to="/customer-login" state={{ from: location }} replace />;
    }
  }

  if (role === "admin") {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    return isAdmin ? children : <Navigate to="/admin-login" replace />;
  }

  return <Navigate to="/" replace />;
}