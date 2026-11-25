import styles from '../admin.module.css';

/** Chargement d'une page du back-office : squelette, jamais un écran vide. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className={styles.stack}>
      <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
      <div className={styles.tableWrap}>
        <div className={styles.skeletonRows}>
          {Array.from({ length: 6 }, (_, i) => <div key={i} className={`${styles.skeleton} ${styles.skeletonLine}`} />)}
        </div>
      </div>
    </div>
  );
}
