// User Activity & Learning Progress Service
// Persists enrollment, completed lessons, learning streaks, and milestone celebrations per user

import { COURSES_CATALOG } from "../pages/Home";

const STORAGE_PREFIX = "peleekings_user_activity_";

// Default starter courses for demonstration if user has no enrollments yet
const DEFAULT_ENROLLED_COURSES = [
  {
    id: "ai-essentials",
    title: "AI Essentials & Automation",
    type: "Online",
    progress: 66,
    currentModule: "Module 4 of 10",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=500&auto=format&fit=crop&q=80",
    enrolledAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: "graphic-design",
    title: "Graphic Design Fundamentals",
    type: "Hands-on",
    progress: 32,
    currentModule: "Module 3 of 12",
    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&auto=format&fit=crop&q=80",
    enrolledAt: new Date(Date.now() - 14 * 86400000).toISOString()
  }
];

export function getUserActivity(userId) {
  if (!userId) return { enrolledCourses: DEFAULT_ENROLLED_COURSES, completedLessons: {}, weeklyActivity: null, milestones: [] };
  
  const key = `${STORAGE_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = {
        enrolledCourses: DEFAULT_ENROLLED_COURSES,
        completedLessons: {
          "ai-essentials": ["l1", "l2", "l3", "l4"],
          "graphic-design": ["l1", "l2"]
        },
        weeklyActivity: [
          { day: "Mon", hours: 45, label: "45m" },
          { day: "Tue", hours: 60, label: "1h" },
          { day: "Wed", hours: 30, label: "30m" },
          { day: "Thu", hours: 85, label: "1h 25m", highlight: true },
          { day: "Fri", hours: 40, label: "40m" },
          { day: "Sat", hours: 90, label: "1h 30m" },
          { day: "Sun", hours: 20, label: "20m" }
        ],
        milestones: []
      };
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return { enrolledCourses: DEFAULT_ENROLLED_COURSES, completedLessons: {}, weeklyActivity: null, milestones: [] };
  }
}

export function saveUserActivity(userId, data) {
  if (!userId) return;
  const key = `${STORAGE_PREFIX}${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Dispatch custom event for real-time reactivity across components
    window.dispatchEvent(new CustomEvent("peleekings_activity_updated", { detail: { userId, data } }));
  } catch (err) {
    console.warn("Failed to persist user activity:", err);
  }
}

export function enrollInCourse(userId, courseId, experienceType = "online") {
  const current = getUserActivity(userId);
  const existing = current.enrolledCourses?.find(c => c.id === courseId);
  if (existing) return current;

  const catalogCourse = COURSES_CATALOG.find(c => c.id === courseId) || {
    id: courseId,
    title: "Enrolled Course",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80"
  };

  const newEnrollment = {
    id: courseId,
    title: catalogCourse.title,
    type: experienceType === "hands-on" ? "Hands-on" : "Online",
    progress: 0,
    currentModule: "Module 1 of 10",
    image: catalogCourse.image,
    enrolledAt: new Date().toISOString()
  };

  const updatedCourses = [newEnrollment, ...(current.enrolledCourses || [])];
  const updatedActivity = {
    ...current,
    enrolledCourses: updatedCourses
  };

  saveUserActivity(userId, updatedActivity);
  return updatedActivity;
}

export function toggleLessonCompletion(userId, courseId, lessonId, totalCourseLessons = 8) {
  const current = getUserActivity(userId);
  const completedMap = { ...(current.completedLessons || {}) };
  const courseLessons = new Set(completedMap[courseId] || []);

  if (courseLessons.has(lessonId)) {
    courseLessons.delete(lessonId);
  } else {
    courseLessons.add(lessonId);
  }

  completedMap[courseId] = Array.from(courseLessons);

  // Compute progress percentage
  const newProgress = Math.min(100, Math.round((courseLessons.size / Math.max(totalCourseLessons, 1)) * 100));

  // Update enrolledCourses list progress
  const updatedCourses = (current.enrolledCourses || []).map(course => {
    if (course.id === courseId) {
      return {
        ...course,
        progress: newProgress,
        currentModule: `Module ${Math.max(1, Math.min(10, Math.ceil(courseLessons.size * (10 / Math.max(totalCourseLessons, 1)))))} of 10`
      };
    }
    return course;
  });

  const updatedActivity = {
    ...current,
    completedLessons: completedMap,
    enrolledCourses: updatedCourses
  };

  saveUserActivity(userId, updatedActivity);
  return updatedActivity;
}

export function submitUserMilestone(userId, milestone) {
  const current = getUserActivity(userId);
  const newMilestone = {
    id: `m_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...milestone
  };
  const updatedMilestones = [newMilestone, ...(current.milestones || [])];
  const updatedActivity = {
    ...current,
    milestones: updatedMilestones
  };
  saveUserActivity(userId, updatedActivity);
  return updatedActivity;
}
