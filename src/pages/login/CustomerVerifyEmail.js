// src/pages/customer/CustomerVerifyEmail.js
import React, { useState } from "react";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function CustomerVerifyEmail() {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        const pending = JSON.parse(localStorage.getItem("pendingUser"));
        await setDoc(doc(db, "customers", auth.currentUser.uid), {
          ...pending,
          email: auth.currentUser.email,
        });
        localStorage.removeItem("pendingUser");
        localStorage.setItem("isCustomer", "true");
        navigate("/customer/dashboard");
      } else {
        alert("Email not yet verified. Please click the link in your inbox first.");
      }
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
            <span className="auth-left-label">Account Setup</span>
            <h2 className="auth-left-title">Almost<br/>There</h2>
            <p className="auth-left-desc">
              You are just one step away from accessing your personalised CeyBreeze travel dashboard. Check your inbox and verify your email to complete registration.
            </p>
          </div>
          <div className="auth-left-footer">
            © {new Date().getFullYear()} CeyBreeze Tours (Pvt) Ltd.
          </div>
        </div>

        {/* Right */}
        <div className="auth-right">
          <span className="auth-eyebrow">Email Verification</span>
          <h2 className="auth-title">Verify your email address</h2>

          <div className="auth-verify-icon">✉</div>

          <p className="auth-sub" style={{ marginBottom: "24px" }}>
            A verification link has been sent to your registered email address.
            Click the link in your inbox, then press the button below to complete your account setup.
          </p>

          <button className="auth-btn" onClick={handleVerify} disabled={loading}>
            {loading ? "Checking..." : "Complete Registration ›"}
          </button>

          <div className="auth-divider" />

          <div className="auth-links">
            <p className="auth-link-text">
              Already verified?{" "}
              <span onClick={() => navigate("/customer-login")}>Log in here.</span>
            </p>
            <p className="auth-link-text">
              Didn't receive the email?{" "}
              <Link to="/customer-signup">Try signing up again.</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}