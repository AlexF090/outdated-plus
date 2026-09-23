#!/bin/bash
set -e

echo "--- [post-create-command] Installing project dependencies ---"
cd /workspaces/outdated-plus
npm ci

echo "--- [post-create-command] Seeding Claude Code config from host ---"
if [ -f "${HOME}/.claude.json.seed" ] && [ ! -f "${HOME}/.claude.json" ]; then
  cp "${HOME}/.claude.json.seed" "${HOME}/.claude.json"
fi

echo "--- [post-create-command] Script finished ---"
