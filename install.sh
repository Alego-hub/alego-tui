#!/usr/bin/env bash
# Install alego-tui into an Alego profile from this checkout.
#
#   git clone https://github.com/Alego-hub/alego-tui.git
#   cd alego-tui && ./install.sh
#   ./bin/alego-tui.js      (or: alego --profile alego-tui)
#
# Needs a local Alego checkout, since @singula-ai/* is not on npm yet. Place it
# beside this repo (../alego) or export ALEGO_REPO=/path/to/alego.
set -euo pipefail

PROFILE="${ALEGO_TUI_PROFILE:-alego-tui}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm is required to build the plugin" >&2
  exit 1
fi

# npm install runs the postinstall link step, which is what makes the Alego CLI
# resolvable below — so build first, then resolve.
echo "==> building alego-tui in $HERE"
(cd "$HERE" && npm install && npm run build)

echo "==> locating the alego CLI"
ALEGO_CMD=()
while IFS= read -r line; do
  ALEGO_CMD+=("$line")
done < <(node "$HERE/scripts/resolve-alego-cli.mjs")

if [ ${#ALEGO_CMD[@]} -eq 0 ]; then
  exit 1
fi

echo "    using: ${ALEGO_CMD[*]}"

echo "==> installing into alego profile '$PROFILE'"
"${ALEGO_CMD[@]}" plugin --profile "$PROFILE" add "$HERE"

echo
echo "done. launch with:"
echo "  $HERE/bin/alego-tui.js"
