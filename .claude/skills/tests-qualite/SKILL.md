---
name: tests-qualite
description: Stratégie de tests et définition de « terminé » pour INTERACT RECORD (tests unitaires, de bout en bout, critères d'acceptation, base de test temporaire, appareils et réseaux de référence, recette). À lire avant d'écrire ou de relire des tests, et avant de déclarer une fonctionnalité terminée.
---

# Tests et qualité

## Pyramide

| Niveau | Outil | Cible |
| --- | --- | --- |
| Unitaire | Jest (API), `flutter_test`, Vitest (web) | Règles pures : validation, calculs, machines d'états |
| Bout en bout API | Jest + Supertest sur vraie base PostgreSQL | Chaque route, chaque code d'erreur |
| Interface | Playwright (web), tests d'intégration Flutter | Parcours P0 du cahier des charges (section 7) |
| Charge | k6 | Avant chaque grande sortie |

## Règles

1. **Un test par critère d'acceptation**, nommé en français par ce qu'il prouve :
   `it('refuse un retrait supérieur au solde disponible')`.
2. Chaque route teste : succès, entrée invalide, non connecté, interdit, introuvable, et ses
   règles métier. Argent, identité, droits : **chaque** cas d'erreur.
3. Les tests de bout en bout tournent sur une **vraie base PostgreSQL** : chaque exécution crée
   sa propre base temporaire puis la supprime (`test/global-setup.ts`). On ne simule pas la base.
4. Tests indépendants et rejouables : données uniques par test (`uniquePhone()`), pas d'ordre imposé.
5. Les fournisseurs externes sont remplacés par leurs **faux fournisseurs**, jamais par des
   rustines dans le code métier.
6. Pas de `sleep` arbitraire ; pas de test désactivé sans ticket et raison écrite.
7. Couverture minimale : 80 % sur `ledger`, `auth`, `booking` ; 70 % ailleurs.
   La couverture ne remplace pas la réflexion sur les cas limites.

## Cas limites à toujours envisager

Double envoi (réseau qui coupe et l'application qui réessaie), course entre deux requêtes
simultanées, valeurs aux bornes, texte avec accents et emojis, numéros étrangers, fuseau
horaire (tout en UTC), compte suspendu au milieu d'une action, utilisateur mineur.

## Définition de « terminé »

- [ ] Critères d'acceptation écrits et couverts par des tests qui passent
- [ ] Cinq états d'écran traités (chargement, contenu, vide, erreur, hors-ligne) si interface
- [ ] Textes en français et en anglais
- [ ] Testé sur l'appareil de référence (Android Go, 2 Go de RAM) en 3G, sur iPhone et sur le web
- [ ] Accessibilité vérifiée (contrastes, lecteur d'écran, tailles de texte)
- [ ] Revues obligatoires faites (sécurité, paiements, architecture selon le changement)
- [ ] Documentation et journal des changements à jour
- [ ] Aucune régression : toute la suite passe en intégration continue

## Rapport de recette

Pour chaque fonctionnalité : identifiants couverts, preuves (noms des tests, captures),
écarts constatés, ce qui n'a **pas** pu être vérifié et pourquoi.
