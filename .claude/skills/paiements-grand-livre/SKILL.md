---
name: paiements-grand-livre
description: Règles absolues pour l'argent dans INTERACT RECORD (grand livre en partie double, portefeuilles, commissions, séquestre, retraits, fournisseurs Mobile Money, idempotence, rapprochement, fraude). À lire avant tout code qui touche un montant, un solde, un paiement, un remboursement ou un retrait.
---

# Paiements et grand livre

Un bug d'argent détruit la confiance des artistes. Ici, la prudence passe avant la vitesse.

## Règles absolues

1. **Entiers seulement.** Montants en FCFA entiers (`Int`, `BigInt` pour les cumuls).
   Jamais de `float`. Les pourcentages sont en points de base (1 500 = 15 %).
2. **Partie double.** Chaque opération crée des écritures dont la somme est nulle :
   ce qui sort d'un compte entre dans un autre. Une transaction déséquilibrée est refusée.
3. **Écritures immuables.** On n'efface ni ne modifie jamais une écriture. On corrige par une
   écriture inverse, liée à l'originale.
4. **Le solde est calculé**, à partir des écritures (avec un cache vérifiable), jamais saisi.
5. **Idempotence partout.** Chaque paiement, retrait, notification d'opérateur porte une clé
   unique en base. Le même événement reçu deux fois ne compte qu'une fois.
6. **Une seule porte.** Seul le module `ledger` écrit dans les comptes. Les autres modules
   lui demandent une opération nommée (`recordSupport`, `holdEscrow`, `releaseEscrow`…).
7. **Arrondis maîtrisés.** Une répartition (artiste, manager, collaborateurs, plateforme)
   distribue le reste d'arrondi de façon déterministe ; la somme des parts égale toujours le brut.

## Comptes

| Compte | Sens |
| --- | --- |
| `user:<id>:wallet:available` | Argent retirable de l'utilisateur |
| `user:<id>:wallet:pending` | Délai de sécurité (3 jours, 7 pour un compte récent) |
| `escrow:<bookingId>` | Séquestre d'une prestation ou d'une commande |
| `platform:revenue` | Commissions de la plateforme |
| `platform:fees` | Frais des opérateurs supportés |
| `provider:<nom>:clearing` | Argent en transit chez un agrégateur |

## Cycle d'un paiement

1. Le fan lance un paiement → `Payment` en `PENDING`, clé d'idempotence, appel au fournisseur.
2. Le fournisseur confirme (réponse ou webhook signé) → écritures : clearing → répartition
   (artiste en `pending`, collaborateurs, manager, plateforme). `Payment` passe `SUCCEEDED`.
3. Après le délai de sécurité → `pending` vers `available`.
4. Échec ou expiration → `FAILED`, aucune écriture de solde.

Les états suivent une machine d'états explicite ; toute transition interdite lève une erreur.

## Séquestre (booking, œuvres originales)

`HELD` → (`RELEASED` | `REFUNDED` | `DISPUTED` → `RELEASED` ou `REFUNDED`). Libération
24 h après confirmation (72 h pour une œuvre expédiée) sans litige. Les règles d'annulation
sont dans BOO-08.

## Retraits

Minimum 1 000 FCFA ; KYC de niveau 1 au moins ; vers un numéro au nom de la personne vérifiée ;
PIN obligatoire ; changement de numéro de retrait = 48 h de blocage. Le montant est réservé
dans le grand livre avant l'appel au fournisseur, puis confirmé ou restitué.

## Fournisseurs

Interface `PaymentProvider` : `collect`, `payout`, `getStatus`, `verifyWebhook`.
Le faux fournisseur (`PAYMENT_PROVIDER=fake`) simule succès, échec, solde insuffisant,
délai et doublon de webhook selon le numéro utilisé, pour tester chaque cas.

## Rapprochement et fraude

- Rapprochement quotidien automatique : grand livre ↔ relevés fournisseurs ; tout écart alerte.
- Limites de vélocité (montant et nombre par heure et par jour), délais de sécurité,
  gel préventif, revue manuelle des retraits inhabituels (section 9.7 du cahier des charges).

## Tests obligatoires

Somme nulle de chaque transaction ; double réception d'un webhook ; panne du fournisseur au
milieu ; course entre deux retraits simultanés (le solde ne devient jamais négatif) ;
répartition avec arrondis ; remboursement ; litige. Couverture de 80 % minimum sur ce module.
