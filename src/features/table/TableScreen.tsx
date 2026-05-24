import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMonth } from "../../shared/hooks/useMonth";
import { MonthNavigator } from "../../shared/ui/MonthNavigator";
import { ExcelGrid } from "./ExcelGrid";

export function TableScreen() {
  const { month } = useMonth();
  const bundle = useQuery(api.transactions.queries.monthBundle, month);
  const dates = bundle?.table.dates ?? [];

  return (
    <div className="tab-panel table-tab">
      <MonthNavigator titleAs="h2" />
      <ExcelGrid
        year={month.year}
        month={month.month}
        dates={dates}
        cells={bundle?.table.cells ?? []}
      />
    </div>
  );
}
