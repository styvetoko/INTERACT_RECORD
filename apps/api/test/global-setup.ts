import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

/**
 * Chaque exécution des tests travaille dans une base PostgreSQL neuve (interact_test_xxxx),
 * créée ici par les migrations puis supprimée dans global-teardown. Aucune autre base n'est touchée.
 */
export default function globalSetup(): void {
  const server = (process.env.TEST_DATABASE_SERVER_URL ?? 'postgresql://interact:interact@localhost:5432').replace(/\/$/, '');
  const name = `interact_test_${randomBytes(4).toString('hex')}`;
  process.env.TEST_DATABASE_URL = `${server}/${name}`;
  process.env.TEST_DATABASE_NAME = name;
  process.env.TEST_DATABASE_SERVER_URL = server;
  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}
