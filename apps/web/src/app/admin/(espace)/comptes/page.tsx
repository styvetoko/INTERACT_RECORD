import Link from 'next/link';
import buttons from '@/components/Button.module.css';
import { EmptyState } from '@/components/EmptyState';
import { getI18n } from '@/i18n/server';
import { AdminApiError, adminApi, type UserRow } from '@/lib/admin/admin-api';
import { getCurrentAdmin } from '@/lib/admin/current';
import { errorKey } from '@/lib/admin/errors';
import { formatDate, param, withCursor } from '@/lib/admin/format';
import { can, INTERNAL_ROLES } from '@/lib/admin/permissions';
import type { Page } from '@/lib/api';
import { RoleChips, StatusChip } from '../../_components/Chips';
import { Forbidden } from '../../_components/Forbidden';
import styles from '../../admin.module.css';

const STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETION_PENDING'] as const;
const ROLES = [...INTERNAL_ROLES, 'ARTIST', 'MANAGER', 'FAN'] as const;

type Search = Promise<Record<string, string | string[] | undefined>>;

/** ADM-01 : recherche de comptes par numéro ou par nom, filtres statut et rôle. */
export default async function UsersPage({ searchParams }: { searchParams: Search }) {
  const [{ dict, locale }, me, sp] = await Promise.all([getI18n(), getCurrentAdmin(), searchParams]);
  const t = dict.admin;
  if (!can(me.roles, 'users.search')) return <Forbidden t={t} />;

  const filters = {
    q: param(sp.q, 60),
    status: STATUSES.find((s) => s === sp.status),
    role: ROLES.find((r) => r === sp.role),
  };
  const cursor = param(sp.cursor, 200);

  let page: Page<UserRow> | null = null;
  let failure: string | null = null;
  try {
    page = await adminApi.searchUsers({ ...filters, cursor });
  } catch (e) {
    if (!(e instanceof AdminApiError)) throw e;
    failure = t.errors[errorKey(e.code)];
  }
  const cols = t.users.columns;

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t.users.title}</h1>
        <p className={styles.pageSubtitle}>{t.users.subtitle}</p>
      </div>

      <form method="get" className={styles.filters} role="search">
        <div className={styles.field}>
          <label htmlFor="q" className={styles.label}>{t.users.searchLabel}</label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder={t.users.searchPlaceholder} maxLength={60} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor="status" className={styles.label}>{t.users.statusFilter}</label>
          <select id="status" name="status" defaultValue={filters.status ?? ''} className={styles.select}>
            <option value="">{t.common.all}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t.status[s]}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="role" className={styles.label}>{t.users.roleFilter}</label>
          <select id="role" name="role" defaultValue={filters.role ?? ''} className={styles.select}>
            <option value="">{t.common.all}</option>
            {ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
          </select>
        </div>
        <div className={styles.filterActions}>
          <button type="submit" className={`${buttons.button} ${buttons.primary}`}>{t.common.search}</button>
          <Link href="/admin/comptes" prefetch={false} className={`${buttons.button} ${buttons.ghost}`}>{t.common.reset}</Link>
        </div>
      </form>

      {failure && <EmptyState title={t.common.errorTitle} body={failure} />}
      {page && page.items.length === 0 && <EmptyState title={t.users.emptyTitle} body={t.users.emptyBody} />}
      {page && page.items.length > 0 && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{cols.name}</th>
                  <th scope="col">{cols.phone}</th>
                  <th scope="col">{cols.city}</th>
                  <th scope="col">{cols.roles}</th>
                  <th scope="col">{cols.status}</th>
                  <th scope="col">{cols.createdAt}</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((u) => (
                  <tr key={u.id}>
                    <td data-label={cols.name}>
                      {can(me.roles, 'users.view') ? (
                        <Link href={`/admin/comptes/${u.id}`} prefetch={false} className={styles.rowLink}>{u.displayName ?? t.unnamed}</Link>
                      ) : (u.displayName ?? t.unnamed)}
                    </td>
                    <td data-label={cols.phone} className={styles.mono}>{u.phone}</td>
                    <td data-label={cols.city}>{u.city ?? '—'}</td>
                    <td data-label={cols.roles}><RoleChips t={t} roles={u.roles} /></td>
                    <td data-label={cols.status}><StatusChip t={t} status={u.status} /></td>
                    <td data-label={cols.createdAt}>{formatDate(u.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pager}>
            {cursor && <Link href={withCursor('/admin/comptes', filters)} prefetch={false} className={`${buttons.button} ${buttons.ghost}`}>{t.common.first}</Link>}
            {page.nextCursor && (
              <Link href={withCursor('/admin/comptes', filters, page.nextCursor)} prefetch={false} className={`${buttons.button} ${buttons.secondary}`}>
                {t.common.next}
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
