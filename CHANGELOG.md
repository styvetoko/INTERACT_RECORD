# Journal des changements

Toutes les évolutions visibles d'INTERACT RECORD, écrites pour un lecteur non technique.

## Non publié

### Modifié

- La plateforme s'appelle désormais **INTERACT RECORD** (décision du CEO) : application, site,
  messages SMS, documents et domaine prévu (interactrecord.com).

### Ajouté

- Vitrine des artistes sur le web : accueil par discipline, page d'artiste (bannière, photo, badge
  vérifié, disciplines, biographie, liens, fiche booking, QR code à imprimer), en français et en
  anglais, thème sombre, aperçu riche au partage sur WhatsApp et les réseaux.
- Photos et bannières : traitement automatique, suppression des métadonnées et de la position GPS,
  formats légers pour la 3G, couleur et aperçu flou pendant le chargement.
- Fiche booking, jauge de complétude du profil, catégories modifiables, annuaire filtrable.
- Back-office : recherche des comptes, suspension et réactivation avec motif, rôles de l'équipe,
  badge artiste vérifié, journal d'audit consultable.
- Écrans du back-office sur le web (`/admin`) : connexion de l'équipe par code SMS, recherche et fiche
  des comptes, suspension et réactivation, rôles, badge vérifié des artistes, journal d'audit.
  Chaque membre ne voit que les outils de son rôle. En français et en anglais, utilisable sur téléphone.

### Sécurité

- Revue de sécurité et recette qualité du J2 : 4 problèmes graves, 6 moyens et 5 faibles corrigés,
  chacun prouvé par un test (144 tests au total).
- Contre-vérification de sécurité : rien ne bloque ; 5 points faibles supplémentaires corrigés
  (verrou de suspension figé, limites de débit par utilisateur, journaux sans données personnelles,
  file des images, démarrage impossible sans environnement déclaré). 152 tests.
- Revue de sécurité des écrans du back-office : une redirection vers un site pirate possible par le lien
  de changement de langue (corrigée, aussi pour le site public), une déconnexion forcée possible en
  saturant les limites (corrigée en partie), et 7 points faibles, corrigés ou inscrits avant la production.
- Back-office : les jetons de connexion restent sur le serveur web (cookies inaccessibles au
  navigateur), la session se ferme après 8 heures sans activité, et un compte hors de l'équipe est
  refusé même avec le bon code SMS (ADR-0009).
- Faille publiée le mois dernier dans une bibliothèque utilisée par l'outil de base de données (effect,
  déni de service) : version corrigée imposée.
- Mise à jour des bibliothèques vulnérables (traitement d'images, réception de fichiers, validation),
  contrôle automatique des failles dans l'intégration continue (ADR-0008).

- Organisation de l'équipe : 10 rôles, matrice de décision, circuit de livraison (`docs/organisation.md`).
- Charte de travail (`CLAUDE.md`) et 9 savoir-faire détaillés (`.claude/skills/`).
- Identité visuelle v0.1 sous forme de jetons de design (couleurs, typographies, animations), à valider.
- Sept décisions d'architecture documentées (`docs/adr/`).
- Socle de l'API (J1) : connexion par code SMS, sessions sécurisées, code PIN, centres d'intérêt,
  suppression de compte avec 30 jours de grâce, disciplines configurables (musique, humour,
  danse, peinture), profils artistes et collectifs, back-office des disciplines, journal d'audit.
