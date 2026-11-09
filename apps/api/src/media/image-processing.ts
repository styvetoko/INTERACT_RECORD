import { ImagePurpose } from '@prisma/client';
import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** 25 mégapixels suffisent largement pour produire au plus 1600 px de large. */
export const MAX_INPUT_PIXELS = 25_000_000;
/** Une image plus étirée que 6:1 n'a pas sa place en photo de profil ni en bannière. */
const MAX_ASPECT_RATIO = 6;
/** Traitements d'images simultanés : sharp utilise les mêmes fils que le hachage des codes SMS et PIN. */
const MAX_CONCURRENT_JOBS = 2;
const MAX_QUEUED_JOBS = 20;

// Un seul fil par image, pas de cache de fichiers : mémoire et processeur restent prévisibles.
sharp.concurrency(1);
sharp.cache(false);

interface PurposeSpec {
  ratio: number;
  widths: number[];
  minWidth: number;
  minHeight: number;
  placeholderWidth: number;
}

export const IMAGE_SPECS: Record<ImagePurpose, PurposeSpec> = {
  ARTIST_AVATAR: { ratio: 1, widths: [128, 256, 512], minWidth: 200, minHeight: 200, placeholderWidth: 16 },
  ARTIST_BANNER: { ratio: 3, widths: [800, 1600], minWidth: 900, minHeight: 300, placeholderWidth: 24 },
};

export type ImageRejectionCode =
  | 'IMAGE_UNSUPPORTED'
  | 'IMAGE_TOO_SMALL'
  | 'IMAGE_TOO_LARGE'
  | 'IMAGE_BAD_PROPORTIONS'
  | 'MEDIA_BUSY';

export class ImageRejectedError extends Error {
  constructor(readonly code: ImageRejectionCode, message: string) {
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

// ---------- File d'attente des traitements ----------
let running = 0;
const waiting: (() => void)[] = [];

/**
 * Exécute un traitement quand une place est libre. Une place libérée passe directement au suivant
 * de la file : la limite de traitements simultanés n'est jamais dépassée.
 */
export async function withImageSlot<T>(job: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT_JOBS) {
    if (waiting.length >= MAX_QUEUED_JOBS) {
      throw new ImageRejectedError('MEDIA_BUSY', 'Beaucoup d’envois en ce moment. Réessaie dans une minute.');
    }
    await new Promise<void>((resolve) => waiting.push(resolve)); // la place nous est transmise
  } else {
    running++;
  }
  try {
    return await job();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

export const IMAGE_QUEUE_LIMITS = { MAX_CONCURRENT_JOBS, MAX_QUEUED_JOBS };

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const open = (input: Buffer) => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });

/**
 * Traite une image envoyée par un utilisateur :
 * format vérifié sur le contenu réel, rotation EXIF appliquée puis toutes les métadonnées
 * supprimées (position GPS comprise), recadrage intelligent, déclinaisons WebP sans agrandissement,
 * couleur dominante et aperçu flou. L'image n'est décodée qu'une fois, puis réduite aussitôt.
 */
export function processImage(input: Buffer, purpose: ImagePurpose): Promise<ProcessedImage> {
  return withImageSlot(() => process(input, purpose));
}

async function process(input: Buffer, purpose: ImagePurpose): Promise<ProcessedImage> {
  const spec = IMAGE_SPECS[purpose];

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    meta = await open(input).metadata();
  } catch (e) {
    if (e instanceof Error && /pixel limit/i.test(e.message)) {
      throw new ImageRejectedError('IMAGE_TOO_LARGE', 'Image trop grande (25 mégapixels maximum)');
    }
    throw new ImageRejectedError('IMAGE_UNSUPPORTED', 'Ce fichier n’est pas une image lisible (JPEG, PNG, WebP ou AVIF)');
  }

  // HEIF n'est accepté que compressé en AV1, c'est-à-dire AVIF (le HEIC n'est pas pris en charge).
  const isAvif = meta.format === 'heif' && meta.compression === 'av1';
  const accepted = meta.format === 'jpeg' || meta.format === 'png' || meta.format === 'webp' || isAvif;
  if (!accepted || (meta.pages ?? 1) > 1) {
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
  if (Math.max(width / height, height / width) > MAX_ASPECT_RATIO) {
    throw new ImageRejectedError('IMAGE_BAD_PROPORTIONS', 'Image trop étirée : recadre-la avant de l’envoyer');
  }

  // Taille maximale utile, sans jamais agrandir : limitée par la largeur ET par la hauteur disponibles.
  const largest = spec.widths[spec.widths.length - 1];
  const masterW = Math.min(largest, width, Math.floor(height * spec.ratio));
  const masterH = Math.round(masterW / spec.ratio);

  let master: Buffer;
  try {
    master = await open(input)
      .rotate()
      .resize(masterW, masterH, { fit: 'cover', position: sharp.strategy.attention })
      .toColourspace('srgb')
      .png({ compressionLevel: 0 })
      .toBuffer();
  } catch {
    throw new ImageRejectedError('IMAGE_UNSUPPORTED', 'Image endommagée ou illisible');
  }
  const base = sharp(master);

  const widths = [...new Set([...spec.widths.filter((w) => w < masterW), masterW])].sort((a, b) => a - b);
  const variants: ProcessedVariant[] = [];
  for (const w of widths) {
    const { data, info } = await base
      .clone()
      .resize(w, Math.round(w / spec.ratio))
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    variants.push({ width: info.width, height: info.height, buffer: data });
  }

  const { r, g, b } = (await base.clone().stats()).dominant;
  const dominantColor = `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();

  const pw = spec.placeholderWidth;
  const placeholderBuffer = await base
    .clone()
    .resize(pw, Math.max(1, Math.round(pw / spec.ratio)))
    .webp({ quality: 40 })
    .toBuffer();

  return {
    width: masterW,
    height: masterH,
    dominantColor,
    placeholder: `data:image/webp;base64,${placeholderBuffer.toString('base64')}`,
    variants,
  };
}
