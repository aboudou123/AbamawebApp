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
mirror --reverse --delete --verbose \
  --exclude-glob .git/ \
  --exclude-glob .github/ \
  --exclude .gitignore \
  --exclude README.md \
  . ${REMOTE}
bye
LFTP_DEPLOY

echo ""
echo "Déploiement terminé."
