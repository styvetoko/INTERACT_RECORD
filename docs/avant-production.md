# Avant la mise en production

Liste unique de ce qui doit être fait ou décidé avant d'ouvrir INTERACT RECORD au public.
Chaque ligne vient d'une revue, d'une recette ou d'un ADR. On coche, on ne supprime pas.

## Décisions de la direction (CEO) et du juriste

- [x] **Nom de la plateforme** : **INTERACT RECORD** (décision du CEO, 10 novembre 2026).
- [ ] **Identité visuelle v0.1** (ADR-0007) : couleurs, polices, logo à valider ou confier à une direction artistique.
- [ ] **Profils publics de mineurs** (revue sécurité F5) : un artiste de 13 à 17 ans peut-il avoir une vitrine
      publique avec sa ville et une fiche booking ? Avec quel accord parental ?
- [ ] **Suppression de compte et suspension** (revue M2) : le délai de grâce de 30 jours court-il
      pendant une suspension ?
- [ ] **Qui attribue le badge vérifié** (ACC-06) : lien obligatoire avec le KYC ?
- [ ] **Données visibles par la modération** (revue F4) : un modérateur doit-il voir le numéro complet,
      l'e-mail et la ville d'un compte ? Aujourd'hui oui, chaque consultation étant tracée.

## Technique

- [ ] Planifier `MediaService.purgeOrphans()` et `processDeletionQueue()` (revue M6) : nécessite un
      planificateur de tâches (à choisir, ADR à écrire).
- [ ] Vrai stockage (S3 ou équivalent) et CDN, avec purge des fichiers d'un profil masqué ou supprimé.
- [ ] Mettre dans des transactions le journal d'audit des envois d'images et de la fiche booking (revue M4, faible).
- [ ] Ajouter un test de refus d'une photo HEIC d'iPhone (non générable dans l'environnement actuel).
- [ ] CORS limité aux domaines officiels (aujourd'hui ouvert, hérité du J1).
- [ ] Back-office avec plusieurs instances du serveur web : le renouvellement de session est dédoublonné
      en mémoire d'une seule instance (ADR-0009). Session collante, ou délai de grâce dans l'API.
- [ ] Back-office : les demandes de code SMS partent toutes de l'IP du serveur web (limite de l'API partagée
      par l'équipe, ADR-0009).
- [ ] Politique de sécurité du contenu (CSP avec nonce, `frame-ancestors 'none'`, `form-action 'self'`)
      et HSTS pour le site et le back-office (revue F2).
- [ ] Back-office : l'API doit connaître l'IP réelle de l'utilisateur, par un en-tête que seul le serveur web
      peut poser (secret partagé), et le web doit limiter lui-même les tentatives de connexion (revue M1).
- [ ] Délai de grâce ou renouvellement idempotent dans l'API pour le jeton de rafraîchissement (revue M2, ADR à écrire).
- [ ] Limite absolue de durée d'une session du back-office, et session API courte pour l'appareil
      « Back-office web » (revue F5).
- [ ] Journal d'audit des connexions au back-office : `admin.login` et `admin.login_denied` (revue F6).
- [ ] Recherche de comptes par numéro : exclure les paramètres d'URL de `/admin` des journaux d'accès
      de l'hébergeur, ou passer la recherche en POST (revue F3).
- [ ] Back-office : tests de parcours Playwright (connexion, suspension, rôles, badge) contre une API de test.
- [ ] Vrais fournisseurs SMS et paiement (aujourd'hui faux fournisseurs, interdits en production).
- [ ] Test d'intrusion par un cabinet externe.
- [ ] Essais sur un vrai Android d'entrée de gamme en 3G réelle, avec TalkBack et VoiceOver.

## Contrat de l'API modifié au J2 (applications à aligner)

`CANNOT_*` → `ADMIN_CANNOT_*` ; `FORBIDDEN` → `AUTH_FORBIDDEN` ou `ARTIST_FORBIDDEN` ;
`ALREADY_SUSPENDED` / `NOT_SUSPENDED` → `USER_ALREADY_SUSPENDED` / `USER_NOT_SUSPENDED` en 409 ;
`FILE_MISSING` en 400. Aucune application n'utilisait encore ces codes.
