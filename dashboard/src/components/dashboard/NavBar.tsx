import { Search } from "lucide-react";
import {
  ACTIVITY_ITEMS,
  ACTIVITY_SETTINGS,
  type ActivityItem,
  type DomainItem,
  MOCK_DOMAINS,
} from "../../data/mock";
import { Panel } from "../ui/Panel";

interface NavBarProps {
  activeId: string;
  onChange: (id: string) => void;
  domainList?: DomainItem[];
  selectedDomain?: string;
  onSelectDomain?: (name: string) => void;
}

/** 左侧导航栏：图标栏 + 域名侧栏共用一个玻璃面板 */
export function NavBar({
  activeId,
  onChange,
  domainList = MOCK_DOMAINS,
  selectedDomain = MOCK_DOMAINS[0].name,
  onSelectDomain,
}: NavBarProps) {
  return (
    <Panel className="!flex-row flex w-[280px] shrink-0">
      {/* 图标导航 */}
      <div className="flex  flex-col  w-[54px] items-center gap-5 border-white/[0.08] border-r pt-5">
        {ACTIVITY_ITEMS.map((item) => (
          <IconButton
            key={item.id}
            item={item}
            active={activeId === item.id}
            onClick={() => onChange(item.id)}
          />
        ))}
        <div className="mt-auto mb-4">
          <IconButton
            item={ACTIVITY_SETTINGS}
            active={false}
            onClick={() => {}}
          />
        </div>
      </div>

      {/* 域名侧栏 */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-[54px] items-center border-white/[0.08] border-b px-4 font-semibold text-[11px] text-nova-secondary uppercase tracking-[0.02em]">
          mini-switch
        </div>

        <div className="m-3 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3.5 py-1.5">
          <Search size={12} className="text-nova-tertiary" />
          <input
            type="text"
            placeholder="Filter domain..."
            className="w-full border-none bg-transparent font-[inherit] text-nova-primary text-xs outline-none placeholder:text-nova-tertiary"
          />
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2">
          {domainList.map((domain, i) => {
            const isAllTraffic = i === 0;
            const isSelected =
              "active" in domain
                ? domain.active
                : domain.name === selectedDomain;

            const color = domain.color ?? "var(--bg-ambient-1)";

            return (
              <button
                type="button"
                key={domain.name}
                onClick={() => onSelectDomain?.(domain.name)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded p-2 text-left text-xs ${
                  isAllTraffic || isSelected
                    ? "text-nova-primary"
                    : "text-nova-secondary"
                } ${
                  isSelected && !isAllTraffic
                    ? "bg-white/5"
                    : "hover:bg-white/5"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={12}
                  height={12}
                  style={{ color }}
                  aria-hidden="true"
                >
                  {isAllTraffic ? (
                    <path
                      d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
                {domain.name}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function IconButton({
  item,
  active,
  onClick,
}: {
  item: ActivityItem;
  active: boolean;
  onClick: () => void;
}) {
  const baseClasses =
    "w-9 h-9 rounded-[10px] flex items-center justify-center text-nova-secondary cursor-pointer transition-all duration-200";
  const activeClasses = active
    ? "text-nova-primary bg-white/[0.08] shadow-[0_0_10px_rgba(0,0,0,0.2)]"
    : "hover:text-nova-primary hover:bg-white/[0.03]";

  return (
    <button
      type="button"
      title={item.label}
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      <item.icon size={18} />
    </button>
  );
}
