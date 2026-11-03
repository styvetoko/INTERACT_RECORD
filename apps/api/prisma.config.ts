import path from 'node:path';
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // Pas de .env (CI, production) : les variables viennent de l'environnement.
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: { seed: 'ts-node prisma/seed.ts' },
});
