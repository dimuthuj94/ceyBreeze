// src/components/Footer.js
import React from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaTripadvisor, FaWhatsapp } from "react-icons/fa";

const QUICK_LINKS = [
  { name: "Home",             to: "/" },
  { name: "Tours",            to: "/tours" },
  { name: "Book Now",         to: "/booknow" },
  { name: "Cities & Adventures", to: "/citiesadventureactivities" },
  { name: "Gallery",          to: "/gallery" },
  { name: "Reviews",          to: "/reviews" },
  { name: "About Us",         to: "/contact" },
  { name: "Contact Us",       to: "/contact" },
];

const SERVICES = [
  { name: "Preset Tours",      to: "/booknow" },
  { name: "Custom Journeys",   to: "/booknow" },
  { name: "Vehicle Charter",   to: "/booknow" },
  { name: "Airport Transfers", to: "/booknow" },
  { name: "Group Tours",       to: "/booknow" },
];

const SOCIALS = [
  { Icon: FaFacebookF,   href: "https://facebook.com/",   label: "Facebook" },
  { Icon: FaInstagram,   href: "https://instagram.com/",  label: "Instagram" },
  { Icon: FaTripadvisor, href: "https://tripadvisor.com/", label: "TripAdvisor" },
  { Icon: FaWhatsapp,    href: "https://wa.me/94771234567", label: "WhatsApp" },
];

export default function Footer() {
  return (
    <footer className="footer-root">
      <div className="footer-top">

        {/* Brand */}
        <div>
          <div className="footer-brand">cey<span>Breeze</span> Tours</div>
          <p className="footer-brand-desc">
            Sri Lanka's most trusted travel partner. For over a decade, we have been crafting unforgettable
            journeys through one of the world's most beautiful island nations. From the misty highlands
            to golden coastlines — we know Sri Lanka like nowhere else.
          </p>
          <div className="footer-social">
            {SOCIALS.map(({ Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label={label}>
                <Icon />
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <span className="footer-col-label">Quick Links</span>
          {QUICK_LINKS.map(link => (
            <Link key={link.name} to={link.to} className="footer-link">{link.name}</Link>
          ))}
        </div>

        {/* Services */}
        <div>
          <span className="footer-col-label">Services</span>
          {SERVICES.map(s => (
            <Link key={s.name} to={s.to} className="footer-link">{s.name}</Link>
          ))}
          <Link to="/admin/mainmenu" className="footer-link" style={{ marginTop: "24px", opacity: "0.35" }}>Admin</Link>
        </div>

        {/* Contact */}
        <div>
          <span className="footer-col-label">Contact</span>
          <div className="footer-contact-item">
            <span className="footer-contact-icon">✆</span>
            <span>+94 77 123 4567</span>
          </div>
          <div className="footer-contact-item">
            <span className="footer-contact-icon">✉</span>
            <span>info@ceyBreezetours.com</span>
          </div>
          <div className="footer-contact-item">
            <span className="footer-contact-icon">◉</span>
            <span>123 Beach Road,<br/>Colombo, Sri Lanka</span>
          </div>
          <div className="footer-contact-item" style={{ marginTop: "20px" }}>
            <span className="footer-contact-icon">◎</span>
            <span style={{ fontSize: "12px" }}>Mon–Sat: 8:00 AM – 7:00 PM<br/>Sun: 9:00 AM – 5:00 PM</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copy">© {new Date().getFullYear()} CeyBreeze Tours (Pvt) Ltd. All rights reserved.</span>
        <div className="footer-legal">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/cookies">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
}