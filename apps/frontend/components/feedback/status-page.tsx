import Link from "next/link";
import { AlertTriangle, Ban, Home, Info, LoaderCircle, RefreshCcw, SearchX } from "lucide-react";
import { appRoutes } from "@/lib/routes";

type StatusTone = "neutral" | "warning" | "danger";
type StatusVariant = "default" | "ops";

const panelClasses: Record<StatusVariant, string> = {
  default: "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900",
  ops: "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text)]",
};

const iconToneClasses: Record<StatusVariant, Record<StatusTone, string>> = {
  default: {
    neutral: "text-slate-500",
    warning: "text-amber-600",
    danger: "text-rose-600",
  },
  ops: {
    neutral: "text-[var(--ops-text-muted)]",
    warning: "text-[var(--ops-tone-warning-text)]",
    danger: "text-[var(--ops-tone-danger-text)]",
  },
};

const titleToneClasses: Record<StatusVariant, Record<StatusTone, string>> = {
  default: {
    neutral: "text-slate-900",
    warning: "text-slate-900",
    danger: "text-slate-900",
  },
  ops: {
    neutral: "text-[var(--ops-text)]",
    warning: "text-[var(--ops-text)]",
    danger: "text-[var(--ops-text)]",
  },
};

export type StatusAction =
  | { href: string; label: string }
  | { onClick: () => void; label: string };

export function StatusPage({
  icon,
  eyebrow,
  title,
  description,
  tone = "neutral",
  variant = "default",
  primaryAction,
  secondaryAction,
}: {
  icon?: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  tone?: StatusTone;
  variant?: StatusVariant;
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
}) {
  const isOps = variant === "ops";
  const iconToneClass = iconToneClasses[variant][tone];
  const titleToneClass = titleToneClasses[variant][tone];

  return (
    <section
      className={
        isOps
          ? "ops-page flex min-h-[calc(100dvh-3.5rem)] w-full items-center px-4 py-8 md:px-6"
          : "flex min-h-[calc(100dvh-3.5rem)] w-full items-center bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_30%,#f8fafc_65%,#eef2ff_100%)] px-4 py-10 md:px-8"
      }
    >
      <div className={isOps ? "mx-auto w-full max-w-4xl" : "mx-auto w-full max-w-5xl"}>
        <div
          className={`border ${isOps ? "rounded-2xl p-5 shadow-sm md:p-6" : "min-h-[60vh] rounded-[28px] p-6 shadow-lg md:p-10"} ${panelClasses[variant]}`}
        >
          <div className={`flex h-full items-start ${isOps ? "gap-3.5 md:gap-4" : "gap-4 md:gap-5"}`}>
            <div className={`shrink-0 pt-0.5 ${iconToneClass}`}>
              {icon}
            </div>
            <div className={`flex min-h-full flex-1 flex-col justify-center ${isOps ? "space-y-2.5" : "space-y-3"}`}>
              <p
                className={
                  isOps
                    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
                    : "text-xs font-semibold uppercase tracking-[0.24em] text-current/70"
                }
              >
                {eyebrow}
              </p>
              <div>
                <h1 className={`${isOps ? "text-2xl font-semibold md:text-[1.75rem]" : "text-3xl font-bold md:text-5xl"} ${titleToneClass}`}>
                  {title}
                </h1>
                <p
                  className={
                    isOps
                      ? "mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-text-muted)]"
                      : "mt-3 max-w-3xl text-base leading-7 text-current/75"
                  }
                >
                  {description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {primaryAction ? (
                  "href" in primaryAction ? (
                    <Link
                      href={primaryAction.href}
                      className={
                        isOps
                          ? "inline-flex items-center gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--ripnel-accent)_30%,transparent)] bg-[var(--ripnel-accent)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)]"
                          : "inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      }
                    >
                      <Home className="h-4 w-4" />
                      {primaryAction.label}
                    </Link>
                  ) : (
                    <button
                      onClick={primaryAction.onClick}
                      className={
                        isOps
                          ? "inline-flex items-center gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--ripnel-accent)_30%,transparent)] bg-[var(--ripnel-accent)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ripnel-accent-hover)] cursor-pointer"
                          : "inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 cursor-pointer"
                      }
                    >
                      <Home className="h-4 w-4" />
                      {primaryAction.label}
                    </button>
                  )
                ) : null}
                {secondaryAction ? (
                  "href" in secondaryAction ? (
                    <Link
                      href={secondaryAction.href}
                      className={
                        isOps
                          ? "inline-flex items-center gap-2 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3.5 py-2 text-sm font-semibold text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
                          : "inline-flex items-center gap-2 rounded-2xl border border-current/15 px-4 py-2.5 text-sm font-semibold text-current/80 transition hover:bg-white/60"
                      }
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {secondaryAction.label}
                    </Link>
                  ) : (
                    <button
                      onClick={secondaryAction.onClick}
                      className={
                        isOps
                          ? "inline-flex items-center gap-2 rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3.5 py-2 text-sm font-semibold text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)] cursor-pointer"
                          : "inline-flex items-center gap-2 rounded-2xl border border-current/15 px-4 py-2.5 text-sm font-semibold text-current/80 transition hover:bg-white/60 cursor-pointer"
                      }
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {secondaryAction.label}
                    </button>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LoadingPage({
  eyebrow = "Cargando",
  title = "Preparando módulo",
  description = "Estamos cargando la información operativa para mostrar la pantalla actual.",
  variant = "default",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  variant?: StatusVariant;
}) {
  return (
    <StatusPage
      icon={<LoaderCircle className="h-8 w-8 animate-spin" />}
      eyebrow={eyebrow}
      title={title}
      description={description}
      variant={variant}
      primaryAction={{ href: "/inicio", label: "Volver al inicio" }}
    />
  );
}

export function ProtectedLoadingPage(
  props: Omit<Parameters<typeof LoadingPage>[0], "variant">
) {
  return <LoadingPage variant="ops" {...props} />;
}

export function NotFoundPage({ variant = "default" }: { variant?: StatusVariant }) {
  return (
    <StatusPage
      icon={<SearchX className="h-8 w-8" />}
      eyebrow="404"
      title="La ruta no existe"
      description="La página solicitada no forma parte del flujo actual o fue movida a otra ruta operativa."
      variant={variant}
      primaryAction={{ href: "/inicio", label: "Ir al inicio" }}
      secondaryAction={{ href: appRoutes.purchaseSystem, label: "Abrir nueva venta" }}
    />
  );
}

export function ProtectedNotFoundPage() {
  return <NotFoundPage variant="ops" />;
}

export function ForbiddenPage({ variant = "default" }: { variant?: StatusVariant }) {
  return (
    <StatusPage
      icon={<Ban className="h-8 w-8" />}
      eyebrow="403"
      title="No tienes permisos para entrar aquí"
      description="Tu sesión está activa, pero el rol actual no tiene acceso operativo a este módulo o ubicación."
      tone="warning"
      variant={variant}
      primaryAction={{ href: "/inicio", label: "Volver al inicio" }}
      secondaryAction={{ href: appRoutes.account, label: "Ver mi cuenta" }}
    />
  );
}

export function ProtectedForbiddenPage() {
  return <ForbiddenPage variant="ops" />;
}

export function ErrorPage({
  title = "Ocurrió un error inesperado",
  description = "La aplicación encontró un problema y no pudo completar la operación actual.",
  variant = "default",
  onReset,
}: {
  title?: string;
  description?: string;
  variant?: StatusVariant;
  onReset?: () => void;
}) {
  return (
    <StatusPage
      icon={<AlertTriangle className="h-8 w-8" />}
      eyebrow="500"
      title={title}
      description={description}
      tone="danger"
      variant={variant}
      primaryAction={{ href: "/inicio", label: "Volver al inicio" }}
      secondaryAction={
        onReset
          ? { onClick: onReset, label: "Reintentar" }
          : { href: appRoutes.transactionHistory, label: "Ir al historial" }
      }
    />
  );
}

export function ProtectedErrorPage(
  props: Omit<Parameters<typeof ErrorPage>[0], "variant"> & { variant?: StatusVariant }
) {
  return <ErrorPage variant="ops" {...props} />;
}

export function InlineStatusCard({
  title,
  description,
  tone = "neutral",
  icon,
  variant = "default",
}: {
  title: string;
  description: string;
  tone?: StatusTone;
  icon?: React.ReactNode;
  variant?: StatusVariant;
}) {
  const isOps = variant === "ops";
  const iconToneClass = iconToneClasses[variant][tone];
  const titleToneClass = titleToneClasses[variant][tone];
  const fallbackIcon =
    tone === "neutral" ? <Info className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />;
  const resolvedIcon = icon === undefined ? fallbackIcon : icon;

  return (
    <div className={`border p-4 shadow-sm ${isOps ? "rounded-xl" : "rounded-2xl"} ${panelClasses[variant]}`}>
      <div className="flex items-start gap-3">
        {resolvedIcon ? (
          <div className={`mt-0.5 shrink-0 ${iconToneClass}`}>{resolvedIcon}</div>
        ) : null}
        <div>
          <p className={`${isOps ? "text-sm font-semibold" : "text-base font-semibold"} ${titleToneClass}`}>{title}</p>
          <p
            className={
              isOps
                ? "mt-1 text-sm leading-6 text-[var(--ops-text-muted)]"
                : "mt-1 text-sm leading-6 text-current/75"
            }
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
