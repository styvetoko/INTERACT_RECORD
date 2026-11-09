const RESERVED = new Set([
  'admin', 'api', 'app', 'me', 'settings', 'login', 'logout', 'signup', 'help', 'support',
  'search', 'explore', 'discover', 'artists', 'events', 'shop', 'booking', 'wallet', 'interact',
  'interactstage', 'about', 'legal', 'terms', 'privacy', 'v1', 'static', 'assets', 'media',
  'reference', 'manage', 'fr', 'en', 'artiste', 'artistes', 'connexion', 'compte', 'lang',
  'manifest', 'robots', 'sitemap', 'favicon', 'opengraph-image', '_next',
]);

/** Transforme un nom de scène en identifiant d'URL : « Charlotte Dipanda » → « charlotte-dipanda » */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}

/** Forme de recherche : sans accents, en minuscules, espaces normalisés. « Ténor » → « tenor » */
export function normalizeForSearch(input: string): string {
  return input
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Neutralise les jokers SQL (« % », « _ ») et le caractère d'échappement dans une recherche partielle. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}
