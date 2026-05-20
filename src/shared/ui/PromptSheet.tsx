import { useRef } from "react";

type PromptSheetProps = {
  open: boolean;
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  maxLength?: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
};

export function PromptSheet({
  open,
  title,
  label = "Название",
  placeholder = "",
  defaultValue = "",
  submitLabel = "Добавить",
  maxLength = 40,
  onSubmit,
  onCancel,
}: PromptSheetProps) {
  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <PromptSheetForm
        key={defaultValue}
        title={title}
        label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        submitLabel={submitLabel}
        maxLength={maxLength}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}

function PromptSheetForm({
  title,
  label,
  placeholder,
  defaultValue,
  submitLabel,
  maxLength,
  onSubmit,
  onCancel,
}: Omit<PromptSheetProps, "open">) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="confirm-sheet prompt-sheet"
      role="dialog"
      aria-modal="true"
      ref={(el) => {
        if (el) requestAnimationFrame(() => inputRef.current?.focus());
      }}
    >
      <h3 className="confirm-title">{title}</h3>
      <label className="field prompt-field">
        <span>{label}</span>
        <input
          ref={inputRef}
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.currentTarget as HTMLInputElement).value.trim();
              if (v) onSubmit(v);
            }
          }}
        />
      </label>
      <div className="confirm-actions">
        <button type="button" className="btn-secondary confirm-btn" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className="btn-primary confirm-btn"
          onClick={() => {
            const v = inputRef.current?.value.trim() ?? "";
            if (v) onSubmit(v);
          }}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
