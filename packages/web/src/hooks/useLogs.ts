import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearLogs as clearApiLogs,
  fetchLogs,
  type LogRecord,
} from "../api/client";

const POLL_INTERVAL = 2000;

export interface LogEntry {
  id: number;
  time: string;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
  sessionId: number | null;
}

function formatLog(record: LogRecord): LogEntry {
  return {
    id: record.id,
    time: new Date(record.timestamp).toLocaleTimeString("en-US", {
      hour12: false,
    }),
    level: record.level,
    category: record.category ?? "—",
    message: record.message,
    sessionId: record.sessionId,
  };
}

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetchLogs(200);
      setLogs((res.logs || []).map(formatLog));
    } catch {
      // API not available yet
    }
  }, []);

  const clearAll = useCallback(async () => {
    await clearApiLogs();
    setLogs([]);
  }, []);

  // Polling
  useEffect(() => {
    loadLogs();
    intervalRef.current = setInterval(loadLogs, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadLogs]);

  return { logs, clearLogs: clearAll };
}
