import { useMemo, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { SessionItem } from "../../hooks/useSessions";
import {
  ACTIVITY_ITEMS,
  ACTIVITY_SETTINGS,
  type ActivityItem,
} from "../../data/mock";
import { Panel } from "../ui/Panel";

export interface DomainItem {
  name: string;
  color: string;
  count: number;
}

interface NavBarProps {
  activeId: string;
  onChange: (id: string) => void;
  sessions: SessionItem[];
  selectedHost: string | null;
  onSelectHost: (host: string | null) => void;
}

function hostColor(host: string): string {
  const palette = [
    "#61afef", "#e06c75", "#98c379", "#d19a66",
    "#c678dd", "#56b6c2", "#e5c07b", "#be5046",
  ];
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = (hash * 31 + host.charCodeAt(i)) & 0xffffffff;
  }
  return palette[Math.abs(hash) % palette.length];
}

/** 左侧导航栏：图标栏 + 域名侧栏 */
export function NavBar({
  activeId,
  onChange,
  sessions,
  selectedHost,
  onSelectHost,
}: NavBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState("");

  const domains = useMemo<DomainItem[]>(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      map.set(s.host, (map.get(s.host) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, color: hostColor(name) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return domains;
    const q = filter.toLowerCase();
    return domains.filter((d) => d.name.toLowerCase().includes(q));
  }, [domains, filter]);

  const totalCount = domains.reduce((sum, d) => sum + d.count, 0);

  return (
    <Panel
      className={cn(
        "flex shrink-0 !flex-row transition-all duration-300",
        collapsed ? "w-[54px]" : "w-[280px]",
      )}
    >
      {/* Activity 图标栏 */}
      <div className="flex w-[54px] shrink-0 flex-col items-center gap-5 border-r border-white/[0.08] pt-5">
        {ACTIVITY_ITEMS.map((item) => (
          <IconButton
            key={item.id}
            item={item}
            active={activeId === item.id}
            onClick={() => onChange(item.id)}
            collapsed={collapsed}
          />
        ))}
        <div className="mb-1 mt-auto flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] text-nova-tertiary transition-colors hover:bg-white/[0.05] hover:text-nova-primary"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
          <IconButton
            item={ACTIVITY_SETTINGS}
            active={false}
            onClick={() => {}}
            collapsed={collapsed}
          />
        </div>
      </div>

      {/* 域名侧栏（收起时隐藏） */}
      {!collapsed && (
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex h-[54px] items-center gap-2 border-b border-white/[0.08] px-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.02em] text-nova-secondary">
              mini-switch
            </span>
            {totalCount > 0 && (
              <span className="ml-auto rounded bg-white/[0.06] px-1.5 text-[10px] tabular-nums text-nova-tertiary">
                {totalCount}
              </span>
            )}
          </div>

          <div className="m-3 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3.5 py-1.5">
            <Search size={12} className="text-nova-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Filter host..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border-none bg-transparent font-[inherit] text-xs text-nova-primary outline-none placeholder:text-nova-tertiary"
            />
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
            <button
              type="button"
              onClick={() => onSelectHost(null)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded p-2 text-left text-xs",
                selectedHost === null
                  ? "bg-white/[0.06] text-nova-primary"
                  : "text-nova-secondary hover:bg-white/[0.03]",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width={12}
                height={12}
                className="shrink-0 text-[var(--bg-ambient-1)]"
                aria-hidden="true"
              >
                <path
                  d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="min-w-0 truncate">All Traffic</span>
              <span className="ml-auto shrink-0 text-[10px] tabular-nums text-nova-tertiary">
                {totalCount}
              </span>
            </button>

            {filtered.length === 0 && filter.trim() && (
              <div className="px-2 py-4 text-center text-[11px] text-nova-tertiary">
                No hosts match "{filter}"
              </div>
            )}

            {filtered.map((domain) => {
              const isSelected =
                selectedHost !== null && selectedHost === domain.name;

              return (
                <button
                  type="button"
                  key={domain.name}
                  onClick={() => onSelectHost(domain.name)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded p-2 text-left text-xs",
                    isSelected
                      ? "bg-white/[0.06] text-nova-primary"
                      : "text-nova-secondary hover:bg-white/[0.03]",
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={12}
                    height={12}
                    style={{ color: domain.color }}
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="min-w-0 truncate">{domain.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] tabular-nums text-nova-tertiary">
                    {domain.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

function IconButton({
  item,
  active,
  onClick,
  collapsed,
}: {
  item: ActivityItem;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] text-nova-secondary transition-all duration-200",
        active
          ? "bg-white/[0.08] text-nova-primary shadow-[0_0_10px_rgba(0,0,0,0.2)]"
          : "hover:bg-white/[0.03] hover:text-nova-primary",
      )}
    >
      <item.icon size={18} />
    </button>
  );
}
