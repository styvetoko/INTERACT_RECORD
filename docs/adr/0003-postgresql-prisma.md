# ADR-0003 : PostgreSQL 16 et Prisma 6

- Statut : accepté
- Date : 2026-11-03
- Décideurs : CTO

## Contexte

Le cœur du produit est transactionnel (argent, réservations) et a besoin de cohérence forte.

## Décision

PostgreSQL 16 ; accès par Prisma 6 (migrations versionnées, client typé). Les versions majeures
plus récentes de Prisma (7 et au-delà) changent la configuration et le moteur ; on ne migrera
qu'après un nouvel ADR et des tests complets.

## Conséquences

Les migrations générées par Prisma écrivent le schéma `public` en dur : l'isolation des tests
se fait par base temporaire, pas par schéma (voir ADR-0006).
