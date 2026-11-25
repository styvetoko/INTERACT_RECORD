import { EmptyState } from '@/components/EmptyState';
import type { Dictionary } from '@/i18n/dictionary';

export function Forbidden({ t }: { t: Dictionary['admin'] }) {
  return <EmptyState title={t.forbidden.title} body={t.forbidden.body} />;
}
