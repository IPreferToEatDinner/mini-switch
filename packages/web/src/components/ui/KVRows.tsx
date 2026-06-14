import { cn } from "@/src/lib/utils";
import type { KVGroup } from "../../data/mock";

interface KVRowsProps {
  groups: KVGroup[];
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

/** 键值对列表（用于 Inspector 面板） */
export function KVRows({ groups }: KVRowsProps) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="mb-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-nova-tertiary">
            {group.title}
          </div>
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] overflow-hidden">
            {group.items
              .filter((item) => item.value !== "--" && item.value !== "")
              .map((item, i, arr) => {
                const isMethod = item.key === "Request Method:";
                const isCookie = /^(cookie|set-cookie):?$/i.test(
                  item.key.replace(/\s/g, ""),
                );
                const useMultiline = item.multiline || isCookie;
                const mc = isMethod ? METHOD_COLORS[item.value] : null;

                return (
                  <div
                    key={item.key}
                    className={cn(
                      i !== arr.length - 1 &&
                        "border-b border-white/[0.04]",
                    )}
                  >
                    {item.horizontal ? (
                      /* Horizontal: key | value on same row */
                      <div className="flex items-start gap-4 px-3 py-2">
                        <span className="w-[100px] shrink-0 text-right text-[10px] uppercase tracking-[0.03em] text-nova-purple/70">
                          {item.key}
                        </span>
                        {isMethod && mc ? (
                          <span
                            className={cn(
                              "rounded px-1.5 py-px font-mono text-[11px] font-semibold",
                              mc.bg,
                              mc.text,
                            )}
                          >
                            {item.value}
                          </span>
                        ) : useMultiline ? (
                          <textarea
                            readOnly
                            rows={2}
                            value={item.value}
                            className="min-w-0 flex-1 resize-none border-none bg-transparent p-0 font-mono text-[11px] leading-relaxed text-nova-primary outline-none"
                          />
                        ) : (
                          <span
                            className={cn(
                              "min-w-0 flex-1 font-mono text-[11px] leading-snug",
                              item.valueColor === "green" && "text-nova-green",
                              item.valueColor === "red" && "text-nova-red",
                              !item.valueColor && "text-nova-primary",
                            )}
                          >
                            {item.value}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Vertical: key on top, value below */
                      <div className="px-3 py-2">
                        <div className="mb-0.5 text-[10px] uppercase tracking-[0.03em] text-nova-purple/70">
                          {item.key}
                        </div>
                        {isMethod && mc ? (
                          <span
                            className={cn(
                              "inline-block rounded px-1.5 py-px font-mono text-[11px] font-semibold",
                              mc.bg,
                              mc.text,
                            )}
                          >
                            {item.value}
                          </span>
                        ) : useMultiline ? (
                          <textarea
                            readOnly
                            rows={2}
                            value={item.value}
                            className="w-full resize-none border-none bg-transparent p-0 font-mono text-[11px] leading-relaxed text-nova-primary outline-none"
                          />
                        ) : (
                          <div
                            className={cn(
                              "font-mono text-[11px] leading-snug break-all",
                              item.valueColor === "green" && "text-nova-green",
                              item.valueColor === "red" && "text-nova-red",
                              !item.valueColor && "text-nova-primary",
                            )}
                          >
                            {item.value}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </>
  );
}
