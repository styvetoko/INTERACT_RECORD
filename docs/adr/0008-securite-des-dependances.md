# ADR-0008 : Politique de sécurité des dépendances

- Statut : accepté
- Date : 2026-11-09
- Décideurs : CTO, sécurité

## Contexte

La revue de sécurité du J2 a relevé des failles connues dans des dépendances, dont deux sur le
chemin des fichiers envoyés par les utilisateurs (sharp pour les images, multer pour la réception).
Une plateforme qui traite des fichiers d'inconnus et de l'argent ne peut pas les laisser passer.

## Décision

1. **Contrôle automatique** : `pnpm audit --audit-level high` tourne dans l'intégration continue ;
   une faille élevée ou critique non traitée bloque la fusion.
2. **Correctifs dans la même version majeure** : appliqués sans ADR (NestJS 11.1 → 11.2, Prisma 6.16 → 6.19).
3. **Sauts de version faits pour la sécurité** (validés ici) :
   - sharp 0.34 → 0.35.5 (libvips, libheif, librsvg vulnérables) ;
   - zod 3 → 4.6.7 (épuisement mémoire sur collections bornées ; aucun correctif en 3.x) ;
   - vitest 3 → 4.1.12 (tinypool : exécution de code à distance, critique).
4. **Versions imposées aux dépendances indirectes** (`overrides` dans `pnpm-workspace.yaml`) :
   multer 2.5.0, file-type 21.3.4, postcss 8.5.23, sharp 0.35.5. À retirer quand les paquets
   parents embarqueront ces versions.
5. **Risques acceptés**, ignorés explicitement et à réexaminer à chaque montée de Prisma ou Jest :
   - GHSA-ggr8-5vv4-36mx (deepmerge-ts, élevée) : utilisé par la configuration de la ligne de
     commande Prisma. **Présent dans l'installation de production** (`prisma migrate deploy`), mais
     **jamais exposé aux entrées des utilisateurs** : il ne fusionne que notre propre `prisma.config.ts`.
   - GHSA-gcqx-w48m-w2h4 (deepmerge, faible) : utilisé par la configuration de Jest ; tests uniquement.
6. **Défense en profondeur sur les fichiers** : format vérifié sur le contenu, 25 mégapixels
   maximum, une seule passe de décodage, deux traitements simultanés au plus, HEIF accepté
   seulement en AVIF, un seul fichier et aucun champ texte par envoi, 30 envois par heure.

## Conséquences

Chaque montée de version passe par la suite complète de tests. Une nouvelle dépendance doit
être auditée avant d'entrer dans le dépôt.
