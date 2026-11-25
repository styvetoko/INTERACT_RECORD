import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getI18n } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  // Le back-office n'est jamais référencé (doublé de l'en-tête X-Robots-Tag du middleware).
  return { title: dict.admin.title, robots: { index: false, follow: false } };
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
