import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { useState } from "react";

function formatAuthError(err: unknown): string {
  const raw =
    err instanceof ConvexError
      ? typeof err.data === "string"
        ? err.data
        : JSON.stringify(err.data)
      : err instanceof Error
        ? err.message
        : "";

  if (raw.includes("InvalidSecret")) {
    return "Неверный пароль. Войдите с тем же паролем, что при регистрации.";
  }
  if (raw.includes("Account") && raw.includes("already exists")) {
    return "Email уже занят. Переключитесь на «Войти».";
  }
  if (raw) return raw;
  return "Не удалось выполнить вход";
}

export function AuthForm() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signIn" | "signUp">("signUp");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <span className="auth-logo" aria-hidden>
          ₽
        </span>
        <h1>Мой бюджет</h1>
        <p>Доходы и расходы в одном месте</p>
      </div>

      <div className="auth-card">
        <h2>{mode === "signUp" ? "Регистрация" : "Вход"}</h2>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const formData = new FormData(event.currentTarget);
            void signIn("password", formData)
              .catch((err: unknown) => setError(formatAuthError(err)))
              .finally(() => setPending(false));
          }}
        >
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              name="password"
              type="password"
              placeholder="Минимум 8 символов"
              autoComplete={
                mode === "signUp" ? "new-password" : "current-password"
              }
              minLength={8}
              required
            />
          </label>

          <input name="flow" type="hidden" value={mode} />

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={pending}>
            {pending
              ? "Подождите…"
              : mode === "signUp"
                ? "Создать аккаунт"
                : "Войти"}
          </button>
        </form>

        <button
          type="button"
          className="btn-link"
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
        >
          {mode === "signIn"
            ? "Нет аккаунта? Зарегистрироваться"
            : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}
