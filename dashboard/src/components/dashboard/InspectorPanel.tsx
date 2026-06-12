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
    <Panel className="inspector-panel">
      {/* Main Tabs */}
      <div className="tabs-header">
        {INSPECTOR_TABS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`inspector-tab ${tab === t ? "active" : ""}`}
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
            className={`sub-tab ${sub === st ? "active" : ""}`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="inspector-content">
        {sub === "headers" && (
          <KVRows groups={[MOCK_REQUEST_GENERAL, MOCK_REQUEST_HEADERS]} />
        )}
        {sub !== "headers" && (
          <div className="flex h-full items-center justify-center text-[var(--text-tertiary)] text-xs">
            {sub.charAt(0).toUpperCase() + sub.slice(1)} panel
          </div>
        )}
      </div>
    </Panel>
  );
}
