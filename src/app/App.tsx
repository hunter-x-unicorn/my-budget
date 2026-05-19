import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { AuthForm } from "../features/auth/AuthForm";
import { BudgetApp } from "./BudgetApp";
import "../features/auth/auth.css";
import "../budget.css";

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="loading-screen">Загрузка…</div>
      </AuthLoading>
      <Unauthenticated>
        <AuthForm />
      </Unauthenticated>
      <Authenticated>
        <BudgetApp />
      </Authenticated>
    </>
  );
}
