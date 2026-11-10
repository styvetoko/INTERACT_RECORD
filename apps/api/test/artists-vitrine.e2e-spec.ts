import { existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { bearer, createArtist, createTestContext, login, TestContext } from './helpers';
import { makeImage } from './images';

const mediaPath = (url: string) => new URL(url).pathname; // /media/images/...
const diskPath = (url: string) => join(process.env.STORAGE_DIR!, mediaPath(url).replace(/^\/media\//, ''));

describe('Vitrine des artistes (PRO-01, PRO-04, PRO-06, parcours 7.2)', () => {
  let ctx: TestContext;
  let owner: Awaited<ReturnType<typeof login>>;
  let slug: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await login(ctx);
    slug = (await createArtist(ctx, owner.accessToken, {
      stageName: 'Ernest Bonanjo', city: 'Douala', disciplineSlugs: ['peinture'], categorySlugs: ['contemporaine'],
    })).slug;
  });
  afterAll(async () => ctx.app.close());

  describe('photo de profil et bannière', () => {
    it('traite la photo : carré, 3 tailles WebP, couleur dominante, aperçu flou, fichiers servis', async () => {
      const res = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken))
        .attach('file', await makeImage(1200, 900), 'photo.jpg').expect(200);
      const avatar = res.body.avatar;
      expect(avatar.variants.map((v: { width: number }) => v.width)).toEqual([128, 256, 512]);
      for (const v of avatar.variants) expect(v.height).toBe(v.width);
      expect(avatar.dominantColor).toMatch(/^#[0-9A-F]{6}$/);
      expect(avatar.placeholder).toMatch(/^data:image\/webp;base64,/);

      const file = await ctx.http().get(mediaPath(avatar.variants[2].url)).expect(200);
      expect(file.headers['content-type']).toContain('image/webp');
      const meta = await sharp(file.body).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 512, height: 512 });
    });

    it('supprime les métadonnées (EXIF, position) et applique la rotation du téléphone', async () => {
      // Photo prise en portrait : 900 × 1200 réels, stockée 1200 × 900 avec orientation 6
      const res = await ctx.http().put(`/v1/artists/${slug}/banner`).set(bearer(owner.accessToken))
        .attach('file', await makeImage(1800, 1200, 'jpeg', { withSecretExif: true }), 'banniere.jpg').expect(200);
      const big = res.body.banner.variants.at(-1);
      expect(big).toMatchObject({ width: 1600, height: 533 });
      const stored = await sharp(diskPath(big.url)).metadata();
      expect(stored.exif).toBeUndefined();
      expect(stored.orientation).toBeUndefined();

      // Une image tournée de 90° devient trop étroite pour une bannière : la rotation est bien prise en compte.
      const rotated = await ctx.http().put(`/v1/artists/${slug}/banner`).set(bearer(owner.accessToken))
        .attach('file', await makeImage(1200, 400, 'jpeg', { orientation: 6 }), 'tournee.jpg').expect(422);
      expect(rotated.body.code).toBe('IMAGE_TOO_SMALL');
    });

    it('accepte PNG et WebP, refuse GIF, texte, image trop petite, fichier trop lourd ou absent', async () => {
      await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', await makeImage(400, 400, 'png'), 'a.png').expect(200);
      await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', await makeImage(400, 400, 'webp'), 'a.webp').expect(200);

      const gif = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', await makeImage(400, 400, 'gif'), 'a.gif').expect(422);
      expect(gif.body.code).toBe('IMAGE_UNSUPPORTED');
      const text = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', Buffer.from('ceci n’est pas une image'), 'photo.jpg').expect(422);
      expect(text.body.code).toBe('IMAGE_UNSUPPORTED');
      const small = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', await makeImage(150, 150), 'petit.jpg').expect(422);
      expect(small.body.code).toBe('IMAGE_TOO_SMALL');
      const heavy = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', Buffer.alloc(16 * 1024 * 1024, 1), 'lourd.jpg').expect(413);
      expect(heavy.body.code).toBe('FILE_TOO_LARGE');
      const missing = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).expect(400);
      expect(missing.body.code).toBe('FILE_MISSING');
    });

    it('supprime les fichiers de l’ancienne image quand on la remplace ou la retire', async () => {
      const first = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', await makeImage(600, 600), 'a.jpg').expect(200);
      const oldFile = diskPath(first.body.avatar.variants[0].url);
      expect(existsSync(oldFile)).toBe(true);
      const second = await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).attach('file', await makeImage(700, 700), 'b.jpg').expect(200);
      expect(existsSync(oldFile)).toBe(false);
      const newFile = diskPath(second.body.avatar.variants[0].url);

      const removed = await ctx.http().delete(`/v1/artists/${slug}/avatar`).set(bearer(owner.accessToken)).expect(200);
      expect(removed.body.avatar).toBeNull();
      expect(existsSync(newFile)).toBe(false);
      expect(await ctx.prisma.mediaImage.count({ where: { uploadedById: owner.user.id, purpose: 'ARTIST_AVATAR' } })).toBe(0);
      expect(await ctx.prisma.storageDeletion.count()).toBe(0);
    });

    it('interdit à un autre utilisateur de changer les images', async () => {
      const other = await login(ctx);
      await ctx.http().put(`/v1/artists/${slug}/avatar`).set(bearer(other.accessToken)).attach('file', await makeImage(400, 400), 'x.jpg').expect(403);
      await ctx.http().delete(`/v1/artists/${slug}/banner`).set(bearer(other.accessToken)).expect(403);
      await ctx.http().put(`/v1/artists/${slug}/avatar`).attach('file', await makeImage(400, 400), 'x.jpg').expect(401);
    });
  });

  describe('accroche et liens', () => {
    it('enregistre les liens vers le bon réseau et retire un lien avec null', async () => {
      const r = await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(owner.accessToken)).send({
        tagline: 'Peintre de la lumière de Douala',
        socialLinks: { instagram: 'https://www.instagram.com/ernest', youtube: 'https://youtu.be/abc', website: 'https://ernest.art' },
      }).expect(200);
      expect(r.body.tagline).toBe('Peintre de la lumière de Douala');
      expect(r.body.socialLinks).toEqual({ instagram: 'https://www.instagram.com/ernest', youtube: 'https://youtu.be/abc', website: 'https://ernest.art/' });

      const r2 = await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(owner.accessToken)).send({ socialLinks: { youtube: null } }).expect(200);
      expect(Object.keys(r2.body.socialLinks).sort()).toEqual(['instagram', 'website']);
    });

    it.each([
      [{ instagram: 'https://evil.example.com/ernest' }],
      [{ tiktok: 'http://www.tiktok.com/@ernest' }],
      [{ facebook: 'https://facebook.com.evil.cm/x' }],
      [{ unknown: 'https://example.com' }],
    ])('refuse un lien trompeur ou inconnu %j', async (links) => {
      await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(owner.accessToken)).send({ socialLinks: links }).expect(400);
    });

    it('limite l’accroche à 80 caractères', async () => {
      await ctx.http().patch(`/v1/artists/${slug}`).set(bearer(owner.accessToken)).send({ tagline: 'x'.repeat(81) }).expect(400);
    });
  });

  describe('fiche booking (PRO-06)', () => {
    it('liste les types de prestations', async () => {
      const r = await ctx.http().get('/v1/reference/booking-service-types').expect(200);
      expect(r.body.map((t: { value: string }) => t.value)).toEqual(expect.arrayContaining(['concert', 'peinture-live', 'spectacle-humour']));
    });

    it('n’affiche la fiche publiquement que si l’artiste est réservable', async () => {
      await ctx.http().put(`/v1/artists/${slug}/booking-profile`).set(bearer(owner.accessToken))
        .send({ isBookable: false, priceMinXaf: 50000, travelCities: ['Douala'] }).expect(200);
      expect((await ctx.http().get(`/v1/artists/${slug}`).expect(200)).body.booking).toBeNull();

      const r = await ctx.http().put(`/v1/artists/${slug}/booking-profile`).set(bearer(owner.accessToken)).send({
        isBookable: true, priceMinXaf: 150000, priceMaxXaf: 400000, travelCities: ['Douala', 'Yaoundé', 'Douala'],
        serviceTypes: ['peinture-live', 'commande-oeuvre'], technicalRider: 'Chevalet fourni, 2 m² au sol',
      }).expect(200);
      expect(r.body.booking).toMatchObject({ priceMinXaf: 150000, priceMaxXaf: 400000, travelCities: ['Douala', 'Yaoundé'] });
    });

    it.each([
      [{ isBookable: true, priceMinXaf: 100000 }, 'serviceTypes'],
      [{ isBookable: true, serviceTypes: ['concert'] }, 'priceMinXaf'],
      [{ isBookable: true, serviceTypes: ['concert'], priceMinXaf: 500000, priceMaxXaf: 100000 }, 'priceMaxXaf'],
      [{ isBookable: true, serviceTypes: ['concert'], priceMinXaf: 1500.5 }, 'priceMinXaf'],
      [{ isBookable: true, serviceTypes: ['karaoke'], priceMinXaf: 1000 }, 'serviceTypes.0'],
    ])('refuse une fiche invalide %j', async (body, path) => {
      const r = await ctx.http().put(`/v1/artists/${slug}/booking-profile`).set(bearer(owner.accessToken)).send(body).expect(400);
      expect(r.body.issues.map((i: { path: string }) => i.path)).toContain(path);
    });
  });

  describe('jauge de complétude et vue de gestion', () => {
    it('progresse à mesure que le profil se remplit', async () => {
      const fresh = await login(ctx);
      const s = (await createArtist(ctx, fresh.accessToken, { stageName: 'Nadia Rires', city: 'Yaoundé', disciplineSlugs: ['humour'] })).slug;
      const before = await ctx.http().get(`/v1/artists/${s}/manage`).set(bearer(fresh.accessToken)).expect(200);
      expect(before.body.completeness.score).toBe(0);
      expect(before.body.completeness.missing).toEqual(expect.arrayContaining(['avatar', 'bio', 'banner', 'socialLinks', 'tagline', 'categories', 'bookingProfile']));
      expect(before.body.members).toEqual([expect.objectContaining({ userId: fresh.user.id, role: 'OWNER' })]);

      await ctx.http().put(`/v1/artists/${s}/avatar`).set(bearer(fresh.accessToken)).attach('file', await makeImage(500, 500), 'a.jpg').expect(200);
      await ctx.http().patch(`/v1/artists/${s}`).set(bearer(fresh.accessToken)).send({ bioFr: 'Humoriste de Yaoundé', tagline: 'Le rire en pidgin' }).expect(200);
      const after = await ctx.http().get(`/v1/artists/${s}/manage`).set(bearer(fresh.accessToken)).expect(200);
      expect(after.body.completeness.score).toBe(50);
      expect(after.body.completeness.missing).not.toContain('avatar');
    });

    it('est réservée aux membres du profil', async () => {
      const other = await login(ctx);
      await ctx.http().get(`/v1/artists/${slug}/manage`).set(bearer(other.accessToken)).expect(403);
      await ctx.http().get(`/v1/artists/${slug}/manage`).expect(401);
    });

    it('ne révèle aucune donnée personnelle dans la vue publique', async () => {
      const pub = await ctx.http().get(`/v1/artists/${slug}`).expect(200);
      const text = JSON.stringify(pub.body);
      expect(text).not.toContain(owner.phone);
      expect(text).not.toContain(owner.user.id);
      expect(pub.body.shareUrl).toBe(`https://interactrecord.test/${slug}`);
    });
  });

  describe('QR code (PRO-04)', () => {
    it('renvoie un SVG du lien de partage', async () => {
      const r = await ctx.http().get(`/v1/artists/${slug}/qr.svg`).buffer(true)
        .parse((res, done) => { let data = ''; res.on('data', (c: Buffer) => (data += c.toString())); res.on('end', () => done(null, data)); })
        .expect(200);
      expect(r.headers['content-type']).toContain('image/svg+xml');
      expect(r.body).toContain('<svg');
      expect(r.body.toLowerCase()).toContain('#1a1206');
    });
    it('répond 404 pour un artiste inconnu', async () => {
      await ctx.http().get('/v1/artists/inconnu-total/qr.svg').expect(404);
    });
  });
});

describe('Annuaire des artistes (DEC-05 partiel)', () => {
  let ctx: TestContext;
  // Ville propre à cette suite : les autres suites partagent la même base de test.
  const city = `Kribi-${Date.now().toString(36)}`;
  beforeAll(async () => {
    ctx = await createTestContext();
    const a = await login(ctx);
    const b = await login(ctx);
    const c = await login(ctx);
    await createArtist(ctx, a.accessToken, { stageName: 'Ténor Makossa', city, disciplineSlugs: ['musique'], categorySlugs: ['makossa'] });
    await createArtist(ctx, b.accessToken, { stageName: 'Bantu Crew Kribi', city: city.toLowerCase(), type: 'COLLECTIVE', disciplineSlugs: ['danse'] });
    await createArtist(ctx, c.accessToken, { stageName: 'Rires du Centre', city: 'Ebolowa', disciplineSlugs: ['humour'] });
  });
  afterAll(async () => ctx.app.close());

  it('filtre par discipline', async () => {
    const r = await ctx.http().get(`/v1/artists?discipline=danse&city=${city}`).expect(200);
    expect(r.body.items.map((a: { stageName: string }) => a.stageName)).toEqual(['Bantu Crew Kribi']);
    const humour = await ctx.http().get('/v1/artists?discipline=humour&city=Ebolowa').expect(200);
    expect(humour.body.items.map((a: { stageName: string }) => a.stageName)).toEqual(['Rires du Centre']);
  });

  it('filtre par ville sans tenir compte des majuscules', async () => {
    const r = await ctx.http().get(`/v1/artists?city=${city.toUpperCase()}`).expect(200);
    expect(r.body.items.map((a: { slug: string }) => a.slug).sort()).toEqual(['bantu-crew-kribi', 'tenor-makossa']);
  });

  it('cherche par nom sans tenir compte des accents', async () => {
    const r = await ctx.http().get(`/v1/artists?q=TENOR&city=${city}`).expect(200);
    expect(r.body.items.map((a: { slug: string }) => a.slug)).toEqual(['tenor-makossa']);
    expect(r.body.items[0]).toMatchObject({ disciplines: ['musique'], avatar: null });
  });

  it('pagine par curseur sans doublon ni oubli', async () => {
    const p1 = await ctx.http().get(`/v1/artists?limit=1&city=${city}`).expect(200);
    expect(p1.body.items).toHaveLength(1);
    const p2 = await ctx.http().get(`/v1/artists?limit=1&city=${city}&cursor=${p1.body.nextCursor}`).expect(200);
    expect(p2.body.items).toHaveLength(1);
    expect(p2.body.nextCursor).toBeNull();
    const all = [...p1.body.items, ...p2.body.items].map((a: { slug: string }) => a.slug);
    expect(new Set(all).size).toBe(2);
  });

  it('refuse un curseur trafiqué', async () => {
    const r = await ctx.http().get('/v1/artists?cursor=n-importe-quoi').expect(400);
    expect(r.body.code).toBe('CURSOR_INVALID');
  });
});
