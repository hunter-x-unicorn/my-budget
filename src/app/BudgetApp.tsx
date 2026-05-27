import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { AccountScreen } from "../features/account/AccountScreen";
import { AddScreen } from "../features/add/AddScreen";
import { AnalyticsScreen } from "../features/analytics/AnalyticsScreen";
import { HistoryScreen } from "../features/history/HistoryScreen";
import { TableScreen } from "../features/table/TableScreen";
import { HistoryEditProvider, useHistoryEdit } from "../shared/context/HistoryEditContext";
import { ManageNavProvider, useManageNav } from "../shared/context/ManageNavContext";
import { MonthProvider } from "../shared/hooks/MonthProvider";
import { useHashTabs } from "../shared/hooks/useHashTabs";
import { useDailyExchangeRatesSync } from "../shared/hooks/useDailyExchangeRatesSync";
import { useSwipeTabs } from "../shared/hooks/useSwipeTabs";
/* TEMP: exchange-rates backfill — delete next line + src/temp/ + convex/temp/ */
import { ExchangeRatesBackfillDialog } from "../temp/ExchangeRatesBackfillDialog";
import { BottomNav } from "../shared/ui/BottomNav";
import { TAB_COUNT, TAB_INDEX } from "./navigation";

export function BudgetApp() {
  const swipe = useSwipeTabs(TAB_COUNT);

  return (
    <MonthProvider>
      <HistoryEditProvider>
        <ManageNavProvider scrollToTab={swipe.scrollToTab}>
          <BudgetAppContent swipe={swipe} />
        </ManageNavProvider>
      </HistoryEditProvider>
    </MonthProvider>
  );
}

function BudgetAppContent({
  swipe,
}: {
  swipe: ReturnType<typeof useSwipeTabs>;
}) {
  const bootstrapCategories = useMutation(api.categories.bootstrap);
  const bootstrapCurrencies = useMutation(api.currencies.bootstrap);
  const bootstrapAccounts = useMutation(api.accounts.bootstrap);
  const syncSnapshots = useMutation(api.accounts.syncSnapshots);
  const { subview, closeSubview } = useManageNav();
  const { editingTx } = useHistoryEdit();
  const { activeTab, viewportRef, scrollToTab, onTouchStart, onTouchMove, onTouchEnd } =
    swipe;

  useHashTabs(activeTab, scrollToTab);
  useDailyExchangeRatesSync();

  useEffect(() => {
    void bootstrapCategories();
    void bootstrapCurrencies();
    void bootstrapAccounts();
    void syncSnapshots();
  }, [bootstrapCategories, bootstrapCurrencies, bootstrapAccounts, syncSnapshots]);

  const handleNavSelect = (index: number) => {
    closeSubview();
    scrollToTab(index);
  };

  return (
    <div className="app-shell">
      <div
        ref={viewportRef}
        className="tab-viewport"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={subview === null ? onTouchEnd : undefined}
      >
        <div className="tab-track">
          <TableScreen />
          <HistoryScreen isActive={activeTab === TAB_INDEX.history} />
          <AddScreen />
          <AnalyticsScreen />
          <AccountScreen />
        </div>
      </div>

      {editingTx === null && (
        <BottomNav activeTab={activeTab} onSelect={handleNavSelect} />
      )}

      {/* TEMP: backfill dialog */}
      <ExchangeRatesBackfillDialog />
    </div>
  );
}
