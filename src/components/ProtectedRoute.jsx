import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  // If initial auth or Firestore profile re-verification is in progress, wait
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 14,
          color: "var(--text-muted)",
          fontFamily: "var(--font-sans)",
          background: "var(--bg-main)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            border: "3px solid rgba(86, 36, 208, 0.15)",
            borderTopColor: "var(--primary-learner)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
          Loading...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Must have an active, verified Firebase Auth session
  if (!currentUser) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // adminOnly: checks userProfile.role === "admin" from the Firestore-sourced profile or admin email
  const isAdmin = userProfile?.role === "admin" || currentUser?.email?.toLowerCase() === "admin@peleekings.com";
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
