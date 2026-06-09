import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  children,
  icon,
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button className={cn("ui-button", `ui-button-${variant}`, className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
