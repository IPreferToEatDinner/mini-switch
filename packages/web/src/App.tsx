import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchLogs,
  fetchSessions,
  clearLogs as clearApiLogs,
  clearSessions as clearApiSessions,
  type LogRecord,
  type SessionRecord,
} from "./api/client";
import { InspectorPanel } from "./components/dashboard/InspectorPanel";
import { NavBar } from "./components/dashboard/NavBar";
import { SessionsTable } from "./components/dashboard/SessionsTable";
import { TerminalLog } from "./components/dashboard/TerminalLog";

const POLL_INTERVAL = 2000;

function formatLog(record: LogRecord) {
  return {
    id: record.id,
    time: new Date(record.timestamp).toLocaleTimeString("en-US", {
      hour12: false,
    }),
    level: record.level,
    text: record.message,
  };
}

function formatSession(record: SessionRecord) {
  const type = record.contentType
    ? record.contentType.split("/").pop()?.split(";")[0] ?? "--"
    : "--";

  const size = record.responseSize != null
    ? record.responseSize < 1024
      ? `${record.responseSize} B`
      : record.responseSize < 1024 * 1024
        ? `${(record.responseSize / 1024).toFixed(1)} KB`
        : `${(record.responseSize / (1024 * 1024)).toFixed(1)} MB`
    : "--";

  return {
    id: record.id,
    status: record.statusCode ?? 0,
    method: record.method,
    host: record.host,
    path: record.path,
    type,
    size,
  };
}

export type SessionItem = ReturnType<typeof formatSession>;
export type LogEntry = ReturnType<typeof formatLog>;

export function App() {
  const [activeActivity, setActiveActivity] = useState("network");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [selectedSession, setSelectedSession] = useState<
    SessionRecord | null
  >(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sessionsRes, logsRes] = await Promise.all([
        fetchSessions(100),
        fetchLogs(200),
      ]);
      setSessions((sessionsRes.sessions || []).map(formatSession));
      setLogs((logsRes.logs || []).map(formatLog));
    } catch {
      // API not available yet (dev mode without proxy running)
    }
  }, []);

  const loadSessionDetail = useCallback(async (id: number) => {
    try {
      const { fetchSession } = await import("./api/client");
      const session = await fetchSession(id);
      setSelectedSession(session);
    } catch {
      setSelectedSession(null);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const handleSelect = useCallback(
    (session: SessionItem) => {
      setSelectedId(session.id);
      loadSessionDetail(session.id);
    },
    [loadSessionDetail],
  );

  const handleClearSessions = useCallback(async () => {
    await clearApiSessions();
    setSessions([]);
  }, []);

  const handleClearLogs = useCallback(async () => {
    await clearApiLogs();
    setLogs([]);
  }, []);

  return (
    <div className="flex h-screen gap-2.5 p-2.5">
      {/* Left: NavBar (活动栏 + 域名侧栏) */}
      <NavBar activeId={activeActivity} onChange={setActiveActivity} />

      {/* Center: SessionsTable + TerminalLog */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <SessionsTable
          sessions={sessions}
          activeId={selectedId}
          onSelect={handleSelect}
          onClear={handleClearSessions}
        />
        <TerminalLog logs={logs} onClear={handleClearLogs} />
      </div>

      {/* Right: InspectorPanel */}
      <InspectorPanel session={selectedSession} />
    </div>
  );
}
