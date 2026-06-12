import {
  ACTIVITY_ITEMS,
  ACTIVITY_SETTINGS,
  type ActivityItem,
} from "../../data/mock";
import { Panel } from "../ui/Panel";

interface ActivityBarProps {
  activeId: string;
  onChange: (id: string) => void;
}

/** 左侧图标导航栏 */
export function ActivityBar({ activeId, onChange }: ActivityBarProps) {
  return (
    <Panel className="sidebar-left">
      <div className="activity-bar">
        {ACTIVITY_ITEMS.map((item) => (
          <IconButton
            key={item.id}
            item={item}
            active={activeId === item.id}
            onClick={() => onChange(item.id)}
          />
        ))}
        <div className="mt-auto mb-3">
          <IconButton
            item={ACTIVITY_SETTINGS}
            active={false}
            onClick={() => {}}
          />
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
  return (
    <button
      type="button"
      title={item.label}
      onClick={onClick}
      className={`icon-btn ${active ? "active" : ""}`}
    >
      <item.icon size={16} />
    </button>
  );
}
