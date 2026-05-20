import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CURRENCY_PRESETS } from "../../shared/lib/currencies";
import type { ManageKind } from "../../shared/context/ManageNavContext";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { ChipButton } from "../../shared/ui/ChipButton";

type CategoryType = "income" | "expense";

const TITLES: Record<ManageKind, string> = {
  currency: "Валюта",
  category: "Категория",
  tags: "Детализация (теги)",
};

function OrderedList({
  items,
  onRename,
  onRemove,
  onMove,
  label,
  readOnly = false,
}: {
  items: { _id: string; name: string; sublabel?: string }[];
  label: (item: { _id: string; name: string; sublabel?: string }) => string;
  onRename?: (id: string, name: string) => void;
  onRemove: (id: string, label: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  readOnly?: boolean;
}) {
  return (
    <ul className="manage-list">
      {items.map((item, index) => (
        <li key={item._id} className="manage-item">
          <div className="manage-reorder">
            <button
              type="button"
              className="btn-icon btn-icon--sm"
              disabled={index === 0}
              aria-label="Выше"
              onClick={() => onMove(item._id, "up")}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn-icon btn-icon--sm"
              disabled={index === items.length - 1}
              aria-label="Ниже"
              onClick={() => onMove(item._id, "down")}
            >
              ↓
            </button>
          </div>
          {readOnly || !onRename ? (
            <span className="manage-item-label">{label(item)}</span>
          ) : (
            <button
              type="button"
              className="manage-item-label"
              onClick={() => {
                const next = window.prompt("Новое название", item.name);
                if (next === null) return;
                const trimmed = next.trim();
                if (trimmed && trimmed !== item.name) {
                  onRename(item._id, trimmed);
                }
              }}
            >
              {label(item)}
            </button>
          )}
          <button
            type="button"
            className="manage-item-delete"
            aria-label="Удалить"
            onClick={() => onRemove(item._id, label(item))}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ManageScreen({
  kind,
  onBack,
}: {
  kind: ManageKind;
  onBack: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
    run: () => Promise<void>;
  } | null>(null);

  const currencies = useQuery(api.currencies.list);
  const categories = useQuery(api.categories.list);
  const tags = useQuery(api.tags.list);

  const createCurrency = useMutation(api.currencies.create);
  const removeCurrency = useMutation(api.currencies.remove);
  const moveCurrency = useMutation(api.currencies.move);

  const createCategory = useMutation(api.categories.create);
  const renameCategory = useMutation(api.categories.rename);
  const removeCategory = useMutation(api.categories.remove);
  const moveCategory = useMutation(api.categories.move);

  const createTag = useMutation(api.tags.create);
  const renameTag = useMutation(api.tags.rename);
  const removeTag = useMutation(api.tags.remove);
  const moveTag = useMutation(api.tags.move);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const expense = categories?.filter((c) => c.type === "expense") ?? [];
  const income = categories?.filter((c) => c.type === "income") ?? [];
  const availablePresets = CURRENCY_PRESETS.filter(
    (p) => !currencies?.some((c) => c.code === p.code),
  );

  return (
    <div className="manage-screen">
      <header className="manage-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="manage-title">{TITLES[kind]}</h2>
      </header>

      {error && <p className="error">{error}</p>}

      {kind === "currency" && (
        <>
          <OrderedList
            items={
              currencies?.map((c) => ({
                _id: c._id,
                name: `${c.symbol} ${c.code}`,
                sublabel: c.name,
              })) ?? []
            }
            label={(item) =>
              item.sublabel ? `${item.name} — ${item.sublabel}` : item.name
            }
            readOnly
            onRemove={(id, label) =>
              setDeleteTarget({
                id,
                label,
                run: () => removeCurrency({ id: id as Id<"currencies"> }).then(() => {}),
              })
            }
            onMove={(id, direction) =>
              void run(() =>
                moveCurrency({ id: id as Id<"currencies">, direction }).then(() => {}),
              )
            }
          />
          {availablePresets.length > 0 && (
            <div className="manage-add-block">
              <p className="form-section-label">Добавить валюту</p>
              <div className="chip-grid">
                {availablePresets.map((p) => (
                  <ChipButton
                    key={p.code}
                    size="sm"
                    onClick={() =>
                      void run(() =>
                        createCurrency({
                          code: p.code,
                          name: p.name,
                          symbol: p.symbol,
                        }).then(() => {}),
                      )
                    }
                  >
                    {p.symbol} {p.code}
                  </ChipButton>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {kind === "category" && (
        <>
          <p className="manage-group-label">Расходы</p>
          <OrderedList
            items={expense.map((c) => ({ _id: c._id, name: c.name }))}
            label={(item) => item.name}
            onRename={(id, name) =>
              void run(() => renameCategory({ id: id as Id<"categories">, name }).then(() => {}))
            }
            onRemove={(id, label) =>
              setDeleteTarget({
                id,
                label,
                run: () => removeCategory({ id: id as Id<"categories"> }).then(() => {}),
              })
            }
            onMove={(id, direction) =>
              void run(() =>
                moveCategory({ id: id as Id<"categories">, direction }).then(() => {}),
              )
            }
          />
          <form
            className="manage-add-form"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem(
                "expenseName",
              ) as HTMLInputElement;
              if (!input.value.trim()) return;
              void run(() =>
                createCategory({
                  name: input.value.trim(),
                  type: "expense" as CategoryType,
                }).then(() => {
                  input.value = "";
                }),
              );
            }}
          >
            <input name="expenseName" type="text" placeholder="Новая категория расхода" maxLength={40} />
            <button type="submit" className="btn-primary btn-primary--sm">
              +
            </button>
          </form>

          <p className="manage-group-label">Доходы</p>
          <OrderedList
            items={income.map((c) => ({ _id: c._id, name: c.name }))}
            label={(item) => item.name}
            onRename={(id, name) =>
              void run(() => renameCategory({ id: id as Id<"categories">, name }).then(() => {}))
            }
            onRemove={(id, label) =>
              setDeleteTarget({
                id,
                label,
                run: () => removeCategory({ id: id as Id<"categories"> }).then(() => {}),
              })
            }
            onMove={(id, direction) =>
              void run(() =>
                moveCategory({ id: id as Id<"categories">, direction }).then(() => {}),
              )
            }
          />
          <form
            className="manage-add-form"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem(
                "incomeName",
              ) as HTMLInputElement;
              if (!input.value.trim()) return;
              void run(() =>
                createCategory({
                  name: input.value.trim(),
                  type: "income" as CategoryType,
                }).then(() => {
                  input.value = "";
                }),
              );
            }}
          >
            <input name="incomeName" type="text" placeholder="Новая категория дохода" maxLength={40} />
            <button type="submit" className="btn-primary btn-primary--sm">
              +
            </button>
          </form>
        </>
      )}

      {kind === "tags" && (
        <>
          <OrderedList
            items={tags?.map((t) => ({ _id: t._id, name: t.name })) ?? []}
            label={(item) => item.name}
            onRename={(id, name) =>
              void run(() => renameTag({ id: id as Id<"tags">, name }).then(() => {}))
            }
            onRemove={(id, label) =>
              setDeleteTarget({
                id,
                label,
                run: () => removeTag({ id: id as Id<"tags"> }).then(() => {}),
              })
            }
            onMove={(id, direction) =>
              void run(() => moveTag({ id: id as Id<"tags">, direction }).then(() => {}))
            }
          />
          <form
            className="manage-add-form"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("tagName") as HTMLInputElement;
              if (!input.value.trim()) return;
              void run(() =>
                createTag({ name: input.value.trim() }).then(() => {
                  input.value = "";
                }),
              );
            }}
          >
            <input name="tagName" type="text" placeholder="Новый тег" maxLength={40} />
            <button type="submit" className="btn-primary btn-primary--sm">
              +
            </button>
          </form>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Удалить?"
        message={
          deleteTarget
            ? `«${deleteTarget.label}» будет удалено без возможности восстановления.`
            : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void run(deleteTarget.run);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
