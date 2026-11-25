'use client';

import { useEffect, useState } from 'react';
import buttons from '@/components/Button.module.css';
import { EmptyState } from '@/components/EmptyState';
import en from '@/i18n/en.json';
import fr from '@/i18n/fr.json';

/** Erreur d'une page du back-office : explication et bouton pour réessayer, sans détail technique. */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  const [t, setT] = useState(fr.admin);
  useEffect(() => {
    if (document.documentElement.lang === 'en') setT(en.admin);
  }, []);
  return (
    <EmptyState
      title={t.common.errorTitle}
      body={t.common.errorBody}
      action={<button type="button" onClick={reset} className={`${buttons.button} ${buttons.primary}`}>{t.common.retry}</button>}
    />
  );
}
