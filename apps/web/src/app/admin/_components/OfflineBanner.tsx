'use client';

import { useSyncExternalStore } from 'react';
import styles from '../admin.module.css';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** État hors-ligne : ce qui reste disponible est dit clairement. */
export function OfflineBanner({ text }: { text: string }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return <p role="status" className={styles.offline}>{text}</p>;
}
