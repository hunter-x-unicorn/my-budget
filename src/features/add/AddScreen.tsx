import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { TransactionType } from "../../shared/types/budget";
import { TransactionForm } from "../../shared/ui/TransactionForm";

function newAddInitial() {
  return {
    type: "expense" as TransactionType,
    amount: 0,
    date: Date.now(),
  };
}

export function AddScreen() {
  const create = useMutation(api.transactions.mutations.create);
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [initial, setInitial] = useState(newAddInitial);

  return (
    <div className="tab-panel add-tab">
      <h2 className="panel-title">Новая операция</h2>

      <TransactionForm
        key={formKey}
        initial={initial}
        submitLabel="Сохранить"
        onSubmit={async (values) => {
          setSuccess(false);
          await create({
            type: values.type,
            amount: values.amount,
            categoryId: values.categoryId,
            note: values.note,
            date: values.date,
          });
          setSuccess(true);
          setInitial(newAddInitial());
          setFormKey((k) => k + 1);
        }}
      />

      {success && <p className="success-msg">Операция сохранена</p>}
    </div>
  );
}
