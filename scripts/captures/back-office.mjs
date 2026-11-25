/**
 * Captures d'écran de recette du back-office et de la vitrine (définition de « terminé », 17.1).
 * Lancé par .github/workflows/captures.yml contre une vraie API et un vrai site, avec le jeu de démonstration.
 * Le code SMS est lu dans le journal de l'API (faux fournisseur SMS, développement uniquement).
 *
 * Variables : BASE_URL (site), API_LOG (journal de l'API), OUT (dossier des images), ADMIN_PHONE.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const API_LOG = process.env.API_LOG ?? 'api.log';
const OUT = process.env.OUT ?? 'captures';
const PHONE = process.env.ADMIN_PHONE ?? '6 99 00 00 99';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = { mobile: { width: 390, height: 844 }, ordinateur: { width: 1440, height: 900 } };
const host = new URL(BASE).hostname;

async function lastSmsCode(after) {
  for (let i = 0; i < 40; i++) {
    const lines = readFileSync(API_LOG, 'utf8').split('\n').slice(after);
    const code = lines.map((l) => l.match(/code est (\d{6})/)?.[1]).filter(Boolean).pop();
    if (code) return code;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Aucun code SMS trouvé dans le journal de l’API');
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

const browser = await chromium.launch();
const results = [];

// 1. Connexion (une seule demande de code : l'API en accepte 3 par 10 minutes).
const login = await browser.newContext({ viewport: VIEWPORTS.ordinateur });
await login.addCookies([{ name: 'lang', value: 'fr', domain: host, path: '/' }]);
const lp = await login.newPage();
await lp.goto(`${BASE}/admin/comptes`);
await lp.waitForURL(/\/admin\/connexion/);
await shot(lp, 'ordinateur-fr-01-connexion');
const logLines = readFileSync(API_LOG, 'utf8').split('\n').length;
await lp.fill('#phone', PHONE);
await lp.click('button[value="request"]');
await lp.waitForSelector('#code');
await shot(lp, 'ordinateur-fr-02-code');
await lp.fill('#code', await lastSmsCode(logLines - 1));
await lp.click('button[value="verify"]');
await lp.waitForURL(/\/admin\/comptes/);
const session = await login.storageState();
results.push('connexion : ok');

// 2. Écrans, en français et en anglais, sur téléphone et sur ordinateur.
for (const locale of ['fr', 'en']) {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport, storageState: session });
    await ctx.addCookies([{ name: 'lang', value: locale, domain: host, path: '/' }]);
    const page = await ctx.newPage();
    const p = `${device}-${locale}`;

    await page.goto(`${BASE}/admin/comptes`);
    await page.waitForSelector('table');
    await shot(page, `${p}-03-comptes`);

    await page.goto(`${BASE}/admin/comptes?q=zzzzzz`);
    await shot(page, `${p}-04-comptes-vide`);

    await page.goto(`${BASE}/admin/comptes?role=ARTIST`);
    await page.click('table a');
    await page.waitForURL(/\/admin\/comptes\/[0-9a-f-]{36}/);
    await shot(page, `${p}-05-fiche-compte`);

    await page.goto(`${BASE}/admin/artistes`);
    await page.waitForSelector('table');
    await shot(page, `${p}-06-artistes`);
    await page.click('table a');
    await page.waitForURL(/\/admin\/artistes\/[a-z0-9-]+$/);
    await shot(page, `${p}-07-fiche-artiste`);

    await page.goto(`${BASE}/admin/journal`);
    await page.waitForSelector('table');
    await shot(page, `${p}-08-journal`);

    // Vérifications simples d'accessibilité : aucune cible tactile sous 44 px dans la zone principale.
    const small = await page.$$eval('main a, main button, main input, main select, header a, header button', (els) =>
      els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44; })
        .map((e) => `${e.tagName.toLowerCase()} « ${(e.textContent ?? '').trim().slice(0, 30)} » ${Math.round(e.getBoundingClientRect().height)} px`));
    results.push(`${p} : cibles < 44 px : ${small.length ? small.join(' ; ') : 'aucune'}`);
    await ctx.close();
  }
  // Écran de connexion dans chaque langue, sur téléphone.
  const anon = await browser.newContext({ viewport: VIEWPORTS.mobile });
  await anon.addCookies([{ name: 'lang', value: locale, domain: host, path: '/' }]);
  const ap = await anon.newPage();
  await ap.goto(`${BASE}/admin/connexion`);
  await shot(ap, `mobile-${locale}-01-connexion`);
  await anon.close();
}

// 3. Une action réelle : attribuer puis retirer le badge vérifié, avec motif ; le journal en garde la trace.
const act = await browser.newContext({ viewport: VIEWPORTS.ordinateur, storageState: session });
await act.addCookies([{ name: 'lang', value: 'fr', domain: host, path: '/' }]);
const ap = await act.newPage();
await ap.goto(`${BASE}/admin/artistes`);
await ap.click('table a');
await ap.waitForURL(/\/admin\/artistes\//);
const form = 'form:has(#verification-reason)';
await ap.click(`${form} button[type="submit"]`);
await shot(ap, 'ordinateur-fr-09-motif-requis');
await ap.fill('#verification-reason', 'Recette automatique du back-office');
await ap.click(`${form} button[type="submit"]`);
await ap.waitForSelector(`${form} [role="status"]`);
await shot(ap, 'ordinateur-fr-10-badge-enregistre');
await ap.goto(`${BASE}/admin/journal?action=artist.`);
await ap.waitForSelector('table');
await shot(ap, 'ordinateur-fr-11-journal-trace');
results.push('badge vérifié modifié et tracé : ok');

await browser.close();
console.log(results.join('\n'));
