# ADR-0009 : session du back-office web par cookies gérés par le serveur Next

- Statut : proposé
- Date : 2026-11-25
- Décideurs : directeur technique, ingénieur sécurité (relecture demandée)

## Contexte

L'API du back-office existe depuis le J2 (comptes, rôles, badge vérifié, journal d'audit).
Il faut maintenant des écrans, dans `apps/web` sous `/admin` (skill `web-nextjs`).
L'API délivre un jeton d'accès de 15 minutes et un jeton de rafraîchissement opaque à rotation (ADR-0004).
Si un ancien jeton de rafraîchissement est réutilisé, toutes les sessions de l'utilisateur sont fermées.

Les comptes du back-office peuvent suspendre des utilisateurs et changer des rôles : un vol de session
est grave. Les jetons ne doivent jamais être lisibles par du JavaScript dans le navigateur.

## Options étudiées

1. **Jetons dans le navigateur** (localStorage), appels directs à l'API : simple, mais un seul défaut
   XSS donne les jetons d'un administrateur ; et il faudrait ouvrir le CORS de l'API au site.
2. **Cookies httpOnly posés par le serveur Next, qui appelle l'API pour le navigateur** : les jetons
   ne quittent jamais le serveur web ; aucune modification de l'API ; plus de code côté web.
3. **Session propre au back-office dans l'API** (cookies posés par l'API) : demande de nouvelles routes
   et une protection CSRF dans l'API, pour un seul client.

## Décision

Option 2.

- Connexion par code SMS, comme dans l'application (ACC-01), via des actions serveur Next.
  Après vérification du code, si le compte n'a aucun rôle interne (ADM-01), la session est
  fermée aussitôt et l'accès refusé.
- Deux cookies `httpOnly`, `SameSite=Strict`, `Secure` en production, limités au chemin `/admin` :
  le jeton d'accès et le jeton de rafraîchissement, rien d'autre. Le cookie de rafraîchissement expire
  après 8 heures sans activité, pas 30 jours.
- Le middleware Next (`src/middleware.ts`) renouvelle le jeton d'accès une minute avant son expiration.
  Deux requêtes simultanées pourraient présenter le même jeton de rafraîchissement et déclencher la
  détection de vol : elles partagent le même appel en cours, et les liens du back-office ne sont pas
  préchargés. Rien n'est gardé après l'appel : un ancien jeton présenté plus tard reste détecté par
  l'API (revue sécurité M2 ; une première version le gardait 30 secondes, ce qui masquait un vol).
- Seul un refus explicite de l'API (401) déconnecte. Une limite de débit (429) ou une panne laisse
  la session intacte (revue sécurité M1).
- Les droits affichés (menus, boutons) suivent la même matrice que l'API (`lib/admin/permissions.ts`).
  L'API reste seule juge : le web ne fait que masquer ce qui serait refusé.
- Les actions serveur de Next vérifient l'origine de la requête, ce qui protège contre le CSRF,
  en plus de `SameSite=Strict`.

## Conséquences

- Aucun jeton n'est exposé au navigateur ; le CORS de l'API n'a pas besoin du site du back-office.
- Toutes les demandes de code SMS du back-office partent de l'adresse IP du serveur web : la limite
  par IP de l'API (5 par minute) est partagée par toute l'équipe. Suffisant pour une petite équipe ;
  à revoir si le back-office grandit.
- Le cache de renouvellement est en mémoire : avec plusieurs instances du serveur web, deux instances
  pourraient encore se marcher dessus. À traiter avant la production (session collante, ou délai de
  grâce sur la réutilisation dans l'API, par un nouvel ADR).
- Se connecter avec un numéro inconnu crée un compte fan dans l'API (comportement d'ACC-01), puis la
  session est fermée. Seule la création du compte (`user.signup`) est tracée : ni les connexions de
  l'équipe ni les refus ne le sont encore (revue sécurité F6, voir `docs/avant-production.md`).
- Un attaquant anonyme peut épuiser volontairement ces limites partagées et empêcher l'équipe de se
  connecter (revue sécurité M1). À corriger avant la production : l'API doit connaître l'IP réelle du
  client par un en-tête que seul le serveur web peut poser.
- Une réponse perdue en route (onglet fermé, coupure 3G) pendant un renouvellement laisse le navigateur
  avec un ancien jeton : à la requête suivante, l'API ferme toutes les sessions de la personne. Rare, mais
  à traiter par un délai de grâce côté API (nouvel ADR).
