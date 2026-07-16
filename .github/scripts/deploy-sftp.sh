#!/bin/bash
# Déploiement SFTP vers abamafrancois.org (one.com)
set -euo pipefail

# ── Identité du site : SOURCE UNIQUE ──────────────────────────────────────────
# Si tu copies ce fichier pour un nouveau site, change UNIQUEMENT cette ligne.
SITE="abamafrancois.org"
REMOTE="webroots/by-route/${SITE}_/"
MARKER=".deploy-target"

# ── Validation des secrets ────────────────────────────────────────────────────
missing=()
[ -z "${SFTP_HOST:-}" ] && missing+=("SFTP_HOST")
[ -z "${SFTP_USER:-}" ] && missing+=("SFTP_USER")
[ -z "${SFTP_PASS:-}" ] && missing+=("SFTP_PASS")
if [ ${#missing[@]} -gt 0 ]; then
  echo "ERREUR : secrets GitHub manquants : ${missing[*]}"
  exit 1
fi

# ── Cohérence locale : le marqueur du repo doit correspondre au site ──────────
if [ -f "$MARKER" ]; then
  local_marker="$(tr -d '[:space:]' < "$MARKER")"
  if [ "$local_marker" != "$SITE" ]; then
    echo "REFUS : marqueur local ($local_marker) ≠ site attendu ($SITE)."
    echo "Es-tu dans le bon dossier ?"
    exit 1
  fi
fi

echo "Hôte   : ${SFTP_HOST}"
echo "User   : ${SFTP_USER}"
echo "Site   : ${SITE}"
echo "Remote : ${REMOTE}"
echo ""

# ── GARDE-FOU : la cible distante ne doit PAS appartenir à un autre site ──────
echo "=== Vérification du marqueur distant (${REMOTE}${MARKER}) ==="
remote_marker="$(lftp -u "${SFTP_USER},${SFTP_PASS}" "sftp://${SFTP_HOST}:22" \
  -e "set sftp:auto-confirm yes; set net:timeout 15; cat ${REMOTE}${MARKER}; bye" 2>/dev/null \
  | tr -d '[:space:]' || true)"

if [ -n "$remote_marker" ] && [ "$remote_marker" != "$SITE" ]; then
  echo ""
  echo "!!!!!!!!!!!!!!!!!!!! ARRÊT DE SÉCURITÉ !!!!!!!!!!!!!!!!!!!!"
  echo "La cible distante appartient au site : '$remote_marker'"
  echo "mais on essaie de déployer           : '$SITE'"
  echo "Déploiement ANNULÉ pour ne pas écraser le mauvais site."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  exit 1
fi

if [ -z "$remote_marker" ]; then
  echo "Aucun marqueur distant — premier déploiement de ${SITE} (le marqueur sera créé)."
else
  echo "Marqueur distant OK : ${remote_marker}"
fi
echo ""

# ── Transfert (racine du repo → serveur, sans les dossiers git) ───────────────
echo "Déploiement vers ${REMOTE} ..."
lftp -u "${SFTP_USER},${SFTP_PASS}" "sftp://${SFTP_HOST}:22" << LFTP_DEPLOY
set sftp:auto-confirm yes
set net:timeout 30
set net:max-retries 3
set net:reconnect-interval-base 5

# ── STRATEGIE EN 2 PASSES (robuste, ne saute jamais un changement de contenu) ──
#
# Contexte : sur le runner CI, git pose une mtime "maintenant" a chaque checkout.
#   - Comparaison par DATE seule  -> tout est re-uploade a chaque fois (lent).
#   - Comparaison par TAILLE seule (--ignore-time / --size-only) -> SAUTE tout
#     fichier dont la taille n'a pas change, MEME si le contenu a change.
#     (Bug reel vecu : une modif CSS a garde la taille exacte -> non deploye.)
#
# Solution : traiter separement les petits fichiers et les grosses videos.

# Passe 1 : TOUT SAUF /videos/ — comparaison par defaut (taille + date).
#   Les fichiers (HTML/CSS/JS/images) sont petits : les re-uploader a chaque
#   deploiement est negligeable et GARANTIT que le contenu en ligne est a jour,
#   meme si une modif ne change pas la taille du fichier.
#   NE JAMAIS ajouter --ignore-time ni --size-only ici (voir bug ci-dessus).
mirror --reverse --delete --verbose \
  --exclude-glob .git/ \
  --exclude-glob .github/ \
  --exclude-glob videos/ \
  --exclude .gitignore \
  --exclude README.md \
  . ${REMOTE}

# Passe 2 : UNIQUEMENT /videos/ — comparaison par TAILLE (--ignore-time).
#   Les videos font des dizaines/centaines de Mo : on evite de les re-uploader
#   inutilement. Une video modifiee change de taille, donc elle sera bien poussee.
mirror --reverse --delete --ignore-time --verbose \
  videos/ ${REMOTE}videos/

bye
LFTP_DEPLOY

echo ""
echo "Déploiement terminé."
