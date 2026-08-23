# alego-tui — Port Plan

Goal: turn this checkout — a clone of [dsh-ccTUI](https://github.com/agentforce314/dsh-ccTUI),
a Claude-Code-style terminal UI plugin for **deepseek-harness 0.1.0-rc.7** — into **alego-tui**,
the same TUI running as a plugin for the [Alego](https://github.com/singula-ai/alego) agent
harness (0.1.1-rc.2).

Plugin authoring follows Alego's own tutorial chain: a plugin is a TypeScript module exporting
`apply(ctx)`, distributed as a **bundle** (`package.json` → `alego.bundle.patch`) and installed
into a **profile** with `alego plugin --profile <name> add <checkout>`.
See [Your first plugin](https://github.com/singula-ai/alego/blob/main/docs/user/develop/basic/index.md)
and [Package and install a plugin](https://github.com/singula-ai/alego/blob/main/docs/user/develop/basic/publish.md).

## What kind of port this is

Alego is a **rebranded fork of deepseek-harness**, not a different system: its first two commits
import the harness source and rename it. So the port is not an architectural rewrite. It is three
independent axes of change, each of which can land green on its own:

| Axis | What changes | Risk |
|---|---|---|
| **1. Dependency retarget** | `@deepseek-ai/dsh-*` → `@singula-ai/alego-*`, plus a version bump 0.1.0-rc.7 → 0.1.1-rc.2 | API drift across the bump |
| **2. Product rebrand** | `dsh-cctui` → `alego-tui` identifiers, env vars, data dir, wordmark, palette, strings | Wide but mechanical (~130 files) |
| **3. Toolchain** | Alego is **unpublished on npm** — deps must resolve from a local checkout | Novel; no upstream precedent |

Axis 1 is the only one with genuine unknowns, and reconnaissance shows it is small (below).

## Why axis 1 is small: the adapter surface

The app has exactly one backend seam, `src/harness/` (2231 LOC across three files), and it is the
only directory allowed to import harness packages — enforced by `npm run verify:boundary`.
Everything above it (~68k LOC app + ~29k vendored Ink fork) is backend-agnostic and does not
change at all in axis 1.

Within that seam, the surface that must exist in Alego is remarkably small. **Value imports** —
the only things that must exist at runtime — number four:

| Symbol | From | Verified in Alego 0.1.1-rc.2 |
|---|---|---|
| `Schema` | `@singula-ai/schemastery` | yes |
| `installModelSelection` | `@singula-ai/alego-agent` | `model-selection.d.ts:35`, signature unchanged |
| `SessionId` | `@singula-ai/alego-session` | yes |
| `createUserMessage` | `@singula-ai/alego-llm` | `message.d.ts:171` |

Everything else is `import type` and erases at build time. One service is a hard dependency
(`inject = ['agents']`); the events the client subscribes to — `session/event`, `agent/status`,
`approval/request`, `subagent/start`, `subagent/end` — all exist in Alego with matching payloads.

Every *other* service is soft-probed:

```ts
const meter = this.ctx.get('tokenMeter') as { measure?: (...) => ... } | undefined
```

`ctx.get(name)` with a structural inline type and optional chaining at every call site. This is
the port's safety net, and it is deliberate: a service that drifted, moved, or vanished in Alego
degrades that one feature instead of failing the boot. Thirteen services are consumed this way
(`agentDefaultModel`, `approval`, `commands`, `llm`, `loader`, `planMode`, `sessionPersistence`,
`sessionProjectionCache`, `sessionTitle`, `tokenMeter`, `tools`, `userQuestions`, and the
subagent runtime).

**Consequence for the plan:** the compiler is the drift detector. After the mechanical rename,
`tsc --noEmit` against the real Alego type definitions reports precisely what the version bump
broke — nothing else needs auditing up front.

## Why axis 3 needs a new mechanism

`@singula-ai/*` is not published to npm (every `npm view` returns 404). dsh-ccTUI could simply
declare `@deepseek-ai/*` devDependencies and let npm install them; alego-tui cannot.

Alego is a pnpm workspace in which each package carries its own `node_modules/@singula-ai/`
symlinks to its workspace peers. That means a **symlink farm** — linking the packages we need
from a local Alego checkout into `node_modules/@singula-ai/` — resolves completely and
consistently, peers included. Verified: linking `packages/core/agent` and importing it returns a
live `installModelSelection` function.

So axis 3 is `scripts/link-alego.mjs`: locate the Alego checkout (`ALEGO_REPO`, else a sibling
search), map workspace package names to directories, and link what we need. It runs from
`postinstall` and from `install.sh`, and it fails with an actionable message when no checkout is
found.

This also settles distribution. The bundle keeps `@singula-ai/*` **external** in the esbuild
output — never bundled — so cordis service identities and `instanceof` checks stay unified with
the host process. Node resolves them from the linked checkout at load time, exactly as
dsh-ccTUI's bundle resolved `@deepseek-ai/*`.

When Alego publishes to npm, this stage collapses into ordinary `dependencies` and the link
script becomes a dev convenience. The plugin code does not change.

## Stages

Each stage: implement → typecheck + test → PR → merge. Branches `stage-N-<slug>`.

### Stage 1 — Port plan (this PR)
Rewrite `docs/PLAN.md` for the Alego port; preserve the dsh-ccTUI lineage below.
**Acceptance:** docs merged.

### Stage 2 — Retarget the harness dependency to Alego
- `scripts/link-alego.mjs` + `postinstall`; drop the unresolvable `@deepseek-ai/*` devDeps.
- Rename harness imports in `src/harness/*`, `test/e2e/probe-llm.mjs`, and the two scripts that
  name the scope (`verify-boundary.mjs`, `build-plugin.mjs` external/alias).
- Fix whatever the 0.1.0-rc.7 → 0.1.1-rc.2 bump broke, guided by `tsc`.
- The product is still called `dsh-cctui` here; only the harness underneath changes.
- **Acceptance:** `tsc --noEmit` green, `vitest run` green (1956 tests), `verify:boundary` green,
  `dist/plugin.js` builds with only `@singula-ai/*` external.

### Stage 3 — Rebrand to alego-tui
- Identifiers: package `alego-tui`, plugin/row name, bin, profile; `DSH_CCTUI_*` → `ALEGO_TUI_*`
  (63 files); `packages/dsh-cctui-ink` → `packages/alego-tui-ink`, `@dsh-cctui/ink` →
  `@alego-tui/ink` (~100 import sites, three esbuild aliases, tsconfig paths, ambient `.d.ts`).
- Data dir `~/.dsh-cctui` → `~/.alego-tui` (`ALEGO_TUI_HOME`).
- Brand: ALEGO-TUI wordmark; the whale mascot becomes a **LEGO brick** (Alego is "AI agent LEGO
  blocks", and its mark is a brick); palette and theme hue move from DeepSeek blue `#4D6BFE` to
  Alego amber `#F5A524`; taglines read "for Alego", per Alego's
  [brand guidelines](https://github.com/singula-ai/alego/blob/main/BRAND_GUIDELINES.md), which ask
  that a third-party project not present "Alego" as its own name.
- Attribution for the Ink fork and both upstream projects stays in `NOTICE.md`.
- **Acceptance:** typecheck + tests green; banner colors regression-tested (see the v0.2.1 lesson
  in PORTING-NOTES — a rebrand that only changed glyphs shipped the wrong color once already).

### Stage 4 — Packaging, launcher, and end-to-end
- `cordis.patch.yml` → `alego.bundle`; `bin/alego-tui.js`; `install.sh` resolving an `alego` CLI
  from PATH or a checkout; README rewritten for Alego.
- Retarget both PTY e2e drivers (`scripts/e2e/run_core.py`, `run_install.py`) and the mock LLM
  adapter onto Alego; run them.
- **Acceptance:** `npm run e2e` passes end to end — real Alego CLI boots the TUI as a bundle,
  a scripted turn streams, tools render, a session resumes.

## Risk register

| Risk | Mitigation |
|---|---|
| API drift in the rc.7 → rc.2 bump | `tsc` against real Alego types is the detector; soft-probed services degrade rather than crash |
| Alego checkout missing or stale on a user's machine | `link-alego.mjs` fails loudly with the exact fix; `bin/` probes before boot |
| Rebrand ships stale colors (happened upstream in v0.2.1) | Assert SGR colors in the e2e banner region, not just glyphs |
| Renaming the vendored Ink fork breaks resolution in three build paths | tsconfig paths, esbuild alias, and the ambient module declaration are changed together and covered by typecheck + the mount smoke test |
| Upstream test skew (11 skipped tests) | Inherited, documented in PORTING-NOTES; not reconciled by this port unless a stage touches that area |

## Lineage: the dsh-ccTUI port

This repo's baseline is dsh-ccTUI at v0.3.18, itself a port of the **clawcodex `ui-tui`** React
terminal UI onto deepseek-harness across nine stages (all merged upstream, 2026-08-18): plan and
scaffolding, vendored Ink fork, verbatim app copy over a null gateway, harness gateway with the
core conversation loop, interaction gates (approvals, questions, plan review, permission modes),
sessions and resume, the command bridge and model picker, rich rendering and telemetry, and
packaging. Later releases rebranded it for DeepSeek (v0.2.0), moved it to its own data directory
and ocean-blue palette (v0.2.1), and renamed the vendored fork (v0.3.0).

That history matters here for one reason: it established the architecture this port depends on —
a single narrow adapter with graceful degradation — and it recorded the mistakes worth not
repeating. Both are in [PORTING-NOTES.md](./PORTING-NOTES.md); the live architecture is in
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Status log

- 2026-08-23: baseline imported (dsh-ccTUI v0.3.18 sources, 1956 tests green against
  deepseek-harness 0.1.0-rc.7).
- 2026-08-23: Stage 1 merged (#1) — this plan.
- 2026-08-23: Stage 2 merged (#2) — harness retargeted to `@singula-ai/alego-*` 0.1.1-rc.2;
  `scripts/link-alego.mjs` resolves the unpublished scope from a local checkout; typecheck clean
  on the first run and 1956 tests unchanged.
- 2026-08-23: Stage 3 merged (#3) — rebranded to alego-tui v0.1.0: identifiers, `ALEGO_TUI_*`,
  `~/.alego-tui`, the vendored fork as `@alego-tui/ink`, ALEGO-TUI wordmark, LEGO-brick mascot,
  amber palette on Alego's #F5A524, and a real WCAG guard on the light brand hue.
- 2026-08-23: Stage 4 merged (#4) — bundle manifest, CLI resolver, launcher, installer, README;
  both PTY e2e suites green against real Alego. Found and fixed the one API drift the typecheck
  could not see (`commands.execute` gained a required `images` parameter) and added
  `src/harness/serviceContracts.ts` so that class fails at compile time from now on.
- 2026-08-23: **v0.1.0 — the port is complete.** The TUI runs as an Alego bundle plugin:
  conversation loop, tool trail with diff cards, approvals, questions, plan review, permission
  modes, sessions and resume, the command bridge, model picker, usage metering, and a
  checkout-based install. Verified from a fresh clone: `npm install` links the harness, `prepare`
  builds the bundle, 1957 tests pass, and both end-to-end suites drive a real Alego boot.

## What is left

- **When Alego publishes to npm**: delete `scripts/link-alego.mjs` and the
  `peerDependenciesMeta.optional` markers, and move the harness into ordinary dependencies. No
  source file changes.
- **Inherited upstream test skew**: 11 tests remain skipped from the dsh-ccTUI baseline, where
  the upstream expectations had drifted from the upstream sources before the snapshot. Reconcile
  each when a change touches that area.
- **Features with no Alego backend**: billing/credits, voice, pets, browser progress, worktree
  exit flow, rollback. The UI code remains and degrades silently — their RPCs resolve `{}` and
  their events never fire.
