import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { COURSES_CATALOG } from "./Home";

const COURSE_MODULES = [
  {
    id: "m1",
    title: "Module 01 - Understanding AI",
    lessons: [
      { id: "l1", title: "1. What is Artificial Intelligence", duration: "10 min", completed: true, type: "video" },
      { id: "l2", title: "2. History of AI & Machine Learning", duration: "15 min", completed: true, type: "video" },
      { id: "l3", title: "3. AI in the Real World", duration: "18 min", completed: true, type: "reading" },
    ]
  },
  {
    id: "m2",
    title: "Module 02 - AI Tools",
    lessons: [
      { id: "l4", title: "4. Popular AI Tools Overview", duration: "14 min", completed: true, type: "video" },
      { id: "l5", title: "5. Using ChatGPT for Work", duration: "12 min", completed: false, type: "video" },
      { id: "l6", title: "6. Automation with Zapier & Make", duration: "25 min", completed: false, locked: false, type: "assignment" },
    ]
  },
  {
    id: "m3",
    title: "Module 03 - Automation",
    lessons: [
      { id: "l7", title: "7. Workflow Design Fundamentals", duration: "20 min", completed: false, locked: false, type: "video" },
      { id: "l8", title: "8. Capstone Project: End-to-End Pipeline", duration: "35 min", completed: false, locked: false, type: "test" },
    ]
  }
];

export default function CoursePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const courseData = COURSES_CATALOG.find(c => c.id === id) || COURSES_CATALOG[0];

  // State: enrolled vs classroom view
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [viewMode, setViewMode] = useState("classroom"); // "detail" or "classroom"
  const [selectedExperience, setSelectedExperience] = useState("online"); // "online" or "hands-on"
  
  // Classroom lesson state
  const [modules, setModules] = useState(COURSE_MODULES);
  const [activeLessonId, setActiveLessonId] = useState("l5");
  const [activeTab, setActiveTab] = useState("Overview");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showMobileCurriculum, setShowMobileCurriculum] = useState(false);

  // Discussion state
  const [comments, setComments] = useState([
    { id: 1, author: "Esther James", time: "1h ago", text: "The breakdown of few-shot prompt chaining was exceptionally clear. Loved the Zapier connector pattern!" },
    { id: 2, author: "David Okafor", time: "3h ago", text: "Are the exercise files compatible with both Windows and Mac?" }
  ]);
  const [newComment, setNewComment] = useState("");

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  // Find active lesson
  let currentLesson = null;
  for (const m of modules) {
    const found = m.lessons.find(l => l.id === activeLessonId);
    if (found) {
      currentLesson = found;
      break;
    }
  }
  if (!currentLesson) currentLesson = modules[0].lessons[0];

  // Calculate overall progress
  const allLessons = modules.flatMap(m => m.lessons);
  const completedCount = allLessons.filter(l => l.completed).length;
  const progressPercent = Math.round((completedCount / allLessons.length) * 100);

  function toggleLessonComplete(lessonId) {
    setModules(prev =>
      prev.map(mod => ({
        ...mod,
        lessons: mod.lessons.map(les =>
          les.id === lessonId ? { ...les, completed: !les.completed } : les
        )
      }))
    );
    const lessonObj = allLessons.find(l => l.id === lessonId);
    triggerToast(lessonObj && !lessonObj.completed ? "✓ Lesson marked as complete!" : "Lesson marked as incomplete");
  }

  function handleEnroll(experienceType) {
    setSelectedExperience(experienceType);
    setIsEnrolled(true);
    triggerToast(`🎉 Successfully enrolled in ${experienceType === "online" ? "Online Classes" : "Hands-on Training"}!`);
    setTimeout(() => setViewMode("classroom"), 600);
  }

  function handleToggleWishlist() {
    setIsWishlisted(prev => {
      const next = !prev;
      triggerToast(next ? "♥ Added to your wishlist!" : "Removed from wishlist");
      return next;
    });
  }

  function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments(prev => [
      {
        id: Date.now(),
        author: currentUser?.displayName || "Samuel Asuquo",
        time: "Just now",
        text: newComment.trim(),
      },
      ...prev
    ]);
    setNewComment("");
    triggerToast("Comment posted!");
  }

  function triggerDownload(fileName) {
    triggerToast(`Preparing download for: ${fileName}`);
    const blob = new Blob([`Peleekings Learning Material: ${fileName}\nCourse: ${courseData.title}\nLesson: ${currentLesson.title}\nGenerated on: ${new Date().toLocaleDateString()}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ──────────────────────────────────────────────────────────────────────────
     CLASSROOM VIEW (Screen 6 from Mockup)
  ────────────────────────────────────────────────────────────────────────── */
  if (viewMode === "classroom") {
    return (
      <div className="classroom-container">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div style={{ position: "fixed", top: 80, right: 24, zIndex: 1000, background: "#0F172A", color: "#FFFFFF", padding: "12px 20px", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)", fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
            <span>✓</span> {toastMessage}
          </div>
        )}

        {/* Classroom Top Bar */}
        <div className="classroom-top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => setViewMode("detail")}
              className="btn btn-ghost btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
            >
              &larr; Back to Details
            </button>
            <div style={{ height: 20, width: 1, background: "var(--border-light)" }} />
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>
              {courseData.title}
            </div>
            {/* Mobile Curriculum Toggle Button */}
            <button
              className="btn btn-outline btn-sm mobile-curriculum-btn"
              onClick={() => setShowMobileCurriculum(prev => !prev)}
            >
              ☰ View Curriculum
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              className="pill-badge pill-success"
              style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700 }}
            >
              {progressPercent}% complete
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate("/dashboard")}
            >
              My Dashboard
            </button>
          </div>
        </div>

        {/* Classroom Split Layout */}
        <div className="classroom-split-layout">
          {/* Left: Collapsible Curriculum Sidebar */}
          <aside className="classroom-curriculum-sidebar">
            <div style={{ padding: "0 20px 14px", fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Course Curriculum
            </div>

            {modules.map((mod) => (
              <div key={mod.id} className="curriculum-module-group">
                <div className="module-header-title">
                  {mod.title}
                </div>
                <div>
                  {mod.lessons.map(lesson => {
                    const isActive = lesson.id === activeLessonId;
                    return (
                      <div
                        key={lesson.id}
                        className={`lesson-curriculum-row ${isActive ? "active" : ""}`}
                        onClick={() => setActiveLessonId(lesson.id)}
                      >
                        <div
                          className={`lesson-check-icon ${lesson.completed ? "completed" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLessonComplete(lesson.id);
                          }}
                          title={lesson.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          &#10003;
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.85rem", lineHeight: 1.3 }}>
                            {lesson.title}
                          </div>
                          <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: 2 }}>
                            {lesson.duration} &bull; {lesson.type}
                          </div>
                        </div>
                        {isActive && (
                          <span style={{ fontSize: "0.8rem", color: "var(--primary-learner)" }}>▶</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Right: Main Video Player & Lesson Content */}
          <main className="classroom-video-main">
            {/* Video Player Frame */}
            <div className="video-frame-container" id="classroom-video-player">
              <img
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80"
                alt="Lesson Video Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
              />

              <div className="video-mockup-overlay">
                {/* Top Overlay */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="pill-badge" style={{ background: "rgba(0,0,0,0.6)", color: "#FFFFFF", backdropFilter: "blur(4px)" }}>
                    {courseData.badge} &bull; {currentLesson.title}
                  </div>
                  <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>HD 1080p</div>
                </div>

                {/* Big Center Play Button */}
                <div style={{ alignSelf: "center", cursor: "pointer" }} onClick={() => setIsPlaying(!isPlaying)}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: "50%",
                      background: "rgba(17, 24, 39, 0.85)",
                      border: "2px solid rgba(255,255,255,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.6rem",
                      color: "#FFFFFF",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                      transition: "transform 0.2s ease"
                    }}
                  >
                    {isPlaying ? "❚❚" : "▶"}
                  </div>
                </div>

                {/* Bottom Controls Bar */}
                <div className="video-controls-bar">
                  <span style={{ cursor: "pointer" }} onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? "❚❚" : "▶"}
                  </span>
                  <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.3)", borderRadius: 99, position: "relative" }}>
                    <div style={{ width: isPlaying ? "72%" : "52%", height: "100%", background: "var(--primary-learner)", borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                  <span>12:24 / 23:10</span>
                  <span style={{ cursor: "pointer" }} onClick={() => setIsMuted(m => !m)} title={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? "🔇" : "🔊"}
                  </span>
                  <span style={{ cursor: "pointer" }} title="Settings">&#x2699;</span>
                  <span
                    style={{ cursor: "pointer" }}
                    title="Toggle Fullscreen"
                    onClick={() => {
                      const el = document.getElementById("classroom-video-player");
                      if (el) {
                        if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
                        else document.exitFullscreen().catch(() => {});
                      }
                    }}
                  >
                    &#x26F6;
                  </span>
                </div>
              </div>
            </div>

            {/* Lesson Title & Module Info */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 4 }}>
                  {currentLesson.title}
                </h1>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Module 02 &bull; {currentLesson.duration} &bull; Self-paced learning
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const currentIndex = allLessons.findIndex(l => l.id === activeLessonId);
                    if (currentIndex > 0) setActiveLessonId(allLessons[currentIndex - 1].id);
                  }}
                >
                  &larr; Previous
                </button>
                <button
                  className={`btn ${currentLesson.completed ? "btn-outline" : "btn-solid-dark"} btn-sm`}
                  onClick={() => toggleLessonComplete(currentLesson.id)}
                >
                  {currentLesson.completed ? "✓ Completed" : "Mark as complete"}
                </button>
                <button
                  className="btn btn-solid-dark btn-sm"
                  onClick={() => {
                    const currentIndex = allLessons.findIndex(l => l.id === activeLessonId);
                    if (currentIndex < allLessons.length - 1) setActiveLessonId(allLessons[currentIndex + 1].id);
                  }}
                >
                  Next lesson &rarr;
                </button>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="lesson-tabs-header">
              {["Overview", "Notes", "Resources", "Discussion"].map(tab => (
                <button
                  key={tab}
                  className={`lesson-tab-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div style={{ fontSize: "0.925rem", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 840 }}>
              {activeTab === "Overview" && (
                <div>
                  <p style={{ marginBottom: 14 }}>
                    In this lesson, you will learn how to effectively leverage modern AI models to automate everyday business tasks, generate structured output, and orchestrate automated workflows with zero coding required.
                  </p>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "16px 0 8px" }}>
                    Key Learning Objectives:
                  </h4>
                  <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    <li>Understanding zero-shot and few-shot prompt chaining</li>
                    <li>Formatting AI output directly into JSON, tables, and Markdown</li>
                    <li>Connecting conversational agents to real-world webhook automation</li>
                  </ul>
                </div>
              )}

              {activeTab === "Notes" && (
                <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Course Notes: {currentLesson.title}</div>
                    <button className="btn btn-outline btn-sm" onClick={() => triggerDownload("Course_Notes_Module02.pdf")}>
                      Download PDF &darr;
                    </button>
                  </div>
                  <p>Comprehensive lecture notes summarizing the concepts covered in this module, including cheatsheets, prompt patterns, and best practices.</p>
                </div>
              )}

              {activeTab === "Resources" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Exercise Files &bull; ZIP</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Templates, dataset spreadsheets, and prompt guides (4.2 MB)</div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => triggerDownload("Exercise_Files_Module02.zip")}>
                      Download &darr;
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "Discussion" && (
                <div>
                  <form onSubmit={handleAddComment} style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <input
                      type="text"
                      placeholder="Ask a question or share a thought on this lesson..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)", outline: "none" }}
                    />
                    <button type="submit" className="btn btn-solid-dark">Post</button>
                  </form>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {comments.map(c => (
                      <div key={c.id} style={{ padding: "12px 16px", background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{c.author}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.time}</span>
                        </div>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Mobile Curriculum Drawer Modal */}
        {showMobileCurriculum && (
          <div className="modal-backdrop-overlay" onClick={() => setShowMobileCurriculum(false)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()} style={{ maxHeight: "80vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Course Curriculum</h3>
                <button className="btn-ghost" onClick={() => setShowMobileCurriculum(false)}>✕</button>
              </div>
              <div>
                {modules.map((mod) => (
                  <div key={mod.id} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", padding: "6px 0" }}>
                      {mod.title}
                    </div>
                    {mod.lessons.map(lesson => (
                      <div
                        key={lesson.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: lesson.id === activeLessonId ? "var(--primary-learner-light)" : "#F8FAFC",
                          color: lesson.id === activeLessonId ? "var(--primary-learner)" : "var(--text-primary)",
                          fontWeight: lesson.id === activeLessonId ? 700 : 500,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          setActiveLessonId(lesson.id);
                          setShowMobileCurriculum(false);
                        }}
                      >
                        <span>{lesson.title}</span>
                        <span style={{ fontSize: "0.75rem" }}>{lesson.completed ? "✓" : lesson.duration}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────────────────────────
     COURSE DETAIL VIEW (Screen 3 from Mockup)
  ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="course-detail-page">
      {/* Back Breadcrumb */}
      <Link to="/" className="back-breadcrumb">
        &larr; Back
      </Link>

      {/* Header Banner Card */}
      <div className="course-detail-header-card">
        <div>
          <span className={`pill-badge ${courseData.badgeClass}`} style={{ marginBottom: 14 }}>
            {courseData.badge}
          </span>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1.15, marginBottom: 12 }}>
            {courseData.title}
          </h1>
          <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
            {courseData.description}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 28, flexWrap: "wrap" }}>
            <div className="star-rating-box">
              <span>★</span>
              <strong style={{ color: "var(--text-primary)" }}>{courseData.rating}</strong> ({courseData.reviewsCount} learners)
            </div>
            <span>&bull;</span>
            <span>{courseData.modulesCount} Modules</span>
            <span>&bull;</span>
            <span>{courseData.duration}</span>
            <span>&bull;</span>
            <span>{courseData.level}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {isEnrolled ? (
              <button
                className="btn btn-solid-dark btn-lg"
                onClick={() => setViewMode("classroom")}
              >
                Enter Classroom &rarr;
              </button>
            ) : (
              <button
                className="btn btn-solid-dark btn-lg"
                onClick={() => handleEnroll("online")}
              >
                Enroll Now
              </button>
            )}

            <button
              className={`btn btn-outline btn-lg ${isWishlisted ? "btn-solid-purple" : ""}`}
              onClick={handleToggleWishlist}
            >
              {isWishlisted ? "♥ In Wishlist" : "♡ Add to Wishlist"}
            </button>
          </div>
        </div>

        {/* Right Graphic Preview */}
        <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-md)" }}>
          <img
            src={courseData.image}
            alt={courseData.title}
            style={{ width: "100%", height: 260, objectFit: "cover" }}
          />
        </div>
      </div>

      {/* Choose Your Learning Experience Section */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>
          Choose your learning experience
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Select how you prefer to master this skill.
        </p>

        <div className="experience-options-grid">
          {/* Card 1: Online Classes */}
          <div
            className="experience-card"
            style={{ border: selectedExperience === "online" ? "2px solid #0F172A" : "1px solid var(--border-light)" }}
          >
            <div className="experience-card-header">
              <div className="experience-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>ONLINE CLASSES</h3>
                <div style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Learn from wherever you are.</div>
              </div>
            </div>

            <div className="perks-list">
              <div className="perk-item"><span>✓</span> Online lessons</div>
              <div className="perk-item"><span>✓</span> Digital course materials</div>
              <div className="perk-item"><span>✓</span> Online assignments</div>
              <div className="perk-item"><span>✓</span> Online tests &amp; quizzes</div>
              <div className="perk-item"><span>✓</span> Course announcements &amp; updates</div>
              <div className="perk-item"><span>✓</span> Remote learning resources</div>
            </div>

            <button
              className="btn btn-solid-dark btn-lg"
              style={{ marginTop: "auto", width: "100%" }}
              onClick={() => handleEnroll("online")}
            >
              Choose Online &rarr;
            </button>
          </div>

          {/* Card 2: Hands-on Training */}
          <div
            className="experience-card"
            style={{ border: selectedExperience === "hands-on" ? "2px solid #0F172A" : "1px solid var(--border-light)" }}
          >
            <div className="experience-card-header">
              <div className="experience-icon-box" style={{ background: "#F5F3FF", color: "#5624D0" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>HANDS-ON TRAINING</h3>
                <div style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Learn by doing, in person.</div>
              </div>
            </div>

            <div className="perks-list">
              <div className="perk-item"><span>✓</span> Instructor-led practical sessions</div>
              <div className="perk-item"><span>✓</span> Physical training &amp; hardware labs</div>
              <div className="perk-item"><span>✓</span> Practical assignments with feedback</div>
              <div className="perk-item"><span>✓</span> Physical learning resources</div>
              <div className="perk-item"><span>✓</span> In-person assessments</div>
              <div className="perk-item"><span>✓</span> Access to studio activities</div>
            </div>

            <button
              className="btn btn-solid-dark btn-lg"
              style={{ marginTop: "auto", width: "100%" }}
              onClick={() => handleEnroll("hands-on")}
            >
              Choose Hands-on &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
