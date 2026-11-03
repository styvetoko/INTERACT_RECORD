---
name: conventions-api
description: Conventions de l'API REST d'INTERACT Stage (routes, validation, codes d'erreur, pagination, idempotence, versions, réponses). À lire avant d'ajouter ou de modifier une route, un contrôleur ou un format de réponse.
---

# Conventions de l'API

## Routes

- Préfixe `/v1`. Noms au pluriel, en anglais, en kebab-case : `/v1/artists/:slug/fan-club-tiers`.
- L'utilisateur connecté : `/v1/me/...`. Le back-office : `/v1/admin/...` avec `@Roles(...)`.
- Les ressources publiques sont identifiées par un `slug` lisible quand c'est utile au partage
  (artistes, œuvres), sinon par UUID.
- Méthodes : `GET` lit, `POST` crée ou déclenche une action, `PATCH` modifie partiellement,
  `PUT` remplace, `DELETE` supprime. Une action métier qui n'est pas un CRUD est un `POST`
  sur un sous-chemin verbal : `POST /v1/bookings/:id/confirm`.

## Validation

- Toute entrée (corps, paramètres, requête) passe par un schéma **zod** via `parse(schema, input)`.
- Les limites sont explicites : longueurs, bornes numériques, tailles de listes.
- Les montants arrivent en entiers FCFA. Un montant décimal est refusé.

## Réponses

- Codes : 200 lecture/action, 201 création, 202 accepté (traitement différé), 204 sans contenu.
- On renvoie des vues construites par un mapper (`toPublicArtist`), jamais l'objet de base brut.
- Dates en ISO 8601 UTC. Montants : `{ "amount": 2500, "currency": "XAF" }`.

## Erreurs

Format unique :

```json
{ "code": "OTP_INVALID", "message": "Code incorrect" }
```

- `code` : stable, en MAJUSCULES, préfixé par le domaine (`OTP_`, `PIN_`, `ARTIST_`, `PAYMENT_`).
  Les applications traduisent à partir du `code`, jamais à partir du `message`.
- `message` : français, court, compréhensible par l'utilisateur final, sans détail technique.
- 400 donnée invalide (`VALIDATION_ERROR` avec `issues`), 401 non connecté, 403 interdit,
  404 introuvable, 409 conflit, 422 règle métier non respectée, 429 trop de demandes.
- Les erreurs inattendues sont journalisées avec un identifiant de requête ; l'utilisateur
  voit un message générique, jamais une trace technique.

## Listes et pagination

```
GET /v1/artists?city=Douala&limit=20&cursor=<opaque>
→ { "items": [...], "nextCursor": "<opaque>" | null }
```

`limit` de 1 à 50, 20 par défaut. Curseur opaque (base64 de la clé de tri).

## Idempotence

Toute route qui déplace de l'argent ou crée une ressource coûteuse exige l'en-tête
`Idempotency-Key` (UUID généré par l'application). Rejouer la même clé renvoie la même réponse
sans refaire l'action. Indispensable sur les réseaux mobiles qui coupent.

## Sécurité des routes

- Toute route est privée par défaut ; `@Public()` est un choix explicite.
- Les droits fins (propriétaire, manager avec permission) sont vérifiés dans le service.
- Les routes sensibles (codes SMS, PIN, paiement) ont une limite de débit dédiée (`@Throttle`).

## Évolution

On ajoute des champs sans casser les applications existantes. Retirer ou renommer un champ,
ou changer son sens, exige une nouvelle version de route et un ADR.
