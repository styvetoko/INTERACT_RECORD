'use client';

import { useActionState, useEffect, useRef } from 'react';
import buttons from '@/components/Button.module.css';
import type { Dictionary } from '@/i18n/dictionary';
import { IDLE, REASON_MAX, REASON_MIN, type FormState } from '@/lib/admin/errors';
import styles from '../admin.module.css';

type Action = (state: FormState, data: FormData) => Promise<FormState>;

/** Action du back-office qui exige un motif écrit, tracé dans le journal d'audit (ADM-10). */
export function ReasonForm({
  t, action, fields, title, body, cta, tone = 'primary', id,
}: {
  t: Dictionary['admin'];
  action: Action;
  fields: Record<string, string>;
  title: string;
  body: string;
  cta: string;
  tone?: 'primary' | 'secondary' | 'danger';
  id: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === 'success') form.current?.reset();
  }, [state]);

  const toneClass = tone === 'danger' ? styles.danger : tone === 'secondary' ? buttons.secondary : buttons.primary;
  const errorId = `${id}-error`;

  return (
    <form ref={form} action={formAction} className={styles.card} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.cardTitle}>{title}</h2>
      <p className={styles.cardBody}>{body}</p>
      {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <div className={styles.field}>
        <label htmlFor={`${id}-reason`} className={styles.label}>{t.common.reason}</label>
        <textarea
          id={`${id}-reason`} name="reason" required minLength={REASON_MIN} maxLength={REASON_MAX}
          className={styles.textarea} aria-describedby={`${id}-hint ${errorId}`}
          aria-invalid={state.status === 'error' ? true : undefined}
        />
        <p id={`${id}-hint`} className={styles.hint}>{t.common.reasonHint}</p>
      </div>
      <p id={errorId} role="alert" className={styles.formError}>{state.status === 'error' ? t.errors[state.code] : null}</p>
      {state.status === 'success' && <p role="status" className={styles.formSuccess}>{t.common.saved}</p>}
      <button type="submit" className={`${buttons.button} ${toneClass}`} disabled={pending} aria-busy={pending}>
        {pending ? t.common.pending : cta}
      </button>
    </form>
  );
}
