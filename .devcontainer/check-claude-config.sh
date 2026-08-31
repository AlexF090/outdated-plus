#!/bin/bash
CLAUDE_JSON="${HOME}/.claude.json"

mkdir -p ~/.claude ~/.config/claude

if [ ! -f "$CLAUDE_JSON" ]; then
  echo "⚠️  WARNUNG: ~/.claude.json does not exist on the host."
  echo "    Create empty fallback so that the mount does not fail."
  echo "    You need to log in to Claude Code once in the Devcontainer."
  echo '{}' > "$CLAUDE_JSON"
elif [ ! -s "$CLAUDE_JSON" ] || [ "$(cat "$CLAUDE_JSON")" = "{}" ]; then
  echo "⚠️  WARNUNG: ~/.claude.json is empty ({})."
  echo "    Login in the Devcontainer will likely fail or require re-authentication."
  echo "    Run 'claude' once on the host to log in, then rebuild the Devcontainer."
else
  SIZE=$(wc -c < "$CLAUDE_JSON")
  echo "✓ ~/.claude.json found (${SIZE} bytes) — will be correctly mounted."
fi
