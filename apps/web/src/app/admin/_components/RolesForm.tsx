'use client';

import { useActionState } from 'react';
import buttons from '@/components/Button.module.css';
import type { Dictionary } from '@/i18n/dictionary';
import { IDLE, REASON_MAX, REASON_MIN } from '@/lib/admin/errors';
import { INTERNAL_ROLES } from '@/lib/admin/permissions';
import { rolesAction } from '../actions';
import styles from '../admin.module.css';

/** Rôles internes d'un compte (ADM-01). Réservé aux administrateurs ; motif obligatoire. */
export function RolesForm({ t, userId, current }: { t: Dictionary['admin']; userId: string; current: string[] }) {
  const [state, action, pending] = useActionState(rolesAction, IDLE);
  return (
    <form action={action} className={styles.card} aria-labelledby="roles-title">
      <h2 id="roles-title" className={styles.cardTitle}>{t.users.roles.title}</h2>
      <p className={styles.cardBody}>{t.users.roles.body}</p>
      <input type="hidden" name="id" value={userId} />
      <fieldset className={styles.checks}>
        <legend className="visually-hidden">{t.users.roles.title}</legend>
        {INTERNAL_ROLES.map((role) => (
          <label key={role} className={styles.check}>
            <input type="checkbox" name="roles" value={role} defaultChecked={current.includes(role)} />
            {t.roles[role]}
          </label>
        ))}
      </fieldset>
      <div className={styles.field}>
        <label htmlFor="roles-reason" className={styles.label}>{t.common.reason}</label>
        <textarea
          id="roles-reason" name="reason" required minLength={REASON_MIN} maxLength={REASON_MAX}
          className={styles.textarea} aria-describedby="roles-hint roles-error"
        />
        <p id="roles-hint" className={styles.hint}>{t.common.reasonHint}</p>
      </div>
      <p id="roles-error" role="alert" className={styles.formError}>{state.status === 'error' ? t.errors[state.code] : null}</p>
      {state.status === 'success' && <p role="status" className={styles.formSuccess}>{t.common.saved}</p>}
      <button type="submit" className={`${buttons.button} ${buttons.secondary}`} disabled={pending} aria-busy={pending}>
        {pending ? t.common.pending : t.users.roles.cta}
      </button>
    </form>
  );
}
