import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { UserThrottlerGuard } from './user-throttler.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({ secret: env().JWT_ACCESS_SECRET, signOptions: { issuer: 'interact-record' }, verifyOptions: { issuer: 'interact-record' } }),
    }),
  ],
  controllers: [AuthController],
  // Ordre voulu : authentification d'abord, puis limites de débit comptées par utilisateur.
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_GUARD, useClass: UserThrottlerGuard }],
  exports: [AuthService],
})
export class AuthModule {}
