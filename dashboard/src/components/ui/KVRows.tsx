import type { KVGroup } from "../../data/mock";

interface KVRowsProps {
  groups: KVGroup[];
}

/** 键值对列表（用于 Inspector 面板） */
export function KVRows({ groups }: KVRowsProps) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="kv-group">
          <div className="kv-title">{group.title}</div>
          {group.items.map((item) => (
            <div key={item.key} className="kv-row">
              <span className="kv-key">{item.key}</span>
              <span
                className={`kv-val ${item.valueColor === "green" ? "green" : ""}`}
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
