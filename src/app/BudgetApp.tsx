import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { AccountScreen } from "../features/account/AccountScreen";
import { AddScreen } from "../features/add/AddScreen";
import { AnalyticsScreen } from "../features/analytics/AnalyticsScreen";
import { HistoryScreen } from "../features/history/HistoryScreen";
import { TableScreen } from "../features/table/TableScreen";
import { ManageNavProvider } from "../shared/context/ManageNavContext";
import { MonthProvider } from "../shared/hooks/MonthProvider";
import { useHashTabs } from "../shared/hooks/useHashTabs";
import { useSwipeTabs } from "../shared/hooks/useSwipeTabs";
import { BottomNav } from "../shared/ui/BottomNav";
import { TAB_COUNT } from "./navigation";

export function BudgetApp() {
  const bootstrapCategories = useMutation(api.categories.bootstrap);
  const bootstrapCurrencies = useMutation(api.currencies.bootstrap);
  const { activeTab, viewportRef, scrollToTab, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeTabs(TAB_COUNT);

  useHashTabs(activeTab, scrollToTab);

  useEffect(() => {
    void bootstrapCategories();
    void bootstrapCurrencies();
  }, [bootstrapCategories, bootstrapCurrencies]);

  return (
    <MonthProvider>
      <ManageNavProvider scrollToTab={scrollToTab}>
        <div className="app-shell">
          <div
            ref={viewportRef}
            className="tab-viewport"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
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
      </ManageNavProvider>
    </MonthProvider>
  );
}
