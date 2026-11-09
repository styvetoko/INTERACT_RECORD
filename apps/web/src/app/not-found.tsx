import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { Footer, Header } from '@/components/Header';
import buttons from '@/components/Button.module.css';
import { getI18n } from '@/i18n/server';

export default async function NotFound() {
  const { dict, locale } = await getI18n();
  return (
    <>
      <Header dict={dict} locale={locale} currentPath="/" />
      <main id="contenu" className="container" style={{ paddingTop: 'var(--space-16)' }}>
        <EmptyState
          title={dict.notFound.title}
          body={dict.notFound.body}
          action={<Link href="/" className={`${buttons.button} ${buttons.primary}`}>{dict.notFound.cta}</Link>}
        />
      </main>
      <Footer dict={dict} />
    </>
  );
}
