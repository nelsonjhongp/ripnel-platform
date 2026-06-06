import { cn } from "@/lib/utils";

export function FieldLabel({
  children,
  actionLabel,
  onAction,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[var(--ops-text)]">{children}</label>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="cursor-pointer text-xs font-semibold text-[var(--ripnel-accent-hover)] transition hover:text-[var(--ripnel-accent)]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
