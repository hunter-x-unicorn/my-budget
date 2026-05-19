import { createContext, type Dispatch, type SetStateAction } from "react";
import type { MonthState } from "../types/budget";

export type MonthContextValue = {
  month: MonthState;
  setMonth: Dispatch<SetStateAction<MonthState>>;
};

export const MonthContext = createContext<MonthContextValue | null>(null);
