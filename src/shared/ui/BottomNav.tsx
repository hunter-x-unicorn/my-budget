import { BOTTOM_NAV_TABS } from "../../app/navigation";

export function BottomNav({
  activeTab,
  onSelect,
}: {
  activeTab: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="bottom-nav" role="tablist" aria-label="Навигация">
      {BOTTOM_NAV_TABS.map((tab, index) => {
        const isActive = activeTab === index;
        const { Icon } = tab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            title={tab.label}
            className={`bottom-nav-item ${tab.id === "add" ? "bottom-nav-item--primary" : ""} ${isActive ? "active" : ""}`}
            onClick={() => onSelect(index)}
          >
            <span className="bottom-nav-icon-wrap">
              <Icon className="bottom-nav-icon" />
            </span>
          </button>
        );
      })}
    </nav>
  );
}
