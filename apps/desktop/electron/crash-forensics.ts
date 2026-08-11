/**
 * Last-chance forensics for the Electron main process.
 *
 * Electron installs its own `uncaughtException` listener and only warns on
 * unhandled rejections, so the app usually survives — but the reason lands on
 * stderr alone, which is discarded entirely when the app is launched from
 * Finder or the Start menu. Without a record in desktop.log, a main-process
 * fault is invisible in a `hermes debug share` bundle and the user is left
 * describing symptoms instead of showing a stack.
 */

export interface CrashForensicsTarget {
  on: (event: 'uncaughtException' | 'unhandledRejection', listener: (value: unknown) => void) => unknown
}

export interface CrashForensicsOptions {
  flush: () => void
  log: (message: string) => void
  target?: CrashForensicsTarget
}

/** Render a thrown value for the log, preferring a stack over a bare message. */
export function describeCrashReason(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.stack || reason.message || reason.name || 'Error'
  }

  if (typeof reason === 'string') {
    return reason
  }

  try {
    return JSON.stringify(reason) ?? String(reason)
  } catch {
    return String(reason)
  }
}

/**
 * Wrap an `ipcMain.handle` handler so rejections are captured to desktop.log
 * before Electron swallows them. Electron catches IPC handler rejections
 * internally and logs to the DevTools console, but never emits
 * `uncaughtException` or `unhandledRejection` — so `installCrashForensics`
 * can't see them. This wrapper is the bridge.
 *
 * The rejection is re-thrown after logging so Electron's existing DevTools
 * behavior is preserved (we're adding a log line, not replacing the console
 * output).
 */
export function wrapIpcHandler(
  channel: string,
  handler: (event: unknown, ...args: unknown[]) => unknown | Promise<unknown>,
  { log, flush }: { log: (message: string) => void; flush: () => void }
): (event: unknown, ...args: unknown[]) => Promise<unknown> {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args)
    } catch (reason) {
      log(`[ipc] ${channel}: ${describeCrashReason(reason)}`)
      flush()
      throw reason
    }
  }
}

/**
 * Record main-process faults to desktop.log and flush synchronously, since a
 * fault that does prove fatal leaves no chance for the batched async flush.
 */
export function installCrashForensics({ flush, log, target = process }: CrashForensicsOptions): void {
  const record = (label: string) => (reason: unknown) => {
    log(`[main] ${label}: ${describeCrashReason(reason)}`)
    flush()
  }

  target.on('uncaughtException', record('Uncaught exception'))
  target.on('unhandledRejection', record('Unhandled rejection'))
}
