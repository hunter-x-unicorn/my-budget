import { useContext } from "react";
import { MonthContext } from "./monthContext";

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (ctx === null) {
    throw new Error("useMonth must be used within MonthProvider");
  }
  return ctx;
}
