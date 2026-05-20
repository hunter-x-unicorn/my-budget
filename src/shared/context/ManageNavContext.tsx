import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TAB_INDEX } from "../../app/navigation";

export type ManageKind = "currency" | "category" | "tags";

type ManageNavContextValue = {
  manageKind: ManageKind | null;
  /** navigate: true — перейти на вкладку «Аккаунт» (из «Упорядочить» на других вкладках). */
  openManage: (kind: ManageKind, options?: { navigate?: boolean }) => void;
  closeManage: () => void;
};

const ManageNavContext = createContext<ManageNavContextValue | null>(null);

export function ManageNavProvider({
  children,
  scrollToTab,
}: {
  children: ReactNode;
  scrollToTab: (index: number) => void;
}) {
  const [manageKind, setManageKind] = useState<ManageKind | null>(null);

  const openManage = useCallback(
    (kind: ManageKind, options?: { navigate?: boolean }) => {
      setManageKind(kind);
      if (options?.navigate === true) {
        scrollToTab(TAB_INDEX.account);
      }
    },
    [scrollToTab],
  );

  const closeManage = useCallback(() => setManageKind(null), []);

  const value = useMemo(
    () => ({ manageKind, openManage, closeManage }),
    [manageKind, openManage, closeManage],
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
