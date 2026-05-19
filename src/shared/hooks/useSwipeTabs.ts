import { useCallback, useEffect, useRef, useState } from "react";
import { TAB_COUNT } from "../../app/navigation";

export function useSwipeTabs(tabCount: number = TAB_COUNT) {
  const [activeTab, setActiveTab] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isScrolling = useRef(false);

  const scrollToTab = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(tabCount - 1, index));
      const el = viewportRef.current;
      if (!el) {
        setActiveTab(clamped);
        return;
      }
      isScrolling.current = true;
      setActiveTab(clamped);
      el.scrollTo({
        left: clamped * el.clientWidth,
        behavior: "smooth",
      });
      window.setTimeout(() => {
        isScrolling.current = false;
      }, 400);
    },
    [tabCount],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onScroll = () => {
      if (isScrolling.current) return;
      const width = el.clientWidth;
      if (width <= 0) return;
      const index = Math.round(el.scrollLeft / width);
      setActiveTab((prev) => (prev === index ? prev : index));
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

    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

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
