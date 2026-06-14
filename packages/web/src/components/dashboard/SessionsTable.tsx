import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/src/lib/utils";
import { Check, ChevronDown, Filter, Search, Trash2, X } from "lucide-react";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

export interface SessionItem {
  id: number;
  status: number;
  method: string;
  protocol: "HTTP" | "HTTPS";
  host: string;
  path: string;
  type: string;
  size: string;
}

interface SessionsTableProps {
  sessions: SessionItem[];
  activeId?: number;
  onSelect?: (session: SessionItem) => void;
  onClear?: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}

const thClass =
  "sticky top-0 bg-[rgba(15,10,15,0.85)] backdrop-blur-[8px] px-[14px] py-2 text-nova-tertiary font-medium uppercase text-[10px] tracking-[0.05em] border-b border-white/[0.08] z-10";
const tdClass =
  "px-[14px] py-2 whitespace-nowrap overflow-hidden text-ellipsis text-nova-secondary font-mono text-[11px]";

type FilterField = "type" | "method" | "protocol";

type ActiveFilters = Record<FilterField, Set<string>>;

function emptyFilters(): ActiveFilters {
  return { type: new Set(), method: new Set(), protocol: new Set() };
}

function hasAnyFilter(f: ActiveFilters): boolean {
  return f.type.size > 0 || f.method.size > 0 || f.protocol.size > 0;
}

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const active = selected.size > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition-colors",
          active
            ? "border-white/15 bg-white/10 text-nova-primary"
            : "border-white/5 bg-white/5 text-nova-tertiary hover:border-white/10 hover:text-nova-secondary",
        )}
      >
        {label}
        {active && (
          <span className="tabular-nums text-nova-primary">
            {selected.size}
          </span>
        )}
        <ChevronDown size={10} className="text-nova-tertiary" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-white/[0.08] bg-[#1a1420] p-1 shadow-lg">
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-[11px] text-nova-tertiary">
              No options
            </div>
          )}
          {options.map((opt) => {
            const checked = selected.has(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(opt)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-[11px]",
                  checked
                    ? "bg-white/[0.06] text-nova-primary"
                    : "text-nova-secondary hover:bg-white/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
                    checked
                      ? "border-white/30 bg-white/15"
                      : "border-white/10",
                  )}
                >
                  {checked && <Check size={9} />}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 请求会话表格 */
export function SessionsTable({
  sessions,
  activeId,
  onSelect,
  onClear,
  search,
  onSearchChange,
}: SessionsTableProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>(emptyFilters);

  // Extract unique values for dropdowns
  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const methods = new Set<string>();
    const protocols = new Set<string>();
    for (const s of sessions) {
      types.add(s.type);
      methods.add(s.method);
      protocols.add(s.protocol);
    }
    return {
      type: Array.from(types).sort(),
      method: Array.from(methods).sort(),
      protocol: Array.from(protocols).sort(),
    };
  }, [sessions]);

  function toggleFilter(field: FilterField, value: string) {
    setFilters((prev) => {
      const next = new Set(prev[field]);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, [field]: next };
    });
  }

  const filtered = useMemo(() => {
    let result = sessions;

    if (filters.type.size > 0) {
      result = result.filter((s) => filters.type.has(s.type));
    }
    if (filters.method.size > 0) {
      result = result.filter((s) => filters.method.has(s.method));
    }
    if (filters.protocol.size > 0) {
      result = result.filter((s) => filters.protocol.has(s.protocol));
    }

    return result;
  }, [sessions, filters]);

  const filterActive = hasAnyFilter(filters);

  return (
    <Panel className="flex-1">
      <TableToolbar
        count={sessions.length}
        filteredCount={filtered.length}
        onClear={onClear}
        showFilter={showFilter}
        onToggleFilter={() => {
          if (showFilter) {
            setFilters(emptyFilters());
          }
          setShowFilter((v) => !v);
        }}
      />

      {showFilter && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
          <Filter size={11} className="text-nova-tertiary shrink-0" />

          <FilterDropdown
            label="Type"
            options={filterOptions.type}
            selected={filters.type}
            onToggle={(v) => toggleFilter("type", v)}
          />
          <FilterDropdown
            label="Method"
            options={filterOptions.method}
            selected={filters.method}
            onToggle={(v) => toggleFilter("method", v)}
          />
          <FilterDropdown
            label="Protocol"
            options={filterOptions.protocol}
            selected={filters.protocol}
            onToggle={(v) => toggleFilter("protocol", v)}
          />

          {/* Body / URL search (server-side) */}
          <div className="ml-auto flex items-center gap-1.5">
            <Search size={11} className="text-nova-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Search body, url..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-44 border-none bg-transparent font-mono text-[11px] text-nova-primary outline-none placeholder:text-nova-tertiary"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="cursor-pointer border-none bg-transparent p-0 text-nova-tertiary hover:text-nova-primary"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {(filterActive || search) && (
            <button
              type="button"
              onClick={() => {
                setFilters(emptyFilters());
                onSearchChange("");
              }}
              className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-nova-tertiary hover:text-nova-primary"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
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
              <th className={thClass} style={{ width: 70 }}>
                Protocol
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
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-[11px] text-nova-tertiary"
                >
                  {filterActive || search
                    ? "No sessions match your filters"
                    : "Waiting for proxy traffic..."}
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect?.(s)}
                className={cn(
                  "cursor-pointer border-b border-white/[0.03] transition-colors duration-100 hover:bg-white/[0.03]",
                  s.id === activeId && "bg-white/[0.08]",
                )}
              >
                <td className={tdClass}>{s.id}</td>
                <td className={tdClass}>
                  <StatusPill status={s.status} />
                </td>
                <td className={tdClass}>{s.method}</td>
                <td className={tdClass}>
                  <span
                    className={
                      s.protocol === "HTTPS"
                        ? "text-emerald-400"
                        : "text-nova-tertiary"
                    }
                  >
                    {s.protocol}
                  </span>
                </td>
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

function TableToolbar({
  count,
  filteredCount,
  onClear,
  showFilter,
  onToggleFilter,
}: {
  count: number;
  filteredCount: number;
  onClear?: () => void;
  showFilter: boolean;
  onToggleFilter: () => void;
}) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-white/5 px-3">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded border border-red-500/30 bg-red-500/20 text-red-400"
      >
        <span className="text-[10px]">⬤</span>
      </button>
      <button
        type="button"
        onClick={onClear}
        className="flex h-7 w-7 items-center justify-center rounded text-nova-secondary hover:bg-white/5"
      >
        <Trash2 size={14} />
      </button>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onToggleFilter}
          className={cn(
            "flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] transition-colors",
            showFilter
              ? "border-white/15 bg-white/10 text-nova-primary"
              : "border-white/5 bg-white/5 text-nova-secondary hover:border-white/10",
          )}
        >
          <Filter size={11} />
          Filter
        </button>
      </div>
      <span className="text-[10px] text-nova-tertiary">
        Sessions:{" "}
        {filteredCount !== count ? `${filteredCount} / ` : ""}
        {count} / Capturing
      </span>
    </div>
  );
}
