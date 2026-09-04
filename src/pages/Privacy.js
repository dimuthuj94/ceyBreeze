import React from "react";

export default function Privacy() {
  return (
    <div className="container mt-4">
      <h1 className="page-title">Privacy Policy</h1>
      <p>
        At <strong>Travel Explorer</strong>, we value your privacy and are committed 
        to protecting your personal data. This Privacy Policy explains how we collect, 
        use, and safeguard your information when you use our website and services.
      </p>

      <h5>1. Information We Collect</h5>
      <p>
        We may collect personal details such as your name, email address, phone number, 
        and payment information when you make bookings or contact us.
      </p>

      <h5>2. How We Use Your Information</h5>
      <ul>
        <li>To process bookings and provide travel services.</li>
        <li>To send booking confirmations and important updates.</li>
        <li>To improve our website and services.</li>
      </ul>

      <h5>3. Sharing of Information</h5>
      <p>
        We do not sell your data. Information may be shared with trusted partners only 
        to provide services such as accommodation and transport bookings.
      </p>

      <h5>4. Data Security</h5>
      <p>
        We implement strict security measures to protect your personal data. However, 
        please note that no method of transmission over the internet is 100% secure.
      </p>

      <h5>5. Your Rights</h5>
      <p>
        You have the right to request access, correction, or deletion of your personal 
        data by contacting us at <strong>info@travelexplorer.com</strong>.
      </p>

      <h5>6. Contact Us</h5>
      <p>
        If you have any questions about this Privacy Policy, please contact us at:<br />
        <strong>Email:</strong> info@travelexplorer.com <br />
        <strong>Phone:</strong> +94 77 123 4567
      </p>

      <p className="mt-4">
        <em>Last updated: {new Date().toLocaleDateString()}</em>
      </p>
    </div>
  );
}