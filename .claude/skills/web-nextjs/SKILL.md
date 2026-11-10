---
name: web-nextjs
description: Conventions du web public, de la PWA et du back-office d'INTERACT RECORD en Next.js (structure, rendu serveur, référencement des pages d'artistes, partage social, PWA hors-ligne, performance, traduction). À lire avant de créer ou modifier du code dans apps/web.
---

# Web (Next.js)

## Rôle du web

1. **Pages publiques** d'artistes et d'œuvres (`interactrecord.com/nom-artiste`) : rapides,
   bien référencées, avec aperçu riche quand on partage le lien sur WhatsApp ou Facebook.
2. **PWA** installable pour ceux qui n'installent pas l'application (téléphones pleins).
3. **Espace artiste** sur ordinateur (publication de fichiers lourds, statistiques).
4. **Back-office** interne (`/admin`), protégé par rôle.

## Structure

- App Router, TypeScript strict. Rendu serveur pour les pages publiques ; composants clients
  seulement là où il faut de l'interaction.
- Accès à l'API par un client typé unique (`lib/api`), qui gère jetons, rafraîchissement,
  clé d'idempotence et traduction des codes d'erreur.
- Styles à partir des jetons (`packages/design-tokens`) exportés en variables CSS.
- Traductions : fichiers `fr.json` et `en.json` ; aucune chaîne visible écrite en dur.

## Référencement et partage

Métadonnées Open Graph et Twitter par page (titre, description, image générée avec le nom
et la photo de l'artiste), données structurées (`MusicGroup`, `Person`, `Event`, `VisualArtwork`),
plan du site, URL canoniques.

## Performance (mesurée sur mobile 3G)

Premier affichage utile < 2,5 s ; images `next/image` en AVIF/WebP aux bonnes tailles ;
polices auto-hébergées avec `font-display: swap` ; aucun script tiers non indispensable ;
budget JavaScript par page surveillé.

## PWA

Manifeste, icônes, écran hors-ligne, mise en cache des pages déjà vues et des billets.
Lecture audio en arrière-plan avec Media Session (pochette, contrôles sur l'écran verrouillé).

## Tests

Vitest pour les composants et utilitaires, Playwright pour les parcours (connexion, soutien,
fan club, booking) en viewport mobile et ordinateur.
