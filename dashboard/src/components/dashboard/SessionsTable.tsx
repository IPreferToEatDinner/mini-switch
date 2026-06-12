import { Filter, Trash2 } from "lucide-react";
import type { SessionItem } from "../../data/mock";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

interface SessionsTableProps {
  sessions: SessionItem[];
  activeId?: number;
  onSelect?: (session: SessionItem) => void;
}

const thClass =
  "sticky top-0 bg-[rgba(15,10,15,0.85)] backdrop-blur-[8px] px-[14px] py-2 text-nova-tertiary font-medium uppercase text-[10px] tracking-[0.05em] border-b border-white/[0.08] z-10";
const tdClass =
  "px-[14px] py-2 whitespace-nowrap overflow-hidden text-ellipsis text-nova-secondary font-mono text-[11px]";

/** 请求会话表格 */
export function SessionsTable({
  sessions,
  activeId,
  onSelect,
}: SessionsTableProps) {
  return (
    <Panel className="flex-1">
      <TableToolbar count={sessions.length} />
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs text-left">
          <thead>
            <tr>
              <th className={thClass} style={{ width: 50 }}>
                ID
              </th>
              <th className={thClass} style={{ width: 80 }}>
                Status
              </th>
              <th className={thClass} style={{ width: 70 }}>
                Method
              </th>
              <th className={thClass} style={{ width: 180 }}>
                Host
              </th>
              <th className={thClass}>Path</th>
              <th className={thClass} style={{ width: 80 }}>
                Type
              </th>
              <th className={thClass} style={{ width: 70 }}>
                Size
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect?.(s)}
                className={`border-b border-white/[0.03] cursor-pointer transition-colors duration-100 hover:bg-white/[0.03] ${
                  s.active || s.id === activeId ? "bg-white/[0.08]" : ""
                }`}
              >
                <td className={tdClass}>{s.id}</td>
                <td className={tdClass}>
                  <StatusPill status={s.status} />
                </td>
                <td className={tdClass}>{s.method}</td>
                <td className={tdClass}>{s.host}</td>
                <td className={tdClass}>{s.path}</td>
                <td className={tdClass}>{s.type}</td>
                <td className={tdClass}>{s.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function TableToolbar({ count }: { count: number }) {
  return (
    <div className="flex h-11 items-center gap-3 border-white/5 border-b px-3">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded border border-red-500/30 bg-red-500/20 text-red-400"
      >
        <span className="text-[10px]">⬤</span>
      </button>
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded text-nova-secondary hover:bg-white/5"
      >
        <Trash2 size={14} />
      </button>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex flex-1 items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded border border-white/5 bg-white/5 px-2.5 py-1 text-[11px] text-nova-secondary"
        >
          <Filter size={11} />
          Filter
        </button>
      </div>
      <span className="text-[10px] text-nova-tertiary">
        Sessions: {count} / Capturing
      </span>
    </div>
  );
}
