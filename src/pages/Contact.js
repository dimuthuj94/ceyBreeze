// src/pages/About.js
import React from "react";
import { Container, Row, Col, Card, Image } from "react-bootstrap";

export default function About() {
  // Inline styles
  const pageStyle = {
    backgroundColor: "#effafd",
    minHeight: "100vh",
    fontFamily: "LibreFranklin, sans-serif",
    padding: "60px 0",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    color: "#333",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.08)",
    padding: "24px",
  };

  const sectionCardStyle = {
    ...cardStyle,
    backgroundColor: "#e3f2fd",
  };

  const closingCardStyle = {
    ...cardStyle,
    backgroundColor: "#dff6ff",
    textAlign: "center",
    color: "#004466",
  };

  // Font-face inline style
  const fontFaceStyle = `
    @font-face {
      font-family: 'LibreFranklin';
      src: url('/fonts/LibreFranklin-VariableFont_wght.ttf') format('truetype');
      font-weight: 100 900;
      font-style: normal;
    }
  `;

  return (
    <div style={pageStyle}>
      {/* Embed font-face */}
      <style>{fontFaceStyle}</style>

      <Container>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <Image
            src="/images/logo.png"
            alt="ceyBreeze Tours Logo"
            style={{ width: "120px", height: "auto" }}
          />
        </div>

        {/* Page Title */}
        <h1 className="page-title">
          About Us
        </h1>

        {/* Introduction */}
        <Row style={{ marginBottom: "50px" }}>
          <Col>
            <Card style={cardStyle}>
              <Card.Body>
                <p style={{ fontSize: "1.1rem", lineHeight: "1.8" }}>
                  <strong>ceyBreeze Tours</strong> is a premier, all-inclusive travel agency
                  dedicated to providing unforgettable experiences for visitors exploring
                  the beautiful island of Sri Lanka. From the moment our guests arrive,
                  we aim to make every journey seamless, enjoyable, and tailored to
                  their unique preferences.
                </p>
                <p style={{ fontSize: "1.1rem", lineHeight: "1.8" }}>
                  The name <strong>“ceyBreeze”</strong> is inspired by the serene and refreshing
                  breeze that sweeps across the island of Ceylon (the historic name for Sri Lanka),
                  symbolizing freedom, comfort, and the joy of travel.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Vision and Mission */}
        <Row style={{ marginBottom: "50px" }}>
          <Col md={6} style={{ marginBottom: "20px" }}>
            <Card style={cardStyle}>
              <Card.Body>
                <h3 style={{ fontWeight: 700, marginBottom: "20px", color: "#0077b6" }}>
                  Our Vision
                </h3>
                <p style={{ fontSize: "1.1rem", lineHeight: "1.7" }}>
                  To become the country’s leading hustle-free travel solution provider in Sri Lanka,
                  making every traveler’s experience smooth, memorable, and stress-free.
                </p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card style={cardStyle}>
              <Card.Body>
                <h3 style={{ fontWeight: 700, marginBottom: "20px", color: "#0077b6" }}>
                  Our Mission
                </h3>
                <p style={{ fontSize: "1.1rem", lineHeight: "1.7" }}>
                  To give the best travel experience in Sri Lanka to our visitors, whether they
                  seek adventure, cultural immersion, relaxation, or a combination of all.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* What Makes Us Special */}
        <Row style={{ marginBottom: "50px" }}>
          <Col>
            <h3 style={{ fontWeight: 700, marginBottom: "40px", textAlign: "center", color: "#005f99" }}>
              What Makes Us Special
            </h3>
            <Row style={{ gap: "20px" }}>
              {[
                {
                  title: "Preset Tour Plans",
                  text: "Carefully curated itineraries that cover the best of Sri Lanka’s attractions.",
                },
                {
                  title: "Fully Customizable Tours",
                  text: "Flexibility to design your own travel experience exactly how you envision it.",
                },
                {
                  title: "Vehicle-Only Booking",
                  text: "Convenient vehicle hire options for those who prefer to explore independently.",
                },
              ].map((item, i) => (
                <Col md={4} key={i}>
                  <Card style={sectionCardStyle}>
                    <Card.Body>
                      <h5 style={{ fontWeight: 700, marginBottom: "15px", color: "#0077b6" }}>
                        {item.title}
                      </h5>
                      <p style={{ fontSize: "1rem", lineHeight: "1.6" }}>{item.text}</p>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>

        {/* Closing Statement */}
        <Row>
          <Col>
            <Card style={closingCardStyle}>
              <Card.Body>
                <p style={{ fontSize: "1.15rem", lineHeight: "1.8" }}>
                  At <strong>ceyBreeze Tours</strong>, we believe that travel is not just about visiting
                  destinations, but about creating lifelong memories. We combine local expertise,
                  personalized service, and a passion for Sri Lanka to ensure every journey is exceptional.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
