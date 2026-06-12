const API_BASE = "/__api";

export interface SessionRecord {
  id: number;
  startedAt: string;
  method: string;
  url: string;
  host: string;
  path: string;
  statusCode: number | null;
  statusText: string | null;
  contentType: string | null;
  responseSize: number | null;
  requestHeaders: string | null;
  requestBody: string | null;
  responseHeaders: string | null;
  responseBody: string | null;
  matchedRules: string | null;
  durationMs: number | null;
  error: string | null;
}

export interface LogRecord {
  id: number;
  timestamp: string;
  level: "info" | "warn" | "error";
  category: string | null;
  message: string;
  sessionId: number | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSessions(
  limit = 50,
  offset = 0,
): Promise<{ sessions: SessionRecord[]; total: number }> {
  return fetchJson(`${API_BASE}/sessions?limit=${limit}&offset=${offset}`);
}

export async function fetchSession(
  id: number,
): Promise<SessionRecord> {
  return fetchJson(`${API_BASE}/sessions/${id}`);
}

export async function clearSessions(): Promise<void> {
  await fetch(`${API_BASE}/sessions`, { method: "DELETE" });
}

export async function fetchLogs(
  limit = 100,
  offset = 0,
  level?: string,
): Promise<{ logs: LogRecord[]; total: number }> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (level) params.set("level", level);
  return fetchJson(`${API_BASE}/logs?${params}`);
}

export async function clearLogs(): Promise<void> {
  await fetch(`${API_BASE}/logs`, { method: "DELETE" });
}
