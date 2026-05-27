import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CURRENCY_PRESETS } from "../../shared/lib/currencies";
import { parseAmountInput } from "../../shared/lib/money";
import { ChipButton } from "../../shared/ui/ChipButton";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { DraggableList } from "./DraggableList";
import { useMutationRunner } from "./useMutationRunner";

type AccountSettingsViewProps = {
  onBack: () => void;
  accountId: Id<"accounts"> | null;
};

export function AccountSettingsView({ onBack, accountId }: AccountSettingsViewProps) {
  const accounts = useQuery(api.accounts.list);
  const currencies = useQuery(api.currencies.list);
  const [selectedId, setSelectedId] = useState<Id<"accounts"> | null>(accountId);
  const [deleteId, setDeleteId] = useState<Id<"currencies"> | null>(null);

  useEffect(() => {
    if (accountId) setSelectedId(accountId);
  }, [accountId]);

  useEffect(() => {
    if (!selectedId && accounts?.length) {
      const def = accounts.find((a) => a.isDefault) ?? accounts[0];
      setSelectedId(def?._id ?? null);
    }
  }, [accounts, selectedId]);

  const bundle = useQuery(
    api.accounts.settingsBundle,
    selectedId ? { accountId: selectedId } : "skip",
  );

  const saveBalances = useMutation(api.accounts.saveBalances);
  const createCurrency = useMutation(api.currencies.create);
  const removeCurrency = useMutation(api.currencies.remove);
  const reorderCurrencies = useMutation(api.currencies.reorder);
  const { error, run } = useMutationRunner();

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundle) return;
    const next: Record<string, string> = {};
    for (const e of bundle.entries) {
      next[e.currencyId] = e.balance > 0 ? String(e.balance) : "";
    }
    setAmounts(next);
  }, [bundle]);

  const defaultCurrency = currencies?.[0];

  const dragItems = useMemo(
    () =>
      currencies?.map((c, index) => ({
        id: c._id,
        label: `${c.symbol} ${c.code}`,
        sublabel:
          index === 0
            ? `${c.name} · валюта по умолчанию`
            : c.name,
        trailing: (
          <label className="field account-settings-field">
            <span className="sr-only">Остаток {c.code}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amounts[c._id] ?? ""}
              onChange={(ev) =>
                setAmounts((prev) => ({
                  ...prev,
                  [c._id]: ev.target.value,
                }))
              }
            />
          </label>
        ),
      })) ?? [],
    [currencies, amounts],
  );

  const availablePresets = CURRENCY_PRESETS.filter(
    (p) => !currencies?.some((c) => c.code === p.code),
  );

  const deleteLabel = currencies?.find((c) => c._id === deleteId);

  const submit = () => {
    if (!selectedId || !currencies?.length) return;
    setFormError(null);

    const balances: { currencyId: Id<"currencies">; balance: number }[] = [];
    for (const c of currencies) {
      const raw = amounts[c._id] ?? "";
      const value =
        raw.trim() === "" || raw.trim() === "0" ? 0 : parseAmountInput(raw);
      if (value === null) {
        setFormError(`Некорректная сумма для ${c.code}`);
        return;
      }
      balances.push({ currencyId: c._id, balance: value });
    }

    void run(() =>
      saveBalances({ accountId: selectedId, balances }).then(() => onBack()),
    );
  };

  return (
    <div className="account-editor">
      <header className="account-editor-header">
        <button type="button" className="btn-icon" aria-label="Назад" onClick={onBack}>
          ←
        </button>
        <h2 className="account-editor-title">Настройка счёта</h2>
      </header>

      <p className="account-editor-hint">
        Перетащите валюты для изменения порядка. Верхняя —{" "}
        <strong>{defaultCurrency?.code ?? "BYN"}</strong>, в ней показываются сводки и
        итоги. Укажите остаток по каждой валюте для перерасчёта счёта.
      </p>

      {accounts && accounts.length > 1 && (
        <div className="chip-row chip-row--currency account-settings-accounts">
          {accounts.map((a) => (
            <ChipButton
              key={a._id}
              size="sm"
              selected={selectedId === a._id}
              onClick={() => setSelectedId(a._id)}
            >
              {a.name}
            </ChipButton>
          ))}
        </div>
      )}

      {(error ?? formError) && <p className="error">{error ?? formError}</p>}

      {currencies === undefined ? (
        <p className="empty-state">Загрузка…</p>
      ) : (
        <DraggableList
          dragHandleOnly
          items={dragItems}
          onReorder={(ids) =>
            void run(() =>
              reorderCurrencies({ orderedIds: ids as Id<"currencies">[] }),
            )
          }
          onDelete={(id) => setDeleteId(id as Id<"currencies">)}
        />
      )}

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
                    createCurrency({
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

      <button
        type="button"
        className="btn-primary btn-primary--full"
        disabled={!selectedId || !currencies?.length}
        onClick={() => submit()}
      >
        Сохранить перерасчёт
      </button>

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
            removeCurrency({ id: deleteId }).then(() => {
              setDeleteId(null);
            }),
          );
        }}
      />
    </div>
  );
}
