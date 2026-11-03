import { bearer, createTestContext, login, TestContext } from './helpers';

describe('Profil, PIN, centres d’intérêt et artistes (ACC-03, ACC-04, ACC-07, ACC-09)', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestContext()));
  afterAll(async () => ctx.app.close());

  it('met à jour le profil', async () => {
    const s = await login(ctx);
    const r = await ctx.http().patch('/v1/me').set(bearer(s.accessToken))
      .send({ displayName: 'Brice', city: 'Douala', locale: 'en' }).expect(200);
    expect(r.body).toMatchObject({ displayName: 'Brice', city: 'Douala', locale: 'en' });
    await ctx.http().patch('/v1/me').set(bearer(s.accessToken)).send({ birthYear: new Date().getFullYear() - 5 }).expect(400);
  });

  it('crée puis change le code PIN, en refusant les codes faibles', async () => {
    const s = await login(ctx);
    const weak = await ctx.http().put('/v1/me/pin').set(bearer(s.accessToken)).send({ pin: '1234' }).expect(400);
    expect(weak.body.code).toBe('PIN_WEAK');
    await ctx.http().put('/v1/me/pin').set(bearer(s.accessToken)).send({ pin: '2580' }).expect(204);
    await ctx.http().put('/v1/me/pin').set(bearer(s.accessToken)).send({ pin: '7391' }).expect(403);
    await ctx.http().put('/v1/me/pin').set(bearer(s.accessToken)).send({ pin: '7391', currentPin: '2580' }).expect(204);
    const me = await ctx.http().get('/v1/me').set(bearer(s.accessToken)).expect(200);
    expect(me.body.hasPin).toBe(true);
  });

  it('enregistre les centres d’intérêt parmi les disciplines ouvertes', async () => {
    const s = await login(ctx);
    await ctx.http().put('/v1/me/interests').set(bearer(s.accessToken)).send({ disciplineSlugs: ['musique', 'humour'] }).expect(200);
    const me = await ctx.http().get('/v1/me').set(bearer(s.accessToken)).expect(200);
    expect(me.body.interests.map((d: { slug: string }) => d.slug).sort()).toEqual(['humour', 'musique']);
    // Le théâtre est prévu mais pas encore ouvert.
    await ctx.http().put('/v1/me/interests').set(bearer(s.accessToken)).send({ disciplineSlugs: ['theatre'] }).expect(400);
  });

  it('liste les 4 disciplines de lancement avec leurs catégories', async () => {
    const r = await ctx.http().get('/v1/disciplines').expect(200);
    expect(r.body.map((d: { slug: string }) => d.slug)).toEqual(['musique', 'humour', 'danse', 'peinture']);
    const music = r.body[0];
    expect(music.categories.map((c: { slug: string }) => c.slug)).toContain('makossa');
    expect(music.metadataSchema.length).toBeGreaterThan(0);
  });

  it('un fan devient artiste et reçoit le rôle ARTIST', async () => {
    const s = await login(ctx);
    const r = await ctx.http().post('/v1/artists').set(bearer(s.accessToken)).send({
      stageName: 'Junior Bonabéri', city: 'Douala', disciplineSlugs: ['musique'], categorySlugs: ['rap-hip-hop'],
      bioFr: 'Rappeur de Bonabéri',
    }).expect(201);
    expect(r.body).toMatchObject({ slug: 'junior-bonaberi', stageName: 'Junior Bonabéri', verified: false });
    expect(r.body.categories[0]).toMatchObject({ slug: 'rap-hip-hop', discipline: 'musique' });

    const me = await ctx.http().get('/v1/me').set(bearer(s.accessToken)).expect(200);
    expect(me.body.roles).toEqual(expect.arrayContaining(['FAN', 'ARTIST']));
    expect(me.body.artists[0]).toMatchObject({ slug: 'junior-bonaberi', memberRole: 'OWNER' });

    const pub = await ctx.http().get('/v1/artists/junior-bonaberi').expect(200);
    expect(pub.body.stageName).toBe('Junior Bonabéri');
    expect(JSON.stringify(pub.body)).not.toContain(s.phone);
  });

  it('donne un identifiant unique aux homonymes', async () => {
    const a = await login(ctx);
    const b = await login(ctx);
    const body = { stageName: 'Bantu Moves', city: 'Douala', type: 'COLLECTIVE', disciplineSlugs: ['danse'], categorySlugs: ['afro-dance'] };
    const r1 = await ctx.http().post('/v1/artists').set(bearer(a.accessToken)).send(body).expect(201);
    const r2 = await ctx.http().post('/v1/artists').set(bearer(b.accessToken)).send(body).expect(201);
    expect(r1.body.slug).toBe('bantu-moves');
    expect(r2.body.slug).toBe('bantu-moves-2');
    expect(r1.body.type).toBe('COLLECTIVE');
  });

  it('refuse une catégorie qui n’appartient pas à la discipline choisie', async () => {
    const s = await login(ctx);
    const r = await ctx.http().post('/v1/artists').set(bearer(s.accessToken)).send({
      stageName: 'Ernest', city: 'Douala', disciplineSlugs: ['peinture'], categorySlugs: ['makossa'],
    }).expect(400);
    expect(r.body.code).toBe('CATEGORY_UNKNOWN');
  });

  it('seul le propriétaire modifie le profil artiste', async () => {
    const owner = await login(ctx);
    const other = await login(ctx);
    const created = await ctx.http().post('/v1/artists').set(bearer(owner.accessToken)).send({
      stageName: 'Nadia Rires', city: 'Yaoundé', disciplineSlugs: ['humour'], categorySlugs: ['sketch'],
    }).expect(201);
    await ctx.http().patch(`/v1/artists/${created.body.slug}`).set(bearer(other.accessToken)).send({ city: 'Douala' }).expect(403);
    const r = await ctx.http().patch(`/v1/artists/${created.body.slug}`).set(bearer(owner.accessToken)).send({ bioEn: 'Comedian' }).expect(200);
    expect(r.body.bioEn).toBe('Comedian');
  });

  it('limite à 3 profils artistes par utilisateur', async () => {
    const s = await login(ctx);
    for (let i = 1; i <= 3; i++) {
      await ctx.http().post('/v1/artists').set(bearer(s.accessToken))
        .send({ stageName: `Projet ${i}`, city: 'Douala', disciplineSlugs: ['musique'] }).expect(201);
    }
    const r = await ctx.http().post('/v1/artists').set(bearer(s.accessToken))
      .send({ stageName: 'Projet 4', city: 'Douala', disciplineSlugs: ['musique'] }).expect(400);
    expect(r.body.code).toBe('ARTIST_LIMIT');
  });
});

describe('Back-office des disciplines (ADM-07)', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestContext()));
  afterAll(async () => ctx.app.close());

  async function admin() {
    const s = await login(ctx);
    await ctx.prisma.user.update({ where: { id: s.user.id }, data: { roles: ['FAN', 'ADMIN'] } });
    return s;
  }

  it('refuse l’accès aux non-administrateurs', async () => {
    const s = await login(ctx);
    await ctx.http().get('/v1/admin/disciplines').set(bearer(s.accessToken)).expect(403);
  });

  it('ouvre une nouvelle discipline par simple configuration', async () => {
    const a = await admin();
    await ctx.http().get('/v1/disciplines/slam-poesie').expect(404);
    await ctx.http().patch('/v1/admin/disciplines/slam-poesie').set(bearer(a.accessToken)).send({
      enabled: true,
      metadataSchema: [{ key: 'languages', labelFr: 'Langue', labelEn: 'Language', type: 'select', options: [{ value: 'fr', labelFr: 'Français', labelEn: 'French' }] }],
    }).expect(200);
    await ctx.http().post('/v1/admin/disciplines/slam-poesie/categories').set(bearer(a.accessToken))
      .send({ slug: 'slam', nameFr: 'Slam', nameEn: 'Slam' }).expect(201);
    const pub = await ctx.http().get('/v1/disciplines/slam-poesie').expect(200);
    expect(pub.body.categories[0].slug).toBe('slam');
    const log = await ctx.prisma.auditLog.findFirst({ where: { actorId: a.user.id, action: 'discipline.update' } });
    expect(log).not.toBeNull();
  });

  it('refuse une configuration de métadonnées invalide', async () => {
    const a = await admin();
    await ctx.http().patch('/v1/admin/disciplines/theatre').set(bearer(a.accessToken))
      .send({ metadataSchema: [{ key: 'Mauvaise Cle', labelFr: 'x', labelEn: 'x', type: 'text' }] }).expect(400);
  });

  it('crée une discipline entièrement nouvelle', async () => {
    const a = await admin();
    const r = await ctx.http().post('/v1/admin/disciplines').set(bearer(a.accessToken)).send({
      slug: 'chant-choral', nameFr: 'Chant choral', nameEn: 'Choral singing', allowedFormats: ['AUDIO', 'VIDEO'],
    }).expect(201);
    expect(r.body.enabled).toBe(false);
    await ctx.http().post('/v1/admin/disciplines').set(bearer(a.accessToken)).send({
      slug: 'chant-choral', nameFr: 'Chant choral', nameEn: 'Choral singing', allowedFormats: ['AUDIO'],
    }).expect(409);
  });
});

describe('Santé du service', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestContext()));
  afterAll(async () => ctx.app.close());
  it('répond ok avec la base de données', async () => {
    const r = await ctx.http().get('/health').expect(200);
    expect(r.body).toMatchObject({ status: 'ok', database: 'up' });
  });
});
