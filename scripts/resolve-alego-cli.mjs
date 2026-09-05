#!/usr/bin/env node
// Resolves how to invoke the Alego CLI on this machine.
//
// Prefer the explicitly selected or linked checkout so runtime packages and
// the launcher come from the same revision. PATH is the installed fallback.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** How to launch the Alego CLI: `[command, ...args]`, or null if unavailable. */
export function resolveAlegoCli() {
  if (process.env.ALEGO_REPO) {
    const fromRepo = join(resolve(process.env.ALEGO_REPO), 'apps', 'cli', 'lib', 'bin.js')

    return existsSync(fromRepo) ? [process.execPath, fromRepo] : null
  }

  const linked = join(root, 'node_modules', '@singula-ai', 'alego', 'lib', 'bin.js')

  if (existsSync(linked)) {
    return [process.execPath, linked]
  }

  const onPath = spawnSync('alego', ['--version'], { encoding: 'utf8' })

  if (!onPath.error && onPath.status === 0) {
    return ['alego']
  }

  return null
}

export const ALEGO_CLI_HELP = `alego-tui: could not find the Alego CLI.

This version requires Alego 0.1.3-alpha.1 or newer. Build a matching
source checkout, then link it:

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
