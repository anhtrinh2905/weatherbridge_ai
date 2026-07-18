const DEMO_SESSION_KEY = "weather-bridge.demo-session";

export interface DemoSessionTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export function readDemoSession(): DemoSessionTokens | null {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoSessionTokens>;
    if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.idToken !== "string") return null;
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, idToken: parsed.idToken };
  } catch {
    return null;
  }
}

export function saveDemoSession(tokens: DemoSessionTokens): void {
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(tokens));
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}
