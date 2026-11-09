import { bearer, createTestContext, loginWithRoles, TestContext } from './helpers';

/** Les limites de débit, coupées dans les autres suites, sont vérifiées ici. */
describe('Limites de débit (N2 : comptées par utilisateur, pas par adresse IP)', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    process.env.ENABLE_THROTTLE_IN_TESTS = '1';
    ctx = await createTestContext();
  });
  afterAll(async () => {
    delete process.env.ENABLE_THROTTLE_IN_TESTS;
    await ctx.app.close();
  });

  it('bloque le 61e recherche d’un même agent, sans pénaliser un collègue derrière la même adresse IP', async () => {
    const a = await loginWithRoles(ctx, ['SUPPORT']);
    const b = await loginWithRoles(ctx, ['SUPPORT']);
    for (let i = 0; i < 60; i++) {
      await ctx.http().get('/v1/admin/users?limit=1').set(bearer(a.accessToken)).expect(200);
    }
    const blocked = await ctx.http().get('/v1/admin/users?limit=1').set(bearer(a.accessToken)).expect(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
    await ctx.http().get('/v1/admin/users?limit=1').set(bearer(b.accessToken)).expect(200);
  });

  it('limite les demandes de code SMS sans compte par adresse IP', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await ctx.http().post('/v1/auth/otp/request').send({ phone: `+2376990${String(10000 + i)}` });
      codes.push(r.status);
    }
    // 5 demandes par minute et par adresse IP, connexions des tests précédents comprises.
    expect(codes.filter((c) => c === 200).length).toBeLessThanOrEqual(5);
    expect(codes).toContain(429);
    expect(codes.indexOf(429)).toBeGreaterThan(-1);
    expect(codes.slice(codes.indexOf(429)).every((c) => c === 429)).toBe(true);
  });
});
