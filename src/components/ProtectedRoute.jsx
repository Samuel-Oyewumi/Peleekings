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
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          color: "var(--text-muted)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            border: "3px solid rgba(0, 0, 0, 0.1)",
            borderTopColor: "var(--primary-accent, #4F46E5)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
          Verifying security credentials...
        </p>
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
