# ADR-0005 : Fournisseurs externes derrière des interfaces, faux fournisseurs d'abord

- Statut : accepté
- Date : 2026-11-03
- Décideurs : CEO, CTO

## Contexte

Les contrats avec les agrégateurs de paiement et les opérateurs SMS ne sont pas encore signés.
Le développement ne doit pas attendre.

## Décision

Chaque fournisseur (SMS, paiement, stockage, KYC, e-mail, push) est une interface choisie par
variable d'environnement. Les faux fournisseurs sont complets et déterministes ; ils simulent
aussi les échecs (solde insuffisant, délai, doublon de notification).

## Conséquences

Brancher un vrai fournisseur = écrire une classe qui respecte l'interface, plus ses tests.
Les faux fournisseurs restent pour les tests automatisés et ne sont jamais activés en production.
