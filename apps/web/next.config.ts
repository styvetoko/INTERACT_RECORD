import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Les jetons de design sont un paquet du dépôt, transpilé par Next.
  transpilePackages: ['@interact/design-tokens'],
  // Environnement de démonstration (Codespaces) : domaine public autorisé pour les actions serveur,
  // et API servie par le site (images, QR code) pour n'ouvrir qu'un seul port. Rien en production.
  ...(process.env.DEMO_PUBLIC_HOST
    ? {
        experimental: { serverActions: { allowedOrigins: [process.env.DEMO_PUBLIC_HOST] } },
        async rewrites() {
          const api = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
          return [
            { source: '/media/:path*', destination: `${api}/media/:path*` },
            { source: '/v1/artists/:slug/qr.svg', destination: `${api}/v1/artists/:slug/qr.svg` },
          ];
        },
      }
    : {}),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
