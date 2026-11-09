/** Client de l'API côté serveur. Types alignés sur les vues publiques de apps/api. */

export interface PublicImage {
  width: number;
  height: number;
  dominantColor: string;
  placeholder: string;
  variants: { width: number; height: number; url: string }[];
}

export interface Discipline {
  slug: string;
  nameFr: string;
  nameEn: string;
  categories: { slug: string; nameFr: string; nameEn: string }[];
}

export interface ArtistCard {
  id: string;
  slug: string;
  stageName: string;
  city: string;
  tagline: string | null;
  verified: boolean;
  disciplines: string[];
  avatar: PublicImage | null;
}

export interface ArtistPublic {
  id: string;
  slug: string;
  stageName: string;
  type: 'INDIVIDUAL' | 'COLLECTIVE';
  country: string;
  city: string;
  tagline: string | null;
  bioFr: string | null;
  bioEn: string | null;
  avatar: PublicImage | null;
  banner: PublicImage | null;
  socialLinks: Partial<Record<SocialNetwork, string>>;
  verified: boolean;
  memberCount: number;
  disciplines: { slug: string; nameFr: string; nameEn: string }[];
  categories: { slug: string; nameFr: string; nameEn: string; discipline: string }[];
  booking: {
    priceMinXaf: number | null;
    priceMaxXaf: number | null;
    travelCities: string[];
    serviceTypes: string[];
    technicalRider: string | null;
  } | null;
  shareUrl: string;
  createdAt: string;
}

export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x' | 'spotify' | 'website';

export interface ServiceType {
  value: string;
  labelFr: string;
  labelEn: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export class ApiUnavailableError extends Error {}

const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/** Adresse de l'API vue par le navigateur (images, QR code). */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? API_URL).replace(/\/$/, '');

async function get<T>(path: string, revalidate = 60): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { next: { revalidate }, headers: { accept: 'application/json' } });
  } catch {
    throw new ApiUnavailableError(`API injoignable : ${path}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiUnavailableError(`API ${res.status} : ${path}`);
  return (await res.json()) as T;
}

export const api = {
  disciplines: () => get<Discipline[]>('/v1/disciplines', 300).then((d) => d ?? []),
  artists: (params: { discipline?: string; city?: string; q?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    );
    return get<Page<ArtistCard>>(`/v1/artists?${qs}`).then((p) => p ?? { items: [], nextCursor: null });
  },
  artist: (slug: string) =>
    /^[a-z0-9-]{2,60}$/.test(slug) ? get<ArtistPublic>(`/v1/artists/${encodeURIComponent(slug)}`) : Promise.resolve(null),
  serviceTypes: () => get<ServiceType[]>('/v1/reference/booking-service-types', 3600).then((s) => s ?? []),
  qrUrl: (slug: string) => `${PUBLIC_API_URL}/v1/artists/${encodeURIComponent(slug)}/qr.svg`,
};
