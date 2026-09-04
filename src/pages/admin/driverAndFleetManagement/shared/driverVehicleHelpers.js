// src/pages/admin/driverAndFleetManagement/shared/driverVehicleHelpers.js

export const SectionBlock = ({ title, children }) => (
  <div style={{
    border: "1px solid rgba(0,39,107,0.1)",
    overflow: "hidden", marginBottom: "16px",
  }}>
    <div style={{
      background: "#00276b", padding: "9px 14px",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#a8edff", flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {title}
      </p>
    </div>
    <div style={{ padding: "14px", background: "#fff" }}>{children}</div>
  </div>
);

export const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "10px", color: "#7a9ab8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 0 }}>
      {label}
    </label>
    {children}
  </div>
);

export const inputStyle = {
  border: "1.5px solid rgba(0,39,107,0.15)",
  padding: "8px 11px", fontSize: "13px", color: "#00276b",
  width: "100%", background: "#fff", outline: "none",
  fontFamily: "'Outfit', sans-serif",
  /* NO borderRadius */
};

export const readOnlyInputStyle = {
  ...inputStyle,
  background: "rgba(0,39,107,0.03)", color: "#7a9ab8", cursor: "not-allowed",
};