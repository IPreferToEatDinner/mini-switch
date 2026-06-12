import type { ReactNode } from "react";

interface PanelProps {
  className?: string;
  children: ReactNode;
}

/** 玻璃态面板容器 */
export function Panel({ className = "", children }: PanelProps) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[rgba(20,15,22,0.45)] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-[24px] after:pointer-events-none after:absolute after:top-0 after:right-0 after:left-0 after:z-10 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:opacity-50 ${className}`}
    >
      {children}
    </div>
  );
}
