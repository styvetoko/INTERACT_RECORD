// Génère les jetons de design pour chaque plateforme à partir de tokens.json (source unique).
//   node scripts/build.mjs          → écrit dist/tokens.css, dist/tokens.ts, dist/tokens.dart
//   node scripts/build.mjs --check  → échoue si dist/ n'est pas à jour (intégration continue)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const check = process.argv.includes('--check');

/** Résout les références « {color.brand.gold} ». */
function resolve(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{([^}]+)\}/g, (_, path) => {
    const node = path.split('.').reduce((n, k) => n?.[k], tokens);
    if (node?.$value === undefined) throw new Error(`Référence inconnue : ${path}`);
    return resolve(node.$value);
  });
}

const entries = (obj) => Object.entries(obj).filter(([k]) => !k.startsWith('$'));
const v = (node) => resolve(node.$value);
const bezier = (arr) => `cubic-bezier(${arr.join(', ')})`;
const header = 'Fichier généré par packages/design-tokens/scripts/build.mjs à partir de tokens.json. Ne pas modifier à la main.';

// ---------- CSS ----------
const css = [];
css.push(`/* ${header} */`, '', ':root {');
for (const [k, n] of entries(tokens.color.brand)) css.push(`  --color-brand-${k}: ${v(n)};`);
for (const [k, n] of entries(tokens.color.discipline)) css.push(`  --color-discipline-${k}: ${v(n)};`);
for (const [k, n] of entries(tokens.color.gradient)) css.push(`  --gradient-${k}: ${v(n)};`);
for (const [k, n] of entries(tokens.font.family)) css.push(`  --font-${k}: '${v(n)} Variable', '${v(n)}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;`);
for (const [k, n] of entries(tokens.font.weight)) css.push(`  --font-weight-${k}: ${v(n)};`);
for (const [k, n] of entries(tokens.font.size)) {
  css.push(`  --text-${k}: ${n.$value / 16}rem;`, `  --leading-${k}: ${n.lineHeight / 16}rem;`);
}
for (const [k, n] of entries(tokens.space)) css.push(`  --space-${k}: ${n.$value / 16}rem;`);
for (const [k, n] of entries(tokens.radius)) css.push(`  --radius-${k}: ${n.$value}px;`);
for (const [k, n] of entries(tokens.elevation)) css.push(`  --elevation-${k}: ${v(n)};`);
for (const [k, n] of entries(tokens.motion.duration)) css.push(`  --duration-${k}: ${n.$value}ms;`);
for (const [k, n] of entries(tokens.motion.easing)) css.push(`  --ease-${k}: ${bezier(n.$value)};`);
css.push(`  --size-touch-target: ${tokens.size['touch-target'].$value}px;`);
for (const [k, n] of entries(tokens.size.icon)) css.push(`  --size-icon-${k}: ${n.$value}px;`);
for (const [k, n] of entries(tokens.size.avatar)) css.push(`  --size-avatar-${k}: ${n.$value}px;`);
css.push(`  --size-mini-player: ${tokens.size['mini-player'].$value}px;`, `  --size-tab-bar: ${tokens.size['tab-bar'].$value}px;`);
css.push('}', '');
const theme = (name) => entries(tokens.color[name]).map(([k, n]) => `  --color-${k}: ${v(n)};`);
css.push('/* Thème sombre : thème par défaut */', ":root,\n[data-theme='dark'] {", '  color-scheme: dark;', ...theme('dark'), '}', '');
css.push("[data-theme='light'] {", '  color-scheme: light;', ...theme('light'), '}', '');
css.push('/* Réglage « réduire les animations » : les mouvements deviennent des fondus courts */');
css.push('@media (prefers-reduced-motion: reduce) {', '  :root {');
for (const [k] of entries(tokens.motion.duration)) css.push(`    --duration-${k}: ${k === 'instant' ? 80 : 150}ms;`);
css.push('  }', '}', '');
css.push('/* Points de rupture (à utiliser dans les media queries) :');
for (const [k, n] of entries(tokens.breakpoint)) css.push(`   ${k} = ${n.$value}px`);
css.push('*/', '');

// ---------- TypeScript ----------
const flat = {
  color: {
    brand: Object.fromEntries(entries(tokens.color.brand).map(([k, n]) => [k, v(n)])),
    discipline: Object.fromEntries(entries(tokens.color.discipline).map(([k, n]) => [k, v(n)])),
    dark: Object.fromEntries(entries(tokens.color.dark).map(([k, n]) => [k, v(n)])),
    light: Object.fromEntries(entries(tokens.color.light).map(([k, n]) => [k, v(n)])),
  },
  font: {
    family: Object.fromEntries(entries(tokens.font.family).map(([k, n]) => [k, v(n)])),
    size: Object.fromEntries(entries(tokens.font.size).map(([k, n]) => [k, { size: n.$value, lineHeight: n.lineHeight }])),
  },
  space: Object.fromEntries(entries(tokens.space).map(([k, n]) => [k, n.$value])),
  radius: Object.fromEntries(entries(tokens.radius).map(([k, n]) => [k, n.$value])),
  duration: Object.fromEntries(entries(tokens.motion.duration).map(([k, n]) => [k, n.$value])),
  easing: Object.fromEntries(entries(tokens.motion.easing).map(([k, n]) => [k, n.$value])),
  breakpoint: Object.fromEntries(entries(tokens.breakpoint).map(([k, n]) => [k, n.$value])),
};
const ts = `// ${header}\n\nexport const tokens = ${JSON.stringify(flat, null, 2)} as const;\n\nexport type DisciplineColor = keyof typeof tokens.color.discipline;\n`;

// ---------- Dart (Flutter) ----------
const dartColor = (hex) => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  return `Color(0xFF${h.toUpperCase()})`;
};
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^(\d)/, 'n$1');
const dart = [`// ${header}`, '', "import 'package:flutter/animation.dart';", "import 'package:flutter/painting.dart';", ''];
for (const group of ['brand', 'discipline', 'dark', 'light']) {
  const cls = `Interact${group[0].toUpperCase()}${group.slice(1)}Colors`;
  dart.push(`abstract final class ${cls} {`);
  for (const [k, n] of entries(tokens.color[group])) {
    const c = dartColor(v(n));
    if (c) dart.push(`  static const ${camel(k)} = ${c};`);
  }
  dart.push('}', '');
}
dart.push('abstract final class InteractSpace {');
for (const [k, n] of entries(tokens.space)) dart.push(`  static const double s${k} = ${n.$value};`);
dart.push('}', '', 'abstract final class InteractRadius {');
for (const [k, n] of entries(tokens.radius)) dart.push(`  static const double ${camel(k)} = ${n.$value};`);
dart.push('}', '', 'abstract final class InteractDuration {');
for (const [k, n] of entries(tokens.motion.duration)) dart.push(`  static const ${camel(k)} = Duration(milliseconds: ${n.$value});`);
dart.push('}', '', 'abstract final class InteractEasing {');
for (const [k, n] of entries(tokens.motion.easing)) dart.push(`  static const ${camel(k)} = Cubic(${n.$value.join(', ')});`);
dart.push('}', '', 'abstract final class InteractFont {');
for (const [k, n] of entries(tokens.font.family)) dart.push(`  static const ${camel(k)} = '${v(n)}';`);
dart.push('}', '');

const outputs = { 'tokens.css': css.join('\n'), 'tokens.ts': ts, 'tokens.dart': dart.join('\n') };
mkdirSync(join(root, 'dist'), { recursive: true });
let stale = [];
for (const [file, content] of Object.entries(outputs)) {
  const path = join(root, 'dist', file);
  if (check) {
    let current = '';
    try { current = readFileSync(path, 'utf8'); } catch {}
    if (current !== content) stale.push(file);
  } else {
    writeFileSync(path, content);
  }
}
if (check && stale.length) {
  console.error(`Jetons non régénérés : ${stale.join(', ')}. Lance « pnpm --filter @interact/design-tokens build ».`);
  process.exit(1);
}
console.log(check ? 'Jetons à jour.' : `Jetons générés : ${Object.keys(outputs).join(', ')}`);
