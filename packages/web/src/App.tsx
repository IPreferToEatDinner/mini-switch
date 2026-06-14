import { useMemo, useState } from "react";
import { InspectorPanel } from "./components/dashboard/InspectorPanel";
import { NavBar } from "./components/dashboard/NavBar";
import { SessionsTable } from "./components/dashboard/SessionsTable";
import { StatusBar } from "./components/dashboard/StatusBar";
import { TerminalLog } from "./components/dashboard/TerminalLog";
import { useLogs } from "./hooks/useLogs";
import { useSessions } from "./hooks/useSessions";

export function App() {
  const [activeActivity, setActiveActivity] = useState("network");
  const [showLog, setShowLog] = useState(false);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);

  const {
    sessions,
    selectedId,
    selectedSession,
    selectSession,
    clearSessions,
  } = useSessions();
  const { logs, clearLogs } = useLogs();

  const filteredSessions = useMemo(() => {
    if (selectedHost === null) return sessions;
    return sessions.filter((s) => s.host === selectedHost);
  }, [sessions, selectedHost]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 gap-2.5 p-2.5">
        <NavBar
          activeId={activeActivity}
          onChange={setActiveActivity}
          sessions={sessions}
          selectedHost={selectedHost}
          onSelectHost={setSelectedHost}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <SessionsTable
            sessions={filteredSessions}
            activeId={selectedId}
            onSelect={selectSession}
            onClear={clearSessions}
          />
          {showLog && (
            <TerminalLog
              logs={logs}
              onClear={clearLogs}
              onClose={() => setShowLog(false)}
            />
          )}
        </div>

        <InspectorPanel session={selectedSession} />
      </div>

      <StatusBar
        logCount={logs.length}
        showLog={showLog}
        onToggleLog={() => setShowLog((v) => !v)}
      />
    </div>
  );
}
