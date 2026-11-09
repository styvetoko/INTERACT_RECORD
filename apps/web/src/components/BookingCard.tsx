import type { Dictionary, Locale } from '@/i18n/dictionary';
import { t } from '@/i18n/dictionary';
import type { ArtistPublic, ServiceType } from '@/lib/api';
import { formatXaf, localizedLabel } from '@/lib/format';
import buttons from './Button.module.css';
import styles from './Panel.module.css';

interface Props {
  booking: ArtistPublic['booking'];
  serviceTypes: ServiceType[];
  dict: Dictionary;
  locale: Locale;
}

/** Fiche booking publique (PRO-06). La demande en ligne arrive avec le module booking (BOO-03). */
export function BookingCard({ booking, serviceTypes, dict, locale }: Props) {
  const b = dict.artist.booking;
  if (!booking) {
    return (
      <section className={styles.panel} aria-labelledby="booking-title">
        <h2 id="booking-title" className={styles.title}>{b.title}</h2>
        <p className={styles.muted}>{b.notBookable}</p>
      </section>
    );
  }
  const labels = new Map(serviceTypes.map((s) => [s.value, localizedLabel(s, locale)]));
  const { priceMinXaf: min, priceMaxXaf: max } = booking;
  return (
    <section className={styles.panel} aria-labelledby="booking-title">
      <h2 id="booking-title" className={styles.title}>{b.title}</h2>
      {min !== null && (
        <div className={styles.row}>
          {(max === null || max === min) && <span className={styles.label}>{b.from}</span>}
          <span className={styles.price}>
            {max !== null && max !== min
              ? t(b.range, { min: formatXaf(min, locale), max: formatXaf(max, locale) })
              : formatXaf(min, locale)}
          </span>
        </div>
      )}
      {booking.serviceTypes.length > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>{b.services}</span>
          <div className={styles.pills}>
            {booking.serviceTypes.map((s) => (
              <span key={s} className={styles.pill}>{labels.get(s) ?? s}</span>
            ))}
          </div>
        </div>
      )}
      {booking.travelCities.length > 0 && (
        <div className={styles.row}>
          <span className={styles.label}>{b.travel}</span>
          <span>{booking.travelCities.join(' · ')}</span>
        </div>
      )}
      {booking.technicalRider && (
        <details className={styles.row}>
          <summary className={styles.summary}>{b.rider}</summary>
          <p className={styles.muted} style={{ whiteSpace: 'pre-line', marginTop: 'var(--space-2)' }}>{booking.technicalRider}</p>
        </details>
      )}
      <div className={styles.actions}>
        <button type="button" className={`${buttons.button} ${buttons.primary} ${buttons.block}`} aria-disabled="true" aria-describedby="booking-soon">
          {b.cta}
        </button>
        <p id="booking-soon" className={styles.muted} style={{ textAlign: 'center' }}>{b.soon}</p>
      </div>
    </section>
  );
}
