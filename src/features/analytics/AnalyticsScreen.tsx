import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useMonth } from "../../shared/hooks/useMonth";
import { formatMoney } from "../../shared/lib/format";
import { addMoney } from "../../shared/lib/money";
import { MonthNavigator } from "../../shared/ui/MonthNavigator";
import { SummaryStrip } from "../../shared/ui/SummaryStrip";
import { BarChart } from "./charts/BarChart";
import { DailyFlowChart } from "./charts/DailyFlowChart";
import { DonutChart } from "./charts/DonutChart";
import { Sparkline } from "./charts/Sparkline";

const CHART_MODES = [
  { id: "expense-donut", label: "Расходы ◉" },
  { id: "income-donut", label: "Доходы ◉" },
  { id: "expense-bars", label: "Расходы ▮" },
  { id: "income-bars", label: "Доходы ▮" },
  { id: "tags", label: "Теги" },
  { id: "daily", label: "По дням" },
] as const;

type ChartMode = (typeof CHART_MODES)[number]["id"];

export function AnalyticsScreen() {
  const { month } = useMonth();
  const data = useQuery(api.transactions.analytics.bundle, month);
  const [mode, setMode] = useState<ChartMode>("expense-donut");

  const summary = data?.summary;
  const savingsRate = useMemo(() => {
    const inc = summary?.income ?? 0;
    if (inc <= 0) return 0;
    return Math.round(((inc - (summary?.expense ?? 0)) / inc) * 100);
  }, [summary]);

  const cumulativeBalance = useMemo(() => {
    let run = 0;
    return (data?.dailyBalance ?? []).map((d) => {
      run = addMoney(run, d.income);
      run = addMoney(run, -d.expense);
      return run;
    });
  }, [data?.dailyBalance]);

  const topExpense = data?.expenseByCategory[0];
  const topTag = data?.expenseByTag[0];

  const daysWithActivity = useMemo(
    () =>
      (data?.dailyBalance ?? []).filter((d) => d.income > 0 || d.expense > 0).length,
    [data?.dailyBalance],
  );

  return (
    <div className="tab-panel analytics-tab">
      <header className="analytics-hero">
        <h2 className="panel-title">Аналитика</h2>
        <p className="analytics-subtitle">Сводка месяца и интерактивные графики</p>
      </header>

      <MonthNavigator />
      <SummaryStrip summary={summary} />

      <div className="analytics-kpi-row">
        <article className="analytics-kpi">
          <span>Норма сбережений</span>
          <strong className={savingsRate >= 0 ? "positive" : "negative"}>
            {savingsRate}%
          </strong>
        </article>
        <article className="analytics-kpi">
          <span>Топ расход</span>
          <strong>{topExpense?.name ?? "—"}</strong>
          {topExpense && (
            <small>{formatMoney(topExpense.value, true)}</small>
          )}
        </article>
        <article className="analytics-kpi">
          <span>Топ тег</span>
          <strong>{topTag?.name ?? "—"}</strong>
          {topTag && <small>{formatMoney(topTag.value, true)}</small>}
        </article>
      </div>

      <section className="analytics-card analytics-card--spark">
        <h3>Накопленный баланс за месяц</h3>
        <Sparkline values={cumulativeBalance} stroke="var(--color-income)" />
      </section>

      <div className="analytics-mode-picker" role="tablist" aria-label="Тип графика">
        {CHART_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`analytics-mode-btn ${mode === m.id ? "analytics-mode-btn--active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <section className="analytics-card analytics-card--main">
        {mode === "expense-donut" && (
          <>
            <h3>Структура расходов</h3>
            <DonutChart slices={data?.expenseByCategory ?? []} accent="expense" />
          </>
        )}
        {mode === "income-donut" && (
          <>
            <h3>Структура доходов</h3>
            <DonutChart slices={data?.incomeByCategory ?? []} accent="income" />
          </>
        )}
        {mode === "expense-bars" && (
          <>
            <h3>Расходы по категориям</h3>
            <BarChart slices={data?.expenseByCategory ?? []} accent="expense" />
          </>
        )}
        {mode === "income-bars" && (
          <>
            <h3>Доходы по категориям</h3>
            <BarChart slices={data?.incomeByCategory ?? []} accent="income" />
          </>
        )}
        {mode === "tags" && (
          <>
            <h3>Расходы по тегам</h3>
            <BarChart
              slices={data?.expenseByTag ?? []}
              accent="neutral"
              maxItems={12}
            />
          </>
        )}
        {mode === "daily" && (
          <>
            <h3>Доходы и расходы по дням</h3>
            <DailyFlowChart points={data?.dailyBalance ?? []} />
          </>
        )}
      </section>

      <section className="analytics-card analytics-card--mini">
        <h3>Мини-обзор</h3>
        <div className="analytics-mini-grid">
          <div className="analytics-mini-cell">
            <span>Категорий расхода</span>
            <strong>{data?.expenseByCategory.length ?? 0}</strong>
          </div>
          <div className="analytics-mini-cell">
            <span>Категорий дохода</span>
            <strong>{data?.incomeByCategory.length ?? 0}</strong>
          </div>
          <div className="analytics-mini-cell">
            <span>Активных тегов</span>
            <strong>{data?.expenseByTag.length ?? 0}</strong>
          </div>
          <div className="analytics-mini-cell">
            <span>Дней с операциями</span>
            <strong>{daysWithActivity}</strong>
          </div>
        </div>
      </section>

      <section className="analytics-card">
        <h3>Расходы — полный список</h3>
        <BarChart slices={data?.expenseByCategory ?? []} accent="expense" maxItems={20} />
      </section>
    </div>
  );
}
