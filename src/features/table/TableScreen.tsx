import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMonth } from "../../shared/hooks/useMonth";
import {
  formatCellAmount,
  formatMoney,
  formatTableDay,
} from "../../shared/lib/budget";
import { MonthNavigator } from "../../shared/ui/MonthNavigator";
import { SummaryStrip } from "../../shared/ui/SummaryStrip";

type Category = {
  _id: Id<"categories">;
  name: string;
  type: "income" | "expense";
  order: number;
};

export function TableScreen() {
  const { month } = useMonth();
  const categories = useQuery(api.categories.list);
  const bundle = useQuery(api.transactions.queries.monthBundle, month);
  const summary = bundle?.summary;
  const table = bundle?.table;

  const expenseCategories = useMemo(
    () => categories?.filter((c) => c.type === "expense") ?? [],
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories?.filter((c) => c.type === "income") ?? [],
    [categories],
  );

  const dates = table?.dates ?? [];

  const cellMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const cell of table?.cells ?? []) {
      map.set(`${cell.categoryId}:${cell.date}`, {
        income: cell.income,
        expense: cell.expense,
      });
    }
    return map;
  }, [table?.cells]);

  function cellFor(categoryId: Id<"categories">, dk: string) {
    return cellMap.get(`${categoryId}:${dk}`);
  }

  function renderCategoryRow(cat: Category) {
    return (
      <tr key={cat._id}>
        <th scope="row" className={`matrix-cat matrix-cat--${cat.type}`}>
          <span className="matrix-cat-icon" aria-hidden>
            {cat.type === "income" ? "↑" : "↓"}
          </span>
          {cat.name}
        </th>
        {dates.map((dk) => {
          const cell = cellFor(cat._id, dk);
          const text = cell
            ? formatCellAmount(cell.income, cell.expense)
            : "";
          const hasIncome = (cell?.income ?? 0) > 0;
          const hasExpense = (cell?.expense ?? 0) > 0;
          return (
            <td
              key={dk}
              className={`matrix-cell ${hasIncome ? "has-income" : ""} ${hasExpense ? "has-expense" : ""}`}
              title={
                cell
                  ? [
                      hasIncome && `Доход: ${formatMoney(cell.income)}`,
                      hasExpense && `Расход: ${formatMoney(cell.expense)}`,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : undefined
              }
            >
              {text && (
                <span className="matrix-cell-text">
                  {text.split("\n").map((line, i) => (
                    <span
                      key={i}
                      className={
                        line.startsWith("+")
                          ? "cell-income"
                          : line.startsWith("−")
                            ? "cell-expense"
                            : ""
                      }
                    >
                      {line}
                    </span>
                  ))}
                </span>
              )}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="tab-panel table-tab">
      <MonthNavigator titleAs="h2" />
      <SummaryStrip summary={summary} compact />

      <div className="matrix-wrap">
        {categories === undefined && (
          <p className="empty-state">Загрузка…</p>
        )}

        {categories !== undefined && (
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="matrix-corner">Категория</th>
                {dates.map((dk) => {
                  const [, , dayStr] = dk.split("-");
                  return (
                    <th key={dk} className="matrix-date">
                      {formatTableDay(month.year, month.month, Number(dayStr))}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {expenseCategories.length > 0 && (
                <tr className="matrix-section">
                  <td colSpan={dates.length + 1}>Расходы</td>
                </tr>
              )}
              {expenseCategories.map(renderCategoryRow)}
              {incomeCategories.length > 0 && (
                <tr className="matrix-section">
                  <td colSpan={dates.length + 1}>Доходы</td>
                </tr>
              )}
              {incomeCategories.map(renderCategoryRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
