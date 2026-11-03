# ADR-0007 : Jetons de design comme source unique, identité visuelle v0.1

- Statut : proposé (en attente de validation par le CEO)
- Date : 2026-11-03
- Décideurs : CEO, designer

## Contexte

Le web et le mobile doivent avoir exactement la même identité, et l'identité doit pouvoir
évoluer sans chasser des valeurs dans le code.

## Décision

`packages/design-tokens/tokens.json` est la seule source des couleurs, typographies,
espacements, rayons, ombres et animations, exportée en CSS et en Dart.
Proposition v0.1 : thème sombre par défaut, or de scène `#F2B544` en signature, dégradé or →
terre cuite pour les moments forts, Unbounded (titres) et Inter (texte), couleurs par discipline.
Tous les jetons de texte respectent le contraste WCAG AA, vérifié par calcul.

## Conséquences

Changer la couleur de marque = changer un jeton. L'identité définitive (logo, motifs) sera
confiée à une direction artistique ; les jetons seront mis à jour en conséquence.
