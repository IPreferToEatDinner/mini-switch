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
      <div className="py-1.5 px-3.5 text-[10px] text-nova-tertiary uppercase border-b border-white/[0.08] flex justify-between items-center tracking-[0.05em]">
        <span>Proxy Logs</span>
        <div className="flex items-center gap-2">
          <span className="cursor-pointer text-[10px] text-nova-tertiary hover:text-nova-primary">
            Clear
          </span>
          <ChevronDown size={11} className="text-nova-tertiary" />
        </div>
      </div>
      <div className="py-2.5 px-3.5 font-mono text-[11px] text-nova-secondary overflow-y-auto h-[calc(100%-30px)]">
        {logs.map((log) => (
          <div key={log.id} className="mb-[3px] leading-[1.5]">
            <span className="text-nova-tertiary mr-2">[{log.time}]</span>
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
