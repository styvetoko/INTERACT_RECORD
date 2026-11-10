import Link from 'next/link';
import type { Dictionary, Locale } from '@/i18n/dictionary';
import { IconGlobe } from './icons';
import styles from './Header.module.css';

export function Header({ dict, locale, currentPath }: { dict: Dictionary; locale: Locale; currentPath: string }) {
  const other = locale === 'fr' ? 'en' : 'fr';
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label={dict.site.name}>
          <span className={styles.logoMark}>INTERACT</span>
          <span className={styles.logoRecord}>RECORD</span>
        </Link>
        <a
          className={styles.lang}
          href={`/lang?to=${other}&back=${encodeURIComponent(currentPath)}`}
          hrefLang={other}
          lang={other}
          aria-label={dict.lang.label}
          rel="nofollow"
        >
          <IconGlobe />
          {dict.lang.switchTo}
        </a>
      </div>
    </header>
  );
}

export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer className={styles.footer}>
      <div className="container">{dict.footer.rights.replace('{year}', String(new Date().getFullYear()))}</div>
    </footer>
  );
}
