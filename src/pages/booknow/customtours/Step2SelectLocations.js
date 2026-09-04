// src/pages/booknow/customtours/Step2SelectLocations.js
import React, { useState, useEffect, useRef } from "react";
import { Collapse, Form, Alert, Spinner } from "react-bootstrap";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import CityModal     from "../../../components/modals/CityModal";
import ActivityModal from "../../../components/modals/ActivityModal";
import AdventureModal from "../../../components/modals/AdventureModal";

export default function Step2SelectLocations({
  selectedLocations, setSelectedLocations, setActiveKey,
  selectedActivities, setSelectedActivities, nights = 0, travellers = 1,
}) {
  const [items, setItems]                     = useState([]);
  const [loadingItems, setLoadingItems]       = useState(true);
  const [selectionType, setSelectionType]     = useState("Explore Cities");
  const [modalCityId, setModalCityId]         = useState(null);
  const [showModal, setShowModal]             = useState(false);
  const [modalAdventureId, setModalAdventureId] = useState(null);
  const [activities, setActivities]           = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivities, setShowActivities]   = useState(false);
  const [modalActivity, setModalActivity]     = useState(null);
  const [warning, setWarning]                 = useState("");
  const locationsRef  = useRef(null);
  const activitiesRef = useRef(null);
  const tileCount     = nights > 1 ? nights - 1 : 1;

  const isAvailable = (doc) => {
    const av = doc?.availability;
    if (typeof av === "boolean") return av;
    if (typeof av === "string") return av.trim().toLowerCase() === "yes";
    return false;
  };

  useEffect(() => {
    setLoadingItems(true);
    const coll = selectionType === "Explore Cities" ? "citiesAndDestinations" : "adventure";
    getDocs(collection(db, coll)).then(q => {
      const docs = q.docs.map(d => ({ id: d.id, ...d.data(), type: selectionType === "Explore Cities" ? "City" : "Adventure", ...(selectionType === "Explore Cities" ? { price: 0 } : {}) })).filter(d => selectionType === "Explore Cities" ? true : isAvailable(d));
      setItems(docs);
    }).catch(() => setItems([])).finally(() => setLoadingItems(false));
  }, [selectionType]);

  useEffect(() => {
    setLoadingActivities(true);
    getDocs(collection(db, "additionalActivities")).then(q => {
      setActivities(q.docs.map(d => ({ id: d.id, ...d.data() })).filter(isAvailable));
    }).catch(() => {}).finally(() => setLoadingActivities(false));
  }, []);

  useEffect(() => {
    const handler = (ref) => (e) => { if (!ref.current) return; e.preventDefault(); ref.current.scrollLeft += e.deltaY; };
    const lh = handler(locationsRef);
    const ah = handler(activitiesRef);
    locationsRef.current?.addEventListener("wheel", lh, { passive: false });
    activitiesRef.current?.addEventListener("wheel", ah, { passive: false });
    return () => { locationsRef.current?.removeEventListener("wheel", lh); activitiesRef.current?.removeEventListener("wheel", ah); };
  }, []);

  const toggleSelection = (item) => {
    const exists = selectedLocations.find(i => i.id === item.id);
    if (exists) { setSelectedLocations(selectedLocations.filter(i => i.id !== item.id)); return; }
    if (selectedLocations.length >= tileCount) { setWarning(`You can only select ${tileCount} location(s).`); return; }
    setSelectedLocations([...selectedLocations, { ...item, price: item.type === "Adventure" ? Number(item.price) || 0 : 0 }]);
    setWarning("");
  };

  const handleActivityToggle = (activity) => {
    if (!isAvailable(activity)) return;
    setSelectedActivities(prev => prev.find(a => a.id === activity.id) ? prev.filter(a => a.id !== activity.id) : [...prev, activity]);
  };

  const imgSrc = (item) => item.imageUrl || item.storageLink || item.image || item.photo || "";

  return (
    <>
      {/* Locations / Adventures */}
      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◉</span> Select Locations &amp; Adventures</span>
        </div>
        <div className="pt-step-card-body">
          <p style={{ fontSize: "13px", color: "#7a9ab8", marginBottom: "14px" }}>
            Choose <strong style={{ color: "#00276b" }}>{tileCount}</strong> location(s) or adventure(s) for your tour.
          </p>
          {warning && <Alert variant="warning" style={{ borderRadius: 0, fontSize: "13px" }}>{warning}</Alert>}

          <div className="pt-field-label" style={{ marginBottom: "6px" }}>Browse by</div>
          <Form.Select value={selectionType} onChange={e => setSelectionType(e.target.value)} style={{ borderRadius: 0, border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", marginBottom: "16px", padding: "10px 13px" }}>
            <option>Explore Cities</option>
            <option>Adventure</option>
          </Form.Select>

          {loadingItems ? (
            <div className="pt-spinner-inline">Loading {selectionType.toLowerCase()}...</div>
          ) : items.length === 0 ? (
            <p style={{ color: "#adc6d8", fontSize: "13px" }}>No {selectionType.toLowerCase()} available.</p>
          ) : (
            <div ref={locationsRef} className="pt-scroll-row">
              {items.map(item => {
                const isSel = selectedLocations.some(i => i.id === item.id);
                return (
                  <div key={item.id} className={`pt-mini-card ${isSel ? "selected" : ""}`} onClick={() => toggleSelection(item)}>
                    {isSel && <div className="pt-mini-badge">Selected</div>}
                    <div className="pt-mini-card-img-wrap">
                      {imgSrc(item)
                        ? <img src={imgSrc(item)} alt={item.name} className="pt-mini-card-img" />
                        : <div className="pt-mini-card-img-ph">◉</div>
                      }
                    </div>
                    <div className="pt-mini-card-body">
                      <div className="pt-mini-card-name">{item.name}</div>
                      {item.type === "Adventure" && (
                        <div className="pt-mini-card-meta">
                          {item.availableMonths?.length > 0 && <span>📅 {item.availableMonths.join(", ")}</span>}
                          {item.price && <span> · ${item.price}/person</span>}
                        </div>
                      )}
                    </div>
                    <div className="pt-mini-card-footer">
                      <button className="pt-nav-btn primary sm" onClick={e => {
                        e.stopPropagation();
                        if (item.type === "City") { setModalCityId(item.id); setShowModal(true); }
                        else setModalAdventureId(item.id);
                      }}>View More</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Activities accordion */}
      <div className="pt-step-card">
        <div className="pt-step-card-header clickable" onClick={() => setShowActivities(!showActivities)}>
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◎</span> Additional Activities</span>
          <span className="pt-step-card-toggle">{showActivities ? "▲" : "▼"}</span>
        </div>
        <Collapse in={showActivities}>
          <div>
            <div className="pt-step-card-body">
              {loadingActivities ? (
                <div className="pt-spinner-inline">Loading activities...</div>
              ) : activities.length === 0 ? (
                <p style={{ color: "#adc6d8", fontSize: "13px" }}>No activities available.</p>
              ) : (
                <div ref={activitiesRef} className="pt-scroll-row">
                  {activities.map(act => {
                    const isAdded = selectedActivities.some(a => a.id === act.id);
                    return (
                      <div key={act.id} className={`pt-mini-card ${isAdded ? "selected" : ""}`} onClick={() => handleActivityToggle(act)}>
                        {isAdded && <div className="pt-mini-badge">Added</div>}
                        <div className="pt-mini-card-img-wrap">
                          {imgSrc(act)
                            ? <img src={imgSrc(act)} alt={act.name} className="pt-mini-card-img" />
                            : <div className="pt-mini-card-img-ph">◎</div>
                          }
                          {act.availableMonths?.length > 0 && (
                            <div className="pt-month-overlay">📅 {act.availableMonths.join(", ")}</div>
                          )}
                        </div>
                        <div className="pt-mini-card-body">
                          <div className="pt-mini-card-name">{act.name}</div>
                          {act.price && <div className="pt-mini-card-meta">${act.price}/person</div>}
                        </div>
                        <div className="pt-mini-card-footer">
                          <button className="pt-nav-btn primary sm" onClick={e => { e.stopPropagation(); setModalActivity(act); }}>Learn More</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Collapse>
      </div>

      <div className="pt-nav-row">
        <button className="pt-nav-btn secondary" onClick={() => setActiveKey("step1")}>‹ Previous</button>
        <button className="pt-nav-btn primary" onClick={() => setActiveKey("step3")}>Next ›</button>
      </div>

      <div className="pt-info-note">
        <span className="pt-info-note-title">Please Note</span>
        <ul>
          <li>Select cities or adventures — or combine both.</li>
          <li>Switch between Cities and Adventures using the dropdown.</li>
          <li>Cities carry <strong>no extra charge</strong>. Adventures carry per-person pricing.</li>
          <li>A <strong>base adventure fee</strong> applies once if any adventure is selected.</li>
          <li>Activities have an additional per-person charge + a one-time base fee.</li>
          <li><strong>No hidden fees.</strong></li>
        </ul>
      </div>

      {modalCityId    && <CityModal cityId={modalCityId} show={showModal} onClose={() => setShowModal(false)} />}
      {modalActivity  && <ActivityModal activity={modalActivity} show={!!modalActivity} onClose={() => setModalActivity(null)} />}
      {modalAdventureId && <AdventureModal adventureId={modalAdventureId} show={!!modalAdventureId} onClose={() => setModalAdventureId(null)} />}
    </>
  );
}