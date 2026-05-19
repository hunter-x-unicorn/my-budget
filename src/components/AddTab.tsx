import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  fromDateInputValue,
  toDateInputValue,
  type TransactionType,
} from "../lib/budget";

export function AddTab() {
  const categories = useQuery(api.categories.list);
  const create = useMutation(api.transactions.mutations.create);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | "">("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toDateInputValue(Date.now()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const filtered = categories?.filter((c) => c.type === type) ?? [];

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((c) => c._id === categoryId)) {
      setCategoryId(filtered[0]!._id);
    }
  }, [filtered, categoryId, type]);

  return (
    <div className="tab-panel add-tab">
      <h2 className="panel-title">Новая операция</h2>

      <div className="type-toggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={type === "expense"}
          className={type === "expense" ? "active expense" : ""}
          onClick={() => setType("expense")}
        >
          Расход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={type === "income"}
          className={type === "income" ? "active income" : ""}
          onClick={() => setType("income")}
        >
          Доход
        </button>
      </div>

      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSuccess(false);
          const value = parseFloat(amount.replace(",", "."));
          if (Number.isNaN(value) || value <= 0) {
            setError("Введите сумму");
            return;
          }
          if (!categoryId) {
            setError("Добавьте категорию в разделе «Аккаунт»");
            return;
          }
          setPending(true);
          void create({
            type,
            amount: value,
            categoryId,
            note: note || undefined,
            date: fromDateInputValue(date),
          })
            .then(() => {
              setAmount("");
              setNote("");
              setDate(toDateInputValue(Date.now()));
              setSuccess(true);
            })
            .catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : "Не удалось сохранить",
              );
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
            value={categoryId}
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
        {success && <p className="success-msg">Операция сохранена</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
