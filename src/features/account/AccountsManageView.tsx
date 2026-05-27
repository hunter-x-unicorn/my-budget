import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useManageNav } from "../../shared/context/ManageNavContext";
import { formatMoney } from "../../shared/lib/format";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { PromptSheet } from "../../shared/ui/PromptSheet";
import { useMutationRunner } from "./useMutationRunner";

type AccountsManageViewProps = {
  onBack: () => void;
};

export function AccountsManageView({ onBack }: AccountsManageViewProps) {
  const { openSubview } = useManageNav();
  const accounts = useQuery(api.accounts.list);
  const currencies = useQuery(api.currencies.list);
  const create = useMutation(api.accounts.create);
  const remove = useMutation(api.accounts.remove);

  const { error, run } = useMutationRunner();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"accounts"> | null>(null);

  const defaultCurrencyCode = currencies?.[0]?.code;
  const deleteAccount = accounts?.find((a) => a._id === deleteId);

  return (
    <div className="account-editor">
      <header className="account-editor-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="account-editor-title">Счета</h2>
      </header>

      <p className="account-editor-hint">
        Счёт «Текущий» создаётся автоматически. Перерасчёт открывает настройку
        остатков по валютам.
      </p>

      {error && <p className="error">{error}</p>}

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
                onClick={() =>
                  openSubview("accountSettings", { accountId: account._id })
                }
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
