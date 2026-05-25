/**
 * TEMPORARY — delete with `src/temp/` and `convex/temp/`.
 */

import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
  enumerateBackfillDateKeys,
  formatDateKeyLabel,
} from "./backfillDates";
import "./backfill.css";

const BATCH_SIZE = 6;
const DELAY_MS = 200;

type Phase = "prompt" | "running" | "done" | "error";

function resultError(
  r: { error?: string; synced: boolean; skipped: boolean },
): string | null {
  if (r.error) return r.error;
  return null;
}

export function ExchangeRatesBackfillDialog() {
  const status = useQuery(api.temp.exchangeRatesBackfill.status);
  const syncBatch = useAction(api.temp.exchangeRatesBackfill.syncBatch);

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

    for (let i = 0; i < days.length; i += BATCH_SIZE) {
      if (cancelRef.current) break;

      const chunk = days.slice(i, i + BATCH_SIZE);
      setProgress({
        current: completed,
        total: days.length,
        label: formatDateKeyLabel(chunk[0]!),
      });

      try {
        const results = await syncBatch({ dateKeys: chunk });
        for (const r of results) {
          const err = resultError(r);
          if (err) {
            errorCount++;
            setErrors(errorCount);
            setErrorMessage(err);
          }
          completed++;
        }
      } catch (err: unknown) {
        errorCount += chunk.length;
        setErrors(errorCount);
        completed += chunk.length;
        setErrorMessage(
          err instanceof Error ? err.message : "Ошибка пакетной загрузки",
        );
      }

      setProgress({
        current: completed,
        total: days.length,
        label: formatDateKeyLabel(chunk[chunk.length - 1]!),
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
  }, [syncBatch]);

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
              Нужно загрузить официальные курсы с 1 января 2026 по сегодня (
              {status.total} дней). Это делается один раз, данные общие для всех
              пользователей.
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
            <p>Загрузка курсов… Не закрывайте вкладку.</p>
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
              {errorMessage ??
                "Не удалось загрузить курсы. Убедитесь, что Convex задеплоен с актуальным кодом."}
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
