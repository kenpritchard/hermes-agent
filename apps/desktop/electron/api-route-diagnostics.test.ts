import assert from 'node:assert/strict'

import { test } from 'vitest'

import { formatModelOptionsRouteFailure } from './api-route-diagnostics'

test('records selected local and remote routes without backend URLs or secrets', () => {
  const request = { method: 'GET', path: '/api/model/options?explicit_only=1', profile: 'office-evals-windows' }

  const local = formatModelOptionsRouteFailure(request, {
    connectionId: 'local',
    mode: 'local',
    routeProfile: 'office-evals-windows'
  })

  const remote = formatModelOptionsRouteFailure(request, {
    connectionId: 'gateway-123',
    mode: 'remote',
    routeProfile: 'office-evals-windows'
  })

  assert.match(local ?? '', /"selectedConnectionId":"local"/)
  assert.match(remote ?? '', /"selectedMode":"remote"/)
  assert.match(remote ?? '', /"profile":"office-evals-windows"/)
  assert.doesNotMatch(remote ?? '', /https?:|token|password|header/i)
})

test('does not log unrelated endpoints or successful request metadata', () => {
  assert.equal(formatModelOptionsRouteFailure({ path: '/api/config', profile: 'foo' }, { mode: 'remote' }), null)

  assert.equal(
    formatModelOptionsRouteFailure({ method: 'POST', path: '/api/model/options?explicit_only=1', profile: 'foo' }, {}),
    null
  )

  assert.equal(formatModelOptionsRouteFailure({ path: '/api/model/options?explicit_only=1' }, {}), null)
})
