import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { currentUser, userProfile, logout, updateUserRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Dropdowns state
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Assignment Graded", text: "Module 02 Prompt Engineering received 95%", time: "2h ago", unread: true },
    { id: 2, title: "New Lesson Available", text: "AI Essentials & Automation: Module 5 unlocked", time: "1d ago", unread: true },
    { id: 3, title: "Welcome to Peleekings", text: "Your registration code is AS1399", time: "3d ago", unread: false },
  ]);

  const navRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowMenu(false);
    setShowNotifications(false);
  }, [location.pathname]);

  const isLanding = location.pathname === "/";
  // On the landing page, always present public visitor view (no Dashboard, no bell, no avatar)
  const showAuthUser = !isLanding && !!currentUser;

  const initials = (currentUser?.displayName || userProfile?.fullName || "BU")
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const unreadCount = notifications.filter(n => n.unread).length;

  async function handleLogout() {
    setShowMenu(false);
    await logout();
    navigate("/");
  }

  function markAllNotificationsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header className="site-navbar" ref={navRef}>
      {/* Brand Logo */}
      <Link to="/" className="brand-wrapper" id="nav-brand">
        <div className="brand-logo-icon">P</div>
        <span>Peleekings</span>
      </Link>

      {/* ── Rearranged Navigation Links per User Request ──────────────
          Order: Dashboard (when logged in) -> Courses -> Learning Paths -> Resources -> About
      ────────────────────────────────────────────────────────────── */}
      <nav className="nav-links-menu">
        {/* 1. Dashboard (Only visible when user is logged in and not on public landing) */}
        {showAuthUser && (
          <Link
            to="/dashboard"
            className={`nav-item-link ${isActive("/dashboard") ? "active" : ""}`}
            id="nav-dashboard"
          >
            Dashboard
          </Link>
        )}

        {/* 2. Courses */}
        <Link
          to="/"
          className={`nav-item-link ${isActive("/") && !location.hash ? "active" : ""}`}
          id="nav-courses"
          onClick={() => {
            if (location.pathname === "/") {
              const el = document.getElementById("courses-catalog-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          Courses
        </Link>

        {/* 3. Learning Paths */}
        <Link
          to="/"
          className="nav-item-link"
          id="nav-learning-paths"
          onClick={(e) => {
            e.preventDefault();
            if (location.pathname !== "/") navigate("/");
            setTimeout(() => {
              const el = document.getElementById("learning-paths-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        >
          Learning Paths
        </Link>

        {/* 4. Resources (Before About) */}
        <button
          type="button"
          className="nav-item-link"
          id="nav-resources"
          onClick={() => setShowResourcesModal(true)}
          style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
        >
          Resources
        </button>

        {/* 5. About */}
        <Link
          to="/about"
          className={`nav-item-link ${isActive("/about") ? "active" : ""}`}
          id="nav-about"
        >
          About
        </Link>
      </nav>

      {/* Right Actions */}
      <div className="nav-actions-group">
        {/* Search button trigger */}
        <button
          className="btn-ghost"
          style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          onClick={() => {
            if (location.pathname !== "/") {
              navigate("/");
              setTimeout(() => {
                const searchInput = document.getElementById("catalog-search-input");
                if (searchInput) {
                  searchInput.focus();
                  searchInput.scrollIntoView({ behavior: "smooth" });
                }
              }, 150);
            } else {
              const searchInput = document.getElementById("catalog-search-input");
              if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: "smooth" });
              }
            }
          }}
          title="Search courses"
          aria-label="Search courses"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>

        {showAuthUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Notification bell button with interactive dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="btn-ghost"
                style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer" }}
                title="Notifications"
                onClick={() => {
                  setShowNotifications(prev => !prev);
                  setShowMenu(false);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: "var(--primary-learner)", borderRadius: "50%" }}></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    right: -40,
                    width: 320,
                    background: "#FFFFFF",
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 250,
                    overflow: "hidden"
                  }}
                >
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        style={{ fontSize: "0.75rem", color: "var(--primary-learner)", fontWeight: 600 }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {notifications.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border-subtle)",
                          background: item.unread ? "#F8FAFC" : "#FFFFFF",
                          cursor: "pointer",
                          transition: "background 0.2s"
                        }}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, unread: false } : n));
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{item.title}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{item.time}</span>
                        </div>
                        <p style={{ fontSize: "0.775rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                id="nav-user-avatar"
                className="user-avatar-circle"
                style={{ width: 38, height: 38, fontSize: "0.875rem", cursor: "pointer", border: "none" }}
                onClick={() => {
                  setShowMenu(prev => !prev);
                  setShowNotifications(false);
                }}
              >
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  initials
                )}
              </button>

              {showMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    right: 0,
                    width: 230,
                    background: "#FFFFFF",
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    padding: "8px 0",
                    zIndex: 250,
                  }}
                >
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      {activeUser?.displayName || userProfile?.fullName || "Blessing Udo"}
                    </div>
                    <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      {activeUser?.email || "blessing@example.com"}
                    </div>
                    {userProfile?.regNumber && (
                      <div className="pill-badge pill-success" style={{ marginTop: 6 }}>
                        ID: {userProfile.regNumber}
                      </div>
                    )}
                  </div>

                  <Link
                    to="/dashboard"
                    onClick={() => setShowMenu(false)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: "0.875rem", color: "var(--text-secondary)" }}
                  >
                    Learner Dashboard
                  </Link>

                  {userProfile?.role === "instructor" || userProfile?.role === "tutor" ? (
                    <Link
                      to="/become-instructor"
                      onClick={() => setShowMenu(false)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: "0.875rem", color: "var(--text-secondary)" }}
                    >
                      Teaching Portal
                    </Link>
                  ) : (
                    <Link
                      to="/become-instructor"
                      onClick={() => setShowMenu(false)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: "0.875rem", color: "var(--text-secondary)" }}
                    >
                      Teach on Peleekings
                    </Link>
                  )}

                  {userProfile?.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setShowMenu(false)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "4px 0" }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: "0.875rem",
                      color: "#DC2626",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/auth" state={{ mode: "login" }} className="btn btn-ghost" id="nav-login-btn">
              Log in
            </Link>
            <Link to="/auth" state={{ mode: "signup" }} className="btn btn-solid-dark" id="nav-get-started-btn">
              Get Started
            </Link>
          </div>
        )}

        {/* ── Mobile Hamburger Menu Toggle Button ───────────────────── */}
        <button
          className="mobile-hamburger-btn"
          onClick={() => setShowMobileMenu(prev => !prev)}
          aria-label="Toggle navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {showMobileMenu ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* ── Mobile Drawer ───────────────────────────────────────────── */}
      {showMobileMenu && (
        <div className="mobile-nav-drawer">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {showAuthUser && (
              <Link
                to="/dashboard"
                className={`mobile-nav-link ${isActive("/dashboard") ? "active" : ""}`}
                onClick={() => setShowMobileMenu(false)}
              >
                Dashboard
              </Link>
            )}
            <Link
              to="/"
              className={`mobile-nav-link ${isActive("/") ? "active" : ""}`}
              onClick={() => {
                setShowMobileMenu(false);
                document.getElementById("courses-catalog-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Courses
            </Link>
            <Link
              to="/"
              className="mobile-nav-link"
              onClick={() => {
                setShowMobileMenu(false);
                document.getElementById("learning-paths-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Learning Paths
            </Link>
            <button
              className="mobile-nav-link"
              style={{ textAlign: "left", background: "none", border: "none" }}
              onClick={() => {
                setShowMobileMenu(false);
                setShowResourcesModal(true);
              }}
            >
              Resources
            </button>
            <Link
              to="/about"
              className={`mobile-nav-link ${isActive("/about") ? "active" : ""}`}
              onClick={() => setShowMobileMenu(false)}
            >
              About
            </Link>

            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {showAuthUser ? (
                <>
                  {userProfile?.role === "admin" && (
                    <Link to="/admin" className="btn btn-solid-dark" onClick={() => setShowMobileMenu(false)}>
                      Admin Dashboard
                    </Link>
                  )}
                  <Link to="/become-instructor" className="btn btn-outline" onClick={() => setShowMobileMenu(false)}>
                    Teaching Portal
                  </Link>
                  <button onClick={handleLogout} className="btn btn-outline" style={{ color: "#DC2626" }}>
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth" state={{ mode: "login" }} className="btn btn-outline" onClick={() => setShowMobileMenu(false)}>
                    Sign In
                  </Link>
                  <Link to="/auth" state={{ mode: "signup" }} className="btn btn-solid-dark" onClick={() => setShowMobileMenu(false)}>
                    Get Started Free &rarr;
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Resources Modal ─────────────────────────────────────────── */}
      {showResourcesModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowResourcesModal(false)}>
          <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <span className="pill-badge pill-tech" style={{ marginBottom: 6 }}>LEARNING ASSETS</span>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Peleekings Resources</h3>
              </div>
              <button
                className="btn-ghost"
                onClick={() => setShowResourcesModal(false)}
                style={{ fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", marginBottom: 24 }}>
              Free curated guides, downloadable cheatsheets, and community resources to accelerate your learning journey.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { title: "2025 AI Tools & Automation Cheatsheet", type: "PDF • 2.4 MB", desc: "Top 50 prompt frameworks, API patterns, and no-code connectors." },
                { title: "NYSC Tech Skill Acceleration Guide", type: "PDF • 1.8 MB", desc: "How corps members can build a freelance and remote career during service year." },
                { title: "Figma UI/UX Starter Kit & Templates", type: "Design File • 8.1 MB", desc: "Clean component library, typography scale, and color tokens." },
              ].map((res, i) => (
                <div key={i} style={{ padding: "14px 18px", border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.925rem", color: "var(--text-primary)" }}>{res.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{res.desc}</div>
                    <span className="pill-badge pill-success" style={{ marginTop: 6 }}>{res.type}</span>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      alert(`Downloading ${res.title}...`);
                    }}
                  >
                    Download ↓
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <button className="btn btn-solid-dark" onClick={() => setShowResourcesModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
