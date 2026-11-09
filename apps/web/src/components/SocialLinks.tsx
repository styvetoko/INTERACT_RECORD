import type { ArtistPublic, SocialNetwork } from '@/lib/api';
import { IconArrowUpRight } from './icons';
import styles from './Panel.module.css';

const LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', x: 'X', spotify: 'Spotify', website: '',
};
const ORDER: SocialNetwork[] = ['instagram', 'tiktok', 'youtube', 'spotify', 'facebook', 'x', 'website'];

export function SocialLinks({ links, title, websiteLabel }: { links: ArtistPublic['socialLinks']; title: string; websiteLabel: string }) {
  const present = ORDER.filter((n) => links[n]);
  if (!present.length) return null;
  return (
    <section className={styles.panel} aria-labelledby="links-title">
      <h2 id="links-title" className={styles.label}>{title}</h2>
      <ul className={styles.links} role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {present.map((network) => (
          <li key={network}>
            <a className={styles.link} href={links[network]} target="_blank" rel="noopener noreferrer nofollow ugc">
              {network === 'website' ? websiteLabel : LABELS[network]}
              <IconArrowUpRight width={16} height={16} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
