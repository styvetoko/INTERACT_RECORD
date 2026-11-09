import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { env } from '../config/env';
import { assertSafeKey, StorageProvider } from './storage.provider';

/**
 * Faux stockage : écrit les fichiers sur le disque local, servis par l'API sous /media.
 * Réservé au développement et aux tests ; jamais en production.
 */
@Injectable()
export class LocalDiskStorage implements StorageProvider {
  readonly name = 'fake';

  get root(): string {
    return resolve(env().STORAGE_DIR);
  }

  async put(key: string, body: Buffer): Promise<void> {
    assertSafeKey(key);
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await rm(join(this.root, key), { force: true });
  }

  publicUrl(key: string): string {
    return `${env().PUBLIC_MEDIA_URL.replace(/\/$/, '')}/${key}`;
  }
}
