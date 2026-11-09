import { IconVerified } from './icons';

/** Badge « artiste vérifié » (ACC-06), lisible par les lecteurs d'écran. */
export function VerifiedBadge({ label, size = 22 }: { label: string; size?: number }) {
  return (
    <span role="img" aria-label={label} title={label} style={{ display: 'inline-flex', color: 'var(--color-brand-gold)' }}>
      <IconVerified width={size} height={size} />
    </span>
  );
}
