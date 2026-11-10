---
name: securite-conformite
description: Règles de sécurité et de conformité d'INTERACT RECORD (authentification, autorisations, secrets, données personnelles, KYC, mineurs, modération, journaux, OWASP, loi camerounaise de 2024 sur les données, RGPD pour la diaspora). À lire avant tout code touchant l'identité, les droits, les données personnelles, l'argent ou les contenus des utilisateurs.
---

# Sécurité et conformité

## Authentification et sessions (déjà en place, à préserver)

- Codes SMS et PIN hachés (scrypt), comparaison en temps constant, un code n'est utilisable
  qu'une fois, 5 essais max, 3 demandes par 10 minutes.
- Jeton d'accès court (15 min) ; jeton de rafraîchissement opaque, haché en base, à rotation ;
  sa réutilisation ferme toutes les sessions (vol probable).
- Statut et rôles relus en base à chaque requête : une suspension s'applique immédiatement.
- PIN obligatoire pour payer et retirer ; 5 échecs en 15 minutes bloquent les vérifications.

## Autorisations

- Tout est privé par défaut. `@Public()` est une décision explicite et relue.
- Rôles globaux (`@Roles`) pour le back-office ; droits fins (propriétaire, manager avec
  permission précise) vérifiés dans le service, sur la ressource elle-même.
- Un manager n'a **jamais** le droit de retrait par défaut (MGR-01).
- Tester systématiquement l'accès à la ressource d'un autre utilisateur (IDOR).

## Données personnelles

- Collecter le minimum. Chaque nouveau champ personnel est justifié par une exigence.
- Ne jamais exposer un numéro de téléphone, un e-mail ou une ville précise dans une vue publique.
- Pièces d'identité KYC : stockage isolé et chiffré, accès réservé au rôle conformité, journalisé.
- Journaux : numéros masqués (`maskPhone`), jamais de code, PIN, jeton ou pièce d'identité.
- Droits d'accès, d'export, de rectification et de suppression accessibles depuis l'application (ACC-12).
- Cadre : loi camerounaise de 2024 sur les données à caractère personnel ; RGPD pour les
  utilisateurs en Europe. Toute question d'interprétation remonte au juriste.

## Mineurs (13 à 17 ans)

Pas d'achat sans contrôle parental, pas de messages privés d'inconnus, retraits vers un parent,
aucune publicité ciblée, contenus « adulte » masqués (ACC-11).

## Secrets et configuration

- Aucun secret dans le dépôt. `.env` est ignoré ; `.env.example` ne contient que des valeurs factices.
- Configuration validée au démarrage (`src/config/env.ts`) : l'API refuse de démarrer si elle est invalide.
- Secrets de production dans un gestionnaire de secrets, avec rotation.

## Liste OWASP à vérifier à chaque revue

Injection (Prisma paramétré, jamais de SQL concaténé), contrôle d'accès cassé, exposition de
données, limites de débit, validation de toutes les entrées, téléversements (type réel du fichier,
taille, analyse), redirections ouvertes, dépendances vulnérables (`pnpm audit`), en-têtes HTTP,
CORS restreint en production.

## Modération et contenus

Signalement sur tout contenu et tout compte ; tolérance zéro pour l'exploitation de mineurs ;
décisions tracées et contestables (section 13.5 du cahier des charges).

## Journal d'audit

Toute action sensible (connexion, changement de PIN, rôle, retrait, décision de modération,
action d'un manager, configuration) écrit dans `AuditLog`, qui ne se modifie jamais.

## Format d'une revue de sécurité

Pour chaque problème : gravité (critique, élevée, moyenne, faible), scénario d'attaque concret,
fichier et ligne, correction proposée. Une revue sans problème trouvé dit ce qui a été vérifié.
