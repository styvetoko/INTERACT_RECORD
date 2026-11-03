# ADR-0004 : Connexion par code SMS et sessions à rotation

- Statut : accepté
- Date : 2026-11-03
- Décideurs : CTO, sécurité

## Contexte

Le numéro de téléphone est l'identité naturelle au Cameroun (Mobile Money). Beaucoup
d'utilisateurs n'ont pas d'e-mail actif.

## Décision

- Identifiant principal : numéro au format E.164 ; code à 6 chiffres haché (scrypt), 5 minutes,
  usage unique, 5 essais, 3 demandes par 10 minutes.
- Jeton d'accès JWT de 15 minutes ; jeton de rafraîchissement opaque de 30 jours, haché en base,
  renouvelé à chaque usage ; la réutilisation d'un ancien jeton ferme toutes les sessions.
- Statut et rôles relus en base à chaque requête.

## Conséquences

Une lecture de base par requête authentifiée : acceptable au lancement, à mettre en cache
(Redis, durée courte) quand le trafic l'exigera. Coût des SMS à suivre ; WhatsApp en secours plus tard.
