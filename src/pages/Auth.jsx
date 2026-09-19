import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();

  // Mode: "signup" or "login"
  const initialMode = location.state?.mode || "signup";
  const [authMode, setAuthMode] = useState(initialMode);
  const [roleTab, setRoleTab] = useState("student"); // "student" or "tutor"

  // Registration type: "corper" vs "non-corper"
  const [studentType, setStudentType] = useState("non_corper"); // default non-corper or corper

  // Form state
  const [formData, setFormData] = useState({
    surname: "Udo",
    firstName: "Blessing",
    otherName: "",
    email: "blessing@example.com",
    phoneNumber: "+234 804 567 8901",
    nyscStateCode: "",
    password: "Password123@",
    confirmPassword: "Password123@",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  }

  function handleTypeSelect(type) {
    setStudentType(type);
    if (type === "non_corper") {
      setFormData(prev => ({
        ...prev,
        surname: prev.surname === "Asuquo" ? "Udo" : prev.surname,
        firstName: prev.firstName === "Samuel" ? "Blessing" : prev.firstName,
        otherName: "",
        email: prev.email === "samuel@example.com" ? "blessing@example.com" : prev.email,
        nyscStateCode: "",
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        surname: prev.surname === "Udo" ? "Asuquo" : prev.surname,
        firstName: prev.firstName === "Blessing" ? "Samuel" : prev.firstName,
        email: prev.email === "blessing@example.com" ? "samuel@example.com" : prev.email,
        nyscStateCode: "AB/23A/1399",
      }));
    }
  }

  // Calculate live registration code preview
  function generateRegCode() {
    const sInit = ((formData.surname || "U").trim()[0] || "U").toUpperCase();
    const fInit = ((formData.firstName || "B").trim()[0] || "B").toUpperCase();

    if (studentType === "corper") {
      const numbers = (formData.nyscStateCode || "1399").replace(/\D/g, "");
      const numSegment = numbers.length >= 4 ? numbers.slice(-4) : "1399";
      return `${sInit}${fInit}${numSegment}`;
    } else {
      return `1234${fInit}${sInit}`;
    }
  }

  const previewRegCode = generateRegCode();

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (authMode === "signup") {
        const password = formData.password || "Password123@";
        const fullName = `${formData.surname || ""} ${formData.firstName || ""}`.trim() || "Learner";
        const regCode = generateRegCode();

        const customProfile = {
          fullName,
          surname: formData.surname,
          firstName: formData.firstName,
          otherName: formData.otherName || null,
          phoneNumber: formData.phoneNumber || "+234 800 000 0000",
          role: roleTab === "tutor" ? "tutor" : "student",
          studentType: studentType,
          nyscStateCode: studentType === "corper" ? formData.nyscStateCode : null,
          regNumber: regCode,
          status: "active",
        };

        const authRes = (await signup(formData.email || "learner@peleekings.com", password, fullName, customProfile)) || {};
        const role = authRes.role || ((formData.email && formData.email.toLowerCase().includes("admin")) ? "admin" : (roleTab === "tutor" ? "tutor" : "student"));
        const profile = authRes.profile || { regNumber: regCode, fullName };
        setLoading(false);

        // Immediate direct entry into app!
        if (role === "admin" || (formData.email && formData.email.toLowerCase().includes("admin"))) {
          navigate("/admin", { state: { welcomeToast: "Welcome Admin! System overview loaded." } });
        } else if (role === "tutor") {
          navigate("/become-instructor", { state: { welcomeToast: `Welcome ${fullName}! Instructor portal active.` } });
        } else {
          navigate("/dashboard", { state: { welcomeToast: `Welcome ${fullName}! Your Registration Code is ${profile.regNumber || regCode}` } });
        }
      } else {
        // Log In
        const authRes = (await login(formData.email, formData.password || "Password123@")) || {};
        const role = authRes.role || ((formData.email && formData.email.toLowerCase().includes("admin")) ? "admin" : "student");
        const profile = authRes.profile || { fullName: "Learner" };
        setLoading(false);
        if (role === "admin" || (formData.email && formData.email.toLowerCase().includes("admin"))) {
          navigate("/admin", { state: { welcomeToast: "Welcome Admin! Signed in successfully." } });
        } else if (role === "tutor" || role === "instructor") {
          navigate("/become-instructor");
        } else {
          navigate("/dashboard", { state: { welcomeToast: `Welcome back, ${profile?.fullName || "Learner"}!` } });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Authentication error. Please check your credentials.");
      setLoading(false);
    }
  }

  // Instant 1-click access buttons
  async function handleQuickAccess(type) {
    setLoading(true);
    if (type === "non_corper") {
      await login("blessing@example.com", "Password123@");
      navigate("/dashboard", { state: { welcomeToast: "Welcome Blessing Udo! Logged in as Non-Corper Learner." } });
    } else if (type === "corper") {
      await login("samuel@example.com", "Password123@");
      navigate("/dashboard", { state: { welcomeToast: "Welcome Samuel Asuquo! Logged in as Corper Learner." } });
    } else if (type === "admin") {
      await login("admin@peleekings.com", "Password123@");
      navigate("/admin", { state: { welcomeToast: "Welcome Administrator! Control console active." } });
    }
    setLoading(false);
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        {/* Peleekings Brand Header */}
        <div className="auth-title-block">
          <Link to="/" className="brand-wrapper" style={{ justifyContent: "center", marginBottom: 16 }}>
            <div className="brand-logo-icon">P</div>
            <span>Peleekings</span>
          </Link>
          <h1 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
            {authMode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {authMode === "signup" ? "Choose how you want to register." : "Sign in to access your dashboard and courses."}
          </p>
        </div>

        {/* Mode Switcher: Sign In vs Create Account */}
        <div className="auth-nav-tabs">
          <button
            className={`auth-nav-tab-btn ${authMode === "login" ? "active" : ""}`}
            onClick={() => { setAuthMode("login"); setError(""); }}
          >
            Sign In
          </button>
          <button
            className={`auth-nav-tab-btn ${authMode === "signup" ? "active" : ""}`}
            onClick={() => { setAuthMode("signup"); setError(""); }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: 18 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {authMode === "signup" && (
            <>
              {/* Corper vs Non-Corper Selection Buttons */}
              <div className="corper-selector-group">
                <button
                  type="button"
                  className={`corper-select-btn ${studentType === "non_corper" ? "selected" : ""}`}
                  onClick={() => handleTypeSelect("non_corper")}
                >
                  <span>👤</span>
                  Non-Corper
                </button>
                <button
                  type="button"
                  className={`corper-select-btn ${studentType === "corper" ? "selected" : ""}`}
                  onClick={() => handleTypeSelect("corper")}
                >
                  <span>🎓</span>
                  Corper
                </button>
              </div>

              {/* Personal Information Group */}
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Personal Information ({studentType === "non_corper" ? "Non-Corper" : "Corper"})
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field-group">
                  <label className="form-field-label">Surname</label>
                  <input
                    type="text"
                    name="surname"
                    required
                    className="form-field-input"
                    value={formData.surname}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-field-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    className="form-field-input"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Other Name (Optional)</label>
                <input
                  type="text"
                  name="otherName"
                  className="form-field-input"
                  value={formData.otherName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="form-field-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  className="form-field-input"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>

              {/* NYSC Information (Only visible if Corper) */}
              {studentType === "corper" && (
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 10px" }}>
                    NYSC Information
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label">NYSC State Code</label>
                    <input
                      type="text"
                      name="nyscStateCode"
                      placeholder="e.g. AB/23A/1399"
                      required
                      className="form-field-input"
                      value={formData.nyscStateCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {/* Green Auto-Generated Code Preview Panel */}
              <div className="reg-code-confirmation-box">
                <div className="reg-code-label">
                  {studentType === "non_corper" ? "Non-Corper Registration Code" : "Corper Registration Code"}
                </div>
                <div className="reg-code-value">{previewRegCode}</div>
                <div className="reg-code-caption">Generated automatically for instant clearance</div>
              </div>

              {/* Passwords */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-field-group">
                  <label className="form-field-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="form-field-input"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field-group">
                  <label className="form-field-label">Confirm</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    placeholder="••••••••"
                    className="form-field-input"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          {authMode === "login" && (
            <>
              <div className="form-field-group">
                <label className="form-field-label">Email Address or Registration Code</label>
                <input
                  type="text"
                  name="email"
                  required
                  placeholder="e.g. blessing@example.com or 1234BU"
                  className="form-field-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-field-label">Password</label>
                  <span style={{ fontSize: "0.775rem", color: "var(--primary-learner)", cursor: "pointer" }}>
                    Forgot password?
                  </span>
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="form-field-input"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-solid-dark btn-lg"
            style={{ width: "100%", marginTop: 8 }}
          >
            {loading ? "Processing..." : authMode === "signup" ? "Create Account & Enter →" : "Sign In & Enter →"}
          </button>
        </form>

        {/* ⚡ Instant 1-Click Fast Access */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-light)", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            ⚡ Instant 1-Click Access
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => handleQuickAccess("non_corper")}
              className="btn btn-outline btn-sm"
              style={{ fontSize: "0.76rem", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              title="Enter instantly as Non-Corper learner"
            >
              <span>👤</span> Non-Corper
            </button>
            <button
              type="button"
              onClick={() => handleQuickAccess("corper")}
              className="btn btn-outline btn-sm"
              style={{ fontSize: "0.76rem", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              title="Enter instantly as Corper learner"
            >
              <span>🎓</span> Corper
            </button>
            <button
              type="button"
              onClick={() => handleQuickAccess("admin")}
              className="btn btn-outline btn-sm"
              style={{ fontSize: "0.76rem", padding: "8px 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              title="Enter instantly as Platform Administrator"
            >
              <span>🛡️</span> Admin
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {authMode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setAuthMode("login")}
                style={{ color: "var(--primary-learner)", fontWeight: 600 }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setAuthMode("signup")}
                style={{ color: "var(--primary-learner)", fontWeight: 600 }}
              >
                Create one
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
