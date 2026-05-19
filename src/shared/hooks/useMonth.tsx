import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { currentMonth } from "../lib/dates";
import type { MonthState } from "../types/budget";

type MonthContextValue = {
  month: MonthState;
  setMonth: Dispatch<SetStateAction<MonthState>>;
};

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonth);
  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext);
  if (ctx === null) {
    throw new Error("useMonth must be used within MonthProvider");
  }
  return ctx;
}
