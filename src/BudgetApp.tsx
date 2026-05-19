import { useState } from "react";
import { AddSheet } from "./components/AddSheet";
import { AccountTab } from "./components/AccountTab";
import { TableTab } from "./components/TableTab";
import { useSwipeTabs } from "./hooks/useSwipeTabs";
import { currentMonth } from "./lib/budget";

const TABS = [
  { id: "table", label: "Таблица", icon: "▦" },
  { id: "account", label: "Аккаунт", icon: "◎" },
] as const;

export function BudgetApp() {
  const [month, setMonth] = useState(currentMonth);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { activeTab, viewportRef, scrollToTab, onTouchStart, onTouchEnd } =
    useSwipeTabs(2);

  return (
    <div className="app-shell">
      <div
        ref={viewportRef}
        className="tab-viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="tab-track">
          <TableTab month={month} onMonthChange={setMonth} />
          <AccountTab />
        </div>
      </div>

      {activeTab === 0 && (
        <button
          type="button"
          className="fab"
          aria-label="Добавить операцию"
          onClick={() => setSheetOpen(true)}
        >
          +
        </button>
      )}

      <nav className="tab-bar" role="tablist">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === index}
            className={`tab-bar-item ${activeTab === index ? "active" : ""}`}
            onClick={() => scrollToTab(index)}
          >
            <span className="tab-bar-icon" aria-hidden>
              {tab.icon}
            </span>
            <span className="tab-bar-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <AddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

