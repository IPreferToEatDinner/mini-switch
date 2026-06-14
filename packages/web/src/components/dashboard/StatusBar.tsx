import { Terminal } from "lucide-react";

interface StatusBarProps {
  logCount: number;
  showLog: boolean;
  onToggleLog: () => void;
}

/** VSCode 风格底部状态栏 */
export function StatusBar({ logCount, showLog, onToggleLog }: StatusBarProps) {
  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t border-white/[0.06] bg-[#0d0a0d] px-3 text-[11px] text-nova-tertiary select-none">
      {/* Left: proxy status / placeholder */}
      <span>mini-switch</span>

      {/* Right: controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleLog}
          className={`flex cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 font-[inherit] text-[11px] transition-colors hover:text-nova-primary ${
            showLog ? "bg-white/[0.06] text-nova-primary" : "text-nova-tertiary"
          }`}
        >
          <Terminal size={12} />
          <span>Log</span>
          {logCount > 0 && (
            <span className="rounded bg-white/[0.08] px-1 text-[10px] tabular-nums">
              {logCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
