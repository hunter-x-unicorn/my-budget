import { useEffect, useRef, useState, type ReactNode } from "react";

type SectionHeaderProps = {
  label: string;
  infoButton?: ReactNode;
  onReorder?: () => void;
};

export function SectionHeader({ label, infoButton, onReorder }: SectionHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <div className="form-section-head">
      <div className="form-section-title">
        <span className="form-section-label">{label}</span>
        {infoButton}
      </div>
      {onReorder && (
        <div className="section-menu" ref={menuRef}>
          <button
            type="button"
            className="section-menu-trigger"
            aria-label={`Меню: ${label}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="section-menu-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onReorder();
                }}
              >
                Упорядочить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
