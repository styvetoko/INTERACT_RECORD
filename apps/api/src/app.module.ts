import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ArtistsModule } from './artists/artists.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { env } from './config/env';
import { DisciplinesModule } from './disciplines/disciplines.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      // Coupées en test, sauf dans la suite qui les vérifie (ENABLE_THROTTLE_IN_TESTS=1).
      skipIf: () => env().NODE_ENV === 'test' && process.env.ENABLE_THROTTLE_IN_TESTS !== '1',
    }),
    PrismaModule,
    AuditModule,
    SmsModule,
    StorageModule,
    AuthModule,
    UsersModule,
    DisciplinesModule,
    ArtistsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
