import { Inject, Injectable, Logger } from '@nestjs/common';
import { ImagePurpose, MediaImage, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_PROVIDER, StorageProvider } from '../storage/storage.provider';
import { processImage } from './image-processing';

interface StoredVariant {
  width: number;
  height: number;
  key: string;
}

export interface PublicImage {
  width: number;
  height: number;
  dominantColor: string;
  placeholder: string;
  variants: { width: number; height: number; url: string }[];
}

/** Délai avant de considérer une image non rattachée comme abandonnée (envoi interrompu, concurrence). */
export const ORPHAN_GRACE_MS = 60 * 60 * 1000;
const MAX_DELETION_ATTEMPTS = 10;

@Injectable()
export class MediaService {
  private readonly logger = new Logger('Media');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** Traite, stocke et enregistre une image d'artiste. En cas d'échec, les fichiers écrits sont supprimés. */
  async createImage(artistId: string, uploadedById: string, purpose: ImagePurpose, input: Buffer): Promise<MediaImage> {
    const processed = await processImage(input, purpose);
    const id = randomUUID();
    const folder = purpose === 'ARTIST_AVATAR' ? 'avatars' : 'banners';
    const written: string[] = [];
    try {
      const variants: StoredVariant[] = [];
      for (const v of processed.variants) {
        const key = `images/${folder}/${id}/${v.width}.webp`;
        await this.storage.put(key, v.buffer, 'image/webp');
        written.push(key);
        variants.push({ width: v.width, height: v.height, key });
      }
      return await this.prisma.mediaImage.create({
        data: {
          id,
          artistId,
          uploadedById,
          purpose,
          width: processed.width,
          height: processed.height,
          dominantColor: processed.dominantColor,
          placeholder: processed.placeholder,
          variants: variants as unknown as Prisma.InputJsonValue,
          bytesTotal: processed.variants.reduce((sum, v) => sum + v.buffer.length, 0),
        },
      });
    } catch (e) {
      await this.enqueueDeletion(written);
      await this.processDeletionQueue();
      throw e;
    }
  }

  /**
   * Supprime une image : la ligne disparaît et ses fichiers entrent dans la file de suppression,
   * dans la même transaction. Les fichiers sont ensuite effacés ; un échec sera rejoué plus tard.
   */
  async deleteImage(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const image = await tx.mediaImage.findUnique({ where: { id } });
      if (!image) return;
      await this.enqueueDeletion((image.variants as unknown as StoredVariant[]).map((v) => v.key), tx);
      await tx.mediaImage.delete({ where: { id } });
    });
    await this.processDeletionQueue();
  }

  private async enqueueDeletion(keys: string[], tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    if (!keys.length) return;
    await tx.storageDeletion.createMany({ data: keys.map((key) => ({ key })), skipDuplicates: true });
  }

  /** Efface les fichiers en attente ; un échec est replanifié avec un délai croissant. */
  async processDeletionQueue(limit = 100): Promise<{ deleted: number; failed: number }> {
    const due = await this.prisma.storageDeletion.findMany({
      where: { nextAttemptAt: { lte: new Date() }, attempts: { lt: MAX_DELETION_ATTEMPTS } },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    });
    let deleted = 0;
    let failed = 0;
    for (const item of due) {
      try {
        await this.storage.delete(item.key);
        await this.prisma.storageDeletion.delete({ where: { id: item.id } });
        deleted++;
      } catch (e) {
        failed++;
        const attempts = item.attempts + 1;
        await this.prisma.storageDeletion.update({
          where: { id: item.id },
          data: {
            attempts,
            lastError: e instanceof Error ? e.message.slice(0, 300) : 'erreur inconnue',
            nextAttemptAt: new Date(Date.now() + Math.min(2 ** attempts, 1440) * 60_000),
          },
        });
        this.logger.warn(`Suppression du fichier ${item.key} échouée (essai ${attempts})`);
      }
    }
    return { deleted, failed };
  }

  /**
   * Tâche de maintenance (à planifier) : supprime les images qu'aucun profil n'utilise plus
   * (envoi concurrent perdu, artiste supprimé), puis vide la file des fichiers.
   */
  async purgeOrphans(now = new Date()): Promise<{ images: number }> {
    const orphans = await this.prisma.mediaImage.findMany({
      where: {
        createdAt: { lt: new Date(now.getTime() - ORPHAN_GRACE_MS) },
        artistAvatarOf: { is: null },
        artistBannerOf: { is: null },
      },
      select: { id: true },
      take: 500,
    });
    for (const o of orphans) await this.deleteImage(o.id);
    await this.processDeletionQueue();
    return { images: orphans.length };
  }

  toPublic(image: MediaImage | null | undefined): PublicImage | null {
    if (!image) return null;
    return {
      width: image.width,
      height: image.height,
      dominantColor: image.dominantColor,
      placeholder: image.placeholder,
      variants: (image.variants as unknown as StoredVariant[]).map((v) => ({
        width: v.width,
        height: v.height,
        url: this.storage.publicUrl(v.key),
      })),
    };
  }
}
