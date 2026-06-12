import { useState } from "react";
import {
  INSPECTOR_TABS,
  type InspectorTab,
  MOCK_REQUEST_GENERAL,
  MOCK_REQUEST_HEADERS,
  SUB_TABS,
  type SubTab,
} from "../../data/mock";
import { cn } from "@/lib/utils";
import { KVRows } from "../ui/KVRows";
import { Panel } from "../ui/Panel";

/** 右侧检查器面板：请求/响应/规则 Tab + 子标签 */
export function InspectorPanel() {
  const [tab, setTab] = useState<InspectorTab>("request");
  const [sub, setSub] = useState<SubTab>("headers");

  return (
    <Panel className="w-[400px] shrink-0">
      {/* Main Tabs */}
      <div className="flex h-11 items-end gap-0.5 border-b border-white/[0.08] px-1.5">
        {INSPECTOR_TABS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer rounded-t-lg border-none bg-transparent px-3.5 py-1.5 font-[inherit] text-xs transition-all duration-200",
              tab === t
                ? "border-b-2 border-white/30 bg-white/[0.08] text-nova-primary"
                : "text-nova-tertiary",
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-white/5 px-1">
        {SUB_TABS.map((st) => (
          <button
            type="button"
            key={st}
            onClick={() => setSub(st)}
            className={cn(
              "cursor-pointer border-b-2 border-none bg-transparent px-3 py-1.5 font-[inherit] text-[10px] uppercase tracking-[0.05em]",
              sub === st
                ? "border-b-white/40 text-nova-primary"
                : "border-b-transparent text-nova-tertiary",
            )}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {sub === "headers" && (
          <KVRows groups={[MOCK_REQUEST_GENERAL, MOCK_REQUEST_HEADERS]} />
        )}
        {sub !== "headers" && (
          <div className="flex h-full items-center justify-center text-xs text-nova-tertiary">
            {sub.charAt(0).toUpperCase() + sub.slice(1)} panel
          </div>
        )}
      </div>
    </Panel>
  );
}
