import React, { useState } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";

export default function GiveFeedback() {
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    try {
      await addDoc(collection(db, "feedbacks"), {
        userId: auth.currentUser.uid,
        feedback,
        date: new Date()
      });
      setFeedback("");
      setMessage("Thank you for your feedback!");
    } catch (err) {
      console.error(err);
      setMessage("Error submitting feedback.");
    }
  };

  return (
    <div>
      <h2>Give Feedback</h2>
      <textarea
        className="form-control mb-2"
        rows={4}
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
      />
      <button className="btn btn-primary mb-2" onClick={handleSubmit}>Submit</button>
      {message && <div className="alert alert-info">{message}</div>}
    </div>
  );
}