import type { ReactNode } from 'react';
import { IconSparkle } from './icons';
import styles from './EmptyState.module.css';

/** État vide ou d'erreur : une explication et, si utile, une action. */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className={styles.empty} role="status">
      <span className={styles.icon}>
        <IconSparkle width={26} height={26} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
      {action}
    </div>
  );
}
