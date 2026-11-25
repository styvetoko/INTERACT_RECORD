'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconGlobe } from '@/components/icons';
import styles from '../admin.module.css';

/** Menu du back-office : seulement les sections permises par le rôle. Pas de préchargement (ADR-0009). */
export function AdminNav({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={styles.nav}>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} prefetch={false} className={styles.navLink} aria-current={active ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Changement de langue qui revient sur la page en cours. */
export function AdminLangLink({ to, label, text }: { to: 'fr' | 'en'; label: string; text: string }) {
  const pathname = usePathname();
  return (
    <a
      href={`/lang?to=${to}&back=${encodeURIComponent(pathname)}`} hrefLang={to} lang={to}
      aria-label={label} rel="nofollow" className={styles.navLink}
    >
      <IconGlobe />
      {text}
    </a>
  );
}
