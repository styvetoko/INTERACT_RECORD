import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'doit contenir au moins 32 caractères'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SMS_PROVIDER: z.enum(['fake']).default('fake'),
  PAYMENT_PROVIDER: z.enum(['fake']).default('fake'),
  DEFAULT_COUNTRY: z.string().length(2).default('CM'),
  STORAGE_PROVIDER: z.enum(['fake']).default('fake'),
  STORAGE_DIR: z.string().min(1).default('.storage'),
  PUBLIC_MEDIA_URL: z.string().url().default('http://localhost:4000/media'),
  PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
}).superRefine((c, ctx) => {
  // En production, aucun faux fournisseur : l'API refuse de démarrer plutôt que de simuler.
  if (c.NODE_ENV === 'production') {
    for (const key of ['SMS_PROVIDER', 'PAYMENT_PROVIDER', 'STORAGE_PROVIDER'] as const) {
      if (c[key] === 'fake') ctx.addIssue({ code: 'custom', path: [key], message: 'faux fournisseur interdit en production' });
    }
  }
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Lit et valide la configuration une seule fois ; échoue au démarrage si elle est invalide. */
export function env(): Env {
  if (!cached) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ; ');
      throw new Error(`Configuration invalide : ${details}`);
    }
    cached = result.data;
  }
  return cached;
}

/** Réservé aux tests. */
export function resetEnvCache(): void {
  cached = undefined;
}
