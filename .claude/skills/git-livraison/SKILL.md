---
name: git-livraison
description: Flux de livraison d'INTERACT RECORD (journée de sprint, branches, commits conventionnels, demandes de fusion, ADR, journal des changements, démonstration de fin de journée). À lire au début et à la fin de chaque tâche, et avant tout commit ou push.
---

# Livraison

## Une journée de sprint

1. **Démarrage** : relire `CLAUDE.md`, le plan du jour (section 14.4 du cahier des charges)
   et les identifiants visés. Annoncer l'objectif du jour en une phrase.
2. **Cadrage** : récits et critères d'acceptation (chef de produit).
3. **Conception** : note de conception, ADR si décision durable (architecte) ; écrans (designer).
4. **Réalisation** : code et tests ensemble, par petits commits.
5. **Vérification** : toute la suite de tests, compilation, analyse statique.
6. **Revues** : obligatoires selon la nature du changement (voir `docs/organisation.md`).
7. **Démonstration** : ce qui marche avec preuves, ce qui reste, ce qui n'a pas été vérifié.

## Branches

- `main` : toujours déployable, protégée, fusion uniquement après relecture humaine.
- `feat/<jour>-<sujet>` (`feat/j2-vitrine-artiste`), `fix/<sujet>`, `chore/<sujet>`.
- Jamais de `push --force` sur `main` ni sur une branche partagée sans accord écrit.

## Commits conventionnels

```
<type>(<module>): <résumé en français, impératif, 72 caractères max>

<pourquoi, ce qui change, identifiants du cahier des charges>
```

Types : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `security`.
Exemple : `feat(booking): bloquer l'acompte en séquestre (BOO-06)`.
Un commit = un changement cohérent qui compile et dont les tests passent.

## Demande de fusion

Titre au format commit. Corps : contexte, ce qui change, identifiants couverts, preuves
(tests, captures), revues faites, risques, ce qui n'est pas fait. Petite et relisible :
au-delà de 600 lignes modifiées, on découpe.

## ADR (Architecture Decision Record)

Fichier `docs/adr/NNNN-titre.md` à partir de `0000-modele.md`. Statuts : proposé, accepté,
remplacé par NNNN. Un ADR accepté ne se modifie pas ; on en écrit un nouveau qui le remplace.

## Journal des changements

`CHANGELOG.md`, section « Non publié », regroupé par Ajouté / Modifié / Corrigé / Sécurité,
écrit pour un lecteur non technique.

## Sauvegarde

L'environnement de travail est temporaire : on pousse sur GitHub à la fin de chaque étape.
Tant que le dépôt distant n'est pas branché, on fournit une archive de sauvegarde.
