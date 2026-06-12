import { useState } from "react";
import { ActivityBar } from "./components/dashboard/ActivityBar";
import { InspectorPanel } from "./components/dashboard/InspectorPanel";
import { SessionsTable } from "./components/dashboard/SessionsTable";
import { SidebarPanel } from "./components/dashboard/SidebarPanel";
import { TerminalLog } from "./components/dashboard/TerminalLog";
import { MOCK_LOGS, MOCK_SESSIONS } from "./data/mock";

/**
 * App — 纯布局编排器。
 *
 * 数据流：ActivityBar → App(state) → SessionsTable / InspectorPanel。
 * 所有 mock 数据在 data/mock.ts 中，子组件只负责渲染。
 */
export function App() {
  const [activeActivity, setActiveActivity] = useState("network");

  return (
    <div className="flex h-screen gap-[var(--space-gap)] p-[var(--space-gap)]">
      {/* Left: ActivityBar + SidebarPanel */}
      <div className="flex">
        <ActivityBar activeId={activeActivity} onChange={setActiveActivity} />
        <SidebarPanel />
      </div>

      {/* Center: SessionsTable + TerminalLog */}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-gap)]">
        <SessionsTable sessions={MOCK_SESSIONS} />
        <TerminalLog logs={MOCK_LOGS} />
      </div>

      {/* Right: InspectorPanel */}
      <InspectorPanel />
    </div>
  );
}
