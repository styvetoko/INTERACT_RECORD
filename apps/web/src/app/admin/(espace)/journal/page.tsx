import Link from 'next/link';
import buttons from '@/components/Button.module.css';
import { EmptyState } from '@/components/EmptyState';
import { getI18n } from '@/i18n/server';
import { AdminApiError, adminApi, type AuditEntry } from '@/lib/admin/admin-api';
import { getCurrentAdmin } from '@/lib/admin/current';
import { errorKey } from '@/lib/admin/errors';
import { describeAuditData, formatDateTime, param, withCursor } from '@/lib/admin/format';
import { can } from '@/lib/admin/permissions';
import type { Page } from '@/lib/api';
import { Forbidden } from '../../_components/Forbidden';
import styles from '../../admin.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ADM-10 : consultation du journal d'audit, en lecture seule. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ dict, locale }, me, sp] = await Promise.all([getI18n(), getCurrentAdmin(), searchParams]);
  const t = dict.admin;
  if (!can(me.roles, 'audit.read')) return <Forbidden t={t} />;

  const actorId = param(sp.actorId, 36);
  const filters = {
    action: param(sp.action, 60),
    entityType: param(sp.entityType, 40),
    entityId: param(sp.entityId, 80),
    actorId: actorId && UUID.test(actorId) ? actorId : undefined,
  };
  const cursor = param(sp.cursor, 200);

  let page: Page<AuditEntry> | null = null;
  let failure: string | null = null;
  try {
    page = await adminApi.audit({ ...filters, cursor });
  } catch (e) {
    if (!(e instanceof AdminApiError)) throw e;
    failure = t.errors[errorKey(e.code)];
  }
  const f = t.audit.filters;
  const cols = t.audit.columns;

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t.audit.title}</h1>
        <p className={styles.pageSubtitle}>{t.audit.subtitle}</p>
      </div>

      <form method="get" className={styles.filters} role="search">
        {(['action', 'entityType', 'entityId', 'actorId'] as const).map((key) => (
          <div key={key} className={styles.field}>
            <label htmlFor={key} className={styles.label}>{f[key]}</label>
            <input id={key} name={key} type="search" defaultValue={filters[key]} maxLength={80} className={styles.input} />
          </div>
        ))}
        <div className={styles.filterActions}>
          <button type="submit" className={`${buttons.button} ${buttons.primary}`}>{t.common.search}</button>
          <Link href="/admin/journal" prefetch={false} className={`${buttons.button} ${buttons.ghost}`}>{t.common.reset}</Link>
        </div>
      </form>

      {failure && <EmptyState title={t.common.errorTitle} body={failure} />}
      {page && page.items.length === 0 && <EmptyState title={t.audit.emptyTitle} body={t.audit.emptyBody} />}
      {page && page.items.length > 0 && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{cols.date}</th>
                  <th scope="col">{cols.actor}</th>
                  <th scope="col">{cols.action}</th>
                  <th scope="col">{cols.entity}</th>
                  <th scope="col">{cols.details}</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((e) => (
                  <tr key={e.id}>
                    <td data-label={cols.date} className={styles.mono}>{formatDateTime(e.createdAt, locale)}</td>
                    <td data-label={cols.actor} className={styles.mono}>
                      {e.actorId ? (
                        <Link href={withCursor('/admin/journal', { actorId: e.actorId })} prefetch={false} className={styles.rowLink}>
                          {e.actorId.slice(0, 8)}
                        </Link>
                      ) : t.audit.system}
                    </td>
                    <td data-label={cols.action}><span className={styles.chip}>{e.action}</span></td>
                    <td data-label={cols.entity} className={styles.mono}>
                      {e.entityType === 'User' && e.entityId && can(me.roles, 'users.view') ? (
                        <Link href={`/admin/comptes/${e.entityId}`} prefetch={false} className={styles.rowLink}>{e.entityType} · {e.entityId.slice(0, 8)}</Link>
                      ) : `${e.entityType}${e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ''}`}
                    </td>
                    <td data-label={cols.details}><pre className={styles.details}>{describeAuditData(e.data)}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pager}>
            {cursor && <Link href={withCursor('/admin/journal', filters)} prefetch={false} className={`${buttons.button} ${buttons.ghost}`}>{t.common.first}</Link>}
            {page.nextCursor && (
              <Link href={withCursor('/admin/journal', filters, page.nextCursor)} prefetch={false} className={`${buttons.button} ${buttons.secondary}`}>
                {t.common.next}
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
