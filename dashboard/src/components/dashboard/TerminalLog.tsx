import { ChevronDown } from "lucide-react";
import type { LogEntry } from "../../data/mock";
import { Panel } from "../ui/Panel";

interface TerminalLogProps {
  logs: LogEntry[];
}

/** 底部终端日志面板 */
export function TerminalLog({ logs }: TerminalLogProps) {
  const levelClass = (level: LogEntry["level"]) => {
    switch (level) {
      case "warn":
        return "text-nova-yellow";
      case "error":
        return "text-nova-red";
      default:
        return "text-nova-blue";
    }
  };

  return (
    <Panel className="h-[180px] bg-black/20">
      <div className="flex items-center justify-between border-white/[0.08] border-b px-3.5 py-1.5 text-[10px] text-nova-tertiary uppercase tracking-[0.05em]">
        <span>Proxy Logs</span>
        <div className="flex items-center gap-2">
          <span className="cursor-pointer text-[10px] text-nova-tertiary hover:text-nova-primary">
            Clear
          </span>
          <ChevronDown size={11} className="text-nova-tertiary" />
        </div>
      </div>
      <div className="h-[calc(100%-30px)] overflow-y-auto px-3.5 py-2.5 font-mono text-[11px] text-nova-secondary">
        {logs.map((log) => (
          <div key={log.id} className="mb-[3px] leading-[1.5]">
            <span className="mr-2 text-nova-tertiary">[{log.time}]</span>
            <span className={levelClass(log.level)}>
              {log.level.toUpperCase()}
            </span>{" "}
            {log.text}
          </div>
        ))}
      </div>
    </Panel>
  );
}
