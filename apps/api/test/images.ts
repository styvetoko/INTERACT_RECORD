import sharp from 'sharp';

/** Fabrique des images de test (aucun fichier binaire dans le dépôt). */
export async function makeImage(
  width: number,
  height: number,
  format: 'jpeg' | 'png' | 'webp' | 'gif' = 'jpeg',
  options: { orientation?: number; withSecretExif?: boolean } = {},
): Promise<Buffer> {
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } },
  }).composite([
    {
      input: await sharp({ create: { width: Math.max(1, Math.floor(width / 3)), height: Math.max(1, Math.floor(height / 3)), channels: 3, background: { r: 242, g: 181, b: 68 } } }).png().toBuffer(),
      top: Math.floor(height / 3),
      left: Math.floor(width / 3),
    },
  ]);
  if (format === 'jpeg') {
    img = img.jpeg({ quality: 90 });
    if (options.withSecretExif || options.orientation) {
      img = img.withMetadata({
        orientation: options.orientation,
        exif: options.withSecretExif ? { IFD0: { Copyright: 'SECRET-GPS-DOUALA', Artist: 'Appareil de test' } } : undefined,
      });
    }
  } else if (format === 'png') img = img.png();
  else if (format === 'webp') img = img.webp();
  else img = img.gif();
  return img.toBuffer();
}
