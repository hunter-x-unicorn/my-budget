import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { AccountScreen } from "../features/account/AccountScreen";
import { AddScreen } from "../features/add/AddScreen";
import { AnalyticsScreen } from "../features/analytics/AnalyticsScreen";
import { HistoryScreen } from "../features/history/HistoryScreen";
import { TableScreen } from "../features/table/TableScreen";
import { MonthProvider } from "../shared/hooks/useMonth";
import { useSwipeTabs } from "../shared/hooks/useSwipeTabs";
import { BottomNav } from "../shared/ui/BottomNav";
import { TAB_COUNT } from "./navigation";

export function BudgetApp() {
  const bootstrap = useMutation(api.categories.bootstrap);
  const { activeTab, viewportRef, scrollToTab, onTouchStart, onTouchEnd } =
    useSwipeTabs(TAB_COUNT);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <MonthProvider>
      <div className="app-shell">
        <div
          ref={viewportRef}
          className="tab-viewport"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="tab-track">
            <TableScreen />
            <HistoryScreen />
            <AddScreen />
            <AnalyticsScreen />
            <AccountScreen />
          </div>
        </div>

        <BottomNav activeTab={activeTab} onSelect={scrollToTab} />
      </div>
    </MonthProvider>
  );
}
