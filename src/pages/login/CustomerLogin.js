// src/pages/customer/CustomerLogin.js
import React, { useState } from "react";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function CustomerLogin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const redirectPath = location.state?.from?.pathname || "/customer/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return alert("Please enter your email and password.");
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (!user.emailVerified) {
        alert("Please verify your email before logging in.");
        setLoading(false);
        return;
      }
      navigate(redirectPath, { replace: true });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Left */}
        <div className="auth-left">
          <div className="auth-left-dots" />
          <div className="auth-left-brand">cey<span>Breeze</span> Tours</div>
          <div className="auth-left-body">
            <span className="auth-left-label">Member Portal</span>
            <h2 className="auth-left-title">Welcome<br/>Back</h2>
            <p className="auth-left-desc">
              Log in to manage your reservations, track your upcoming journeys, chat with our team and access your personalised travel dashboard.
            </p>
          </div>
          <div className="auth-left-footer">
            © {new Date().getFullYear()} CeyBreeze Tours (Pvt) Ltd.
          </div>
        </div>

        {/* Right */}
        <div className="auth-right">
          <span className="auth-eyebrow">Member Login</span>
          <h2 className="auth-title">Sign in to your account</h2>
          <p className="auth-sub">Access your dashboard, reservations and more.</p>

          <input
            type="email"
            className="auth-input"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />

          <button className="auth-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In ›"}
          </button>

          <div className="auth-divider" />

          <div className="auth-links">
            <p className="auth-link-text">
              New to CeyBreeze?{" "}
              <Link to="/customer-signup">Create an account to start your journey.</Link>
            </p>
            <p className="auth-link-text">
              Forgot your password?{" "}
              <Link to="/customer-reset-password">Reset it here.</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}