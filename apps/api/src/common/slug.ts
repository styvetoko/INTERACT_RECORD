const RESERVED = new Set([
  'admin', 'api', 'app', 'me', 'settings', 'login', 'logout', 'signup', 'help', 'support',
  'search', 'explore', 'discover', 'artists', 'events', 'shop', 'booking', 'wallet', 'interact',
  'interactstage', 'about', 'legal', 'terms', 'privacy', 'v1', 'static', 'assets',
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
