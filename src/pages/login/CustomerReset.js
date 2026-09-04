// src/pages/customer/CustomerResetPassword.js
import React, { useState } from "react";
import { auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";

export default function CustomerResetPassword() {
  const [email, setEmail]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) return alert("Please enter your email address.");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
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
            <span className="auth-left-label">Account Recovery</span>
            <h2 className="auth-left-title">Reset Your<br/>Password</h2>
            <p className="auth-left-desc">
              Forgotten your password? No problem. Enter your registered email address and we will send you a secure link to reset it within minutes.
            </p>
          </div>
          <div className="auth-left-footer">
            © {new Date().getFullYear()} CeyBreeze Tours (Pvt) Ltd.
          </div>
        </div>

        {/* Right */}
        <div className="auth-right">
          <span className="auth-eyebrow">Password Reset</span>
          <h2 className="auth-title">Recover your account</h2>
          <p className="auth-sub">
            Enter your registered email address and we'll send you a password reset link.
          </p>

          {success ? (
            <div className="auth-success">
              ✓ Password reset email sent — please check your inbox and follow the link.
            </div>
          ) : (
            <>
              <input
                type="email"
                className="auth-input"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReset()}
              />
              <button className="auth-btn" onClick={handleReset} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link ›"}
              </button>
            </>
          )}

          <div className="auth-divider" />

          <div className="auth-links">
            <p className="auth-link-text">
              Remembered your password?{" "}
              <Link to="/customer-login">Log in here.</Link>
            </p>
            <p className="auth-link-text">
              New to CeyBreeze?{" "}
              <Link to="/customer-signup">Create an account.</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}