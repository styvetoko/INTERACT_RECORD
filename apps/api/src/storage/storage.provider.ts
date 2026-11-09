/** Contrat commun des stockages de fichiers (disque local aujourd'hui, S3 ou MinIO ensuite). */
export interface StorageProvider {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** Une clé de stockage ne contient que des segments sûrs : jamais de « .. », jamais de chemin absolu. */
export function assertSafeKey(key: string): void {
  if (!/^[a-z0-9][a-z0-9/_.-]{0,200}$/.test(key) || key.includes('..') || key.includes('//')) {
    throw new Error(`Clé de stockage refusée : ${key}`);
  }
}
