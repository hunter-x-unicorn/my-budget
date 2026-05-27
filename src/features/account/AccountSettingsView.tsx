import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CURRENCY_PRESETS } from "../../shared/lib/currencies";
import { parseAmountInput } from "../../shared/lib/money";
import { ChipButton } from "../../shared/ui/ChipButton";
import { useMutationRunner } from "./useMutationRunner";

type AccountSettingsViewProps = {
  onBack: () => void;
  accountId: Id<"accounts"> | null;
};

export function AccountSettingsView({ onBack, accountId }: AccountSettingsViewProps) {
  const accounts = useQuery(api.accounts.list);
  const [selectedId, setSelectedId] = useState<Id<"accounts"> | null>(accountId);

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
  const addAllFromDb = useMutation(api.currencies.addAllFromExchangeDatabase);
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

  const currencies = useQuery(api.currencies.list);
  const availablePresets = CURRENCY_PRESETS.filter(
    (p) => !currencies?.some((c) => c.code === p.code),
  );

  const submit = () => {
    if (!selectedId || !bundle) return;
    setFormError(null);

    const balances: { currencyId: Id<"currencies">; balance: number }[] = [];
    for (const e of bundle.entries) {
      const raw = amounts[e.currencyId] ?? "";
      const value =
        raw.trim() === "" || raw.trim() === "0" ? 0 : parseAmountInput(raw);
      if (value === null) {
        setFormError(`Некорректная сумма для ${e.code}`);
        return;
      }
      balances.push({ currencyId: e.currencyId, balance: value });
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
        Укажите фактический остаток в каждой валюте. Итог на счёте пересчитается в
        базовую валюту по курсу НБРБ на сегодня.
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

      <ul className="account-settings-list">
        {bundle?.entries.map((e) => (
          <li key={e.currencyId} className="account-settings-row">
            <div className="account-settings-row-label">
              <strong>
                {e.symbol} {e.code}
              </strong>
              <span>{e.name}</span>
            </div>
            <label className="field account-settings-field">
              <span className="sr-only">Остаток {e.code}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amounts[e.currencyId] ?? ""}
                onChange={(ev) =>
                  setAmounts((prev) => ({
                    ...prev,
                    [e.currencyId]: ev.target.value,
                  }))
                }
              />
            </label>
          </li>
        ))}
      </ul>

      {bundle?.entries.length === 0 && (
        <p className="empty-state">Добавьте валюты ниже</p>
      )}

      <div className="account-editor-section">
        <button
          type="button"
          className="btn-secondary btn-secondary--full"
          onClick={() =>
            void run(() => addAllFromDb({}).then(() => undefined))
          }
        >
          Добавить все валюты из базы курсов
        </button>
      </div>

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
        disabled={!selectedId || !bundle?.entries.length}
        onClick={() => submit()}
      >
        Сохранить перерасчёт
      </button>
    </div>
  );
}
