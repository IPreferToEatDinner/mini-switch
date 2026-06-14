import { ChevronDown } from "lucide-react";
import { Panel } from "../ui/Panel";

export interface LogEntry {
  id: number;
  time: string;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
  sessionId: number | null;
}

interface TerminalLogProps {
  logs: LogEntry[];
  onClear?: () => void;
  onClose?: () => void;
}

const levelConfig: Record<
  LogEntry["level"],
  { label: string; bg: string; text: string }
> = {
  info: {
    label: "INFO",
    bg: "bg-blue-500/15",
    text: "text-blue-400",
  },
  warn: {
    label: "WARN",
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
  },
  error: {
    label: "ERROR",
    bg: "bg-red-500/15",
    text: "text-red-400",
  },
};

const categoryColors: Record<string, string> = {
  api: "text-purple-400",
  proxy: "text-cyan-400",
  pipeline: "text-emerald-400",
  "rule-engine": "text-amber-400",
  "—": "text-nova-tertiary",
};

/** 底部终端日志面板 */
export function TerminalLog({ logs, onClear, onClose }: TerminalLogProps) {
  return (
    <Panel className="h-[180px] bg-black/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-3.5 py-1.5 text-[10px] uppercase tracking-[0.05em] text-nova-tertiary">
        <span>Proxy Logs</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer border-none bg-transparent p-0 font-[inherit] text-[10px] text-nova-tertiary hover:text-nova-primary"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent p-0 text-nova-tertiary hover:text-nova-primary"
            title="Collapse"
          >
            <ChevronDown size={11} className="transition-transform hover:scale-110" />
          </button>
        </div>
      </div>

      {/* Log lines */}
      <div className="h-[calc(100%-30px)] overflow-y-auto px-3.5 py-2 font-mono text-[11px] leading-[1.65]">
        {logs.length === 0 && (
          <div className="mt-2 text-center text-nova-tertiary italic">
            Waiting for proxy traffic...
          </div>
        )}
        {logs.map((log) => {
          const lc = levelConfig[log.level];
          return (
            <div
              key={log.id}
              className="group flex items-start gap-2 rounded px-1 py-0.5 transition-colors hover:bg-white/[0.04]"
            >
              {/* Time */}
              <span className="shrink-0 text-nova-tertiary tabular-nums">
                {log.time}
              </span>

              {/* Level badge */}
              <span
                className={`shrink-0 rounded px-1 py-px text-[10px] font-semibold uppercase ${lc.bg} ${lc.text}`}
              >
                {lc.label}
              </span>

              {/* Category */}
              <span
                className={`shrink-0 ${categoryColors[log.category] ?? "text-nova-tertiary"}`}
              >
                [{log.category}]
              </span>

              {/* Message + optional session ref */}
              <span className="min-w-0 whitespace-pre-wrap break-words text-nova-secondary">
                {log.message}
                {log.sessionId != null && (
                  <span className="ml-1.5 text-[10px] text-nova-tertiary opacity-60">
                    (#{log.sessionId})
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
