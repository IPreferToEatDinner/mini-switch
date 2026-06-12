import { Filter, Trash2 } from "lucide-react";
import type { SessionItem } from "../../data/mock";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

interface SessionsTableProps {
  sessions: SessionItem[];
  activeId?: number;
  onSelect?: (session: SessionItem) => void;
}

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
        <table className="session-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>ID</th>
              <th style={{ width: 80 }}>Status</th>
              <th style={{ width: 70 }}>Method</th>
              <th style={{ width: 180 }}>Host</th>
              <th>Path</th>
              <th style={{ width: 80 }}>Type</th>
              <th style={{ width: 70 }}>Size</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect?.(s)}
                className={`session-row ${s.active || s.id === activeId ? "active" : ""}`}
              >
                <td>{s.id}</td>
                <td>
                  <StatusPill status={s.status} />
                </td>
                <td>{s.method}</td>
                <td>{s.host}</td>
                <td>{s.path}</td>
                <td>{s.type}</td>
                <td>{s.size}</td>
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
        className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-white/5"
      >
        <Trash2 size={14} />
      </button>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex flex-1 items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded border border-white/5 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
        >
          <Filter size={11} />
          Filter
        </button>
      </div>
      <span className="text-[10px] text-[var(--text-tertiary)]">
        Sessions: {count} / Capturing
      </span>
    </div>
  );
}
