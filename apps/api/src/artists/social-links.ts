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

const linkFor = (network: SocialNetwork) =>
  z
    .string()
    .trim()
    .max(300)
    .url('lien invalide')
    .refine((value) => {
      const url = new URL(value);
      if (url.protocol !== 'https:') return false;
      const allowed = SOCIAL_NETWORKS[network];
      return allowed === null || hostMatches(url.hostname.toLowerCase(), allowed);
    }, `le lien doit commencer par https:// et mener à ${network}`)
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
