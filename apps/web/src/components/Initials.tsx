import styles from './Initials.module.css';

/** Remplaçant élégant quand l'artiste n'a pas encore de photo. */
export function Initials({ name, size }: { name: string; size: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className={styles.initials} style={{ fontSize: size }} aria-hidden="true">
      {letters}
    </span>
  );
}
