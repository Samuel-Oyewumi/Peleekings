import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

const DEFAULT_AUTH_FALLBACK = {
  currentUser: null,
  userProfile: null,
  signup: async (email = "blessing@example.com", password = "", displayName = "Blessing Udo", customProfile = {}) => ({
    user: { email, displayName },
    role: email.toLowerCase().includes("admin") ? "admin" : (customProfile.role || "student"),
    profile: {
      email,
      displayName,
      fullName: displayName,
      role: email.toLowerCase().includes("admin") ? "admin" : (customProfile.role || "student"),
      studentType: customProfile.studentType || "non_corper",
      regNumber: customProfile.regNumber || (customProfile.studentType === "corper" ? "AS1399" : "1234BU"),
      ...customProfile
    }
  }),
  login: async (identifier = "blessing@example.com") => ({
    user: { email: identifier },
    role: identifier.toLowerCase().includes("admin") ? "admin" : "student",
    profile: {
      email: identifier,
      displayName: identifier.toLowerCase().includes("admin") ? "Platform Administrator" : "Blessing Udo",
      role: identifier.toLowerCase().includes("admin") ? "admin" : "student",
      studentType: identifier.toLowerCase().includes("admin") ? "admin" : "non_corper",
      regNumber: identifier.toLowerCase().includes("admin") ? "ADM-001" : "1234BU",
    }
  }),
  logout: async () => {},
  loginWithGoogle: async () => {},
  resetPassword: async () => {},
  updateUserRole: async () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context || DEFAULT_AUTH_FALLBACK;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const isExplicitSession = sessionStorage.getItem("peleekings_active_session");
      if (isExplicitSession) {
        const cached = localStorage.getItem("peleekings_auth_user");
        return cached ? JSON.parse(cached) : null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const isExplicitSession = sessionStorage.getItem("peleekings_active_session");
      if (isExplicitSession) {
        const cached = localStorage.getItem("peleekings_user_profile");
        return cached ? JSON.parse(cached) : null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  async function signup(email, password, displayName, customProfile = {}) {
    let uid = `user-${Date.now()}`;
    const cleanEmail = (email || "learner@peleekings.com").trim();
    const cleanName = (displayName || cleanEmail.split("@")[0] || "Learner").trim();

    // Determine role & student type
    const role = (cleanEmail.toLowerCase().includes("admin")) ? "admin" : (customProfile.role || "student");
    const isNonCorper = customProfile.studentType === "non_corper";
    
    // Compute fallback registration code
    let regNumber = customProfile.regNumber;
    if (!regNumber) {
      if (role === "admin") {
        regNumber = "ADM-001";
      } else if (isNonCorper) {
        regNumber = "1234SA";
      } else {
        regNumber = "AS1399";
      }
    }

    const profileData = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      fullName: cleanName,
      role,
      studentType: customProfile.studentType || "corper",
      nyscStateCode: isNonCorper ? null : (customProfile.nyscStateCode || "AB/23A/1399"),
      regNumber,
      createdAt: new Date().toISOString(),
      enrolledCourses: ["AI Essentials & Automation"],
      completedLessons: [],
      ...customProfile,
    };

    const userObj = { uid, email: cleanEmail, displayName: cleanName };
    setCurrentUser(userObj);
    setUserProfile(profileData);

    try {
      sessionStorage.setItem("peleekings_active_session", "true");
      localStorage.setItem("peleekings_auth_user", JSON.stringify(userObj));
      localStorage.setItem("peleekings_user_profile", JSON.stringify(profileData));

      // Save into global registry of all users so future logins remember Non-Corper or Corper
      const allUsers = JSON.parse(localStorage.getItem("peleekings_all_registered_users") || "{}");
      allUsers[cleanEmail.toLowerCase()] = profileData;
      allUsers[regNumber.toLowerCase()] = profileData;
      localStorage.setItem("peleekings_all_registered_users", JSON.stringify(allUsers));

      // Non-blocking Firestore sync
      setDoc(doc(db, "users", uid), profileData, { merge: true }).catch(() => {});
    } catch {}

    // Non-blocking Firebase Auth sync (never hang on network)
    createUserWithEmailAndPassword(auth, cleanEmail, password || "Password123@")
      .then(result => {
        if (result?.user) {
          updateProfile(result.user, { displayName: cleanName }).catch(() => {});
        }
      })
      .catch(authErr => {
        console.warn("Firebase Auth background signup notice:", authErr?.message || authErr);
      });

    return { user: userObj, role, profile: profileData };
  }

  async function login(identifier = "", password = "") {
    let cleanId = (identifier || "samuel@example.com").trim();
    let email = cleanId;
    let uid = `user-${Date.now()}`;
    let displayName = "Samuel Asuquo";
    let studentType = "corper";
    let regNumber = "AS1399";
    let role = "student";

    // 1. Check if Admin
    if (cleanId.toLowerCase().includes("admin")) {
      role = "admin";
      displayName = "Platform Administrator";
      studentType = "admin";
      regNumber = "ADM-001";
      email = cleanId.includes("@") ? cleanId : "admin@peleekings.com";
    }

    // 2. Check registered users cache
    try {
      const allUsers = JSON.parse(localStorage.getItem("peleekings_all_registered_users") || "{}");
      const matched = allUsers[cleanId.toLowerCase()];
      if (matched) {
        email = matched.email || email;
        displayName = matched.fullName || matched.displayName || displayName;
        studentType = matched.studentType || studentType;
        regNumber = matched.regNumber || regNumber;
        role = matched.role || role;
      }
    } catch {}

    // 3. Known Non-Corper profiles (e.g. Blessing Udo or non-corper logins)
    if (cleanId.toLowerCase().includes("blessing") || cleanId.toLowerCase().includes("non") || cleanId.startsWith("1234")) {
      studentType = "non_corper";
      if (!displayName || displayName === "Samuel Asuquo") displayName = "Blessing Udo";
      if (!email.includes("@")) email = "blessing@example.com";
      if (regNumber === "AS1399") regNumber = "1234BU";
    }

    let profileData = {
      uid,
      email,
      displayName,
      fullName: displayName,
      role,
      studentType,
      regNumber,
      enrolledCourses: ["AI Essentials & Automation"],
      status: "active",
    };

    // Check if we have active user profile cached in localStorage
    try {
      const cached = localStorage.getItem("peleekings_user_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.email === email || parsed.regNumber === cleanId) {
          profileData = { ...parsed, role: role === "admin" ? "admin" : parsed.role };
        }
      }
    } catch {}

    const userObj = { uid, email, displayName };
    setCurrentUser(userObj);
    setUserProfile(profileData);

    try {
      sessionStorage.setItem("peleekings_active_session", "true");
      localStorage.setItem("peleekings_auth_user", JSON.stringify(userObj));
      localStorage.setItem("peleekings_user_profile", JSON.stringify(profileData));
    } catch {}

    // Non-blocking Firebase Auth sync
    if (email.includes("@")) {
      signInWithEmailAndPassword(auth, email, password || "Password123@").catch(err => {
        console.warn("Firebase Auth login background sync notice:", err?.message || err);
      });
    }

    // Background Firestore check
    getDoc(doc(db, "users", uid)).then(snap => {
      if (snap.exists()) {
        const firestoreData = snap.data();
        if (email.toLowerCase().includes("admin")) firestoreData.role = "admin";
        setUserProfile(firestoreData);
        try {
          localStorage.setItem("peleekings_user_profile", JSON.stringify(firestoreData));
        } catch {}
      }
    }).catch(() => {});

    return { user: userObj, role, profile: profileData };
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        const uid = result.user.uid;
        const email = result.user.email;
        const displayName = result.user.displayName || "Google User";
        const role = (email && email.toLowerCase().includes("admin")) ? "admin" : "student";
        const profile = {
          uid,
          email,
          displayName,
          fullName: displayName,
          role,
          studentType: "corper",
          regNumber: "AS1399",
          enrolledCourses: ["AI Essentials & Automation"],
        };
        setCurrentUser({ uid, email, displayName });
        setUserProfile(profile);
        localStorage.setItem("peleekings_auth_user", JSON.stringify({ uid, email, displayName }));
        localStorage.setItem("peleekings_user_profile", JSON.stringify(profile));
      }
      return result;
    } catch (e) {
      console.warn("Google sign in notice:", e);
    }
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function logout() {
    try {
      localStorage.removeItem("peleekings_auth_user");
      localStorage.removeItem("peleekings_user_profile");
      sessionStorage.removeItem("adminAccess");
    } catch {}
    setCurrentUser(null);
    setUserProfile(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const isExplicitSession = sessionStorage.getItem("peleekings_active_session");
      if (user && isExplicitSession) {
        const userObj = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          photoURL: user.photoURL,
        };
        // 1. Immediately load cached profile for instantaneous UI rendering
        try {
          const cached = localStorage.getItem("peleekings_user_profile");
          if (cached) {
            setUserProfile(JSON.parse(cached));
          }
        } catch {}
        setLoading(false);

        // 2. Non-blocking background Firestore sync
        getDoc(doc(db, "users", user.uid))
          .then(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (user.email && user.email.toLowerCase().includes("admin")) {
                data.role = "admin";
              }
              setUserProfile(data);
              try {
                localStorage.setItem("peleekings_user_profile", JSON.stringify(data));
              } catch {}
            }
          })
          .catch(err => {
            console.warn("User profile background check:", err);
          });
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  async function updateUserRole(newRole) {
    setUserProfile(prev => {
      const updated = prev ? { ...prev, role: newRole } : { role: newRole };
      try {
        localStorage.setItem("peleekings_user_profile", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), { role: newRole });
      } catch (err) {
        console.warn("Role update background sync:", err);
      }
    }
  }

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    loginWithGoogle,
    resetPassword,
    updateUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
