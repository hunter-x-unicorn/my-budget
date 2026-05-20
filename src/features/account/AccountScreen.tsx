import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useState, type ComponentType } from "react";
import { api } from "../../../convex/_generated/api";
import {
  useManageNav,
  type AccountSubview,
} from "../../shared/context/ManageNavContext";
import { CategoryManageView } from "./CategoryManageView";
import { CurrencyManageView } from "./CurrencyManageView";
import { TagManageView } from "./TagManageView";

function IconMoon() {
  return (
    <svg className="account-row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg className="account-row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SUBVIEW_VIEWS: Record<
  AccountSubview,
  ComponentType<{ onBack: () => void }>
> = {
  currency: CurrencyManageView,
  category: CategoryManageView,
  tags: TagManageView,
};

export function AccountScreen() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.current);
  const { subview, openSubview, closeSubview } = useManageNav();
  const [lightTheme, setLightTheme] = useState(false);

  if (subview !== null) {
    const View = SUBVIEW_VIEWS[subview];
    return (
      <div className="tab-panel account-tab">
        <View onBack={closeSubview} />
      </div>
    );
  }

  return (
    <div className="tab-panel account-tab">
      <p className="account-email-top">{user?.email ?? "…"}</p>

      <div className="account-menu">
        <button
          type="button"
          className="account-menu-row"
          onClick={() => setLightTheme((v) => !v)}
        >
          {lightTheme ? <IconSun /> : <IconMoon />}
          <span>{lightTheme ? "Светлая тема" : "Тёмная тема"}</span>
        </button>

        <button type="button" className="account-menu-row account-menu-row--muted">
          <span className="account-row-icon-placeholder" aria-hidden>
            🔒
          </span>
          <span>Сменить пароль</span>
        </button>

        <button
          type="button"
          className="account-menu-row"
          onClick={() => openSubview("currency")}
        >
          <span>Валюта</span>
          <span className="account-menu-chevron" aria-hidden>
            ›
          </span>
        </button>

        <button
          type="button"
          className="account-menu-row"
          onClick={() => openSubview("category")}
        >
          <span>Категория</span>
          <span className="account-menu-chevron" aria-hidden>
            ›
          </span>
        </button>

        <button
          type="button"
          className="account-menu-row"
          onClick={() => openSubview("tags")}
        >
          <span>Детализация (теги)</span>
          <span className="account-menu-chevron" aria-hidden>
            ›
          </span>
        </button>
      </div>

      <button
        type="button"
        className="btn-secondary btn-secondary--full account-signout"
        onClick={() => void signOut()}
      >
        Выйти
      </button>
    </div>
  );
}
