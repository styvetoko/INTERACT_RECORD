import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { getI18n } from '@/i18n/server';
import { getCurrentAdmin } from '@/lib/admin/current';
import { homeFor } from '@/lib/admin/permissions';

/** Accueil du back-office : la première section permise par le rôle. */
export default async function AdminHome() {
  const [{ dict }, me] = await Promise.all([getI18n(), getCurrentAdmin()]);
  const home = homeFor(me.roles);
  if (home) redirect(home);
  return <EmptyState title={dict.admin.home.noToolsTitle} body={dict.admin.home.noToolsBody} />;
}
