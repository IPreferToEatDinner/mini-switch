import { useState } from "react";

const TABS = ["Network", "Rules", "Composer", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Network");

  return (
    <div className="flex h-full flex-col bg-[#0d1117] font-sans text-[#e6edf3]">
      {/* Header */}
      <header className="flex h-10 shrink-0 items-center justify-between border-[#30363d] border-b bg-[#161b22] px-4">
        <div className="flex items-center gap-2">
          <span className="text-[#58a6ff] text-lg">⬡</span>
          <span className="font-mono font-semibold text-sm">mini-switch</span>
          <span className="rounded bg-[#0d1117] px-1.5 py-px font-mono text-[#8b949e] text-[11px]">
            v1.0.0
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[#8b949e] text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-[#3fb950]" />
          <span>Proxy: 127.0.0.1:6677</span>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex shrink-0 gap-0 border-[#30363d] border-b bg-[#161b22] px-3">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer border-b-2 px-4 py-2 font-medium text-[13px] transition-colors ${
              activeTab === tab
                ? "border-[#58a6ff] text-[#e6edf3]"
                : "border-transparent text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === "Network" && <Placeholder text="Request Log" />}
        {activeTab === "Rules" && <Placeholder text="Rule Editor" />}
        {activeTab === "Composer" && <Placeholder text="Request Composer" />}
        {activeTab === "Settings" && <Placeholder text="Settings" />}
      </main>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-[#8b949e]">
      <span className="text-5xl opacity-30">📡</span>
      <span className="text-sm">{text} — coming soon</span>
    </div>
  );
}
