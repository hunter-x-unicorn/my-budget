/**
 * TEMPORARY — delete with `src/temp/` and `convex/temp/`.
 */

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { backfillApi } from "./backfillApi";
import {
  enumerateBackfillDateKeys,
  formatDateKeyLabel,
} from "./backfillDates";
import { fetchNbrbRatesForDay } from "./nbrbClient";
import "./backfill.css";

const DELAY_MS = 80;

type Phase = "prompt" | "running" | "done" | "error";

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function ExchangeRatesBackfillDialog() {
  const status = useQuery(backfillApi.status);
  const saveDayRates = useMutation(backfillApi.saveDayRates);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [errors, setErrors] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (status?.needed) setOpen(true);
    if (status && !status.needed) setOpen(false);
  }, [status?.needed, status]);

  const runBackfill = useCallback(async () => {
    const days = enumerateBackfillDateKeys();
    cancelRef.current = false;
    setPhase("running");
    setErrors(0);
    setErrorMessage(null);
    setProgress({ current: 0, total: days.length, label: "" });

    let completed = 0;
    let errorCount = 0;

    for (const dateKey of days) {
      if (cancelRef.current) break;

      setProgress({
        current: completed,
        total: days.length,
        label: formatDateKeyLabel(dateKey),
      });

      try {
        const { dateKey: resolvedKey, rates } = await fetchNbrbRatesForDay(dateKey);
        await saveDayRates({ dateKey: resolvedKey, rates });
      } catch (err: unknown) {
        errorCount++;
        setErrors(errorCount);
        setErrorMessage(formatError(err));
      }

      completed++;
      setProgress({
        current: completed,
        total: days.length,
        label: formatDateKeyLabel(dateKey),
      });

      if (completed < days.length && !cancelRef.current) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    if (cancelRef.current) {
      setPhase("prompt");
      return;
    }

    if (errorCount >= days.length) {
      setPhase("error");
      return;
    }

    setPhase("done");
  }, [saveDayRates]);

  if (!open || status === undefined) return null;

  const percent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div
      className="backfill-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backfill-title"
    >
      <div className="backfill-dialog">
        <h2 id="backfill-title">Курсы валют НБРБ</h2>

        {phase === "prompt" && (
          <>
            <p>
              Загрузим официальные курсы с 1 января 2026 по сегодня ({status.total}{" "}
              дней). Запросы к НБРБ идут из браузера, в Convex только сохранение.
            </p>
            <p className="backfill-stats">
              Уже в базе: {status.synced} из {status.total}
            </p>
            <div className="backfill-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void runBackfill()}
              >
                Получить курсы
              </button>
            </div>
          </>
        )}

        {phase === "running" && (
          <>
            <p>Загрузка… Не закрывайте вкладку.</p>
            <div className="backfill-progress">
              <div className="backfill-progress-track">
                <div
                  className="backfill-progress-fill"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="backfill-progress-label">
                {progress.current} / {progress.total} ({percent}%) —{" "}
                {progress.label}
              </p>
            </div>
            {errorMessage && <p className="backfill-error">{errorMessage}</p>}
            {errors > 0 && (
              <p className="backfill-error">Дней с ошибкой: {errors}</p>
            )}
            <div className="backfill-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  cancelRef.current = true;
                }}
              >
                Прервать
              </button>
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            <p>
              Готово. Обработано {progress.total} дней
              {errors > 0 ? `, с ошибкой: ${errors}` : ""}.
            </p>
            <div className="backfill-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </>
        )}

        {phase === "error" && (
          <>
            <p className="backfill-error">
              {errorMessage ?? "Не удалось загрузить курсы"}
            </p>
            <p className="backfill-stats">Ошибок: {errors}</p>
            <div className="backfill-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void runBackfill()}
              >
                Повторить
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
