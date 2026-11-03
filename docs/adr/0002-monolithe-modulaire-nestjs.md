# ADR-0002 : API en monolithe modulaire NestJS

- Statut : accepté
- Date : 2026-11-03
- Décideurs : CTO

## Contexte

Il faut livrer vite un produit fiable, avec une petite équipe, et pouvoir passer à 1,5 million
d'utilisateurs sans tout réécrire.

## Options étudiées

1. **Microservices dès le départ** : isolation forte, mais coût d'exploitation, de cohérence
   des données et de débogage très élevé pour un MVP.
2. **Monolithe sans structure** : rapide au début, puis impossible à découper.
3. **Monolithe modulaire** : un seul déploiement, des modules métier étanches, extractibles plus tard.

## Décision

Option 3, avec NestJS 11 et TypeScript. Règles de dépendance dans le skill `architecture`.

## Conséquences

Les modules médias, live et paiements sont les premiers candidats à l'extraction ; leurs
frontières doivent rester propres (événements internes, pas d'accès direct aux tables d'autrui).
