import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  fromDateInputValue,
  toDateInputValue,
  type TransactionType,
} from "../lib/budget";

export type TransactionFormValues = {
  type: TransactionType;
  amount: number;
  categoryId: Id<"categories">;
  note?: string;
  date: number;
};

type TransactionFormInitial = Omit<TransactionFormValues, "categoryId"> & {
  categoryId?: Id<"categories">;
};

type TransactionFormProps = {
  initial: TransactionFormInitial;
  submitLabel: string;
  pendingLabel?: string;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function TransactionForm({
  initial,
  submitLabel,
  pendingLabel = "Сохранение…",
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const categories = useQuery(api.categories.list);

  const [type, setType] = useState<TransactionType>(initial.type);
  const [amount, setAmount] = useState(
    initial.amount > 0 ? String(initial.amount) : "",
  );
  const [categoryId, setCategoryId] = useState<Id<"categories"> | "">(
    initial.categoryId ?? "",
  );
  const [note, setNote] = useState(initial.note ?? "");
  const [date, setDate] = useState(toDateInputValue(initial.date));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => categories?.filter((c) => c.type === type) ?? [],
    [categories, type],
  );

  const selectedCategoryId =
    categoryId && filtered.some((c) => c._id === categoryId)
      ? categoryId
      : (filtered[0]?._id ?? "");

  return (
    <>
      <div className="type-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={type === "expense"}
          className={type === "expense" ? "active expense" : ""}
          onClick={() => {
            setType("expense");
            setCategoryId("");
          }}
        >
          Расход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={type === "income"}
          className={type === "income" ? "active income" : ""}
          onClick={() => {
            setType("income");
            setCategoryId("");
          }}
        >
          Доход
        </button>
      </div>

      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const value = parseFloat(amount.replace(",", "."));
          if (Number.isNaN(value) || value <= 0) {
            setError("Введите сумму");
            return;
          }
          if (!selectedCategoryId) {
            setError("Добавьте категорию в разделе «Аккаунт»");
            return;
          }
          setPending(true);
          void onSubmit({
            type,
            amount: value,
            categoryId: selectedCategoryId,
            note: note || undefined,
            date: fromDateInputValue(date),
          })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Не удалось сохранить");
            })
            .finally(() => setPending(false));
        }}
      >
        <label className="field amount-field">
          <span>Сумма, ₽</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            required
          />
        </label>

        <label className="field">
          <span>Категория</span>
          <select
            value={selectedCategoryId}
            onChange={(e) => setCategoryId(e.target.value as Id<"categories">)}
            disabled={filtered.length === 0}
          >
            {filtered.length === 0 ? (
              <option value="">Нет категорий</option>
            ) : (
              filtered.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="field">
          <span>Дата</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Заметка (необязательно)</span>
          <input
            type="text"
            placeholder="Кофе, метро…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={pending}
            >
              Отмена
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}
