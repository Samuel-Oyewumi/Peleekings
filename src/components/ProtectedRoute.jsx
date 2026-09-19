import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  // Read localStorage cache so fast state transitions never falsely bounce to /auth
  const cachedUser = (() => {
    try {
      const raw = localStorage.getItem("peleekings_auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const activeUser = currentUser || cachedUser;

  if (!activeUser) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  const cachedProfile = (() => {
    try {
      const raw = localStorage.getItem("peleekings_user_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const activeProfile = userProfile || cachedProfile;
  const isAdmin =
    activeProfile?.role === "admin" ||
    (activeUser?.email && activeUser.email.toLowerCase().includes("admin"));

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
