# INTERACT Stage

Plateforme de carrière, de diffusion et de monétisation pour les artistes africains, en commençant par le Cameroun.
Disciplines de lancement : musique, humour, danse, peinture. Toutes les autres disciplines des industries culturelles
et créatives sont prévues dans l'architecture et s'ouvrent par simple configuration.

Le cahier des charges complet est la référence fonctionnelle : chaque exigence y porte un identifiant (ACC-01, PRO-03…)
repris dans le code et les tests.

## Organisation du travail

| Fichier | Rôle |
| --- | --- |
| `CLAUDE.md` | Charte : règles non négociables, sources de vérité, circuit de livraison |
| `docs/organisation.md` | Rôles, matrice de décision (RACI), revues obligatoires, rituels |
| `.claude/agents/` | Les 10 rôles de l'équipe (architecte, produit, design, back-end, paiements, web, mobile, qualité, sécurité, infrastructure) |
| `.claude/skills/` | Les 9 savoir-faire (architecture, API, paiements, design, tests, sécurité, web, mobile, livraison) |
| `docs/adr/` | Décisions d'architecture |
| `packages/design-tokens/tokens.json` | Source unique des couleurs, typographies et animations |
| `CHANGELOG.md` | Journal des changements |

## Contenu du dépôt

| Dossier | Contenu | État |
| --- | --- | --- |
| `apps/api` | API NestJS + PostgreSQL (Prisma) | J1 livré |
| `apps/web` | Web public, PWA et back-office (Next.js) | à venir |
| `apps/mobile` | Applications Android et iOS (Flutter) | à venir |
| `packages/design-tokens` | Jetons de design (couleurs, typographies, animations) | v0.1 proposée |

## Démarrage rapide

Prérequis : Node.js 22, pnpm 10, PostgreSQL 16 (ou Docker).

```bash
docker compose up -d postgres
```

```bash
pnpm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
pnpm db:migrate && pnpm db:seed
```

```bash
pnpm dev:api
```

L'API répond sur `http://localhost:4000`. En développement, les SMS ne sont pas envoyés : le code de connexion
apparaît dans les journaux du serveur (faux fournisseur SMS).

## Tests

```bash
pnpm test
```

Chaque exécution crée sa propre base PostgreSQL temporaire (`interact_test_xxxx`), applique les migrations,
lance les tests unitaires et de bout en bout, puis supprime cette base. Aucune autre base n'est modifiée.
Variable utile : `TEST_DATABASE_SERVER_URL` (par défaut `postgresql://interact:interact@localhost:5432`).

## API livrée au J1

Toutes les routes sont préfixées par `/v1` (sauf `/health`). Les erreurs renvoient un `code` stable
(ex. `OTP_INVALID`) que les applications traduisent, et un `message` en français.

| Méthode | Route | Rôle | Exigences |
| --- | --- | --- | --- |
| POST | `/v1/auth/otp/request` | Envoie un code à 6 chiffres par SMS | ACC-01 |
| POST | `/v1/auth/otp/verify` | Vérifie le code, crée le compte au besoin, ouvre une session | ACC-01 |
| POST | `/v1/auth/refresh` | Renouvelle la session (rotation, détection de vol de jeton) | ACC-10 |
| POST | `/v1/auth/logout` | Ferme la session courante | ACC-10 |
| GET / PATCH | `/v1/me` | Profil de l'utilisateur connecté | ACC-08 |
| PUT | `/v1/me/pin` | Crée ou change le code PIN | ACC-09 |
| PUT | `/v1/me/interests` | Centres d'intérêt | ACC-03 |
| GET / DELETE | `/v1/me/sessions[/:id]` | Appareils connectés, déconnexion à distance | ACC-10 |
| POST | `/v1/me/deletion` | Suppression du compte avec 30 jours de grâce | ACC-12 |
| GET | `/v1/disciplines[/:slug]` | Disciplines ouvertes, catégories, champs propres | Section 5 |
| POST | `/v1/artists` | Devenir artiste ou créer un collectif | ACC-04, ACC-07 |
| GET / PATCH | `/v1/artists/:slug` | Profil public, modification par le propriétaire | PRO-01 |
| GET / POST / PATCH | `/v1/admin/disciplines…` | Configuration des disciplines et catégories | ADM-07 |
| GET | `/health` | État du service et de la base | 11.5 |

## Choix techniques

- **Faux fournisseurs** : SMS (et paiements à partir du J5) passent par une interface commune
  (`SmsProvider`). Les vrais fournisseurs se branchent plus tard sans toucher au reste du code.
- **Disciplines par configuration** : les champs propres à chaque discipline sont décrits en base
  (`metadataSchema`) et validés à l'exécution (`src/disciplines/metadata-schema.ts`).
- **Sécurité** : codes SMS et PIN hachés (scrypt), un code ne sert qu'une fois, 5 essais max, 3 demandes
  par 10 minutes ; jetons d'accès courts (15 min) ; jetons de rafraîchissement opaques, hachés, à rotation,
  et toute réutilisation ferme les sessions de l'utilisateur ; statut et rôles relus à chaque requête.
- **Traçabilité** : les actions sensibles sont écrites dans un journal d'audit (`AuditLog`).
- **Montants** : toujours en entiers (FCFA), jamais en nombres à virgule.
