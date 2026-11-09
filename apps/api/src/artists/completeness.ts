/** Jauge de complétude du profil (parcours 7.2) : chaque élément a un poids, le total fait 100. */
export const COMPLETENESS_WEIGHTS = {
  avatar: 20,
  bio: 20,
  banner: 15,
  socialLinks: 15,
  tagline: 10,
  categories: 10,
  bookingProfile: 10,
} as const;

export type CompletenessItem = keyof typeof COMPLETENESS_WEIGHTS;

export interface CompletenessInput {
  hasAvatar: boolean;
  hasBanner: boolean;
  hasBio: boolean;
  hasTagline: boolean;
  categoryCount: number;
  socialLinkCount: number;
  hasBookingProfile: boolean;
}

export function computeCompleteness(i: CompletenessInput): { score: number; missing: CompletenessItem[] } {
  const done: Record<CompletenessItem, boolean> = {
    avatar: i.hasAvatar,
    bio: i.hasBio,
    banner: i.hasBanner,
    socialLinks: i.socialLinkCount > 0,
    tagline: i.hasTagline,
    categories: i.categoryCount > 0,
    bookingProfile: i.hasBookingProfile,
  };
  const items = Object.keys(COMPLETENESS_WEIGHTS) as CompletenessItem[];
  return {
    score: items.filter((k) => done[k]).reduce((s, k) => s + COMPLETENESS_WEIGHTS[k], 0),
    missing: items.filter((k) => !done[k]),
  };
}
