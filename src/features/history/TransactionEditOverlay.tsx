import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { TransactionForm } from "../../shared/ui/TransactionForm";

type EditableTransaction = {
  _id: Id<"transactions">;
  type: "income" | "expense";
  amount: number;
  categoryId: Id<"categories">;
  categoryName: string;
  currencyId?: Id<"currencies">;
  note?: string;
  date: number;
};

export function TransactionEditOverlay({
  transaction,
  onClose,
}: {
  transaction: EditableTransaction;
  onClose: () => void;
}) {
  const update = useMutation(api.transactions.mutations.update);
  const currencies = useQuery(api.currencies.list);
  const currencyId = transaction.currencyId ?? currencies?.[0]?._id;

  return (
    <div
      className="edit-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-tx-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="edit-panel">
        <h2 id="edit-tx-title" className="panel-title">
          Редактировать
        </h2>
        <p className="edit-panel-sub">{transaction.categoryName}</p>

        <TransactionForm
          initial={{
            type: transaction.type,
            amount: transaction.amount,
            categoryId: transaction.categoryId,
            note: transaction.note,
            date: transaction.date,
          }}
          submitLabel="Сохранить"
          onCancel={onClose}
          onSubmit={async (values) => {
            if (!currencyId) return;
            await update({
              id: transaction._id,
              type: values.type,
              amount: values.amount,
              categoryId: values.categoryId,
              currencyId,
              note: values.note,
              date: values.date,
            });
            onClose();
          }}
        />
      </div>
    </div>
  );
}
