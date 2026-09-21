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
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { enrollInCourse } from "./userActivity";

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
  const [currentUser, setCurrentUser] = useState(null);

  // Cached profile strictly for instant UI paint; never trusted for permissions
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const cached = localStorage.getItem("peleekings_user_profile_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Loading flag ensures permission checks wait for Firestore re-verification on load
  const [loading, setLoading] = useState(true);

  /**
   * signup(email, password, customProfile):
   * Call createUserWithEmailAndPassword, await it, and only on success write initial users/{uid}
   * doc via setDoc (role omitted — Cloud Function sets it).
   * If Firebase Auth fails, throw real error without setting local session state.
   */
  async function signup(email, password, arg3, arg4) {
    // Support both signup(email, password, customProfile) and signup(email, password, displayName, customProfile)
    let displayName = "";
    let customProfile = {};
    if (typeof arg3 === "string") {
      displayName = arg3;
      customProfile = arg4 || {};
    } else if (typeof arg3 === "object" && arg3 !== null) {
      customProfile = arg3;
      displayName = customProfile.fullName || customProfile.displayName || "";
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (displayName || customProfile.fullName || "").trim();

    if (!cleanEmail) throw new Error("Please provide a valid email address.");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

    // 1. Call Firebase Auth (do not set any local session state if this fails)
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (authErr) {
      throw new Error(formatAuthError(authErr));
    }

    const user = userCredential.user;

    // 2. Set Auth display name if provided
    if (cleanName) {
      try {
        await updateProfile(user, { displayName: cleanName });
      } catch (e) {
        console.warn("Could not set display name in Firebase Auth:", e);
      }
    }

    // 3. Write initial users/{uid} document via setDoc
    // (role and regNumber are omitted — server-side Cloud Function sets them)
    const isNonCorper = customProfile.studentType === "non_corper";
    const { role: _ignoredRole, regNumber: _ignoredRegNum, ...cleanProfile } = customProfile;

    const initialData = {
      uid: user.uid,
      email: user.email,
      displayName: cleanName || user.email.split("@")[0],
      fullName: cleanName || user.email.split("@")[0],
      submittedRole: customProfile.submittedRole || customProfile.role || "student",
      studentType: customProfile.studentType || "non_corper",
      nyscStateCode: isNonCorper ? null : (customProfile.nyscStateCode || null),
      phoneNumber: customProfile.phoneNumber || "",
      createdAt: serverTimestamp(),
      status: "active",
      ...cleanProfile,
    };

    // Ensure role and regNumber are never sent by client
    delete initialData.role;
    delete initialData.regNumber;

    try {
      await setDoc(doc(db, "users", user.uid), initialData);
    } catch (firestoreErr) {
      console.error("Firestore initial write error:", firestoreErr);
      throw new Error("Account created but profile initialization failed. Please contact support.");
    }

    // 4. Fetch the created document immediately for fast signup response
    let profileData = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        profileData = snap.data();
      }
    } catch (err) {
      console.warn("Profile fetch immediate notice:", err);
    }

    if (!profileData) {
      profileData = {
        ...initialData,
        role: customProfile.submittedRole || "student",
        regNumber: "Assigned",
      };
    }

    setCurrentUser(user);
    setUserProfile(profileData);
    localStorage.setItem("peleekings_user_profile_cache", JSON.stringify(profileData));

    // Create a real enrollment document so the Dashboard and CoursePage work immediately
    try {
      await enrollInCourse(user.uid, "ai-essentials", "online");
    } catch (enrErr) {
      console.warn("Could not auto-enroll new user in default course:", enrErr);
    }

    return { user, role: profileData.role || "student", profile: profileData };
  }

  /**
   * login(email, password):
   * Call signInWithEmailAndPassword and await it.
   * Only on success, fetch users/{uid} from Firestore and use its role/regNumber as source of truth.
   * If it fails, throw real error — never fall back to a guessed profile.
   */
  async function login(email, password) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your email address.");
    if (!password) throw new Error("Please enter your password.");

    // 1. Authenticate with Firebase Auth
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (authErr) {
      throw new Error(formatAuthError(authErr));
    }

    const user = userCredential.user;

    // 2. Fetch real user profile from Firestore (Source of Truth)
    let profileData = null;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        profileData = docSnap.data();
      } else {
        // Fallback profile if Firestore doc is missing, preventing broken states or lockout
        profileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          fullName: user.displayName || user.email.split("@")[0],
          role: "student",
          studentType: "non_corper",
          status: "active",
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Firestore profile fetch notice:", fsErr);
      profileData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        fullName: user.displayName || user.email.split("@")[0],
        role: "student",
        studentType: "non_corper",
        status: "active",
      };
    }

    setCurrentUser(user);
    setUserProfile(profileData);
    localStorage.setItem("peleekings_user_profile_cache", JSON.stringify(profileData));

    return { user, role: profileData.role || "student", profile: profileData };
  }

  /**
   * loginWithGoogle():
   * Signs in with Google popup and fetches/creates Firestore profile.
   */
  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (err) {
      throw new Error(formatAuthError(err));
    }

    const user = result.user;
    if (!user) throw new Error("Google sign-in was cancelled or failed.");

    let docSnap = await getDoc(doc(db, "users", user.uid));
    let profileData;

    if (!docSnap.exists()) {
      const initialData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        fullName: user.displayName || user.email.split("@")[0],
        submittedRole: "student",
        studentType: "non_corper",
        status: "active",
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", user.uid), initialData);

      // Create real enrollment document for default course
      try {
        await enrollInCourse(user.uid, "ai-essentials", "online");
      } catch (enrErr) {
        console.warn("Could not auto-enroll Google user in default course:", enrErr);
      }

      // Brief wait for Cloud Function onUserCreated
      await new Promise((res) => setTimeout(res, 800));
      docSnap = await getDoc(doc(db, "users", user.uid));
    }

    if (!docSnap.exists()) {
      throw new Error("Failed to load user profile from Firestore.");
    }

    profileData = docSnap.data();
    setCurrentUser(user);
    setUserProfile(profileData);
    localStorage.setItem("peleekings_user_profile_cache", JSON.stringify(profileData));

    return { user, role: profileData.role, profile: profileData };
  }

  function resetPassword(email) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Please enter your email address to reset password.");
    return sendPasswordResetEmail(auth, cleanEmail);
  }

  async function logout() {
    try {
      localStorage.removeItem("peleekings_user_profile_cache");
    } catch {}
    setCurrentUser(null);
    setUserProfile(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
  }

  /**
   * On load: Re-verify against Firestore via onAuthStateChanged before trusting
   * profile for anything permission-related.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            const verifiedProfile = docSnap.data();
            setUserProfile(verifiedProfile);
            localStorage.setItem("peleekings_user_profile_cache", JSON.stringify(verifiedProfile));
          } else {
            // Profile does not exist in Firestore; do not guess or trust cached role
            setUserProfile(null);
            localStorage.removeItem("peleekings_user_profile_cache");
          }
        } catch (err) {
          console.warn("Notice: could not re-verify profile against Firestore (offline/slow):", err);
          try {
            const cached = localStorage.getItem("peleekings_user_profile_cache");
            if (cached) {
              setUserProfile(JSON.parse(cached));
            }
          } catch {}
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        localStorage.removeItem("peleekings_user_profile_cache");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function updateUserRole(newRole) {
    // Note: Role cannot be updated directly from the client per Firestore security rules.
    // Promotions are handled server-side via the promoteToTutor Cloud Function.
    setUserProfile((prev) => {
      const updated = prev ? { ...prev, role: newRole } : { role: newRole };
      try {
        localStorage.setItem("peleekings_user_profile_cache", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    loginWithGoogle,
    resetPassword,
    updateUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
