import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookingCard } from '@/components/BookingCard';
import { DisciplineChip } from '@/components/DisciplineChip';
import { Footer, Header } from '@/components/Header';
import { IconPin, IconUsers } from '@/components/icons';
import { Initials } from '@/components/Initials';
import { ResponsiveImage } from '@/components/ResponsiveImage';
import { ShareCard } from '@/components/ShareCard';
import { SocialLinks } from '@/components/SocialLinks';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import panel from '@/components/Panel.module.css';
import { plural, t } from '@/i18n/dictionary';
import { getI18n } from '@/i18n/server';
import { api, type ArtistPublic } from '@/lib/api';
import { formatMonthYear, localized, pickBio, pickVariant } from '@/lib/format';
import styles from './page.module.css';

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [artist, { locale }] = await Promise.all([api.artist(slug), getI18n()]);
  if (!artist) return {};
  const description = artist.tagline ?? pickBio(artist, locale)?.slice(0, 160) ?? undefined;
  const image = artist.banner ? pickVariant(artist.banner, 1200) : artist.avatar ? pickVariant(artist.avatar, 512) : undefined;
  return {
    title: artist.stageName,
    description,
    alternates: { canonical: `/${artist.slug}` },
    openGraph: {
      title: artist.stageName,
      description,
      url: `/${artist.slug}`,
      type: 'profile',
      images: image ? [{ url: image.url, width: image.width, height: image.height, alt: artist.stageName }] : undefined,
    },
    twitter: { card: artist.banner ? 'summary_large_image' : 'summary', title: artist.stageName, description },
  };
}

/** Données structurées pour les moteurs de recherche (schema.org). Le « < » est échappé contre l'injection. */
function structuredData(artist: ArtistPublic) {
  const isMusic = artist.disciplines.some((d) => d.slug === 'musique');
  const type = artist.type === 'COLLECTIVE' ? (isMusic ? 'MusicGroup' : 'PerformingGroup') : isMusic ? 'MusicGroup' : 'Person';
  const data = {
    '@context': 'https://schema.org',
    '@type': type,
    name: artist.stageName,
    url: artist.shareUrl,
    description: artist.tagline ?? undefined,
    image: artist.avatar ? pickVariant(artist.avatar, 512).url : undefined,
    address: { '@type': 'PostalAddress', addressLocality: artist.city, addressCountry: artist.country },
    sameAs: Object.values(artist.socialLinks),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default async function ArtistPage({ params }: Params) {
  const { slug } = await params;
  const [{ dict, locale }, artist, serviceTypes] = await Promise.all([getI18n(), api.artist(slug), api.serviceTypes()]);
  if (!artist) notFound();

  const bio = pickBio(artist, locale);
  const categoriesByDiscipline = (d: string) => artist.categories.filter((c) => c.discipline === d);

  return (
    <>
      <Header dict={dict} locale={locale} currentPath={`/${artist.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(artist) }} />
      <main id="contenu">
        <div className={styles.banner}>
          {artist.banner ? (
            <ResponsiveImage image={artist.banner} alt="" sizes="100vw" priority />
          ) : (
            <div className={styles.bannerEmpty} />
          )}
        </div>

        <div className="container">
          <header className={`${styles.identity} rise`}>
            <div className={styles.avatar}>
              {artist.avatar ? (
                <ResponsiveImage image={artist.avatar} alt={artist.stageName} sizes="168px" priority />
              ) : (
                <Initials name={artist.stageName} size="var(--text-5xl)" />
              )}
            </div>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{artist.stageName}</h1>
                {artist.verified && <VerifiedBadge label={dict.artist.verified} size={28} />}
              </div>
              {artist.tagline && <p className={styles.tagline}>{artist.tagline}</p>}
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <IconPin width={16} height={16} />
                  {artist.city}
                </span>
                {artist.type === 'COLLECTIVE' && (
                  <span className={styles.metaItem}>
                    <IconUsers width={16} height={16} />
                    {dict.artist.collective}
                    {artist.memberCount > 1 && ` · ${plural(dict.artist.members, artist.memberCount, locale)}`}
                  </span>
                )}
              </div>
              <div className={styles.chips}>
                {artist.disciplines.map((d) => (
                  <DisciplineChip key={d.slug} slug={d.slug} label={localized(d, locale)} />
                ))}
                {artist.disciplines.flatMap((d) =>
                  categoriesByDiscipline(d.slug).map((c) => (
                    <span key={`${d.slug}/${c.slug}`} className={panel.pill}>{localized(c, locale)}</span>
                  )),
                )}
              </div>
            </div>
          </header>

          <div className={styles.layout}>
            <div className={styles.main}>
              <section className={`${panel.panel} rise`} style={{ ['--rise-index' as string]: 1 }} aria-labelledby="about-title">
                <h2 id="about-title" className={panel.title}>{dict.artist.about}</h2>
                <p className={styles.bio}>{bio ?? dict.artist.noBio}</p>
                <p className={styles.since}>{t(dict.artist.since, { date: formatMonthYear(artist.createdAt, locale) })}</p>
              </section>
              <SocialLinks links={artist.socialLinks} title={dict.artist.links} websiteLabel={dict.artist.website} />
            </div>
            <aside className={styles.aside}>
              <BookingCard booking={artist.booking} serviceTypes={serviceTypes} dict={dict} locale={locale} />
              <ShareCard
                url={artist.shareUrl}
                qrUrl={api.qrUrl(artist.slug)}
                fileName={`interact-stage-${artist.slug}.svg`}
                labels={{ ...dict.artist.share, qrAlt: t(dict.artist.share.qrAlt, { name: artist.stageName }) }}
              />
            </aside>
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </>
  );
}
