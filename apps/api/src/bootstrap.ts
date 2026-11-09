import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import { env } from './config/env';

/** Réglages communs à l'application et aux tests. */
export function configureApp(app: INestApplication): INestApplication {
  const config = env();
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();

  // Faux stockage : les fichiers sont servis par l'API. En production, un CDN s'en charge.
  if (config.STORAGE_PROVIDER === 'fake' && config.NODE_ENV !== 'production') {
    (app as NestExpressApplication).useStaticAssets(resolve(config.STORAGE_DIR), {
      prefix: '/media/',
      immutable: true,
      maxAge: '365d',
      index: false,
      dotfiles: 'deny',
    });
  }
  return app;
}
