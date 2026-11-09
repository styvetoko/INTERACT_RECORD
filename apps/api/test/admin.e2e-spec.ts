import { bearer, createArtist, createTestContext, login, loginWithRoles, TestContext } from './helpers';

describe('Back-office (ADM-01, ADM-10, ACC-06)', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestContext()));
  afterAll(async () => ctx.app.close());

  describe('recherche des comptes', () => {
    it('trouve un utilisateur par son numéro, quel que soit le format saisi', async () => {
      const support = await loginWithRoles(ctx, ['SUPPORT']);
      const target = await login(ctx);
      const local = target.phone.replace('+237', '').replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
      const r = await ctx.http().get(`/v1/admin/users?q=${encodeURIComponent(local)}`).set(bearer(support.accessToken)).expect(200);
      expect(r.body.items).toHaveLength(1);
      expect(r.body.items[0]).toMatchObject({ id: target.user.id, phone: target.phone });
      expect(r.body.items[0]).not.toHaveProperty('pinHash');
    });

    it('est interdite aux fans et aux artistes', async () => {
      const fan = await login(ctx);
      await ctx.http().get('/v1/admin/users').set(bearer(fan.accessToken)).expect(403);
      await ctx.http().get('/v1/admin/users').expect(401);
    });
  });

  describe('suspension', () => {
    it('suspend avec motif, ferme les sessions, bloque la reconnexion, puis réactive', async () => {
      const mod = await loginWithRoles(ctx, ['MODERATOR']);
      const target = await login(ctx);
      const r = await ctx.http().post(`/v1/admin/users/${target.user.id}/suspend`).set(bearer(mod.accessToken))
        .send({ reason: 'Arnaque signalée par 3 fans' }).expect(200);
      expect(r.body).toMatchObject({ status: 'SUSPENDED', suspendedReason: 'Arnaque signalée par 3 fans', activeSessions: 0 });
      await ctx.http().get('/v1/me').set(bearer(target.accessToken)).expect(401);
      await ctx.http().post('/v1/auth/refresh').send({ refreshToken: target.refreshToken }).expect(401);

      const log = await ctx.prisma.auditLog.findFirst({ where: { action: 'user.suspend', entityId: target.user.id } });
      expect(log).toMatchObject({ actorId: mod.user.id, data: expect.objectContaining({ reason: 'Arnaque signalée par 3 fans' }) });

      await ctx.http().post(`/v1/admin/users/${target.user.id}/suspend`).set(bearer(mod.accessToken)).send({ reason: 'Encore une fois' }).expect(400);
      const back = await ctx.http().post(`/v1/admin/users/${target.user.id}/reactivate`).set(bearer(mod.accessToken))
        .send({ reason: 'Erreur de signalement vérifiée' }).expect(200);
      expect(back.body).toMatchObject({ status: 'ACTIVE', suspendedReason: null });
      await login(ctx, target.phone);
    });

    it('exige un motif', async () => {
      const mod = await loginWithRoles(ctx, ['MODERATOR']);
      const target = await login(ctx);
      await ctx.http().post(`/v1/admin/users/${target.user.id}/suspend`).set(bearer(mod.accessToken)).send({ reason: 'non' }).expect(400);
      await ctx.http().post(`/v1/admin/users/${target.user.id}/suspend`).set(bearer(mod.accessToken)).send({}).expect(400);
    });

    it('interdit de se suspendre soi-même', async () => {
      const admin = await loginWithRoles(ctx, ['ADMIN']);
      const r = await ctx.http().post(`/v1/admin/users/${admin.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Test de sécurité' }).expect(403);
      expect(r.body.code).toBe('CANNOT_SUSPEND_SELF');
    });

    it('un modérateur ne peut pas suspendre un membre de l’équipe ; un administrateur le peut', async () => {
      const mod = await loginWithRoles(ctx, ['MODERATOR']);
      const finance = await loginWithRoles(ctx, ['FINANCE']);
      const r = await ctx.http().post(`/v1/admin/users/${finance.user.id}/suspend`).set(bearer(mod.accessToken)).send({ reason: 'Abus de pouvoir' }).expect(403);
      expect(r.body.code).toBe('CANNOT_SUSPEND_STAFF');
      const admin = await loginWithRoles(ctx, ['ADMIN']);
      await ctx.http().post(`/v1/admin/users/${finance.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Départ de l’entreprise' }).expect(200);
    });

    it('le support consulte mais ne suspend pas', async () => {
      const support = await loginWithRoles(ctx, ['SUPPORT']);
      const target = await login(ctx);
      await ctx.http().get(`/v1/admin/users/${target.user.id}`).set(bearer(support.accessToken)).expect(200);
      await ctx.http().post(`/v1/admin/users/${target.user.id}/suspend`).set(bearer(support.accessToken)).send({ reason: 'Je n’ai pas le droit' }).expect(403);
    });
  });

  describe('rôles internes', () => {
    it('un administrateur attribue des rôles internes ; FAN et ARTIST sont conservés', async () => {
      const admin = await loginWithRoles(ctx, ['ADMIN']);
      const target = await login(ctx);
      await createArtist(ctx, target.accessToken, { stageName: 'Mireille Musique', city: 'Douala', disciplineSlugs: ['musique'] });
      const r = await ctx.http().put(`/v1/admin/users/${target.user.id}/roles`).set(bearer(admin.accessToken))
        .send({ roles: ['MODERATOR', 'EDITOR'], reason: 'Recrutée dans l’équipe éditoriale' }).expect(200);
      expect(r.body.roles.sort()).toEqual(['ARTIST', 'EDITOR', 'FAN', 'MODERATOR']);
      const r2 = await ctx.http().put(`/v1/admin/users/${target.user.id}/roles`).set(bearer(admin.accessToken))
        .send({ roles: [], reason: 'Fin de mission' }).expect(200);
      expect(r2.body.roles.sort()).toEqual(['ARTIST', 'FAN']);
    });

    it('refuse d’attribuer FAN ou ARTIST à la main', async () => {
      const admin = await loginWithRoles(ctx, ['ADMIN']);
      const target = await login(ctx);
      await ctx.http().put(`/v1/admin/users/${target.user.id}/roles`).set(bearer(admin.accessToken)).send({ roles: ['ARTIST'], reason: 'Essai interdit' }).expect(400);
    });

    it('empêche un administrateur de retirer son propre rôle', async () => {
      const admin = await loginWithRoles(ctx, ['ADMIN']);
      const r = await ctx.http().put(`/v1/admin/users/${admin.user.id}/roles`).set(bearer(admin.accessToken)).send({ roles: ['SUPPORT'], reason: 'Erreur de manipulation' }).expect(403);
      expect(r.body.code).toBe('CANNOT_REMOVE_OWN_ADMIN');
    });

    it('est réservé aux administrateurs', async () => {
      const mod = await loginWithRoles(ctx, ['MODERATOR']);
      const target = await login(ctx);
      await ctx.http().put(`/v1/admin/users/${target.user.id}/roles`).set(bearer(mod.accessToken)).send({ roles: ['ADMIN'], reason: 'Prise de pouvoir' }).expect(403);
    });
  });

  describe('badge artiste vérifié (ACC-06)', () => {
    it('est attribué puis retiré avec motif, et apparaît sur la vitrine', async () => {
      const mod = await loginWithRoles(ctx, ['MODERATOR']);
      const artist = await login(ctx);
      const { slug, id } = await createArtist(ctx, artist.accessToken, { stageName: 'Charlotte Vérifiée', city: 'Douala', disciplineSlugs: ['musique'] });
      const r = await ctx.http().post(`/v1/admin/artists/${slug}/verification`).set(bearer(mod.accessToken))
        .send({ verified: true, reason: 'Identité et notoriété contrôlées' }).expect(200);
      expect(r.body.verified).toBe(true);
      expect((await ctx.http().get(`/v1/artists/${slug}`).expect(200)).body.verified).toBe(true);

      await ctx.http().post(`/v1/admin/artists/${slug}/verification`).set(bearer(mod.accessToken))
        .send({ verified: false, reason: 'Usurpation constatée' }).expect(200);
      const logs = await ctx.prisma.auditLog.findMany({ where: { entityId: id, action: { startsWith: 'artist.' } }, orderBy: { createdAt: 'asc' } });
      expect(logs.map((l) => l.action)).toEqual(['artist.create', 'artist.verify', 'artist.unverify']);
    });

    it('est interdit à un artiste sur son propre profil', async () => {
      const artist = await login(ctx);
      const { slug } = await createArtist(ctx, artist.accessToken, { stageName: 'Auto Proclamé', city: 'Douala', disciplineSlugs: ['danse'] });
      await ctx.http().post(`/v1/admin/artists/${slug}/verification`).set(bearer(artist.accessToken)).send({ verified: true, reason: 'Je me vérifie moi-même' }).expect(403);
    });
  });

  describe('journal d’audit', () => {
    it('se consulte par administrateur, filtré et paginé', async () => {
      const admin = await loginWithRoles(ctx, ['ADMIN']);
      const target = await login(ctx);
      for (const reason of ['Premier motif', 'Deuxième motif']) {
        await ctx.http().post(`/v1/admin/users/${target.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason }).expect(200);
        await ctx.http().post(`/v1/admin/users/${target.user.id}/reactivate`).set(bearer(admin.accessToken)).send({ reason }).expect(200);
      }
      const p1 = await ctx.http().get(`/v1/admin/audit-logs?entityId=${target.user.id}&action=user.&limit=3`).set(bearer(admin.accessToken)).expect(200);
      expect(p1.body.items).toHaveLength(3);
      expect(p1.body.items[0].action).toBe('user.reactivate');
      const p2 = await ctx.http().get(`/v1/admin/audit-logs?entityId=${target.user.id}&action=user.&limit=3&cursor=${p1.body.nextCursor}`).set(bearer(admin.accessToken)).expect(200);
      expect(p2.body.items.map((l: { action: string }) => l.action)).toEqual(['user.suspend', 'user.signup']);
    });

    it('est interdit au support', async () => {
      const support = await loginWithRoles(ctx, ['SUPPORT']);
      await ctx.http().get('/v1/admin/audit-logs').set(bearer(support.accessToken)).expect(403);
    });
  });
});
