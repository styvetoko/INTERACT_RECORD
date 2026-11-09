'use client';

import { useEffect, useState } from 'react';
import buttons from '@/components/Button.module.css';
import { EmptyState } from '@/components/EmptyState';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';

/** Erreur inattendue : message clair et bouton pour réessayer, jamais de détail technique. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const [dict, setDict] = useState(fr);
  useEffect(() => {
    if (document.documentElement.lang === 'en') setDict(en);
  }, []);
  return (
    <main id="contenu" className="container" style={{ paddingTop: 'var(--space-16)' }}>
      <EmptyState
        title={dict.error.title}
        body={dict.error.body}
        action={<button type="button" onClick={reset} className={`${buttons.button} ${buttons.primary}`}>{dict.error.retry}</button>}
      />
    </main>
  );
}
