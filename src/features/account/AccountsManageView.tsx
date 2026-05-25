import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatMoney } from "../../shared/lib/format";
import { parseAmountInput } from "../../shared/lib/money";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { PromptSheet } from "../../shared/ui/PromptSheet";
import { useMutationRunner } from "./useMutationRunner";

type AccountsManageViewProps = {
  onBack: () => void;
};

export function AccountsManageView({ onBack }: AccountsManageViewProps) {
  const accounts = useQuery(api.accounts.list);
  const currencies = useQuery(api.currencies.list);
  const create = useMutation(api.accounts.create);
  const recalculate = useMutation(api.accounts.recalculate);
  const remove = useMutation(api.accounts.remove);

  const { error, run } = useMutationRunner();
  const [formError, setFormError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [recalcId, setRecalcId] = useState<Id<"accounts"> | null>(null);
  const [recalcAmount, setRecalcAmount] = useState("");
  const [deleteId, setDeleteId] = useState<Id<"accounts"> | null>(null);

  const defaultCurrencyCode = currencies?.[0]?.code;

  const recalcAccount = accounts?.find((a) => a._id === recalcId);
  const deleteAccount = accounts?.find((a) => a._id === deleteId);

  const submitRecalc = () => {
    if (!recalcId) return;
    const value =
      recalcAmount.trim() === "" || recalcAmount.trim() === "0"
        ? 0
        : parseAmountInput(recalcAmount);
    if (value === null) {
      setFormError("Введите сумму, например 0 или 1250,50");
      return;
    }
    setFormError(null);
    void run(() =>
      recalculate({ id: recalcId, balance: value }).then(() => {
        setRecalcId(null);
        setRecalcAmount("");
      }),
    );
  };

  return (
    <div className="account-editor">
      <header className="account-editor-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="account-editor-title">Счета</h2>
      </header>

      <p className="account-editor-hint">
        Счёт «Текущий» создаётся автоматически. Перерасчёт задаёт фактический остаток
        денег на счёте (например, после сверки с банком или кошельком).
      </p>

      {(error ?? formError) && <p className="error">{error ?? formError}</p>}

      <ul className="account-list">
        {accounts?.map((account) => (
          <li key={account._id} className="account-card">
            <div className="account-card-main">
              <span className="account-card-name">
                {account.name}
                {account.isDefault && (
                  <span className="account-card-badge">основной</span>
                )}
              </span>
              <strong className="account-card-balance">
                {formatMoney(account.balance, false, defaultCurrencyCode)}
              </strong>
            </div>
            <div className="account-card-actions">
              <button
                type="button"
                className="btn-secondary btn-secondary--sm account-recalc-btn"
                onClick={() => {
                  setRecalcId(account._id);
                  setRecalcAmount(
                    account.balance > 0 ? String(account.balance) : "",
                  );
                }}
              >
                Перерасчёт
              </button>
              {!account.isDefault && (
                <button
                  type="button"
                  className="btn-icon btn-icon--sm account-delete-btn"
                  aria-label={`Удалить ${account.name}`}
                  onClick={() => setDeleteId(account._id)}
                >
                  ×
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {accounts === undefined && <p className="empty-state">Загрузка…</p>}

      <button
        type="button"
        className="btn-primary btn-primary--full"
        onClick={() => setAddOpen(true)}
      >
        + Новый счёт
      </button>

      <PromptSheet
        open={addOpen}
        title="Новый счёт"
        placeholder="Например: Накопления"
        onCancel={() => setAddOpen(false)}
        onSubmit={(name) =>
          void run(() =>
            create({ name }).then(() => {
              setAddOpen(false);
            }),
          )
        }
      />

      {recalcId !== null && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRecalcId(null);
              setRecalcAmount("");
            }
          }}
        >
          <div
            className="confirm-sheet prompt-sheet account-recalc-sheet"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="confirm-title">Перерасчёт — {recalcAccount?.name}</h3>
            <p className="form-hint">
              Укажите фактический остаток на счёте сейчас. Можно ввести 8, 8,5 или 8,55.
            </p>
            <label className="field prompt-field">
              <span>Остаток</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={recalcAmount}
                autoFocus
                onChange={(e) => setRecalcAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitRecalc();
                  }
                }}
              />
            </label>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn-secondary confirm-btn"
                onClick={() => {
                  setRecalcId(null);
                  setRecalcAmount("");
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary confirm-btn"
                onClick={() => submitRecalc()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить счёт?"
        message={
          deleteAccount
            ? `«${deleteAccount.name}» будет удалён без возможности восстановления.`
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
