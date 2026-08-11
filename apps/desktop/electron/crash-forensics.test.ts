import { describe, expect, it, vi } from 'vitest'

import { describeCrashReason, installCrashForensics, wrapIpcHandler } from './crash-forensics'

const harness = () => {
  const listeners = new Map<string, (value: unknown) => void>()
  const flush = vi.fn()
  const log = vi.fn()

  installCrashForensics({
    flush,
    log,
    target: { on: (event, listener) => listeners.set(event, listener) }
  })

  return { flush, listeners, log }
}

describe('describeCrashReason', () => {
  it('prefers a stack, then a message, for thrown errors', () => {
    const withStack = new Error('boom')
    withStack.stack = 'Error: boom\n    at somewhere'

    expect(describeCrashReason(withStack)).toBe('Error: boom\n    at somewhere')

    const withoutStack = new Error('boom')
    withoutStack.stack = ''

    expect(describeCrashReason(withoutStack)).toBe('boom')
  })

  it('renders non-error rejections without throwing', () => {
    expect(describeCrashReason('plain string')).toBe('plain string')
    expect(describeCrashReason({ code: 'ECONNRESET' })).toBe('{"code":"ECONNRESET"}')
    expect(describeCrashReason(undefined)).toBe('undefined')

    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(describeCrashReason(circular)).toBe('[object Object]')
  })
})

describe('installCrashForensics', () => {
  it('records and synchronously flushes an uncaught exception', () => {
    const { flush, listeners, log } = harness()
    const error = new Error('renderer gone')
    error.stack = 'Error: renderer gone\n    at main'

    listeners.get('uncaughtException')?.(error)

    expect(log).toHaveBeenCalledWith('[main] Uncaught exception: Error: renderer gone\n    at main')
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('records and synchronously flushes an unhandled rejection', () => {
    const { flush, listeners, log } = harness()

    listeners.get('unhandledRejection')?.('gateway ticket mint failed')

    expect(log).toHaveBeenCalledWith('[main] Unhandled rejection: gateway ticket mint failed')
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('registers both handlers', () => {
    const { listeners } = harness()

    expect([...listeners.keys()].sort()).toEqual(['uncaughtException', 'unhandledRejection'])
  })
})

describe('wrapIpcHandler', () => {
  it('passes through the return value on success without logging', async () => {
    const log = vi.fn()
    const flush = vi.fn()
    const handler = vi.fn().mockResolvedValue({ ok: true })

    const wrapped = wrapIpcHandler('hermes:api', handler, { log, flush })
    const result = await wrapped('event', { path: '/sessions' })

    expect(result).toEqual({ ok: true })
    expect(log).not.toHaveBeenCalled()
    expect(flush).not.toHaveBeenCalled()
  })

  it('logs and flushes when the handler rejects, then re-throws', async () => {
    const log = vi.fn()
    const flush = vi.fn()
    const error = new Error('404: {"detail":"Session not found"}')
    error.stack = 'Error: 404: {"detail":"Session not found"}\n    at IncomingMessage.<anonymous>'
    const handler = vi.fn().mockRejectedValue(error)

    const wrapped = wrapIpcHandler('hermes:api', handler, { log, flush })

    await expect(wrapped('event', { path: '/sessions/123' })).rejects.toThrow('404')

    expect(log).toHaveBeenCalledWith(
      '[ipc] hermes:api: Error: 404: {"detail":"Session not found"}\n    at IncomingMessage.<anonymous>'
    )
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('forwards handler arguments unchanged', async () => {
    const log = vi.fn()
    const flush = vi.fn()
    const handler = vi.fn().mockResolvedValue(null)

    const wrapped = wrapIpcHandler('hermes:api', handler, { log, flush })
    await wrapped('event-obj', 'arg1', 'arg2', { key: 'value' })

    expect(handler).toHaveBeenCalledWith('event-obj', 'arg1', 'arg2', { key: 'value' })
  })

  it('handles non-Error rejections (strings, objects)', async () => {
    const log = vi.fn()
    const flush = vi.fn()
    const handler = vi.fn().mockRejectedValue('plain string failure')

    const wrapped = wrapIpcHandler('hermes:custom', handler, { log, flush })

    await expect(wrapped('event')).rejects.toBe('plain string failure')

    expect(log).toHaveBeenCalledWith('[ipc] hermes:custom: plain string failure')
    expect(flush).toHaveBeenCalledTimes(1)
  })
})
