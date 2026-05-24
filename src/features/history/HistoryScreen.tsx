import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useHistoryEdit, type HistoryEditTx } from "../../shared/context/HistoryEditContext";
import { useMonth } from "../../shared/hooks/useMonth";
import {
  formatDayHeader,
  formatListTime,
  formatMoney,
  formatMonthLabel,
} from "../../shared/lib/budget";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { MonthNavigator } from "../../shared/ui/MonthNavigator";
import {
  TransactionForm,
  type TransactionFormValues,
} from "../../shared/ui/TransactionForm";
import { TransactionFormSheet } from "../../shared/ui/TransactionFormSheet";

type TxRow = HistoryEditTx & {
  tagNames?: string[];
};

export function HistoryScreen({ isActive }: { isActive: boolean }) {
  const { month } = useMonth();
  const transactions = useQuery(api.transactions.queries.historyList);
  const remove = useMutation(api.transactions.mutations.remove);
  const update = useMutation(api.transactions.mutations.update);
  const { editingTx, setEditingTx } = useHistoryEdit();

  const [deleteTarget, setDeleteTarget] = useState<TxRow | null>(null);
  const monthRefs = useRef<Map<string, HTMLElement>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const monthMap = new Map<
      string,
      { key: string; label: string; days: { key: string; label: string; items: TxRow[] }[] }
    >();

    for (const t of (transactions ?? []) as TxRow[]) {
      const d = new Date(t.date);
      const mKey = `${d.getFullYear()}-${d.getMonth()}`;
      const dayKey = d.toDateString();

      if (!monthMap.has(mKey)) {
        monthMap.set(mKey, {
          key: mKey,
          label: formatMonthLabel(d.getFullYear(), d.getMonth()),
          days: [],
        });
      }
      const monthGroup = monthMap.get(mKey)!;
      let dayGroup = monthGroup.days.find((g) => g.key === dayKey);
      if (!dayGroup) {
        dayGroup = { key: dayKey, label: formatDayHeader(t.date), items: [] };
        monthGroup.days.push(dayGroup);
      }
      dayGroup.items.push(t);
    }

    return [...monthMap.values()];
  }, [transactions]);

  useEffect(() => {
    if (!isActive) return;
    const panel = panelRef.current;
    const targetKey = `${month.year}-${month.month}`;
    const el = monthRefs.current.get(targetKey);
    if (!panel || !el) return;

    const sticky = panel.querySelector(".history-sticky-head");
    const offset = sticky instanceof HTMLElement ? sticky.offsetHeight : 0;
    panel.scrollTo({
      top: Math.max(0, el.offsetTop - offset - 8),
      behavior: "smooth",
    });
  }, [month, isActive, grouped.length]);

  const showEditSheet = isActive && editingTx !== null;

  return (
    <div className="tab-panel history-tab" ref={panelRef}>
      <div className="history-sticky-head">
        <h2 className="panel-title">История</h2>
        <MonthNavigator />
      </div>

      {transactions === undefined && <p className="empty-state">Загрузка…</p>}

      {transactions?.length === 0 && (
        <p className="empty-state">Операций пока нет.</p>
      )}

      {grouped.map((monthGroup) => (
        <section
          key={monthGroup.key}
          className="history-month"
          ref={(el) => {
            if (el) monthRefs.current.set(monthGroup.key, el);
            else monthRefs.current.delete(monthGroup.key);
          }}
          data-month={monthGroup.key}
        >
          <h3 className="history-month-label">{monthGroup.label}</h3>
          {monthGroup.days.map((group) => (
            <div key={group.key} className="day-group">
              <p className="day-label">{group.label}</p>
              <ul className="tx-list">
                {group.items.map((tx) => (
                  <li key={tx._id} className="tx-item">
                    <button
                      type="button"
                      className="tx-main"
                      onClick={() => setEditingTx(tx)}
                    >
                      <span className={`tx-icon ${tx.type}`} aria-hidden>
                        {tx.type === "income" ? "↑" : tx.type === "transfer" ? "⇄" : "↓"}
                      </span>
                      <div className="tx-info">
                        <span className="tx-category">{tx.categoryName}</span>
                        {tx.tagNames && tx.tagNames.length > 0 && (
                          <span className="tx-note">{tx.tagNames.join(" · ")}</span>
                        )}
                        {tx.note && <span className="tx-note">{tx.note}</span>}
                        <span className="tx-time">{formatListTime(tx.date)}</span>
                      </div>
                      <span className={`tx-amount ${tx.type}`}>
                        {tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "−"}
                        {formatMoney(tx.amount, false, tx.currencyCode)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="tx-delete"
                      aria-label="Удалить"
                      onClick={() => setDeleteTarget(tx)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      {showEditSheet && editingTx && (
        <TransactionFormSheet
          title="Редактировать"
          subtitle={editingTx.categoryName}
          onClose={() => setEditingTx(null)}
        >
          <TransactionForm
            initial={{
              type: editingTx.type,
              amount: editingTx.amount,
              categoryId: editingTx.categoryId,
              currencyId: editingTx.currencyId,
              tagIds: editingTx.tagIds,
              note: editingTx.note,
              date: editingTx.date,
            }}
            submitLabel="Сохранить"
            onCancel={() => setEditingTx(null)}
            onSubmit={async (values: TransactionFormValues) => {
              await update({
                id: editingTx._id,
                type: values.type,
                amount: values.amount,
                categoryId: values.categoryId,
                currencyId: values.currencyId,
                tagIds: values.tagIds,
                note: values.note,
                date: values.date,
              });
              setEditingTx(null);
            }}
          />
        </TransactionFormSheet>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Удалить операцию?"
        message={
          deleteTarget
            ? `«${deleteTarget.categoryName}» на ${formatMoney(deleteTarget.amount, false, deleteTarget.currencyCode)} будет удалена без возможности восстановления.`
            : ""
        }
        confirmLabel="Удалить"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void remove({ id: deleteTarget._id });
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
