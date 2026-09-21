import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserActivity, submitAssignment, getUserEnrollments } from "../contexts/userActivity";
import { COURSES_CATALOG } from "../data/courses";

export default function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeNav, setActiveNav] = useState("dashboard");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(location.state?.welcomeToast || "");
  const [showTutorBanner, setShowTutorBanner] = useState(location.state?.showTutorBanner || false);

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
  const userName = userProfile?.fullName || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Learner";
  const firstName = userProfile?.firstName || (userName.split(" ").length > 1 ? userName.split(" ")[0] : userName) || "Learner";
  const regCode = userProfile?.regNumber || "Pending assignment";
  const email = currentUser?.email || userProfile?.email || "";
  const nyscCode = isNonCorper ? "Not Applicable (Non-Corper)" : (userProfile?.nyscStateCode || "Not provided");

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  const [userActivity, setUserActivity] = useState(() => getUserActivity(currentUser?.uid));
  const [liveEnrollments, setLiveEnrollments] = useState([]);

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

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserEnrollments(currentUser.uid)
      .then((enrollments) => {
        if (enrollments && enrollments.length > 0) {
          const mapped = enrollments.map((enr) => {
            const catalogItem = COURSES_CATALOG.find((c) => c.id === enr.courseId) || {};
            return {
              id: enr.courseId,
              title: catalogItem.title || enr.courseTitle || enr.courseId,
              type: enr.experienceType === "hands-on" ? "Hands-on Practical" : "Online",
              progress: enr.progressPercent || 0,
              currentModule: `${(enr.completedItemIds || []).length} lessons completed`,
              image:
                catalogItem.image ||
                "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&auto=format&fit=crop&q=80",
              enrolledAt: enr.enrolledAt?.toDate ? enr.enrolledAt.toDate().toISOString() : new Date().toISOString(),
            };
          });
          setLiveEnrollments(mapped);
        }
      })
      .catch((err) => console.warn("Could not fetch live enrollments:", err));
  }, [currentUser]);

  // Active courses enrolled: prioritize live Firestore enrollments, fall back to cached
  const enrolledCourses = liveEnrollments.length > 0 ? liveEnrollments : (userActivity?.enrolledCourses || []);

  const weeklyActivityData = userActivity?.weeklyActivity || [
    { day: "Mon", hours: 45, label: "45m" },
    { day: "Tue", hours: 60, label: "1h" },
    { day: "Wed", hours: 30, label: "30m" },
    { day: "Thu", hours: 85, label: "1h 25m", highlight: true },
    { day: "Fri", hours: 40, label: "40m" },
    { day: "Sat", hours: 90, label: "1h 30m" },
    { day: "Sun", hours: 20, label: "20m" },
  ];

  const DEFAULT_ASSIGNMENTS = [
    {
      id: "ass-1",
      title: "Zapier Automated Pipeline Architecture",
      course: "AI Essentials & Automation",
      due: "Fri, Oct 24 • 6:00 PM",
      status: "Pending Submission",
      badge: "pill-audio",
      description: "Design and implement an automated workflow integrating a webhook trigger with an AI agent or multi-step action. Submit your architecture blueprint as a PDF or export file."
    },
    {
      id: "ass-2",
      title: "Visual Brand Identity Mockup in Figma",
      course: "Graphic Design Fundamentals",
      due: "Mon, Oct 27 • 11:59 PM",
      status: "Pending Submission",
      badge: "pill-tech",
      description: "Create a complete visual style guide including color palette, typography hierarchy, and a mobile/desktop component set. Submit your Figma link or exported assets."
    },
    {
      id: "ass-3",
      title: "Organic Social Media Campaign Blueprint",
      course: "Social Media Management",
      due: "Nov 02 • 5:00 PM",
      status: "Pending Submission",
      badge: "pill-tech",
      description: "Draft a 30-day content calendar, hook scripts, and audience distribution plan for a target client. Submit as a document or spreadsheet."
    }
  ];

  const [activeUploadAssignment, setActiveUploadAssignment] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLink, setUploadLink] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const userSubmissions = userActivity?.assignmentSubmissions || {};

  const assignments = DEFAULT_ASSIGNMENTS.map(item => {
    const submission = userSubmissions[item.id];
    if (submission) {
      return {
        ...item,
        status: "Submitted (Under Review)",
        badge: "pill-success",
        submission
      };
    }
    return item;
  });

  async function handleAssignmentUploadSubmit(e) {
    e.preventDefault();
    if (!uploadFile && !uploadLink.trim()) {
      alert("Please choose a file to upload or provide a project link.");
      return;
    }

    setIsSubmittingAssignment(true);

    try {
      const submissionData = {
        file: uploadFile || null,
        fileName: uploadFile ? uploadFile.name : null,
        fileSize: uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : null,
        fileType: uploadFile ? uploadFile.type : null,
        projectLink: uploadLink.trim() || null,
        notes: uploadNotes.trim() || null,
        submittedAt: new Date().toISOString(),
        studentName: userName,
        studentEmail: email,
      };

      await submitAssignment(currentUser?.uid, activeUploadAssignment.id, submissionData);
      triggerToast(`Assignment "${activeUploadAssignment.title}" submitted successfully!`);
      setActiveUploadAssignment(null);
      setUploadFile(null);
      setUploadLink("");
      setUploadNotes("");
    } catch (err) {
      console.error("Assignment submission error:", err);
      triggerToast("Failed to submit assignment. Please try again.");
    } finally {
      setIsSubmittingAssignment(false);
    }
  }

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

        {/* Stage 6: Dismissible Tutor Apply Banner */}
        {showTutorBanner && (
          <div
            style={{
              background: "#F3EEFC",
              border: "1px solid #D8C7F8",
              borderRadius: "10px",
              padding: "14px 20px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontSize: "0.9rem", color: "#5624D0" }}>
              <strong>Want to teach on Peleekings?</strong> Share your expertise with hundreds of students.{" "}
              <Link to="/teach" style={{ color: "#5624D0", fontWeight: 700, textDecoration: "underline" }}>
                Apply here &rarr;
              </Link>
            </div>
            <button
              onClick={() => setShowTutorBanner(false)}
              style={{
                background: "none",
                border: "none",
                color: "#5624D0",
                cursor: "pointer",
                fontSize: "1.1rem",
                lineHeight: 1,
                padding: "4px 8px",
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

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
                      onClick={() => navigate(`/course/${enrolledCourses[0].id}`, { state: { classroom: true } })}
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
                      onClick={() => navigate(`/course/${c.id}`, { state: { classroom: true } })}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>Assignments &amp; Projects</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Submit required course deliverables, upload practical projects, and track instructor reviews.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pill-badge pill-tech" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                  {Object.keys(userSubmissions).length} of {DEFAULT_ASSIGNMENTS.length} Submitted
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {assignments.map((ass) => (
                <div
                  key={ass.id}
                  style={{
                    padding: 22,
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-md)",
                    background: ass.submission ? "#F0FDF4" : "#F8FAFC",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    transition: "border-color 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span className={`pill-badge ${ass.badge}`}>{ass.status}</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{ass.course}</span>
                      </div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{ass.title}</h3>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 6, maxWidth: 680, lineHeight: 1.5 }}>
                        {ass.description}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>Due: {ass.due}</span>
                      <button
                        className={`btn ${ass.submission ? "btn-outline" : "btn-solid-dark"} btn-sm`}
                        onClick={() => {
                          setActiveUploadAssignment(ass);
                          setUploadFile(null);
                          setUploadLink(ass.submission?.projectLink || "");
                          setUploadNotes(ass.submission?.notes || "");
                        }}
                      >
                        {ass.submission ? "Replace / Re-upload ↻" : "Upload Deliverable ↑"}
                      </button>
                    </div>
                  </div>

                  {/* If already submitted, display submission details */}
                  {ass.submission && (
                    <div style={{ background: "#FFFFFF", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid #BBF7D0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 6, background: "#DCFCE7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                          📄
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#166534" }}>
                            {ass.submission.fileName || "Project Link Submitted"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {ass.submission.fileSize && `${ass.submission.fileSize} • `}
                            Submitted on {new Date(ass.submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {ass.submission.projectLink && (
                          <a
                            href={ass.submission.projectLink}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: "0.78rem", color: "var(--primary-learner)" }}
                          >
                            🔗 View Project Link
                          </a>
                        )}
                        <span className="pill-badge pill-success" style={{ fontSize: "0.75rem" }}>
                          ✓ Received by Instructor
                        </span>
                      </div>
                    </div>
                  )}
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

        {/* ── Assignment Upload Modal ───────────────────────────────── */}
        {activeUploadAssignment && (
          <div className="modal-backdrop-overlay" onClick={() => !isSubmittingAssignment && setActiveUploadAssignment(null)}>
            <div
              className="modal-dialog-box"
              style={{ maxWidth: 560, width: "92%", padding: "26px" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span className="pill-badge pill-tech" style={{ marginBottom: 6 }}>ASSIGNMENT SUBMISSION</span>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>{activeUploadAssignment.title}</h3>
                  <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: 2 }}>{activeUploadAssignment.course}</div>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => setActiveUploadAssignment(null)}
                  style={{ fontSize: "1.2rem", cursor: "pointer", border: "none" }}
                  disabled={isSubmittingAssignment}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignmentUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* File Upload Zone */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                    Upload Deliverable File (PDF, ZIP, DOCX, Images, Figma)
                  </label>
                  <div
                    style={{
                      border: "2px dashed var(--border-light)",
                      borderRadius: "var(--radius-md)",
                      padding: "24px 16px",
                      textAlign: "center",
                      background: uploadFile ? "#F0FDF4" : "#F8FAFC",
                      borderColor: uploadFile ? "var(--success-border, #86EFAC)" : "var(--border-light)",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => document.getElementById("assignment-file-input")?.click()}
                  >
                    <input
                      id="assignment-file-input"
                      type="file"
                      style={{ display: "none" }}
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                      accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.fig,.txt"
                    />

                    {uploadFile ? (
                      <div>
                        <div style={{ fontSize: "2rem", marginBottom: 6 }}>✅</div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#15803D" }}>{uploadFile.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {(uploadFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "2rem", marginBottom: 6 }}>📁</div>
                        <div style={{ fontWeight: 700, fontSize: "0.925rem", color: "var(--text-primary)" }}>
                          Click to browse or drag &amp; drop file here
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                          Supports PDF, ZIP, DOCX, PNG, JPG (Max 25MB)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alternative / Supplemental Project URL */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                    Project Link / Repository URL (Optional)
                  </label>
                  <input
                    type="url"
                    className="form-field-input"
                    placeholder="e.g. https://www.figma.com/file/... or https://github.com/..."
                    value={uploadLink}
                    onChange={e => setUploadLink(e.target.value)}
                    style={{ background: "#F8FAFC" }}
                  />
                </div>

                {/* Learner Notes to Instructor */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                    Notes / Comments for Grader (Optional)
                  </label>
                  <textarea
                    rows="3"
                    className="form-field-input"
                    placeholder="Add any specific context, login test details, or notes on your design decisions..."
                    value={uploadNotes}
                    onChange={e => setUploadNotes(e.target.value)}
                    style={{ background: "#F8FAFC", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setActiveUploadAssignment(null)}
                    disabled={isSubmittingAssignment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-solid-dark"
                    disabled={isSubmittingAssignment}
                  >
                    {isSubmittingAssignment ? "Uploading Deliverable..." : "Submit Assignment &rarr;"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
