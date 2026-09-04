import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load custom font dynamically
  useEffect(() => {
    const font = new FontFace(
      "LibreFranklin",
      `url(${process.env.PUBLIC_URL}/fonts/LibreFranklin-VariableFont_wght.ttf)`
    );
    font.load().then(() => {
      document.fonts.add(font);
      document.body.style.fontFamily = "'LibreFranklin', sans-serif";
    });
  }, []);

  const adminEmail = "admin@example.com"; // change to your real admin email

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.email !== adminEmail) {
        setError("You are not authorized as admin.");
        setLoading(false);
        return;
      }

      localStorage.setItem("isAdmin", "true");
      navigate("/admin/mainmenu");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: "100vh",
        backgroundColor: "#EFFAFD",
        padding: "20px",
        fontFamily: "'LibreFranklin', sans-serif",
      }}
    >
      <div
        className="d-flex flex-column flex-md-row align-items-center bg-white rounded-4 shadow-lg p-4"
        style={{
          width: "100%",
          maxWidth: "850px",
          overflow: "hidden",
          margin: "0 auto",
        }}
      >
        {/* 🔹 Left Side - Logo */}
        <div className="text-center text-md-start me-md-4 mb-4 mb-md-0 flex-shrink-0">
          <img
            src={`${process.env.PUBLIC_URL}/images/logo.png`}
            alt="CeyBreeze Logo"
            className="img-fluid"
            style={{
              maxWidth: "280px",
              borderRadius: "15px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* 🔹 Right Side - Admin Login Form */}
        <div
          className="card border-0 shadow-sm p-4 rounded-4 flex-grow-1"
          style={{
            maxWidth: "450px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          <h4
            className="mb-3 text-center"
            style={{
              color: "#00276b",
              fontFamily: "'LibreFranklin', sans-serif",
              fontWeight: "400",
              letterSpacing: "2px",
            }}
          >
            ADMIN LOGIN
          </h4>

          {error && (
            <div
              className="alert alert-danger"
              style={{ fontFamily: "'LibreFranklin', sans-serif", fontSize: "0.9rem" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                style={{ fontFamily: "'LibreFranklin', sans-serif" }}
                required
              />
            </div>

            <div className="mb-3">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                style={{ fontFamily: "'LibreFranklin', sans-serif" }}
                required
              />
            </div>

            <button
              type="submit"
              className="w-100 text-white rounded-3 py-2 border-0 shadow"
              style={{
                backgroundColor: "#00276b",
                transition: "background-color 0.3s ease",
                fontFamily: "'LibreFranklin', sans-serif",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#004994")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#00276b")}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p
            className="text-muted mt-3 text-center"
            style={{ fontSize: "0.8rem", fontFamily: "'LibreFranklin', sans-serif" }}
          >
            Only authorized admins can access this portal.
          </p>
        </div>
      </div>
    </div>
  );
}
