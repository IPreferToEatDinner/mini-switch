import { useState } from "react";
import { InspectorPanel } from "./components/dashboard/InspectorPanel";
import { NavBar } from "./components/dashboard/NavBar";
import { SessionsTable } from "./components/dashboard/SessionsTable";
import { TerminalLog } from "./components/dashboard/TerminalLog";
import { MOCK_LOGS, MOCK_SESSIONS } from "./data/mock";

/**
 * App — 纯布局编排器。
 *
 * 数据流：NavBar → App(state) → SessionsTable / InspectorPanel。
 * 所有 mock 数据在 data/mock.ts 中，子组件只负责渲染。
 */
export function App() {
  const [activeActivity, setActiveActivity] = useState("network");

  return (
    <div className="flex h-screen gap-2.5 p-2.5">
      {/* Left: NavBar (图标栏 + 域名侧栏) */}
      <NavBar activeId={activeActivity} onChange={setActiveActivity} />

      {/* Center: SessionsTable + TerminalLog */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <SessionsTable sessions={MOCK_SESSIONS} />
        <TerminalLog logs={MOCK_LOGS} />
      </div>

      {/* Right: InspectorPanel */}
      <InspectorPanel />
    </div>
  );
}
