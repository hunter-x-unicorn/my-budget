export type TransactionType = "income" | "expense" | "transfer";

export type MonthState = { year: number; month: number };

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};
