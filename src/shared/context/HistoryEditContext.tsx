import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export type HistoryEditTx = {
  _id: Id<"transactions">;
  type: "income" | "expense" | "transfer";
  amount: number;
  categoryId?: Id<"categories">;
  categoryName: string;
  currencyId?: Id<"currencies">;
  tagIds?: Id<"tags">[];
  note?: string;
  date: number;
};

type HistoryEditContextValue = {
  editingTx: HistoryEditTx | null;
  setEditingTx: (tx: HistoryEditTx | null) => void;
  clearEditing: () => void;
};

const HistoryEditContext = createContext<HistoryEditContextValue | null>(null);

export function HistoryEditProvider({ children }: { children: ReactNode }) {
  const [editingTx, setEditingTx] = useState<HistoryEditTx | null>(null);
  const clearEditing = useCallback(() => setEditingTx(null), []);

  const value = useMemo(
    () => ({ editingTx, setEditingTx, clearEditing }),
    [editingTx, clearEditing],
  );

  return (
    <HistoryEditContext.Provider value={value}>{children}</HistoryEditContext.Provider>
  );
}

export function useHistoryEdit() {
  const ctx = useContext(HistoryEditContext);
  if (ctx === null) {
    throw new Error("useHistoryEdit must be used within HistoryEditProvider");
  }
  return ctx;
}
