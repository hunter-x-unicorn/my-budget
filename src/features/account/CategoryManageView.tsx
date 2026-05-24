import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { PromptSheet } from "../../shared/ui/PromptSheet";
import { DraggableList } from "./DraggableList";
import { useMutationRunner } from "./useMutationRunner";

type CategoryManageViewProps = {
  onBack: () => void;
};

export function CategoryManageView({ onBack }: CategoryManageViewProps) {
  const categories = useQuery(api.categories.list);
  const create = useMutation(api.categories.create);
  const rename = useMutation(api.categories.rename);
  const remove = useMutation(api.categories.remove);
  const reorder = useMutation(api.categories.reorder);

  const { error, run } = useMutationRunner();
  const [addType, setAddType] = useState<"expense" | "income" | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"categories"> | null>(null);

  const expense = useMemo(
    () => categories?.filter((c) => c.type === "expense") ?? [],
    [categories],
  );
  const income = useMemo(
    () => categories?.filter((c) => c.type === "income") ?? [],
    [categories],
  );

  const deleteLabel =
    categories?.find((c) => c._id === deleteId)?.name ?? "";

  return (
    <div className="account-editor">
      <header className="account-editor-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="account-editor-title">Категории</h2>
      </header>

      <p className="account-editor-hint">
        Перетащите строку, чтобы изменить порядок в «Добавить» и «Таблица». Нажмите на
        название, чтобы переименовать.
      </p>

      {error && <p className="error">{error}</p>}

      <section className="account-editor-section">
        <div className="account-editor-section-head">
          <h3>Расходы</h3>
          <button
            type="button"
            className="btn-primary btn-primary--sm"
            onClick={() => setAddType("expense")}
          >
            + Добавить
          </button>
        </div>
        <DraggableList
          accent="expense"
          items={expense.map((c) => ({ id: c._id, label: c.name }))}
          onReorder={(ids) =>
            void run(() =>
              reorder({
                type: "expense",
                orderedIds: ids as Id<"categories">[],
              }),
            )
          }
          onRename={(id, name) =>
            void run(() => rename({ id: id as Id<"categories">, name }))
          }
          onDelete={(id) => setDeleteId(id as Id<"categories">)}
        />
      </section>

      <section className="account-editor-section">
        <div className="account-editor-section-head">
          <h3>Доходы</h3>
          <button
            type="button"
            className="btn-primary btn-primary--sm"
            onClick={() => setAddType("income")}
          >
            + Добавить
          </button>
        </div>
        <DraggableList
          accent="income"
          items={income.map((c) => ({ id: c._id, label: c.name }))}
          onReorder={(ids) =>
            void run(() =>
              reorder({
                type: "income",
                orderedIds: ids as Id<"categories">[],
              }),
            )
          }
          onRename={(id, name) =>
            void run(() => rename({ id: id as Id<"categories">, name }))
          }
          onDelete={(id) => setDeleteId(id as Id<"categories">)}
        />
      </section>

      <PromptSheet
        open={addType !== null}
        title={addType === "income" ? "Новая категория дохода" : "Новая категория расхода"}
        placeholder="Например: Еда"
        onCancel={() => setAddType(null)}
        onSubmit={(name) =>
          void run(() =>
            create({ name, type: addType! }).then(() => {
              setAddType(null);
            }),
          )
        }
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить категорию?"
        message={
          deleteId
            ? `«${deleteLabel}» будет удалена. Если в категории есть операции, удаление невозможно.`
            : ""
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          void run(() =>
            remove({ id: deleteId }).then(() => {
              setDeleteId(null);
            }),
          );
        }}
      />
    </div>
  );
}
