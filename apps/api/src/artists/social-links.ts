import { z } from 'zod';

/** Réseaux acceptés et domaines autorisés pour chacun : un lien « Instagram » doit mener à Instagram. */
export const SOCIAL_NETWORKS = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'fb.com'],
  x: ['x.com', 'twitter.com'],
  spotify: ['open.spotify.com'],
  website: null,
} as const;

export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;

function hostMatches(host: string, allowed: readonly string[]): boolean {
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
}

const IP_HOST = /^(\d{1,3}(\.\d{1,3}){3}|\[.*\])$/;

/**
 * Lien sûr : https, sans identifiants ni port, sans caractères ambigus (espaces, contrôles, « \\ »),
 * vers le bon réseau. Pour un site web : un vrai nom de domaine public, pas une adresse IP.
 * Le lien est enregistré sous sa forme normalisée, celle que tous les navigateurs lisent pareil.
 */
function normalizeLink(value: string, network: SocialNetwork): string | null {
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const allowed = SOCIAL_NETWORKS[network];
  if (allowed === null) {
    if (IP_HOST.test(host) || !host.includes('.') || host.endsWith('.localhost') || host.endsWith('.local')) return null;
  } else if (!hostMatches(host, allowed)) {
    return null;
  }
  return url.href;
}

const linkFor = (network: SocialNetwork) =>
  z
    .string()
    .trim()
    .max(300)
    .transform((value, ctx) => {
      const normalized = normalizeLink(value, network);
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: `lien invalide : il doit commencer par https:// et mener à ${network}` });
        return z.NEVER;
      }
      return normalized;
    })
    .nullable()
    .optional();

/** Mise à jour partielle : une valeur null retire le lien. */
export const SocialLinksPatchSchema = z
  .object(Object.fromEntries(Object.keys(SOCIAL_NETWORKS).map((k) => [k, linkFor(k as SocialNetwork)])) as Record<SocialNetwork, ReturnType<typeof linkFor>>)
  .strict();

export type SocialLinks = Partial<Record<SocialNetwork, string>>;

export function mergeSocialLinks(current: unknown, patch: Partial<Record<SocialNetwork, string | null | undefined>>): SocialLinks {
  const result: SocialLinks = { ...(current as SocialLinks) };
  for (const [key, value] of Object.entries(patch) as [SocialNetwork, string | null | undefined][]) {
    if (value === undefined) continue;
    if (value === null) delete result[key];
    else result[key] = value;
  }
  return result;
}
