'use client';

import { useState } from 'react';
import { IconCheck, IconCopy, IconDownload } from './icons';
import buttons from './Button.module.css';
import styles from './Panel.module.css';

interface Props {
  url: string;
  qrUrl: string;
  fileName: string;
  labels: { title: string; copy: string; copied: string; qrAlt: string; download: string; hint: string };
}

/** PRO-04 : lien de partage et QR code imprimable. */
export function ShareCard({ url, qrUrl, fileName, labels }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt(labels.copy, url);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="share-title">
      <h2 id="share-title" className={styles.title}>{labels.title}</h2>
      <img className={styles.qr} src={qrUrl} alt={labels.qrAlt} width={200} height={200} loading="lazy" />
      <p className={styles.muted} style={{ textAlign: 'center' }}>{labels.hint}</p>
      <div className={styles.actions}>
        <button type="button" onClick={copy} className={`${buttons.button} ${buttons.secondary} ${buttons.block}`}>
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? labels.copied : labels.copy}
        </button>
        <a href={qrUrl} download={fileName} className={`${buttons.button} ${buttons.ghost} ${buttons.block}`}>
          <IconDownload />
          {labels.download}
        </a>
      </div>
      <p className={styles.status} aria-live="polite">{copied ? labels.copied : ''}</p>
    </section>
  );
}
