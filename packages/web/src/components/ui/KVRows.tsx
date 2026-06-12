import { cn } from "@/src/lib/utils";
import type { KVGroup } from "../../data/mock";

interface KVRowsProps {
  groups: KVGroup[];
}

/** 键值对列表（用于 Inspector 面板） */
export function KVRows({ groups }: KVRowsProps) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="mb-[18px]">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-nova-tertiary">
            {group.title}
          </div>
          {group.items.map((item) => (
            <div
              key={item.key}
              className="flex gap-2.5 border-b border-white/[0.02] py-[3px] font-mono text-[11px]"
            >
              <span className="min-w-[110px] shrink-0 text-nova-purple">
                {item.key}
              </span>
              <span
                className={cn(
                  "break-all text-nova-secondary",
                  item.valueColor === "green" && "text-nova-green",
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
