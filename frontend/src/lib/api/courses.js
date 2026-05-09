// lib/api/courses.js
// All API calls for the Courses feature

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── HELPER ─────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include", // for cookie-based auth
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// ── COURSES ────────────────────────────────────────────────────────────────

/**
 * Fetch all courses with optional search, filter, sort
 * @param {Object} params
 * @param {string} params.q - search query
 * @param {string} params.status - all | my | completed | in_progress | not_started
 * @param {string} params.sort - newest | oldest | alpha | progress
 */
export async function fetchCourses({ q = "", status = "all", sort = "newest" } = {}) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (status && status !== "all") params.set("status", status);
  if (sort) params.set("sort", sort);

  const query = params.toString();
  return apiFetch(`/courses${query ? `?${query}` : ""}`);
}

/**
 * Search courses by title/description
 * @param {string} q - search term
 */
export async function searchCourses(q) {
  if (!q?.trim()) return fetchCourses();
  return apiFetch(`/courses/search?q=${encodeURIComponent(q.trim())}`);
}

/**
 * Get single course with modules + progress
 * @param {number|string} courseId
 */
export async function fetchCourse(courseId) {
  return apiFetch(`/courses/${courseId}`);
}

/**
 * Get course stats for the current user
 */
export async function fetchCourseStats() {
  return apiFetch("/courses/stats");
}

/**
 * Enroll current user in a course
 * @param {number} courseId
 */
export async function enrollCourse(courseId) {
  return apiFetch(`/courses/${courseId}/enroll`, { method: "POST" });
}

// ── PROGRESS ───────────────────────────────────────────────────────────────

/**
 * Mark a module as complete
 * @param {number} moduleId
 * @param {number} courseId
 */
export async function markModuleComplete(moduleId, courseId) {
  return apiFetch("/progress/complete", {
    method: "POST",
    body: JSON.stringify({ module_id: moduleId, course_id: courseId }),
  });
}

/**
 * Mark a module as incomplete
 * @param {number} moduleId
 * @param {number} courseId
 */
export async function markModuleIncomplete(moduleId, courseId) {
  return apiFetch("/progress/incomplete", {
    method: "POST",
    body: JSON.stringify({ module_id: moduleId, course_id: courseId }),
  });
}

/**
 * Get progress for a specific course
 * @param {number} courseId
 */
export async function fetchCourseProgress(courseId) {
  return apiFetch(`/progress/course/${courseId}`);
}

/**
 * Get module-level progress for a course
 * @param {number} courseId
 */
export async function fetchModuleProgress(courseId) {
  return apiFetch(`/progress/course/${courseId}/modules`);
}

// ── DEBOUNCE UTILITY ───────────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}