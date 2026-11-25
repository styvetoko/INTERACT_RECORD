import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { getI18n } from '@/i18n/server';
import { AdminApiError, adminApi } from '@/lib/admin/admin-api';
import { getCurrentAdmin } from '@/lib/admin/current';
import { errorKey } from '@/lib/admin/errors';
import { formatDate } from '@/lib/admin/format';
import { can } from '@/lib/admin/permissions';
import type { ArtistPublic } from '@/lib/api';
import { localized } from '@/lib/format';
import { verificationAction } from '../../../actions';
import { Forbidden } from '../../../_components/Forbidden';
import { ReasonForm } from '../../../_components/ReasonForm';
import styles from '../../../admin.module.css';

/** ACC-06 : attribuer ou retirer le badge « artiste vérifié », avec un motif tracé. */
export default async function ArtistAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ dict, locale }, me, { slug }] = await Promise.all([getI18n(), getCurrentAdmin(), params]);
  const t = dict.admin;
  if (!can(me.roles, 'artists.verify')) return <Forbidden t={t} />;
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) notFound();

  let artist: ArtistPublic;
  try {
    artist = await adminApi.artist(slug);
  } catch (e) {
    if (!(e instanceof AdminApiError)) throw e;
    if (e.status === 404) notFound();
    return <EmptyState title={t.common.errorTitle} body={t.errors[errorKey(e.code)]} />;
  }

  return (
    <>
      <div className={styles.pageHead}>
        <Link href="/admin/artistes" prefetch={false} className={styles.backLink}><span aria-hidden="true">←</span> {t.common.back}</Link>
        <h1 className={styles.pageTitle}>{artist.stageName}</h1>
        <div className={styles.chips}>
          <span className={`${styles.chip} ${artist.verified ? styles.staff : ''}`}>{artist.verified ? t.artists.verified : t.artists.notVerified}</span>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <section className={styles.card} aria-labelledby="artist-title">
          <h2 id="artist-title" className={styles.cardTitle}>{t.users.detail.identity}</h2>
          <dl className={styles.facts}>
            <dt>{t.artists.city}</dt><dd>{artist.city}</dd>
            <dt>{t.artists.disciplines}</dt><dd>{artist.disciplines.map((d) => localized(d, locale)).join(', ')}</dd>
            <dt>{t.users.detail.createdAt}</dt><dd>{formatDate(artist.createdAt, locale)}</dd>
          </dl>
          <a href={`/${artist.slug}`} target="_blank" rel="noopener" className={styles.rowLink}>{t.artists.openPublic}</a>
        </section>

        {/* Pas de « key » ici : le formulaire doit garder son message de succès après le rafraîchissement. */}
        <ReasonForm
          id="verification"
          t={t}
          action={verificationAction}
          fields={{ slug: artist.slug, verified: String(!artist.verified) }}
          title={t.artists.verifyTitle}
          body={t.artists.verifyBody}
          cta={artist.verified ? t.artists.unverifyCta : t.artists.verifyCta}
          tone={artist.verified ? 'secondary' : 'primary'}
        />
      </div>
    </>
  );
}
