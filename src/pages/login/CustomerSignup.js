// src/pages/customer/CustomerSignup.js
import React, { useState } from "react";
import { auth } from "../../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Belarus","Belgium","Belize",
  "Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria",
  "Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Chad","Chile","China","Colombia",
  "Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Ecuador","Egypt",
  "El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece",
  "Guatemala","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Madagascar","Malaysia","Maldives",
  "Mali","Malta","Mexico","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique",
  "Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Nigeria","North Korea",
  "Norway","Oman","Pakistan","Palestine","Panama","Paraguay","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Singapore",
  "Slovakia","Slovenia","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka",
  "Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Tunisia",
  "Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

export default function CustomerSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    password: "", confirmPassword: "", contact: "", country: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePhone  = (value) => setForm({ ...form, contact: value });

  const handleSignup = async () => {
    if (form.password !== form.confirmPassword) return alert("Passwords do not match.");
    if (!form.firstName || !form.lastName || !form.email) return alert("Please fill out all required fields.");
    if (!form.country) return alert("Please select your country.");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await sendEmailVerification(cred.user);
      localStorage.setItem("pendingUser", JSON.stringify(form));
      alert("Verification email sent! Please check your inbox.");
      navigate("/customer-verify-email");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "980px" }}>

        {/* Left */}
        <div className="auth-left">
          <div className="auth-left-dots" />
          <div className="auth-left-brand">cey<span>Breeze</span> Tours</div>
          <div className="auth-left-body">
            <span className="auth-left-label">New Member</span>
            <h2 className="auth-left-title">Start Your<br/>Journey</h2>
            <p className="auth-left-desc">
              Create your free CeyBreeze account and unlock access to our full range of Sri Lankan tour experiences, reservation management and exclusive member benefits.
            </p>
          </div>
          <div className="auth-left-footer">
            © {new Date().getFullYear()} CeyBreeze Tours (Pvt) Ltd.
          </div>
        </div>

        {/* Right */}
        <div className="auth-right">
          <span className="auth-eyebrow">Create Account</span>
          <h2 className="auth-title">Join CeyBreeze</h2>
          <p className="auth-sub">All fields marked are required to complete your profile.</p>

          {/* Name row */}
          <div className="auth-input-row">
            <input
              className="auth-input" style={{ marginBottom: 0 }}
              placeholder="First Name *" name="firstName"
              value={form.firstName} onChange={handleChange}
            />
            <input
              className="auth-input" style={{ marginBottom: 0 }}
              placeholder="Last Name *" name="lastName"
              value={form.lastName} onChange={handleChange}
            />
          </div>
          <div style={{ height: "12px" }} />

          <input
            type="email" className="auth-input"
            placeholder="Email address *" name="email"
            value={form.email} onChange={handleChange}
          />

          {/* Password row */}
          <div className="auth-input-row">
            <input
              type="password" className="auth-input" style={{ marginBottom: 0 }}
              placeholder="Password *" name="password"
              value={form.password} onChange={handleChange}
            />
            <input
              type="password" className="auth-input" style={{ marginBottom: 0 }}
              placeholder="Confirm Password *" name="confirmPassword"
              value={form.confirmPassword} onChange={handleChange}
            />
          </div>
          <div style={{ height: "12px" }} />

          {/* Phone */}
          <div style={{ marginBottom: "12px" }}>
            <PhoneInput
              country="lk"
              value={form.contact}
              onChange={handlePhone}
              inputStyle={{ width: "100%", height: "44px", borderRadius: 0, fontSize: "13px", fontFamily: "'Outfit', sans-serif", color: "#00276b" }}
              containerStyle={{ width: "100%" }}
            />
          </div>

          {/* Country */}
          <select
            className="auth-input"
            name="country"
            value={form.country}
            onChange={handleChange}
            style={{ appearance: "auto" }}
          >
            <option value="">Select Country *</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button className="auth-btn" onClick={handleSignup} disabled={loading}>
            {loading ? "Creating Account..." : "Create Account ›"}
          </button>

          <div className="auth-divider" />

          <div className="auth-links">
            <p className="auth-link-text">
              Already have an account? <Link to="/customer-login">Log in here.</Link>
            </p>
            <p className="auth-link-text">
              By signing up you agree to our <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}