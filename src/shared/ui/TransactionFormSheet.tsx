import type { ReactNode } from "react";

type TransactionFormSheetProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function TransactionFormSheet({
  title,
  subtitle,
  onClose,
  children,
}: TransactionFormSheetProps) {
  return (
    <div
      className="edit-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="edit-panel edit-panel--form">
        <div className="sheet-header">
          <h2 id="tx-sheet-title" className="panel-title">
            {title}
          </h2>
          <button type="button" className="btn-icon" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>
        {subtitle && <p className="edit-panel-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
