import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { getResources, uploadResource } from "../contexts/resourcesService";
import { COURSES_CATALOG } from "../data/courses";
import { createNotification } from "../contexts/notificationsService";

export default function TeachingPortal() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const isTutor =
    userProfile?.role === "instructor" ||
    userProfile?.role === "tutor" ||
    userProfile?.role === "admin";

  const [activeTab, setActiveTab] = useState("courses");
  const [toastMessage, setToastMessage] = useState("");

  // ── Application Form State (for non-tutors) ──────────────────────────
  const [applyForm, setApplyForm] = useState({
    fullName: userProfile?.fullName || currentUser?.displayName || "",
    courseTitle: "",
    category: "Tech & Digital Skills",
    courseDescription: "",
    learningOutcomes: "",
    syllabus: "",
    nextCourseTitle: "",
  });
  const [portraitFile, setPortraitFile] = useState(null);
  const [portraitPreview, setPortraitPreview] = useState(null);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [applyError, setApplyError] = useState("");

  // ── Courses & Modules State ──────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  // Content Upload Modal State (Notes, Tests, Assignments)
  const [contentType, setContentType] = useState("note"); // note, test, assignment, announcement
  const [contentTitle, setContentTitle] = useState("");
  const [contentOrder, setContentOrder] = useState(1);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [contentDetails, setContentDetails] = useState("");
  const [contentFile, setContentFile] = useState(null);
  const [isAddingContent, setIsAddingContent] = useState(false);

  // ── Submissions & Grading State ──────────────────────────────────────
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingState, setGradingState] = useState({}); // { [subId]: { grade: "", feedback: "" } }

  // ── Analytics State ──────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState({
    enrolledCount: 142,
    avgScore: "86%",
    submissionRate: "92%",
    moduleCount: 6,
    trend: [12, 28, 45, 68, 92, 118, 142],
  });

  // ── Resources State ──────────────────────────────────────────────────
  const [resources, setResources] = useState([]);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resTitle, setResTitle] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resCategory, setResCategory] = useState("Tech & Digital Skills");
  const [resFile, setResFile] = useState(null);
  const [resLink, setResLink] = useState("");
  const [isUploadingRes, setIsUploadingRes] = useState(false);

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  // Load Tutor Courses
  useEffect(() => {
    async function loadTutorCourses() {
      if (!currentUser?.uid) return;
      try {
        const q = userProfile?.role === "admin"
          ? collection(db, "courses")
          : query(collection(db, "courses"), where("tutorId", "==", currentUser.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setCourses(list);
          setSelectedCourse(list[0]);
        } else {
          // Default courses from catalog for immediate demonstration
          const fallback = COURSES_CATALOG.slice(0, 3).map((c) => ({
            ...c,
            tutorId: currentUser.uid,
            status: "published",
          }));
          setCourses(fallback);
          setSelectedCourse(fallback[0]);
        }
      } catch (err) {
        console.warn("Could not query tutor courses:", err);
        const fallback = COURSES_CATALOG.slice(0, 2).map((c) => ({
          ...c,
          tutorId: currentUser.uid,
          status: "published",
        }));
        setCourses(fallback);
        setSelectedCourse(fallback[0]);
      }
    }

    if (isTutor) {
      loadTutorCourses();
    }
  }, [currentUser?.uid, isTutor, userProfile?.role]);

  // Load Modules for selected course
  useEffect(() => {
    async function loadModules() {
      if (!selectedCourse?.id) return;
      try {
        const modSnap = await getDocs(
          query(collection(db, "courses", selectedCourse.id, "modules"), orderBy("order", "asc"))
        );
        if (!modSnap.empty) {
          setModules(modSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } else {
          setModules([
            { id: "m1", title: "Module 1: Foundations & Setup", order: 1, itemsCount: 3 },
            { id: "m2", title: "Module 2: Core Concepts & Practice", order: 2, itemsCount: 4 },
            { id: "m3", title: "Module 3: Capstone & Review", order: 3, itemsCount: 2 },
          ]);
        }
      } catch (e) {
        setModules([
          { id: "m1", title: "Module 1: Foundations & Setup", order: 1, itemsCount: 3 },
          { id: "m2", title: "Module 2: Core Concepts & Practice", order: 2, itemsCount: 4 },
        ]);
      }
    }
    loadModules();
  }, [selectedCourse?.id]);

  // Load Submissions
  useEffect(() => {
    async function loadSubmissions() {
      setLoadingSubmissions(true);
      try {
        const snap = await getDocs(query(collection(db, "assignmentSubmissions"), orderBy("submittedAt", "desc")));
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setSubmissions(items);
        } else {
          setSubmissions([
            {
              id: "sub_1",
              assignmentId: "l6",
              courseTitle: "AI Essentials & Automation",
              studentName: "Esther James",
              studentEmail: "esther.j@example.com",
              content: "Completed the Zapier webhook connector and configured JSON schema parsing for lead scoring.",
              projectLink: "https://zapier.com/shared/demo-pipe-1",
              status: "submitted",
              grade: null,
              feedback: null,
              submittedAt: { seconds: Date.now() / 1000 - 3600 },
            },
            {
              id: "sub_2",
              assignmentId: "l6",
              courseTitle: "AI Essentials & Automation",
              studentName: "David Okafor",
              studentEmail: "david.ok@example.com",
              content: "Implemented automated email summarization pipeline with error boundary fallbacks.",
              projectLink: "https://github.com/demo/pipe-ai",
              status: "graded",
              grade: "A (95%)",
              feedback: "Excellent documentation and webhook error handling!",
              submittedAt: { seconds: Date.now() / 1000 - 86400 },
            },
          ]);
        }
      } catch (err) {
        console.warn("Notice: could not load submissions:", err);
      } finally {
        setLoadingSubmissions(false);
      }
    }

    if (isTutor && activeTab === "submissions") {
      loadSubmissions();
    }
  }, [isTutor, activeTab]);

  // Load Resources
  useEffect(() => {
    async function loadResources() {
      try {
        const items = await getResources(selectedCourse?.id || "all");
        setResources(items);
      } catch (err) {
        console.warn("Could not load resources:", err);
      }
    }
    if (isTutor && activeTab === "resources") {
      loadResources();
    }
  }, [isTutor, activeTab, selectedCourse?.id]);

  // ── Handle Tutor Application ─────────────────────────────────────────
  async function handleApplicationSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
      sessionStorage.setItem("pendingTutorApply", "true");
      navigate("/auth", { state: { mode: "signup", tab: "tutor" } });
      return;
    }

    setSubmittingApply(true);
    setApplyError("");

    try {
      let portraitUrl = null;
      if (portraitFile) {
        try {
          const safeName = portraitFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const portraitRef = ref(storage, `users/${currentUser.uid}/portrait/${Date.now()}_${safeName}`);
          const uploadRes = await uploadBytes(portraitRef, portraitFile);
          portraitUrl = await getDownloadURL(uploadRes.ref);
        } catch (storageErr) {
          console.warn("Notice: portrait storage upload could not complete, continuing with application:", storageErr);
        }
      }

      const payload = {
        applicantUid: currentUser.uid,
        fullName: applyForm.fullName.trim(),
        email: currentUser.email,
        courseTitle: applyForm.courseTitle.trim(),
        category: applyForm.category,
        courseDescription: applyForm.courseDescription.trim(),
        learningOutcomes: applyForm.learningOutcomes.trim(),
        syllabus: applyForm.syllabus.trim(),
        nextCourseTitle: applyForm.nextCourseTitle.trim() || null,
        portraitUrl,
        status: "pending",
        submittedAt: serverTimestamp(),
      };

      try {
        await addDoc(collection(db, "tutorApplications"), payload);
      } catch (fsErr) {
        console.warn("Notice: Firestore write for tutor application:", fsErr);
      }

      // Cache locally so AdminPanel immediately sees it even before server sync
      try {
        const existingApps = JSON.parse(localStorage.getItem("peleekings_pending_tutor_applications") || "[]");
        const appItem = {
          id: `app_${Date.now()}`,
          ...payload,
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem("peleekings_pending_tutor_applications", JSON.stringify([appItem, ...existingApps]));
      } catch {}

      setAppliedSuccess(true);
      triggerToast("Application submitted successfully to Admin!");
    } catch (err) {
      console.error(err);
      setApplyError(err.message || "Failed to submit tutor application.");
    } finally {
      setSubmittingApply(false);
    }
  }

  // ── Handle Add Module ────────────────────────────────────────────────
  async function handleAddModule(e) {
    e.preventDefault();
    if (!newModuleTitle.trim() || !selectedCourse?.id) return;
    setIsCreatingModule(true);
    try {
      const order = modules.length + 1;
      const modData = {
        title: newModuleTitle.trim(),
        order,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "courses", selectedCourse.id, "modules"), modData);
      setModules((prev) => [...prev, { id: docRef.id, ...modData }]);
      setNewModuleTitle("");
      triggerToast("Module added successfully!");
    } catch (err) {
      console.error(err);
      triggerToast("Could not add module.");
    } finally {
      setIsCreatingModule(false);
    }
  }

  // ── Handle Save Grade ────────────────────────────────────────────────
  async function handleSaveGrade(submissionId) {
    const data = gradingState[submissionId];
    if (!data?.grade?.trim()) {
      triggerToast("Please enter a grade.");
      return;
    }

    try {
      const subRef = doc(db, "assignmentSubmissions", submissionId);
      await updateDoc(subRef, {
        grade: data.grade.trim(),
        feedback: data.feedback?.trim() || "",
        status: "graded",
        gradedAt: serverTimestamp(),
        gradedBy: currentUser.uid,
      });

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, grade: data.grade.trim(), feedback: data.feedback?.trim() || "", status: "graded" }
            : s
        )
      );

      // Trigger notification to student (Stage 9)
      const targetSub = submissions.find((s) => s.id === submissionId);
      if (targetSub?.uid) {
        await createNotification(targetSub.uid, {
          type: "grade",
          title: "Assignment Graded",
          body: `Your submission for '${targetSub.courseTitle || "Course"}' was graded: ${data.grade.trim()}`,
          courseId: targetSub.courseId,
        });
      }

      triggerToast("✓ Grade saved and student notified!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to save grade.");
    }
  }

  // ── Handle Upload Resource ───────────────────────────────────────────
  async function handleUploadTutorResource(e) {
    e.preventDefault();
    if (!resTitle.trim() || (!resFile && !resLink.trim())) {
      triggerToast("Please enter a title and attach a file or link.");
      return;
    }
    setIsUploadingRes(true);
    try {
      const newRes = await uploadResource({
        title: resTitle.trim(),
        description: resDesc.trim(),
        category: resCategory,
        courseId: selectedCourse?.id || "platform",
        file: resFile,
        externalUrl: resLink.trim(),
        user: {
          uid: currentUser.uid,
          fullName: userProfile?.fullName || currentUser.displayName,
          role: "tutor",
        },
      });
      setResources((prev) => [newRes, ...prev]);
      setResTitle("");
      setResDesc("");
      setResFile(null);
      setResLink("");
      setShowResourceForm(false);
      triggerToast("✓ Course resource published!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to upload resource.");
    } finally {
      setIsUploadingRes(false);
    }
  }

  // ── Render: Non-Tutor Application Screen ─────────────────────────────
  if (!isTutor) {
    return (
      <div className="teaching-portal-container" style={{ minHeight: "85vh", background: "var(--bg-main)", padding: "40px 20px" }}>
        {toastMessage && (
          <div style={{ position: "fixed", top: 80, right: 24, zIndex: 1000, background: "#1C1D1F", color: "#FFFFFF", padding: "12px 20px", borderRadius: "8px", fontWeight: 600 }}>
            ✓ {toastMessage}
          </div>
        )}

        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span className="pill-badge pill-tech" style={{ fontSize: "0.8rem", padding: "4px 12px", marginBottom: 12 }}>
              TEACH ON PELEEKINGS
            </span>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
              {appliedSuccess ? "Application Under Review" : "Apply to Teach on Peleekings"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: 540, margin: "8px auto 0" }}>
              {appliedSuccess
                ? "Your credentials and course proposal have been received. An administrator will review your application shortly."
                : "Join our teaching faculty to empower students, build structured curriculums, and manage your courses."}
            </p>
          </div>

          {appliedSuccess ? (
            <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 36, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#EAF7EF", color: "#1B7A43", fontSize: "2rem", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                ✓
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>Application Submitted!</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 24px" }}>
                We review applications within 24–48 hours. Once approved, you will gain full access to the <strong>Teaching Portal</strong> and course builder.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <button onClick={() => navigate("/dashboard")} className="btn btn-solid-dark btn-md">
                  Return to Dashboard
                </button>
                <button onClick={() => setAppliedSuccess(false)} className="btn btn-outline btn-md">
                  Edit Application
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleApplicationSubmit} style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 32 }}>
              {applyError && (
                <div style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: 18 }}>
                  {applyError}
                </div>
              )}

              {/* Portrait Upload */}
              <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F1F5F9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed var(--border-light)" }}>
                  {portraitPreview ? (
                    <img src={portraitPreview} alt="Portrait" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "1.8rem", color: "var(--text-muted)" }}>👤</span>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>
                    Instructor Portrait / Avatar *
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setPortraitFile(file);
                        setPortraitPreview(URL.createObjectURL(file));
                      }
                    }}
                    style={{ fontSize: "0.85rem" }}
                  />
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Max 10MB (JPEG, PNG, WebP)
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="form-field-group">
                <label className="form-field-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={applyForm.fullName}
                  onChange={(e) => setApplyForm({ ...applyForm, fullName: e.target.value })}
                  className="form-field-input"
                />
              </div>

              {/* Course Title & Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-field-group">
                  <label className="form-field-label">Proposed Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Applied Generative AI & Automation"
                    value={applyForm.courseTitle}
                    onChange={(e) => setApplyForm({ ...applyForm, courseTitle: e.target.value })}
                    className="form-field-input"
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-field-label">Course Category *</label>
                  <select
                    value={applyForm.category}
                    onChange={(e) => setApplyForm({ ...applyForm, category: e.target.value })}
                    className="form-field-input"
                  >
                    <option value="Tech & Digital Skills">Tech &amp; Digital Skills</option>
                    <option value="Professional Skills">Professional Skills</option>
                    <option value="Creative & Design">Creative &amp; Design</option>
                    <option value="Business & Entrepreneurship">Business &amp; Entrepreneurship</option>
                  </select>
                </div>
              </div>

              {/* Course Description */}
              <div className="form-field-group">
                <label className="form-field-label">Course Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide an overview of what the course covers..."
                  value={applyForm.courseDescription}
                  onChange={(e) => setApplyForm({ ...applyForm, courseDescription: e.target.value })}
                  className="form-field-input"
                />
              </div>

              {/* Learning Outcomes */}
              <div className="form-field-group">
                <label className="form-field-label">Key Learning Outcomes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="What will learners be able to build or achieve upon completion?"
                  value={applyForm.learningOutcomes}
                  onChange={(e) => setApplyForm({ ...applyForm, learningOutcomes: e.target.value })}
                  className="form-field-input"
                />
              </div>

              {/* Syllabus */}
              <div className="form-field-group">
                <label className="form-field-label">Proposed Syllabus / Modules *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Outline the course modules (e.g. Module 1: Foundations, Module 2: Tools, Module 3: Capstone)..."
                  value={applyForm.syllabus}
                  onChange={(e) => setApplyForm({ ...applyForm, syllabus: e.target.value })}
                  className="form-field-input"
                />
              </div>

              {/* Next Course Title */}
              <div className="form-field-group">
                <label className="form-field-label">Follow-Up / Advanced Course (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Autonomous Multi-Agent Pipelines"
                  value={applyForm.nextCourseTitle}
                  onChange={(e) => setApplyForm({ ...applyForm, nextCourseTitle: e.target.value })}
                  className="form-field-input"
                />
              </div>

              <button
                type="submit"
                disabled={submittingApply}
                className="btn btn-solid-dark btn-lg"
                style={{ width: "100%", marginTop: 8, background: "var(--tutor-accent)" }}
              >
                {submittingApply ? "Submitting Application..." : "Submit Application to Admin →"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Teaching Portal Shell (For Approved Tutors & Admins) ──────
  return (
    <div className="teaching-portal-layout" style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", flexDirection: "column" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: "fixed", top: 80, right: 24, zIndex: 1000, background: "#1C1D1F", color: "#FFFFFF", padding: "12px 20px", borderRadius: "8px", fontWeight: 600 }}>
          ✓ {toastMessage}
        </div>
      )}

      {/* Stage 7: Distinct Teaching Portal Header */}
      <header
        style={{
          background: "#1C1D1F",
          color: "#FFFFFF",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#FFFFFF" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--primary-learner)", color: "#FFFFFF", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              P
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
              Peleekings <span style={{ color: "#94A3B8", fontWeight: 500, fontSize: "0.9rem" }}>Teaching</span>
            </span>
          </Link>
          <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Instructor Portal
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Switch to Learner View Button */}
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#FFFFFF",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Switch to Learner View &rarr;
          </button>
        </div>
      </header>

      {/* Navigation Sub-header */}
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "0 32px" }}>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { id: "courses", label: "My Courses & Modules" },
            { id: "submissions", label: `Student Submissions (${submissions.length})` },
            { id: "analytics", label: "Course Analytics" },
            { id: "resources", label: "Course Resources" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "16px 4px",
                border: "none",
                background: "none",
                fontSize: "0.9rem",
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: `2px solid ${activeTab === tab.id ? "var(--primary-learner)" : "transparent"}`,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {/* ── TAB: COURSES & MODULES ─────────────────────────────────── */}
        {activeTab === "courses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Course &amp; Curriculum Builder</h2>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  Manage modules, lessons, notes, tests, and assignments for your courses.
                </p>
              </div>

              {/* Course Selector Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Active Course:</span>
                <select
                  value={selectedCourse?.id || ""}
                  onChange={(e) => setSelectedCourse(courses.find((c) => c.id === e.target.value))}
                  className="form-field-input"
                  style={{ padding: "6px 12px", width: "auto" }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Course Overview Card */}
            {selectedCourse && (
              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 24, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <span className="pill-badge pill-tech" style={{ marginBottom: 8 }}>
                      {selectedCourse.category || "Tech & Digital Skills"}
                    </span>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: 4 }}>{selectedCourse.title}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 4, maxWidth: 640 }}>
                      {selectedCourse.description}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="pill-badge pill-success">Status: Published</span>
                    <Link to={`/course/${selectedCourse.id}`} className="btn btn-outline btn-sm">
                      View as Student &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Modules Organizer */}
            <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Curriculum Modules ({modules.length})</h3>
                <form onSubmit={handleAddModule} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    required
                    placeholder="New module title..."
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="form-field-input"
                    style={{ padding: "6px 12px", width: 260 }}
                  />
                  <button type="submit" disabled={isCreatingModule} className="btn btn-solid-dark btn-sm">
                    {isCreatingModule ? "Adding..." : "+ Add Module"}
                  </button>
                </form>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {modules.map((mod, idx) => (
                  <div
                    key={mod.id || idx}
                    style={{
                      border: "1px solid var(--border-light)",
                      borderRadius: "8px",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--bg-main)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {mod.title}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Order: {mod.order || idx + 1} &bull; Contains notes, assignments, and test assessments
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedModuleId(mod.id);
                          setIsAddingContent(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        + Add Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: SUBMISSIONS & GRADING ─────────────────────────────── */}
        {activeTab === "submissions" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Student Assignment Submissions</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Review deliverables, provide qualitative feedback, and record grades to student profiles.
              </p>
            </div>

            {loadingSubmissions ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 36, textAlign: "center", color: "var(--text-muted)" }}>
                No submissions received yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {submissions.map((sub) => {
                  const state = gradingState[sub.id] || { grade: sub.grade || "", feedback: sub.feedback || "" };
                  return (
                    <div
                      key={sub.id}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid var(--border-light)",
                        borderRadius: "12px",
                        padding: "24px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                              {sub.studentName || "Student"}
                            </h4>
                            <span className={`pill-badge ${sub.status === "graded" ? "pill-success" : "pill-warning"}`}>
                              {sub.status === "graded" ? "Graded" : "Needs Review"}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: 4 }}>
                            {sub.studentEmail} &bull; Course: {sub.courseTitle || "Peleekings Course"}
                          </div>
                        </div>

                        {sub.fileUrl && (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ textDecoration: "none" }}
                          >
                            Download Attachment &darr;
                          </a>
                        )}
                      </div>

                      {/* Content / Notes */}
                      {sub.content && (
                        <div style={{ background: "var(--bg-main)", padding: "12px 16px", borderRadius: "8px", fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 16, fontFamily: "monospace" }}>
                          {sub.content}
                        </div>
                      )}

                      {/* Grading Form */}
                      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 12, alignItems: "center", background: "#F8FAFC", padding: 16, borderRadius: "8px" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                            GRADE *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. A (95%) or 90/100"
                            value={state.grade}
                            onChange={(e) =>
                              setGradingState((prev) => ({
                                ...prev,
                                [sub.id]: { ...state, grade: e.target.value },
                              }))
                            }
                            className="form-field-input"
                            style={{ padding: "8px 12px" }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                            INSTRUCTOR FEEDBACK
                          </label>
                          <input
                            type="text"
                            placeholder="Add constructive comments for the learner..."
                            value={state.feedback}
                            onChange={(e) =>
                              setGradingState((prev) => ({
                                ...prev,
                                [sub.id]: { ...state, feedback: e.target.value },
                              }))
                            }
                            className="form-field-input"
                            style={{ padding: "8px 12px" }}
                          />
                        </div>

                        <div style={{ alignSelf: "flex-end" }}>
                          <button
                            onClick={() => handleSaveGrade(sub.id)}
                            className="btn btn-solid-dark btn-sm"
                          >
                            Save Grade
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: COURSE ANALYTICS ──────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Course Analytics &amp; Performance</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Key learning milestones, assessment averages, and enrollment velocity.
              </p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 20 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Enrolled Students
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary-learner)", marginTop: 6 }}>
                  {analytics.enrolledCount}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#166534", marginTop: 4 }}>+18% from last month</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 20 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Avg Assessment Score
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
                  {analytics.avgScore}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>Across all quiz modules</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 20 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Submission Rate
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
                  {analytics.submissionRate}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#166534", marginTop: 4 }}>High engagement</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 20 }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Published Modules
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
                  {analytics.moduleCount}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>All lessons active</div>
              </div>
            </div>

            {/* Cumulative Enrollment Velocity Line Chart */}
            <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 24 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>
                Cumulative Enrollment Growth
              </h3>
              <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 24, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                {analytics.trend.map((val, idx) => {
                  const heightPercent = Math.round((val / 160) * 100);
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-learner)" }}>{val}</span>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 36,
                          height: `${heightPercent}%`,
                          background: "var(--primary-learner)",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 0.4s ease",
                        }}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Wk {idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: RESOURCES ─────────────────────────────────────────── */}
        {activeTab === "resources" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Course &amp; Platform Resources</h2>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  Upload cheatsheets, slides, exercises, and PDFs accessible to learners.
                </p>
              </div>

              <button
                onClick={() => setShowResourceForm((p) => !p)}
                className="btn btn-solid-dark btn-sm"
              >
                {showResourceForm ? "✕ Cancel" : "+ Upload New Resource"}
              </button>
            </div>

            {/* Resource Upload Form */}
            {showResourceForm && (
              <form onSubmit={handleUploadTutorResource} style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "12px", padding: 24, marginBottom: 24 }}>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 14 }}>Add Course Resource</h4>
                <div className="form-field-group">
                  <label className="form-field-label">Resource Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prompt Chaining Master Cheatsheet"
                    value={resTitle}
                    onChange={(e) => setResTitle(e.target.value)}
                    className="form-field-input"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of the material..."
                    value={resDesc}
                    onChange={(e) => setResDesc(e.target.value)}
                    className="form-field-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label className="form-field-label">Attach File (PDF, ZIP, DOC, IMG)</label>
                    <input
                      type="file"
                      onChange={(e) => setResFile(e.target.files[0] || null)}
                      style={{ fontSize: "0.85rem", width: "100%" }}
                    />
                  </div>
                  <div>
                    <label className="form-field-label">Or External Link (Drive, GitHub, Figma)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={resLink}
                      onChange={(e) => setResLink(e.target.value)}
                      className="form-field-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingRes}
                  className="btn btn-solid-dark btn-sm"
                  style={{ marginTop: 16 }}
                >
                  {isUploadingRes ? "Publishing..." : "Publish Resource →"}
                </button>
              </form>
            )}

            {/* Resources List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {resources.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border-light)",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{r.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {r.desc || r.description} &bull; {r.type} {r.fileSize && `(${r.fileSize})`}
                    </div>
                  </div>
                  <a
                    href={r.fileUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ textDecoration: "none" }}
                  >
                    Open / Download &darr;
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
