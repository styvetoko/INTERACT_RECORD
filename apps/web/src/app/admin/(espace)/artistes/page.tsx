import Link from 'next/link';
import buttons from '@/components/Button.module.css';
import { EmptyState } from '@/components/EmptyState';
import { getI18n } from '@/i18n/server';
import { AdminApiError, adminApi } from '@/lib/admin/admin-api';
import { getCurrentAdmin } from '@/lib/admin/current';
import { errorKey } from '@/lib/admin/errors';
import { param, withCursor } from '@/lib/admin/format';
import { can } from '@/lib/admin/permissions';
import type { ArtistCard, Page } from '@/lib/api';
import { Forbidden } from '../../_components/Forbidden';
import styles from '../../admin.module.css';

/** ACC-06 : trouver un artiste pour attribuer ou retirer le badge vérifié. */
export default async function ArtistsAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ dict }, me, sp] = await Promise.all([getI18n(), getCurrentAdmin(), searchParams]);
  const t = dict.admin;
  if (!can(me.roles, 'artists.verify')) return <Forbidden t={t} />;

  const filters = { q: param(sp.q, 60) };
  const cursor = param(sp.cursor, 200);
  let page: Page<ArtistCard> | null = null;
  let failure: string | null = null;
  try {
    page = await adminApi.artists({ ...filters, cursor });
  } catch (e) {
    if (!(e instanceof AdminApiError)) throw e;
    failure = t.errors[errorKey(e.code)];
  }

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t.artists.title}</h1>
        <p className={styles.pageSubtitle}>{t.artists.subtitle}</p>
      </div>

      <form method="get" className={styles.filters} role="search">
        <div className={styles.field}>
          <label htmlFor="q" className={styles.label}>{t.artists.searchLabel}</label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder={t.artists.searchPlaceholder} maxLength={60} className={styles.input} />
        </div>
        <div className={styles.filterActions}>
          <button type="submit" className={`${buttons.button} ${buttons.primary}`}>{t.common.search}</button>
          <Link href="/admin/artistes" prefetch={false} className={`${buttons.button} ${buttons.ghost}`}>{t.common.reset}</Link>
        </div>
      </form>

      {failure && <EmptyState title={t.common.errorTitle} body={failure} />}
      {page && page.items.length === 0 && <EmptyState title={t.artists.emptyTitle} body={t.artists.emptyBody} />}
      {page && page.items.length > 0 && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t.artists.searchLabel}</th>
                  <th scope="col">{t.artists.city}</th>
                  <th scope="col">{t.artists.disciplines}</th>
                  <th scope="col">{t.artists.verifyTitle}</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((a) => (
                  <tr key={a.id}>
                    <td data-label={t.artists.searchLabel}>
                      <Link href={`/admin/artistes/${a.slug}`} prefetch={false} className={styles.rowLink}>{a.stageName}</Link>
                    </td>
                    <td data-label={t.artists.city}>{a.city}</td>
                    <td data-label={t.artists.disciplines}>{a.disciplines.join(', ')}</td>
                    <td data-label={t.artists.verifyTitle}>
                      <span className={`${styles.chip} ${a.verified ? styles.staff : ''}`}>{a.verified ? t.artists.verified : t.artists.notVerified}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pager}>
            {cursor && <Link href={withCursor('/admin/artistes', filters)} prefetch={false} className={`${buttons.button} ${buttons.ghost}`}>{t.common.first}</Link>}
            {page.nextCursor && (
              <Link href={withCursor('/admin/artistes', filters, page.nextCursor)} prefetch={false} className={`${buttons.button} ${buttons.secondary}`}>
                {t.common.next}
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
