'use client';

import { useActionState } from 'react';
import buttons from '@/components/Button.module.css';
import type { Dictionary } from '@/i18n/dictionary';
import { t as fill } from '@/i18n/dictionary';
import { loginAction, type LoginState } from '../actions';
import styles from '../admin.module.css';

const INITIAL: LoginState = { step: 'phone', phone: '', error: null, resent: false };

/** Connexion en deux temps : numéro, puis code SMS à 6 chiffres (ACC-01). */
export function LoginForm({ t, suite }: { t: Dictionary['admin']; suite: string }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);
  const error = state.error ? t.errors[state.error] : null;

  return (
    <form action={action} className={styles.stack} noValidate>
      {state.step === 'phone' ? (
        <div className={styles.field}>
          <label htmlFor="phone" className={styles.label}>{t.login.phoneLabel}</label>
          <input
            id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required autoFocus
            className={styles.input} defaultValue={state.phone} aria-describedby="phone-hint"
            aria-invalid={error ? true : undefined}
          />
          <p id="phone-hint" className={styles.hint}>{t.login.phoneHint}</p>
        </div>
      ) : (
        <div className={styles.field}>
          <label htmlFor="code" className={styles.label}>{t.login.codeLabel}</label>
          <input
            id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}"
            maxLength={6} required autoFocus className={`${styles.input} ${styles.code}`} aria-describedby="code-hint"
            aria-invalid={error ? true : undefined}
          />
          <p id="code-hint" className={styles.hint}>{fill(t.login.codeHint, { phone: state.phone })}</p>
          <input type="hidden" name="suite" value={suite} />
        </div>
      )}

      <p role="alert" className={styles.formError}>{error}</p>
      {state.resent && !error && <p role="status" className={styles.formSuccess}>{t.login.resent}</p>}

      <button
        type="submit" name="intent" value={state.step === 'phone' ? 'request' : 'verify'}
        className={`${buttons.button} ${buttons.primary} ${buttons.block}`} disabled={pending} aria-busy={pending}
      >
        {pending ? t.login.pending : state.step === 'phone' ? t.login.send : t.login.verify}
      </button>

      {state.step === 'code' && (
        <div className={styles.inlineActions}>
          <button type="submit" name="intent" value="resend" formNoValidate className={styles.linkButton} disabled={pending}>
            {t.login.resend}
          </button>
          <button type="submit" name="intent" value="restart" formNoValidate className={styles.linkButton} disabled={pending}>
            {t.login.change}
          </button>
        </div>
      )}
    </form>
  );
}
