import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Sparkline } from "../analytics/charts/Sparkline";
import { formatMoney } from "../../shared/lib/format";
import { useMutationRunner } from "./useMutationRunner";

type CurrencyRatesViewProps = {
  onBack: () => void;
};

function formatDateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${d}.${m}.${year}`;
}

export function CurrencyRatesView({ onBack }: CurrencyRatesViewProps) {
  const currencies = useQuery(api.currencies.list);
  const codesInDb = useQuery(api.exchangeRates.codesInDatabase);
  const addAllFromDb = useMutation(api.currencies.addAllFromExchangeDatabase);
  const { error, run } = useMutationRunner();

  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const chartCodes = useMemo(() => {
    const userCodes = currencies?.map((c) => c.code) ?? [];
    const dbCodes = codesInDb?.map((c) => c.code) ?? [];
    const set = new Set([...userCodes, ...dbCodes]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [currencies, codesInDb]);

  const activeCode =
    selectedCode ?? chartCodes[0] ?? currencies?.[0]?.code ?? null;

  const history = useQuery(
    api.exchangeRates.rateHistory,
    activeCode ? { code: activeCode, limit: 45 } : "skip",
  );

  const chartValues = useMemo(
    () => history?.map((p) => p.rate / p.scale) ?? [],
    [history],
  );

  const latest = history?.[history.length - 1];
  const dbLatest = codesInDb?.find((c) => c.code === activeCode);

  return (
    <div className="account-editor">
      <header className="account-editor-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="account-editor-title">Валюта</h2>
      </header>

      <p className="account-editor-hint">
        Официальные курсы НБРБ из базы приложения. Выберите валюту для графика.
      </p>

      {error && <p className="error">{error}</p>}

      <button
        type="button"
        className="btn-secondary btn-secondary--full"
        onClick={() => void run(() => addAllFromDb({}))}
      >
        Добавить все валюты из базы курсов
      </button>

      {chartCodes.length === 0 ? (
        <p className="empty-state">
          Курсов в базе пока нет. Загрузите курсы НБРБ при первом входе.
        </p>
      ) : (
        <>
          <div className="currency-rates-chips" role="tablist">
            {chartCodes.map((code) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={activeCode === code}
                className={`currency-rates-chip ${activeCode === code ? "currency-rates-chip--active" : ""}`}
                onClick={() => setSelectedCode(code)}
              >
                {code}
              </button>
            ))}
          </div>

          {activeCode && (
            <section className="analytics-card analytics-card--spark currency-rates-chart">
              <h3>
                {activeCode}
                {latest && (
                  <span className="currency-rates-latest">
                    {" "}
                    {formatMoney(latest.rate / latest.scale, false, "BYN")} за{" "}
                    {latest.scale > 1 ? `${latest.scale} ` : ""}
                    {activeCode}
                  </span>
                )}
              </h3>
              {!latest && dbLatest && (
                <p className="form-hint">
                  Сегодня: {dbLatest.rate} BYN за {dbLatest.scale} {activeCode}
                </p>
              )}
              <Sparkline values={chartValues} stroke="var(--color-primary-start)" />
              {history && history.length > 0 && (
                <p className="currency-rates-range">
                  {formatDateKeyLabel(history[0]!.dateKey)} —{" "}
                  {formatDateKeyLabel(history[history.length - 1]!.dateKey)}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
