import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CURRENCY_PRESETS } from "../../shared/lib/currencies";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { ChipButton } from "../../shared/ui/ChipButton";
import { DraggableList } from "./DraggableList";
import { useMutationRunner } from "./useMutationRunner";

type CurrencyManageViewProps = {
  onBack: () => void;
};

export function CurrencyManageView({ onBack }: CurrencyManageViewProps) {
  const currencies = useQuery(api.currencies.list);
  const create = useMutation(api.currencies.create);
  const remove = useMutation(api.currencies.remove);
  const reorder = useMutation(api.currencies.reorder);

  const { error, run } = useMutationRunner();
  const [deleteId, setDeleteId] = useState<Id<"currencies"> | null>(null);

  const availablePresets = CURRENCY_PRESETS.filter(
    (p) => !currencies?.some((c) => c.code === p.code),
  );

  const deleteLabel = currencies?.find((c) => c._id === deleteId);

  return (
    <div className="account-editor">
      <header className="account-editor-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="account-editor-title">Валюта</h2>
      </header>

      <p className="account-editor-hint">
        Порядок валют влияет на список при добавлении операции. Перетащите для
        изменения порядка.
      </p>

      {error && <p className="error">{error}</p>}

      <DraggableList
        items={
          currencies?.map((c) => ({
            id: c._id,
            label: `${c.symbol} ${c.code}`,
            sublabel: c.name,
          })) ?? []
        }
        onReorder={(ids) =>
          void run(() => reorder({ orderedIds: ids as Id<"currencies">[] }))
        }
        onDelete={(id) => setDeleteId(id as Id<"currencies">)}
      />

      {availablePresets.length > 0 && (
        <section className="account-editor-section">
          <h3>Добавить валюту</h3>
          <div className="chip-grid">
            {availablePresets.map((p) => (
              <ChipButton
                key={p.code}
                size="sm"
                onClick={() =>
                  void run(() =>
                    create({
                      code: p.code,
                      name: p.name,
                      symbol: p.symbol,
                    }),
                  )
                }
              >
                {p.symbol} {p.code}
              </ChipButton>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить валюту?"
        message={
          deleteLabel
            ? `«${deleteLabel.symbol} ${deleteLabel.code}» будет удалена. Если есть операции в этой валюте, удаление невозможно.`
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
