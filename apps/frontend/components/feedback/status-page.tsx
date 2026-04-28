import Link from "next/link";
import { AlertTriangle, Ban, Home, LoaderCircle, RefreshCcw, SearchX } from "lucide-react";

type StatusTone = "neutral" | "warning" | "danger";
type StatusVariant = "default" | "ops";

const defaultToneClasses: Record<StatusTone, string> = {
  neutral: "border-slate-200 bg-white text-slate-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

const opsToneClasses: Record<StatusTone, string> = {
  neutral: "border-[var(--ops-border-strong)] bg-[var(--ops-surface)] text-[var(--ops-text)]",
  warning:
    "border-[color:color-mix(in_srgb,#f59e0b_44%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f59e0b_14%,var(--ops-surface))] text-[var(--ops-text)]",
  danger:
    "border-[color:color-mix(in_srgb,#f43f5e_40%,var(--ops-border-strong))] bg-[color:color-mix(in_srgb,#f43f5e_13%,var(--ops-surface))] text-[var(--ops-text)]",
};

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
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
}) {
  const toneClasses = variant === "ops" ? opsToneClasses : defaultToneClasses;
  const isOps = variant === "ops";

  return (
    <section
      className={
        isOps
          ? "ops-page flex min-h-[calc(100vh-3.5rem)] w-full items-center px-4 py-8 md:px-6"
          : "flex min-h-[calc(100vh-3.5rem)] w-full items-center bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_30%,#f8fafc_65%,#eef2ff_100%)] px-4 py-10 md:px-8"
      }
    >
      <div className={isOps ? "mx-auto w-full max-w-4xl" : "mx-auto w-full max-w-5xl"}>
        <div
          className={`border ${isOps ? "rounded-2xl p-5 shadow-sm md:p-6" : "min-h-[60vh] rounded-[28px] p-6 shadow-lg md:p-10"} ${toneClasses[tone]}`}
        >
          <div className={`flex h-full items-start ${isOps ? "gap-3.5 md:gap-4" : "gap-4 md:gap-5"}`}>
            <div
              className={
                isOps
                  ? "rounded-xl bg-[var(--ops-surface-muted)] p-2.5 text-current"
                  : "rounded-2xl bg-slate-900/5 p-3 text-current"
              }
            >
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
                <h1 className={isOps ? "text-2xl font-semibold md:text-[1.75rem]" : "text-3xl font-bold md:text-5xl"}>
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
                ) : null}
                {secondaryAction ? (
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

export function NotFoundPage({ variant = "default" }: { variant?: StatusVariant }) {
  return (
    <StatusPage
      icon={<SearchX className="h-8 w-8" />}
      eyebrow="404"
      title="La ruta no existe"
      description="La página solicitada no forma parte del flujo actual o fue movida a otra ruta operativa."
      variant={variant}
      primaryAction={{ href: "/inicio", label: "Ir al inicio" }}
      secondaryAction={{ href: "/purchase-system", label: "Abrir nueva venta" }}
    />
  );
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
      secondaryAction={{ href: "/account", label: "Ver mi cuenta" }}
    />
  );
}

export function ErrorPage({
  title = "Ocurrió un error inesperado",
  description = "La aplicación encontró un problema y no pudo completar la operación actual.",
  variant = "default",
}: {
  title?: string;
  description?: string;
  variant?: StatusVariant;
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
      secondaryAction={{ href: "/transaction-history", label: "Ir al historial" }}
    />
  );
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
  const toneClass = variant === "ops" ? opsToneClasses[tone] : defaultToneClasses[tone];
  return (
    <div className={`border p-5 shadow-sm ${variant === "ops" ? "rounded-2xl" : "rounded-3xl"} ${toneClass}`}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div
            className={
              variant === "ops"
                ? "rounded-xl bg-[var(--ops-surface-muted)] p-2 text-current"
                : "rounded-2xl bg-slate-900/5 p-2.5 text-current"
            }
          >
            {icon}
          </div>
        ) : null}
        <div>
          <p className={variant === "ops" ? "text-sm font-semibold" : "text-base font-semibold"}>{title}</p>
          <p
            className={
              variant === "ops"
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
