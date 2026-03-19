export interface LaunchRequest {
  sessionId: string;
  projectPath: string;
}

let pendingLaunch: LaunchRequest | null = null;

export function setLaunchRequest(request: LaunchRequest): void {
  pendingLaunch = request;
}

export function getLaunchRequest(): LaunchRequest | null {
  return pendingLaunch;
}
