#!/usr/bin/env bash
# Install alego-tui into a alego profile from this checkout.
#
#   git clone https://github.com/agentforce314/alego-tui.git
#   cd alego-tui && ./install.sh
#   alego --profile alego-tui    (or: ./bin/alego-tui.js)
set -euo pipefail

PROFILE="${ALEGO_TUI_PROFILE:-alego-tui}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if ! command -v alego >/dev/null 2>&1; then
  echo "error: the alego CLI is not on PATH — install deepseek-harness first:" >&2
  echo "  npm install -g @singula-ai/alego" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm is required to build the plugin" >&2
  exit 1
fi

echo "==> building alego-tui in $HERE"
(cd "$HERE" && npm install && npm run build)

echo "==> installing into alego profile '$PROFILE'"
alego plugin --profile "$PROFILE" add "$HERE"

echo
echo "done. launch with:"
echo "  alego --profile $PROFILE"
