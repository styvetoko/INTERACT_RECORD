# ADR-0001 : Un seul dépôt (monorepo) géré avec pnpm

- Statut : accepté
- Date : 2026-11-03
- Décideurs : CTO

## Contexte

API, web, mobile et jetons de design doivent évoluer ensemble (mêmes contrats d'API, mêmes jetons).

## Options étudiées

1. **Plusieurs dépôts** : indépendance, mais versions désynchronisées et changements transverses pénibles.
2. **Un dépôt, espaces de travail pnpm** : un changement transverse = un seul commit relu.

## Décision

Un dépôt unique avec espaces de travail pnpm : `apps/api`, `apps/web`, `apps/mobile`, `packages/*`.
Versions des dépendances épinglées.

## Conséquences

Intégration continue unique ; il faudra filtrer les tâches par dossier modifié quand le dépôt grossira.
