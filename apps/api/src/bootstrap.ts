import { INestApplication } from '@nestjs/common';

/** Réglages communs à l'application et aux tests. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();
  return app;
}
