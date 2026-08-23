#!/usr/bin/env node
// Resolves how to invoke the Alego CLI on this machine.
//
// `@singula-ai/alego` is not published to npm, so `alego` is usually NOT on
// PATH and `npm install -g @singula-ai/alego` is not advice we can give yet.
// What does exist is a local checkout, which scripts/link-alego.mjs already
// links into node_modules. So look in that order:
//
//   1. `alego` on PATH            — a real install, once one exists
//   2. node_modules/@singula-ai/alego/lib/bin.js  — via the link farm
//   3. $ALEGO_REPO/apps/cli/lib/bin.js            — an explicit checkout
//
// Used as a module by bin/alego-tui.js and as a command by install.sh, which
// reads the argv one element per line (so paths with spaces survive).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** How to launch the Alego CLI: `[command, ...args]`, or null if unavailable. */
export function resolveAlegoCli() {
  const onPath = spawnSync('alego', ['--version'], { encoding: 'utf8' })

  if (!onPath.error && onPath.status === 0) {
    return ['alego']
  }

  const linked = join(root, 'node_modules', '@singula-ai', 'alego', 'lib', 'bin.js')

  if (existsSync(linked)) {
    return [process.execPath, linked]
  }

  if (process.env.ALEGO_REPO) {
    const fromRepo = join(resolve(process.env.ALEGO_REPO), 'apps', 'cli', 'lib', 'bin.js')

    if (existsSync(fromRepo)) {
      return [process.execPath, fromRepo]
    }
  }

  return null
}

export const ALEGO_CLI_HELP = `alego-tui: could not find the Alego CLI.

@singula-ai/alego is not on npm yet, so alego-tui runs against a local
checkout. To fix:

  git clone https://github.com/singula-ai/alego.git
  cd alego && pnpm install && pnpm build:lib

then place it beside this repo (../alego), or point at it and reinstall:

  ALEGO_REPO=/path/to/alego npm install
`

// Command form: print the argv, one element per line, for install.sh.
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = resolveAlegoCli()

  if (!cli) {
    console.error(ALEGO_CLI_HELP)
    process.exit(1)
  }

  console.log(cli.join('\n'))
}
