/**
 * Non-régression du J2 : chaque défaut trouvé par la recette qualité et la revue de sécurité
 * a ici le test qui prouve sa correction. Ne pas supprimer un test sans décision écrite.
 */
import { existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { bearer, createArtist, createTestContext, login, loginWithRoles, TestContext } from './helpers';
import { MediaService } from '../src/media/media.service';
import { LocalDiskStorage } from '../src/storage/local-disk.storage';
import { makeImage } from './images';

const diskPath = (url: string) => join(process.env.STORAGE_DIR!, new URL(url).pathname.replace(/^\/media\//, ''));

describe('Non-régression J2', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestContext()));
  afterAll(async () => ctx.app.close());

  // ---------- Images ----------

  it('deux envois simultanés de photo ne laissent pas d’image orpheline', async () => {
    const u = await login(ctx);
    const { slug, id } = await createArtist(ctx, u.accessToken, { stageName: 'Course Photo', city: 'Douala', disciplineSlugs: ['musique'] });
    const [a, b] = await Promise.all([makeImage(800, 800), makeImage(900, 900)]);
    const results = await Promise.all([
      ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', a, 'a.jpg'),
      ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', b, 'b.jpg'),
    ]);
    // L'un gagne ; l'autre réussit aussi (s'il passe après) ou reçoit un conflit explicite.
    expect(results.some((r) => r.status === 200)).toBe(true);
    for (const r of results) {
      expect([200, 409]).toContain(r.status);
      if (r.status === 409) expect(r.body.code).toBe('ARTIST_IMAGE_CONFLICT');
    }
    const artist = await ctx.prisma.artist.findUniqueOrThrow({ where: { id } });
    const images = await ctx.prisma.mediaImage.findMany({ where: { artistId: id, purpose: 'ARTIST_AVATAR' } });
    expect(images.map((i) => i.id)).toEqual([artist.avatarImageId]);
  });

  it('refuse une image de plus de 25 mégapixels avec IMAGE_TOO_LARGE', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Grand Format', city: 'Douala', disciplineSlugs: ['peinture'] });
    const huge = await sharp({ create: { width: 8000, height: 7000, channels: 3, background: { r: 10, g: 10, b: 10 } } }).png().toBuffer();
    expect(huge.length).toBeLessThan(15 * 1024 * 1024);
    const r = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', huge, 'huge.png');
    expect({ status: r.status, code: r.body.code }).toEqual({ status: 422, code: 'IMAGE_TOO_LARGE' });
    const thirty = await sharp({ create: { width: 6000, height: 5000, channels: 3, background: { r: 10, g: 10, b: 10 } } }).png().toBuffer();
    const r2 = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', thirty, 'trente.png');
    expect({ status: r2.status, code: r2.body.code }).toEqual({ status: 422, code: 'IMAGE_TOO_LARGE' });
  });

  it('refuse une image trop étirée', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Image Etiree', city: 'Douala', disciplineSlugs: ['peinture'] });
    const r = await ctx.http().put(`/v1/artists/${slug}/banner`).set(bearer(u.accessToken)).attach('file', await makeImage(7000, 1000), 'e.jpg');
    expect({ status: r.status, code: r.body.code }).toEqual({ status: 422, code: 'IMAGE_BAD_PROPORTIONS' });
  });

  it('sert les fichiers avec l’en-tête nosniff', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'En Tete Nosniff', city: 'Douala', disciplineSlugs: ['danse'] });
    const r = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', await makeImage(400, 400), 'a.jpg').expect(200);
    const file = await ctx.http().get(new URL(r.body.avatar.variants[0].url).pathname).expect(200);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
  });

  it('décline la bannière en 800 et 1600 px au format 3:1', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Banniere Ratio', city: 'Douala', disciplineSlugs: ['danse'] });
    const r = await ctx.http().put(`/v1/artists/${slug}/banner`).set(bearer(u.accessToken)).attach('file', await makeImage(2000, 1500), 'b.jpg').expect(200);
    expect(r.body.banner.variants.map((v: { width: number; height: number }) => [v.width, v.height])).toEqual([[800, 267], [1600, 533]]);
  });

  it('accepte une photo AVIF', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Format Avif', city: 'Douala', disciplineSlugs: ['danse'] });
    const avif = await sharp(await makeImage(400, 400, 'png')).avif().toBuffer();
    await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', avif, 'a.avif').expect(200);
  });

  it('n’agrandit jamais une petite photo (300 px → 128, 256, 300)', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Petite Photo', city: 'Douala', disciplineSlugs: ['danse'] });
    const r = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', await makeImage(300, 300), 'a.jpg').expect(200);
    expect(r.body.avatar.variants.map((v: { width: number }) => v.width)).toEqual([128, 256, 300]);
  });

  it('une image appartient au profil artiste : supprimer le compte de son auteur ne la perd pas', async () => {
    const u = await login(ctx);
    const { slug, id } = await createArtist(ctx, u.accessToken, { stageName: 'Compte Purge', city: 'Douala', disciplineSlugs: ['danse'] });
    const r = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', await makeImage(400, 400), 'a.jpg').expect(200);
    const file = diskPath(r.body.avatar.variants[0].url);
    await ctx.prisma.user.delete({ where: { id: u.user.id } });
    const image = await ctx.prisma.mediaImage.findFirstOrThrow({ where: { artistId: id } });
    expect(image.uploadedById).toBeNull();
    expect(existsSync(file)).toBe(true);
  });

  it('la purge supprime les images qu’aucun profil n’utilise, avec leurs fichiers', async () => {
    const u = await login(ctx);
    const { id } = await createArtist(ctx, u.accessToken, { stageName: 'Image Abandonnee', city: 'Douala', disciplineSlugs: ['danse'] });
    const media = ctx.app.get(MediaService);
    const orphan = await media.createImage(id, u.user.id, 'ARTIST_AVATAR', await makeImage(400, 400));
    const file = join(process.env.STORAGE_DIR!, (orphan.variants as { key: string }[])[0].key);
    expect(existsSync(file)).toBe(true);
    // Trop récente : protégée par le délai de grâce
    expect((await media.purgeOrphans()).images).toBe(0);
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect((await media.purgeOrphans(later)).images).toBeGreaterThanOrEqual(1);
    expect(await ctx.prisma.mediaImage.findUnique({ where: { id: orphan.id } })).toBeNull();
    expect(existsSync(file)).toBe(false);
  });

  it('rejoue la suppression d’un fichier quand le stockage échoue', async () => {
    const u = await login(ctx);
    const { id } = await createArtist(ctx, u.accessToken, { stageName: 'Stockage Capricieux', city: 'Douala', disciplineSlugs: ['danse'] });
    const media = ctx.app.get(MediaService);
    const storage = ctx.app.get(LocalDiskStorage);
    const image = await media.createImage(id, u.user.id, 'ARTIST_AVATAR', await makeImage(400, 400));
    const spy = jest.spyOn(storage, 'delete').mockRejectedValue(new Error('stockage indisponible'));
    await media.deleteImage(image.id);
    spy.mockRestore();
    const pending = await ctx.prisma.storageDeletion.findMany({ where: { key: { contains: image.id } } });
    expect(pending.length).toBe(image.variants ? (image.variants as unknown[]).length : 0);
    expect(pending[0]).toMatchObject({ attempts: 1, lastError: 'stockage indisponible' });
    await ctx.prisma.storageDeletion.updateMany({ where: { key: { contains: image.id } }, data: { nextAttemptAt: new Date(0) } });
    await media.processDeletionQueue();
    expect(await ctx.prisma.storageDeletion.count({ where: { key: { contains: image.id } } })).toBe(0);
  });

  it('la photo envoyée par un manager reste sur la vitrine quand le compte du manager est supprimé', async () => {
    const owner = await login(ctx);
    const manager = await login(ctx);
    const { slug, id } = await createArtist(ctx, owner.accessToken, { stageName: 'Label Manager', city: 'Douala', disciplineSlugs: ['musique'] });
    await ctx.prisma.artistMember.create({ data: { artistId: id, userId: manager.user.id, role: 'MANAGER', permissions: ['profile.edit'] } });
    await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(manager.accessToken)).attach('file', await makeImage(400, 400), 'a.jpg').expect(200);
    await ctx.prisma.user.delete({ where: { id: manager.user.id } });
    const pub = await ctx.http().get(`/v1/artists/${slug}`).expect(200);
    expect(pub.body.avatar).not.toBeNull();
  });

  // ---------- Droits ----------

  it('un membre ayant profile.edit modifie la vitrine ; un membre sans ce droit est refusé', async () => {
    const owner = await login(ctx);
    const editor = await login(ctx);
    const member = await login(ctx);
    const { slug, id } = await createArtist(ctx, owner.accessToken, { stageName: 'Droits Fins', city: 'Douala', disciplineSlugs: ['musique'] });
    await ctx.prisma.artistMember.createMany({ data: [
      { artistId: id, userId: editor.user.id, role: 'MANAGER', permissions: ['profile.edit'] },
      { artistId: id, userId: member.user.id, role: 'MEMBER', permissions: [] },
    ] });
    await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(editor.accessToken)).send({ tagline: 'Par le manager' }).expect(200);
    await ctx.http().put(`/v1/artists/${slug}/booking-profile`).set(bearer(editor.accessToken)).send({ isBookable: false }).expect(200);
    await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(member.accessToken)).send({ tagline: 'Par le membre' }).expect(403);
    await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(member.accessToken)).attach('file', await makeImage(400, 400), 'a.jpg').expect(403);
    await ctx.http().put(`/v1/artists/${slug}/booking-profile`).set(bearer(member.accessToken)).send({ isBookable: false }).expect(403);
  });

  it('un modérateur ne peut pas réactiver un membre de l’équipe suspendu par un administrateur', async () => {
    const admin = await loginWithRoles(ctx, ['ADMIN']);
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    const finance = await loginWithRoles(ctx, ['FINANCE']);
    await ctx.http().post(`/v1/admin/users/${finance.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Fraude interne suspectée' }).expect(200);
    const r = await ctx.http().post(`/v1/admin/users/${finance.user.id}/reactivate`).set(bearer(mod.accessToken)).send({ reason: 'Je le connais bien' });
    expect({ status: r.status, code: r.body.code }).toEqual({ status: 403, code: 'ADMIN_CANNOT_REACTIVATE_STAFF' });
  });

  it('un modérateur ne lève pas une suspension décidée par un administrateur, mais lève la sienne', async () => {
    const admin = await loginWithRoles(ctx, ['ADMIN']);
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    const a = await login(ctx);
    const b = await login(ctx);
    await ctx.http().post(`/v1/admin/users/${a.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Fraude au paiement' }).expect(200);
    const locked = await ctx.http().post(`/v1/admin/users/${a.user.id}/reactivate`).set(bearer(mod.accessToken)).send({ reason: 'Je pense que ça va' }).expect(403);
    expect(locked.body.code).toBe('ADMIN_SUSPENSION_LOCKED');
    await ctx.http().post(`/v1/admin/users/${b.user.id}/suspend`).set(bearer(mod.accessToken)).send({ reason: 'Spam de commentaires' }).expect(200);
    await ctx.http().post(`/v1/admin/users/${b.user.id}/reactivate`).set(bearer(mod.accessToken)).send({ reason: 'Erreur de ma part' }).expect(200);
  });

  it('le verrou reste si l’administrateur qui a suspendu perd ensuite son rôle (N1)', async () => {
    const admin = await loginWithRoles(ctx, ['ADMIN']);
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    const fraudster = await login(ctx);
    await ctx.http().post(`/v1/admin/users/${fraudster.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Fraude au paiement' }).expect(200);
    await ctx.prisma.user.update({ where: { id: admin.user.id }, data: { roles: ['FAN'] } });
    const r = await ctx.http().post(`/v1/admin/users/${fraudster.user.id}/reactivate`).set(bearer(mod.accessToken)).send({ reason: 'Plus d’admin, je lève' }).expect(403);
    expect(r.body.code).toBe('ADMIN_SUSPENSION_LOCKED');
  });

  it('une suspension puis une réactivation conservent une demande de suppression en cours (ACC-12)', async () => {
    const admin = await loginWithRoles(ctx, ['ADMIN']);
    const u = await login(ctx);
    await ctx.http().post('/v1/me/deletion').set(bearer(u.accessToken)).expect(202);
    await ctx.http().post(`/v1/admin/users/${u.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Enquête en cours' }).expect(200);
    const r = await ctx.http().post(`/v1/admin/users/${u.user.id}/reactivate`).set(bearer(admin.accessToken)).send({ reason: 'Enquête close' }).expect(200);
    expect(r.body.status).toBe('DELETION_PENDING');
    expect(r.body.deletionRequestedAt).not.toBeNull();
  });

  it('un compte suspendu masque son profil artiste (vitrine, annuaire, QR code)', async () => {
    const admin = await loginWithRoles(ctx, ['ADMIN']);
    const u = await login(ctx);
    const city = `Masque-${Date.now().toString(36)}`;
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Arnaqueur Masque', city, disciplineSlugs: ['musique'] });
    await ctx.http().get(`/v1/artists/${slug}`).expect(200);
    await ctx.http().post(`/v1/admin/users/${u.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Arnaque avérée' }).expect(200);
    await ctx.http().get(`/v1/artists/${slug}`).expect(404);
    await ctx.http().get(`/v1/artists/${slug}/qr.svg`).expect(404);
    expect((await ctx.http().get(`/v1/artists?city=${city}`).expect(200)).body.items).toEqual([]);
  });

  it('un artiste vérifié qui change de nom de scène perd son badge, et le journal garde l’avant et l’après', async () => {
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    const u = await login(ctx);
    const { slug, id } = await createArtist(ctx, u.accessToken, { stageName: 'Vrai Nom', city: 'Douala', disciplineSlugs: ['musique'] });
    await ctx.http().post(`/v1/admin/artists/${slug}/verification`).set(bearer(mod.accessToken)).send({ verified: true, reason: 'Identité contrôlée' }).expect(200);
    await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ tagline: 'Sans changer de nom' }).expect(200);
    expect((await ctx.http().get(`/v1/artists/${slug}`)).body.verified).toBe(true);
    const r = await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ stageName: 'Star Usurpée' }).expect(200);
    expect(r.body.verified).toBe(false);
    const logs = await ctx.prisma.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: 'asc' } });
    expect(logs.find((l) => l.action === 'artist.update' && JSON.stringify(l.data).includes('Star Usurpée'))?.data)
      .toMatchObject({ stageName: { before: 'Vrai Nom', after: 'Star Usurpée' } });
    expect(logs.at(-1)).toMatchObject({ action: 'artist.unverify', data: expect.objectContaining({ automatic: true }) });
  });

  it('un modérateur ne peut pas vérifier son propre profil artiste', async () => {
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    const { slug } = await createArtist(ctx, mod.accessToken, { stageName: 'Moderateur Artiste', city: 'Douala', disciplineSlugs: ['humour'] });
    const r = await ctx.http().post(`/v1/admin/artists/${slug}/verification`).set(bearer(mod.accessToken)).send({ verified: true, reason: 'Je me connais' }).expect(403);
    expect(r.body.code).toBe('ARTIST_VERIFY_OWN_PROFILE');
  });

  // ---------- Complétude ----------

  it('les catégories se modifient après la création, dans les disciplines de l’artiste seulement', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Sans Categorie', city: 'Douala', disciplineSlugs: ['musique'] });
    const r = await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ categorySlugs: ['makossa', 'bikutsi'] }).expect(200);
    expect(r.body.categories.map((c: { slug: string }) => c.slug).sort()).toEqual(['bikutsi', 'makossa']);
    const m = await ctx.http().get(`/v1/artists/${slug}/manage`).set(bearer(u.accessToken)).expect(200);
    expect(m.body.completeness.missing).not.toContain('categories');
    const bad = await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ categorySlugs: ['stand-up'] }).expect(400);
    expect(bad.body.code).toBe('CATEGORY_UNKNOWN');
    const cleared = await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ categorySlugs: [] }).expect(200);
    expect(cleared.body.categories).toEqual([]);
  });

  it('atteint 100 quand tout est renseigné', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Profil Complet', city: 'Douala', disciplineSlugs: ['musique'], categorySlugs: ['makossa'], bioFr: 'Bio' });
    await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('file', await makeImage(400, 400), 'a.jpg').expect(200);
    await ctx.http().put(`/v1/artists/${slug}/banner`).set(bearer(u.accessToken)).attach('file', await makeImage(1800, 600), 'b.jpg').expect(200);
    await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ tagline: 'Accroche', socialLinks: { spotify: 'https://open.spotify.com/artist/x' } }).expect(200);
    await ctx.http().put(`/v1/artists/${slug}/booking-profile`).set(bearer(u.accessToken)).send({ isBookable: true, priceMinXaf: 1000, serviceTypes: ['concert'] }).expect(200);
    const m = await ctx.http().get(`/v1/artists/${slug}/manage`).set(bearer(u.accessToken)).expect(200);
    expect(m.body.completeness).toEqual({ score: 100, missing: [] });
  });

  // ---------- Annuaire ----------

  it('cherche par nom avec accents dans la requête et filtres combinés', async () => {
    const u = await login(ctx);
    const city = `Limbe-${Date.now().toString(36)}`;
    await createArtist(ctx, u.accessToken, { stageName: 'Elodie Bikutsi', city, disciplineSlugs: ['musique'] });
    const r = await ctx.http().get(`/v1/artists?q=${encodeURIComponent('ÉLODIE')}&city=${city}&discipline=musique`).expect(200);
    expect(r.body.items.map((a: { stageName: string }) => a.stageName)).toEqual(['Elodie Bikutsi']);
    const none = await ctx.http().get(`/v1/artists?q=elodie&city=${city}&discipline=danse`).expect(200);
    expect(none.body.items).toEqual([]);
  });

  it('retrouve la ligature « œ » en tapant « oe »', async () => {
    const u = await login(ctx);
    const city = `Buea-${Date.now().toString(36)}`;
    await createArtist(ctx, u.accessToken, { stageName: 'Cœur de Lion', city, disciplineSlugs: ['musique'] });
    const r = await ctx.http().get(`/v1/artists?q=coeur&city=${city}`).expect(200);
    expect(r.body.items).toHaveLength(1);
  });

  it('le filtre ville est insensible aux accents et à la casse (Yaoundé = YAOUNDE)', async () => {
    const u = await login(ctx);
    const tag = Date.now().toString(36);
    await createArtist(ctx, u.accessToken, { stageName: `Ville Accent ${tag}`, city: 'Yaoundé', disciplineSlugs: ['musique'] });
    const r = await ctx.http().get(`/v1/artists?city=YAOUNDE&q=${tag}`).expect(200);
    expect(r.body.items).toHaveLength(1);
    const joker = await ctx.http().get(`/v1/artists?city=${encodeURIComponent('%')}&q=${tag}`).expect(200);
    expect(joker.body.items).toHaveLength(0);
  });

  it.each([['%25'], ['_']])('le joker SQL %s dans le nom ne correspond pas à tout', async (q) => {
    const u = await login(ctx);
    const city = `Joker-${Date.now().toString(36)}-${q.length}`;
    await createArtist(ctx, u.accessToken, { stageName: 'Nom Ordinaire', city, disciplineSlugs: ['musique'] });
    const r = await ctx.http().get(`/v1/artists?q=${q}&city=${city}`).expect(200);
    expect(r.body.items).toHaveLength(0);
  });

  it.each([['0', 400], ['51', 400], ['50', 200], ['1.5', 400], ['abc', 400]])('limit=%s → %d', async (limit, status) => {
    await ctx.http().get(`/v1/artists?limit=${limit}`).expect(status);
  });

  it('deux créations simultanées du même nom de scène réussissent toutes les deux', async () => {
    const a = await login(ctx);
    const b = await login(ctx);
    const name = `Homonyme ${Date.now().toString(36)}`;
    const results = await Promise.all([a, b].map((u) =>
      ctx.http().post('/v1/artists').set(bearer(u.accessToken)).send({ stageName: name, city: 'Douala', disciplineSlugs: ['musique'] })));
    expect(results.map((r) => `${r.status} ${r.body.code ?? ''}`).sort()).toEqual(['201 ', '201 ']);
  });

  // ---------- Back-office ----------

  it('recherche un utilisateur par nom, sans tenir compte de la casse', async () => {
    const support = await loginWithRoles(ctx, ['SUPPORT']);
    const target = await login(ctx);
    const name = `Zéphirin ${Date.now().toString(36)}`;
    await ctx.prisma.user.update({ where: { id: target.user.id }, data: { displayName: name } });
    const r = await ctx.http().get(`/v1/admin/users?q=${encodeURIComponent(name.toUpperCase())}`).set(bearer(support.accessToken)).expect(200);
    expect(r.body.items.map((u: { id: string }) => u.id)).toEqual([target.user.id]);
  });

  it('la recherche d’utilisateurs est réservée aux administrateurs et au support (critère J2)', async () => {
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    await ctx.http().get('/v1/admin/users').set(bearer(mod.accessToken)).expect(403);
  });

  it('journalise le changement de rôles avec son motif ; la réactivation aussi', async () => {
    const admin = await loginWithRoles(ctx, ['ADMIN']);
    const target = await login(ctx);
    await ctx.http().put(`/v1/admin/users/${target.user.id}/roles`).set(bearer(admin.accessToken)).send({ roles: ['SUPPORT'], reason: 'Arrivée au support' }).expect(200);
    const log = await ctx.prisma.auditLog.findFirst({ where: { action: 'user.roles', entityId: target.user.id } });
    expect(log).toMatchObject({ actorId: admin.user.id, data: expect.objectContaining({ reason: 'Arrivée au support' }) });
    await ctx.http().post(`/v1/admin/users/${target.user.id}/suspend`).set(bearer(admin.accessToken)).send({ reason: 'Test suspension' }).expect(200);
    await ctx.http().post(`/v1/admin/users/${target.user.id}/reactivate`).set(bearer(admin.accessToken)).send({ reason: 'Test réactivation' }).expect(200);
    const re = await ctx.prisma.auditLog.findFirst({ where: { action: 'user.reactivate', entityId: target.user.id } });
    expect(re?.data).toMatchObject({ reason: 'Test réactivation' });
  });

  it('le journal d’audit est interdit au modérateur', async () => {
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    await ctx.http().get('/v1/admin/audit-logs').set(bearer(mod.accessToken)).expect(403);
  });

  it('badge vérifié : motif obligatoire et artiste inconnu', async () => {
    const mod = await loginWithRoles(ctx, ['MODERATOR']);
    const r = await ctx.http().post('/v1/admin/artists/inconnu-total/verification').set(bearer(mod.accessToken)).send({ verified: true, reason: 'Motif valable' }).expect(404);
    expect(r.body.code).toBe('ARTIST_NOT_FOUND');
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Sans Motif', city: 'Douala', disciplineSlugs: ['musique'] });
    await ctx.http().post(`/v1/admin/artists/${slug}/verification`).set(bearer(mod.accessToken)).send({ verified: true }).expect(400);
  });

  // ---------- Format des erreurs (skill conventions-api) ----------

  it('un identifiant non UUID renvoie ID_INVALID', async () => {
    const admin = await loginWithRoles(ctx, ['ADMIN']);
    const r = await ctx.http().get('/v1/admin/users/pas-un-uuid').set(bearer(admin.accessToken)).expect(400);
    expect(r.body).toEqual({ code: 'ID_INVALID', message: 'Identifiant invalide' });
  });

  it('une route inconnue et un curseur trafiqué renvoient un code stable, jamais une erreur 500', async () => {
    const unknown = await ctx.http().get('/v1/route-qui-n-existe-pas').expect(404);
    expect(unknown.body.code).toBe('NOT_FOUND');
    const forged = Buffer.from(`2026-01-01T00:00:00.000Z|${'f'.repeat(36)}`).toString('base64url');
    const r = await ctx.http().get(`/v1/artists?cursor=${forged}`).expect(400);
    expect(r.body.code).toBe('CURSOR_INVALID');
  });

  it('un fichier envoyé dans un autre champ que « file » renvoie un code stable', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Mauvais Champ', city: 'Douala', disciplineSlugs: ['musique'] });
    const r = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken)).attach('photo', await makeImage(400, 400), 'a.jpg');
    expect({ status: r.status, code: r.body.code }).toEqual({ status: 400, code: 'FILE_FIELD_INVALID' });
    const extra = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(u.accessToken))
      .field('note', 'champ en trop').attach('file', await makeImage(400, 400), 'a.jpg');
    expect({ status: extra.status, code: extra.body.code }).toEqual({ status: 400, code: 'FILE_FIELD_INVALID' });
  });

  it('QR code d’un artiste inconnu : erreur JSON, pas un faux SVG', async () => {
    const r = await ctx.http().get('/v1/artists/inconnu-total/qr.svg').expect(404);
    expect(r.headers['content-type']).toContain('application/json');
  });

  it('QR code sombre sur fond blanc', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Qr Clair', city: 'Douala', disciplineSlugs: ['musique'] });
    const r = await ctx.http().get(`/v1/artists/${slug}/qr.svg`).buffer(true)
      .parse((res, done) => { let d = ''; res.on('data', (c: Buffer) => (d += c.toString())); res.on('end', () => done(null, d)); }).expect(200);
    expect(r.body.toLowerCase()).toContain('#ffffff');
    expect(r.body.toLowerCase()).toContain('#1a1206');
  });

  // ---------- Liens des réseaux sociaux (normalisation stricte) ----------

  it.each([
    [{ instagram: 'https://user:pass@instagram.com/u' }],
    [{ instagram: 'https://instagram.com\\@evil.com' }],
    [{ instagram: 'https://instagram.com:8443/u' }],
    [{ instagram: 'https://insta\tgram.com/u' }],
    [{ website: 'https://192.168.1.10/' }],
    [{ website: 'https://localhost/' }],
    [{ website: 'javascript:alert(1)' }],
  ])('refuse le lien piégé %j', async (links) => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: `Lien ${Math.random().toString(36).slice(2, 7)}`, city: 'Douala', disciplineSlugs: ['musique'] });
    await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ socialLinks: links }).expect(400);
  });

  it('enregistre les liens sous leur forme normalisée', async () => {
    const u = await login(ctx);
    const { slug } = await createArtist(ctx, u.accessToken, { stageName: 'Lien Normalise', city: 'Douala', disciplineSlugs: ['musique'] });
    const r = await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(u.accessToken)).send({ socialLinks: { instagram: 'https://WWW.Instagram.COM/ayo' } }).expect(200);
    expect(r.body.socialLinks.instagram).toBe('https://www.instagram.com/ayo');
  });
});
