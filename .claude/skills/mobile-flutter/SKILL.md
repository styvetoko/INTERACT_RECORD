---
name: mobile-flutter
description: Conventions des applications Android et iOS d'INTERACT Stage en Flutter (architecture, état, navigation, lecteur audio et vidéo, hors-ligne, mode économie de data, paiements, performance sur Android d'entrée de gamme, publication sur les stores). À lire avant de créer ou modifier du code dans apps/mobile.
---

# Mobile (Flutter)

## Architecture

- Découpage par fonctionnalité : `lib/features/<fonctionnalité>/{data,domain,presentation}`.
- État : Riverpod. Navigation : go_router, avec liens profonds (`interactstage.com/...` ouvre l'application).
- Accès réseau par un client unique (Dio) : jetons, rafraîchissement, clé d'idempotence,
  reprise après coupure, traduction des codes d'erreur de l'API.
- Modèles immuables (freezed) et sérialisation générée.
- Thème construit à partir des jetons (`packages/design-tokens`), exportés en constantes Dart.
- Traductions ARB (fr, en) via `flutter_localizations`.

## Contraintes du terrain

- **Appareil de référence** : Android Go, 2 Go de RAM, réseau 3G. Démarrage à froid < 3 s,
  défilement à 60 i/s, application installée < 30 Mo (App Bundle, découpage par architecture).
- **Mode économie de data** : audio 32 à 48 kbit/s, vidéo 240p max, pas de lecture automatique,
  compteur de data consommée.
- **Hors-ligne** : bibliothèque téléchargée (chiffrée), billets, reçus et portefeuille lisibles
  sans réseau ; actions mises en file et envoyées au retour du réseau.
- Images en cache avec tailles adaptées ; jamais d'image pleine résolution dans une liste.

## Lecteur

Lecture en arrière-plan et écran verrouillé (just_audio + audio_service), file d'attente,
mini-lecteur persistant au-dessus de la barre d'onglets, transition partagée vers le plein écran.
Vidéo verticale du fil : préchargement de la suivante, libération mémoire des précédentes.

## Paiements

Feuille de paiement commune : montant, moyen (MTN MoMo, Orange Money, carte), PIN, attente
de la validation chez l'opérateur avec explication claire, célébration en cas de succès.
Respect des règles des stores pour les contenus numériques (section 9.2 du cahier des charges).

## Qualité

Tests unitaires et de widgets ; tests d'intégration des parcours P0 ; suivi des plantages
(objectif < 0,5 % des sessions) ; analyse statique stricte (`flutter analyze` sans avertissement).

## Publication

Comptes Apple et Google au nom de l'entreprise ; signatures gérées hors du dépôt ;
versions numérotées automatiquement par l'intégration continue ; captures et textes des
stores en français et en anglais.
