/** Temporary, error-only routing evidence for cross-gateway profile 404s. */
export function formatModelOptionsRouteFailure(
  request: { method?: string; path?: string; profile?: string; connectionId?: string },
  route: { mode?: string; connectionId?: string; routeProfile?: string; requestProfile?: string }
): string | null {
  const path = request.path ?? ''

  const endpoint = path.startsWith('/api/model/options?')
    ? 'model-options'
    : path.startsWith('/api/profiles/sessions?')
      ? 'profile-sessions'
      : path.startsWith('/api/cron/jobs?')
        ? 'cron-jobs'
        : null

  if (String(request.method ?? 'GET').toUpperCase() !== 'GET' || !endpoint || !request.profile) {
    return null
  }

  // Do not log backend URLs, request headers, auth material, or response bodies.
  return `[hermes:api route] ${JSON.stringify({
    endpoint,
    profile: request.profile,
    requestedConnectionId: request.connectionId ?? null,
    selectedConnectionId: route.connectionId ?? null,
    selectedMode: route.mode ?? null,
    routeProfile: route.routeProfile ?? null,
    requestProfile: route.requestProfile ?? null
  })}`
}
