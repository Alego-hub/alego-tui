#!/usr/bin/env node
// Installs this checkout into an Alego profile:
//
//   alego plugin --profile <name> add <checkout>
//
// This lives in Node rather than in install.sh because the CLI is resolved at
// runtime (it may be `alego` on PATH, or `node <path>/bin.js`), and splicing a
// resolved argv back into shell needs either bash arrays with process
// substitution or fragile word-splitting. Process substitution is disabled
// when bash runs in POSIX mode — which is what `sh install.sh` does on macOS,
// where /bin/sh IS bash — so that formulation broke for anyone who invoked the
// installer that way. Passing argv inside one process avoids the problem
// entirely and keeps install.sh POSIX-clean.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveAlegoCli, ALEGO_CLI_HELP } from './resolve-alego-cli.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const profile = process.argv[2] || process.env.ALEGO_TUI_PROFILE || 'alego-tui'

const cli = resolveAlegoCli()

if (!cli) {
  console.error(ALEGO_CLI_HELP)
  process.exit(1)
}

const [command, ...prefix] = cli
const args = [...prefix, 'plugin', '--profile', profile, 'add', root]

console.log(`    using: ${cli.join(' ')}`)
console.log(`    $ ${[command, ...args].join(' ')}`)

const result = spawnSync(command, args, { stdio: 'inherit' })

if (result.error) {
  console.error(`alego-tui: could not run the alego CLI — ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
