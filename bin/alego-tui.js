#!/usr/bin/env node
// Launcher: boots the Alego profile that carries the alego-tui bundle.
// Pure JS on purpose — it runs before any build output exists and must give
// actionable errors when the environment is missing pieces.
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveAlegoCli, ALEGO_CLI_HELP } from '../scripts/resolve-alego-cli.mjs'

const PROFILE = process.env.ALEGO_TUI_PROFILE || 'alego-tui'
const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))

const args = process.argv.slice(2)

if (args.includes('--version') || args.includes('-V')) {
  console.log(pkg.version)
  process.exit(0)
}

const cli = resolveAlegoCli()

if (!cli) {
  console.error(ALEGO_CLI_HELP)
  process.exit(1)
}

const home = process.env.ALEGO_HOME || join(process.env.HOME || process.env.USERPROFILE || '.', '.alego')
const profileDir = join(home, 'profiles', PROFILE)

if (!existsSync(join(profileDir, 'package.json'))) {
  console.error(`alego-tui: profile "${PROFILE}" is not set up yet.`)
  console.error('From a checkout of this repository, run:  ./install.sh')
  console.error(`(or manually:  alego plugin --profile ${PROFILE} add <path-to-checkout>)`)
  process.exit(1)
}

const env = { ...process.env }

env.NODE_ENV ??= 'production'

const [command, ...prefix] = cli
const child = spawn(command, [...prefix, '--profile', PROFILE, ...args], { env, stdio: 'inherit' })

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)

    return
  }

  process.exit(code ?? 0)
})
