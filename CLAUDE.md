# INTERACT Stage — charte de travail

Ce fichier est lu au début de chaque session. Il fixe ce qui ne se négocie pas.
Le détail de chaque métier est dans `.claude/skills/` (savoir-faire) et `.claude/agents/` (rôles).

## Mission

Permettre aux artistes africains, en commençant par le Cameroun, de vivre de leur art :
vitrine, découverte, fans, revenus multiples payés en Mobile Money, outils de carrière.
Disciplines ouvertes : musique, humour, danse, peinture. Les autres s'ouvrent par configuration.

Le niveau attendu est celui d'une entreprise tech de premier plan : architecture pensée,
code relu, tests systématiques, design premium. Un travail « qui marche » ne suffit pas.

## Sources de vérité, dans cet ordre

1. Les décisions écrites de la direction (l'utilisateur, CEO et Product Owner).
2. Le cahier des charges : https://claude.ai/artifact/TbogBG4Z1pm3uv49LmcK2q
   Chaque exigence a un identifiant (ACC-01, PRO-03, BOO-07…). Le code et les tests le citent.
3. Les décisions d'architecture : `docs/adr/`.
4. L'organisation et les responsabilités : `docs/organisation.md`.
5. Les jetons de design : `packages/design-tokens/tokens.json` (seule source des couleurs,
   typographies, espacements, rayons et animations).

En cas de contradiction entre deux sources, on s'arrête et on demande. On ne tranche pas seul.

## L'équipe (résumé, détail dans `docs/organisation.md`)

| Rôle | Fichier agent | Savoir-faire principaux |
| --- | --- | --- |
| Directeur technique et architecte | `cto-architecte` | architecture, git-livraison |
| Chef de produit | `chef-de-produit` | git-livraison |
| Designer UX/UI | `designer-ux-ui` | design-system |
| Développeur back-end | `dev-backend` | architecture, conventions-api, tests-qualite |
| Ingénieur paiements | `ingenieur-paiements` | paiements-grand-livre, securite-conformite |
| Développeur web | `dev-web` | web-nextjs, design-system |
| Développeur mobile | `dev-mobile` | mobile-flutter, design-system |
| Ingénieur qualité | `qa` | tests-qualite |
| Ingénieur sécurité et conformité | `securite` | securite-conformite |
| Ingénieur infrastructure | `devops-sre` | architecture |

## Règles non négociables

1. **Rien sans référence.** Toute fonctionnalité correspond à un identifiant du cahier des charges
   ou à une décision écrite. Sinon, on la propose ; on ne la code pas.
2. **L'argent est sacré.** Montants en entiers (FCFA), jamais de nombre à virgule. Tout mouvement
   d'argent passe par le grand livre en partie double, avec une clé d'idempotence.
   Voir le skill `paiements-grand-livre`.
3. **Aucun secret dans le code** ni dans les journaux : clés, codes SMS, PIN, numéros complets, pièces d'identité.
4. **Pas de code sans tests.** Toute route a ses tests de bout en bout ; tout ce qui touche à l'argent,
   à l'identité ou aux droits teste aussi chaque cas d'erreur.
5. **Pas d'action destructrice sans accord écrit** de l'utilisateur dans la conversation : effacement
   ou réinitialisation d'une base, `git push --force`, suppression de branche ou de fichiers d'autrui.
6. **Le design passe par les jetons.** Aucune couleur, taille, durée ou courbe d'animation en dur.
7. **Bilingue dès le départ.** Tout texte visible existe en français et en anglais, dans les fichiers
   de traduction, jamais écrit en dur dans un composant.
8. **Accessible.** Contrastes WCAG 2.2 AA, zones tactiles de 44 px minimum, lecteurs d'écran,
   respect du réglage « réduire les animations ».
9. **Sobre.** Chaque écran est pensé pour un Android d'entrée de gamme (2 Go de RAM) en 3G.
10. **Honnête.** On dit ce qui n'est pas fait, pas testé ou incertain. On ne présente jamais
    une simulation comme un résultat réel.

## Pile technique

| Couche | Choix | Dossier |
| --- | --- | --- |
| API | NestJS 11, TypeScript 5.9, Prisma 6, PostgreSQL 16 | `apps/api` |
| Web public, PWA, back-office | Next.js (React, TypeScript) | `apps/web` (à venir) |
| Mobile Android et iOS | Flutter | `apps/mobile` (à venir) |
| Jetons de design | JSON, générés vers CSS et Dart | `packages/design-tokens` |
| Intégration continue | GitHub Actions | `.github/workflows` |

Les versions sont épinglées. On ne monte pas de version majeure sans ADR.

## Commandes

```bash
pnpm install
pnpm dev:api          # API sur http://localhost:4000 (codes SMS dans les journaux)
pnpm test             # tests ; chaque exécution crée puis supprime sa propre base temporaire
pnpm db:migrate       # nouvelle migration (base de développement uniquement)
pnpm db:seed          # disciplines et catégories
```

## Conventions de code

- Identifiants en anglais (`artistId`, `createBooking`) ; commentaires, messages d'erreur et
  documentation en français.
- Erreurs : un `code` stable en MAJUSCULES (`OTP_INVALID`) que les applications traduisent,
  et un `message` en français. Voir le skill `conventions-api`.
- Un module = un domaine métier (comptes, artistes, contenus, paiements…). Un module n'écrit
  jamais dans les tables d'un autre ; il passe par son service.
- Les fournisseurs externes (SMS, paiement, stockage, KYC) sont derrière une interface.
  Aujourd'hui : faux fournisseurs. Les vrais se branchent sans toucher au métier.

## Comment une fonctionnalité est livrée

1. **Chef de produit** : récit utilisateur et critères d'acceptation, à partir des identifiants.
2. **Architecte** : note de conception si plusieurs modules sont touchés ; ADR si c'est une décision durable.
3. **Designer** : écrans, états (vide, chargement, erreur, hors-ligne) et animations, si interface.
4. **Développeurs** : code et tests ensemble.
5. **Qualité** : vérifie chaque critère d'acceptation et les cas limites.
6. **Sécurité** et **paiements** : relecture obligatoire dès qu'il y a argent, identité ou données personnelles.
7. **Livraison** : commit conventionnel, README et journal des changements à jour, puis relecture
   humaine par un développeur senior de l'équipe avant fusion.

Le détail est dans le skill `git-livraison`.

## État du projet

- J1 livré : socle de l'API (comptes, sessions, PIN, disciplines configurables, artistes, audit).
- Prochain : J2, vitrine des artistes et back-office minimal.
