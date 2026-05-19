import { currentMonth, shiftMonth } from "../lib/dates";
import { formatMonthLabel } from "../lib/format";
import { useMonth } from "../hooks/useMonth";

type MonthNavigatorProps = {
  /** table uses h2; history/analytics use labeled paragraph */
  titleAs?: "h2" | "label";
};

export function MonthNavigator({ titleAs = "label" }: MonthNavigatorProps) {
  const { month, setMonth } = useMonth();
  const isCurrentMonth =
    month.year === currentMonth().year &&
    month.month === currentMonth().month;

  const label = formatMonthLabel(month.year, month.month);

  return (
    <section className="month-nav">
      <button
        type="button"
        className="btn-icon"
        onClick={() => setMonth(shiftMonth(month.year, month.month, -1))}
        aria-label="Предыдущий месяц"
      >
        ‹
      </button>
      {titleAs === "h2" ? (
        <h2>{label}</h2>
      ) : (
        <p className="month-nav-label">{label}</p>
      )}
      <button
        type="button"
        className="btn-icon"
        onClick={() => setMonth(shiftMonth(month.year, month.month, 1))}
        aria-label="Следующий месяц"
        disabled={isCurrentMonth}
      >
        ›
      </button>
    </section>
  );
}
