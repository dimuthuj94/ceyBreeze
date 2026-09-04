// src/pages/customer/CustomerProfile.js
import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CustomerLayout from "../../components/layouts/customer/CustomerLayout";
import { useNavigate } from "react-router-dom";

/* ── Profile completion field weights ─────────────────────────────────
   Keep these in sync with your Dashboard.js profile completion widget  */
const COMPLETION_FIELDS = [
  { key: "firstName",       label: "First Name",        weight: 15 },
  { key: "lastName",        label: "Last Name",         weight: 10 },
  { key: "contact",         label: "Phone Number",      weight: 15 },
  { key: "dateOfBirth",     label: "Date of Birth",     weight: 10 },
  { key: "nationality",     label: "Nationality",        weight: 10 },
  { key: "passportNumber",  label: "Passport Number",   weight: 10 },
  { key: "address",         label: "Address",           weight: 10 },
  { key: "emergencyName",   label: "Emergency Contact", weight: 10 },
  { key: "travelStyle",     label: "Travel Style",      weight: 5  },
  { key: "dietaryNeeds",    label: "Dietary Needs",     weight: 5  },
];

const calcCompletion = (data) => {
  const total = COMPLETION_FIELDS.reduce((s, f) => s + f.weight, 0);
  const done  = COMPLETION_FIELDS
    .filter(f => data[f.key] && String(data[f.key]).trim() !== "")
    .reduce((s, f) => s + f.weight, 0);
  return Math.round((done / total) * 100);
};

/* ── Shared field/section styles ── */
const fi = {
  width: "100%", padding: "10px 12px",
  border: "1.5px solid rgba(0,39,107,0.15)",
  fontSize: "13px", color: "#00276b",
  outline: "none", background: "#fff",
  boxSizing: "border-box", fontFamily: "'Outfit', sans-serif",
};
const fi_ro = { ...fi, background: "#f8f9fa", color: "#7a9ab8", cursor: "not-allowed" };
const fl = {
  fontSize: "10px", fontWeight: 700, color: "#7a9ab8",
  textTransform: "uppercase", letterSpacing: "0.1em",
  display: "block", marginBottom: "5px",
};

const Section = ({ title, icon, children }) => (
  <div style={{
    background: "#fff",
    border: "1px solid rgba(0,39,107,0.07)",
    marginBottom: "20px", overflow: "hidden",
  }}>
    <div style={{
      background: "#00276b", padding: "12px 18px",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span style={{
        fontSize: "11px", fontWeight: 700, color: "#a8edff",
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}>{title}</span>
    </div>
    <div style={{ padding: "20px" }}>{children}</div>
  </div>
);

const Field = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}` }}>
    <label style={fl}>{label}</label>
    {children}
  </div>
);

const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" };
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr",     gap: "16px" };

const TRAVEL_STYLES   = ["Adventure", "Cultural", "Relaxation", "Wildlife", "Beach", "Eco-Tourism", "Luxury", "Budget", "Family", "Honeymoon"];
const DIETARY_OPTIONS = ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Dairy-Free", "Other"];
const NATIONALITIES   = ["Sri Lankan","American","British","Australian","Canadian","German","French","Italian","Japanese","Chinese","Indian","Singaporean","Malaysian","Other"];

export default function CustomerProfile() {
  const [userData,    setUserData]    = useState({
    firstName: "", lastName: "", email: "", contact: "",
    dateOfBirth: "", nationality: "", passportNumber: "",
    address: "", city: "", country: "",
    emergencyName: "", emergencyRelation: "", emergencyContact: "",
    travelStyle: "", dietaryNeeds: "", specialRequests: "",
    bio: "",
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState(null); // { type: "success"|"error", text }
  const [uid,      setUid]      = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const navigate = useNavigate();

  /* ── Auth + load ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { navigate("/customer-login"); return; }
      setUid(user.uid);
      try {
        const snap = await getDoc(doc(db, "customers", user.uid));
        if (snap.exists()) {
          setUserData(prev => ({ ...prev, ...snap.data(), email: user.email }));
        } else {
          setUserData(prev => ({ ...prev, email: user.email }));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const completion = calcCompletion(userData);
  const missing = COMPLETION_FIELDS.filter(f => !userData[f.key] || String(userData[f.key]).trim() === "");

  const handleChange = (e) =>
    setUserData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!uid) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...userData,
        updatedAt: serverTimestamp(),
      };
      delete payload.email; // email is managed by Firebase Auth
      await setDoc(doc(db, "customers", uid), payload, { merge: true });
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const tabStyle = (t) => ({
    padding: "10px 20px", fontSize: "12px", fontWeight: 600,
    cursor: "pointer", border: "none",
    background: activeTab === t ? "#00276b" : "transparent",
    color:      activeTab === t ? "#fff"     : "#7a9ab8",
    borderRadius: "6px", transition: "all 0.2s",
  });

  if (loading) {
    return (
      <CustomerLayout pageTitle="My Profile">
        <div style={{ textAlign: "center", padding: "80px 0", color: "#7a9ab8" }}>
          Loading profile...
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout pageTitle="My Profile">
      <div>

        {/* ── Profile hero ── */}
        <div style={{
          background: "#00276b", padding: "28px 28px 0", marginBottom: "0",
          position: "relative", overflow: "hidden",
        }}>
          {/* Background dots */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "30px 30px", pointerEvents: "none",
          }} />

          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", position: "relative" }}>
            {/* Avatar */}
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "rgba(168,237,255,0.15)",
              border: "3px solid rgba(168,237,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px", fontWeight: 700, color: "#a8edff",
              flexShrink: 0, fontFamily: "'DM Serif Display', serif",
            }}>
              {userData.firstName?.[0] || "?"}{userData.lastName?.[0] || ""}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "22px", color: "#fff", marginBottom: "4px",
              }}>
                {userData.firstName || userData.lastName
                  ? `${userData.firstName} ${userData.lastName}`.trim()
                  : "Complete your profile"}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "16px" }}>
                {userData.email}
                {userData.nationality && ` · ${userData.nationality}`}
              </div>

              {/* Completion bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", color: "#a8edff", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Profile Completion
                  </span>
                  <span style={{ fontSize: "13px", color: "#a8edff", fontWeight: 700 }}>
                    {completion}%
                  </span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${completion}%`,
                    background: completion === 100
                      ? "#27a86e"
                      : "linear-gradient(90deg, #a8edff, #56c6e8)",
                    borderRadius: "3px", transition: "width 0.8s ease",
                  }} />
                </div>
                {completion < 100 && (
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "5px" }}>
                    Missing: {missing.map(f => f.label).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab strip */}
          <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
            {[
              { key: "personal",   label: "Personal Info"    },
              { key: "travel",     label: "Travel Preferences" },
              { key: "emergency",  label: "Emergency Contact" },
              { key: "account",    label: "Account"          },
            ].map(t => (
              <button
                key={t.key}
                style={{
                  ...tabStyle(t.key),
                  borderRadius: "6px 6px 0 0",
                  fontSize: "11px", padding: "8px 16px",
                  background: activeTab === t.key ? "#EFFAFD" : "transparent",
                  color:      activeTab === t.key ? "#00276b" : "rgba(255,255,255,0.6)",
                }}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Message banner ── */}
        {message && (
          <div style={{
            padding: "12px 18px", marginBottom: "0",
            background: message.type === "success" ? "#e1f5ee" : "#fcebeb",
            color:      message.type === "success" ? "#085041"  : "#791f1f",
            fontSize: "13px", fontWeight: 500,
            borderLeft: `4px solid ${message.type === "success" ? "#27a86e" : "#dc3545"}`,
          }}>
            {message.type === "success" ? "✓" : "⚠"} {message.text}
          </div>
        )}

        {/* ── Personal Info tab ── */}
        {activeTab === "personal" && (
          <>
            <Section title="Basic Information" icon="👤">
              <div style={grid3}>
                <Field label="First Name *">
                  <input name="firstName" value={userData.firstName} onChange={handleChange} style={fi} placeholder="Your first name" />
                </Field>
                <Field label="Last Name *">
                  <input name="lastName" value={userData.lastName} onChange={handleChange} style={fi} placeholder="Your last name" />
                </Field>
                <Field label="Email Address">
                  <input value={userData.email} style={fi_ro} readOnly />
                </Field>
                <Field label="Phone Number *">
                  <input name="contact" value={userData.contact} onChange={handleChange} style={fi} placeholder="+94 77 000 0000" />
                </Field>
                <Field label="Date of Birth *">
                  <input name="dateOfBirth" type="date" value={userData.dateOfBirth} onChange={handleChange} style={fi} />
                </Field>
                <Field label="Nationality *">
                  <select name="nationality" value={userData.nationality} onChange={handleChange} style={fi}>
                    <option value="">Select nationality...</option>
                    {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Passport & Travel Documents" icon="🛂">
              <div style={grid2}>
                <Field label="Passport / ID Number *">
                  <input name="passportNumber" value={userData.passportNumber} onChange={handleChange} style={fi} placeholder="e.g. N1234567" />
                </Field>
                <Field label="Passport Expiry Date">
                  <input name="passportExpiry" type="date" value={userData.passportExpiry || ""} onChange={handleChange} style={fi} />
                </Field>
              </div>
            </Section>

            <Section title="Address" icon="📍">
              <div style={{ ...grid3, marginBottom: "16px" }}>
                <Field label="Address Line *" span={3}>
                  <input name="address" value={userData.address} onChange={handleChange} style={fi} placeholder="Street address" />
                </Field>
                <Field label="City">
                  <input name="city" value={userData.city || ""} onChange={handleChange} style={fi} placeholder="City" />
                </Field>
                <Field label="Country">
                  <input name="country" value={userData.country || ""} onChange={handleChange} style={fi} placeholder="Country" />
                </Field>
                <Field label="Postal Code">
                  <input name="postalCode" value={userData.postalCode || ""} onChange={handleChange} style={fi} placeholder="Postal code" />
                </Field>
              </div>
            </Section>

            <Section title="About You" icon="✍">
              <Field label="Bio / Introduction">
                <textarea
                  name="bio" value={userData.bio || ""}
                  onChange={handleChange}
                  style={{ ...fi, resize: "vertical", minHeight: "80px" }}
                  placeholder="Tell us a little about yourself..."
                />
              </Field>
            </Section>
          </>
        )}

        {/* ── Travel Preferences tab ── */}
        {activeTab === "travel" && (
          <>
            <Section title="Travel Style & Preferences" icon="✈">
              <div style={grid2}>
                <Field label="Preferred Travel Style *">
                  <select name="travelStyle" value={userData.travelStyle || ""} onChange={handleChange} style={fi}>
                    <option value="">Select style...</option>
                    {TRAVEL_STYLES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Dietary Requirements *">
                  <select name="dietaryNeeds" value={userData.dietaryNeeds || ""} onChange={handleChange} style={fi}>
                    <option value="">Select dietary needs...</option>
                    {DIETARY_OPTIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Accommodation Preference">
                  <select name="accommodationPref" value={userData.accommodationPref || ""} onChange={handleChange} style={fi}>
                    <option value="">Select preference...</option>
                    {["Budget / Hostel","3 Star Hotel","4 Star Hotel","5 Star Hotel","Boutique Hotel","Villa","Homestay"].map(a => <option key={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label="Transport Preference">
                  <select name="transportPref" value={userData.transportPref || ""} onChange={handleChange} style={fi}>
                    <option value="">Select preference...</option>
                    {["Private Car","Tuk-Tuk","Shared Transport","Coach","Train"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: "16px" }}>
                <Field label="Interests (comma separated)">
                  <input name="interests" value={userData.interests || ""} onChange={handleChange} style={fi} placeholder="e.g. Wildlife, Tea Plantations, Ancient Ruins, Surfing..." />
                </Field>
              </div>
              <div style={{ marginTop: "16px" }}>
                <Field label="Special Requests / Notes">
                  <textarea
                    name="specialRequests" value={userData.specialRequests || ""}
                    onChange={handleChange}
                    style={{ ...fi, resize: "vertical", minHeight: "80px" }}
                    placeholder="Wheelchair access, specific room requirements, other requests..."
                  />
                </Field>
              </div>
            </Section>

            <Section title="Experience History" icon="🌍">
              <div style={grid2}>
                <Field label="Countries Visited">
                  <input name="countriesVisited" value={userData.countriesVisited || ""} onChange={handleChange} style={fi} placeholder="e.g. India, Thailand, Maldives..." />
                </Field>
                <Field label="Travel Frequency">
                  <select name="travelFrequency" value={userData.travelFrequency || ""} onChange={handleChange} style={fi}>
                    <option value="">Select...</option>
                    {["First time","Occasional (1-2/year)","Regular (3-5/year)","Frequent (6+/year)"].map(f => <option key={f}>{f}</option>)}
                  </select>
                </Field>
              </div>
            </Section>
          </>
        )}

        {/* ── Emergency Contact tab ── */}
        {activeTab === "emergency" && (
          <Section title="Emergency Contact" icon="🆘">
            <div style={{
              background: "#faeeda", border: "1px solid rgba(253,174,0,0.25)",
              padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "#633806",
            }}>
              ⚠ This information is used only in case of an emergency during your tour. Please ensure it is accurate.
            </div>
            <div style={grid3}>
              <Field label="Full Name *">
                <input name="emergencyName" value={userData.emergencyName || ""} onChange={handleChange} style={fi} placeholder="Emergency contact name" />
              </Field>
              <Field label="Relationship">
                <select name="emergencyRelation" value={userData.emergencyRelation || ""} onChange={handleChange} style={fi}>
                  <option value="">Select...</option>
                  {["Spouse","Parent","Child","Sibling","Friend","Other"].map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Phone Number">
                <input name="emergencyContact" value={userData.emergencyContact || ""} onChange={handleChange} style={fi} placeholder="+94 77 000 0000" />
              </Field>
              <Field label="Email">
                <input name="emergencyEmail" value={userData.emergencyEmail || ""} onChange={handleChange} style={fi} placeholder="Emergency contact email" />
              </Field>
              <Field label="Country">
                <input name="emergencyCountry" value={userData.emergencyCountry || ""} onChange={handleChange} style={fi} placeholder="Their country" />
              </Field>
            </div>
          </Section>
        )}

        {/* ── Account tab ── */}
        {activeTab === "account" && (
          <>
            <Section title="Account Information" icon="⚙">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
                {[
                  ["Account Email",   userData.email,                       "—"],
                  ["Member Since",    userData.createdAt
                    ? (userData.createdAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) || "—")
                    : "—",                                                  "—"],
                  ["Profile Status",  completion === 100 ? "Complete" : `${completion}% complete`, "—"],
                  ["Account Type",    "Traveller",                          "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    background: "rgba(0,39,107,0.02)",
                    border: "1px solid rgba(0,39,107,0.06)",
                    padding: "12px 16px",
                  }}>
                    <div style={{ fontSize: "10px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "13px", color: "#00276b", fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Profile completion checklist */}
            <Section title="Profile Completion Checklist" icon="✅">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {COMPLETION_FIELDS.map(f => {
                  const done = userData[f.key] && String(userData[f.key]).trim() !== "";
                  return (
                    <div key={f.key} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px",
                      background: done ? "#e1f5ee" : "rgba(0,39,107,0.02)",
                      border: `1px solid ${done ? "rgba(39,168,110,0.2)" : "rgba(0,39,107,0.06)"}`,
                    }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{ fontSize: "14px" }}>{done ? "✓" : "○"}</span>
                        <span style={{ fontSize: "12px", color: done ? "#085041" : "#7a9ab8", fontWeight: done ? 600 : 400 }}>
                          {f.label}
                        </span>
                      </div>
                      <span style={{ fontSize: "10px", color: done ? "#27a86e" : "#adc6d8", fontWeight: 700 }}>
                        +{f.weight}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {completion < 100 && (
                <button
                  onClick={() => setActiveTab("personal")}
                  style={{
                    marginTop: "16px", background: "#00276b", color: "#fff",
                    border: "none", padding: "10px 20px", fontSize: "12px",
                    fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Complete My Profile
                </button>
              )}
            </Section>
          </>
        )}

        {/* ── Save bar ── */}
        {activeTab !== "account" && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", background: "#fff",
            border: "1px solid rgba(0,39,107,0.07)", marginBottom: "32px",
          }}>
            <div style={{ fontSize: "12px", color: "#7a9ab8" }}>
              Profile completion: <strong style={{ color: completion === 100 ? "#27a86e" : "#00276b" }}>{completion}%</strong>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving ? "rgba(0,39,107,0.5)" : "#00276b",
                color: "#fff", border: "none", padding: "10px 28px",
                fontSize: "12px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                letterSpacing: "0.1em", textTransform: "uppercase",
                transition: "background 0.2s",
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}