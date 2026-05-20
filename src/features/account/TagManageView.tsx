import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { PromptSheet } from "../../shared/ui/PromptSheet";
import { DraggableList } from "./DraggableList";

type TagManageViewProps = {
  onBack: () => void;
};

export function TagManageView({ onBack }: TagManageViewProps) {
  const tags = useQuery(api.tags.list);
  const create = useMutation(api.tags.create);
  const rename = useMutation(api.tags.rename);
  const remove = useMutation(api.tags.remove);
  const reorder = useMutation(api.tags.reorder);

  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"tags"> | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const deleteLabel = tags?.find((t) => t._id === deleteId)?.name ?? "";

  return (
    <div className="account-editor">
      <header className="account-editor-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="account-editor-title">Детализация (теги)</h2>
      </header>

      <p className="account-editor-hint">
        Теги объединяют разные категории. Перетащите для сортировки, нажмите на имя для
        переименования.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="account-editor-section-head">
        <h3>Все теги</h3>
        <button
          type="button"
          className="btn-primary btn-primary--sm"
          onClick={() => setAddOpen(true)}
        >
          + Добавить
        </button>
      </div>

      <DraggableList
        items={tags?.map((t) => ({ id: t._id, label: t.name })) ?? []}
        onReorder={(ids) =>
          void run(() =>
            reorder({ orderedIds: ids as Id<"tags">[] }).then(() => {}),
          )
        }
        onRename={(id, name) =>
          void run(() => rename({ id: id as Id<"tags">, name }).then(() => {}))
        }
        onDelete={(id) => setDeleteId(id as Id<"tags">)}
      />

      <PromptSheet
        open={addOpen}
        title="Новый тег"
        placeholder="Например: Жена"
        onCancel={() => setAddOpen(false)}
        onSubmit={(name) =>
          void run(() => create({ name }).then(() => setAddOpen(false)))
        }
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить тег?"
        message={
          deleteId
            ? `«${deleteLabel}» будет удалён. Если есть операции с этим тегом, удаление невозможно.`
            : ""
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          void run(() => remove({ id: deleteId }).then(() => setDeleteId(null)));
        }}
      />
    </div>
  );
}
