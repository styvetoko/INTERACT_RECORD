/** Icônes au trait, 24 × 24, couleur héritée du texte. Décoratives par défaut (aria-hidden). */
import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true, focusable: false, ...props,
});

export const IconVerified = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} viewBox="0 0 24 24" stroke="none" fill="currentColor">
    <path d="M12 1.75l2.6 1.9 3.2-.2 1 3.06 2.6 1.88-1 3.06 1 3.06-2.6 1.88-1 3.06-3.2-.2L12 22.25l-2.6-1.9-3.2.2-1-3.06-2.6-1.88 1-3.06-1-3.06 2.6-1.88 1-3.06 3.2.2z" />
    <path d="M8.3 12.2l2.5 2.5 4.9-5.1" fill="none" stroke="var(--color-brand-on-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
);
export const IconArrowUpRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 17L17 7M9 7h8v8" /></svg>
);
export const IconCopy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></svg>
);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0111 0M16 5.2a3.2 3.2 0 010 5.6M17.5 13.7A5.5 5.5 0 0120.5 19" /></svg>
);
export const IconGlobe = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>
);
export const IconSparkle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
);
