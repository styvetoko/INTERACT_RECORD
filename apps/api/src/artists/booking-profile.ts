import { z } from 'zod';

/** Types de prestations proposables (PRO-06, BOO-01), avec libellés pour les applications. */
export const BOOKING_SERVICE_TYPES = [
  { value: 'concert', labelFr: 'Concert', labelEn: 'Concert' },
  { value: 'showcase', labelFr: 'Showcase', labelEn: 'Showcase' },
  { value: 'animation', labelFr: 'Animation d’événement', labelEn: 'Event hosting' },
  { value: 'mc', labelFr: 'Maître de cérémonie', labelEn: 'Master of ceremonies' },
  { value: 'spectacle-humour', labelFr: 'Spectacle d’humour', labelEn: 'Comedy show' },
  { value: 'choregraphie', labelFr: 'Chorégraphie', labelEn: 'Choreography' },
  { value: 'cours-danse', labelFr: 'Cours de danse', labelEn: 'Dance class' },
  { value: 'battle', labelFr: 'Battle', labelEn: 'Battle' },
  { value: 'peinture-live', labelFr: 'Peinture en direct', labelEn: 'Live painting' },
  { value: 'commande-oeuvre', labelFr: 'Œuvre sur commande', labelEn: 'Commissioned work' },
  { value: 'atelier', labelFr: 'Atelier', labelEn: 'Workshop' },
  { value: 'dj-set', labelFr: 'DJ set', labelEn: 'DJ set' },
  { value: 'featuring', labelFr: 'Featuring', labelEn: 'Feature' },
] as const;

const SERVICE_VALUES = BOOKING_SERVICE_TYPES.map((s) => s.value) as [string, ...string[]];

export const BookingProfileSchema = z
  .object({
    isBookable: z.boolean(),
    priceMinXaf: z.number().int('montant en FCFA entiers').min(0).max(100_000_000).nullable().optional(),
    priceMaxXaf: z.number().int('montant en FCFA entiers').min(0).max(100_000_000).nullable().optional(),
    travelCities: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
    serviceTypes: z.array(z.enum(SERVICE_VALUES)).max(SERVICE_VALUES.length).default([]),
    technicalRider: z.string().trim().max(3000).nullable().optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.priceMinXaf != null && p.priceMaxXaf != null && p.priceMinXaf > p.priceMaxXaf) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priceMaxXaf'], message: 'le prix maximum doit être supérieur au minimum' });
    }
    if (p.isBookable && p.serviceTypes.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['serviceTypes'], message: 'choisis au moins un type de prestation' });
    }
    if (p.isBookable && p.priceMinXaf == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priceMinXaf'], message: 'indique un prix de départ' });
    }
  });

export type BookingProfileInput = z.infer<typeof BookingProfileSchema>;
