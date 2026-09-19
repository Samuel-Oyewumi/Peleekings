import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { COURSES_CATALOG } from "./Home";

const INITIAL_REGISTRATIONS = [
  {
    id: "r1",
    name: "Samuel Asuquo",
    type: "Corper",
    regId: "AS1399",
    nyscCode: "AB/23A/1399",
    date: "12 May 2025",
    status: "Active",
    role: "student",
    email: "samuel@example.com",
    phone: "+234 801 234 5678",
    enrolledCourses: ["AI Essentials & Automation", "Foundations of Computing"]
  },
  {
    id: "r2",
    name: "Esther James",
    type: "Non-Corper",
    regId: "S4821A",
    nyscCode: null,
    date: "12 May 2025",
    status: "Active",
    role: "student",
    email: "esther@example.com",
    phone: "+234 802 345 6789",
    enrolledCourses: ["Graphic Design Fundamentals"]
  },
  {
    id: "r3",
    name: "David Okafor",
    type: "Corper",
    regId: "AB0456",
    nyscCode: "LA/24B/0456",
    date: "11 May 2025",
    status: "Active",
    role: "student",
    email: "david@example.com",
    phone: "+234 803 456 7890",
    enrolledCourses: ["Videography & Video Editing"]
  },
  {
    id: "r4",
    name: "Blessing Udo",
    type: "Non-Corper",
    regId: "B7382K",
    nyscCode: null,
    date: "11 May 2025",
    status: "Active",
    role: "student",
    email: "blessing@example.com",
    phone: "+234 804 567 8901",
    enrolledCourses: ["Social Media Strategy"]
  },
  {
    id: "r5",
    name: "Michael Adeleke",
    type: "Corper",
    regId: "AM2049",
    nyscCode: "OG/23C/2049",
    date: "10 May 2025",
    status: "Active",
    role: "student",
    email: "michael@example.com",
    phone: "+234 805 678 9012",
    enrolledCourses: ["Sound Production & Audio"]
  }
];

const INITIAL_AUDIT_LOGS = [
  { id: "log-1", action: "Platform Nominal", detail: "Firebase Auth & Firestore operational", timestamp: "Just now", badge: "pill-tech" },
  { id: "log-2", action: "New Registration", detail: "Samuel Asuquo enrolled as Corper (Reg ID: AS1399)", timestamp: "2 hours ago", badge: "pill-success" },
  { id: "log-3", action: "Application Received", detail: "Dr. Maria Santos applied to teach Data Science", timestamp: "1 day ago", badge: "pill-creative" },
  { id: "log-4", action: "Credential Verified", detail: "Registration ID AS1399 verified for NYSC deployment", timestamp: "2 days ago", badge: "pill-success" },
  { id: "log-5", action: "Course Published", detail: "AI Essentials & Automation added to public catalog", timestamp: "3 days ago", badge: "pill-tech" },
];

export default function AdminPanel() {
  const { userProfile, updateUserRole } = useAuth();
  const navigate = useNavigate();

  // Navigation tabs: "applications", "analytics", "registrations", "courses", "certificates"
  const [activeTab, setActiveTab] = useState("applications");

  // State: Applications
  const [applications, setApplications] = useState([
    {
      id: "app-1",
      fullName: "Dr. Maria Santos",
      email: "maria.santos@example.com",
      courseTitle: "Applied Data Science & Pandas",
      category: "Tech & Digital Skills",
      courseDescription: "From Python arrays to machine learning inference in production. Covers NumPy, Pandas, and scikit-learn.",
      status: "pending",
      date: "1 day ago",
      syllabus: "Module 1: Python Data Structures. Module 2: Data Cleaning & Wrangling. Module 3: Exploratory Data Analysis. Module 4: Model Pipelines."
    },
    {
      id: "app-2",
      fullName: "Kelechi Nwosu",
      email: "kelechi@example.com",
      courseTitle: "Cloud DevOps on AWS & Docker",
      category: "Tech & Digital Skills",
      courseDescription: "Hands-on CI/CD pipeline automation, container orchestration with Kubernetes, and infrastructure as code.",
      status: "pending",
      date: "2 days ago",
      syllabus: "Module 1: Docker Containers. Module 2: GitHub Actions CI/CD. Module 3: Kubernetes Clusters. Module 4: Cloud Monitoring."
    }
  ]);
  const [appFilter, setAppFilter] = useState("all");
  const [selectedAppModal, setSelectedAppModal] = useState(null);

  // State: Users & Registrations
  const [usersList, setUsersList] = useState(INITIAL_REGISTRATIONS);
  const [userSearch, setUserSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    phone: "+234 ",
    type: "Corper",
    nyscCode: "AB/24A/1000",
    role: "student",
  });

  // State: Courses
  const [adminCourses, setAdminCourses] = useState(COURSES_CATALOG.map(c => ({ ...c, status: "Published" })));
  const [courseCategoryFilter, setCourseCategoryFilter] = useState("All");
  const [courseSearch, setCourseSearch] = useState("");
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [newCourseForm, setNewCourseForm] = useState({
    title: "",
    category: "Tech & Digital Skills",
    badge: "TECHNOLOGY",
    badgeClass: "pill-tech",
    level: "Beginner",
    duration: "6h 00m",
    modulesCount: 8,
    description: "",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80"
  });

  // State: Certificates
  const [certSearchId, setCertSearchId] = useState("");
  const [certResult, setCertResult] = useState(null);
  const [showIssueCertModal, setShowIssueCertModal] = useState(false);
  const [issueCertForm, setIssueCertForm] = useState({
    studentName: "Samuel Asuquo",
    regId: "AS1399",
    course: "AI Essentials & Automation",
    grade: "Distinction (96%)",
  });

  // State: Audit Logs
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }

  function addAuditLog(action, detail, badge = "pill-tech") {
    const newLog = {
      id: `log-${Date.now()}`,
      action,
      detail,
      timestamp: "Just now",
      badge
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }

  // Handle Tutor Application Review
  async function handleReviewApplication(appId, status, applicantUid) {
    const app = applications.find(a => a.id === appId);
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));

    if (status === "approved") {
      triggerToast(`Application approved! ${app?.fullName || "Applicant"} promoted to Instructor and course drafted.`);
      addAuditLog("Application Approved", `${app?.fullName || "Applicant"} promoted to Instructor`, "pill-success");

      if (app) {
        const draftedCourse = {
          id: app.courseTitle.toLowerCase().replace(/\s+/g, "-"),
          title: app.courseTitle,
          category: app.category || "Tech & Digital Skills",
          badge: "NEW COURSE",
          badgeClass: "pill-tech",
          level: "Intermediate",
          duration: "8h 30m",
          rating: 5.0,
          reviewsCount: "0",
          students: 0,
          status: "Draft",
          description: app.courseDescription,
          image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
        };
        setAdminCourses(prev => [draftedCourse, ...prev]);
      }
    } else {
      triggerToast("Application rejected.");
      addAuditLog("Application Rejected", `Application for ${app?.courseTitle || appId} rejected`, "pill-creative");
    }

    try {
      await updateDoc(doc(db, "tutorApplications", appId), {
        status,
        reviewedAt: serverTimestamp(),
      });
      if (status === "approved" && applicantUid) {
        await updateDoc(doc(db, "users", applicantUid), { role: "instructor" });
      }
    } catch (err) {
      console.warn("Firestore update offline fallback:", err);
    }
  }

  // Handle User Role Change
  function handleChangeUserRole(userId, newRole) {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        addAuditLog("Role Updated", `${u.name} role changed to ${newRole.toUpperCase()}`, "pill-tech");
        return { ...u, role: newRole };
      }
      return u;
    }));
    triggerToast(`User role updated to ${newRole.toUpperCase()}`);
  }

  // Handle User Status Toggle
  function handleToggleUserStatus(userId) {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === "Active" ? "Suspended" : "Active";
        triggerToast(`User status set to ${nextStatus}`);
        addAuditLog("Status Changed", `${u.name} status updated to ${nextStatus}`, nextStatus === "Active" ? "pill-success" : "pill-creative");
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  }

  // Handle Delete User
  function handleDeleteUser(userId) {
    const user = usersList.find(u => u.id === userId);
    if (window.confirm(`Are you sure you want to remove user "${user?.name}"?`)) {
      setUsersList(prev => prev.filter(u => u.id !== userId));
      triggerToast(`User "${user?.name}" removed.`);
      addAuditLog("User Removed", `Removed record for ${user?.name}`, "pill-creative");
      setSelectedUser(null);
    }
  }

  // Handle Manual Add User
  function handleCreateUser(e) {
    e.preventDefault();
    if (!newUserForm.name.trim()) return;

    const names = newUserForm.name.trim().split(" ");
    const sInit = (names[0] || "A")[0].toUpperCase();
    const fInit = (names[1] || names[0] || "S")[0].toUpperCase();

    let autoRegId = "";
    if (newUserForm.type === "Corper") {
      const nums = (newUserForm.nyscCode || "1000").replace(/\D/g, "");
      const segment = nums.length >= 4 ? nums.slice(-4) : "1399";
      autoRegId = `${sInit}${fInit}${segment}`;
    } else {
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      autoRegId = `${randDigits}${fInit}${sInit}`;
    }

    const created = {
      id: `r-${Date.now()}`,
      name: newUserForm.name,
      type: newUserForm.type,
      regId: autoRegId,
      nyscCode: newUserForm.type === "Corper" ? newUserForm.nyscCode : null,
      date: "Today",
      status: "Active",
      role: newUserForm.role,
      email: newUserForm.email,
      phone: newUserForm.phone,
      enrolledCourses: ["AI Essentials & Automation"]
    };

    setUsersList(prev => [created, ...prev]);
    setShowAddUserModal(false);
    triggerToast(`User "${created.name}" registered with ID ${autoRegId}!`);
    addAuditLog("User Added", `Registered ${created.name} (${autoRegId})`, "pill-success");
    setNewUserForm({
      name: "",
      email: "",
      phone: "+234 ",
      type: "Corper",
      nyscCode: "AB/24A/1000",
      role: "student",
    });
  }

  // Handle Export CSV
  function handleExportUsersCSV() {
    const headers = ["ID", "Name", "Type", "Registration ID", "NYSC Code", "Email", "Phone", "Status", "Role", "Date"];
    const rows = usersList.map(u => [
      u.id,
      `"${u.name}"`,
      u.type,
      u.regId,
      u.nyscCode || "N/A",
      u.email,
      `"${u.phone}"`,
      u.status,
      u.role,
      u.date
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `peleekings_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Exported user registrations to CSV.");
    addAuditLog("CSV Export", "Exported registered users list", "pill-tech");
  }

  // Add Course
  function handleCreateCourse(e) {
    e.preventDefault();
    if (!newCourseForm.title.trim()) return;
    const newCourseObj = {
      ...newCourseForm,
      id: newCourseForm.title.toLowerCase().replace(/\s+/g, "-"),
      rating: 5.0,
      reviewsCount: "1",
      students: 0,
      status: "Published",
    };
    setAdminCourses(prev => [newCourseObj, ...prev]);
    setShowAddCourseModal(false);
    triggerToast(`Course "${newCourseForm.title}" published to catalog!`);
    addAuditLog("Course Published", `Created '${newCourseForm.title}'`, "pill-success");
    setNewCourseForm({
      title: "",
      category: "Tech & Digital Skills",
      badge: "TECHNOLOGY",
      badgeClass: "pill-tech",
      level: "Beginner",
      duration: "6h 00m",
      modulesCount: 8,
      description: "",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80"
    });
  }

  // Edit Course
  function handleSaveEditCourse(e) {
    e.preventDefault();
    if (!editingCourse) return;
    setAdminCourses(prev => prev.map(c => c.id === editingCourse.id ? editingCourse : c));
    setEditingCourse(null);
    triggerToast(`Course "${editingCourse.title}" updated successfully.`);
    addAuditLog("Course Edited", `Updated '${editingCourse.title}'`, "pill-tech");
  }

  // Toggle Course Status (Published vs Draft)
  function handleToggleCourseStatus(courseId) {
    setAdminCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const next = c.status === "Published" ? "Draft" : "Published";
        triggerToast(`Course status updated to ${next}`);
        addAuditLog("Course Status", `'${c.title}' set to ${next}`, next === "Published" ? "pill-success" : "pill-creative");
        return { ...c, status: next };
      }
      return c;
    }));
  }

  // Certificate search
  function handleCertLookup(e) {
    e.preventDefault();
    const queryId = certSearchId.trim().toUpperCase();
    const matchedUser = usersList.find(u => u.regId.toUpperCase() === queryId);
    if (matchedUser) {
      setCertResult({
        name: matchedUser.name,
        regId: matchedUser.regId,
        course: matchedUser.enrolledCourses?.[0] || "AI Essentials & Automation",
        issueDate: matchedUser.date || "12 May 2025",
        status: matchedUser.status,
        type: matchedUser.type,
        verified: true,
      });
    } else {
      setCertResult({
        name: "Samuel Asuquo",
        regId: queryId || "AS1399",
        course: "AI Essentials & Automation",
        issueDate: "12 May 2025",
        status: "Active",
        type: "Corper",
        verified: true
      });
    }
    triggerToast("Certificate verification lookup complete.");
    addAuditLog("Credential Verified", `Verified ID: ${queryId || "AS1399"}`, "pill-success");
  }

  // Issue Certificate
  function handleIssueCertificate(e) {
    e.preventDefault();
    setCertResult({
      name: issueCertForm.studentName,
      regId: issueCertForm.regId,
      course: issueCertForm.course,
      issueDate: "Today",
      verified: true,
      grade: issueCertForm.grade,
      status: "Active"
    });
    setShowIssueCertModal(false);
    setActiveTab("certificates");
    triggerToast(`Certificate successfully awarded to ${issueCertForm.studentName}!`);
    addAuditLog("Certificate Issued", `Awarded credential to ${issueCertForm.studentName} (${issueCertForm.regId})`, "pill-success");
  }

  // Filtered registrations
  const filteredUsers = usersList.filter(user => {
    const matchesFilter = filterType === "All" || user.type === filterType;
    const matchesSearch =
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.regId.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (user.nyscCode && user.nyscCode.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Filtered courses
  const filteredCourses = adminCourses.filter(course => {
    const matchesCategory = courseCategoryFilter === "All" || course.category === courseCategoryFilter;
    const matchesSearch = course.title.toLowerCase().includes(courseSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtered applications
  const filteredApps = applications.filter(app => {
    if (appFilter === "all") return true;
    return app.status === appFilter;
  });

  return (
    <div style={{ background: "#F8FAFC", minHeight: "calc(100vh - 68px)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* Toast Notification */}
        {toastMessage && (
          <div style={{ position: "fixed", top: 80, right: 24, zIndex: 1000, background: "#0F172A", color: "#FFFFFF", padding: "12px 20px", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)", fontSize: "0.875rem", fontWeight: 600, animation: "fadeIn 0.2s ease" }}>
            {toastMessage}
          </div>
        )}

        {/* ── Admin Header ────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="pill-badge pill-tech">ADMIN CONSOLE</span>
              <span className="pill-badge pill-success">ROLE: ADMINISTRATOR</span>
            </div>
            <h1 style={{ fontSize: "2.1rem", fontWeight: 800, color: "#0F172A" }}>
              Peleekings Admin Dashboard
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Review tutor applications, observe platform usage, and manage courses and student credentials.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
              Learner Portal &rarr;
            </button>
            <button className="btn btn-outline" onClick={() => navigate("/become-instructor")}>
              Teaching Portal &rarr;
            </button>
          </div>
        </div>

        {/* ── 4 Overview Metrics Cards (Screen 9 in Inspiration) ───────── */}
        <div className="stats-cards-deck">
          {[
            { label: "Total Users", value: `${2481 + usersList.length - INITIAL_REGISTRATIONS.length}`, change: "+12%", color: "pill-tech" },
            { label: "Active Courses", value: `${adminCourses.length}`, change: "+25%", color: "pill-success" },
            { label: "Total Enrollments", value: "1,842", change: "+20%", color: "pill-tech" },
            { label: "Certificates Issued", value: certResult ? "1,204" : "1,203", change: "+15%", color: "pill-creative" },
          ].map(m => (
            <div key={m.label} className="stat-metric-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                  {m.label}
                </span>
                <span className={`pill-badge ${m.color}`}>
                  {m.change}
                </span>
              </div>
              <div style={{ fontSize: "2.1rem", fontWeight: 900, color: "var(--text-primary)", margin: "10px 0 2px", fontFamily: "Outfit, sans-serif" }}>
                {m.value}
              </div>
              <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                Real-time platform statistics
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation Bar ──────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border-light)", paddingBottom: 12, marginBottom: 28, overflowX: "auto" }}>
          {[
            { id: "applications", label: "Tutor Applications", count: applications.filter(a => a.status === "pending").length },
            { id: "analytics", label: "Platform Usage & Logs", count: null },
            { id: "registrations", label: "User Registrations", count: usersList.length },
            { id: "courses", label: "Course Management", count: adminCourses.length },
            { id: "certificates", label: "Certificates & Verification", count: null },
          ].map(t => (
            <button
              key={t.id}
              className={`btn ${activeTab === t.id ? "btn-solid-dark" : "btn-outline"} btn-sm`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label} {t.count !== null && `(${t.count})`}
            </button>
          ))}
        </div>

        {/* ── TAB 1: TUTOR APPLICATIONS (Review & Accept Applications) ─ */}
        {activeTab === "applications" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Tutor Applications Queue</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Review and accept or reject instructor applications. Approving an applicant automatically drafts their course and grants teaching privileges.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["all", "pending", "approved", "rejected"].map(filter => (
                  <button
                    key={filter}
                    className={`filter-pill-btn ${appFilter === filter ? "active" : ""}`}
                    onClick={() => setAppFilter(filter)}
                    style={{ textTransform: "capitalize" }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="data-table-container">
              {filteredApps.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No applications match the selected filter.
                </div>
              ) : (
                <table className="clean-data-table">
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Proposed Course</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map(app => (
                      <tr key={app.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="user-avatar-circle" style={{ width: 34, height: 34, fontSize: "0.8rem", background: "#1C1D1F" }}>
                              {app.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{app.fullName}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{app.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{app.courseTitle}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {app.courseDescription}
                          </div>
                        </td>
                        <td>
                          <span className="pill-badge pill-tech">{app.category || "Tech"}</span>
                        </td>
                        <td>
                          <span className={`pill-badge ${app.status === "approved" ? "pill-success" : app.status === "rejected" ? "pill-creative" : "pill-tech"}`}>
                            {app.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setSelectedAppModal(app)}>
                              Details
                            </button>
                            {app.status === "pending" && (
                              <>
                                <button
                                  className="btn btn-solid-dark btn-sm"
                                  onClick={() => handleReviewApplication(app.id, "approved", app.applicantUid)}
                                >
                                  Accept &rarr;
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: "#DC2626" }}
                                  onClick={() => handleReviewApplication(app.id, "rejected", app.applicantUid)}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: PLATFORM USAGE & ANALYTICS ──────────────────────── */}
        {activeTab === "analytics" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 28 }}>
              <div className="stat-metric-card">
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>System Uptime</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "#166534", margin: "8px 0" }}>99.98%</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Firebase infrastructure running smoothly</div>
              </div>
              <div className="stat-metric-card">
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Active Learner Sessions</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--primary-learner)", margin: "8px 0" }}>142 Live</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Learners currently studying on the platform</div>
              </div>
              <div className="stat-metric-card">
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>NYSC Clearance Rate</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "#0F172A", margin: "8px 0" }}>94.2%</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Corps members meeting certificate requirements</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
              {/* Audit Log Table */}
              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Platform Activity &amp; Audit Trail</h3>
                  <button className="btn btn-outline btn-sm" onClick={() => triggerToast("Audit logs refreshed.")}>
                    Refresh
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {auditLogs.map(log => (
                    <div key={log.id} style={{ padding: "10px 14px", border: "1px solid var(--border-subtle)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`pill-badge ${log.badge}`}>{log.action}</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{log.detail}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrollment Distribution */}
              <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 24 }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 16 }}>Enrollment by Category</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>
                      <span>Tech &amp; Digital Skills</span>
                      <span>58%</span>
                    </div>
                    <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: "58%", height: "100%", background: "var(--primary-learner)" }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>
                      <span>Creative &amp; Design</span>
                      <span>26%</span>
                    </div>
                    <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: "26%", height: "100%", background: "#E11D48" }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>
                      <span>Professional Skills</span>
                      <span>16%</span>
                    </div>
                    <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: "16%", height: "100%", background: "#059669" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: USER REGISTRATIONS (Screen 9 in Inspiration) ─────── */}
        {activeTab === "registrations" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {["All", "Corper", "Non-Corper"].map(type => (
                  <button
                    key={type}
                    className={`filter-pill-btn ${filterType === type ? "active" : ""}`}
                    onClick={() => setFilterType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div className="search-input-field">
                  <span>&#128269;</span>
                  <input
                    type="text"
                    placeholder="Search user name, email, or Reg ID..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-outline btn-sm" onClick={handleExportUsersCSV} title="Export to CSV">
                  Export CSV ↓
                </button>
                <button className="btn btn-solid-dark btn-sm" onClick={() => setShowAddUserModal(true)}>
                  + Register User
                </button>
              </div>
            </div>

            <div className="data-table-container">
              <table className="clean-data-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Type</th>
                    <th>Registration ID</th>
                    <th>Registered Date</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(row => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="user-avatar-circle" style={{ width: 34, height: 34, fontSize: "0.85rem" }}>
                            {row.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`pill-badge ${row.type === "Corper" ? "pill-success" : "pill-tech"}`}>
                          {row.type}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                          {row.regId}
                        </code>
                      </td>
                      <td>{row.date}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.825rem", color: row.status === "Active" ? "#166534" : "#991B1B" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.status === "Active" ? "#10B981" : "#EF4444" }}></span>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <select
                          value={row.role}
                          onChange={(e) => handleChangeUserRole(row.id, e.target.value)}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-light)", fontSize: "0.8rem", background: "#FFFFFF", cursor: "pointer" }}
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelectedUser(row)}>
                            Profile
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: row.status === "Active" ? "#DC2626" : "#166534" }}
                            onClick={() => handleToggleUserStatus(row.id)}
                          >
                            {row.status === "Active" ? "Suspend" : "Activate"}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#EF4444" }}
                            onClick={() => handleDeleteUser(row.id)}
                            title="Delete User"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: COURSE MANAGEMENT ───────────────────────────────── */}
        {activeTab === "courses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Course Catalog Management</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Publish, edit, and organize courses available to learners.</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="search-input-field" style={{ width: 240 }}>
                  <span>&#128269;</span>
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-solid-dark btn-sm" onClick={() => setShowAddCourseModal(true)}>
                  + Create New Course
                </button>
              </div>
            </div>

            {/* Filter pills for category */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
              {["All", "Tech & Digital Skills", "Professional Skills", "Creative & Design"].map(cat => (
                <button
                  key={cat}
                  className={`filter-pill-btn ${courseCategoryFilter === cat ? "active" : ""}`}
                  onClick={() => setCourseCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {filteredCourses.map(course => (
                <div key={course.id} style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <img src={course.image} alt={course.title} style={{ width: "100%", height: 130, objectFit: "cover" }} />
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className={`pill-badge ${course.badgeClass || "pill-tech"}`}>{course.badge}</span>
                      <span className={`pill-badge ${course.status === "Published" ? "pill-success" : "pill-creative"}`}>
                        {course.status || "Published"}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{course.title}</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 14, height: 38, overflow: "hidden", flex: 1 }}>
                      {course.description}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                      <span style={{ fontSize: "0.775rem", fontWeight: 600 }}>{course.students || 0} enrolled</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleToggleCourseStatus(course.id)}
                        >
                          {course.status === "Published" ? "Draft" : "Publish"}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setEditingCourse(course)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#DC2626" }}
                          onClick={() => {
                            if (window.confirm(`Delete course "${course.title}"?`)) {
                              setAdminCourses(prev => prev.filter(c => c.id !== course.id));
                              triggerToast(`Deleted course "${course.title}"`);
                              addAuditLog("Course Removed", `Deleted course '${course.title}'`, "pill-creative");
                            }
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: CERTIFICATES & VERIFICATION ─────────────────────── */}
        {activeTab === "certificates" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
            <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Certificate Verification Engine</h2>
                <button className="btn btn-solid-dark btn-sm" onClick={() => setShowIssueCertModal(true)}>
                  + Award Certificate
                </button>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 24 }}>
                Verify credential authenticity by student Registration ID (e.g. AS1399, S4821A, AB0456).
              </p>

              <form onSubmit={handleCertLookup} style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                <input
                  type="text"
                  placeholder="Enter Student Registration ID (e.g. AS1399)..."
                  required
                  className="form-field-input"
                  value={certSearchId}
                  onChange={e => setCertSearchId(e.target.value)}
                />
                <button type="submit" className="btn btn-solid-dark">
                  Verify ID &rarr;
                </button>
              </form>

              {certResult && (
                <div style={{ padding: 24, border: "2px solid #BBF7D0", background: "var(--success-bg)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <span className="pill-badge pill-success" style={{ marginBottom: 6 }}>
                        AUTHENTIC CERTIFIED CREDENTIAL
                      </span>
                      <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--success-text)" }}>{certResult.name}</h3>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Status: Verified Active Graduate
                      </div>
                    </div>
                    <code style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--success-text)" }}>
                      {certResult.regId}
                    </code>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                    Verified graduate in <strong>{certResult.course || "AI Essentials & Automation"}</strong>. Completed all modules, passed assessments, and verified for NYSC deployment credit.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-solid-dark btn-sm"
                      onClick={() => {
                        window.print();
                        triggerToast(`Certificate #${certResult.regId} prepared for print.`);
                      }}
                    >
                      Download PDF Certificate ↓
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setCertResult(null)}>
                      Clear Search
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Verification Records */}
            <div style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: 28 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Sample Verification Records</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16 }}>
                Click any ID below to query credentials immediately:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {usersList.slice(0, 4).map(u => (
                  <div
                    key={u.id}
                    style={{ padding: "10px 14px", border: "1px solid var(--border-light)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#F8FAFC" }}
                    onClick={() => {
                      setCertSearchId(u.regId);
                      setCertResult({
                        name: u.name,
                        regId: u.regId,
                        course: u.enrolledCourses?.[0] || "AI Essentials & Automation",
                        issueDate: u.date,
                        verified: true
                      });
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{u.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.type} • {u.enrolledCourses?.[0]}</div>
                    </div>
                    <code style={{ fontWeight: 800, fontSize: "0.85rem" }}>{u.regId}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USER PROFILE MODAL ──────────────────────────────────────── */}
        {selectedUser && (
          <div className="modal-backdrop-overlay" onClick={() => setSelectedUser(null)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <span className="pill-badge pill-tech" style={{ marginBottom: 4 }}>LEARNER RECORD</span>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{selectedUser.name}</h3>
                </div>
                <button className="btn-ghost" onClick={() => setSelectedUser(null)}>✕</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Registration ID</div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{selectedUser.regId}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Registration Type</div>
                  <span className={`pill-badge ${selectedUser.type === "Corper" ? "pill-success" : "pill-tech"}`}>
                    {selectedUser.type}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Email Address</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{selectedUser.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Phone Number</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{selectedUser.phone}</div>
                </div>
                {selectedUser.nyscCode && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>NYSC State Code</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>{selectedUser.nyscCode}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Account Status</div>
                  <span className="pill-badge pill-success">{selectedUser.status}</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16, marginBottom: 20 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8 }}>Enrolled Courses</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedUser.enrolledCourses.map((c, i) => (
                    <div key={i} style={{ padding: "8px 12px", background: "#F8FAFC", borderRadius: 6, fontSize: "0.85rem", fontWeight: 500 }}>
                      &bull; {c}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: "#DC2626" }}
                  onClick={() => handleDeleteUser(selectedUser.id)}
                >
                  Delete User
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      handleToggleUserStatus(selectedUser.id);
                      setSelectedUser(null);
                    }}
                  >
                    {selectedUser.status === "Active" ? "Suspend Account" : "Activate Account"}
                  </button>
                  <button
                    className="btn btn-solid-dark btn-sm"
                    onClick={() => {
                      setCertSearchId(selectedUser.regId);
                      setCertResult({
                        name: selectedUser.name,
                        regId: selectedUser.regId,
                        course: selectedUser.enrolledCourses?.[0] || "AI Essentials & Automation",
                        issueDate: selectedUser.date,
                        verified: true
                      });
                      setSelectedUser(null);
                      setActiveTab("certificates");
                    }}
                  >
                    View Credential &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD USER MODAL ──────────────────────────────────────────── */}
        {showAddUserModal && (
          <div className="modal-backdrop-overlay" onClick={() => setShowAddUserModal(false)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Register New User</h3>
                <button className="btn-ghost" onClick={() => setShowAddUserModal(false)}>✕</button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className="form-field-group">
                  <label className="form-field-label">Full Name (Surname First)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asuquo Samuel"
                    className="form-field-input"
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-field-group">
                    <label className="form-field-label">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      className="form-field-input"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">Phone Number</label>
                    <input
                      type="tel"
                      required
                      className="form-field-input"
                      value={newUserForm.phone}
                      onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-field-group">
                    <label className="form-field-label">Registration Type</label>
                    <select
                      className="form-field-input"
                      value={newUserForm.type}
                      onChange={e => setNewUserForm({ ...newUserForm, type: e.target.value })}
                    >
                      <option value="Corper">Corper</option>
                      <option value="Non-Corper">Non-Corper</option>
                    </select>
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">Role</label>
                    <select
                      className="form-field-input"
                      value={newUserForm.role}
                      onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {newUserForm.type === "Corper" && (
                  <div className="form-field-group">
                    <label className="form-field-label">NYSC State Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AB/24A/1000"
                      className="form-field-input"
                      value={newUserForm.nyscCode}
                      onChange={e => setNewUserForm({ ...newUserForm, nyscCode: e.target.value })}
                    />
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddUserModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-solid-dark">
                    Register User &rarr;
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── TUTOR APPLICATION DETAILS MODAL ─────────────────────────── */}
        {selectedAppModal && (
          <div className="modal-backdrop-overlay" onClick={() => setSelectedAppModal(null)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <span className="pill-badge pill-tech">TUTOR APPLICATION</span>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{selectedAppModal.fullName}</h3>
                </div>
                <button className="btn-ghost" onClick={() => setSelectedAppModal(null)}>✕</button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Proposed Course</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{selectedAppModal.courseTitle}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Description</div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: 4 }}>
                  {selectedAppModal.courseDescription}
                </p>
              </div>

              {selectedAppModal.syllabus && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Curriculum / Syllabus</div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4, background: "#F8FAFC", padding: 12, borderRadius: 6 }}>
                    {selectedAppModal.syllabus}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                {selectedAppModal.status === "pending" && (
                  <>
                    <button
                      className="btn btn-solid-dark btn-sm"
                      onClick={() => {
                        handleReviewApplication(selectedAppModal.id, "approved", selectedAppModal.applicantUid);
                        setSelectedAppModal(null);
                      }}
                    >
                      Accept &amp; Publish Draft
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: "#DC2626" }}
                      onClick={() => {
                        handleReviewApplication(selectedAppModal.id, "rejected", selectedAppModal.applicantUid);
                        setSelectedAppModal(null);
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedAppModal(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE COURSE MODAL ──────────────────────────────────────── */}
        {showAddCourseModal && (
          <div className="modal-backdrop-overlay" onClick={() => setShowAddCourseModal(false)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Create New Course</h3>
                <button className="btn-ghost" onClick={() => setShowAddCourseModal(false)}>✕</button>
              </div>

              <form onSubmit={handleCreateCourse}>
                <div className="form-field-group">
                  <label className="form-field-label">Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next.js & TypeScript Architecture"
                    className="form-field-input"
                    value={newCourseForm.title}
                    onChange={e => setNewCourseForm({ ...newCourseForm, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-field-group">
                    <label className="form-field-label">Category</label>
                    <select
                      className="form-field-input"
                      value={newCourseForm.category}
                      onChange={e => setNewCourseForm({ ...newCourseForm, category: e.target.value })}
                    >
                      <option>Tech &amp; Digital Skills</option>
                      <option>Professional Skills</option>
                      <option>Creative &amp; Design</option>
                    </select>
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">Category Badge</label>
                    <input
                      type="text"
                      className="form-field-input"
                      value={newCourseForm.badge}
                      onChange={e => setNewCourseForm({ ...newCourseForm, badge: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-field-group">
                    <label className="form-field-label">Estimated Duration</label>
                    <input
                      type="text"
                      className="form-field-input"
                      value={newCourseForm.duration}
                      onChange={e => setNewCourseForm({ ...newCourseForm, duration: e.target.value })}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">Total Modules</label>
                    <input
                      type="number"
                      className="form-field-input"
                      value={newCourseForm.modulesCount}
                      onChange={e => setNewCourseForm({ ...newCourseForm, modulesCount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Description</label>
                  <textarea
                    rows={3}
                    required
                    className="form-field-input"
                    value={newCourseForm.description}
                    onChange={e => setNewCourseForm({ ...newCourseForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddCourseModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-solid-dark">
                    Publish Course &rarr;
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT COURSE MODAL ────────────────────────────────────────── */}
        {editingCourse && (
          <div className="modal-backdrop-overlay" onClick={() => setEditingCourse(null)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Edit Course</h3>
                <button className="btn-ghost" onClick={() => setEditingCourse(null)}>✕</button>
              </div>

              <form onSubmit={handleSaveEditCourse}>
                <div className="form-field-group">
                  <label className="form-field-label">Course Title</label>
                  <input
                    type="text"
                    required
                    className="form-field-input"
                    value={editingCourse.title}
                    onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-field-group">
                    <label className="form-field-label">Duration</label>
                    <input
                      type="text"
                      className="form-field-input"
                      value={editingCourse.duration}
                      onChange={e => setEditingCourse({ ...editingCourse, duration: e.target.value })}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">Status</label>
                    <select
                      className="form-field-input"
                      value={editingCourse.status}
                      onChange={e => setEditingCourse({ ...editingCourse, status: e.target.value })}
                    >
                      <option>Published</option>
                      <option>Draft</option>
                    </select>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Description</label>
                  <textarea
                    rows={3}
                    required
                    className="form-field-input"
                    value={editingCourse.description}
                    onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setEditingCourse(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-solid-dark">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── ISSUE CERTIFICATE MODAL ─────────────────────────────────── */}
        {showIssueCertModal && (
          <div className="modal-backdrop-overlay" onClick={() => setShowIssueCertModal(false)}>
            <div className="modal-dialog-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Award Verified Certificate</h3>
                <button className="btn-ghost" onClick={() => setShowIssueCertModal(false)}>✕</button>
              </div>

              <form onSubmit={handleIssueCertificate}>
                <div className="form-field-group">
                  <label className="form-field-label">Select Student</label>
                  <select
                    className="form-field-input"
                    value={issueCertForm.studentName}
                    onChange={e => {
                      const selected = usersList.find(u => u.name === e.target.value);
                      setIssueCertForm({
                        ...issueCertForm,
                        studentName: e.target.value,
                        regId: selected?.regId || "AS1399",
                      });
                    }}
                  >
                    {usersList.map(u => (
                      <option key={u.id} value={u.name}>{u.name} ({u.regId})</option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Select Course</label>
                  <select
                    className="form-field-input"
                    value={issueCertForm.course}
                    onChange={e => setIssueCertForm({ ...issueCertForm, course: e.target.value })}
                  >
                    {adminCourses.map(c => (
                      <option key={c.id} value={c.title}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Grade / Distinction</label>
                  <input
                    type="text"
                    required
                    className="form-field-input"
                    value={issueCertForm.grade}
                    onChange={e => setIssueCertForm({ ...issueCertForm, grade: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowIssueCertModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-solid-dark">
                    Issue Credential &rarr;
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
