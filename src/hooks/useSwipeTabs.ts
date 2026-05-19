import { useCallback, useEffect, useRef, useState } from "react";

export function useSwipeTabs(tabCount: number) {
  const [activeTab, setActiveTab] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const scrollToTab = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(tabCount - 1, index));
    setActiveTab(clamped);
    const el = viewportRef.current;
    if (el) {
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    }
  }, [tabCount]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onScroll = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const index = Math.round(el.scrollLeft / width);
      setActiveTab(index);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0]!.clientX,
      y: e.touches[0]!.clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0]!.clientX - touchStart.current.x;
    const dy = e.changedTouches[0]!.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) scrollToTab(activeTab + 1);
    else scrollToTab(activeTab - 1);
  };

  return {
    activeTab,
    viewportRef,
    scrollToTab,
    onTouchStart,
    onTouchEnd,
  };
}
