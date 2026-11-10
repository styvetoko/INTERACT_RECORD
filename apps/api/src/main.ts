import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Pas de fichier .env : les variables viennent de l'environnement (production).
  }
  const config = env();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  configureApp(app);
  await app.listen(config.PORT);
  new Logger('Bootstrap').log(`API INTERACT RECORD démarrée sur le port ${config.PORT}`);
}

void bootstrap();
