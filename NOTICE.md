# Notices and Attribution

This project contains material from the following MIT-licensed projects.

## dsh-ccTUI (agentforce314)

The direct upstream. alego-tui is a port of dsh-ccTUI from deepseek-harness to the Alego agent
harness: the React app, the vendored Ink fork, the `src/harness/` adapter, and the packaging
skeleton all originate there. The port retargets the harness, rebrands the product, and resolves
Alego from a local checkout; the architecture is dsh-ccTUI's.

Copyright (c) 2026 agentforce314. MIT License.

## clawcodex (Clawd Codex Team)

- `ui-tui/` — the TUI application source (React app, components, hooks, domain logic, tests)
  from which most of `src/` is ultimately ported, by way of dsh-ccTUI.
- `ui-tui/packages/clawcodex-ink/` — a fork of the Ink terminal renderer, vendored here as
  `packages/alego-tui-ink/`. Renaming the fork's package identity does not remove credit for it.

Copyright (c) 2026 Clawd Codex Team. MIT License.

## dsh-TUI (chimney / ccch1mneyyy)

Integration and packaging patterns for harness plugins (bundle patch discipline, adapter
boundary, exit funnel, provider registration) are adapted from dsh-TUI.

Copyright (c) 2026, chimney (ccch1mneyyy). MIT License.

## Ink (Vadim Demedes) and ink-text-input

The vendored renderer is ultimately derived from Ink. Copyright (c) Vadim Demedes
(vadimdemedes.com). MIT License.

## Alego (Singula AI)

This plugin is built for [Alego](https://github.com/singula-ai/alego) and consumes its
`@singula-ai/*` packages as peer dependencies, supplied by the host process. MIT License.

alego-tui is an independent, third-party plugin. It is not an official Alego release and carries
no endorsement from the Alego project. Per Alego's
[brand asset usage guidelines](https://github.com/singula-ai/alego/blob/main/BRAND_GUIDELINES.md),
the name is used to describe compatibility — a terminal UI **for Alego** — and the project ships
none of Alego's logo or badge artwork. The banner wordmark and brick mascot are this project's
own, drawn in Alego's amber (#F5A524) to sit alongside the ecosystem rather than to imitate it.

## deepseek-harness (DeepSeek AI)

Alego is a fork of deepseek-harness, and this project's upstream targeted deepseek-harness
directly. "DeepSeek" and "DeepSeek Harness" are marks of DeepSeek; this project claims no rights
in them and ships none of their artwork. MIT License.
