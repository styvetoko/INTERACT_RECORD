import { ImagePurpose } from '@prisma/client';
import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);

interface PurposeSpec {
  /** Rapport largeur / hauteur du recadrage */
  ratio: number;
  /** Largeurs produites (WebP) */
  widths: number[];
  /** Dimensions minimales acceptées pour une image nette */
  minWidth: number;
  minHeight: number;
  placeholderWidth: number;
}

export const IMAGE_SPECS: Record<ImagePurpose, PurposeSpec> = {
  ARTIST_AVATAR: { ratio: 1, widths: [128, 256, 512], minWidth: 200, minHeight: 200, placeholderWidth: 16 },
  ARTIST_BANNER: { ratio: 3, widths: [800, 1600], minWidth: 900, minHeight: 300, placeholderWidth: 24 },
};

export class ImageRejectedError extends Error {
  constructor(readonly code: 'IMAGE_UNSUPPORTED' | 'IMAGE_TOO_SMALL' | 'IMAGE_TOO_LARGE', message: string) {
    super(message);
  }
}

export interface ProcessedVariant {
  width: number;
  height: number;
  buffer: Buffer;
}

export interface ProcessedImage {
  width: number;
  height: number;
  dominantColor: string;
  placeholder: string;
  variants: ProcessedVariant[];
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/**
 * Traite une image envoyée par un utilisateur :
 * format vérifié sur le contenu réel (pas sur le nom), rotation EXIF appliquée puis
 * métadonnées supprimées (position GPS comprise), recadrage intelligent, déclinaisons WebP,
 * couleur dominante et aperçu flou pour l'affichage pendant le chargement.
 */
export async function processImage(input: Buffer, purpose: ImagePurpose): Promise<ProcessedImage> {
  const spec = IMAGE_SPECS[purpose];
  const open = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });

  let meta: sharp.Metadata;
  try {
    meta = await open().metadata();
  } catch (e) {
    if (e instanceof Error && /pixel limit/i.test(e.message)) {
      throw new ImageRejectedError('IMAGE_TOO_LARGE', 'Image trop grande (50 mégapixels maximum)');
    }
    throw new ImageRejectedError('IMAGE_UNSUPPORTED', 'Ce fichier n’est pas une image lisible (JPEG, PNG, WebP ou AVIF)');
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format) || (meta.pages ?? 1) > 1) {
    throw new ImageRejectedError('IMAGE_UNSUPPORTED', 'Format non accepté : JPEG, PNG, WebP ou AVIF, sans animation');
  }

  // Dimensions après redressement selon l'orientation EXIF (5 à 8 = rotation de 90°)
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = (rotated ? meta.height : meta.width) ?? 0;
  const height = (rotated ? meta.width : meta.height) ?? 0;
  if (width < spec.minWidth || height < spec.minHeight) {
    throw new ImageRejectedError(
      'IMAGE_TOO_SMALL',
      `Image trop petite : ${spec.minWidth} × ${spec.minHeight} pixels minimum pour un rendu net`,
    );
  }

  let normalized: Buffer;
  try {
    normalized = await open().rotate().toColourspace('srgb').png({ compressionLevel: 1 }).toBuffer();
  } catch {
    throw new ImageRejectedError('IMAGE_UNSUPPORTED', 'Image endommagée ou illisible');
  }
  const base = () => sharp(normalized);

  const variants: ProcessedVariant[] = [];
  for (const w of spec.widths) {
    const targetW = Math.min(w, width);
    const targetH = Math.round(targetW / spec.ratio);
    if (variants.some((v) => v.width === targetW)) continue;
    const { data, info } = await base()
      .resize(targetW, targetH, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    variants.push({ width: info.width, height: info.height, buffer: data });
  }

  const stats = await base().stats();
  const { r, g, b } = stats.dominant;
  const dominantColor = `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();

  const pw = spec.placeholderWidth;
  const placeholderBuffer = await base()
    .resize(pw, Math.max(1, Math.round(pw / spec.ratio)), { fit: 'cover', position: sharp.strategy.attention })
    .webp({ quality: 40 })
    .toBuffer();
  const placeholder = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`;

  const largest = variants[variants.length - 1];
  return { width: largest.width, height: largest.height, dominantColor, placeholder, variants };
}
