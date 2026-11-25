import type { ReactNode } from 'react';
import buttons from '@/components/Button.module.css';
import { EmptyState } from '@/components/EmptyState';
import { t as fill } from '@/i18n/dictionary';
import { getI18n } from '@/i18n/server';
import { getCurrentAdmin } from '@/lib/admin/current';
import { isStaff, sectionsFor } from '@/lib/admin/permissions';
import { logoutAction } from '../actions';
import { AdminLangLink, AdminNav } from '../_components/AdminNav';
import { OfflineBanner } from '../_components/OfflineBanner';
import styles from '../admin.module.css';

/** Coque du back-office : menu selon le rôle, compte connecté, langue, déconnexion. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { dict, locale } = await getI18n();
  const t = dict.admin;
  const me = await getCurrentAdmin();
  const staff = isStaff(me.roles);
  const links = sectionsFor(me.roles).map((s) => ({ href: s.href, label: t.nav[s.id] }));
  const other = locale === 'fr' ? 'en' : 'fr';

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={`container ${styles.topbarInner}`}>
          <span className={styles.brand}>
            INTERACT RECORD <span className={styles.brandTag}>{t.brand}</span>
          </span>
          {staff && <AdminNav label={t.nav.label} links={links} />}
          <div className={styles.account}>
            <span className={styles.who}>{fill(t.signedInAs, { name: me.displayName ?? t.unnamed })}</span>
            <AdminLangLink to={other} label={dict.lang.label} text={dict.lang.switchTo} />
            <form action={logoutAction}>
              <button type="submit" className={`${buttons.button} ${buttons.ghost}`}>{t.logout}</button>
            </form>
          </div>
        </div>
      </header>
      <OfflineBanner text={t.offline} />
      <main id="contenu" className={`container ${styles.main}`}>
        {staff ? children : <EmptyState title={t.forbidden.title} body={t.errors.ADMIN_ACCESS_DENIED} />}
      </main>
    </div>
  );
}
