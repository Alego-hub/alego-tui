# alego-tui

**Claude Code style TUI for [Alego](https://github.com/singula-ai/alego)** — 🧱 a terminal UI
that runs as an Alego bundle plugin.

The full Claude-Code-style look, feel, and interactions — streaming markdown transcript, tool
trail with diff cards, approval and question prompts, plan review, session switcher and resume,
slash commands, model picker, context bar — running **in-process** against Alego services
(`ctx.agents`, `session/event`, the approval waterfall, `ctx.userQuestions`, `ctx.commands`).

```
  █████╗ ██╗     ███████╗ ██████╗  ██████╗         ████████╗██╗   ██╗██╗
 ██╔══██╗██║     ██╔════╝██╔════╝ ██╔═══██╗        ╚══██╔══╝██║   ██║██║
 ███████║██║     █████╗  ██║  ███╗██║   ██║ █████╗    ██║   ██║   ██║██║
 ██╔══██║██║     ██╔══╝  ██║   ██║██║   ██║ ╚════╝    ██║   ██║   ██║██║
 ██║  ██║███████╗███████╗╚██████╔╝╚██████╔╝           ██║   ╚██████╔╝██║
 ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝            ╚═╝    ╚═════╝ ╚═╝
 🧱 Claude Code style TUI for Alego

 ╭─── alego-tui v0.1.0 ─────────────────────────────────────────────────────────────────────────╮
 │                                                                                              │
 │           Welcome back, you                 │ ▾ Available Tools                              │
 │                                             │ alego: bash, create_goal, edit, …+22           │
 │            ▄██▄  ▄██▄  ▄██▄                 │                                                │
 │          ╔══════════════════╗               │ ▸ Available Skills (0)                         │
 │          ║ ░░░░░░░░░░░░░░░░ ║               │                                                │
 │          ║ ░░░░░░░░░░░░░░░░ ║               │ ────────────────────────────────────────────── │
 │          ╚══════════════════╝               │ 25 tools · 0 skills · /help for commands       │
 │             ▀▀▀▀▀▀▀▀▀▀▀▀▀▀                  │                                                │
 │                                             │                                                │
 │                ────────────                 │                                                │
 │           Model deepseek-v4-flash           │                                                │
 │   Path ~/workspace/alego-tui                │                                                │
 │    Perms Ask for approval · /permissions    │                                                │
 │ Session tui-56b37bee-41fd-4feb-b270-5988…   │                                                │
 │                                                                                              │
 ╰──────────────────────────────────────────────────────────────────────────────────────────────╯
```

## Install

Requires Node ≥ 22.19, npm, pnpm, and a **local Alego checkout** — `@singula-ai/*` is not
published to npm yet, so alego-tui builds and runs against a checkout rather than a registry
install.

```sh
git clone https://github.com/singula-ai/alego.git
cd alego && pnpm install && pnpm build:lib && cd ..

git clone https://github.com/Alego-hub/alego-tui.git
cd alego-tui
./install.sh              # builds, then: alego plugin --profile alego-tui add "$PWD"
./bin/alego-tui.js        # launch
```

`install.sh` finds Alego beside this repo (`../alego`); point it elsewhere with
`ALEGO_REPO=/path/to/alego ./install.sh`. The link step runs from `postinstall`, so a plain
`npm install` keeps the harness packages resolvable too.

Model and provider configuration comes from your Alego profile (`agent-default-model` settings,
or an `- id: tui` config override in the profile's `cordis.patch.yml`: `provider`, `model`,
`cwd`, `sessionId`).

### API key

The TUI stores no key; Alego resolves one per request. Write it to the managed store at
`$ALEGO_HOME/.credentials.yaml` (default `~/.alego/.credentials.yaml`) — a YAML mapping of
credential reference to value and nothing else:

```yaml
DEEPSEEK_API_KEY: sk-…
```

`chmod 600` that file and `chmod 700 ~/.alego`: `alego-credentials-local` refuses to read a
document carrying any group or other permission bit, and fails at boot naming the repair. The
document is watched, so a key stored while the TUI is running takes effect on the next request —
first run is "browse models, store the key, prompt again", no restart in between. Until one
resolves, the route stays registered and `/model` stays browsable; it is the request that fails,
with `MISSING_CREDENTIAL` naming every entry point it looked at.

The launching environment beats the store and is deliberately read-only from inside; the store in
turn beats `<cwd>/.env` and `~/.alego/.env`. Keep the key itself out of `cordis.patch.yml` —
adapter config carries only `apiKeyEnv`, the reference to resolve.

Mode `0600` stops other OS users, not the model: Alego never hands it the document's path and
never loads the value into the environment, but bash and the filesystem tools run as you, and the
shipped policy confines writes rather than reads.

## Highlights

- **Conversation loop**: streamed deltas render live; reasoning shows a line or two with the
  whole chain of thought behind Ctrl+O; busy verbs and spinners; Esc interrupts (Ctrl+C never
  kills the app).
- **Tools**: Claude-style `⏺ Tool(args)` / `⎿ result` trail — every call keeps its own row with
  the path it opened or the command it ran, over a few lines of what came back and
  `… +N lines (ctrl+o to expand)`; a failed call carries the tool's own message and a running one
  its own clock; write/edit diffs render as structured diff cards; sandbox-escalation approvals
  pop the approval box (`1` approve / `2`+Enter deny); todo lists pin under the busy line.
- **Subagents**: a delegation reads `⏺ Subagent(Review the diff)` / `⎿ Done (2 tool uses · 1.2k
  tokens · 11s)`, and its children stream into `/agents` — goal, live tool calls, tokens, spawn
  tree.
- **Sessions**: `/sessions` (Ctrl+X) lists live and persisted sessions; `/resume <id>` replays a
  persisted transcript, tool results and all; `/new`, `/title`, `/rename`.
- **Commands**: every Alego `ctx.commands` entry (e.g. `/plan`, `/goal`) appears in the completion
  menu and dispatches through the harness; `/model` opens the picker backed by the llm catalog;
  `/effort`, `/context`, `/usage`, `/help`, `/status`.
- **Modes**: Shift+Tab cycles default → plan → bypassPermissions (mapped onto Alego's plan-mode
  controller and approval policy).
- **Brand**: `/logo` recolors the banner — `amber` (default), `sunset`, `forest`, `ocean`,
  `monochrome`.

## Configuration

Environment knobs use the `ALEGO_TUI_` prefix — e.g. `ALEGO_TUI_INLINE=0` (alternate screen
instead of inline scrollback), `ALEGO_TUI_THEME=light|dark`, `ALEGO_TUI_HOME` (data dir, default
`~/.alego-tui`), `ALEGO_TUI_FPS=1`. `CLAUDE_CODE_SCROLL_SPEED` is still honored as a migration
fallback for people coming from Claude Code.

## Development

```sh
npm install                      # postinstall links @singula-ai/* from the Alego checkout
npm run typecheck && npm test    # 151 files / 1957 tests
npm run e2e                      # PTY e2e against a real Alego boot + scripted LLM
npm run e2e:install              # the real `alego plugin add` install path
npm run verify:boundary          # only src/harness may import @singula-ai/*
```

Tool rows are the fiddliest surface to eyeball, so they have their own harness:
`python3 scripts/tool-gallery.py [tool…] [--expand]` drives a real Alego boot through one tool per
scenario (via the scripted `test/e2e/probe-llm.mjs`) and prints the trail it rendered — the thing
to diff against the same call made to Claude Code.

### The adapter boundary

`src/harness/` is the only directory that may import `@singula-ai/*`, enforced by
`npm run verify:boundary`. Everything above it is backend-agnostic, which is what made this port
possible at all.

Optional Alego services are reached through `ctx.get(name)` with optional chaining, so a profile
without one degrades that feature instead of failing to boot. Because those casts are hand-written
structural types, `tsc` cannot check them against the real service — so
`src/harness/serviceContracts.ts` asserts each assumed signature against Alego's own types at
compile time. Add a call there when you reach for a new service member.

### Versioning

Each shipped change increments the **patch** digit by one; it runs to 99 before rolling over into
the minor digit:

```
0.1.0 → 0.1.1 → … → 0.1.13 → … → 0.1.99 → 0.2.0 → 0.2.1 → …
```

Write patch numbers without leading zeros (`0.1.1`, not `0.1.01` — the latter is not valid semver
and npm rejects it). Bump `package.json` in the change's own commit, then tag `v<version>` on
`main` after it merges.

Architecture and porting details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/PLAN.md](docs/PLAN.md), [docs/PORTING-NOTES.md](docs/PORTING-NOTES.md).

## Provenance & license

MIT. alego-tui is a port of the MIT-licensed [dsh-ccTUI](https://github.com/agentforce314/dsh-ccTUI),
which ports the MIT-licensed clawcodex `ui-tui` (including its forked Ink renderer), with
integration patterns from the MIT-licensed dsh-TUI project — see [NOTICE.md](NOTICE.md).

alego-tui is an independent, third-party plugin and not an official Alego release.
