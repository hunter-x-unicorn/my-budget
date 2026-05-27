import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { TAB_INDEX } from "../../app/navigation";

export type AccountSubview =
  | "currency"
  | "accountSettings"
  | "category"
  | "tags"
  | "accounts";

type OpenSubviewOptions = {
  navigate?: boolean;
  accountId?: Id<"accounts">;
};

type ManageNavContextValue = {
  subview: AccountSubview | null;
  settingsAccountId: Id<"accounts"> | null;
  openSubview: (view: AccountSubview, options?: OpenSubviewOptions) => void;
  closeSubview: () => void;
};

const ManageNavContext = createContext<ManageNavContextValue | null>(null);

export function ManageNavProvider({
  children,
  scrollToTab,
}: {
  children: ReactNode;
  scrollToTab: (index: number) => void;
}) {
  const [subview, setSubview] = useState<AccountSubview | null>(null);
  const [settingsAccountId, setSettingsAccountId] =
    useState<Id<"accounts"> | null>(null);

  const openSubview = useCallback(
    (view: AccountSubview, options?: OpenSubviewOptions) => {
      if (view === "accountSettings" && options?.accountId) {
        setSettingsAccountId(options.accountId);
      } else if (view !== "accountSettings") {
        setSettingsAccountId(null);
      }
      setSubview(view);
      scrollToTab(TAB_INDEX.account);
    },
    [scrollToTab],
  );

  const closeSubview = useCallback(() => {
    setSubview(null);
    setSettingsAccountId(null);
  }, []);

  const value = useMemo(
    () => ({ subview, settingsAccountId, openSubview, closeSubview }),
    [subview, settingsAccountId, openSubview, closeSubview],
  );

  return (
    <ManageNavContext.Provider value={value}>{children}</ManageNavContext.Provider>
  );
}

export function useManageNav() {
  const ctx = useContext(ManageNavContext);
  if (ctx === null) {
    throw new Error("useManageNav must be used within ManageNavProvider");
  }
  return ctx;
}

/** @deprecated use openSubview */
export type ManageKind = AccountSubview;
