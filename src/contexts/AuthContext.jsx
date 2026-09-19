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

// Format Firebase auth error codes into clear, user-friendly messages
function formatAuthError(err) {
  if (!err) return "An unknown authentication error occurred.";
  const code = err.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please verify your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please sign in.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/network-request-failed":
      return "Network connection issue. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many unsuccessful attempts. Please try again later or reset your password.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled before completion.";
    default:
      return err.message || "Authentication failed. Please try again.";
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
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

  // Real Account Registration with Firebase Auth & Firestore
  async function signup(email, password, displayName, customProfile = {}) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (displayName || "").trim();

    if (!cleanEmail) throw new Error("Please provide a valid email address.");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

    try {
      // 1. Create real account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // 2. Set Firebase Auth display name
      if (cleanName) {
        try {
          await updateProfile(user, { displayName: cleanName });
        } catch (e) {
          console.warn("Could not set display name in Firebase Auth:", e);
        }
      }

      // 3. Compute registration code based on real user details
      const role = cleanEmail === "admin@peleekings.com" ? "admin" : (customProfile.role || "student");
      const isNonCorper = customProfile.studentType === "non_corper";
      let regNumber = customProfile.regNumber;
      if (!regNumber) {
        if (role === "admin") {
          regNumber = "ADM-001";
        } else if (isNonCorper) {
          const inits = cleanName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "NL";
          regNumber = `1234${inits}`;
        } else {
          const inits = cleanName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "CL";
          const numbers = (customProfile.nyscStateCode || "1399").replace(/\D/g, "");
          const numSegment = numbers.length >= 4 ? numbers.slice(-4) : "1399";
          regNumber = `${inits}${numSegment}`;
        }
      }

      const profileData = {
        uid: user.uid,
        email: cleanEmail,
        displayName: cleanName,
        fullName: cleanName,
        role,
        studentType: customProfile.studentType || "non_corper",
        nyscStateCode: isNonCorper ? null : (customProfile.nyscStateCode || null),
        phoneNumber: customProfile.phoneNumber || "",
        regNumber,
        createdAt: new Date().toISOString(),
        enrolledCourses: ["AI Essentials & Automation"],
        status: "active",
        ...customProfile,
      };

      // 4. Save to Firestore
      try {
        await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
      } catch (err) {
        console.warn("Firestore save notice:", err);
      }

      const userObj = {
        uid: user.uid,
        email: user.email,
        displayName: cleanName,
        photoURL: user.photoURL || null,
      };

      setCurrentUser(userObj);
      setUserProfile(profileData);
      sessionStorage.setItem("peleekings_active_session", "true");
      localStorage.setItem("peleekings_auth_user", JSON.stringify(userObj));
      localStorage.setItem("peleekings_user_profile", JSON.stringify(profileData));

      return { user: userObj, role, profile: profileData };
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }

  // Real Account Login with Firebase Auth & Firestore
  async function login(email, password) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your email address.");
    if (!password) throw new Error("Please enter your password.");

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // 2. Fetch real user profile from Firestore
      let profileData = null;
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          profileData = docSnap.data();
        }
      } catch (err) {
        console.warn("Firestore profile fetch notice:", err);
      }

      if (!profileData) {
        const role = user.email?.toLowerCase() === "admin@peleekings.com" ? "admin" : "student";
        const inits = (user.displayName || "NL").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "NL";
        profileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          fullName: user.displayName || user.email.split("@")[0],
          role,
          studentType: "non_corper",
          regNumber: role === "admin" ? "ADM-001" : `1234${inits}`,
          enrolledCourses: ["AI Essentials & Automation"],
          status: "active",
        };
      }

      // Strictly lock admin role only to admin@peleekings.com
      if (user.email?.toLowerCase() === "admin@peleekings.com") {
        profileData.role = "admin";
      } else if (profileData.role === "admin") {
        profileData.role = "student";
      }

      const userObj = {
        uid: user.uid,
        email: user.email,
        displayName: profileData.fullName || user.displayName || user.email.split("@")[0],
        photoURL: user.photoURL || null,
      };

      setCurrentUser(userObj);
      setUserProfile(profileData);
      sessionStorage.setItem("peleekings_active_session", "true");
      localStorage.setItem("peleekings_auth_user", JSON.stringify(userObj));
      localStorage.setItem("peleekings_user_profile", JSON.stringify(profileData));

      return { user: userObj, role: profileData.role, profile: profileData };
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        let profileData = null;
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            profileData = docSnap.data();
          }
        } catch {}

        if (!profileData) {
          const role = user.email?.toLowerCase() === "admin@peleekings.com" ? "admin" : "student";
          const inits = (user.displayName || "NL").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "NL";
          profileData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            fullName: user.displayName,
            role,
            studentType: "non_corper",
            regNumber: role === "admin" ? "ADM-001" : `1234${inits}`,
            enrolledCourses: ["AI Essentials & Automation"],
            status: "active",
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
          } catch {}
        }

        const userObj = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };

        setCurrentUser(userObj);
        setUserProfile(profileData);
        sessionStorage.setItem("peleekings_active_session", "true");
        localStorage.setItem("peleekings_auth_user", JSON.stringify(userObj));
        localStorage.setItem("peleekings_user_profile", JSON.stringify(profileData));
        return { user: userObj, role: profileData.role, profile: profileData };
      }
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  }

  function resetPassword(email) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your email address to reset password.");
    return sendPasswordResetEmail(auth, cleanEmail);
  }

  async function logout() {
    try {
      localStorage.removeItem("peleekings_auth_user");
      localStorage.removeItem("peleekings_user_profile");
      sessionStorage.removeItem("peleekings_active_session");
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

        try {
          const cached = localStorage.getItem("peleekings_user_profile");
          if (cached) {
            setUserProfile(JSON.parse(cached));
          }
        } catch {}
        setLoading(false);

        getDoc(doc(db, "users", user.uid))
          .then(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (user.email && user.email.toLowerCase() === "admin@peleekings.com") {
                data.role = "admin";
              } else if (data.role === "admin") {
                data.role = "student";
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
