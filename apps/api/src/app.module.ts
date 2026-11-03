import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ArtistsModule } from './artists/artists.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { env } from './config/env';
import { DisciplinesModule } from './disciplines/disciplines.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      skipIf: () => env().NODE_ENV === 'test',
    }),
    PrismaModule,
    AuditModule,
    SmsModule,
    AuthModule,
    UsersModule,
    DisciplinesModule,
    ArtistsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
