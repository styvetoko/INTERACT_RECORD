import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import { parse } from '../common/validation';
import { toPrivateUser } from '../users/user.mapper';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser, Public } from './decorators';

const RequestOtpSchema = z.object({ phone: z.string().min(6).max(20) });
const VerifyOtpSchema = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().regex(/^\d{6}$/, 'Le code contient 6 chiffres'),
  deviceName: z.string().max(100).optional(),
});
const RefreshSchema = z.object({ refreshToken: z.string().min(20).max(200), deviceName: z.string().max(100).optional() });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() body: unknown) {
    const { phone } = parse(RequestOtpSchema, body);
    return this.auth.requestOtp(phone);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() body: unknown, @Req() req: Request) {
    const dto = parse(VerifyOtpSchema, body);
    const result = await this.auth.verifyOtp(dto.phone, dto.code, {
      deviceName: dto.deviceName,
      userAgent: req.headers['user-agent'],
    });
    return {
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      refreshToken: result.refreshToken,
      isNewUser: result.isNewUser,
      user: toPrivateUser(result.user),
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: unknown, @Req() req: Request) {
    const dto = parse(RefreshSchema, body);
    return this.auth.refresh(dto.refreshToken, { deviceName: dto.deviceName, userAgent: req.headers['user-agent'] });
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logout(user.sessionId);
  }
}
