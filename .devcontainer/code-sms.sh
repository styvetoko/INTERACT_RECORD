#!/usr/bin/env bash
# Affiche le dernier code SMS envoyé par le faux fournisseur (démonstration uniquement).
code=$(grep -o 'code est [0-9]\{6\}' /tmp/interact/api.log 2>/dev/null | tail -1 | grep -o '[0-9]\{6\}')
if [ -n "$code" ]; then echo "Dernier code SMS : $code"; else echo "Aucun code pour l'instant : demande d'abord un code sur la page de connexion."; fi
