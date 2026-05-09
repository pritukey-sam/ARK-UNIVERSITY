"use client";

import { useState, useEffect } from "react";
import { fetchCourse, enrollCourse, markModuleComplete, markModuleIncomplete } from "@/lib/api/courses";
import { useAuth } from "@/context/AuthContext";
import styles from "./CourseDetailPanel.module.css";

const STATUS_CONFIG = {
 completed: { label: "Completed", cls: "completed" },
 in_progress: { label: "In Progress", cls: "inProgress" },
 not_started: { label: "Not Started", cls: "notStarted" },
};

export default function CourseDetailPanel({ courseId, onClose, onUpdate }) {
 const { user } = useAuth();
 const isAdmin = user?.role === 'admin';
 const [course, setCourse] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [enrolling, setEnrolling] = useState(false);
 const [togglingModule, setTogglingModule] = useState(null);

 useEffect(() => {
 loadCourse();
 }, [courseId]);

 // Close on Escape
 useEffect(() => {
 const handler = (e) => { if (e.key === "Escape") onClose(); };
 window.addEventListener("keydown", handler);
 return () => window.removeEventListener("keydown", handler);
 }, [onClose]);

 async function loadCourse() {
 setLoading(true);
 setError(null);
 try {
 const data = await fetchCourse(courseId);
 setCourse(data);
 } catch (err) {
 setError(err.message || "Failed to load course");
 } finally {
 setLoading(false);
 }
 }

 async function handleEnroll() {
 setEnrolling(true);
 try {
 await enrollCourse(courseId);
 await loadCourse();
 onUpdate?.();
 } catch (err) {
 alert(err.message);
 } finally {
 setEnrolling(false);
 }
 }

 async function handleToggleModule(module) {
 setTogglingModule(module.id);
 try {
 if (module.is_completed) {
 await markModuleIncomplete(module.id, courseId);
 } else {
 await markModuleComplete(module.id, courseId);
 }
 await loadCourse();
 onUpdate?.();
 } catch (err) {
 alert(err.message);
 } finally {
 setTogglingModule(null);
 }
 }

 const progress = course?.progress;
 const status = progress?.status || "not_started";
 const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
 const isDone = status === "completed";
 const hasStarted = (progress?.completed_modules || 0) > 0;

 const nextModule = course?.modules?.find((m) => !m.is_completed);

 return (
 <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
 <div className={styles.panel} role="dialog" aria-modal="true">
 <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

 {loading ? (
 <div className={styles.loadingState}>
 {[80, 60, 100, 40, 70].map((w, i) => (
 <div key={i} className={styles.skLine} style={{ width: `${w}%` }} />
 ))}
 </div>
 ) : error ? (
 <div className={styles.errorState}>
 <p>{error}</p>
 <button onClick={loadCourse}>Retry</button>
 </div>
 ) : course ? (
 <>
 {/* BREADCRUMB */}
 <nav className={styles.breadcrumb}>
 <span>Dashboard</span>
 <span className={styles.sep}>›</span>
 <span>Courses</span>
 <span className={styles.sep}>›</span>
 <span className={styles.current}>{course.title}</span>
 </nav>

 {/* HEADER */}
 <div className={styles.header}>
 <div className={styles.headerIcon}>
 <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
 stroke="#7c6ff7" strokeWidth="1.5">
 <rect x="3" y="3" width="22" height="22" rx="3" />
 <path d="M8 9h12M8 13h12M8 17h8" />
 <path d="M3 8h22" />
 </svg>
 </div>
 <div>
 <h2 className={styles.title}>{course.title}</h2>
 <div className={styles.headerMeta}>
 <span className={`${styles.badge} ${styles[statusConfig.cls]}`}>
 <span className={styles.badgeDot} />
 {statusConfig.label}
 </span>
 <span className={styles.metaText}>
 {course.modules?.length} modules · Curator: {course.curator_name}
 </span>
 </div>
 </div>
 </div>

 {/* DESCRIPTION */}
 <p className={styles.desc}>{course.description}</p>

 {/* PROGRESS */}
 {progress && (
 <div className={styles.progressSection}>
 <div className={styles.sectionTitle}>Your Progress</div>
 <div className={styles.progressTop}>
 <div>
 <div className={styles.progressPct}>{progress.progress_percent}%</div>
 <div className={styles.progressSub}>
 {progress.completed_modules} of {progress.total_modules} modules completed
 </div>
 </div>
 {isDone ? (
 <span className={styles.finishedBadge}>🎉 Finished!</span>
 ) : nextModule ? (
 <span className={styles.nextLabel}>Next: {nextModule.title}</span>
 ) : null}
 </div>
 <div className={styles.progressBar}>
 <div
 className={`${styles.progressFill} ${isDone ? styles.done : ""}`}
 style={{ width: `${progress.progress_percent}%` }}
 />
 </div>
 </div>
 )}

 {/* MODULES */}
 <div className={styles.modulesSection}>
 <div className={styles.sectionTitle}>Modules</div>
 <div className={styles.modulesList}>
 {course.modules?.map((module, idx) => {
 const isNext = !module.is_completed &&
 (idx === 0 || course.modules[idx - 1]?.is_completed);
 const isToggling = togglingModule === module.id;

 return (
 <div key={module.id} className={styles.moduleItem}>
 <button
 className={`${styles.moduleCheck}
 ${module.is_completed ? styles.done : ""}
 ${isNext ? styles.next : ""}`}
 onClick={() => handleToggleModule(module)}
 disabled={isToggling}
 aria-label={module.is_completed ? "Mark incomplete" : "Mark complete"}
 >
 {isToggling ? "..." : module.is_completed ? "✓" : idx + 1}
 </button>
 <div className={styles.moduleInfo}>
 <div className={styles.moduleName}>{module.title}</div>
 <div className={styles.moduleDuration}>
 {module.duration_minutes} min
 </div>
 </div>
 <span className={`${styles.moduleStatus}
 ${module.is_completed ? styles.done : isNext ? styles.next : ""}`}>
 {module.is_completed ? "Done" : isNext ? "Next" : "Locked"}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* CTA BUTTON */}
 {!course.is_enrolled && isAdmin ? (
 <button
 className={styles.enrollBtn}
 onClick={handleEnroll}
 disabled={enrolling}
 >
 {enrolling ? "Enrolling..." : "Enroll Now"}
 </button>
 ) : course.is_enrolled ? (
 <button className={styles.startBtn}>
 <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
 <path d="M4 3l9 5-9 5V3z" />
 </svg>
 {isDone ? "Review Course" : hasStarted ? "Continue Learning" : "Start Learning"}
 </button>
 ) : null}
 </>
 ) : null}
 </div>
 </div>
 );
}