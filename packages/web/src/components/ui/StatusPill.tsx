import { cn } from "@/src/lib/utils";

interface StatusPillProps {
  status: number;
}

const statusText: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Timeout",
  429: "Too Many",
  500: "Server Error",
  502: "Bad Gateway",
  503: "Unavailable",
  504: "Gateway Timeout",
};

function statusConfig(code: number) {
  const cat = Math.floor(code / 100);
  if (cat === 2) return { bg: "bg-emerald-500/15", text: "text-emerald-400" };
  if (cat === 3) return { bg: "bg-amber-500/15", text: "text-amber-400" };
  if (cat === 4) return { bg: "bg-red-500/15", text: "text-red-400" };
  if (cat === 5) return { bg: "bg-rose-500/15", text: "text-rose-400" };
  return { bg: "bg-white/10", text: "text-nova-tertiary" };
}

/** HTTP 状态码胶囊标签 */
export function StatusPill({ status }: StatusPillProps) {
  if (status === 0) {
    return (
      <span className="rounded bg-white/10 px-1.5 py-px font-mono text-[10px] text-nova-tertiary">
        —
      </span>
    );
  }

  const cfg = statusConfig(status);
  const label = statusText[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-px font-mono text-[10px] font-semibold",
        cfg.bg,
        cfg.text,
      )}
    >
      {status}
      {label && (
        <span className="opacity-70">{label}</span>
      )}
    </span>
  );
}
