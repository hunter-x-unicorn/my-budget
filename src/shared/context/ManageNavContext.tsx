import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TAB_INDEX } from "../../app/navigation";

export type AccountSubview = "currency" | "category" | "tags";

type ManageNavContextValue = {
  subview: AccountSubview | null;
  openSubview: (view: AccountSubview, options?: { navigate?: boolean }) => void;
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

  const openSubview = useCallback(
    (view: AccountSubview, options?: { navigate?: boolean }) => {
      setSubview(view);
      if (options?.navigate === true) {
        scrollToTab(TAB_INDEX.account);
      }
    },
    [scrollToTab],
  );

  const closeSubview = useCallback(() => setSubview(null), []);

  const value = useMemo(
    () => ({ subview, openSubview, closeSubview }),
    [subview, openSubview, closeSubview],
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
