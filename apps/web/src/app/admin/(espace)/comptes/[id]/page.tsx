import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { plural, t as fill } from '@/i18n/dictionary';
import { getI18n } from '@/i18n/server';
import { AdminApiError, adminApi, type UserDetail } from '@/lib/admin/admin-api';
import { getCurrentAdmin } from '@/lib/admin/current';
import { errorKey } from '@/lib/admin/errors';
import { formatDate } from '@/lib/admin/format';
import { can, isInternalRole } from '@/lib/admin/permissions';
import { suspensionAction } from '../../../actions';
import { RoleChips, StatusChip } from '../../../_components/Chips';
import { Forbidden } from '../../../_components/Forbidden';
import { ReasonForm } from '../../../_components/ReasonForm';
import { RolesForm } from '../../../_components/RolesForm';
import styles from '../../../admin.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fiche d'un compte (ADM-01) : la consultation est tracée par l'API dans le journal d'audit. */
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ dict, locale }, me, { id }] = await Promise.all([getI18n(), getCurrentAdmin(), params]);
  const t = dict.admin;
  if (!can(me.roles, 'users.view')) return <Forbidden t={t} />;
  if (!UUID.test(id)) notFound();

  let user: UserDetail;
  try {
    user = await adminApi.user(id);
  } catch (e) {
    if (!(e instanceof AdminApiError)) throw e;
    if (e.code === 'USER_NOT_FOUND') notFound();
    return <EmptyState title={t.common.errorTitle} body={t.errors[errorKey(e.code)]} />;
  }

  const d = t.users.detail;
  const empty = <span className={styles.hint}>{d.empty}</span>;
  const suspended = user.status === 'SUSPENDED';
  const isSelf = user.id === me.id;
  const staffTarget = user.roles.some(isInternalRole);
  const canSuspend = can(me.roles, 'users.suspend') && !isSelf && (!staffTarget || me.roles.includes('ADMIN'));

  return (
    <>
      <div className={styles.pageHead}>
        <Link href="/admin/comptes" prefetch={false} className={styles.backLink}><span aria-hidden="true">←</span> {t.common.back}</Link>
        <h1 className={styles.pageTitle}>{user.displayName ?? t.unnamed}</h1>
        <div className={styles.chips}>
          <StatusChip t={t} status={user.status} />
          <RoleChips t={t} roles={user.roles} />
        </div>
      </div>

      <p className={`${styles.notice} ${styles.spaced}`}>{t.users.viewNotice}</p>

      <div className={styles.detailGrid}>
        <div className={styles.stack}>
          <section className={styles.card} aria-labelledby="identity-title">
            <h2 id="identity-title" className={styles.cardTitle}>{d.identity}</h2>
            <dl className={styles.facts}>
              <dt>{d.phone}</dt><dd className={styles.mono}>{user.phone}</dd>
              <dt>{d.email}</dt><dd>{user.email ?? empty}</dd>
              <dt>{d.city}</dt><dd>{user.city ?? empty}</dd>
              <dt>{d.country}</dt><dd>{user.country}</dd>
              <dt>{d.language}</dt><dd>{d.languages[user.locale]}</dd>
              <dt>{d.createdAt}</dt><dd>{formatDate(user.createdAt, locale)}</dd>
              <dt>{d.kyc}</dt><dd>{fill(d.kycLevel, { level: user.kycLevel })}</dd>
              <dt>{d.pin}</dt><dd>{user.hasPin ? d.pinSet : d.pinUnset}</dd>
              <dt>{d.devices}</dt><dd>{plural(d.sessions, user.activeSessions, locale)}</dd>
            </dl>
            {user.deletionRequestedAt && (
              <p className={styles.notice}>{fill(d.deletion, { date: formatDate(user.deletionRequestedAt, locale) })}</p>
            )}
            {suspended && user.suspendedReason && (
              <dl className={styles.facts}>
                <dt>{d.suspendedReason}</dt><dd>{user.suspendedReason}</dd>
              </dl>
            )}
          </section>

          <section className={styles.card} aria-labelledby="artists-title">
            <h2 id="artists-title" className={styles.cardTitle}>{d.artists}</h2>
            {user.artists.length === 0 ? (
              <p className={styles.cardBody}>{d.noArtists}</p>
            ) : (
              <ul className={`${styles.stack} ${styles.plainList}`}>
                {user.artists.map((a) => (
                  <li key={a.slug} className={styles.chips}>
                    <Link href={`/admin/artistes/${a.slug}`} prefetch={false} className={styles.rowLink}>{a.stageName}</Link>
                    <span className={styles.chip}>{d.memberRole[a.memberRole as keyof typeof d.memberRole] ?? a.memberRole}</span>
                    <span className={`${styles.chip} ${a.verified ? styles.staff : ''}`}>{a.verified ? t.artists.verified : t.artists.notVerified}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className={styles.stack}>
          {canSuspend && (
            <ReasonForm
              id="suspension"
              t={t}
              action={suspensionAction}
              fields={{ id: user.id, intent: suspended ? 'reactivate' : 'suspend' }}
              title={suspended ? t.users.suspension.reactivateTitle : t.users.suspension.suspendTitle}
              body={suspended ? t.users.suspension.reactivateBody : t.users.suspension.suspendBody}
              cta={suspended ? t.users.suspension.reactivateCta : t.users.suspension.suspendCta}
              tone={suspended ? 'primary' : 'danger'}
            />
          )}
          {can(me.roles, 'users.roles') && (
            <RolesForm t={t} userId={user.id} current={user.roles} />
          )}
        </div>
      </div>
    </>
  );
}
