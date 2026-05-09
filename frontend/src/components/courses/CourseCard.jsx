"use client";

import styles from "./CourseCard.module.css";

const STATUS_CONFIG = {
 completed: { label: "Completed", cls: "completed" },
 in_progress: { label: "In Progress", cls: "inProgress" },
 not_started: { label: "Not Started", cls: "notStarted" },
};

export default function CourseCard({ course, onClick }) {
 const progress = course.progress || {
 progress_percent: 0,
 completed_modules: 0,
 total_modules: course.total_modules || 0,
 status: "not_started",
 };

 const statusConfig = STATUS_CONFIG[progress.status] || STATUS_CONFIG.not_started;
 const isDone = progress.status === "completed";

 return (
 <div className={styles.card} onClick={onClick} role="button" tabIndex={0}
 onKeyDown={(e) => e.key === "Enter" && onClick()}>

 {/* TOP ROW */}
 <div className={styles.cardTop}>
 <div className={styles.cardIcon}>
 <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
 stroke="#7c6ff7" strokeWidth="1.5">
 <rect x="2" y="2" width="16" height="16" rx="2" />
 <path d="M6 7h8M6 10.5h8M6 14h5" />
 <path d="M2 6h16" />
 </svg>
 </div>
 <span className={`${styles.badge} ${styles[statusConfig.cls]}`}>
 <span className={styles.badgeDot} />
 {statusConfig.label}
 </span>
 </div>

 {/* COURSE NUM */}
 {course.course_number && (
 <div className={styles.courseNum}>Course {course.course_number}</div>
 )}

 {/* TITLE */}
 <h3 className={styles.title}>{course.title}</h3>

 {/* DESCRIPTION */}
 <p className={styles.desc}>{course.description}</p>

 {/* FOOTER */}
 <div className={styles.footer}>
 {/* PROGRESS BAR */}
 <div className={styles.progressWrap}>
 <div className={styles.progressLabel}>
 <span>{progress.completed_modules}/{progress.total_modules} modules</span>
 <strong>{progress.progress_percent}%</strong>
 </div>
 <div className={styles.progressBar}>
 <div
 className={`${styles.progressFill} ${isDone ? styles.done : ""}`}
 style={{ width: `${progress.progress_percent}%` }}
 />
 </div>
 </div>

 {/* CURATOR + VIEW */}
 <div className={styles.meta}>
 <div className={styles.curatorInfo}>
 <div className={styles.curatorAvatar}>
 {course.curator_initials || "SA"}
 </div>
 <div>
 <div className={styles.curatorLabel}>Curator</div>
 <div className={styles.curatorName}>{course.curator_name}</div>
 </div>
 </div>
 <button
 className={styles.viewBtn}
 onClick={(e) => { e.stopPropagation(); onClick(); }}
 >
 VIEW
 <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
 stroke="currentColor" strokeWidth="1.5">
 <path d="M2 5.5h7M5.5 2l3.5 3.5-3.5 3.5" />
 </svg>
 </button>
 </div>
 </div>
 </div>
 );
}