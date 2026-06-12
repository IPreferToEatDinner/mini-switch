import type { ReactNode } from "react";

interface PanelProps {
  className?: string;
  children: ReactNode;
}

/** 玻璃态面板容器 */
export function Panel({ className = "", children }: PanelProps) {
  return <div className={`glass-panel ${className}`}>{children}</div>;
}
