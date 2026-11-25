import { getI18n } from '@/i18n/server';
import { PageSkeleton } from '../_components/Skeleton';

export default async function Loading() {
  const { dict } = await getI18n();
  return <PageSkeleton label={dict.admin.common.loading} />;
}
