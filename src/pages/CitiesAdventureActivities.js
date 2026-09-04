// src/pages/CitiesAdventureActivities.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import CityModal from "../components/modals/CityModal";
import AdventureModal from "../components/modals/AdventureModal";
import ActivityModal from "../components/modals/ActivityModal";

const HERO_CONTENT = {
  cities: {
    eyebrow: "Discover the Island",
    title: "Cities &",
    span: "Destinations",
    sub: "Explore vibrant cities and charming towns across Sri Lanka — each with its own unique character, history, culture and unforgettable atmosphere.",
  },
  adventure: {
    eyebrow: "Push Your Limits",
    title: "Adventure",
    span: "Awaits",
    sub: "From kite surfing on turquoise waters to white-water rafting through jungle gorges — Sri Lanka delivers world-class thrills and adrenaline at every turn.",
  },
  activities: {
    eyebrow: "Unique Experiences",
    title: "Activities &",
    span: "Experiences",
    sub: "Dolphin watching, wildlife safaris, cultural walks and more — discover the incredible activities that make a Sri Lanka journey truly unforgettable.",
  },
};

export default function CitiesAdventureActivities() {
  const [cities, setCities]         = useState([]);
  const [adventures, setAdventures] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("cities");

  const [selectedCityId, setSelectedCityId]       = useState(null);
  const [selectedAdventureId, setSelectedAdventureId] = useState(null);
  const [selectedActivity, setSelectedActivity]   = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [cs, as_, ac] = await Promise.all([
          getDocs(collection(db, "citiesAndDestinations")),
          getDocs(collection(db, "adventure")),
          getDocs(collection(db, "additionalActivities")),
        ]);
        setCities(cs.docs.map(d => ({ id: d.id, ...d.data() })));
        setAdventures(as_.docs.map(d => ({ id: d.id, ...d.data() })));
        setActivities(ac.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAll();
    window.scrollTo(0, 0);
  }, []);

  const TABS = [
    { key: "cities",     label: "Cities",     count: cities.length },
    { key: "adventure",  label: "Adventure",  count: adventures.length },
    { key: "activities", label: "Activities", count: activities.length },
  ];

  const currentItems =
    activeTab === "cities"     ? cities
    : activeTab === "adventure" ? adventures
    : activities;

  const hero = HERO_CONTENT[activeTab];

  const getImage = (item) =>
    item.imageUrl || item.storageLink || item.image || item.link || item.photo || "";

  const handleCardClick = (item) => {
    if (activeTab === "cities")     setSelectedCityId(item.id);
    else if (activeTab === "adventure") setSelectedAdventureId(item.id);
    else setSelectedActivity(item);
  };

  const SECTION_TITLES = {
    cities:     "Explore Sri Lanka's Cities",
    adventure:  "Adventure Experiences",
    activities: "Unique Activities",
  };

  return (
    <div style={{ fontFamily: "'Outfit', 'Libre Franklin', sans-serif" }}>

      {/* ── Hero (changes with tab) ── */}
      <div className="caa-hero" key={activeTab}>
        <div className="caa-hero-dots" />
        <div className="caa-hero-content">
          <span className="caa-hero-eyebrow">{hero.eyebrow}</span>
          <h1 className="caa-hero-title">{hero.title} <span>{hero.span}</span></h1>
          <p className="caa-hero-sub">{hero.sub}</p>
        </div>
      </div>

      {/* ── Custom Tab Nav ── */}
      <nav className="caa-nav">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            className={`caa-nav-tab ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
            <span className="caa-nav-count">{count}</span>
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <div className="caa-content">
        <div className="hp-max">
          {loading ? (
            <div className="caa-loading">
              <div className="caa-loading-icon">◉</div>
              <p>Loading content...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <p style={{ color: "#adc6d8", fontSize: "13px" }}>No items found.</p>
          ) : (
            <>
              <span className="caa-content-label">{TABS.find(t => t.key === activeTab)?.label}</span>
              <h2 className="caa-content-title">{SECTION_TITLES[activeTab]}</h2>

              <div className="caa-grid">
                {currentItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="caa-card"
                    onClick={() => handleCardClick(item)}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="caa-card-img-wrap">
                      {getImage(item)
                        ? <img src={getImage(item)} alt={item.name || item.title} className="caa-card-img" />
                        : <div className="caa-card-img-placeholder">◉</div>
                      }
                      <div className="caa-card-img-overlay" />
                      <div className="caa-card-name">{item.name || item.title || "Unnamed"}</div>
                    </div>

                    <div className="caa-card-body">
                      {(item.availability || item.price || item.time) && (
                        <div className="caa-card-tags">
                          {item.availability && (
                            <span className={`caa-card-tag ${item.availability === "Yes" ? "avail" : "unavail"}`}>
                              {item.availability === "Yes" ? "Available" : "Unavailable"}
                            </span>
                          )}
                          {item.price && <span className="caa-card-tag price">${item.price}</span>}
                          {item.time  && <span className="caa-card-tag time">{item.time}</span>}
                        </div>
                      )}
                      <p className="caa-card-desc">
                        {item.description || "Discover this incredible experience."}
                      </p>
                      <button className="caa-card-btn">
                        <span className="caa-cta-line" />
                        Learn More
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedCityId    && <CityModal show={!!selectedCityId}       cityId={selectedCityId}           onClose={() => setSelectedCityId(null)} />}
      {selectedAdventureId && <AdventureModal show={!!selectedAdventureId} adventureId={selectedAdventureId} onClose={() => setSelectedAdventureId(null)} />}
      {selectedActivity  && <ActivityModal show={!!selectedActivity}    activity={selectedActivity}         onClose={() => setSelectedActivity(null)} />}
    </div>
  );
}