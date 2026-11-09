import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { tmpdir } from 'os';

/** Supprime uniquement la base temporaire créée par global-setup pour cette exécution. */
export default function globalTeardown(): void {
  const storage = process.env.STORAGE_DIR;
  if (storage && storage.startsWith(tmpdir()) && /interact-storage-/.test(storage)) {
    rmSync(storage, { recursive: true, force: true });
  }
  const name = process.env.TEST_DATABASE_NAME;
  const server = process.env.TEST_DATABASE_SERVER_URL;
  if (!name || !server || !/^interact_test_[0-9a-f]{8}$/.test(name)) return;
  execSync(`npx prisma db execute --stdin --url "${server}/postgres"`, {
    cwd: __dirname + '/..',
    input: `DROP DATABASE IF EXISTS "${name}" WITH (FORCE);`,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
