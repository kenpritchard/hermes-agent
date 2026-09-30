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

test('records background session and cron failures without logging query data', () => {
  for (const [path, endpoint] of [
    ['/api/profiles/sessions?limit=100&profile=office-evals-windows', 'profile-sessions'],
    ['/api/cron/jobs?profile=office-evals-windows', 'cron-jobs']
  ]) {
    const evidence = formatModelOptionsRouteFailure(
      { method: 'GET', path, profile: 'office-evals-windows', connectionId: 'remote-1' },
      { connectionId: 'remote-1', mode: 'remote', routeProfile: 'office-evals-windows' }
    )

    assert.match(evidence ?? '', new RegExp(`"endpoint":"${endpoint}"`))
    assert.match(evidence ?? '', /"selectedConnectionId":"remote-1"/)
    assert.doesNotMatch(evidence ?? '', /limit=100|\/api\/|https?:|token|password|header/i)
  }
})

test('does not log unrelated endpoints or non-GET requests', () => {
  assert.equal(formatModelOptionsRouteFailure({ path: '/api/config', profile: 'foo' }, { mode: 'remote' }), null)

  assert.equal(
    formatModelOptionsRouteFailure({ method: 'POST', path: '/api/model/options?explicit_only=1', profile: 'foo' }, {}),
    null
  )

  assert.equal(formatModelOptionsRouteFailure({ path: '/api/model/options?explicit_only=1' }, {}), null)
  assert.equal(formatModelOptionsRouteFailure({ path: '/api/cron/jobs/job-1/runs', profile: 'foo' }, {}), null)
})
