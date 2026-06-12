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
          <div className="text-[10px] text-nova-tertiary uppercase mb-1.5 font-semibold tracking-[0.05em]">
            {group.title}
          </div>
          {group.items.map((item) => (
            <div
              key={item.key}
              className="flex gap-2.5 py-[3px] font-mono text-[11px] border-b border-white/[0.02]"
            >
              <span className="text-nova-purple shrink-0 min-w-[110px]">
                {item.key}
              </span>
              <span
                className={`text-nova-secondary break-all ${item.valueColor === "green" ? "text-nova-green" : ""}`}
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
