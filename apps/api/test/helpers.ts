import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { seedDisciplines } from '../src/disciplines/seed-data';
import { PrismaService } from '../src/prisma/prisma.service';
import { FakeSmsProvider } from '../src/sms/fake-sms.provider';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  sms: FakeSmsProvider;
  http: () => ReturnType<typeof request>;
}

export async function createTestContext(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  const prisma = app.get(PrismaService);
  await seedDisciplines(prisma);
  return { app, prisma, sms: app.get(FakeSmsProvider), http: () => request(app.getHttpServer()) };
}

let phoneCounter = 0;
/** Numéro MTN Cameroun valide et unique par test. */
export function uniquePhone(): string {
  phoneCounter += 1;
  const suffix = String((Date.now() % 100000) * 10 + phoneCounter).padStart(6, '0').slice(-6);
  return `+237677${suffix}`;
}

export function codeFromSms(ctx: TestContext, phone: string): string {
  const message = ctx.sms.lastMessageTo(phone)?.message ?? '';
  const code = message.match(/\b(\d{6})\b/)?.[1];
  if (!code) throw new Error(`Aucun code SMS pour ${phone}`);
  return code;
}

/** Inscrit ou connecte un utilisateur et renvoie ses jetons. */
export async function login(ctx: TestContext, phone = uniquePhone()) {
  await ctx.http().post('/v1/auth/otp/request').send({ phone }).expect(200);
  const res = await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: codeFromSms(ctx, phone) }).expect(200);
  return { phone, accessToken: res.body.accessToken as string, refreshToken: res.body.refreshToken as string, user: res.body.user };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
