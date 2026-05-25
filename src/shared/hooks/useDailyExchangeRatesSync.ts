import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";

/** Once per day: fetch all NBRB rates into the global DB (idempotent on server). */
export function useDailyExchangeRatesSync() {
  const status = useQuery(api.exchangeRates.todayStatus);
  const syncToday = useAction(api.exchangeRatesSync.syncTodayIfNeeded);
  const started = useRef(false);

  useEffect(() => {
    if (status === undefined || status.ready || started.current) return;
    started.current = true;
    void syncToday();
  }, [status, syncToday]);
}
