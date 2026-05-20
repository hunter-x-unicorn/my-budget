import { useMutation, useQuery } from "convex/react";
import { useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CURRENCY_PRESETS } from "../../shared/lib/currencies";
import {
  fromDateInputValue,
  toDateInputValue,
  type TransactionType,
} from "../../shared/lib/budget";
import { ChipButton } from "../../shared/ui/ChipButton";

const TAGS_HELP_TITLE = "Детализация (Теги)";
const TAGS_HELP_TEXT =
  "Это сквозные метки, которые объединяют разные категории расходов. Назовите тег именем члена семьи, магазином или проектом (например: Жена, Евроопт, Ремонт). Это поможет вам в конце месяца увидеть, сколько всего денег ушло на конкретного человека или событие, даже если категории покупок были совершенно разными.";

export type AddFormValues = {
  type: TransactionType;
  amount: number;
  categoryId?: Id<"categories">;
  currencyId: Id<"currencies">;
  tagIds?: Id<"tags">[];
  note?: string;
  date: number;
};

type AddTransactionFormProps = {
  onSubmit: (values: AddFormValues) => Promise<void>;
};

export function AddTransactionForm({ onSubmit }: AddTransactionFormProps) {
  const categories = useQuery(api.categories.list);
  const currencies = useQuery(api.currencies.list);
  const tags = useQuery(api.tags.list);
  const createCurrency = useMutation(api.currencies.create);
  const createTag = useMutation(api.tags.create);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | "">("");
  const [currencyId, setCurrencyId] = useState<Id<"currencies"> | "">("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<Id<"tags">>>(
    () => new Set(),
  );
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(Date.now()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyPickerRef = useRef<HTMLDialogElement>(null);
  const tagsHelpRef = useRef<HTMLDialogElement>(null);

  const filteredCategories = useMemo(
    () => categories?.filter((c) => c.type === type) ?? [],
    [categories, type],
  );

  const effectiveCurrencyId =
    currencyId || currencies?.[0]?._id || ("" as Id<"currencies"> | "");

  const effectiveCategoryId: Id<"categories"> | undefined =
    type === "transfer"
      ? undefined
      : categoryId && filteredCategories.some((c) => c._id === categoryId)
        ? categoryId
        : filteredCategories[0]?._id;

  const selectedCurrency = currencies?.find((c) => c._id === effectiveCurrencyId);
  const availablePresets = CURRENCY_PRESETS.filter(
    (p) => !currencies?.some((c) => c.code === p.code),
  );

  function toggleTag(id: Id<"tags">) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddCurrency(preset: (typeof CURRENCY_PRESETS)[number]) {
    try {
      const id = await createCurrency({
        code: preset.code,
        name: preset.name,
        symbol: preset.symbol,
      });
      setCurrencyId(id);
      currencyPickerRef.current?.close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось добавить валюту");
    }
  }

  async function handleAddTag() {
    const name = window.prompt("Название тега");
    if (!name?.trim()) return;
    try {
      const id = await createTag({ name: name.trim() });
      setSelectedTagIds((prev) => new Set(prev).add(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось создать тег");
    }
  }

  return (
    <>
      <div className="type-pills" role="tablist" aria-label="Тип операции">
        <ChipButton
          selected={type === "expense"}
          variant="expense"
          onClick={() => {
            setType("expense");
            setCategoryId("");
          }}
          title="Расход"
        >
          Расход
        </ChipButton>
        <ChipButton
          selected={type === "income"}
          variant="income"
          onClick={() => {
            setType("income");
            setCategoryId("");
          }}
          title="Доход"
        >
          Доход
        </ChipButton>
        <ChipButton
          selected={type === "transfer"}
          variant="transfer"
          onClick={() => {
            setType("transfer");
            setCategoryId("");
          }}
          title="Перевод"
        >
          Перевод
        </ChipButton>
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
          if (!effectiveCurrencyId) {
            setError("Выберите валюту");
            return;
          }
          if (type !== "transfer" && !effectiveCategoryId) {
            setError("Добавьте категорию в разделе «Аккаунт»");
            return;
          }

          setPending(true);
          void onSubmit({
            type,
            amount: value,
            categoryId: effectiveCategoryId,
            currencyId: effectiveCurrencyId,
            tagIds: selectedTagIds.size ? [...selectedTagIds] : undefined,
            note: note || undefined,
            date: fromDateInputValue(date),
          })
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Не удалось сохранить");
            })
            .finally(() => setPending(false));
        }}
      >
        <div className="form-section">
          <span className="form-section-label">Валюта</span>
          <div className="chip-row chip-row--currency">
            {currencies?.map((c) => (
              <ChipButton
                key={c._id}
                size="sm"
                selected={effectiveCurrencyId === c._id}
                onClick={() => setCurrencyId(c._id)}
                title={c.name}
              >
                {c.symbol} {c.code}
              </ChipButton>
            ))}
            <ChipButton
              size="sm"
              className="chip-btn--add"
              onClick={() => currencyPickerRef.current?.showModal()}
              title="Добавить валюту"
            >
              +
            </ChipButton>
          </div>
        </div>

        <label className="field amount-field">
          <span>
            Сумма{selectedCurrency ? `, ${selectedCurrency.symbol}` : ""}
          </span>
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

        {type !== "transfer" && (
          <div className="form-section">
            <span className="form-section-label">Категория</span>
            <div className="chip-grid" role="listbox" aria-label="Категория">
              {filteredCategories.length === 0 ? (
                <p className="form-hint">Нет категорий — добавьте в «Аккаунт»</p>
              ) : (
                filteredCategories.map((c) => (
                  <ChipButton
                    key={c._id}
                    selected={effectiveCategoryId === c._id}
                    variant={type === "income" ? "income" : "expense"}
                    onClick={() => setCategoryId(c._id)}
                  >
                    {c.name}
                  </ChipButton>
                ))
              )}
            </div>
          </div>
        )}

        <label className="field">
          <span>Дата</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <div className="form-section">
          <div className="form-section-head">
            <span className="form-section-label">Детализация (теги)</span>
            <button
              type="button"
              className="info-btn"
              aria-label="Подсказка о тегах"
              onClick={() => tagsHelpRef.current?.showModal()}
            >
              i
            </button>
          </div>
          <div className="chip-grid" role="listbox" aria-label="Теги" aria-multiselectable>
            {tags?.map((t) => (
              <ChipButton
                key={t._id}
                selected={selectedTagIds.has(t._id)}
                onClick={() => toggleTag(t._id)}
              >
                {t.name}
              </ChipButton>
            ))}
            <ChipButton className="chip-btn--add" onClick={() => void handleAddTag()}>
              +
            </ChipButton>
          </div>
        </div>

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

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </form>

      <dialog ref={currencyPickerRef} className="app-dialog">
        <p className="app-dialog-title">Добавить валюту</p>
        {availablePresets.length === 0 ? (
          <p className="form-hint">Все доступные валюты уже добавлены.</p>
        ) : (
          <div className="chip-grid">
            {availablePresets.map((p) => (
              <ChipButton
                key={p.code}
                size="sm"
                onClick={() => void handleAddCurrency(p)}
              >
                {p.symbol} {p.code}
              </ChipButton>
            ))}
          </div>
        )}
        <button
          type="button"
          className="btn-secondary app-dialog-close"
          onClick={() => currencyPickerRef.current?.close()}
        >
          Закрыть
        </button>
      </dialog>

      <dialog ref={tagsHelpRef} className="app-dialog">
        <p className="app-dialog-title">{TAGS_HELP_TITLE}</p>
        <p className="app-dialog-text">{TAGS_HELP_TEXT}</p>
        <button
          type="button"
          className="btn-secondary app-dialog-close"
          onClick={() => tagsHelpRef.current?.close()}
        >
          Понятно
        </button>
      </dialog>
    </>
  );
}
