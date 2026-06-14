import type { SessionRecord } from "../../api/client";

interface SessionGeneralProps {
  session: SessionRecord;
  showResponse?: boolean;
}

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  POST: { bg: "bg-blue-500/15", text: "text-blue-400" },
  PUT: { bg: "bg-amber-500/15", text: "text-amber-400" },
  PATCH: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  DELETE: { bg: "bg-red-500/15", text: "text-red-400" },
  OPTIONS: { bg: "bg-purple-500/15", text: "text-purple-400" },
  HEAD: { bg: "bg-white/10", text: "text-nova-tertiary" },
};

function formatSize(b: number | null): string {
  if (b == null) return "--";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "--";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** 紧凑型 Session 概览卡片 */
export function SessionGeneral({ session, showResponse }: SessionGeneralProps) {
  const mc = METHOD_COLORS[session.method] ?? {
    bg: "bg-white/10",
    text: "text-nova-secondary",
  };

  const statusColor =
    session.statusCode && session.statusCode < 300
      ? "text-nova-green"
      : session.statusCode && session.statusCode >= 400
        ? "text-nova-red"
        : "text-nova-secondary";

  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
      {/* Row 1: Method + URL */}
      <div className="flex items-start gap-2.5 mb-2">
        <span
          className={`shrink-0 rounded px-1.5 py-px font-mono text-[11px] font-semibold ${mc.bg} ${mc.text}`}
        >
          {session.method}
        </span>
        <span className="min-w-0 font-mono text-[11px] leading-relaxed text-nova-primary break-all">
          {session.url}
        </span>
      </div>

      {/* Row 2: Status / Size / Duration / Host */}
      {showResponse && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className={`font-mono text-[11px] ${statusColor}`}>
            {session.statusCode
              ? `${session.statusCode} ${session.statusText ?? ""}`
              : "pending..."}
          </span>
          <span className="font-mono text-[11px] text-nova-tertiary">
            {formatSize(session.responseSize)}
          </span>
          <span className="font-mono text-[11px] text-nova-tertiary">
            {formatDuration(session.durationMs)}
          </span>
          {session.error && (
            <span className="font-mono text-[11px] text-nova-red">
              ⚠ {session.error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
