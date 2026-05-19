import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { AccountTab } from "./components/AccountTab";
import { AddTab } from "./components/AddTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { BottomNav } from "./components/BottomNav";
import { HistoryTab } from "./components/HistoryTab";
import { TableTab } from "./components/TableTab";
import { useSwipeTabs } from "./hooks/useSwipeTabs";
import { currentMonth } from "./lib/budget";

const TAB_COUNT = 5;

export function BudgetApp() {
  const bootstrap = useMutation(api.categories.bootstrap);
  const [month, setMonth] = useState(currentMonth);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
  const { activeTab, viewportRef, scrollToTab, onTouchStart, onTouchEnd } =
    useSwipeTabs(TAB_COUNT);

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
          <HistoryTab month={month} onMonthChange={setMonth} />
          <AddTab />
          <AnalyticsTab month={month} onMonthChange={setMonth} />
          <AccountTab />
        </div>
      </div>

      <BottomNav activeTab={activeTab} onSelect={scrollToTab} />
    </div>
  );
}
