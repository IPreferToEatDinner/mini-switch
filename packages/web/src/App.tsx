import { useCallback, useEffect, useRef, useState } from "react";
import { InspectorPanel } from "./components/dashboard/InspectorPanel";
import { NavBar } from "./components/dashboard/NavBar";
import { SessionsTable } from "./components/dashboard/SessionsTable";
import { StatusBar } from "./components/dashboard/StatusBar";
import { TerminalLog } from "./components/dashboard/TerminalLog";
import { useLogs } from "./hooks/useLogs";
import { useSessions } from "./hooks/useSessions";

const INSPECTOR_MIN = 280;
const INSPECTOR_MAX = 800;
const INSPECTOR_DEFAULT = 400;

export function App() {
  const [activeActivity, setActiveActivity] = useState("network");
  const [showLog, setShowLog] = useState(false);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_DEFAULT);

  const {
    sessions,
    selectedId,
    selectedSession,
    selectSession,
    clearSessions,
  } = useSessions(search || undefined);
  const { logs, clearLogs } = useLogs();

  const filteredSessions = selectedHost === null
    ? sessions
    : sessions.filter((s) => s.host === selectedHost);

  // Resize handle
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(INSPECTOR_DEFAULT);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = inspectorWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [inspectorWidth]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const next = Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, startWidth.current + delta));
      setInspectorWidth(next);
    }

    function onMouseUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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
            search={search}
            onSearchChange={setSearch}
          />
          {showLog && (
            <TerminalLog
              logs={logs}
              onClear={clearLogs}
              onClose={() => setShowLog(false)}
            />
          )}
        </div>

        {/* Drag handle — sits in the gap, cancels flex-gap to avoid doubling */}
        <div
          onMouseDown={onMouseDown}
          className="group -mx-2.5 flex w-2.5 shrink-0 cursor-col-resize items-center justify-center"
        >
          <div className="h-10 w-[3px] rounded-full bg-white/[0.06] group-hover:bg-white/20 group-active:bg-white/30" />
        </div>

        <div style={{ width: inspectorWidth }} className="shrink-0 overflow-hidden">
          <InspectorPanel session={selectedSession} />
        </div>
      </div>

      <StatusBar
        logCount={logs.length}
        showLog={showLog}
        onToggleLog={() => setShowLog((v) => !v)}
      />
    </div>
  );
}
