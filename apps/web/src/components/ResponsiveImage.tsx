import type { PublicImage } from '@/lib/api';
import { pickVariant, srcSet } from '@/lib/format';
import styles from './ResponsiveImage.module.css';

interface Props {
  image: PublicImage;
  alt: string;
  /** Attribut sizes : largeur affichée, pour que le téléphone ne charge que la taille utile. */
  sizes: string;
  className?: string;
  priority?: boolean;
}

/**
 * Image traitée par l'API : la couleur dominante puis l'aperçu flou s'affichent
 * immédiatement, l'image nette arrive par-dessus (aucun écran vide en 3G).
 */
export function ResponsiveImage({ image, alt, sizes, className, priority }: Props) {
  const fallback = pickVariant(image, 512);
  return (
    <span
      className={`${styles.frame} ${className ?? ''}`}
      style={{ backgroundColor: image.dominantColor, backgroundImage: `url(${image.placeholder})` }}
    >
      <img
        className={styles.img}
        src={fallback.url}
        srcSet={srcSet(image)}
        sizes={sizes}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </span>
  );
}
