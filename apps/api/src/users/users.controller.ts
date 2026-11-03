import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { z } from 'zod';
import { AuthUser, CurrentUser } from '../auth/decorators';
import { parse } from '../common/validation';
import { toPrivateUser } from './user.mapper';
import { UsersService } from './users.service';

const UpdateMeSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  email: z.string().email().max(200).nullable().optional(),
  locale: z.nativeEnum(Locale).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear() - 13).optional(),
});
const PinSchema = z.object({ pin: z.string(), currentPin: z.string().optional() });
const InterestsSchema = z.object({ disciplineSlugs: z.array(z.string()).min(1).max(20) });

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async me(@CurrentUser() auth: AuthUser) {
    const user = await this.users.getMe(auth.id);
    return {
      ...toPrivateUser(user),
      interests: user.interests.map((i) => i.discipline),
      artists: user.artistMembers.map((m) => ({ ...m.artist, memberRole: m.role, permissions: m.permissions })),
    };
  }

  @Patch()
  async update(@CurrentUser() auth: AuthUser, @Body() body: unknown) {
    return toPrivateUser(await this.users.updateMe(auth.id, parse(UpdateMeSchema, body)));
  }

  @Put('pin')
  @HttpCode(204)
  async setPin(@CurrentUser() auth: AuthUser, @Body() body: unknown): Promise<void> {
    const dto = parse(PinSchema, body);
    await this.users.setPin(auth.id, dto.pin, dto.currentPin);
  }

  @Put('interests')
  async interests(@CurrentUser() auth: AuthUser, @Body() body: unknown) {
    return { disciplineSlugs: await this.users.setInterests(auth.id, parse(InterestsSchema, body).disciplineSlugs) };
  }

  @Post('deletion')
  @HttpCode(202)
  deletion(@CurrentUser() auth: AuthUser) {
    return this.users.requestDeletion(auth.id);
  }

  @Get('sessions')
  sessions(@CurrentUser() auth: AuthUser) {
    return this.users.listSessions(auth.id, auth.sessionId);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  async revoke(@CurrentUser() auth: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.users.revokeSession(auth.id, id);
  }
}
