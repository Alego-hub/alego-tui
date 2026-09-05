// Test-only cordis plugin: a scripted LLM adapter on provider route "mock".
// Lets e2e runs exercise the full agent loop (stream → assemble → turn end)
// with no network and no credentials.
//
// Script behavior: replies with a fixed preamble + the last user text. When
// the user text contains "USE-TOOL", the first step requests a todo_write
// tool call before a closing text step (used by later stages).
import { LlmAdapter } from '@singula-ai/alego-llm'

export const name = 'mock-llm'
export const inject = ['llm', 'commands', 'userQuestions']

const lastUserIndex = messages => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]

    if (m.role !== 'user' || (m.source && m.source.kind !== 'user')) { continue }

    const text = (m.content ?? [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    if (text) { return i }
  }

  return -1
}

const lastUserText = messages => {
  const i = lastUserIndex(messages)

  if (i < 0) { return '(no user text)' }

  return (messages[i].content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
}

const pieces = (text, size = 8) => {
  const out = []

  for (let i = 0; i < text.length; i += size) { out.push(text.slice(i, i + size)) }

  return out
}

class MockAdapter extends LlmAdapter {
  async listModels(provider) {
    return ['mock-1', 'mock-2'].map(id => ({ provider, id, name: id }))
  }

  async resolveModel(provider, model) {
    return { provider, id: model, name: model, context: { contextWindow: 64000 } }
  }

  async *stream(options) {
    const user = lastUserText(options.messages ?? [])
    // Only tool results from the CURRENT turn count — history keeps old ones.
    const msgs = options.messages ?? []
    const hasToolResult = msgs
      .slice(lastUserIndex(msgs) + 1)
      .some(m => Array.isArray(m.content) && m.content.some(b => b.type === 'tool-result'))

    if (!hasToolResult && (user.includes('USE-QUESTION') || user.includes('USE-CHILD'))) {
      const question = user.includes('USE-QUESTION')
      const name = question ? 'ask_user_question' : 'subagent'
      const args = JSON.stringify(question
        ? { questions: [{ id: 'color', question: 'Choose an e2e color', options: [{ label: 'Amber' }, { label: 'Blue' }] }] }
        : { description: 'Check child telemetry', prompt: 'hello child', run_in_background: false })
      yield { blockType: 'tool-call', index: 0, type: 'block-start' }
      yield { argumentsDelta: args, id: 'mock-interaction', name, type: 'tool-call-delta', index: 0 }
      yield { block: { arguments: args, id: 'mock-interaction', name, type: 'tool-call' }, index: 0, type: 'block-end' }
      yield { reason: { kind: 'tool-calls' }, type: 'finish' }
      return
    }

    if (user.includes('USE-WRITE') && !hasToolResult) {
      const args = JSON.stringify({ content: 'alpha line\n' + 'beta line\n', file_path: 'e2e-scratch/e2e-write-probe.txt' })

      yield { blockType: 'tool-call', index: 0, type: 'block-start' }
      yield { argumentsDelta: args, id: 'mock-write-1', name: 'write', type: 'tool-call-delta', index: 0 }
      yield { block: { arguments: args, id: 'mock-write-1', name: 'write', type: 'tool-call' }, index: 0, type: 'block-end' }
      yield { type: 'usage', usage: { inputTokens: 9, outputTokens: 5 } }
      yield { reason: { kind: 'tool-calls' }, type: 'finish' }

      return
    }

    if (user.includes('USE-BASH') && !hasToolResult) {
      const args = JSON.stringify({ command: 'echo e2e-bash-ok', description: 'e2e echo probe', justification: 'e2e approval flow test', sandbox_permissions: 'danger-full-access' })

      yield { blockType: 'tool-call', index: 0, type: 'block-start' }
      yield { argumentsDelta: args, id: 'mock-bash-1', name: 'bash', type: 'tool-call-delta', index: 0 }
      yield { block: { arguments: args, id: 'mock-bash-1', name: 'bash', type: 'tool-call' }, index: 0, type: 'block-end' }
      yield { type: 'usage', usage: { inputTokens: 12, outputTokens: 6 } }
      yield { reason: { kind: 'tool-calls' }, type: 'finish' }

      return
    }

    if (hasToolResult) {
      const results = msgs.slice(lastUserIndex(msgs) + 1).flatMap(m => m.content ?? []).filter(b => b.type === 'tool-result')
      const resultText = results.flatMap(b => b.content ?? []).filter(b => b.type === 'text').map(b => b.text).join(' ')
      const text = user.includes('USE-QUESTION') ? `QUESTION-RESULT: ${resultText}`
        : user.includes('USE-CHILD') ? `CHILD-RESULT: ${resultText}` : 'TOOL-STEP-DONE'


      yield { blockType: 'text', index: 0, type: 'block-start' }
      yield { index: 0, text, type: 'text-delta' }
      yield { block: { text, type: 'text' }, index: 0, type: 'block-end' }
      yield { type: 'usage', usage: { inputTokens: 8, outputTokens: 4 } }
      yield { reason: { kind: 'stop' }, type: 'finish' }

      return
    }

    if (user.includes('USE-TOOL')) {
      const args = JSON.stringify({ todos: [{ content: 'mock todo item', status: 'pending' }] })

      yield { blockType: 'tool-call', index: 0, type: 'block-start' }
      yield { argumentsDelta: args, id: 'mock-call-1', name: 'todo_write', type: 'tool-call-delta', index: 0 }
      yield { block: { arguments: args, id: 'mock-call-1', name: 'todo_write', type: 'tool-call' }, index: 0, type: 'block-end' }
      yield { type: 'usage', usage: { inputTokens: 12, outputTokens: 6 } }
      yield { reason: { kind: 'tool-calls' }, type: 'finish' }

      return
    }

    if (user.includes('USE-SLOW')) {
      yield { blockType: 'text', index: 0, type: 'block-start' }
      yield { index: 0, text: 'STREAM-IN-PROGRESS', type: 'text-delta' }
      await new Promise((resolve, reject) => {
        const cancel = () => { clearTimeout(timer); reject(options.signal.reason) }
        const timer = setTimeout(() => { options.signal.removeEventListener('abort', cancel); resolve() }, 10000)
        options.signal.addEventListener('abort', cancel, { once: true })
      })
      yield { index: 0, text: ' STREAM-FINISHED', type: 'text-delta' }
      yield { block: { text: 'STREAM-IN-PROGRESS STREAM-FINISHED', type: 'text' }, index: 0, type: 'block-end' }
      yield { reason: { kind: 'stop' }, type: 'finish' }
      return
    }

    const text = user === 'after interruption' ? 'RECOVERY-OK' : user.includes('USE-MODEL') ? `MODEL-REPLY: ${options.model}` : `MOCK-REPLY: ${user}`

    yield { blockType: 'text', index: 0, type: 'block-start' }

    for (const piece of pieces(text, user === 'after interruption' ? text.length : 8)) {
      yield { index: 0, text: piece, type: 'text-delta' }
      await new Promise(r => setTimeout(r, 5))
    }

    yield { block: { text, type: 'text' }, index: 0, type: 'block-end' }
    yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 20 } }
    yield { reason: { kind: 'stop' }, type: 'finish' }
  }
}

export function apply(ctx) {
  ctx.llm.registerAdapter(['mock'], new MockAdapter())

  ctx.commands.register({
    name: 'e2eplan',
    description: 'e2e plan review',
    handler: async ({ agent, signal }) => {
      const answer = await ctx.userQuestions.ask({ agent, signal, questions: [{
        id: 'plan', question: 'Review e2e plan', detail: 'E2E PLAN CONTENT',
        intent: { kind: 'plan-review', approve: 'Approve plan' },
        options: [{ label: 'Approve plan' }, { label: 'Keep planning' }]
      }] })
      return { kind: 'success', text: `PLAN-RESULT: ${answer.answers[0].selected.join(', ')}` }
    }
  })

  // A harness-registered slash command for the command-bridge e2e.
  ctx.commands.register({
    description: 'e2e bridge probe',
    handler: () => ({ kind: 'success', text: 'EPROBE-BRIDGE-OK' }),
    name: 'e2eprobe'
  })
}
