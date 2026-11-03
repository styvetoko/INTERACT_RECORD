import { bearer, codeFromSms, createTestContext, login, TestContext, uniquePhone } from './helpers';

describe('Authentification par SMS (ACC-01, ACC-09, ACC-10, ACC-12)', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestContext()));
  afterAll(async () => ctx.app.close());

  it('inscrit un nouvel utilisateur avec le rôle fan', async () => {
    const phone = uniquePhone();
    await ctx.http().post('/v1/auth/otp/request').send({ phone: phone.replace('+237', '') }).expect(200);
    const res = await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: codeFromSms(ctx, phone) }).expect(200);
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user.roles).toEqual(['FAN']);
    expect(res.body.user).not.toHaveProperty('pinHash');
    const me = await ctx.http().get('/v1/me').set(bearer(res.body.accessToken)).expect(200);
    expect(me.body.phone).toBe(phone);
  });

  it('reconnecte un utilisateur existant', async () => {
    const first = await login(ctx);
    await ctx.http().post('/v1/auth/otp/request').send({ phone: first.phone }).expect(200);
    const res = await ctx.http().post('/v1/auth/otp/verify').send({ phone: first.phone, code: codeFromSms(ctx, first.phone) }).expect(200);
    expect(res.body.isNewUser).toBe(false);
    expect(res.body.user.id).toBe(first.user.id);
  });

  it('refuse un numéro invalide', async () => {
    const res = await ctx.http().post('/v1/auth/otp/request').send({ phone: '123456789' }).expect(400);
    expect(res.body.code).toBe('PHONE_INVALID');
  });

  it('refuse un mauvais code puis bloque après 5 essais', async () => {
    const phone = uniquePhone();
    await ctx.http().post('/v1/auth/otp/request').send({ phone }).expect(200);
    const good = codeFromSms(ctx, phone);
    const bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: bad }).expect(400);
      expect(r.body.code).toBe('OTP_INVALID');
    }
    const locked = await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: good }).expect(429);
    expect(locked.body.code).toBe('OTP_TOO_MANY_ATTEMPTS');
  });

  it("n'accepte un code qu'une seule fois", async () => {
    const phone = uniquePhone();
    await ctx.http().post('/v1/auth/otp/request').send({ phone }).expect(200);
    const code = codeFromSms(ctx, phone);
    await ctx.http().post('/v1/auth/otp/verify').send({ phone, code }).expect(200);
    const again = await ctx.http().post('/v1/auth/otp/verify').send({ phone, code }).expect(400);
    expect(again.body.code).toBe('OTP_EXPIRED');
  });

  it('limite à 3 demandes de code par 10 minutes', async () => {
    const phone = uniquePhone();
    for (let i = 0; i < 3; i++) await ctx.http().post('/v1/auth/otp/request').send({ phone }).expect(200);
    const r = await ctx.http().post('/v1/auth/otp/request').send({ phone }).expect(429);
    expect(r.body.code).toBe('OTP_TOO_MANY_REQUESTS');
  });

  it("invalide l'ancien code quand un nouveau est demandé", async () => {
    const phone = uniquePhone();
    await ctx.http().post('/v1/auth/otp/request').send({ phone }).expect(200);
    const oldCode = codeFromSms(ctx, phone);
    await ctx.http().post('/v1/auth/otp/request').send({ phone }).expect(200);
    const newCode = codeFromSms(ctx, phone);
    if (oldCode !== newCode) {
      await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: oldCode }).expect(400);
    }
    await ctx.http().post('/v1/auth/otp/verify').send({ phone, code: newCode }).expect(200);
  });

  it('exige une connexion sur les routes privées', async () => {
    const r = await ctx.http().get('/v1/me').expect(401);
    expect(r.body.code).toBe('AUTH_REQUIRED');
    await ctx.http().get('/v1/me').set(bearer('faux.jeton.jwt')).expect(401);
  });

  it('fait tourner le jeton de rafraîchissement et détecte sa réutilisation', async () => {
    const s = await login(ctx);
    const r1 = await ctx.http().post('/v1/auth/refresh').send({ refreshToken: s.refreshToken }).expect(200);
    expect(r1.body.refreshToken).not.toBe(s.refreshToken);
    await ctx.http().get('/v1/me').set(bearer(r1.body.accessToken)).expect(200);

    // Réutiliser l'ancien jeton (vol probable) ferme toutes les sessions.
    const reuse = await ctx.http().post('/v1/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
    expect(reuse.body.code).toBe('REFRESH_REUSED');
    await ctx.http().get('/v1/me').set(bearer(r1.body.accessToken)).expect(401);
  });

  it('déconnecte la session courante', async () => {
    const s = await login(ctx);
    await ctx.http().post('/v1/auth/logout').set(bearer(s.accessToken)).expect(204);
    await ctx.http().get('/v1/me').set(bearer(s.accessToken)).expect(401);
  });

  it('liste et ferme les sessions à distance', async () => {
    const phone = uniquePhone();
    const a = await login(ctx, phone);
    const b = await login(ctx, phone);
    const list = await ctx.http().get('/v1/me/sessions').set(bearer(a.accessToken)).expect(200);
    expect(list.body).toHaveLength(2);
    const other = list.body.find((s: { current: boolean }) => !s.current);
    await ctx.http().delete(`/v1/me/sessions/${other.id}`).set(bearer(a.accessToken)).expect(204);
    await ctx.http().get('/v1/me').set(bearer(b.accessToken)).expect(401);
    await ctx.http().get('/v1/me').set(bearer(a.accessToken)).expect(200);
  });

  it('bloque un compte suspendu', async () => {
    const s = await login(ctx);
    await ctx.prisma.user.update({ where: { id: s.user.id }, data: { status: 'SUSPENDED' } });
    const r = await ctx.http().get('/v1/me').set(bearer(s.accessToken)).expect(403);
    expect(r.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('annule une demande de suppression si l’utilisateur se reconnecte', async () => {
    const s = await login(ctx);
    const del = await ctx.http().post('/v1/me/deletion').set(bearer(s.accessToken)).expect(202);
    expect(new Date(del.body.deletionScheduledFor).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    await ctx.http().get('/v1/me').set(bearer(s.accessToken)).expect(401);
    const again = await login(ctx, s.phone);
    expect(again.user.status).toBe('ACTIVE');
  });
});
