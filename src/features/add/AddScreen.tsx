import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AddTransactionForm } from "./AddTransactionForm";

export function AddScreen() {
  const create = useMutation(api.transactions.mutations.create);
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState(false);

  return (
    <div className="tab-panel add-tab">
      <h2 className="panel-title">Новая операция</h2>

      <AddTransactionForm
        key={formKey}
        onSubmit={async (values) => {
          setSuccess(false);
          await create(values);
          setSuccess(true);
          setFormKey((k) => k + 1);
        }}
      />

      {success && <p className="success-msg">Операция сохранена</p>}
    </div>
  );
}
