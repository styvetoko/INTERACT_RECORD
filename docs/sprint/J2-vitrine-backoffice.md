# J2 — Vitrine des artistes et back-office minimal

Objectif du jour : qu'un artiste ait une vitrine publique digne d'un grand label, et que
l'équipe puisse gérer comptes et artistes vérifiés depuis le back-office.

## Récits et critères d'acceptation

### PRO-01, PRO-06 — Vitrine complète

En tant qu'artiste, je veux une page qui me présente comme un professionnel, afin que fans,
organisateurs et marques me prennent au sérieux.

- Étant donné un artiste, quand il envoie une photo de profil (JPEG, PNG, WebP ou AVIF,
  15 Mo max), alors l'image est redressée, débarrassée de ses métadonnées (position GPS
  comprise), recadrée en carré et déclinée en 128, 256 et 512 px au format WebP.
- Quand il envoie une bannière, elle est recadrée au format 3:1 et déclinée en 800 et 1600 px.
- Chaque image fournit une couleur dominante et un aperçu flou très léger, affichés pendant
  le chargement (pas d'écran vide en 3G).
- Un fichier qui n'est pas une image, trop lourd ou trop grand est refusé avec un code clair.
- Remplacer une image supprime l'ancienne.
- L'artiste renseigne une accroche (80 caractères), ses liens (Instagram, TikTok, YouTube,
  Facebook, X, Spotify, site web) : un lien vers un autre site que le réseau annoncé est refusé.
- L'artiste renseigne sa fiche booking : réservable ou non, fourchette de prix en FCFA entiers,
  villes de déplacement, types de prestations, fiche technique.
- Seuls le propriétaire et les membres ayant le droit `profile.edit` modifient la vitrine.

### Parcours 7.2 — Jauge de complétude

- La vue de gestion d'un profil donne un score de 0 à 100 et la liste de ce qui manque
  (photo, bannière, biographie, catégories, liens, fiche booking).

### PRO-04 — Lien unique et QR code

- Chaque artiste a un lien de partage `<site>/<identifiant>` et un QR code SVG téléchargeable,
  sombre sur fond clair pour rester lisible par tous les téléphones.

### DEC-05 (partiel) — Annuaire des artistes

- Liste publique paginée par curseur, filtrable par discipline, ville et nom (insensible
  aux accents et à la casse pour le nom).

### Back-office (ADM-01, ADM-10, ACC-06)

- Recherche d'utilisateurs par numéro ou nom (administrateurs et support).
- Suspension et réactivation avec motif obligatoire ; la suspension ferme toutes les sessions.
  Un modérateur ne peut pas suspendre un membre de l'équipe ; personne ne se suspend soi-même.
- Attribution des rôles internes par un administrateur ; un administrateur ne peut pas retirer
  son propre rôle (pas de verrouillage accidentel). Les rôles FAN et ARTIST ne se modifient pas à la main.
- Attribution et retrait du badge « artiste vérifié » avec motif.
- Consultation du journal d'audit, filtrable, paginée (administrateurs).
- Chaque action du back-office écrit dans le journal d'audit avec son motif.

### Web — première vitrine visible

- Page publique de l'artiste rendue côté serveur, avec aperçu riche au partage (titre,
  description, image), en français ou en anglais, thème sombre par défaut, sur les jetons de design.
- Page d'accueil listant les artistes par discipline.

### Back-office — écrans web (ADM-01, ADM-10, ACC-06), ajout du 25 novembre

En tant que membre de l'équipe, je veux gérer comptes et artistes depuis un navigateur,
afin de ne plus dépendre d'un développeur pour chaque suspension ou badge.

- Étant donné un compte de l'équipe, quand il saisit son numéro puis le code SMS sur `/admin/connexion`,
  alors il arrive sur la première section permise par son rôle.
- Étant donné un compte sans rôle interne, même avec le bon code, alors l'accès est refusé et la session
  ouverte est refermée aussitôt.
- Les jetons ne sont jamais lisibles par le navigateur (cookies httpOnly, SameSite strict, limités à `/admin`) ;
  la session se renouvelle seule et se ferme après 8 heures sans activité (ADR-0009).
- Le menu et les boutons suivent les droits de l'API : support → comptes ; modération → artistes,
  fiche d'un compte, suspension ; administrateur → tout, dont les rôles et le journal.
- Comptes : recherche par numéro ou nom, filtres statut et rôle, numéros masqués dans la liste, fiche
  complète avec avertissement « consultation tracée », suspension et réactivation avec motif, rôles avec motif.
- Artistes : recherche par nom de scène, attribution et retrait du badge vérifié avec motif.
- Journal d'audit : filtres action, objet, auteur ; pagination ; lecture seule.
- Chaque page a ses états : chargement (squelette), contenu, vide, erreur avec « Réessayer », hors-ligne.
- Tout en français et en anglais ; tableaux lisibles en cartes sur téléphone ; zones tactiles de 44 px.

## Hors périmètre du J2

Œuvres, onglets de contenus et œuvre épinglée (J3), abonnés et mur des supporters (J4-J5),
dossier de presse PDF (phase 2), gestion des membres et managers (J8), écrans de la finance
et de l'éditorial (avec leurs modules).

## Bilan

- Revue de sécurité : 4 problèmes graves, 6 moyens, 5 faibles. Tous corrigés et prouvés par un test,
  sauf F5 (profils publics de mineurs), qui attend une décision du CEO et du juriste.
- Contre-vérification de sécurité : aucun blocage ; N1 à N5 corrigés ; M6 et F4 complétés autant que possible
  sans planificateur (voir docs/avant-production.md).
- Recette qualité : 9 défauts. Tous corrigés ; la suite de recette est devenue la suite de
  non-régression `apps/api/test/j2-regressions.e2e-spec.ts`.
- Web vérifié en captures sur mobile (390 px) et sur ordinateur (1440 px), en français et en anglais :
  une page inconnue renvoie bien 404, toutes les cibles tactiles mesurent au moins 44 px.
- Non vérifié : vrai téléphone Android d'entrée de gamme en 3G réelle, lecteurs d'écran
  TalkBack et VoiceOver, photos HEIC d'iPhone (refusées : seul l'AVIF est accepté).
- Écrans du back-office (25 novembre) : logique de session, droits et messages couverts par des tests
  Vitest. Non vérifié dans cet environnement (installation des dépendances impossible) : compilation
  Next.js, rendu réel des écrans, parcours complet contre l'API. La CI le vérifie au push ; les captures
  et les parcours Playwright restent à faire.
- Revue de sécurité des écrans (26 novembre) : 1 grave, 2 moyens, 7 faibles.
  G1 (redirection ouverte par `/lang`, présente depuis le J2) corrigé et testé ; M1 corrigé côté web
  (une panne ou une limite ne déconnecte plus), le reste inscrit avant la production ; M2 réduit (plus de
  cache après l'appel), le délai de grâce dans l'API reste à faire ; F1 et F7 corrigés ; F2 à F6 inscrits
  dans `docs/avant-production.md`.
- Recette par captures (workflow `captures.yml`) : a trouvé un défaut, le message « C'est enregistré »
  effacé après l'action (formulaire remonté par un attribut `key`), corrigé.

