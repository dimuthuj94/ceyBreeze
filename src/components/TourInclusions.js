import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";


export default function TourInclusions({ numTravelers, transportCost, accommodationName }) {
  const [inclusions, setInclusions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInclusions = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "inclusions", "General Inclusions");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInclusions(docSnap.data().items || []);
        } else {
          setInclusions([]);
        }
      } catch (err) {
        console.error("Error fetching inclusions:", err);
        setInclusions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInclusions();
  }, []);

  if (loading) return <p>Loading inclusions...</p>;

  return (
    <div className="p-3 border rounded bg-light h-100">
      <h6 className="fw-bold mb-3">📌 Inclusions & Notes</h6>
      <ul className="ms-3 text-muted mb-0">
        {inclusions.map((item, idx) => (
          <li key={idx}>
            {item.replace("{accommodation}", accommodationName || "Economy/Luxury")}
          </li>
        ))}

        {numTravelers > 1 && (
          <>
            <li>
              Transport cost: ${transportCost} per night per extra traveler ({numTravelers - 1} extra traveler{numTravelers-1>1?"s":""})
            </li>
            <li>
              Per traveler cost is displayed in the pricing table above.
            </li>
          </>
        )}
      </ul>
    </div>
  );
}