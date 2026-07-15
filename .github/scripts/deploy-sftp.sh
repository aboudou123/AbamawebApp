#!/bin/bash
# Déploiement SFTP vers abamafrancois.org (one.com)
set -euo pipefail

# ── Validation des secrets ────────────────────────────────────────────────────
missing=()
[ -z "${SFTP_HOST:-}" ] && missing+=("SFTP_HOST")
[ -z "${SFTP_USER:-}" ] && missing+=("SFTP_USER")
[ -z "${SFTP_PASS:-}" ] && missing+=("SFTP_PASS")
if [ ${#missing[@]} -gt 0 ]; then
  echo "ERREUR : secrets GitHub manquants : ${missing[*]}"
  exit 1
fi

# ── Chemin distant ────────────────────────────────────────────────────────────
REMOTE="webroots/by-route/abamafrancois.org_/"

echo "Hôte   : ${SFTP_HOST}"
echo "User   : ${SFTP_USER}"
echo "Remote : ${REMOTE}"
echo ""

# ── Diagnostic : structure SFTP ───────────────────────────────────────────────
echo "=== Structure SFTP (racine) ==="
lftp -u "${SFTP_USER},${SFTP_PASS}" "sftp://${SFTP_HOST}:22" << 'LFTP_DIAG'
set sftp:auto-confirm yes
set net:timeout 15
ls
bye
LFTP_DIAG
echo "================================"
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
