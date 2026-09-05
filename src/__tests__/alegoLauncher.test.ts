import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const homes: string[] = []
afterEach(() => { for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true }) })

function fixture() {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'alego launcher ')))
  homes.push(home)
  const resolver = join(home, 'scripts/resolve-alego-cli.mjs')
  mkdirSync(dirname(resolver), { recursive: true })
  copyFileSync(resolve('scripts/resolve-alego-cli.mjs'), resolver)
  const bin = join(home, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'alego'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(bin, 'alego'), 0o755)
  const put = (file: string) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, '') }
  const run = (repo = '') => JSON.parse(execFileSync(process.execPath, [
    '--input-type=module', '-e',
    'import { resolveAlegoCli } from "./scripts/resolve-alego-cli.mjs"; console.log(JSON.stringify(resolveAlegoCli()))'
  ], { cwd: home, env: { ...process.env, PATH: bin, ALEGO_REPO: repo }, encoding: 'utf8' }))
  return { home, put, run }
}

describe('Alego launcher selection', () => {
  it('uses an explicit checkout even when a linked CLI and PATH install exist', () => {
    const f = fixture()
    const repo = join(f.home, 'chosen checkout')
    const cli = join(repo, 'apps/cli/lib/bin.js')
    f.put(cli)
    f.put(join(f.home, 'node_modules/@singula-ai/alego/lib/bin.js'))
    expect(f.run(repo)).toEqual([process.execPath, cli])
  })

  it('reports an unbuilt explicit checkout instead of launching another version', () => {
    const f = fixture()
    expect(f.run(join(f.home, 'unbuilt'))).toBeNull()
  })

  it('uses linked packages before a global installation', () => {
    const f = fixture()
    const cli = join(f.home, 'node_modules/@singula-ai/alego/lib/bin.js')
    f.put(cli)
    expect(f.run()).toEqual([process.execPath, cli])
  })

  it('falls back to an installed CLI when no checkout is selected', () => {
    expect(fixture().run()).toEqual(['alego'])
  })
})
