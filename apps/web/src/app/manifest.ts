import type { MetadataRoute } from 'next';
import { tokens } from '@interact/design-tokens/tokens.ts';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'INTERACT RECORD',
    short_name: 'INTERACT',
    description: 'La scène des artistes africains',
    start_url: '/',
    display: 'standalone',
    background_color: tokens.color.dark.bg,
    theme_color: tokens.color.dark.bg,
    lang: 'fr',
  };
}
