#!/usr/bin/env node
// Links the Alego harness packages into node_modules/@singula-ai from a local
// Alego checkout.
//
// Why this exists: Alego is not published to npm, so `@singula-ai/*` cannot be
// declared as ordinary dependencies. Alego is a pnpm workspace in which every
// package carries its own node_modules/@singula-ai symlinks to its workspace
// peers, so symlinking a package directory in here resolves that package AND
// its peers correctly — for TypeScript, for Node at runtime, and for the e2e
// driver that boots the real `alego` CLI out of this repo's node_modules.
//
// The whole scope is linked rather than a curated list: it costs a few hundred
// symlinks, and it means a newly-consumed package never needs a change here.
//
// When Alego publishes, delete this script and move `@singula-ai/*` into
// dependencies — nothing in src/ changes.
import { existsSync, readFileSync, mkdirSync, readdirSync, lstatSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

/** Directories to search for a checkout, in order, when ALEGO_REPO is unset. */
const SIBLING_CANDIDATES = ['../alego', '../../alego', '../alego-hub/alego', '../../alego-hub/alego']

/** Workspace globs from Alego's pnpm-workspace.yaml, as literal depths. */
const MEMBER_GLOBS = [
  { dir: 'vendor', depth: 1 },
  { dir: 'packages', depth: 2 },
  { dir: 'apps', depth: 1 },
  { dir: 'native/landlock-run/packages', depth: 1 }
]

function isAlegoCheckout(dir) {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))

    return pkg.name === '@singula-ai/alego-root'
  } catch {
    return false
  }
}

function findCheckout() {
  if (process.env.ALEGO_REPO) {
    const dir = resolve(process.env.ALEGO_REPO)

    if (!isAlegoCheckout(dir)) {
      fail(`ALEGO_REPO=${dir} is not an Alego checkout (its package.json is not @singula-ai/alego-root).`)
    }

    return dir
  }

  for (const candidate of SIBLING_CANDIDATES) {
    const dir = resolve(root, candidate)

    if (isAlegoCheckout(dir)) {
      return dir
    }
  }

  fail('no Alego checkout found.')
}

function fail(reason) {
  console.error(`link-alego: ${reason}

alego-tui builds against a local Alego checkout because @singula-ai/* is not
published to npm. To fix:

  git clone https://github.com/singula-ai/alego.git
  cd alego && pnpm install && pnpm build:lib

then either place it beside this repo (../alego) or point at it:

  ALEGO_REPO=/path/to/alego npm install
`)
  process.exit(1)
}

/** Every @singula-ai package in the checkout, as name → absolute directory. */
function collectMembers(checkout) {
  const members = new Map()

  const record = dir => {
    const manifest = join(dir, 'package.json')

    if (!existsSync(manifest)) {
      return
    }

    try {
      const { name } = JSON.parse(readFileSync(manifest, 'utf8'))

      if (typeof name === 'string' && name.startsWith('@singula-ai/')) {
        members.set(name, dir)
      }
    } catch {
      // a malformed manifest in the checkout is not this script's problem
    }
  }

  const walk = (dir, depth) => {
    if (!existsSync(dir)) {
      return
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue
      }

      const child = join(dir, entry.name)

      if (depth === 1) {
        record(child)
      } else {
        walk(child, depth - 1)
      }
    }
  }

  for (const { dir, depth } of MEMBER_GLOBS) {
    walk(join(checkout, dir), depth)
  }

  return members
}

const checkout = findCheckout()
const members = collectMembers(checkout)

if (members.size === 0) {
  fail(`the checkout at ${checkout} contains no @singula-ai packages — is it installed and built?`)
}

const scopeDir = join(root, 'node_modules', '@singula-ai')

mkdirSync(scopeDir, { recursive: true })

let linked = 0

for (const [name, target] of members) {
  const link = join(scopeDir, name.slice('@singula-ai/'.length))

  // lstat, not exists: a symlink to a deleted target must still be replaced.
  try {
    lstatSync(link)
    rmSync(link, { recursive: true, force: true })
  } catch {
    // nothing there yet
  }

  symlinkSync(target, link, 'dir')
  linked += 1
}

// The CLI and the type definitions both live under lib/, which only exists
// after `pnpm build:lib` in the checkout. Warn rather than fail: a source-only
// checkout still links fine and the message says what to run.
const cli = join(scopeDir, 'alego', 'lib', 'bin.js')

if (!existsSync(cli)) {
  console.warn(`link-alego: warning — ${checkout} looks unbuilt (no apps/cli/lib/bin.js).`)
  console.warn('link-alego: run `pnpm install && pnpm build:lib` there before typechecking or running e2e.')
}

console.log(`link-alego: linked ${linked} @singula-ai packages from ${checkout}`)
