import { describe, expect, it } from 'vitest'

import { formatSessionCreateRouteFailure } from './session-create-route-diagnostics'

describe('formatSessionCreateRouteFailure', () => {
  it('records the requested profile, captured route and ambient connection without request content', () => {
    const line = formatSessionCreateRouteFailure({
      activeConnectionId: 'localhost-9119',
      activeProfile: 'default',
      capturedProfile: 'office-evals-windows',
      capturedRoute: { connectionId: 'localhost-9119', profile: 'office-evals-windows' },
      newChatConnectionId: 'localhost-9119',
      newChatProfile: 'office-evals-windows',
      paramsProfile: 'office-evals-windows'
    })

    expect(line).toContain('[session.create route] ')
    expect(JSON.parse(line.slice(line.indexOf('{')))).toEqual({
      activeConnectionId: 'localhost-9119',
      activeProfile: 'default',
      capturedProfile: 'office-evals-windows',
      capturedRoute: { connectionId: 'localhost-9119', profile: 'office-evals-windows' },
      newChatConnectionId: 'localhost-9119',
      newChatProfile: 'office-evals-windows',
      paramsProfile: 'office-evals-windows'
    })
    expect(line).not.toMatch(/prompt|token|password|https?:/i)
  })

  it('distinguishes a legacy ambient send from an explicitly routed send', () => {
    const line = formatSessionCreateRouteFailure({
      activeConnectionId: null,
      activeProfile: 'default',
      capturedProfile: 'default',
      capturedRoute: null,
      newChatConnectionId: null,
      newChatProfile: null,
      paramsProfile: 'default'
    })

    expect(JSON.parse(line.slice(line.indexOf('{'))).capturedRoute).toBeNull()
  })
})
