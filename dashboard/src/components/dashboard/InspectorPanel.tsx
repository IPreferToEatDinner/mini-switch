import { useState } from "react";
import {
  INSPECTOR_TABS,
  type InspectorTab,
  MOCK_REQUEST_GENERAL,
  MOCK_REQUEST_HEADERS,
  SUB_TABS,
  type SubTab,
} from "../../data/mock";
import { KVRows } from "../ui/KVRows";
import { Panel } from "../ui/Panel";

/** 右侧检查器面板：请求/响应/规则 Tab + 子标签 */
export function InspectorPanel() {
  const [tab, setTab] = useState<InspectorTab>("request");
  const [sub, setSub] = useState<SubTab>("headers");

  return (
    <Panel className="w-[400px] shrink-0">
      {/* Main Tabs */}
      <div className="h-11 border-b border-white/[0.08] flex px-1.5 gap-0.5 items-end">
        {INSPECTOR_TABS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`py-1.5 px-3.5 rounded-t-lg text-xs cursor-pointer transition-all duration-200 bg-transparent border-none font-[inherit] ${
              tab === t
                ? "bg-white/[0.08] text-nova-primary border-b-2 border-white/30"
                : "text-nova-tertiary"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-white/5 border-b px-1">
        {SUB_TABS.map((st) => (
          <button
            type="button"
            key={st}
            onClick={() => setSub(st)}
            className={`py-1.5 px-3 text-[10px] cursor-pointer bg-transparent border-none border-b-2 font-[inherit] uppercase tracking-[0.05em] ${
              sub === st
                ? "text-nova-primary border-b-white/40"
                : "text-nova-tertiary border-b-transparent"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-3.5 overflow-y-auto">
        {sub === "headers" && (
          <KVRows groups={[MOCK_REQUEST_GENERAL, MOCK_REQUEST_HEADERS]} />
        )}
        {sub !== "headers" && (
          <div className="flex h-full items-center justify-center text-nova-tertiary text-xs">
            {sub.charAt(0).toUpperCase() + sub.slice(1)} panel
          </div>
        )}
      </div>
    </Panel>
  );
}
