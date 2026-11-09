import Link from 'next/link';
import type { ArtistCard as Card } from '@/lib/api';
import { IconPin } from './icons';
import { Initials } from './Initials';
import { ResponsiveImage } from './ResponsiveImage';
import { VerifiedBadge } from './VerifiedBadge';
import styles from './ArtistCard.module.css';

export function ArtistCard({ artist, verifiedLabel, index = 0 }: { artist: Card; verifiedLabel: string; index?: number }) {
  return (
    <Link href={`/${artist.slug}`} className={`${styles.card} rise`} style={{ ['--rise-index' as string]: index }}>
      <span className={styles.media}>
        {artist.avatar ? (
          <ResponsiveImage image={artist.avatar} alt="" sizes="(min-width: 1024px) 220px, 45vw" />
        ) : (
          <Initials name={artist.stageName} size="var(--text-4xl)" />
        )}
      </span>
      <span>
        <span className={styles.name}>
          <span className={styles.nameText}>{artist.stageName}</span>
          {artist.verified && <VerifiedBadge label={verifiedLabel} size={18} />}
        </span>
        <span className={styles.meta}>
          <IconPin width={14} height={14} />
          {artist.city}
        </span>
      </span>
      {artist.tagline && <span className={styles.tagline}>{artist.tagline}</span>}
    </Link>
  );
}
