/**
 * Compile-time conformance checks for the soft-probed harness services.
 *
 * Why this file exists: `client.ts` reaches optional services through
 * `ctx.get('name') as { method?: (...) => ... }` so that a profile missing one
 * degrades that feature instead of failing the boot. The cost of that pattern
 * is that TypeScript checks each call against *our own hand-written shape*, not
 * against the real service — so a signature change in Alego compiles clean and
 * fails at runtime.
 *
 * That is not hypothetical. Alego 0.1.1-rc.2 inserted a required `images`
 * parameter into `commands.execute(agent, line, images, signal)`; the port kept
 * calling the 0.1.0-rc.7 three-argument form, `tsc` reported nothing, and the
 * slash-command bridge silently broke until an end-to-end run caught it.
 *
 * Each assertion below states the shape `client.ts` depends on and fails to
 * compile if the real service no longer satisfies it. Type-only: it erases at
 * build, adds no runtime cost and no bundle external.
 *
 * Scope is deliberate — only the members `client.ts` actually calls. Extra
 * OPTIONAL trailing parameters on the real signature are fine (a shorter call
 * still type-checks), so those are written as the subset we pass.
 */
import type { Context } from '@singula-ai/cordis'
import type { Agent } from '@singula-ai/alego-agent'
import type { Session, SessionHeader } from '@singula-ai/alego-session'

// Side-effect type imports: each of these packages augments cordis `Context`
// with its service key, and without them `Context['tokenMeter']` and friends do
// not exist to check against. Same convention client.ts uses for planMode and
// the subagent runtime. Type-only — they erase at build.
import type {} from '@singula-ai/alego-agent-default-model'
import type {} from '@singula-ai/alego-commands'
import type {} from '@singula-ai/alego-plan-mode'
import type {} from '@singula-ai/alego-session-persistence'
import type {} from '@singula-ai/alego-session-projection-cache'
import type {} from '@singula-ai/alego-session-title'
import type {} from '@singula-ai/alego-token-meter'
import type {} from '@singula-ai/alego-tools'
import type {} from '@singula-ai/alego-user-approval'

/**
 * Fails to compile unless `Real` still satisfies `Needed`.
 *
 * The check must live in the CONSTRAINT, not the body. `Real extends Needed ?
 * true : never` looks equivalent but silently evaluates to `never`, and a type
 * alias of `never` is perfectly legal — so that formulation reports nothing.
 */
type Satisfies<Real extends Needed, Needed> = Real

/** `ctx.get(name)` widened to the service type cordis declares for it. */
type Service<K extends keyof Context> = NonNullable<Context[K]>

/* eslint-disable @typescript-eslint/no-unused-vars */

type _Commands = Satisfies<
  Service<'commands'>,
  {
    list: (agent: Agent) => readonly { description: string; name: string }[]
    // The parameter that drifted. Keep `images` positional and third.
    execute: (agent: Agent, line: string, images: never[], signal: AbortSignal) => Promise<unknown>
  }
>

type _TokenMeter = Satisfies<Service<'tokenMeter'>, { measure: (session: Session) => { totalTokens: number } }>

type _Llm = Satisfies<
  Service<'llm'>,
  {
    listProviders: () => { id: string; name: string }[]
    listModels: (provider: string) => Promise<readonly { id: string }[]>
    resolveModelInfo: (provider: string, model: string) => Promise<unknown>
  }
>

type _AgentDefaultModel = Satisfies<
  Service<'agentDefaultModel'>,
  {
    currentSelection: () => { model: string; provider: string }
    saveSelection: (next: { model: string; provider: string }) => Promise<void>
  }
>

type _PlanMode = Satisfies<Service<'planMode'>, { set: (agent: Agent, active: boolean) => unknown }>

type _Approval = Satisfies<Service<'approval'>, { setPolicy: (agent: Agent, policy: 'ask' | 'never') => void }>

type _SessionPersistence = Satisfies<
  Service<'sessionPersistence'>,
  { list: (signal?: AbortSignal) => Promise<SessionHeader[]> }
>

type _SessionProjectionCache = Satisfies<
  Service<'sessionProjectionCache'>,
  { cachedSnapshot: (meta: SessionHeader) => unknown }
>

type _SessionTitle = Satisfies<Service<'sessionTitle'>, { get: (session: Session) => { title: string } | undefined }>

type _Tools = Satisfies<
  Service<'tools'>,
  { get: (name: string, scope?: never) => unknown; schemas: (scope?: never) => { name: string }[] }
>
