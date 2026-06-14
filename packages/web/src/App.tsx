import { useMemo, useState } from "react";
import { InspectorPanel } from "./components/dashboard/InspectorPanel";
import { NavBar, type DomainItem } from "./components/dashboard/NavBar";
import { SessionsTable } from "./components/dashboard/SessionsTable";
import { StatusBar } from "./components/dashboard/StatusBar";
import { TerminalLog } from "./components/dashboard/TerminalLog";
import { useLogs } from "./hooks/useLogs";
import { useSessions } from "./hooks/useSessions";

/** 根据 host 名生成稳定颜色 */
function hostColor(host: string): string {
  const palette = [
    "#61afef",
    "#e06c75",
    "#98c379",
    "#d19a66",
    "#c678dd",
    "#56b6c2",
    "#e5c07b",
    "#be5046",
  ];
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = (hash * 31 + host.charCodeAt(i)) & 0xffffffff;
  }
  return palette[Math.abs(hash) % palette.length];
}

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

  // 从 sessions 派生域名列表（去重 + 计数）
  const domains = useMemo<DomainItem[]>(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      map.set(s.host, (map.get(s.host) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, color: hostColor(name) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [sessions]);

  // 按选中域名过滤 sessions
  const filteredSessions = useMemo(() => {
    if (selectedHost === null) return sessions;
    return sessions.filter((s) => s.host === selectedHost);
  }, [sessions, selectedHost]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 gap-2.5 p-2.5">
        {/* Left: NavBar */}
        <NavBar
          activeId={activeActivity}
          onChange={setActiveActivity}
          domains={domains}
          selectedHost={selectedHost}
          onSelectHost={setSelectedHost}
        />

        {/* Center: SessionsTable + optional TerminalLog */}
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

        {/* Right: InspectorPanel */}
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
