import styles from './DisciplineChip.module.css';

const KNOWN = new Set(['musique', 'humour', 'danse', 'peinture']);

/** Puce de discipline : la couleur de la discipline en petite touche, jamais en aplat. */
export function DisciplineChip({ slug, label }: { slug: string; label: string }) {
  const color = `var(--color-discipline-${KNOWN.has(slug) ? slug : 'autre'})`;
  return (
    <span className={styles.chip} style={{ ['--chip-color' as string]: color }}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}
