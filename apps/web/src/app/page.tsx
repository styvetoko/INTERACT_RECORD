import { ArtistCard } from '@/components/ArtistCard';
import { EmptyState } from '@/components/EmptyState';
import { Footer, Header } from '@/components/Header';
import { plural } from '@/i18n/dictionary';
import { getI18n } from '@/i18n/server';
import { api, ApiUnavailableError, type ArtistCard as Card, type Discipline } from '@/lib/api';
import { localized } from '@/lib/format';
import styles from './page.module.css';

export const revalidate = 60;

const KNOWN = new Set(['musique', 'humour', 'danse', 'peinture']);

async function loadSections(): Promise<{ discipline: Discipline; artists: Card[] }[] | null> {
  try {
    const disciplines = await api.disciplines();
    const pages = await Promise.all(disciplines.map((d) => api.artists({ discipline: d.slug, limit: 12 })));
    return disciplines.map((discipline, i) => ({ discipline, artists: pages[i].items }));
  } catch (e) {
    if (e instanceof ApiUnavailableError) return null;
    throw e;
  }
}

export default async function HomePage() {
  const { dict, locale } = await getI18n();
  const sections = await loadSections();
  const filled = sections?.filter((s) => s.artists.length > 0) ?? [];

  return (
    <>
      <Header dict={dict} locale={locale} currentPath="/" />
      <main id="contenu" className="container">
        <section className={styles.hero}>
          <p className={`${styles.eyebrow} rise`}>{dict.home.eyebrow}</p>
          <h1 className={`${styles.title} rise`} style={{ ['--rise-index' as string]: 1 }}>{dict.home.title}</h1>
          <p className={`${styles.subtitle} rise`} style={{ ['--rise-index' as string]: 2 }}>{dict.home.subtitle}</p>
        </section>

        {sections === null && <EmptyState title={dict.home.unavailableTitle} body={dict.home.unavailableBody} />}
        {sections !== null && filled.length === 0 && <EmptyState title={dict.home.emptyTitle} body={dict.home.emptyBody} />}

        {filled.map(({ discipline, artists }) => (
          <section key={discipline.slug} className={styles.section} aria-labelledby={`section-${discipline.slug}`}>
            <div className={styles.sectionHead}>
              <h2 id={`section-${discipline.slug}`} className={styles.sectionTitle}>
                <span
                  className={styles.sectionDot}
                  aria-hidden="true"
                  style={{ ['--chip-color' as string]: `var(--color-discipline-${KNOWN.has(discipline.slug) ? discipline.slug : 'autre'})` }}
                />
                {localized(discipline, locale)}
              </h2>
              <span className={styles.count}>{plural(dict.home.sectionCount, artists.length, locale)}</span>
            </div>
            <div className={styles.grid}>
              {artists.map((artist, i) => (
                <ArtistCard key={artist.id} artist={artist} verifiedLabel={dict.artist.verified} index={i} />
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer dict={dict} />
    </>
  );
}
