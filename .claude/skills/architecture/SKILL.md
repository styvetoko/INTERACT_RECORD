---
name: architecture
description: Règles d'architecture d'INTERACT Stage (monolithe modulaire NestJS, découpage en modules métier, dépendances, fournisseurs externes, données, évolutivité). À lire avant de créer un module, d'ajouter une dépendance, de toucher au schéma de base de données ou de prendre une décision technique durable.
---

# Architecture INTERACT Stage

## Forme générale

- **Monolithe modulaire** (ADR-0002) : une seule API déployée, découpée en modules métier
  étanches. Un module qui grossit (médias, live, paiements) doit pouvoir devenir un service
  séparé sans réécrire les autres. C'est la règle qui guide tout le reste.
- **Une API pour tous** : web, PWA, Android, iOS et back-office parlent à la même API REST `/v1`.
- **Multi-pays et multi-disciplines par configuration** : pays, devise, langue, moyens de paiement,
  commissions, disciplines et leurs champs sont des données, pas du code.

## Modules métier (cibles)

| Module | Possède les tables | Exigences |
| --- | --- | --- |
| `auth` | OtpChallenge, Session | ACC-01, ACC-09, ACC-10 |
| `users` | User, UserInterest | ACC-03, ACC-08, ACC-11, ACC-12 |
| `disciplines` | Discipline, Category | Section 5, ADM-07 |
| `artists` | Artist, ArtistMember, ArtistDiscipline, ArtistCategory | ACC-04, ACC-07, PRO-*, MGR-* |
| `media` | MediaAsset, transcodages | PUB-02 à PUB-04 |
| `works` | Work, Offer, Credit | PUB-*, LEC-* |
| `social` | Follow, Comment, Reaction, Report | SOC-* |
| `discovery` | classements, fils (lecture seule sur les autres) | DEC-* |
| `ledger` | LedgerAccount, LedgerEntry, Payment, Payout | WAL-*, section 9 |
| `commerce` | FanClubTier, Subscription, Order | FAN-*, BOU-* |
| `booking` | ServiceOffer, BookingRequest, Quote, Escrow | BOO-* |
| `notifications` | Notification, préférences | NOT-* |
| `moderation` | file de modération, décisions | ADM-02, section 13.5 |
| `audit` | AuditLog (écriture seule) | ADM-10 |

## Règles de dépendance

1. Un module n'écrit **jamais** dans les tables d'un autre module. Il appelle son service exporté.
2. Pas de dépendance circulaire entre modules. Si deux modules ont besoin l'un de l'autre,
   l'un des deux publie un **événement interne** (`work.published`, `payment.succeeded`)
   que l'autre écoute.
3. `ledger` ne dépend d'aucun module métier. Les autres modules lui demandent des écritures
   (« débiter le fan, créditer l'artiste, commission 15 % ») avec une clé d'idempotence.
4. Les contrôleurs ne contiennent pas de logique métier : ils valident l'entrée (zod),
   appellent un service, mettent en forme la sortie.
5. Les lectures publiques passent par des fonctions de mise en forme (`toPublicArtist`) qui
   choisissent explicitement chaque champ exposé. On ne renvoie jamais un objet Prisma brut.

## Structure d'un module

```
src/<module>/
  <module>.module.ts        # déclaration NestJS, exporte uniquement le service public
  <module>.controller.ts    # routes, validation zod, aucune logique métier
  <module>.service.ts       # logique métier, transactions
  <module>.mapper.ts        # vues publiques et privées
  <module>.events.ts        # événements émis (si besoin)
  *.spec.ts                 # tests unitaires des règles pures
test/<module>.e2e-spec.ts   # tests de bout en bout des routes
```

## Fournisseurs externes

Chaque fournisseur (SMS, paiement, stockage objet, KYC, e-mail, push) est derrière une
interface (`SmsProvider`, `PaymentProvider`…) injectée par un jeton NestJS. Le choix se fait
par variable d'environnement (`SMS_PROVIDER=fake`). Le faux fournisseur est complet,
déterministe et sert aux tests. Ajouter un vrai fournisseur = une nouvelle classe, rien d'autre.

## Base de données

- PostgreSQL, accès par Prisma. Identifiants UUID, dates en UTC, montants en `Int` (FCFA)
  ou `BigInt` pour les cumuls.
- Toute modification passe par une **migration** versionnée (`prisma migrate dev`), relue
  comme du code. Une migration ne détruit jamais de données sans plan de reprise écrit.
- Index sur toute colonne utilisée en filtre ou en tri fréquent. Contraintes d'unicité en base,
  pas seulement dans le code.
- Les opérations qui doivent réussir ou échouer ensemble sont dans une transaction.
- Jamais de `migrate reset` ni d'effacement sans accord écrit de l'utilisateur.

## Performance et sobriété

- Pagination par curseur pour toute liste (jamais `OFFSET` sur de grandes tables).
- Pas de requêtes N+1 : `include`/`select` ciblés.
- Réponses compressées ; images et médias servis par CDN, jamais par l'API.
- Budget : 95 % des requêtes en moins de 300 ms.

## Quand écrire un ADR

Nouvelle dépendance majeure, nouveau fournisseur, changement de forme des données d'argent,
découpage d'un module en service, choix qui serait coûteux à défaire. Modèle : `docs/adr/0000-modele.md`.
