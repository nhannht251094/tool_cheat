import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type PanelProps = {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, eyebrow, action, children, className }: PanelProps) {
  return (
    <section className={cn("panel", className)}>
      {(title || eyebrow || action) && (
        <div className="panel-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
