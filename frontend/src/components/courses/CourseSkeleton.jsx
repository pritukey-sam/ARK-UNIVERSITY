// components/courses/CourseSkeleton.jsx
import styles from "./CourseSkeleton.module.css";

export default function CourseSkeleton() {
 return (
 <div className={styles.card}>
 <div className={styles.top}>
 <div className={`${styles.sk} ${styles.icon}`} />
 <div className={`${styles.sk} ${styles.badge}`} />
 </div>
 <div className={`${styles.sk} ${styles.h1}`} />
 <div className={`${styles.sk} ${styles.h2}`} />
 <div className={`${styles.sk} ${styles.h3}`} />
 <div className={`${styles.sk} ${styles.bar}`} />
 <div className={`${styles.sk} ${styles.meta}`} />
 </div>
 );
}