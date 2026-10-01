import type { AgentProfileRoute } from '@/store/profile'

interface SessionCreateRouteEvidence {
  activeConnectionId: null | string
  activeProfile: string
  capturedProfile: string
  capturedRoute: AgentProfileRoute | null
  newChatConnectionId: null | string
  newChatProfile: null | string
  paramsProfile: string
}

/** Log only route metadata after a failed create; never the request or error body. */
export function formatSessionCreateRouteFailure(evidence: SessionCreateRouteEvidence): string {
  const { capturedRoute, ...profiles } = evidence

  return `[session.create route] ${JSON.stringify({
    ...profiles,
    capturedRoute: capturedRoute ? { connectionId: capturedRoute.connectionId, profile: capturedRoute.profile } : null
  })}`
}
