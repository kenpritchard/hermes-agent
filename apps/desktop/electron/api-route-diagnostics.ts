/** Temporary, error-only routing evidence for a cross-gateway model-options 404. */
export function formatModelOptionsRouteFailure(
  request: { method?: string; path?: string; profile?: string; connectionId?: string },
  route: { mode?: string; connectionId?: string; routeProfile?: string; requestProfile?: string }
): string | null {
  if (
    String(request.method ?? 'GET').toUpperCase() !== 'GET' ||
    !request.path?.startsWith('/api/model/options?') ||
    !request.profile
  ) {
    return null
  }

  // Do not log backend URLs, request headers, auth material, or response bodies.
  return `[hermes:api route] ${JSON.stringify({
    profile: request.profile,
    requestedConnectionId: request.connectionId ?? null,
    selectedConnectionId: route.connectionId ?? null,
    selectedMode: route.mode ?? null,
    routeProfile: route.routeProfile ?? null,
    requestProfile: route.requestProfile ?? null
  })}`
}
