import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearSessions as clearApiSessions,
  fetchSession,
  fetchSessions,
  type SessionRecord,
} from "../api/client";

const POLL_INTERVAL = 2000;

export interface SessionItem {
  id: number;
  status: number;
  method: string;
  protocol: "HTTP" | "HTTPS";
  host: string;
  path: string;
  type: string;
  size: string;
}

function formatSession(record: SessionRecord): SessionItem {
  const type = record.contentType
    ? (record.contentType.split("/").pop()?.split(";")[0] ?? "--")
    : "--";

  const size =
    record.responseSize != null
      ? record.responseSize < 1024
        ? `${record.responseSize} B`
        : record.responseSize < 1024 * 1024
          ? `${(record.responseSize / 1024).toFixed(1)} KB`
          : `${(record.responseSize / (1024 * 1024)).toFixed(1)} MB`
      : "--";

  const protocol: "HTTP" | "HTTPS" = record.url.startsWith("https://")
    ? "HTTPS"
    : "HTTP";

  return {
    id: record.id,
    status: record.statusCode ?? 0,
    method: record.method,
    protocol,
    host: record.host,
    path: record.path,
    type,
    size,
  };
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(
    null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetchSessions(100);
      setSessions((res.sessions || []).map(formatSession));
    } catch {
      // API not available yet
    }
  }, []);

  const loadSessionDetail = useCallback(async (id: number) => {
    try {
      const session = await fetchSession(id);
      setSelectedSession(session);
    } catch {
      setSelectedSession(null);
    }
  }, []);

  const selectSession = useCallback(
    (session: SessionItem) => {
      setSelectedId(session.id);
      loadSessionDetail(session.id);
    },
    [loadSessionDetail],
  );

  const clearAll = useCallback(async () => {
    await clearApiSessions();
    setSessions([]);
    setSelectedId(undefined);
    setSelectedSession(null);
  }, []);

  // Polling
  useEffect(() => {
    loadSessions();
    intervalRef.current = setInterval(loadSessions, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadSessions]);

  return {
    sessions,
    selectedId,
    selectedSession,
    selectSession,
    clearSessions: clearAll,
  };
}
