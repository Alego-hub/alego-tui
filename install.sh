#!/usr/bin/env bash
# Install alego-tui into an Alego profile from this checkout.
#
#   git clone https://github.com/Alego-hub/alego-tui.git
#   cd alego-tui && ./install.sh
#   ./bin/alego-tui.js      (or: alego --profile alego-tui)
#
# Needs a local Alego checkout, since @singula-ai/* is not on npm yet. Place it
# beside this repo (../alego) or export ALEGO_REPO=/path/to/alego.
#
# Deliberately POSIX-clean: no arrays, no process substitution, no pipefail, so
# it behaves the same under `./install.sh`, `sh install.sh`, dash, and zsh.
# Anything needing a resolved argv is delegated to scripts/install-plugin.mjs.
set -eu

PROFILE="${ALEGO_TUI_PROFILE:-alego-tui}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm is required to build the plugin" >&2
  exit 1
fi

# npm install runs the postinstall link step, which is what makes the Alego CLI
# resolvable below — so build first, then install into the profile.
echo "==> building alego-tui in $HERE"
cd "$HERE"
npm install
npm run build

echo "==> installing into alego profile '$PROFILE'"
node "$HERE/scripts/install-plugin.mjs" "$PROFILE"

echo
echo "done. launch with:"
echo "  $HERE/bin/alego-tui.js"
