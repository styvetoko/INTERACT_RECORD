# Organisation de l'équipe INTERACT RECORD

Ce document décrit qui fait quoi, qui décide, et comment le travail circule.
Il concerne à la fois l'équipe humaine et les rôles tenus par Claude.

## Principe

Claude travaille comme une équipe complète : chaque rôle a un fichier dans `.claude/agents/`
qui fixe sa mission, ses responsabilités, ce qu'il livre et ce qu'il refuse.
Ces rôles sont tenus par le même modèle avec des consignes différentes. Leur valeur tient
à deux choses : la concentration sur un métier, et la relecture par un regard neuf
(un agent qui relit n'a pas écrit le code qu'il relit).

Ils ne remplacent pas l'équipe humaine : la direction décide, et les développeurs seniors
de l'entreprise relisent et valident le code avant toute mise en production.

## Les rôles

### Direction (humain)

| Rôle | Responsabilités | Décide seul de |
| --- | --- | --- |
| CEO et Product Owner (l'utilisateur) | Vision, priorités, budget, partenariats, validation finale | Périmètre, calendrier, nom, identité de marque, tarifs, lancement |
| Développeurs seniors de l'entreprise | Relecture du code, validation technique, mise en production | Fusion dans `main`, déploiement en production |
| Juriste (cabinet externe) | CGU, contrats, droits d'auteur, données personnelles, paiements | Validité juridique de tout texte légal |

### Équipe Claude

| Rôle | Agent | Mission | Livre |
| --- | --- | --- | --- |
| Directeur technique et architecte | `cto-architecte` | Cohérence de l'ensemble, choix techniques durables | Notes de conception, ADR, revues d'architecture |
| Chef de produit | `chef-de-produit` | Traduire le cahier des charges en travail livrable | Récits utilisateurs, critères d'acceptation, découpage des jours |
| Designer UX/UI | `designer-ux-ui` | Expérience premium, cohérente et accessible | Jetons, composants, écrans, états, animations, textes |
| Développeur back-end | `dev-backend` | API fiable, sûre et rapide | Modules NestJS, migrations, tests |
| Ingénieur paiements | `ingenieur-paiements` | Exactitude de chaque franc | Grand livre, portefeuille, séquestre, fournisseurs de paiement |
| Développeur web | `dev-web` | Web public, PWA, back-office | Pages Next.js, composants, tests |
| Développeur mobile | `dev-mobile` | Applications Android et iOS | Écrans Flutter, lecteur, hors-ligne, tests |
| Ingénieur qualité | `qa` | Rien ne sort sans preuve que ça marche | Plans de test, tests de bout en bout, rapports de recette |
| Ingénieur sécurité et conformité | `securite` | Protéger utilisateurs, argent et données | Revues de sécurité, modèles de menace, listes de contrôle |
| Ingénieur infrastructure | `devops-sre` | Livrer vite et sans panne | CI/CD, environnements, surveillance, coûts |

### Partenaires de recherche (ChatGPT, Grok)

| Rôle | Tenu par | Apporte |
| --- | --- | --- |
| Recherche et organisation | ChatGPT, Grok | Études de marché, comparaisons, idées, organisation du travail |
| Développement complet | Claude (l'équipe ci-dessus) | Architecture, code, design, tests, livraison |

Leurs apports arrivent par le CEO. Avant d'entrer dans le cahier des charges ou le code,
chacun est analysé par le chef de produit et l'architecte : retenu (avec la raison),
écarté (avec la raison) ou soumis à la décision du CEO. Les chiffres, lois et tarifs cités
sont vérifiés à la source avant d'être utilisés. Il n'existe qu'une version de référence
du cahier des charges.

## Qui décide de quoi (matrice RACI)

R = réalise, A = approuve (une seule personne), C = consulté, I = informé.

| Sujet | CEO | Devs seniors | CTO | Produit | Design | Back | Paiements | Web/Mobile | QA | Sécurité | DevOps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Périmètre et priorités | A | I | C | R | C | I | I | I | I | I | I |
| Architecture, ADR | I | C | A/R | C | I | C | C | C | I | C | C |
| Identité visuelle, couleurs | A | I | I | C | R | I | I | C | I | I | I |
| Composants et écrans | C | I | I | C | A/R | I | I | R | C | I | I |
| Code de l'API | I | A | C | I | I | R | C | I | C | C | I |
| Grand livre et paiements | I | A | C | C | I | C | R | I | C | C | I |
| Applications web et mobile | I | A | C | C | C | I | I | R | C | I | I |
| Recette d'une fonctionnalité | C | I | I | A | C | C | C | C | R | C | I |
| Sécurité et données personnelles | I | C | C | I | I | C | C | C | C | A/R | C |
| Mise en production | A | R | C | I | I | I | I | I | C | C | R |

## Circuit d'une fonctionnalité

1. **Cadrage** (chef de produit) : récit utilisateur, critères d'acceptation, identifiants du cahier des charges.
2. **Conception** (architecte, designer) : note de conception ; maquettes et états si interface.
3. **Réalisation** (développeurs, ingénieur paiements) : code et tests ensemble.
4. **Vérification** (qualité) : chaque critère prouvé par un test ou une démonstration.
5. **Revues** (sécurité, paiements, architecte) : obligatoires selon la nature du changement.
6. **Livraison** : commit, journal des changements, demande de fusion.
7. **Validation humaine** : un développeur senior relit et fusionne ; le CEO valide ce qui est visible.

### Revues obligatoires selon le changement

| Le changement touche… | Revue obligatoire |
| --- | --- |
| L'argent (soldes, paiements, retraits, commissions) | `ingenieur-paiements` + `securite` |
| L'identité, la connexion, les droits d'accès | `securite` |
| Les données personnelles | `securite` |
| Plusieurs modules ou une dépendance nouvelle | `cto-architecte` |
| Ce que l'utilisateur voit | `designer-ux-ui` |
| Tout changement | `qa` |

## Rituels

| Rituel | Fréquence | Contenu |
| --- | --- | --- |
| Point de démarrage | Début de chaque journée de sprint | Objectifs du jour, identifiants visés, risques |
| Démonstration | Fin de chaque journée de sprint | Ce qui marche, preuves (tests, captures), ce qui reste |
| Revue de sprint | Fin du sprint de 2 semaines | Bilan, écarts au plan, décisions à prendre |
| Revue d'architecture | À chaque ADR | Contexte, options, décision, conséquences |

## Escalade

Une question qui engage le produit, le budget, le juridique ou la marque remonte au CEO.
On ne la tranche pas à sa place. On présente les options, une recommandation, et on attend.
