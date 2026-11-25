import { getI18n } from '@/i18n/server';
import { safeAdminPath } from '@/lib/admin/session-core';
import { LoginForm } from '../_components/LoginForm';
import styles from '../admin.module.css';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { dict } = await getI18n();
  const { suite } = await searchParams;
  const t = dict.admin;
  return (
    <main id="contenu" className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.pageHead}>
          <span className={styles.loginLogo} aria-label={dict.site.name}>
            <span className={styles.loginLogoMark}>INTERACT</span>
            <span>RECORD</span>
            <span className={styles.brandTag}>{t.brand}</span>
          </span>
          <h1 className={styles.pageTitle}>{t.login.title}</h1>
          <p className={styles.pageSubtitle}>{t.login.subtitle}</p>
        </div>
        <LoginForm t={t} suite={typeof suite === 'string' ? safeAdminPath(suite) : ''} />
      </div>
    </main>
  );
}
