import { ChevronDown } from "lucide-react";
import type { LogEntry } from "../../data/mock";
import { Panel } from "../ui/Panel";

interface TerminalLogProps {
  logs: LogEntry[];
}

/** 底部终端日志面板 */
export function TerminalLog({ logs }: TerminalLogProps) {
  const levelColor = (level: LogEntry["level"]) =>
    level === "warn"
      ? "log-warn"
      : level === "error"
        ? "text-[var(--status-red)]"
        : "log-info";

  return (
    <Panel className="terminal-panel">
      <div className="terminal-header">
        <span>Proxy Logs</span>
        <div className="flex items-center gap-2">
          <span className="cursor-pointer text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            Clear
          </span>
          <ChevronDown size={11} style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>
      <div className="terminal-content">
        {logs.map((log) => (
          <div key={log.id} className="log-entry">
            <span className="log-time">[{log.time}]</span>
            <span className={levelColor(log.level)}>
              {log.level.toUpperCase()}
            </span>{" "}
            {log.text}
          </div>
        ))}
      </div>
    </Panel>
  );
}
