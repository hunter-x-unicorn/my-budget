import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { TransactionType } from "../lib/budget";

function CategorySection({
  title,
  type,
  items,
  onAdd,
  onRemove,
  onMove,
}: {
  title: string;
  type: TransactionType;
  items: { _id: Id<"categories">; name: string; order: number }[];
  onAdd: (name: string, type: TransactionType) => Promise<void>;
  onRemove: (id: Id<"categories">) => void;
  onMove: (id: Id<"categories">, direction: "up" | "down") => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="category-section">
      <h3>{title}</h3>

      <ul className="category-list">
        {items.map((cat, index) => (
          <li key={cat._id} className="category-item">
            <div className="category-reorder">
              <button
                type="button"
                className="btn-icon btn-icon--sm"
                disabled={index === 0}
                aria-label="Выше"
                onClick={() => onMove(cat._id, "up")}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn-icon btn-icon--sm"
                disabled={index === items.length - 1}
                aria-label="Ниже"
                onClick={() => onMove(cat._id, "down")}
              >
                ↓
              </button>
            </div>
            <span className={`category-name category-name--${type}`}>
              {cat.name}
            </span>
            <button
              type="button"
              className="category-delete"
              aria-label={`Удалить ${cat.name}`}
              onClick={() => onRemove(cat._id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <form
        className="category-add"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!name.trim()) return;
          void onAdd(name.trim(), type)
            .then(() => setName(""))
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Ошибка");
            });
        }}
      >
        <input
          type="text"
          placeholder="Новая категория"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <button type="submit" className="btn-primary btn-primary--sm">
          +
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export function AccountTab() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.current);
  const categories = useQuery(api.categories.list);
  const createCategory = useMutation(api.categories.create);
  const removeCategory = useMutation(api.categories.remove);
  const moveCategory = useMutation(api.categories.move);

  const [actionError, setActionError] = useState<string | null>(null);

  const expense =
    categories?.filter((c) => c.type === "expense") ?? [];
  const income = categories?.filter((c) => c.type === "income") ?? [];

  const handleAdd = async (name: string, type: TransactionType) => {
    setActionError(null);
    await createCategory({ name, type });
  };

  const handleRemove = (id: Id<"categories">) => {
    setActionError(null);
    void removeCategory({ id }).catch((err: unknown) => {
      setActionError(err instanceof Error ? err.message : "Ошибка");
    });
  };

  const handleMove = (id: Id<"categories">, direction: "up" | "down") => {
    void moveCategory({ id, direction });
  };

  return (
    <div className="tab-panel account-tab">
      <header className="account-header">
        <h2>Аккаунт</h2>
        <p className="account-email">{user?.email ?? "…"}</p>
        <button
          type="button"
          className="btn-secondary btn-secondary--full"
          onClick={() => void signOut()}
        >
          Выйти
        </button>
      </header>

      {actionError && <p className="error account-error">{actionError}</p>}

      <CategorySection
        title="Категории расходов"
        type="expense"
        items={expense}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onMove={handleMove}
      />

      <CategorySection
        title="Категории доходов"
        type="income"
        items={income}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onMove={handleMove}
      />
    </div>
  );
}
