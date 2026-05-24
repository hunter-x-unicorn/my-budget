import type { ReactNode } from "react";

type ChipButtonProps = {
  children: ReactNode;
  selected?: boolean;
  size?: "md" | "sm";
  variant?: "default" | "expense" | "income" | "transfer";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  title?: string;
};

export function ChipButton({
  children,
  selected = false,
  size = "md",
  variant = "default",
  className = "",
  disabled,
  onClick,
  type = "button",
  title,
}: ChipButtonProps) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      className={[
        "chip-btn",
        `chip-btn--${size}`,
        selected ? "chip-btn--selected" : "",
        variant !== "default" ? `chip-btn--${variant}` : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
