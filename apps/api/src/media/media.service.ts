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

@Injectable()
export class MediaService {
  private readonly logger = new Logger('Media');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** Traite, stocke et enregistre une image. En cas d'échec, les fichiers déjà écrits sont supprimés. */
  async createImage(ownerUserId: string, purpose: ImagePurpose, input: Buffer): Promise<MediaImage> {
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
          ownerUserId,
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
      await Promise.allSettled(written.map((k) => this.storage.delete(k)));
      throw e;
    }
  }

  /** Supprime une image et ses fichiers. Une erreur de stockage est journalisée sans bloquer l'utilisateur. */
  async deleteImage(id: string): Promise<void> {
    const image = await this.prisma.mediaImage.findUnique({ where: { id } });
    if (!image) return;
    await this.prisma.mediaImage.delete({ where: { id } });
    const results = await Promise.allSettled(
      (image.variants as unknown as StoredVariant[]).map((v) => this.storage.delete(v.key)),
    );
    if (results.some((r) => r.status === 'rejected')) {
      this.logger.warn(`Fichiers de l'image ${id} non supprimés du stockage`);
    }
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
