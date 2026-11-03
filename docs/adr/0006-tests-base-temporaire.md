# ADR-0006 : Tests de bout en bout sur une base PostgreSQL temporaire par exécution

- Statut : accepté
- Date : 2026-11-03
- Décideurs : CTO, QA

## Contexte

Les tests doivent porter sur une vraie base (contraintes, transactions) sans jamais toucher
aux données d'une autre base. La réinitialisation automatique d'une base existante est
volontairement bloquée.

## Décision

Chaque exécution crée une base `interact_test_<aléatoire>`, y applique les migrations, lance
les tests, puis supprime uniquement cette base.

## Conséquences

Tests isolés et rejouables, en local comme en intégration continue. Le serveur PostgreSQL
de test doit autoriser l'utilisateur de test à créer des bases.
