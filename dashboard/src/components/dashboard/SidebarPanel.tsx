import { Search } from "lucide-react";
import { type DomainItem, MOCK_DOMAINS } from "../../data/mock";

interface SidebarPanelProps {
  domainList?: DomainItem[];
  selectedDomain?: string;
  onSelectDomain?: (name: string) => void;
}

/** 域名过滤侧边栏 */
export function SidebarPanel({
  domainList = MOCK_DOMAINS,
  selectedDomain = MOCK_DOMAINS[0].name,
  onSelectDomain,
}: SidebarPanelProps) {
  return (
    <div className="sidebar-content">
      <div className="sidebar-header">mini-switch</div>

      <div className="pill-input-wrap">
        <Search size={12} style={{ color: "var(--text-tertiary)" }} />
        <input type="text" placeholder="Filter domain..." />
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-1.5">
        {domainList.map((domain, i) => {
          const isAllTraffic = i === 0;
          const isSelected =
            "active" in domain ? domain.active : domain.name === selectedDomain;

          return (
            <button
              type="button"
              key={domain.name}
              onClick={() => onSelectDomain?.(domain.name)}
              className={`flex w-full cursor-pointer items-center gap-2 rounded p-1.5 text-left text-xs ${isAllTraffic || isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}
              ${isSelected && !isAllTraffic ? "bg-white/5" : "hover:bg-white/5"}
            `}
            >
              <svg
                viewBox="0 0 24 24"
                width={12}
                height={12}
                style={{ color: domain.color ?? "var(--text-secondary)" }}
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
  );
}
