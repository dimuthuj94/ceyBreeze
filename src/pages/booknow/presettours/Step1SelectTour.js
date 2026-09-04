// src/pages/booknow/presettours/presettours/Step1SelectTour.js
import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import TourModal from "../../../components/modals/TourModal";
import ActivityModal from "../../../components/modals/ActivityModal";

const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Step1SelectTour({
  tours, selectedTour, setSelectedTour, setActiveKey, selectedActivities, setSelectedActivities
}) {
  const [modalItem, setModalItem]   = useState(null);
  const [modalType, setModalType]   = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const activitiesRef = useRef(null);
  const toursRef      = useRef(null);

  useEffect(() => {
    setLoadingActivities(true);
    getDocs(collection(db, "additionalActivities"))
      .then(q => setActivities(q.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoadingActivities(false));
  }, []);

  const isAvailable = (a) => {
    const av = a?.availability;
    if (typeof av === "boolean") return av;
    if (typeof av === "string") return av.trim().toLowerCase() === "yes";
    return false;
  };

  const parseMonths = (data) => {
    if (!data) return [];
    if (Array.isArray(data))
      return data.map(m => String(m).slice(0, 3)).filter(m => MONTH_ORDER.includes(m));
    return String(data).split(/[\s,;-]+/).map(m => m.slice(0, 3)).filter(m => MONTH_ORDER.includes(m));
  };

  const handleActivityToggle = (activity) => {
    if (!isAvailable(activity)) return;
    setSelectedActivities(prev =>
      prev.find(a => a.id === activity.id)
        ? prev.filter(a => a.id !== activity.id)
        : [...prev, activity]
    );
  };

  // Enable horizontal scroll with mouse wheel
  useEffect(() => {
    const enable = (ref) => {
      if (!ref.current) return;
      const el = ref.current;
      const onWheel = (e) => {
        if (Math.abs(e.deltaX) > 0 || e.shiftKey) return;
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    };
    const c1 = enable(toursRef);
    const c2 = enable(activitiesRef);
    return () => { c1?.(); c2?.(); };
  }, []);

  const imgSrc = (a) =>
    a.imageUrl || a.storageLink || a.image || a.link || a.photo || "";

  /* ── Tour card ── */
  const TourCard = ({ tour }) => {
    const isSel = selectedTour?.id === tour.id;
    return (
      <div
        className={`pt-mini-card ${isSel ? "selected" : ""}`}
        onClick={() => setSelectedTour(tour)}
      >
        {/* Image + selected badge inside a relative wrapper */}
        <div className="pt-mini-card-img-wrap">
          {isSel && <div className="pt-mini-badge">Selected</div>}
          {tour.imageUrl
            ? <img src={tour.imageUrl} alt={tour.title} className="pt-mini-card-img" />
            : <div className="pt-mini-card-img-ph">✈</div>
          }
        </div>

        <div className="pt-mini-card-body">
          <div className="pt-mini-card-name">{tour.title || tour.name}</div>
          <div className="pt-mini-card-meta">
            ${tour.price}/night{tour.nights ? ` · ${tour.nights} nights` : ""}
          </div>
        </div>

        <div className="pt-mini-card-footer">
          <button
            className="pt-nav-btn primary sm"
            onClick={e => {
              e.stopPropagation();
              setModalType("tour");
              setModalItem(tour);
            }}
          >
            View More
          </button>
        </div>
      </div>
    );
  };

  /* ── Activity card ── */
  const ActivityCard = ({ act }) => {
    const img    = imgSrc(act);
    const isSel  = !!selectedActivities.find(a => a.id === act.id);
    const months = parseMonths(act.availableMonths);

    return (
      <div
        className={`pt-mini-card ${isSel ? "selected" : ""}`}
        onClick={() => handleActivityToggle(act)}
      >
        {/* Image + month overlay + added badge — all inside relative wrapper */}
        <div className="pt-mini-card-img-wrap">
          {isSel && <div className="pt-mini-badge">Added</div>}
          {img
            ? <img src={img} alt={act.name} className="pt-mini-card-img" />
            : <div className="pt-mini-card-img-ph">◎</div>
          }
          {/* Month overlay sits at the bottom of the image, inside the wrapper */}
          {months.length > 0 && (
            <div className="pt-month-overlay">
              📅 {months.join(", ")}
            </div>
          )}
        </div>

        <div className="pt-mini-card-body">
          <div className="pt-mini-card-name">{act.name}</div>
          <div className="pt-mini-card-meta">${act.price} per person</div>
        </div>

        <div className="pt-mini-card-footer">
          <button
            className="pt-nav-btn primary sm"
            onClick={e => {
              e.stopPropagation();
              setModalType("activity");
              setModalItem(act);
            }}
          >
            Learn More
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Select Tour ── */}
      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title">
            <span className="pt-step-card-icon">✈</span> Select Tour
          </span>
        </div>
        <div className="pt-step-card-body">
          {tours?.length === 0 ? (
            <p style={{ color: "#adc6d8", fontSize: "15px" }}>No tours available.</p>
          ) : (
            <div ref={toursRef} className="pt-scroll-row">
              {tours.map(tour => <TourCard key={tour.id} tour={tour} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Additional Activities (collapsible) ── */}
      <div className="pt-step-card">
        <div
          className="pt-step-card-header clickable"
          onClick={() => setShowActivities(!showActivities)}
        >
          <span className="pt-step-card-title">
            <span className="pt-step-card-icon">◎</span> Additional Activities
          </span>
          <span className="pt-step-card-toggle">{showActivities ? "▲" : "▼"}</span>
        </div>
        <div style={{
          maxHeight: showActivities ? "600px" : "0",
          overflow: "hidden",
          transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div className="pt-step-card-body">
            {loadingActivities ? (
              <span className="pt-spinner-inline">Loading activities...</span>
            ) : activities.filter(isAvailable).length === 0 ? (
              <p style={{ color: "#adc6d8", fontSize: "15px" }}>No activities available right now.</p>
            ) : (
              <div ref={activitiesRef} className="pt-scroll-row">
                {activities.filter(isAvailable).map(act => (
                  <ActivityCard key={act.id} act={act} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="pt-nav-row">
        <div />
        <button
          className="pt-nav-btn primary"
          onClick={() => setActiveKey("step2")}
          disabled={!selectedTour}
        >
          Next ›
        </button>
      </div>

      {/* ── Info note ── */}
      <div className="pt-info-note">
        <span className="pt-info-note-title">Please Note</span>
        <ul>
          <li>Selection of a tour is <strong>mandatory</strong>.</li>
          <li>Additional activities can be added with an extra charge per guest.</li>
          <li>A <strong>base fee</strong> is charged once if any activities are added.</li>
          <li>All pricing details are shown in the <strong>Pricing Section</strong>.</li>
          <li><strong>No hidden charges.</strong></li>
        </ul>
      </div>

      {/* ── Modals ── */}
      {modalType === "tour" && modalItem && (
        <TourModal
          tour={modalItem}
          onClose={() => { setModalItem(null); setModalType(null); }}
        />
      )}
      <ActivityModal
        show={modalType === "activity" && !!modalItem}
        activity={modalItem}
        onClose={() => { setModalItem(null); setModalType(null); }}
        onToggle={handleActivityToggle}
        isSelected={modalItem && selectedActivities.find(a => a.id === modalItem?.id)}
      />
    </>
  );
}