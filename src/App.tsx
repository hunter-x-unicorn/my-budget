import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import "./App.css";

function AuthForm() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signIn" | "signUp">("signUp");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="card">
      <h1>{mode === "signUp" ? "Регистрация" : "Вход"}</h1>
      <p className="subtitle">
        {mode === "signUp"
          ? "Создайте аккаунт с email и паролем"
          : "Войдите в существующий аккаунт"}
      </p>

      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setPending(true);
          const formData = new FormData(event.currentTarget);
          void signIn("password", formData)
            .catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : "Не удалось выполнить вход",
              );
            })
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

        <button type="submit" className="primary" disabled={pending}>
          {pending
            ? "Подождите…"
            : mode === "signUp"
              ? "Зарегистрироваться"
              : "Войти"}
        </button>
      </form>

      <button
        type="button"
        className="link"
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
  );
}

function Dashboard() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.current);

  return (
    <div className="card dashboard">
      <p className="badge">Вы вошли</p>
      <h1>Добро пожаловать!</h1>
      <p className="email">{user?.email ?? "Загрузка…"}</p>
      {user?.name && <p className="name">{user.name}</p>}
      <button
        type="button"
        className="secondary"
        onClick={() => void signOut()}
      >
        Выйти
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div className="page">
      <div className="glow" aria-hidden />
      <AuthLoading>
        <div className="card loading">Загрузка…</div>
      </AuthLoading>
      <Unauthenticated>
        <AuthForm />
      </Unauthenticated>
      <Authenticated>
        <Dashboard />
      </Authenticated>
    </div>
  );
}
