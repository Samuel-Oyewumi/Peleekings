import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserActivity } from "../contexts/userActivity";

export default function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("dashboard");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(location.state?.welcomeToast || "");

  // Auto-dismiss welcome toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage("");
        try {
          window.history.replaceState({}, document.title);
        } catch {}
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const isNonCorper = userProfile?.studentType === "non_corper";
  const userName = userProfile?.fullName || currentUser?.displayName || (isNonCorper ? "Blessing Udo" : "Samuel Asuquo");
  const firstName = userProfile?.firstName || (userName.split(" ").length > 1 ? userName.split(" ")[0] : userName) || (isNonCorper ? "Blessing" : "Samuel");
  const regCode = userProfile?.regNumber || (isNonCorper ? "1234BU" : "AS1399");
  const email = currentUser?.email || userProfile?.email || "blessing@example.com";
  const nyscCode = isNonCorper ? "Not Applicable (Non-Corper)" : (userProfile?.nyscStateCode || "AB/23A/1399");

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  const [userActivity, setUserActivity] = useState(() => getUserActivity(currentUser?.uid));

  useEffect(() => {
    setUserActivity(getUserActivity(currentUser?.uid));
    function handleUpdate(e) {
      if (e.detail?.userId === currentUser?.uid) {
        setUserActivity(e.detail.data);
      }
    }
    window.addEventListener("peleekings_activity_updated", handleUpdate);
    return () => window.removeEventListener("peleekings_activity_updated", handleUpdate);
  }, [currentUser]);

  // Active courses enrolled from user activity
  const enrolledCourses = userActivity?.enrolledCourses || [];

  const weeklyActivityData = userActivity?.weeklyActivity || [
    { day: "Mon", hours: 45, label: "45m" },
    { day: "Tue", hours: 60, label: "1h" },
    { day: "Wed", hours: 30, label: "30m" },
    { day: "Thu", hours: 85, label: "1h 25m", highlight: true },
    { day: "Fri", hours: 40, label: "40m" },
    { day: "Sat", hours: 90, label: "1h 30m" },
    { day: "Sun", hours: 20, label: "20m" },
  ];

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="dashboard-page-layout">
      {/* Toast banner with close button and auto-dismiss */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: 80,
          right: 24,
          zIndex: 1000,
          background: "#0F172A",
          color: "#FFFFFF",
          padding: "12px 18px",
          borderRadius: "var(--radius-sm)",
          boxShadow: "var(--shadow-lg)",
          fontSize: "0.875rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span>{toastMessage}</span>
          <button
            onClick={() => {
              setToastMessage("");
              try { window.history.replaceState({}, document.title); } catch {}
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
              padding: "0 4px"
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Left Sidebar (Screen 5) ─────────────────────────────────── */}
      <aside className={`portal-left-sidebar ${showMobileSidebar ? "mobile-open" : ""}`}>
        {/* User Card */}
        <div className="sidebar-user-card">
          <div className="user-avatar-circle">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {userName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`pill-badge ${userProfile?.studentType === "non_corper" ? "pill-creative" : "pill-tech"}`} style={{ padding: "2px 8px", fontSize: "0.68rem" }}>
                {userProfile?.studentType === "non_corper" ? "Non-Corper" : "Corper"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {regCode}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="portal-nav-menu">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "my-courses", label: "My Courses", icon: "📚" },
            { id: "explore", label: "Explore", icon: "🔍", action: () => navigate("/") },
            { id: "assignments", label: "Assignments", icon: "📝" },
            { id: "tests", label: "Tests", icon: "⏱" },
            { id: "notes", label: "Notes", icon: "📄" },
            { id: "announcements", label: "Announcements", icon: "📢" },
            { id: "certificates", label: "Certificates", icon: "🎓" },
            { id: "profile", label: "Profile", icon: "👤" },
          ].map(item => (
            <button
              key={item.id}
              className={`portal-nav-link ${activeNav === item.id ? "active" : ""}`}
              onClick={() => {
                setShowMobileSidebar(false);
                if (item.action) item.action();
                else setActiveNav(item.id);
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Switch Portal & Logout */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
          <Link
            to="/become-instructor"
            className="portal-nav-link"
            style={{ fontSize: "0.85rem", color: "var(--primary-learner)", marginBottom: 4 }}
          >
            <span>💼</span> Teaching Portal
          </Link>
          <button
            onClick={handleLogout}
            className="portal-nav-link"
            style={{ color: "#DC2626", width: "100%" }}
          >
            <span>⎋</span> Log out
          </button>
        </div>
      </aside>

      {/* ── Main Dashboard Content (Screen 5) ───────────────────────── */}
      <main className="dashboard-main-area">
        {/* Top Header / Greeting */}
        <div className="dashboard-greeting-row">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="btn btn-outline btn-sm mobile-sidebar-toggle-btn"
                onClick={() => setShowMobileSidebar(prev => !prev)}
                style={{ display: "none" }}
              >
                ☰ Menu
              </button>
              <h1 style={{ fontSize: "1.9rem", fontWeight: 800, marginBottom: 4 }}>
                Good morning, {firstName} &#128075;
              </h1>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Ready to continue learning today?
            </p>
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500, background: "#FFFFFF", border: "1px solid var(--border-light)", padding: "8px 16px", borderRadius: "var(--radius-full)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
          </div>
        </div>

        {/* ── TAB: OVERVIEW / DASHBOARD ──────────────────────────────── */}
        {activeNav === "dashboard" && (
          <>
            {/* Top Row: Continue Learning & Weekly Learning Activity */}
            <div className="dashboard-top-widgets-grid">
              {/* Continue Learning Widget Card */}
              {enrolledCourses.length > 0 ? (
                <div className="continue-learning-widget-card">
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#0F172A",
                      position: "relative"
                    }}
                  >
                    <img
                      src={enrolledCourses[0].image}
                      alt="Course Thumbnail"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 800 }}>
                      {enrolledCourses[0].title.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>
                      Continue Learning
                    </div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>
                      {enrolledCourses[0].title}
                    </h3>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 12 }}>
                      {enrolledCourses[0].currentModule}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1, height: 7, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${enrolledCourses[0].progress}%`, height: "100%", background: "var(--primary-learner)", borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {enrolledCourses[0].progress}%
                      </span>
                    </div>

                    <button
                      className="btn btn-solid-dark btn-sm"
                      onClick={() => navigate(`/course/${enrolledCourses[0].id}`)}
                    >
                      Continue Learning &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div className="continue-learning-widget-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}>Ready to start learning?</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Enroll in your first course to build practical, monetizable skills.</p>
                  </div>
                  <button className="btn btn-solid-dark btn-sm" onClick={() => navigate("/")}>
                    Explore Courses &rarr;
                  </button>
                </div>
              )}

              {/* Weekly Learning Activity Chart Card */}
              <div className="activity-chart-widget-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Weekly Learning Activity
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: 4, color: "var(--text-primary)" }}>
                      4h 32m
                    </div>
                  </div>
                  <span className="pill-badge pill-success" style={{ fontSize: "0.75rem" }}>
                    +30%
                  </span>
                </div>

                {/* Micro bar chart */}
                <div className="chart-bars-row">
                  {weeklyActivityData.map(d => (
                    <div key={d.day} className="chart-bar-col">
                      <div
                        className={`chart-bar-pillar ${d.highlight ? "highlighted" : ""}`}
                        style={{ height: `${d.hours}px` }}
                        title={`${d.day}: ${d.label}`}
                      />
                      <span style={{ fontSize: "0.725rem", color: "var(--text-muted)", fontWeight: 500 }}>
                        {d.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Row: My Courses & Upcoming Events */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 24, marginBottom: 32 }}>
              {/* My Courses Section */}
              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>My Courses</h2>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: "0.85rem", color: "var(--primary-learner)", fontWeight: 600 }}
                    onClick={() => setActiveNav("my-courses")}
                  >
                    View all &rarr;
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {enrolledCourses.map(c => (
                    <div
                      key={c.id}
                      style={{
                        border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius-sm)",
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        background: "#F8FAFC",
                        cursor: "pointer"
                      }}
                      onClick={() => navigate(`/course/${c.id}`)}
                    >
                      <div style={{ height: 90, borderRadius: 6, overflow: "hidden", marginBottom: 10, background: "#0F172A" }}>
                        <img src={c.image} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: 4, lineHeight: 1.3 }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
                        {c.type}
                      </div>
                      <div style={{ marginTop: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>
                          <span>Progress</span>
                          <span>{c.progress}%</span>
                        </div>
                        <div style={{ width: "100%", height: 5, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${c.progress}%`, height: "100%", background: c.progress > 0 ? "var(--primary-learner)" : "transparent", borderRadius: 99 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Schedule / Deadlines Panel */}
              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 24 }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 16 }}>Upcoming</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Item 1 */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, background: "#F8FAFC", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      📝
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                        Assignment Due
                      </div>
                      <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                        AI Automation &bull; Fri, 6:00 PM
                      </div>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, background: "#F8FAFC", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEF3C7", color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      ⏱
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                        Module 4 Assessment
                      </div>
                      <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                        Test &bull; Sat, 10:00 AM
                      </div>
                    </div>
                  </div>
                </div>

                {/* Learning Paths Promo */}
                <div style={{ marginTop: 24, padding: 16, background: "linear-gradient(135deg, #F5F3FF, #EFF6FF)", borderRadius: "var(--radius-sm)", border: "1px solid #E0E7FF" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--primary-learner)", marginBottom: 4 }}>
                    Learning Paths
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0F172A", marginBottom: 4 }}>
                    Become a Digital Creator
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12 }}>
                    6 courses &bull; 8 milestones
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ width: "100%", background: "#FFFFFF" }}
                    onClick={() => setShowPathModal(true)}
                  >
                    Explore Path &rarr;
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB: MY COURSES ────────────────────────────────────────── */}
        {activeNav === "my-courses" && (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>My Enrolled Courses</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 24 }}>Manage your active learning modules and track progress.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {enrolledCourses.map(c => (
                <div key={c.id} style={{ border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#F8FAFC" }}>
                  <img src={c.image} alt={c.title} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                  <div style={{ padding: 16 }}>
                    <span className="pill-badge pill-tech" style={{ marginBottom: 6 }}>{c.type}</span>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 6 }}>{c.title}</h3>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12 }}>{c.currentModule}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>
                      <span>Progress</span>
                      <span>{c.progress}%</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: "#E2E8F0", borderRadius: 99, marginBottom: 16 }}>
                      <div style={{ width: `${c.progress}%`, height: "100%", background: "var(--primary-learner)", borderRadius: 99 }} />
                    </div>
                    <button className="btn btn-solid-dark btn-sm" style={{ width: "100%" }} onClick={() => navigate(`/course/${c.id}`)}>
                      Resume Course &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: ASSIGNMENTS ───────────────────────────────────────── */}
        {activeNav === "assignments" && (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>Assignments &amp; Projects</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 24 }}>Submit required course deliverables and view instructor grades.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Zapier Automated Pipeline Architecture", course: "AI Essentials & Automation", due: "Fri, Oct 24 • 6:00 PM", status: "Pending Submission", badge: "pill-audio" },
                { title: "Visual Brand Identity Mockup in Figma", course: "Graphic Design Fundamentals", due: "Mon, Oct 27 • 11:59 PM", status: "Graded (95%)", badge: "pill-success" },
                { title: "Organic Social Media Campaign Blueprint", course: "Social Media Management", due: "Nov 02 • 5:00 PM", status: "Not Started", badge: "pill-tech" },
              ].map((ass, i) => (
                <div key={i} style={{ padding: 18, border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
                  <div>
                    <span className={`pill-badge ${ass.badge}`} style={{ marginBottom: 4 }}>{ass.status}</span>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{ass.title}</h3>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{ass.course} &bull; Due: {ass.due}</div>
                  </div>
                  <button className="btn btn-solid-dark btn-sm" onClick={() => triggerToast(`Submission portal opened for: ${ass.title}`)}>
                    Submit Work &rarr;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: TESTS ─────────────────────────────────────────────── */}
        {activeNav === "tests" && (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>Quizzes &amp; Assessments</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 24 }}>Modular evaluations testing your practical mastery.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Module 02 Assessment: AI Prompt Chaining", score: "96 / 100", date: "Completed Oct 14", badge: "pill-success" },
                { title: "Module 01 Assessment: Introduction & ML Basics", score: "88 / 100", date: "Completed Oct 08", badge: "pill-success" },
                { title: "Design Principles & Typography Test", score: "Upcoming", date: "Sat, Oct 25 • 10:00 AM", badge: "pill-tech" },
              ].map((test, i) => (
                <div key={i} style={{ padding: 18, border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{test.title}</h3>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{test.date}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`pill-badge ${test.badge}`}>{test.score}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => triggerToast(`Reviewing results for ${test.title}`)}>
                      Review &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: CERTIFICATES ──────────────────────────────────────── */}
        {activeNav === "certificates" && (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>Certificates of Completion</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 24 }}>Official verified Peleekings credentials with your Registration Code.</p>
            <div style={{ padding: 28, border: "2px solid var(--primary-learner-border)", background: "linear-gradient(135deg, #FAF5FF, #EFF6FF)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span className="pill-badge pill-success" style={{ marginBottom: 8 }}>VERIFIED CREDENTIAL</span>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Foundations of Digital Computing</h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Recipient: <strong>{userName}</strong> &bull; Registration ID: <strong>{regCode}</strong>
                  </div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0F172A", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                  P
                </div>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 20 }}>
                This is to certify that the recipient has satisfactorily demonstrated proficiency in computing fundamentals and practical project applications.
              </p>
              <button
                className="btn btn-solid-dark btn-sm"
                onClick={() => {
                  triggerToast("Downloading Certificate PDF...");
                  const blob = new Blob([`Official Certificate of Completion\nAwarded to: ${userName}\nReg ID: ${regCode}\nCourse: Foundations of Digital Computing\nDate: ${new Date().toLocaleDateString()}`], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Certificate_${regCode}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Download Official Certificate ↓
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: PROFILE ───────────────────────────────────────────── */}
        {activeNav === "profile" && (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 32, maxWidth: 640 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>Learner Profile</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 24 }}>Your registration details and account settings.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Full Name</label>
                <input type="text" readOnly className="form-field-input" value={userName} style={{ background: "#F8FAFC" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Email Address</label>
                <input type="email" readOnly className="form-field-input" value={email} style={{ background: "#F8FAFC" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Registration ID</label>
                  <input type="text" readOnly className="form-field-input" value={regCode} style={{ background: "var(--success-bg)", color: "var(--success-text)", fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    {userProfile?.studentType === "non_corper" ? "Learner Category" : "NYSC State Code"}
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="form-field-input"
                    value={userProfile?.studentType === "non_corper" ? "Non-Corper (Independent Learner)" : nyscCode}
                    style={{ background: "#F8FAFC" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-solid-dark" onClick={() => triggerToast("Profile data verified with Peleekings Registry.")}>
                  Save Profile Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: NOTES & ANNOUNCEMENTS FALLBACK ────────────────────── */}
        {(activeNav === "notes" || activeNav === "announcements") && (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 32 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, textTransform: "capitalize", marginBottom: 6 }}>{activeNav}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 20 }}>Stay updated with course broadcasts and downloadable reference material.</p>
            <div style={{ padding: 18, background: "#F8FAFC", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Module 4 Live Q&amp;A Scheduled</div>
              <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: 8 }}>Posted by Lead Instructor &bull; 2 days ago</div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Join us on Saturday 10:00 AM for an interactive walkthrough on setting up production webhooks.</p>
            </div>
          </div>
        )}

        {/* ── Learning Path Modal ────────────────────────────────────── */}
        {showPathModal && (
          <div className="modal-backdrop-overlay" onClick={() => setShowPathModal(false)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span className="pill-badge pill-tech" style={{ marginBottom: 4 }}>CAREER PATH</span>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Become a Digital Creator</h3>
                </div>
                <button className="btn-ghost" onClick={() => setShowPathModal(false)}>✕</button>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 20 }}>
                A step-by-step roadmap combining Graphic Design, Videography, Social Media Growth, and Automation tools.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {[
                  "Step 1: Visual Design with Figma",
                  "Step 2: Video Capture & Premiere Pro Editing",
                  "Step 3: Audience Distribution on YouTube & TikTok",
                  "Step 4: AI Automation & Repurposing Pipeline",
                ].map((step, idx) => (
                  <div key={idx} style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, fontSize: "0.875rem", fontWeight: 600 }}>
                    {step}
                  </div>
                ))}
              </div>
              <button className="btn btn-solid-dark" style={{ width: "100%" }} onClick={() => { setShowPathModal(false); navigate("/course/ai-essentials"); }}>
                Enroll in Path &rarr;
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
