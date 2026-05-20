import type { Id } from "../_generated/dataModel";
import type { Doc } from "../_generated/dataModel";
import { dayKeyFromTimestamp, datesInMonth } from "../lib/dates";

export type TableCell = {
  categoryId: Id<"categories">;
  date: string;
  income: number;
  expense: number;
};

type TransactionWithCategory = Doc<"transactions"> & {
  categoryId: Id<"categories">;
};

export function buildTableForMonth(
  year: number,
  month: number,
  rows: TransactionWithCategory[],
): { dates: string[]; cells: TableCell[] } {
  const dates = datesInMonth(year, month);
  const aggregated = new Map<string, TableCell>();

  for (const row of rows) {
    const date = dayKeyFromTimestamp(row.date);
    const mapKey = `${row.categoryId}|${date}`;
    const cell = aggregated.get(mapKey) ?? {
      categoryId: row.categoryId,
      date,
      income: 0,
      expense: 0,
    };
    if (row.type === "income") cell.income += row.amount;
    else if (row.type === "expense") cell.expense += row.amount;
    aggregated.set(mapKey, cell);
  }

  return { dates, cells: [...aggregated.values()] };
}

export function buildSummary(rows: Doc<"transactions">[]) {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    if (row.type === "income") income += row.amount;
    else if (row.type === "expense") expense += row.amount;
  }
  return { income, expense, balance: income - expense };
}
