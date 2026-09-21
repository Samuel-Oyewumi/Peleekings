// User Activity & Learning Progress Service (Firestore-backed)
// Persists enrollments, completed lessons, progress, and submissions directly to Firestore

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { COURSES_CATALOG } from "../data/courses";

/**
 * Enroll a user in a course.
 * Writes to enrollments/{uid}_{courseId} via setDoc with initial progress.
 * If already enrolled, does nothing.
 */
export async function enrollInCourse(uid, courseId, experienceType = "online", totalLessons = 1) {
  if (!uid || !courseId) return null;

  const course = COURSES_CATALOG.find((item) => item.id === courseId);
  const enrollmentId = `${uid}_${courseId}`;
  const enrollmentRef = doc(db, "enrollments", enrollmentId);

  try {
    const existingSnap = await getDoc(enrollmentRef);
    if (existingSnap.exists()) {
      return { id: enrollmentId, ...existingSnap.data() };
    }

    const newEnrollment = {
      uid,
      courseId,
      courseTitle: course?.title || "Course",
      enrolledAt: serverTimestamp(),
      status: "active",
      experienceType: experienceType === "hands-on" ? "hands-on" : "online",
      completedItemIds: [],
      progressPercent: 0,
      totalLessons: Math.max(totalLessons, 1),
      currentModule: "Module 1",
      updatedAt: serverTimestamp(),
    };

    await setDoc(enrollmentRef, newEnrollment);
    return { id: enrollmentId, ...newEnrollment };
  } catch (err) {
    console.error(`Failed to enroll user ${uid} in course ${courseId}:`, err);
    throw err;
  }
}

/**
 * Fetch a specific enrollment document for a user.
 */
export async function getCourseEnrollment(uid, courseId) {
  if (!uid || !courseId) return null;
  const enrollmentId = `${uid}_${courseId}`;
  try {
    const snap = await getDoc(doc(db, "enrollments", enrollmentId));
    if (snap.exists()) {
      return { id: enrollmentId, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.warn(`Could not fetch enrollment for ${enrollmentId}:`, err);
    return null;
  }
}

/**
 * Fetch all active enrollments for a user from Firestore.
 */
export async function getUserEnrollments(uid) {
  if (!uid) return [];
  try {
    const q = query(
      collection(db, "enrollments"),
      where("uid", "==", uid),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`Failed to fetch enrollments for user ${uid}:`, err);
    return [];
  }
}

/**
 * Toggle lesson/item completion and recompute progressPercent.
 * Uses arrayUnion / arrayRemove in Firestore and recomputes progress based on total items.
 */
export async function toggleLessonCompletion(uid, courseId, lessonId, fallbackTotalLessons = 8) {
  if (!uid || !courseId || !lessonId) return null;

  const enrollmentId = `${uid}_${courseId}`;
  const enrollmentRef = doc(db, "enrollments", enrollmentId);

  try {
    const enrollmentSnap = await getDoc(enrollmentRef);
    if (!enrollmentSnap.exists()) {
      throw new Error(`User ${uid} is not enrolled in course ${courseId}`);
    }

    const enrollmentData = enrollmentSnap.data();
    const currentCompleted = new Set(enrollmentData.completedItemIds || enrollmentData.completedLessonIds || []);
    const isCompleted = currentCompleted.has(lessonId);

    // Fetch real module/lesson count from courses/{courseId}/modules if present
    let totalLessons = 0;
    try {
      const modulesSnap = await getDocs(collection(db, "courses", courseId, "modules"));
      if (!modulesSnap.empty) {
        modulesSnap.forEach((mDoc) => {
          const mData = mDoc.data();
          if (Array.isArray(mData.lessons)) {
            totalLessons += mData.lessons.length;
          } else if (Array.isArray(mData.items)) {
            totalLessons += mData.items.length;
          }
        });
      }
    } catch (mErr) {
      console.warn("Could not query modules subcollection for lesson count:", mErr);
    }

    if (totalLessons === 0) {
      totalLessons = enrollmentData.totalLessons || fallbackTotalLessons || 8;
    }

    let updatedCompletedIds;
    let newProgressPercent;

    if (isCompleted) {
      currentCompleted.delete(lessonId);
      updatedCompletedIds = Array.from(currentCompleted);
      newProgressPercent = Math.max(0, Math.round((updatedCompletedIds.length / Math.max(totalLessons, 1)) * 100));

      await updateDoc(enrollmentRef, {
        completedItemIds: arrayRemove(lessonId),
        progressPercent: newProgressPercent,
        updatedAt: serverTimestamp(),
      });
    } else {
      currentCompleted.add(lessonId);
      updatedCompletedIds = Array.from(currentCompleted);
      newProgressPercent = Math.min(100, Math.round((updatedCompletedIds.length / Math.max(totalLessons, 1)) * 100));

      await updateDoc(enrollmentRef, {
        completedItemIds: arrayUnion(lessonId),
        progressPercent: newProgressPercent,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      completedItemIds: updatedCompletedIds,
      progressPercent: newProgressPercent,
    };
  } catch (err) {
    console.error("Failed to toggle lesson completion in Firestore:", err);
    throw err;
  }
}

/**
 * Submit an assignment.
 * Supports file uploads to Firebase Storage and writes submission record to assignmentSubmissions.
 * Client never sets grade or feedback (strictly rule-protected).
 */
export async function submitAssignment(uid, courseIdOrAssignment, assignmentIdOrData, maybeSubmissionData) {
  let courseId = "general";
  let assignmentId = "";
  let submissionData = {};
  let courseTitle = null;

  if (maybeSubmissionData !== undefined) {
    courseId = courseIdOrAssignment || "general";
    assignmentId = assignmentIdOrData;
    submissionData = maybeSubmissionData || {};
  } else if (typeof courseIdOrAssignment === "object" && courseIdOrAssignment !== null) {
    assignmentId = courseIdOrAssignment.id;
    courseId = courseIdOrAssignment.courseId || "general";
    courseTitle = courseIdOrAssignment.course || courseIdOrAssignment.courseTitle || null;
    submissionData = assignmentIdOrData || {};
  } else {
    assignmentId = courseIdOrAssignment;
    submissionData = assignmentIdOrData || {};
    courseId = submissionData.courseId || "general";
  }

  if (!uid || !assignmentId) throw new Error("Missing uid or assignmentId.");

  const submissionDocId = `${uid}_${assignmentId}`;
  const submissionRef = doc(db, "assignmentSubmissions", submissionDocId);

  let fileUrl = submissionData.fileUrl || null;
  let filePath = null;

  if (submissionData.file) {
    const safeName = submissionData.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    filePath = `courses/${courseId}/submissions/${uid}/${submissionDocId}-${safeName}`;
    const storageRef = ref(storage, filePath);
    const uploadResult = await uploadBytes(storageRef, submissionData.file, {
      contentType: submissionData.file.type || "application/octet-stream",
    });
    fileUrl = await getDownloadURL(uploadResult.ref);
  }

  const payload = {
    uid,
    courseId,
    courseTitle,
    assignmentId,
    content: submissionData.content || submissionData.submissionContent || "",
    fileUrl,
    filePath,
    fileName: submissionData.file?.name || submissionData.fileName || null,
    fileSize: submissionData.file?.size || submissionData.fileSize || null,
    fileType: submissionData.file?.type || submissionData.fileType || null,
    projectLink: submissionData.projectLink || null,
    notes: submissionData.notes || null,
    studentName: submissionData.studentName || null,
    studentEmail: submissionData.studentEmail || null,
    status: "submitted",
    submittedAt: serverTimestamp(),
  };

  // Client never sets grade or feedback
  delete payload.grade;
  delete payload.feedback;

  try {
    await setDoc(submissionRef, payload, { merge: true });

    // Mark assignment as completed in enrollment
    if (courseId && courseId !== "general") {
      try {
        await updateDoc(doc(db, "enrollments", `${uid}_${courseId}`), {
          completedItemIds: arrayUnion(assignmentId),
          updatedAt: serverTimestamp(),
        });
      } catch (enrErr) {
        console.warn("Notice: could not auto-mark assignment complete in enrollment:", enrErr);
      }
    }

    return { id: submissionDocId, ...payload };
  } catch (err) {
    console.error("Error submitting assignment to Firestore:", err);
    throw err;
  }
}

/**
 * Fetch an assignment submission including any tutor-assigned grade/feedback.
 */
export async function getAssignmentSubmission(uid, assignmentId) {
  if (!uid || !assignmentId) return null;
  const submissionDocId = `${uid}_${assignmentId}`;
  try {
    const snap = await getDoc(doc(db, "assignmentSubmissions", submissionDocId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.warn("Error fetching assignment submission:", err);
    return null;
  }
}

/**
 * Submit a test/quiz.
 * Calculates score and records submission in testSubmissions.
 * Client never sets tutor grade or feedback.
 */
export async function submitTest(uid, courseIdOrTestId, testIdOrAnswers, maybeAnswers, calculatedScore = null) {
  let courseId = "general";
  let testId = "";
  let answers = {};
  let score = calculatedScore;

  if (maybeAnswers !== undefined) {
    courseId = courseIdOrTestId || "general";
    testId = testIdOrAnswers;
    answers = maybeAnswers || {};
  } else {
    testId = courseIdOrTestId;
    answers = testIdOrAnswers || {};
  }

  if (!uid || !testId) throw new Error("Missing uid or testId.");

  const submissionDocId = `${uid}_${testId}`;
  const submissionRef = doc(db, "testSubmissions", submissionDocId);

  const payload = {
    uid,
    courseId,
    testId,
    answers,
    score,
    status: "submitted",
    submittedAt: serverTimestamp(),
  };

  delete payload.grade;
  delete payload.feedback;

  try {
    await setDoc(submissionRef, payload, { merge: true });

    // Mark test as completed in enrollment
    if (courseId && courseId !== "general") {
      try {
        await updateDoc(doc(db, "enrollments", `${uid}_${courseId}`), {
          completedItemIds: arrayUnion(testId),
          updatedAt: serverTimestamp(),
        });
      } catch (enrErr) {
        console.warn("Notice: could not auto-mark test complete in enrollment:", enrErr);
      }
    }

    return { id: submissionDocId, ...payload };
  } catch (err) {
    console.error("Error submitting test to Firestore:", err);
    throw err;
  }
}

/**
 * Fetch a test submission including any tutor-assigned grade/feedback.
 */
export async function getTestSubmission(uid, testId) {
  if (!uid || !testId) return null;
  const submissionDocId = `${uid}_${testId}`;
  try {
    const snap = await getDoc(doc(db, "testSubmissions", submissionDocId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.warn("Error fetching test submission:", err);
    return null;
  }
}

/**
 * Fetch complete real-time activity for a user from Firestore.
 */
export async function fetchUserActivity(userId) {
  if (!userId) {
    return {
      enrolledCourses: [],
      completedLessons: {},
      weeklyActivity: null,
      milestones: [],
      assignmentSubmissions: {},
    };
  }

  try {
    const [enrollmentSnapshot, submissionSnapshot] = await Promise.all([
      getDocs(query(collection(db, "enrollments"), where("uid", "==", userId))),
      getDocs(query(collection(db, "assignmentSubmissions"), where("uid", "==", userId))),
    ]);

    const completedLessons = {};
    const enrolledCourses = enrollmentSnapshot.docs.map((item) => {
      const data = item.data();
      completedLessons[data.courseId] = data.completedItemIds || data.completedLessonIds || [];
      const catalog = COURSES_CATALOG.find((course) => course.id === data.courseId);
      const total = Math.max(data.totalLessons || 1, 1);
      const progress = Math.round(((data.completedItemIds || data.completedLessonIds || []).length / total) * 100);

      return {
        id: data.courseId,
        title: data.courseTitle || catalog?.title || "Course",
        image: catalog?.image || "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
        type: data.experienceType === "hands-on" ? "Hands-on" : "Online",
        progress,
        currentModule: data.currentModule || "Module 1",
        enrolledAt: data.enrolledAt,
      };
    });

    const assignmentSubmissions = {};
    submissionSnapshot.docs.forEach((item) => {
      const data = item.data();
      assignmentSubmissions[data.assignmentId] = { id: item.id, ...data };
    });

    return {
      enrolledCourses,
      completedLessons,
      assignmentSubmissions,
      milestones: [],
      weeklyActivity: null,
    };
  } catch (err) {
    console.warn("Error fetching user activity from Firestore:", err);
    return getUserActivity(userId);
  }
}

/**
 * Synchronous UI State Helper for instant render in Dashboard
 */
export function getUserActivity(userId) {
  if (!userId) {
    return {
      enrolledCourses: [],
      completedLessons: {},
      weeklyActivity: [
        { day: "Mon", hours: 45, label: "45m" },
        { day: "Tue", hours: 60, label: "1h" },
        { day: "Wed", hours: 30, label: "30m" },
        { day: "Thu", hours: 85, label: "1h 25m", highlight: true },
        { day: "Fri", hours: 40, label: "40m" },
        { day: "Sat", hours: 90, label: "1h 30m" },
        { day: "Sun", hours: 20, label: "20m" },
      ],
      milestones: [],
      assignmentSubmissions: {},
    };
  }

  try {
    const raw = localStorage.getItem(`peleekings_user_activity_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    enrolledCourses: [],
    completedLessons: {},
    weeklyActivity: [
      { day: "Mon", hours: 45, label: "45m" },
      { day: "Tue", hours: 60, label: "1h" },
      { day: "Wed", hours: 30, label: "30m" },
      { day: "Thu", hours: 85, label: "1h 25m", highlight: true },
      { day: "Fri", hours: 40, label: "40m" },
      { day: "Sat", hours: 90, label: "1h 30m" },
      { day: "Sun", hours: 20, label: "20m" },
    ],
    milestones: [],
    assignmentSubmissions: {},
  };
}

export function saveUserActivity(userId, data) {
  if (!userId) return;
  try {
    localStorage.setItem(`peleekings_user_activity_${userId}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("peleekings_activity_updated", { detail: { userId, data } }));
  } catch (err) {
    console.warn("Failed to persist user activity cache:", err);
  }
}

export function submitUserMilestone(userId, milestone) {
  const current = getUserActivity(userId);
  const newMilestone = {
    id: `ms_${Date.now()}`,
    ...milestone,
    createdAt: new Date().toISOString(),
  };
  const updated = {
    ...current,
    milestones: [newMilestone, ...(current.milestones || [])],
  };
  saveUserActivity(userId, updated);
  return newMilestone;
}
