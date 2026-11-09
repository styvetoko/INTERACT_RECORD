import '@fontsource-variable/inter';
import '@fontsource-variable/unbounded';
import '@interact/design-tokens/tokens.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getI18n } from '@/i18n/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const { dict, locale } = await getI18n();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: dict.site.name, template: `%s · ${dict.site.name}` },
    description: dict.site.description,
    applicationName: dict.site.name,
    openGraph: { siteName: dict.site.name, locale: locale === 'fr' ? 'fr_CM' : 'en_CM', type: 'website' },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = {
  themeColor: '#0B0B0D',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, dict } = await getI18n();
  return (
    <html lang={locale} data-theme="dark">
      <body>
        <a className="skip-link" href="#contenu">{dict.site.skipToContent}</a>
        {children}
      </body>
    </html>
  );
}
