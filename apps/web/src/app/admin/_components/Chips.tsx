import type { Dictionary } from '@/i18n/dictionary';
import { isInternalRole } from '@/lib/admin/permissions';
import styles from '../admin.module.css';

type T = Dictionary['admin'];

export function StatusChip({ t, status }: { t: T; status: keyof T['status'] }) {
  return <span className={`${styles.chip} ${styles[`status${status}`] ?? ''}`}>{t.status[status]}</span>;
}

export function RoleChips({ t, roles }: { t: T; roles: string[] }) {
  return (
    <span className={styles.chips}>
      {roles.map((r) => (
        <span key={r} className={`${styles.chip} ${isInternalRole(r) ? styles.staff : ''}`}>
          {t.roles[r as keyof T['roles']] ?? r}
        </span>
      ))}
    </span>
  );
}
