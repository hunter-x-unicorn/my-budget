import { useState, type ReactNode } from "react";
import { currentMonth } from "../lib/dates";
import { MonthContext } from "./monthContext";

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonth);
  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  );
}
