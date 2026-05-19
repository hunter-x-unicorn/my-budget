import { useEffect } from "react";
import { hashForTabIndex, tabIndexFromHash } from "../../app/navigation";

export function useHashTabs(activeTab: number, scrollToTab: (index: number) => void) {
  useEffect(() => {
    const index = tabIndexFromHash(window.location.hash);
    scrollToTab(index);
    // Initial deep link only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      scrollToTab(tabIndexFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [scrollToTab]);

  useEffect(() => {
    const next = hashForTabIndex(activeTab);
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [activeTab]);
}
