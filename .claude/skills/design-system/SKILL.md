---
name: design-system
description: Système de design premium d'INTERACT Stage (identité, jetons de couleur, typographie, espacements, composants, animations, voix et ton, accessibilité, états d'écran). À lire avant de concevoir ou coder tout ce que l'utilisateur voit, sur web comme sur mobile.
---

# Système de design INTERACT Stage

Le premium vient de la retenue : l'œuvre occupe l'écran, l'interface s'efface, chaque
mouvement a une raison. Pas d'effets gratuits, pas de dégradés partout, pas d'ombres lourdes.

## Source unique

`packages/design-tokens/tokens.json`. Couleurs, tailles, rayons, durées et courbes viennent
de là, exportés en variables CSS (web) et en constantes Dart (mobile). Une valeur écrite en dur
dans un composant est un défaut à corriger.

## Identité

- **Thème sombre par défaut** (met les visuels en valeur, économise la batterie sur OLED),
  thème clair complet. Les deux sont conçus, pas l'un dérivé de l'autre à la va-vite.
- **Or de scène** `#F2B544` : couleur signature. Réservée aux actions principales et aux
  moments forts. Un écran a **une** action en or, pas trois.
- **Dégradé de scène** (or → terre cuite) : seulement pour les moments forts (paiement réussi,
  sortie d'une œuvre, live en cours, niveau de fan atteint).
- **Couleur de discipline** : musique or, humour corail, danse magenta, peinture turquoise.
  Utilisée en petites touches (puce, liseré, icône), jamais en grands aplats.
- **Motifs** : bibliothèque originale créée avec des artistes camerounais rémunérés. Utilisés
  en filigrane (opacité 4 à 8 %), jamais derrière du texte. Pas de folklore, pas de clichés.

## Typographie

- **Unbounded** pour les titres et les chiffres forts (nom de scène, montant gagné, classement).
- **Inter** pour tout le reste. Chiffres à chasse fixe (`tabular-nums`) pour montants et compteurs.
- Échelle : 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60. Texte courant 16, jamais moins de 12.
- Montants : `25 000 FCFA` (espace fine insécable comme séparateur de milliers, devise après).

## Espace et forme

- Grille de 4 px. Marges d'écran mobile 16 px, cartes séparées de 12 à 16 px.
- Rayons : 6 puces, 10 champs et boutons, 14 cartes, 20 feuilles, cercle pour les avatars.
- Profondeur en sombre : par les surfaces (bg → surface-1 → surface-2 → surface-3), pas d'ombres.

## Animation

- Durées : 80 / 150 / 220 / 320 / 480 ms ; 900 ms uniquement pour la célébration de paiement.
- Courbes : `standard` par défaut, `enter` pour ce qui arrive, `exit` pour ce qui part.
  Ressorts `gentle` (feuilles) et `snappy` (boutons) sur mobile.
- **Signatures** :
  - Mini-lecteur → lecteur plein écran : élément partagé (pochette), 480 ms.
  - J'aime : pop à ressort `snappy` + retour haptique léger.
  - Paiement réussi : « applaudissement » (particules or, 900 ms) + haptique de succès.
  - Chargement : squelettes à reflet lent, jamais de roue qui tourne seule sur un écran vide.
  - Changement d'onglet : fondu croisé 150 ms, pas de glissement.
- Seuls `transform` et `opacity` s'animent (fluidité à 60 i/s sur petit téléphone).
- Réglage « réduire les animations » : on remplace les mouvements par des fondus de 150 ms.

## Composants de base (à construire en premier)

Bouton (principal, secondaire, fantôme, danger ; tailles 36 / 44 / 52), champ de texte,
champ téléphone (+237 par défaut), champ montant, saisie du code SMS (6 cases), saisie du PIN,
puce de discipline, avatar avec badge vérifié, carte d'œuvre, carte d'artiste, mini-lecteur,
barre d'onglets, feuille modale, toast, squelette, état vide, bannière hors-ligne,
sélecteur de moyen de paiement (MTN MoMo, Orange Money, carte).

## Chaque écran a cinq états

Chargement (squelette), contenu, vide (illustration + une action), erreur (explication +
réessayer), hors-ligne (ce qui reste disponible). Un écran livré sans ses cinq états n'est pas fini.

## Voix et ton

- Tutoiement dans l'application, vouvoiement dans les documents légaux.
- Chaleureux, direct, valorisant l'artiste : « Ton premier soutien vient d'arriver ! »
  plutôt que « Transaction effectuée ».
- Phrases courtes. Pas de jargon technique. Un message d'erreur dit quoi faire ensuite.
- Français et anglais écrits ensemble ; pidgin prévu plus tard.

## Accessibilité (non négociable)

- Contrastes AA vérifiés (déjà vrais pour tous les jetons de texte).
- Zones tactiles de 44 px minimum, même si l'icône est plus petite.
- Chaque image a un texte alternatif ; chaque bouton icône a un libellé pour les lecteurs d'écran.
- La couleur ne porte jamais seule une information (icône ou texte en plus).
- Texte agrandissable jusqu'à 200 % sans casser la mise en page.
