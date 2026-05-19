import { useCallback, useEffect, useRef, useState } from "react";
import { TAB_COUNT } from "../../app/navigation";

type ScrollIntent = "horizontal" | "vertical" | null;

export function useSwipeTabs(tabCount: number = TAB_COUNT) {
  const [activeTab, setActiveTab] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scrollIntent = useRef<ScrollIntent>(null);
  const isScrolling = useRef(false);
  const scrollEndFallback = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearScrollLock = useCallback(() => {
    isScrolling.current = false;
    if (scrollEndFallback.current !== null) {
      clearTimeout(scrollEndFallback.current);
      scrollEndFallback.current = null;
    }
  }, []);

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
      if (!("onscrollend" in el)) {
        scrollEndFallback.current = setTimeout(clearScrollLock, 500);
      }
    },
    [tabCount, clearScrollLock],
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

    const onScrollEnd = () => clearScrollLock();

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
    };
  }, [clearScrollLock]);

  const onTouchStart = (e: React.TouchEvent) => {
    scrollIntent.current = null;
    touchStart.current = {
      x: e.touches[0]!.clientX,
      y: e.touches[0]!.clientY,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || scrollIntent.current !== null) return;
    const dx = e.touches[0]!.clientX - touchStart.current.x;
    const dy = e.touches[0]!.clientY - touchStart.current.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    scrollIntent.current =
      Math.abs(dy) > Math.abs(dx) * 1.15 ? "vertical" : "horizontal";
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0]!.clientX - touchStart.current.x;
    const dy = e.changedTouches[0]!.clientY - touchStart.current.y;
    const intent = scrollIntent.current;
    touchStart.current = null;
    scrollIntent.current = null;

    if (intent === "vertical") return;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

    if (dx < 0) scrollToTab(activeTab + 1);
    else scrollToTab(activeTab - 1);
  };

  return {
    activeTab,
    viewportRef,
    scrollToTab,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
