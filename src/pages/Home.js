// src/pages/Home.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import TourModal from "../components/modals/TourModal";
import { Link } from "react-router-dom";

const WHY_ITEMS = [
  { num: "01", icon: "✈", tag: "Ready to Go", title: "Preset Tours", desc: "Jump straight into adventure with our handcrafted itineraries. Every detail planned, every destination curated — all you have to do is show up, and let Sri Lanka do the rest." },
  { num: "02", icon: "◎", tag: "Your Vision", title: "Custom Journeys", desc: "Your dream trip, built from scratch. Choose your cities, set your pace, pick your experiences. We craft a bespoke Sri Lankan journey tailored entirely to your vision." },
  { num: "03", icon: "◈", tag: "Total Freedom", title: "Vehicle Charter", desc: "Just need wheels? Our flexible vehicle charter gives you the freedom to roam Sri Lanka on your terms, with professional drivers and modern vehicles at your service." },
];

const STATS = [
  { val: "500+", label: "Tours Completed" },
  { val: "12+",  label: "Years Experience" },
  { val: "98%",  label: "Happy Customers" },
  { val: "30+",  label: "Destinations" },
];

const ABOUT_FEATURES = [
  { icon: "◎", title: "Local Expertise",    text: "12+ years of deep Sri Lankan travel knowledge" },
  { icon: "◈", title: "Tailored Service",   text: "Every itinerary shaped around your unique needs" },
  { icon: "◆", title: "Sustainable Travel", text: "Committed to responsible, community-first tourism" },
  { icon: "◐", title: "24/7 Support",       text: "Dedicated assistance throughout your entire journey" },
];

const fmtDate = (str) => {
  if (!str) return "";
  try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return str; }
};

export default function Home() {
  const [slides, setSlides]       = useState([]);
  const [tours, setTours]         = useState([]);
  const [news, setNews]           = useState([]);
  const [selectedTour, setSelectedTour] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsIndex, setNewsIndex] = useState(0);

  // Newsletter
  const [subName, setSubName]       = useState("");
  const [subEmail, setSubEmail]     = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);

  // Auto-rotate carousel
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, [slides]);

  useEffect(() => {
    // Slides
    getDocs(query(collection(db, "carouselSlides"), orderBy("order")))
      .then(s => setSlides(s.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});

    // Tours (3 random)
    getDocs(collection(db, "tours")).then(s => {
      const all = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setTours([...all].sort(() => 0.5 - Math.random()).slice(0, 3));
    });

    // News
    getDocs(collection(db, "newsAndHighlights"))
      .then(s => setNews(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.visibility !== "No")))
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subName.trim() || !subEmail.trim()) return alert("Please fill in both fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subEmail)) return alert("Please enter a valid email.");
    setSubLoading(true);
    try {
      await addDoc(collection(db, "newsLetterSubscriptions"), {
        name: subName.trim(), email: subEmail.trim(),
        subscribedAt: serverTimestamp(),
      });
      setSubSuccess(true); setSubName(""); setSubEmail("");
    } catch { alert("Subscription failed. Please try again."); }
    finally { setSubLoading(false); }
  };

  const maxNewsIdx = Math.max(0, news.length - 3);
  const newsCardW  = 360; // 340px card + 20px gap

  return (
    <div style={{ fontFamily: "'Outfit', 'Libre Franklin', sans-serif" }}>

      {/* ══ HERO ══ */}
      <section className="hp-hero">
        {slides.length > 0 ? slides.map((slide, i) => (
          <div key={slide.id} className={`hp-hero-slide ${i === currentSlide ? "active" : ""}`}>
            <img src={slide.imageUrl} alt={slide.title} className="hp-hero-img" />
            <div className="hp-hero-overlay" />
          </div>
        )) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #001a4d, #003585)" }} />
        )}

        <div className="hp-hero-content">
          <span className="hp-hero-eyebrow">Sri Lanka's Premier Travel Experience</span>
          <h1 className="hp-hero-title">
            {slides[currentSlide]?.title || "Discover the Pearl of the Indian Ocean"}
          </h1>
          <p className="hp-hero-sub">
            {slides[currentSlide]?.subtitle || "Handcrafted journeys through Sri Lanka's most breathtaking landscapes, cultures and coastlines."}
          </p>
          <div className="hp-hero-btns">
            <Link to="/BookNow" className="hp-btn-primary">Book a Tour ›</Link>
            <Link to="/citiesadventureactivities" className="hp-btn-ghost">Explore Sri Lanka</Link>
          </div>
        </div>

        {slides.length > 1 && (
          <div className="hp-hero-dots">
            {slides.map((_, i) => (
              <div key={i} className={`hp-hero-dot ${i === currentSlide ? "active" : ""}`} onClick={() => setCurrentSlide(i)} />
            ))}
          </div>
        )}
      </section>

      {/* ══ STATS ══ */}
      <div className="hp-stats">
        {STATS.map(({ val, label }) => (
          <div key={label} className="hp-stat">
            <span className="hp-stat-val">{val}</span>
            <span className="hp-stat-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ══ WHY CEYBREEZE ══ */}
      <section className="hp-sec hp-sec-dark">
        <div className="hp-max">
          <div className="hp-sec-header">
            <div>
              <span className="hp-sec-label hp-sec-label-light">Why Choose Us</span>
              <h2 className="hp-sec-title hp-sec-title-light" style={{ marginBottom: "0" }}>
                Three ways to<br/>explore Sri Lanka
              </h2>
            </div>
            <p className="hp-sec-desc hp-sec-desc-light">
              From meticulously planned tours to fully bespoke adventures — we have a travel style for every kind of explorer.
            </p>
          </div>
          <div className="hp-why-grid">
            {WHY_ITEMS.map(item => (
              <div key={item.num} className="hp-why-item">
                <span className="hp-why-num">{item.num}</span>
                <div className="hp-why-title">{item.title}</div>
                <div className="hp-why-desc">{item.desc}</div>
                <div className="hp-why-tag">{item.tag}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "60px" }}>
            <Link to="/BookNow" className="hp-btn-primary">Start Planning Your Trip ›</Link>
          </div>
        </div>
      </section>

      {/* ══ FEATURED TOURS ══ */}
      {tours.length > 0 && (
        <section className="hp-sec hp-sec-light">
          <div className="hp-max">
            <div className="hp-sec-header">
              <div>
                <span className="hp-sec-label">Featured Experiences</span>
                <h2 className="hp-sec-title" style={{ marginBottom: 0 }}>Discover Paradise</h2>
              </div>
              <Link to="/tours" className="hp-btn-outline-navy">View All Tours ›</Link>
            </div>
            <div className="hp-tour-grid">
              {tours.map((tour, i) => (
                <div key={tour.id} className="hp-tour-card" onClick={() => setSelectedTour(tour)} style={{ animationDelay: `${i * 0.08}s` }}>
                  {tour.imageUrl && <img src={tour.imageUrl} alt={tour.title} className="hp-tour-card-img" />}
                  <div className="hp-tour-card-overlay">
                    <span className="hp-tour-eyebrow">{tour.nights ? `${tour.nights}-Night Tour` : "Tour Package"}</span>
                    <h3 className="hp-tour-card-title">{tour.title}</h3>
                    <div className="hp-tour-badges">
                      {tour.price && <span className="hp-tour-badge">${tour.price}/day</span>}
                      {tour.nights && <span className="hp-tour-badge">{tour.nights} nights</span>}
                    </div>
                    <p className="hp-tour-card-desc">{tour.description}</p>
                    <div className="hp-tour-cta">View Tour ›</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ EXPLORE BANNER ══ */}
      <Link to="/citiesadventureactivities" style={{ display: "block", textDecoration: "none" }}>
        <div className="hp-explore">
          <img src={`${process.env.PUBLIC_URL}/images/explore.png`} alt="Explore Sri Lanka" className="hp-explore-img" />
          <div className="hp-explore-overlay" />
          <div className="hp-explore-content">
            <p style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.2em", color: "#a8edff", textTransform: "uppercase", margin: "0 0 14px" }}>Explore the Island</p>
            <h2 className="hp-explore-title">Cities, Adventures<br/>&amp; <span>Activities</span></h2>
            <p className="hp-explore-sub">From ancient ruins to pristine beaches — discover what makes Sri Lanka truly extraordinary.</p>
            <div className="hp-btn-primary" style={{ display: "inline-flex" }}>Explore Now ›</div>
          </div>
        </div>
      </Link>

      {/* ══ NEWS & HIGHLIGHTS ══ */}
      {news.length > 0 && (
        <section className="hp-sec hp-sec-white">
          <div className="hp-max">
            <div className="hp-sec-header">
              <div>
                <span className="hp-sec-label">Latest Updates</span>
                <h2 className="hp-sec-title" style={{ marginBottom: 0 }}>News &amp; Highlights</h2>
              </div>
              <div className="hp-news-nav">
                <button className="hp-news-nav-btn" onClick={() => setNewsIndex(p => Math.max(0, p - 1))} disabled={newsIndex === 0}>‹</button>
                <button className="hp-news-nav-btn" onClick={() => setNewsIndex(p => Math.min(p + 1, maxNewsIdx))} disabled={newsIndex >= maxNewsIdx}>›</button>
              </div>
            </div>
            <div className="hp-news-outer">
              <div className="hp-news-track" style={{ transform: `translateX(calc(-${newsIndex} * ${newsCardW}px))` }}>
                {news.map((item, i) => (
                  <div key={item.id} className="hp-news-card" style={{ animationDelay: `${i * 0.06}s` }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.title} className="hp-news-card-img" />
                      : <div className="hp-news-card-placeholder">◆</div>
                    }
                    <div className="hp-news-card-body">
                      {item.publishedDate && <div className="hp-news-date">{fmtDate(item.publishedDate)}</div>}
                      <div className="hp-news-title">{item.title}</div>
                      <div className="hp-news-body">{item.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══ ABOUT ══ */}
      <section className="hp-sec hp-sec-tinted">
        <div className="hp-max">
          <div className="hp-about-grid">
            <div className="hp-about-img-wrap">
              <img
                src={`${process.env.PUBLIC_URL}/images/logo.png`}
                alt="CeyBreeze Tours"
                className="hp-about-img"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div className="hp-about-accent" />
            </div>

            <div>
              <span className="hp-sec-label">Our Story</span>
              <h2 className="hp-sec-title" style={{ marginBottom: "22px" }}>
                Sri Lanka's Most<br/>Trusted Travel Partner
              </h2>
              <p className="hp-about-text">
                For over a decade, CeyBreeze Tours has been crafting unforgettable Sri Lankan adventures for travellers from across the globe. Born from a deep love for this island nation, we believe travel should be transformative — not just a series of destinations ticked off a list, but moments that change how you see the world.
              </p>
              <p className="hp-about-text">
                Our team of local experts brings an insider's perspective to every journey. We know the hidden corners, the best times to visit, the authentic flavours, and the stories behind every landmark. From the misty highlands of Nuwara Eliya to the ancient city of Anuradhapura and the golden shores of Mirissa — we know Sri Lanka like the back of our hand.
              </p>
              <p className="hp-about-text">
                Whether you're a solo adventurer seeking remote trails, a family looking for enriching cultural experiences, a couple craving romantic island escapes, or a group seeking thrilling adventures — we shape every journey around your story. No two CeyBreeze tours are ever the same.
              </p>

              <div className="hp-about-features">
                {ABOUT_FEATURES.map(({ icon, title, text }) => (
                  <div key={title} className="hp-about-feat">
                    <div className="hp-about-feat-icon">{icon}</div>
                    <div>
                      <div className="hp-about-feat-title">{title}</div>
                      <div className="hp-about-feat-text">{text}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/contact" className="hp-btn-primary" style={{ display: "inline-flex" }}>Get in Touch ›</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER ══ */}
      <section className="hp-sec hp-sec-dark">
        <div className="hp-max">
          <div className="hp-newsletter-inner">
            <span className="hp-sec-label hp-sec-label-light">Stay Updated</span>
            <h2 className="hp-sec-title hp-sec-title-light" style={{ marginBottom: "10px" }}>Never Miss an Adventure</h2>
            <p className="hp-sec-desc hp-sec-desc-light" style={{ margin: "0 auto" }}>
              Get the latest tour updates, travel tips, seasonal offers and exclusive Sri Lanka travel inspiration delivered to your inbox.
            </p>

            {subSuccess ? (
              <div className="hp-nl-success">
                <p>✓ Welcome aboard! We'll be in touch with great Sri Lanka travel inspiration.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe}>
                <div className="hp-newsletter-name-row">
                  <input
                    className="hp-nl-input"
                    placeholder="Your name"
                    value={subName}
                    onChange={e => setSubName(e.target.value)}
                  />
                  <input
                    className="hp-nl-input right"
                    type="email"
                    placeholder="Email address"
                    value={subEmail}
                    onChange={e => setSubEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="hp-nl-btn" disabled={subLoading}>
                  {subLoading ? "Subscribing..." : "Subscribe to Newsletter"}
                </button>
                <p className="hp-nl-note">No spam, ever. Unsubscribe anytime. Your privacy is respected.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      <TourModal tour={selectedTour} onClose={() => setSelectedTour(null)} />
    </div>
  );
}